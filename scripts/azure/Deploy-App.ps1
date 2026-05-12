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
    [string[]]$Arguments,
    [string]$DisplayText = ''
  )

  if ($DisplayText) {
    Write-Host ("> $DisplayText") -ForegroundColor DarkGray
  } else {
    Write-Host ('> az ' + ($Arguments -join ' ')) -ForegroundColor DarkGray
  }
  & $script:AzPath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI command failed: az $($Arguments -join ' ')"
  }
}

function Get-TrimmedValue {
  param([object]$Value)

  if ($null -eq $Value) {
    return ''
  }

  return ([string]$Value).Trim()
}

function Get-RequiredConfigValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$ErrorMessage
  )

  $value = Get-TrimmedValue -Value $config.$Name
  if (-not $value) {
    throw $ErrorMessage
  }

  return $value
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

function Resolve-ClientUrl {
  $configuredClientUrl = Get-TrimmedValue -Value $config.clientUrl
  if ($configuredClientUrl) {
    return $configuredClientUrl.TrimEnd('/')
  }

  $staticWebAppName = Get-TrimmedValue -Value $config.staticWebAppName
  if (-not $staticWebAppName) {
    throw 'clientUrl is empty and staticWebAppName is not set. Set at least one in config.'
  }

  $resolvedHost = & $script:AzPath staticwebapp show --name $staticWebAppName --resource-group $config.resourceGroupName --query defaultHostname --output tsv 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $resolvedHost) {
    throw "Unable to resolve Static Web App hostname for $staticWebAppName"
  }

  return "https://$resolvedHost"
}

