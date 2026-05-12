# Custom Bingo App — Project Guidelines

## Stack

**Frontend**: React 18, Vite, React Router v6, Axios, react-hot-toast, plain CSS (no UI lib)  
**Backend**: Node.js, Express 4, Mongoose 8 / MongoDB, JWT auth, Multer uploads, Nodemailer  
**Deploy**: Frontend on Azure Static Web Apps Free, backend on Azure Container Apps, images in Azure Container Registry, uploads in Azure Blob Storage

## Architecture

- All API routes prefixed `/api/auth` and `/api/bingo`
- Auth: JWT in `localStorage`, 7-day expiry, verified on app load via `GET /api/auth/me`
- File uploads served statically from `/uploads/` via Express
- i18n: Czech default (`'cs'`), translations in `client/src/i18n/translations.js`, accessed via `LangContext`
- Production frontend URL: `https://kind-moss-00103a303.7.azurestaticapps.net`
- Production backend base URL: `https://ca-bingo-api-dev-we.jollyrock-5d3d58e1.westeurope.azurecontainerapps.io/api`

## Key Files

- Axios instance + JWT interceptor: `client/src/api/axios.js`
- Auth state: `client/src/context/AuthContext.jsx`
- Route guards: `PrivateRoute`, `PublicRoute`, `JoinRoute` in `client/src/App.jsx`
- DB connection: `server/config/db.js`
- Auth middleware: `server/middleware/auth.js`
- Azure deploy scripts: `scripts/azure/Provision-Foundation.ps1`, `scripts/azure/Deploy-App.ps1`, `scripts/azure/Deploy-Frontend.ps1`, `scripts/azure/Validate-AzureSetup.ps1`

## Code Conventions

- React components: PascalCase files; use hooks, functional components only
- Mongoose models: PascalCase (`User`, `BingoGame`)
- Variables/functions: camelCase
- Always use the centralized Axios instance (`client/src/api/axios.js`) — never `fetch` or raw axios
- Always use `toast` from `react-hot-toast` for user feedback — never `alert()`
- Always run translations through `t()` from `LangContext` — no hardcoded user-facing strings
- Invite codes: 8-char uppercase UUID slice via `uuidv4`
- File upload errors: use `handleUpload` wrapper from `server/middleware/upload.js`
- Do not store deployment secrets in tracked JSON files; prefer environment variables or Azure secret stores

## Build & Run

```bash
# Client
cd client && npm install && npm run dev

# Server
cd server && npm install && node server.js

# Azure validation
powershell -ExecutionPolicy Bypass -File .\scripts\azure\Validate-AzureSetup.ps1 -ConfigPath .\scripts\azure\appsettings.parameters.json
```

## Environment Variables

Server local `.env` uses: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `ALLOWED_ORIGINS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

Azure deploy scripts can also read:
- `MONGODB_URI`
- `JWT_SECRET`
- `SMTP_USER`
- `SMTP_PASS`
- `ALLOWED_ORIGINS`
- `VITE_API_BASE_URL`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`

## No Real-Time

There is no Socket.io or WebSocket setup. All state is REST-based. Do not add socket dependencies without discussing first.
