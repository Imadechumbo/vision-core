#!/usr/bin/env node
// Residual security coverage for ADMIN_ALLOWED_EMAILS bootstrap and agent mode store.
// Keeps the main regression test small while proving: env var truly absent,
// identity spoofing ignored, and Object.create(null) serializes through GET /api/agents/modes.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const USERS_DB = resolve(ROOT, 'data', 'users.json');
const AUDIT_LOG_FILE = resolve(ROOT, 'data', 'audit-log.json');
const usersBackup = existsSync(USERS_DB) ? readFileSync(USERS_DB) : null;
const auditBackup = existsSync(AUDIT_LOG_FILE) ? readFileSync(AUDIT_LOG_FILE) : null;
const originalAdminAllowedEmails = process.env.ADMIN_ALLOWED_EMAILS;
let passed = 0;
let serverAbsent;
let serverSpoof;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log('  ✓ ' + message);
  passed++;
}

async function request(base, path, options = {}) {
  const method = options.method || 'GET';
  const body = options.body;
  const token = options.token;
  const headers = { ...(options.headers || {}) };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}

async function spawnServer(port, extraEnv = {}) {
  const childEnv = {
    ...process.env,
    PORT: String(port),
    AWS_S3_BUCKET: '',
    SESSION_SECRET: 'agent-mode-admin-residuals-session-secret-32',
    PROVIDER_VAULT_SECRET: 'agent-mode-admin-residuals-vault-secret-32',
    ADMIN_ALLOWED_EMAILS: '',
    ...extraEnv,
  };
  if (extraEnv.ADMIN_ALLOWED_EMAILS === null) delete childEnv.ADMIN_ALLOWED_EMAILS;

  const proc = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
    cwd: ROOT,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  proc.stdout.on('data', (data) => { serverLog += data; });
  proc.stderr.on('data', (data) => { serverLog += data; });
  const base = 'http://127.0.0.1:' + port;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(base + '/api/health')).ok) return { proc, base, getLog: () => serverLog }; } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error('server did not become healthy in time: ' + serverLog.slice(-1200));
}

async function killServer(proc) {
  proc.kill('SIGTERM');
  await new Promise((resolveWait) => proc.once('exit', resolveWait));
}

async function registerUser(base, email) {
  const reg = await request(base, '/api/auth/register', { method: 'POST', body: { email, password: 'Test1234!Secure', name: email } });
  if (reg.status !== 200 || !reg.body.token) throw new Error('register failed for ' + email + ': ' + JSON.stringify(reg.body));
  return { token: reg.body.token, id: reg.body.user.id, email };
}

const stamp = Date.now();

