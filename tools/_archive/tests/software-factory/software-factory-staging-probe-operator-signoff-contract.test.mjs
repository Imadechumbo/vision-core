/**
 * VISION CORE V2.9.10
 * tools/tests/software-factory/software-factory-staging-probe-operator-signoff-contract.test.mjs
 * RTP-6 — Staging Probe Operator Sign-Off Contract Tests
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
} from '../../software-factory/software-factory-staging-probe-operator-signoff-contract.mjs';
import mod from '../../software-factory/software-factory-staging-probe-operator-signoff-contract.mjs';

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

// Fake 64-char hex string for evidence_receipt_hash
const FAKE_HASH = 'a'.repeat(64);

// Valid ready input for reuse
const VALID = {
  rtp0_ready:               true,
  rtp1_ready:               true,
  rtp2_ready:               true,
  rtp3_ready:               true,
  rtp4_ready:               true,
  rtp5_ready:               true,
  human_operator_identity:  'operator-jane-doe',
  human_operator_go:        true,
  operator_review_scope:    'staging-health-probe-only',
  evidence_receipt_hash:    FAKE_HASH,
  evidence_receipt_ready:   true,
  evidence_sanitized:       true,
  no_secret_leak_detected:  true,
  raw_body_stored:          false,
  raw_headers_stored:       false,
  production_touched:       false,
  pass_gold_real_requested: false,
};

console.log('\n=== RTP-6 Staging Probe Operator Sign-Off Contract Tests ===\n');

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

test('blocks when rtp3_ready false', () => {
  const r = build({ ...VALID, rtp3_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_DEPENDENCY);
  assert.equal(r.ready, false);
});

test('blocks when rtp4_ready false', () => {
  const r = build({ ...VALID, rtp4_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_DEPENDENCY);
  assert.equal(r.ready, false);
});

test('blocks when rtp5_ready false', () => {
  const r = build({ ...VALID, rtp5_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_DEPENDENCY);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('RTP-5'));
});

// ── Safety invariants — input flags that must be false ────────────
test('blocks when raw_body_stored true', () => {
  const r = build({ ...VALID, raw_body_stored: true });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('raw_body_stored'));
});

test('blocks when raw_headers_stored true', () => {
  const r = build({ ...VALID, raw_headers_stored: true });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('raw_headers_stored'));
});

test('blocks when production_touched true', () => {
  const r = build({ ...VALID, production_touched: true });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('production_touched'));
});

test('blocks when pass_gold_real_requested true', () => {
  const r = build({ ...VALID, pass_gold_real_requested: true });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.toLowerCase().includes('pass_gold_real_requested'));
});

// ── Operator identity ─────────────────────────────────────────────
test('blocks when human_operator_identity empty string', () => {
  const r = build({ ...VALID, human_operator_identity: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('human_operator_identity'));
});

test('blocks when human_operator_identity whitespace only', () => {
  const r = build({ ...VALID, human_operator_identity: '   ' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('human_operator_identity'));
});

test('blocks when human_operator_identity not string', () => {
  const r = build({ ...VALID, human_operator_identity: 42 });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

// ── Operator GO ───────────────────────────────────────────────────
test('blocks when human_operator_go false', () => {
  const r = build({ ...VALID, human_operator_go: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('human_operator_go'));
});

// ── Review scope ──────────────────────────────────────────────────
test('blocks when operator_review_scope empty string', () => {
  const r = build({ ...VALID, operator_review_scope: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('operator_review_scope'));
});

test('blocks when operator_review_scope whitespace only', () => {
  const r = build({ ...VALID, operator_review_scope: '  ' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

// ── evidence_receipt_hash validation ─────────────────────────────
test('blocks when evidence_receipt_hash empty', () => {
  const r = build({ ...VALID, evidence_receipt_hash: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('evidence_receipt_hash'));
});

test('blocks when evidence_receipt_hash too short (63 chars)', () => {
  const r = build({ ...VALID, evidence_receipt_hash: 'a'.repeat(63) });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

test('blocks when evidence_receipt_hash too long (65 chars)', () => {
  const r = build({ ...VALID, evidence_receipt_hash: 'a'.repeat(65) });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

test('blocks when evidence_receipt_hash contains uppercase', () => {
  const r = build({ ...VALID, evidence_receipt_hash: 'A'.repeat(64) });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

test('blocks when evidence_receipt_hash not string', () => {
  const r = build({ ...VALID, evidence_receipt_hash: 12345 });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

// ── evidence_receipt_ready ────────────────────────────────────────
test('blocks when evidence_receipt_ready false', () => {
  const r = build({ ...VALID, evidence_receipt_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('evidence_receipt_ready'));
});

// ── evidence_sanitized ────────────────────────────────────────────
test('blocks when evidence_sanitized false', () => {
  const r = build({ ...VALID, evidence_sanitized: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('evidence_sanitized'));
});

// ── no_secret_leak_detected ───────────────────────────────────────
test('blocks when no_secret_leak_detected false', () => {
  const r = build({ ...VALID, no_secret_leak_detected: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('no_secret_leak_detected'));
});

// ── Ready path ────────────────────────────────────────────────────
test('ready when all inputs valid', () => {
  const r = build(VALID);
  assert.equal(r.status, STATUSES.READY);
  assert.equal(r.ready, true);
  assert.equal(r.module_version, 'RTP-6');
  assert.equal(r.staging_probe_operator_signoff_ready, true);
  assert.equal(r.operator_signoff_recorded, true);
  assert.ok(r.message.includes('RTP-6 staging probe operator sign-off contract ready'));
  assert.ok(r.message.includes('No probe executed'));
  assert.ok(r.message.includes('PASS GOLD REAL not claimed'));
});

test('ready path: operator identity trimmed', () => {
  const r = build({ ...VALID, human_operator_identity: '  jane-doe  ' });
  assert.equal(r.status, STATUSES.READY);
  assert.equal(r.human_operator_identity, 'jane-doe');
});

test('ready path: operator_review_scope trimmed', () => {
  const r = build({ ...VALID, operator_review_scope: '  scope-a  ' });
  assert.equal(r.status, STATUSES.READY);
  assert.equal(r.operator_review_scope, 'scope-a');
});

test('ready path: evidence_receipt_hash preserved', () => {
  const r = build(VALID);
  assert.equal(r.evidence_receipt_hash, FAKE_HASH);
});

// ── evidence_hash deterministic ───────────────────────────────────
test('evidence_hash is deterministic', () => {
  const r1 = build(VALID);
  const r2 = build(VALID);
  assert.equal(r1.evidence_hash, r2.evidence_hash, 'hashes must be identical');
  assert.equal(r1.evidence_hash.length, 64);
});

test('different inputs produce different hashes', () => {
  const r1 = build({ ...VALID, operator_review_scope: 'scope-a' });
  const r2 = build({ ...VALID, operator_review_scope: 'scope-b' });
  assert.notEqual(r1.evidence_hash, r2.evidence_hash);
});

test('evidence_hash present on blocked result', () => {
  const r = build({ ...VALID, rtp0_ready: false });
  assert.equal(typeof r.evidence_hash, 'string');
  assert.equal(r.evidence_hash.length, 64);
});

// ── Dangerous flags false — all paths ────────────────────────────
const alwaysFalse = [
  'runtime_probe_executed', 'backend_called', 'endpoint_called',
  'network_called', 'secrets_read', 'secrets_printed',
  'raw_body_stored', 'raw_headers_stored',
  'pass_gold_real_claimed', 'pass_gold_real_achieved',
  'release_allowed', 'deploy_allowed', 'tag_allowed',
  'stable_promotion_allowed', 'production_touched',
];

test('all dangerous flags false on blocked_dependency result', () => {
  const r = build({ ...VALID, rtp0_ready: false });
  for (const flag of alwaysFalse) {
    assert.equal(r[flag], false, flag + ' must be false');
  }
});

test('all dangerous flags false on blocked_input result', () => {
  const r = build({ ...VALID, human_operator_go: false });
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

test('validate fails when module_version wrong', () => {
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

test('validate fails when pass_gold_real_claimed true', () => {
  const r = build(VALID);
  const bad = { ...r, pass_gold_real_claimed: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('pass_gold_real_claimed')));
});

test('validate fails when production_touched true', () => {
  const r = build(VALID);
  const bad = { ...r, production_touched: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
});

test('validate fails when raw_body_stored true', () => {
  const r = build(VALID);
  const bad = { ...r, raw_body_stored: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('raw_body_stored')));
});

test('validate fails when raw_headers_stored true', () => {
  const r = build(VALID);
  const bad = { ...r, raw_headers_stored: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('raw_headers_stored')));
});

test('validate fails when secrets_printed true', () => {
  const r = build(VALID);
  const bad = { ...r, secrets_printed: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('secrets_printed')));
});

test('validate returns object with valid and issues keys', () => {
  const r = build(VALID);
  const v = validate(r);
  assert.ok('valid' in v);
  assert.ok('issues' in v);
  assert.ok(Array.isArray(v.issues));
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

test('render contains RTP-6 header', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('RTP-6 Staging Probe Operator Sign-Off Contract'));
});

test('render shows human_operator_identity on ready path', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes(VALID.human_operator_identity));
});

test('render shows operator_review_scope on ready path', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes(VALID.operator_review_scope));
});

test('render shows evidence_receipt_hash on ready path', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes(FAKE_HASH));
});

test('render shows operator_signoff_recorded flag', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('operator_signoff_recorded'));
});

test('render shows runtime_probe_executed false', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('runtime_probe_executed'));
  assert.ok(out.includes('false'));
});

test('render shows raw_body_stored false', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('raw_body_stored'));
});

test('render shows raw_headers_stored false', () => {
  const r = build(VALID);
  const out = render(r);
  assert.ok(out.includes('raw_headers_stored'));
});

test('render returns non-empty string', () => {
  const r = build(VALID);
  const out = render(r);
  assert.equal(typeof out, 'string');
  assert.ok(out.length > 0);
});

test('render works on blocked result', () => {
  const r = build({ rtp0_ready: false });
  const out = render(r);
  assert.ok(out.includes('BLOCKED') || out.includes('RTP-6'));
});

// ── Default input ─────────────────────────────────────────────────
test('build() with no args returns blocked result with evidence_hash', () => {
  const r = build();
  assert.equal(r.ready, false);
  assert.equal(typeof r.evidence_hash, 'string');
  assert.equal(r.evidence_hash.length, 64);
  assert.equal(r.pass_gold_real_claimed, false);
  assert.equal(r.production_touched, false);
});

// ── Final tally ──────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('[RTP-6-TEST] Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.error('[RTP-6-TEST] ❌ ' + failed + ' test(s) FAILED');
  process.exit(1);
}
console.log('[RTP-6-TEST] ✅ All tests passed');
console.log('[RTP-6-TEST] staging_probe_operator_signoff_ready: true (READY path only)');
console.log('[RTP-6-TEST] operator_signoff_recorded: true (READY path only)');
console.log('[RTP-6-TEST] runtime_probe_executed: false');
console.log('[RTP-6-TEST] REGRA ABSOLUTA preserved — PASS GOLD REAL not claimed');
