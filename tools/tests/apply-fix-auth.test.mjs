#!/usr/bin/env node
// LEGACY_AUDIT achado C (2026-07-23): POST /api/security/apply-fix escrevia em disco real
// (fs.writeFileSync) na instância de produção sem nenhuma autenticação — só path traversal
// era checado. requireVisionAuth agora exige sessão válida. Este teste trava 401 sem sessão
// e confirma que uma sessão válida continua conseguindo escrever o arquivo esperado (não
// quebra o fluxo legítimo do Next, que já mostra dupla confirmação client-side antes de
// chamar esta rota).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const USERS_DB = resolve(ROOT, 'data', 'users.json');
const usersBackup = existsSync(USERS_DB) ? readFileSync(USERS_DB) : null;
const PORT = 18745;
const BASE = `http://127.0.0.1:${PORT}`;
const FIXTURE_DIR = resolve(ROOT, '_fixture_apply_fix_auth_test');
const FIXTURE_FILE = resolve(FIXTURE_DIR, 'sample.js');
let passed = 0;
let serverLog = '';

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ✓ ${message}`);
  passed++;
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}

async function spawnServer() {
  const proc = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      AWS_S3_BUCKET: '',
      SESSION_SECRET: 'apply-fix-auth-test-session-secret-32char',
      PROVIDER_VAULT_SECRET: 'apply-fix-auth-test-vault-secret-32char',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (data) => { serverLog += data; });
  proc.stderr.on('data', (data) => { serverLog += data; });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(BASE + '/api/health')).ok) return proc; } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error('server did not become healthy in time');
}

async function killServer(proc) {
  proc.kill('SIGTERM');
  await new Promise((resolveWait) => proc.once('exit', resolveWait));
}

mkdirSync(FIXTURE_DIR, { recursive: true });
writeFileSync(FIXTURE_FILE, 'line1\nline2\nline3\n', 'utf8');

const child = await spawnServer();

try {
  const payload = {
    violation: { file: 'sample.js', line: 2, rule_id: 'test-rule' },
    fix: { after: 'line2_patched' },
    project_root: FIXTURE_DIR,
  };

  const noAuth = await request('/api/security/apply-fix', { method: 'POST', body: payload });
  assert(noAuth.status === 401 && noAuth.body.error === 'not_authenticated', 'POST /api/security/apply-fix sem sessão retorna 401, arquivo não é tocado');
  assert(readFileSync(FIXTURE_FILE, 'utf8').includes('line2') && !readFileSync(FIXTURE_FILE, 'utf8').includes('line2_patched'), 'arquivo real permanece intocado após a tentativa sem sessão');

  const reg = await request('/api/auth/register', { method: 'POST', body: { email: `apply-fix-auth-${Date.now()}@example.com`, password: 'Test1234!Secure', name: 'x' } });
  const authed = await request('/api/security/apply-fix', { method: 'POST', body: payload, token: reg.body.token });
  assert(authed.status === 200 && authed.body.ok === true, 'com sessão válida, apply-fix continua funcionando (200)');
  assert(readFileSync(FIXTURE_FILE, 'utf8').includes('line2_patched'), 'arquivo real foi escrito de verdade pela sessão autenticada — fluxo legítimo preservado');

  console.log(`\n${passed}/${passed} PASS`);
} catch (error) {
  console.error(error.message);
  console.error(serverLog.slice(-2000));
  process.exitCode = 1;
} finally {
  await killServer(child);
  if (usersBackup) writeFileSync(USERS_DB, usersBackup);
  else if (existsSync(USERS_DB)) unlinkSync(USERS_DB);
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
}
