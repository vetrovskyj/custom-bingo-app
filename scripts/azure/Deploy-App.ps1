param(
  [string]$ConfigPath = "scripts/azure/appsettings.parameters.sample.json"
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

function Invoke-AzCli {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  Write-Host ('> az ' + ($Arguments -join ' ')) -ForegroundColor DarkGray
  & $script:AzPath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI command failed: az $($Arguments -join ' ')"
  }
}

if (-not (Test-Path $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$script:AzPath = Resolve-AzPath
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')

Invoke-AzCli -Arguments @('account', 'show', '--output', 'none')

if ($config.subscriptionId) {
  Invoke-AzCli -Arguments @('account', 'set', '--subscription', $config.subscriptionId)
}

$connectionString = & $script:AzPath storage account show-connection-string --name $config.storageAccountName --resource-group $config.resourceGroupName --query connectionString --output tsv
if (-not $connectionString) {
  throw 'Unable to retrieve storage account connection string.'
}

$storagePublicBaseUrl = $config.azureStoragePublicBaseUrl
if (-not $storagePublicBaseUrl) {
  $storagePublicBaseUrl = "https://$($config.storageAccountName).blob.core.windows.net/$($config.blobContainerName)"
}

$imageTag = 'custom-bingo-api:latest'
Invoke-AzCli -Arguments @(
  'acr', 'build',
  '--registry', $config.acrName,
  '--image', $imageTag,
  '--file', 'server/Dockerfile',
  $repoRoot.Path
)

$acrCredentials = & $script:AzPath acr credential show --name $config.acrName --resource-group $config.resourceGroupName --output json | ConvertFrom-Json
$acrLoginServer = & $script:AzPath acr show --name $config.acrName --resource-group $config.resourceGroupName --query loginServer --output tsv
$imageName = "$acrLoginServer/$imageTag"
$acrUsername = $acrCredentials.username
$acrPassword = $acrCredentials.passwords[0].value

$secretArgs = @(
  "mongodb-uri=$($config.mongoDbUri)",
  "jwt-secret=$($config.jwtSecret)",
  "smtp-user=$($config.smtpUser)",
  "smtp-pass=$($config.smtpPass)",
  "storage-connection=$connectionString",
  "acr-password=$acrPassword"
)

$envArgs = @(
  'PORT=5000',
  'NODE_ENV=production',
  "CLIENT_URL=$($config.clientUrl)",
  "ALLOWED_ORIGINS=$($config.allowedOrigins)",
  "SMTP_HOST=$($config.smtpHost)",
  "SMTP_PORT=$($config.smtpPort)",
  "AZURE_STORAGE_CONTAINER_NAME=$($config.blobContainerName)",
  "AZURE_STORAGE_PUBLIC_BASE_URL=$storagePublicBaseUrl",
  'MONGODB_URI=secretref:mongodb-uri',
  'JWT_SECRET=secretref:jwt-secret',
  'SMTP_USER=secretref:smtp-user',
  'SMTP_PASS=secretref:smtp-pass',
  'AZURE_STORAGE_CONNECTION_STRING=secretref:storage-connection'
)

$containerAppExists = $false
try {
  & $script:AzPath containerapp show --name $config.containerAppName --resource-group $config.resourceGroupName --output none 2>$null
  $containerAppExists = ($LASTEXITCODE -eq 0)
} catch {
  $containerAppExists = $false
}

if (-not $containerAppExists) {
  Invoke-AzCli -Arguments (@(
    'containerapp', 'create',
    '--name', $config.containerAppName,
    '--resource-group', $config.resourceGroupName,
    '--environment', $config.containerAppEnvironmentName,
    '--image', $imageName,
    '--ingress', 'external',
    '--target-port', '5000',
    '--transport', 'http',
    '--min-replicas', '0',
    '--max-replicas', '2',
    '--cpu', '0.25',
    '--memory', '0.5Gi',
    '--registry-server', $acrLoginServer,
    '--registry-username', $acrUsername,
    '--registry-password', 'secretref:acr-password',
    '--secrets'
  ) + $secretArgs + @('--env-vars') + $envArgs)
} else {
  Invoke-AzCli -Arguments (@(
    'containerapp', 'secret', 'set',
    '--name', $config.containerAppName,
    '--resource-group', $config.resourceGroupName,
    '--secrets'
  ) + $secretArgs)

  Invoke-AzCli -Arguments @(
    'containerapp', 'registry', 'set',
    '--name', $config.containerAppName,
    '--resource-group', $config.resourceGroupName,
    '--server', $acrLoginServer,
    '--username', $acrUsername,
    '--password-secret-ref', 'acr-password'
  )

  Invoke-AzCli -Arguments (@(
    'containerapp', 'update',
    '--name', $config.containerAppName,
    '--resource-group', $config.resourceGroupName,
    '--image', $imageName,
    '--set-env-vars'
  ) + $envArgs)
}

$apiHost = & $script:AzPath containerapp show --name $config.containerAppName --resource-group $config.resourceGroupName --query properties.configuration.ingress.fqdn --output tsv

Write-Host ''
Write-Host 'API deployment completed.' -ForegroundColor Green
Write-Host "Backend URL: https://$apiHost"
Write-Host ''
Write-Host 'Next manual step:' -ForegroundColor Yellow
Write-Host "Set VITE_API_BASE_URL to https://$apiHost/api in Azure DevOps or your Static Web Apps deployment pipeline."
