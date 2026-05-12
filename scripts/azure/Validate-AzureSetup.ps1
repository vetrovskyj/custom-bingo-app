param(
  [string]$ConfigPath = "scripts/azure/appsettings.parameters.json"
)

$ErrorActionPreference = 'Stop'

$preflightScript = Join-Path $PSScriptRoot 'Preflight-Deploy.ps1'
$smokeTestScript = Join-Path $PSScriptRoot 'Test-Deployment.ps1'

if (-not (Test-Path $preflightScript)) {
  throw "Missing script: $preflightScript"
}

if (-not (Test-Path $smokeTestScript)) {
  throw "Missing script: $smokeTestScript"
}

Write-Host ''
Write-Host 'Step 1/2: Running preflight checks...' -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File $preflightScript -ConfigPath $ConfigPath
if ($LASTEXITCODE -ne 0) {
  throw 'Preflight failed. Fix reported issues before smoke testing.'
}

Write-Host ''
Write-Host 'Step 2/2: Running deployment smoke test...' -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File $smokeTestScript -ConfigPath $ConfigPath
if ($LASTEXITCODE -ne 0) {
  throw 'Smoke test failed. Check API/container app status and logs.'
}

Write-Host ''
Write-Host 'Validation completed successfully.' -ForegroundColor Green
