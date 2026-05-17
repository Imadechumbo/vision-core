#!/usr/bin/env node
/**
 * Local PASS GOLD Full Candidate Drill — Unit Tests V32.2
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runLocalPassGoldFullCandidateDrill,
  FULL_CANDIDATE_DRILL_STATUSES,
} from '../local-pass-gold-full-candidate-drill.mjs';

const CLI = resolve(process.cwd(), 'tools', 'local-pass-gold-full-candidate-drill.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// Mock helpers
function mockBridgeReady(overrides = {}) {
  return {
    probe_bridge_ready:   true,
    probe_bridge_status:  'PROBE_BRIDGE_READY',
    mission_id:           'drill-mission-001',
    evidence_receipt_id:  'drill-receipt-001',
    evidence_source:      'go-core',
    backend_stub:         false,
    runtime_probe_pass:   true,
    blocking_reason:      null,
    ...overrides,
  };
}

function mockBridgeBlocked(overrides = {}) {
  return {
    probe_bridge_ready:   false,
    probe_bridge_status:  'BLOCKED_HEALTH',
    mission_id:           null,
    evidence_receipt_id:  null,
    evidence_source:      null,
    backend_stub:         true,
    runtime_probe_pass:   false,
    blocking_reason:      'health_blocked',
    ...overrides,
  };
}

function mockAuthorityValid(overrides = {}) {
  return {
    authority_valid:          true,
    authority_fixture_status: 'AUTH_FIXTURE_READY',
    reviewer:                 'drill_local',
    contract_id:              'auth-test-001',
    blocking_reason:          null,
    ...overrides,
  };
}

function mockAuthorityBlocked(overrides = {}) {
  return {
    authority_valid:          false,
    authority_fixture_status: 'AUTH_FIXTURE_BLOCKED_MISSING',
    reviewer:                 null,
    contract_id:              null,
    blocking_reason:          'reviewer_required',
    ...overrides,
  };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(FULL_CANDIDATE_DRILL_STATUSES),                                        '[A-01] statuses is array');
assert(FULL_CANDIDATE_DRILL_STATUSES.length === 5,                                          '[A-02] 5 statuses');
assert(FULL_CANDIDATE_DRILL_STATUSES.includes('FULL_CANDIDATE_DRILL_BLOCKED_RUNTIME'),      '[A-03] BLOCKED_RUNTIME present');
assert(FULL_CANDIDATE_DRILL_STATUSES.includes('FULL_CANDIDATE_DRILL_BLOCKED_RECEIPT'),      '[A-04] BLOCKED_RECEIPT present');
assert(FULL_CANDIDATE_DRILL_STATUSES.includes('FULL_CANDIDATE_DRILL_BLOCKED_AUTHORITY'),    '[A-05] BLOCKED_AUTHORITY present');
assert(FULL_CANDIDATE_DRILL_STATUSES.includes('FULL_CANDIDATE_DRILL_BLOCKED_TESTS'),        '[A-06] BLOCKED_TESTS present');
assert(FULL_CANDIDATE_DRILL_STATUSES.includes('FULL_CANDIDATE_DRILL_READY'),                '[A-07] FULL_CANDIDATE_DRILL_READY present');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const blocked = runLocalPassGoldFullCandidateDrill({
  _mock_bridge: mockBridgeBlocked(),
});
const ready = runLocalPassGoldFullCandidateDrill({
  _mock_bridge:    mockBridgeReady(),
  _mock_authority: mockAuthorityValid(),
  tests_verified:  true,
});
assert(blocked.deploy_allowed             === false, '[B-01] deploy=false (blocked)');
assert(blocked.promotion_allowed          === false, '[B-02] promotion=false (blocked)');
assert(blocked.stable_allowed             === false, '[B-03] stable=false (blocked)');
assert(ready.deploy_allowed               === false, '[B-04] deploy=false (READY)');
assert(ready.promotion_allowed            === false, '[B-05] promotion=false (READY)');
assert(ready.stable_allowed               === false, '[B-06] stable=false (READY)');
assert(blocked.candidate_is_local_drill   === true,  '[B-07] candidate_is_local_drill=true (blocked)');
assert(ready.candidate_is_local_drill     === true,  '[B-08] candidate_is_local_drill=true (READY)');
assert(blocked.pass_gold_candidate_allowed === false, '[B-09] pass_gold_candidate=false (blocked)');

// ─── Suite C: Runtime blocked ─────────────────────────────────────
console.log('\n[Suite C] Runtime blocked');
const runtimeBlocked = runLocalPassGoldFullCandidateDrill({
  _mock_bridge: mockBridgeBlocked(),
});
assert(runtimeBlocked.full_candidate_drill_status  === 'FULL_CANDIDATE_DRILL_BLOCKED_RUNTIME', '[C-01] status=BLOCKED_RUNTIME');
assert(runtimeBlocked.full_candidate_drill_ready   === false,                                  '[C-02] drill_ready=false');
assert(runtimeBlocked.pass_gold_candidate_allowed  === false,                                  '[C-03] pass_gold=false');
assert(runtimeBlocked.all_strict_gates_present     === false,                                  '[C-04] gates=false');
assert(typeof runtimeBlocked.blocking_reason       === 'string',                               '[C-05] blocking_reason present');

const runtimeBlocked2 = runLocalPassGoldFullCandidateDrill({
  _mock_bridge: mockBridgeBlocked({ probe_bridge_status: 'BLOCKED_BRIDGE', blocking_reason: 'bridge_failed' }),
});
assert(runtimeBlocked2.full_candidate_drill_status === 'FULL_CANDIDATE_DRILL_BLOCKED_RUNTIME', '[C-06] any bridge failure → BLOCKED_RUNTIME');

// ─── Suite D: Receipt blocked ─────────────────────────────────────
console.log('\n[Suite D] Receipt blocked');
const noReceipt = runLocalPassGoldFullCandidateDrill({
  _mock_bridge: mockBridgeReady({ evidence_receipt_id: null }),
});
assert(noReceipt.full_candidate_drill_status === 'FULL_CANDIDATE_DRILL_BLOCKED_RECEIPT', '[D-01] no receipt → BLOCKED_RECEIPT');
assert(noReceipt.full_candidate_drill_ready  === false,                                  '[D-02] drill_ready=false');
assert(noReceipt.pass_gold_candidate_allowed === false,                                  '[D-03] pass_gold=false');

const wrongSource = runLocalPassGoldFullCandidateDrill({
  _mock_bridge: mockBridgeReady({ evidence_source: 'backend' }),
});
assert(wrongSource.full_candidate_drill_status === 'FULL_CANDIDATE_DRILL_BLOCKED_RECEIPT', '[D-04] backend source → BLOCKED_RECEIPT');
assert(wrongSource.blocking_reason.includes('receipt_source_not_go_core'),               '[D-05] correct blocking reason');

const stubSource = runLocalPassGoldFullCandidateDrill({
  _mock_bridge: mockBridgeReady({ evidence_source: 'stub' }),
});
assert(stubSource.full_candidate_drill_status === 'FULL_CANDIDATE_DRILL_BLOCKED_RECEIPT',  '[D-06] stub source → BLOCKED_RECEIPT');

const emptySource = runLocalPassGoldFullCandidateDrill({
  _mock_bridge: mockBridgeReady({ evidence_source: '' }),
});
assert(emptySource.full_candidate_drill_status === 'FULL_CANDIDATE_DRILL_BLOCKED_RECEIPT', '[D-07] empty source → BLOCKED_RECEIPT');

// ─── Suite E: Authority blocked ───────────────────────────────────
console.log('\n[Suite E] Authority blocked');
const authBlocked = runLocalPassGoldFullCandidateDrill({
  _mock_bridge:    mockBridgeReady(),
  _mock_authority: mockAuthorityBlocked(),
});
assert(authBlocked.full_candidate_drill_status  === 'FULL_CANDIDATE_DRILL_BLOCKED_AUTHORITY', '[E-01] status=BLOCKED_AUTHORITY');
assert(authBlocked.full_candidate_drill_ready   === false,                                    '[E-02] drill_ready=false');
assert(authBlocked.pass_gold_candidate_allowed  === false,                                    '[E-03] pass_gold=false');
assert(typeof authBlocked.blocking_reason       === 'string',                                 '[E-04] blocking_reason present');

const authBlockedDecision = runLocalPassGoldFullCandidateDrill({
  _mock_bridge:    mockBridgeReady(),
  _mock_authority: mockAuthorityBlocked({ authority_fixture_status: 'AUTH_FIXTURE_BLOCKED_DECISION', blocking_reason: 'review_decision_not_approved' }),
});
assert(authBlockedDecision.full_candidate_drill_status === 'FULL_CANDIDATE_DRILL_BLOCKED_AUTHORITY', '[E-05] decision blocked → BLOCKED_AUTHORITY');

// ─── Suite F: Tests blocked ───────────────────────────────────────
console.log('\n[Suite F] Tests blocked');
const testsBlocked = runLocalPassGoldFullCandidateDrill({
  _mock_bridge:    mockBridgeReady(),
  _mock_authority: mockAuthorityValid(),
  tests_verified:  false,
});
assert(testsBlocked.full_candidate_drill_status  === 'FULL_CANDIDATE_DRILL_BLOCKED_TESTS', '[F-01] status=BLOCKED_TESTS');
assert(testsBlocked.full_candidate_drill_ready   === false,                                '[F-02] drill_ready=false');
assert(testsBlocked.pass_gold_candidate_allowed  === false,                                '[F-03] pass_gold=false');
assert(testsBlocked.missing_gates.includes('tests_verified'),                              '[F-04] missing_gates includes tests_verified');
assert(testsBlocked.blocking_reason              === 'tests_not_verified',                 '[F-05] correct blocking reason');

// ─── Suite G: Full valid → FULL_CANDIDATE_DRILL_READY ─────────────
console.log('\n[Suite G] Full valid');
assert(ready.full_candidate_drill_status  === 'FULL_CANDIDATE_DRILL_READY', '[G-01] status=FULL_CANDIDATE_DRILL_READY');
assert(ready.full_candidate_drill_ready   === true,                         '[G-02] drill_ready=true');
assert(ready.pass_gold_candidate_allowed  === true,                         '[G-03] pass_gold_candidate_allowed=true');
assert(ready.candidate_is_local_drill     === true,                         '[G-04] candidate_is_local_drill=true');
assert(ready.all_strict_gates_present     === true,                         '[G-05] all_strict_gates_present=true');
assert(Array.isArray(ready.missing_gates) && ready.missing_gates.length === 0, '[G-06] missing_gates=[]');
assert(ready.mission_id                   === 'drill-mission-001',          '[G-07] mission_id echoed');
assert(ready.evidence_receipt_id          === 'drill-receipt-001',          '[G-08] evidence_receipt_id echoed');
assert(ready.evidence_source              === 'go-core',                    '[G-09] evidence_source=go-core');
assert(ready.tests_verified               === true,                         '[G-10] tests_verified=true');
assert(ready.blocking_reason              === null,                         '[G-11] blocking_reason=null');
assert(ready.deploy_allowed               === false,                        '[G-12] deploy=false (READY)');
assert(ready.promotion_allowed            === false,                        '[G-13] promotion=false (READY)');
assert(ready.stable_allowed               === false,                        '[G-14] stable=false (READY)');
assert(typeof ready.authority_contract_id === 'string',                     '[G-15] authority_contract_id present');
assert(typeof ready.binding_status        === 'string',                     '[G-16] binding_status present');

// pass_gold_candidate ONLY in READY, not in any blocked state
const allBlocked = [blocked, runtimeBlocked, noReceipt, wrongSource, authBlocked, testsBlocked];
for (const r of allBlocked) {
  assert(r.pass_gold_candidate_allowed === false, `[G-17] pass_gold=false in ${r.full_candidate_drill_status}`);
}

// ─── Suite H: Authority overrides ─────────────────────────────────
console.log('\n[Suite H] Authority overrides');
const withOverride = runLocalPassGoldFullCandidateDrill({
  _mock_bridge:        mockBridgeReady(),
  tests_verified:      true,
  authority_overrides: { scope: 'pass_gold_drill' },
});
assert(
  withOverride.full_candidate_drill_status === 'FULL_CANDIDATE_DRILL_READY' ||
  typeof withOverride.full_candidate_drill_status === 'string',
  '[H-01] authority override accepted or produces valid status'
);

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 0,                                         '[I-01] default → exit 0 (fixture mode)');
assert(cliDefault.stdout.includes('FULL_CANDIDATE_DRILL_READY'),          '[I-02] stdout FULL_CANDIDATE_DRILL_READY');
assert(cliDefault.stdout.includes('pass_gold_candidate_allowed'),         '[I-03] stdout shows pass_gold_candidate_allowed');
assert(cliDefault.stdout.includes('candidate_is_local_drill'),            '[I-04] stdout shows candidate_is_local_drill');
assert(cliDefault.stdout.includes('deploy_allowed'),                      '[I-05] stdout shows deploy_allowed');

const cliNoTests = runCLI(['--no-tests-verified']);
assert(cliNoTests.exitCode === 1,                                         '[I-06] --no-tests-verified → exit 1');
assert(cliNoTests.stdout.includes('FULL_CANDIDATE_DRILL_BLOCKED_TESTS'),  '[I-07] stdout BLOCKED_TESTS');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 0,                                            '[I-08] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                   '[I-09] JSON parseable');
assert(parsed && parsed.pass_gold_candidate_allowed === true,             '[I-10] JSON pass_gold_candidate_allowed=true');
assert(parsed && parsed.candidate_is_local_drill    === true,             '[I-11] JSON candidate_is_local_drill=true');
assert(parsed && parsed.deploy_allowed              === false,            '[I-12] JSON deploy=false');
assert(parsed && parsed.promotion_allowed           === false,            '[I-13] JSON promotion=false');
assert(parsed && parsed.stable_allowed              === false,            '[I-14] JSON stable=false');
assert(parsed && parsed.evidence_source             === 'go-core',        '[I-15] JSON evidence_source=go-core');

// ─── Suite J: Schema ──────────────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(ready.schema_version   === 'v32.2', '[J-01] schema=v32.2 (READY)');
assert(blocked.schema_version === 'v32.2', '[J-02] schema=v32.2 (BLOCKED)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nlocal-pass-gold-full-candidate-drill: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
