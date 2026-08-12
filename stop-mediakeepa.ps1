[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtime = Join-Path $root ".runtime"

foreach ($name in @("mediakeepa", "modal-rotation")) {
    $pidPath = Join-Path $runtime "$name.pid"
    if (-not (Test-Path -LiteralPath $pidPath)) { continue }
    $processId = [int](Get-Content -LiteralPath $pidPath -Raw)
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -ne $process) {
        Stop-Process -Id $processId
        Write-Host "Stopped $name (PID $processId)."
    }
    Remove-Item -LiteralPath $pidPath -Force
}
