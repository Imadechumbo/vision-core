#!/usr/bin/env node
/**
 * Release Rehearsal Executor — Unit Tests V52.1
 */

import {
  runReleaseRehearsal,
  validateReleaseRehearsalResult,
  renderReleaseRehearsalSummary,
  REHEARSAL_STATUSES,
} from '../release-rehearsal-executor.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REHEARSAL_STATUSES),                                      '[A-01] statuses array');
assert(REHEARSAL_STATUSES.length === 5,                                        '[A-02] 5 statuses');
assert(REHEARSAL_STATUSES.includes('REHEARSAL_BLOCKED_PLAN'),                  '[A-03] BLOCKED_PLAN');
assert(REHEARSAL_STATUSES.includes('REHEARSAL_BLOCKED_HASH'),                  '[A-04] BLOCKED_HASH');
assert(REHEARSAL_STATUSES.includes('REHEARSAL_BLOCKED_EVIDENCE'),              '[A-05] BLOCKED_EVIDENCE');
assert(REHEARSAL_STATUSES.includes('REHEARSAL_BLOCKED_OPERATION'),             '[A-06] BLOCKED_OPERATION');
assert(REHEARSAL_STATUSES.includes('REHEARSAL_READY'),                         '[A-07] READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = runReleaseRehearsal({ fixture_mode: true, _mock_timestamp: TS });
assert(fix.rehearsal_status              === 'REHEARSAL_READY',                '[B-01] status=READY');
assert(fix.rehearsal_ready               === true,                             '[B-02] ready=true');
assert(typeof fix.rehearsal_report_id    === 'string',                         '[B-03] report_id string');
assert(Array.isArray(fix.replayed_commands),                                   '[B-04] replayed_commands array');
assert(fix.replayed_commands.length      === 7,                                '[B-05] 7 replayed commands');
assert(Array.isArray(fix.blocked_operations_verified),                         '[B-06] blocked_ops_verified array');
assert(fix.plan_hash_valid               === true,                             '[B-07] plan_hash_valid=true');
assert(fix.evidence_verified             === true,                             '[B-08] evidence_verified=true');
assert(fix.evidence_source               === 'go-core',                       '[B-09] source=go-core');
assert(fix.deploy_allowed                === false,                            '[B-10] deploy=false');
assert(fix.promotion_allowed             === false,                            '[B-11] promotion=false');
assert(fix.stable_allowed                === false,                            '[B-12] stable=false');
assert(fix.tag_allowed                   === false,                            '[B-13] tag=false');
assert(fix.release_execution_allowed     === false,                            '[B-14] exec=false');
assert(fix.release_performed             === false,                            '[B-15] release_performed=false');
assert(fix.tag_created                   === false,                            '[B-16] tag_created=false');
assert(fix.stable_promoted               === false,                            '[B-17] stable_promoted=false');
assert(fix.deploy_performed              === false,                            '[B-18] deploy_performed=false');
assert(fix.schema_version                === 'v52.1',                          '[B-19] schema=v52.1');
assert(fix.blocking_reason               === null,                             '[B-20] blocking_reason=null');

// ─── Suite C: Replayed commands have correct flags ────────────────
console.log('\n[Suite C] Replayed commands structure');
for (const cmd of fix.replayed_commands) {
  assert(cmd.replayed    === true,      `[C] ${cmd.command_type}: replayed=true`);
  assert(cmd.real_action === false,     `[C] ${cmd.command_type}: real_action=false`);
  assert(cmd.status      === 'SIMULATED', `[C] ${cmd.command_type}: status=SIMULATED`);
}

// ─── Suite D: Blocked — missing plan ─────────────────────────────
console.log('\n[Suite D] Blocked — missing plan');
const noPlan = runReleaseRehearsal({ _mock_timestamp: TS });
assert(noPlan.rehearsal_status           === 'REHEARSAL_BLOCKED_PLAN',         '[D-01] no plan → BLOCKED');
assert(noPlan.rehearsal_ready            === false,                            '[D-02] ready=false');
assert(noPlan.deploy_allowed             === false,                            '[D-03] deploy=false');

const notReadyPlan = runReleaseRehearsal({ rehearsal_plan: { rehearsal_plan_ready: false } });
assert(notReadyPlan.rehearsal_status     === 'REHEARSAL_BLOCKED_PLAN',         '[D-04] not-ready plan blocked');

// ─── Suite E: Blocked — missing hash ─────────────────────────────
console.log('\n[Suite E] Blocked — hash');
const noHash = runReleaseRehearsal({
  rehearsal_plan: { rehearsal_plan_ready: true, rehearsal_plan_id: 'p1', evidence_source: 'go-core' },
  _mock_timestamp: TS,
});
assert(noHash.rehearsal_status           === 'REHEARSAL_BLOCKED_HASH',         '[E-01] no hash → BLOCKED');

// ─── Suite F: Blocked — bad evidence ─────────────────────────────
console.log('\n[Suite F] Blocked — evidence');
const badEv = runReleaseRehearsal({
  rehearsal_plan: {
    rehearsal_plan_ready: true,
    plan_hash: 'abc'.repeat(16),
    evidence_source: 'backend',
    simulated_commands: [],
  },
  _mock_timestamp: TS,
});
assert(badEv.rehearsal_status            === 'REHEARSAL_BLOCKED_EVIDENCE',     '[F-01] backend source blocked');

// ─── Suite G: Blocked — real_action=true in commands ─────────────
console.log('\n[Suite G] Blocked — real action in commands');
const realAction = runReleaseRehearsal({
  rehearsal_plan: {
    rehearsal_plan_ready: true,
    plan_hash: 'abc'.repeat(16),
    evidence_source: 'go-core',
    simulated_commands: [{ command_type: 'git_tag_create', real_action: true }],
    rehearsal_plan_id: 'p1',
  },
  _mock_timestamp: TS,
});
assert(realAction.rehearsal_status       === 'REHEARSAL_BLOCKED_OPERATION',    '[G-01] real action blocked');
assert(realAction.deploy_allowed         === false,                            '[G-02] deploy=false');

// ─── Suite H: Full rehearsal ready ───────────────────────────────
console.log('\n[Suite H] Full rehearsal');
const plan = {
  rehearsal_plan_ready: true,
  rehearsal_plan_id:    'plan-001',
  plan_hash:            'a'.repeat(48),
  sandbox_id:           'sid-001',
  evidence_source:      'go-core',
  simulated_commands: [
    { command_type: 'git_status',        simulated: true, executed: false, real_action: false },
    { command_type: 'git_tag_annotated', simulated: true, executed: false, real_action: false },
  ],
};
const rehearsal = runReleaseRehearsal({ rehearsal_plan: plan, _mock_timestamp: TS });
assert(rehearsal.rehearsal_status        === 'REHEARSAL_READY',                '[H-01] status=READY');
assert(rehearsal.rehearsal_ready         === true,                             '[H-02] ready=true');
assert(rehearsal.replayed_commands.length === 2,                               '[H-03] 2 replayed');
assert(rehearsal.plan_hash_valid         === true,                             '[H-04] hash_valid=true');
assert(rehearsal.rehearsal_plan_id       === 'plan-001',                       '[H-05] plan_id propagated');
assert(rehearsal.sandbox_id              === 'sid-001',                        '[H-06] sandbox_id propagated');
assert(rehearsal.deploy_allowed          === false,                            '[H-07] deploy=false');
assert(rehearsal.tag_created             === false,                            '[H-08] tag_created=false');

// ─── Suite I: Validate ────────────────────────────────────────────
console.log('\n[Suite I] Validate');
const valNull = validateReleaseRehearsalResult(null);
assert(valNull.rehearsal_ready           === false,                            '[I-01] null → not ready');
const valGood = validateReleaseRehearsalResult(fix);
assert(valGood.rehearsal_ready           === true,                             '[I-02] valid → ready');
assert(valGood.deploy_allowed            === false,                            '[I-03] deploy=false');

// ─── Suite J: Render ──────────────────────────────────────────────
console.log('\n[Suite J] Render');
const summary = renderReleaseRehearsalSummary(fix);
assert(typeof summary                    === 'string',                         '[J-01] string');
assert(summary.includes('REHEARSAL_READY'),                                    '[J-02] has status');
assert(renderReleaseRehearsalSummary(null) === 'rehearsal: null',              '[J-03] null');

// ─── Suite K: Invariants ─────────────────────────────────────────
console.log('\n[Suite K] Invariants');
const all = [fix, noPlan, notReadyPlan, noHash, badEv, rehearsal, valNull, valGood];
for (const r of all) {
  assert(r.deploy_allowed            === false, `[K] ${r.rehearsal_status}: deploy=false`);
  assert(r.release_performed         === false, `[K] ${r.rehearsal_status}: release_performed=false`);
  assert(r.tag_created               === false, `[K] ${r.rehearsal_status}: tag_created=false`);
  assert(r.stable_promoted           === false, `[K] ${r.rehearsal_status}: stable_promoted=false`);
  assert(r.deploy_performed          === false, `[K] ${r.rehearsal_status}: deploy_performed=false`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nrelease-rehearsal-executor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
