# MediaKeepa

A powerful media downloader supporting video, audio, and image downloads from various platforms.

## 🚀 Quick Start

### Start MediaKeepa
```powershell
python run.py
```
The launcher will build the React frontend if needed and start the Flask API + UI on `http://127.0.0.1:5000`.

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

Everything now runs on a single origin (`http://127.0.0.1:5000`). The launcher rebuilds the frontend when source files change, so you can focus on development without juggling multiple servers.
