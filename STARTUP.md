# MediaKeepa startup and operations

## Prerequisites

- Windows PowerShell
- Python environment at `.venv` with `requirements.txt` installed
- Node.js only when rebuilding the frontend
- Authenticated Modal CLI for GPU deployment and invocation
- Initialized `modal-rotation` submodule
- `ffmpeg` and `ffprobe` available on `PATH` or as local executables

Initialize a new checkout with:

```powershell
git submodule update --init modal-rotation
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Set-Location .\spark-template
npm install
npm run build
Set-Location ..
```

## Start

From the repository root:

```powershell
.\start-mediakeepa.ps1
```

The launcher starts the Modal-Rotation control plane on loopback port `8765`, starts the Flask API and built React UI on port `8080`, detects the machine's LAN IPv4 address, and prints both desktop and mobile URLs.

Default endpoints:

- Local UI/API: `http://127.0.0.1:8080`
- Health check: `http://127.0.0.1:8080/ping`
- Modal-Rotation health: `http://127.0.0.1:8765/api/health`
- Mobile on the same network: `http://<LAN-IP>:8080`

The Windows firewall must allow inbound TCP port `8080` for LAN/mobile access. Port `8765` should remain private and bound to loopback.

## Stop

```powershell
.\stop-mediakeepa.ps1
```

The scripts keep PID and performance-mode state under the git-ignored `.runtime` directory.

## Select a performance mode

Fast mode is the responsive interactive configuration:

```powershell
.\set-mediakeepa-performance.ps1 -Mode Fast
```

It deploys and warms:

- one L40S Audio Separator container with BS-RoFormer
- one L4 Background Remover container with RMBG-2.0

It also sets both interactive backends to direct Modal so Modal-Rotation polling and artifact relaying are not on the user-facing critical path. The selected mode is saved and restored on later application restarts.

Economy mode permits scale-to-zero operation and restores automatic routing:

```powershell
.\set-mediakeepa-performance.ps1 -Mode Economy
```

## Build the frontend

Flask serves the production bundle from `spark-template/dist`. After changing frontend source:

```powershell
Set-Location .\spark-template
npm run build
Set-Location ..
```

Restart MediaKeepa so the latest bundle is served.

## Verify operation

```powershell
Invoke-RestMethod http://127.0.0.1:8080/ping
Invoke-RestMethod http://127.0.0.1:8765/api/health
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

The detailed expected state is recorded in [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).

## Logs

- `.mediakeepa.out.log` and `.mediakeepa.err.log`
- `.modal-rotation.out.log` and `.modal-rotation.err.log`

These runtime logs are git-ignored.

## Troubleshooting

### White page or stale interface

Rebuild `spark-template`, restart MediaKeepa, and perform a hard refresh in the browser. Flask must serve the current `spark-template/dist/index.html` and assets.

### Port 8080 is already in use

Use `netstat -ano | Select-String ':8080'` to find the listener. Prefer `stop-mediakeepa.ps1` when the existing process is a MediaKeepa instance.

### GPU request has cold-start latency

Check `.runtime/performance-mode`. Run `set-mediakeepa-performance.ps1 -Mode Fast` to redeploy warm workers and persist direct routing. Fast mode reserves continuous GPU capacity.

### YouTube authentication error

Provide `youtube_cookies.txt`, `YT_COOKIES_FILE`, or `YT_COOKIES_B64`, then restart the application.

### Background Remover cannot access the model

Confirm the Hugging Face account accepted the RMBG-2.0 terms and the Modal secret `MediaKeepa_backgroundremover` contains a valid `HF_TOKEN`.

### Mobile cannot connect

Keep the phone and computer on the same LAN, use the exact LAN URL printed by the launcher, leave MediaKeepa running, and permit inbound TCP port `8080` in Windows Firewall. `127.0.0.1` on the phone refers to the phone itself and will not reach the computer.
