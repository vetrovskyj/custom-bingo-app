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

Edit `server/.env` and set your mongo connection string and a strong JWT secret:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/custom-bingo
JWT_SECRET=your_strong_random_secret_here
CLIENT_URL=http://localhost:5173
```

### 3. Set up the Frontend

```bash
cd ../client
npm install
```

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

For the MVP, password reset links are logged to the server console. To enable email delivery, configure SMTP settings in `server/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```
