/**
 * VISION CORE V2.9.10
 * tools/tests/software-factory/software-factory-authorized-staging-probe-executor-contract.test.mjs
 * RTP-4 — Authorized Staging Probe Executor Contract Tests
 * ─────────────────────────────────────────────────────────────────
 * Static test only. No network. No exec. No secrets. No deploy.
 * Pure node:assert — no Jest.
 * ─────────────────────────────────────────────────────────────────
 */

import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-authorized-staging-probe-executor-contract.mjs';
import mod from '../../software-factory/software-factory-authorized-staging-probe-executor-contract.mjs';

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log('✓ PASS: ' + label);
    passed++;
  } catch (err) {
    console.error('✗ FAIL: ' + label + ' — ' + err.message);
    failed++;
  }
}

// Valid ready input
const VALID = {
  rtp0_ready:                   true,
  rtp1_ready:                   true,
  rtp2_ready:                   true,
  rtp3_ready:                   true,
  human_authorization_explicit: true,
  staging_endpoint:             'https://staging.internal.example.com/api/health',
  http_method:                  'GET',
  timeout_ms:                   3000,
  probe_scope:                  'health-endpoint-only',
  evidence_capture_plan:        'capture-http-status-and-body',
  noop_mode:                    true,
  execution_requested:          false,
};

console.log('\n=== RTP-4 Authorized Staging Probe Executor Contract Tests ===\n');

// ── Exports ───────────────────────────────────────────────────────
test('STATUSES exported and frozen', () => {
  assert.ok(STATUSES && typeof STATUSES === 'object');
  assert.ok(Object.isFrozen(STATUSES));
  assert.ok(STATUSES.READY);
  assert.ok(STATUSES.BLOCKED_INPUT);
  assert.ok(STATUSES.BLOCKED_DEPENDENCY);
  assert.ok(STATUSES.FAIL);
});

test('build is function',    () => assert.equal(typeof build,    'function'));
test('validate is function', () => assert.equal(typeof validate, 'function'));
test('render is function',   () => assert.equal(typeof render,   'function'));

test('default export has STATUSES, build, validate, render', () => {
  assert.equal(typeof mod.STATUSES, 'object');
  assert.equal(typeof mod.build,    'function');
  assert.equal(typeof mod.validate, 'function');
  assert.equal(typeof mod.render,   'function');
});