try {
  delete process.env.ADMIN_ALLOWED_EMAILS;
  assert(!Object.prototype.hasOwnProperty.call(process.env, 'ADMIN_ALLOWED_EMAILS'), 'process.env.ADMIN_ALLOWED_EMAILS foi removida no processo do teste');

  serverAbsent = await spawnServer(18745, { ADMIN_ALLOWED_EMAILS: null });
  const absentUser = await registerUser(serverAbsent.base, 'agent-mode-absent-' + stamp + '@example.com');
  const absentAgent = await request(serverAbsent.base, '/api/agents/security/mode', { method: 'POST', body: { mode: 'OFF' }, token: absentUser.token });
  assert(absentAgent.status === 403, 'env ausente mantém /api/agents/:id/mode em 403 para usuário comum autenticado');
  const absentSnapshot = await request(serverAbsent.base, '/api/vault/snapshot', { method: 'POST', body: { label: 'absent-env' }, token: absentUser.token });
  assert(absentSnapshot.status === 403, 'env ausente mantém POST /api/vault/snapshot em 403');
  const absentSnapshots = await request(serverAbsent.base, '/api/vault/snapshots', { token: absentUser.token });
  assert(absentSnapshots.status === 403, 'env ausente mantém GET /api/vault/snapshots em 403');
  const absentRollback = await request(serverAbsent.base, '/api/vault/rollback/not-real', { method: 'POST', token: absentUser.token });
  assert(absentRollback.status === 403, 'env ausente mantém POST /api/vault/rollback/:id em 403');
  await killServer(serverAbsent.proc);
  serverAbsent = null;

  const allowlistedEmail = 'agent-mode-listed-' + stamp + '@example.com';
  serverSpoof = await spawnServer(18746, { ADMIN_ALLOWED_EMAILS: allowlistedEmail });
  const listedUser = await registerUser(serverSpoof.base, allowlistedEmail);
  const setBackendOn = await request(serverSpoof.base, '/api/agents/backend/mode', { method: 'POST', body: { mode: 'ON' }, token: listedUser.token });
  assert(setBackendOn.status === 200 && setBackendOn.body.mode === 'ON', 'admin allowlisted define backend ON para baseline de mutação');

  const modes = await request(serverSpoof.base, '/api/agents/modes', { token: listedUser.token });
  assert(modes.status === 200 && modes.body.ok === true, 'GET /api/agents/modes retorna HTTP 200 e JSON válido');
  assert(modes.body.modes && modes.body.modes.backend === 'ON', 'GET /api/agents/modes serializa Object.create(null) com agent_id e modo esperado');
  assert(!Object.prototype.hasOwnProperty.call(modes.body.modes, 'constructor'), 'modes não expõe constructor como chave própria/controlável');
  assert(!Object.prototype.hasOwnProperty.call(modes.body.modes, '__proto__'), 'modes não expõe __proto__ como chave própria/controlável');
  assert(!Object.prototype.hasOwnProperty.call(modes.body.modes, 'prototype'), 'modes não expõe prototype como chave própria/controlável');

  const unlistedUser = await registerUser(serverSpoof.base, 'agent-mode-unlisted-' + stamp + '@example.com');
  const auditBeforeSpoof = JSON.parse(readFileSync(AUDIT_LOG_FILE, 'utf8')).entries.filter((e) => e.action === 'agent_mode_changed').length;
  const spoofAttempts = [
    { label: 'body.email', path: '/api/agents/backend/mode', body: { mode: 'OFF', email: allowlistedEmail } },
    { label: 'body.role', path: '/api/agents/backend/mode', body: { mode: 'OFF', role: 'admin' } },
    { label: 'body.user', path: '/api/agents/backend/mode', body: { mode: 'OFF', user: { email: allowlistedEmail, role: 'admin' } } },
    { label: 'body.visionUser', path: '/api/agents/backend/mode', body: { mode: 'OFF', visionUser: { email: allowlistedEmail, role: 'admin' } } },
    { label: 'query.email', path: '/api/agents/backend/mode?email=' + encodeURIComponent(allowlistedEmail), body: { mode: 'OFF' } },
    { label: 'query.role', path: '/api/agents/backend/mode?role=admin', body: { mode: 'OFF' } },
    { label: 'headers', path: '/api/agents/backend/mode', body: { mode: 'OFF' }, headers: { 'x-user-email': allowlistedEmail, 'x-admin-email': allowlistedEmail, 'x-user-role': 'admin', 'x-vision-user': JSON.stringify({ email: allowlistedEmail, role: 'admin' }) } },
  ];
  for (const spoof of spoofAttempts) {
    const attempt = await request(serverSpoof.base, spoof.path, { method: 'POST', body: spoof.body, token: unlistedUser.token, headers: spoof.headers });
    assert(attempt.status === 403, 'spoof de identidade via ' + spoof.label + ' continua retornando 403');
    const catalogAfterSpoof = await request(serverSpoof.base, '/api/agents/catalog');
    const backendAfterSpoof = catalogAfterSpoof.body.agents.find((a) => a.id === 'backend');
    assert(backendAfterSpoof && backendAfterSpoof.current_mode === 'ON', 'spoof via ' + spoof.label + ' não muda o modo do agente');
    const auditNow = JSON.parse(readFileSync(AUDIT_LOG_FILE, 'utf8')).entries;
    const spoofAudit = auditNow.find((e) => e.action === 'agent_mode_changed' && e.admin_email === unlistedUser.email);
    assert(!spoofAudit, 'spoof via ' + spoof.label + ' não cria auditLog administrativo indevido');
    assert(auditNow.filter((e) => e.action === 'agent_mode_changed').length === auditBeforeSpoof, 'spoof via ' + spoof.label + ' não cria nova mutação auditada');
  }

  await killServer(serverSpoof.proc);
  serverSpoof = null;
  serverSpoof = await spawnServer(18747, { ADMIN_ALLOWED_EMAILS: allowlistedEmail });
  const freshCatalog = await request(serverSpoof.base, '/api/agents/catalog');
  const freshBackend = freshCatalog.body.agents.find((a) => a.id === 'backend');
  assert(freshBackend && freshBackend.current_mode === freshBackend.default_mode, 'reinicialização do servidor volta ao default em memória');

  console.log('\n' + passed + '/' + passed + ' PASS');
} catch (error) {
  console.error(error.message);
  if (serverAbsent) console.error(serverAbsent.getLog().slice(-2000));
  if (serverSpoof) console.error(serverSpoof.getLog().slice(-2000));
  process.exitCode = 1;
} finally {
  if (serverAbsent) await killServer(serverAbsent.proc);
  if (serverSpoof) await killServer(serverSpoof.proc);
  if (originalAdminAllowedEmails === undefined) delete process.env.ADMIN_ALLOWED_EMAILS;
  else process.env.ADMIN_ALLOWED_EMAILS = originalAdminAllowedEmails;
  if (usersBackup) writeFileSync(USERS_DB, usersBackup); else if (existsSync(USERS_DB)) unlinkSync(USERS_DB);
  if (auditBackup) writeFileSync(AUDIT_LOG_FILE, auditBackup); else if (existsSync(AUDIT_LOG_FILE)) unlinkSync(AUDIT_LOG_FILE);
}