'use strict';

const VERSION = '2.9.4-ultra';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://visioncoreai.pages.dev',
  'https://visioncore.technetgame.com.br',
  'https://technetgame.com.br',
  'https://www.technetgame.com.br',
  'https://api.technetgame.com.br',
  'https://visionapi.technetgame.com.br',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8787',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8787',
  'http://127.0.0.1:8080'
];

function parseAllowedOrigins() {
  const extra = String(process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])).map(v => v.replace(/\/$/, ''));
}

function normalizeOrigin(origin) {
  if (!origin || origin === 'null') return null;
  return String(origin).trim().replace(/\/$/, '');
}

function originIsAllowed(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return true;
  const allowed = parseAllowedOrigins();
  if (allowed.includes(normalized)) return true;
  if (/^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(normalized)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)?technetgame\.com\.br$/i.test(normalized)) return true;
  return false;
}

function resolveCorsOrigin(req) {
  const origin = normalizeOrigin(req.headers.origin);
  // ULTRA: never omit ACAO. Browser failures must not hide backend diagnostics.
  if (!origin) return '*';
  return origin;
}

function installCorsHeaders(req, res) {
  const rawOrigin = req.headers.origin;
  const origin = normalizeOrigin(rawOrigin);
  const corsOrigin = resolveCorsOrigin(req);
  const requestedHeaders = req.headers['access-control-request-headers'];
  const allowed = originIsAllowed(origin);

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
  if (origin && corsOrigin !== '*') res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Allow-Headers', requestedHeaders || 'Origin, Content-Type, Authorization, X-Requested-With, Accept, Cache-Control, Last-Event-ID, X-Vision-Agent, X-Vision-Request, X-Request-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, X-Vision-Version, X-Request-Id, X-Cors-Status, X-Cors-Origin, X-SSE-Status, X-Pass-Gold');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Vision-Version', VERSION);
  res.setHeader('X-Cors-Origin', rawOrigin || 'null');
  res.setHeader('X-Cors-Status', allowed ? 'allowed' : 'ultra-reflected');
  if (!allowed) console.warn('[CORS_ULTRA_REFLECTED_ORIGIN]', origin);
}

function installSecurity(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use((req, res, next) => {
    installCorsHeaders(req, res);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Cache-Control', req.path && req.path.includes('run-live-stream') ? 'no-cache, no-transform' : 'no-store');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
}

module.exports = { VERSION, installSecurity, installCorsHeaders, parseAllowedOrigins, normalizeOrigin, originIsAllowed, resolveCorsOrigin };
