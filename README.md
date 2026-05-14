# Custom Bingo App

A full-stack web application for creating and playing custom bingo games with friends. Built with React, Node.js, Express, and MongoDB, and currently deployed on Azure.

## Live URLs

- Frontend: `https://kind-moss-00103a303.7.azurestaticapps.net`
- Backend API: `https://ca-bingo-api-dev-we.jollyrock-5d3d58e1.westeurope.azurecontainerapps.io/api`

## Features

- **User Authentication** — Register, login, forgot/reset password with JWT tokens
- **Create Bingo Games** — Customizable grid dimensions (2×2 up to 8×8), with your own card texts
- **Invite Players** — Share invite links or send email invitations
- **Play Bingo** — Click cards to submit photo proof of completion
- **Review System** — Game creators can approve or decline photo submissions
- **Player Progress** — See player avatars on fulfilled cards
- **Responsive Design** — Works great on desktop and mobile

## Tech Stack

- **Frontend:** React 18 + Vite + React Router
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + bcrypt
- **File Uploads:** Multer
- **Email:** Nodemailer (optional)
- **Azure Hosting:** Static Web Apps, Container Apps, Azure Container Registry, Blob Storage, Application Insights

## Prerequisites

- **Node.js** 18+ 
- **MongoDB** running locally or a MongoDB Atlas connection string

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd custom-bingo-app
```

### 2. Set up the Backend

```bash
cd server
npm install
```

Copy [server/.env.example](server/.env.example) to a new `.env` file in the server folder and update the placeholders. At minimum you will need `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `ALLOWED_ORIGINS` (comma-, space-, or newline-separated list of every URL that should be allowed by CORS).

### 3. Set up the Frontend

```bash
cd ../client
npm install
```

Create a `.env` file inside `client/` by copying [client/.env.example](client/.env.example). Keep `VITE_API_BASE_URL=/api` for local development so Vite forwards traffic to the backend proxy; replace it with your deployed API URL (for example, `https://custom-bingo-api.onrender.com/api`) when you go live.

### 4. Start Both Servers

In one terminal (backend):
```bash
cd server
npm run dev
```

In another terminal (frontend):
```bash
cd client
npm run dev
```

The app will be available at **http://localhost:5173**

For the current Azure workflow and deploy commands, see [docs/azure-development-runbook.md](docs/azure-development-runbook.md).

For browser automation setup in VS Code via MCP, see [docs/mcp-browser-setup.md](docs/mcp-browser-setup.md).

## Project Structure

```
custom-bingo-app/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── api/             # Axios API config
│   │   ├── components/      # Reusable components (Navbar, Avatar)
│   │   ├── context/         # Auth context (React Context)
│   │   ├── pages/           # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateBingo.jsx
│   │   │   ├── EditBingo.jsx
│   │   │   ├── PlayBingo.jsx
│   │   │   ├── ManageBingo.jsx
│   │   │   ├── JoinGame.jsx
│   │   │   └── Profile.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
├── server/                  # Node.js backend
│   ├── config/              # Database config
│   ├── middleware/           # Auth & upload middleware
│   ├── models/              # Mongoose models
│   │   ├── User.js
│   │   └── BingoGame.js
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   └── bingo.js
│   ├── uploads/             # Uploaded proof photos
│   ├── server.js            # Entry point
│   └── .env                 # Environment variables
└── README.md
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password/:token` | Reset password |

### Bingo Games
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bingo` | Create a new game |
| GET | `/api/bingo/my-games` | Get games created by you |
| GET | `/api/bingo/playing` | Get games you're playing |
| GET | `/api/bingo/:id` | Get game details |
| PUT | `/api/bingo/:id` | Update game (creator only) |
| DELETE | `/api/bingo/:id` | Delete game (creator only) |
| GET | `/api/bingo/join/:inviteCode` | Join via invite code |
| POST | `/api/bingo/:id/fulfill/:cardIndex` | Submit proof photo |
| PUT | `/api/bingo/:id/review/:cardIndex/:fulfillmentId` | Approve/decline |

## Password Reset

For the MVP, password reset links are logged to the server console. To enable email delivery, configure SMTP settings in the server `.env` file (see [server/.env.example](server/.env.example)):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Azure Deployment Summary

- **Frontend** — Azure Static Web Apps Free (`swa-bingo-a39305`)
- **Backend** — Azure Container Apps (`ca-bingo-api-dev-we`)
- **Container Registry** — Azure Container Registry Basic (`acrbingoa39305`)
- **Uploads** — Azure Blob Storage (`stbingoa39305/media`)
- **Validation** — `scripts/azure/Validate-AzureSetup.ps1`

For deploy and development details, see [docs/azure-development-runbook.md](docs/azure-development-runbook.md).
