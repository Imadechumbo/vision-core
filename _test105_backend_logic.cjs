#!/usr/bin/env node
/**
 * §105 — testes unitarios isolados da logica de /api/agent/mission/queue
 * e /api/agent/status apos o patch (fecha o loop chat -> agent local).
 *
 * Isolado com mocks - nao toca no projeto real. Roda ANTES do patch para
 * confirmar que a logica esta correta, mesmo padrao de _test102/_test104.
 *
 * Uso: node _test105_backend_logic.cjs
 */
'use strict';
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  ✓ ' + name);
    passed++;
  } catch (e) {
    console.log('  ✗ ' + name + ' — ' + e.message);
    failed++;
  }
}

/* ── Mock da logica de /api/agent/mission/queue pos-§105 ──────────────── */
function mockQueueHandler(body) {
  const _agentQueue = [];
  const type = body.type || 'general';
  const mission = {
    id: 'mission_test_id',
    input: body.input || body.message || '',
    type: type,
    queued_at: 'TS'
  };
  if (type === 'apply_patch') {
    if (!body.file || !body.patch) {
      return { status: 400, json: { ok: false, error: 'apply_patch_requires_file_and_patch' } };
    }
    mission.file = body.file;
    mission.patch = body.patch;
    mission.fix_type = body.fix_type || 'code_patch';
    mission.diagnosis = body.diagnosis || '';
  }
  _agentQueue.push(mission);
  return { status: 200, json: { ok: true, mission_id: mission.id, queued: true, queue_length: _agentQueue.length, type: mission.type }, queue: _agentQueue };
}

/* ── Mock da logica de /api/agent/status pos-§105 ──────────────────────── */
function mockStatusHandler(lastSeenAt, nowMs) {
  const lastSeenMsAgo = lastSeenAt ? (nowMs - lastSeenAt) : null;
  const connected = lastSeenMsAgo !== null && lastSeenMsAgo < 15000;
  return { connected, last_seen_ms_ago: lastSeenMsAgo, mode: connected ? 'connected' : 'download_ready', anti_stub: true };
}

console.log('=== §105 — testes da logica de queue (apply_patch) ===');

test('type=general continua funcionando sem exigir file/patch (nao regrediu)', () => {
  const r = mockQueueHandler({ input: 'teste', type: 'general' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.queue[0].type, 'general');
  assert.strictEqual(r.queue[0].file, undefined);
});

test('type ausente cai no default "general" (compat com chamadas antigas)', () => {
  const r = mockQueueHandler({ input: 'teste' });
  assert.strictEqual(r.queue[0].type, 'general');
});

test('type=apply_patch SEM file → 400 apply_patch_requires_file_and_patch', () => {
  const r = mockQueueHandler({ type: 'apply_patch', patch: { search: 'a', replace: 'b' } });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.json.error, 'apply_patch_requires_file_and_patch');
});

test('type=apply_patch SEM patch → 400 apply_patch_requires_file_and_patch', () => {
  const r = mockQueueHandler({ type: 'apply_patch', file: 'x.js' });
  assert.strictEqual(r.status, 400);
});

test('type=apply_patch COM file+patch → 200, mission carrega file/patch/fix_type/diagnosis', () => {
  const r = mockQueueHandler({ type: 'apply_patch', file: 'x.js', patch: { search: 'a', replace: 'b' }, fix_type: 'code_patch', diagnosis: 'teste' });
  assert.strictEqual(r.status, 200);
  const m = r.queue[0];
  assert.strictEqual(m.file, 'x.js');
  assert.deepStrictEqual(m.patch, { search: 'a', replace: 'b' });
  assert.strictEqual(m.fix_type, 'code_patch');
  assert.strictEqual(m.diagnosis, 'teste');
});

test('type=apply_patch sem fix_type → default "code_patch"', () => {
  const r = mockQueueHandler({ type: 'apply_patch', file: 'x.js', patch: { a: 1 } });
  assert.strictEqual(r.queue[0].fix_type, 'code_patch');
});

test('type=apply_patch sem diagnosis → default string vazia (nao undefined)', () => {
  const r = mockQueueHandler({ type: 'apply_patch', file: 'x.js', patch: { a: 1 } });
  assert.strictEqual(r.queue[0].diagnosis, '');
});

console.log('');
console.log('=== §105 — testes da logica de /api/agent/status ===');

test('sem nenhum poll ainda (lastSeenAt=0) → connected:false, last_seen_ms_ago:null', () => {
  const r = mockStatusHandler(0, 1000000);
  assert.strictEqual(r.connected, false);
  assert.strictEqual(r.last_seen_ms_ago, null);
  assert.strictEqual(r.mode, 'download_ready');
});

test('poll ha 5s → connected:true', () => {
  const r = mockStatusHandler(1000000, 1005000);
  assert.strictEqual(r.connected, true);
  assert.strictEqual(r.last_seen_ms_ago, 5000);
  assert.strictEqual(r.mode, 'connected');
});

test('poll ha exatamente 15s → connected:false (limite exclusivo)', () => {
  const r = mockStatusHandler(1000000, 1015000);
  assert.strictEqual(r.connected, false);
});

test('poll ha 14.9s → connected:true (ainda dentro da janela)', () => {
  const r = mockStatusHandler(1000000, 1014900);
  assert.strictEqual(r.connected, true);
});

test('poll ha 20s (agent caiu) → connected:false', () => {
  const r = mockStatusHandler(1000000, 1020000);
  assert.strictEqual(r.connected, false);
  assert.strictEqual(r.mode, 'download_ready');
});

test('todas as respostas tem anti_stub:true (regra do projeto)', () => {
  assert.strictEqual(mockStatusHandler(0, 1).anti_stub, true);
  assert.strictEqual(mockStatusHandler(500, 1000).anti_stub, true);
});

console.log('');
console.log('Total: ' + (passed + failed) + ' | Passou: ' + passed + ' | Falhou: ' + failed);
if (failed > 0) {
  console.log('=== FALHOU ===');
  process.exit(1);
} else {
  console.log('=== TODOS OS TESTES PASSARAM ===');
  process.exit(0);
}
