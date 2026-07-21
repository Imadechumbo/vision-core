#!/usr/bin/env node
// Regressão do incidente de segurança 2026-07-20: /api/obsidian/status,
// /api/obsidian/export-mission e /api/obsidian/download-vault não tinham
// nenhuma checagem de auth (qualquer pessoa baixava o vault de todo mundo) e
// VAULT_ROOT era um diretório único global. Fix: requireVisionAuth nas 3
// rotas + segregação por VAULT_ROOT/<user_id>. Este teste trava as duas
// coisas: 401 sem sessão, e isolamento real entre 2 usuários autenticados.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const USERS_DB = resolve(ROOT, 'data', 'users.json');
const VAULT_ROOT = resolve(ROOT, 'memory', 'obsidian', 'VisionCoreVault');
const usersBackup = existsSync(USERS_DB) ? readFileSync(USERS_DB) : null;
const PORT = 18739;
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;
let serverLog = '';
const createdVaultDirs = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ✓ ${message}`);
  passed++;
}

async function request(path, { method = 'GET', body, token, raw } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (raw) return { status: response.status, buffer: Buffer.from(await response.arrayBuffer()) };
  return { status: response.status, body: await response.json() };
}

async function spawnServer() {
  const proc = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      AWS_S3_BUCKET: '',
      SESSION_SECRET: 'obsidian-vault-auth-test-session-secret-32',
      PROVIDER_VAULT_SECRET: 'obsidian-vault-auth-test-vault-secret-32',
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
  createdVaultDirs.push(resolve(VAULT_ROOT, reg.body.user.id));
  return { token: reg.body.token, id: reg.body.user.id };
}

const child = await spawnServer();

try {
  const stamp = Date.now();

  const noAuthStatus = await request('/api/obsidian/status');
  const noAuthExport = await request('/api/obsidian/export-mission', { method: 'POST', body: { mission_id: 'anon-probe' } });
  const noAuthDownload = await request('/api/obsidian/download-vault');
  assert(noAuthStatus.status === 401, 'status sem sessão retorna 401');
  assert(noAuthExport.status === 401, 'export-mission sem sessão retorna 401');
  assert(noAuthDownload.status === 401, 'download-vault sem sessão retorna 401');

  const userA = await registerUser(`obsidian-vault-a-${stamp}@example.com`);
  const userB = await registerUser(`obsidian-vault-b-${stamp}@example.com`);

  const exportA = await request('/api/obsidian/export-mission', { method: 'POST', token: userA.token, body: { mission_id: 'mission-a-secret', pass_gold: true } });
  const exportB = await request('/api/obsidian/export-mission', { method: 'POST', token: userB.token, body: { mission_id: 'mission-b-secret', pass_gold: true } });
  assert(exportA.status === 200 && exportA.body.exported === true, 'usuário A exporta a própria missão com sessão válida');
  assert(exportB.status === 200 && exportB.body.exported === true, 'usuário B exporta a própria missão com sessão válida');

  const statusA = await request('/api/obsidian/status', { token: userA.token });
  const statusB = await request('/api/obsidian/status', { token: userB.token });
  assert(statusA.body.files_count === 2 && statusA.body.recent_files.every((f) => f.includes('mission-a-secret')), 'status de A só lista arquivos de A');
  assert(statusB.body.files_count === 2 && statusB.body.recent_files.every((f) => f.includes('mission-b-secret')), 'status de B só lista arquivos de B');

  const downloadA = await request('/api/obsidian/download-vault', { token: userA.token, raw: true });
  const downloadB = await request('/api/obsidian/download-vault', { token: userB.token, raw: true });
  assert(downloadA.status === 200 && downloadA.buffer.includes('mission-a-secret') && !downloadA.buffer.includes('mission-b-secret'), 'zip de A contém só a missão de A, nunca a de B');
  assert(downloadB.status === 200 && downloadB.buffer.includes('mission-b-secret') && !downloadB.buffer.includes('mission-a-secret'), 'zip de B contém só a missão de B, nunca a de A');

  const dora = await request('/api/dora-metrics');
  assert(dora.status === 200 && dora.body.total_pass_gold >= 2, 'dora-metrics continua agregando PASS-GOLD entre usuários no layout aninhado');

  console.log(`\n${passed}/${passed} PASS`);
} catch (error) {
  console.error(error.message);
  if (serverLog) console.error(serverLog.slice(-2000));
  process.exitCode = 1;
} finally {
  await killServer(child);
  if (usersBackup) writeFileSync(USERS_DB, usersBackup);
  else if (existsSync(USERS_DB)) unlinkSync(USERS_DB);
  for (const dir of createdVaultDirs) { try { rmSync(dir, { recursive: true, force: true }); } catch {} }
}
