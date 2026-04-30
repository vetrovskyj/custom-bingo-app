$ErrorActionPreference = 'Continue'

$targets = @(
  'login.microsoftonline.com',
  'management.azure.com',
  'graph.microsoft.com',
  'azurecr.io',
  'blob.core.windows.net'
)

Write-Host '=== Azure connectivity check ===' -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format s)"
Write-Host ''

Write-Host 'WinHTTP proxy:' -ForegroundColor Yellow
netsh winhttp show proxy | Out-String | Write-Host

Write-Host 'Environment proxy variables:' -ForegroundColor Yellow
$proxyVars = 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy'
foreach ($proxyVar in $proxyVars) {
  $value = [Environment]::GetEnvironmentVariable($proxyVar)
  if ($value) {
    Write-Host ("{0}={1}" -f $proxyVar, $value)
  }
}
Write-Host ''

foreach ($target in $targets) {
  Write-Host ("Testing {0}:443 ..." -f $target) -ForegroundColor DarkGray
  $result = Test-NetConnection $target -Port 443 -WarningAction SilentlyContinue
  [PSCustomObject]@{
    Host = $target
    Tcp443Reachable = $result.TcpTestSucceeded
    ResolvedAddress = ($result.RemoteAddress -as [string])
  } | Format-Table -AutoSize | Out-String | Write-Host
}

Write-Host '=== End of check ===' -ForegroundColor Cyan
