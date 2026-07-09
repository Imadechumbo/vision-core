#!/usr/bin/env node
/**
 * incident-3-auth-fallback — trava de regressão do INCIDENTE-3 (CLAUDE.md)
 *
 * Sobe backend/server.js de verdade (child process, porta isolada) e prova que:
 *   (i)  POST /api/auth/register rejeita a credencial de fallback pública
 *        legada com 400 fallback_credential_rejected (Passo 1a).
 *   (ii) POST /api/auth/login não autentica uma conta legada cujo password_hash
 *        foi gerado a partir desse mesmo literal, pré-§145 (Passo 1b).
 *
 * O valor da credencial só existe aqui como literal de comparação/seed de teste
 * (o mesmo já hardcoded em produção há sessões, ver docs/CURRENT_HANDOFF.md) —
 * nunca é impresso; as asserções conferem status/código de erro, nunca o texto
 * de resposta bruto contendo o literal.
 *
 * Faz backup de data/users.json e data/audit-log.json antes de rodar e restaura
 * (ou remove, se não existiam) ao final — mesmo padrão de
 * tools/tests/provider-vault-endpoints.test.mjs.
 */
import { spawn } from 'child_process';
import { existsSync, unlinkSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import crypto from 'crypto';

const ROOT = resolve(process.cwd());
const USERS_FILE = resolve(ROOT, 'data', 'users.json');
const AUDIT_FILE = resolve(ROOT, 'data', 'audit-log.json');
const PORT = 18735; // porta alta distinta da usada por provider-vault-endpoints.test.mjs
const BASE = `http://127.0.0.1:${PORT}`;
const FALLBACK = 'vc-user-auto';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

function apiCall(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  }).then(r => r.json().then(json => ({ status: r.status, body: json })));
}

async function waitForHealth(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

// Mesmos parâmetros/formato de backend/server.js (hashPassword) — duplicado aqui
// de propósito: este teste seed uma conta "legada" diretamente no arquivo de
// dados, sem passar pelo endpoint de registro (que já recusa o literal).
const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_LEN = 32;
function hashLegacyStyle(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('hex');
  return `$scrypt$${SCRYPT_N}$${salt}$${hash}`;
}

const usersPreExisted = existsSync(USERS_FILE);
const usersPreExistedContent = usersPreExisted ? readFileSync(USERS_FILE, 'utf8') : null;
const auditPreExisted = existsSync(AUDIT_FILE);
const auditPreExistedContent = auditPreExisted ? readFileSync(AUDIT_FILE, 'utf8') : null;

const childEnv = { ...process.env, PORT: String(PORT), AWS_S3_BUCKET: '' };

const child = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
  cwd: ROOT,
  env: childEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', d => { serverLog += d.toString(); });
child.stderr.on('data', d => { serverLog += d.toString(); });

try {
  const up = await waitForHealth();
  assert(up, 'backend real sobe e responde /api/health dentro de 15s');
  if (!up) throw new Error('backend did not start:\n' + serverLog.slice(-2000));

  // --- (i) register recusa o literal de fallback ---
  const regEmail = `incident3-register-${Date.now()}@example.invalid`;
  const reg = await apiCall('/api/auth/register', { email: regEmail, password: FALLBACK });
  assert(reg.status === 400, 'POST /api/auth/register com a credencial de fallback retorna 400 (não 200)');
  assert(reg.body.ok === false && reg.body.error === 'fallback_credential_rejected', 'corpo do 400 traz error=fallback_credential_rejected');
  assert(JSON.stringify(reg.body).indexOf(FALLBACK) === -1, 'resposta do 400 nunca ecoa o literal da credencial');

  // conta não deve ter sido criada — um registro normal no mesmo email deve funcionar
  const regReal = await apiCall('/api/auth/register', { email: regEmail, password: 'senha-real-de-teste-123' });
  assert(regReal.status === 200 && regReal.body.ok === true, 'registro real subsequente no mesmo email funciona (nenhuma conta fantasma ficou presa pela tentativa recusada)');

  // --- (ii) login não autentica hash legado gerado a partir do literal ---
  const legacyEmail = `incident3-legacy-${Date.now()}@example.invalid`;
  const seedDb = { users: [ { id: 'usr_incident3_legacy', email: legacyEmail, name: '', password_hash: hashLegacyStyle(FALLBACK), plan: 'free', created_at: new Date().toISOString(), last_login: null } ] };
  writeFileSync(USERS_FILE, JSON.stringify(seedDb, null, 2), 'utf8');

  const legacyLogin = await apiCall('/api/auth/login', { email: legacyEmail, password: FALLBACK });
  assert(legacyLogin.status === 400, 'login com a credencial de fallback contra hash legado retorna 400 (não 200 com token)');
  assert(legacyLogin.body.ok === false && legacyLogin.body.error === 'fallback_credential_rejected', 'corpo do 400 traz error=fallback_credential_rejected (não invalid_credentials genérico)');
  assert(!('token' in legacyLogin.body), 'nenhum token é emitido para a tentativa com a credencial de fallback');

  // sanidade: a conta legada seedada continua existindo e uma senha errada comum
  // ainda cai no caminho normal (401 invalid_credentials), provando que só o
  // literal específico é bloqueado, não o endpoint inteiro
  const wrongLogin = await apiCall('/api/auth/login', { email: legacyEmail, password: 'senha-qualquer-errada' });
  assert(wrongLogin.status === 401 && wrongLogin.body.error === 'invalid_credentials', 'senha errada comum (não o literal de fallback) continua caindo no 401 genérico, endpoint não quebrou');

  // --- auditoria: evento fica registrado, valor nunca aparece no log ---
  const auditRaw = existsSync(AUDIT_FILE) ? readFileSync(AUDIT_FILE, 'utf8') : '';
  const auditEntries = auditRaw ? JSON.parse(auditRaw).entries || [] : [];
  const rejections = auditEntries.filter(e => e.action === 'auth_fallback_credential_rejected');
  assert(rejections.some(e => e.route === '/api/auth/register'), 'auditLog registra a tentativa recusada no register (categoria+rota)');
  assert(rejections.some(e => e.route === '/api/auth/login'), 'auditLog registra a tentativa recusada no login (categoria+rota)');
  assert(auditRaw.indexOf(FALLBACK) === -1, 'o literal da credencial nunca aparece no arquivo de audit log');

} finally {
  child.kill();
  try {
    if (usersPreExisted) writeFileSync(USERS_FILE, usersPreExistedContent, 'utf8');
    else if (existsSync(USERS_FILE)) unlinkSync(USERS_FILE);
  } catch {}
  try {
    if (auditPreExisted) writeFileSync(AUDIT_FILE, auditPreExistedContent, 'utf8');
    else if (existsSync(AUDIT_FILE)) unlinkSync(AUDIT_FILE);
  } catch {}
}

console.log(`\nincident-3-auth-fallback: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
