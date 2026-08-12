"""Modal GPU worker for image-only background removal with Bria RMBG-2.0.

The self-hosted model is non-commercial unless a separate agreement with Bria
applies. Accept the model terms on Hugging Face and create a Modal secret named
``MediaKeepa_backgroundremover`` containing ``HF_TOKEN`` before deployment.
"""

from __future__ import annotations

import io
import os

import modal


APP_NAME = "mediakeepa-background-remover"
MODEL_ID = "briaai/RMBG-2.0"
MODEL_REVISION = os.environ.get("RMBG_MODEL_REVISION", "main")
MODEL_DIR = "/models"
MODEL_VOLUME_NAME = "mediakeepa-background-remover"
HUGGINGFACE_SECRET_NAME = "MediaKeepa_backgroundremover"
MAX_IMAGE_BYTES = 20 * 1024 * 1024
MAX_DIMENSION = 16000
MAX_PIXELS = 64_000_000
GPU_TYPE = os.environ.get("MEDIAKEEPA_BACKGROUND_GPU", "L4")
MIN_CONTAINERS = int(os.environ.get("MEDIAKEEPA_BACKGROUND_MIN_CONTAINERS", "0"))
BUFFER_CONTAINERS = int(os.environ.get("MEDIAKEEPA_BACKGROUND_BUFFER_CONTAINERS", "0"))
SCALEDOWN_WINDOW = int(os.environ.get("MEDIAKEEPA_BACKGROUND_SCALEDOWN_WINDOW", "60"))

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        "transformers==4.47.1",
        "kornia==0.8.0",
        "pillow==12.0.0",
        "safetensors==0.5.2",
        "timm==1.0.19",
    )
)

app = modal.App(APP_NAME)
model_volume = modal.Volume.from_name(
    MODEL_VOLUME_NAME,
    create_if_missing=True,
)
huggingface_secret = modal.Secret.from_name(HUGGINGFACE_SECRET_NAME)

_model = None
_transform = None


@app.function(
    image=image,
    volumes={MODEL_DIR: model_volume},
    secrets=[huggingface_secret],
    timeout=30 * 60,
    retries=modal.Retries(max_retries=2, backoff_coefficient=2.0),
)
def download_weights() -> str:
    """Download the gated RMBG-2.0 snapshot into MediaKeepa's Modal volume."""
    from huggingface_hub import snapshot_download

    token = os.environ.get("HF_TOKEN")
    if not token:
        raise RuntimeError(f"The Modal secret {HUGGINGFACE_SECRET_NAME} must contain HF_TOKEN.")

    snapshot_path = snapshot_download(
        repo_id=MODEL_ID,
        revision=MODEL_REVISION,
        cache_dir=MODEL_DIR,
        token=token,
    )
    model_volume.commit()
    return f"{MODEL_ID}@{MODEL_REVISION} cached in {MODEL_VOLUME_NAME}: {snapshot_path}"


def _load_model():
    """Load and cache the gated RMBG-2.0 weights once per warm container."""
    global _model, _transform
    if _model is not None:
        return _model, _transform

    import timm  # noqa: F401 - required by RMBG-2.0's trusted remote architecture
    import torch
    from torchvision import transforms
    from transformers import AutoModelForImageSegmentation

    token = os.environ.get("HF_TOKEN")
    if not token:
        raise RuntimeError(f"The Modal secret {HUGGINGFACE_SECRET_NAME} must contain HF_TOKEN.")

    _model = AutoModelForImageSegmentation.from_pretrained(
        MODEL_ID,
        revision=MODEL_REVISION,
        trust_remote_code=True,
        cache_dir=MODEL_DIR,
        token=token,
    )
    torch.set_float32_matmul_precision("high")
    _model.to("cuda")
    _model.eval()
    _transform = transforms.Compose([
        transforms.Resize((1024, 1024)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    model_volume.commit()
    return _model, _transform


@app.cls(
    image=image,
    gpu=GPU_TYPE,
    volumes={MODEL_DIR: model_volume},
    secrets=[huggingface_secret],
    timeout=5 * 60,
    startup_timeout=20 * 60,
    min_containers=MIN_CONTAINERS,
    buffer_containers=BUFFER_CONTAINERS,
    scaledown_window=SCALEDOWN_WINDOW,
    max_containers=3,
    retries=modal.Retries(max_retries=1, backoff_coefficient=2.0),
)
class BackgroundRemover:
    """RMBG-2.0 service that initializes when its on-demand container starts."""

    @modal.enter()
    def initialize(self):
        import torch

        self.model, self.transform = _load_model()

        # Materialize CUDA kernels during warm-up rather than on a user's image.
        sample = torch.zeros((1, 3, 1024, 1024), device="cuda")
        with torch.inference_mode():
            self.model(sample)
        torch.cuda.synchronize()

    @modal.method()
    def remove(self, image_bytes: bytes) -> bytes:
        """Return a full-resolution transparent PNG for one uploaded image."""
        if not image_bytes:
            raise ValueError("The uploaded image is empty.")
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise ValueError("Images must be 20 MB or smaller.")

        import torch
        from PIL import Image, ImageOps, UnidentifiedImageError
        from torchvision import transforms

        try:
            with Image.open(io.BytesIO(image_bytes)) as source:
                source.load()
                original = ImageOps.exif_transpose(source).convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("Choose a valid JPG, PNG, or WebP image.") from exc

        if original.width > MAX_DIMENSION or original.height > MAX_DIMENSION:
            raise ValueError("Images must be 16,000 pixels or smaller on each side.")
        if original.width * original.height > MAX_PIXELS:
            raise ValueError("Images must contain 64 megapixels or fewer.")

        input_tensor = self.transform(original).unsqueeze(0).to("cuda")
        with torch.inference_mode():
            prediction = self.model(input_tensor)[-1].sigmoid().cpu()[0].squeeze()

        mask = transforms.ToPILImage()(prediction).resize(original.size, Image.Resampling.LANCZOS)
        result = original.convert("RGBA")
        result.putalpha(mask)
        output = io.BytesIO()
        # Low compression keeps lossless output while avoiding an expensive
        # full-resolution optimization pass on the user's critical path.
        result.save(output, format="PNG", compress_level=1)
        return output.getvalue()


@app.function(
    timeout=6 * 60,
    min_containers=MIN_CONTAINERS,
    scaledown_window=SCALEDOWN_WINDOW,
)
def remove_background(image_bytes: bytes) -> bytes:
    """Compatibility entrypoint for existing Modal-Rotation registrations."""
    return BackgroundRemover().remove.remote(image_bytes)
