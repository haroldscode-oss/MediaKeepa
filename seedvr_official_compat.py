"""Apply narrow compatibility fixes to ByteDance's pinned inference entrypoint.

The official 7B script supports image input but omits the still image's output
FPS list entry, so its final ``zip`` has zero iterations. This build-time patch
only supplies that bookkeeping value; it does not alter model inference.
"""

from pathlib import Path


entrypoint = Path("/opt/seedvr/projects/inference_seedvr2_7b.py")
source = entrypoint.read_text(encoding="utf-8")
image_needle = """                if sp_size > 1:
                    raise ValueError(\"Sp size should be set to 1 for image inputs!\")
            else:
"""
image_replacement = """                if sp_size > 1:
                    raise ValueError(\"Sp size should be set to 1 for image inputs!\")
                fps_lists.append(out_fps if out_fps is not None else 1.0)
            else:
"""
if image_needle not in source:
    raise RuntimeError("Pinned SeedVR2 image-input block changed; compatibility patch was not applied.")
source = source.replace(image_needle, image_replacement, 1)

signature_needle = "def generation_loop(runner, video_path='./test_videos', output_dir='./results', batch_size=1, cfg_scale=1.0, cfg_rescale=0.0, sample_steps=1, seed=666, res_h=1280, res_w=720, sp_size=1, out_fps=None):"
signature_replacement = signature_needle[:-2] + ", exact_res_h=None, exact_res_w=None):"
if signature_needle not in source:
    raise RuntimeError("Pinned SeedVR2 generation signature changed; exact-size patch was not applied.")
source = source.replace(signature_needle, signature_replacement, 1)

crop_needle = """                else:
                    sample = sample.to(\"cpu\")
                sample = (
"""
crop_replacement = """                else:
                    sample = sample.to(\"cpu\")
                if exact_res_h is not None and exact_res_w is not None:
                    crop_h = min(int(exact_res_h), sample.shape[-2])
                    crop_w = min(int(exact_res_w), sample.shape[-1])
                    crop_top = max(0, (sample.shape[-2] - crop_h) // 2)
                    crop_left = max(0, (sample.shape[-1] - crop_w) // 2)
                    sample = sample[..., crop_top:crop_top + crop_h, crop_left:crop_left + crop_w]
                sample = (
"""
if crop_needle not in source:
    raise RuntimeError("Pinned SeedVR2 output block changed; exact-size patch was not applied.")
source = source.replace(crop_needle, crop_replacement, 1)

parser_needle = '    parser.add_argument("--out_fps", type=float, default=None)\n'
parser_replacement = parser_needle + '    parser.add_argument("--exact_res_h", type=int, default=None)\n    parser.add_argument("--exact_res_w", type=int, default=None)\n'
if parser_needle not in source:
    raise RuntimeError("Pinned SeedVR2 argument parser changed; exact-size patch was not applied.")
source = source.replace(parser_needle, parser_replacement, 1)

entrypoint.write_text(source, encoding="utf-8")
