# MediaKeepa Compute account guide

MediaKeepa Compute is MediaKeepa's shared Modal account pool. It is a native MediaKeepa page, not a separate end-user application:

```text
http://127.0.0.1:8080/compute/
```

## The simple model

- Add your Hugging Face access token once under **Hugging Face model access**.
- Select **Add Account** for each Modal account you want MediaKeepa to use and paste only that account's Modal API token command.
- MediaKeepa creates the required Modal secret, deploys its GPU workers in the currently selected performance mode, prepares the image and video models, and links every tool automatically.
- There is no separate Modal connection for each tool.
- For each Economy/Compute job, MediaKeepa considers only accounts that are connected, healthy, bound to the tool, deployed, and have enough known credit.
- MediaKeepa tries the eligible account with the highest remaining credit first.

Modal's official term is **workspace**: a personal or organization workspace owns its apps, functions, billing, and credits. The Compute interface calls the saved connection a **Modal account** to keep the workflow clear. Each account is backed by one workspace API token (`ak-...` plus `as-...`).

Credits are not transferred or combined between Modal workspaces. The accounts form a routing pool: each individual job runs and is billed in the one account selected for that job.

## Add an account

1. Start MediaKeepa with `./start-mediakeepa.ps1` and open `/compute/`.
2. Accept the `briaai/RMBG-2.0` model terms on Hugging Face and create an `hf_...` access token.
3. Under **Hugging Face model access**, select **Add token** and save it once. You can also enter it during the first **Add Account** setup.
4. Sign in to Modal and select the workspace you want to add.
5. In that workspace's settings, create an API token. Modal displays a command containing `--token-id ak-...` and `--token-secret as-...`.
6. Select **Add Account** and paste the complete Modal token command.
7. Optionally add a friendly label. Leaving it blank uses Modal's verified name.
8. Select **Add account**. The form closes after credential verification; MediaKeepa's GPU workers continue setting up in the background.

MediaKeepa completes the following automatically without changing your active Modal CLI profile or requiring terminal commands:

1. verifies the Modal workspace credential;
2. creates or updates the private `MediaKeepa_backgroundremover` Modal secret;
3. deploys the MediaKeepa workers in `main` with the selected Economy or Fast scale-to-zero settings;
4. downloads and validates access to the gated background model;
5. encrypts both the shared Hugging Face token and each Modal token for the current Windows user;
6. adds both fixed workload links:

- **Audio Separator** -> `mediakeepa-audio-separator.separate_audio`
- **Background Remover** -> `mediakeepa-background-remover.remove_background`
- **Video Enhancer Preview** -> `mediakeepa-video-enhancer.enhance_preview` on 1x H100/H200
- **Video Enhancer** -> `mediakeepa-video-enhancer.enhance_video` on 4x H100/H200

Adding another account reuses the saved Hugging Face token automatically and appends the Modal account to the pool. It does not replace an existing account. Adding a fresh token for an already-connected Modal workspace updates that existing account instead of creating a duplicate.

The Hugging Face token is stored only as Windows DPAPI-encrypted ciphertext and is never returned to the browser after saving. MediaKeepa unlocks it only when applying the private Background Remover secret to a connected Modal workspace. Selecting **Replace token** updates that secret across every connected account. Never paste either token into chat, documentation, source control, screenshots, or issue reports. Paste them only into the local Compute form. Do not use a Modal proxy-auth token (`wk-` / `ws-`); Compute needs a workspace API token.

## Recent jobs

Recent jobs use a compact table with **Job**, **Account**, **Date**, **Duration**, **Cost**, and **Status** columns. The **Date** column includes both the calendar date and time. Cost is marked with a `~` because it is the configured workload estimate rather than a finalized Modal invoice amount. The table shows five jobs per page.

Official Modal references:

- [API token commands](https://modal.com/docs/cli/token)
- [Workspace management](https://modal.com/docs/guide/workspaces)

## Understand the status labels

Credential connection, workload linkage, and worker deployment are separate facts. Compute checks all three and reports them per account and tool:

- **Ready**: the account is healthy, its balance is known and sufficient, the workload link exists, and the expected Modal app appears deployed.
- **Setting up**: the account is already connected while MediaKeepa deploys that worker in the background. Audio Separator and Background Remover can become ready before the larger Video Enhancer checkpoint finishes preparing.
- **Setup failed**: background deployment needs attention. The account card shows the error; use **Add Account** with the same credentials to retry safely.
- **Deployment needed**: the token and workload link are present, but the expected Modal app was not found in that account.
- **Balance unavailable** or **Insufficient credit**: the account cannot currently be selected automatically.
- **Connection issue**: Modal could not provide a usable account snapshot.
- **Link missing**: the fixed workload target is absent or disabled.

The **Compute pool** shows both tool states for every connected account. A job can run whenever at least one account is ready for that tool.

## What happens to GPUs

The setup wizard deploys Economy mode by default. Deployment creates the Modal apps and prepares their models, but it does not keep paid GPU containers running. A GPU starts when a MediaKeepa job reaches that worker and scales back to zero after the idle window.

The first deployment can still take several minutes because Modal builds images and MediaKeepa validates the gated model, but the Add Account form no longer waits for that work. The account appears immediately with live setup progress, each tool becomes **Ready** independently, and MediaKeepa shows a notification when setup finishes. Setup state survives a page refresh or application restart.

## Remove an account

1. Find the account in **Compute pool**.
2. Select **Remove**.
3. Confirm **Remove account**.

Removal deletes the local account record and encrypted credential, disables that account's current workload targets, and clears its local routed execution records and cached artifacts. Other connected pool accounts and their links remain active.

Removal does not revoke the API token, delete the Modal workspace, or delete deployed Modal apps. Revoke the token separately in Modal if it should no longer work anywhere.

## Economy and Fast

Both modes always use the Compute account pool and both always set `min_containers=0`. No GPU is kept permanently on.

- **Economy** scales a used worker down after about 60 idle seconds.
- **Fast** keeps only the worker that just ran temporarily ready: 10 minutes for Audio Separator and 5 minutes for Background Remover, then it scales to zero.

Select the mode directly on the MediaKeepa Compute page. New accounts are automatically deployed with the currently selected mode.

## Troubleshooting

### Compute is unavailable

```powershell
.\stop-mediakeepa.ps1
.\start-mediakeepa.ps1
Invoke-RestMethod http://127.0.0.1:8765/api/health
Invoke-RestMethod http://127.0.0.1:8080/compute/api/health
```

Both health checks should return `ok: true`.

### A token is rejected

Confirm the command contains an `ak-` token ID and `as-` token secret created in the intended workspace and that the token has not been revoked.

### Setup reports a Hugging Face or model error

Confirm that the Hugging Face account behind the submitted token has accepted the `briaai/RMBG-2.0` terms. Select **Replace token** under **Hugging Face model access** and save a valid token. MediaKeepa updates the private secret across all connected accounts.

### Setup was interrupted during deployment

Open **Add Account** and submit the same credentials again. Provisioning is intentionally repeatable: the Modal secret and deployments are safely reapplied in the background. A failed attempt does not require terminal cleanup.

### An account is verified but a tool is not ready

Select **Refresh all**. If the tool still shows **Deployment needed**, rerun **Add Account** for that same Modal account; the setup wizard redeploys both expected apps. If it shows **Balance unavailable**, verify the workspace plan and billing data in Modal.

### A removed account is still visible in Modal

That is expected. MediaKeepa removes only its local connection. Workspace deletion and token revocation are separate actions inside Modal.
