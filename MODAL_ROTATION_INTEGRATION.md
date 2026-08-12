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

2. Start MediaKeepa and open `http://127.0.0.1:8080/compute`.
3. Use **Add Modal account** with the workspace token command and a Hugging Face access token. MediaKeepa creates the required secret, deploys both workers in the selected Economy or Fast mode, prepares the gated model, and registers their fixed app/function bindings.
4. Configure MediaKeepa:

   ```text
   AUDIO_SEPARATOR_BACKEND=control-plane
   AUDIO_SEPARATOR_CONTROL_PLANE_URL=http://localhost:8765
   AUDIO_SEPARATOR_CONTROL_PLANE_APPLICATION=mediakeepa
   AUDIO_SEPARATOR_CONTROL_PLANE_WORKLOAD=separate-audio
   AUDIO_SEPARATOR_CONTROL_PLANE_ESTIMATED_COST_USD=0.50
   AUDIO_SEPARATOR_CONTROL_PLANE_TIMEOUT_SECONDS=1800
   ```

The MediaKeepa launcher sets both interactive tools to `control-plane` so removed or disabled local Modal profiles cannot receive jobs.

## Execution order

For MediaKeepa Compute jobs:

1. Modal-Rotation selects the highest-known-balance eligible workspace.
2. The run is submitted only to connected, healthy account targets.
3. Failures are surfaced instead of silently using a different local Modal profile.

After submission may have begun, MediaKeepa never automatically resubmits through the direct backend. A timeout, detached run, failed run, or artifact-download error is surfaced for inspection because retrying could duplicate GPU work.

The MediaKeepa Compute provisioning endpoint performs deployment only during the explicit **Set up account** action. The scheduler never deploys or changes a workspace while routing an ordinary job.

## Current security and deployment boundary

Modal-Rotation is currently a single-operator Windows service that binds to loopback and stores credentials with Windows DPAPI. Do not expose port 8765 publicly. A Railway-hosted MediaKeepa process cannot reach a control plane running on a developer PC; production use requires a private authenticated deployment, a platform secrets manager, durable storage, and a database-backed queue.
