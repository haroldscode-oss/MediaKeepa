# MediaKeepa Startup Guide

Complete runbook for rebooting the local stack from scratch and verifying everything works.

## 1. Stop any leftovers
Open PowerShell in the project root (`C:\Users\32ver\OneDrive\Desktop\Dropvalley`) and close any prior consoles:

```powershell
./stop-all-servers.bat
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

This kills the named backend/frontend windows and any stray `node` dev servers so you start from a clean slate.

## 2. Prep the backend
Activate the bundled virtual environment and make sure dependencies match `requirements.txt`:

```powershell
./.venv/Scripts/Activate.ps1
C:/Users/32ver/OneDrive/Desktop/Dropvalley/.venv/Scripts/python.exe -m pip install -r requirements.txt
```

The backend only needs Flask, Flask-Cors, and Requests; the requirements file pins the verified versions.

## 3. Prep the frontend
Install Node modules (once per update) and build the static bundle Flask will serve:

```powershell
cd spark-template
npm install
npm run build
cd ..
```

**Important:**
- Run `npm run build` anytime you pull new frontend changes (for example, after the `videoFormats`/`audioFormats` constant update). The Flask server serves whatever is in `spark-template/dist`, so rebuilding keeps the bundle in sync with the source.
- Always open the UI via `http://127.0.0.1:5000` (the app will still work from `localhost`, but 127.0.0.1 guarantees you hit Flask instead of an old dev server).
- If the browser ever shows the spark runtime error (`Cannot access 'gt' before initialization`), rebuild the bundle with `npm run build` and hard-refresh the browser (Ctrl+Shift+R). This clears stale compiled assets.

## 4. Start everything
Back in the project root, launch the backend. It serves the API **and** the freshly built React app on the same origin:

```powershell
C:/Users/32ver/OneDrive/Desktop/Dropvalley/.venv/Scripts/python.exe server.py
```

The console should log `Running on http://127.0.0.1:5000`. Keep this window open while you use the app.

### Optional dev workflow
If you need hot reloads for UI work, run this in a second PowerShell inside `spark-template`:

```powershell
($env:VITE_API_URL = "http://127.0.0.1:5000"); npm run dev
```

This serves the frontend on Vite’s port (5173) while proxying API calls back to the Flask server.

## 5. Sanity checks
- Browser: visit `http://127.0.0.1:5000` — the MediaKeepa UI should load instantly.
- API: from PowerShell, verify the health endpoint:

	```powershell
	Invoke-WebRequest -Uri http://127.0.0.1:5000/ping
	```

	Expected payload: `{"status":"ok","message":"Server is running!"}`.

## 6. Troubleshooting cheatsheet
- **Spark runtime error / blank page**: `npm run build`, restart `server.py`, then hard-refresh the browser.
- **"videoFormats is not defined" or similar runtime error**: rebuild (`npm run build`) to regenerate the bundle after the constant rename, restart `server.py`, and force-reload the page (Ctrl+Shift+R).
- **Unexpected JSON errors when pasting URLs**: confirm no `node` processes are running (`Get-Process node | Stop-Process -Force`) and reload at `http://127.0.0.1:5000`.
- **Cache confusion**: clear `spark-template\node_modules\.vite` (optional) and rebuild.
- **Port already in use**: rerun `./stop-all-servers.bat` or close stray Python/Vite terminals.
- **Downloads stuck**: check `temp_downloads` for leftovers; it’s auto-cleaned but you can empty it manually if needed.

## 7. Shutdown
When you’re done, stop both servers cleanly:

```powershell
./stop-all-servers.bat
```

That returns the workspace to a clean state for the next session.
