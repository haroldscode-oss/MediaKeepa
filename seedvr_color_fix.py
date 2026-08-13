"""Color-preserving wavelet reconstruction used by MediaKeepa's SeedVR2 worker.

SeedVR's official inference entrypoint optionally imports ``wavelet_reconstruction``
from this location. Keeping the low-frequency color and illumination of the source
prevents restoration from introducing avoidable color drift.
"""

from __future__ import annotations

import torch
from torch import Tensor
from torch.nn import functional as functional


def _wavelet_blur(image: Tensor, radius: int) -> Tensor:
    kernel = torch.tensor(
        [[0.0625, 0.125, 0.0625], [0.125, 0.25, 0.125], [0.0625, 0.125, 0.0625]],
        dtype=image.dtype,
        device=image.device,
    )[None, None]
    kernel = kernel.repeat(image.shape[1], 1, 1, 1)
    padded = functional.pad(image, (radius, radius, radius, radius), mode="replicate")
    return functional.conv2d(padded, kernel, groups=image.shape[1], dilation=radius)


def _wavelet_decomposition(image: Tensor, levels: int = 5) -> tuple[Tensor, Tensor]:
    high_frequency = torch.zeros_like(image)
    low_frequency = image
    for level in range(levels):
        next_low = _wavelet_blur(low_frequency, 2**level)
        high_frequency = high_frequency + low_frequency - next_low
        low_frequency = next_low
    return high_frequency, low_frequency


def wavelet_reconstruction(content: Tensor, source: Tensor) -> Tensor:
    """Combine restored detail with the original video's low-frequency color."""

    content_high, _content_low = _wavelet_decomposition(content)
    _source_high, source_low = _wavelet_decomposition(source)
    return content_high + source_low
