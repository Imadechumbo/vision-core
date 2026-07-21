#!/usr/bin/env node
// Regressão do incidente de segurança 2026-07-21 (Prioridade 0): POST
// /api/vault/rollback/:snapshotId sobrescrevia PROJECTS_DB inteiro (projetos
// de TODOS os usuários) sem nenhuma checagem de auth. /api/vault/snapshot e
// /api/vault/snapshots (a mesma feature, snapshot é o alvo do rollback)
// tinham o mesmo problema. Fix: as 3 rotas exigem requireVisionAdmin
// (role:'admin' — mesmo padrão já usado em /api/audit-log e
// /api/sso/domains), não só sessão — porque o estado que elas leem/escrevem
// é do sistema inteiro, não por-usuário. Este teste trava: 401 sem sessão,
// 403 com sessão mas sem role admin, 200 com role admin, o rollback real
// restaurando PROJECTS_DB, e o auditLog('vault_rollback') sendo gravado.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const USERS_DB = resolve(ROOT, 'data', 'users.json');
const PROJECTS_DB = resolve(ROOT, 'data', 'projects.json');
const SNAPSHOTS_DIR = resolve(ROOT, 'data', 'snapshots');
const AUDIT_LOG_FILE = resolve(ROOT, 'data', 'audit-log.json');
const usersBackup = existsSync(USERS_DB) ? readFileSync(USERS_DB) : null;
const projectsBackup = existsSync(PROJECTS_DB) ? readFileSync(PROJECTS_DB) : null;
const auditBackup = existsSync(AUDIT_LOG_FILE) ? readFileSync(AUDIT_LOG_FILE) : null;
const PORT = 18740;
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;
let serverLog = '';
const createdSnapshotFiles = [];

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
      SESSION_SECRET: 'vault-rollback-auth-test-session-secret-32',
      PROVIDER_VAULT_SECRET: 'vault-rollback-auth-test-vault-secret-32',
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

async function registerUser(email) {
  const reg = await request('/api/auth/register', { method: 'POST', body: { email, password: 'Test1234!Secure', name: email } });
  return { token: reg.body.token, id: reg.body.user.id, email };
}

// Não existe endpoint de promoção a admin (achado real, documentado no handoff) —
// mesma limitação que /api/audit-log e /api/sso/domains já tinham antes desta
// sessão. Simula o único caminho real hoje: edição direta do users.json.
function promoteToAdmin(userId) {
  const db = JSON.parse(readFileSync(USERS_DB, 'utf8'));
  const user = db.users.find((u) => u.id === userId);
  user.role = 'admin';
  writeFileSync(USERS_DB, JSON.stringify(db, null, 2), 'utf8');
}

const child = await spawnServer();

