param(
  [string]$ConfigPath = "scripts/azure/appsettings.parameters.json"
)

$ErrorActionPreference = 'Stop'

function Resolve-AzPath {
  $candidates = @(
    'az.cmd',
    'C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd'
  )

  foreach ($candidate in $candidates) {
    if ($candidate -eq 'az.cmd') {
      $command = Get-Command az.cmd -ErrorAction SilentlyContinue
      if ($command) {
        return $command.Source
      }
      continue
    }

    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw 'Azure CLI was not found. Install Azure CLI before running this script.'
}

function Get-TrimmedValue {
  param([object]$Value)

  if ($null -eq $Value) {
    return ''
  }

  return ([string]$Value).Trim()
}

function Get-ConfigOrEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigName,
    [Parameter(Mandatory = $true)]
    [string]$EnvName,
    [string]$DefaultValue = ''
  )

  $configValue = Get-TrimmedValue -Value $config.$ConfigName
  if ($configValue) {
    return $configValue
  }

  $envValue = Get-TrimmedValue -Value ([Environment]::GetEnvironmentVariable($EnvName))
  if ($envValue) {
    return $envValue
  }

  return $DefaultValue
}

if (-not (Test-Path $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$azPath = Resolve-AzPath
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$clientRoot = Join-Path $repoRoot.Path 'client'
$distRoot = Join-Path $clientRoot 'dist'

$staticWebAppName = Get-TrimmedValue -Value $config.staticWebAppName
if (-not $staticWebAppName) {
  throw 'staticWebAppName is required in config.'
}

$resourceGroupName = Get-TrimmedValue -Value $config.resourceGroupName
if (-not $resourceGroupName) {
  throw 'resourceGroupName is required in config.'
}

$apiBaseUrl = Get-ConfigOrEnvValue -ConfigName 'viteApiBaseUrl' -EnvName 'VITE_API_BASE_URL'
if (-not $apiBaseUrl) {
  $apiHost = & $azPath containerapp show --name $config.containerAppName --resource-group $resourceGroupName --query properties.configuration.ingress.fqdn --output tsv 2>$null
  if ($LASTEXITCODE -eq 0 -and $apiHost) {
    $apiBaseUrl = "https://$apiHost/api"
  }
}

if (-not $apiBaseUrl) {
  throw 'Could not resolve VITE_API_BASE_URL from config, env, or container app.'
}

$deploymentToken = Get-TrimmedValue -Value ([Environment]::GetEnvironmentVariable('AZURE_STATIC_WEB_APPS_API_TOKEN'))
if (-not $deploymentToken) {
  $deploymentToken = & $azPath staticwebapp secrets list --name $staticWebAppName --resource-group $resourceGroupName --query properties.apiKey --output tsv 2>$null
}

if (-not $deploymentToken) {
  throw 'Could not resolve Azure Static Web Apps deployment token.'
}

Push-Location $clientRoot
try {
  Write-Host "> npm ci" -ForegroundColor DarkGray
  npm ci
  if ($LASTEXITCODE -ne 0) {
    throw 'npm ci failed for client.'
  }

  $env:VITE_API_BASE_URL = $apiBaseUrl
  Write-Host "> npm run build" -ForegroundColor DarkGray
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw 'Client build failed.'
  }

  Write-Host "> npx @azure/static-web-apps-cli deploy .\\dist (token redacted)" -ForegroundColor DarkGray
  npx @azure/static-web-apps-cli deploy .\dist --deployment-token $deploymentToken --env production
  if ($LASTEXITCODE -ne 0) {
    throw 'Static Web App deployment failed.'
  }
} finally {
  Pop-Location
}

$frontendHost = & $azPath staticwebapp show --name $staticWebAppName --resource-group $resourceGroupName --query defaultHostname --output tsv

Write-Host ''
Write-Host 'Frontend deployment completed.' -ForegroundColor Green
Write-Host "Frontend URL: https://$frontendHost"
Write-Host "VITE_API_BASE_URL used for build: $apiBaseUrl"