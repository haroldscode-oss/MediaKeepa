# MediaKeepa startup and operations

## Prerequisites

- Windows PowerShell
- Python environment at `.venv` with `requirements.txt` installed
- Node.js only when rebuilding the frontend
- Bundled Modal CLI (the Compute setup wizard supplies account credentials privately)
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
- MediaKeepa Compute: `http://127.0.0.1:8080/compute/`
- Health check: `http://127.0.0.1:8080/ping`
- Compute health through MediaKeepa: `http://127.0.0.1:8080/compute/api/health`
- Internal Compute health: `http://127.0.0.1:8765/api/health`
- Mobile on the same network: `http://<LAN-IP>:8080`

The Windows firewall must allow inbound TCP port `8080` for LAN/mobile access. Port `8765` should remain private and bound to loopback.

## Stop

```powershell
.\stop-mediakeepa.ps1
```

The scripts keep PID and performance-mode state under the git-ignored `.runtime` directory.

## Select a performance mode

Use the **Performance** section on `http://127.0.0.1:8080/compute/`. Fast keeps only a recently used Audio worker ready for 10 minutes or Background worker for 5 minutes; Economy uses a 60-second idle window. Both modes scale to zero and always route through connected Compute accounts.

The workers use:

- an L40S for Audio Separator with BS-RoFormer
- an L4 for Background Remover with RMBG-2.0

Only the worker that receives a job starts and warms. The selected mode is saved across later application restarts, while routing always remains on the connected Compute pool.

The optional `set-mediakeepa-performance.ps1` helper calls the same Compute API. It is not required for normal use.

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
Invoke-RestMethod http://127.0.0.1:8080/compute/api/health
Invoke-RestMethod http://127.0.0.1:8765/api/health
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

The detailed expected state is recorded in [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).
Account pooling, connection, removal, deployment, and recovery are documented in [docs/MEDIAKEEPA_COMPUTE.md](docs/MEDIAKEEPA_COMPUTE.md).

### Add or remove a Modal account

Open `http://127.0.0.1:8080/compute/`. Select **Add Modal account**, paste the complete `modal token set ...` command and an `hf_...` Hugging Face token, then select **Set up account**. Leave the label blank to use Modal's verified name. MediaKeepa verifies the account, creates the Background Remover secret, deploys both workers in the selected mode, prepares the gated model, and links both tools without terminal commands or separate tool setup. Repeat the same form to add more accounts to the shared pool.

For Economy/Compute jobs, MediaKeepa routes to the ready account with the highest known remaining credit. Use **Remove** on one account to remove its local encrypted credential, disable only its routing targets, and clear its local routed history and cached artifacts. Other accounts remain active. Removal does not revoke the token or delete anything in Modal.

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

Check the Performance section on `/compute/`. Startup always restores shared Compute-pool routing, so a removed or disabled local Modal profile cannot receive MediaKeepa jobs.

### YouTube authentication error

Provide `youtube_cookies.txt`, `YT_COOKIES_FILE`, or `YT_COOKIES_B64`, then restart the application.

### Background Remover cannot access the model

Confirm the Hugging Face account accepted the RMBG-2.0 terms and the Modal secret `MediaKeepa_backgroundremover` contains a valid `HF_TOKEN`.

### Mobile cannot connect

Keep the phone and computer on the same LAN, use the exact LAN URL printed by the launcher, leave MediaKeepa running, and permit inbound TCP port `8080` in Windows Firewall. `127.0.0.1` on the phone refers to the phone itself and will not reach the computer.
