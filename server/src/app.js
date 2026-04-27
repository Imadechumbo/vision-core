'use strict';

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const routes     = require('./routes/index');

const app = express();

// ── Security ──────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));

// ── CORS ──────────────────────────────────────────────────────────────────
const ALLOWED = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:8787')
  .split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED.includes(origin) || ALLOWED.includes('*')) return cb(null, true);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Vision-Token'],
}));

app.options('*', cors());

// ── Body / Compression ────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limit ────────────────────────────────────────────────────────────
app.use('/api/missions/run', rateLimit({
  windowMs: 60_000, max: Number(process.env.MISSION_RATE_LIMIT || 10),
  message: { ok: false, error: 'Muitas missões. Aguarde 1 minuto.' },
}));

app.use(rateLimit({
  windowMs: 60_000, max: 200,
  message: { ok: false, error: 'Rate limit excedido.' },
}));

// ── Request logger ────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString().slice(11,19)}] ${req.method} ${req.path}`);
  }
  next();
});

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Rota não encontrada', path: req.path });
});

// ── Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[APP ERROR]', err.message);
  res.status(500).json({ ok: false, error: err.message || 'Erro interno' });
});

module.exports = app;
