[CmdletBinding()]
param(
    [ValidateSet("Fast", "Economy")]
    [string]$Mode = "Fast"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$healthUrl = "http://127.0.0.1:8765/api/health"
$performanceUrl = "http://127.0.0.1:8765/api/performance"

try { $null = Invoke-RestMethod $healthUrl -TimeoutSec 2 }
catch { & (Join-Path $root "start-mediakeepa.ps1") }

Write-Host "Applying $Mode mode to connected MediaKeepa Compute accounts..."
$result = Invoke-RestMethod $performanceUrl -Method Post -ContentType "application/json" -Body (@{ mode = $Mode } | ConvertTo-Json) -TimeoutSec 3700
Write-Host $result.message
Write-Host "Routing remains on the Compute account pool. No GPU is kept always on."
