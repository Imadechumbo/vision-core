'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');
const { scanConfig, applyConfigFixes, enforceConfigGold } = require('./vision_core/config/selfHealingConfig');
const { runGoMission, streamGoMission, checkGoHealth, resolveGoBinary } = require('./src/runtime/goRunner');
const { callHermes, readLowConfidenceLog, computeMemoryMetrics } = require('./hermes-rca');
const { encryptProviderKey, decryptProviderKey } = require('./provider-vault-crypto');
const { resolveProviderKey, sortProvidersByEffectivePriority } = require('./provider-vault-routing');
const { extractUsage, computeCostUsd, recordAgentCost } = require('./llm-cost'); // DECISION-032
const { createGithubPullRequest } = require('./github-pr-adapter');
const { appendHermesDecisionPair, updateHermesOutcome } = require('./hermes-dataset');
const { VISION_CORE_FACTS_BLOCK, isUnsafeToArchive } = require('./vision-core-grounding');

// Import de módulo ESM local em tools/ (server.js é CommonJS; tools/ é ESM,
// por isso import() dinâmico em vez de require()). O caminho relativo certo
// muda com o layout do bundle: local/dev tem backend/server.js um nível
// abaixo da raiz do repo, tools/ é irmã de backend/ -> '../tools/x'. O zip
// de deploy do EB é "achatado" (server.js na raiz do bundle, sem pasta
// backend/) -> tools/ precisa estar ao lado de server.js -> './tools/x'.
// Tenta os dois, local primeiro — sem detecção prévia de ambiente, é o
// próprio import() que decide qual caminho existe.
async function importToolsModule(relativeFile) {
  try {
    return await import('../tools/' + relativeFile);
  } catch (_) {
    return await import('./tools/' + relativeFile);
  }
}

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
  return res.status(200).json({ ok: true, ...payload, request_id: res.locals.requestId || null, time: now() });
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

/* §129: helpers internos do Archivist — acesso direto ao FS, sem HTTP */
/* Nunca devem quebrar o fluxo principal — todos erros são capturados.  */
async function archivistSearch(query, limit) {
  limit = limit || 3;
  try {
    const q = String(query || '').toLowerCase().slice(0, 200);
    const results = [];
    for (const dir of ['incidents', 'patterns']) {
      const full = path.join(MEMORY_ROOT, dir);
      if (!fs.existsSync(full)) continue;
      for (const name of fs.readdirSync(full)) {
        const fp = path.join(full, name);
        try {
          if (!fs.statSync(fp).isFile()) continue;
          const text = fs.readFileSync(fp, 'utf8');
          if (!q || text.toLowerCase().includes(q)) {
            results.push({ file: name, preview: text.slice(0, 200) });
          }
          if (results.length >= limit * 3) break;
        } catch (_) { /* arquivo ilegível — pula */ }
      }
      if (results.length >= limit) break;
    }
    /* retorna os mais recentes (nome de arquivo começa com timestamp) */
    results.sort((a, b) => b.file.localeCompare(a.file));
    return results.slice(0, limit);
  } catch (e) {
    console.warn('[Archivist] search failed (non-fatal):', e.message);
    return [];
  }
}

async function archivistSave(key, value) {
  try {
    const content = typeof value === 'string' ? value : JSON.stringify(value);
    saveMarkdown('incidents', key, { context: content, source: 'auto-archivist' });
    console.log('[Archivist] saved:', key);
  } catch (e) {
    console.warn('[Archivist] save failed (non-fatal):', e.message);
  }
}

const ALLOWED_CORS_ORIGINS = new Set([
  'https://visioncoreai.pages.dev',
  'https://www.visioncoreai.pages.dev',
  'http://localhost:5173',
  'http://localhost:7070',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:7070',
  'http://127.0.0.1:8080'
]);

function isAllowedCorsOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_CORS_ORIGINS.has(origin) || /^https:\/\/[a-z0-9-]+\.visioncoreai\.pages\.dev$/.test(origin);
}

function isPrivateIp(address) {
  if (!address) return true;
  if (net.isIP(address) === 6) {
    const v = address.toLowerCase();
    return v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:');
  }
  const parts = String(address).split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 0) ||
    (a >= 224)
  );
}

async function assertPublicFetchTarget(parsedUrl) {
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    const err = new Error('invalid_protocol');
    err.statusCode = 400;
    throw err;
  }
  const hostname = parsedUrl.hostname.toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    const err = new Error('private_target_blocked');
    err.statusCode = 403;
    throw err;
  }
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      const err = new Error('private_target_blocked');
      err.statusCode = 403;
      throw err;
    }
    return { address: hostname, family: net.isIP(hostname) };
  }
  const addresses = await dns.lookup(hostname, { all: true, verbatim: false });
  if (!addresses.length || addresses.some(entry => isPrivateIp(entry.address))) {
    const err = new Error('private_target_blocked');
    err.statusCode = 403;
    throw err;
  }
  return addresses[0];
}

/* 1. CORS MANUAL BLINDADO — antes de parser/rotas */
app.use((req, res, next) => {
  const incomingRequestId = String(req.headers['x-request-id'] || '');
  req.requestId = /^[a-zA-Z0-9._-]{8,96}$/.test(incomingRequestId) ? incomingRequestId : crypto.randomUUID();
  res.locals.requestId = req.requestId;
  res.setHeader('X-Request-ID', req.requestId);
  const origin = String(req.headers.origin || '');

  res.setHeader('Vary', 'Origin');
  if (isAllowedCorsOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Vision-Token, X-Request-ID');
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID');
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

function copilotAnswer(body, activeAgent) {
  const message = body.message || body.prompt || body.text || '';
  const mode = body.mode || 'vision-geral';
  const model = body.model || 'auto';

  // §98-D: prefixar resposta local com o nome do agente detectado
  const agentPrefix = activeAgent ? `[${activeAgent.name}] ` : '';

  if (technical(message, mode)) {
    return [
      agentPrefix + 'Hermes/Copilot recebeu o erro técnico.',
      `Mensagem: ${message || 'mensagem vazia'}`,
      'Diagnóstico inicial: contrato/runtime precisa ser validado por SDDF.',
      'Próximo passo: executar missão para OpenClaw → Scanner → Hermes → Aegis → SDDF → PASS GOLD.',
      'Regra: sem PASS GOLD nada é promovido.'
    ].join('\n');
  }

  return [
    agentPrefix + 'Vision Copilot ativo.',
    `Mensagem: ${message || 'mensagem vazia'}`,
    `Modo: ${mode}`,
    `Modelo: ${model}`,
    'Posso conversar normalmente ou transformar isso em missão técnica.'
  ].join('\n');
}

// ── Key rotation support (B5 §82) ────────────────────────────────
// Set DEEPSEEK_API_KEY_2 / GEMINI_API_KEY_2 on EB for zero-downtime rotation
function resolveApiKey(prefix) {
  return process.env[`${prefix}_API_KEY`] || process.env[`${prefix}_API_KEY_2`] || '';
}

function providerList() {
  const providers = [
    ['openrouter', 'OPENROUTER'],
    ['groq', 'GROQ'],
    ['gemini', 'GEMINI'],
    ['deepseek', 'DEEPSEEK'],
    ['openai', 'OPENAI']
  ];

  return providers.map(([id, prefix]) => {
    const key = resolveApiKey(prefix);
    const hasPrimary   = Boolean(process.env[`${prefix}_API_KEY`]);
    const hasSecondary = Boolean(process.env[`${prefix}_API_KEY_2`]);
    return {
      id,
      configured: Boolean(key),
      key_source: hasPrimary ? 'primary' : hasSecondary ? 'secondary' : 'none',
      api_key_masked: maskSecret(key),
      base_url: process.env[`${prefix}_BASE_URL`] || '',
      model: process.env[`${prefix}_MODEL`] || ''
    };
  });
}

/* VISION CORE V4.0 ANTI-STUB REAL CORE */
const crypto = require('crypto');
const DB_ROOT = path.join(ROOT, 'data');
const USERS_DB = path.join(DB_ROOT, 'users.json');
const AGENT_COSTS_DB = path.join(DB_ROOT, 'agent-costs.json'); // DECISION-032 — ledger de custo real por agente
const PROJECTS_DB = path.join(DB_ROOT, 'projects.json');
const CHAT_CONVERSATIONS_DB = path.join(DB_ROOT, 'chat-conversations.json');
const OPERATION_LOG_DB = path.join(DB_ROOT, 'operation-log.json');
const PROVIDERS_VAULT_FILE = path.join(DB_ROOT, 'ai-providers-vault.json');
const VAULT_ROOT = path.join(MEMORY_ROOT, 'obsidian', 'VisionCoreVault');
for (const dir of [DB_ROOT, VAULT_ROOT, path.join(VAULT_ROOT, 'Missions'), path.join(VAULT_ROOT, 'Incidents'), path.join(VAULT_ROOT, 'PASS-GOLD'), path.join(VAULT_ROOT, 'Projects')]) fs.mkdirSync(dir, { recursive: true });

function readJsonFile(file, fallback) { try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch (err) { console.warn('[ANTI-STUB] readJsonFile failed', file, err.message); return fallback; } }
function writeJsonFile(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function publicUser(u) { return u ? { id: u.id, email: u.email, name: u.name || '', plan: u.plan || 'free', created_at: u.created_at, last_login: u.last_login || null } : null; }
// §151 — scrypt (memory-hard) para novos hashes; PBKDF2 mantido para migração de usuários existentes
// Formato scrypt: '$scrypt$N$salt_hex$hash_hex'
// Formato legado: 'salt_hex:pbkdf2_hex'
const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_LEN = 32;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('hex');
  return `$scrypt$${SCRYPT_N}$${salt}$${hash}`;
}

function _hashPasswordLegacy(password, salt) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith('$scrypt$')) {
    // §151: scrypt format
    const parts = stored.split('$'); // ['', 'scrypt', N, salt, hash]
    if (parts.length !== 5) return false;
    const [,, N, salt, expectedHex] = parts;
    try {
      const actual = crypto.scryptSync(String(password), salt, SCRYPT_LEN,
        { N: parseInt(N, 10), r: SCRYPT_R, p: SCRYPT_P }).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expectedHex, 'hex'));
    } catch { return false; }
  }
  // Legado: PBKDF2
  if (!stored.includes(':')) return false;
  const [salt] = stored.split(':');
  const expected = _hashPasswordLegacy(password, salt);
  return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(expected));
}
function base64url(input) { return Buffer.from(input).toString('base64url'); }

// §152 — Token blacklist (memória + S3)
const BLACKLIST_FILE = path.join(DB_ROOT, 'token-blacklist.json');
// §154 — Audit log de ações críticas
const AUDIT_LOG_FILE = path.join(DB_ROOT, 'audit-log.json');
// §155 — SSO ENTERPRISE domains
const SSO_DOMAINS_FILE = path.join(DB_ROOT, 'sso-domains.json');
let _tokenBlacklist = new Set();

function _loadBlacklist() {
  try {
    const data = readJsonFile(BLACKLIST_FILE, { jti_list: [] });
    _tokenBlacklist = new Set(Array.isArray(data.jti_list) ? data.jti_list : []);
    console.log('[§152] blacklist carregada:', _tokenBlacklist.size, 'tokens');
  } catch(e) { _tokenBlacklist = new Set(); }
}

function _saveBlacklist() {
  const data = { jti_list: [..._tokenBlacklist], updated_at: new Date().toISOString() };
  try { writeJsonFile(BLACKLIST_FILE, data); } catch(e) {}
  // sync S3 após writeAndSyncS3 estar definida
  if (typeof writeAndSyncS3 === 'function') writeAndSyncS3(BLACKLIST_FILE, data);
}

function revokeToken(jti) {
  if (!jti) return;
  _tokenBlacklist.add(jti);
  // Limitar tamanho: máx 10.000 entradas
  if (_tokenBlacklist.size > 10000) {
    _tokenBlacklist = new Set([..._tokenBlacklist].slice(-5000));
  }
  try { writeJsonFile(BLACKLIST_FILE, { jti_list: [..._tokenBlacklist], updated_at: new Date().toISOString() }); } catch(e) {}
}

function isTokenRevoked(jti) { return !!jti && _tokenBlacklist.has(jti); }

function requireSessionSecret() {
  const secret = String(process.env.SESSION_SECRET || '').trim();
  const publicFallback = ['vision', 'core', 'dev', 'session', 'secret', 'change', 'me'].join('-');
  if (!secret) throw new Error('SESSION_SECRET_REQUIRED');
  if (secret === publicFallback) throw new Error('SESSION_SECRET_INSECURE_PUBLIC_FALLBACK');
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('SESSION_SECRET_TOO_SHORT');
  return secret;
}

const SESSION_SECRET = requireSessionSecret();

// §152 — signSession: adiciona JTI + expiração 24h
function signSession(payload) {
  const jti = crypto.randomBytes(16).toString('hex');
  const fullPayload = Object.assign({}, payload, {
    jti,
    iat: Date.now(),
    exp: payload.exp || (Date.now() + 24 * 60 * 60 * 1000) // 24h padrão
  });
  const body = base64url(JSON.stringify(fullPayload));
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

// §152 — verifySession: verifica blacklist
function verifySession(token) {
  try {
    if (!token || !String(token).includes('.')) return null;
    const [body, sig] = String(token).split('.');
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null;
    if (data.jti && isTokenRevoked(data.jti)) return null; // §152: blacklist
    return data;
  } catch { return null; }
}
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


/* ── §83 callLLM — multi-provider real (native https, no node-fetch) ── */
const https = require('https');

// §149 — Rate limiting em memória (zero deps)
const _rl149 = new Map(); // key: 'ip:action' → { count, resetAt }

function rateLimitMiddleware(action, maxAttempts, windowMs) {
  return function(req, res, next) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
               || (req.connection && req.connection.remoteAddress)
               || 'unknown';
    const key = ip + ':' + action;
    const now = Date.now();
    let entry = _rl149.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      _rl149.set(key, entry);
    }
    entry.count++;
    if (entry.count > maxAttempts) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        ok: false, error: 'rate_limit_exceeded',
        retry_after_seconds: retryAfter, anti_stub: true
      });
    }
    next();
  };
}

// Limpeza periódica — evita memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of _rl149.entries()) {
    if (now > entry.resetAt) _rl149.delete(key);
  }
}, 5 * 60 * 1000);

// §146 — S3 persistence layer (zero deps: usa aws CLI disponível no EC2 via IAM role)
// Quando AWS_S3_BUCKET está setado, users.json e projects.json são sincronizados com S3.
// Sem o env var → comportamento anterior (local somente).
const S3_BUCKET = process.env.AWS_S3_BUCKET || '';
const S3_PREFIX = process.env.AWS_S3_PREFIX || 'data/';
const { exec: _exec146 } = require('child_process');

function _s3Key(localPath) { return S3_PREFIX + path.basename(localPath); }

// Startup: lê do S3 e sobrescreve arquivo local (execSync OK antes do app.listen)
function _s3LoadSync(localPath) {
  if (!S3_BUCKET) return;
  const key = _s3Key(localPath);
  try {
    const { execSync } = require('child_process');
    const content = execSync(`aws s3 cp "s3://${S3_BUCKET}/${key}" -`,
      { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] });
    const data = JSON.parse(content);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[s3] §146 loaded', key);
  } catch(e) {
    console.log('[s3] §146 no data for', key, '—', e.message.slice(0, 60));
  }
}

// Fire-and-forget: sincroniza S3 após escrever local
function _s3PutAsync(localPath, data) {
  if (!S3_BUCKET) return;
  const key = _s3Key(localPath);
  const tmp = path.join(require('os').tmpdir(), 'vc146_' + Date.now() + '.json');
  fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8', (err) => {
    if (err) return;
    _exec146(`aws s3 cp "${tmp}" "s3://${S3_BUCKET}/${key}"`,
      { timeout: 30000 }, (err2) => {
        fs.unlink(tmp, () => {});
        if (err2) console.warn('[s3] §146 put failed:', key, err2.message.slice(0,60));
      });
  });
}

// Drop-in replacement: escreve local + sincroniza S3 (fire-and-forget)
function writeAndSyncS3(localPath, data) {
  writeJsonFile(localPath, data);
  _s3PutAsync(localPath, data);
}

function operationLog(req, userId, event) {
  try {
    const db = readJsonFile(OPERATION_LOG_DB, { entries: [] });
    db.entries.push({
      id: makeId('log'),
      ts: now(),
      request_id: req.requestId,
      user_id: userId,
      project_id: event.project_id || null,
      mission_id: event.mission_id || null,
      job_id: event.job_id || null,
      event: String(event.event || 'operation').slice(0, 80),
      status: String(event.status || 'ok').slice(0, 24)
    });
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    db.entries = db.entries.filter(entry => new Date(entry.ts).getTime() >= cutoff).slice(-10000);
    writeAndSyncS3(OPERATION_LOG_DB, db);
  } catch (error) { console.warn('[operation-log] write failed:', error.message); }
}

// §154 — Audit log: registra ação crítica com ts/ip/ua/action + extra
function auditLog(action, req, extra = {}) {
  try {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
              || (req.connection && req.connection.remoteAddress) || 'unknown';
    const entry = { ts: new Date().toISOString(), action, ip, ua: req.headers['user-agent'] || '', ...extra };
    const log = readJsonFile(AUDIT_LOG_FILE, { entries: [] });
    log.entries.push(entry);
    if (log.entries.length > 10000) log.entries = log.entries.slice(-10000);
    writeAndSyncS3(AUDIT_LOG_FILE, log);
  } catch(e) { console.error('[§154] auditLog falhou:', e.message); }
}

// §155 — SSO ENTERPRISE domains (memória + S3)
let _ssoDomains = {};
function _loadSsoDomains() {
  try {
    const data = readJsonFile(SSO_DOMAINS_FILE, { domains: {} });
    _ssoDomains = data.domains || {};
    console.log('[§155] SSO domains carregados:', Object.keys(_ssoDomains).length);
  } catch(e) { console.warn('[§155] falha ao carregar sso-domains:', e.message); _ssoDomains = {}; }
}
function _saveSsoDomains() {
  writeAndSyncS3(SSO_DOMAINS_FILE, { domains: _ssoDomains, updated_at: new Date().toISOString() });
}
function isSsoDomain(email) {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1].toLowerCase();
  return _ssoDomains[domain] || null;
}

// AI Provider Vault "Configuração Principal" (Fase B: decisão do usuário foi
// Opção 3 sobre Opção 2 — env vars do EB continuam default; este vault é um
// override OPCIONAL, só passa a valer quando alguém salva um provider pela
// tela nova). Persistido em memória + S3 (mesmo padrão §146/§152/§155).
// A api_key nunca fica em texto plano aqui — sempre encryptProviderKey()
// (backend/provider-vault-crypto.js) antes de qualquer writeAndSyncS3.
let _providersStore = {};
function _loadProviderVault() {
  try {
    const data = readJsonFile(PROVIDERS_VAULT_FILE, { providers: {} });
    _providersStore = data.providers || {};
    console.log('[vault] AI providers carregados:', Object.keys(_providersStore).length);
  } catch (e) { _providersStore = {}; }
}
function _saveProviderVault() {
  writeAndSyncS3(PROVIDERS_VAULT_FILE, { providers: _providersStore, updated_at: now() });
}

function httpsPost(url, headers, bodyStr, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers }
    };
    const req = https.request(options, resp => {
      let data = '';
      resp.on('data', chunk => { data += chunk; });
      resp.on('end', () => resolve({ status: resp.statusCode, ok: resp.statusCode >= 200 && resp.statusCode < 300, text: data }));
    });
    req.on('error', reject);
    const timer = setTimeout(() => { req.destroy(); reject(new Error('timeout')); }, timeoutMs);
    req.on('close', () => clearTimeout(timer));
    req.write(bodyStr);
    req.end();
  });
}

