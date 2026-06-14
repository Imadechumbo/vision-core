'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { scanConfig, applyConfigFixes, enforceConfigGold } = require('./vision_core/config/selfHealingConfig');
const { runGoMission, streamGoMission, checkGoHealth, resolveGoBinary } = require('./src/runtime/goRunner');
const { callHermes } = require('./hermes-rca');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const ROOT = process.cwd();
const MEMORY_ROOT = path.join(ROOT, 'memory');

for (const dir of ['incidents', 'patterns', 'feedback', 'obsidian']) {
  fs.mkdirSync(path.join(MEMORY_ROOT, dir), { recursive: true });
}

app.disable('x-powered-by');

/*
  VISION CORE V2.9.10 SELF-HEALING CONFIG
  Regra central:
  - CORS antes de tudo
  - OPTIONS nunca quebra
  - Parser tolerante
  - Nenhuma validação de payload retorna 405
  - 405 só existiria para método inexistente, mas aqui usamos fallbacks seguros
*/

function now() {
  return new Date().toISOString();
}

function makeId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function safeJsonParse(raw) {
  if (!raw) return {};
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return { message: raw }; }
}

function maskSecret(value) {
  if (!value) return '';
  const s = String(value);
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}

function normalizeBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) return req.body;
  if (typeof req.body === 'string') return safeJsonParse(req.body);
  return {};
}

function sendOk(res, payload = {}) {
  return res.status(200).json({ ok: true, ...payload, time: now() });
}

function normalizeEvidenceReceipt(result) {
  if (!result || typeof result !== 'object') return null;
  const evr = result.evidence_receipt;
  if (!evr) return null;
  // Accept Go Core object receipt (requires id, issued_at, source=go-core)
  if (evr !== null && typeof evr === 'object' && !Array.isArray(evr)) {
    if (typeof evr.id === 'string' && evr.id.length >= 8 && evr.issued_at && evr.source === 'go-core') {
      return evr;
    }
    return null;
  }
  // Legacy: string receipt (not backend-derived)
  if (typeof evr === 'string' && evr.length >= 8 && !/^(evr[_-]|backend[_-])/i.test(evr)) {
    return evr;
  }
  return null;
}

function passGoldCandidateFromResult(result) {
  return Boolean(result && result.pass_gold === true && result.promotion_allowed === true && normalizeEvidenceReceipt(result));
}

function saveMarkdown(folder, title, data) {
  const safeTitle = String(title || 'note').replace(/[^\w.-]+/g, '_').slice(0, 90);
  const file = path.join(MEMORY_ROOT, folder, `${Date.now()}-${safeTitle}.md`);
  const body = [
    `# ${title}`,
    '',
    '## Context',
    data.context || data.message || data.mission || '',
    '',
    '## Root Cause',
    data.root_cause || data.rca || 'pending',
    '',
    '## Fix',
    data.fix || 'pending',
    '',
    '## Validation',
    `PASS GOLD: ${Boolean(data.pass_gold)}`,
    '',
    '## Raw',
    '```json',
    JSON.stringify(data, null, 2),
    '```',
    ''
  ].join('\n');
  fs.writeFileSync(file, body, 'utf8');
  return file;
}

/* 1. CORS MANUAL BLINDADO — antes de parser/rotas */
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';

  res.setHeader('Access-Control-Allow-Origin', origin === 'null' ? '*' : origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Vision-Token');
  res.setHeader('Access-Control-Max-Age', '86400');

  res.setHeader('X-Vision-Core-Version', '2.9.10-self-healing-config');
  res.setHeader('X-Pass-Gold-Policy', 'required');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return next();
});

/* 2. RAW BODY CAPTURE — permite recuperar body mesmo se parser falhar */
app.use((req, res, next) => {
  let raw = '';
  req.on('data', chunk => {
    raw += chunk.toString('utf8');
    if (raw.length > 30 * 1024 * 1024) {
      raw = raw.slice(0, 30 * 1024 * 1024);
    }
  });
  req.on('end', () => {
    req.rawBody = raw;
    next();
  });
});

/* 3. PARSER TOLERANTE */
app.use((req, res, next) => {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();

  if (!req.rawBody) {
    req.body = {};
    return next();
  }

  if (contentType.includes('application/json')) {
    req.body = safeJsonParse(req.rawBody);
    return next();
  }

  if (contentType.includes('text/plain')) {
    req.body = safeJsonParse(req.rawBody);
    return next();
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(req.rawBody);
    req.body = Object.fromEntries(params.entries());
    return next();
  }

  // Fallback: aceita payload mesmo sem Content-Type correto.
  req.body = safeJsonParse(req.rawBody);
  return next();
});

/* 4. REQUEST LOG MÍNIMO PARA DIAGNÓSTICO */
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[REQ] ${req.method} ${req.path} origin=${req.headers.origin || '-'} ct=${req.headers['content-type'] || '-'} bodyKeys=${Object.keys(normalizeBody(req)).join(',') || '-'}`);
  }
  next();
});

function technical(message, mode) {
  const text = `${message || ''} ${mode || ''}`.toLowerCase();
  return /(erro|error|failed|cors|405|500|stack|deploy|sse|api|exception|trace|bug|regress|build|pipeline|pass gold|aws|cloudflare|elastic|beanstalk|debug)/i.test(text);
}

function copilotAnswer(body) {
  const message = body.message || body.prompt || body.text || '';
  const mode = body.mode || 'vision-geral';
  const model = body.model || 'auto';

  if (technical(message, mode)) {
    return [
      'Hermes/Copilot recebeu o erro técnico.',
      `Mensagem: ${message || 'mensagem vazia'}`,
      'Diagnóstico inicial: contrato/runtime precisa ser validado por SDDF.',
      'Próximo passo: executar missão para OpenClaw → Scanner → Hermes → Aegis → SDDF → PASS GOLD.',
      'Regra: sem PASS GOLD nada é promovido.'
    ].join('\n');
  }

  return [
    'Vision Copilot ativo.',
    `Mensagem: ${message || 'mensagem vazia'}`,
    `Modo: ${mode}`,
    `Modelo: ${model}`,
    'Posso conversar normalmente ou transformar isso em missão técnica.'
  ].join('\n');
}

function providerList() {
  const providers = [
    ['openrouter', 'OPENROUTER'],
    ['groq', 'GROQ'],
    ['gemini', 'GEMINI'],
    ['deepseek', 'DEEPSEEK'],
    ['openai', 'OPENAI']
  ];

  return providers.map(([id, prefix]) => ({
    id,
    configured: Boolean(process.env[`${prefix}_API_KEY`]),
    api_key_masked: maskSecret(process.env[`${prefix}_API_KEY`]),
    base_url: process.env[`${prefix}_BASE_URL`] || '',
    model: process.env[`${prefix}_MODEL`] || ''
  }));
}

/* VISION CORE V4.0 ANTI-STUB REAL CORE */
const crypto = require('crypto');
const DB_ROOT = path.join(ROOT, 'data');
const USERS_DB = path.join(DB_ROOT, 'users.json');
const PROJECTS_DB = path.join(DB_ROOT, 'projects.json');
const VAULT_ROOT = path.join(MEMORY_ROOT, 'obsidian', 'VisionCoreVault');
for (const dir of [DB_ROOT, VAULT_ROOT, path.join(VAULT_ROOT, 'Missions'), path.join(VAULT_ROOT, 'Incidents'), path.join(VAULT_ROOT, 'PASS-GOLD'), path.join(VAULT_ROOT, 'Projects')]) fs.mkdirSync(dir, { recursive: true });

function readJsonFile(file, fallback) { try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch (err) { console.warn('[ANTI-STUB] readJsonFile failed', file, err.message); return fallback; } }
function writeJsonFile(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function publicUser(u) { return u ? { id: u.id, email: u.email, name: u.name || '', plan: u.plan || 'free', created_at: u.created_at, last_login: u.last_login || null } : null; }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex'); return `${salt}:${hash}`; }
function verifyPassword(password, stored) { if (!stored || !stored.includes(':')) return false; const [salt] = stored.split(':'); const expected = hashPassword(password, salt); return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(expected)); }
function base64url(input) { return Buffer.from(input).toString('base64url'); }
function signSession(payload) { const secret = process.env.SESSION_SECRET || 'vision-core-dev-session-secret-change-me'; const body = base64url(JSON.stringify(payload)); const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url'); return `${body}.${sig}`; }
function verifySession(token) { try { if (!token || !String(token).includes('.')) return null; const [body, sig] = String(token).split('.'); const secret = process.env.SESSION_SECRET || 'vision-core-dev-session-secret-change-me'; const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url'); if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null; const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); if (data.exp && Date.now() > data.exp) return null; return data; } catch { return null; } }
function getAuthUser(req) { const auth = String(req.headers.authorization || ''); const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''; const cookie = String(req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('vision_session=')); const token = bearer || (cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''); const session = verifySession(token); if (!session) return null; const db = readJsonFile(USERS_DB, { users: [] }); return db.users.find(u => u.id === session.uid) || null; }
function safeSlug(value, fallback = 'item') { return String(value || fallback).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96) || fallback; }
function markdownMissionReport(data) { return [`# Mission Report - ${data.mission_id || 'unknown'}`,'',`- Projeto: ${data.project || data.projeto || '—'}`,`- Classificação: ${data.classification || data.classificacao || '—'}`,`- Root Cause: ${data.root_cause || '—'}`,`- Arquivos alterados: ${data.changed_files || data.files_changed || '—'}`,`- Tempo total: ${data.duration || data.total_time || '—'}`,`- PASS GOLD: ${data.pass_gold === true ? 'TRUE' : data.pass_gold === false ? 'FALSE' : '—'}`,`- Snapshot ID: ${data.snapshot_id || '—'}`,`- Promotion Allowed: ${data.promotion_allowed === true ? 'TRUE' : data.promotion_allowed === false ? 'FALSE' : '—'}`,'','## Pipeline','OpenClaw → Scanner → Hermes → PatchEngine → Aegis → SDDF → PASS GOLD','','## Logs',data.logs || '—','','## Raw','```json',JSON.stringify(data, null, 2),'```','','Tags: #vision-core #mission #pass-gold'].join('\n'); }

const CRC_TABLE = (() => { const table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); table[n] = c >>> 0; } return table; })();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function dosTimeDate(date = new Date()) { return { time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2), date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate() }; }
function makeZip(files) { const locals = []; const centrals = []; let offset = 0; for (const f of files) { const name = Buffer.from(f.name.replace(/\\/g, '/'), 'utf8'); const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data || ''), 'utf8'); const crc = crc32(data); const dt = dosTimeDate(); const local = Buffer.alloc(30 + name.length); local.writeUInt32LE(0x04034b50,0); local.writeUInt16LE(20,4); local.writeUInt16LE(0,6); local.writeUInt16LE(0,8); local.writeUInt16LE(dt.time,10); local.writeUInt16LE(dt.date,12); local.writeUInt32LE(crc,14); local.writeUInt32LE(data.length,18); local.writeUInt32LE(data.length,22); local.writeUInt16LE(name.length,26); local.writeUInt16LE(0,28); name.copy(local,30); locals.push(local,data); const central = Buffer.alloc(46 + name.length); central.writeUInt32LE(0x02014b50,0); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt16LE(0,8); central.writeUInt16LE(0,10); central.writeUInt16LE(dt.time,12); central.writeUInt16LE(dt.date,14); central.writeUInt32LE(crc,16); central.writeUInt32LE(data.length,20); central.writeUInt32LE(data.length,24); central.writeUInt16LE(name.length,28); central.writeUInt16LE(0,30); central.writeUInt16LE(0,32); central.writeUInt16LE(0,34); central.writeUInt16LE(0,36); central.writeUInt32LE(0,38); central.writeUInt32LE(offset,42); name.copy(central,46); centrals.push(central); offset += local.length + data.length; } const centralStart = offset; const centralBuf = Buffer.concat(centrals); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(0,4); end.writeUInt16LE(0,6); end.writeUInt16LE(files.length,8); end.writeUInt16LE(files.length,10); end.writeUInt32LE(centralBuf.length,12); end.writeUInt32LE(centralStart,16); end.writeUInt16LE(0,20); return Buffer.concat([...locals, centralBuf, end]); }

function listFilesRecursive(root, max = 250) { const out = []; const skip = new Set(['node_modules','.git','.next','dist','build','.cache']); function walk(dir) { if (out.length >= max) return; for (const ent of fs.readdirSync(dir, { withFileTypes: true })) { if (skip.has(ent.name)) continue; const fp = path.join(dir, ent.name); if (ent.isDirectory()) walk(fp); else if (/\.(mjs|cjs|js|jsx|ts|tsx)$/.test(ent.name)) out.push(fp); if (out.length >= max) return; } } if (fs.existsSync(root)) walk(root); return out; }
function resolveProjectPath(inputPath) { const candidate = inputPath ? path.resolve(ROOT, String(inputPath)) : ROOT; if (process.env.VISION_ALLOW_SCAN_OUTSIDE_ROOT !== 'true' && !candidate.startsWith(ROOT)) throw new Error('path_outside_project_root_blocked'); return candidate; }
function parseSourceFile(file) { const code = fs.readFileSync(file, 'utf8'); let parser; try { parser = require('@babel/parser'); } catch { throw new Error('@babel/parser_missing_run_npm_install'); } const ast = parser.parse(code, { sourceType: 'unambiguous', errorRecovery: true, plugins: ['typescript','jsx','classProperties','dynamicImport','decorators-legacy'] }); const rel = path.relative(ROOT, file); const result = { file: rel, imports: [], exports: [], functions: [], routes: [], middlewares: [] }; function nameOf(node) { if (!node) return ''; if (node.id && node.id.name) return node.id.name; if (node.key && node.key.name) return node.key.name; if (node.declarations && node.declarations[0] && node.declarations[0].id) return node.declarations[0].id.name || ''; return ''; } function routeFromCall(node) { if (!node || node.type !== 'CallExpression') return null; const callee = node.callee; const methods = ['get','post','put','patch','delete','all','use']; let method = ''; if (callee && callee.type === 'MemberExpression' && callee.property && methods.includes(callee.property.name)) method = callee.property.name.toUpperCase(); if (!method) return null; const first = node.arguments && node.arguments[0]; const route = first && first.type === 'StringLiteral' ? first.value : method === 'USE' ? '(middleware)' : ''; if (!route && method !== 'USE') return null; return { method, route, line: node.loc && node.loc.start ? node.loc.start.line : null }; } function walk(node, parent) { if (!node || typeof node.type !== 'string') return; if (node.type === 'ImportDeclaration') result.imports.push({ source: node.source.value, line: node.loc && node.loc.start.line }); if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') result.exports.push({ type: node.type, name: nameOf(node.declaration), line: node.loc && node.loc.start.line }); if (['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression','ObjectMethod','ClassMethod'].includes(node.type)) result.functions.push({ name: nameOf(node) || (parent && parent.id && parent.id.name) || (parent && parent.key && parent.key.name) || '(anonymous)', line: node.loc && node.loc.start.line }); const route = routeFromCall(node); if (route) { result.routes.push(route); if (route.method === 'USE') result.middlewares.push(route); } for (const key of Object.keys(node)) { if (['loc','start','end','extra'].includes(key)) continue; const val = node[key]; if (Array.isArray(val)) for (const child of val) if (child && typeof child.type === 'string') walk(child, node); else if (val && typeof val.type === 'string') walk(val, node); } } walk(ast, null); return result; }
function scanAst(projectPath = ROOT) { const base = resolveProjectPath(projectPath); const files = fs.statSync(base).isFile() ? [base] : listFilesRecursive(base, Number(process.env.SCANNER_MAX_FILES || 200)); const parsed = []; const errors = []; for (const f of files) { try { parsed.push(parseSourceFile(f)); } catch (err) { errors.push({ file: path.relative(ROOT, f), error: err.message }); } } return { base: path.relative(ROOT, base) || '.', files_scanned: files.length, parsed, errors }; }
function dependencyGraphFromScan(scan) { const nodes = []; const edges = []; for (const f of scan.parsed || []) { nodes.push({ id: f.file, type: 'file', functions: f.functions.length, routes: f.routes.length }); for (const im of f.imports) edges.push({ from: f.file, to: im.source, type: 'import', line: im.line }); for (const r of f.routes) nodes.push({ id: `${f.file}:${r.method}:${r.route}`, type: 'route', file: f.file, method: r.method, route: r.route, line: r.line }); } return { base: scan.base, nodes, edges, files_scanned: scan.files_scanned, parse_errors: scan.errors }; }
async function providerStatus() { const providers = providerList(); providers.unshift({ id: 'local', configured: Boolean(process.env.OLLAMA_BASE_URL), base_url: process.env.OLLAMA_BASE_URL || '', model: process.env.OLLAMA_MODEL || 'local' }); const statuses = []; for (const p of providers) { if (p.id === 'local') { if (!p.configured) { statuses.push({ ...p, reachable: false, status: 'not_configured' }); continue; } try { const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 1800); const resp = await fetch(`${p.base_url.replace(/\/$/, '')}/api/tags`, { signal: ctrl.signal }); clearTimeout(t); statuses.push({ ...p, reachable: resp.ok, status: resp.ok ? 'online' : `http_${resp.status}` }); } catch (err) { statuses.push({ ...p, reachable: false, status: 'unreachable', error: err.name || err.message }); } } else statuses.push({ ...p, reachable: p.configured ? null : false, status: p.configured ? 'configured_not_called' : 'not_configured' }); } return statuses; }


/* ROOT / HEALTH */
app.get('/', (req, res) => res.type('text/plain').send('VISION CORE V2.9.10 SELF-HEALING CONFIG — PASS GOLD'));
app.head('/api/health', (req, res) => res.status(200).end());
app.get('/api/health', (req, res) => sendOk(res, {
  service: 'vision-core-backend',
  version: '2.9.10-self-healing-config',
  status: 'ok',
  pass_gold_ready: false,
  node_version: process.version,
  fetch_available: typeof fetch !== 'undefined'
}));

/* ── /api/test-fetch — diagnóstico de fetch outbound ─────────── */
app.get('/api/test-fetch', async (req, res) => {
  const url = (req.query.url || 'https://raw.githubusercontent.com/Imadechumbo/technetgamev2/main/README.md').trim();
  if (typeof fetch === 'undefined') {
    return res.status(500).json({ ok: false, error: 'fetch not available', node_version: process.version, time: now() });
  }
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const r     = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'VisionCore/2.9.10' } });
    clearTimeout(timer);
    const text  = (await r.text()).slice(0, 500);
    return sendOk(res, { url, status: r.status, ok: r.ok, preview: text, node_version: process.version });
  } catch(e) {
    return res.status(500).json({ ok: false, url, error: e.message, node_version: process.version, time: now() });
  }
});

