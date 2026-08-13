"""Quality-first Modal worker for MediaKeepa Video Enhancer.

This deployment invokes ByteDance Seed's official SeedVR2 7B inference code and
the official ``seedvr2_ema_7b_sharp.pth`` checkpoint directly. It intentionally
does not quantize, tile, offload weights to reduced precision, or substitute a
smaller preview model.
"""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

import modal


APP_NAME = "mediakeepa-video-enhancer"
SEEDVR_REPOSITORY = "https://github.com/ByteDance-Seed/SeedVR.git"
SEEDVR_COMMIT = "e4de8c24441a67e1b7df56abea10645059bb1185"
MODEL_REPOSITORY = "ByteDance-Seed/SeedVR2-7B"
MODEL_REVISION = "eb0c4281d41ba3767d4f14370f0e37e9e9180c16"
SHARP_CHECKPOINT = "seedvr2_ema_7b_sharp.pth"
VAE_CHECKPOINT = "ema_vae.pth"
MODEL_DIR = "/models"
SEEDVR_DIR = "/opt/seedvr"
MODEL_VOLUME_NAME = "mediakeepa-seedvr2-7b-sharp"
HUGGINGFACE_SECRET_NAME = "MediaKeepa_backgroundremover"
PREVIEW_GPU = ["H200", "H100"]
FULL_GPU = ["H200:4", "H100:4"]
MIN_CONTAINERS = int(os.environ.get("MEDIAKEEPA_VIDEO_MIN_CONTAINERS", "0"))
SCALEDOWN_WINDOW = int(os.environ.get("MEDIAKEEPA_VIDEO_SCALEDOWN_WINDOW", "60"))
MAX_VIDEO_BYTES = 512 * 1024 * 1024
MAX_OUTPUT_EDGE = 3840

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
    """Cache only the official Sharp 7B and VAE checkpoints in Modal."""

    from huggingface_hub import snapshot_download

    snapshot_download(
        repo_id=MODEL_REPOSITORY,
        revision=MODEL_REVISION,
        local_dir=MODEL_DIR,
        token=_token(),
        allow_patterns=[SHARP_CHECKPOINT, VAE_CHECKPOINT],
    )
    model_volume.commit()
    return f"{MODEL_REPOSITORY}@{MODEL_REVISION}/{SHARP_CHECKPOINT} cached in {MODEL_VOLUME_NAME}"


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


def _prepare_checkpoints() -> None:
    sharp = Path(MODEL_DIR) / SHARP_CHECKPOINT
    vae = Path(MODEL_DIR) / VAE_CHECKPOINT
    if not sharp.is_file() or not vae.is_file():
        raise RuntimeError("SeedVR2-7B Sharp is not prepared. Run download_weights before enhancement.")

    checkpoint_dir = Path(SEEDVR_DIR) / "ckpts"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    links = {
        checkpoint_dir / "seedvr2_ema_7b.pth": sharp,
        checkpoint_dir / "ema_vae.pth": vae,
    }
    for destination, source in links.items():
        if destination.exists() or destination.is_symlink():
            destination.unlink()
        destination.symlink_to(source)


def _run_official_inference(
    input_path: Path,
    output_dir: Path,
    output_width: int,
    output_height: int,
    gpu_count: int,
) -> Path:
    _prepare_checkpoints()
    width, height = _validate_dimensions(output_width, output_height)
    model_width, model_height = _model_dimensions(width, height)
    command = [
        "torchrun",
        f"--nproc-per-node={gpu_count}",
        "projects/inference_seedvr2_7b.py",
        "--video_path",
        str(input_path.parent),
        "--output_dir",
        str(output_dir),
        "--seed",
        "666",
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
    ]
    environment = os.environ.copy()
    environment.update(
        PYTHONPATH=SEEDVR_DIR,
        PYTHONUNBUFFERED="1",
        TORCH_HOME=MODEL_DIR,
    )
    completed = subprocess.run(
        command,
        cwd=SEEDVR_DIR,
        env=environment,
        text=True,
        stdout=None,
        stderr=None,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            "Official SeedVR2-7B Sharp inference failed. The selected output may require more memory than four Hopper GPUs can provide."
        )
    output_path = output_dir / input_path.name
    if not output_path.is_file() or output_path.stat().st_size == 0:
        raise RuntimeError("SeedVR2 completed without producing a valid output file.")
    return output_path


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
def enhance_preview(frame_bytes: bytes, output_width: int, output_height: int) -> bytes:
    """Enhance an exact selected frame with the full unquantized Sharp model."""

    if not frame_bytes or len(frame_bytes) > 64 * 1024 * 1024:
        raise ValueError("Preview frames must be non-empty PNG images no larger than 64 MB.")
    with tempfile.TemporaryDirectory(prefix="mediakeepa-seedvr-preview-") as temporary:
        root = Path(temporary)
        input_dir = root / "input"
        output_dir = root / "output"
        input_dir.mkdir()
        output_dir.mkdir()
        input_path = input_dir / "preview.png"
        input_path.write_bytes(frame_bytes)
        output_path = _run_official_inference(input_path, output_dir, output_width, output_height, 1)
        return output_path.read_bytes()


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
    retries=modal.Retries(max_retries=1, backoff_coefficient=2.0),
)
def enhance_video(video_bytes: bytes, output_width: int, output_height: int) -> bytes:
    """Restore a complete video on four Hopper GPUs and preserve its audio."""

    if not video_bytes:
        raise ValueError("The uploaded video is empty.")
    if len(video_bytes) > MAX_VIDEO_BYTES:
        raise ValueError("Video Enhancer currently accepts source videos up to 512 MB.")
    with tempfile.TemporaryDirectory(prefix="mediakeepa-seedvr-video-") as temporary:
        root = Path(temporary)
        input_dir = root / "input"
        output_dir = root / "output"
        input_dir.mkdir()
        output_dir.mkdir()
        input_path = input_dir / "source.mp4"
        input_path.write_bytes(video_bytes)
        restored = _run_official_inference(input_path, output_dir, output_width, output_height, 4)
        final_path = root / "mediakeepa-enhanced.mp4"
        _mux_original_audio(restored, input_path, final_path)
        return final_path.read_bytes()
