import sys
import types
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import seedvr_official_compat as compat  # noqa: E402


class _FakeImage:
    @classmethod
    def from_registry(cls, *_args, **_kwargs):
        return cls()

    def __getattr__(self, _name):
        return lambda *_args, **_kwargs: self


class _FakeApp:
    def __init__(self, *_args, **_kwargs):
        pass

    def function(self, *_args, **_kwargs):
        return lambda function: function


def _load_worker():
    fake_modal = types.SimpleNamespace(
        Image=_FakeImage,
        App=_FakeApp,
        Volume=types.SimpleNamespace(from_name=lambda *_args, **_kwargs: object()),
        Secret=types.SimpleNamespace(from_name=lambda *_args, **_kwargs: object()),
        Retries=lambda *_args, **_kwargs: object(),
    )
    previous_modal = sys.modules.get("modal")
    sys.modules["modal"] = fake_modal
    try:
        import modal_video_enhancer as worker
    finally:
        if previous_modal is None:
            sys.modules.pop("modal", None)
        else:
            sys.modules["modal"] = previous_modal
    return worker


WORKER = _load_worker()


PINNED_ENTRYPOINT_FIXTURE = '''\
import os
import torch

def generation_loop(runner, video_path='./test_videos', output_dir='./results', batch_size=1, cfg_scale=1.0, cfg_rescale=0.0, sample_steps=1, seed=666, res_h=1280, res_w=720, sp_size=1, out_fps=None):
    def _build_test_prompts(video_path):
        video_list = os.listdir(video_path)
        return video_list

    for videos, text_embeds in []:
        cond_latents = []
        fps_lists = []
        for video in videos:
            if is_image_file(video):
                if sp_size > 1:
                    raise ValueError("Sp size should be set to 1 for image inputs!")
            else:
                fps_lists.append(24)
            cond_latents.append(video)
        ori_lengths = [video.size(1) for video in cond_latents]
        input_videos = cond_latents
        cond_latents = [cut_videos(video, sp_size) for video in cond_latents]

        runner.dit.to("cpu")
        print(f"Encoding videos: {list(map(lambda x: x.size(), cond_latents))}")
        runner.vae.to(get_device())
        cond_latents = runner.vae_encode(cond_latents)
        runner.vae.to("cpu")
        runner.dit.to(get_device())

        samples = generation_step(runner, text_embeds, cond_latents=cond_latents)
        runner.dit.to("cpu")
        if get_sequence_parallel_rank() == 0:
            for path, input, sample, ori_length, save_fps in zip(
                videos, input_videos, samples, [], fps_lists
            ):
                if use_colorfix:
                    sample = sample.to("cpu")
                else:
                    sample = sample.to("cpu")
                sample = (
                    sample
                )
                if sample.shape[0] == 1:
                    mediapy.write_image(path, sample)
                else:
                    mediapy.write_video(
                        filename, sample, fps=save_fps
                    )

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out_fps", type=float, default=None)
'''


PINNED_INFER_FIXTURE = '''\
from typing import List, Optional, Tuple, Union
import torch

class VideoDiffusionInfer:
    def inference(self, latents, dit_offload=False):
        if dit_offload:
            self.dit.to("cpu")

        # Vae decode.
        self.vae.to(get_device())
        samples = self.vae_decode(latents)

        if dit_offload:
            self.dit.to(get_device())
        return samples
'''.rstrip("\n")


class SeedVrMemorySafetyTests(unittest.TestCase):
    def _apply_compat_patch(self) -> tuple[str, str]:
        return (
            compat.patch_entrypoint(PINNED_ENTRYPOINT_FIXTURE),
            compat.patch_inference_runner(PINNED_INFER_FIXTURE),
        )

    def test_compat_patch_releases_full_resolution_color_reference_from_cuda(self) -> None:
        entrypoint, _infer = self._apply_compat_patch()
        normalized = entrypoint.replace("'", '"')

        self.assertNotIn("input_videos = cond_latents", normalized)
        self.assertIn('[video.to("cpu") for video in cond_latents]', normalized)
        self.assertIn("if get_sequence_parallel_rank() == 0", normalized)

    def test_compat_patch_clears_cuda_between_model_phases(self) -> None:
        entrypoint, infer = self._apply_compat_patch()

        before_encode = entrypoint.split('runner.dit.to("cpu")', 1)[1].split(
            'runner.vae.to(get_device())', 1
        )[0]
        before_dit = entrypoint.split('runner.vae.to("cpu")', 1)[1].split(
            'runner.dit.to(get_device())', 1
        )[0]
        before_decode = infer.split('self.dit.to("cpu")', 1)[1].split(
            'self.vae.to(get_device())', 1
        )[0]

        self.assertIn("torch.cuda.empty_cache()", before_encode)
        self.assertIn("torch.cuda.empty_cache()", before_dit)
        self.assertIn("torch.cuda.empty_cache()", before_decode)

    def test_compat_patch_does_not_reload_dit_while_decoded_frames_are_live(self) -> None:
        _entrypoint, infer = self._apply_compat_patch()
        after_decode = infer.split("samples = self.vae_decode(latents)", 1)[1]

        self.assertNotIn("self.dit.to(get_device())", after_decode)

    def test_gpu_memory_probe_does_not_initialize_cuda_in_parent_process(self) -> None:
        class _ForbiddenCuda:
            def __getattr__(self, name):
                raise AssertionError(f"parent process initialized CUDA through torch.cuda.{name}")

        completed = types.SimpleNamespace(
            returncode=0,
            stdout="143360\n143360\n143360\n143360\n",
            stderr="",
        )
        with (
            mock.patch.object(WORKER.subprocess, "run", return_value=completed) as run,
            mock.patch.dict(sys.modules, {"torch": types.SimpleNamespace(cuda=_ForbiddenCuda())}),
        ):
            memory_gib = WORKER._available_gpu_memory_gib()

        self.assertEqual(memory_gib, 140.0)
        command = run.call_args.args[0]
        self.assertEqual(command[0], "nvidia-smi")
        self.assertIn("--query-gpu=memory.total", command)
        self.assertIn("--format=csv,noheader,nounits", command)


if __name__ == "__main__":
    unittest.main()