// ── Dependency blocks ─────────────────────────────────────────────
test('blocks when rtp0_ready false', () => {
  const r = build({ ...VALID, rtp0_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_DEPENDENCY);
  assert.equal(r.ready, false);
});

test('blocks when rtp1_ready false', () => {
  const r = build({ ...VALID, rtp1_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_DEPENDENCY);
  assert.equal(r.ready, false);
});

test('blocks when rtp2_ready false', () => {
  const r = build({ ...VALID, rtp2_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_DEPENDENCY);
  assert.equal(r.ready, false);
});

test('blocks when rtp3_ready false', () => {
  const r = build({ ...VALID, rtp3_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_DEPENDENCY);
  assert.equal(r.ready, false);
});

// ── Authorization block ───────────────────────────────────────────
test('blocks when human_authorization_explicit false', () => {
  const r = build({ ...VALID, human_authorization_explicit: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('human_authorization_explicit'));
});

// ── execution_requested must be false ─────────────────────────────
test('blocks when execution_requested true', () => {
  const r = build({ ...VALID, execution_requested: true });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('execution_requested'));
});

// ── noop_mode must be true ────────────────────────────────────────
test('blocks when noop_mode false', () => {
  const r = build({ ...VALID, noop_mode: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('noop_mode'));
});

// ── Endpoint validation ───────────────────────────────────────────
test('blocks empty endpoint', () => {
  const r = build({ ...VALID, staging_endpoint: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
});

test('blocks http:// endpoint', () => {
  const r = build({ ...VALID, staging_endpoint: 'http://staging.example.com/health' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('https://'));
});

test('blocks localhost endpoint', () => {
  const r = build({ ...VALID, staging_endpoint: 'https://localhost:3001/health' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('localhost'));
});

test('blocks 127.0.0.1 endpoint', () => {
  const r = build({ ...VALID, staging_endpoint: 'https://127.0.0.1/health' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('127.0.0.1'));
});

test('blocks "production" in endpoint', () => {
  const r = build({ ...VALID, staging_endpoint: 'https://production.example.com/health' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.toLowerCase().includes('production'));
});

test('blocks "prod" prefix in endpoint hostname', () => {
  const r = build({ ...VALID, staging_endpoint: 'https://prod-api.example.com/health' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

// ── Method validation ─────────────────────────────────────────────
test('blocks POST method', () => {
  const r = build({ ...VALID, http_method: 'POST' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('GET'));
});

test('blocks PUT method', () => {
  const r = build({ ...VALID, http_method: 'PUT' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

test('blocks empty method', () => {
  const r = build({ ...VALID, http_method: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

// ── Timeout validation ────────────────────────────────────────────
test('blocks timeout below 1000', () => {
  const r = build({ ...VALID, timeout_ms: 999 });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('1000'));
});

test('blocks timeout = 0', () => {
  const r = build({ ...VALID, timeout_ms: 0 });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

test('blocks timeout above 10000', () => {
  const r = build({ ...VALID, timeout_ms: 10001 });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('10000'));
});

// ── Scope + evidence plan ─────────────────────────────────────────
test('blocks empty probe_scope', () => {
  const r = build({ ...VALID, probe_scope: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('probe_scope'));
});

test('blocks empty evidence_capture_plan', () => {
  const r = build({ ...VALID, evidence_capture_plan: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('evidence_capture_plan'));
});

// ── Ready path ────────────────────────────────────────────────────
test('ready when all inputs valid', () => {
  const r = build(VALID);
  assert.equal(r.status, STATUSES.READY);
  assert.equal(r.ready, true);
  assert.equal(r.module_version, 'RTP-4');
  assert.equal(r.staging_probe_executor_contract_ready, true);
  assert.ok(r.message.includes('RTP-4 authorized staging probe executor contract ready'));
  assert.ok(r.message.includes('No probe executed'));
  assert.ok(r.message.includes('PASS GOLD REAL not claimed'));
});

test('timeout boundary 1000 accepted', () => {
  const r = build({ ...VALID, timeout_ms: 1000 });
  assert.equal(r.status, STATUSES.READY);
});

test('timeout boundary 10000 accepted', () => {
  const r = build({ ...VALID, timeout_ms: 10000 });
  assert.equal(r.status, STATUSES.READY);
});

// ── evidence_hash deterministic ───────────────────────────────────
test('evidence_hash is deterministic', () => {
  const r1 = build(VALID);
  const r2 = build(VALID);
  assert.equal(r1.evidence_hash, r2.evidence_hash, 'hashes must be identical');
  assert.equal(r1.evidence_hash.length, 64);
  assert.ok(/^[0-9a-f]{64}$/.test(r1.evidence_hash), 'must be hex');
});

test('different inputs produce different hashes', () => {
  const r1 = build({ ...VALID, probe_scope: 'scope-a' });
  const r2 = build({ ...VALID, probe_scope: 'scope-b' });
  assert.notEqual(r1.evidence_hash, r2.evidence_hash);
});

// ── Dangerous flags false — all paths ────────────────────────────
const DANGEROUS = [
  'runtime_probe_executed', 'backend_called', 'endpoint_called',
  'network_called', 'secrets_read', 'pass_gold_real_claimed',
  'pass_gold_real_achieved', 'release_allowed', 'deploy_allowed',
  'tag_allowed', 'stable_promotion_allowed', 'production_touched',
];

test('all dangerous flags false on blocked_dependency result', () => {
  const r = build({ ...VALID, rtp0_ready: false });
  for (const flag of DANGEROUS) {
    assert.equal(r[flag], false, flag + ' must be false on blocked result');
  }
});

test('all dangerous flags false on blocked_input result', () => {
  const r = build({ ...VALID, human_authorization_explicit: false });
  for (const flag of DANGEROUS) {
    assert.equal(r[flag], false, flag + ' must be false on blocked_input result');
  }
});

test('all dangerous flags false on ready result', () => {
  const r = build(VALID);
  for (const flag of DANGEROUS) {
    assert.equal(r[flag], false, flag + ' must be false on ready result');
  }
});

// ── PASS GOLD REAL not claimed ────────────────────────────────────
test('PASS GOLD REAL not claimed in any path', () => {
  const cases = [{}, { rtp0_ready: true }, VALID];
  for (const inp of cases) {
    const r = build(inp);
    assert.equal(r.pass_gold_real_claimed,  false);
    assert.equal(r.pass_gold_real_achieved, false);
  }
});

// ── deploy/release/tag/stable/production false ────────────────────
test('deploy/release/tag/stable/production false on ready result', () => {
  const r = build(VALID);
  assert.equal(r.deploy_allowed,            false);
  assert.equal(r.release_allowed,           false);
  assert.equal(r.tag_allowed,               false);
  assert.equal(r.stable_promotion_allowed,  false);
  assert.equal(r.production_touched,        false);
});

// ── runtime_probe_executed false ──────────────────────────────────
test('runtime_probe_executed false on ready result', () => {
  const r = build(VALID);
  assert.equal(r.runtime_probe_executed, false);
});

test('runtime_probe_executed false on blocked result', () => {
  const r = build({ rtp0_ready: false });
  assert.equal(r.runtime_probe_executed, false);
});

// ── validate() ───────────────────────────────────────────────────
test('validate returns {valid:true,issues:[]} for ready result', () => {
  const r = build(VALID);
  const v = validate(r);
  assert.equal(v.valid, true);
  assert.deepEqual(v.issues, []);
});

test('validate returns {valid:true,issues:[]} for blocked result', () => {
  const r = build({ rtp0_ready: false });
  const v = validate(r);
  assert.equal(v.valid, true);
  assert.deepEqual(v.issues, []);
});

test('validate fails when evidence_hash removed', () => {
  const r = build(VALID);
  const bad = { ...r };           // shallow copy — all top-level
  delete bad.evidence_hash;
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.length > 0);
});

test('validate fails when module_version wrong', () => {
  const r = build(VALID);
  const bad = { ...r, module_version: 'WRONG' };
  const v = validate(bad);
  assert.equal(v.valid, false);
});

test('validate fails when dangerous flag set to true', () => {
  const r = build(VALID);
  // Shallow copy is safe — all dangerous flags are top-level primitives
  const bad = { ...r, release_allowed: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('release_allowed')));
});

test('validate fails when pass_gold_real_claimed set to true', () => {
  const r = build(VALID);
  const bad = { ...r, pass_gold_real_claimed: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('pass_gold_real_claimed')));
});

test('validate fails when production_touched set to true', () => {
  const r = build(VALID);
  const bad = { ...r, production_touched: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
});

test('validate fails when runtime_probe_executed set to true', () => {
  const r = build(VALID);
  const bad = { ...r, runtime_probe_executed: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  // Original r is unaffected (top-level primitive copy)
  assert.equal(r.runtime_probe_executed, false, 'original result must not be mutated');
});

// ── render() ─────────────────────────────────────────────────────
test('render contains REGRA ABSOLUTA', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(
    out.includes('REGRA ABSOLUTA') || out.includes('SEM PASS GOLD REAL'),
    'render must include REGRA ABSOLUTA or SEM PASS GOLD REAL'
  );
});

test('render states PASS GOLD REAL not claimed', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('not claimed'));
});

test('render states production not touched', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('not touched') || out.includes('production_touched'));
});

test('render contains RTP-4 header', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('RTP-4 Authorized Staging Probe Executor Contract'));
});

test('render shows runtime_probe_executed: false', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('runtime_probe_executed'));
  assert.ok(out.includes('false'));
});

test('render shows endpoint on ready path', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes(VALID.staging_endpoint));
});

test('render shows GET method', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('GET'));
});

test('render on blocked path contains BLOCKED', () => {
  const r = build({ rtp0_ready: false });
  const out = render(r);
  assert.ok(out.includes('BLOCKED'));
  assert.ok(out.includes('REGRA ABSOLUTA') || out.includes('SEM PASS GOLD REAL'));
});

// ── Final tally ──────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('[RTP-4-TEST] Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.error('[RTP-4-TEST] ❌ ' + failed + ' test(s) FAILED');
  process.exit(1);
}
console.log('[RTP-4-TEST] ✅ All tests passed');
console.log('[RTP-4-TEST] staging_probe_executor_contract_ready: true (READY path only)');
console.log('[RTP-4-TEST] runtime_probe_executed: false');
console.log('[RTP-4-TEST] REGRA ABSOLUTA preserved — PASS GOLD REAL not claimed');
