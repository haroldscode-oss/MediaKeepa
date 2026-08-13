"""Apply MediaKeepa compatibility fixes to the pinned official SeedVR2 code.

The patches retain the official checkpoint, precision, sampler, prompts, VAE
configuration, and generated pixels. They fix still-image output bookkeeping,
support exact-size/lossless intermediates, and release GPU allocations at the
official DiT/VAE phase boundaries.
"""

from __future__ import annotations

from pathlib import Path


ENTRYPOINT = Path("/opt/seedvr/projects/inference_seedvr2_7b.py")
INFERENCE_RUNNER = Path("/opt/seedvr/projects/video_diffusion_sr/infer.py")


def _replace_once(source: str, needle: str, replacement: str, label: str) -> str:
    if needle not in source:
        raise RuntimeError(
            f"Pinned SeedVR2 {label} changed; the compatibility patch was not applied."
        )
    return source.replace(needle, replacement, 1)


def patch_entrypoint(source: str) -> str:
    image_needle = """                if sp_size > 1:
                    raise ValueError(\"Sp size should be set to 1 for image inputs!\")
            else:
"""
    image_replacement = """                if sp_size > 1:
                    raise ValueError(\"Sp size should be set to 1 for image inputs!\")
                fps_lists.append(out_fps if out_fps is not None else 1.0)
            else:
"""
    source = _replace_once(
        source, image_needle, image_replacement, "image-input block"
    )

    signature_needle = "def generation_loop(runner, video_path='./test_videos', output_dir='./results', batch_size=1, cfg_scale=1.0, cfg_rescale=0.0, sample_steps=1, seed=666, res_h=1280, res_w=720, sp_size=1, out_fps=None):"
    signature_replacement = signature_needle[:-2] + ", exact_res_h=None, exact_res_w=None, lossless_output=False, preserve_source_color=True):"
    source = _replace_once(
        source, signature_needle, signature_replacement, "generation signature"
    )

    source = _replace_once(
        source,
        "        video_list = os.listdir(video_path)\n",
        "        video_list = sorted(os.listdir(video_path))\n",
        "input listing",
    )

    # Only sequence-parallel rank zero performs the later wavelet color fix.
    # Keeping that input on every GPU retained roughly 4.5 GiB per rank for the
    # user's 77-frame 2160x2400 window. Cache releases after each model swap
    # make the released module storage available to the next phase's large VAE
    # convolution instead of leaving it reserved in PyTorch's allocator.
    transition_needle = """        ori_lengths = [video.size(1) for video in cond_latents]
        input_videos = cond_latents
        cond_latents = [cut_videos(video, sp_size) for video in cond_latents]

        runner.dit.to("cpu")
        print(f"Encoding videos: {list(map(lambda x: x.size(), cond_latents))}")
        runner.vae.to(get_device())
        cond_latents = runner.vae_encode(cond_latents)
        runner.vae.to("cpu")
        runner.dit.to(get_device())
"""
    transition_replacement = """        ori_lengths = [video.size(1) for video in cond_latents]
        input_videos = (
            [video.to("cpu") for video in cond_latents]
            if get_sequence_parallel_rank() == 0
            else []
        )
        cond_latents = [cut_videos(video, sp_size) for video in cond_latents]

        runner.dit.to("cpu")
        gc.collect()
        torch.cuda.empty_cache()
        print(f"Encoding videos: {list(map(lambda x: x.size(), cond_latents))}")
        runner.vae.to(get_device())
        cond_latents = runner.vae_encode(cond_latents)
        runner.vae.to("cpu")
        gc.collect()
        torch.cuda.empty_cache()
        runner.dit.to(get_device())
"""
    source = _replace_once(
        source, transition_needle, transition_replacement, "DiT/VAE transition block"
    )

    crop_needle = """                else:
                    sample = sample.to("cpu")
                sample = (
"""
    crop_replacement = """                else:
                    sample = sample.to("cpu")
                if exact_res_h is not None and exact_res_w is not None:
                    crop_h = min(int(exact_res_h), sample.shape[-2])
                    crop_w = min(int(exact_res_w), sample.shape[-1])
                    crop_top = max(0, (sample.shape[-2] - crop_h) // 2)
                    crop_left = max(0, (sample.shape[-1] - crop_w) // 2)
                    sample = sample[..., crop_top:crop_top + crop_h, crop_left:crop_left + crop_w]
                sample = (
"""
    source = _replace_once(source, crop_needle, crop_replacement, "output block")

    source = _replace_once(
        source,
        "                if use_colorfix:\n",
        "                if use_colorfix and preserve_source_color:\n",
        "color preservation toggle",
    )

    parser_needle = '    parser.add_argument("--out_fps", type=float, default=None)\n'
    parser_replacement = parser_needle + (
        '    parser.add_argument("--cfg_scale", type=float, default=1.0)\n'
        '    parser.add_argument("--cfg_rescale", type=float, default=0.0)\n'
        '    parser.add_argument("--exact_res_h", type=int, default=None)\n'
        '    parser.add_argument("--exact_res_w", type=int, default=None)\n'
        '    parser.add_argument("--lossless_output", action="store_true")\n'
        '    parser.add_argument("--preserve_source_color", action=argparse.BooleanOptionalAction, default=True)\n'
    )
    source = _replace_once(
        source, parser_needle, parser_replacement, "argument parser"
    )

    video_write_needle = """                    mediapy.write_video(
                        filename, sample, fps=save_fps
                    )
"""
    video_write_replacement = """                    if lossless_output:
                        mediapy.write_video(
                            filename,
                            sample,
                            fps=save_fps,
                            codec="ffv1",
                            encoded_format="bgr0",
                            ffmpeg_args=["-level", "3"],
                        )
                    else:
                        mediapy.write_video(
                            filename, sample, fps=save_fps
                        )
"""
    return _replace_once(
        source, video_write_needle, video_write_replacement, "video writer"
    )


def patch_inference_runner(source: str) -> str:
    source = _replace_once(
        source,
        "from typing import List, Optional, Tuple, Union\nimport torch\n",
        "from typing import List, Optional, Tuple, Union\nimport gc\nimport torch\n",
        "inference runner imports",
    )

    decode_needle = """        if dit_offload:
            self.dit.to("cpu")

        # Vae decode.
        self.vae.to(get_device())
        samples = self.vae_decode(latents)

        if dit_offload:
            self.dit.to(get_device())
        return samples"""
    decode_replacement = """        if dit_offload:
            self.dit.to("cpu")
            gc.collect()
            torch.cuda.empty_cache()

        # Vae decode. Keep the DiT offloaded: this entrypoint immediately moves
        # it back to CPU after inference, while decoded samples are still live.
        self.vae.to(get_device())
        samples = self.vae_decode(latents)
        return samples"""
    return _replace_once(
        source, decode_needle, decode_replacement, "inference VAE decode block"
    )


def main() -> None:
    entrypoint_source = ENTRYPOINT.read_text(encoding="utf-8")
    ENTRYPOINT.write_text(patch_entrypoint(entrypoint_source), encoding="utf-8")

    runner_source = INFERENCE_RUNNER.read_text(encoding="utf-8")
    INFERENCE_RUNNER.write_text(
        patch_inference_runner(runner_source), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