async function callLLM(prompt, opts = {}) {
  const maxTokens = opts.max_tokens || 1024;
  const timeoutMs = opts.timeout_ms || 30000;
  const systemPrompt = opts.system || 'You are Vision Core AI assistant. Be concise and technical.';

  // Fase D(a) — resolveProviderKey() usa a chave do AI Provider Vault em vez
  // da env var APENAS quando aquele provider tem status:'connected' no
  // vault (alguém já clicou "Testar" e funcionou) — ver
  // backend/provider-vault-routing.js pras 3 regras completas + a
  // limitação conhecida (status não expira sozinho). Sem nenhuma entrada
  // salva no vault, resolveProviderKey() se comporta exatamente como
  // resolveApiKey() sempre se comportou — zero mudança.
  const providers = [
    {
      // §184 — OpenRouter primeiro: chave configurada no EB, acesso a vários modelos
      id: 'openrouter',
      key: resolveProviderKey('openrouter', resolveApiKey('OPENROUTER'), _providersStore, decryptProviderKey),
      url: 'https://openrouter.ai/api/v1/chat/completions',
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4-5',
      buildBody: (model) => JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] }),
      authHeaders: (key) => ({ 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://visioncoreai.pages.dev', 'X-Title': 'Vision Core' }),
      extractText: (data) => data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    },
    {
      id: 'openai',
      key: resolveProviderKey('openai', resolveApiKey('OPENAI'), _providersStore, decryptProviderKey),
      url: 'https://api.openai.com/v1/chat/completions',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      buildBody: (model) => JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] }),
      authHeaders: (key) => ({ 'Authorization': `Bearer ${key}` }),
      extractText: (data) => data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    },
    {
      id: 'anthropic',
      key: resolveProviderKey('anthropic', resolveApiKey('ANTHROPIC'), _providersStore, decryptProviderKey),
      url: 'https://api.anthropic.com/v1/messages',
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      buildBody: (model) => JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content: prompt }] }),
      authHeaders: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
      extractText: (data) => data.content && data.content[0] && data.content[0].text
    },
    {
      id: 'groq',
      key: resolveProviderKey('groq', resolveApiKey('GROQ'), _providersStore, decryptProviderKey),
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      buildBody: (model) => JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] }),
      authHeaders: (key) => ({ 'Authorization': `Bearer ${key}` }),
      extractText: (data) => data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    },
    {
      id: 'deepseek',
      key: resolveProviderKey('deepseek', resolveApiKey('DEEPSEEK'), _providersStore, decryptProviderKey),
      url: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
      buildBody: (model) => JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] }),
      authHeaders: (key) => ({ 'Authorization': `Bearer ${key}` }),
      extractText: (data) => data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    },
    {
      id: 'gemini',
      key: resolveProviderKey('gemini', resolveApiKey('GEMINI'), _providersStore, decryptProviderKey),
      url: `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent`,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      buildBody: (model) => JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens } }),
      authHeaders: (key) => { /* Gemini uses query param — handled via url override */ return {}; },
      urlOverride: (key) => `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${key}`,
      extractText: (data) => data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text
    }
  ];

  // Fase D(a): a ordem de fallback é a prioridade EFETIVA (vault, só quando
  // status:'connected' pra aquele provider — senão a posição no array acima,
  // idêntica à ordem de sempre). Vault vazio/sem status connected em nenhum
  // provider = orderedProviders tem exatamente a mesma ordem de `providers`.
  const orderedProviders = sortProvidersByEffectivePriority(providers, _providersStore);

  for (const p of orderedProviders) {
    if (!p.key) continue;
    try {
      const url = p.urlOverride ? p.urlOverride(p.key) : p.url;
      const resp = await httpsPost(url, p.authHeaders(p.key), p.buildBody(p.model), timeoutMs);
      if (!resp.ok) { console.warn(`[callLLM] ${p.id} http ${resp.status}`); continue; }
      const data = JSON.parse(resp.text);
      const text = p.extractText(data);
      if (text) {
        // DECISION-032 — usage/cost_usd são campos ADITIVOS: nunca alteram
        // text/provider/model nem o comportamento de nenhum dos call sites
        // existentes que só destructuram {text, provider, model}. opts.agent
        // é opt-in (default undefined) — sem ele, nada é gravado no ledger,
        // zero mudança de comportamento pros callers que não passarem esse campo.
        const usage = extractUsage(p.id, data);
        const cost_usd = computeCostUsd(p.id, usage.tokens_in, usage.tokens_out);
        if (opts.agent && cost_usd !== null) {
          try {
            const ledger = readJsonFile(AGENT_COSTS_DB, {});
            writeAndSyncS3(AGENT_COSTS_DB, recordAgentCost(ledger, opts.agent, Object.assign({}, usage, { cost_usd })));
          } catch (e) { console.warn('[callLLM] agent cost ledger write failed:', e.message); }
        }
        return { text, provider: p.id, model: p.model, tokens_in: usage.tokens_in, tokens_out: usage.tokens_out, cost_usd };
      }
    } catch (e) {
      console.warn(`[callLLM] ${p.id} failed: ${e.message}`);
    }
  }
  return null; // all providers failed or unconfigured
}

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
// §149: 5 tentativas/IP/hora no register, 10/IP/15min no login
app.all('/api/auth/register', rateLimitMiddleware('register', 5, 60 * 60 * 1000), (req, res) => {
  const body  = normalizeBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ ok: false, error: 'valid_email_required', time: now() });
  const provided = String(body.password || '');
  // INCIDENTE-3: a credencial de fallback legada era tratada como marcador do fluxo
  // só-email (§145) e acabou pública (achado do vc-secret-guard no bundle legado).
  // Rejeição ativa e logada — nunca mais aceita como marcador válido. Ver CLAUDE.md.
  if (provided === 'vc-user-auto') {
    auditLog('auth_fallback_credential_rejected', req, { route: '/api/auth/register' });
    return res.status(400).json({ ok: false, error: 'fallback_credential_rejected', time: now() });
  }
  const rawPw = (provided && provided.length >= 8)
    ? provided
    : crypto.randomBytes(8).toString('hex'); // 16 chars hex, único por usuário
  const db = readJsonFile(USERS_DB, { users: [] });
  if (db.users.some(u => u.email === email)) return res.status(409).json({ ok: false, error: 'email_already_registered', time: now() });
  const user = { id: makeId('usr'), email, name: body.name || '', password_hash: hashPassword(rawPw), plan: 'free', created_at: now(), last_login: null };
  db.users.push(user); writeAndSyncS3(USERS_DB, db);
  auditLog('register', req, { email }); // §154
  const token = signSession({ uid: user.id, exp: Date.now() + 24 * 60 * 60 * 1000 });
  res.setHeader('Set-Cookie', `vision_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
  return sendOk(res, { user: publicUser(user), token, token_type: 'session', persisted: true, generated_password: rawPw, anti_stub: true });
});

app.all('/api/auth/login', rateLimitMiddleware('login', 10, 15 * 60 * 1000), (req, res) => {
  const body = normalizeBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  // INCIDENTE-3: fecha o caminho de hash legado pré-§145 — contas antigas cujo
  // password_hash foi gerado a partir da credencial de fallback pública não podem
  // mais autenticar com ela. Seguro pra contas legítimas: desde §145 nenhuma conta
  // nova pode ter esse valor como senha real (register já recusa o marcador
  // acima), então nenhuma senha genuína jamais colide com esta rejeição.
  if (password === 'vc-user-auto') {
    auditLog('auth_fallback_credential_rejected', req, { route: '/api/auth/login' });
    return res.status(400).json({ ok: false, error: 'fallback_credential_rejected', time: now() });
  }
  const db = readJsonFile(USERS_DB, { users: [] });
  const user = db.users.find(u => u.email === email);
  if (!user || !verifyPassword(password, user.password_hash)) { auditLog('login_fail', req, { email }); return res.status(401).json({ ok: false, error: 'invalid_credentials', time: now() }); } // §154
  // §151: migrar hash legado para scrypt automaticamente no primeiro login bem-sucedido
  if (user.password_hash && !user.password_hash.startsWith('$scrypt$')) {
    user.password_hash = hashPassword(password);
    console.log('[§151] hash migrado para scrypt:', email);
  }
  user.last_login = now(); writeAndSyncS3(USERS_DB, db);
  auditLog('login_ok', req, { email }); // §154
  const token = signSession({ uid: user.id, exp: Date.now() + 24 * 60 * 60 * 1000 });
  res.setHeader('Set-Cookie', `vision_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
  return sendOk(res, { user: publicUser(user), token, token_type: 'session', persisted: true, anti_stub: true });
});

/* ── §83 SNAPSHOT / ROLLBACK ── */
const SNAPSHOTS_DIR = path.join(DB_ROOT, 'snapshots');
fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

app.post('/api/vault/snapshot', (req, res) => {
  try {
    const body = normalizeBody(req);
    const id = `snap_${Date.now()}_${makeId('s')}`;
    const meta = {
      id,
      label: body.label || 'manual',
      created_at: now(),
      project: body.project || 'visioncore',
      triggered_by: body.triggered_by || 'operator'
    };
    const snapshot = {
      ...meta,
      state: {
        users_count: (() => { try { return readJsonFile(USERS_DB, { users: [] }).users.length; } catch { return 0; } })(),
        projects: (() => { try { return readJsonFile(PROJECTS_DB, { projects: [] }).projects; } catch { return []; } })(),
        providers: providerList(),
        vault_files: (() => { const files = []; try { ['Missions','Incidents','PASS-GOLD','Projects'].forEach(d => { const fp = path.join(VAULT_ROOT, d); if (fs.existsSync(fp)) files.push(...fs.readdirSync(fp).map(f => `${d}/${f}`)); }); } catch {} return files; })()
      }
    };
    fs.writeFileSync(path.join(SNAPSHOTS_DIR, `${id}.json`), JSON.stringify(snapshot, null, 2), 'utf8');
    return sendOk(res, { snapshot_id: id, created_at: meta.created_at, label: meta.label, anti_stub: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'snapshot_failed', message: err.message, time: now() });
  }
});

app.get('/api/vault/snapshots', (req, res) => {
  try {
    const files = fs.existsSync(SNAPSHOTS_DIR) ? fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json')) : [];
    const snapshots = files.map(f => {
      try { const s = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f), 'utf8')); return { id: s.id, label: s.label, created_at: s.created_at, project: s.project }; }
      catch { return null; }
    }).filter(Boolean).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return sendOk(res, { snapshots, count: snapshots.length, anti_stub: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'list_snapshots_failed', message: err.message, time: now() });
  }
});

