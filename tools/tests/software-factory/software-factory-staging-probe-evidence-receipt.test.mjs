/**
 * VISION CORE V2.9.10
 * tools/tests/software-factory/software-factory-staging-probe-evidence-receipt.test.mjs
 * RTP-5 — Staging Probe Evidence Receipt Tests
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
} from '../../software-factory/software-factory-staging-probe-evidence-receipt.mjs';
import mod from '../../software-factory/software-factory-staging-probe-evidence-receipt.mjs';

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
  rtp4_ready:                   true,
  human_authorization_explicit: true,
  staging_endpoint:             'https://staging.internal.example.com/api/health',
  http_method:                  'GET',
  timeout_ms:                   3000,
  probe_scope:                  'health-endpoint-only',
  evidence_capture_plan:        'capture-status-code-and-sanitized-body-hash',
  expected_evidence_fields:     ['status_code', 'response_time_ms', 'sanitized_body_hash'],
  sanitizer_required:           true,
  noop_mode:                    true,
  execution_performed:          false,
};

// All dangerous flags to check
const DANGEROUS = [
  'runtime_probe_executed', 'execution_performed', 'backend_called',
  'endpoint_called', 'network_called', 'secrets_read', 'secrets_printed',
  'raw_body_stored', 'raw_headers_stored', 'pass_gold_real_claimed',
  'pass_gold_real_achieved', 'release_allowed', 'deploy_allowed',
  'tag_allowed', 'stable_promotion_allowed', 'production_touched',
];

console.log('\n=== RTP-5 Staging Probe Evidence Receipt Tests ===\n');

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

test('blocks when rtp4_ready false', () => {
  const r = build({ ...VALID, rtp4_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_DEPENDENCY);
  assert.equal(r.ready, false);
});

// ── Authorization ─────────────────────────────────────────────────
test('blocks when human_authorization_explicit false', () => {
  const r = build({ ...VALID, human_authorization_explicit: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('human_authorization_explicit'));
});

// ── execution_performed must be false ─────────────────────────────
test('blocks when execution_performed true', () => {
  const r = build({ ...VALID, execution_performed: true });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('execution_performed'));
});

// ── noop_mode must be true ────────────────────────────────────────
test('blocks when noop_mode false', () => {
  const r = build({ ...VALID, noop_mode: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('noop_mode'));
});

// ── sanitizer_required must be true ──────────────────────────────
test('blocks when sanitizer_required false', () => {
  const r = build({ ...VALID, sanitizer_required: false });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(r.ready, false);
  assert.ok(r.message.includes('sanitizer_required'));
});

// ── Endpoint validation ───────────────────────────────────────────
test('blocks empty endpoint', () => {
  const r = build({ ...VALID, staging_endpoint: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
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

// ── Timeout validation ────────────────────────────────────────────
test('blocks timeout below 1000', () => {
  const r = build({ ...VALID, timeout_ms: 999 });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('1000'));
});

test('blocks timeout above 10000', () => {
  const r = build({ ...VALID, timeout_ms: 10001 });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('10000'));
});

test('timeout boundary 1000 accepted', () => {
  const r = build({ ...VALID, timeout_ms: 1000 });
  assert.equal(r.status, STATUSES.READY);
});

test('timeout boundary 10000 accepted', () => {
  const r = build({ ...VALID, timeout_ms: 10000 });
  assert.equal(r.status, STATUSES.READY);
});

// ── Evidence capture plan ─────────────────────────────────────────
test('blocks empty evidence_capture_plan', () => {
  const r = build({ ...VALID, evidence_capture_plan: '' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('evidence_capture_plan'));
});

test('blocks whitespace-only evidence_capture_plan', () => {
  const r = build({ ...VALID, evidence_capture_plan: '   ' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

// ── expected_evidence_fields ──────────────────────────────────────
test('blocks empty expected_evidence_fields array', () => {
  const r = build({ ...VALID, expected_evidence_fields: [] });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('expected_evidence_fields'));
});

test('blocks non-array expected_evidence_fields', () => {
  const r = build({ ...VALID, expected_evidence_fields: 'status_code' });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

test('blocks expected_evidence_fields with disallowed field', () => {
  const r = build({ ...VALID, expected_evidence_fields: ['status_code', 'raw_body'] });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('raw_body'));
});

test('blocks expected_evidence_fields with secrets field', () => {
  const r = build({ ...VALID, expected_evidence_fields: ['status_code', 'api_key'] });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.message.includes('api_key'));
});

test('accepts all allowed evidence fields', () => {
  const r = build({ ...VALID, expected_evidence_fields: [
    'status_code', 'response_time_ms', 'sanitized_body_hash',
    'sanitized_headers_hash', 'probe_started_at', 'probe_finished_at',
    'no_secret_leak_detected', 'endpoint_fingerprint',
  ] });
  assert.equal(r.status, STATUSES.READY);
});

// ── Ready path ────────────────────────────────────────────────────
test('ready when all inputs valid', () => {
  const r = build(VALID);
  assert.equal(r.status, STATUSES.READY);
  assert.equal(r.ready, true);
  assert.equal(r.module_version, 'RTP-5');
  assert.equal(r.staging_probe_evidence_receipt_ready, true);
  assert.ok(r.message.includes('RTP-5 staging probe evidence receipt prepared'));
  assert.ok(r.message.includes('No probe executed'));
  assert.ok(r.message.includes('PASS GOLD REAL not claimed'));
  assert.ok(r.message.includes('Raw body and headers are not stored'));
  assert.ok(r.message.includes('Secrets are not printed'));
});

// ── evidence_hash deterministic ───────────────────────────────────
test('evidence_hash is deterministic', () => {
  const r1 = build(VALID);
  const r2 = build(VALID);
  assert.equal(r1.evidence_hash, r2.evidence_hash, 'hashes must match');
  assert.equal(r1.evidence_hash.length, 64);
  assert.ok(/^[0-9a-f]{64}$/.test(r1.evidence_hash));
});

test('hash changes when expected_evidence_fields changes', () => {
  const r1 = build({ ...VALID, expected_evidence_fields: ['status_code'] });
  const r2 = build({ ...VALID, expected_evidence_fields: ['status_code', 'response_time_ms'] });
  assert.notEqual(r1.evidence_hash, r2.evidence_hash);
});

test('hash changes when probe_scope changes', () => {
  const r1 = build({ ...VALID, probe_scope: 'scope-a' });
  const r2 = build({ ...VALID, probe_scope: 'scope-b' });
  assert.notEqual(r1.evidence_hash, r2.evidence_hash);
});

// ── Dangerous flags false — all paths ────────────────────────────
test('all dangerous flags false on blocked_dependency result', () => {
  const r = build({ ...VALID, rtp0_ready: false });
  for (const flag of DANGEROUS) {
    assert.equal(r[flag], false, flag + ' must be false');
  }
});

test('all dangerous flags false on blocked_input result', () => {
  const r = build({ ...VALID, human_authorization_explicit: false });
  for (const flag of DANGEROUS) {
    assert.equal(r[flag], false, flag + ' must be false');
  }
});

test('all dangerous flags false on ready result', () => {
  const r = build(VALID);
  for (const flag of DANGEROUS) {
    assert.equal(r[flag], false, flag + ' must be false on ready result');
  }
});

// ── Specific flag checks ──────────────────────────────────────────
test('runtime_probe_executed false on ready result', () => {
  assert.equal(build(VALID).runtime_probe_executed, false);
});

test('raw_body_stored false on ready result', () => {
  assert.equal(build(VALID).raw_body_stored, false);
});

test('raw_headers_stored false on ready result', () => {
  assert.equal(build(VALID).raw_headers_stored, false);
});

test('secrets_printed false on ready result', () => {
  assert.equal(build(VALID).secrets_printed, false);
});

test('production_touched false on ready result', () => {
  assert.equal(build(VALID).production_touched, false);
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

// ── deploy/release/tag/stable false ──────────────────────────────
test('deploy/release/tag/stable false on ready result', () => {
  const r = build(VALID);
  assert.equal(r.deploy_allowed,           false);
  assert.equal(r.release_allowed,          false);
  assert.equal(r.tag_allowed,              false);
  assert.equal(r.stable_promotion_allowed, false);
});

// ── validate() ───────────────────────────────────────────────────
test('validate returns {valid:true} for ready result', () => {
  const v = validate(build(VALID));
  assert.equal(v.valid, true);
  assert.deepEqual(v.issues, []);
});

test('validate returns {valid:true} for blocked result', () => {
  const v = validate(build({ rtp0_ready: false }));
  assert.equal(v.valid, true);
  assert.deepEqual(v.issues, []);
});

test('validate fails when evidence_hash removed', () => {
  const bad = { ...build(VALID) };
  delete bad.evidence_hash;
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.length > 0);
});

test('validate fails when module_version wrong', () => {
  const bad = { ...build(VALID), module_version: 'WRONG' };
  const v = validate(bad);
  assert.equal(v.valid, false);
});

test('validate fails when dangerous flag set to true', () => {
  const bad = { ...build(VALID), release_allowed: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('release_allowed')));
  // Original result unaffected (top-level primitive)
  assert.equal(build(VALID).release_allowed, false);
});

test('validate fails when pass_gold_real_claimed set to true', () => {
  const bad = { ...build(VALID), pass_gold_real_claimed: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('pass_gold_real_claimed')));
});

test('validate fails when raw_body_stored set to true', () => {
  const bad = { ...build(VALID), raw_body_stored: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('raw_body_stored')));
});

test('validate fails when secrets_printed set to true', () => {
  const bad = { ...build(VALID), secrets_printed: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
  assert.ok(v.issues.some(i => i.includes('secrets_printed')));
});

test('validate fails when production_touched set to true', () => {
  const bad = { ...build(VALID), production_touched: true };
  const v = validate(bad);
  assert.equal(v.valid, false);
});

// ── render() ─────────────────────────────────────────────────────
test('render contains REGRA ABSOLUTA', () => {
  const out = render(build(VALID));
  assert.ok(
    out.includes('REGRA ABSOLUTA') || out.includes('SEM PASS GOLD REAL'),
    'must include REGRA ABSOLUTA or SEM PASS GOLD REAL'
  );
});

test('render states PASS GOLD REAL not claimed', () => {
  assert.ok(render(build(VALID)).includes('not claimed'));
});

test('render states production not touched', () => {
  const out = render(build(VALID));
  assert.ok(out.includes('not touched') || out.includes('production_touched'));
});

test('render contains RTP-5 header', () => {
  assert.ok(render(build(VALID)).includes('RTP-5 Staging Probe Evidence Receipt'));
});

test('render shows runtime_probe_executed: false', () => {
  const out = render(build(VALID));
  assert.ok(out.includes('runtime_probe_executed'));
  assert.ok(out.includes('false'));
});

test('render shows execution_performed: false', () => {
  const out = render(build(VALID));
  assert.ok(out.includes('execution_performed'));
});

test('render shows raw_body_stored: false', () => {
  const out = render(build(VALID));
  assert.ok(out.includes('raw_body_stored'));
});

test('render shows raw_headers_stored: false', () => {
  const out = render(build(VALID));
  assert.ok(out.includes('raw_headers_stored'));
});

test('render shows secrets_printed: false', () => {
  const out = render(build(VALID));
  assert.ok(out.includes('secrets_printed'));
});

test('render shows evidence_capture_plan', () => {
  const out = render(build(VALID));
  assert.ok(out.includes(VALID.evidence_capture_plan));
});

test('render shows staging_endpoint', () => {
  const out = render(build(VALID));
  assert.ok(out.includes(VALID.staging_endpoint));
});

test('render shows expected_evidence_fields', () => {
  const out = render(build(VALID));
  assert.ok(out.includes('status_code'));
});

test('render on blocked path contains BLOCKED', () => {
  const out = render(build({ rtp0_ready: false }));
  assert.ok(out.includes('BLOCKED'));
  assert.ok(out.includes('REGRA ABSOLUTA') || out.includes('SEM PASS GOLD REAL'));
});

// ── Final tally ──────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('[RTP-5-TEST] Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.error('[RTP-5-TEST] ❌ ' + failed + ' test(s) FAILED');
  process.exit(1);
}
console.log('[RTP-5-TEST] ✅ All tests passed');
console.log('[RTP-5-TEST] staging_probe_evidence_receipt_ready: true (READY path only)');
console.log('[RTP-5-TEST] runtime_probe_executed: false');
console.log('[RTP-5-TEST] raw_body_stored: false, raw_headers_stored: false, secrets_printed: false');
console.log('[RTP-5-TEST] REGRA ABSOLUTA preserved — PASS GOLD REAL not claimed');
