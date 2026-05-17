#!/usr/bin/env node
/**
 * Real Release Readiness Decision Matrix — Unit Tests V56.2
 */

import {
  evaluateRealReleaseReadiness,
  classifyRealReleaseReadiness,
  renderRealReleaseReadinessDecision,
  REAL_READINESS_STATUSES,
  REAL_READINESS_BLOCKED_ACTIONS,
  REAL_READINESS_SAFE_NEXT_ACTIONS,
} from '../real-release-readiness-decision-matrix.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const MOCK_GATE = { gate_ready: true, gate_status: 'REAL_GATE_READY_LOCKED', gate_id: 'gate-abc', production_execution_locked: true };
const MOCK_LOCK = { lock_active: true, lock_status: 'PRODUCTION_LOCK_ACTIVE', lock_id: 'lock-abc', production_execution_locked: true };
const MOCK_SB_BASELINE = { baseline_ready: true };
const MOCK_ME_BASELINE = { manual_execution_baseline_ready: true };
const MOCK_SUP_BASELINE = { control_plane_baseline_ready: true };
const MOCK_RT_BASELINE  = { baseline_ready: true };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REAL_READINESS_STATUSES),                                          '[A-01] REAL_READINESS_STATUSES array');
assert(REAL_READINESS_STATUSES.length === 5,                                            '[A-02] 5 statuses');
assert(REAL_READINESS_STATUSES.includes('REAL_READINESS_BLOCKED_GATE'),               '[A-03] BLOCKED_GATE');
assert(REAL_READINESS_STATUSES.includes('REAL_READINESS_BLOCKED_LOCK'),               '[A-04] BLOCKED_LOCK');
assert(REAL_READINESS_STATUSES.includes('REAL_READINESS_BLOCKED_BASELINE'),           '[A-05] BLOCKED_BASELINE');
assert(REAL_READINESS_STATUSES.includes('REAL_READINESS_READY_LOCKED'),               '[A-06] READY_LOCKED');
assert(REAL_READINESS_STATUSES.includes('REAL_READINESS_NEEDS_UNLOCK'),               '[A-07] NEEDS_UNLOCK');

assert(Array.isArray(REAL_READINESS_BLOCKED_ACTIONS),                                   '[A-08] BLOCKED_ACTIONS array');
assert(REAL_READINESS_BLOCKED_ACTIONS.length === 8,                                     '[A-09] 8 blocked actions');
assert(REAL_READINESS_BLOCKED_ACTIONS.includes('auto_release'),                         '[A-10] auto_release');
assert(REAL_READINESS_BLOCKED_ACTIONS.includes('git_push'),                             '[A-11] git_push');