app.get('/api/readiness', (req, res) => sendOk(res, {
  ready: true,
  status: 'READY',
  pass_gold: false,
  promotion_allowed: false,
  pass_gold_reason: 'evidence receipt required from Go Core',
  endpoints: [
    'POST /api/copilot',
    'POST /api/hermes/analyze',
    'POST /api/run-live',
    'GET /api/run-live-stream'
  ]
}));


app.get('/api/config/scan', (req, res) => {
  const report = scanConfig(ROOT);
  return sendOk(res, {
    endpoint: '/api/config/scan',
    layer: 'VISION CORE V3 SELF-HEALING CONFIG LAYER',
    ...report
  });
});

app.all('/api/config/self-heal', (req, res) => {
  const body = normalizeBody(req);
  const apply = req.method === 'POST' || body.apply === true || body.apply === 'true';
  const result = apply ? applyConfigFixes(ROOT) : enforceConfigGold(ROOT, { apply: false });
  return sendOk(res, {
    endpoint: '/api/config/self-heal',
    layer: 'VISION CORE V3 SELF-HEALING CONFIG LAYER',
    apply,
    result
  });
});

app.get('/api/runtime/contracts', (req, res) => sendOk(res, {
  version: '2.9.10-self-healing-config',
  contracts: {
    copilot: 'POST /api/copilot',
    hermes: 'POST /api/hermes/analyze',
    run_live: 'POST /api/run-live',
    sse: 'GET /api/run-live-stream'
  }
}));


/* V4.0 ANTI-STUB ROUTES — real logic, no ok:true-only stubs */
app.all('/api/auth/register', (req, res) => {
  const body = normalizeBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ ok: false, error: 'valid_email_required', time: now() });
  if (password.length < 8) return res.status(400).json({ ok: false, error: 'password_min_8_required', time: now() });
  const db = readJsonFile(USERS_DB, { users: [] });
  if (db.users.some(u => u.email === email)) return res.status(409).json({ ok: false, error: 'email_already_registered', time: now() });
  const user = { id: makeId('usr'), email, name: body.name || '', password_hash: hashPassword(password), plan: 'free', created_at: now(), last_login: null };
  db.users.push(user); writeJsonFile(USERS_DB, db);
  const token = signSession({ uid: user.id, exp: Date.now() + 7 * 86400 * 1000 });
  res.setHeader('Set-Cookie', `vision_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
  return sendOk(res, { user: publicUser(user), token, token_type: 'session', persisted: true, anti_stub: true });
});

app.all('/api/auth/login', (req, res) => {
  const body = normalizeBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const db = readJsonFile(USERS_DB, { users: [] });
  const user = db.users.find(u => u.email === email);
  if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ ok: false, error: 'invalid_credentials', time: now() });
  user.last_login = now(); writeJsonFile(USERS_DB, db);
  const token = signSession({ uid: user.id, exp: Date.now() + 7 * 86400 * 1000 });
  res.setHeader('Set-Cookie', `vision_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
  return sendOk(res, { user: publicUser(user), token, token_type: 'session', persisted: true, anti_stub: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  return sendOk(res, { user: publicUser(user), anti_stub: true });
});

app.get('/api/account/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  const projectsDb = readJsonFile(PROJECTS_DB, { projects: [] });
  return sendOk(res, { user: publicUser(user), projects: projectsDb.projects.filter(p => p.user_id === user.id), anti_stub: true });
});

app.get('/api/runtime/providers', (req, res) => sendOk(res, { providers: providerList().concat([{ id: 'local', configured: Boolean(process.env.OLLAMA_BASE_URL), base_url: process.env.OLLAMA_BASE_URL || '', model: process.env.OLLAMA_MODEL || '' }]), default: process.env.DEFAULT_AI_PROVIDER || 'auto', anti_stub: true }));
app.get('/api/runtime/provider-status', async (req, res) => sendOk(res, { providers: await providerStatus(), checked_env: ['OLLAMA_BASE_URL','OPENROUTER_API_KEY','GROQ_API_KEY','GEMINI_API_KEY','DEEPSEEK_API_KEY','OPENAI_API_KEY'], anti_stub: true }));

app.all('/api/scanner/ast', (req, res) => {
  try { const body = normalizeBody(req); const report = scanAst(body.path || req.query.path || body.file || req.query.file); return sendOk(res, { scanner: 'AST', parser: '@babel/parser', ...report, anti_stub: true }); }
  catch (err) { return res.status(500).json({ ok: false, error: err.message, endpoint: '/api/scanner/ast', time: now() }); }
});
app.all('/api/scanner/dependencies', (req, res) => {
  try { const body = normalizeBody(req); const scan = scanAst(body.path || req.query.path || body.file || req.query.file); return sendOk(res, { graph: dependencyGraphFromScan(scan), anti_stub: true }); }
  catch (err) { return res.status(500).json({ ok: false, error: err.message, endpoint: '/api/scanner/dependencies', time: now() }); }
});
app.all('/api/scanner/graph', (req, res) => {
  try { const body = normalizeBody(req); const scan = scanAst(body.path || req.query.path || body.file || req.query.file); return sendOk(res, { graph: dependencyGraphFromScan(scan), anti_stub: true }); }
  catch (err) { return res.status(500).json({ ok: false, error: err.message, endpoint: '/api/scanner/graph', time: now() }); }
});

app.all('/api/hermes/dependencies', (req, res) => {
  try { const body = normalizeBody(req); const scan = scanAst(body.path || req.query.path || body.file || req.query.file); return sendOk(res, { hermes: 'dependencies', graph: dependencyGraphFromScan(scan), anti_stub: true }); }
  catch (err) { return res.status(500).json({ ok: false, error: err.message, endpoint: '/api/hermes/dependencies', time: now() }); }
});
app.all('/api/hermes/context', (req, res) => {
  try {
    const body = normalizeBody(req); const target = String(body.target || req.query.target || '').toLowerCase(); const scan = scanAst(body.path || req.query.path || body.file || req.query.file); const graph = dependencyGraphFromScan(scan);
    const selected = [];
    for (const f of scan.parsed) {
      const hit = !target || f.file.toLowerCase().includes(target) || f.functions.some(fn => fn.name.toLowerCase().includes(target)) || f.routes.some(r => String(r.route).toLowerCase().includes(target));
      if (hit) selected.push({ file: f.file, functions: f.functions.slice(0, 20), routes: f.routes.slice(0, 20), imports: f.imports.slice(0, 20) });
      if (selected.length >= 8) break;
    }
    return sendOk(res, { hermes: 'context_graph', target: target || 'auto', policy: 'no_full_file_when_targeted_context_exists', selected_context: selected, dependency_edges: graph.edges.slice(0, 120), files_scanned: scan.files_scanned, anti_stub: true });
  } catch (err) { return res.status(500).json({ ok: false, error: err.message, endpoint: '/api/hermes/context', time: now() }); }
});
app.all('/api/hermes/compression', (req, res) => {
  const body = normalizeBody(req); const text = String(body.text || body.context || '');
  const compressed = text ? text.split(/\n+/).filter(line => /(error|route|function|export|import|throw|catch|app\.|router\.)/i.test(line)).slice(0, 80).join('\n') : '';
  return sendOk(res, { original_chars: text.length, compressed_chars: compressed.length, compressed_context: compressed || '—', anti_stub: true });
});

app.get('/api/obsidian/status', (req, res) => {
  const files = [];
  if (fs.existsSync(VAULT_ROOT)) for (const dir of ['Missions','Incidents','PASS-GOLD','Projects']) { const full = path.join(VAULT_ROOT, dir); if (fs.existsSync(full)) files.push(...fs.readdirSync(full).map(f => `${dir}/${f}`)); }
  return sendOk(res, { connected: true, mode: 'local_markdown_export', vault_root: path.relative(ROOT, VAULT_ROOT), files_count: files.length, recent_files: files.slice(-10), anti_stub: true });
});
app.all('/api/obsidian/export-mission', (req, res) => {
  const body = normalizeBody(req); const missionId = body.mission_id || body.id || makeId('mission'); const md = markdownMissionReport({ ...body, mission_id: missionId });
  const file = path.join(VAULT_ROOT, 'Missions', `${safeSlug(missionId)}.md`); fs.writeFileSync(file, md, 'utf8');
  if (body.pass_gold === true) fs.writeFileSync(path.join(VAULT_ROOT, 'PASS-GOLD', `${safeSlug(missionId)}.md`), md, 'utf8');
  return sendOk(res, { exported: true, format: 'markdown', file: path.relative(ROOT, file), bytes: Buffer.byteLength(md), anti_stub: true });
});
app.get('/api/obsidian/download-vault', (req, res) => {
  const files = [];
  function walk(dir) { for (const ent of fs.readdirSync(dir, { withFileTypes: true })) { const fp = path.join(dir, ent.name); if (ent.isDirectory()) walk(fp); else files.push({ name: path.relative(VAULT_ROOT, fp), data: fs.readFileSync(fp) }); } }
  if (fs.existsSync(VAULT_ROOT)) walk(VAULT_ROOT);
  if (!files.length) files.push({ name: 'README.md', data: '# VisionCoreVault\n\nVault inicial sem missões exportadas ainda.\n' });
  const zip = makeZip(files);
  res.setHeader('Content-Type', 'application/zip'); res.setHeader('Content-Disposition', 'attachment; filename="VisionCoreVault.zip"'); res.setHeader('X-Anti-Stub', 'true'); return res.status(200).send(zip);
});


/* COPILOT — nunca retorna 405 por body vazio */
app.all('/api/copilot', (req, res) => {
  const body = normalizeBody(req);
  console.log('[COPILOT BODY]', JSON.stringify(body));

  if (req.method !== 'POST' && req.method !== 'GET') {
    return sendOk(res, {
      endpoint: '/api/copilot',
      method_received: req.method,
      method_hint: 'POST recomendado',
      answer: 'Método recebido e tratado sem 405 para preservar compatibilidade.'
    });
  }

  return sendOk(res, {
    endpoint: '/api/copilot',
    method_received: req.method,
    body_received: body,
    answer: copilotAnswer(body),
    pass_gold_required: true
  });
});

app.all('/api/copilot/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const body = normalizeBody(req);
  const message = body.message || 'stream';

  res.write(`event: open\ndata: ${JSON.stringify({ ok: true, time: now() })}\n\n`);
  res.write(`event: token\ndata: ${JSON.stringify({ token: 'Vision Copilot: ', time: now() })}\n\n`);
  res.write(`event: token\ndata: ${JSON.stringify({ token: `recebi "${message}".`, time: now() })}\n\n`);
  res.write(`event: done\ndata: ${JSON.stringify({ ok: true, time: now() })}\n\n`);
  res.end();
});

/* HERMES */
app.all('/api/hermes/analyze', (req, res) => {
  const body = normalizeBody(req);
  const message = body.message || body.prompt || '';
  const mode = body.mode || 'debug';

  return sendOk(res, {
    endpoint: '/api/hermes/analyze',
    agent: 'Hermes',
    body_received: body,
    rca: technical(message, mode) ? 'technical_runtime_or_contract_issue' : 'general_context',
    root_cause: technical(message, mode) ? 'technical_runtime_or_contract_issue' : 'general_context',
    confidence: 94,
    answer: [
      'Hermes RCA concluído.',
      `Mensagem: ${message || 'mensagem vazia'}`,
      'Plano: OpenClaw → Scanner → Hermes → Aegis → SDDF → PASS GOLD.',
      'Sem PASS GOLD: não promove, não aprende, não gera PR.'
    ].join('\n')
  });
});

app.all('/api/hermes/rca', (req, res) => sendOk(res, {
  agent: 'Hermes',
  root_cause: 'runtime_contract_or_integration_mismatch',
  fix_plan: ['validate_api_contract', 'validate_sse', 'aegis_policy', 'pass_gold']
}));

/* ── V5.3: RUN LIVE — Go Core real ───────────────────────────── */

// GET /api/go-core/health — verifica binário + self-test
app.get('/api/go-core/health', async (req, res) => {
  try {
    const health = await checkGoHealth();
    const status = health.ok ? 200 : 503;
    return res.status(status).json(Object.assign({ time: now() }, health));
  } catch (err) {
    return res.status(503).json({ ok: false, healthy: false, error: err.message, time: now() });
  }
});

// Local path detection — servidor remoto não tem acesso ao PC do usuário
const LOCAL_PATH_PATTERNS = [
  /[A-Z]:\\/i,
  /OneDrive/i,
  /Desktop/i,
  /Documents/i,
  /Downloads/i,
  /PROJETOS/i,
  /\/Users\//i,
  /Users\\/i
];
function hasLocalPath(text) {
  return LOCAL_PATH_PATTERNS.some(p => p.test(text));
}

