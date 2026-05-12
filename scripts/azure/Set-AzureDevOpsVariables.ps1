param(
  [Parameter(Mandatory = $true)]
  [string]$OrganizationUrl,
  [Parameter(Mandatory = $true)]
  [string]$Project,
  [string]$VariableGroupName = 'bingo-prod',
  [string]$ResourceGroupName = 'rg-bingo-dev-we',
  [string]$StaticWebAppName = 'swa-bingo-a39305',
  [string]$ContainerAppName = 'ca-bingo-api-dev-we',
  [string]$StorageAccountName = 'stbingoa39305',
  [string]$BlobContainerName = 'media'
)

$ErrorActionPreference = 'Stop'

function Resolve-AzPath {
  $command = Get-Command az.cmd -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $fallback = 'C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd'
  if (Test-Path $fallback) {
    return $fallback
  }

  throw 'Azure CLI not found.'
}

function Get-RequiredEnv {
  param([string]$Name)

  $value = [Environment]::GetEnvironmentVariable($Name)
  if (-not $value) {
    throw "Missing required environment variable: $Name"
  }
  return $value
}

$azPath = Resolve-AzPath

$pat = Get-RequiredEnv -Name 'AZURE_DEVOPS_EXT_PAT'
$mongoDbUri = Get-RequiredEnv -Name 'MONGODB_URI'
$jwtSecret = Get-RequiredEnv -Name 'JWT_SECRET'
$smtpUser = Get-RequiredEnv -Name 'SMTP_USER'
$smtpPass = Get-RequiredEnv -Name 'SMTP_PASS'

$apiFqdn = & $azPath containerapp show --name $ContainerAppName --resource-group $ResourceGroupName --query properties.configuration.ingress.fqdn --output tsv
if (-not $apiFqdn) {
  throw 'Unable to resolve container app FQDN.'
}
$apiBaseUrl = "https://$apiFqdn/api"

$frontendHost = & $azPath staticwebapp show --name $StaticWebAppName --resource-group $ResourceGroupName --query defaultHostname --output tsv
if (-not $frontendHost) {
  throw 'Unable to resolve Static Web App hostname.'
}
$frontendUrl = "https://$frontendHost"

$storageConnection = & $azPath storage account show-connection-string --name $StorageAccountName --resource-group $ResourceGroupName --query connectionString --output tsv
if (-not $storageConnection) {
  throw 'Unable to resolve storage connection string.'
}
$storagePublicBaseUrl = "https://$StorageAccountName.blob.core.windows.net/$BlobContainerName"

$swaToken = & $azPath staticwebapp secrets list --name $StaticWebAppName --resource-group $ResourceGroupName --query properties.apiKey --output tsv
if (-not $swaToken) {
  throw 'Unable to resolve Static Web App API token.'
}

& $azPath extension add --name azure-devops --only-show-errors 2>$null | Out-Null
& $azPath devops configure --defaults organization=$OrganizationUrl project=$Project

$existingGroupId = & $azPath pipelines variable-group list --query "[?name=='$VariableGroupName'].id | [0]" --output tsv
if (-not $existingGroupId) {
  $existingGroupId = & $azPath pipelines variable-group create --name $VariableGroupName --authorize true --variables PLACEHOLDER=to-be-removed --query id --output tsv
}

if (-not $existingGroupId) {
  throw 'Could not create or resolve Azure DevOps variable group.'
}

function Invoke-AzBestEffort {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    & $azPath @Arguments *> $null
    return ($LASTEXITCODE -eq 0)
  } finally {
    $ErrorActionPreference = $previousPreference
  }
}

$setPlain = {
  param([string]$Name, [string]$Value)
  $updated = Invoke-AzBestEffort -Arguments @('pipelines', 'variable-group', 'variable', 'update', '--group-id', $existingGroupId, '--name', $Name, '--value', $Value, '--output', 'none')
  if (-not $updated) {
    $created = Invoke-AzBestEffort -Arguments @('pipelines', 'variable-group', 'variable', 'create', '--group-id', $existingGroupId, '--name', $Name, '--value', $Value, '--output', 'none')
    if (-not $created) {
      throw "Unable to set variable '$Name' in group '$VariableGroupName'."
    }
  }
}

$setSecret = {
  param([string]$Name, [string]$Value)
  $updated = Invoke-AzBestEffort -Arguments @('pipelines', 'variable-group', 'variable', 'update', '--group-id', $existingGroupId, '--name', $Name, '--secret', 'true', '--value', $Value, '--output', 'none')
  if (-not $updated) {
    $created = Invoke-AzBestEffort -Arguments @('pipelines', 'variable-group', 'variable', 'create', '--group-id', $existingGroupId, '--name', $Name, '--secret', 'true', '--value', $Value, '--output', 'none')
    if (-not $created) {
      throw "Unable to set secret variable '$Name' in group '$VariableGroupName'."
    }
  }
}

& $setPlain 'CLIENT_URL' $frontendUrl
& $setPlain 'ALLOWED_ORIGINS' $frontendUrl
& $setPlain 'SMTP_HOST' 'smtp.gmail.com'
& $setPlain 'SMTP_PORT' '587'
& $setPlain 'AZURE_STORAGE_CONTAINER_NAME' $BlobContainerName
& $setPlain 'AZURE_STORAGE_PUBLIC_BASE_URL' $storagePublicBaseUrl
& $setPlain 'VITE_API_BASE_URL' $apiBaseUrl

& $setSecret 'MONGODB_URI' $mongoDbUri
& $setSecret 'JWT_SECRET' $jwtSecret
& $setSecret 'SMTP_USER' $smtpUser
& $setSecret 'SMTP_PASS' $smtpPass
& $setSecret 'AZURE_STORAGE_CONNECTION_STRING' $storageConnection
& $setSecret 'AZURE_STATIC_WEB_APPS_API_TOKEN' $swaToken

& $azPath pipelines variable-group variable delete --group-id $existingGroupId --name PLACEHOLDER --yes --output none 2>$null

Write-Host ''
Write-Host 'Azure DevOps variable group is ready.' -ForegroundColor Green
Write-Host "Organization: $OrganizationUrl"
Write-Host "Project: $Project"
Write-Host "Variable group: $VariableGroupName"
Write-Host ''
Write-Host 'Next: link this variable group to your CD pipeline and run a deployment.' -ForegroundColor Yellow
