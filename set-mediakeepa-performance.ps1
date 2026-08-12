[CmdletBinding()]
param(
    [ValidateSet("Fast", "Economy")]
    [string]$Mode = "Fast",
    [switch]$SkipRestart
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$modal = Join-Path $root ".venv\Scripts\modal.exe"

if (-not (Test-Path -LiteralPath $modal)) {
    throw "MediaKeepa's Modal CLI is missing from .venv."
}

if ($Mode -eq "Fast") {
    $env:MEDIAKEEPA_AUDIO_GPU = "L40S"
    $env:MEDIAKEEPA_AUDIO_MIN_CONTAINERS = "1"
    $env:MEDIAKEEPA_AUDIO_BUFFER_CONTAINERS = "0"
    $env:MEDIAKEEPA_AUDIO_SCALEDOWN_WINDOW = "1200"
    $env:MEDIAKEEPA_BACKGROUND_GPU = "L4"
    $env:MEDIAKEEPA_BACKGROUND_MIN_CONTAINERS = "1"
    $env:MEDIAKEEPA_BACKGROUND_BUFFER_CONTAINERS = "0"
    $env:MEDIAKEEPA_BACKGROUND_SCALEDOWN_WINDOW = "1200"
} else {
    $env:MEDIAKEEPA_AUDIO_GPU = "L4"
    $env:MEDIAKEEPA_AUDIO_MIN_CONTAINERS = "0"
    $env:MEDIAKEEPA_AUDIO_BUFFER_CONTAINERS = "0"
    $env:MEDIAKEEPA_AUDIO_SCALEDOWN_WINDOW = "60"
    $env:MEDIAKEEPA_BACKGROUND_GPU = "L4"
    $env:MEDIAKEEPA_BACKGROUND_MIN_CONTAINERS = "0"
    $env:MEDIAKEEPA_BACKGROUND_BUFFER_CONTAINERS = "0"
    $env:MEDIAKEEPA_BACKGROUND_SCALEDOWN_WINDOW = "60"
}

$env:PYTHONUTF8 = "1"
Write-Host "Deploying MediaKeepa GPU workers in $Mode mode..."
& $modal deploy (Join-Path $root "modal_audio_separator.py")
if ($LASTEXITCODE -ne 0) { throw "Audio Separator deployment failed." }
& $modal deploy (Join-Path $root "modal_background_remover.py")
if ($LASTEXITCODE -ne 0) { throw "Background Remover deployment failed." }

if (-not $SkipRestart) {
    & (Join-Path $root "stop-mediakeepa.ps1")
    & (Join-Path $root "start-mediakeepa.ps1")
}

Write-Host "MediaKeepa GPU mode: $Mode"
if ($Mode -eq "Fast") {
    Write-Host "One L40S Audio Separator and one L4 Background Remover container are kept warm."
    Write-Host "At current Modal GPU rates, continuous GPU reservation is approximately `$2.75/hour before CPU and memory."
} else {
    Write-Host "Workers can scale to zero after 60 seconds; the next request may have cold-start latency."
}
