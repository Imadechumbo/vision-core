#!/usr/bin/env node
// LEGACY_AUDIT achado A (2026-07-23): /api/agent/mission/push e /api/agent/mission/revert
// enfileiravam git_push/git_revert sem agent_id nenhum — ficavam fora do gate de agent_secret
// que /api/agent/mission/queue já aplica a apply_patch/apply_patch_multi (DECISION-006), e
// caíam na fila anônima que qualquer poll sem pareamento também consome. vision-agent.cjs
// executa `git push origin HEAD`/`git reset --hard HEAD~1` incondicionalmente ao receber a
// missão. Este teste trava: 400 sem agent_id, 401 com secret errado/ausente, 200 com par
// correto, e — o ponto central do achado — que a missão só é entregue ao agent pareado, nunca
// a um poll anônimo (sem agent_id) nem a outro agente.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const QUEUE_DB = resolve(ROOT, 'data', 'agent-queue.sqlite');
const queueBackup = existsSync(QUEUE_DB) ? readFileSync(QUEUE_DB) : null;
const PAIRINGS_DB = resolve(ROOT, 'data', 'agent-pairings.json');
const pairingsBackup = existsSync(PAIRINGS_DB) ? readFileSync(PAIRINGS_DB) : null;
const PORT = 18743;
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;
let serverLog = '';

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

async function spawnServer() {
  const proc = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      AWS_S3_BUCKET: '',
      SESSION_SECRET: 'mission-push-revert-auth-test-session-32ch',
      PROVIDER_VAULT_SECRET: 'mission-push-revert-auth-test-vault-32ch',
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

let child = await spawnServer();

try {
  for (const route of ['/api/agent/mission/push', '/api/agent/mission/revert']) {
    const a = await request('/api/agent/register', { method: 'POST' });
    const b = await request('/api/agent/register', { method: 'POST' });

    const noAgentId = await request(route, { method: 'POST', body: {} });
    assert(noAgentId.status === 400, `${route} sem agent_id retorna 400`);

    const noSecret = await request(route, { method: 'POST', body: { agent_id: a.body.agent_id } });
    assert(noSecret.status === 401 && noSecret.body.error === 'agent_pairing_required', `${route} com agent_id mas sem secret retorna 401`);

    const wrongSecret = await request(route, { method: 'POST', body: { agent_id: a.body.agent_id, agent_secret: b.body.agent_secret } });
    assert(wrongSecret.status === 401, `${route} com secret de outro agente retorna 401`);

    const queued = await request(route, { method: 'POST', body: { agent_id: a.body.agent_id, agent_secret: a.body.agent_secret } });
    assert(queued.status === 200 && queued.body.queued === true, `${route} com par correto enfileira a missão`);

    const anonymousPoll = await request('/api/agent/mission/pending');
    assert(anonymousPoll.status === 200 && anonymousPoll.body.mission === null, `${route}: poll anônimo (sem agent_id) não recebe a missão`);

    const otherAgentPoll = await request(`/api/agent/mission/pending?agent_id=${b.body.agent_id}&agent_secret=${b.body.agent_secret}`);
    assert(otherAgentPoll.status === 200 && otherAgentPoll.body.mission === null, `${route}: agente B (não endereçado) não consome a missão`);

    const ownerPoll = await request(`/api/agent/mission/pending?agent_id=${a.body.agent_id}&agent_secret=${a.body.agent_secret}`);
    assert(ownerPoll.status === 200 && ownerPoll.body.mission?.id === queued.body.mission_id, `${route}: agente pareado (dono) consome a própria missão`);
    assert(ownerPoll.body.mission.type === (route.endsWith('push') ? 'git_push' : 'git_revert'), `${route}: tipo da missão entregue confere com a rota`);
  }

  console.log(`\n${passed}/${passed} PASS`);
} catch (error) {
  console.error(error.message);
  console.error(serverLog.slice(-2000));
  process.exitCode = 1;
} finally {
  await killServer(child);
  if (queueBackup) writeFileSync(QUEUE_DB, queueBackup);
  else if (existsSync(QUEUE_DB)) unlinkSync(QUEUE_DB);
  if (pairingsBackup) writeFileSync(PAIRINGS_DB, pairingsBackup);
  else if (existsSync(PAIRINGS_DB)) unlinkSync(PAIRINGS_DB);
}
