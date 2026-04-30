# Azure CLI network unblock

This machine currently cannot reach Azure identity and management endpoints over HTTPS.

## Symptoms

- `az login --use-device-code` fails with timeout to `login.microsoftonline.com`
- `Test-NetConnection login.microsoftonline.com -Port 443` returns `TcpTestSucceeded: False`
- `Test-NetConnection management.azure.com -Port 443` returns `TcpTestSucceeded: False`

## What to allow in firewall/proxy

At minimum allow outbound TCP 443 to:

1. `login.microsoftonline.com`
2. `management.azure.com`
3. `graph.microsoft.com`
4. `*.azurecr.io`
5. `*.blob.core.windows.net`

## Quick diagnostics command

Run:

```powershell
pwsh ./scripts/azure/Check-AzureConnectivity.ps1
```

## If your company uses an HTTP proxy

1. Set WinHTTP proxy (admin shell):

```powershell
netsh winhttp set proxy proxy-server="http://<proxy-host>:<proxy-port>" bypass-list="localhost;127.0.0.1"
```

2. Set session env vars in the terminal where `az` runs:

```powershell
$env:HTTP_PROXY = 'http://<proxy-host>:<proxy-port>'
$env:HTTPS_PROXY = 'http://<proxy-host>:<proxy-port>'
$env:NO_PROXY = 'localhost,127.0.0.1'
```

3. Retry:

```powershell
& 'C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd' login --use-device-code
```

## Continue provisioning after unblock

1. Run foundation provisioning:

```powershell
pwsh ./scripts/azure/Provision-Foundation.ps1 -ConfigPath ./scripts/azure/foundation.parameters.sample.json
```

2. Run app deployment:

```powershell
pwsh ./scripts/azure/Deploy-App.ps1 -ConfigPath ./scripts/azure/appsettings.parameters.sample.json
```