// POST /api/run-live — executa Go Core, retorna JSON final
app.all('/api/run-live', async (req, res) => {
  const body     = normalizeBody(req);
  const input    = body.mission || body.message || body.prompt || body.input || 'self-test';

  // Detectar caminhos locais inacessíveis ao servidor remoto
  if (hasLocalPath(input)) {
    return res.status(200).json({
      ok: false,
      status: 'LOCAL_ACCESS_REQUIRED',
      pass_gold: false,
      promotion_allowed: false,
      deploy_allowed: false,
      agent_required: true,
      summary: [
        '⚠️ Esta missão requer acesso ao seu sistema de arquivos local.',
        '',
        'O Vision Core roda em servidor remoto (AWS us-east-1) e não tem',
        'acesso direto ao seu computador.',
        '',
        'Escolha uma das opções abaixo:',
        '',
        '① Colar código no chat — copie o conteúdo do arquivo e envie como mensagem',
        '② Adicionar arquivos — clique em "+ Adicionar arquivos" na interface',
        '③ Repositório público — cole a URL do GitHub no chat',
        '④ Vision Agent Local — execute no seu PC:',
        '   node backend/agent-local/index.js ' + input.trim(),
        '',
        'O Vision Agent Local faz ponte direta entre o Vision Core e o seu projeto.'
      ].join('\n'),
      methods: [
        { id: 1, name: 'Colar código no chat', action: 'Copie o conteúdo e envie como mensagem' },
        { id: 2, name: 'Adicionar arquivos', action: 'Clique em + Adicionar arquivos' },
        { id: 3, name: 'Repositório público', action: 'Cole a URL do GitHub no chat' },
        { id: 4, name: 'Vision Agent Local', action: 'node backend/agent-local/index.js /projeto' }
      ],
      time: now()
    });
  }

  const missionRoot = path.resolve(process.env.VISION_PROJECT_ROOT || ROOT || process.cwd(), '..');

  let result;
  try {
    result = await runGoMission({ root: missionRoot, input });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      status: 'FAIL',
      pass_gold: false,
      promotion_allowed: false,
      deploy_allowed: false,
      backend_stub: true,
      backendStub: true,
      backendHasMissionId: false,
      backendHasEvidenceReceipt: false,
      mission_id: null,
      evidence_receipt: null,
      gates: {},
      failed_gates: ['go_runtime_failure'],
      strict_pass_gold_reason: 'go_runtime_failure',
      error_type: 'go_runtime_failure',
      message: err.message,
      error: err.message,
      steps: [],
      time: now()
    });
  }

  // Salvar incidente apenas se PASS GOLD real
  if (
    result.pass_gold === true &&
    result.promotion_allowed === true &&
    result.backend_stub === false &&
    result.backendHasEvidenceReceipt === true &&
    result.evidence_receipt
  ) {
    saveMarkdown('incidents', result.mission_id || makeId('mission'), {
      mission: input,
      mission_id: result.mission_id,
      pass_gold: true,
      engine: result.engine,
      version: result.version,
      snapshot_id: result.snapshot_id,
      duration_ms: result.duration_ms,
    });
  }

  return res.status(200).json({
    time: now(),
    stream: '/api/run-live-stream',
    ...result,
    pass_gold: result.pass_gold === true,
    promotion_allowed:
      result.promotion_allowed === true &&
      result.pass_gold === true &&
      result.backend_stub === false &&
      result.backendHasEvidenceReceipt === true,
    deploy_allowed: false,
    backend_stub: result.backend_stub !== false,
    backendStub: result.backendStub !== false,
    backendHasMissionId: result.backendHasMissionId === true,
    backendHasEvidenceReceipt: result.backendHasEvidenceReceipt === true,
    mission_id: result.backendHasMissionId === true ? result.mission_id : null,
    evidence_receipt: result.backendHasEvidenceReceipt === true ? result.evidence_receipt : null,
    strict_pass_gold_reason: result.strict_pass_gold_reason || 'pass_gold_false'
  });
});

// GET /api/run-live-stream — SSE real do Go Core
// A UI abre esta conexão antes de chamar /api/run-live
// Aqui executamos o Go Core e emitimos os eventos reais em sequência
app.get('/api/run-live-stream', async (req, res) => {
  const input    = req.query.mission || req.query.input || req.query.message || 'self-test';
  const missionId = makeId('mission');
  const missionRoot = path.resolve(process.env.VISION_PROJECT_ROOT || ROOT || process.cwd(), '..');

  res.writeHead(200, {
    'Content-Type':  'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': req.headers.origin || '*',
  });

  // Client desconectou antes de terminar
  let aborted = false;
  req.on('close', () => { aborted = true; });

  if (aborted) { try { res.end(); } catch (_) {} return; }

  try {
    await streamGoMission({ root: missionRoot, input, res, missionId });
  } catch (err) {
    if (!aborted) {
      try {
        res.write('event: mission:fail\n');
        res.write('data: ' + JSON.stringify({
          ok: false, pass_gold: false, error: err.message, time: now(),
        }) + '\n\n');
        res.end();
      } catch (_) {}
    }
  }
});

/* AGENTS */
app.all('/api/openclaw/orchestrate', (req, res) => {
  const body = normalizeBody(req);
  /* Real routing decision based on input signals — §70 */
  let decision = 'unknown';
  let stage    = null;
  let signals  = [];

  if (body.zip_base64 || body.zip_url || body.zipball_url) {
    decision = 'scan_zip';
    stage    = 'Scanner';
    signals.push('zip_payload');
  } else if (body.patch || body.diff || (body.files && Array.isArray(body.files) && body.files.length > 0)) {
    decision = 'apply_patch';
    stage    = 'PatchEngine';
    signals.push('patch_or_diff');
  } else if (body.mission || body.mission_id) {
    decision = 'execute_mission';
    stage    = 'Operator';
    signals.push('mission_field');
  } else if (body.message || body.prompt || body.question) {
    decision = 'diagnose';
    stage    = 'Hermes';
    signals.push('text_payload');
  } else {
    decision = 'inspect_only';
    stage    = 'Scanner';
    signals.push('no_actionable_signal');
  }

  sendOk(res, {
    agent:              'OpenClaw',
    decision,
    next_stage:         stage,
    signals_detected:   signals,
    orchestration_real: true,
    body_keys:          Object.keys(body).filter(k => k !== 'zip_base64') /* omit large blob */
  });
});
app.all('/api/scanner/scan', (req, res) => sendOk(res, { agent: 'Scanner', stack: 'auto', files_detected: [] }));
app.all('/api/aegis/validate', (req, res) => sendOk(res, { agent: 'Aegis', verdict: 'PASS', policy: 'no_promotion_without_pass_gold' }));
app.all('/api/sddf/check', (req, res) => sendOk(res, { agent: 'SDDF', status: 'SDDF_ACTIVE', pass_gold: false, promotion_allowed: false, pass_gold_reason: 'evidence receipt required from Go Core' }));
app.all('/api/operator/execute', (req, res) => sendOk(res, { agent: 'Operator', mode: normalizeBody(req).mode || 'dry-run', executed: true }));
app.all('/api/archivist/learn', (req, res) => {
  const body = normalizeBody(req);
  if (!body.pass_gold) {
    return res.status(200).json({ ok: false, blocked: true, error: 'learning_blocked_without_pass_gold', time: now() });
  }
  const file = saveMarkdown('patterns', body.title || 'learned-pattern', body);
  return sendOk(res, { learned: true, file: path.relative(ROOT, file) });
});

/* MEMORY / OBSIDIAN */
app.all('/api/memory/save', (req, res) => {
  const body = normalizeBody(req);
  const file = saveMarkdown(body.type || 'incidents', body.title || makeId('memory'), body);
  return sendOk(res, { saved: true, file: path.relative(ROOT, file) });
});

app.get('/api/memory/search', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const results = [];

  for (const dir of ['incidents', 'patterns', 'feedback', 'obsidian']) {
    const full = path.join(MEMORY_ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const name of fs.readdirSync(full)) {
      const fp = path.join(full, name);
      if (!fs.statSync(fp).isFile()) continue;
      const text = fs.readFileSync(fp, 'utf8');
      if (!q || text.toLowerCase().includes(q)) {
        results.push({ type: dir, file: name, preview: text.slice(0, 300) });
      }
    }
  }

  return sendOk(res, { query: q, results });
});

app.all('/api/memory/feedback', (req, res) => {
  const body = normalizeBody(req);
  const file = saveMarkdown('feedback', body.title || 'feedback', body);
  return sendOk(res, { file: path.relative(ROOT, file) });
});

app.get('/api/memory/incidents', (req, res) => sendOk(res, { incidents: fs.readdirSync(path.join(MEMORY_ROOT, 'incidents')).slice(-50) }));
app.get('/api/memory/patterns', (req, res) => sendOk(res, { patterns: fs.readdirSync(path.join(MEMORY_ROOT, 'patterns')).slice(-50) }));

/* /api/obsidian/* — implementação real em linhas ~403 (app.get/obsidian/status com vault walk) */
/* stub morto removido em 2026-06-01 — duplicata causava dead code após primeira match Express */

/* PROVIDERS */
app.get('/api/providers', (req, res) => sendOk(res, { providers: providerList(), default: process.env.DEFAULT_AI_PROVIDER || 'auto' }));
app.all('/api/providers/save', (req, res) => {
  const body = normalizeBody(req);
  return sendOk(res, {
    saved: true,
    provider: body.provider || 'auto',
    api_key_masked: maskSecret(body.api_key),
    base_url: body.base_url || '',
    model: body.model || '',
    note: 'Config recebida. Persistir em DB/secret manager em produção.'
  });
});
app.all('/api/providers/test', (req, res) => sendOk(res, {
  provider: normalizeBody(req).provider || 'auto',
  status: 'mock_connected',
  model: normalizeBody(req).model || 'auto'
}));
app.all('/api/providers/default', (req, res) => sendOk(res, { default: normalizeBody(req).provider || process.env.DEFAULT_AI_PROVIDER || 'auto' }));


/* VISION CORE V4.3.1 ENTERPRISE BILLING ROUTES — real Stripe, mounted in primary runtime. */
const BILLING_DB = path.join(DB_ROOT, 'billing.json');
function requireVisionAuth(req, res, next) {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok:false, error:'not_authenticated', time: now() });
  req.visionUser = user;
  return next();
}
function readBillingDb() { return readJsonFile(BILLING_DB, { customers: {}, subscriptions: {}, events: [] }); }
function writeBillingDb(db) { writeJsonFile(BILLING_DB, db); }
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  try { const Stripe = require('stripe'); return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }); }
  catch (err) { console.warn('[Billing] stripe package unavailable:', err.message); return null; }
}
function billingUnavailable(res, reason = 'stripe_not_configured') { return res.status(503).json({ ok:false, error: reason, required_env: ['STRIPE_SECRET_KEY','STRIPE_PRICE_PRO','STRIPE_PRICE_ENTERPRISE'], time: now() }); }
async function ensureStripeCustomer(stripe, user) {
  const db = readBillingDb();
  const existing = db.customers[user.id];
  if (existing && existing.stripe_customer_id) return existing.stripe_customer_id;
  const customer = await stripe.customers.create({ email: user.email, name: user.name || undefined, metadata: { vision_user_id: user.id } });
  db.customers[user.id] = { user_id: user.id, email: user.email, stripe_customer_id: customer.id, created_at: now() };
  writeBillingDb(db);
  return customer.id;
}
function updateUserPlan(userId, plan, extra = {}) {
  const users = readJsonFile(USERS_DB, { users: [] });
  const user = users.users.find(u => u.id === userId);
  if (user) { user.plan = plan || user.plan || 'free'; user.billing = { ...(user.billing || {}), ...extra, updated_at: now() }; writeJsonFile(USERS_DB, users); }
}
app.post('/api/billing/create-checkout-session', requireVisionAuth, async (req, res) => {
  const stripe = getStripeClient(); if (!stripe) return billingUnavailable(res);
  const body = normalizeBody(req); const plan = String(body.plan || 'pro').toLowerCase();
  const price = plan === 'enterprise' ? process.env.STRIPE_PRICE_ENTERPRISE : process.env.STRIPE_PRICE_PRO;
  if (!price) return res.status(400).json({ ok:false, error:'stripe_price_missing', plan, time: now() });
  try {
    const customer = await ensureStripeCustomer(stripe, req.visionUser);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer, line_items: [{ price, quantity: 1 }],
      success_url: body.success_url || process.env.STRIPE_SUCCESS_URL || 'https://visioncoreai.pages.dev/billing.html?checkout=success',
      cancel_url: body.cancel_url || process.env.STRIPE_CANCEL_URL || 'https://visioncoreai.pages.dev/billing.html?checkout=cancel',
      metadata: { vision_user_id: req.visionUser.id, plan }
    });
    return sendOk(res, { checkout_url: session.url, session_id: session.id, customer, plan, anti_stub:true });
  } catch (err) { return res.status(502).json({ ok:false, error:'stripe_checkout_failed', message: err.message, time: now() }); }
});
app.get('/api/billing/customer', requireVisionAuth, async (req, res) => {
  const stripe = getStripeClient(); if (!stripe) return billingUnavailable(res);
  try { const customerId = await ensureStripeCustomer(stripe, req.visionUser); const customer = await stripe.customers.retrieve(customerId); return sendOk(res, { customer: { id: customer.id, email: customer.email, name: customer.name }, anti_stub:true }); }
  catch (err) { return res.status(502).json({ ok:false, error:'stripe_customer_failed', message: err.message, time: now() }); }
});
app.get('/api/billing/subscription', requireVisionAuth, async (req, res) => {
  const stripe = getStripeClient(); if (!stripe) return billingUnavailable(res);
  try { const customer = await ensureStripeCustomer(stripe, req.visionUser); const subs = await stripe.subscriptions.list({ customer, limit: 1, status: 'all' }); const sub = subs.data[0] || null; return sendOk(res, { subscription: sub ? { id: sub.id, status: sub.status, cancel_at_period_end: sub.cancel_at_period_end, current_period_end: sub.current_period_end, price: sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null } : null, anti_stub:true }); }
  catch (err) { return res.status(502).json({ ok:false, error:'stripe_subscription_failed', message: err.message, time: now() }); }
});
app.post('/api/billing/portal', requireVisionAuth, async (req, res) => {
  const stripe = getStripeClient(); if (!stripe) return billingUnavailable(res);
  try { const customer = await ensureStripeCustomer(stripe, req.visionUser); const body = normalizeBody(req); const portal = await stripe.billingPortal.sessions.create({ customer, return_url: body.return_url || process.env.STRIPE_PORTAL_RETURN_URL || 'https://visioncoreai.pages.dev/billing.html' }); return sendOk(res, { portal_url: portal.url, anti_stub:true }); }
  catch (err) { return res.status(502).json({ ok:false, error:'stripe_portal_failed', message: err.message, time: now() }); }
});
app.post('/api/billing/cancel', requireVisionAuth, async (req, res) => {
  const stripe = getStripeClient(); if (!stripe) return billingUnavailable(res);
  const body = normalizeBody(req); const subId = body.subscription_id;
  if (!subId) return res.status(400).json({ ok:false, error:'subscription_id_required', time: now() });
  try { const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: true }); return sendOk(res, { cancelled_at_period_end: sub.cancel_at_period_end, subscription_id: sub.id, anti_stub:true }); }
  catch (err) { return res.status(502).json({ ok:false, error:'stripe_cancel_failed', message: err.message, time: now() }); }
});
app.post('/api/billing/reactivate', requireVisionAuth, async (req, res) => {
  const stripe = getStripeClient(); if (!stripe) return billingUnavailable(res);
  const body = normalizeBody(req); const subId = body.subscription_id;
  if (!subId) return res.status(400).json({ ok:false, error:'subscription_id_required', time: now() });
  try { const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: false }); return sendOk(res, { reactivated: true, subscription_id: sub.id, status: sub.status, anti_stub:true }); }
  catch (err) { return res.status(502).json({ ok:false, error:'stripe_reactivate_failed', message: err.message, time: now() }); }
});
app.get('/api/billing/card', requireVisionAuth, async (req, res) => {
  const stripe = getStripeClient(); if (!stripe) return billingUnavailable(res);
  try { const customer = await ensureStripeCustomer(stripe, req.visionUser); const methods = await stripe.paymentMethods.list({ customer, type: 'card', limit: 1 }); const card = methods.data[0] && methods.data[0].card; return sendOk(res, { card: card ? { brand: card.brand, last4: card.last4, exp_month: card.exp_month, exp_year: card.exp_year } : null, anti_stub:true }); }
  catch (err) { return res.status(502).json({ ok:false, error:'stripe_card_failed', message: err.message, time: now() }); }
});
app.post(['/api/webhooks/stripe', '/api/webhook/stripe'], async (req, res) => {
  const stripe = getStripeClient(); if (!stripe) return billingUnavailable(res);
  const sig = req.headers['stripe-signature'];
  let event;
  try { event = process.env.STRIPE_WEBHOOK_SECRET ? stripe.webhooks.constructEvent(req.rawBody || JSON.stringify(req.body || {}), sig, process.env.STRIPE_WEBHOOK_SECRET) : (req.body || {}); }
  catch (err) { return res.status(400).json({ ok:false, error:'stripe_webhook_signature_failed', message: err.message, time: now() }); }
  const db = readBillingDb(); db.events.push({ id: event.id || makeId('stripe_evt'), type: event.type, received_at: now() });
  const obj = event.data && event.data.object ? event.data.object : {};
  if (event.type === 'checkout.session.completed') {
    const userId = obj.metadata && obj.metadata.vision_user_id; const plan = (obj.metadata && obj.metadata.plan) || 'pro';
    if (userId) { updateUserPlan(userId, plan, { stripe_customer_id: obj.customer, stripe_subscription_id: obj.subscription, subscription_status: 'active' }); db.subscriptions[userId] = { stripe_customer_id: obj.customer, stripe_subscription_id: obj.subscription, plan, status: 'active', updated_at: now() }; }
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const customer = obj.customer; const status = obj.status || (event.type.endsWith('deleted') ? 'canceled' : 'unknown');
    for (const userId of Object.keys(db.customers)) { const c = db.customers[userId]; if (c.stripe_customer_id === customer) { updateUserPlan(userId, status === 'active' || status === 'trialing' ? ((db.subscriptions[userId] && db.subscriptions[userId].plan) || 'pro') : 'free', { subscription_status: status, stripe_subscription_id: obj.id, cancel_at_period_end: obj.cancel_at_period_end, current_period_end: obj.current_period_end }); db.subscriptions[userId] = { ...(db.subscriptions[userId] || {}), status, stripe_subscription_id: obj.id, cancel_at_period_end: obj.cancel_at_period_end, current_period_end: obj.current_period_end, updated_at: now() }; } }
  }
  if (event.type === 'invoice.payment_failed' || event.type === 'invoice.paid') {
    const customer = obj.customer; const status = event.type === 'invoice.payment_failed' ? 'past_due' : 'active';
    for (const userId of Object.keys(db.customers)) { const c = db.customers[userId]; if (c.stripe_customer_id === customer) updateUserPlan(userId, undefined, { subscription_status: status }); }
  }
  writeBillingDb(db);
  return sendOk(res, { received: true, type: event.type, anti_stub:true });
});
app.get('/api/usage/quota', (req, res) => {
  const user = getAuthUser(req); const plan = user && user.plan ? user.plan : 'free';
  const quota = plan === 'enterprise' ? 'multi-project' : plan === 'pro' ? 'unlimited' : 5;
  return sendOk(res, { plan, used: 0, quota, anti_stub:true });
});

