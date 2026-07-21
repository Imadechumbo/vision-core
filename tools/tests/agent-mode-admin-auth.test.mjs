#!/usr/bin/env node
// Regressão do achado 2026-07-21 (sessão seguinte ao fix do vault): POST
// /api/agents/:id/mode escrevia em _agentModesStore (estado global em memória,
// afeta detectActiveAgent() pra TODOS os usuários) sem nenhuma checagem de auth —
// mesma categoria do vault, corrigido com requireVisionAdmin. Ao mesmo tempo,
// requireVisionAdmin ganhou um 2º caminho pra virar admin: ADMIN_ALLOWED_EMAILS
// (env var, allowlist controlada pelo operador, mesmo padrão de
// SF_REAL_EXECUTION_ALLOWED_AGENTS), porque role:'admin' só era atribuível hoje
// por edição manual de users.json — inoperável em produção real. Este teste trava:
// 401 sem sessão, 403 com sessão comum, 200 com role:'admin' (caminho antigo, ainda
// funciona) e 200 com email na allowlist (caminho novo), fail-closed quando a env
// var está ausente/vazia mesmo pra quem "parece" admin, e o auditLog gravado.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const USERS_DB = resolve(ROOT, 'data', 'users.json');
const AUDIT_LOG_FILE = resolve(ROOT, 'data', 'audit-log.json');
const usersBackup = existsSync(USERS_DB) ? readFileSync(USERS_DB) : null;
const auditBackup = existsSync(AUDIT_LOG_FILE) ? readFileSync(AUDIT_LOG_FILE) : null;
let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ✓ ${message}`);
  passed++;
}

async function request(base, path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}

async function spawnServer(port, extraEnv = {}) {
  const proc = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      AWS_S3_BUCKET: '',
      SESSION_SECRET: 'agent-mode-admin-auth-test-session-secret-32',
      PROVIDER_VAULT_SECRET: 'agent-mode-admin-auth-test-vault-secret-32',
      ADMIN_ALLOWED_EMAILS: '',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  proc.stdout.on('data', (data) => { serverLog += data; });
  proc.stderr.on('data', (data) => { serverLog += data; });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(base + '/api/health')).ok) return { proc, base, getLog: () => serverLog }; } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error('server did not become healthy in time');
}

async function killServer(proc) {
  proc.kill('SIGTERM');
  await new Promise((resolveWait) => proc.once('exit', resolveWait));
}

async function registerUser(base, email) {
  const reg = await request(base, '/api/auth/register', { method: 'POST', body: { email, password: 'Test1234!Secure', name: email } });
  return { token: reg.body.token, id: reg.body.user.id, email };
}

// Não existe endpoint de promoção a admin (decisão deliberada desta sessão) — único
// caminho real pra role:'admin' continua sendo edição direta de users.json.
function promoteToAdmin(userId) {
  const db = JSON.parse(readFileSync(USERS_DB, 'utf8'));
  const user = db.users.find((u) => u.id === userId);
  user.role = 'admin';
  writeFileSync(USERS_DB, JSON.stringify(db, null, 2), 'utf8');
}

const stamp = Date.now();
let serverA;
let serverB;

try {
  // ── Servidor A: ADMIN_ALLOWED_EMAILS vazia — cobre 401/403/role-admin + fail-closed ──
  serverA = await spawnServer(18741);
  const { base: baseA } = serverA;

  const noAuth = await request(baseA, '/api/agents/backend/mode', { method: 'POST', body: { mode: 'OFF' } });
  assert(noAuth.status === 401, 'POST /api/agents/:id/mode sem sessão retorna 401');

  const regular = await registerUser(baseA, `agent-mode-regular-${stamp}@example.com`);
  const regularAttempt = await request(baseA, '/api/agents/security/mode', { method: 'POST', body: { mode: 'OFF' }, token: regular.token });
  assert(regularAttempt.status === 403, 'usuário comum autenticado (sem role admin, email fora da allowlist) recebe 403 — não basta estar logado');

  // fail-closed: mesmo que o e-mail "pareça" admin, ADMIN_ALLOWED_EMAILS vazia não concede nada
  const wouldBeAdmin = await registerUser(baseA, `agent-mode-allowlisted-${stamp}@example.com`);
  const wouldBeAdminAttempt = await request(baseA, '/api/agents/security/mode', { method: 'POST', body: { mode: 'OFF' }, token: wouldBeAdmin.token });
  assert(wouldBeAdminAttempt.status === 403, 'com ADMIN_ALLOWED_EMAILS ausente/vazia, ninguém vira admin por e-mail — fail-closed');

  const admin = await registerUser(baseA, `agent-mode-admin-${stamp}@example.com`);
  promoteToAdmin(admin.id);
  const adminChange = await request(baseA, '/api/agents/security/mode', { method: 'POST', body: { mode: 'OFF' }, token: admin.token });
  assert(adminChange.status === 200 && adminChange.body.ok === true, 'admin real (role:admin, caminho antigo) muda o modo com sucesso');

  const catalogAfter = await request(baseA, '/api/agents/catalog', { token: admin.token });
  const securityAgent = catalogAfter.body.agents.find((a) => a.id === 'security');
  assert(securityAgent && securityAgent.current_mode === 'OFF', 'estado real persistido — lido de volta via GET /api/agents/catalog, não só a resposta do POST');

  const auditEntries = JSON.parse(readFileSync(AUDIT_LOG_FILE, 'utf8')).entries;
  const auditEntry = auditEntries.find((e) => e.action === 'agent_mode_changed' && e.agent_id === 'security');
  assert(!!auditEntry && auditEntry.mode === 'OFF' && auditEntry.admin_email === admin.email, 'auditLog grava agent_mode_changed com agent_id/mode/admin_email — escrita de segurança operacional com rastro');

  await killServer(serverA.proc);
  serverA = null;

  // ── Servidor B: ADMIN_ALLOWED_EMAILS com 1 e-mail — cobre o caminho novo (env var) ──
  // e-mail diferente do usado no servidor A (users.json é compartilhado em disco
  // entre os 2 spawns; reusar o mesmo e-mail bateria em email_already_registered)
  const allowlistedEmail = `agent-mode-allowlisted-b-${stamp}@example.com`;
  serverB = await spawnServer(18742, { ADMIN_ALLOWED_EMAILS: allowlistedEmail });
  const { base: baseB } = serverB;

  const listedUser = await registerUser(baseB, allowlistedEmail);
  const listedAttempt = await request(baseB, '/api/agents/backend/mode', { method: 'POST', body: { mode: 'ON' }, token: listedUser.token });
  assert(listedAttempt.status === 200 && listedAttempt.body.ok === true, 'usuário com e-mail na allowlist (ADMIN_ALLOWED_EMAILS) vira admin sem precisar de role:admin persistido em users.json');

  const unlistedUser = await registerUser(baseB, `agent-mode-not-listed-${stamp}@example.com`);
  const unlistedAttempt = await request(baseB, '/api/agents/backend/mode', { method: 'POST', body: { mode: 'OFF' }, token: unlistedUser.token });
  assert(unlistedAttempt.status === 403, 'com a env var setada, usuário fora da lista continua recebendo 403 — allowlist é exclusiva, não libera geral');

  console.log(`\n${passed}/${passed} PASS`);
} catch (error) {
  console.error(error.message);
  if (serverA) console.error(serverA.getLog().slice(-2000));
  if (serverB) console.error(serverB.getLog().slice(-2000));
  process.exitCode = 1;
} finally {
  if (serverA) await killServer(serverA.proc);
  if (serverB) await killServer(serverB.proc);
  if (usersBackup) writeFileSync(USERS_DB, usersBackup); else if (existsSync(USERS_DB)) unlinkSync(USERS_DB);
  if (auditBackup) writeFileSync(AUDIT_LOG_FILE, auditBackup); else if (existsSync(AUDIT_LOG_FILE)) unlinkSync(AUDIT_LOG_FILE);
}
