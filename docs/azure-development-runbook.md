# Azure Development Runbook

## Current live environment

- Frontend URL: `https://kind-moss-00103a303.7.azurestaticapps.net`
- Backend API base URL: `https://ca-bingo-api-dev-we.jollyrock-5d3d58e1.westeurope.azurecontainerapps.io/api`
- Health endpoint: `https://ca-bingo-api-dev-we.jollyrock-5d3d58e1.westeurope.azurecontainerapps.io/api/health`
- Azure region: `westeurope`
- Resource group: `rg-bingo-dev-we`

## Azure resources in use

- Azure Static Web Apps Free: `swa-bingo-a39305`
- Azure Container Apps environment: `cae-bingo-dev-we`
- Azure Container App: `ca-bingo-api-dev-we`
- Azure Container Registry Basic: `acrbingoa39305`
- Azure Storage Account: `stbingoa39305`
- Blob container: `media`
- Application Insights: `appi-bingo-api-dev-we`
- MongoDB: Atlas

## Local development

### Backend

1. Open a terminal in the repo root.
2. Run:

```powershell
cd server
npm install
copy .env.example .env
npm run dev
```

3. Set at least these values in `server/.env`:

```env
MONGODB_URI=<your-local-or-atlas-uri>
JWT_SECRET=<strong-random-secret>
CLIENT_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173 http://127.0.0.1:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<optional>
SMTP_PASS=<optional>
```

### Frontend

1. Open a second terminal.
2. Run:

```powershell
cd client
npm install
copy .env.example .env
npm run dev
```

3. Keep this in `client/.env` for local development:

```env
VITE_API_BASE_URL=/api
```

4. Open `http://localhost:5173`

## Local testing

### Frontend unit tests

```powershell
cd client
npm run test:unit
```

### Frontend E2E tests

```powershell
cd client
npm run test:e2e
```

### Backend syntax/perf smoke

```powershell
cd server
node --check server.js
node scripts/perf-smoke.js
```

## Azure deployment scripts

All Azure scripts live in `scripts/azure/`.

### 1. Preflight

Checks Azure login, resource existence, config presence, and local prerequisites.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\azure\Preflight-Deploy.ps1 -ConfigPath .\scripts\azure\appsettings.parameters.json
```

### 2. Deploy backend

Builds the server image in ACR and creates or updates the Container App.

Required environment variables if not present in config:
- `MONGODB_URI`
- `JWT_SECRET`
- `SMTP_USER`
- `SMTP_PASS`
- optionally `ALLOWED_ORIGINS`

```powershell
$env:MONGODB_URI = '<atlas-connection-string>'
$env:JWT_SECRET = '<strong-random-secret>'
$env:SMTP_USER = '<smtp-user>'
$env:SMTP_PASS = '<smtp-password>'
powershell -ExecutionPolicy Bypass -File .\scripts\azure\Deploy-App.ps1 -ConfigPath .\scripts\azure\appsettings.parameters.json
```

### 3. Deploy frontend

Builds the client with `VITE_API_BASE_URL` and deploys `client/dist` to Static Web Apps.

Optional environment variables:
- `VITE_API_BASE_URL`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`

If omitted, the script resolves the current Container App URL and Static Web App token from Azure.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\azure\Deploy-Frontend.ps1 -ConfigPath .\scripts\azure\appsettings.parameters.json
```

### 4. Validate live Azure setup

Runs preflight then smoke tests.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\azure\Validate-AzureSetup.ps1 -ConfigPath .\scripts\azure\appsettings.parameters.json
```

## Recommended day-to-day workflow

### When changing frontend only

1. Develop locally with Vite.
2. Run `npm run test:unit` in `client`.
3. Build locally if needed.
4. Deploy frontend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\azure\Deploy-Frontend.ps1 -ConfigPath .\scripts\azure\appsettings.parameters.json
```

### When changing backend only

1. Develop locally with `npm run dev` in `server`.
2. Validate route/model changes locally.
3. Deploy backend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\azure\Deploy-App.ps1 -ConfigPath .\scripts\azure\appsettings.parameters.json
```

4. Validate:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\azure\Validate-AzureSetup.ps1 -ConfigPath .\scripts\azure\appsettings.parameters.json
```

### When changing both frontend and backend

1. Deploy backend first.
2. Deploy frontend second.
3. Run validation.

## Browser testing after deployment

Use this order:

1. Open the frontend URL.
2. Register a test user or log in.
3. Create a bingo game.
4. Join via invite code.
5. Upload a profile image.
6. Upload a fulfillment photo.
7. Verify creator review flow.

## Troubleshooting

### Frontend shows Azure placeholder page

The Static Web App exists but the client build has not been published yet.

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\azure\Deploy-Frontend.ps1 -ConfigPath .\scripts\azure\appsettings.parameters.json
```

### API health fails

Check:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\azure\Test-Deployment.ps1 -ConfigPath .\scripts\azure\appsettings.parameters.json
az containerapp show --name ca-bingo-api-dev-we --resource-group rg-bingo-dev-we --output table
```

### CORS issues in browser

Make sure `CLIENT_URL` and `ALLOWED_ORIGINS` match the real Static Web App hostname.

### Mongo connection issues

Check Atlas network access and credentials. The backend currently resolves DNS with IPv4-first to avoid broken IPv6 paths.

## Azure DevOps variables to set

Secret variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `SMTP_USER`
- `SMTP_PASS`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`

Non-secret variables:
- `CLIENT_URL=https://kind-moss-00103a303.7.azurestaticapps.net`
- `ALLOWED_ORIGINS=https://kind-moss-00103a303.7.azurestaticapps.net`
- `AZURE_STORAGE_CONTAINER_NAME=media`
- `AZURE_STORAGE_PUBLIC_BASE_URL=https://stbingoa39305.blob.core.windows.net/media`
- `VITE_API_BASE_URL=https://ca-bingo-api-dev-we.jollyrock-5d3d58e1.westeurope.azurecontainerapps.io/api`

## Cost posture

Current low-cost stance:
- Static Web Apps Free
- Container Apps with `minReplicas=0`
- ACR Basic
- Blob Storage Standard LRS
- Atlas on low tier

If traffic stays low, this is the right setup. The first likely cost optimization later is reducing ACR usage frequency or moving images to a cheaper workflow only if needed.
