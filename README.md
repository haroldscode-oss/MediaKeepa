# MediaKeepa

A powerful media downloader supporting video, audio, and image downloads from various platforms.

## 🚀 Quick Start

### Start MediaKeepa
```bash
start-all-servers.bat
```
This will start:
- **Backend API** on `http://127.0.0.1:8000`
- **Frontend UI** on `http://localhost:5000`

### Stop MediaKeepa
```bash
stop-all-servers.bat
```

## 📁 Project Structure

```
Dropvalley/
├── server.py              # Backend Flask API
├── spark-template/        # Frontend React app
├── yt-dlp.exe            # Video downloader
├── ffmpeg.exe            # Media processor
├── ffprobe.exe           # Media analyzer
├── temp_downloads/       # Temporary download storage
├── .venv/                # Python environment
├── start-all-servers.bat # Start both servers
└── stop-all-servers.bat  # Stop both servers
```

## 🛠️ Tech Stack

- **Backend**: Python Flask
- **Frontend**: React + TypeScript + Vite
- **Downloader**: yt-dlp
- **Media Processing**: FFmpeg

## 📝 Development

Backend runs on port 8000, frontend on port 5000. Both communicate via API calls.
