# Custom Bingo App — Project Guidelines

## Stack

**Frontend**: React 18, Vite, React Router v6, Axios, react-hot-toast, plain CSS (no UI lib)  
**Backend**: Node.js, Express 4, Mongoose 8 / MongoDB, JWT auth, Multer uploads, Nodemailer  
**Deploy**: Client on Vercel (`client/vercel.json`), Server standalone

## Architecture

- All API routes prefixed `/api/auth` and `/api/bingo`
- Auth: JWT in `localStorage`, 7-day expiry, verified on app load via `GET /api/auth/me`
- File uploads served statically from `/uploads/` via Express
- i18n: Czech default (`'cs'`), translations in `client/src/i18n/translations.js`, accessed via `LangContext`

## Key Files

- Axios instance + JWT interceptor: `client/src/api/axios.js`
- Auth state: `client/src/context/AuthContext.jsx`
- Route guards: `PrivateRoute`, `PublicRoute`, `JoinRoute` in `client/src/App.jsx`
- DB connection: `server/config/db.js`
- Auth middleware: `server/middleware/auth.js`

## Code Conventions

- React components: PascalCase files; use hooks, functional components only
- Mongoose models: PascalCase (`User`, `BingoGame`)
- Variables/functions: camelCase
- Always use the centralized Axios instance (`client/src/api/axios.js`) — never `fetch` or raw axios
- Always use `toast` from `react-hot-toast` for user feedback — never `alert()`
- Always run translations through `t()` from `LangContext` — no hardcoded user-facing strings
- Invite codes: 8-char uppercase UUID slice via `uuidv4`
- File upload errors: use `handleUpload` wrapper from `server/middleware/upload.js`

## Build & Run

```bash
# Client
cd client && npm install && npm run dev

# Server
cd server && npm install && node server.js
```

## Environment Variables

Server requires `.env` with: `MONGO_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `EMAIL_USER`, `EMAIL_PASS`

## No Real-Time

There is no Socket.io or WebSocket setup. All state is REST-based. Do not add socket dependencies without discussing first.
