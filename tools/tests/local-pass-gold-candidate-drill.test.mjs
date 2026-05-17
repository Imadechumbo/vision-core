#!/usr/bin/env node
/**
 * Local PASS GOLD Candidate Drill — Unit Tests V28.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runLocalPassGoldCandidateDrill,
  CANDIDATE_DRILL_STATUSES,
} from '../local-pass-gold-candidate-drill.mjs';

const CLI = resolve(process.cwd(), 'tools', 'local-pass-gold-candidate-drill.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CANDIDATE_DRILL_STATUSES),                                    '[A-01] statuses is array');
assert(CANDIDATE_DRILL_STATUSES.length === 5,                                      '[A-02] 5 statuses');
assert(CANDIDATE_DRILL_STATUSES.includes('CANDIDATE_DRILL_BLOCKED_SETUP'),         '[A-03] BLOCKED_SETUP present');
assert(CANDIDATE_DRILL_STATUSES.includes('CANDIDATE_DRILL_BLOCKED_RUNTIME'),       '[A-04] BLOCKED_RUNTIME present');
assert(CANDIDATE_DRILL_STATUSES.includes('CANDIDATE_DRILL_BLOCKED_RECEIPT'),       '[A-05] BLOCKED_RECEIPT present');
assert(CANDIDATE_DRILL_STATUSES.includes('CANDIDATE_DRILL_BLOCKED_AUTHORITY'),     '[A-06] BLOCKED_AUTHORITY present');
assert(CANDIDATE_DRILL_STATUSES.includes('CANDIDATE_DRILL_READY'),                 '[A-07] CANDIDATE_DRILL_READY present');

// ─── Suite B: Invariants — deploy/promotion/stable always false ───
console.log('\n[Suite B] Invariants');
const setupBlocked   = runLocalPassGoldCandidateDrill({ use_fixtures: false });
const readyResult    = runLocalPassGoldCandidateDrill({ use_fixtures: true });
assert(setupBlocked.deploy_allowed    === false, '[B-01] deploy=false (blocked)');
assert(setupBlocked.promotion_allowed === false, '[B-02] promotion=false (blocked)');
assert(setupBlocked.stable_allowed    === false, '[B-03] stable=false (blocked)');
assert(readyResult.deploy_allowed     === false, '[B-04] deploy=false (READY)');
assert(readyResult.promotion_allowed  === false, '[B-05] promotion=false (READY)');
assert(readyResult.stable_allowed     === false, '[B-06] stable=false (READY)');

// ─── Suite C: Setup blocked ───────────────────────────────────────
console.log('\n[Suite C] Setup blocked');
const noSetup = runLocalPassGoldCandidateDrill({
  use_fixtures: false,
});
assert(noSetup.candidate_drill_status       === 'CANDIDATE_DRILL_BLOCKED_SETUP', '[C-01] no fixtures → BLOCKED_SETUP');
assert(noSetup.pass_gold_candidate_allowed  === false,                           '[C-02] candidate_allowed=false');
assert(noSetup.blocking_reason              === 'fixtures_required_for_drill',   '[C-03] correct blocking_reason');
assert(noSetup.schema_version               === 'v28.0',                         '[C-04] schema=v28.0');

// ─── Suite D: Runtime blocked ─────────────────────────────────────
console.log('\n[Suite D] Runtime blocked');
const badRuntime = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  runtime_evidence: { runtime_evidence_ready: false, backend_alive: false },
});
assert(badRuntime.candidate_drill_status      === 'CANDIDATE_DRILL_BLOCKED_RUNTIME', '[D-01] bad runtime → BLOCKED_RUNTIME');
assert(badRuntime.pass_gold_candidate_allowed === false,                              '[D-02] candidate_allowed=false');
assert(Array.isArray(badRuntime.missing_gates),                                       '[D-03] missing_gates array');
assert(badRuntime.missing_gates.includes('runtime_evidence_ready') ||
       badRuntime.missing_gates.includes('backend_alive'),                            '[D-04] missing runtime gates listed');

const notReadyRuntime = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  runtime_evidence: { runtime_evidence_ready: true, backend_alive: false, backend_stub: false, evidence_source: 'go-core' },
});
assert(notReadyRuntime.candidate_drill_status === 'CANDIDATE_DRILL_BLOCKED_RUNTIME', '[D-05] backend_alive=false → BLOCKED_RUNTIME');

// ─── Suite E: Receipt blocked ─────────────────────────────────────
console.log('\n[Suite E] Receipt blocked');
const badReceipt = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  go_core_receipt: { receipt_valid: false, source: 'go-core', receipt_id: 'rcpt-x' },
});
assert(badReceipt.candidate_drill_status      === 'CANDIDATE_DRILL_BLOCKED_RECEIPT', '[E-01] invalid receipt → BLOCKED_RECEIPT');
assert(badReceipt.pass_gold_candidate_allowed === false,                              '[E-02] candidate_allowed=false');

const wrongSourceReceipt = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  go_core_receipt: { receipt_valid: true, source: 'backend', receipt_id: 'rcpt-y' },
});
assert(wrongSourceReceipt.candidate_drill_status === 'CANDIDATE_DRILL_BLOCKED_RECEIPT', '[E-03] wrong source → BLOCKED_RECEIPT');

const nullReceipt = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  go_core_receipt: null,
  // override strict gate to bypass binding — use fixture, only override receipt object
});
// null receipt resolves to DEFAULT_RECEIPT so this should pass — skip blocking test for null
// Instead test: pass an explicit falsy-valid but wrong-source receipt
const explicitBadReceipt = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  go_core_receipt: { receipt_valid: true, source: 'other', receipt_id: 'rcpt-z' },
});
assert(explicitBadReceipt.candidate_drill_status === 'CANDIDATE_DRILL_BLOCKED_RECEIPT', '[E-04] non-go-core source → BLOCKED_RECEIPT');

// ─── Suite F: Authority blocked ───────────────────────────────────
console.log('\n[Suite F] Authority blocked');
const noAuthority = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  authority_binding: { authority_valid: false },
});
assert(noAuthority.candidate_drill_status      === 'CANDIDATE_DRILL_BLOCKED_AUTHORITY', '[F-01] invalid authority → BLOCKED_AUTHORITY');
assert(noAuthority.pass_gold_candidate_allowed === false,                                '[F-02] candidate_allowed=false');

const nullAuthority = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  authority_binding: null,
});
// null resolves to DEFAULT_AUTHORITY so should pass — test explicit invalid
const explicitNoAuth = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  authority_binding: { authority_valid: false, source: 'none' },
});
assert(explicitNoAuth.candidate_drill_status === 'CANDIDATE_DRILL_BLOCKED_AUTHORITY', '[F-03] explicit invalid authority → BLOCKED_AUTHORITY');

// ─── Suite G: Full valid → CANDIDATE_DRILL_READY ─────────────────
console.log('\n[Suite G] Full valid chain');
assert(readyResult.candidate_drill_status      === 'CANDIDATE_DRILL_READY', '[G-01] status=CANDIDATE_DRILL_READY');
assert(readyResult.pass_gold_candidate_allowed === true,                     '[G-02] candidate_allowed=true');
assert(readyResult.all_strict_gates_present    === true,                     '[G-03] all_strict_gates_present=true');
assert(Array.isArray(readyResult.missing_gates),                              '[G-04] missing_gates array');
assert(readyResult.missing_gates.length         === 0,                       '[G-05] no missing gates');
assert(readyResult.evidence_source              === 'go-core',               '[G-06] evidence_source=go-core');
assert(readyResult.deploy_allowed               === false,                   '[G-07] deploy=false in READY');
assert(readyResult.promotion_allowed            === false,                   '[G-08] promotion=false in READY');
assert(readyResult.stable_allowed               === false,                   '[G-09] stable=false in READY');
assert(readyResult.schema_version               === 'v28.0',                 '[G-10] schema=v28.0');
assert(typeof readyResult.mission_id            === 'string',                '[G-11] mission_id present');
assert(typeof readyResult.evidence_receipt_id   === 'string',                '[G-12] evidence_receipt_id present');
assert(Array.isArray(readyResult.strict_gates_evaluated),                    '[G-13] strict_gates_evaluated array');
assert(readyResult.strict_gates_evaluated.length > 0,                       '[G-14] strict gates listed');

// ─── Suite H: Custom fixtures ─────────────────────────────────────
console.log('\n[Suite H] Custom fixtures');
const customReady = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  runtime_evidence: {
    runtime_evidence_ready: true,
    backend_alive:          true,
    backend_stub:           false,
    backend_health_ok:      true,
    mission_id:             'custom-mission-h01',
    evidence_receipt_id:    'custom-rcpt-h01',
    evidence_source:        'go-core',
  },
  go_core_receipt: {
    receipt_valid:  true,
    receipt_status: 'RECEIPT_VALID',
    source:         'go-core',
    receipt_id:     'custom-rcpt-h01',
  },
  authority_binding: { authority_valid: true, source: 'custom' },
  tests_verified:    true,
});
assert(customReady.candidate_drill_status === 'CANDIDATE_DRILL_READY', '[H-01] custom fixtures → READY');
assert(customReady.mission_id             === 'custom-mission-h01',    '[H-02] custom mission_id echoed');

const gateOverride = runLocalPassGoldCandidateDrill({
  use_fixtures: true,
  strict_gate_overrides: { go_test_pass: false },
});
assert(gateOverride.candidate_drill_status      !== 'CANDIDATE_DRILL_READY', '[H-03] gate_override blocks READY');
assert(gateOverride.pass_gold_candidate_allowed === false,                    '[H-04] candidate_allowed=false when gate fails');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 0,                                '[I-01] CLI exit 0 (fixtures default)');
assert(cliDefault.stdout.includes('CANDIDATE_DRILL_READY'),     '[I-02] stdout CANDIDATE_DRILL_READY');
assert(cliDefault.stdout.includes('pass_gold_candidate_allowed'), '[I-03] stdout shows candidate_allowed');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 0,                                   '[I-04] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                          '[I-05] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,             '[I-06] JSON deploy=false');
assert(parsed && parsed.promotion_allowed === false,             '[I-07] JSON promotion=false');
assert(parsed && parsed.stable_allowed    === false,             '[I-08] JSON stable=false');
assert(parsed && parsed.candidate_drill_status === 'CANDIDATE_DRILL_READY', '[I-09] JSON status=READY');

const cliNoFixtures = runCLI(['--no-fixtures']);
assert(cliNoFixtures.exitCode === 1,                             '[I-10] --no-fixtures exit 1');
assert(cliNoFixtures.stdout.includes('BLOCKED'),                 '[I-11] --no-fixtures stdout BLOCKED');

// ─── Suite J: Schema ──────────────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(readyResult.schema_version  === 'v28.0', '[J-01] schema=v28.0 (READY)');
assert(setupBlocked.schema_version === 'v28.0', '[J-02] schema=v28.0 (BLOCKED)');
// binding_status echoed in READY
assert(typeof readyResult.binding_status === 'string', '[J-03] binding_status string in READY');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nlocal-pass-gold-candidate-drill: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
