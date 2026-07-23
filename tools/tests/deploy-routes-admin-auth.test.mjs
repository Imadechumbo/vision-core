#!/usr/bin/env node
// LEGACY_AUDIT achado B (2026-07-23): /api/deploy/zip-release, /api/deploy/merge-pr e
// /api/deploy/trigger não tinham nenhuma autenticação — usam o GITHUB_TOKEN privilegiado
// do servidor pra abrir PR, disparar deploy real e squash-merge, gateadas só por um
// `aegis_ok` boolean enviado pelo próprio cliente. requireVisionAdmin agora fecha o acesso
// não autenticado (mesmo padrão de /api/vault/*, /api/agents/:id/mode — operação de efeito
// sistêmico + credencial privilegiada, não escopo por usuário). Este teste trava 401 sem
// sessão e 403 com sessão comum, sem precisar de GITHUB_TOKEN real (o gate de auth roda
// antes de qualquer chamada externa).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const USERS_DB = resolve(ROOT, 'data', 'users.json');
const usersBackup = existsSync(USERS_DB) ? readFileSync(USERS_DB) : null;
const PORT = 18744;
const BASE = `http://127.0.0.1:${PORT}`;
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
      SESSION_SECRET: 'deploy-routes-admin-auth-test-session-32c',
      PROVIDER_VAULT_SECRET: 'deploy-routes-admin-auth-test-vault-32c',
      ADMIN_ALLOWED_EMAILS: '',
      GITHUB_TOKEN: '', // ausente de propósito — confirma que o 401/403 acontece ANTES de qualquer uso do token
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

const stamp = Date.now();
const routes = [
  { path: '/api/deploy/zip-release', body: { patched_content: 'x', file_path: 'a.js', repo: 'owner/repo', aegis_ok: true } },
  { path: '/api/deploy/merge-pr', body: { repo: 'owner/repo', pull_number: 1, aegis_ok: true } },
  { path: '/api/deploy/trigger', body: { repo: 'owner/repo', sha: 'deadbeef', aegis_ok: true } },
];

const child = await spawnServer();

try {
  for (let i = 0; i < routes.length; i++) {
    const { path, body } = routes[i];
    const noAuth = await request(path, { method: 'POST', body });
    assert(noAuth.status === 401, `${path} sem sessão retorna 401 (antes de qualquer chamada ao GitHub)`);

    const regular = await registerUser(`deploy-regular-${i}-${stamp}@example.com`);
    const regularAttempt = await request(path, { method: 'POST', body, token: regular.token });
    assert(regularAttempt.status === 403, `${path} com sessão comum (sem role admin) retorna 403`);
  }

  console.log(`\n${passed}/${passed} PASS`);
} catch (error) {
  console.error(error.message);
  console.error(serverLog.slice(-2000));
  process.exitCode = 1;
} finally {
  await killServer(child);
  if (usersBackup) writeFileSync(USERS_DB, usersBackup);
  else if (existsSync(USERS_DB)) unlinkSync(USERS_DB);
}