assert(Array.isArray(REAL_READINESS_SAFE_NEXT_ACTIONS),                                 '[A-12] SAFE_NEXT_ACTIONS array');
assert(REAL_READINESS_SAFE_NEXT_ACTIONS.length === 5,                                   '[A-13] 5 safe next actions');
assert(REAL_READINESS_SAFE_NEXT_ACTIONS.includes('prepare_future_unlock_contract'),    '[A-14] prepare_future_unlock_contract');
assert(REAL_READINESS_SAFE_NEXT_ACTIONS.includes('do_not_execute_production_in_this_phase'), '[A-15] do_not_execute');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = evaluateRealReleaseReadiness({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                                 '[B-01] returns object');
assert(fixture.real_release_readiness_status === 'REAL_READINESS_READY_LOCKED',       '[B-02] status=READY_LOCKED');
assert(fixture.real_release_readiness_ready  === true,                                  '[B-03] ready=true');
assert(fixture.schema_version                === 'v56.2',                              '[B-04] schema_version=v56.2');
assert(typeof fixture.matrix_id             === 'string',                              '[B-05] matrix_id string');
assert(fixture.production_execution_locked   === true,                                  '[B-06] locked=true');
assert(fixture.unlock_required               === true,                                  '[B-07] unlock_required=true');
assert(fixture.release_execution_allowed     === false,                                 '[B-08] exec_allowed=false');
assert(fixture.deploy_allowed                === false,                                 '[B-09] deploy_allowed=false');
assert(Array.isArray(fixture.blocked_actions),                                          '[B-10] blocked_actions array');
assert(fixture.blocked_actions.length        === 8,                                     '[B-11] 8 blocked actions');
assert(Array.isArray(fixture.safe_next_actions),                                        '[B-12] safe_next_actions array');
assert(fixture.blocking_reason               === null,                                  '[B-13] blocking_reason=null');
assert(fixture.readiness_matrix.gate_ready   === true,                                  '[B-14] matrix.gate_ready=true');
assert(fixture.readiness_matrix.lock_active  === true,                                  '[B-15] matrix.lock_active=true');

// ─── Suite C: Blocked — missing gate ──────────────────────────────
console.log('\n[Suite C] Blocked cases');
const noGate = evaluateRealReleaseReadiness({ production_execution_lock: MOCK_LOCK, _mock_timestamp: TS });
assert(noGate.real_release_readiness_status === 'REAL_READINESS_BLOCKED_GATE',        '[C-01] no gate → BLOCKED_GATE');
assert(noGate.real_release_readiness_ready  === false,                                  '[C-02] ready=false');
assert(noGate.missing_requirements.includes('real_manual_release_gate'),               '[C-03] missing_requirements includes gate');

const notReadyGate = evaluateRealReleaseReadiness({ real_manual_release_gate: { gate_ready: false }, production_execution_lock: MOCK_LOCK, _mock_timestamp: TS });
assert(notReadyGate.real_release_readiness_status === 'REAL_READINESS_BLOCKED_GATE',  '[C-04] not-ready gate → BLOCKED_GATE');

const noLock = evaluateRealReleaseReadiness({ real_manual_release_gate: MOCK_GATE, _mock_timestamp: TS });
assert(noLock.real_release_readiness_status === 'REAL_READINESS_BLOCKED_LOCK',        '[C-05] no lock → BLOCKED_LOCK');
assert(noLock.missing_requirements.includes('production_execution_lock'),              '[C-06] missing_requirements includes lock');

const notActiveLock = evaluateRealReleaseReadiness({ real_manual_release_gate: MOCK_GATE, production_execution_lock: { lock_active: false }, _mock_timestamp: TS });
assert(notActiveLock.real_release_readiness_status === 'REAL_READINESS_BLOCKED_LOCK', '[C-07] inactive lock → BLOCKED_LOCK');

const noBaselines = evaluateRealReleaseReadiness({ real_manual_release_gate: MOCK_GATE, production_execution_lock: MOCK_LOCK, _mock_timestamp: TS });
assert(noBaselines.real_release_readiness_status === 'REAL_READINESS_BLOCKED_BASELINE', '[C-08] no baselines → BLOCKED_BASELINE');
assert(noBaselines.missing_requirements.length > 0,                                    '[C-09] missing_requirements not empty');

// ─── Suite D: Full READY_LOCKED ───────────────────────────────────
console.log('\n[Suite D] Full READY_LOCKED');
const full = evaluateRealReleaseReadiness({
  real_manual_release_gate:          MOCK_GATE,
  production_execution_lock:         MOCK_LOCK,
  sandbox_baseline:                  MOCK_SB_BASELINE,
  manual_execution_baseline:         MOCK_ME_BASELINE,
  supervised_control_plane_baseline: MOCK_SUP_BASELINE,
  runtime_execution_baseline:        MOCK_RT_BASELINE,
  _mock_timestamp:                   TS,
});
assert(full.real_release_readiness_status  === 'REAL_READINESS_READY_LOCKED',         '[D-01] status=READY_LOCKED');
assert(full.real_release_readiness_ready   === true,                                    '[D-02] ready=true');
assert(full.production_execution_locked    === true,                                    '[D-03] locked=true');
assert(full.unlock_required                === true,                                    '[D-04] unlock_required=true');
assert(full.release_execution_allowed      === false,                                   '[D-05] exec_allowed=false');
assert(full.missing_requirements.length    === 0,                                       '[D-06] no missing');
assert(full.blocking_reason                === null,                                    '[D-07] blocking_reason=null');
assert(full.readiness_matrix.sandbox_baseline_ready === true,                           '[D-08] sandbox_baseline_ready=true');
assert(full.readiness_matrix.lock_active   === true,                                    '[D-09] lock_active=true');

// ─── Suite E: classifyRealReleaseReadiness (alias) ─────────────────
console.log('\n[Suite E] classifyRealReleaseReadiness alias');
const classified = classifyRealReleaseReadiness({ fixture_mode: true, _mock_timestamp: TS });
assert(classified.real_release_readiness_status === 'REAL_READINESS_READY_LOCKED',    '[E-01] classify alias works');

// ─── Suite F: Blocked actions present ────────────────────────────
console.log('\n[Suite F] Blocked actions');
assert(full.blocked_actions.includes('auto_release'),                                   '[F-01] auto_release blocked');
assert(full.blocked_actions.includes('auto_tag'),                                       '[F-02] auto_tag blocked');
assert(full.blocked_actions.includes('auto_stable_promotion'),                          '[F-03] auto_stable_promotion blocked');
assert(full.blocked_actions.includes('auto_deploy'),                                    '[F-04] auto_deploy blocked');
assert(full.blocked_actions.includes('git_push'),                                       '[F-05] git_push blocked');
assert(full.blocked_actions.includes('production_write'),                               '[F-06] production_write blocked');
assert(full.blocked_actions.includes('evidence_override'),                              '[F-07] evidence_override blocked');
assert(full.blocked_actions.includes('go_core_override'),                               '[F-08] go_core_override blocked');

// ─── Suite G: Safe next actions ──────────────────────────────────
console.log('\n[Suite G] Safe next actions');
assert(full.safe_next_actions.includes('prepare_future_unlock_contract'),              '[G-01] prepare_future_unlock_contract');
assert(full.safe_next_actions.includes('do_not_execute_production_in_this_phase'),     '[G-02] do_not_execute_production');
assert(full.safe_next_actions.includes('verify_production_lock_active'),               '[G-03] verify_production_lock_active');

// ─── Suite H: renderRealReleaseReadinessDecision ──────────────────
console.log('\n[Suite H] renderRealReleaseReadinessDecision');
const rendered = renderRealReleaseReadinessDecision(full);
assert(typeof rendered                          === 'string',                           '[H-01] returns string');
assert(rendered.includes('REAL_READINESS_READY_LOCKED'),                               '[H-02] contains status');
assert(rendered.includes('production_execution_locked   : true'),                      '[H-03] locked in output');
assert(rendered.includes('release_execution_allowed     : false'),                     '[H-04] exec_allowed in output');
assert(renderRealReleaseReadinessDecision(null) === 'readiness: null',                 '[H-05] null → "readiness: null"');

// ─── Suite I: Invariants ─────────────────────────────────────────
console.log('\n[Suite I] Invariants');
const cases = [fixture, noGate, noLock, noBaselines, full];
for (const [i, o] of cases.entries()) {
  assert(o.deploy_allowed            === false, `[I] case ${i}: deploy_allowed=false`);
  assert(o.promotion_allowed         === false, `[I] case ${i}: promotion_allowed=false`);
  assert(o.stable_allowed            === false, `[I] case ${i}: stable_allowed=false`);
  assert(o.tag_allowed               === false, `[I] case ${i}: tag_allowed=false`);
  assert(o.release_execution_allowed === false, `[I] case ${i}: exec_allowed=false`);
  assert(o.release_performed         === false, `[I] case ${i}: release_performed=false`);
  assert(o.tag_created               === false, `[I] case ${i}: tag_created=false`);
  assert(o.stable_promoted           === false, `[I] case ${i}: stable_promoted=false`);
  assert(o.deploy_performed          === false, `[I] case ${i}: deploy_performed=false`);
  assert(o.production_execution_locked === true, `[I] case ${i}: production_execution_locked=true`);
  assert(o.unlock_required           === true,  `[I] case ${i}: unlock_required=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-release-readiness-decision-matrix: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
