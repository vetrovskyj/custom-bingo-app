param(
  [string]$ConfigPath = "scripts/azure/appsettings.parameters.json",
  [string]$ApiBaseUrl = "",
  [string]$FrontendUrl = ""
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

  return $null
}

function Get-TrimmedValue {
  param([object]$Value)

  if ($null -eq $Value) {
    return ''
  }

  return ([string]$Value).Trim()
}

function Test-HttpStatus {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [string]$Method = 'GET',
    [hashtable]$Headers
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -TimeoutSec 30 -UseBasicParsing
    return [PSCustomObject]@{
      Success = $true
      StatusCode = [int]$response.StatusCode
      Message = 'OK'
      Headers = $response.Headers
    }
  } catch {
    $statusCode = 0
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    return [PSCustomObject]@{
      Success = $false
      StatusCode = $statusCode
      Message = $_.Exception.Message
      Headers = $null
    }
  }
}

if (-not (Test-Path $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

$azPath = Resolve-AzPath
if (-not $ApiBaseUrl) {
  if ($azPath) {
    $previousPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = 'Continue'
      $apiHost = & $azPath containerapp show --name $config.containerAppName --resource-group $config.resourceGroupName --query properties.configuration.ingress.fqdn --output tsv 2>$null
      if ($LASTEXITCODE -eq 0 -and $apiHost) {
        $ApiBaseUrl = "https://$apiHost/api"
      }
    } catch {
      # Container App may not exist yet.
    } finally {
      $ErrorActionPreference = $previousPreference
    }
  }
}

if (-not $FrontendUrl) {
  $FrontendUrl = Get-TrimmedValue -Value $config.clientUrl
}

if (-not $ApiBaseUrl) {
  throw 'ApiBaseUrl could not be resolved. Pass -ApiBaseUrl explicitly.'
}

$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
if (-not $FrontendUrl) {
  Write-Warning 'FrontendUrl is empty, CORS test will be skipped.'
}

$results = @()

$healthUrl = "$ApiBaseUrl/health"
$healthResult = Test-HttpStatus -Url $healthUrl
$results += [PSCustomObject]@{
  Check = 'API health endpoint'
  Result = if ($healthResult.Success -and $healthResult.StatusCode -eq 200) { 'PASS' } else { 'FAIL' }
  Detail = "$healthUrl -> $($healthResult.StatusCode) $($healthResult.Message)"
}

if ($FrontendUrl) {
  $frontendResult = Test-HttpStatus -Url $FrontendUrl
  $results += [PSCustomObject]@{
    Check = 'Frontend reachable'
    Result = if ($frontendResult.Success -and $frontendResult.StatusCode -eq 200) { 'PASS' } else { 'WARN' }
    Detail = "$FrontendUrl -> $($frontendResult.StatusCode) $($frontendResult.Message)"
  }

  $corsHeaders = @{
    Origin = $FrontendUrl
    'Access-Control-Request-Method' = 'GET'
  }
  $corsResult = Test-HttpStatus -Url $healthUrl -Method 'OPTIONS' -Headers $corsHeaders
  $allowOrigin = ''
  if ($corsResult.Headers) {
    $allowOrigin = [string]$corsResult.Headers['Access-Control-Allow-Origin']
  }

  $corsPass = $corsResult.StatusCode -in @(200, 204) -and $allowOrigin
  $results += [PSCustomObject]@{
    Check = 'CORS preflight from frontend'
    Result = if ($corsPass) { 'PASS' } else { 'WARN' }
    Detail = "$healthUrl OPTIONS -> $($corsResult.StatusCode), Access-Control-Allow-Origin=$allowOrigin"
  }
}

Write-Host ''
Write-Host '=== Azure deployment smoke test ===' -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-String | Write-Host

$hasFail = $results | Where-Object { $_.Result -eq 'FAIL' }
if ($hasFail) {
  exit 1
}

exit 0
