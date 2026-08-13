# MediaKeepa Video Enhancer

Video Enhancer is MediaKeepa's quality-first video-restoration workstation. It communicates directly with ByteDance Seed's official SeedVR2 inference implementation. It does not invoke Video2X, REAL Video Enhancer, ComfyUI, or another GUI/wrapper as its enhancement engine.

## Quality profile

The primary workflow intentionally exposes one simple choice: **Maximum Quality**.

Internally, Maximum Quality means:

- official [`ByteDance-Seed/SeedVR`](https://github.com/ByteDance-Seed/SeedVR) inference code pinned to commit `e4de8c24441a67e1b7df56abea10645059bb1185`;
- official [`ByteDance-Seed/SeedVR2-7B`](https://huggingface.co/ByteDance-Seed/SeedVR2-7B) repository revision `eb0c4281d41ba3767d4f14370f0e37e9e9180c16`;
- `seedvr2_ema_7b_sharp.pth`, the official 33 GB Sharp checkpoint;
- the official bfloat16 VAE and one-step SeedVR2 inference path;
- wavelet color reconstruction to retain the source video's low-frequency color and illumination;
- no quantization, smaller preview checkpoint, reduced-quality fallback, or spatial tiling.

MediaKeepa applies two narrow build-time compatibility fixes to the pinned official 7B entrypoint. ByteDance's still-image branch omits an FPS bookkeeping entry and therefore skips its output loop, so the patch supplies `1.0` FPS for that one-frame path. The official transform also operates on 16-pixel boundaries; MediaKeepa renders at or above the requested size and center-crops the restored tensor before the official encoder writes it. These patches do not change model loading, sampling, precision, or restored pixel generation.

The official SeedVR project documents one H100-80GB for approximately 100 frames at 720p and four H100-80GB GPUs for 1080p/2K sequence-parallel inference. MediaKeepa therefore requests:

- **Preview Enhancement:** one H200 for an exact selected frame, with H100 fallback;
- **Enhance Full Video:** four co-located H200s with sequence parallelism (`sp_size=4`), with 4x H100 fallback.

Modal may automatically upgrade H100 requests to H200 hardware. MediaKeepa does not opt out of that upgrade.

## Workflow

1. Open **Video Enhancer** and upload an MP4, MOV, M4V, MKV, or WebM file up to 512 MB.
2. Play, pause, or drag the timeline to an exact point.
3. Select **Original**, **1080p**, **1440p**, or **4K** output.
4. Select **Preview Enhancement**. MediaKeepa captures the displayed source frame as a lossless PNG and runs it through the full Sharp 7B model.
5. Review the original/enhanced comparison.
6. Select **Enhance Full Video** when satisfied.
7. Download the completed MP4.

Preview and full-video work are both first-class MediaKeepa Compute jobs. They use the same connected-account pool, highest-credit routing, execution status, artifact storage, and Recent Jobs history as Audio Separator and Background Remover.

## Output and audio

SeedVR2 restores video frames and writes the enhanced video stream. MediaKeepa then remuxes the original audio and metadata into the final MP4. It first attempts a bit-for-bit audio stream copy. If the source codec cannot be represented safely in MP4, only the audio is converted to 320 kbps AAC; the restored video stream is never re-encoded during muxing.

**Original / Restore Only** retains the source dimensions (with only an odd final edge aligned to an H.264-compatible even value). SeedVR2 renders at or above the requested size on its required 16-pixel boundary, then MediaKeepa applies a lossless exact-size crop. The higher-resolution choices preserve aspect ratio. Portrait videos use the named resolution on their short edge.

## Existing Compute accounts

New accounts receive Video Enhancer during normal background setup. Accounts connected before Video Enhancer was added display **Set up Video Enhancer** on the Compute page. This explicit one-time action deploys the official worker and downloads the Sharp/VAE checkpoints into a private Modal Volume in that account.

The checkpoint cache is approximately 34 GB per Modal workspace. A Hugging Face token is reused from MediaKeepa's encrypted one-time model access setting and is never written to job history or setup progress.

## Cost and limitations

Maximum Quality is intentionally expensive. MediaKeepa's routing estimate is a preflight balance guard, not the final charge. Modal bills actual H100/H200, CPU, memory, and storage usage per second. Four H100s currently consume four GPU units for the duration of a full-video call.

The upstream project describes SeedVR2 as a prototype and notes that very heavy degradation, large motion, or lightly degraded low-resolution inputs can produce incomplete restoration or oversharpened detail. Official documentation currently describes four-H100 support through 1080p/2K. MediaKeepa exposes 4K as an experimental quality-first target on four Hopper GPUs; if the official untiled path exhausts memory, the job fails clearly instead of silently enabling tiling, quantization, or resolution reduction.
