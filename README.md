# MediaKeepa

A powerful media downloader supporting video, audio, and image downloads from various platforms.

## 🚀 Quick Start

### Start MediaKeepa
```powershell
python run.py
```
The launcher will build the React frontend if needed and start the Flask API + UI on `http://localhost:5000`.

### Stop MediaKeepa
Press `Ctrl + C` in the terminal running `python run.py`.

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
