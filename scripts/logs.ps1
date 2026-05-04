# SmartTender AI — View Logs (PowerShell)
# Usage:
#   .\scripts\logs.ps1              # All services
#   .\scripts\logs.ps1 backend      # Single service
#   .\scripts\logs.ps1 backend -n 50 # Last 50 lines

param(
    [string]$Service = "",
    [int]$n = 100
)

Set-Location (Split-Path $PSScriptRoot)

$cmd = @("compose", "logs", "-f", "--tail", "$n")
if ($Service) { $cmd += $Service }

docker @cmd
