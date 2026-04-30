param(
  [string]$ConfigPath = "scripts/azure/foundation.parameters.sample.json"
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

function Convert-TagsToArgumentList {
  param([object]$Tags)

  if (-not $Tags) {
    return @()
  }

  $pairs = @()
  foreach ($property in $Tags.PSObject.Properties) {
    $pairs += ("{0}={1}" -f $property.Name, $property.Value)
  }
  return $pairs
}

function Ensure-ProviderRegistered {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Namespace
  )

  $state = & $script:AzPath provider show --namespace $Namespace --query registrationState --output tsv 2>$null
  if ($state -eq 'Registered') {
    return
  }

  Invoke-AzCli -Arguments @('provider', 'register', '--namespace', $Namespace)

  $attempt = 0
  do {
    Start-Sleep -Seconds 5
    $state = & $script:AzPath provider show --namespace $Namespace --query registrationState --output tsv 2>$null
    $attempt++
  } while ($state -ne 'Registered' -and $attempt -lt 24)

  if ($state -ne 'Registered') {
    throw "Provider namespace $Namespace is not registered yet. Current state: $state"
  }
}

if (-not (Test-Path $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$script:AzPath = Resolve-AzPath
$tags = Convert-TagsToArgumentList -Tags $config.tags

Invoke-AzCli -Arguments @('account', 'show', '--output', 'none')

if ($config.subscriptionId) {
  Invoke-AzCli -Arguments @('account', 'set', '--subscription', $config.subscriptionId)
}

$providerNamespaces = @(
  'Microsoft.ContainerRegistry',
  'Microsoft.Storage',
  'Microsoft.App',
  'Microsoft.Web',
  'Microsoft.Insights',
  'Microsoft.OperationalInsights'
)

foreach ($providerNamespace in $providerNamespaces) {
  Ensure-ProviderRegistered -Namespace $providerNamespace
}

Invoke-AzCli -Arguments @('extension', 'add', '--name', 'application-insights', '--upgrade', '--yes')

$resourceGroupExists = & $script:AzPath group exists --name $config.resourceGroupName
if ($resourceGroupExists -ne 'true') {
  Invoke-AzCli -Arguments (@('group', 'create', '--name', $config.resourceGroupName, '--location', $config.location, '--tags') + $tags)
}

$acrExists = $false
try {
  & $script:AzPath acr show --name $config.acrName --resource-group $config.resourceGroupName --output none 2>$null
  $acrExists = ($LASTEXITCODE -eq 0)
} catch {
  $acrExists = $false
}
if (-not $acrExists) {
  Invoke-AzCli -Arguments (@('acr', 'create', '--name', $config.acrName, '--resource-group', $config.resourceGroupName, '--location', $config.location, '--sku', 'Basic', '--admin-enabled', 'true', '--tags') + $tags)
}

$storageExists = $false
try {
  & $script:AzPath storage account show --name $config.storageAccountName --resource-group $config.resourceGroupName --output none 2>$null
  $storageExists = ($LASTEXITCODE -eq 0)
} catch {
  $storageExists = $false
}
if (-not $storageExists) {
  Invoke-AzCli -Arguments (@(
    'storage', 'account', 'create',
    '--name', $config.storageAccountName,
    '--resource-group', $config.resourceGroupName,
    '--location', $config.location,
    '--sku', 'Standard_LRS',
    '--kind', 'StorageV2',
    '--allow-blob-public-access', 'true',
    '--https-only', 'true',
    '--min-tls-version', 'TLS1_2',
    '--tags'
  ) + $tags)
}

$connectionString = & $script:AzPath storage account show-connection-string --name $config.storageAccountName --resource-group $config.resourceGroupName --query connectionString --output tsv
if (-not $connectionString) {
  throw 'Unable to retrieve storage account connection string.'
}

Invoke-AzCli -Arguments @(
  'storage', 'container', 'create',
  '--name', $config.blobContainerName,
  '--connection-string', $connectionString,
  '--public-access', 'blob'
)

$appInsightsExists = $false
try {
  & $script:AzPath monitor app-insights component show --app $config.appInsightsName --resource-group $config.resourceGroupName --output none 2>$null
  $appInsightsExists = ($LASTEXITCODE -eq 0)
} catch {
  $appInsightsExists = $false
}
if (-not $appInsightsExists) {
  Invoke-AzCli -Arguments (@(
    'monitor', 'app-insights', 'component', 'create',
    '--app', $config.appInsightsName,
    '--location', $config.location,
    '--resource-group', $config.resourceGroupName,
    '--application-type', 'web',
    '--kind', 'web',
    '--tags'
  ) + $tags)
}

$environmentExists = $false
try {
  & $script:AzPath containerapp env show --name $config.containerAppEnvironmentName --resource-group $config.resourceGroupName --output none 2>$null
  $environmentExists = ($LASTEXITCODE -eq 0)
} catch {
  $environmentExists = $false
}
if (-not $environmentExists) {
  Invoke-AzCli -Arguments (@(
    'containerapp', 'env', 'create',
    '--name', $config.containerAppEnvironmentName,
    '--resource-group', $config.resourceGroupName,
    '--location', $config.location,
    '--logs-destination', 'none',
    '--enable-workload-profiles', 'false',
    '--tags'
  ) + $tags)
}

$staticWebAppExists = $false
try {
  & $script:AzPath staticwebapp show --name $config.staticWebAppName --resource-group $config.resourceGroupName --output none 2>$null
  $staticWebAppExists = ($LASTEXITCODE -eq 0)
} catch {
  $staticWebAppExists = $false
}
if (-not $staticWebAppExists) {
  Invoke-AzCli -Arguments (@(
    'staticwebapp', 'create',
    '--name', $config.staticWebAppName,
    '--resource-group', $config.resourceGroupName,
    '--location', $config.location,
    '--sku', 'Free',
    '--tags'
  ) + $tags)
}

$staticWebAppHost = & $script:AzPath staticwebapp show --name $config.staticWebAppName --resource-group $config.resourceGroupName --query defaultHostname --output tsv
$staticWebAppToken = & $script:AzPath staticwebapp secrets list --name $config.staticWebAppName --resource-group $config.resourceGroupName --query properties.apiKey --output tsv
$acrLoginServer = & $script:AzPath acr show --name $config.acrName --resource-group $config.resourceGroupName --query loginServer --output tsv
$storagePublicBaseUrl = "https://$($config.storageAccountName).blob.core.windows.net/$($config.blobContainerName)"

Write-Host ''
Write-Host 'Foundation provisioned successfully.' -ForegroundColor Green
Write-Host "Static Web App hostname: https://$staticWebAppHost"
Write-Host "Static Web App deployment token: $staticWebAppToken"
Write-Host "ACR login server: $acrLoginServer"
Write-Host "Blob public base URL: $storagePublicBaseUrl"
Write-Host "Container Apps environment: $($config.containerAppEnvironmentName)"
