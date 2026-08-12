# MediaKeepa

MediaKeepa is a responsive web application for downloading and processing media from one interface. The current build includes three operational tools:

- **Media Downloader** — inspect a supported URL and download video, audio, images, or captions with yt-dlp and FFmpeg.
- **Audio Separator** — separate an uploaded audio file into lossless Vocals and Music WAV stems with BS-RoFormer on Modal.
- **Background Remover** — remove an image background with Bria RMBG-2.0 on Modal and download a full-resolution transparent PNG.

The React interface and Flask API share one origin. It works on desktop and mobile browsers, supports light and dark themes, and is served locally at `http://127.0.0.1:8080` by default.

For the complete operational snapshot, including the active GPU configuration, architecture, limits, routing behavior, benchmarks, and validation status, see [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).

## Quick start

```powershell
git submodule update --init modal-rotation
.\start-mediakeepa.ps1
```

The launcher starts:

- MediaKeepa UI and API: `http://127.0.0.1:8080`
- Modal-Rotation control plane: `http://127.0.0.1:8765`
- LAN/mobile access: the `http://<LAN-IP>:8080` address printed by the launcher

Stop both local services with:

```powershell
.\stop-mediakeepa.ps1
```

## Performance modes

The currently recommended interactive configuration is Fast mode:

```powershell
.\set-mediakeepa-performance.ps1 -Mode Fast
```

Fast mode keeps the quality-first models loaded in warm containers, uses an L40S for Audio Separator and an L4 for Background Remover, and sends interactive requests directly to the preloaded Modal classes. It preserves the selected mode across ordinary application restarts in `.runtime/performance-mode`.

To allow the workers to scale to zero and use the multi-workspace routing/fallback chain, switch to Economy mode:

```powershell
.\set-mediakeepa-performance.ps1 -Mode Economy
```

Fast mode prioritizes latency and reserves approximately `$2.75/hour` of GPU capacity at the rates used when this configuration was created, before CPU and memory. Economy mode reduces idle cost but reintroduces cold-start and routing latency.

## Quality configuration

The speed improvements do not use weaker models or lossy output:

- Audio uses `model_bs_roformer_ep_317_sdr_12.9755.ckpt` and returns lossless WAV stems.
- Background removal uses `briaai/RMBG-2.0` and returns a lossless RGBA PNG at the uploaded image's original dimensions.
- The optimizations come from warm model containers, direct interactive routing, fewer redundant image encodes, and uncompressed ZIP packaging for already-uncompressed WAV files.

## Model setup

Audio weights are cached in the `mediakeepa-audio-models` Modal Volume.

RMBG-2.0 is gated. Accept its terms on Hugging Face, create a Modal secret named `MediaKeepa_backgroundremover` containing `HF_TOKEN`, and prefetch the weights if needed:

```powershell
.\.venv\Scripts\modal.exe run modal_background_remover.py::download_weights
```

The weights are cached in the `mediakeepa-background-remover` Modal Volume. The self-hosted RMBG-2.0 weights are non-commercial unless a separate Bria agreement applies.

## Frontend development

The production frontend is served from `spark-template/dist` by Flask. Rebuild it after changes under `spark-template/src`:

```powershell
Set-Location .\spark-template
npm install
npm run build
```

## YouTube authentication

Some YouTube media requires an authenticated session. Provide Netscape-format cookies using one of these options:

- Place `youtube_cookies.txt` in the repository root; it is git-ignored.
- Set `YT_COOKIES_FILE` to the cookies file path.
- Set `YT_COOKIES_B64` to a base64-encoded cookies file.

MediaKeepa adds the configured cookies only to YouTube requests. TikTok also has an official-player fallback for public posts when its yt-dlp extractor is rejected.

## Technology

- React 19, TypeScript, Vite, Tailwind CSS
- Flask, Pillow, yt-dlp, FFmpeg
- Modal GPU workers and persistent Modal Volumes
- Bundled Modal-Rotation control plane for optional multi-workspace routing

## More documentation

- [Current operational state](docs/CURRENT_STATE.md)
- [Startup and operations](STARTUP.md)
- [Modal-Rotation integration](MODAL_ROTATION_INTEGRATION.md)
- [Deployment guide](DEPLOYMENT_GUIDE.md)
- [Security policy](SECURITY.md)
