/**
 * VISION CORE V2.9.10
 * tools/tests/software-factory/software-factory-local-runtime-probe-evidence-binder.test.mjs
 * RTP-1 — Local Runtime Probe Evidence Binder Tests
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
} from '../../software-factory/software-factory-local-runtime-probe-evidence-binder.mjs';

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

console.log('\n=== RTP-1 Local Runtime Probe Evidence Binder Tests ===\n');

// ── Exports ───────────────────────────────────────────────────────
test('STATUSES exported and frozen', () => {
  assert.ok(STATUSES && typeof STATUSES === 'object');
  assert.ok(Object.isFrozen(STATUSES));
  assert.ok(STATUSES.READY);
  assert.ok(STATUSES.BLOCKED_INPUT);
  assert.ok(STATUSES.BLOCKED_DEPENDENCY);
  assert.ok(STATUSES.FAIL);
});

test('build is function', () => assert.equal(typeof build, 'function'));
test('validate is function', () => assert.equal(typeof validate, 'function'));
test('render is function', () => assert.equal(typeof render, 'function'));

// ── Blocking: rtp0_ready false ────────────────────────────────────
test('blocks when rtp0_ready false', () => {
  const r = build({ rtp0_ready: false, local_probe_plan_declared: true, evidence_source: 'local' });
  assert.equal(r.status, STATUSES.BLOCKED_DEPENDENCY);
  assert.equal(r.ready, false);
  assert.equal(r.blocked_dependency, true);
  assert.equal(r.pass_gold_real_claimed, false);
  assert.equal(r.release_allowed, false);
  assert.equal(r.deploy_allowed, false);
  assert.equal(r.production_touched, false);
});

// ── Blocking: local_probe_plan_declared false ─────────────────────
test('blocks when local_probe_plan_declared false', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: false, evidence_source: 'local' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.equal(r.blocked_input, true);
  assert.equal(r.pass_gold_real_claimed, false);
});

// ── Blocking: evidence_source empty ──────────────────────────────
test('blocks when evidence_source is empty string', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.equal(r.blocked_input, true);
});

test('blocks when evidence_source is whitespace only', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: '   ' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
});

// ── Ready path ────────────────────────────────────────────────────
test('ready when all inputs valid', () => {
  const r = build({
    rtp0_ready: true,
    local_probe_plan_declared: true,
    evidence_source: 'local-probe-plan-v1',
    operator_scope: 'staging-only',
    runtime_target_declared: true,
  });
  assert.equal(r.status, STATUSES.READY);
  assert.equal(r.ready, true);
  assert.equal(r.blocked_dependency, false);
  assert.equal(r.blocked_input, false);
  assert.equal(r.module_version, 'RTP-1');
  assert.ok(r.message.includes('RTP-1 local runtime probe evidence binder prepared'));
  assert.ok(r.message.includes('No runtime execution performed'));
  assert.ok(r.message.includes('PASS GOLD REAL not claimed'));
});

test('evidence_source trimmed in ready result', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: '  src  ' });
  assert.equal(r.status, STATUSES.READY);
  assert.equal(r.evidence_source, 'src');
});

// ── evidence_hash deterministic ───────────────────────────────────
test('evidence_hash is deterministic', () => {
  const input = {
    rtp0_ready: true,
    local_probe_plan_declared: true,
    evidence_source: 'probe-plan',
    operator_scope: 'staging',
    runtime_target_declared: true,
  };
  const r1 = build(input);
  const r2 = build(input);
  assert.equal(r1.evidence_hash, r2.evidence_hash, 'hashes must be identical across calls');
  assert.equal(r1.evidence_hash.length, 64);
});

test('different inputs produce different hashes', () => {
  const r1 = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'source-a' });
  const r2 = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'source-b' });
  assert.notEqual(r1.evidence_hash, r2.evidence_hash);
});

// ── Dangerous flags false — all paths ────────────────────────────
const dangerous = [
  'runtime_execution_authorized', 'backend_called', 'endpoint_called',
  'network_called', 'secrets_read', 'pass_gold_real_achieved',
  'pass_gold_real_claimed', 'release_allowed', 'deploy_allowed',
  'tag_allowed', 'stable_promotion_allowed', 'production_touched',
];

test('all dangerous flags false on blocked_dependency result', () => {
  const r = build({ rtp0_ready: false });
  for (const flag of dangerous) {
    assert.equal(r[flag], false, flag + ' must be false');
  }
});

test('all dangerous flags false on blocked_input result', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: false });
  for (const flag of dangerous) {
    assert.equal(r[flag], false, flag + ' must be false');
  }
});

test('all dangerous flags false on ready result', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'src' });
  for (const flag of dangerous) {
    assert.equal(r[flag], false, flag + ' must be false');
  }
});

// ── PASS GOLD REAL not claimed ────────────────────────────────────
test('PASS GOLD REAL not claimed in any path', () => {
  const inputs = [
    {},
    { rtp0_ready: true },
    { rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'x' },
  ];
  for (const inp of inputs) {
    const r = build(inp);
    assert.equal(r.pass_gold_real_claimed, false);
    assert.equal(r.pass_gold_real_achieved, false);
  }
});

// ── validate() ───────────────────────────────────────────────────
test('validate returns valid=true for ready result', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'src' });
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

test('validate fails when required field removed', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'src' });
  const bad = { ...r };
  delete bad.evidence_hash;
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.length > 0);
});

test('validate fails when dangerous flag set to true', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'src' });
  const bad = { ...r, release_allowed: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('release_allowed')));
});

test('validate fails when pass_gold_real_claimed set to true', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'src' });
  const bad = { ...r, pass_gold_real_claimed: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('pass_gold_real_claimed')));
});

// ── render() ─────────────────────────────────────────────────────
test('render contains REGRA ABSOLUTA', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'src' });
  const out = render(r);
  assert.ok(
    out.includes('REGRA ABSOLUTA') || out.includes('SEM PASS GOLD REAL'),
    'render must include REGRA ABSOLUTA or SEM PASS GOLD REAL'
  );
});

test('render states PASS GOLD REAL not claimed', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'src' });
  const out = render(r);
  assert.ok(out.includes('not claimed'));
});

test('render states production not touched', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'src' });
  const out = render(r);
  assert.ok(out.includes('not touched'));
});

test('render includes evidence hash', () => {
  const r = build({ rtp0_ready: true, local_probe_plan_declared: true, evidence_source: 'src' });
  const out = render(r);
  assert.ok(out.includes(r.evidence_hash));
});

// ── default export ────────────────────────────────────────────────
import mod from '../../software-factory/software-factory-local-runtime-probe-evidence-binder.mjs';
test('default export has STATUSES, build, validate, render', () => {
  assert.equal(typeof mod.STATUSES, 'object');
  assert.equal(typeof mod.build, 'function');
  assert.equal(typeof mod.validate, 'function');
  assert.equal(typeof mod.render, 'function');
});

// ── Final tally ──────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('[RTP-1-TEST] Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.error('[RTP-1-TEST] ❌ ' + failed + ' test(s) FAILED');
  process.exit(1);
}
console.log('[RTP-1-TEST] ✅ All tests passed');
console.log('[RTP-1-TEST] REGRA ABSOLUTA preserved — PASS GOLD REAL not claimed');
