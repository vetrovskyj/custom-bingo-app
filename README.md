# Custom Bingo App

A full-stack web application for creating and playing custom bingo games with friends. Built with React, Node.js, Express, and MongoDB.

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

Copy [server/.env.example](server/.env.example) to a new `.env` file in the server folder and update the placeholders. At minimum you will need `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `ALLOWED_ORIGINS` (comma-separated list of every URL that should be allowed by CORS).

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

## Free Deployment Guide

- **MongoDB Atlas (Database)** — Create an M0 free-tier cluster, add your database user, and whitelist `0.0.0.0/0` or Render's outbound IP list. Copy the connection string into `MONGODB_URI` in `server/.env`.
- **Render Free Web Service (Backend)** — Push this repo to GitHub, create a new Web Service at Render, point it to `server`, set the build command to `npm install` and start command to `npm start`, then add the env vars from [server/.env.example](server/.env.example). Include every frontend URL in `ALLOWED_ORIGINS` (Render URL, Netlify/Vercel URL, and your custom domain) so CORS accepts them.
- **Netlify or Vercel (Frontend)** — Import the repo, select `client` as the root, keep the default `npm run build`, and expose `VITE_API_BASE_URL` pointing at your Render API (for example `https://custom-bingo-api.onrender.com/api`). Each platform gives you a free subdomain (`*.netlify.app` or `*.vercel.app`).
- **Free Custom Domain** — If you want a human-friendly domain at no cost, request a subdomain from services like `js.org`, `is-a.dev`, or `thedev.id`. Once approved, add the CNAME they provide to your Netlify/Vercel site and list the final domain inside `CLIENT_URL`, `ALLOWED_ORIGINS`, and `VITE_API_BASE_URL`.
- **Optional Cloudflare Proxy** — Point your chosen domain to Cloudflare’s free tier, add the Netlify/Vercel CNAME, and use Cloudflare SSL + caching. Cloudflare also lets you create free `pages.dev` subdomains if you prefer deploying there.

## Deployment Checklist

- Build passes locally with `npm run build` in `client` and `npm start` in `server`.
- `server/.env` contains production values for `CLIENT_URL` and `ALLOWED_ORIGINS` covering every domain that will load the frontend.
- `client/.env` sets `VITE_API_BASE_URL` to the fully-qualified backend URL (including `/api`).
- Render service shows `Server running on port 5000` in its logs and `/api/health` responds with `{ status: "ok" }`.
- Netlify/Vercel site loads, hits the deployed `/api` successfully, and assets are served from the CDN-backed domain.
