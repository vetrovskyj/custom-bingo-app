---
name: azure-operations
description: "Use when deploying, validating, or troubleshooting the Azure-hosted Custom Bingo App. Covers Static Web Apps, Container Apps, ACR, Blob Storage, deployment scripts, and low-cost operational checks."
---

# Azure Operations

Use this skill when you need to:
- deploy the backend to Azure Container Apps
- deploy the frontend to Azure Static Web Apps
- validate the live Azure environment
- troubleshoot Azure config, CORS, or deployment issues
- explain the current Azure resource layout and costs

## Current Azure baseline

- Resource group: `rg-bingo-dev-we`
- Region: `westeurope`
- Static Web App: `swa-bingo-a39305`
- Frontend URL: `https://kind-moss-00103a303.7.azurestaticapps.net`
- Container Apps environment: `cae-bingo-dev-we`
- Container App: `ca-bingo-api-dev-we`
- Backend URL: `https://ca-bingo-api-dev-we.jollyrock-5d3d58e1.westeurope.azurecontainerapps.io`
- ACR: `acrbingoa39305.azurecr.io`
- Storage account: `stbingoa39305`
- Blob container: `media`

## Scripts to prefer

- `scripts/azure/Provision-Foundation.ps1`
- `scripts/azure/Preflight-Deploy.ps1`
- `scripts/azure/Deploy-App.ps1`
- `scripts/azure/Deploy-Frontend.ps1`
- `scripts/azure/Test-Deployment.ps1`
- `scripts/azure/Validate-AzureSetup.ps1`

## Safe workflow

1. Run preflight checks.
2. Keep secrets in environment variables or Azure secret stores, not tracked JSON files.
3. Deploy backend first if API changes affect the frontend build.
4. Deploy frontend with `VITE_API_BASE_URL` pointing at the live Container App `/api` URL.
5. Run `Validate-AzureSetup.ps1`.

## Required secret inputs

The deploy scripts can read these values from environment variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `SMTP_USER`
- `SMTP_PASS`
- `ALLOWED_ORIGINS`
- `VITE_API_BASE_URL`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`

## Low-cost operating guidance

- Keep Container Apps `minReplicas=0` unless cold-start latency becomes unacceptable.
- Keep Static Web Apps on Free until bandwidth or environments require Standard.
- Cap Application Insights ingestion and sample noisy telemetry.
- Keep Atlas on a low tier until data size or connection limits force a move.
