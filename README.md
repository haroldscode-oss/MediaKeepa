# MediaKeepa

A powerful media downloader supporting video, audio, and image downloads from various platforms.

MediaKeepa also includes an AI Audio Separator that uses Modal GPU acceleration to produce two clear outputs: Vocals and Music. The quality-first GPU pipeline uses the specialist `model_bs_roformer_ep_317_sdr_12.9755.ckpt` model; local Demucs remains available only as a safety fallback and combines its accompaniment stems into one Music track.

Deploy `modal_audio_separator.py` with `modal deploy modal_audio_separator.py` after authenticating the Modal CLI. Model weights are cached in the `mediakeepa-audio-models` Modal Volume. The backend defaults to `AUDIO_SEPARATOR_BACKEND=auto`, which uses Modal when configured and safely falls back to local Demucs. The fallback uses 4 Demucs prediction shifts, 50% overlap, the model's native segment size, and lossless WAV output.

MediaKeepa can also route separation through the bundled `modal-rotation` control plane. Initialize the component with `git submodule update --init modal-rotation`, configure its connected workspaces and the logical `mediakeepa / separate-audio` workload, then set `AUDIO_SEPARATOR_CONTROL_PLANE_URL=http://localhost:8765`. In `auto` mode, MediaKeepa tries the control plane first, direct Modal second, and local Demucs last. See [MODAL_ROTATION_INTEGRATION.md](MODAL_ROTATION_INTEGRATION.md) for setup and security boundaries.

The image-only **Background Remover** accepts JPG, PNG, and WebP uploads and returns a full-resolution transparent PNG using Bria RMBG-2.0. For self-hosting, accept the model terms on Hugging Face, create a Modal secret named `MediaKeepa_backgroundremover` containing `HF_TOKEN`, and deploy `modal_background_remover.py`. Run `modal run modal_background_remover.py::download_weights` once to prefetch the gated weights into the persistent `mediakeepa-background-remover` Modal volume; normal requests also populate that cache automatically if needed. The self-hosted weights are non-commercial unless you have a separate Bria agreement.

## 🚀 Quick Start

### Start MediaKeepa
```powershell
.\start-mediakeepa.ps1
```
The launcher starts Modal-Rotation and the Flask API + built React UI on `http://localhost:8080`.

### Stop MediaKeepa
```powershell
.\stop-mediakeepa.ps1
```

## 📁 Project Structure

```
Dropvalley/
├── server.py              # Backend Flask API
├── run.py                 # Unified launcher (builds frontend + starts API)
├── spark-template/        # Frontend React app
├── yt-dlp.exe            # Video downloader
├── ffmpeg.exe            # Media processor
├── ffprobe.exe           # Media analyzer
├── temp_downloads/       # Temporary download storage
├── .venv/                # Python environment
├── start-all-servers.bat # Legacy helper (replaced by run.py)
└── stop-all-servers.bat  # Legacy helper (replaced by run.py)
```

## 🛠️ Tech Stack

- **Backend**: Python Flask
- **Frontend**: React + TypeScript + Vite
- **Downloader**: yt-dlp
- **Media Processing**: FFmpeg

## 📝 Development

Everything now runs on a single origin (`http://localhost:5000`). The launcher rebuilds the frontend when source files change, so you can focus on development without juggling multiple servers.

## 🍪 YouTube Cookies

Some YouTube downloads now require an authenticated session. Provide cookies in [Netscape format](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp) so yt-dlp can bypass the "confirm you're not a bot" gate:

- Drop a `youtube_cookies.txt` file in the project root (git-ignored).
- or set `YT_COOKIES_FILE` to an absolute/relative path inside the container.
- or set `YT_COOKIES_B64` to a base64-encoded cookies.txt payload (handy for Railway env vars).

The backend automatically passes these cookies to yt-dlp for YouTube-only requests. Rotate the file when YouTube invalidates the session.
