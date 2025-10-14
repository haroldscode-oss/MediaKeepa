# 🔌 Integration Guide: Connecting Spark Template to Flask Backend

## What Was Changed

The spark-template React app now connects to your Flask `server.py` backend instead of using mock data.

## Key Changes Made:

### 1. API Integration (`src/App.tsx`)
- ✅ Replaced mock API calls with real Flask backend calls
- ✅ Connected to `/video-info` endpoint for fetching video metadata
- ✅ Connected to `/download` endpoint for downloading files
- ✅ Connected to `/download-progress/<session_id>` for real-time progress
- ✅ Added error handling for backend connectivity

### 2. Environment Configuration
- ✅ Added `.env` file for backend URL configuration
- ✅ Default: `VITE_API_URL=http://localhost:5000`
- ✅ Can be changed for production deployment

### 3. CORS Support
- ✅ Your `server.py` already has CORS enabled
- ✅ Frontend can connect from different port (Vite runs on 5173)

## How to Run:

### 1. Start Flask Backend (Terminal 1):
```bash
cd c:\Users\32ver\OneDrive\Desktop\Dropvalley
python server.py
```
Server will run on: `http://localhost:5000`

### 2. Start React Frontend (Terminal 2):
```bash
cd c:\Users\32ver\OneDrive\Desktop\Dropvalley\spark-template
npm install
npm run dev
```
Frontend will run on: `http://localhost:5173`

### 3. Test It:
1. Open `http://localhost:5173` in your browser
2. Paste a YouTube URL
3. Select format and quality
4. Click Download
5. Watch real progress from your backend!

## API Endpoints Used:

### POST `/video-info`
**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Video Title",
    "thumbnail": "/thumbnail/thumb.jpg",
    "duration": "12:34",
    "channel": "Channel Name",
    "formats": [...],
    "audio_formats": [...]
  }
}
```

### POST `/download`
**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "mp4",
  "quality": "1080p",
  "download_type": "video"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid-here",
  "message": "Download started"
}
```

### GET `/download-progress/<session_id>`
**Response:**
```json
{
  "progress": 45.5,
  "status": "downloading",
  "filename": "video_title.mp4",
  "file_size": "25.5 MB",
  "downloaded": "11.5 MB",
  "speed": "2.5 MB/s",
  "eta": "6s"
}
```

## Next Steps:

### Add Monetag Ads:
1. Edit `spark-template/index.html`
2. Add Monetag script tags before `</body>`
3. Add ad trigger logic in `src/App.tsx`

### Add Legal Footer:
1. Copy `/dmca.html`, `/terms.html`, `/privacy.html`, `/disclaimer.html` to `spark-template/public/`
2. Edit `src/App.tsx` to add footer component
3. Link to legal pages

### Deploy to Production:
1. Build frontend: `npm run build`
2. Copy `dist/` folder to Flask `static/` directory
3. Update Flask to serve React app
4. Deploy to Cloudflare/your host

## Troubleshooting:

### Frontend Can't Connect to Backend:
- ✅ Make sure Flask is running on port 5000
- ✅ Check `.env` file has correct `VITE_API_URL`
- ✅ Check browser console for CORS errors
- ✅ Verify CORS is enabled in `server.py` (already done)

### Downloads Not Working:
- ✅ Check `yt-dlp.exe` is in the same folder as `server.py`
- ✅ Check `temp_downloads/` folder exists
- ✅ Check backend console for errors

### Progress Not Updating:
- ✅ Check `/download-progress/<session_id>` endpoint works
- ✅ Verify session_id is being passed correctly
- ✅ Check backend is updating `download_progress` dict

## File Structure:

```
Dropvalley/
├── server.py                 # Flask backend (port 5000)
├── yt-dlp.exe
├── temp_downloads/
├── dmca.html
├── terms.html
├── privacy.html
├── disclaimer.html
└── spark-template/           # React frontend
    ├── .env                  # API URL config
    ├── src/
    │   ├── App.tsx          # Main app (updated with API calls)
    │   └── ...
    ├── public/
    └── package.json
```

## Production Deployment:

### Option 1: Separate Frontend/Backend
- Frontend on Vercel/Netlify
- Backend on your server
- Update `.env` with production backend URL

### Option 2: Combined (Recommended)
1. Build React app: `npm run build`
2. Move `dist/` contents to Flask `static/` folder
3. Update Flask routes to serve React app
4. Deploy single app to Cloudflare/server

---

Ready to test! 🚀
