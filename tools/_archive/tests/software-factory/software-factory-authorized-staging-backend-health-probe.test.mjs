/**
 * VISION CORE V2.9.10
 * tools/tests/software-factory/software-factory-authorized-staging-backend-health-probe.test.mjs
 * RTP-3 — Authorized Staging Backend Health Probe Contract Tests
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
} from '../../software-factory/software-factory-authorized-staging-backend-health-probe.mjs';
import mod from '../../software-factory/software-factory-authorized-staging-backend-health-probe.mjs';

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

// Valid ready input for reuse
const VALID = {
  rtp0_ready:                   true,
  rtp1_ready:                   true,
  rtp2_ready:                   true,
  human_authorization_explicit: true,
  staging_endpoint:             'https://staging.internal.example.com/api/health',
  probe_scope:                  'health-endpoint-only',
  timeout_ms:                   3000,
  http_method:                  'GET',
  no_secrets_printed:           true,
  evidence_capture_plan:        'capture-http-status-and-body',
  rollback_noop_guaranteed:     true,
};

console.log('\n=== RTP-3 Authorized Staging Backend Health Probe Contract Tests ===\n');

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
  assert.equal(r.pass_gold_real_claimed, false);
  assert.equal(r.production_touched, false);
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

// ── Authorization block ───────────────────────────────────────────
test('blocks when human_authorization_explicit false', () => {
  const r = build({ ...VALID, human_authorization_explicit: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('human_authorization_explicit'));
});

// ── Endpoint validation ───────────────────────────────────────────
test('blocks empty endpoint', () => {
  const r = build({ ...VALID, staging_endpoint: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
});

test('blocks http:// endpoint (not https)', () => {
  const r = build({ ...VALID, staging_endpoint: 'http://staging.example.com/health' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('https://'));
});

test('blocks localhost in endpoint', () => {
  const r = build({ ...VALID, staging_endpoint: 'https://localhost:3001/health' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('localhost'));
});

test('blocks 127.0.0.1 in endpoint', () => {
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
  const r = build({ ...VALID, staging_endpoint: 'https://prod-backend.example.com/health' });
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

// ── Safety invariants ─────────────────────────────────────────────
test('blocks no_secrets_printed false', () => {
  const r = build({ ...VALID, no_secrets_printed: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('no_secrets_printed'));
});

test('blocks rollback_noop_guaranteed false', () => {
  const r = build({ ...VALID, rollback_noop_guaranteed: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('rollback_noop_guaranteed'));
});

// ── Ready path ────────────────────────────────────────────────────
test('ready when all inputs valid', () => {
  const r = build(VALID);
  assert.equal(r.status, STATUSES.READY);
  assert.equal(r.ready, true);
  assert.equal(r.module_version, 'RTP-3');
  assert.equal(r.staging_probe_contract_ready, true);
  assert.ok(r.message.includes('RTP-3 authorized staging backend health probe contract ready'));
  assert.ok(r.message.includes('No probe executed'));
  assert.ok(r.message.includes('PASS GOLD REAL not claimed'));
});

test('ready path: timeout_ms = 1000 (boundary)', () => {
  const r = build({ ...VALID, timeout_ms: 1000 });
  assert.equal(r.status, STATUSES.READY);
});

test('ready path: timeout_ms = 10000 (boundary)', () => {
  const r = build({ ...VALID, timeout_ms: 10000 });
  assert.equal(r.status, STATUSES.READY);
});

// ── evidence_hash deterministic ───────────────────────────────────
test('evidence_hash is deterministic', () => {
  const r1 = build(VALID);
  const r2 = build(VALID);
  assert.equal(r1.evidence_hash, r2.evidence_hash, 'hashes must be identical');
  assert.equal(r1.evidence_hash.length, 64);
});

test('different inputs produce different hashes', () => {
  const r1 = build({ ...VALID, probe_scope: 'scope-a' });
  const r2 = build({ ...VALID, probe_scope: 'scope-b' });
  assert.notEqual(r1.evidence_hash, r2.evidence_hash);
});

// ── Dangerous flags false — all paths ────────────────────────────
const alwaysFalse = [
  'runtime_probe_executed', 'backend_called', 'network_called', 'secrets_read',
  'pass_gold_real_claimed', 'pass_gold_real_achieved', 'release_allowed',
  'deploy_allowed', 'tag_allowed', 'stable_promotion_allowed',
  'production_touched', 'rollback_execution_allowed',
];

test('all dangerous flags false on blocked_dependency result', () => {
  const r = build({ ...VALID, rtp0_ready: false });
  for (const flag of alwaysFalse) {
    assert.equal(r[flag], false, flag + ' must be false');
  }
});

test('all dangerous flags false on blocked_input result', () => {
  const r = build({ ...VALID, human_authorization_explicit: false });
  for (const flag of alwaysFalse) {
    assert.equal(r[flag], false, flag + ' must be false');
  }
});

test('all dangerous flags false on ready result', () => {
  const r = build(VALID);
  for (const flag of alwaysFalse) {
    assert.equal(r[flag], false, flag + ' must be false');
  }
});

// ── PASS GOLD REAL not claimed ────────────────────────────────────
test('PASS GOLD REAL not claimed in any path', () => {
  const cases = [
    {},
    { rtp0_ready: true },
    VALID,
  ];
  for (const inp of cases) {
    const r = build(inp);
    assert.equal(r.pass_gold_real_claimed, false);
    assert.equal(r.pass_gold_real_achieved, false);
  }
});

// ── deploy/release/tag/stable false ──────────────────────────────
test('deploy/release/tag/stable false on ready result', () => {
  const r = build(VALID);
  assert.equal(r.deploy_allowed,           false);
  assert.equal(r.release_allowed,          false);
  assert.equal(r.tag_allowed,              false);
  assert.equal(r.stable_promotion_allowed, false);
  assert.equal(r.production_touched,       false);
});

// ── validate() ───────────────────────────────────────────────────
test('validate returns valid=true for ready result', () => {
  const r = build(VALID);
  const v = validate(r);
  assert.equal(v.valid, true);
  assert.deepEqual(v.issues, []);
});

test('validate returns valid=true for blocked result', () => {
  const r = build({ rtp0_ready: false });
  const v = validate(r);
  assert.equal(v.valid, true);
  assert.deepEqual(v.issues, []);
});

test('validate fails when evidence_hash removed', () => {
  const r = build(VALID);
  const bad = { ...r };
  delete bad.evidence_hash;
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.length > 0);
});

test('validate fails when module_version removed', () => {
  const r = build(VALID);
  const bad = { ...r, module_version: 'WRONG' };
  const v = validate(bad);
  assert.equal(v.valid, false);
});

test('validate fails when dangerous flag set to true', () => {
  const r = build(VALID);
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

test('render contains RTP-3 header', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('RTP-3 Authorized Staging Backend Health Probe'));
});

test('render shows endpoint on ready path', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes(VALID.staging_endpoint));
});

test('render shows GET method on ready path', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('GET'));
});

test('render shows runtime_probe_executed false', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('runtime_probe_executed'));
  assert.ok(out.includes('false'));
});

// ── Final tally ──────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('[RTP-3-TEST] Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.error('[RTP-3-TEST] ❌ ' + failed + ' test(s) FAILED');
  process.exit(1);
}
console.log('[RTP-3-TEST] ✅ All tests passed');
console.log('[RTP-3-TEST] staging_probe_contract_ready: true (READY path only)');
console.log('[RTP-3-TEST] runtime_probe_executed: false');
console.log('[RTP-3-TEST] REGRA ABSOLUTA preserved — PASS GOLD REAL not claimed');