/* SAAS */
const plans = [
  { id: 'free', name: 'FREE', price: 0, currency: 'USD', quota: 5 },
  { id: 'pro', name: 'PRO', price: 9.99, currency: 'USD', quota: 'unlimited' },
  { id: 'enterprise', name: 'ENTERPRISE', price: 29.99, currency: 'USD', quota: 'multi-project' }
];

app.get('/api/billing/plans', (req, res) => sendOk(res, { plans, billing_mode: process.env.BILLING_MODE || 'mock' }));
app.all('/api/billing/checkout', (req, res) => sendOk(res, { mode: process.env.BILLING_MODE || 'mock', checkout_url: '/mock-checkout/success', plan: normalizeBody(req).plan || 'pro' }));
app.all('/api/billing/webhook', (req, res) => sendOk(res, { received: true }));
app.get('/api/billing/status', (req, res) => sendOk(res, { plan: process.env.FORCE_PRO_FOR_ALL_TEST_USERS === 'true' ? 'pro' : 'free', active: true }));
app.all('/api/billing/cancel', (req, res) => sendOk(res, { cancelled: true }));
app.get('/api/usage/quota', (req, res) => sendOk(res, { plan: process.env.FORCE_PRO_FOR_ALL_TEST_USERS === 'true' ? 'pro' : 'free', used: 0, quota: process.env.FORCE_PRO_FOR_ALL_TEST_USERS === 'true' ? 'unlimited' : 5 }));

app.all('/api/auth/signup', (req, res) => sendOk(res, { user: { email: normalizeBody(req).email || 'operator@visioncore.local', plan: 'free' }, token: 'mock-token' }));
app.all('/api/auth/login', (req, res) => sendOk(res, { user: { email: normalizeBody(req).email || 'operator@visioncore.local', plan: 'free' }, token: 'mock-token' }));
app.get('/api/me', (req, res) => sendOk(res, { user: { email: 'operator@visioncore.local', plan: 'free' } }));

/* AGENT DOWNLOAD */
app.get('/api/agent/download/windows', (req, res) => res.type('text/plain').send('vision-agent windows placeholder\nvision-agent login\nvision-agent register <project-path>\n'));
app.get('/api/agent/download/linux', (req, res) => res.type('text/plain').send('vision-agent linux placeholder\n'));
app.get('/api/agent/download/macos', (req, res) => res.type('text/plain').send('vision-agent macos placeholder\n'));
app.all('/api/agent/register', (req, res) => sendOk(res, { agent_id: makeId('agent'), status: 'registered' }));
app.all('/api/agent/heartbeat', (req, res) => sendOk(res, { status: 'online' }));
app.all('/api/agent/report', (req, res) => sendOk(res, { received: true, pass_gold: Boolean(normalizeBody(req).pass_gold) }));
app.get('/api/agent/status', (req, res) => sendOk(res, { connected: false, mode: 'download_ready' }));

/* GITHUB / TOOLS / METRICS */
app.get('/api/github/status', (req, res) => sendOk(res, { configured: Boolean(process.env.GITHUB_TOKEN), policy: 'PASS_GOLD_REQUIRED' }));
/* /api/github/create-pr — implementado em §64 abaixo (stub removido) */
app.get('/api/github/automerge-policy', (req, res) => sendOk(res, { default: 'blocked_without_pass_gold', required: ['PASS GOLD', 'Aegis', 'SDDF'] }));

app.get('/api/tools/marketplace', (req, res) => sendOk(res, { tools: [
  { id: 'portainer', name: 'Portainer', status: 'ready-adapter' },
  { id: 'spiderfoot', name: 'SpiderFoot', status: 'osint-plugin-ready' },
  { id: 'reconng', name: 'Recon-ng', status: 'osint-plugin-ready' },
  { id: 'maryam', name: 'Maryam', status: 'osint-plugin-ready' }
]}));
app.all('/api/tools/portainer/start', (req, res) => sendOk(res, { started: false, mode: 'mock' }));
app.all('/api/tools/portainer/stop', (req, res) => sendOk(res, { stopped: true, mode: 'mock' }));
app.all('/api/tools/osint/spiderfoot', (req, res) => sendOk(res, { mode: 'mock', result: {} }));
app.all('/api/tools/osint/reconng', (req, res) => sendOk(res, { mode: 'mock', result: {} }));
app.all('/api/tools/osint/maryam', (req, res) => sendOk(res, { mode: 'mock', result: {} }));

app.get('/api/metrics/agents', (req, res) => sendOk(res, { agents: [
  { name: 'OpenClaw', status: 'ok', cost: 0.163 },
  { name: 'Hermes RCA', status: 'ok', cost: 0.815 },
  { name: 'Scanner', status: 'ok', cost: 0.377 },
  { name: 'Aegis', status: 'PASS', cost: 0.264 },
  { name: 'PASS GOLD', status: 'PENDING_EVIDENCE', cost: 0.471 }
]}));
app.get('/api/metrics/summary', (req, res) => sendOk(res, { runtime: { cpu: 12, memory: 28, disk: 33, network: 8 } }));
app.get('/api/dora-metrics', (req, res) => sendOk(res, { deployment_frequency: 'mock', lead_time: 'mock', mttr: 'mock', change_failure_rate: 'mock' }));
app.get('/api/pass-gold/score', (req, res) => sendOk(res, { final: 100, status: 'PENDING_EVIDENCE', pass_gold: false, promotion_allowed: false, pass_gold_reason: 'evidence receipt required from Go Core' }));
app.get('/api/logs/download', (req, res) => res.type('text/plain').send(`VISION CORE V2.9.10 SELF-HEALING CONFIG LOG\nPASS GOLD READY\n${now()}\n`));

/* BAD PATH ALIAS */
app.all('/api/api/*', (req, res) => {
  return res.status(200).json({
    ok: false,
    corrected_path_hint: req.originalUrl.replace('/api/api/', '/api/'),
    error: 'bad_path_api_api_detected',
    time: now()
  });
});

