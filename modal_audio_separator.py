"""Modal GPU worker for MediaKeepa's quality-first audio separation."""

from __future__ import annotations

import os
import tempfile
import zipfile
from pathlib import Path

import modal


APP_NAME = "mediakeepa-audio-separator"
MODEL_DIR = "/models"
VOCAL_MODEL = "model_bs_roformer_ep_317_sdr_12.9755.ckpt"
ALLOWED_EXTENSIONS = {"mp3", "wav", "flac", "m4a", "aac", "ogg"}
GPU_TYPE = os.environ.get("MEDIAKEEPA_AUDIO_GPU", "L40S")
MIN_CONTAINERS = int(os.environ.get("MEDIAKEEPA_AUDIO_MIN_CONTAINERS", "0"))
BUFFER_CONTAINERS = int(os.environ.get("MEDIAKEEPA_AUDIO_BUFFER_CONTAINERS", "0"))
SCALEDOWN_WINDOW = int(os.environ.get("MEDIAKEEPA_AUDIO_SCALEDOWN_WINDOW", "60"))

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("audio-separator[gpu]==0.44.5")
)

app = modal.App(APP_NAME)
model_volume = modal.Volume.from_name(
    "mediakeepa-audio-models",
    create_if_missing=True,
)

_vocal_separator = None


def _load_separator(output_dir: str):
    """Load the specialist vocal/accompaniment model once per warm container."""
    global _vocal_separator

    if _vocal_separator is not None:
        return _vocal_separator

    from audio_separator.separator import Separator

    _vocal_separator = Separator(
        model_file_dir=MODEL_DIR,
        output_dir=output_dir,
        output_format="WAV",
        use_autocast=False,
    )
    _vocal_separator.load_model(VOCAL_MODEL)

    # Persist first-run downloads so later containers reuse the same weights.
    model_volume.commit()
    return _vocal_separator


def _set_output_dir(separator, output_dir: str) -> None:
    separator.output_dir = output_dir
    if separator.model_instance is not None:
        separator.model_instance.output_dir = output_dir


def _find_output(
    output_files: list[str],
    expected_prefix: str,
    output_dir: Path,
) -> Path:
    candidates: list[Path] = []
    for output_file in output_files:
        path = Path(output_file)
        resolved_path = path if path.is_absolute() else output_dir / path
        if resolved_path.is_file() and resolved_path not in candidates:
            candidates.append(resolved_path)
    for path in output_dir.glob("*.wav"):
        if path.is_file() and path not in candidates:
            candidates.append(path)

    tokens = {
        "vocals": ("vocal", "vocals"),
        "music": ("music", "instrumental", "accompaniment"),
    }.get(expected_prefix.lower(), (expected_prefix.lower(),))
    for path in candidates:
        lowered = path.name.lower()
        if any(token in lowered for token in tokens):
            return path

    available = ", ".join(path.name for path in candidates) or "none"
    raise RuntimeError(f"The separator did not produce {expected_prefix}; available outputs: {available}.")


@app.cls(
    image=image,
    gpu=GPU_TYPE,
    volumes={MODEL_DIR: model_volume},
    timeout=60 * 30,
    startup_timeout=60 * 20,
    min_containers=MIN_CONTAINERS,
    buffer_containers=BUFFER_CONTAINERS,
    scaledown_window=SCALEDOWN_WINDOW,
    max_containers=2,
    retries=modal.Retries(max_retries=1, backoff_coefficient=2.0),
)
class AudioSeparator:
    """Separator that loads weights when its on-demand container starts."""

    @modal.enter()
    def initialize(self):
        warm_output = Path("/tmp/mediakeepa-audio-warm")
        warm_output.mkdir(parents=True, exist_ok=True)
        self.separator = _load_separator(str(warm_output))

    @modal.method()
    def separate(self, audio_bytes: bytes, extension: str) -> bytes:
        """Return a ZIP containing the specialist vocals and full music tracks."""
        safe_extension = extension.lower().lstrip(".")
        if safe_extension not in ALLOWED_EXTENSIONS:
            raise ValueError("Unsupported audio file extension.")
        if not audio_bytes:
            raise ValueError("The uploaded audio file is empty.")

        with tempfile.TemporaryDirectory(prefix="mediakeepa-") as temp_dir:
            input_path = Path(temp_dir) / f"input.{safe_extension}"
            output_dir = Path(temp_dir) / "outputs"
            output_dir.mkdir()
            input_path.write_bytes(audio_bytes)

            _set_output_dir(self.separator, str(output_dir))
            vocal_outputs = self.separator.separate(
                str(input_path),
                custom_output_names={
                    "Vocals": "vocals",
                    "Instrumental": "music",
                },
            )

            stem_paths = {
                "vocals.wav": _find_output(vocal_outputs, "vocals", output_dir),
                "music.wav": _find_output(vocal_outputs, "music", output_dir),
            }
            if stem_paths["vocals.wav"] == stem_paths["music.wav"]:
                raise RuntimeError("The separator resolved vocals and music to the same output file.")

            archive_path = Path(temp_dir) / "mediakeepa-stems.zip"
            with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_STORED) as archive:
                for archive_name, stem_path in stem_paths.items():
                    archive.write(stem_path, arcname=archive_name)

            return archive_path.read_bytes()


@app.function(
    timeout=60 * 31,
    min_containers=MIN_CONTAINERS,
    scaledown_window=SCALEDOWN_WINDOW,
)
def separate_audio(audio_bytes: bytes, extension: str) -> bytes:
    """Compatibility entrypoint for existing Modal-Rotation registrations."""
    return AudioSeparator().separate.remote(audio_bytes, extension)
