#!/usr/bin/env node
/**
 * mission-timeline-stages — stages[] opcional em POST/GET /api/mission/timeline
 * (docs/ROADMAP.md Fase 2, "persistir estágios por missão").
 *
 * Cobre: sanitização real de stages[] (formato válido, malformado, ausente,
 * excedente) e que os outros 2 call sites de appendMissionTimeline
 * (/api/chat, /api/run-live) continuam gravando stages:null sem quebrar,
 * exatamente como antes desta mudança.
 */
import { spawn } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());
const FILES = ['mission-timeline.json', 'mission-log.json', 'users.json'].map(name => resolve(ROOT, 'data', name));
const backups = FILES.map(file => ({ file, existed: existsSync(file), content: existsSync(file) ? readFileSync(file, 'utf8') : null }));
const PORT = 18740;
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

function findEntry(entries, marker) {
  return entries.find(e => (e.input && e.input.includes(marker)) || (e.summary && e.summary.includes(marker)));
}

const child = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
    PORT: String(PORT),
    AWS_S3_BUCKET: '',
    SESSION_SECRET: 'mission-timeline-stages-test-session-secret-32c',
    PROVIDER_VAULT_SECRET: 'mission-timeline-stages-test-vault-secret-32ch'
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

  const stamp = Date.now();
  const register = await request('/api/auth/register', { method: 'POST', body: { email: `mission-stages-${stamp}@example.invalid`, password: 'mission-stages-test-password' } });
  assert(register.status === 200 && register.body.token, 'usuário real registrado');
  const token = register.body.token;

  // ── Suite A: stages válido persiste e volta sanitizado ──────────────
  const validStages = [
    { name: 'project_builder', status: 'done', started_at: '2026-07-16T10:00:00.000Z', completed_at: '2026-07-16T10:00:02.000Z' },
    { name: 'export_preview', status: 'done', started_at: '2026-07-16T10:00:02.000Z', completed_at: '2026-07-16T10:00:04.000Z' },
    { name: 'gold_gate', status: 'pending', started_at: null, completed_at: null }
  ];
  const postValid = await request('/api/mission/timeline', { method: 'POST', token, body: { description: 'marker-valid-stages', steps_completed: 3, stages: validStages } });
  assert(postValid.status === 200 && postValid.body.ok === true, 'POST com stages válido retorna ok');

  const listA = await request('/api/mission/timeline?limit=20', { token });
  const entryA = findEntry(listA.body.entries, 'marker-valid-stages');
  assert(!!entryA, 'entrada com stages válido aparece no GET');
  assert(JSON.stringify(entryA.stages) === JSON.stringify(validStages), 'stages volta idêntico ao enviado (formato já válido)');

  // ── Suite B: stages malformado é sanitizado, nunca 500 ───────────────
  const postNotArray = await request('/api/mission/timeline', { method: 'POST', token, body: { description: 'marker-not-array', stages: 'nao-eh-array' } });
  assert(postNotArray.status === 200, 'POST com stages não-array não quebra (200)');
  const entryNotArray = findEntry((await request('/api/mission/timeline?limit=20', { token })).body.entries, 'marker-not-array');
  assert(entryNotArray && entryNotArray.stages === null, 'stages não-array vira null, não quebra a entrada inteira');

  const postMissingName = await request('/api/mission/timeline', {
    method: 'POST', token,
    body: { description: 'marker-missing-name', stages: [{ status: 'done' }, { name: 'worker_handoff', status: 'done' }] }
  });
  assert(postMissingName.status === 200, 'POST com item sem name não quebra (200)');
  const entryMissingName = findEntry((await request('/api/mission/timeline?limit=20', { token })).body.entries, 'marker-missing-name');
  assert(entryMissingName && entryMissingName.stages.length === 1 && entryMissingName.stages[0].name === 'worker_handoff', 'item sem name é descartado, item válido sobrevive');

  const oversizedStages = Array.from({ length: 20 }, (_, i) => ({ name: `stage-${i}`, status: 'pending' }));
  const postOversized = await request('/api/mission/timeline', { method: 'POST', token, body: { description: 'marker-oversized', stages: oversizedStages } });
  assert(postOversized.status === 200, 'POST com 20 stages não quebra (200)');
  const entryOversized = findEntry((await request('/api/mission/timeline?limit=20', { token })).body.entries, 'marker-oversized');
  assert(entryOversized && entryOversized.stages.length === 12, 'array de stages é capado em 12 itens');

  const postBadStatus = await request('/api/mission/timeline', {
    method: 'POST', token,
    body: { description: 'marker-bad-status', stages: [{ name: 'mission_composer', status: 'nao-existe', started_at: 'nao-eh-data', completed_at: 12345 }] }
  });
  assert(postBadStatus.status === 200, 'POST com status/datas inválidos não quebra (200)');
  const entryBadStatus = findEntry((await request('/api/mission/timeline?limit=20', { token })).body.entries, 'marker-bad-status');
  const badStage = entryBadStatus && entryBadStatus.stages && entryBadStatus.stages[0];
  assert(!!badStage && badStage.status === 'pending' && badStage.started_at === null && badStage.completed_at === null, 'status inválido cai em "pending", datas inválidas viram null');

  const longName = 'x'.repeat(120);
  const postLongName = await request('/api/mission/timeline', { method: 'POST', token, body: { description: 'marker-long-name', stages: [{ name: longName, status: 'done' }] } });
  assert(postLongName.status === 200, 'POST com name longo não quebra (200)');
  const entryLongName = findEntry((await request('/api/mission/timeline?limit=20', { token })).body.entries, 'marker-long-name');
  assert(entryLongName && entryLongName.stages[0].name.length === 60, 'name é truncado em 60 caracteres');

  // ── Suite C: sem stages no body — comportamento idêntico ao pré-mudança ──
  const postNoStages = await request('/api/mission/timeline', { method: 'POST', token, body: { description: 'marker-no-stages', steps_completed: 6, pass_gold: true } });
  assert(postNoStages.status === 200, 'POST sem stages continua funcionando (200)');
  const entryNoStages = findEntry((await request('/api/mission/timeline?limit=20', { token })).body.entries, 'marker-no-stages');
  assert(entryNoStages && entryNoStages.stages === null, 'entrada sem stages no body grava stages:null');
  assert(entryNoStages && entryNoStages.status === 'PASS_GOLD' && entryNoStages.pass_gold === true, 'campos pré-existentes (status/pass_gold) continuam corretos sem stages');

  // ── Suite D: os outros 2 call sites de appendMissionTimeline não quebram ──
  const chatRes = await request('/api/chat', { method: 'POST', token, body: { message: 'marker-chat-call-site teste real de fumaça' } });
  assert(chatRes.status !== 500, '/api/chat não quebra com o campo stages novo (sem 500)');
  const entryChat = findEntry((await request('/api/mission/timeline?limit=20', { token })).body.entries, 'marker-chat-call-site');
  if (entryChat) assert(entryChat.stages === null, 'entrada gravada por /api/chat tem stages:null (call site não muda)');
  else console.log('  · /api/chat não gravou entrada nesta rodada (resposta ok:false) — sem contradição, apenas nada pra checar');

  const runLiveRes = await request('/api/run-live', { method: 'POST', token, body: { input: 'self-test' } });
  assert(runLiveRes.status !== 500, '/api/run-live não quebra com o campo stages novo (sem 500)');
  const listRunLive = (await request('/api/mission/timeline?limit=20', { token })).body.entries;
  const entryRunLive = listRunLive.find(e => e.source === 'run-live');
  if (entryRunLive) assert(entryRunLive.stages === null, 'entrada gravada por /api/run-live tem stages:null (call site não muda)');
  else console.log('  · /api/run-live não gravou entrada nesta rodada — sem contradição, apenas nada pra checar');
} finally {
  child.kill();
  for (const backup of backups) {
    try {
      if (backup.existed) writeFileSync(backup.file, backup.content, 'utf8');
      else if (existsSync(backup.file)) unlinkSync(backup.file);
    } catch {}
  }
}

console.log(`\nmission-timeline-stages: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