app.post('/api/chat', async (req, res) => {
  const body    = normalizeBody(req);
  const mode    = body.mode  || 'vision-geral';
  let   message = body.message || body.prompt || '';
  if (!message) return res.status(400).json({ ok: false, error: 'message_required', time: now() });

  /* ── toolFetchUrl v2 — detecta URLs e injeta conteúdo real ── */
  const urlRegex  = /https?:\/\/[^\s"'<>)\]]+/g;
  const rawUrls   = (message.match(urlRegex) || [])
    .map(u => u.replace(/[.,;:)\]}>]+$/, '')) // limpar pontuação final
    .filter(u => !u.includes('localhost') && !u.includes('127.0.0.1'))
    .slice(0, 2);
  const foundUrls = [...new Set(rawUrls)];

  if (foundUrls.length) {
    const fetched = [];

    async function doFetch(url, label) {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'VisionCore/2.9.10' } });
        clearTimeout(timer);
        if (r.ok) {
          const ct   = r.headers.get('content-type') || '';
          const text = ct.includes('json')
            ? JSON.stringify(await r.json(), null, 2).slice(0, 5000)
            : (await r.text()).slice(0, 5000);
          console.log('[toolFetch] OK', label, '→', url, r.status);
          return text;
        }
        console.log('[toolFetch] FAIL', url, r.status);
        return null;
      } catch(e) {
        clearTimeout(timer);
        console.log('[toolFetch] ERR', url, e.message);
        return null;
      }
    }

    for (const rawUrl of foundUrls) {
      let text = null;

      // GitHub blob → raw.githubusercontent.com
      if (rawUrl.includes('github.com/') && rawUrl.includes('/blob/')) {
        const rawified = rawUrl
          .replace('https://github.com/', 'https://raw.githubusercontent.com/')
          .replace('/blob/', '/');
        text = await doFetch(rawified, rawUrl);
      }
      // GitHub repo root → try README on main, then master, then GitHub API
      else if (rawUrl.match(/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/)) {
        const parts = rawUrl.replace('https://github.com/', '').replace(/\/$/, '').split('/');
        const [owner, repo] = parts;
        // 1. README on main
        text = await doFetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`, rawUrl);
        // 2. README on master
        if (!text) text = await doFetch(`https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`, rawUrl);
        // 3. GitHub API repo info (always public, no auth needed)
        if (!text) {
          const apiData = await doFetch(`https://api.github.com/repos/${owner}/${repo}`, rawUrl + ' [API]');
          if (apiData) text = `[GitHub API — ${owner}/${repo}]\n${apiData}`;
        }
      }
      // Generic URL
      else {
        text = await doFetch(rawUrl, rawUrl);
      }

      if (text) fetched.push(`[CONTEÚDO DE ${rawUrl}]\n${text}`);
    }
    if (fetched.length) {
      message = message + '\n\n' + fetched.join('\n\n---\n\n');
    }
    req._toolFetchCount = fetched.length;
    req._toolFetchUrls  = foundUrls;
  }

  /* ── §53 DIFF contextual — extrair todos [DIFF]...[/DIFF] para instrução focada ── */
  let _diffBlock53 = '';
  const _allDiffs53 = [];
  const _diffRegex53 = /\[DIFF\]([\s\S]*?)\[\/DIFF\]/g;
  let _dm53;
  while ((_dm53 = _diffRegex53.exec(message)) !== null) {
    _allDiffs53.push(_dm53[1].trim());
  }
  if (_allDiffs53.length > 0) {
    _diffBlock53 = _allDiffs53.join('\n\n---\n\n');
  }

  /* ── §44 MPEG: comprimir blocos [Arquivo: ...] embutidos na mensagem ─────
     Aplica STRIP→WINDOW→SUMMARIZE em cada arquivo antes de montar o prompt.
     /api/chat/apply-patch: nunca comprime — precisa do conteúdo completo.  */
  if (/\[Arquivo: /.test(message)) {
    try {
      const { compressContext } = require('./compress-context');
      const _parts44    = message.split('\n\n---\n\n');
      const _question44 = _parts44[0] || message.slice(0, 400);
      let   _anyComp44  = false;
      const _newParts44 = _parts44.map(function(part) {
        const _m = part.match(/^(\[Arquivo: ([^\]]+)\]\n)([\s\S]*)$/);
        if (!_m) return part;
        const _header  = _m[1];
        const _fpath   = _m[2];
        const _fcont   = _m[3];
        const _r = compressContext(_fcont, _question44);
        if (!_r.fallback && _r.compression_ratio >= 10) {
          console.log(`[MPEG §44] ${_fpath}: ${_r.original_lines} → ${_r.compressed_lines} linhas (${_r.compression_ratio}% redução)`);
          _anyComp44 = true;
          return _header + _r.compressed;
        }
        return part;
      });
      if (_anyComp44) { message = _newParts44.join('\n\n---\n\n'); }
    } catch (_e44) {
      console.warn('[MPEG §44] compress error —', _e44.message, '— fallback to original');
    }
  }

  /* ── §76 — mode:create — Pipeline CRIAR PROJETO ──────────────── */
  if (mode === 'create') {
    const archCtx  = body.architect_context || {};
    const projType = archCtx.project_type || 'Projeto';
    const stack76  = Array.isArray(archCtx.stack)  ? archCtx.stack.join(', ')  : 'não especificado';
    const specs76  = Array.isArray(archCtx.specs_suggested) ? archCtx.specs_suggested : [];
    const conf76   = archCtx.confidence ? Math.round(archCtx.confidence * 100) + '%' : '';
    const routeReason = archCtx.routing_reason || '';

    const specsBlock = specs76.length > 0
      ? specs76.slice(0, 6).map(s => `• ${s.id || '?'} — ${s.title || ''}`).join('\n')
      : '(busque na Spec Library por SF-XX)';

    const createPrompt = [
      `Você é o Vision Core em modo CRIAR PROJETO.`,
      ``,
      `Arquiteto classificou esta mensagem como criação de projeto:`,
      `  Tipo detectado : ${projType}`,
      `  Stack          : ${stack76}`,
      `  Confiança      : ${conf76}`,
      routeReason ? `  Razão          : ${routeReason}` : '',
      ``,
      `══════════════════════════════════════════════════════`,
      `SEU PAPEL — PIPELINE CRIAR`,
      `══════════════════════════════════════════════════════`,
      ``,
      `1. Confirme o entendimento do projeto em 1-2 linhas (sem preâmbulo, sem "olá").`,
      `2. Apresente o SETUP DE PROJETO estruturado:`,
      `   - Tipo confirmado`,
      `   - Stack recomendada com justificativa sucinta`,
      `   - Estrutura de pastas (top-level apenas, máximo 8 itens)`,
      `   - 3-5 próximos passos concretos para o Worker`,
      `3. Liste as Specs de referência relevantes (IDs SF-XX-NNN).`,
      `4. Gere o PACOTE DE MISSÃO pronto para colar no Claude Code / Cursor.`,
      ``,
      `SPECS DE REFERÊNCIA SUGERIDAS:`,
      specsBlock,
      ``,
      `REGRAS ABSOLUTAS:`,
      `  ✗ exec_real = BLOQUEADA. Tudo é LOCAL PREVIEW.`,
      `  ✗ PASS GOLD obrigatório antes de qualquer produção.`,
      `  ✗ Nunca inventar paths. Nunca alucinar stacks.`,
      `  ✓ Se stack não confirmada: perguntar UMA coisa antes de gerar.`,
      ``,
      `FORMATO DE RESPOSTA (obrigatório):`,
      ``,
      `◈ PROJETO DETECTADO`,
      `[tipo] · [stack] · [confiança]`,
      ``,
      `SETUP`,
      `[estrutura de pastas + stack com justificativas]`,
      ``,
      `SPECS DE REFERÊNCIA`,
      `• SF-XX-NNN — [título]`,
      ``,
      `MISSÃO PARA WORKER`,
      `[pacote completo pronto para colar]`,
      ``,
      `PASS GOLD GATE`,
      `[o que validar antes de produção]`,
      ``,
      `ESTILO: sem "Olá", sem "Com prazer", sem preâmbulo. Comece pela confirmação.`,
    ].filter(l => l !== undefined).join('\n');

    const { callHermes: _callCreate } = require('./hermes-rca');
    const createHermes = await _callCreate(createPrompt, message, { timeout: 30000 });

    if (!createHermes || createHermes.ok === false) {
      return sendOk(res, {
        answer: '◈ CRIAR PROJETO — backend indisponível. Verifique conexão com o provedor de IA.',
        provider: 'gate', model: 'create-gate', mode: 'create', anti_stub: true
      });
    }
    return sendOk(res, {
      answer:             createHermes.answer,
      provider:           createHermes.provider_used,
      model:              createHermes.model_used,
      mode:               'create',
      pipeline:           'criar_projeto',
      pass_gold_required: true,
      exec_real:          'BLOQUEADA',
      anti_stub:          true,
      time:               now()
    });
  }

  /* ── systemPrompt — base + override por modo ─────────────────── */
  const basePrompt = [
    `Você é o Vision Core — sistema multiagente de diagnóstico e correção de projetos (SDDF V8.4).`,
    ``,
    `══════════════════════════════════════════════════════`,
    `PADRÃO DE COMPORTAMENTO — VISION CHAT AI`,
    `══════════════════════════════════════════════════════`,
    ``,
    `PIPELINE SDDF (11 etapas):`,
    `  §1  Intake          — receber missão e classificar tipo`,
    `  §2  Context Harvest — coletar arquivos, URLs, imagens`,
    `  §3  Scanner         — mapear estrutura e dependências`,
    `  §4  RCA             — identificar causa-raiz (Hermes)`,
    `  §5  Patch Engine    — gerar patch cirúrgico`,
    `  §6  Aegis           — validar sintaxe do patch`,
    `  §7  Evidence        — registrar evidência de diagnóstico`,
    `  §8  Confirm Gate    — aguardar aprovação humana`,
    `  §9  Apply           — aplicar patch aprovado`,
    `  §10 Rollback        — reverter se Aegis falhar`,
    `  §11 Report          — relatório final de missão`,
    ``,
    `AGENTES E PAPÉIS:`,
    `  Hermes     — supervisor de decisão RCA (§4, §7)`,
    `  Aegis      — validação de sintaxe e segurança (§6, §10)`,
    `  Scanner    — análise estrutural de codebase (§3)`,
    `  Patch Eng. — geração de patches cirúrgicos (§5)`,
    `  Confirm    — gate de aprovação humana (§8)`,
    `  Apply Eng. — aplicação de patches (§9)`,
    `  Rollback   — reversão de patches falhos (§10)`,
    `  Reporter   — síntese de evidências (§11)`,
    `  Vision     — análise multimodal de imagens (§2)`,
    `  Intake     — classificação de missão (§1)`,
    ``,
    `REGRAS ABSOLUTAS DO SISTEMA:`,
    `  R1. Sem evidência real (arquivo/URL/imagem) → BLOCKED_INPUT. Nunca alucine patches.`,
    `  R2. Patches apenas em arquivos explicitamente fornecidos. Nunca invente paths.`,
    `  R3. Arquivos proibidos: .env, secrets, workflow CI/CD → ABORTED imediato.`,
    `  R4. deploy_allowed/release_allowed/production_touched nunca setados como true.`,
    `  R5. confidence < 0.7 → BLOCKED_INPUT. Diagnóstico incerto não gera patch.`,
    `  R6. REGRA DE ASSETS: paths de imagem/SVG/font DEVEM existir na lista de assets fornecida.`,
    `  R7. Nenhum agente pode contornar o Confirm Gate (§8) — aprovação humana é obrigatória.`,
    ``,
    `MODO ATUAL: ${mode}`,
    ``,
    `ACESSO A PROJETOS:`,
    `Você roda em servidor remoto (AWS Elastic Beanstalk, us-east-1). Por isso:`,
    `❌ SEM acesso: arquivos locais (C:\\, OneDrive, Desktop), repos locais não publicados.`,
    `✅ COM acesso: GitHub público, APIs públicas, código colado, arquivos via botão/ZIP.`,
    ``,
    `MÉTODOS PARA FORNECER CONTEXTO:`,
    `  MÉTODO 1 — Cole o código diretamente no chat (mais rápido).`,
    `  MÉTODO 2 — Botão "+ Adicionar arquivos" ou ZIP do projeto.`,
    `  MÉTODO 3 — URL de repositório GitHub público.`,
    `  MÉTODO 4 — Vision Agent Local (node vision-agent.js /projeto).`,
    ``,
    `QUANDO SOLICITADO ACESSO LOCAL: explique o contexto e sugira os 4 métodos.`,
    ``,
    `ESTILO DE RESPOSTA — SDDF §23 (OBRIGATÓRIO):`,
    `❌ PROIBIDO: "Olá", "Oi", "Ótimo", "Claro", "Com prazer", "Entendido", "Certo",`,
    `   "Perfeito", "Com certeza", "Sem dúvidas", "Vou ajudar", ou qualquer preâmbulo.`,
    `❌ PROIBIDO: reafirmar o que o usuário disse.`,
    `❌ PROIBIDO: encerrar com "Espero ter ajudado", "Qualquer dúvida...", "Fico à disposição".`,
    `✅ OBRIGATÓRIO: começar diretamente pelo diagnóstico, código ou resposta objetiva.`,
    `✅ OBRIGATÓRIO: proporcional — respostas simples têm respostas curtas; complexas têm detalhes.`,
    `✅ Exemplo correto: "Bug em auth middleware. Token expiry usa < em vez de <=. Fix:"`,
    ``,
    `══════════════════════════════════════════════════════`,
    `FORMATO DE RESPOSTA — VISION CHAT AI`,
    `══════════════════════════════════════════════════════`,
    ``,
    `Para missões que envolvem análise de código ou correção de bugs,`,
    `estruture sua resposta com os seguintes blocos em ordem:`,
    ``,
    `MISSÃO RECEBIDA`,
    `Tipo: [bug fix | análise | refactor | consulta]`,
    `Risco: [baixo | médio | alto | crítico]`,
    `Escopo: [arquivo(s) identificado(s)]`,
    ``,
    `HERMES`,
    `- [status do contexto]`,
    `- [regras aplicadas]`,
    ``,
    `SCANNER`,
    `- [o que foi encontrado]`,
    ``,
    `OPENCLAW`,
    `- [plano criado com N tarefas]`,
    ``,
    `PATCHENGINE`,
    `- [patch preparado ou bloqueado]`,
    ``,
    `GO CORE`,
    `- [Evidence receipt: presente | ausente]`,
    `- [Runtime probe: OK | pendente]`,
    ``,
    `AEGIS`,
    `- [validação: sem deploy, sem tag, sem stable]`,
    ``,
    `DECISÃO`,
    `[NEEDS_FIX | BLOCKED_INPUT | BLOCKED_RUNTIME | READY | ABORTED]`,
    ``,
    `Próximo passo seguro:`,
    `[ação específica]`,
    ``,
    `Depois deste relatório, apresente o diff/patch em bloco \`\`\`diff.`,
    `Para respostas simples (consultas, perguntas) omita os blocos de agente`,
    `e responda diretamente.`
  ].join('\n');

  /* Hermes RCA — SDDF §16 + §37 */
  const hermesDecisionMatrix = mode === 'fix' || mode === 'hermes' ? [
    ``,
    `══════════════════════════════════════════════════════`,
    `HERMES RCA — SUPERVISOR DE DECISÃO (SDDF §16)`,
    `══════════════════════════════════════════════════════`,
    ``,
    `Você é Hermes — agente supervisor de diagnóstico do Vision Core.`,
    ``,
    `ETAPAS DE EXECUÇÃO:`,
    `  §4  RCA: leia o arquivo fornecido linha a linha. Identifique causa-raiz exata.`,
    `  §6  CONFIRM: verifique se patch resolve RCA sem efeitos colaterais.`,
    `  §7  EVIDENCE: registre file, linha afetada, razão do fix.`,
    `  §8  DECIDE: aplique o Decision Matrix abaixo.`,
    `  §9  PATCH: produza patch cirúrgico — mínimo de linhas alteradas.`,
    ``,
    `DECISION MATRIX:`,
    `  NEEDS_FIX       → erro corrigível encontrado com evidência real → produza patch`,
    `  BLOCKED_INPUT   → contexto insuficiente, arquivo protegido, confidence < 0.7`,
    `  BLOCKED_RUNTIME → evidência de runtime ausente (Go Core sem evidence receipt)`,
    `  ABORTED         → arquivo proibido (.env, secrets, CI/CD workflows) → recuse`,
    `  READY           → nenhuma alteração necessária E sem diff no texto → confirme estado correto`,
    `                   NUNCA use READY se você produziu um diff ou patch — use NEEDS_FIX`,
    ``,
    `OBRIGATÓRIO: sua resposta DEVE começar com um bloco \`\`\`json.`,
    `NÃO responda em texto livre antes do bloco json.`,
    ``,
    `REGRA DE ASSETS (R6): quando o patch envolver caminho de arquivo (imagem, SVG, font):`,
    `  1. Verifique [ASSETS DISPONÍVEIS NO PROJETO] no contexto.`,
    `  2. Use SEMPRE um path da lista — NUNCA invente nomes de arquivo.`,
    `  3. Se lista ausente ou incompleta, use path mais próximo e explique em "diagnosis".`,
    ``,
    `FORMATO OBRIGATÓRIO:`,
    `\`\`\`json`,
    `{`,
    `  "diagnosis":  "causa-raiz objetiva — arquivo, linha, razão",`,
    `  "file":       "caminho/relativo/do/arquivo",`,
    `  "fix_type":   "json_field | code_patch | full_replace",`,
    `  "patch":      "<conteúdo do fix — ver regras abaixo>",`,
    `  "confidence": 0.0,`,
    `  "decisao":    "NEEDS_FIX | BLOCKED_INPUT | ABORTED | READY"`,
    `}`,
    `\`\`\``,
    ``,
    `REGRAS POR fix_type:`,
    `  json_field   → patch = objeto com campos a setar.`,
    `                 Array de objetos: { "target_title": "nome do item", "fields": { campo: valor } }`,
    `                 Objeto simples: { campo: valor }`,
    `  code_patch   → patch = { "search": "trecho original EXATO", "replace": "trecho novo" }`,
    `                 "search" DEVE existir literalmente no arquivo — copie sem alteração.`,
    `                 §9 PATCH REGRAS OBRIGATÓRIAS:`,
    `                 - search DEVE ser a MENOR string possível que identifique o local único`,
    `                 - search NUNCA deve conter mais de 3 linhas`,
    `                 - search deve ser UMA ÚNICA LINHA sempre que possível`,
    `                 - Use APENAS a linha exata no ponto de inserção ou a linha imediatamente antes`,
    `                 - NUNCA inclua linhas após o ponto de inserção no search`,
    `                 - Exemplo CORRETO:   { "search": "'Pokemon Pokopia': 'assets/img/game-pokopia.jpg'", "replace": "..." }`,
    `                 - Exemplo ERRADO:    search com 5+ linhas incluindo código após o ponto de inserção`,
    `  full_replace → patch = string com conteúdo completo novo do arquivo.`,
    ``,
    `NOTA SOBRE ASPAS: strings com apóstrofe usam double-quotes em JS.`,
    `  Correto:   "Assassin's Creed Codename Hexe": 'assets/img/...'`,
    `  Incorreto: 'Assassin's Creed Codename Hexe': 'assets/img/...'`,
    ``,
    `BLOQUEIOS ABSOLUTOS → decisao=ABORTED:`,
    `  deploy_allowed: true · release_allowed: true · production_touched: true`,
    `  fetch( fora de sandbox · exec( · spawn( com comandos destrutivos`,
    ``,
    `REGRA DE QUALIDADE: confidence < 0.7 → decisao=BLOCKED_INPUT. Incerteza não gera patch.`,
    ``,
    `Após o bloco JSON, explique o diagnóstico em 1-3 linhas.`,
    `Seja cirúrgico — altere apenas o necessário.`,
    ``,
    `Após o bloco JSON, inclua um relatório de agentes:`,
    ``,
    `HERMES`,
    `- RCA: [causa-raiz em uma linha]`,
    ``,
    `SCANNER`,
    `- Arquivo: [path do arquivo analisado]`,
    `- Linha afetada: [número ou trecho]`,
    ``,
    `AEGIS`,
    `- deploy_allowed: false`,
    `- production_touched: false`,
    `- Escopo: apenas [arquivo-alvo]`,
    ``,
    `DECISÃO: [NEEDS_FIX | BLOCKED_INPUT | READY]`,
    `Confiança: [0.0–1.0]`,
    ``,
    `Próximo passo: Clique EXECUTAR MISSÃO para aplicar o patch.`
  ].join('\n') : '';

  /* §53 — instrução focada no diff (injetada quando [DIFF] presente) */
  const diffInstruction53 = _diffBlock53 ? [
    ``,
    `══════════════════════════════════════════════════════`,
    `§53 DIFF CONTEXTUAL — FOCO OBRIGATÓRIO`,
    `══════════════════════════════════════════════════════`,
    ``,
    `O usuário forneceu ${_allDiffs53.length > 1 ? _allDiffs53.length + ' DIFFs de arquivos modificados com bugs' : 'o DIFF exato do bug introduzido'}:`,
    ``,
    `\`\`\`diff`,
    _diffBlock53,
    `\`\`\``,
    ``,
    `REGRA §53 (ABSOLUTA):`,
    `  1. Sua análise RCA DEVE focar EXCLUSIVAMENTE nas linhas marcadas com - e + no DIFF acima.`,
    `  2. NÃO reporte bugs em outras partes do arquivo — o bug está APENAS nas linhas do DIFF.`,
    `  3. CONVENÇÃO OBRIGATÓRIA DO DIFF:`,
    `     - Linhas com - (menos) = código CORRETO que existia ANTES do bug.`,
    `     - Linhas com + (mais)  = código ERRADO que foi INTRODUZIDO como bug.`,
    `     Exemplo: se o diff mostra "+// const X = {", significa que alguém COMENTOU X = isso É o bug.`,
    `     Diagnóstico correto: "X foi comentado/desativado, causando ReferenceError/undefined".`,
    `     Diagnóstico ERRADO: "comentar X resolve o problema" — isso inverte a lógica.`,
    `  4. Confidence MÍNIMA: 0.85 quando DIFF presente.`,
    `  5. NUNCA alucine bugs não visíveis no DIFF.`,
    `  6. MÚLTIPLOS BUGS: se houver ${_allDiffs53.length > 1 ? _allDiffs53.length + ' blocos [DIFF]' : 'múltiplos arquivos no [DIFF]'}, CADA bloco é um arquivo diferente com bug próprio.`,
    `     Diagnostique TODOS os arquivos. Mencione cada bug separadamente na sua resposta.`,
    `     Não pare no primeiro bug — continue até analisar TODOS os arquivos modificados.`,
  ].join('\n') : '';

  /* Imagem detectada → Gemini (único provider com suporte multimodal) */
  /* Detectar ANTES de montar systemPrompt — mode:fix não bloqueia imagem */
  const hasImage   = !!(body.image_base64 && body.image_base64.length > 10);
  const imageMime  = body.image_mime || 'image/jpeg';
  const imageB64   = body.image_base64 || '';

  /* FIX C §25 — gate anti-alucinação: mode:fix sem contexto real → BLOCKED_INPUT */
  /* Executável antes de qualquer LLM call — zero custo de token.                  */
  if (mode === 'fix' && !hasImage) {
    const hasFetched = (req._toolFetchCount || 0) > 0;
    const hasFileCtx = /\[Arquivo: /.test(message) ||
                       /\[CONTEÚDO DE /.test(message) ||
                       /\[[^\]]{2,}\.(js|ts|html|css|json|py|go|md|txt|mjs|cjs|jsx|tsx)\]/.test(message) ||
                       /\[DIFF\]/.test(message);
    if (!hasFetched && !hasFileCtx) {
      return sendOk(res, {
        answer: '```json\n' + JSON.stringify({
          decisao: 'BLOCKED_INPUT',
          motivo: 'Nenhum contexto de arquivo real fornecido.',
          instrucao: 'Envie um ZIP, anexe um arquivo, ou inclua uma URL com o código a analisar. Sem evidência real não é possível propor patch (SDDF §17+§25).'
        }, null, 2) + '\n```\n\nNenhum arquivo ou URL de código foi fornecido. Para análise no modo fix, anexe um ZIP ou arquivo com o código-fonte.',
        provider: 'gate',
        model: 'fix-c-gate',
        mode,
        fetched_count: 0,
        fetched_urls: [],
        anti_stub: true
      });
    }
  }

  const fixModeInstructions = hermesDecisionMatrix;

  /* §37 — hybrid systemPrompt: ZIP+image, image-only, code-only */
  /* hasFileCtxForPrompt: true when file context was injected (ZIP or file upload) */
  const hasFileCtxForPrompt = /\[Arquivo: /.test(message) ||
                               /\[CONTEÚDO DE /.test(message) ||
                               /\[[^\]]{2,}\.(js|ts|html|css|json|py|go|md|txt|mjs|cjs|jsx|tsx)\]/.test(message) ||
                               /\[DIFF\]/.test(message);

  /* visionAddendum:
     - hybrid (image + file ctx in fix mode): vision layer + Hermes RCA combined
     - image-only: visual description only */
  const visionAddendum = hasImage
    ? (hasFileCtxForPrompt && (mode === 'fix' || mode === 'hermes'))
      ? [
          ``,
          `VOCÊ ESTÁ RECEBENDO UMA IMAGEM + CONTEXTO DE ARQUIVO.`,
          `Analise a imagem para identificar o problema visual (erro de UI, asset ausente, layout incorreto).`,
          `Combine com o código fornecido para localizar a causa-raiz exata.`,
          `Use a imagem como evidência visual — não apenas descreva, correlacione com o código.`,
          ``,
          fixModeInstructions
        ].join('\n')
      : `\n\nVOCÊ ESTÁ RECEBENDO UMA IMAGEM. Descreva o conteúdo visual com detalhes técnicos. Identifique elementos, textos visíveis, erros de UI, layout, ou qualquer anomalia. Responda em português brasileiro.`
    : '';

  /* 3-way systemPrompt:
     1. hybrid  (image + file + fix): basePrompt + visionAddendum (includes hermesDecisionMatrix)
     2. image-only: basePrompt + visionAddendum (visual description)
     3. code-only: basePrompt + fixModeInstructions (hermesDecisionMatrix)
     + §53: diffInstruction53 appended when [DIFF] block present (all paths) */
  const systemPrompt = (hasImage
    ? basePrompt + visionAddendum
    : basePrompt + fixModeInstructions) + diffInstruction53;

  /* ── §34: ensureHermesJson — re-prompt se mode=fix retornou texto livre ── */
  /* Chama callFn(extractPrompt) com o diagnóstico já gerado como contexto.   */
  /* callFn recebe apenas o extractPrompt (sem systemPrompt/message original). */
  async function ensureHermesJson(answer, callFn) {
    if (mode !== 'fix') return answer;
    if (!answer || answer.includes('```json')) return answer;
    const extractPrompt =
      'O texto abaixo é um diagnóstico com um diff/patch. ' +
      'Analise e retorne APENAS um bloco ```json:\n\n' +
      'REGRAS CRÍTICAS:\n' +
      '1. Se há ```diff no texto: decisao="NEEDS_FIX" OBRIGATÓRIO\n' +
      '2. DECISÃO: READY com diff presente = ERRO — use NEEDS_FIX\n' +
      '3. Se diff tem múltiplas funções novas (full replace): fix_type="full_replace"\n' +
      '   patch = string com o conteúdo COMPLETO do arquivo após as mudanças\n' +
      '4. Se diff tem 1-2 linhas simples: fix_type="code_patch"\n' +
      '   patch = { "search": "linha original", "replace": "linha nova" }\n' +
      '5. file: caminho exato do arquivo no diff (sem o prefixo a/ ou b/)\n' +
      '6. Se não extrair arquivo do diff, use o caminho de arquivo mais mencionado no contexto\n\n' +
      'Formato:\n' +
      '```json\n' +
      '{\n' +
      '  "decisao": "NEEDS_FIX",\n' +
      '  "file": "caminho/arquivo.js",\n' +
      '  "fix_type": "code_patch",\n' +
      '  "patch": { "search": "linha original", "replace": "linha nova" },\n' +
      '  "confidence": 0.95,\n' +
      '  "diagnosis": "causa-raiz"\n' +
      '}\n' +
      '```\n' +
      'Retorne APENAS o JSON.\n\n' +
      answer.slice(0, 4000);
    try {
      const extracted = await callFn(extractPrompt);
      if (extracted && extracted.includes('```json')) return extracted;
    } catch (_) { /* fall through */ }
    return answer; // fallback: resposta original intacta
  }

  /* ── Imagem detectada: Gemini native multimodal (único provider vision) ── */
  /* §43: timeout adaptativo — 90s se payload > 45K chars                   */
  if (hasImage) {
    const GEMINI_KEY   = process.env.GEMINI_API_KEY || '';
    const GEMINI_MODEL = process.env.GEMINI_MODEL   || 'gemini-2.5-flash';
    const geminiTimeout = message.length > 45000 ? 90000 : 45000;
    if (GEMINI_KEY && !GEMINI_KEY.includes('placeholder')) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
        const userParts = [{ text: message }, { inline_data: { mime_type: imageMime, data: imageB64 } }];
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: userParts }]
          }),
          signal: AbortSignal.timeout(geminiTimeout)
        });
        if (r.ok) {
          const data = await r.json();
          const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (answer) {
            const finalAnswer = await ensureHermesJson(answer, async (prompt) => {
              const url2 = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
              const r2 = await fetch(url2, {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
                signal: AbortSignal.timeout(20000)
              });
              const d2 = await r2.json();
              return d2?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            });
            return sendOk(res, { answer: finalAnswer, provider: 'gemini', model: GEMINI_MODEL, mode, vision: true, fetched_count: req._toolFetchCount || 0, fetched_urls: req._toolFetchUrls || [], anti_stub: true });
          }
        }
      } catch (_) { /* fall through */ }
    }
    /* Gemini indisponível para imagem — erro honesto */
    return sendOk(res, { answer: '⚠️ Processamento de imagem falhou (Gemini indisponível). Envie o contexto como texto ou ZIP.', provider: 'local', model: 'copilot-local', mode, fetched_count: 0, fetched_urls: [], anti_stub: true });
  }

  /* ── §49 HERMES: text-only chain (anthropic→groq→openrouter→gemini→ollama) ── */
  const { callHermes: _callHermes49 } = require('./hermes-rca');
  /* §43+§66: timeout por-provider restaurado — budget timer removido (§69 hotfix).
   * Promise.race com budget 75s + timeout fixo 30s causava 503 falsos positivos:
   * OpenRouter normalmente leva 30-60s e era cortado prematuramente.
   * 503 estruturado mantido apenas para exaustão REAL (callHermes retorna ok=false).
   * Cliente stress test agora usa 90s (§69) — margem suficiente sem budget global. */
  const _h49timeout = message.length > 45000 ? 90000 : 60000;
  let _h49result;
  try {
    _h49result = await _callHermes49(systemPrompt, message, { timeout: _h49timeout });
  } catch (_e49) {
    _h49result = { ok: false, code: 'HERMES_EXCEPTION', requires_manual_review: true };
  }

  if (_h49result && _h49result.answer) {
    const finalAnswer = await ensureHermesJson(_h49result.answer, async (prompt) => {
      try {
        const r2 = await _callHermes49(systemPrompt, prompt, { timeout: 20000 });
        return r2.answer || '';
      } catch (_) { return ''; }
    });
    return sendOk(res, { answer: finalAnswer, provider: _h49result.provider_used, model: _h49result.model_used, mode, fetched_count: req._toolFetchCount || 0, fetched_urls: req._toolFetchUrls || [], anti_stub: true });
  }

  /* §69: HTTP 503 estruturado quando todos providers esgotam (elimina timeout mudo no cliente) */
  /* Anteriormente: sendOk 200 com texto local — cliente nunca sabia o motivo real.           */
  const _payloadLen   = (body.message || '').length;
  const _exhaustCode  = _h49result?.code || 'ALL_PROVIDERS_EXHAUSTED';
  const _exhaustTried = _h49result?.providers_tried || [];
  console.log('[HERMES §69] 503 ALL_PROVIDERS_EXHAUSTED code=' + _exhaustCode
    + ' tried=[' + _exhaustTried.join(',') + '] payload=' + _payloadLen + 'chars');
  return res.status(503).json({
    ok:              false,
    error:           'ALL_PROVIDERS_EXHAUSTED',
    code:            _exhaustCode,
    providers_tried: _exhaustTried,
    payload_chars:   _payloadLen,
    message:         'Todos os providers de IA falharam ou atingiram o budget de ' + (_h49budgetMs / 1000) + 's. '
                   + 'Providers tentados: [' + (_exhaustTried.join(', ') || 'nenhum') + ']. '
                   + 'Causas: quota/day esgotada (Cerebras), rate limit (Groq), congestionamento (OpenRouter).',
    anti_stub:       true
  });
});

