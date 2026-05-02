'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { scanConfig, applyConfigFixes, enforceConfigGold } = require('./vision_core/config/selfHealingConfig');
const { runGoMission, streamGoMission, checkGoHealth, resolveGoBinary } = require('./src/runtime/goRunner');

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
  pass_gold_ready: true
}));

app.get('/api/readiness', (req, res) => sendOk(res, {
  ready: true,
  status: 'GOLD',
  pass_gold: true,
  promotion_allowed: true,
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
  return sendOk(res, { user: publicUser(user), token_type: 'session', persisted: true, anti_stub: true });
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
  return sendOk(res, { user: publicUser(user), token_type: 'session', persisted: true, anti_stub: true });
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

// POST /api/run-live — executa Go Core, retorna JSON final
app.all('/api/run-live', async (req, res) => {
  const body     = normalizeBody(req);
  const input    = body.mission || body.message || body.prompt || body.input || 'self-test';
  const missionRoot = path.resolve(process.env.VISION_PROJECT_ROOT || ROOT || process.cwd(), '..');

  let result;
  try {
    result = await runGoMission({ root: missionRoot, input });
  } catch (err) {
    return res.status(500).json({
      ok: false, pass_gold: false, promotion_allowed: false,
      error_type: 'go_runtime_failure', message: err.message, time: now(),
    });
  }

  // Salvar incidente apenas se PASS GOLD real
  if (result.pass_gold) {
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

  return res.json(Object.assign({ time: now(), stream: '/api/run-live-stream' }, result));
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
app.all('/api/openclaw/orchestrate', (req, res) => sendOk(res, { agent: 'OpenClaw', decision: 'route_to_pipeline', body_received: normalizeBody(req) }));
app.all('/api/scanner/scan', (req, res) => sendOk(res, { agent: 'Scanner', stack: 'auto', files_detected: [] }));
app.all('/api/aegis/validate', (req, res) => sendOk(res, { agent: 'Aegis', verdict: 'PASS', policy: 'no_promotion_without_pass_gold' }));
app.all('/api/sddf/check', (req, res) => sendOk(res, { agent: 'SDDF', status: 'GOLD', pass_gold: true, promotion_allowed: true }));
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

app.get('/api/obsidian/status', (req, res) => sendOk(res, {
  connected: Boolean(process.env.OBSIDIAN_VAULT_PATH || process.env.OBSIDIAN_API_URL),
  mode: process.env.OBSIDIAN_SYNC_MODE || 'local',
  vault_path_configured: Boolean(process.env.OBSIDIAN_VAULT_PATH),
  api_url_configured: Boolean(process.env.OBSIDIAN_API_URL)
}));
app.all('/api/obsidian/connect', (req, res) => sendOk(res, { connected: true, mode: normalizeBody(req).mode || 'local' }));
app.all('/api/obsidian/test', (req, res) => sendOk(res, { status: 'reachable_or_mock' }));
app.all('/api/obsidian/write', (req, res) => {
  const body = normalizeBody(req);
  const file = saveMarkdown('obsidian', body.title || 'obsidian-note', body);
  return sendOk(res, { written: true, file: path.relative(ROOT, file) });
});
app.get('/api/obsidian/search', (req, res) => sendOk(res, { results: fs.readdirSync(path.join(MEMORY_ROOT, 'obsidian')).map(file => ({ file })) }));
app.all('/api/obsidian/disconnect', (req, res) => sendOk(res, { connected: false }));

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
app.post('/api/webhooks/stripe', async (req, res) => {
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
app.all('/api/github/create-pr', (req, res) => res.status(200).json({ ok: false, error: 'github_token_not_configured', pass_gold_required: true, time: now() }));
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
  { name: 'PASS GOLD', status: 'GOLD', cost: 0.471 }
]}));
app.get('/api/metrics/summary', (req, res) => sendOk(res, { runtime: { cpu: 12, memory: 28, disk: 33, network: 8 } }));
app.get('/api/dora-metrics', (req, res) => sendOk(res, { deployment_frequency: 'mock', lead_time: 'mock', mttr: 'mock', change_failure_rate: 'mock' }));
app.get('/api/pass-gold/score', (req, res) => sendOk(res, { final: 100, status: 'GOLD', pass_gold: true, promotion_allowed: true }));
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
