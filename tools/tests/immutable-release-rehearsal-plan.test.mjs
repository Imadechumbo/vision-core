#!/usr/bin/env node
/**
 * Immutable Release Rehearsal Plan — Unit Tests V52.0
 */

import {
  buildImmutableReleaseRehearsalPlan,
  REHEARSAL_PLAN_STATUSES,
} from '../immutable-release-rehearsal-plan.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REHEARSAL_PLAN_STATUSES),                                          '[A-01] statuses array');
assert(REHEARSAL_PLAN_STATUSES.length === 5,                                            '[A-02] 5 statuses');
assert(REHEARSAL_PLAN_STATUSES.includes('REHEARSAL_PLAN_BLOCKED_SANDBOX'),              '[A-03] BLOCKED_SANDBOX');
assert(REHEARSAL_PLAN_STATUSES.includes('REHEARSAL_PLAN_BLOCKED_SIMULATOR'),            '[A-04] BLOCKED_SIMULATOR');
assert(REHEARSAL_PLAN_STATUSES.includes('REHEARSAL_PLAN_BLOCKED_EVIDENCE'),             '[A-05] BLOCKED_EVIDENCE');
assert(REHEARSAL_PLAN_STATUSES.includes('REHEARSAL_PLAN_BLOCKED_HASH'),                 '[A-06] BLOCKED_HASH');
assert(REHEARSAL_PLAN_STATUSES.includes('REHEARSAL_PLAN_READY'),                        '[A-07] READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildImmutableReleaseRehearsalPlan({ fixture_mode: true, _mock_timestamp: TS });
assert(fix.rehearsal_plan_status         === 'REHEARSAL_PLAN_READY',                   '[B-01] status=READY');
assert(fix.rehearsal_plan_ready          === true,                                      '[B-02] ready=true');
assert(typeof fix.rehearsal_plan_id      === 'string',                                  '[B-03] plan_id string');
assert(typeof fix.plan_hash              === 'string',                                  '[B-04] plan_hash string');
assert(fix.plan_hash.length              === 48,                                        '[B-05] hash 48 chars');
assert(fix.immutable                     === true,                                      '[B-06] immutable=true');
assert(fix.rehearsal_only                === true,                                      '[B-07] rehearsal_only=true');
assert(fix.local_only                    === true,                                      '[B-08] local_only=true');
assert(fix.evidence_source               === 'go-core',                                '[B-09] source=go-core');
assert(Array.isArray(fix.simulated_commands),                                           '[B-10] simulated_commands array');
assert(fix.simulated_commands.length     === 7,                                         '[B-11] 7 commands');
assert(Array.isArray(fix.blocked_operations),                                           '[B-12] blocked_operations array');
assert(fix.blocked_operations.length     > 0,                                           '[B-13] blocked_ops non-empty');
assert(Array.isArray(fix.expected_artifacts),                                           '[B-14] expected_artifacts array');
assert(typeof fix.rollback_anchor        === 'string',                                  '[B-15] rollback_anchor string');
assert(typeof fix.release_notes_preview  === 'string',                                  '[B-16] release_notes_preview string');
assert(fix.deploy_allowed                === false,                                     '[B-17] deploy=false');
assert(fix.promotion_allowed             === false,                                     '[B-18] promotion=false');
assert(fix.stable_allowed                === false,                                     '[B-19] stable=false');
assert(fix.tag_allowed                   === false,                                     '[B-20] tag=false');
assert(fix.release_execution_allowed     === false,                                     '[B-21] exec=false');
assert(fix.release_performed             === false,                                     '[B-22] release_performed=false');
assert(fix.tag_created                   === false,                                     '[B-23] tag_created=false');
assert(fix.stable_promoted               === false,                                     '[B-24] stable_promoted=false');
assert(fix.deploy_performed              === false,                                     '[B-25] deploy_performed=false');
assert(fix.schema_version                === 'v52.0',                                   '[B-26] schema=v52.0');
assert(fix.blocking_reason               === null,                                      '[B-27] blocking_reason=null');

// ─── Suite C: Hash deterministic ─────────────────────────────────
console.log('\n[Suite C] Deterministic hash');
const fix2 = buildImmutableReleaseRehearsalPlan({ fixture_mode: true, _mock_timestamp: TS });
assert(fix.plan_hash                     === fix2.plan_hash,                            '[C-01] same inputs → same hash');
assert(fix.rehearsal_plan_id             === fix2.rehearsal_plan_id,                    '[C-02] same plan_id');
const fix3 = buildImmutableReleaseRehearsalPlan({ fixture_mode: true, _mock_timestamp: '2026-06-01T00:00:00.000Z' });
assert(fix.plan_hash                     !== fix3.plan_hash,                            '[C-03] diff timestamp → diff hash');

// ─── Suite D: Blocked — sandbox missing ──────────────────────────
console.log('\n[Suite D] Blocked — sandbox');
const noSbx = buildImmutableReleaseRehearsalPlan({ _mock_timestamp: TS });
assert(noSbx.rehearsal_plan_status       === 'REHEARSAL_PLAN_BLOCKED_SANDBOX',          '[D-01] no sandbox → BLOCKED');
assert(noSbx.rehearsal_plan_ready        === false,                                     '[D-02] ready=false');
assert(noSbx.deploy_allowed              === false,                                     '[D-03] deploy=false');

const notReadySbx = buildImmutableReleaseRehearsalPlan({
  sandbox: { sandbox_ready: false },
  _mock_timestamp: TS,
});
assert(notReadySbx.rehearsal_plan_status === 'REHEARSAL_PLAN_BLOCKED_SANDBOX',          '[D-04] not-ready sandbox blocked');

// ─── Suite E: Blocked — bad evidence ─────────────────────────────
console.log('\n[Suite E] Blocked — evidence');
const badEvidence = buildImmutableReleaseRehearsalPlan({
  sandbox: { sandbox_ready: true, evidence_source: 'backend' },
  _mock_timestamp: TS,
});
assert(badEvidence.rehearsal_plan_status === 'REHEARSAL_PLAN_BLOCKED_EVIDENCE',         '[E-01] backend source blocked');

// ─── Suite F: Blocked — simulator missing ────────────────────────
console.log('\n[Suite F] Blocked — simulator');
const noSim = buildImmutableReleaseRehearsalPlan({
  sandbox: { sandbox_ready: true, evidence_source: 'go-core', sandbox_id: 's1' },
  _mock_timestamp: TS,
});
assert(noSim.rehearsal_plan_status       === 'REHEARSAL_PLAN_BLOCKED_SIMULATOR',        '[F-01] no simulator → BLOCKED');

const notReadySim = buildImmutableReleaseRehearsalPlan({
  sandbox:   { sandbox_ready: true, evidence_source: 'go-core', sandbox_id: 's1' },
  simulator: { simulator_ready: false },
  _mock_timestamp: TS,
});
assert(notReadySim.rehearsal_plan_status === 'REHEARSAL_PLAN_BLOCKED_SIMULATOR',        '[F-02] not-ready sim blocked');

// ─── Suite G: Full plan ready ─────────────────────────────────────
console.log('\n[Suite G] Full plan');
const sbx = {
  sandbox_ready:       true,
  sandbox_id:          'sid-001',
  handoff_id:          'hid-001',
  request_id:          'rid-001',
  evidence_receipt_id: 'eid-001',
  evidence_source:     'go-core',
  target_version:      '2.0.0',
  target_branch:       'main',
  git_head:            'sha-abc',
};
const sim = {
  simulator_ready:         true,
  simulated_commands:      [{ command_type: 'git_status', simulated: true, executed: false, real_action: false }],
  blocked_commands:        ['git_tag_create', 'deploy_execute'],
  simulated_rollback_anchor: 'anchor @ sha-abc',
  simulated_release_notes: 'Release v2.0.0',
};
const plan = buildImmutableReleaseRehearsalPlan({ sandbox: sbx, simulator: sim, _mock_timestamp: TS });
assert(plan.rehearsal_plan_status        === 'REHEARSAL_PLAN_READY',                   '[G-01] status=READY');
assert(plan.rehearsal_plan_ready         === true,                                      '[G-02] ready=true');
assert(plan.sandbox_id                   === 'sid-001',                                 '[G-03] sandbox_id propagated');
assert(plan.handoff_id                   === 'hid-001',                                 '[G-04] handoff_id propagated');
assert(plan.evidence_source              === 'go-core',                                '[G-05] source=go-core');
assert(plan.immutable                    === true,                                      '[G-06] immutable=true');
assert(typeof plan.plan_hash             === 'string',                                  '[G-07] plan_hash present');
assert(plan.deploy_allowed               === false,                                     '[G-08] deploy=false');
assert(plan.tag_created                  === false,                                     '[G-09] tag_created=false');

// ─── Suite H: All simulated commands have correct flags ───────────
console.log('\n[Suite H] Simulated commands in plan');
for (const cmd of fix.simulated_commands) {
  assert(cmd.simulated   === true,  `[H] ${cmd.command_type}: simulated=true`);
  assert(cmd.executed    === false, `[H] ${cmd.command_type}: executed=false`);
  assert(cmd.real_action === false, `[H] ${cmd.command_type}: real_action=false`);
}

// ─── Suite I: Invariants ─────────────────────────────────────────
console.log('\n[Suite I] Invariants');
const all = [fix, noSbx, notReadySbx, badEvidence, noSim, plan];
for (const r of all) {
  assert(r.deploy_allowed            === false, `[I] ${r.rehearsal_plan_status}: deploy=false`);
  assert(r.release_performed         === false, `[I] ${r.rehearsal_plan_status}: release_performed=false`);
  assert(r.tag_created               === false, `[I] ${r.rehearsal_plan_status}: tag_created=false`);
  assert(r.stable_promoted           === false, `[I] ${r.rehearsal_plan_status}: stable_promoted=false`);
  assert(r.deploy_performed          === false, `[I] ${r.rehearsal_plan_status}: deploy_performed=false`);
  assert(r.immutable                 === true,  `[I] ${r.rehearsal_plan_status}: immutable=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nimmutable-release-rehearsal-plan: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
