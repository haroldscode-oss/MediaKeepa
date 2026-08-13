"""Quality-first Modal worker for MediaKeepa Video Enhancer.

This deployment invokes ByteDance Seed's official SeedVR2 7B inference code and
the official ``seedvr2_ema_7b_sharp.pth`` checkpoint directly. It intentionally
does not quantize, tile, offload weights to reduced precision, or substitute a
smaller preview model.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path

import modal


APP_NAME = "mediakeepa-video-enhancer"
VIDEO_ENHANCER_WORKER_PROTOCOL = "seedvr2-workspace-v3"
SEEDVR_REPOSITORY = "https://github.com/ByteDance-Seed/SeedVR.git"
SEEDVR_COMMIT = "e4de8c24441a67e1b7df56abea10645059bb1185"
MODEL_REPOSITORY = "ByteDance-Seed/SeedVR2-7B"
MODEL_REVISION = "eb0c4281d41ba3767d4f14370f0e37e9e9180c16"
SHARP_CHECKPOINT = "seedvr2_ema_7b_sharp.pth"
NATURAL_CHECKPOINT = "seedvr2_ema_7b.pth"
VAE_CHECKPOINT = "ema_vae.pth"
MODEL_DIR = "/models"
SEEDVR_DIR = "/opt/seedvr"
MODEL_VOLUME_NAME = "mediakeepa-seedvr2-7b"
HUGGINGFACE_SECRET_NAME = "MediaKeepa_backgroundremover"
PREVIEW_GPU = ["H200", "H100"]
FULL_GPU = ["H200:4", "H100:4"]
MIN_CONTAINERS = int(os.environ.get("MEDIAKEEPA_VIDEO_MIN_CONTAINERS", "0"))
SCALEDOWN_WINDOW = int(os.environ.get("MEDIAKEEPA_VIDEO_SCALEDOWN_WINDOW", "60"))
MAX_VIDEO_BYTES = 512 * 1024 * 1024
MAX_OUTPUT_EDGE = 3840
MAX_TEMPORAL_WINDOW_FRAMES = 97
MIN_TEMPORAL_WINDOW_FRAMES = 17
# Scale the official roughly-100-frame-at-2K guidance strictly by output pixel
# count. The former H200 uplift selected 81 frames for 2160x2400 even though the
# observed VAE decode was already within 1.13 GiB of physical capacity.
H200_PIXEL_FRAME_BUDGET = 97 * 2560 * 1440
H200_MEMORY_GIB = 140.0

ROOT = Path(__file__).resolve().parent

seedvr_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04",
        add_python="3.10",
    )
    .apt_install(
        "build-essential",
        "ffmpeg",
        "git",
        "libgl1",
        "libglib2.0-0",
        "ninja-build",
    )
    .run_commands(
        "python -m pip install --upgrade pip setuptools wheel packaging ninja",
        # The official cu121 index no longer mirrors the exact cuDNN 9.1.0.70
        # dependency declared by Torch 2.4. Modal's PyPI mirror resolves the
        # same official CUDA-enabled wheels and their complete dependency set.
        "python -m pip install torch==2.4.0 torchvision==0.19.0",
        "python -m pip install https://huggingface.co/ByteDance-Seed/SeedVR2-3B/resolve/main/apex-0.1-cp310-cp310-linux_x86_64.whl",
        "MAX_JOBS=4 python -m pip install flash-attn==2.5.9.post1 --no-build-isolation",
        "python -m pip install av==12.3.0 diffusers==0.29.1 einops==0.7.0 huggingface_hub[hf_xet]==0.36.0 mediapy==1.2.0 omegaconf==2.3.0 opencv-python-headless==4.9.0.80 rotary-embedding-torch==0.5.3 transformers==4.38.2",
        f"git clone {SEEDVR_REPOSITORY} {SEEDVR_DIR} && cd {SEEDVR_DIR} && git checkout {SEEDVR_COMMIT}",
    )
    .add_local_file(
        str(ROOT / "seedvr_color_fix.py"),
        f"{SEEDVR_DIR}/projects/video_diffusion_sr/color_fix.py",
        copy=True,
    )
    .add_local_file(
        str(ROOT / "seedvr_official_compat.py"),
        "/tmp/seedvr_official_compat.py",
        copy=True,
    )
    .run_commands("python /tmp/seedvr_official_compat.py")
)

app = modal.App(APP_NAME)
model_volume = modal.Volume.from_name(MODEL_VOLUME_NAME, create_if_missing=True)
huggingface_secret = modal.Secret.from_name(HUGGINGFACE_SECRET_NAME)


def _token() -> str | None:
    return os.environ.get("HF_TOKEN") or None


@app.function(
    image=seedvr_image,
    volumes={MODEL_DIR: model_volume},
    secrets=[huggingface_secret],
    timeout=60 * 90,
)
def download_weights() -> str:
    """Cache both official 7B restoration personalities and the VAE."""

    from huggingface_hub import snapshot_download

    snapshot_download(
        repo_id=MODEL_REPOSITORY,
        revision=MODEL_REVISION,
        local_dir=MODEL_DIR,
        token=_token(),
        allow_patterns=[SHARP_CHECKPOINT, NATURAL_CHECKPOINT, VAE_CHECKPOINT],
    )
    model_volume.commit()
    return f"{MODEL_REPOSITORY}@{MODEL_REVISION} Sharp + Natural cached in {MODEL_VOLUME_NAME}"


@app.function(timeout=60)
def deployment_info() -> dict[str, str]:
    """Expose a cheap live compatibility check for controller deployments."""

    return {
        "worker_protocol": VIDEO_ENHANCER_WORKER_PROTOCOL,
        "seedvr_commit": SEEDVR_COMMIT,
        "model_revision": MODEL_REVISION,
    }


def _validate_worker_protocol(worker_protocol: str | None) -> None:
    # Accept an omitted value during a rolling deployment so an older local
    # server can finish in-flight calls against the newly deployed worker. A
    # newer server always sends the value; an old worker then rejects the extra
    # keyword immediately instead of silently running stale inference code.
    if worker_protocol is None:
        return
    if worker_protocol != VIDEO_ENHANCER_WORKER_PROTOCOL:
        raise RuntimeError(
            "Video Enhancer client/worker version mismatch. Redeploy the "
            "MediaKeepa Video Enhancer before submitting another job."
        )


def _validate_dimensions(output_width: int, output_height: int) -> tuple[int, int]:
    width = int(output_width)
    height = int(output_height)
    if width < 16 or height < 16 or width > MAX_OUTPUT_EDGE or height > MAX_OUTPUT_EDGE:
        raise ValueError("Video output dimensions must be between 16 and 3,840 pixels per edge.")
    return width, height


def _model_dimensions(output_width: int, output_height: int) -> tuple[int, int]:
    """Render at or above the target on SeedVR2's 16-pixel boundaries."""

    target_width = ((output_width + 15) // 16) * 16
    target_height = ((output_height + 15) // 16) * 16
    scale = max(target_width / output_width, target_height / output_height)
    aligned_width = ((int(output_width * scale + 0.999999) + 15) // 16) * 16
    aligned_height = ((int(output_height * scale + 0.999999) + 15) // 16) * 16
    return aligned_width, aligned_height


def _prepare_checkpoints(model: str = "sharp") -> None:
    if model not in {"sharp", "natural"}:
        raise ValueError("Choose either the SeedVR2 7B Sharp or 7B Natural model.")
    selected = Path(MODEL_DIR) / (SHARP_CHECKPOINT if model == "sharp" else NATURAL_CHECKPOINT)
    vae = Path(MODEL_DIR) / VAE_CHECKPOINT
    if not selected.is_file() or not vae.is_file():
        raise RuntimeError(f"SeedVR2-7B {model.title()} is not prepared. Run download_weights before enhancement.")

    checkpoint_dir = Path(SEEDVR_DIR) / "ckpts"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    links = {
        checkpoint_dir / "seedvr2_ema_7b.pth": selected,
        checkpoint_dir / "ema_vae.pth": vae,
    }
    for destination, source in links.items():
        if destination.exists() or destination.is_symlink():
            destination.unlink()
        destination.symlink_to(source)


@dataclass(frozen=True)
class _EnhancementSettings:
    model: str = "sharp"
    preserve_source_color: bool = True
    seed: int = 666
    cfg_scale: float = 1.0
    cfg_rescale: float = 0.0
    detail: int = 0
    denoise: int = 0
    compression_repair: int = 0
    sharpen: int = 0
    grain: int = 0
    output_quality: str = "maximum"
    output_fps: float | None = None


def _validate_settings(
    model: str = "sharp",
    preserve_source_color: bool = True,
    seed: int = 666,
    cfg_scale: float = 1.0,
    cfg_rescale: float = 0.0,
    detail: int = 0,
    denoise: int = 0,
    compression_repair: int = 0,
    sharpen: int = 0,
    grain: int = 0,
    output_quality: str = "maximum",
    output_fps: float | None = None,
) -> _EnhancementSettings:
    selected_model = str(model).strip().lower()
    if selected_model not in {"sharp", "natural"}:
        raise ValueError("Choose either the SeedVR2 7B Sharp or 7B Natural model.")
    selected_quality = str(output_quality).strip().lower()
    if selected_quality not in {"maximum", "high", "balanced", "compact"}:
        raise ValueError("Choose a valid Video Enhancer output quality.")

    controls: dict[str, int] = {}
    for name, value in {
        "detail": detail,
        "denoise": denoise,
        "compression_repair": compression_repair,
        "sharpen": sharpen,
        "grain": grain,
    }.items():
        parsed = int(value)
        if parsed < 0 or parsed > 100:
            raise ValueError(f"Video Enhancer {name.replace('_', ' ')} must be between 0 and 100.")
        controls[name] = parsed

    parsed_seed = int(seed)
    if parsed_seed < 0 or parsed_seed > 2_147_483_647:
        raise ValueError("The SeedVR2 seed must be between 0 and 2,147,483,647.")
    parsed_cfg_scale = float(cfg_scale)
    parsed_cfg_rescale = float(cfg_rescale)
    if not 0.0 <= parsed_cfg_scale <= 3.0:
        raise ValueError("SeedVR2 CFG strength must be between 0 and 3.")
    if not 0.0 <= parsed_cfg_rescale <= 1.0:
        raise ValueError("SeedVR2 CFG rescale must be between 0 and 1.")
    parsed_fps = None if output_fps in {None, "", 0, 0.0} else float(output_fps)
    if parsed_fps is not None and not 1.0 <= parsed_fps <= 120.0:
        raise ValueError("Output frame rate must be between 1 and 120 FPS.")

    return _EnhancementSettings(
        model=selected_model,
        preserve_source_color=bool(preserve_source_color),
        seed=parsed_seed,
        cfg_scale=parsed_cfg_scale,
        cfg_rescale=parsed_cfg_rescale,
        output_quality=selected_quality,
        output_fps=parsed_fps,
        **controls,
    )


@dataclass(frozen=True)
class _VideoInfo:
    width: int
    height: int
    frame_count: int
    fps: Fraction


@dataclass(frozen=True)
class _TemporalWindow:
    input_start: int
    input_end: int
    keep_start: int
    keep_end: int


class _OfficialInferenceOOM(RuntimeError):
    """The isolated official inference process exhausted CUDA memory."""


def _parse_positive_int(*values: object) -> int | None:
    for value in values:
        try:
            parsed = int(str(value))
        except (TypeError, ValueError):
            continue
        if parsed > 0:
            return parsed
    return None


def _parse_fps(*values: object) -> Fraction | None:
    for value in values:
        try:
            parsed = Fraction(str(value))
        except (TypeError, ValueError, ZeroDivisionError):
            continue
        if parsed > 0:
            return parsed
    return None


def _probe_video(path: Path) -> _VideoInfo:
    completed = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
            "-show_entries",
            "stream=width,height,avg_frame_rate,r_frame_rate,nb_frames,nb_read_frames",
            "-of", "json", str(path),
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip().splitlines()[-1] if completed.stderr.strip() else "unknown ffprobe error"
        raise ValueError(f"The uploaded video's frame stream could not be inspected: {detail}")
    try:
        stream = json.loads(completed.stdout)["streams"][0]
        width = int(stream["width"])
        height = int(stream["height"])
    except (IndexError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise ValueError("The uploaded file does not contain a readable video stream.") from exc
    frame_count = _parse_positive_int(stream.get("nb_read_frames"), stream.get("nb_frames"))
    fps = _parse_fps(stream.get("avg_frame_rate"), stream.get("r_frame_rate"))
    if frame_count is None or fps is None:
        raise ValueError("The uploaded video's exact frame count or frame rate could not be determined safely.")
    return _VideoInfo(width=width, height=height, frame_count=frame_count, fps=fps)


def _temporal_window_size(
    output_width: int,
    output_height: int,
    gpu_memory_gib: float = H200_MEMORY_GIB,
) -> int:
    """Choose a 1-mod-16 window to avoid official SeedVR2 frame padding."""

    output_width, output_height = _validate_dimensions(output_width, output_height)
    model_width, model_height = _model_dimensions(output_width, output_height)
    pixel_count = model_width * model_height
    memory_scale = max(0.5, min(1.0, float(gpu_memory_gib) / H200_MEMORY_GIB))
    raw_frames = int(H200_PIXEL_FRAME_BUDGET * memory_scale) // pixel_count
    aligned_frames = 1 + 16 * max(0, (raw_frames - 1) // 16)
    return max(MIN_TEMPORAL_WINDOW_FRAMES, min(MAX_TEMPORAL_WINDOW_FRAMES, aligned_frames))


def _temporal_window_sizes(initial_max_frames: int) -> list[int]:
    """Return all valid caps from the initial estimate to the minimum."""

    if initial_max_frames < MIN_TEMPORAL_WINDOW_FRAMES or (initial_max_frames - 1) % 16 != 0:
        raise ValueError("The initial SeedVR2 temporal window must be at least 17 frames and 1 modulo 16.")
    return list(range(initial_max_frames, MIN_TEMPORAL_WINDOW_FRAMES - 1, -16))


def _official_padded_frame_count(frame_count: int, gpu_count: int = 4) -> int:
    """Mirror the official entrypoint's temporal padding for sequence parallelism."""

    if frame_count <= 0:
        raise ValueError("Video frame count must be positive.")
    if frame_count == 1:
        return 1
    block = 4 * gpu_count
    return 1 + block * max(1, (frame_count - 1 + block - 1) // block)


def _temporal_windows(frame_count: int, max_frames: int) -> list[_TemporalWindow]:
    if frame_count <= 0:
        raise ValueError("Video frame count must be positive.")
    if max_frames < MIN_TEMPORAL_WINDOW_FRAMES or (max_frames - 1) % 16 != 0:
        raise ValueError("SeedVR2 temporal windows must be at least 17 frames and 1 modulo 16.")
    if frame_count <= max_frames:
        return [_TemporalWindow(0, frame_count, 0, frame_count)]

    context = 16 if max_frames >= 81 else 8 if max_frames >= 33 else 4
    interior_capacity = max_frames - (2 * context)
    edge_capacity = max_frames - context
    window_count = 2
    while (2 * edge_capacity) + ((window_count - 2) * interior_capacity) < frame_count:
        window_count += 1
    core_lengths = [edge_capacity] + ([interior_capacity] * (window_count - 2)) + [edge_capacity]
    surplus = sum(core_lengths) - frame_count
    while surplus > 0:
        largest = max(range(len(core_lengths)), key=core_lengths.__getitem__)
        core_lengths[largest] -= 1
        surplus -= 1

    windows: list[_TemporalWindow] = []
    core_start = 0
    for core_length in core_lengths:
        core_end = core_start + core_length
        input_start = max(0, core_start - context)
        input_end = min(frame_count, core_end + context)
        keep_start = core_start - input_start
        windows.append(
            _TemporalWindow(
                input_start=input_start,
                input_end=input_end,
                keep_start=keep_start,
                keep_end=keep_start + (core_end - core_start),
            )
        )
        core_start = core_end
    if core_start != frame_count:
        raise RuntimeError("The SeedVR2 temporal planner did not cover the complete video.")
    return windows


def _temporal_retry_sizes(frame_count: int, initial_max_frames: int) -> list[int]:
    """Keep only caps that reduce the largest tensor the official code creates."""

    retry_sizes: list[int] = []
    last_padded_load: int | None = None
    for max_frames in _temporal_window_sizes(initial_max_frames):
        padded_load = _largest_official_padded_window(frame_count, max_frames)
        if last_padded_load is None or padded_load < last_padded_load:
            retry_sizes.append(max_frames)
            last_padded_load = padded_load
    return retry_sizes


def _largest_official_padded_window(frame_count: int, max_frames: int) -> int:
    windows = _temporal_windows(frame_count, max_frames)
    return max(
        _official_padded_frame_count(window.input_end - window.input_start)
        for window in windows
    )


def _preprocess_filters(settings: _EnhancementSettings) -> list[str]:
    filters: list[str] = []
    if settings.compression_repair:
        strength = settings.compression_repair / 100.0
        filters.append(
            "deblock=filter=strong:block=8:"
            f"alpha={0.02 + 0.078 * strength:.4f}:"
            f"beta={0.01 + 0.040 * strength:.4f}:"
            f"gamma={0.01 + 0.040 * strength:.4f}:"
            f"delta={0.01 + 0.040 * strength:.4f}"
        )
    if settings.denoise:
        strength = settings.denoise / 100.0
        luma = 0.5 + 7.5 * strength
        chroma = 0.375 + 5.625 * strength
        filters.append(f"hqdn3d={luma:.3f}:{chroma:.3f}:{luma * 1.5:.3f}:{chroma * 1.5:.3f}")
    return filters


def _postprocess_filters(
    settings: _EnhancementSettings,
    *,
    include_fps: bool = True,
) -> list[str]:
    filters: list[str] = []
    if settings.detail:
        filters.append(f"cas=strength={0.8 * settings.detail / 100.0:.3f}")
    if settings.sharpen:
        filters.append(f"unsharp=5:5:{1.2 * settings.sharpen / 100.0:.3f}:5:5:0")
    if settings.grain:
        grain_strength = max(1, round(15 * settings.grain / 100.0))
        filters.append(f"noise=alls={grain_strength}:allf=t+u")
    if include_fps and settings.output_fps is not None:
        filters.append(f"fps=fps={settings.output_fps:.6f}:round=near")
    return filters


def _extract_temporal_window(
    source: Path,
    destination: Path,
    window: _TemporalWindow,
    settings: _EnhancementSettings,
) -> None:
    frame_filters = [
        f"select=between(n\\,{window.input_start}\\,{window.input_end - 1})",
        "setpts=N/FRAME_RATE/TB",
        *_preprocess_filters(settings),
    ]
    frame_filter = ",".join(frame_filters)
    completed = subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(source), "-vf", frame_filter,
            "-an", "-vsync", "0", "-c:v", "ffv1", "-level", "3",
            "-pix_fmt", "bgr0", str(destination),
        ],
        text=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0 or not destination.is_file() or destination.stat().st_size == 0:
        detail = completed.stderr.strip().splitlines()[-1] if completed.stderr.strip() else "unknown ffmpeg error"
        raise RuntimeError(f"Could not prepare a lossless SeedVR2 temporal window: {detail}")


def _is_cuda_oom(log_text: str) -> bool:
    normalized = log_text.casefold()
    return any(
        marker in normalized
        for marker in (
            "cuda out of memory",
            "cuda error: out of memory",
            "torch.outofmemoryerror",
            "allocation on device",
        )
    )


def _failure_detail(log_text: str) -> str:
    lines = [line.strip() for line in log_text.splitlines() if line.strip()]
    if _is_cuda_oom(log_text):
        return "CUDA ran out of memory inside an official SeedVR2 inference window"
    for line in reversed(lines):
        if "RuntimeError:" in line or "OutOfMemoryError:" in line:
            return line.split("]:", 1)[-1].strip()[-600:]
    for line in reversed(lines):
        if not line.startswith(("[rank", "W0", "E0")) and line.strip("=-"):
            return line[-600:]
    return lines[-1][-600:] if lines else "the official process exited without an error message"


def _invoke_official_inference(
    input_dir: Path,
    output_dir: Path,
    output_width: int,
    output_height: int,
    gpu_count: int,
    *,
    settings: _EnhancementSettings | None = None,
    lossless_output: bool = False,
) -> None:
    settings = settings or _EnhancementSettings()
    _prepare_checkpoints(settings.model)
    width, height = _validate_dimensions(output_width, output_height)
    model_width, model_height = _model_dimensions(width, height)
    command = [
        "torchrun",
        f"--nproc-per-node={gpu_count}",
        "projects/inference_seedvr2_7b.py",
        "--video_path",
        str(input_dir),
        "--output_dir",
        str(output_dir),
        "--seed",
        str(settings.seed),
        "--res_h",
        str(model_height),
        "--res_w",
        str(model_width),
        "--sp_size",
        str(gpu_count),
        "--exact_res_h",
        str(height),
        "--exact_res_w",
        str(width),
        "--cfg_scale",
        str(settings.cfg_scale),
        "--cfg_rescale",
        str(settings.cfg_rescale),
    ]
    if not settings.preserve_source_color:
        command.append("--no-preserve_source_color")
    if lossless_output:
        command.append("--lossless_output")
    environment = os.environ.copy()
    environment.update(
        PYTHONPATH=SEEDVR_DIR,
        PYTHONUNBUFFERED="1",
        TORCH_HOME=MODEL_DIR,
    )
    # Override any inherited allocator setting. The failing VAE phase had
    # 16.67 GiB reserved but unallocated, so expandable segments must be active
    # before torch is imported by any of the isolated worker ranks.
    environment["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
    with tempfile.TemporaryFile(mode="w+", encoding="utf-8") as log:
        completed = subprocess.run(
            command,
            cwd=SEEDVR_DIR,
            env=environment,
            text=True,
            stdout=log,
            stderr=subprocess.STDOUT,
            check=False,
        )
        log.seek(0)
        log_text = log.read()
    if completed.returncode != 0:
        print(log_text, file=sys.stderr, flush=True)
        model_label = "Sharp" if settings.model == "sharp" else "Natural"
        message = f"Official SeedVR2-7B {model_label} inference failed: {_failure_detail(log_text)}."
        if _is_cuda_oom(log_text):
            raise _OfficialInferenceOOM(message)
        raise RuntimeError(message)


def _run_official_inference(
    input_path: Path,
    output_dir: Path,
    output_width: int,
    output_height: int,
    gpu_count: int,
    settings: _EnhancementSettings | None = None,
) -> Path:
    _invoke_official_inference(
        input_path.parent,
        output_dir,
        output_width,
        output_height,
        gpu_count,
        settings=settings,
    )
    output_path = output_dir / input_path.name
    if not output_path.is_file() or output_path.stat().st_size == 0:
        raise RuntimeError("SeedVR2 completed without producing a valid output file.")
    return output_path


def _join_temporal_windows(
    restored_paths: list[Path],
    windows: list[_TemporalWindow],
    destination: Path,
    fps: Fraction,
    settings: _EnhancementSettings,
) -> None:
    command = ["ffmpeg", "-y"]
    for path in restored_paths:
        command.extend(["-i", str(path)])
    filters: list[str] = []
    labels: list[str] = []
    for index, window in enumerate(windows):
        label = f"v{index}"
        filters.append(
            f"[{index}:v]trim=start_frame={window.keep_start}:end_frame={window.keep_end},"
            f"setpts=PTS-STARTPTS[{label}]"
        )
        labels.append(f"[{label}]")
    post_filters = _postprocess_filters(settings)
    if post_filters:
        filters.append(f"{''.join(labels)}concat=n={len(labels)}:v=1:a=0[joined]")
        filters.append(f"[joined]{','.join(post_filters)}[outv]")
    else:
        filters.append(f"{''.join(labels)}concat=n={len(labels)}:v=1:a=0[outv]")
    crf = {"maximum": 10, "high": 14, "balanced": 18, "compact": 22}[settings.output_quality]
    output_rate = (
        f"{settings.output_fps:.6f}"
        if settings.output_fps is not None
        else f"{fps.numerator}/{fps.denominator}"
    )
    command.extend(
        [
            "-filter_complex", ";".join(filters), "-map", "[outv]", "-an",
            "-r", output_rate, "-c:v", "libx264",
            "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(destination),
        ]
    )
    completed = subprocess.run(
        command,
        text=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0 or not destination.is_file() or destination.stat().st_size == 0:
        detail = completed.stderr.strip().splitlines()[-1] if completed.stderr.strip() else "unknown ffmpeg error"
        raise RuntimeError(f"SeedVR2 restored every temporal window, but they could not be joined: {detail}")


def _restore_temporal_attempt(
    source: Path,
    attempt_root: Path,
    info: _VideoInfo,
    output_width: int,
    output_height: int,
    max_frames: int,
    settings: _EnhancementSettings | None = None,
) -> Path:
    settings = settings or _EnhancementSettings()
    windows = _temporal_windows(info.frame_count, max_frames)
    input_root = attempt_root / "temporal-input"
    output_root = attempt_root / "temporal-output"
    input_root.mkdir()
    output_root.mkdir()
    print(
        f"SeedVR2 temporal plan: {info.frame_count} frames at {output_width}x{output_height}; "
        f"{len(windows)} overlapping windows, at most {max_frames} frames each.",
        flush=True,
    )
    restored_paths: list[Path] = []
    for index, window in enumerate(windows):
        input_dir = input_root / f"window-{index:05d}"
        output_dir = output_root / f"window-{index:05d}"
        input_dir.mkdir()
        output_dir.mkdir()
        input_path = input_dir / f"window-{index:05d}.mkv"
        _extract_temporal_window(source, input_path, window, settings)
        print(f"SeedVR2 window {index + 1}/{len(windows)}: starting isolated official inference.", flush=True)
        _invoke_official_inference(
            input_dir,
            output_dir,
            output_width,
            output_height,
            4,
            settings=settings,
            lossless_output=True,
        )
        restored_path = output_dir / input_path.name
        if not restored_path.is_file() or restored_path.stat().st_size == 0:
            raise RuntimeError(f"SeedVR2 did not produce temporal window {index + 1} of {len(windows)}.")
        restored_paths.append(restored_path)
    restored = attempt_root / "restored-video.mp4"
    _join_temporal_windows(restored_paths, windows, restored, info.fps, settings)
    return restored


def _available_gpu_memory_gib() -> float:
    """Read GPU capacity without initializing CUDA in the parent process."""

    completed = subprocess.run(
        [
            "nvidia-smi",
            "--query-gpu=memory.total",
            "--format=csv,noheader,nounits",
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode == 0:
        for line in completed.stdout.splitlines():
            try:
                memory_mib = float(line.strip())
            except ValueError:
                continue
            if memory_mib > 0:
                return memory_mib / 1024.0
    # Modal's requested pool is H200-first; using the H200 budget on an unknown
    # device keeps the probe failure non-fatal and preserves existing fallback.
    return H200_MEMORY_GIB


def _restore_video_in_temporal_windows(
    source: Path,
    root: Path,
    output_width: int,
    output_height: int,
    settings: _EnhancementSettings | None = None,
) -> Path:
    settings = settings or _EnhancementSettings()
    info = _probe_video(source)
    initial_max_frames = _temporal_window_size(
        output_width,
        output_height,
        _available_gpu_memory_gib(),
    )
    window_sizes = _temporal_retry_sizes(info.frame_count, initial_max_frames)
    for attempt_index, max_frames in enumerate(window_sizes):
        attempt_root = root / f"temporal-attempt-{attempt_index:02d}-{max_frames}-frames"
        attempt_root.mkdir()
        try:
            return _restore_temporal_attempt(
                source,
                attempt_root,
                info,
                output_width,
                output_height,
                max_frames,
                settings,
            )
        except _OfficialInferenceOOM as exc:
            # All CUDA work lives in the completed torchrun child processes.
            # Remove their large FFV1 intermediates before starting a clean,
            # smaller plan in a new distributed process group.
            shutil.rmtree(attempt_root, ignore_errors=True)
            if attempt_index + 1 < len(window_sizes):
                next_max_frames = window_sizes[attempt_index + 1]
                failed_padded_frames = _largest_official_padded_window(info.frame_count, max_frames)
                next_padded_frames = _largest_official_padded_window(info.frame_count, next_max_frames)
                print(
                    f"SeedVR2 exhausted CUDA memory with a {failed_padded_frames}-frame "
                    f"official temporal load; retrying at {next_padded_frames} frames "
                    f"(planner cap {next_max_frames}).",
                    flush=True,
                )
                continue
            model_width, model_height = _model_dimensions(output_width, output_height)
            final_padded_frames = _largest_official_padded_window(info.frame_count, max_frames)
            raise RuntimeError(
                f"Official SeedVR2-7B {settings.model.title()} exhausted CUDA memory even after MediaKeepa "
                f"reduced inference to its smallest distinct four-GPU temporal load "
                f"({final_padded_frames} padded frames per window) at {model_width}x{model_height}."
            ) from exc
    raise RuntimeError("SeedVR2 did not execute a temporal inference plan.")


def _mux_original_audio(restored_video: Path, source_video: Path, destination: Path) -> None:
    copy_audio = subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(restored_video), "-i", str(source_video),
            "-map", "0:v:0", "-map", "1:a?", "-map_metadata", "1",
            "-c:v", "copy", "-c:a", "copy", "-movflags", "+faststart", str(destination),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if copy_audio.returncode == 0 and destination.is_file() and destination.stat().st_size > 0:
        return
    # Some source audio codecs cannot live in MP4. Preserve timing and channel
    # layout while converting only the audio stream to high-bitrate AAC.
    completed = subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(restored_video), "-i", str(source_video),
            "-map", "0:v:0", "-map", "1:a?", "-map_metadata", "1",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "320k",
            "-movflags", "+faststart", str(destination),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if completed.returncode != 0 or not destination.is_file() or destination.stat().st_size == 0:
        raise RuntimeError("The restored video was created, but its original audio could not be muxed safely.")


def _filter_preview_frame(source: Path, destination: Path, filters: list[str]) -> None:
    if not filters:
        shutil.copy2(source, destination)
        return
    completed = subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(source), "-vf", ",".join(filters),
            "-frames:v", "1", str(destination),
        ],
        text=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0 or not destination.is_file() or destination.stat().st_size == 0:
        detail = completed.stderr.strip().splitlines()[-1] if completed.stderr.strip() else "unknown ffmpeg error"
        raise RuntimeError(f"Could not apply the Video Enhancer preview processing: {detail}")


@app.function(
    image=seedvr_image,
    gpu=PREVIEW_GPU,
    volumes={MODEL_DIR: model_volume},
    secrets=[huggingface_secret],
    timeout=60 * 45,
    startup_timeout=60 * 30,
    min_containers=MIN_CONTAINERS,
    scaledown_window=SCALEDOWN_WINDOW,
    max_containers=1,
    retries=modal.Retries(max_retries=1, backoff_coefficient=2.0),
)
def enhance_preview(
    frame_bytes: bytes,
    output_width: int,
    output_height: int,
    worker_protocol: str | None = None,
    model: str = "sharp",
    preserve_source_color: bool = True,
    seed: int = 666,
    cfg_scale: float = 1.0,
    cfg_rescale: float = 0.0,
    detail: int = 0,
    denoise: int = 0,
    compression_repair: int = 0,
    sharpen: int = 0,
    grain: int = 0,
    output_quality: str = "maximum",
    output_fps: float | None = None,
) -> bytes:
    """Enhance an exact selected frame with the requested restoration pipeline."""

    _validate_worker_protocol(worker_protocol)
    settings = _validate_settings(
        model, preserve_source_color, seed, cfg_scale, cfg_rescale, detail,
        denoise, compression_repair, sharpen, grain, output_quality, output_fps,
    )
    if not frame_bytes or len(frame_bytes) > 64 * 1024 * 1024:
        raise ValueError("Preview frames must be non-empty PNG images no larger than 64 MB.")
    with tempfile.TemporaryDirectory(prefix="mediakeepa-seedvr-preview-") as temporary:
        root = Path(temporary)
        input_dir = root / "input"
        output_dir = root / "output"
        input_dir.mkdir()
        output_dir.mkdir()
        source_path = root / "source.png"
        input_path = input_dir / "preview.png"
        source_path.write_bytes(frame_bytes)
        _filter_preview_frame(source_path, input_path, _preprocess_filters(settings))
        output_path = _run_official_inference(
            input_path, output_dir, output_width, output_height, 1, settings,
        )
        final_path = root / "mediakeepa-preview.png"
        _filter_preview_frame(
            output_path,
            final_path,
            _postprocess_filters(settings, include_fps=False),
        )
        return final_path.read_bytes()


@app.function(
    image=seedvr_image,
    gpu=FULL_GPU,
    volumes={MODEL_DIR: model_volume},
    secrets=[huggingface_secret],
    timeout=24 * 60 * 60,
    startup_timeout=60 * 30,
    min_containers=MIN_CONTAINERS,
    scaledown_window=SCALEDOWN_WINDOW,
    max_containers=1,
)
def enhance_video(
    video_bytes: bytes,
    output_width: int,
    output_height: int,
    worker_protocol: str | None = None,
    model: str = "sharp",
    preserve_source_color: bool = True,
    seed: int = 666,
    cfg_scale: float = 1.0,
    cfg_rescale: float = 0.0,
    detail: int = 0,
    denoise: int = 0,
    compression_repair: int = 0,
    sharpen: int = 0,
    grain: int = 0,
    output_quality: str = "maximum",
    output_fps: float | None = None,
) -> bytes:
    """Restore a complete video on four Hopper GPUs and preserve its audio."""

    _validate_worker_protocol(worker_protocol)
    settings = _validate_settings(
        model, preserve_source_color, seed, cfg_scale, cfg_rescale, detail,
        denoise, compression_repair, sharpen, grain, output_quality, output_fps,
    )
    if not video_bytes:
        raise ValueError("The uploaded video is empty.")
    if len(video_bytes) > MAX_VIDEO_BYTES:
        raise ValueError("Video Enhancer currently accepts source videos up to 512 MB.")
    with tempfile.TemporaryDirectory(prefix="mediakeepa-seedvr-video-") as temporary:
        root = Path(temporary)
        input_dir = root / "input"
        input_dir.mkdir()
        input_path = input_dir / "source.mp4"
        input_path.write_bytes(video_bytes)
        restored = _restore_video_in_temporal_windows(
            input_path,
            root,
            output_width,
            output_height,
            settings,
        )
        final_path = root / "mediakeepa-enhanced.mp4"
        _mux_original_audio(restored, input_path, final_path)
        return final_path.read_bytes()