try {
  const stamp = Date.now();

  const noAuthSnapshotCreate = await request('/api/vault/snapshot', { method: 'POST' });
  const noAuthSnapshotList = await request('/api/vault/snapshots');
  const noAuthRollback = await request('/api/vault/rollback/whatever-id', { method: 'POST' });
  assert(noAuthSnapshotCreate.status === 401, 'POST /api/vault/snapshot sem sessão retorna 401');
  assert(noAuthSnapshotList.status === 401, 'GET /api/vault/snapshots sem sessão retorna 401');
  assert(noAuthRollback.status === 401, 'POST /api/vault/rollback/:id sem sessão retorna 401 (nem chega a olhar o snapshotId)');

  const regularUser = await registerUser(`vault-rollback-regular-${stamp}@example.com`);
  const regularSnapshotCreate = await request('/api/vault/snapshot', { method: 'POST', token: regularUser.token });
  const regularSnapshotList = await request('/api/vault/snapshots', { token: regularUser.token });
  const regularRollback = await request('/api/vault/rollback/whatever-id', { method: 'POST', token: regularUser.token });
  assert(regularSnapshotCreate.status === 403, 'usuário comum autenticado (sem role admin) recebe 403 ao criar snapshot');
  assert(regularSnapshotList.status === 403, 'usuário comum autenticado recebe 403 ao listar snapshots');
  assert(regularRollback.status === 403, 'usuário comum autenticado recebe 403 ao tentar rollback — não basta estar logado');

  // usuário B tem um projeto ANTES do snapshot; snapshot congela esse estado;
  // depois do snapshot usuário B cria um 2º projeto; rollback do admin deve
  // apagar o 2º projeto e restaurar só o que existia no snapshot — provando
  // que a operação é real (sobrescreve PROJECTS_DB de todo mundo), não um stub.
  const userB = await registerUser(`vault-rollback-userb-${stamp}@example.com`);
  const projectBefore = await request('/api/projects', { method: 'POST', token: userB.token, body: { name: 'projeto-antes-do-snapshot' } });
  assert(projectBefore.status === 200, 'usuário B cria projeto antes do snapshot');

  const admin = await registerUser(`vault-rollback-admin-${stamp}@example.com`);
  promoteToAdmin(admin.id);

  const snapshotCreate = await request('/api/vault/snapshot', { method: 'POST', token: admin.token, body: { label: 'teste-regressao' } });
  assert(snapshotCreate.status === 200 && snapshotCreate.body.snapshot_id, 'admin real (role:admin) cria snapshot com sucesso');
  const snapshotId = snapshotCreate.body.snapshot_id;
  createdSnapshotFiles.push(resolve(SNAPSHOTS_DIR, `${snapshotId}.json`));

  const snapshotList = await request('/api/vault/snapshots', { token: admin.token });
  assert(snapshotList.status === 200 && snapshotList.body.snapshots.some((s) => s.id === snapshotId), 'admin lista snapshots com sucesso, incluindo o recém-criado');

  const projectAfter = await request('/api/projects', { method: 'POST', token: userB.token, body: { name: 'projeto-depois-do-snapshot' } });
  assert(projectAfter.status === 200, 'usuário B cria um 2º projeto depois do snapshot');

  const rollback = await request(`/api/vault/rollback/${snapshotId}`, { method: 'POST', token: admin.token });
  assert(rollback.status === 200 && rollback.body.rolled_back === true, 'admin real executa o rollback com sucesso');

  const projectsAfterRollback = await request('/api/projects', { token: userB.token });
  const names = projectsAfterRollback.body.projects.map((p) => p.name);
  assert(names.includes('projeto-antes-do-snapshot') && !names.includes('projeto-depois-do-snapshot'), 'rollback real restaura PROJECTS_DB pro estado do snapshot — projeto criado depois some');

  const auditLog = JSON.parse(readFileSync(AUDIT_LOG_FILE, 'utf8'));
  const rollbackEntry = auditLog.entries.find((e) => e.action === 'vault_rollback' && e.snapshot_id === snapshotId);
  assert(!!rollbackEntry && rollbackEntry.admin_email === admin.email, 'auditLog grava vault_rollback com snapshot_id + admin_email — escrita destrutiva com rastro');

  console.log(`\n${passed}/${passed} PASS`);
} catch (error) {
  console.error(error.message);
  if (serverLog) console.error(serverLog.slice(-2000));
  process.exitCode = 1;
} finally {
  await killServer(child);
  if (usersBackup) writeFileSync(USERS_DB, usersBackup); else if (existsSync(USERS_DB)) unlinkSync(USERS_DB);
  if (projectsBackup) writeFileSync(PROJECTS_DB, projectsBackup); else if (existsSync(PROJECTS_DB)) unlinkSync(PROJECTS_DB);
  if (auditBackup) writeFileSync(AUDIT_LOG_FILE, auditBackup); else if (existsSync(AUDIT_LOG_FILE)) unlinkSync(AUDIT_LOG_FILE);
  for (const file of createdSnapshotFiles) { try { rmSync(file, { force: true }); } catch {} }
}