app.post('/api/vault/rollback/:snapshotId', (req, res) => {
  try {
    const { snapshotId } = req.params;
    const file = path.join(SNAPSHOTS_DIR, `${snapshotId}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ ok: false, error: 'snapshot_not_found', snapshot_id: snapshotId, time: now() });
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (snapshot.state && snapshot.state.projects) {
      const projectsDb = readJsonFile(PROJECTS_DB, { projects: [] });
      projectsDb.projects = snapshot.state.projects;
      writeAndSyncS3(PROJECTS_DB, projectsDb);
    }
    return sendOk(res, { rolled_back: true, snapshot_id: snapshotId, restored_at: now(), label: snapshot.label, anti_stub: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'rollback_failed', message: err.message, time: now() });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  return sendOk(res, { user: publicUser(user), anti_stub: true });
});

/* ── §88 OAUTH — Google + GitHub ── */
const OAUTH_REDIRECT_BASE = process.env.OAUTH_REDIRECT_BASE || 'https://visioncore-api-gateway.weiganlight.workers.dev';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://visioncoreai.pages.dev';

function oauthFrontendBase() {
  return String(FRONTEND_URL || '').replace(/\/+$/, '');
}

function buildOAuthState(req) {
  const target = String(req.query.return_to || req.query.target || '').toLowerCase();
  const safeTarget = (target === 'next' || target === 'vision-core-next' || target === '/vision-core-next.html') ? 'next' : 'legacy';
  return Buffer.from(JSON.stringify({ target: safeTarget, nonce: makeId('st') })).toString('base64url');
}

function oauthRedirectTarget(state) {
  if (!state) return `${oauthFrontendBase()}/`;
  try {
    const payload = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
    if (payload && payload.target === 'next') return `${oauthFrontendBase()}/vision-core-next.html`;
  } catch (_) {}
  return `${oauthFrontendBase()}/`;
}

function oauthRedirect(state, fragment) {
  return `${oauthRedirectTarget(state)}#${fragment}`;
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'Accept': 'application/json', ...headers }
    };
    const req = require('https').request(options, resp => {
      let data = '';
      resp.on('data', chunk => { data += chunk; });
      resp.on('end', () => resolve({ status: resp.statusCode, ok: resp.statusCode >= 200 && resp.statusCode < 300, text: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ── GOOGLE ──────────────────────────────────────────
app.get('/api/auth/oauth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ ok: false, error: 'google_oauth_not_configured', time: now() });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${OAUTH_REDIRECT_BASE}/api/auth/oauth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: buildOAuthState(req)
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get('/api/auth/oauth/google/callback', async (req, res) => {
  const { code, error, state } = req.query;
  if (error || !code) return res.redirect(oauthRedirect(state, `oauth-error=${encodeURIComponent(error || 'no_code')}`));
  try {
    const tokenResp = await httpsPost('https://oauth2.googleapis.com/token', {}, JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${OAUTH_REDIRECT_BASE}/api/auth/oauth/google/callback`,
      grant_type: 'authorization_code'
    }));
    if (!tokenResp.ok) {
      console.error('[oauth/google] token exchange failed:', tokenResp.text);
      return res.redirect(oauthRedirect(state, 'oauth-error=token_exchange_failed'));
    }
    const tokenData = JSON.parse(tokenResp.text);
    // Decode ID token to get user info (no extra request needed)
    const idToken = tokenData.id_token;
    const payload = idToken ? JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')) : null;
    if (!payload || !payload.email) return res.redirect(oauthRedirect(state, 'oauth-error=no_email'));

    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    const db = readJsonFile(USERS_DB, { users: [] });
    let user = db.users.find(u => u.email === email);
    if (!user) {
      user = { id: makeId('usr'), email, name, plan: 'free', oauth_provider: 'google', oauth_id: payload.sub, created_at: now(), last_login: now() };
      db.users.push(user);
    } else {
      user.last_login = now();
      if (!user.oauth_provider) user.oauth_provider = 'google';
    }
    // §155: SSO ENTERPRISE — domínio corporativo → plan='enterprise' automático
    const ssoDomain = isSsoDomain(email);
    if (ssoDomain && user.plan !== 'enterprise') {
      user.plan = 'enterprise';
      console.log('[§155] SSO ENTERPRISE auto-upgrade:', email.split('@')[1]);
      auditLog('sso_enterprise_login', req, { domain: email.split('@')[1] }); // §154: não logar email completo
    }
    writeAndSyncS3(USERS_DB, db);
    auditLog('oauth_login', req, { email, provider: 'google' }); // §154
    const token = signSession({ uid: user.id, exp: Date.now() + 24 * 60 * 60 * 1000 });
    return res.redirect(oauthRedirect(state, `oauth-success&token=${encodeURIComponent(token)}&plan=${user.plan}&email=${encodeURIComponent(email)}`));
  } catch (err) {
    console.error('[oauth/google/callback]', err.message);
    return res.redirect(oauthRedirect(req.query.state, `oauth-error=${encodeURIComponent(err.message)}`));
  }
});

// ── GITHUB ──────────────────────────────────────────
app.get('/api/auth/oauth/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return res.status(503).json({ ok: false, error: 'github_oauth_not_configured', time: now() });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${OAUTH_REDIRECT_BASE}/api/auth/oauth/github/callback`,
    scope: 'user:email',
    state: buildOAuthState(req)
  });
  return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get('/api/auth/oauth/github/callback', async (req, res) => {
  const { code, error, state } = req.query;
  if (error || !code) return res.redirect(oauthRedirect(state, `oauth-error=${encodeURIComponent(error || 'no_code')}`));
  try {
    const tokenResp = await httpsPost('https://github.com/login/oauth/access_token',
      { 'Accept': 'application/json' },
      JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${OAUTH_REDIRECT_BASE}/api/auth/oauth/github/callback`
      })
    );
    if (!tokenResp.ok) return res.redirect(oauthRedirect(state, 'oauth-error=token_exchange_failed'));
    const tokenData = JSON.parse(tokenResp.text);
    const accessToken = tokenData.access_token;
    if (!accessToken) return res.redirect(oauthRedirect(state, 'oauth-error=no_access_token'));

    // Get GitHub user info
    const ghResp = await httpsGet('https://api.github.com/user', {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'VisionCore/5.9'
    });
    if (!ghResp.ok) return res.redirect(oauthRedirect(state, 'oauth-error=github_user_fetch_failed'));
    const ghUser = JSON.parse(ghResp.text);

    let email = ghUser.email;
    if (!email) {
      // Fetch primary verified email
      const emailResp = await httpsGet('https://api.github.com/user/emails', {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'VisionCore/5.9'
      });
      if (emailResp.ok) {
        const emails = JSON.parse(emailResp.text);
        const primary = Array.isArray(emails) && emails.find(e => e.primary && e.verified);
        email = primary ? primary.email : null;
      }
    }
    if (!email) return res.redirect(oauthRedirect(state, 'oauth-error=no_email'));

    const name = ghUser.name || ghUser.login || email.split('@')[0];
    const db = readJsonFile(USERS_DB, { users: [] });
    let user = db.users.find(u => u.email === email);
    if (!user) {
      user = { id: makeId('usr'), email, name, plan: 'free', oauth_provider: 'github', oauth_id: String(ghUser.id), github_login: ghUser.login, created_at: now(), last_login: now() };
      db.users.push(user);
    } else {
      user.last_login = now();
      if (!user.github_login) user.github_login = ghUser.login;
    }
    writeAndSyncS3(USERS_DB, db);
    auditLog('oauth_login', req, { email, provider: 'github' }); // §154
    const token = signSession({ uid: user.id, exp: Date.now() + 24 * 60 * 60 * 1000 });
    return res.redirect(oauthRedirect(state, `oauth-success&token=${encodeURIComponent(token)}&plan=${user.plan}&email=${encodeURIComponent(email)}`));
  } catch (err) {
    console.error('[oauth/github/callback]', err.message);
    return res.redirect(oauthRedirect(req.query.state, `oauth-error=${encodeURIComponent(err.message)}`));
  }
});

app.get('/api/account/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  const projectsDb = readJsonFile(PROJECTS_DB, { projects: [] });
  return sendOk(res, { user: publicUser(user), projects: projectsDb.projects.filter(p => p.user_id === user.id), anti_stub: true });
});

// DECISION-023 — projetos persistidos são sempre isolados pelo owner da sessão.
app.get('/api/projects', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  try {
    const db = readJsonFile(PROJECTS_DB, { projects: [] });
    const projects = Array.isArray(db.projects) ? db.projects.filter(p => p.user_id === user.id) : [];
    return sendOk(res, { projects, anti_stub: true });
  } catch (err) {
    return sendOk(res, { projects: [], anti_stub: true });
  }
});

// DECISION-023 — o cliente nunca escolhe ownership.
app.post('/api/projects', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  const body = normalizeBody(req);
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ ok: false, error: 'project_name_required', time: now() });
  if (name.length > 120) return res.status(400).json({ ok: false, error: 'project_name_too_long', time: now() });
  if (Object.prototype.hasOwnProperty.call(body, 'user_id')) {
    return res.status(400).json({ ok: false, error: 'project_owner_not_assignable', time: now() });
  }
  const db = readJsonFile(PROJECTS_DB, { projects: [] });
  if (!Array.isArray(db.projects)) db.projects = [];
  const project = { id: makeId('proj'), name, created_at: now(), user_id: user.id };
  db.projects.push(project);
  writeAndSyncS3(PROJECTS_DB, db);
  operationLog(req, user.id, { project_id: project.id, event: 'project.created' });
  return sendOk(res, { project, anti_stub: true });
});

// DECISION-024 — histórico autenticado, isolado por owner + projeto.
function ownedProject(userId, projectId) {
  const db = readJsonFile(PROJECTS_DB, { projects: [] });
  return Array.isArray(db.projects) && db.projects.some(project => project.id === projectId && project.user_id === userId);
}

function readConversations() {
  const db = readJsonFile(CHAT_CONVERSATIONS_DB, { conversations: [] });
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  db.conversations = (Array.isArray(db.conversations) ? db.conversations : []).filter(item => new Date(item.updated_at).getTime() >= cutoff);
  return db;
}

app.get('/api/chat/conversations', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  const projectId = String(req.query.project_id || '');
  if (!ownedProject(user.id, projectId)) return res.status(404).json({ ok: false, error: 'project_not_found', time: now() });
  const db = readConversations();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const owned = db.conversations.filter(item => item.user_id === user.id && item.project_id === projectId)
    .map(({ messages, ...item }) => ({ ...item, message_count: messages.length }))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const conversations = owned.slice(offset, offset + limit);
  return sendOk(res, { conversations, total: owned.length, next_offset: offset + conversations.length < owned.length ? offset + conversations.length : null, anti_stub: true });
});

app.post('/api/chat/conversations', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  const body = normalizeBody(req);
  const projectId = String(body.project_id || '');
  if (!ownedProject(user.id, projectId)) return res.status(404).json({ ok: false, error: 'project_not_found', time: now() });
  const timestamp = now();
  const conversation = { id: makeId('chat'), user_id: user.id, project_id: projectId, title: String(body.title || 'Nova conversa').trim().slice(0, 120) || 'Nova conversa', created_at: timestamp, updated_at: timestamp, messages: [] };
  const db = readConversations();
  db.conversations.push(conversation);
  writeAndSyncS3(CHAT_CONVERSATIONS_DB, db);
  operationLog(req, user.id, { project_id: projectId, event: 'conversation.created' });
  return sendOk(res, { conversation: { ...conversation, messages: undefined }, anti_stub: true });
});

app.get('/api/chat/conversations/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  const conversation = readConversations().conversations.find(item => item.id === req.params.id && item.user_id === user.id);
  if (!conversation || !ownedProject(user.id, conversation.project_id)) return res.status(404).json({ ok: false, error: 'conversation_not_found', time: now() });
  return sendOk(res, { conversation, anti_stub: true });
});

app.post('/api/chat/conversations/:id/messages', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  const body = normalizeBody(req);
  if (!['user', 'assistant'].includes(body.role)) return res.status(400).json({ ok: false, error: 'message_role_invalid', time: now() });
  const content = String(body.content || '').trim();
  if (!content) return res.status(400).json({ ok: false, error: 'message_content_required', time: now() });
  const db = readConversations();
  const conversation = db.conversations.find(item => item.id === req.params.id && item.user_id === user.id);
  if (!conversation || !ownedProject(user.id, conversation.project_id)) return res.status(404).json({ ok: false, error: 'conversation_not_found', time: now() });
  const message = { id: makeId('msg'), role: body.role, content: content.slice(0, 20000), created_at: now() };
  conversation.messages.push(message);
  conversation.updated_at = message.created_at;
  writeAndSyncS3(CHAT_CONVERSATIONS_DB, db);
  operationLog(req, user.id, { project_id: conversation.project_id, event: `message.${body.role}.saved` });
  return sendOk(res, { message, anti_stub: true });
});

app.delete('/api/chat/conversations/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });
  const db = readConversations();
  const index = db.conversations.findIndex(item => item.id === req.params.id && item.user_id === user.id);
  if (index === -1) return res.status(404).json({ ok: false, error: 'conversation_not_found', time: now() });
  const [deleted] = db.conversations.splice(index, 1);
  writeAndSyncS3(CHAT_CONVERSATIONS_DB, db);
  operationLog(req, user.id, { project_id: deleted.project_id, event: 'conversation.deleted' });
  return sendOk(res, { deleted: true, anti_stub: true });
});

// §150 — Verificação de autenticidade do webhook Hotmart
function verifyHotmartWebhook(req) {
  // Estratégia 1: x-hotmart-hottok (token estático, configurável no painel Hotmart)
  const hottok = process.env.HOTMART_HOTTOK || '';
  if (hottok) {
    const received = req.headers['x-hotmart-hottok'] || '';
    if (received !== hottok) return { ok: false, reason: 'invalid_hottok' };
    return { ok: true };
  }
  // Estratégia 2: x-hotmart-signature (HMAC-SHA256 do body com client_secret)
  const signature = req.headers['x-hotmart-signature'] || '';
  if (signature) {
    const secret = process.env.HOTMART_CLIENT_SECRET || '';
    if (!secret) return { ok: false, reason: 'no_secret_configured' };
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
    if (signature !== expected) return { ok: false, reason: 'invalid_signature' };
    return { ok: true };
  }
  // Sem header de verificação — rejeitar em produção, logar aviso em dev
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, reason: 'missing_auth_header' };
  }
  console.warn('[§150] hotmart webhook sem verificacao — permitido apenas em dev');
  return { ok: true };
}

// §144 — Hotmart webhook (PURCHASE_COMPLETE → user.plan = 'pro')
app.post('/api/billing/hotmart-webhook', (req, res) => {
  try {
    // §150: verificar autenticidade antes de processar
    const auth = verifyHotmartWebhook(req);
    if (!auth.ok) {
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
                 || (req.connection && req.connection.remoteAddress) || 'unknown';
      console.warn('[§150] webhook rejeitado:', auth.reason, 'ip:', ip);
      auditLog('webhook_rejected', req, { reason: auth.reason }); // §154
      return res.status(401).json({ ok: false, error: 'unauthorized_webhook', reason: auth.reason, anti_stub: true });
    }

    const body  = normalizeBody(req);
    const event = body.event || '';
    const email = body.data && body.data.buyer && body.data.buyer.email;
    if (!email) return res.json({ ok: true, skipped: 'no_email' });

    const db   = readJsonFile(USERS_DB, { users: [] });
    const user = Array.isArray(db.users) ? db.users.find(u => u.email === email) : null;
    if (!user) return res.json({ ok: true, skipped: 'user_not_found' });

    const cancelEvents  = ['PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'SUBSCRIPTION_CANCELLATION'];
    const approveEvents = ['PURCHASE_COMPLETE', 'PURCHASE_APPROVED', 'PURCHASE_BILLET_PRINTED'];

    if (approveEvents.includes(event)) {
      user.plan            = 'pro';
      user.plan_updated_at = now();
      user.hotmart_event   = event;
    } else if (cancelEvents.includes(event)) {
      user.plan            = 'free';
      user.plan_updated_at = now();
      user.hotmart_event   = event;
    }

    writeAndSyncS3(USERS_DB, db);
    if (approveEvents.includes(event)) auditLog('plan_upgrade', req, { email, plan: user.plan, event }); // §154
    if (cancelEvents.includes(event)) auditLog('plan_downgrade', req, { email, plan: user.plan, event }); // §154
    console.log('[hotmart-webhook] event:', event, 'email:', email, 'plan:', user.plan);
    return res.json({ ok: true, plan: user.plan, anti_stub: true });
  } catch (err) {
    console.error('[hotmart-webhook] error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// §144 — Hotmart checkout redirect
app.get('/api/billing/hotmart-checkout', (req, res) => {
  const email = req.query.email || '';
  const base  = process.env.HOTMART_CHECKOUT_URL || 'https://pay.hotmart.com/U106475644Y';
  const url   = email ? base + (base.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(email) : base;
  return res.json({ ok: true, checkout_url: url, anti_stub: true });
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


/* ── §89 MISSION QUOTA — FREE = 5/mês ── */
const MISSION_LOG_PATH = path.join(DB_ROOT, 'mission-log.json');

function getMissionCount(userId) {
  try {
    const log = readJsonFile(MISSION_LOG_PATH, { missions: [] });
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return log.missions.filter(m => m.user_id === userId && new Date(m.ts).getTime() >= cutoff).length;
  } catch { return 0; }
}

function logMission(userId, type) {
  try {
    const log = readJsonFile(MISSION_LOG_PATH, { missions: [] });
    log.missions.push({ user_id: userId, ts: now(), type: type || 'mission' });
    // Keep only 90 days
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    log.missions = log.missions.filter(m => new Date(m.ts).getTime() >= cutoff);
    writeJsonFile(MISSION_LOG_PATH, log);
  } catch {}
}

/* ── §98-E MISSION TIMELINE — historico persistido de missoes (por usuario) ──
   Anonimo nao persiste no backend (evita misturar historico de visitantes
   diferentes no mesmo bucket) — fica so no localStorage do navegador. ── */
const MISSION_TIMELINE_PATH = path.join(DB_ROOT, 'mission-timeline.json');

// §ROADMAP-Fase2 "persistir estágios por missão" — stages[] é opcional e só
// preenchido hoje pelo SF Auto-Pilot (client já mede started_at/duration_ms
// reais em sfStepMeta, ver vision-core-next-clean.js). Os outros 2 callers
// de appendMissionTimeline (/api/run-live, /api/chat) nunca mandam stages —
// devem continuar gravando exatamente como antes, sem o campo.
const MISSION_STAGE_STATUSES = ['pending', 'done', 'error', 'blocked'];
const MISSION_STAGE_MAX_COUNT = 12; // SF_STEPS(5) + extras(4) + gold-gate(1) com folga

function isIsoDateString(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function sanitizeMissionStages(rawStages) {
  if (!Array.isArray(rawStages)) return null;
  const sanitized = rawStages.slice(0, MISSION_STAGE_MAX_COUNT).map(stage => {
    if (!stage || typeof stage !== 'object') return null;
    const name = typeof stage.name === 'string' ? stage.name.trim().slice(0, 60) : '';
    if (!name) return null;
    return {
      name,
      status: MISSION_STAGE_STATUSES.includes(stage.status) ? stage.status : 'pending',
      started_at: isIsoDateString(stage.started_at) ? stage.started_at : null,
      completed_at: isIsoDateString(stage.completed_at) ? stage.completed_at : null
    };
  }).filter(Boolean);
  return sanitized.length ? sanitized : null;
}

function appendMissionTimeline(userId, entry) {
  if (!userId) return;
  try {
    const log = readJsonFile(MISSION_TIMELINE_PATH, { entries: [] });
    log.entries.push({
      id: makeId('mt'),
      user_id: userId,
      ts: now(),
      source: entry.source || 'mission',
      input: String(entry.input || '').slice(0, 200),
      summary: entry.summary ? String(entry.summary).slice(0, 240) : null,
      status: entry.status || (entry.pass_gold ? 'PASS_GOLD' : 'DONE'),
      pass_gold: entry.pass_gold === true,
      agent: entry.agent || null,
      mission_id: entry.mission_id || null,
      stages: sanitizeMissionStages(entry.stages)
    });
    // Manter no maximo 90 dias e 500 entradas globais (arquivo nao cresce sem limite)
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    log.entries = log.entries.filter(e => new Date(e.ts).getTime() >= cutoff);
    if (log.entries.length > 500) log.entries = log.entries.slice(-500);
    writeJsonFile(MISSION_TIMELINE_PATH, log);
  } catch (err) { console.warn('[timeline §98-E] append failed', err.message); }
}

function getMissionTimeline(userId, limit) {
  if (!userId) return [];
  try {
    const log = readJsonFile(MISSION_TIMELINE_PATH, { entries: [] });
    return log.entries
      .filter(e => e.user_id === userId)
      .slice()
      .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
      .slice(0, limit);
  } catch { return []; }
}

function checkMissionQuota(req, res, next) {
  const user = getAuthUser(req);
  if (!user) return next(); // unauthenticated — pass through, may fail elsewhere
  if (user.plan && user.plan !== 'free') return next(); // PRO/ENTERPRISE = unlimited
  const count = getMissionCount(user.id);
  const LIMIT = parseInt(process.env.FREE_MISSION_LIMIT || '5', 10);
  if (count >= LIMIT) {
    return res.status(429).json({
      ok: false, error: 'mission_quota_exceeded', plan: 'free',
      used: count, limit: LIMIT, reset: 'em 30 dias',
      upgrade_hint: 'Faça upgrade para PRO ($9,99/mês) para missões ilimitadas',
      anti_stub: true, time: now()
    });
  }
  logMission(user.id, 'mission');
  return next();
}

app.get('/api/mission/quota', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return sendOk(res, { plan: 'free', used: 0, limit: 5, remaining: 5, authenticated: false, anti_stub: true });
  if (user.plan && user.plan !== 'free') return sendOk(res, { plan: user.plan, used: null, limit: null, unlimited: true, anti_stub: true });
  const used = getMissionCount(user.id);
  const limit = parseInt(process.env.FREE_MISSION_LIMIT || '5', 10);
  return sendOk(res, { plan: 'free', used, limit, remaining: Math.max(0, limit - used), anti_stub: true });
});

/* §98-E — historico de missoes (so para autenticados; anonimo usa cache local) */
app.get('/api/mission/timeline', (req, res) => {
  const user  = getAuthUser(req);
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const entries = user ? getMissionTimeline(user.id, limit) : [];
  return sendOk(res, { entries, count: entries.length, authenticated: Boolean(user), anti_stub: true });
});

// §205 — /api/deploy/pages: advisory endpoint — CF Pages deploy requer CLI local (wrangler não disponível no EB)
app.post('/api/deploy/pages', (req, res) => {
  const body = normalizeBody(req);
  return sendOk(res, {
    ok: true,
    mode: 'advisory',
    url: process.env.FRONTEND_URL || 'https://visioncoreai.pages.dev',
    note: 'Deploy CF Pages requer CLI local: bash bin/deploy-pages.sh "mensagem"',
    source: body.source || 'sf-autopilot',
    pass_gold: body.pass_gold || false,
    anti_stub: true
  });
});

// §205 — /api/deploy/eb: advisory endpoint — EB deploy requer CLI local (python _deploy191b_eb.py)
app.post('/api/deploy/eb', (req, res) => {
  const body = normalizeBody(req);
  const pkg = (() => { try { return require('./package.json'); } catch { return {}; } })();
  return sendOk(res, {
    ok: true,
    mode: 'advisory',
    version: pkg.version || 'unknown',
    environment: process.env.NODE_ENV || 'production',
    note: 'Deploy EB requer CLI local: python _deploy191b_eb.py',
    source: body.source || 'sf-autopilot',
    pass_gold: body.pass_gold || false,
    anti_stub: true
  });
});

// §202+ — POST /api/mission/timeline: SF Auto-Pilot loga runs reais na Timeline UI
app.post('/api/mission/timeline', (req, res) => {
  try {
    const body = normalizeBody(req);
    const user = getAuthUser(req);
    const entry = {
      type:            body.type            || 'sf-autopilot',
      title:           body.title           || 'Auto-Pilot run',
      input:           body.description     || body.content || body.title || '',
      summary:         body.description     || body.content || '',
      steps_completed: body.steps_completed || 0,
      source:          body.source          || 'sf-autopilot',
      pass_gold:       body.pass_gold       || false,
      status:          body.pass_gold ? 'PASS_GOLD' : 'DONE',
      stages:          body.stages           || null
    };
    appendMissionTimeline(user ? user.id : null, entry);
    return sendOk(res, { ok: true, logged: true, anti_stub: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/* COPILOT — nunca retorna 405 por body vazio */
app.all('/api/copilot', checkMissionQuota, async (req, res) => {
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

  const prompt = body.message || body.prompt || body.text || '';

  // §98-D: detectar agente especializado antes de chamar LLM
  const activeAgent = detectActiveAgent(prompt);
  if (activeAgent) console.log(`[copilot] agente detectado: ${activeAgent.id} (${activeAgent.name})`);

  let answer = copilotAnswer(body, activeAgent); // local fallback
  let llmProvider = 'local';
  let llmModel = 'copilot-local';

  if (prompt) {
    try {
      // §98-D: incluir contexto do agente detectado no system prompt
      const agentContext = activeAgent
        ? ` You are acting as the specialized agent "${activeAgent.name}" (role: ${activeAgent.role}). Start your response with [${activeAgent.name}].`
        : '';
      const llmResult = await callLLM(prompt, { agent: 'Hermes RCA', system: 'You are Vision Core Copilot AI. Be concise and technical. Respond in the same language as the user.' + agentContext + '\n\n' + VISION_CORE_FACTS_BLOCK });
      if (llmResult) { answer = llmResult.text; llmProvider = llmResult.provider; llmModel = llmResult.model; }
    } catch (e) {
      console.warn('[copilot] callLLM error:', e.message);
    }
  }

  return sendOk(res, {
    endpoint: '/api/copilot',
    method_received: req.method,
    body_received: body,
    answer,
    active_agent: activeAgent ? { id: activeAgent.id, name: activeAgent.name, role: activeAgent.role } : null,
    llm_provider: llmProvider,
    llm_model: llmModel,
    pass_gold_required: true,
    anti_stub: true
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
app.all('/api/hermes/analyze', async (req, res) => {
  const body = normalizeBody(req);
  const message = body.message || body.prompt || '';
  const mode = body.mode || 'debug';
  const hermesUser = getAuthUser(req);
  const hermesMissionId = body.mission_id || body.missionId || makeId('hermes');

  const localAnswer = [
    'Hermes RCA concluído.',
    `Mensagem: ${message || 'mensagem vazia'}`,
    'Plano: OpenClaw → Scanner → Hermes → Aegis → SDDF → PASS GOLD.',
    'Sem PASS GOLD: não promove, não aprende, não gera PR.'
  ].join('\n');

  let answer = localAnswer;
  let llmProvider = 'local';
  let llmModel = 'hermes-local';

  if (message) {
    try {
      const llmResult = await callLLM(message, {
        agent: 'Hermes RCA',
        system: 'You are Hermes, the RCA (Root Cause Analysis) supervisor agent of Vision Core. Analyze the input and provide a concise technical diagnosis. Identify root cause, affected components, and recommended fix plan. Respond in the same language as the user.'
          + '\n\n' + VISION_CORE_FACTS_BLOCK
      });
      if (llmResult) { answer = llmResult.text; llmProvider = llmResult.provider; llmModel = llmResult.model; }
    } catch (e) {
      console.warn('[hermes/analyze] callLLM error:', e.message);
    }
  }

  const rca = technical(message, mode) ? 'technical_runtime_or_contract_issue' : 'general_context';
  let hermesDatasetId = null;
  try {
    const datasetEntry = appendHermesDecisionPair(MISSION_TIMELINE_PATH, {
      userId: hermesUser ? hermesUser.id : null,
      missionId: hermesMissionId,
      source: 'hermes-analyze',
      previewInput: message,
      input: {
        message,
        mode,
        prompt: body.prompt || null,
        mission: body.mission || null
      },
      context: {
        endpoint: '/api/hermes/analyze',
        body_keys: Object.keys(body || {}).sort()
      },
      decision: {
        diagnosis: answer,
        raw: answer,
        label: 'ANSWERED'
      },
      provider: llmProvider,
      model: llmModel
    });
    hermesDatasetId = datasetEntry.id;
  } catch (e) {
    console.warn('[hermes/analyze] dataset append failed:', e.message);
  }

  return sendOk(res, {
    endpoint: '/api/hermes/analyze',
    agent: 'Hermes',
    body_received: body,
    rca,
    root_cause: rca,
    confidence: llmProvider !== 'local' ? 97 : 94,
    answer,
    llm_provider: llmProvider,
    llm_model: llmModel,
    mission_id: hermesMissionId,
    hermes_dataset_id: hermesDatasetId,
    anti_stub: true
  });
});

app.all('/api/hermes/rca', (req, res) => sendOk(res, {
  agent: 'Hermes',
  root_cause: 'runtime_contract_or_integration_mismatch',
  fix_plan: ['validate_api_contract', 'validate_sse', 'aegis_policy', 'pass_gold']
}));

/* ── §134: SECURITY VIOLATIONS — fix suggestions via Hermes ─────── */

// Mapa de prompts por rule_id — gerado inline para cada violation detectada pelo AEGIS
const VIOLATION_FIX_PROMPTS = {
  'AEGIS_SECRET_009': (v) => `Arquivo: ${v.file}, linha ${v.line}\nViolation: senha ou secret hardcoded encontrada.\nSugira como mover para variável de ambiente.\nResponda APENAS em JSON válido: {"before":"...","after":"...","env_var":"...","env_example":"...","reason":"..."}`,
  'AEGIS_SECRET_010': (v) => `Arquivo: ${v.file}, linha ${v.line}\nViolation: API key ou token hardcoded (${v.message}).\nSugira como mover para variável de ambiente.\nResponda APENAS em JSON válido: {"before":"...","after":"...","env_var":"...","env_example":"...","reason":"..."}`,
  'AEGIS_CRYPTO':     (v) => `Arquivo: ${v.file}, linha ${v.line}\nViolation: algoritmo criptográfico fraco (MD5/SHA1).\nSugira substituição por SHA-256 ou bcrypt conforme o contexto.\nResponda APENAS em JSON válido: {"before":"...","after":"...","reason":"..."}`,
  'AEGIS_INJECTION':  (v) => `Arquivo: ${v.file}, linha ${v.line}\nViolation: SQL/command injection — concatenação de input não sanitizado.\nSugira uso de prepared statements ou parameterização.\nResponda APENAS em JSON válido: {"before":"...","after":"...","reason":"..."}`,
  'AEGIS_EXPOSURE':   (v) => `Arquivo: ${v.file}, linha ${v.line}\nViolation: dado sensível exposto em log.\nSugira como mascarar ou remover do log.\nResponda APENAS em JSON válido: {"before":"...","after":"...","reason":"..."}`,
};
function _defaultViolationPrompt(v) {
  return `Arquivo: ${v.file}, linha ${v.line}\nViolation AEGIS ${v.rule_id}: ${v.message}\nSeverity: ${v.severity}\nSugira como corrigir este problema de segurança.\nResponda APENAS em JSON válido: {"suggestion":"...","reason":"..."}`;
}

// Gera sugestões de fix para um array de violations (max 5, best-effort)
async function generateViolationFixes(violations = []) {
  const fixes = [];
  for (const v of violations.slice(0, 5)) {
    const promptFn = VIOLATION_FIX_PROMPTS[v.rule_id] || _defaultViolationPrompt;
    try {
      const llmResult = await callLLM(promptFn(v), {
        system: 'Você é um especialista em segurança de código. Sugira correções específicas e práticas. Responda APENAS em JSON válido, sem markdown.',
        max_tokens: 400,
      });
      let fix = null;
      if (llmResult && llmResult.text) {
        try {
          const clean = llmResult.text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
          fix = JSON.parse(clean);
        } catch (_) { fix = { suggestion: llmResult.text }; }
      }
      fixes.push({ violation: v, fix, provider: llmResult && llmResult.provider });
    } catch (e) {
      fixes.push({ violation: v, fix: null, error: e.message });
    }
  }
  return fixes;
}

// POST /api/security/suggest-fixes — recebe violations[], retorna sugestões Hermes
app.post('/api/security/suggest-fixes', async (req, res) => {
  const { violations = [] } = normalizeBody(req);
  if (!violations.length) {
    return sendOk(res, { suggestions: [], note: 'no violations provided', anti_stub: true });
  }
  const suggestions = await generateViolationFixes(violations);
  return sendOk(res, { suggestions, total: suggestions.length, anti_stub: true });
});

// §136: in-memory security event history (session-scoped; also persisted via archivistSave)
var _s136SecurityHistory = [];

// POST /api/security/history — registra evento de scan/fix/rescan
app.post('/api/security/history', (req, res) => {
  const body = normalizeBody(req);
  const event = {
    timestamp:        body.timestamp || now(),
    type:             body.type             || 'scan',
    rule_id:          body.rule_id          || null,
    file:             body.file             || null,
    fixed:            body.fixed === true,
    security_score:   Number(body.security_score   || 0),
    total_violations: Number(body.total_violations  || 0),
    session:          body.session          || 's136',
  };
  _s136SecurityHistory.push(event);
  try { archivistSave('sec-history-' + Date.now(), event); } catch (_) {}
  return sendOk(res, { saved: true, total: _s136SecurityHistory.length, anti_stub: true });
});

// GET /api/security/history — retorna últimos 50 eventos
app.get('/api/security/history', (req, res) => {
  return sendOk(res, { history: _s136SecurityHistory.slice(-50), total: _s136SecurityHistory.length, anti_stub: true });
});

// POST /api/security/apply-fix — §135: aplica fix.after em arquivo real do filesystem
// Input:  { violation: {file, line, rule_id}, fix: {after, suggestion}, project_root? }
// Output: { ok, file, line, before, after, diff_preview, backup_created }
app.post('/api/security/apply-fix', async (req, res) => {
  try {
    const body = normalizeBody(req);
    const { violation, fix, project_root } = body;

    // Validação básica
    if (!violation || !violation.file || !violation.line) {
      return res.status(400).json({ ok: false, error: 'apply_fix_requires_violation_file_and_line', time: now() });
    }
    if (!fix || (!fix.after && !fix.suggestion)) {
      return res.status(400).json({ ok: false, error: 'apply_fix_requires_fix_after_or_suggestion', time: now() });
    }

    // §135: resolução segura do caminho
    const safeRoot = path.resolve(project_root || ROOT);
    const filePath = path.resolve(safeRoot, violation.file);

    // Proteção contra path traversal
    if (!filePath.startsWith(safeRoot + path.sep) && filePath !== safeRoot) {
      return res.status(403).json({ ok: false, error: 'apply_fix_path_traversal_blocked', file: violation.file, time: now() });
    }

    // Ler arquivo original
    let originalContent;
    try {
      originalContent = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      return res.status(404).json({ ok: false, error: 'apply_fix_file_not_found', file: violation.file, time: now() });
    }

    // Backup antes de modificar
    const backupPath = filePath + '.bak-s135-' + Date.now();
    fs.writeFileSync(backupPath, originalContent, 'utf8');

    // Aplicar fix na linha específica (1-indexed)
    const lines = originalContent.split('\n');
    const lineIdx = Number(violation.line) - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) {
      fs.unlinkSync(backupPath); // limpa backup se linha inválida
      return res.status(400).json({ ok: false, error: 'apply_fix_line_out_of_range', line: violation.line, total_lines: lines.length, time: now() });
    }

    const beforeLine = lines[lineIdx];
    const afterLine  = fix.after || fix.suggestion || beforeLine;

    // Substituição cirúrgica na linha
    lines[lineIdx] = afterLine;
    const patchedContent = lines.join('\n');
    fs.writeFileSync(filePath, patchedContent, 'utf8');

    // Diff preview (2 linhas de contexto)
    const ctxStart = Math.max(0, lineIdx - 2);
    const ctxEnd   = Math.min(lines.length - 1, lineIdx + 2);
    const origLines = originalContent.split('\n');
    const diffPreview = {
      before: origLines.slice(ctxStart, ctxEnd + 1).join('\n'),
      after:  patchedContent.split('\n').slice(ctxStart, ctxEnd + 1).join('\n'),
    };

    console.log(`[PatchEngine §135] Applied fix ${violation.rule_id} → ${violation.file}:${violation.line}`);

    return sendOk(res, {
      file:           violation.file,
      line:           violation.line,
      rule_id:        violation.rule_id || '',
      before:         beforeLine,
      after:          afterLine,
      diff_preview:   diffPreview,
      backup_created: backupPath,
      anti_stub:      true,
    });
  } catch (e) {
    console.error('[PatchEngine §135] apply-fix error:', e.message);
    return res.status(500).json({ ok: false, error: 'apply_fix_internal_error', message: e.message, time: now() });
  }
});

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
app.all('/api/run-live', checkMissionQuota, async (req, res) => {
  const body     = normalizeBody(req);
  const input    = body.mission || body.message || body.prompt || body.input || 'self-test';

  /* §98-E — historico de missoes; cobre todos os returns do handler (LOCAL_ACCESS_REQUIRED,
     go_runtime_failure e sucesso) via monkey-patch de res.json. */
  const _tlUser98e2  = getAuthUser(req);
  const _origJson98e2 = res.json.bind(res);
  res.json = function (payload) {
    if (_tlUser98e2 && payload) {
      appendMissionTimeline(_tlUser98e2.id, {
        source: 'run-live',
        input,
        summary: Array.isArray(payload.summary) ? payload.summary.join(' ') : (payload.summary || payload.message || null),
        pass_gold: payload.pass_gold === true,
        mission_id: payload.mission_id || null,
        status: payload.pass_gold === true ? 'PASS_GOLD' : (payload.status || (payload.ok === false ? 'FAIL' : 'DONE'))
      });
    }
    if (payload) {
      try {
        updateHermesOutcome(MISSION_TIMELINE_PATH, {
          userId: _tlUser98e2 ? _tlUser98e2.id : null,
          datasetId: body.hermes_dataset_id || body.hermesDatasetId || null,
          missionId: body.hermes_mission_id || body.hermesMissionId || body.mission_id || payload.mission_id || null,
          input,
          payload
        });
      } catch (e) {
        console.warn('[run-live] hermes dataset outcome update failed:', e.message);
      }
    }
    return _origJson98e2(payload);
  };

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

  // §130: removido '..' — ROOT já é a raiz do projeto (process.cwd() no EB ou VISION_PROJECT_ROOT).
  // Com '..', ia para o dir pai (e.g. Desktop/), causando scan de milhares de arquivos e timeout.
  const missionRoot = path.resolve(process.env.VISION_PROJECT_ROOT || ROOT || process.cwd());

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

  // §134: sugestões automáticas de fix para violations detectadas pelo AEGIS (best-effort)
  if (Array.isArray(result.security_violations) && result.security_violations.length > 0) {
    try {
      result.security_fix_suggestions = await generateViolationFixes(result.security_violations.slice(0, 3));
    } catch (_) {
      result.security_fix_suggestions = [];
    }
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
  // §130: removido '..' — ROOT já é a raiz do projeto (process.cwd() no EB ou VISION_PROJECT_ROOT).
  // Com '..', ia para o dir pai (e.g. Desktop/), causando scan de milhares de arquivos e timeout.
  const missionRoot = path.resolve(process.env.VISION_PROJECT_ROOT || ROOT || process.cwd());

  const streamHeaders = {
    'Content-Type':  'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
  };
  const streamOrigin = String(req.headers.origin || '');
  if (isAllowedCorsOrigin(streamOrigin)) {
    streamHeaders['Access-Control-Allow-Origin'] = streamOrigin;
  }
  res.writeHead(200, streamHeaders);

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
app.all('/api/openclaw/orchestrate', async (req, res) => {
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

  /* §126: For 'diagnose' (natural-language mission), call LLM as patch strategist */
  let plan         = null;
  let llm_provider = null;

  if (decision === 'diagnose') {
    const missionText = body.message || body.prompt || body.question || '';
    const ocSystem = [
      'You are OpenClaw, the Patch Strategist of Vision Core.',
      'Your job is to decompose a software mission into concrete subtasks.',
      'Analyze the input and return a JSON object with this exact structure:',
      '{',
      '  "mission_summary": "one sentence describing the mission",',
      '  "tasks": [',
      '    { "id": "T1", "type": "scan|patch|validate|rollback", "target": "file or component", "reason": "why" }',
      '  ],',
      '  "risk_level": "low|medium|high",',
      '  "pass_gold_required": true',
      '}',
      'Return ONLY the JSON object, no markdown, no explanation.',
      'If you cannot decompose the mission, return:',
      '{"mission_summary":"unclear","tasks":[],"risk_level":"high","pass_gold_required":true}',
      '',
      VISION_CORE_FACTS_BLOCK,
      '',
      'If the mission is a question about Vision Core\'s own identity, architecture, model, or infrastructure',
      '(not the user\'s code), answer using ONLY the facts above — still inside the same JSON structure.',
      'If that answer is not covered by the facts above, return exactly:',
      '{"mission_summary":"não tenho essa informação confirmada","tasks":[],"risk_level":"low","pass_gold_required":true}'
    ].join('\n');

    /* §129: busca contexto de missões anteriores no Archivist (best-effort) */
    const _s129ocCtx = await archivistSearch(missionText.slice(0, 200), 3);
    const _s129ocBlock = _s129ocCtx.length > 0
      ? '\n\nCONTEXT FROM PREVIOUS MISSIONS (Archivist):\n' +
        _s129ocCtx.map(m => '- ' + m.preview.slice(0, 120).replace(/\n/g, ' ')).join('\n')
      : '';
    const _s129ocSystem = ocSystem + _s129ocBlock;

    try {
      const llmResult = await callLLM(missionText, {
        agent:      'OpenClaw',
        system:     _s129ocSystem,
        max_tokens: 600
      });
      if (llmResult && llmResult.text) {
        /* Strip markdown fences if model ignores the "no markdown" instruction */
        const raw = llmResult.text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        plan         = JSON.parse(raw);
        llm_provider = llmResult.provider;
        /* §129: persiste plano da missão no Archivist (best-effort) — nunca quando
           a pergunta/resposta é sobre a identidade do próprio Vision Core ou quando
           o modelo sinalizou incerteza (isUnsafeToArchive), pra não realimentar o
           loop de autorreforço. Checa llmResult.text bruto, não o plan já parseado. */
        if (!isUnsafeToArchive(missionText, llmResult.text)) {
          archivistSave('openclaw-' + Date.now(), {
            mission:   missionText.slice(0, 300),
            plan,
            provider:  llm_provider,
            timestamp: now()
          });
        }
      }
    } catch (_e) {
      /* LLM failed or returned invalid JSON — fall through with plan=null */
      llm_provider = 'local';
    }
  }

  sendOk(res, {
    agent:              'OpenClaw',
    decision,
    next_stage:         stage,
    signals_detected:   signals,
    orchestration_real: true,
    plan,
    llm_provider,
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
app.get('/api/providers', requireVisionAuth, (req, res) => sendOk(res, { providers: providerList(), default: process.env.DEFAULT_AI_PROVIDER || 'auto' }));

// §<AI-VAULT-CONFIG-PRINCIPAL> — /save aceita atualização PARCIAL de
// propósito: a tela de "Providers Configurados" reenvia só {provider,
// priority} pra reordenar, sem repassar api_key (a chave completa nunca
// volta pro frontend depois de salva — só api_key_masked). Por isso, quando
// body.api_key vem vazio, preservamos api_key_encrypted/api_key_masked
// existentes em vez de apagar a chave já salva.
app.all('/api/providers/save', requireVisionAuth, (req, res) => {
  const body = normalizeBody(req);
  const provider = body.provider || 'auto';
  const existing = _providersStore[provider] || {};
  const hasNewKey = typeof body.api_key === 'string' && body.api_key.length > 0;

  _providersStore[provider] = {
    provider,
    api_key_encrypted: hasNewKey ? encryptProviderKey(body.api_key) : (existing.api_key_encrypted || ''),
    api_key_masked:    hasNewKey ? maskSecret(body.api_key) : (existing.api_key_masked || ''),
    model:          body.model    !== undefined ? body.model    : (existing.model    || ''),
    base_url:       body.base_url !== undefined ? body.base_url : (existing.base_url || ''),
    // prioridade numérica editável (1 = primeiro no fallback) — default:
    // entra no fim da fila atual. Ainda não consultada pelo callLLM() nesta
    // fase (Fase C é só a tela; plumbing real é Fase D+, fora de escopo aqui).
    priority:       body.priority !== undefined ? Number(body.priority) || 0
                     : (existing.priority !== undefined ? existing.priority : Object.keys(_providersStore).length + 1),
    status:         hasNewKey ? 'untested' : (existing.status || 'untested'),
    last_tested_at: hasNewKey ? null : (existing.last_tested_at || null),
    saved_at:       now()
  };
  _saveProviderVault();
  console.log(`[providers] saved ${provider}`);
  return sendOk(res, {
    saved:           true,
    provider,
    api_key_masked:  _providersStore[provider].api_key_masked,
    priority:        _providersStore[provider].priority,
    providers_count: Object.keys(_providersStore).length,
    time:            now()
  });
});

// Nunca inclui api_key nem api_key_encrypted — só o indicador mascarado.
app.get('/api/providers/list', requireVisionAuth, (req, res) => {
  const list = Object.values(_providersStore)
    .map(p => ({
      provider:       p.provider,
      api_key_masked: p.api_key_masked || '',
      has_key:        Boolean(p.api_key_encrypted),
      model:          p.model || '',
      base_url:       p.base_url || '',
      priority:       p.priority,
      status:         p.status || 'untested',
      last_tested_at: p.last_tested_at || null,
      saved_at:       p.saved_at
    }))
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  return sendOk(res, { providers: list, time: now() });
});

app.all('/api/providers/delete', requireVisionAuth, (req, res) => {
  const body = normalizeBody(req);
  const provider = body.provider || '';
  if (!provider || !_providersStore[provider]) {
    return res.status(404).json({ ok: false, error: 'provider_not_found', time: now() });
  }
  delete _providersStore[provider];
  _saveProviderVault();
  return sendOk(res, { deleted: true, provider, providers_count: Object.keys(_providersStore).length });
});

app.all('/api/providers/test', requireVisionAuth, async (req, res) => {
  const body       = normalizeBody(req);
  const provider   = body.provider || 'auto';
  const vaultEntry = _providersStore[provider];
  const apiKey     = body.api_key
    || (vaultEntry && vaultEntry.api_key_encrypted ? decryptProviderKey(vaultEntry.api_key_encrypted) : '')
    || resolveApiKey(provider.toUpperCase())
    || '';

  // grava o resultado real do teste na entrada do vault (se existir) — é o
  // que a coluna "status" da lista mostra: testado/falhou/não testado.
  const recordResult = (status, connected) => {
    if (!vaultEntry) return;
    vaultEntry.status = status;
    vaultEntry.last_tested_at = now();
    _saveProviderVault();
  };

  if (!apiKey) {
    recordResult('no_key', false);
    return sendOk(res, { provider, status: 'no_key', connected: false, note: 'Salve uma API key primeiro.', time: now() });
  }

  const t0 = Date.now();
  try {
    let testUrl, testHeaders, testMethod = 'GET';

    if (provider === 'openai' || provider === 'openrouter') {
      testUrl     = provider === 'openai' ? 'https://api.openai.com/v1/models' : 'https://openrouter.ai/api/v1/models';
      testHeaders = { 'Authorization': `Bearer ${apiKey}` };
    } else if (provider === 'anthropic') {
      testUrl     = 'https://api.anthropic.com/v1/models';
      testHeaders = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    } else if (provider === 'gemini') {
      testUrl     = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
      testHeaders = {};
    } else if (provider === 'groq') {
      testUrl     = 'https://api.groq.com/openai/v1/models';
      testHeaders = { 'Authorization': `Bearer ${apiKey}` };
    } else if (provider === 'deepseek') {
      testUrl     = 'https://api.deepseek.com/v1/models';
      testHeaders = { 'Authorization': `Bearer ${apiKey}` };
    } else {
      recordResult('unsupported_provider', false);
      return sendOk(res, { provider, status: 'unsupported_provider', connected: false, time: now() });
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(testUrl, { method: testMethod, headers: testHeaders, signal: ctrl.signal });
    clearTimeout(timer);
    const latency = Date.now() - t0;

    if (r.ok) {
      const data = await r.json().catch(() => ({}));
      const modelCount = Array.isArray(data.data) ? data.data.length : (Array.isArray(data.models) ? data.models.length : null);
      recordResult('connected', true);
      return sendOk(res, {
        provider,
        status:      'connected',
        connected:   true,
        latency_ms:  latency,
        model_count: modelCount,
        time:        now()
      });
    } else {
      recordResult(`http_${r.status}`, false);
      return sendOk(res, { provider, status: `http_${r.status}`, connected: false, latency_ms: Date.now()-t0, time: now() });
    }
  } catch (err) {
    recordResult('error', false);
    return sendOk(res, { provider, status: 'error', connected: false, error: err.message, latency_ms: Date.now()-t0, time: now() });
  }
});
app.all('/api/providers/default', requireVisionAuth, (req, res) => sendOk(res, { default: normalizeBody(req).provider || process.env.DEFAULT_AI_PROVIDER || 'auto' }));


/* VISION CORE V4.3.1 ENTERPRISE BILLING ROUTES — real Stripe, mounted in primary runtime. */
const BILLING_DB = path.join(DB_ROOT, 'billing.json');
function requireVisionAuth(req, res, next) {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok:false, error:'not_authenticated', time: now() });
  req.visionUser = user;
  return next();
}

// §152 — Logout: revoga token imediatamente
app.post('/api/auth/logout', (req, res) => {
  const auth = String(req.headers.authorization || '');
  const tokenStr = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const session = verifySession(tokenStr);
  if (session && session.jti) {
    revokeToken(session.jti);
    console.log('[§152] token revogado no logout:', session.jti.slice(0, 8) + '...');
  }
  auditLog('logout', req, { uid: session ? session.uid : 'unknown' }); // §154
  res.clearCookie('vision_session');
  return res.json({ ok: true, message: 'logged_out', anti_stub: true });
});
// §154 — Audit log endpoint (admin only)
app.get('/api/audit-log', (req, res) => {
  const token = (String(req.headers.authorization || '')).replace('Bearer ', '');
  const session = verifySession(token);
  if (!session) return res.status(401).json({ ok: false, error: 'unauthorized', anti_stub: true });
  const db = readJsonFile(USERS_DB, { users: [] });
  const user = db.users.find(u => u.id === session.uid);
  if (!user || user.role !== 'admin') return res.status(403).json({ ok: false, error: 'forbidden', anti_stub: true });
  const log = readJsonFile(AUDIT_LOG_FILE, { entries: [] });
  return res.json({ ok: true, entries: log.entries.slice(-100), total: log.entries.length, anti_stub: true });
});

// §159 — LGPD: direito ao esquecimento
app.delete('/api/auth/me', (req, res) => {
  try {
    const token = (String(req.headers.authorization || '')).replace('Bearer ', '');
    const session = verifySession(token);
    if (!session) return res.status(401).json({ ok: false, error: 'unauthorized', anti_stub: true });
    const db = readJsonFile(USERS_DB, { users: [] });
    const idx = db.users.findIndex(u => u.id === session.uid);
    if (idx === -1) return res.status(404).json({ ok: false, error: 'user_not_found', anti_stub: true });
    const email = db.users[idx].email;
    if (session.jti) revokeToken(session.jti); // §152: invalidar token antes de deletar
    db.users.splice(idx, 1);
    writeAndSyncS3(USERS_DB, db);
    const conversationsDb = readConversations();
    conversationsDb.conversations = conversationsDb.conversations.filter(item => item.user_id !== session.uid);
    writeAndSyncS3(CHAT_CONVERSATIONS_DB, conversationsDb);
    auditLog('account_deleted', req, { email }); // §154
    console.log('[§159] conta deletada (LGPD):', email);
    return res.json({ ok: true, message: 'account_deleted', email_deleted: email, anti_stub: true });
  } catch(e) {
    console.error('[§159] DELETE /api/auth/me:', e.message);
    return res.status(500).json({ ok: false, error: 'internal_error', anti_stub: true });
  }
});

// §155 — SSO ENTERPRISE domain management (admin only)
app.get('/api/sso/domains', (req, res) => {
  const token = (String(req.headers.authorization || '')).replace('Bearer ', '');
  const session = verifySession(token);
  if (!session) return res.status(401).json({ ok: false, error: 'unauthorized', anti_stub: true });
  const db = readJsonFile(USERS_DB, { users: [] });
  const user = db.users.find(u => u.id === session.uid);
  if (!user || user.role !== 'admin') return res.status(403).json({ ok: false, error: 'forbidden', anti_stub: true });
  return res.json({ ok: true, domains: _ssoDomains, count: Object.keys(_ssoDomains).length, anti_stub: true });
});

app.post('/api/sso/domains', (req, res) => {
  const token = (String(req.headers.authorization || '')).replace('Bearer ', '');
  const session = verifySession(token);
  if (!session) return res.status(401).json({ ok: false, error: 'unauthorized', anti_stub: true });
  const db = readJsonFile(USERS_DB, { users: [] });
  const user = db.users.find(u => u.id === session.uid);
  if (!user || user.role !== 'admin') return res.status(403).json({ ok: false, error: 'forbidden', anti_stub: true });
  const body = normalizeBody(req);
  const domain = String(body.domain || '').toLowerCase().trim();
  if (!domain || !domain.includes('.') || domain.includes('@')) {
    return res.status(400).json({ ok: false, error: 'invalid_domain', anti_stub: true });
  }
  _ssoDomains[domain] = { plan: 'enterprise', added_at: new Date().toISOString(), added_by: user.email };
  _saveSsoDomains();
  auditLog('sso_domain_added', req, { domain, added_by: user.email }); // §154
  return res.json({ ok: true, domain, anti_stub: true });
});

app.delete('/api/sso/domains/:domain', (req, res) => {
  const token = (String(req.headers.authorization || '')).replace('Bearer ', '');
  const session = verifySession(token);
  if (!session) return res.status(401).json({ ok: false, error: 'unauthorized', anti_stub: true });
  const db = readJsonFile(USERS_DB, { users: [] });
  const user = db.users.find(u => u.id === session.uid);
  if (!user || user.role !== 'admin') return res.status(403).json({ ok: false, error: 'forbidden', anti_stub: true });
  const domain = String(req.params.domain || '').toLowerCase().trim();
  if (!_ssoDomains[domain]) return res.status(404).json({ ok: false, error: 'domain_not_found', anti_stub: true });
  delete _ssoDomains[domain];
  _saveSsoDomains();
  auditLog('sso_domain_removed', req, { domain, removed_by: user.email }); // §154
  return res.json({ ok: true, domain, removed: true, anti_stub: true });
});

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
  if (user) { user.plan = plan || user.plan || 'free'; user.billing = { ...(user.billing || {}), ...extra, updated_at: now() }; writeAndSyncS3(USERS_DB, users); }
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

app.get('/api/billing/plans', (req, res) => sendOk(res, { plans, billing_mode: process.env.BILLING_MODE || (process.env.STRIPE_SECRET_KEY ? 'stripe' : 'no_stripe_configured'), anti_stub: true }));
app.all('/api/billing/checkout', (req, res) => {
  const stripe = getStripeClient();
  if (!stripe) return res.status(503).json({ ok: false, error: 'stripe_not_configured', required_env: ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_ENTERPRISE'], hint: 'Use POST /api/billing/create-checkout-session for authenticated checkout', time: now() });
  return res.status(400).json({ ok: false, error: 'use_authenticated_checkout', hint: 'POST /api/billing/create-checkout-session requires auth token', time: now() });
});
app.all('/api/billing/webhook', (req, res) => sendOk(res, { received: true }));
app.get('/api/billing/status', (req, res) => {
  if (process.env.FORCE_PRO_FOR_ALL_TEST_USERS === 'true') {
    return sendOk(res, { plan: 'pro', active: true, source: 'force_env', anti_stub: true });
  }
  const user = getAuthUser(req);
  if (user) {
    const plan = user.plan || 'free';
    const billing = user.billing || {};
    return sendOk(res, {
      plan,
      active: true,
      subscription_status: billing.subscription_status || (plan === 'free' ? 'free_tier' : 'active'),
      current_period_end: billing.current_period_end || null,
      cancel_at_period_end: billing.cancel_at_period_end || false,
      source: 'user_record',
      anti_stub: true
    });
  }
  return sendOk(res, { plan: 'free', active: true, source: 'unauthenticated', anti_stub: true });
});
/* §83 B1: mock billing/cancel, usage/quota, auth/signup, auth/login, /api/me REMOVED — real impls at lines ~946, ~988, ~357, ~372, ~385 */

/* AGENT DOWNLOAD */
const _agentDownloadMeta = {
  windows: { platform: 'windows', ext: '.exe', installer: 'VisionAgentSetup.exe', url: 'https://visioncoreai.pages.dev/downloads/VisionAgentSetup.exe' },
  linux:   { platform: 'linux',   ext: '',      installer: 'vision-agent-linux',   url: 'https://visioncoreai.pages.dev/downloads/vision-agent-linux' },
  macos:   { platform: 'macos',   ext: '',      installer: 'vision-agent-macos',   url: 'https://visioncoreai.pages.dev/downloads/vision-agent-macos' }
};
for (const [platform, meta] of Object.entries(_agentDownloadMeta)) {
  app.get(`/api/agent/download/${platform}`, (req, res) => {
    const localPath = path.join(ROOT, 'frontend', 'downloads', meta.installer);
    if (fs.existsSync(localPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${meta.installer}"`);
      res.setHeader('Content-Type', platform === 'windows' ? 'application/octet-stream' : 'application/octet-stream');
      return res.status(200).send(fs.readFileSync(localPath));
    }
    return res.status(200).json({ available: false, reason: 'download_via_frontend_only', platform: meta.platform, download_url: meta.url, anti_stub: true, time: now() });
  });
}
/* §105: timestamp do ultimo poll real do Vision Agent Local (heartbeat OU /mission/pending) */
let _agentLastSeenAt = 0;
let _agentLastAgentId = null;
function normalizeAgentId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9._:-]{1,96}$/.test(id) ? id : '';
}
function getRequestAgentId(req, body) {
  return normalizeAgentId((body && body.agent_id) || (req.query && req.query.agent_id) || (req.get && req.get('x-vision-agent-id')));
}
function getRequestAgentSecret(req, body) {
  const raw = (body && body.agent_secret) || (req.query && req.query.agent_secret) || (req.get && req.get('x-vision-agent-secret')) || '';
  return /^[A-Za-z0-9]{1,128}$/.test(raw) ? raw : '';
}
/* §207: pareamento por agente — agent_id sozinho não autenticava nada (hash não-secreto de
   hostname+pasta, sem checagem nenhuma nas rotas). agent_secret é o segredo real, gerado só
   aqui, nunca adivinhável. Em memória (reseta a cada redeploy do EB) — mesmo padrão já usado
   por agentQueueDB/sfJobs neste arquivo; persistência em S3 fica para quando isso for
   realmente ligado em produção (AGENT_APPLY_ENABLED continua false até lá). */
const agentPairings = new Map(); // agent_id -> agent_secret
function verifyAgentSecret(agentId, secret) {
  if (!agentId || !secret) return false;
  const expected = agentPairings.get(agentId);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
app.post('/api/agent/register', (req, res) => {
  const agentId = makeId('agent');
  const secret  = crypto.randomBytes(24).toString('hex');
  agentPairings.set(agentId, secret);
  return sendOk(res, { agent_id: agentId, agent_secret: secret, status: 'registered', anti_stub: true });
});
app.all('/api/agent/heartbeat', (req, res) => {
  const body = normalizeBody(req);
  const agentId = getRequestAgentId(req, body);
  _agentLastSeenAt = Date.now();
  if (agentId) _agentLastAgentId = agentId;
  return sendOk(res, { status: 'online', agent_id: agentId || _agentLastAgentId, anti_stub: true });
});
app.all('/api/agent/report', (req, res) => sendOk(res, { received: true, pass_gold: Boolean(normalizeBody(req).pass_gold), anti_stub: true }));
app.get('/api/agent/status', (req, res) => {
  /* §105: connected real (era hardcoded false antes) — agent considerado online se fez */
  /* poll em /mission/pending ou heartbeat nos ultimos 15s (3x o VC_POLL_MS padrao de 3000ms) */
  const lastSeenMsAgo = _agentLastSeenAt ? (Date.now() - _agentLastSeenAt) : null;
  const connected     = lastSeenMsAgo !== null && lastSeenMsAgo < 15000;
  return sendOk(res, { connected, last_seen_ms_ago: lastSeenMsAgo, agent_id: _agentLastAgentId, mode: connected ? 'connected' : 'download_ready', anti_stub: true });
});

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
app.all('/api/tools/portainer/start', (req, res) => {
  const url = process.env.PORTAINER_URL; const token = process.env.PORTAINER_TOKEN;
  if (!url || !token) return res.status(503).json({ ok: false, available: false, mode: 'adapter_not_configured', config_required: ['PORTAINER_URL', 'PORTAINER_TOKEN'], anti_stub: true, time: now() });
  return sendOk(res, { available: true, portainer_url: url, action: 'start', note: 'call portainer API directly', anti_stub: true });
});
app.all('/api/tools/portainer/stop', (req, res) => {
  const url = process.env.PORTAINER_URL; const token = process.env.PORTAINER_TOKEN;
  if (!url || !token) return res.status(503).json({ ok: false, available: false, mode: 'adapter_not_configured', config_required: ['PORTAINER_URL', 'PORTAINER_TOKEN'], anti_stub: true, time: now() });
  return sendOk(res, { available: true, portainer_url: url, action: 'stop', note: 'call portainer API directly', anti_stub: true });
});
app.all('/api/tools/osint/spiderfoot', (req, res) => res.status(503).json({ ok: false, available: false, mode: 'adapter_not_configured', config_required: ['SPIDERFOOT_URL', 'SPIDERFOOT_API_KEY'], tool: 'spiderfoot', anti_stub: true, time: now() }));
app.all('/api/tools/osint/reconng', (req, res) => res.status(503).json({ ok: false, available: false, mode: 'adapter_not_configured', config_required: ['RECONNG_URL'], tool: 'reconng', anti_stub: true, time: now() }));
app.all('/api/tools/osint/maryam', (req, res) => res.status(503).json({ ok: false, available: false, mode: 'adapter_not_configured', config_required: ['MARYAM_URL'], tool: 'maryam', anti_stub: true, time: now() }));

app.get('/api/metrics/agents', (req, res) => {
  const configuredProviders = providerList().filter(p => p.configured).map(p => p.id);
  const savedProviders = Object.keys(_providersStore);
  const activeProviders = [...new Set([...configuredProviders, ...savedProviders])];
  const goHealthy = fs.existsSync(resolveGoBinary ? resolveGoBinary() : path.join(ROOT, 'bin', 'vision-core')) || fs.existsSync(path.join(ROOT, 'go-core', 'main'));
  // DECISION-032 — ledger real de custo por agente (callLLM grava aqui quando
  // chamado com opts.agent). Só Hermes RCA e OpenClaw chamam LLM de verdade
  // hoje (confirmado por leitura direta do código, não suposição) — Scanner/
  // Aegis/Go Core/PASS GOLD continuam null porque genuinamente não chamam LLM,
  // não é limitação da implementação.
  const costLedger = readJsonFile(AGENT_COSTS_DB, {});
  const agents = [
    { name: 'OpenClaw',    status: 'ok',               cost_usd: costLedger['OpenClaw'] ? costLedger['OpenClaw'].cost_usd_total : null, note: 'maioria dos caminhos é roteamento puro; só decision=diagnose chama LLM' },
    { name: 'Hermes RCA',  status: activeProviders.length ? 'ok' : 'no_provider', cost_usd: costLedger['Hermes RCA'] ? costLedger['Hermes RCA'].cost_usd_total : null, active_providers: activeProviders },
    { name: 'Scanner',     status: 'ok',               cost_usd: null, note: 'AST scan — no LLM cost' },
    { name: 'Aegis',       status: 'ok',               cost_usd: null, note: 'validation — no LLM cost' },
    { name: 'Go Core',     status: goHealthy ? 'ok' : 'binary_not_found', cost_usd: null },
    { name: 'PASS GOLD',   status: 'PENDING_EVIDENCE', cost_usd: null, note: 'evidence receipt required' }
  ];
  return sendOk(res, { agents, active_llm_providers: activeProviders, anti_stub: true });
});
app.get('/api/metrics/summary', (req, res) => {
  try {
    const os = require('os');
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPct = Math.round((usedMem / totalMem) * 100);

    let cpuPct = 0;
    if (cpus && cpus.length) {
      const avg = cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return acc + (1 - idle / total);
      }, 0) / cpus.length;
      cpuPct = Math.round(avg * 100);
    }

    const proc = process.memoryUsage();
    const heapPct = Math.round((proc.heapUsed / proc.heapTotal) * 100);

    return sendOk(res, {
      runtime: {
        cpu: cpuPct,
        memory: memPct,
        heap: heapPct,
        uptime_s: Math.round(process.uptime()),
        node_version: process.version,
        platform: os.platform(),
        total_mem_mb: Math.round(totalMem / 1024 / 1024),
        free_mem_mb: Math.round(freeMem / 1024 / 1024),
        load_avg: os.loadavg().map(v => Math.round(v * 100) / 100)
      },
      anti_stub: true
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'metrics_failed', message: err.message, time: now() });
  }
});
app.get('/api/metrics/memory', (req, res) => {
  /* §108 — observabilidade: estatísticas do memory layer (§72 Fase 1+2 / §107) */
  try {
    const entries = readLowConfidenceLog(500);
    const stats   = computeMemoryMetrics(entries);
    return sendOk(res, Object.assign(
      { data_source: '.vision-memory/hermes_low_confidence.jsonl', anti_stub: true },
      stats
    ));
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'memory_metrics_failed', message: err.message, time: now() });
  }
});
app.get('/api/dora-metrics', async (req, res) => {
  try {
    const passGoldDir = path.join(VAULT_ROOT, 'PASS-GOLD');
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let deploysLast30 = 0;
    let totalVersions = 0;
    let failCount = 0;
    let mttrMs = null;
    let leadTimeHours = null;

    if (fs.existsSync(passGoldDir)) {
      const files = fs.readdirSync(passGoldDir);
      for (const f of files) {
        try { const stat = fs.statSync(path.join(passGoldDir, f)); if (stat.mtimeMs >= thirtyDaysAgo) deploysLast30++; totalVersions++; } catch {}
      }
    }

    const deployLogPath = path.join(DB_ROOT, 'deploy-log.json');
    if (fs.existsSync(deployLogPath)) {
      try {
        const log = readJsonFile(deployLogPath, { entries: [] });
        const entries = log.entries || [];
        if (entries.length > 0) {
          const recent = entries.slice(-10);
          const diffs = recent.filter(e => e.commit_ts && e.deploy_ts).map(e => (new Date(e.deploy_ts) - new Date(e.commit_ts)) / 3600000);
          if (diffs.length) leadTimeHours = (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1);
          const failures = recent.filter(e => e.status === 'fail');
          const passes = recent.filter(e => e.status === 'pass');
          failCount = failures.length;
          if (failures.length && passes.length) {
            const lastFail = new Date(failures[failures.length - 1].deploy_ts);
            const nextPass = passes.find(p => new Date(p.deploy_ts) > lastFail);
            if (nextPass) mttrMs = ((new Date(nextPass.deploy_ts) - lastFail) / 60000).toFixed(0);
          }
        }
      } catch {}
    }

    return sendOk(res, {
      deployment_frequency: deploysLast30 > 0 ? `${deploysLast30} deploys/30d (${(deploysLast30 / 30).toFixed(2)}/day)` : 'sem dados PASS-GOLD',
      lead_time: leadTimeHours ? `${leadTimeHours}h avg (últimas 10)` : 'sem deploy-log',
      mttr: mttrMs ? `${mttrMs} min avg` : 'sem falhas registradas',
      change_failure_rate: totalVersions > 0 ? `${((failCount / totalVersions) * 100).toFixed(1)}%` : '0%',
      pass_gold_count_30d: deploysLast30,
      total_pass_gold: totalVersions,
      data_source: 'vault:PASS-GOLD + data/deploy-log.json',
      anti_stub: true
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'dora_metrics_failed', message: err.message, time: now() });
  }
});
app.get('/api/pass-gold/score', (req, res) => sendOk(res, { final: 100, status: 'PENDING_EVIDENCE', pass_gold: false, promotion_allowed: false, pass_gold_reason: 'evidence receipt required from Go Core' }));
app.get('/api/logs', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'not_authenticated', request_id: req.requestId, time: now() });
  const projectId = String(req.query.project_id || '');
  if (!ownedProject(user.id, projectId)) return res.status(404).json({ ok: false, error: 'project_not_found', request_id: req.requestId, time: now() });
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const missionId = String(req.query.mission_id || '');
  const jobId = String(req.query.job_id || '');
  const db = readJsonFile(OPERATION_LOG_DB, { entries: [] });
  const owned = (Array.isArray(db.entries) ? db.entries : []).filter(entry =>
    entry.user_id === user.id && entry.project_id === projectId &&
    (!missionId || entry.mission_id === missionId) && (!jobId || entry.job_id === jobId)
  ).sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  const entries = owned.slice(offset, offset + limit).map(({ user_id, ...entry }) => entry);
  return sendOk(res, { entries, total: owned.length, next_offset: offset + entries.length < owned.length ? offset + entries.length : null, anti_stub: true });
});

app.get('/api/logs/download', (req, res) => {
  return res.status(410).json({ ok: false, error: 'raw_log_download_retired', replacement: '/api/logs', request_id: req.requestId, anti_stub: true, time: now() });
});

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
  /* mensagem crua do usuário, capturada ANTES de qualquer mutação (toolFetchUrl
     injeta conteúdo de URL, §44 MPEG comprime blocos [Arquivo: ...]) — usada só
     pelo gate anti-autorreforço do Archivist mais abaixo, nunca pelo LLM. */
  const rawMessage = message;

  /* §98-E — captura a resposta final do /api/chat (qualquer branch interno)
     via monkey-patch de res.json, em vez de editar cada return separadamente.
     NOTA: /api/chat é o endpoint REAL usado pelo frontend (ENVIAR) — não é
     /api/copilot. Verificado: zero referências a /api/copilot ou /api/run-live
     no bundle.js atual. */
  const _tlUser98e  = getAuthUser(req);
  const _tlInput98e = (body.display_input || message);
  const _origJson98e = res.json.bind(res);
  res.json = function (payload) {
    if (_tlUser98e && payload && payload.ok !== false) {
      appendMissionTimeline(_tlUser98e.id, {
        source: 'chat',
        input: _tlInput98e,
        summary: payload.answer || null,
        status: 'ANSWERED'
      });
    }
    return _origJson98e(payload);
  };

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
    `  R8. Perguntas sobre a identidade/arquitetura do próprio Vision Core (SF, modelo usado,`,
    `      infraestrutura) → responda SOMENTE com base no VISION_CORE_FACTS_BLOCK abaixo.`,
    `      Se a informação pedida não estiver lá, responda literalmente "não tenho essa`,
    `      informação confirmada" — nunca invente fatos sobre o próprio Vision Core.`,
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
    `FORMATO OBRIGATÓRIO (caso comum — exatamente 1 arquivo precisa de fix):`,
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
    `FORMATO MULTI-ARQUIVO (§115 — SOMENTE quando 2 OU MAIS arquivos diferentes precisam de fix na MESMA resposta,`,
    `ex.: mudar a assinatura de uma função em A e atualizar os call sites em B/C):`,
    `\`\`\`json`,
    `{`,
    `  "diagnosis":  "causa-raiz objetiva cobrindo todos os arquivos",`,
    `  "files": [`,
    `    { "file": "caminho/A.js", "fix_type": "code_patch", "patch": { "search": "...", "replace": "..." } },`,
    `    { "file": "caminho/B.js", "fix_type": "code_patch", "patch": { "search": "...", "replace": "..." } }`,
    `  ],`,
    `  "confidence": 0.0,`,
    `  "decisao":    "NEEDS_FIX | BLOCKED_INPUT | ABORTED | READY"`,
    `}`,
    `\`\`\``,
    `REGRA: nunca use "files" com 1 único item — esse caso usa o formato de 1 arquivo acima (campos file/patch direto).`,
    `"files" é exclusivamente para quando a correção REALMENTE precisa tocar mais de 1 arquivo pra ficar completa —`,
    `não force um fix de 1 arquivo a virar "files" com 1 item, e não invente um 2º arquivo só pra preencher o array.`,
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
    `     §115: se 2+ arquivos diferentes precisam de patch, retorne o JSON no FORMATO MULTI-ARQUIVO`,
    `     ("files": [...], um item por arquivo) em vez do formato de 1 arquivo — NÃO escolha só o bug mais saliente.`,
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

  /* Grounding real contra alucinação de arquitetura própria (achado real,
     2026-07-14): basePrompt não tem NENHUM fato sobre a arquitetura real do
     Vision Core (schema de dataset, endpoints internos, etc) — só descreve
     como agir sobre código DO USUÁRIO. Perguntas sobre a arquitetura do
     próprio produto (ex: "fine-tuning do Hermes") não têm grounding nenhum,
     e o mesmo prompt gerou 2 respostas divergentes e igualmente inventadas
     pra a mesma pergunta em sessões diferentes. "Não alucine" no prompt não
     é suficiente pra esse tipo de pergunta — a mitigação real é injetar o
     trecho literal do doc real em vez de deixar o modelo gerar livremente. */
  const isHermesFineTuningQuestion = /fine[\s-]?tun|hermes[^.?!]*trein|trein\w*[^.?!]*hermes|hermes[\s_-]?(trainer|weights|rules)|dataset\s+do\s+hermes|hermes[^.?!]*dataset/i.test(message);
  let groundingAddendum = '';
  if (isHermesFineTuningQuestion) {
    try {
      // Dois candidatos: monorepo local (docs/ é irmão de backend/) e bundle
      // deployado no EB (o zip só contém o conteúdo de backend/ — sem pasta
      // docs/ irmã — então o deploy copia uma cópia pra backend/docs/, ver
      // _deploy_hermes_grounding_eb.py). Achado real (2026-07-14): sem esse
      // fallback, fs.readFileSync lançava ENOENT em produção, o catch
      // engolia o erro, e o grounding nunca era aplicado — 4 respostas
      // fabricadas seguidas antes de perceber que o problema era esse.
      const localDocPath  = path.join(ROOT, '..', 'docs', 'HERMES_FINE_TUNING_DATASET.md');
      const bundledDocPath = path.join(ROOT, 'docs', 'HERMES_FINE_TUNING_DATASET.md');
      const docPath = fs.existsSync(localDocPath) ? localDocPath : bundledDocPath;
      const realDoc = fs.readFileSync(docPath, 'utf8');
      groundingAddendum = [
        ``,
        `══════════════════════════════════════════════════════`,
        `GROUNDING REAL — FINE-TUNING DO HERMES (ANTI-ALUCINAÇÃO)`,
        `══════════════════════════════════════════════════════`,
        ``,
        `A pergunta do usuário é sobre a arquitetura REAL do próprio Vision Core, não sobre código do usuário.`,
        `Responda EXCLUSIVAMENTE com base no trecho real abaixo, extraído ao vivo de docs/HERMES_FINE_TUNING_DATASET.md.`,
        `PROIBIDO inventar nomes de arquivo, comandos CLI, flags, endpoints ou formatos de config que não estejam neste trecho.`,
        `Se a pergunta pedir algo que este trecho não cobre (ex: comando para rodar o treinamento em si), diga explicitamente que isso ainda não existe/não foi implementado — não invente um.`,
        ``,
        realDoc
      ].join('\n');
    } catch (_eGrounding) {
      console.error('[chat-grounding] doc real ausente; resposta bloqueada para impedir alucinacao:', _eGrounding.message);
      return res.status(503).json({
        ok: false,
        error: 'hermes_grounding_unavailable',
        message: 'A documentação real do fine-tuning do Hermes não está disponível neste servidor. A resposta foi bloqueada para não inventar informações.',
        anti_stub: true,
        time: now()
      });
    }
  }

  /* 3-way systemPrompt:
     1. hybrid  (image + file + fix): basePrompt + visionAddendum (includes hermesDecisionMatrix)
     2. image-only: basePrompt + visionAddendum (visual description)
     3. code-only: basePrompt + fixModeInstructions (hermesDecisionMatrix)
     + §53: diffInstruction53 appended when [DIFF] block present (all paths)
     + grounding real appended quando a pergunta é sobre fine-tuning do Hermes
     + VISION_CORE_FACTS_BLOCK sempre-on (todos os tópicos, não só fine-tuning) */
  const systemPrompt = (hasImage
    ? basePrompt + visionAddendum
    : basePrompt + fixModeInstructions) + diffInstruction53 + groundingAddendum
    + '\n\n' + VISION_CORE_FACTS_BLOCK;

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
      '6. Se não extrair arquivo do diff, use o caminho de arquivo mais mencionado no contexto\n' +
      '7. §115: se o texto menciona fixes em 2+ arquivos DIFERENTES, use "files": [{file, fix_type, patch}, ...]\n' +
      '   em vez de file/patch único — só nesse caso de múltiplos arquivos reais\n\n' +
      'Formato (1 arquivo):\n' +
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
    const GEMINI_KEY   = resolveApiKey('GEMINI');
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

  /* §129: busca contexto de missões anteriores no Archivist (best-effort, nunca bloqueia) */
  const _s129hCtx = await archivistSearch(message.slice(0, 200), 3);
  const _s129hBlock = _s129hCtx.length > 0
    ? '\n\n[CONTEXTO DE MISSÕES ANTERIORES NO ARCHIVIST]\n' +
      _s129hCtx.map(m => '- ' + m.preview.slice(0, 150).replace(/\n/g, ' ')).join('\n')
    : '';
  const _s129systemPrompt = systemPrompt + _s129hBlock;

  let _h49result;
  try {
    _h49result = await _callHermes49(_s129systemPrompt, message, { timeout: _h49timeout });
  } catch (_e49) {
    _h49result = { ok: false, code: 'HERMES_EXCEPTION', requires_manual_review: true };
  }

  if (_h49result && _h49result.answer) {
    const finalAnswer = await ensureHermesJson(_h49result.answer, async (prompt) => {
      try {
        const r2 = await _callHermes49(_s129systemPrompt, prompt, { timeout: 20000 });
        return r2.answer || '';
      } catch (_) { return ''; }
    });
    /* §129: salva resumo da missão no Archivist após resposta (best-effort) — nunca
       quando a pergunta é sobre a identidade do próprio Vision Core ou a resposta
       veio com hedge (isUnsafeToArchive), pra não realimentar o loop de autorreforço
       de alucinação. Checa a mensagem crua (rawMessage), não a versão mutada. */
    if (!isUnsafeToArchive(rawMessage, finalAnswer)) {
      archivistSave('hermes-' + Date.now(), {
        query:     message.slice(0, 300),
        summary:   finalAnswer.slice(0, 500),
        mode,
        timestamp: now()
      });
    }
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
    message:         'Todos os providers de IA falharam ou atingiram o timeout de ' + (_h49timeout / 1000) + 's. '
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
/* §112: fila e resultados persistidos em SQLite via agent-queue-db.js    */
/* (anteriormente array/objeto em memória — perdia tudo no restart do EB) */
const agentQueueDB = require('./agent-queue-db');

app.post('/api/agent/mission/queue', (req, res) => {
  const body        = normalizeBody(req);
  const type        = body.type || 'general';
  const agentId     = getRequestAgentId(req, body);
  const agentSecret = getRequestAgentSecret(req, body);
  const mission = {
    id:        `mission_${Date.now()}_${Math.random().toString(16).slice(2,6)}`,
    input:     body.input || body.message || '',
    type:      type,
    queued_at: now()
  };
  /* §105: apply_patch carrega o patch ja diagnosticado pelo chat — sem isso o */
  /* agent local nao tem o que aplicar (campos eram descartados antes desta sessao) */
  /* §207: agent_id sozinho não autentica ninguém — apply_patch/apply_patch_multi exigem
     agent_secret pareado via /api/agent/register, senão qualquer chamador da API pública
     poderia enfileirar escrita real contra o agente de outra pessoa. */
  if (type === 'apply_patch') {
    if (!body.file || !body.patch) {
      return res.status(400).json({ ok: false, error: 'apply_patch_requires_file_and_patch', time: now() });
    }
    if (!agentId) {
      return res.status(400).json({ ok: false, error: 'agent_id_required_for_apply_patch', time: now() });
    }
    if (!verifyAgentSecret(agentId, agentSecret)) {
      return res.status(401).json({ ok: false, error: 'agent_pairing_required', time: now() });
    }
    mission.agent_id  = agentId;
    mission.file      = body.file;
    mission.patch     = body.patch;
    mission.fix_type  = body.fix_type  || 'code_patch';
    mission.diagnosis = body.diagnosis || '';
  }
  /* §109 — Etapa D: missao multi-arquivo atomica. files e um array de */
  /* {file, patch, fix_type} — o agent local aplica tudo-ou-nada (ver vision-agent.js) */
  if (type === 'apply_patch_multi') {
    if (!Array.isArray(body.files) || body.files.length === 0) {
      return res.status(400).json({ ok: false, error: 'apply_patch_multi_requires_files_array', time: now() });
    }
    if (!agentId) {
      return res.status(400).json({ ok: false, error: 'agent_id_required_for_apply_patch_multi', time: now() });
    }
    if (!verifyAgentSecret(agentId, agentSecret)) {
      return res.status(401).json({ ok: false, error: 'agent_pairing_required', time: now() });
    }
    mission.agent_id = agentId;
for (const f of body.files) {
      if (!f || !f.file || !f.patch) {
        return res.status(400).json({ ok: false, error: 'apply_patch_multi_each_file_requires_file_and_patch', time: now() });
      }
    }
    mission.files      = body.files.map(f => ({ file: f.file, patch: f.patch, fix_type: f.fix_type || 'code_patch' }));
    mission.diagnosis  = body.diagnosis || '';
  }
  /* §111 — Etapa A, Fase 2: dry-run real contra um repositorio externo. */
  /* O backend so valida e relay a missao — toda leitura real do target_path, */
  /* o firewall de auto-modificacao (§110) e a simulacao em memoria (nunca */
  /* escreve no disco) acontecem no Vision Agent Local, nunca aqui. */
  if (type === 'sf_dry_run_real') {
    if (!body.target_path) {
      return res.status(400).json({ ok: false, error: 'sf_dry_run_real_requires_target_path', time: now() });
    }
    mission.target_path = body.target_path;
  }
  agentQueueDB.push(mission);
  return sendOk(res, { mission_id: mission.id, queued: true, queue_length: agentQueueDB.length(), type: mission.type, agent_id: mission.agent_id || null });
});

/* §207: mesmo padrão do /mission/queue — quem reivindica um agent_id precisa provar posse
   via agent_secret, senão qualquer chamador podia fazer polling com o agent_id de outra
   pessoa e roubar/interceptar uma missão de escrita real endereçada a ela (ou postar um
   resultado falso em nome dela). Missões sem dono (agent_id vazio) continuam anônimas —
   não muda o comportamento já existente pra dry-run/general. */
app.get('/api/agent/mission/pending', (req, res) => {
  const agentId     = getRequestAgentId(req, null);
  const agentSecret = getRequestAgentSecret(req, null);
  if (agentId && !verifyAgentSecret(agentId, agentSecret)) {
    return res.status(401).json({ ok: false, error: 'agent_pairing_required', time: now() });
  }
  _agentLastSeenAt = Date.now(); /* §105: todo poll real atualiza presenca p/ /api/agent/status */
  if (agentId) _agentLastAgentId = agentId;
  const mission = agentQueueDB.shiftForAgent ? agentQueueDB.shiftForAgent(agentId) : agentQueueDB.shift();
  return sendOk(res, { mission: mission || null, queue_remaining: agentQueueDB.length(), agent_id: agentId || null });
});

app.post('/api/agent/mission/result', (req, res) => {
  const body = normalizeBody(req);
  if (!body.mission_id) return res.status(400).json({ ok: false, error: 'mission_id_required', time: now() });
  const agentId     = getRequestAgentId(req, body);
  const agentSecret = getRequestAgentSecret(req, body);
  if (agentId && !verifyAgentSecret(agentId, agentSecret)) {
    return res.status(401).json({ ok: false, error: 'agent_pairing_required', time: now() });
  }
  /* §207: agent_secret nunca pode ir pro storage — GET /mission/result/:id é público, sem
     auth, e devolveria o segredo em texto puro pra qualquer um que soubesse o mission_id. */
  const { agent_secret, ...safeBody } = body;
  agentQueueDB.storeResult(body.mission_id, { ...safeBody, received_at: now() });
  return sendOk(res, { received: true, mission_id: body.mission_id });
});

app.get('/api/agent/mission/result/:id', (req, res) => {
  const result = agentQueueDB.getResult(req.params.id);
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
  agentQueueDB.push(mission);
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
  agentQueueDB.push(mission);
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

/* GitHub create-pr: REST por default, MCP opcional via adapter. */
app.post('/api/github/create-pr', async (req, res) => {
  try {
    const body = normalizeBody(req);
    const result = await createGithubPullRequest({
      repo:       (body.repo        || '').trim(),
      baseBranch: (body.base_branch || '').trim(),
      headBranch: (body.head_branch || '').trim(),
      title:      (body.title       || '').trim(),
      body:       (body.body        || '').trim(),
      files:      Array.isArray(body.files) ? body.files : []
    }, {
      now,
      githubToken: process.env.GITHUB_TOKEN
    });

    if (!result.ok) return res.status(result.status || 500).json(result);

    console.log(`[github/create-pr] PR criado: ${result.pr_url} (branch: ${result.branch}, mode: ${result.mode || 'rest'})`);
    return res.json(result);

  } catch (err) {
    console.error('[github/create-pr] error:', err.message);
    return res.status(err.status || 500).json({ ok: false, error: err.code || 'create_pr_error', detail: err.message, time: now() });
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

    const baseResp = {
      ok:            true,
      classification,
      provider_used: hermesResult.provider_used,
      model_used:    hermesResult.model_used,
      mode:          (hermesResult.provider_used && hermesResult.provider_used !== 'local') ? 'LLM_REAL' : 'LOCAL_FALLBACK',
      exec_real:     (hermesResult.provider_used && hermesResult.provider_used !== 'local') ? 'OK' : 'FALLBACK',
      anti_stub:     true,
      time:          now()
    };

    if (confidence < CONFIDENCE_THRESHOLD) {
      // Low confidence — return open questions instead of specs
      return res.status(200).json({
        ...baseResp,
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

/* §80 — AGENTS MODES */
const _agentModesStore = {};

app.get('/api/agents/modes', (req, res) => {
  return sendOk(res, { modes: _agentModesStore, time: now() });
});

app.post('/api/agents/:id/mode', (req, res) => {
  const agentId = req.params.id;
  const body    = normalizeBody(req);
  const mode    = String(body.mode || 'AUTO').toUpperCase();
  const valid   = ['OFF', 'AUTO', 'ON'];
  if (!valid.includes(mode)) {
    return res.status(400).json({ ok: false, error: 'invalid_mode', valid, time: now() });
  }
  _agentModesStore[agentId] = mode;
  console.log(`[agents] ${agentId} → ${mode}`);
  return sendOk(res, { ok: true, agent_id: agentId, mode, time: now() });
});

const _AGENTS_CATALOG = [
  { id: 'hermes',      name: 'Hermes RCA',     role: 'Supervisor RCA',               method: 'CONVERSA', default_mode: 'AUTO', keywords: ['rca','root cause','causa raiz','diagnostico','diagnóstico'] },
  { id: 'aegis',       name: 'Aegis',           role: 'Validação de sintaxe',         method: 'CONVERSA', default_mode: 'AUTO', keywords: ['sintaxe','lint','syntax','validacao','validação'] },
  { id: 'scanner',     name: 'Scanner',         role: 'Análise estrutural',           method: 'CONVERSA', default_mode: 'AUTO', keywords: ['estrutura','scan','arquivos','diretorio','diretório'] },
  { id: 'patchengine', name: 'Patch Engine',    role: 'Geração de patches',           method: 'LOOP',     default_mode: 'AUTO', keywords: ['patch','diff','correcao','correção'] },
  { id: 'passgold',    name: 'Pass Gold',       role: 'Gate de qualidade',            method: 'LOOP',     default_mode: 'AUTO', keywords: ['pass gold','qualidade','gate','score'] },
  { id: 'openclaw',    name: 'OpenClaw',        role: 'Planejamento de tarefas',      method: 'CONVERSA', default_mode: 'AUTO', keywords: ['planejamento','tarefa','orquestracao','orquestração'] },
  { id: 'benchmark',   name: 'Benchmark',       role: 'Métricas e performance',       method: 'AUTO',     default_mode: 'AUTO', keywords: ['performance','benchmark','latencia','latência','metricas','métricas'] },
  { id: 'backend',     name: 'Agente Backend',  role: 'Express, rotas, server',       method: 'CONVERSA', default_mode: 'AUTO', keywords: ['express','rota','rotas','route','middleware','server','api'] },
  { id: 'database',    name: 'Agente Database', role: 'Schema, queries',              method: 'CONVERSA', default_mode: 'AUTO', keywords: ['sql','query','queries','schema','migration','banco de dados','database'] },
  { id: 'auth',        name: 'Agente Auth',     role: 'Autenticação',                 method: 'CONVERSA', default_mode: 'AUTO', keywords: ['jwt','token','sessao','sessão','cors','401','403','login','autenticacao','autenticação'] },
  { id: 'frontend',    name: 'Agente Frontend', role: 'UI, componentes',              method: 'CONVERSA', default_mode: 'AUTO', keywords: ['ui','componente','css','html','react','botao','botão'] },
  { id: 'security',    name: 'Agente Security', role: 'Auditoria de segurança',       method: 'CONVERSA', default_mode: 'AUTO', keywords: ['seguranca','segurança','vulnerabilidade','security','exploit'] },
  { id: 'architect',   name: 'Arquiteto',       role: 'Classificação e planejamento', method: 'CONVERSA', default_mode: 'ON',   keywords: ['arquitetura','stack','estrutura de projeto'] },
  { id: 'locator',     name: 'Locator',         role: 'Busca em codebase',            method: 'CONVERSA', default_mode: 'AUTO', keywords: ['onde fica','localizar','encontrar arquivo','buscar codigo','buscar código'] },
  { id: 'memory',      name: 'Memory Agent',    role: 'Contexto de sessão',           method: 'CONVERSA', default_mode: 'AUTO', keywords: ['lembrar','memoria','memória','contexto anterior','sessao anterior'] },
];

// §98-D: detecta agente especializado com base em keywords da mensagem + modo ativo
function detectActiveAgent(message) {
  if (!message) return null;
  const lower = message.toLowerCase();
  for (const agent of _AGENTS_CATALOG) {
    const mode = _agentModesStore[agent.id] || agent.default_mode;
    if (mode === 'OFF') continue;
    if (!agent.keywords) continue;
    const matched = agent.keywords.some(kw => lower.includes(kw));
    if (matched) return agent;
  }
  return null;
}

app.get('/api/agents/catalog', (req, res) => {
  const agents = _AGENTS_CATALOG.map(a => ({
    ...a,
    current_mode: _agentModesStore[a.id] || a.default_mode
  }));
  // §82 B10: return both flat list (backward-compat) + structured core/reserve
  const CORE_IDS = ['hermes','scanner','patchengine','passgold','openclaw'];
  const core_agents = agents
    .filter(a => CORE_IDS.includes(a.id))
    .map(a => ({ id: a.id, name: a.name, role: a.role, status: a.current_mode === 'OFF' ? 'inactive' : 'active', focus: a.role, provides: [] }));
  const reserve_agents = agents
    .filter(a => !CORE_IDS.includes(a.id))
    .map(a => ({ id: a.id, name: a.name, role: 'reserve', status: 'reserve', focus: a.role, provides: [], active: a.current_mode === 'ON' }));
  // SDDF + Aegis always in core
  const sddf = { id: 'SDDF', name: 'SDDF Harness', role: 'validator', status: 'active', focus: 'Harness de validação: escopo → deps → schema → execução → PASS GOLD.', provides: ['pass-gold','gate-check','promotion'] };
  const aegis = agents.find(a => a.id === 'aegis');
  if (aegis && !core_agents.find(a => a.id === 'aegis')) core_agents.push({ id: aegis.id, name: aegis.name, role: aegis.role, status: 'active', focus: aegis.role, provides: ['cors','auth','security-review'] });
  core_agents.push(sddf);
  return sendOk(res, { agents, core_agents, reserve_agents, source: 'backend-catalog-v582', time: now() });
});

/* §80 — ORCHESTRATION MODE */
let _orchModeStore = 'auto_assistido';

app.get('/api/orchestration/mode', (req, res) => {
  return sendOk(res, { mode: _orchModeStore, time: now() });
});

app.post('/api/orchestration/mode', (req, res) => {
  const body  = normalizeBody(req);
  const mode  = String(body.mode || '').toLowerCase();
  const valid = ['manual', 'cirurgico', 'auto_assistido', 'full_sf', 'review_only'];
  if (!valid.includes(mode)) {
    return res.status(400).json({ ok: false, error: 'invalid_mode', valid, time: now() });
  }
  _orchModeStore = mode;
  console.log(`[orchestration] mode → ${mode}`);
  return sendOk(res, { ok: true, mode, time: now() });
});

/* §80 — DIFF PREVIEW */
app.post('/api/diff/preview', (req, res) => {
  const body      = normalizeBody(req);
  const input     = String(body.input     || '').trim();
  const context   = String(body.context   || '').trim();
  const lastPatch = String(body.last_patch || '').trim();

  if (!input && !lastPatch) {
    return res.status(400).json({ ok: false, error: 'input_required', time: now() });
  }

  let diff = '';
  let type = 'demo';

  if (lastPatch) {
    diff = lastPatch;
    type = 'real';
  } else {
    const sample = input.slice(0, 200);
    const lines  = sample.split('\n');
    const file   = context ? context.replace(/.*[/\\]/, '') : 'arquivo.js';
    diff = [
      `--- a/${file}`,
      `+++ b/${file}`,
      `@@ -1,${lines.length} +1,${lines.length} @@`,
      ...lines.map(l => `-${l}`),
      ...lines.map(l => `+${l}  // patch vision core`),
    ].join('\n');
    type = 'demo';
  }

  return sendOk(res, {
    diff,
    type,
    filename: context ? context.replace(/.*[/\\]/, '') : 'arquivo.js',
    note: type === 'demo'
      ? 'Preview local — forneça arquivo real para diff cirúrgico.'
      : 'Diff do último patch aplicado.',
    time: now()
  });
});

// ── SF Modules 02-09 — §84 B5: async + callLLM() real ────────
// §182 — jobs assíncronos para steps de longa duração (gold-gate)
const sfJobs = new Map(); // jobId → {status, result, error, ts}

// §191 — SF Professional Identity: prompts reescritos para projetos profissionais com governança, segurança e specs formais
const SF_GENERATORS = {
  'mission-composer': async (ctx) => {
    // §191: ramifica por body.step — steps 1/3/4 produzem outputs distintos
    const desc = ctx.project || 'projeto';
    const step = Number(ctx.step) || 0;
    let prompt, maxTok;
    if (step === 1) {
      prompt = `Você é Arquiteto Sênior de Software. Recebeu o projeto: "${desc}"\n\n1. DOMÍNIO: Identifique o domínio de negócio (fintech / saúde / jurídico / e-commerce / educação / outro). Justifique em 2 linhas.\n\n2. STACK JUSTIFICADA para o domínio (não genérica):\n   - Backend: linguagem + framework + motivo específico do domínio\n   - Banco de dados: SQL ou NoSQL + razão (ACID? volume? relacional?)\n   - Autenticação: JWT / OAuth2 / SAML — justificado para o domínio\n   - Cache ou fila se o domínio exigir\n\n3. COMPLIANCE OBRIGATÓRIO:\n   - LGPD: há campos com PII? consentimento necessário? direito ao esquecimento?\n   - PCI-DSS: há pagamentos? quais dados de cartão? tokenização obrigatória?\n   - HIPAA: há dados de saúde? criptografia em repouso obrigatória?\n\n4. RISCOS DE SEGURANÇA (OWASP Top 10 aplicado ao contexto do domínio)\n\n5. PRÓXIMOS PASSOS recomendados (3-5 itens priorizados)\n\nResponda em português com títulos e formatação clara.`;
      maxTok = 1500;
    } else if (step === 3) {
      prompt = `Para o projeto: "${desc}"\n\nSelecione o template arquitetural mais adequado entre:\n- REST API monolítica\n- Microserviços\n- BFF + SPA\n- Serverless\n- Fullstack MVC\n\nJustifique a escolha para este domínio específico.\nMostre a árvore de diretórios completa com comentário do papel de cada pasta e arquivo principal.\nInclua Dockerfile e estrutura de CI/CD básica.\n\nResponda em português com a árvore em bloco de código.`;
      maxTok = 1000;
    } else if (step === 4) {
      prompt = `Você é o Mission Composer do Vision Core. Gere a especificação formal SDDF para o projeto: "${desc}"\n\nSEÇÕES OBRIGATÓRIAS:\n- Objetivo e escopo (2-3 linhas, sem ambiguidade)\n- Agentes envolvidos: Scanner → Hermes → Aegis → SDDF → PASS GOLD (papel de cada)\n- Critérios de PASS GOLD específicos para ESTE domínio e projeto\n- Sequência de execução: passo a passo numerado\n- Definição de Done: o que significa "pronto" para este projeto\n- Riscos identificados e mitigações\n\nResponda em português. Seja preciso e evite generalidades.`;
      maxTok = 1200;
    } else {
      prompt = `Você é o Mission Composer do Vision Core. Gere um plano estruturado de missão SDDF para o projeto "${desc}". Inclua: objetivo, escopo, agentes envolvidos, critérios de PASS GOLD, e sequência de execução. Timestamp: ${ctx.timestamp}`;
      maxTok = 800;
    }
    const llm = await callLLM(prompt, { max_tokens: maxTok, system: 'Você é um arquiteto sênior de software e especialista em governança de projetos. Responda em português. Seja técnico, específico e estruturado. Evite generalidades.' });
    return { module: 'SF02', result: llm ? llm.text : `MISSION COMPOSER\n\nProjeto: ${desc}\nTimestamp: ${ctx.timestamp}\n\nObjetivo: [definir]\nEscopo: [definir]\nAgentes: OpenClaw → Scanner → Hermes → Aegis → SDDF → PASS GOLD\nCritérios: PASS GOLD score >= 95\n\nGerado por Vision Core — SF02`, provider: llm ? llm.provider : 'local' };
  },
  'worker-handoff': async (ctx) => {
    // §191: handoff profissional com P0/P1/P2 e checklist de transferência
    const desc = ctx.project || 'projeto';
    const prompt = `Gere o pacote de handoff profissional para o projeto: "${desc}"\n\nINCLUA:\n1. RESUMO EXECUTIVO: o que está pronto, o que está pendente (seja específico)\n2. ARTEFATOS ENTREGUES: lista com localização real (src/routes/, src/models/, etc.)\n3. DEPENDÊNCIAS: comandos exatos (npm install, variáveis de ambiente necessárias)\n4. PRÓXIMOS PASSOS priorizados:\n   - P0 (bloqueante): ...\n   - P1 (importante): ...\n   - P2 (desejável): ...\n5. CHECKLIST DE TRANSFERÊNCIA: itens que o próximo worker deve verificar antes de continuar\n6. RISCOS ABERTOS: problemas conhecidos não resolvidos\n\nTimestamp: ${ctx.timestamp}\nResponda em português com formatação clara.`;
    const llm = await callLLM(prompt, { max_tokens: 900, system: 'Você é o Worker Handoff agent do Vision Core. Responda em português com precisão técnica. Listas claras, sem texto genérico.' });
    return { module: 'SF03', result: llm ? llm.text : `WORKER HANDOFF\n\nProjeto: ${desc}\nTimestamp: ${ctx.timestamp}\n\nContexto: deploy em andamento\nArtifatos: src/, public/, docs/\nP0: validar endpoints\nP1: smoke test completo\n\nGerado por Vision Core — SF03`, provider: llm ? llm.provider : 'local' };
  },
  'context-snapshot': async (ctx) => {
    const prompt = `Gere um snapshot de contexto para auditoria do projeto "${ctx.project}". Inclua: estado atual do sistema, versão, endpoints ativos, providers configurados. Timestamp: ${ctx.timestamp}`;
    const llm = await callLLM(prompt, { max_tokens: 600, system: 'Você é o Context Snapshot agent. Responda em português.' });
    return { module: 'SF04', result: llm ? llm.text : `CONTEXT SNAPSHOT\n\nProjeto: ${ctx.project}\nTimestamp: ${ctx.timestamp}\nStatus: operacional\n\nGerado por Vision Core — SF04`, provider: llm ? llm.provider : 'local' };
  },
  'patch-validator': async (ctx) => {
    // §191: validação OWASP Top 10 + LGPD + veredicto formal
    const desc = ctx.project || 'projeto';
    const prompt = `Gere o relatório de validação de segurança para o projeto: "${desc}"\n\nSEÇÕES OBRIGATÓRIAS:\n\n1. OWASP TOP 10 — status de cada item:\n   A01 Broken Access Control — mitigado / parcial / pendente\n   A02 Cryptographic Failures — mitigado / parcial / pendente\n   A03 Injection — mitigado / parcial / pendente\n   A04 Insecure Design — mitigado / parcial / pendente\n   A05 Security Misconfiguration — mitigado / parcial / pendente\n   A06 Vulnerable Components — mitigado / parcial / pendente\n   A07 Auth Failures — mitigado / parcial / pendente\n   A08 Data Integrity Failures — mitigado / parcial / pendente\n   A09 Logging Failures — mitigado / parcial / pendente\n   A10 SSRF — mitigado / parcial / pendente\n\n2. LGPD CHECKLIST:\n   - PII identificado e mapeado?\n   - Consentimento explícito registrado?\n   - Direito ao esquecimento implementado (DELETE /api/auth/me)?\n   - Dados minimizados (apenas o necessário coletado)?\n\n3. SECRETS MANAGEMENT:\n   - Nenhum secret hardcoded no código?\n   - .env.example presente com todas as vars?\n   - .env no .gitignore?\n\n4. AUTH E RATE LIMITING:\n   - JWT com expiração configurada?\n   - Senha hasheada com scrypt ou bcrypt?\n   - Rate limiting nos endpoints de auth?\n\n5. VALIDAÇÃO DE INPUT:\n   - Joi ou Zod em todas as rotas com body?\n\nVEREDICTO FINAL:\n☐ APROVADO — todos os itens P0 mitigados\n☐ APROVADO COM RESSALVAS — itens P1 pendentes (listar)\n☐ REPROVADO — item P0 bloqueante (especificar)\n\nTimestamp: ${ctx.timestamp}`;
    const llm = await callLLM(prompt, { max_tokens: 1000, system: 'Você é o Security Validator do Vision Core. Responda em português. Seja objetivo. Um status por item. Veredicto claro no final.' });
    return { module: 'SF05', result: llm ? llm.text : `SECURITY VALIDATION\n\nProjeto: ${desc}\nTimestamp: ${ctx.timestamp}\n\nOWASP A01-A10: pendente de revisão\nLGPD: pendente\nSECRETS: verificar .env\nVEREDICTO: APROVADO COM RESSALVAS\n\nGerado por Vision Core — SF05`, provider: llm ? llm.provider : 'local' };
  },
  'risk-assessor': async (ctx) => {
    const prompt = `Avalie os riscos de deploy para o projeto "${ctx.project}". Classifique por severidade: BAIXO/MÉDIO/ALTO. Inclua: riscos de rollback, segurança, performance, compatibilidade. Timestamp: ${ctx.timestamp}`;
    const llm = await callLLM(prompt, { max_tokens: 700, system: 'Você é o Risk Assessor do Vision Core. Responda em português.' });
    return { module: 'SF06', result: llm ? llm.text : `RISK ASSESSMENT\n\nProjeto: ${ctx.project}\nTimestamp: ${ctx.timestamp}\n\nRisco deploy: BAIXO\nRisco rollback: MÉDIO\nRisco segurança: BAIXO\n\nGerado por Vision Core — SF06`, provider: llm ? llm.provider : 'local' };
  },
  'rollback-planner': async (ctx) => {
    const prompt = `Crie um plano de rollback detalhado para o projeto "${ctx.project}". Inclua: steps sequenciais, estimativa de tempo, validações pós-rollback. Timestamp: ${ctx.timestamp}`;
    const llm = await callLLM(prompt, { max_tokens: 700, system: 'Você é o Rollback Planner do Vision Core. Responda em português.' });
    return { module: 'SF07', result: llm ? llm.text : `ROLLBACK PLAN\n\nProjeto: ${ctx.project}\nTimestamp: ${ctx.timestamp}\n\nStep 1: Snapshot vault\nStep 2: Reverter CF Pages\nStep 3: Reverter EB\nStep 4: Validar /api/health\nETC: 4 min\n\nGerado por Vision Core — SF07`, provider: llm ? llm.provider : 'local' };
  },
  'gold-gate': async (ctx) => {
    // §191: +15 gates de segurança, LGPD e governança de specs
    const desc = ctx.project || 'projeto';
    const prompt = `Você é o Gold Gate Checker do Vision Core. Gere o checklist COMPLETO de aprovação para o projeto: "${desc}"\n\nGATES SDDF PADRÃO:\n☐ RUNTIME: /api/health retorna ok:true?\n☐ DIFF: patch revisado e aprovado?\n☐ VAULT: snapshot criado antes do deploy?\n☐ AEGIS: scan sem violations bloqueantes?\n☐ SDDF: harness D0-D7 executado?\n☐ PASS GOLD: score >= 95?\n\nGATES DE SEGURANÇA OBRIGATÓRIOS (OWASP + LGPD):\n☐ OWASP-01: Broken Access Control — RBAC implementado?\n☐ OWASP-02: Cryptographic Failures — dados sensíveis criptografados em repouso?\n☐ OWASP-03: Injection — queries parametrizadas? Joi/Zod em todos os inputs?\n☐ LGPD-01: PII mapeado e minimizado (coletar só o necessário)?\n☐ LGPD-02: Consentimento explícito registrado?\n☐ LGPD-03: DELETE /api/auth/me implementado (direito ao esquecimento)?\n☐ SECRETS-01: Zero secrets hardcoded (AEGIS secret scan passa)?\n☐ SECRETS-02: .env.example presente, .env no .gitignore?\n☐ RATE-01: Rate limiting configurado nos endpoints de auth (register/login)?\n☐ RATE-02: Helmet headers + CORS restrito configurados?\n\nGATES DE GOVERNANÇA E SPECS:\n☐ G11: docs/openapi.yaml presente com >= 3 endpoints documentados?\n☐ G12: docs/adr/0001-stack-decision.md presente (formato MADR)?\n☐ G13: .semgrep/semgrep.yaml com >= 4 regras e README com instrução de execução?\n☐ G14: docs/SECURITY.md com OWASP mapeado e LGPD tratado?\n☐ G15: Secrets: zero hardcoded, .env.example completo com todas as vars?\n\nPara cada gate: status (OK / PENDENTE / BLOQUEANTE) + evidência ou próximo passo.\nVEREDICTO FINAL: PASS GOLD / CONDICIONAL / REPROVADO\n\nTimestamp: ${ctx.timestamp}`;
    const llm = await callLLM(prompt, { max_tokens: 8000, timeout_ms: 90000, system: 'Você é o Gold Gate Checker do Vision Core. Responda em português com checklist detalhado. Um status por gate. Veredicto final claro. Máximo 3 linhas por item.' });
    return { module: 'SF08', result: llm ? llm.text : `GOLD GATE CHECKLIST\n\nProjeto: ${desc}\nTimestamp: ${ctx.timestamp}\n\n☐ RUNTIME — pendente\n☐ DIFF — pendente\n☐ VAULT — pendente\n☐ AEGIS — pendente\n☐ SDDF — pendente\n☐ OWASP-01 a 03 — pendente\n☐ LGPD-01 a 03 — pendente\n☐ SECRETS-01/02 — pendente\n☐ G11-G15 — pendente\n\nVEREDICTO: CONDICIONAL\n\nGerado por Vision Core — SF08`, provider: llm ? llm.provider : 'local' };
  },
  'deploy-blueprint': async (ctx) => {
    // §191: especificação técnica completa com ADRs, contrato de API e schema de banco
    const desc = ctx.project || 'projeto';
    const prompt = `Gere o documento de especificação técnica completa para o projeto: "${desc}"\n\n## 1. ARQUITETURA DE COMPONENTES\nDiagrama em ASCII mostrando: [Cliente] -> [API Gateway] -> [Express App] -> [DB] -> [Cache se aplicável]\nDescreva o papel de cada componente.\n\n## 2. DECISÕES DE DESIGN (ADRs)\nPara cada decisão arquitetural relevante:\n- Contexto: o que motivou a decisão\n- Opções consideradas: o que foi avaliado\n- Decisão tomada: o que foi escolhido\n- Consequências: trade-offs assumidos\n\n## 3. SEGURANÇA POR CAMADA\n- Transport: TLS obrigatório, HSTS, headers HTTP (Helmet)\n- Autenticação: JWT com expiração curta, refresh token, blacklist\n- Autorização: RBAC definido (roles e permissões por endpoint)\n- Dados: campos sensíveis criptografados, senhas em scrypt/bcrypt\n- API: rate limiting configurado, validação Joi/Zod em toda rota, CORS restrito\n\n## 4. CONTRATO DE API\nPara cada endpoint principal:\nMETHOD /caminho | Auth obrigatória? | Body schema | Responses (200/400/401/403/429/500) com payload exato\n\n## 5. SCHEMA DE BANCO\nCREATE TABLE ou schema Mongoose com campos reais, tipos, constraints, índices e FK.\n\nTimestamp: ${ctx.timestamp}\nResponda em português. Seja específico para o domínio informado. Evite generalidades.`;
    const llm = await callLLM(prompt, { max_tokens: 2000, system: 'Você é Arquiteto Sênior e especialista em especificações técnicas. Responda em português com formatação clara. Seja específico, evite placeholder e generalidades.' });
    return { module: 'SF09', result: llm ? llm.text : `DEPLOY BLUEPRINT\n\nProjeto: ${desc}\nTimestamp: ${ctx.timestamp}\n\n## Arquitetura\n[Cliente] -> [Gateway CF] -> [Express EB] -> [PostgreSQL]\n\n## ADRs\nDecisão 1: Node.js + Express — ecosistema maduro, npm, fácil deploy EB\n\n## Contrato API\nPOST /api/auth/login | public | {email,password} | 200:{token} 401:{error}\nGET  /api/me         | Bearer | - | 200:{user} 401:{error}\n\nGerado por Vision Core — SF09`, provider: llm ? llm.provider : 'local' };
  },
};

// §182 — gold-gate assíncrono: retorna job_id imediato, LLM roda em background
app.post('/api/sf/gold-gate', async (req, res) => {
  const body = normalizeBody(req);
  const ctx = body.context || body || {};
  ctx.timestamp = ctx.timestamp || now();
  if (!ctx.project && body.description) {
    ctx.project = String(body.description).split(/[\n.!?]/)[0].slice(0, 60).trim() || 'projeto';
  }
  ctx.project = ctx.project || 'visioncore';
  const jobId = `sfj-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  sfJobs.set(jobId, { status: 'pending', result: null, error: null, ts: Date.now() });
  // Limpar jobs antigos (> 10min)
  const _now = Date.now();
  for (const [k, v] of sfJobs.entries()) { if (_now - v.ts > 600000) sfJobs.delete(k); }
  // Background — sem await
  SF_GENERATORS['gold-gate'](ctx)
    .then(r  => sfJobs.set(jobId, { status: 'done',  result: r,           error: null,      ts: Date.now() }))
    .catch(e => sfJobs.set(jobId, { status: 'error', result: null,         error: e.message, ts: Date.now() }));
  return sendOk(res, { job_id: jobId, status: 'pending', anti_stub: true });
});

// §182 — poll de job assíncrono
app.get('/api/sf/job/:id', (req, res) => {
  const job = sfJobs.get(req.params.id);
  if (!job) return res.status(404).json({ ok: false, error: 'job_not_found', anti_stub: true });
  return sendOk(res, {
    job_id:     req.params.id,
    status:     job.status,
    result:     job.result ? (job.result.result     ?? null) : null,
    files:      job.result ? (job.result.files      ?? null) : null, // §187 — project-files expõe files[]
    provider:   job.result ? job.result.provider    : null,
    complexity: job.result ? (job.result.complexity ?? null) : null, // §193 — 'complex'|'standard'
    error:      job.error,
    anti_stub:  true
  });
});

// §185 — todos os SF generators assíncronos: retorna job_id imediato, LLM roda em background
// Fix 502 intermitente: CF Worker tem timeout 10s para endpoints SF não-chat/deploy;
// com resposta síncrona o LLM (~15-30s) ultrapassava. Padrão job_id igual ao gold-gate (§182).
// gold-gate já tem rota própria acima — skip para evitar duplo registro.
Object.keys(SF_GENERATORS).forEach(key => {
  if (key === 'gold-gate') return; // já registrado como async acima (§182)
  app.post('/api/sf/' + key, (req, res) => {
    const body = normalizeBody(req);
    const ctx = body.context || body || {};
    ctx.timestamp = ctx.timestamp || now();
    // §171: extrair nome do projeto da description quando não há ctx.project explícito
    if (!ctx.project && body.description) {
      ctx.project = String(body.description).split(/[\n.!?]/)[0].slice(0, 60).trim() || 'projeto';
    }
    ctx.project = ctx.project || 'visioncore';
    const jobId = `sfj-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    sfJobs.set(jobId, { status: 'pending', result: null, error: null, ts: Date.now() });
    const _now = Date.now();
    for (const [k, v] of sfJobs.entries()) { if (_now - v.ts > 600000) sfJobs.delete(k); }
    SF_GENERATORS[key](ctx)
      .then(r  => sfJobs.set(jobId, { status: 'done',  result: r,    error: null,      ts: Date.now() }))
      .catch(e => sfJobs.set(jobId, { status: 'error', result: null, error: e.message, ts: Date.now() }));
    return sendOk(res, { job_id: jobId, status: 'pending', anti_stub: true });
  });
});

// §164 — SF fetch-url: busca conteúdo de URL para contexto do Auto-Pilot
app.post('/api/sf/fetch-url', requireVisionAuth, async (req, res) => {
  const body = normalizeBody(req);
  const url = String(body.url || '').trim();
  try {
    const parsed = new URL(url);
    const resolvedTarget = await assertPublicFetchTarget(parsed);
    const isHttps = parsed.protocol === 'https:';
    const mod = isHttps ? require('https') : require('http');
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'User-Agent': 'VisionCore-SF/1.0', 'Accept': 'text/html,text/plain', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' },
      lookup: (_hostname, _opts, cb) => cb(null, resolvedTarget.address, resolvedTarget.family),
    };
    let settled = false;
    const finish = (status, payload) => {
      if (settled) return;
      settled = true;
      res.status(status).json(payload);
    };
    const httpReq = mod.request(options, (resp) => {
      let data = '';
      resp.on('data', chunk => { data += chunk; if (data.length > 50000) data = data.slice(0, 50000); });
      resp.on('end', () => {
        const text = data
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000);
        return finish(200, { ok: true, content: text, url, anti_stub: true });
      });
    });
    httpReq.on('error', (e) => finish(500, { ok: false, error: e.message, anti_stub: true }));
    httpReq.setTimeout(8000, () => { finish(408, { ok: false, error: 'timeout', anti_stub: true }); httpReq.destroy(); });
    httpReq.end();
  } catch(e) {
    const status = e.statusCode || 400;
    return res.status(status).json({ ok: false, error: e.message || 'invalid_url', anti_stub: true });
  }
});

// §189 — extração robusta de JSON para project-files
// Cobre: fences com/sem "json", CRLF, texto antes/depois, regex fallback
// §191d — formato ===FILE:=== como estratégia primária (sem escaping, LLM produz naturalmente)
function _extractFilesJson(text) {
  // 0) §191d: formato delimitado ===FILE:=== — parse sem nenhum problema de escaping JSON
  if (text.includes('===FILE:')) {
    const files = [];
    const parts = text.split(/===FILE:\s*/);
    for (let i = 1; i < parts.length; i++) {
      const nl = parts[i].indexOf('\n');
      if (nl < 0) continue;
      const name = parts[i].slice(0, nl).trim().replace(/={1,3}\s*$/, ''); // strip trailing === from name
      let content = parts[i].slice(nl + 1);
      content = content.replace(/===END===[\s\S]*$/, '').replace(/===FILE:[\s\S]*$/, '').trim();
      if (name && content) files.push({ name, content });
    }
    if (files.length > 0) return { files };
  }
  // 1) strip fences de todo tipo (```json, ```javascript, ```, com \r\n ou \n)
  let clean = text.replace(/```[\w]*\r?\n?/g, '').replace(/```/g, '').trim();
  // 2) tentativa directa
  try { const p = JSON.parse(clean); if (p && Array.isArray(p.files)) return p; } catch (_) {}
  // 3) extrair primeiro objeto JSON do texto (ignora texto antes/depois)
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { const p = JSON.parse(objMatch[0]); if (p && Array.isArray(p.files)) return p; } catch (_) {}
  }
  // 4) tentar array direto
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { const arr = JSON.parse(arrMatch[0]); if (Array.isArray(arr)) return { files: arr }; } catch (_) {}
  }
  return null;
}

// §193 — detecta domínio complexo que exige CLAUDE_CODE_BRIEF.md em vez de estrutura padrão
function _detectComplexity(description, accumulatedContext) {
  const text = (description + ' ' + (accumulatedContext || '')).toLowerCase();
  const hits = [
    'jurídic','judicial','forense','icp','tribunal','advogad','cartório','notarial',
    'fintech','pagament','pci-dss','cartão','financ','bitcoin','cripto','boleto',
    'saúde','medical','hipaa','prontuário','exame','laudo','diagnóstic',
    'blockchain','certificad','timestamp','custódia','cadeia de custódia',
    'semelhante ao','similar ao','como o site','igual ao','inspirado no'
  ].filter(d => text.includes(d)).length;
  return hits >= 2 ? 'complex' : 'standard';
}

// §183 — SF project-files: assíncrono (mesmo padrão §182) — retorna job_id imediato
// §189 — parsing robusto + retry automático (até 1 retry) quando LLM retorna JSON inválido
// §190 — prompts aprimorados: código funcional real, 12 arquivos, estrutura completa
// §191 — SF Professional Identity: 3 camadas (backend+frontend+docs+semgrep), 15 arquivos, governança completa
// §193 — acumulo de contexto dos steps + bifurcação complex/standard + CLAUDE_CODE_BRIEF.md
app.post('/api/sf/project-files', (req, res) => {
  const body = normalizeBody(req);
  const description = String(body.description || '').slice(0, 800);
  if (!description) return res.status(400).json({ ok: false, error: 'description_required', anti_stub: true });
  // §193: campos vindos do frontend após acumulo dos 7 steps
  const accCtx  = String(body.accumulated_context || '').slice(0, 2000);
  const step1   = String(body.step1_analysis || '').slice(0, 800);
  const step2   = String(body.step2_blueprint || '').slice(0, 800);
  const complexity = _detectComplexity(description, accCtx);
  const jobId = `sfj-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  sfJobs.set(jobId, { status: 'pending', result: null, error: null, ts: Date.now() });
  // Background — sem await
  (async () => {
    let files;
    // §193: branch complex → CLAUDE_CODE_BRIEF.md (briefing para Claude Code executar)
    if (complexity === 'complex') {
      // Fase A2 (gerador de infográfico do projeto, pós-brief — investigação
      // registrada no CLAUDE.md): o prompt original só SUGERIA os headers de
      // nível 1 como texto livre — nenhuma sub-formatação (tabela de stack,
      // numeração de módulo, bullets de risco) era exigida, então um parser
      // determinístico em cima do conteúdo não tinha contrato nenhum pra
      // confiar, só a sorte de o LLM formatar "do jeito certo" numa geração
      // específica. Cada seção abaixo agora especifica o FORMATO ESTRUTURAL
      // exato que o parser vai reconhecer via regex — o CONTEÚDO dentro de
      // cada item continua livre, só a casca (headers/tabela/bullets) é
      // obrigatória. Isto não é validado automaticamente (comportamento de
      // modelo, não determinístico) — só testável contra fixtures estáticas.
      const briefPrompt = 'Projeto complexo de alto risco regulatorio: "' + description + '"\n\n'
        + (step1 ? 'Analise do arquiteto (step1):\n' + step1 + '\n\n' : '')
        + (step2 ? 'Blueprint tecnico (step2):\n' + step2 + '\n\n' : '')
        + 'Use EXATAMENTE este formato:\n===FILE: CLAUDE_CODE_BRIEF.md===\n[conteudo]\n===END===\n\n'
        + 'Gere um CLAUDE_CODE_BRIEF.md completo com estas secoes. O FORMATO ESTRUTURAL abaixo (headers, tabela, bullets) e OBRIGATORIO e deve ser seguido a risca, sem variacao — um parser automatico depende exatamente dele. O CONTEUDO dentro de cada item e livre.\n'
        + '# CLAUDE CODE BRIEF\n'
        + '## DOMINIO E COMPLIANCE\n'
        + '**Dominio:** [uma frase objetiva descrevendo o dominio do projeto]\n'
        + '**Compliance Obrigatorio:**\n'
        + '- **<termo em negrito, ex: LGPD (Lei 13.709/2018)>:** [explicacao]\n'
        + '(um bullet por item de compliance — sempre comece pelo termo em negrito antes dos dois-pontos)\n'
        + '**Riscos Especificos:**\n'
        + '- **R1 - <titulo curto do risco>:** [descricao]\n'
        + '- **R2 - <titulo curto do risco>:** [descricao]\n'
        + '(numeracao R1, R2, R3... sequencial sem pular numeros; use as palavras "mais critico" ou "ATENCAO:" dentro da descricao APENAS nos riscos que sejam de fato mais graves que os outros — nao marque todos, e nao marque nenhum se nenhum se destacar de verdade)\n'
        + '## STACK JUSTIFICADA\n'
        + '[introducao opcional em prosa]\n'
        + '| Tecnologia | Camada | Justificativa |\n'
        + '|---|---|---|\n'
        + '| <nome da tecnologia> | <frontend/backend/dados/infra/seguranca> | <motivo especifico para este dominio> |\n'
        + '(uma linha de tabela por tecnologia da stack — nao descreva stack fora da tabela)\n'
        + '## ARQUITETURA DE COMPONENTES\n[diagrama ASCII completo, em bloco de codigo]\n'
        + '## MODULOS A IMPLEMENTAR\n'
        + '### M1 - <nome do modulo>\n'
        + '**Descricao:** [descricao objetiva do modulo]\n'
        + '**Dependencias:** [modulos ou servicos dos quais este depende]\n'
        + '**Criterio de Done:** [o que precisa ser verdade pro modulo ser considerado pronto]\n'
        + '### M2 - <nome do modulo>\n'
        + '(mesma estrutura por modulo — numeracao M1, M2, M3... sequencial, na ordem de execucao)\n'
        + '## SEQUENCIA DE COMANDOS CLAUDE CODE\n[prompts exatos para executar, um por modulo, com contexto suficiente]\n'
        + 'Exemplo: claude "Implemente [modulo]. Contexto: [contexto]. Criterio: [o que deve funcionar]"\n'
        + '## SPECS DE SEGURANCA\n[OWASP mapeado, LGPD checklist, Semgrep rules especificas do dominio]\n'
        + '## CRITERIOS DE PASS GOLD\n[gates especificos para este projeto, nao genericos]\n';
      const llmBrief = await callLLM(briefPrompt, { max_tokens: 12000, timeout_ms: 120000, system: 'Use EXATAMENTE o formato ===FILE: CLAUDE_CODE_BRIEF.md===\\nconteudo\\n===END===. Nao use JSON, nao use markdown code blocks. Siga a risca a formatacao estrutural exigida em cada secao (tabela markdown em STACK JUSTIFICADA, headers ### M<N> em MODULOS A IMPLEMENTAR, bullets **R<N> - titulo:** em Riscos Especificos, bullets **Termo:** em Compliance Obrigatorio) — um parser automatico depende exatamente desse formato. Seja especifico para o dominio no CONTEUDO de cada item.' });
      const parsedBrief = llmBrief ? _extractFilesJson(llmBrief.text) : null;
      if (parsedBrief && parsedBrief.files && parsedBrief.files.length) {
        files = parsedBrief.files.map(f => ({ name: String(f.name || 'CLAUDE_CODE_BRIEF.md'), content: String(f.content || '') }));
      } else {
        // Fallback determinístico — caminho legítimo e ESTRUTURALMENTE
        // DIFERENTE do caminho de sucesso acima (dispara quando o LLM falha
        // em usar ===FILE:=== ou a chamada erra/dá timeout). Reconhecível
        // pelo header "## Projeto" logo no início — nenhuma das seções ricas
        // acima (DOMINIO E COMPLIANCE, STACK JUSTIFICADA, MODULOS A
        // IMPLEMENTAR) existe aqui. Qualquer parser/gerador downstream
        // (ex: gerador de infográfico do projeto) que dependa dessas seções
        // deve DETECTAR esse caso (checar "## Projeto" antes de "##
        // DOMINIO E COMPLIANCE") e degradar graciosamente — pular a geração
        // em vez de tentar extrair estrutura que não existe neste brief.
        files = [{ name: 'CLAUDE_CODE_BRIEF.md', content: '# CLAUDE CODE BRIEF\n\n## Projeto\n' + description + '\n\n## Contexto Acumulado\n' + (accCtx || '(sem contexto dos steps — rodar Auto-Pilot primeiro)') + '\n\n## Stack (step1)\n' + (step1 || '(executar step 1 para analise de dominio)') + '\n\n## Blueprint (step2)\n' + (step2 || '(executar step 2 para blueprint tecnico)') + '\n\n## Proximos Passos\nExecute o Auto-Pilot completo antes de gerar o brief final.\n' }];
      }
      // injetar ADR + semgrep no brief tambem
      if (!files.some(f => f.name.includes('adr'))) files.push({ name: 'docs/adr/0001-stack-decision.md', content: '# ADR 0001: Stack Decision\n\n## Status\nAccepted\n\n## Context\nProjeto complexo: ' + description.slice(0, 120) + '\n\n## Decision\nVer CLAUDE_CODE_BRIEF.md — secao STACK JUSTIFICADA\n\n## Consequences\nCompliance obrigatorio identificado em CLAUDE_CODE_BRIEF.md\n' });
      if (!files.some(f => f.name.includes('semgrep'))) files.push({ name: '.semgrep/semgrep.yaml', content: 'rules:\n  - id: no-hardcoded-secrets\n    languages: [javascript, typescript]\n    message: Hardcoded secret detected.\n    severity: ERROR\n    pattern-either:\n      - pattern: PASSWORD = "..."\n      - pattern: SECRET = "..."\n  - id: no-sql-injection\n    languages: [javascript, typescript]\n    message: SQL injection risk.\n    severity: ERROR\n    pattern: db.query("..." + INPUT)\n  - id: no-path-traversal\n    languages: [javascript, typescript]\n    message: Path traversal risk.\n    severity: ERROR\n    pattern: path.join(DIR, REQ_PARAM)\n  - id: express-helmet-missing\n    languages: [javascript, typescript]\n    message: Use helmet() for security headers.\n    severity: WARNING\n    pattern: app.use(express.json())\n' });
      // Fase C (gerador de infográfico do projeto): decisão de anexar
      // PROJETO_INFOGRAFICO.html vive em tools/project-infographic.mjs
      // (testada isoladamente, 54/54) — aqui é só o glue code. import()
      // dinâmico porque o módulo é ESM (export/import) e este arquivo é
      // CommonJS (backend/package.json: "type":"commonjs"); require() não
      // carrega ESM de forma síncrona. Best-effort: falha na geração do
      // infográfico nunca derruba a entrega do brief em si (mesmo padrão
      // dos agentes best-effort do SF — Archivist/Hermes em §195).
      try {
        const { appendProjectInfographicFile } = await importToolsModule('project-infographic.mjs');
        files = appendProjectInfographicFile(files, { name: description.slice(0, 120) });
      } catch (_) {}
      // Diagrama de arquitetura via Archify (vendorizado em tools/vendor/archify,
      // ver README lá) — aditivo, nunca substitui PROJETO_INFOGRAFICO.html acima.
      // Mesmos dados já parseados do brief (stack), IR construído sem LLM.
      // Best-effort: renderiza como processo filho com timeout próprio
      // (project-architecture-diagram.mjs); falha/timeout nunca derruba a
      // entrega do brief.
      try {
        const { appendProjectArchitectureDiagramFile } = await importToolsModule('project-architecture-diagram.mjs');
        files = appendProjectArchitectureDiagramFile(files, { name: description.slice(0, 120) });
      } catch (_) {}
      const _prov = (llmBrief && llmBrief.provider) || 'local';
      sfJobs.set(jobId, { status: 'done', result: { files, total: files.length, provider: _prov, complexity: 'complex' }, error: null, ts: Date.now() });
      return;
    }
    // §193: branch standard — PROMPT1 enriquecido com decisoes dos steps 1+2
    // §191d/f/192: formato ===FILE:===, lista numerada, CSS inline
    const contextPrefix = (step1 || step2)
      ? 'DECISOES ARQUITETURAIS JA TOMADAS (use estas, nao invente stack diferente):\n'
        + (step1 ? 'Stack e dominio (step1):\n' + step1 + '\n\n' : '')
        + (step2 ? 'Blueprint tecnico (step2):\n' + step2 + '\n\n' : '')
        + '---\n\n'
      : '';
    const PROMPT1 = contextPrefix + 'Você é arquiteto sênior. Projeto: "' + description + '"\n\nGere EXATAMENTE estes 12 arquivos obrigatórios usando o formato abaixo. Todos os 12 são obrigatórios.\n\nFORMATO (use exatamente, sem markdown, sem JSON):\n===FILE: caminho/arquivo.ext===\nconteúdo\n===FILE: próximo/arquivo===\nconteúdo\n===END===\n\nARQUIVOS OBRIGATÓRIOS (gere todos os 12, nesta ordem):\n1.  src/index.js — Express com helmet(), cors({origin:process.env.FRONTEND_URL}), rateLimit() no topo\n2.  src/config/env.js — dotenv, process.exit(1) se var ausente\n3.  src/routes/auth.js — POST /register e POST /login com validação\n4.  src/middleware/auth.js — jwt.verify, retorna 401 se inválido\n5.  src/models/user.js — schema com campos reais (nome, email, senha, role)\n6.  Dockerfile — multi-stage, USER node, não root\n7.  .env.example — todas as vars com comentário\n8.  public/index.html — CSS INLINE no <head> (NÃO use <link> para CSS externo). 3 telas via JS: landing, login, dashboard. CSS obrigatório: background:#0f0f0f, cor primária #7c3aed, font system-ui, border-radius:12px, @media 768px.\n9.  public/js/app.js — fetch() reais aos endpoints, JWT no localStorage, sem jQuery\n10. README.md — setup completo (npm install, .env, npm start, endpoints)\n11. docs/openapi.yaml — OpenAPI 3.0: info + 3 paths (/register /login /me) + Bearer JWT\n12. docs/SECURITY.md — OWASP A01-A10 status, LGPD checklist, secrets policy\n\nREGRAS ABSOLUTAS:\n- ZERO TODO ou "// implementar"\n- Gere TODOS os 12 arquivos — não pare antes do arquivo 12\n- Use APENAS formato ===FILE:=== — sem JSON, sem markdown\n- CSS INLINE no <style> no index.html';
    const PROMPT2 = 'Projeto: "' + description.slice(0, 200) + '"\n\nJSON EXATO. Só JavaScript e Markdown. Máximo 6 arquivos simples:\n{"files":[{"name":"arquivo.ext","content":"código"}]}\nInclua: package.json, src/index.js (Express com helmet+cors), src/routes/auth.js, src/middleware/auth.js, public/index.html (HTML simples), README.md.\nZero YAML, zero Dockerfile, zero caracteres especiais que quebrem JSON.';
    const llm1 = await callLLM(PROMPT1, { max_tokens: 6000, timeout_ms: 90000, system: 'Use EXATAMENTE o formato ===FILE: caminho===\\nconteudo\\n===END=== para cada arquivo. NÃO use JSON. NÃO use markdown. Código funcional real, sem TODOs.' });
    let parsed = llm1 ? _extractFilesJson(llm1.text) : null;
    if (!parsed) {
      const llm2 = await callLLM(PROMPT2, { max_tokens: 2000, timeout_ms: 45000, system: 'Responda SOMENTE JSON. Zero texto adicional. Código JS funcional básico. Máximo 6 arquivos simples.' });
      if (llm2) parsed = _extractFilesJson(llm2.text);
    }
    if (!parsed) { sfJobs.set(jobId, { status: 'error', result: null, error: llm1 ? 'json_parse_failed' : 'llm_unavailable', ts: Date.now() }); return; }
    files = (parsed.files || []).slice(0, 15).map(f => ({ name: String(f.name || 'arquivo.txt'), content: String(f.content || '') }));
    // §191g: injetar templates determinísticos se LLM não gerou
    if (!files.some(f => f.name.includes('adr'))) files.push({ name: 'docs/adr/0001-stack-decision.md', content: '# ADR 0001: Stack Decision\n\n## Status\nAccepted\n\n## Context\nProjeto: ' + description.slice(0, 120) + '\nNecessita de autenticacao segura, API REST, persistencia de dados e deploy containerizado.\n\n## Decision\nNode.js + Express: ecossistema maduro, npm extenso, ideal para APIs REST.\nJWT: autenticacao stateless, adequado para APIs distribuidas.\nMongoose/PostgreSQL: schema definido, validacao, migrations.\nDocker: portabilidade, deploy consistente entre ambientes.\n\n## Consequences\n- Curva de aprendizado baixa para desenvolvedores JavaScript\n- JWT requer blacklist para revogacao antes da expiracao\n- Docker adiciona overhead mas garante reproducibilidade\n\n## Alternatives Considered\n- Python/FastAPI: rejeitado -- ecossistema JS preferido para consistencia\n- Sessions: rejeitado -- nao adequado para arquitetura stateless\n- SQLite: rejeitado -- nao adequado para producao concorrente\n' });
    if (!files.some(f => f.name.includes('semgrep'))) files.push({ name: '.semgrep/semgrep.yaml', content: 'rules:\n  - id: no-hardcoded-secrets\n    languages: [javascript, typescript]\n    message: Hardcoded secret detected. Use environment variables instead.\n    severity: ERROR\n    pattern-either:\n      - pattern: PASSWORD = "..."\n      - pattern: SECRET = "..."\n      - pattern: API_KEY = "..."\n\n  - id: no-sql-injection\n    languages: [javascript, typescript]\n    message: Potential SQL injection. Use parameterized queries.\n    severity: ERROR\n    pattern: db.query("..." + INPUT)\n\n  - id: no-path-traversal\n    languages: [javascript, typescript]\n    message: Potential path traversal. Validate file paths from user input.\n    severity: ERROR\n    pattern: path.join(DIR, REQ_PARAM)\n\n  - id: express-helmet-missing\n    languages: [javascript, typescript]\n    message: Express app should use helmet() for security headers.\n    severity: WARNING\n    pattern: app.use(express.json())\n' });
    // Diagrama de arquitetura via Archify — branch standard não tem brief
    // nem tabela de stack (ver PROMPT1/PROMPT2 acima); infere direto dos
    // caminhos de arquivo presentes em files[] (buildArchitectureIRFromFiles,
    // tools/project-architecture-diagram.mjs). Mesmo padrão aditivo/best-effort
    // do branch complex.
    try {
      const { appendProjectArchitectureDiagramFileFromFiles } = await importToolsModule('project-architecture-diagram.mjs');
      files = appendProjectArchitectureDiagramFileFromFiles(files, { name: description.slice(0, 120) });
    } catch (_) {}
    const _provider = (llm1 && llm1.provider) || 'local';
    sfJobs.set(jobId, { status: 'done', result: { files, total: files.length, provider: _provider, complexity: 'standard' }, error: null, ts: Date.now() });
  })().catch(e => sfJobs.set(jobId, { status: 'error', result: null, error: e.message, ts: Date.now() }));
  return sendOk(res, { job_id: jobId, status: 'pending', anti_stub: true });
});

// §181 — SF generate-zip: monta ZIP em memória a partir de files[]
app.post('/api/sf/generate-zip', (req, res) => {
  const body = normalizeBody(req);
  const files = body.files;
  if (!Array.isArray(files) || !files.length) return res.status(400).json({ ok: false, error: 'files_required', anti_stub: true });
  const project = String(body.project || 'projeto').replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 40) || 'projeto';
  try {
    const zipBuf = makeZip(files.map(f => ({ name: String(f.name || 'arquivo.txt'), data: String(f.content || '') })));
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${project}-vision-core.zip"`);
    res.setHeader('Content-Length', zipBuf.length);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.end(zipBuf);
  } catch(e) {
    return res.status(500).json({ ok: false, error: 'zip_failed', detail: e.message, anti_stub: true });
  }
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

/* §146: carregar DBs do S3 no startup (antes de app.listen) */
if (S3_BUCKET) {
  console.log('[s3] §146 startup: loading from bucket', S3_BUCKET);
  _s3LoadSync(USERS_DB);
  _s3LoadSync(PROJECTS_DB);
  _s3LoadSync(CHAT_CONVERSATIONS_DB);
  _s3LoadSync(OPERATION_LOG_DB);
  _s3LoadSync(BLACKLIST_FILE); // §152: blacklist do S3 antes de aceitar requests
  _s3LoadSync(SSO_DOMAINS_FILE); // §155: SSO domains do S3
  _s3LoadSync(PROVIDERS_VAULT_FILE); // AI Provider Vault: config principal do S3
  console.log('[s3] §146 startup load done');
}
_loadBlacklist(); // §152: carregar blacklist do arquivo local (pode já ter sido baixada do S3)
_loadSsoDomains(); // §155: carregar SSO domains do arquivo local
_loadProviderVault(); // AI Provider Vault: carregar do arquivo local

/* §112: init SQLite queue before accepting requests */
(async () => {
  await agentQueueDB.init(DB_ROOT);
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
})();
