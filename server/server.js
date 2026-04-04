require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

const splitOrigins = (value = '') =>
  value
    .split(/[,\s]+/)
    .map(entry => entry.trim())
    .filter(Boolean);

const normalizeOrigin = (origin) => {
  if (!origin) return '';
  const trimmed = origin.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const resolveAllowedOrigins = () => {
  const origins = splitOrigins(process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
    .map(normalizeOrigin)
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173', 'http://127.0.0.1:5173');
  }

  return Array.from(new Set(origins.map(normalizeOrigin)));
};

const allowedOrigins = resolveAllowedOrigins();
console.log('CORS allowed origins:', allowedOrigins.length ? allowedOrigins : '(none — all origins allowed)');

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, health checks)
      if (!origin) return callback(null, true);

      // If no origins configured, allow everything
      if (allowedOrigins.length === 0) return callback(null, true);

      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`Blocked CORS request from origin: ${origin} (normalized: ${normalizedOrigin})`);
      console.warn('Allowed origins:', allowedOrigins);
      // Return false instead of an Error to avoid Express 500 — browser still sees CORS block
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bingo', require('./routes/bingo'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
