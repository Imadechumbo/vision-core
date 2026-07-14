#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());
const FILES = ['users.json', 'projects.json', 'audit-log.json'].map(name => resolve(ROOT, 'data', name));
const backups = FILES.map(file => ({ file, existed: existsSync(file), content: existsSync(file) ? readFileSync(file, 'utf8') : null }));
const PORT = 18736;
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { console.log(`  ✓ ${message}`); passed++; }
  else { console.error(`  ✗ FAIL: ${message}`); failed++; }
}

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, body: await response.json() };
}

async function waitForHealth() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { if ((await fetch(BASE + '/api/health')).ok) return true; } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  }
  return false;
}

const child = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
    PORT: String(PORT),
    AWS_S3_BUCKET: '',
    SESSION_SECRET: 'project-ownership-test-session-secret-32chars',
    PROVIDER_VAULT_SECRET: 'project-ownership-test-vault-secret-32chars'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
child.stdout.on('data', data => { serverLog += data.toString(); });
child.stderr.on('data', data => { serverLog += data.toString(); });

try {
  const up = await waitForHealth();
  assert(up, 'backend real sobe em porta isolada');
  if (!up) throw new Error(serverLog.slice(-2000));

  const anonymousGet = await request('/api/projects');
  const anonymousPost = await request('/api/projects', { method: 'POST', body: { name: 'sem owner' } });
  assert(anonymousGet.status === 401 && anonymousGet.body.error === 'not_authenticated', 'GET anônimo falha com 401');
  assert(anonymousPost.status === 401 && anonymousPost.body.error === 'not_authenticated', 'POST anônimo falha com 401');

  const stamp = Date.now();
  const registerA = await request('/api/auth/register', { method: 'POST', body: { email: `project-a-${stamp}@example.invalid`, password: 'project-test-password-a' } });
  const registerB = await request('/api/auth/register', { method: 'POST', body: { email: `project-b-${stamp}@example.invalid`, password: 'project-test-password-b' } });
  assert(registerA.status === 200 && registerB.status === 200, 'dois usuários reais registrados');

  const tokenA = registerA.body.token;
  const tokenB = registerB.body.token;
  const createdA = await request('/api/projects', { method: 'POST', token: tokenA, body: { name: 'Projeto A' } });
  const createdB = await request('/api/projects', { method: 'POST', token: tokenB, body: { name: 'Projeto B' } });
  assert(createdA.body.project.user_id === registerA.body.user.id, 'owner do projeto A vem da sessão A');
  assert(createdB.body.project.user_id === registerB.body.user.id, 'owner do projeto B vem da sessão B');

  const listA = await request('/api/projects', { token: tokenA });
  const listB = await request('/api/projects', { token: tokenB });
  assert(listA.body.projects.length === 1 && listA.body.projects[0].name === 'Projeto A', 'usuário A lista somente o próprio projeto');
  assert(listB.body.projects.length === 1 && listB.body.projects[0].name === 'Projeto B', 'usuário B lista somente o próprio projeto');

  const spoof = await request('/api/projects', { method: 'POST', token: tokenA, body: { name: 'Spoof', user_id: registerB.body.user.id } });
  assert(spoof.status === 400 && spoof.body.error === 'project_owner_not_assignable', 'user_id fornecido pelo cliente é rejeitado');
} finally {
  child.kill();
  for (const backup of backups) {
    try {
      if (backup.existed) writeFileSync(backup.file, backup.content, 'utf8');
      else if (existsSync(backup.file)) unlinkSync(backup.file);
    } catch {}
  }
}

console.log(`\nproject-ownership: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
