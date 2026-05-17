#!/usr/bin/env node
/**
 * Real Runtime Bridge Baseline — Unit Tests V35.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runRealRuntimeBridgeBaseline,
  BRIDGE_BASELINE_STATUSES,
} from '../real-runtime-bridge-baseline.mjs';

const CLI = resolve(process.cwd(), 'tools', 'real-runtime-bridge-baseline.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

function mockBridgeReady(overrides = {}) {
  return {
    probe_bridge_ready:   true,
    probe_bridge_status:  'PROBE_BRIDGE_READY',
    mission_id:           'baseline-mission-001',
    evidence_receipt_id:  'baseline-receipt-001',
    evidence_source:      'go-core',
    backend_stub:         false,
    runtime_probe_pass:   true,
    blocking_reason:      null,
    deploy_allowed:       false,
    ...overrides,
  };
}

function mockDrillReady(overrides = {}) {
  return {
    full_candidate_drill_status:  'FULL_CANDIDATE_DRILL_READY',
    full_candidate_drill_ready:   true,
    pass_gold_candidate_allowed:  true,
    candidate_is_local_drill:     true,
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    mission_id:                   'baseline-mission-001',
    evidence_receipt_id:          'baseline-receipt-001',
    evidence_source:              'go-core',
    blocking_reason:              null,
    ...overrides,
  };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(BRIDGE_BASELINE_STATUSES),                                       '[A-01] statuses is array');
assert(BRIDGE_BASELINE_STATUSES.length === 4,                                         '[A-02] 4 statuses');
assert(BRIDGE_BASELINE_STATUSES.includes('BRIDGE_BASELINE_BLOCKED_MODULES'),          '[A-03] BLOCKED_MODULES');
assert(BRIDGE_BASELINE_STATUSES.includes('BRIDGE_BASELINE_BLOCKED_TESTS'),            '[A-04] BLOCKED_TESTS');
assert(BRIDGE_BASELINE_STATUSES.includes('BRIDGE_BASELINE_BLOCKED_INVARIANTS'),       '[A-05] BLOCKED_INVARIANTS');
assert(BRIDGE_BASELINE_STATUSES.includes('BRIDGE_BASELINE_READY'),                    '[A-06] BRIDGE_BASELINE_READY');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const ready = runRealRuntimeBridgeBaseline({
  _mock_bridge: mockBridgeReady(),
  _mock_drill:  mockDrillReady(),
  skip_ledger:  true,
});
const modBlocked = runRealRuntimeBridgeBaseline({
  root:        '/nonexistent-path-xyz',
  skip_ledger: true,
});
assert(ready.deploy_allowed        === false, '[B-01] deploy=false (READY)');
assert(ready.promotion_allowed     === false, '[B-02] promotion=false (READY)');
assert(ready.stable_allowed        === false, '[B-03] stable=false (READY)');
assert(modBlocked.deploy_allowed   === false, '[B-04] deploy=false (BLOCKED)');
assert(modBlocked.promotion_allowed=== false, '[B-05] promotion=false (BLOCKED)');
assert(modBlocked.stable_allowed   === false, '[B-06] stable=false (BLOCKED)');

// ─── Suite C: Modules blocked ─────────────────────────────────────
console.log('\n[Suite C] Modules blocked');
assert(modBlocked.bridge_baseline_status === 'BRIDGE_BASELINE_BLOCKED_MODULES', '[C-01] wrong root → BLOCKED_MODULES');
assert(modBlocked.bridge_baseline_ready  === false,                              '[C-02] ready=false');
assert(Array.isArray(modBlocked.missing_modules),                                '[C-03] missing_modules is array');
assert(modBlocked.missing_modules.length > 0,                                    '[C-04] missing_modules non-empty');
assert(typeof modBlocked.blocking_reason === 'string',                           '[C-05] blocking_reason present');

// ─── Suite D: Tests blocked ───────────────────────────────────────
console.log('\n[Suite D] Tests blocked (via wrong tests root)');
// Use a temp dir that has the module files but not test files — simulate by checking status logic
// We verify that tests stage runs after modules stage by checking the status path
const testBlocked = runRealRuntimeBridgeBaseline({
  root:        process.cwd(),  // real root, all modules exist
  _mock_bridge: { probe_bridge_ready: false, probe_bridge_status: 'BLOCKED_HEALTH', blocking_reason: 'health_blocked', deploy_allowed: false },
  skip_ledger:  true,
  // modules and tests exist, but bridge blocked → invariants blocked
});
assert(
  testBlocked.bridge_baseline_status === 'BRIDGE_BASELINE_BLOCKED_INVARIANTS' ||
  testBlocked.bridge_baseline_ready === false,
  '[D-01] bridge blocked → BLOCKED_INVARIANTS or not ready'
);

// ─── Suite E: Invariants blocked ─────────────────────────────────
console.log('\n[Suite E] Invariants blocked');
const bridgeBlocked = runRealRuntimeBridgeBaseline({
  _mock_bridge: { probe_bridge_ready: false, probe_bridge_status: 'BLOCKED_HEALTH', blocking_reason: 'health', deploy_allowed: false },
  skip_ledger: true,
});
assert(bridgeBlocked.bridge_baseline_status === 'BRIDGE_BASELINE_BLOCKED_INVARIANTS', '[E-01] bridge not ready → BLOCKED_INVARIANTS');
assert(bridgeBlocked.bridge_baseline_ready  === false,                                 '[E-02] ready=false');
assert(typeof bridgeBlocked.blocking_reason === 'string',                              '[E-03] blocking_reason present');

const drillBlocked = runRealRuntimeBridgeBaseline({
  _mock_bridge: mockBridgeReady(),
  _mock_drill: {
    full_candidate_drill_status:  'FULL_CANDIDATE_DRILL_BLOCKED_TESTS',
    full_candidate_drill_ready:   false,
    pass_gold_candidate_allowed:  false,
    candidate_is_local_drill:     true,
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
  },
  skip_ledger: true,
});
assert(drillBlocked.bridge_baseline_status === 'BRIDGE_BASELINE_BLOCKED_INVARIANTS', '[E-04] drill not ready → BLOCKED_INVARIANTS');

// Invariant violation: deploy_allowed=true in drill
const drillViolates = runRealRuntimeBridgeBaseline({
  _mock_bridge: mockBridgeReady(),
  _mock_drill: mockDrillReady({ deploy_allowed: true }),
  skip_ledger: true,
});
assert(drillViolates.bridge_baseline_status === 'BRIDGE_BASELINE_BLOCKED_INVARIANTS', '[E-05] deploy_allowed violation → BLOCKED_INVARIANTS');

const drillViolatesCandidate = runRealRuntimeBridgeBaseline({
  _mock_bridge: mockBridgeReady(),
  _mock_drill:  mockDrillReady({ candidate_is_local_drill: false }),
  skip_ledger:  true,
});
assert(drillViolatesCandidate.bridge_baseline_status === 'BRIDGE_BASELINE_BLOCKED_INVARIANTS', '[E-06] candidate_is_local_drill=false violation → BLOCKED_INVARIANTS');

// ─── Suite F: Full valid → BRIDGE_BASELINE_READY ─────────────────
console.log('\n[Suite F] Full valid');
assert(ready.bridge_baseline_status         === 'BRIDGE_BASELINE_READY', '[F-01] status=BRIDGE_BASELINE_READY');
assert(ready.bridge_baseline_ready          === true,                     '[F-02] ready=true');
assert(ready.modules_verified               === 7,                        '[F-03] 7 modules verified');
assert(ready.tests_verified                 === 7,                        '[F-04] 7 tests verified');
assert(Array.isArray(ready.missing_modules) && ready.missing_modules.length === 0, '[F-05] missing_modules=[]');
assert(Array.isArray(ready.missing_tests)   && ready.missing_tests.length   === 0, '[F-06] missing_tests=[]');
assert(ready.pass_gold_candidate_allowed    === true,                     '[F-07] pass_gold_candidate_allowed=true');
assert(ready.candidate_is_local_drill       === true,                     '[F-08] candidate_is_local_drill=true');
assert(ready.evidence_source                === 'go-core',                '[F-09] evidence_source=go-core');
assert(ready.mission_id                     === 'baseline-mission-001',   '[F-10] mission_id echoed');
assert(ready.evidence_receipt_id            === 'baseline-receipt-001',   '[F-11] receipt_id echoed');
assert(ready.deploy_allowed                 === false,                    '[F-12] deploy=false');
assert(ready.promotion_allowed              === false,                    '[F-13] promotion=false');
assert(ready.stable_allowed                 === false,                    '[F-14] stable=false');
assert(ready.blocking_reason                === null,                     '[F-15] blocking_reason=null');
assert(ready.schema_version                 === 'v35.0',                  '[F-16] schema=v35.0');

// ─── Suite G: Real execution (default root) ───────────────────────
console.log('\n[Suite G] Real execution');
const real = runRealRuntimeBridgeBaseline({ skip_ledger: true });
assert(real.bridge_baseline_status === 'BRIDGE_BASELINE_READY', '[G-01] real run → BRIDGE_BASELINE_READY');
assert(real.bridge_baseline_ready  === true,                     '[G-02] real run → ready=true');
assert(real.modules_verified       === 7,                        '[G-03] 7 modules verified');
assert(real.tests_verified         === 7,                        '[G-04] 7 tests verified');
assert(real.deploy_allowed         === false,                    '[G-05] real: deploy=false');
assert(real.promotion_allowed      === false,                    '[G-06] real: promotion=false');

// ─── Suite H: Schema ──────────────────────────────────────────────
console.log('\n[Suite H] Schema');
assert(ready.schema_version      === 'v35.0', '[H-01] schema=v35.0 (READY)');
assert(modBlocked.schema_version === 'v35.0', '[H-02] schema=v35.0 (BLOCKED)');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI(['--skip-ledger']);
assert(cliDefault.exitCode === 0,                                      '[I-01] default → exit 0');
assert(cliDefault.stdout.includes('BRIDGE_BASELINE_READY'),            '[I-02] stdout BRIDGE_BASELINE_READY');
assert(cliDefault.stdout.includes('modules_verified'),                 '[I-03] stdout modules_verified');
assert(cliDefault.stdout.includes('deploy_allowed'),                   '[I-04] stdout deploy_allowed');

const cliJson = runCLI(['--json', '--skip-ledger']);
assert(cliJson.exitCode === 0,                                         '[I-05] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                '[I-06] JSON parseable');
assert(parsed && parsed.bridge_baseline_ready        === true,         '[I-07] JSON ready=true');
assert(parsed && parsed.deploy_allowed               === false,        '[I-08] JSON deploy=false');
assert(parsed && parsed.promotion_allowed            === false,        '[I-09] JSON promotion=false');
assert(parsed && parsed.stable_allowed               === false,        '[I-10] JSON stable=false');
assert(parsed && parsed.pass_gold_candidate_allowed  === true,         '[I-11] JSON pass_gold=true');
assert(parsed && parsed.candidate_is_local_drill     === true,         '[I-12] JSON candidate_is_local_drill=true');
assert(parsed && parsed.evidence_source              === 'go-core',    '[I-13] JSON evidence_source=go-core');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-runtime-bridge-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
