param(
  [string]$ConfigPath = "scripts/azure/appsettings.parameters.json"
)

$ErrorActionPreference = 'Stop'

function Resolve-CommandPath {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Names
  )

  foreach ($name in $Names) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command) {
      return $command.Source
    }
  }

  return $null
}

function Test-AzResource {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & $script:AzPath @Arguments 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

if (-not (Test-Path $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$script:AzPath = Resolve-CommandPath -Names @('az.cmd', 'az')
$dockerPath = Resolve-CommandPath -Names @('docker.exe', 'docker')

$checks = @()

$checks += [PSCustomObject]@{
  Check = 'Azure CLI installed'
  Result = if ($script:AzPath) { 'PASS' } else { 'FAIL' }
  Detail = if ($script:AzPath) { $script:AzPath } else { 'az/az.cmd not found in PATH' }
}

$checks += [PSCustomObject]@{
  Check = 'Docker installed'
  Result = if ($dockerPath) { 'PASS' } else { 'WARN' }
  Detail = if ($dockerPath) { $dockerPath } else { 'docker/docker.exe not found in PATH' }
}

if ($dockerPath) {
  & $dockerPath info --format '{{.ServerVersion}}' 2>$null | Out-Null
  $checks += [PSCustomObject]@{
    Check = 'Docker daemon reachable'
    Result = if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'WARN' }
    Detail = if ($LASTEXITCODE -eq 0) { 'Docker daemon is reachable' } else { 'Docker daemon not reachable (is Docker Desktop running?)' }
  }
}

if ($script:AzPath) {
  $accountJson = & $script:AzPath account show --output json 2>$null
  if ($LASTEXITCODE -eq 0 -and $accountJson) {
    $account = $accountJson | ConvertFrom-Json
    $checks += [PSCustomObject]@{
      Check = 'Azure login'
      Result = 'PASS'
      Detail = "Signed in as $($account.user.name), subscription $($account.id)"
    }

    if ($config.subscriptionId) {
      $checks += [PSCustomObject]@{
        Check = 'Subscription matches config'
        Result = if ($account.id -eq $config.subscriptionId) { 'PASS' } else { 'WARN' }
        Detail = if ($account.id -eq $config.subscriptionId) { 'Active subscription matches config' } else { "Active: $($account.id), Config: $($config.subscriptionId)" }
      }
    }

    $resourceGroupExists = Test-AzResource -Arguments @('group', 'show', '--name', $config.resourceGroupName, '--output', 'none')
    $checks += [PSCustomObject]@{
      Check = "Resource group exists ($($config.resourceGroupName))"
      Result = if ($resourceGroupExists) { 'PASS' } else { 'WARN' }
      Detail = if ($resourceGroupExists) { 'Found' } else { 'Not found or no access' }
    }

    $acrExists = Test-AzResource -Arguments @('acr', 'show', '--name', $config.acrName, '--resource-group', $config.resourceGroupName, '--output', 'none')
    $checks += [PSCustomObject]@{
      Check = "ACR exists ($($config.acrName))"
      Result = if ($acrExists) { 'PASS' } else { 'WARN' }
      Detail = if ($acrExists) { 'Found' } else { 'Not found or no access' }
    }

    $storageExists = Test-AzResource -Arguments @('storage', 'account', 'show', '--name', $config.storageAccountName, '--resource-group', $config.resourceGroupName, '--output', 'none')
    $checks += [PSCustomObject]@{
      Check = "Storage account exists ($($config.storageAccountName))"
      Result = if ($storageExists) { 'PASS' } else { 'WARN' }
      Detail = if ($storageExists) { 'Found' } else { 'Not found or no access' }
    }

    $containerAppExists = Test-AzResource -Arguments @('containerapp', 'show', '--name', $config.containerAppName, '--resource-group', $config.resourceGroupName, '--output', 'none')
    $checks += [PSCustomObject]@{
      Check = "Container App exists ($($config.containerAppName))"
      Result = if ($containerAppExists) { 'PASS' } else { 'WARN' }
      Detail = if ($containerAppExists) { 'Found' } else { 'Not found or no access' }
    }
  } else {
    $checks += [PSCustomObject]@{
      Check = 'Azure login'
      Result = 'FAIL'
      Detail = 'Not logged in. Run az login first.'
    }
  }
}

Write-Host ''
Write-Host '=== Azure deploy preflight (read-only) ===' -ForegroundColor Cyan
$checks | Format-Table -AutoSize | Out-String | Write-Host

$hasFailure = $checks | Where-Object { $_.Result -eq 'FAIL' }
if ($hasFailure) {
  exit 1
}

exit 0