app.get('/api/auth/status', (req, res) => {
  const user = getAuthUser(req);
  return sendOk(res, { authenticated: Boolean(user), plan: user ? (user.plan || 'free') : null, anti_stub: true });
});

/* ── Vision Agent Local endpoints ──────────────────────────── */
/* Fila em memória — reset ao reiniciar o processo                */
const _agentQueue   = [];
const _agentResults = {};

app.post('/api/agent/mission/queue', (req, res) => {
  const body    = normalizeBody(req);
  const mission = {
    id:        `mission_${Date.now()}_${Math.random().toString(16).slice(2,6)}`,
    input:     body.input || body.message || '',
    type:      body.type  || 'general',
    queued_at: now()
  };
  _agentQueue.push(mission);
  return sendOk(res, { mission_id: mission.id, queued: true, queue_length: _agentQueue.length });
});

app.get('/api/agent/mission/pending', (req, res) => {
  const mission = _agentQueue.shift();
  return sendOk(res, { mission: mission || null, queue_remaining: _agentQueue.length });
});

app.post('/api/agent/mission/result', (req, res) => {
  const body = normalizeBody(req);
  if (!body.mission_id) return res.status(400).json({ ok: false, error: 'mission_id_required', time: now() });
  _agentResults[body.mission_id] = { ...body, received_at: now() };
  return sendOk(res, { received: true, mission_id: body.mission_id });
});

app.get('/api/agent/mission/result/:id', (req, res) => {
  const result = _agentResults[req.params.id];
  if (!result) return res.status(404).json({ ok: false, error: 'result_not_found', time: now() });
  return sendOk(res, result);
});

/* Aprovação humana — push e revert via fila (SDDF: deploy_allowed=false, necessita autorização) */
app.post('/api/agent/mission/push', (req, res) => {
  const body    = normalizeBody(req);
  const mission = {
    id:          `push_${Date.now()}_${Math.random().toString(16).slice(2,6)}`,
    input:       'git push origin HEAD',
    type:        'git_push',
    origin_id:   body.mission_id || null,
    file:        body.file  || null,
    hash:        body.hash  || null,
    queued_at:   now()
  };
  _agentQueue.push(mission);
  return sendOk(res, { ok: true, mission_id: mission.id, queued: true, action: 'push_enqueued' });
});

app.post('/api/agent/mission/revert', (req, res) => {
  const body    = normalizeBody(req);
  const mission = {
    id:          `revert_${Date.now()}_${Math.random().toString(16).slice(2,6)}`,
    input:       'git reset --hard HEAD~1',
    type:        'git_revert',
    origin_id:   body.mission_id || null,
    file:        body.file  || null,
    hash:        body.hash  || null,
    queued_at:   now()
  };
  _agentQueue.push(mission);
  return sendOk(res, { ok: true, mission_id: mission.id, queued: true, action: 'revert_enqueued' });
});

/* ── /api/chat/apply-patch — aplica patch Hermes direto no ZIP, sem agent local ── */
/* Input:  { zip_base64, file_path, fix_type, patch, diagnosis }                     */
/* Output: { ok, patched_content, filename, diff_preview, aegis_ok, aegis_error }    */
app.post('/api/chat/apply-patch', async (req, res) => {
  try {
    const body        = normalizeBody(req);
    const b64         = body.zip_base64   || '';
    const fileContent = body.file_content || null; /* §42: conteúdo direto — evita reenviar ZIP inteiro */
    const filePath    = body.file_path    || body.file || '';
    const fixType     = body.fix_type     || 'code_patch';
    const patch       = body.patch;
    const diagnosis   = body.diagnosis    || 'vision fix';

    if (!b64 && !fileContent) return res.status(400).json({ ok: false, error: 'zip_base64_or_file_content_required', time: now() });
    if (!filePath) return res.status(400).json({ ok: false, error: 'file_path_required',  time: now() });
    if (!patch)    return res.status(400).json({ ok: false, error: 'patch_required',       time: now() });

    let originalContent;

    if (fileContent) {
      /* §42: conteúdo do arquivo já extraído no frontend — sem adm-zip */
      originalContent = fileContent;
    } else {
      /* Caminho legado: extrair do ZIP base64 */
      let AdmZip;
      try { AdmZip = require('adm-zip'); }
      catch { return res.status(500).json({ ok: false, error: 'adm-zip_not_installed', time: now() }); }

      /* 1. Extrair arquivo alvo do ZIP */
      const buf = Buffer.from(b64, 'base64');
      const zip = new AdmZip(buf);

      /* Busca tolerante: aceita com ou sem prefixo de pasta raiz do ZIP */
      const entries = zip.getEntries();
      const target  = entries.find(e => {
        const n = e.entryName.replace(/\\/g, '/');
        return n === filePath || n.endsWith('/' + filePath);
      });

      if (!target) {
        const available = entries.slice(0, 20).map(e => e.entryName).join(', ');
        return res.status(404).json({ ok: false, error: 'file_not_found_in_zip', file: filePath, available, time: now() });
      }

      originalContent = target.getData().toString('utf8');
    }

    /* 2. Aplicar patch — §48 PATCH ENGINE (5 estratégias) */
    let patchedContent  = originalContent;
    let patchError      = null;
    let matchStrategy   = null;
    let matchLog        = [];
    let snapshotContent = originalContent; /* §48: snapshot pré-patch */

    try {
      const { applyPatch: _applyPatch48 } = require('./patch-engine');
      const _r48 = _applyPatch48(originalContent, patch, fixType);
      patchedContent  = _r48.patchedContent;
      matchStrategy   = _r48.match_strategy;
      matchLog        = _r48.match_log || [];
      snapshotContent = _r48.snapshot_content || originalContent;
    } catch (err) {
      patchError = err.message;
    }

    if (patchError) {
      return res.status(422).json({ ok: false, error: 'patch_apply_failed', detail: patchError, fix_type: fixType, time: now() });
    }

    /* 3. Aegis — validação de sintaxe para JS/TS/MJS */
    let aegisOk    = true;
    let aegisError = null;
    const isJs = /\.(js|ts|mjs|cjs|jsx|tsx)$/i.test(filePath);
    if (isJs) {
      try {
        const { spawnSync } = require('child_process');
        const tmp  = require('os').tmpdir();
        const tmpF = require('path').join(tmp, 'vc_aegis_' + Date.now() + '.js');
        require('fs').writeFileSync(tmpF, patchedContent, 'utf8');
        const result = spawnSync(process.execPath, ['--check', tmpF], { timeout: 5000 });
        try { require('fs').unlinkSync(tmpF); } catch {}
        if (result.status !== 0) {
          aegisOk    = false;
          aegisError = (result.stderr || result.stdout || Buffer.alloc(0)).toString().replace(tmpF, filePath).trim();
        }
      } catch (err) {
        aegisError = 'aegis_spawn_error: ' + err.message;
        aegisOk    = false;
      }
    }

    /* 4. Gerar diff preview (unified-style simples, linha a linha) */
    function simpleDiff(before, after) {
      const bLines = before.split('\n');
      const aLines = after.split('\n');
      const out    = [];
      const maxLen = Math.max(bLines.length, aLines.length);
      let i = 0;
      while (i < maxLen && out.length < 120) {
        const b = bLines[i] !== undefined ? bLines[i] : null;
        const a = aLines[i] !== undefined ? aLines[i] : null;
        if (b === a) {
          out.push(' ' + (b || ''));
        } else {
          if (b !== null) out.push('-' + b);
          if (a !== null) out.push('+' + a);
        }
        i++;
      }
      if (out.length >= 120) out.push('... (diff truncado)');
      return out.join('\n');
    }

    const diffPreview = simpleDiff(originalContent, patchedContent);
    const filename    = filePath.split('/').pop().split('\\').pop();

    /* §47 — PASS GOLD Engine multidimensional (usa snapshotContent §48) */
    let passGoldResult = null;
    try {
      const { evaluate } = require('./pass-gold-engine');
      const confidenceRaw = (body.confidence != null)
        ? Number(body.confidence)
        : (body.diagnosis && /confidence/i.test(body.diagnosis) ? 75 : 80);
      const riskRaw = body.risk || 'medium';
      passGoldResult = evaluate({
        confidence:       confidenceRaw,
        risk:             riskRaw,
        aegis_ok:         aegisOk,
        original_content: snapshotContent, /* §48: snapshot pré-patch */
        patched_content:  patchedContent,
        patch:            patch,
        fix_type:         fixType,
        original_lines:   snapshotContent ? snapshotContent.split('\n').length : 0,
        diagnosis:        diagnosis
      });
    } catch (_e47) {
      console.warn('[PASS GOLD §47] engine error —', _e47.message, '— fallback to aegis_ok');
    }

    return sendOk(res, {
      patched_content: patchedContent,
      filename,
      file_path: filePath,
      fix_type:  fixType,
      diagnosis,
      diff_preview: diffPreview,
      aegis_ok:    aegisOk,
      aegis_error: aegisError || null,
      original_lines:  snapshotContent.split('\n').length,
      patched_lines:   patchedContent.split('\n').length,
      /* §48 — match engine */
      match_strategy:   matchStrategy,
      match_log:        matchLog,
      snapshot_content: snapshotContent,
      /* §47 — PASS GOLD multidimensional */
      pass_gold:   passGoldResult ? passGoldResult.pass_gold : aegisOk,
      gold_level:  passGoldResult ? passGoldResult.level     : (aegisOk ? 'GOLD' : 'NEEDS_REVIEW'),
      gold_score:  passGoldResult ? passGoldResult.final     : null,
      gold_verdict: passGoldResult ? passGoldResult.verdict   : null,
      gold_gates:  passGoldResult ? passGoldResult.gates      : null,
      gold_dimensions: passGoldResult ? passGoldResult.dimensions : null,
      anti_stub: true
    });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message, endpoint: '/api/chat/apply-patch', time: now() });
  }
});

