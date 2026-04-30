# Azure implementation plan (low cost to scale)

## Objective

Move from Vercel + Render + Atlas to an Azure-first platform with minimal startup cost and a clear scale-up path.

## Phase 1: foundation (implemented in repo)

1. Cloud-ready media storage abstraction exists on backend:
   - Azure Blob is used when `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_CONTAINER_NAME` are configured.
   - Local `/uploads` fallback remains active for local development and emergency fallback.
2. Upload middleware now uses a single wrapper (`handleUpload`) across routes for consistent error handling.
3. CORS now fails closed in production when no allowlist is configured.
4. Server now has:
   - `server/.env.example` with Azure Blob env keys
   - `server/Dockerfile` and `server/.dockerignore`
5. Azure DevOps CI scaffold exists:
   - root `azure-pipelines.yml`
   - `.azuredevops/pipelines/ci.yml`
6. Azure DevOps CD pipeline exists:
   - `.azuredevops/pipelines/cd.yml`
7. Azure Static Web Apps routing config exists:
   - `client/staticwebapp.config.json`
8. Azure CLI automation exists:
   - `scripts/azure/Provision-Foundation.ps1`
   - `scripts/azure/Deploy-App.ps1`
   - `scripts/azure/foundation.parameters.sample.json`
   - `scripts/azure/appsettings.parameters.sample.json`

## Local prerequisite blocker

Azure CLI is installed on the machine, but Azure authentication is currently blocked by outbound network access:

- `login.microsoftonline.com:443` is unreachable from this machine
- `management.azure.com:443` is unreachable from this machine

Until that is fixed, Azure resource creation cannot be completed from this terminal.

Typical fixes:

1. Allow outbound HTTPS to Microsoft identity and Azure management endpoints in local firewall, proxy, VPN, or corporate network policy.
2. If your environment requires a proxy, configure PowerShell and Azure CLI proxy settings before running `az login`.
3. After connectivity is restored, run device-code login again.

## CLI bootstrap scripts

### 1. Provision the Azure foundation

Fill `scripts/azure/foundation.parameters.sample.json` first, then run:

```powershell
pwsh ./scripts/azure/Provision-Foundation.ps1 -ConfigPath ./scripts/azure/foundation.parameters.sample.json
```

This creates:

1. Resource group
2. Azure Container Registry
3. Storage account + public blob container for media
4. Application Insights
5. Container Apps environment
6. Static Web App

It also prints:

1. Static Web App hostname
2. Static Web App deployment token
3. ACR login server
4. Blob public base URL

### 2. Deploy the backend app

Fill `scripts/azure/appsettings.parameters.sample.json` with real app settings and secrets, then run:

```powershell
pwsh ./scripts/azure/Deploy-App.ps1 -ConfigPath ./scripts/azure/appsettings.parameters.sample.json
```

This will:

1. Build the backend image with `az acr build`
2. Create or update the Container App
3. Configure secrets and runtime environment variables
4. Print the backend URL

## Immediate next steps once connectivity is fixed

1. Run:

```powershell
& 'C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd' login --use-device-code
```

2. Run the foundation script.
3. Send me the script output or let me keep driving the terminal.
4. Provide the real values for:
   - `mongoDbUri`
   - `jwtSecret`
   - `smtpUser`
   - `smtpPass`
5. Run the deploy script.
6. Use the resulting backend URL as `VITE_API_BASE_URL` for the frontend deployment.

## Azure resources to create now

Create in one region (recommended `westeurope` for Czech users):

1. Resource group:
   - `rg-bingo-dev-we`
2. Frontend:
   - Azure Static Web Apps (Free)
   - Name example: `swa-bingo-dev-we`
3. Backend:
   - Azure Container Apps environment
   - Azure Container App: `ca-bingo-api-dev-we`
4. Container image registry:
   - Azure Container Registry Basic: `acrbingodevwe`
5. Storage:
   - Storage Account Standard LRS v2: `stbingodevwe`
   - Blob container: `media`
6. Observability:
   - Application Insights: `appi-bingo-api-dev-we`
7. Optional for secrets hardening (Phase 2):
   - Azure Key Vault: `kv-bingo-dev-we`

## Runtime environment variables

Set for backend container app:

- `PORT=5000`
- `NODE_ENV=production`
- `MONGODB_URI=<atlas-uri>`
- `JWT_SECRET=<strong-secret>`
- `CLIENT_URL=<frontend-url>`
- `ALLOWED_ORIGINS=<frontend-url> <custom-domain-if-any>`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `AZURE_STORAGE_CONNECTION_STRING=<storage-connection-string>`
- `AZURE_STORAGE_CONTAINER_NAME=media`
- `AZURE_STORAGE_PUBLIC_BASE_URL=<optional-cdn-or-public-container-url>`

Set for frontend static web app:

- `VITE_API_BASE_URL=https://<api-domain>/api`

## Cost model (estimates)

These are planning estimates, not billing quotes.

### Scenario A: zero to low traffic

- Static Web Apps Free: 0 USD
- Container Apps consumption: 0-5 USD
- Blob storage (1-5 GB + low ops): 0.2-2 USD
- App Insights (capped): 0-3 USD
- Atlas M0: 0 USD
- Total: about 1-25 USD per month

### Scenario B: early growth

- Static Web Apps Standard: ~9 USD
- Container Apps: 15-80 USD
- Blob storage (50-200 GB): 2-10 USD
- App Insights: 5-25 USD
- Atlas M10+: 57-100 USD
- Total: about 90-225 USD per month

## Deployment sequence

1. Create Azure resources listed above.
2. Build and push backend image to ACR.
3. Deploy backend container app and set env vars.
4. Deploy frontend to Static Web Apps and set `VITE_API_BASE_URL`.
5. Validate full flow:
   - register/login
   - create game
   - upload profile photo
   - upload card fulfillment photo
6. Configure budget alerts at 50%, 80%, and 100%.

## Azure DevOps pipeline variables

Set these variables in the Azure DevOps pipeline (mark secrets as secret):

- `MONGODB_URI` (secret)
- `JWT_SECRET` (secret)
- `CLIENT_URL`
- `ALLOWED_ORIGINS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER` (secret)
- `SMTP_PASS` (secret)
- `AZURE_STORAGE_CONNECTION_STRING` (secret)
- `AZURE_STORAGE_CONTAINER_NAME`
- `AZURE_STORAGE_PUBLIC_BASE_URL`
- `VITE_API_BASE_URL`
- `AZURE_STATIC_WEB_APPS_API_TOKEN` (secret)

Also ensure these service connections exist in Azure DevOps:

- `sc-azure-bingo-dev` (Azure Resource Manager)
- `sc-acr-bingo-dev` (Docker registry / ACR)

## Phase 2 backlog

1. Move secrets from app settings to Key Vault references.
2. Add separate staging/prod CD templates after dev stabilizes.
3. Introduce staging environment and approval gates.
4. Consider moving fulfillments to separate collection before high growth to reduce document-size risk.
