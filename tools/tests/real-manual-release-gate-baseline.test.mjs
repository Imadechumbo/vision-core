#!/usr/bin/env node
/**
 * Real Manual Release Gate Baseline — Unit Tests V60.0
 */

import {
  runRealManualReleaseGateBaseline,
  renderRealManualReleaseGateBaseline,
  REAL_GATE_BASELINE_STATUSES,
} from '../real-manual-release-gate-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REAL_GATE_BASELINE_STATUSES),                                  '[A-01] statuses array');
assert(REAL_GATE_BASELINE_STATUSES.length === 6,                                    '[A-02] 6 statuses');
assert(REAL_GATE_BASELINE_STATUSES.includes('REAL_GATE_BASELINE_BLOCKED_MODULES'),  '[A-03] BLOCKED_MODULES');
assert(REAL_GATE_BASELINE_STATUSES.includes('REAL_GATE_BASELINE_BLOCKED_CONSTANTS'), '[A-04] BLOCKED_CONSTANTS');
assert(REAL_GATE_BASELINE_STATUSES.includes('REAL_GATE_BASELINE_BLOCKED_TESTS'),    '[A-05] BLOCKED_TESTS');
assert(REAL_GATE_BASELINE_STATUSES.includes('REAL_GATE_BASELINE_BLOCKED_INVARIANTS'), '[A-06] BLOCKED_INVARIANTS');
assert(REAL_GATE_BASELINE_STATUSES.includes('REAL_GATE_BASELINE_BLOCKED_LEDGER'),   '[A-07] BLOCKED_LEDGER');
assert(REAL_GATE_BASELINE_STATUSES.includes('REAL_GATE_BASELINE_READY'),            '[A-08] READY');

// ─── Suite B: Baseline ready ──────────────────────────────────────
console.log('\n[Suite B] Baseline ready');
const result = runRealManualReleaseGateBaseline({ _mock_timestamp: TS });
assert(result !== null && typeof result === 'object',                               '[B-01] returns object');
assert(result.baseline_status            === 'REAL_GATE_BASELINE_READY',           '[B-02] status=READY');
assert(result.baseline_ready             === true,                                  '[B-03] baseline_ready=true');
assert(result.schema_version             === 'v60.0',                             '[B-04] schema=v60.0');
assert(result.baseline_version           === 'v60.0',                             '[B-05] baseline_version=v60.0');
assert(Array.isArray(result.modules_verified) && result.modules_verified.length === 6, '[B-06] 6 modules verified');
assert(result.ledger_smoke_passed        === true,                                  '[B-07] ledger_smoke_passed=true');
assert(typeof result.baseline_hash       === 'string' && result.baseline_hash.length === 48, '[B-08] hash 48 chars');
assert(result.blocking_reason            === null,                                  '[B-09] blocking_reason=null');
assert(result.production_execution_locked === true,                                 '[B-10] locked=true');
assert(result.unlock_required            === true,                                  '[B-11] unlock_required=true');
assert(result.immutable                  === true,                                  '[B-12] immutable=true');
assert(result.human_review_required      === true,                                  '[B-13] human_review=true');

// ─── Suite C: Fixture smoke results ──────────────────────────────
console.log('\n[Suite C] Fixture smoke results');
const smoke = result.fixture_smoke_results;
assert(smoke !== null && typeof smoke === 'object',                                 '[C-01] smoke_results object');
assert(smoke.real_manual_release_gate    === 'REAL_GATE_READY_LOCKED',             '[C-02] gate=READY_LOCKED');
assert(smoke.production_execution_lock   === 'PRODUCTION_LOCK_ACTIVE',             '[C-03] lock=ACTIVE');
assert(smoke.real_release_readiness      === 'REAL_READINESS_READY_LOCKED',        '[C-04] readiness=READY_LOCKED');
assert(smoke.evidence_finalizer          === 'FINALIZER_READY_LOCKED',             '[C-05] finalizer=READY_LOCKED');
assert(smoke.real_locked_report          === 'LOCKED_REPORT_READY',                '[C-06] report=LOCKED_REPORT_READY');

// ─── Suite D: Invariants on baseline output ───────────────────────
console.log('\n[Suite D] Invariants');
assert(result.deploy_allowed             === false,                                 '[D-01] deploy_allowed=false');
assert(result.promotion_allowed          === false,                                 '[D-02] promotion_allowed=false');
assert(result.stable_allowed             === false,                                 '[D-03] stable_allowed=false');
assert(result.tag_allowed                === false,                                 '[D-04] tag_allowed=false');
assert(result.release_execution_allowed  === false,                                 '[D-05] exec_allowed=false');
assert(result.release_performed          === false,                                 '[D-06] release_performed=false');
assert(result.tag_created                === false,                                 '[D-07] tag_created=false');
assert(result.stable_promoted            === false,                                 '[D-08] stable_promoted=false');
assert(result.deploy_performed           === false,                                 '[D-09] deploy_performed=false');
assert(result.invariant_violations.length === 0,                                    '[D-10] 0 invariant_violations');

// ─── Suite E: Deterministic hash ──────────────────────────────────
console.log('\n[Suite E] Deterministic hash');
const a = runRealManualReleaseGateBaseline({ _mock_timestamp: TS });
const b = runRealManualReleaseGateBaseline({ _mock_timestamp: TS });
assert(a.baseline_hash === b.baseline_hash,                                         '[E-01] same inputs → same hash');

const c = runRealManualReleaseGateBaseline({ _mock_timestamp: '2026-05-18T00:00:00.000Z' });
assert(a.baseline_hash !== c.baseline_hash,                                         '[E-02] diff timestamp → diff hash');

// ─── Suite F: Multi-run stability ─────────────────────────────────
console.log('\n[Suite F] Multi-run stability');
for (let i = 0; i < 3; i++) {
  const r = runRealManualReleaseGateBaseline({ _mock_timestamp: TS });
  assert(r.baseline_ready               === true,  `[F] run ${i+1}: baseline_ready=true`);
  assert(r.production_execution_locked  === true,  `[F] run ${i+1}: locked=true`);
  assert(r.baseline_status              === 'REAL_GATE_BASELINE_READY', `[F] run ${i+1}: READY`);
}

// ─── Suite G: renderRealManualReleaseGateBaseline ─────────────────
console.log('\n[Suite G] renderRealManualReleaseGateBaseline');
const rendered = renderRealManualReleaseGateBaseline(result);
assert(typeof rendered                  === 'string',                               '[G-01] returns string');
assert(rendered.includes('REAL_GATE_BASELINE_READY'),                              '[G-02] contains status');
assert(rendered.includes('production_execution_locked  : true'),                   '[G-03] lock in output');
assert(rendered.includes('immutable                    : true'),                    '[G-04] immutable in output');
assert(renderRealManualReleaseGateBaseline(null) === 'baseline: null',             '[G-05] null → "baseline: null"');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-manual-release-gate-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