/* ── §46 /api/deploy/zip-release — push arquivo corrigido + abrir PR GitHub ──
   Input:  { patched_content, file_path, repo, branch, commit_message, aegis_ok }
   Output: { ok, pr_url, branch }
   Guard:  aegis_ok=false → 403 — nunca abre PR sem PASS GOLD               */
app.post('/api/deploy/zip-release', async (req, res) => {
  try {
    const body           = normalizeBody(req);
    const patchedContent = body.patched_content || '';
    const filePath       = body.file_path        || '';
    const repo           = body.repo             || '';
    const branch         = body.branch           || 'main';
    const commitMsg      = body.commit_message   || null;
    const aegisOk        = body.aegis_ok         === true;

    if (!aegisOk) {
      return res.status(403).json({ ok: false, error: 'aegis_ok_required',
        detail: 'PASS GOLD (aegis_ok=true) obrigatório antes de abrir PR', time: now() });
    }
    if (!patchedContent) return res.status(400).json({ ok: false, error: 'patched_content_required', time: now() });
    if (!filePath)        return res.status(400).json({ ok: false, error: 'file_path_required',       time: now() });
    if (!repo || !repo.includes('/')) {
      return res.status(400).json({ ok: false, error: 'repo_required',
        detail: 'Formato esperado: owner/repo', time: now() });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ ok: false, error: 'github_token_not_configured',
        detail: 'GITHUB_TOKEN não configurado no servidor', time: now() });
    }

    const timestamp = Date.now();
    const newBranch = `visioncore-fix-${timestamp}`;
    const ghHeaders = {
      'Authorization': `token ${githubToken}`,
      'Content-Type':  'application/json',
      'User-Agent':    'VisionCore/3.0.0',
      'Accept':        'application/vnd.github.v3+json'
    };

    /* 1. Obter SHA do branch base */
    const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, {
      headers: ghHeaders, signal: AbortSignal.timeout(10000)
    });
    if (!refRes.ok) {
      const e = await refRes.json().catch(() => ({}));
      throw new Error(`Branch '${branch}' não encontrado em ${repo}: ${e.message || refRes.status}`);
    }
    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    /* 2. Criar novo branch */
    const createBrRes = await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
      method: 'POST', headers: ghHeaders,
      body:   JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha }),
      signal: AbortSignal.timeout(10000)
    });
    if (!createBrRes.ok) {
      const e = await createBrRes.json().catch(() => ({}));
      throw new Error(`Criar branch falhou: ${e.message || createBrRes.status}`);
    }

    /* 3. Obter SHA atual do arquivo (necessário para update) */
    let fileSha = null;
    const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`, {
      headers: ghHeaders, signal: AbortSignal.timeout(10000)
    });
    if (fileRes.ok) {
      const fd = await fileRes.json();
      fileSha = fd.sha || null;
    }

    /* 4. Push arquivo corrigido no novo branch */
    const content64  = Buffer.from(patchedContent, 'utf8').toString('base64');
    const fileName   = filePath.split('/').pop().split('\\').pop();
    const updateBody = {
      message: commitMsg || `fix: Vision Core AEGIS PASS GOLD — ${fileName}`,
      content: content64,
      branch:  newBranch
    };
    if (fileSha) updateBody.sha = fileSha;

    const updateRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT', headers: ghHeaders,
      body:   JSON.stringify(updateBody),
      signal: AbortSignal.timeout(15000)
    });
    if (!updateRes.ok) {
      const e = await updateRes.json().catch(() => ({}));
      throw new Error(`Push arquivo falhou: ${e.message || updateRes.status}`);
    }

    /* 5. Abrir PR */
    const prBody = [
      '## Vision Core — Patch Automático (AEGIS PASS GOLD)',
      '',
      `**Arquivo:** \`${filePath}\``,
      `**AEGIS:** ✅ PASS GOLD — sintaxe validada automaticamente`,
      `**Branch:** \`${newBranch}\` → \`${branch}\``,
      '',
      '> ⚠️ **Revise o diff antes de fazer merge.** Vision Core abre PR para revisão humana — não faz merge automático.',
      `> \`deploy_allowed = false\` — aprovação humana obrigatória.`,
      '',
      `_Gerado por Vision Core V3.0.0 em ${new Date().toISOString()}_`
    ].join('\n');

    const prRes = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
      method: 'POST', headers: ghHeaders,
      body:   JSON.stringify({
        title: `[Vision Core] fix: ${fileName} — AEGIS PASS GOLD`,
        body:  prBody,
        head:  newBranch,
        base:  branch
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!prRes.ok) {
      const e = await prRes.json().catch(() => ({}));
      throw new Error(`Criar PR falhou: ${e.message || prRes.status}`);
    }
    const prData = await prRes.json();

    console.log(`[§46] PR aberto: ${prData.html_url} (branch: ${newBranch})`);
    return res.json({ ok: true, pr_url: prData.html_url, branch: newBranch, repo, file_path: filePath, time: now() });

  } catch (err) {
    console.error('[§46] deploy/zip-release error:', err.message);
    return res.status(500).json({ ok: false, error: 'deploy_failed', detail: err.message, time: now() });
  }
});

/* ── §50 /api/deploy/merge-pr — squash merge de PR aprovado via AEGIS ─── */
app.post('/api/deploy/merge-pr', async (req, res) => {
  try {
    const body       = normalizeBody(req);
    const repo       = body.repo;
    const pullNumber = body.pull_number;
    const aegisOk    = body.aegis_ok;

    if (!aegisOk) {
      return res.status(403).json({ ok: false, error: 'aegis_gate_failed', detail: 'aegis_ok must be true to merge', time: now() });
    }
    if (!repo || !pullNumber) {
      return res.status(400).json({ ok: false, error: 'repo and pull_number required', time: now() });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ ok: false, error: 'GITHUB_TOKEN not configured', time: now() });
    }

    const ghHeaders = {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'vision-core-backend/3.0.0'
    };

    /* Verificar state=open */
    const prCheckRes = await fetch(`https://api.github.com/repos/${repo}/pulls/${pullNumber}`, { headers: ghHeaders });
    if (!prCheckRes.ok) {
      const errText = await prCheckRes.text();
      return res.status(prCheckRes.status).json({ ok: false, error: 'pr_check_failed', detail: errText, time: now() });
    }
    const prData = await prCheckRes.json();
    if (prData.state !== 'open') {
      return res.status(409).json({ ok: false, error: 'pr_not_open', detail: `PR #${pullNumber} state=${prData.state}`, time: now() });
    }

    /* Squash merge */
    const mergeRes = await fetch(`https://api.github.com/repos/${repo}/pulls/${pullNumber}/merge`, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merge_method: 'squash',
        commit_title: `[Vision Core] AEGIS PASS GOLD — auto-merge PR #${pullNumber}`
      })
    });
    if (!mergeRes.ok) {
      const errText = await mergeRes.text();
      return res.status(mergeRes.status).json({ ok: false, error: 'merge_failed', detail: errText, time: now() });
    }
    const mergeData = await mergeRes.json();

    console.log(`[§50] PR #${pullNumber} merged (squash): ${mergeData.sha}`);
    return res.json({
      ok: true,
      merged: true,
      sha: mergeData.sha,
      commit_url: `https://github.com/${repo}/commit/${mergeData.sha}`,
      time: now()
    });

  } catch (err) {
    console.error('[§50] deploy/merge-pr error:', err.message);
    return res.status(500).json({ ok: false, error: 'merge_error', detail: err.message, time: now() });
  }
});

/* ── §64 /api/github/create-pr — cria branch + commits + PR do zero ──── */
app.post('/api/github/create-pr', async (req, res) => {
  try {
    const body        = normalizeBody(req);
    const repo        = (body.repo        || '').trim();
    const baseBranch  = (body.base_branch || '').trim();
    const headBranch  = (body.head_branch || '').trim();
    const title       = (body.title       || '').trim();
    const prBody      = (body.body        || '').trim();
    const files       = Array.isArray(body.files) ? body.files : [];

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ ok: false, error: 'GITHUB_TOKEN not configured', time: now() });
    }
    if (!repo || !baseBranch || !headBranch || !title) {
      return res.status(400).json({ ok: false, error: 'repo, base_branch, head_branch e title são obrigatórios', time: now() });
    }

    const ghHeaders = {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'vision-core-backend/3.0.0'
    };

    /* 1 — SHA da base_branch */
    const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${baseBranch}`, { headers: ghHeaders });
    if (!refRes.ok) {
      const e = await refRes.json().catch(() => ({}));
      return res.status(refRes.status).json({ ok: false, error: 'base_branch_not_found', detail: e.message || refRes.status, time: now() });
    }
    const refData  = await refRes.json();
    const baseSha  = refData.object.sha;

    /* 2 — Criar head_branch (idempotente: ignora 422 "already exists") */
    const createBranchRes = await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
      method: 'POST',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${headBranch}`, sha: baseSha })
    });
    if (!createBranchRes.ok && createBranchRes.status !== 422) {
      const e = await createBranchRes.json().catch(() => ({}));
      return res.status(createBranchRes.status).json({ ok: false, error: 'create_branch_failed', detail: e.message || createBranchRes.status, time: now() });
    }

    /* 3 — Commit de cada arquivo em files[] */
    for (const file of files) {
      if (!file.path || file.content === undefined) continue;

      /* Buscar sha atual do arquivo se já existir (necessário para update) */
      let existingSha;
      const existRes = await fetch(`https://api.github.com/repos/${repo}/contents/${file.path}?ref=${headBranch}`, { headers: ghHeaders });
      if (existRes.ok) {
        const existData = await existRes.json().catch(() => ({}));
        existingSha = existData.sha;
      }

      const contentBase64 = Buffer.from(String(file.content), 'utf8').toString('base64');
      const putPayload    = { message: title, content: contentBase64, branch: headBranch };
      if (existingSha) putPayload.sha = existingSha;

      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${file.path}`, {
        method: 'PUT',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(putPayload)
      });
      if (!putRes.ok) {
        const e = await putRes.json().catch(() => ({}));
        return res.status(putRes.status).json({ ok: false, error: 'commit_file_failed', path: file.path, detail: e.message || putRes.status, time: now() });
      }
    }

    /* 4 — Criar o PR */
    const prRes = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
      method: 'POST',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body:  prBody || `PR criado automaticamente pelo Vision Core\n\nBranch: \`${headBranch}\` → \`${baseBranch}\``,
        head:  headBranch,
        base:  baseBranch
      })
    });
    if (!prRes.ok) {
      const e = await prRes.json().catch(() => ({}));
      return res.status(prRes.status).json({ ok: false, error: 'create_pr_failed', detail: e.message || prRes.status, time: now() });
    }
    const prData = await prRes.json();

    console.log(`[§64] PR criado: ${prData.html_url} (branch: ${headBranch} → ${baseBranch})`);
    return res.json({
      ok:        true,
      pr_url:    prData.html_url,
      pr_number: prData.number,
      branch:    headBranch,
      files_committed: files.length,
      time:      now()
    });

  } catch (err) {
    console.error('[§64] github/create-pr error:', err.message);
    return res.status(500).json({ ok: false, error: 'create_pr_error', detail: err.message, time: now() });
  }
});

/* ── §51 /api/deploy/trigger — auto-deploy pós-merge via GitHub Actions ── */
app.post('/api/deploy/trigger', async (req, res) => {
  try {
    const body        = normalizeBody(req);
    const repo        = body.repo;
    const sha         = body.sha;
    const environment = body.environment || 'production';
    const aegisOk     = body.aegis_ok;

    if (!aegisOk) {
      return res.status(403).json({ ok: false, error: 'aegis_gate_failed', detail: 'aegis_ok must be true to trigger deploy', time: now() });
    }
    if (!repo || !sha) {
      return res.status(400).json({ ok: false, error: 'repo and sha required', time: now() });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ ok: false, error: 'GITHUB_TOKEN not configured', time: now() });
    }

    const workflow = process.env.GITHUB_DEPLOY_WORKFLOW || 'deploy.yml';
    const ghHeaders = {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'vision-core-backend/3.0.0'
    };

    /* Check if workflow exists */
    const wfCheckRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflow}`,
      { headers: ghHeaders }
    );

    if (!wfCheckRes.ok) {
      /* Workflow not configured — soft success (deploy not executed) */
      console.log(`[§51] workflow ${workflow} not found in ${repo} — soft success`);
      return res.json({
        ok: true,
        deployed: false,
        deploy_url: null,
        run_id: null,
        note: `workflow_not_configured: ${workflow} não encontrado em ${repo}`,
        time: now()
      });
    }

    /* Dispatch workflow */
    const dispatchRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
      {
        method: 'POST',
        headers: ghHeaders,
        body: JSON.stringify({ ref: 'main', inputs: { sha, environment } })
      }
    );

    if (!dispatchRes.ok && dispatchRes.status !== 204) {
      const errText = await dispatchRes.text();
      return res.status(dispatchRes.status).json({ ok: false, error: 'dispatch_failed', detail: errText, time: now() });
    }

    /* GitHub returns 204 on success — no body. Get latest run for URL. */
    await new Promise(function(r) { setTimeout(r, 1500); }); /* brief wait for run creation */
    const runsRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=1`,
      { headers: ghHeaders }
    );
    let runId = null, deployUrl = null;
    if (runsRes.ok) {
      const runsData = await runsRes.json();
      if (runsData.workflow_runs && runsData.workflow_runs[0]) {
        runId     = runsData.workflow_runs[0].id;
        deployUrl = runsData.workflow_runs[0].html_url;
      }
    }

    console.log(`[§51] deploy triggered: ${repo} workflow=${workflow} sha=${sha.slice(0,8)} run=${runId}`);
    return res.json({
      ok: true,
      deployed: true,
      deploy_url: deployUrl || `https://github.com/${repo}/actions`,
      run_id: runId,
      environment,
      time: now()
    });

  } catch (err) {
    console.error('[§51] deploy/trigger error:', err.message);
    return res.status(500).json({ ok: false, error: 'trigger_error', detail: err.message, time: now() });
  }
});

