# Modal-Rotation integration

MediaKeepa can submit the `mediakeepa / separate-audio` logical workload to Modal-Rotation instead of selecting a concrete Modal workspace itself. The integration transfers the uploaded audio as a staged binary input and downloads the complete ZIP as a run artifact; neither binary payload is written into the JSON run record.

## Local setup

1. Initialize the component after cloning MediaKeepa:

   ```powershell
   git submodule update --init modal-rotation
   cd modal-rotation
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -e .
   .\dashboard.cmd
   ```

2. Connect each authorized Modal workspace in the dashboard at `http://localhost:8765`.
3. Register an application named `MediaKeepa` with slug `mediakeepa` and a workload named `Separate audio` with slug `separate-audio`.
4. For every target workspace, bind the workload to app `mediakeepa-audio-separator`, function `separate_audio`, and environment `main`. The complete example payload is in `modal-rotation/examples/mediakeepa_registration.example.json`.
5. Configure MediaKeepa:

   ```text
   AUDIO_SEPARATOR_BACKEND=auto
   AUDIO_SEPARATOR_CONTROL_PLANE_URL=http://localhost:8765
   AUDIO_SEPARATOR_CONTROL_PLANE_APPLICATION=mediakeepa
   AUDIO_SEPARATOR_CONTROL_PLANE_WORKLOAD=separate-audio
   AUDIO_SEPARATOR_CONTROL_PLANE_ESTIMATED_COST_USD=0.50
   AUDIO_SEPARATOR_CONTROL_PLANE_TIMEOUT_SECONDS=1800
   ```

Use `AUDIO_SEPARATOR_BACKEND=control-plane` only when a control-plane failure should fail the MediaKeepa job instead of falling back to direct Modal or local Demucs.

## Execution order

In `auto` mode:

1. Modal-Rotation selects the highest-known-balance eligible workspace.
2. If the control plane fails its health check before submission, MediaKeepa tries its existing direct Modal configuration.
3. If direct Modal is unavailable, MediaKeepa runs the local Demucs fallback.

After submission may have begun, MediaKeepa never automatically resubmits through the direct backend. A timeout, detached run, failed run, or artifact-download error is surfaced for inspection because retrying could duplicate GPU work.

Modal-Rotation does not redeploy `modal_audio_separator.py`; the Modal function must already exist in every registered target workspace.

## Current security and deployment boundary

Modal-Rotation is currently a single-operator Windows service that binds to loopback and stores credentials with Windows DPAPI. Do not expose port 8765 publicly. A Railway-hosted MediaKeepa process cannot reach a control plane running on a developer PC; production use requires a private authenticated deployment, a platform secrets manager, durable storage, and a database-backed queue.
