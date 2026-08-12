[CmdletBinding()]
param(
    [int]$MediaKeepaPort = 8080,
    [int]$ControlPlanePort = 8765,
    [string]$MediaKeepaHost = "0.0.0.0"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root ".venv\Scripts\python.exe"
$controlPlane = Join-Path $root "modal-rotation\dashboard-server.ps1"
$runtime = Join-Path $root ".runtime"
New-Item -ItemType Directory -Path $runtime -Force | Out-Null

if (-not (Test-Path -LiteralPath $python)) { throw "MediaKeepa's .venv is missing. Create it and install requirements.txt first." }
if (-not (Test-Path -LiteralPath $controlPlane)) { throw "The modal-rotation component is missing. Initialize it before starting MediaKeepa." }

function Wait-Endpoint([string]$Url, [int]$Seconds = 45) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        try { $null = Invoke-RestMethod $Url -TimeoutSec 2; return $true } catch { Start-Sleep -Milliseconds 300 }
    } while ((Get-Date) -lt $deadline)
    return $false
}

function Get-ListenerProcessId([int]$Port) {
    $line = netstat -ano | Select-String -Pattern (":$Port\s+.*LISTENING\s+(\d+)$") | Select-Object -First 1
    if ($line) { return [int]$line.Matches[0].Groups[1].Value }
    return $null
}

function Get-LanIPv4Address {
    $route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
        Sort-Object RouteMetric, InterfaceMetric |
        Select-Object -First 1
    if ($null -eq $route) { return $null }

    return Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike "169.254.*" } |
        Select-Object -ExpandProperty IPAddress -First 1
}

if (-not (Wait-Endpoint "http://127.0.0.1:$ControlPlanePort/api/health" 1)) {
    $arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -Port {1} -PythonExecutable "{2}" -PerformancePath "{3}" -NoBrowser' -f $controlPlane, $ControlPlanePort, $python, (Join-Path $runtime "performance-mode")
    $controlProcess = Start-Process powershell.exe -ArgumentList $arguments -WorkingDirectory (Join-Path $root "modal-rotation") -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root ".modal-rotation.out.log") -RedirectStandardError (Join-Path $root ".modal-rotation.err.log") -PassThru
    if (-not (Wait-Endpoint "http://127.0.0.1:$ControlPlanePort/api/health")) { throw "Modal-Rotation did not become ready. Check .modal-rotation.err.log." }
    Set-Content -LiteralPath (Join-Path $runtime "modal-rotation.pid") -Value (Get-ListenerProcessId $ControlPlanePort) -Encoding ASCII
}

# The launcher deliberately overrides stale shell variables and old Fast-mode
# state. Connected Compute accounts are the only interactive Modal route.
$env:AUDIO_SEPARATOR_BACKEND = "control-plane"
$env:MEDIAKEEPA_COMPUTE_URL = "http://127.0.0.1:$ControlPlanePort"
$env:AUDIO_SEPARATOR_CONTROL_PLANE_URL = "http://127.0.0.1:$ControlPlanePort"
$env:AUDIO_SEPARATOR_CONTROL_PLANE_APPLICATION = "mediakeepa"
$env:AUDIO_SEPARATOR_CONTROL_PLANE_WORKLOAD = "separate-audio"
$env:AUDIO_SEPARATOR_CONTROL_PLANE_ESTIMATED_COST_USD = "0.50"
$env:AUDIO_SEPARATOR_CONTROL_PLANE_TIMEOUT_SECONDS = "1800"
$env:BACKGROUND_REMOVER_BACKEND = "control-plane"
$env:BACKGROUND_REMOVER_CONTROL_PLANE_URL = $(if ($env:BACKGROUND_REMOVER_CONTROL_PLANE_URL) { $env:BACKGROUND_REMOVER_CONTROL_PLANE_URL } else { "http://127.0.0.1:$ControlPlanePort" })
$env:BACKGROUND_REMOVER_CONTROL_PLANE_APPLICATION = "mediakeepa"
$env:BACKGROUND_REMOVER_CONTROL_PLANE_WORKLOAD = "remove-background"
$env:BACKGROUND_REMOVER_CONTROL_PLANE_ESTIMATED_COST_USD = "0.05"
$env:BACKGROUND_REMOVER_CONTROL_PLANE_TIMEOUT_SECONDS = "300"
$env:PORT = [string]$MediaKeepaPort
$env:PYTHONUNBUFFERED = "1"
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
$lanAddress = Get-LanIPv4Address
if ($lanAddress) { $env:DEV_HOST_IP = $lanAddress }

if (-not (Wait-Endpoint "http://127.0.0.1:$MediaKeepaPort/ping" 1)) {
    $mediaProcess = Start-Process $python -ArgumentList @("-m", "flask", "--app", "server", "run", "--host", $MediaKeepaHost, "--port", [string]$MediaKeepaPort, "--no-reload") -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root ".mediakeepa.out.log") -RedirectStandardError (Join-Path $root ".mediakeepa.err.log") -PassThru
    if (-not (Wait-Endpoint "http://127.0.0.1:$MediaKeepaPort/ping")) { throw "MediaKeepa did not become ready. Check .mediakeepa.err.log." }
    Set-Content -LiteralPath (Join-Path $runtime "mediakeepa.pid") -Value (Get-ListenerProcessId $MediaKeepaPort) -Encoding ASCII
}

$catalog = Invoke-RestMethod "http://127.0.0.1:$ControlPlanePort/api/applications" -TimeoutSec 10
$status = Invoke-RestMethod "http://127.0.0.1:$ControlPlanePort/api/status" -TimeoutSec 20
Write-Host "MediaKeepa:     http://127.0.0.1:$MediaKeepaPort"
Write-Host "Compute:        http://127.0.0.1:$MediaKeepaPort/compute/"
if ($MediaKeepaHost -eq "0.0.0.0" -and $lanAddress) {
    Write-Host "Mobile access:  http://${lanAddress}:$MediaKeepaPort"
}
if (@($status.accounts).Count -gt 0) {
    Write-Host "Workspace:      $(@($status.accounts)[0].label) ($(@($status.accounts)[0].health))"
} else {
    Write-Host "Workspace:      none connected - open /compute/ to add one"
}
Write-Host "Active targets: $($catalog.activeTargetCount)"
