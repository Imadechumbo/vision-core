#!/usr/bin/env node
// GET /api/agent/pairings (Prioridade 2a, 2026-07-21) — lista os Vision Agent
// Local pareados com a conta da sessão, nunca todos, pra alimentar o botão
// "Revogar" do painel Agentes. Trava 3 coisas: 401 sem sessão, escopo real
// por usuário (A nunca vê o pareamento de B nem o não-reivindicado), e que
// revogar de fato tira o item da lista.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const PAIRINGS_DB = resolve(ROOT, 'data', 'agent-pairings.json');
const pairingsBackup = existsSync(PAIRINGS_DB) ? readFileSync(PAIRINGS_DB) : null;
const USERS_DB = resolve(ROOT, 'data', 'users.json');
const usersBackup = existsSync(USERS_DB) ? readFileSync(USERS_DB) : null;
const PORT = 18740;
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
      SESSION_SECRET: 'agent-pairings-list-test-session-secret-32',
      PROVIDER_VAULT_SECRET: 'agent-pairings-list-test-vault-secret-32',
      SF_REAL_EXECUTION_ENABLED: 'true', // precisa passar do gate pra chegar no claim de dono (allowlist vazia de propósito)
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

async function claim(token, agentId, agentSecret, projectId) {
  return request('/api/sf/execute-project', {
    method: 'POST',
    token,
    body: { agent_id: agentId, agent_secret: agentSecret, project_id: projectId, description: 'x', files: [{ name: 'a.js', content: 'x' }] },
  });
}

const child = await spawnServer();

try {
  const stamp = Date.now();

  const noAuth = await request('/api/agent/pairings');
  assert(noAuth.status === 401, 'pairings sem sessão retorna 401');

  const regA = await request('/api/auth/register', { method: 'POST', body: { email: `pairings-a-${stamp}@example.com`, password: 'Test1234!Secure', name: 'A' } });
  const regB = await request('/api/auth/register', { method: 'POST', body: { email: `pairings-b-${stamp}@example.com`, password: 'Test1234!Secure', name: 'B' } });
  const tokenA = regA.body.token;
  const tokenB = regB.body.token;

  const agentA = await request('/api/agent/register', { method: 'POST' });
  const agentUnclaimed = await request('/api/agent/register', { method: 'POST' });
  await claim(tokenA, agentA.body.agent_id, agentA.body.agent_secret, 'pairings-list-a');

  const listA = await request('/api/agent/pairings', { token: tokenA });
  const listB = await request('/api/agent/pairings', { token: tokenB });
  assert(listA.status === 200 && listA.body.pairings.length === 1 && listA.body.pairings[0].agent_id === agentA.body.agent_id, 'A vê só o próprio pareamento reivindicado');
  assert(listB.status === 200 && listB.body.pairings.length === 0, 'B não vê o pareamento de A nem o não reivindicado');
  assert(!JSON.stringify(listA.body).includes(agentA.body.agent_secret), 'agent_secret nunca aparece na listagem');

  const revoke = await request('/api/agent/unregister', { method: 'POST', token: tokenA, body: { agent_id: agentA.body.agent_id } });
  assert(revoke.status === 200 && revoke.body.via === 'owner', 'A revoga o próprio pareamento pela sessão (sem precisar do secret)');

  const listAfterRevoke = await request('/api/agent/pairings', { token: tokenA });
  assert(listAfterRevoke.status === 200 && listAfterRevoke.body.pairings.length === 0, 'pareamento revogado some da listagem imediatamente');

  console.log(`\n${passed}/${passed} PASS`);
} catch (error) {
  console.error(error.message);
  if (serverLog) console.error(serverLog.slice(-2000));
  process.exitCode = 1;
} finally {
  await killServer(child);
  if (pairingsBackup) writeFileSync(PAIRINGS_DB, pairingsBackup);
  else if (existsSync(PAIRINGS_DB)) unlinkSync(PAIRINGS_DB);
  if (usersBackup) writeFileSync(USERS_DB, usersBackup);
  else if (existsSync(USERS_DB)) unlinkSync(USERS_DB);
}