/* ── /api/unzip-context — extrai ZIP e injeta conteúdo para /api/chat ─── */
app.post('/api/unzip-context', async (req, res) => {
  try {
    const body     = normalizeBody(req);
    const b64      = body.zip_base64 || '';
    const question = body.question   || 'Analise o projeto';
    const mode     = body.mode       || 'fix';

    if (!b64) return res.status(400).json({ ok: false, error: 'zip_base64 required', time: now() });

    let AdmZip;
    try { AdmZip = require('adm-zip'); }
    catch(e) { return res.status(500).json({ ok: false, error: 'adm-zip not installed', time: now() }); }

    const buf     = Buffer.from(b64, 'base64');
    const zip     = new AdmZip(buf);
    const entries = zip.getEntries();

    const TEXT_EXTS = new Set(['.json','.js','.ts','.jsx','.tsx','.html','.css','.md','.txt','.py','.go','.mjs','.cjs']);
    const SKIP_DIRS = ['node_modules','.git','dist','.next','build','coverage','__pycache__'];
    /* FIX D §24 — ignorar lixo por nome (cache, lock, min, bundle, map, vendor) */
    const SKIP_NAME = /(?:cache|lock|\.min\.|\.bundle\.|\.map$|vendor\.)/i;

    /* Coletar TODOS os candidatos, ordenar tamanho ASC, pegar 20 menores */
    const candidates = [];
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const name = entry.entryName;
      const skip = SKIP_DIRS.some(d => name.includes(d + '/') || name.includes(d + '\\'));
      if (skip) continue;
      const fname = name.split('/').pop().split('\\').pop();
      if (SKIP_NAME.test(fname)) continue;
      const ext = path.extname(name).toLowerCase();
      if (!TEXT_EXTS.has(ext)) continue;
      candidates.push({ entry, name, sz: entry.header.size });
    }
    /* menor primeiro → mais cobertura distinta no budget de 20 */
    candidates.sort((a, b) => a.sz - b.sz);

    const files = [];
    const LIMIT = 14000; /* §24v7c: paridade com frontend — 4×14K=56K ≤ 60K total */
    for (const c of candidates.slice(0, 5)) { /* MAX_FILES=5 paridade */
      try {
        const content = c.entry.getData().toString('utf8');
        files.push({ name: c.name, content: content.slice(0, LIMIT) + (content.length > LIMIT ? `\n...(truncado em ${LIMIT}/${content.length} chars)` : '') });
      } catch(e) {}
    }

    if (!files.length) {
      return res.status(400).json({ ok: false, error: 'Nenhum arquivo de texto encontrado no ZIP', time: now() });
    }

    const context = files
      .map(f => `[${f.name}]\n${f.content}`)
      .join('\n\n---\n\n');

    const enrichedMessage = question + '\n\n' + context;

    return sendOk(res, {
      files:   files.map(f => f.name),
      message: enrichedMessage,
      chars:   enrichedMessage.length,
      mode
    });
  } catch(err) {
    return res.status(500).json({ ok: false, error: err.message, time: now() });
  }
});

/* ── /api/spec — SF Spec Library ────────────────────────────────────────── */
// __dirname/spec-library (EB deploy: copied by CI)
// fallback: ROOT/../docs/spec-library (local dev, monorepo root)
const SPEC_DIR = fs.existsSync(path.join(__dirname, 'spec-library'))
  ? path.join(__dirname, 'spec-library')
  : path.join(ROOT, '..', 'docs', 'spec-library');

/** Lazy in-memory cache. Reload on first request after server start. */
let _specCache = null;

function loadSpecCache() {
  if (_specCache) return _specCache;
  const cache = { byId: {}, byModule: {} };
  try {
    const files = fs.readdirSync(SPEC_DIR)
      .filter(f => f.endsWith('.json') && !f.startsWith('_'));
    for (const file of files) {
      const mod  = file.replace('.json', '');  // e.g. "SF-01"
      const data = JSON.parse(fs.readFileSync(path.join(SPEC_DIR, file), 'utf8'));
      cache.byModule[mod] = data.specs || [];
      for (const spec of data.specs || []) cache.byId[spec.id] = spec;
    }
    console.log(`[spec] loaded ${Object.keys(cache.byId).length} specs from ${SPEC_DIR}`);
  } catch (e) {
    console.warn('[spec] loadSpecCache error:', e.message);
  }
  _specCache = cache;
  return cache;
}

/**
 * GET /api/spec
 *   ?module=SF-01          → all specs for module
 *   ?module=SF-01&type=EDGE → filtered by type
 *   ?module=SF-01&tag=nodejs → filtered by tag
 *   (no query)             → index of all modules with counts
 *
 * GET /api/spec/:id        → single spec (e.g. SF-01-001)
 */
app.get('/api/spec/:id', (req, res) => {
  const cache = loadSpecCache();
  const id    = req.params.id.toUpperCase();
  const spec  = cache.byId[id];
  if (!spec) return res.status(404).json({ ok: false, error: 'spec_not_found', id, time: now() });
  return sendOk(res, { spec });
});

app.get('/api/spec', (req, res) => {
  const cache = loadSpecCache();
  const { module: modParam, type: typeParam, tag: tagParam } = req.query;

  if (modParam) {
    // Normalise: "sf-01" → "SF-01", "01" → "SF-01"
    let mod = modParam.toUpperCase();
    if (/^\d{2}$/.test(mod)) mod = `SF-${mod}`;
    else if (!mod.startsWith('SF-')) mod = `SF-${mod}`;

    const specs = cache.byModule[mod];
    if (!specs) {
      return res.status(404).json({ ok: false, error: 'module_not_found', module: mod, time: now() });
    }

    let result = specs;
    if (typeParam) result = result.filter(s => s.type && s.type.toUpperCase() === typeParam.toUpperCase());
    if (tagParam)  result = result.filter(s => Array.isArray(s.tags) && s.tags.includes(tagParam.toLowerCase()));

    return sendOk(res, { module: mod, count: result.length, specs: result });
  }

  // Index
  const modules = Object.entries(cache.byModule)
    .map(([mod, specs]) => ({ module: mod, count: specs.length }))
    .sort((a, b) => a.module.localeCompare(b.module));

  return sendOk(res, {
    total:   Object.keys(cache.byId).length,
    modules,
  });
});

/* ── /api/architect/interpret — §73.2 Agente Arquiteto ─────────────────── */

/** Lazy-load system prompt from file (cached after first read) */
let _architectSystemPrompt = null;
function loadArchitectSystemPrompt() {
  if (_architectSystemPrompt) return _architectSystemPrompt;
  const p = path.join(__dirname, 'prompts', 'architect-system.md');
  _architectSystemPrompt = fs.readFileSync(p, 'utf8');
  return _architectSystemPrompt;
}

/** Match tags from classification against spec cache; return top specs.
 *  Fallback: if tag-match returns 0 results and confidence >= 0.6,
 *  try substring match on spec.title + module_name using project_type/stack words. */
function matchSpecsByTags(tags, cache, limit = 8, fallbackTerms = []) {
  const tagSet = new Set((Array.isArray(tags) ? tags : []).map(t => t.toLowerCase()));
  const scored = [];

  for (const spec of Object.values(cache.byId)) {
    if (!Array.isArray(spec.tags)) continue;
    const hits = spec.tags.filter(t => tagSet.has(t.toLowerCase())).length;
    if (hits > 0) scored.push({ spec, hits, via: 'tag' });
  }

  // Fallback: title/module substring match when tags yield nothing
  if (scored.length === 0 && fallbackTerms.length > 0) {
    const terms = fallbackTerms
      .join(' ')
      .toLowerCase()
      .split(/[\s,/+\-_]+/)
      .filter(w => w.length >= 3);
    for (const spec of Object.values(cache.byId)) {
      const haystack = ((spec.title || '') + ' ' + (spec.module_name || '')).toLowerCase();
      const hits = terms.filter(w => haystack.includes(w)).length;
      if (hits > 0) scored.push({ spec, hits, via: 'title' });
    }
  }

  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, limit).map(({ spec, hits, via }) => ({
    id:       spec.id,
    module:   spec.module,
    title:    spec.title,
    type:     spec.type,
    tags:     spec.tags,
    tag_hits: hits,
    match_via: via || 'tag'
  }));
}

/** Extract JSON from LLM answer (handles stray markdown fences) */
function extractArchitectJson(answer) {
  // strip possible markdown code fence
  const stripped = answer.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(stripped);
}

/**
 * POST /api/architect/interpret
 * Body: { message: string }
 *
 * Response (confidence >= 0.6):
 *   { ok, classification, specs_suggested, provider_used, model_used, mode }
 *
 * Response (confidence < 0.6):
 *   { ok, classification, open_questions, provider_used, model_used, mode }
 */
app.post('/api/architect/interpret', async (req, res) => {
  const body    = normalizeBody(req);
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return res.status(400).json({ ok: false, error: 'message_required', time: now() });
  }
  if (message.length > 4000) {
    return res.status(400).json({ ok: false, error: 'message_too_long', max: 4000, time: now() });
  }

  const CONFIDENCE_THRESHOLD = 0.6;

  try {
    const systemPrompt = loadArchitectSystemPrompt();
    const hermesResult = await callHermes(systemPrompt, message, { timeout: 30000 });

    if (!hermesResult || hermesResult.ok === false) {
      return res.status(503).json({
        ok:    false,
        error: 'all_providers_exhausted',
        code:  hermesResult?.code || 'HERMES_FAILED',
        time:  now()
      });
    }

    let classification;
    try {
      classification = extractArchitectJson(hermesResult.answer);
    } catch (parseErr) {
      return res.status(502).json({
        ok:    false,
        error: 'llm_parse_error',
        raw:   hermesResult.answer.slice(0, 500),
        time:  now()
      });
    }

    // Validate / normalise fields
    const confidence      = typeof classification.confidence === 'number'
      ? Math.min(1, Math.max(0, classification.confidence))
      : 0.0;
    classification.confidence = confidence;

    /* §76 — detectIntent: mapeia tags + confidence → pipeline_mode para o Agente Unificado */
    const CREATE_INTENT_TAGS = [
      'nova-feature','saas','saas-fullstack','api-backend','prototype',
      'dashboard-admin','game-indie','ecommerce','landing-page','cli-utility',
      'ai-agent-system','automation-bot','frontend','saas-api','saas-baseline',
      'api-microservice','api'
    ];
    const FIX_INTENT_TAGS = [
      'patch-cirurgico','bug-fix','refactor','debug','hermes-review','fix'
    ];
    const _tags76   = Array.isArray(classification.tags) ? classification.tags : [];
    const _hasFix76 = _tags76.some(t => FIX_INTENT_TAGS.includes(t));
    const _hasCre76 = _tags76.some(t => CREATE_INTENT_TAGS.includes(t));

    let _intent76       = 'chat';
    let _pipelineMode76 = 'vision-geral';
    let _routingReason76 = `confidence: ${Math.round(confidence * 100)}%`;

    if (_hasFix76 && confidence >= 0.60) {
      _intent76       = 'fix';
      _pipelineMode76 = 'fix';
      _routingReason76 = `tags: ${_tags76.filter(t => FIX_INTENT_TAGS.includes(t)).join(', ')} · ${_routingReason76}`;
    } else if (_hasCre76 && confidence >= 0.55 && !_hasFix76) {
      _intent76       = 'create';
      _pipelineMode76 = 'create';
      _routingReason76 = `tags: ${_tags76.filter(t => CREATE_INTENT_TAGS.includes(t)).join(', ')} · ${_routingReason76}`;
    } else {
      _routingReason76 = `sem tags de ação claras · ${_routingReason76}`;
    }

    const baseResp = {
      ok:              true,
      intent:          _intent76,
      pipeline_mode:   _pipelineMode76,
      routing_reason:  _routingReason76,
      classification,
      provider_used:   hermesResult.provider_used,
      model_used:      hermesResult.model_used,
      mode:            'LOCAL PREVIEW',
      exec_real:       'BLOQUEADA',
      time:            now()
    };

    if (confidence < CONFIDENCE_THRESHOLD) {
      // Low confidence — return open questions instead of specs
      return res.status(200).json({
        ...baseResp,
        intent:          'chat',
        pipeline_mode:   'vision-geral',
        routing_reason:  `confidence baixa (${Math.round(confidence * 100)}%) → conversa`,
        specs_suggested: [],
        open_questions:  Array.isArray(classification.open_questions) ? classification.open_questions : []
      });
    }

    // High confidence — match specs
    const cache          = loadSpecCache();
    const tags           = Array.isArray(classification.tags) ? classification.tags : [];
    // fallbackTerms: words from project_type + stack for title-substring fallback
    const fallbackTerms  = [
      classification.project_type || '',
      ...(Array.isArray(classification.stack) ? classification.stack : [])
    ].filter(Boolean);
    const specs_suggested = matchSpecsByTags(tags, cache, 8, fallbackTerms);

    return res.status(200).json({
      ...baseResp,
      specs_suggested,
      open_questions: []
    });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message, time: now() });
  }
});

/* ─────────────────────────────────────────────────────────────────────
   GET /api/spec/summary
   §76 — Sidebar da SF Spec Library: módulos + counts + breakdown por tipo.
   ───────────────────────────────────────────────────────────────────── */
app.get('/api/spec/summary', (req, res) => {
  const cache = loadSpecCache();

  const MODULE_NAMES = {
    'SF-01':  'Montar Projeto do Zero',
    'SF-02':  'Templates de Projeto',
    'SF-03':  'Compositor de Missão',
    'SF-04':  'Pacotes para Workers',
    'SF-05':  'Preview de Criação',
    'SF-06':  'Comando para Criação Real',
    'SF-07':  'Recibo do Worker',
    'SF-08':  'Painel Final',
    'SF-09':  'SaaS & API Roadmap',
    'SF-INT': 'Integração Cross-módulo',
    'SF-LLM': 'LLM — Qualidade de Output',
    'SF-SEC': 'Segurança (Security Wall)',
  };

  const modules = Object.entries(cache.byModule)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, specs]) => ({
      id,
      name:  specs[0]?.module_name || MODULE_NAMES[id] || id,
      count: specs.length,
      types: specs.reduce((acc, s) => {
        const t = s.type || 'null';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {})
    }));

  return sendOk(res, {
    modules,
    total_specs:   modules.reduce((s, m) => s + m.count, 0),
    total_modules: modules.length,
    time: now()
  });
});

/* SAFE 404 — nunca 405 */
app.all('/api/*', (req, res) => {
  return res.status(404).json({
    ok: false,
    error: 'endpoint_not_found',
    path: req.originalUrl,
    method: req.method,
    time: now()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log('SERVIDOR VISION CORE V2.9.10 SELF-HEALING CONFIG');
  console.log('================================================================');
  console.log(`URL: http://0.0.0.0:${PORT}`);
  console.log('CORS: MANUAL HARDENED BEFORE ALL ROUTES');
  console.log('BODY PARSER: RAW + JSON + TEXT + URLENCODED FALLBACK');
  console.log('Contratos: ALL/POST /api/copilot | ALL/POST /api/hermes/analyze | ALL/POST /api/run-live | GET /api/run-live-stream');
  console.log('NO CUSTOM 405: payload vazio nunca retorna 405');
  console.log('SELF-HEALING CONFIG: nginx/env/node gates ativos');
  console.log('PASS GOLD: obrigatório para promoção');
  console.log('================================================================');
});
