#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const DB = resolve(ROOT, 'data', 'agent-queue.sqlite');
const backup = existsSync(DB) ? readFileSync(DB) : null;
const PORT = 18738;
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ✓ ${message}`);
  passed++;
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

const child = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
    PORT: String(PORT),
    AWS_S3_BUCKET: '',
    SESSION_SECRET: 'agent-pairing-test-session-secret-32chars',
    PROVIDER_VAULT_SECRET: 'agent-pairing-test-vault-secret-32chars',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (data) => { serverLog += data; });
child.stderr.on('data', (data) => { serverLog += data; });

try {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }

  const a = await request('/api/agent/register', { method: 'POST' });
  const b = await request('/api/agent/register', { method: 'POST' });
  assert(a.status === 200 && b.status === 200, 'dois agentes registram pares distintos');
  assert(a.body.agent_id !== b.body.agent_id && a.body.agent_secret !== b.body.agent_secret, 'IDs e secrets não colidem');

  const payload = { type: 'apply_patch', file: 'fixture.txt', patch: 'before => after', agent_id: a.body.agent_id };
  const missing = await request('/api/agent/mission/queue', { method: 'POST', body: payload });
  const crossed = await request('/api/agent/mission/queue', { method: 'POST', body: { ...payload, agent_secret: b.body.agent_secret } });
  assert(missing.status === 401 && missing.body.error === 'agent_pairing_required', 'queue rejeita ausência de secret com 401');
  assert(crossed.status === 401 && crossed.body.error === 'agent_pairing_required', 'queue rejeita secret de outro agente com 401');

  const queued = await request('/api/agent/mission/queue', { method: 'POST', body: { ...payload, agent_secret: a.body.agent_secret } });
  assert(queued.status === 200 && queued.body.queued === true, 'par correto enfileira missão endereçada');

  const pendingB = await request(`/api/agent/mission/pending?agent_id=${b.body.agent_id}&agent_secret=${b.body.agent_secret}`);
  const pendingA = await request(`/api/agent/mission/pending?agent_id=${a.body.agent_id}&agent_secret=${a.body.agent_secret}`);
  assert(pendingB.status === 200 && pendingB.body.mission === null, 'agente B não consome missão do agente A');
  assert(pendingA.status === 200 && pendingA.body.mission?.id === queued.body.mission_id, 'agente A consome a própria missão');
  assert(!JSON.stringify(pendingA.body).includes(a.body.agent_secret), 'secret não aparece na missão entregue');

  const resultBase = { mission_id: queued.body.mission_id, agent_id: a.body.agent_id, ok: true, action: 'certification_only' };
  const resultMissing = await request('/api/agent/mission/result', { method: 'POST', body: resultBase });
  const resultCrossed = await request('/api/agent/mission/result', { method: 'POST', body: { ...resultBase, agent_secret: b.body.agent_secret } });
  const resultOk = await request('/api/agent/mission/result', { method: 'POST', body: { ...resultBase, agent_secret: a.body.agent_secret } });
  assert(resultMissing.status === 401 && resultCrossed.status === 401, 'resultado rejeita ausência e troca de secret');
  assert(resultOk.status === 200 && resultOk.body.received === true, 'resultado aceita o par correto');

  const stored = await request(`/api/agent/mission/result/${queued.body.mission_id}`);
  assert(stored.status === 200 && stored.body.action === 'certification_only', 'resultado completa o round-trip público');
  assert(!JSON.stringify(stored.body).includes(a.body.agent_secret) && !('agent_secret' in stored.body), 'evidência persistida é redigida');

  const status = await request('/api/agent/status');
  assert(status.status === 200 && status.body.connected === true && status.body.agent_id === a.body.agent_id, 'status reflete o último polling autenticado');
  console.log(`\n${passed}/${passed} PASS`);
} catch (error) {
  console.error(error.message);
  if (serverLog) console.error(serverLog.slice(-2000));
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  await new Promise((resolveWait) => child.once('exit', resolveWait));
  if (backup) writeFileSync(DB, backup);
  else if (existsSync(DB)) unlinkSync(DB);
}
