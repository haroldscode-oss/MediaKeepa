# MediaKeepa Startup Guide

## Prerequisites
- Python 3.11+ installed with virtual environment at `.venv`
- Node.js installed (for building frontend)
- Cloudflared installed at `C:\cloudflared\cloudflared.exe`
- Domain: mediakeepa.com configured with Cloudflare Tunnel

## Starting the Website

### 1. Start Flask Backend
Open PowerShell in the project directory and run:
```powershell
.\.venv\Scripts\Activate.ps1
python server.py
```

The backend will start on:
- http://127.0.0.1:8080
- http://localhost:8080
- http://192.168.1.164:8080 (LAN)

Keep this terminal window open.

### 2. Verify Cloudflare Tunnel Service
Check if the cloudflared Windows service is running:
```powershell
Get-Service cloudflared
```

If it's stopped, start it:
```powershell
Start-Service cloudflared
```

Verify tunnel connections:
```powershell
C:\cloudflared\cloudflared.exe tunnel list
```

You should see `mediakeepa-tunnel` with 2-4 active connections (e.g., `2xmia01, 1xmia05, 1xmia08`).

### 3. Access the Website
- **Locally**: http://localhost:8080
- **Public domain**: https://mediakeepa.com

## Stopping the Website

### Stop Backend
Press `Ctrl+C` in the PowerShell window running `python server.py`, or:
```powershell
Get-Process python | Stop-Process -Force
```

### Stop Cloudflare Tunnel (Optional)
```powershell
Stop-Service cloudflared
```

## Building Frontend (Only if you make changes)
If you modify any frontend code in `spark-template/src/`:

```powershell
cd spark-template
npm run build
```

This creates production files in `spark-template/dist/` which Flask serves automatically.

## Troubleshooting

### Website shows "Bad gateway (502)"
- Check if Flask backend is running on port 8080
- Verify cloudflared service status: `Get-Service cloudflared`
- Check tunnel connections: `C:\cloudflared\cloudflared.exe tunnel list`

### Website shows "Error 1033 - Tunnel error"
- The cloudflared service may be using an old token
- Restart the service: `Restart-Service cloudflared`
- If still failing, reinstall with fresh token from Cloudflare dashboard

### Flask won't start - Port 8080 in use
```powershell
netstat -ano | findstr ":8080"
# Kill the process using that port
Stop-Process -Id <PID> -Force
```

### Tunnel has no connections
Check service is using correct token:
```powershell
Get-WmiObject Win32_Service -Filter "Name='cloudflared'" | Select-Object Name,PathName | Format-List
```

## Important Notes
- The Flask backend must be running for the website to work
- The cloudflared service handles HTTPS and routes traffic from mediakeepa.com to localhost:8080
- Frontend is pre-built and served by Flask - no separate frontend server needed
- Keep the Flask terminal window open while the site should be accessible

## Quick Start Command
```powershell
.\.venv\Scripts\Activate.ps1; python server.py
```

## Architecture
```
User Browser → https://mediakeepa.com (Cloudflare CDN)
              ↓
         Cloudflare Tunnel (cloudflared service)
              ↓
         http://127.0.0.1:8080 (Flask backend)
              ↓
         Serves: spark-template/dist/ (frontend)
                 /video-info, /download APIs
```

## CORS Configuration
The backend allows requests from:
- http://localhost:8080
- http://127.0.0.1:8080
- https://mediakeepa.com
- https://www.mediakeepa.com

## Current Status
- **Domain**: mediakeepa.com (live via Cloudflare Tunnel)
- **Backend**: Flask 3.1.2 (development server)
- **Frontend**: Vite 6.3.7 (pre-built static files)
- **yt-dlp**: 2025.10.22.232844.dev0 (latest nightly)
- **Tunnel**: mediakeepa-tunnel (ID: c7dd0563-1c17-460d-ac36-ec6860daa0dd)