if (-not (Test-Path $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$script:AzPath = Resolve-AzPath
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$serverRoot = Join-Path $repoRoot.Path 'server'
$dockerfilePath = Join-Path $serverRoot 'Dockerfile'

Invoke-AzCli -Arguments @('account', 'show', '--output', 'none')

if ($config.subscriptionId) {
  Invoke-AzCli -Arguments @('account', 'set', '--subscription', $config.subscriptionId)
}

$resourceGroupName = Get-RequiredConfigValue -Name 'resourceGroupName' -ErrorMessage 'resourceGroupName is required.'
$containerAppName = Get-RequiredConfigValue -Name 'containerAppName' -ErrorMessage 'containerAppName is required.'
$containerAppEnvironmentName = Get-RequiredConfigValue -Name 'containerAppEnvironmentName' -ErrorMessage 'containerAppEnvironmentName is required.'
$acrName = Get-RequiredConfigValue -Name 'acrName' -ErrorMessage 'acrName is required.'
$storageAccountName = Get-RequiredConfigValue -Name 'storageAccountName' -ErrorMessage 'storageAccountName is required.'
$blobContainerName = Get-RequiredConfigValue -Name 'blobContainerName' -ErrorMessage 'blobContainerName is required.'
$mongoDbUri = Get-ConfigOrEnvValue -ConfigName 'mongoDbUri' -EnvName 'MONGODB_URI'
if (-not $mongoDbUri) {
  throw 'mongoDbUri is required in config or MONGODB_URI environment variable.'
}

$jwtSecret = Get-ConfigOrEnvValue -ConfigName 'jwtSecret' -EnvName 'JWT_SECRET'
if (-not $jwtSecret) {
  throw 'jwtSecret is required in config or JWT_SECRET environment variable.'
}

$clientUrl = Resolve-ClientUrl
$allowedOrigins = Get-ConfigOrEnvValue -ConfigName 'allowedOrigins' -EnvName 'ALLOWED_ORIGINS'
if (-not $allowedOrigins) {
  $allowedOrigins = $clientUrl
}

$smtpHost = Get-ConfigOrEnvValue -ConfigName 'smtpHost' -EnvName 'SMTP_HOST' -DefaultValue 'smtp.gmail.com'
$smtpPort = Get-ConfigOrEnvValue -ConfigName 'smtpPort' -EnvName 'SMTP_PORT' -DefaultValue '587'
$smtpUser = Get-ConfigOrEnvValue -ConfigName 'smtpUser' -EnvName 'SMTP_USER'
$smtpPass = Get-ConfigOrEnvValue -ConfigName 'smtpPass' -EnvName 'SMTP_PASS'

$connectionString = & $script:AzPath storage account show-connection-string --name $storageAccountName --resource-group $resourceGroupName --query connectionString --output tsv
if (-not $connectionString) {
  throw 'Unable to retrieve storage account connection string.'
}

$storagePublicBaseUrl = $config.azureStoragePublicBaseUrl
if (-not $storagePublicBaseUrl) {
  $storagePublicBaseUrl = "https://$storageAccountName.blob.core.windows.net/$blobContainerName"
}

$imageTag = 'custom-bingo-api:latest'
Invoke-AzCli -Arguments @(
  'acr', 'build',
  '--registry', $acrName,
  '--image', $imageTag,
  '--file', $dockerfilePath,
  $serverRoot
) -DisplayText "az acr build --registry $acrName --image $imageTag"

$acrCredentials = & $script:AzPath acr credential show --name $acrName --resource-group $resourceGroupName --output json | ConvertFrom-Json
$acrLoginServer = & $script:AzPath acr show --name $acrName --resource-group $resourceGroupName --query loginServer --output tsv
$imageName = "$acrLoginServer/$imageTag"
$acrUsername = $acrCredentials.username
$acrPassword = $acrCredentials.passwords[0].value

$secretArgs = @(
  "mongodb-uri=$mongoDbUri",
  "jwt-secret=$jwtSecret",
  "smtp-user=$smtpUser",
  "smtp-pass=$smtpPass",
  "storage-connection=$connectionString",
  "acr-password=$acrPassword"
)

$envArgs = @(
  'PORT=5000',
  'NODE_ENV=production',
  "CLIENT_URL=$clientUrl",
  "ALLOWED_ORIGINS=$allowedOrigins",
  "SMTP_HOST=$smtpHost",
  "SMTP_PORT=$smtpPort",
  "AZURE_STORAGE_CONTAINER_NAME=$blobContainerName",
  "AZURE_STORAGE_PUBLIC_BASE_URL=$storagePublicBaseUrl",
  'MONGODB_URI=secretref:mongodb-uri',
  'JWT_SECRET=secretref:jwt-secret',
  'SMTP_USER=secretref:smtp-user',
  'SMTP_PASS=secretref:smtp-pass',
  'AZURE_STORAGE_CONNECTION_STRING=secretref:storage-connection'
)

$containerAppExists = $false
try {
  & $script:AzPath containerapp show --name $containerAppName --resource-group $resourceGroupName --output none 2>$null
  $containerAppExists = ($LASTEXITCODE -eq 0)
} catch {
  $containerAppExists = $false
}

if (-not $containerAppExists) {
  Invoke-AzCli -Arguments (@(
    'containerapp', 'create',
    '--name', $containerAppName,
    '--resource-group', $resourceGroupName,
    '--environment', $containerAppEnvironmentName,
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
    '--registry-password', $acrPassword,
    '--secrets'
  ) + $secretArgs + @('--env-vars') + $envArgs) -DisplayText "az containerapp create --name $containerAppName --resource-group $resourceGroupName (secrets redacted)"
} else {
  Invoke-AzCli -Arguments (@(
    'containerapp', 'secret', 'set',
    '--name', $containerAppName,
    '--resource-group', $resourceGroupName,
    '--secrets'
  ) + $secretArgs) -DisplayText "az containerapp secret set --name $containerAppName --resource-group $resourceGroupName (secrets redacted)"

  Invoke-AzCli -Arguments @(
    'containerapp', 'registry', 'set',
    '--name', $containerAppName,
    '--resource-group', $resourceGroupName,
    '--server', $acrLoginServer,
    '--username', $acrUsername,
    '--password', $acrPassword
  )

  Invoke-AzCli -Arguments (@(
    'containerapp', 'update',
    '--name', $containerAppName,
    '--resource-group', $resourceGroupName,
    '--image', $imageName,
    '--set-env-vars'
  ) + $envArgs)
}

$apiHost = & $script:AzPath containerapp show --name $containerAppName --resource-group $resourceGroupName --query properties.configuration.ingress.fqdn --output tsv

Write-Host ''
Write-Host 'API deployment completed.' -ForegroundColor Green
Write-Host "Backend URL: https://$apiHost"
Write-Host "Client URL used for CORS: $clientUrl"
Write-Host ''
Write-Host 'Next manual step:' -ForegroundColor Yellow
Write-Host "Set VITE_API_BASE_URL to https://$apiHost/api in Azure DevOps or your Static Web Apps deployment pipeline."
