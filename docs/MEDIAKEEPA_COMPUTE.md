# MediaKeepa Compute account guide

MediaKeepa Compute is MediaKeepa's shared Modal account pool. It is a native MediaKeepa page, not a separate end-user application:

```text
http://127.0.0.1:8080/compute/
```

## The simple model

- Select **Add Account** once for each Modal account you want MediaKeepa to use.
- Paste its Modal API token command and your Hugging Face access token in the private local form.
- MediaKeepa creates the required Modal secret, deploys both GPU workers in the currently selected performance mode, prepares the gated background model, and links both tools automatically.
- There is no separate Modal connection for each tool.
- For each Economy/Compute job, MediaKeepa considers only accounts that are connected, healthy, bound to the tool, deployed, and have enough known credit.
- MediaKeepa tries the eligible account with the highest remaining credit first.

Modal's official term is **workspace**: a personal or organization workspace owns its apps, functions, billing, and credits. The Compute interface calls the saved connection a **Modal account** to keep the workflow clear. Each account is backed by one workspace API token (`ak-...` plus `as-...`).

Credits are not transferred or combined between Modal workspaces. The accounts form a routing pool: each individual job runs and is billed in the one account selected for that job.

## Add an account

1. Sign in to Modal and select the workspace you want to add.
2. In that workspace's settings, create an API token. Modal displays a command containing `--token-id ak-...` and `--token-secret as-...`.
3. Start MediaKeepa with `./start-mediakeepa.ps1` and open `/compute/`.
4. Select **Add Account**.
5. Paste the complete token command into the Modal token field.
6. Accept the `briaai/RMBG-2.0` model terms on Hugging Face, create an `hf_...` access token, and paste it into the Hugging Face field.
7. Optionally add a friendly label. Leaving it blank uses Modal's verified name.
8. Select **Set up account** and keep the page open while the first deployment completes.

MediaKeepa completes the following automatically without changing your active Modal CLI profile or requiring terminal commands:

1. verifies the Modal workspace credential;
2. creates or updates the private `MediaKeepa_backgroundremover` Modal secret;
3. deploys both workers in `main` with the selected Economy or Fast scale-to-zero settings;
4. downloads and validates access to the gated background model;
5. encrypts the Modal token for the current Windows user;
6. adds both fixed workload links:

- **Audio Separator** -> `mediakeepa-audio-separator.separate_audio`
- **Background Remover** -> `mediakeepa-background-remover.remove_background`

Adding another account repeats the same process and appends it to the pool. It does not replace an existing account. Adding a fresh token for an already-connected Modal workspace updates that existing account instead of creating a duplicate.

The Hugging Face token is sent from memory directly to Modal's secret service through the local setup backend. It is never written to disk or placed in MediaKeepa's credential store. Never paste either token into chat, documentation, source control, screenshots, or issue reports. Paste them only into the local Compute form. Do not use a Modal proxy-auth token (`wk-` / `ws-`); Compute needs a workspace API token.

Official Modal references:

- [API token commands](https://modal.com/docs/cli/token)
- [Workspace management](https://modal.com/docs/guide/workspaces)

## Understand the status labels

Credential connection, workload linkage, and worker deployment are separate facts. Compute checks all three and reports them per account and tool:

- **Ready**: the account is healthy, its balance is known and sufficient, the workload link exists, and the expected Modal app appears deployed.
- **Deployment needed**: the token and workload link are present, but the expected Modal app was not found in that account.
- **Balance unavailable** or **Insufficient credit**: the account cannot currently be selected automatically.
- **Connection issue**: Modal could not provide a usable account snapshot.
- **Link missing**: the fixed workload target is absent or disabled.

The **Compute pool** shows both tool states for every connected account. A job can run whenever at least one account is ready for that tool.

## What happens to GPUs

The setup wizard deploys Economy mode by default. Deployment creates the Modal apps and prepares their models, but it does not keep paid GPU containers running. A GPU starts when a MediaKeepa job reaches that worker and scales back to zero after the idle window.

The first setup can take several minutes because Modal builds images and MediaKeepa validates the gated model. When the form closes successfully, the account is connected and deployment is complete. Compute refreshes readiness automatically.

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

Confirm that the Hugging Face account behind the submitted token has accepted the `briaai/RMBG-2.0` terms. Then open **Add Account** and run setup again with the same Modal account and a valid Hugging Face token. The operation safely updates the existing account.

### Setup was interrupted during deployment

Open **Add Account** and submit the same credentials again. Provisioning is intentionally repeatable: the Modal secret is updated, deployments are safely reapplied, and the local Compute account is created only after every setup step succeeds. A failed attempt does not require terminal cleanup.

### An account is verified but a tool is not ready

Select **Refresh all**. If the tool still shows **Deployment needed**, rerun **Add Account** for that same Modal account; the setup wizard redeploys both expected apps. If it shows **Balance unavailable**, verify the workspace plan and billing data in Modal.

### A removed account is still visible in Modal

That is expected. MediaKeepa removes only its local connection. Workspace deletion and token revocation are separate actions inside Modal.
