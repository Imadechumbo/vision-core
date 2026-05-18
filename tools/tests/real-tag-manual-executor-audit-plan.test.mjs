#!/usr/bin/env node
/**
 * Real Tag Manual Executor Audit Plan — Unit Tests V84.1
 */

import {
  buildRealTagManualExecutorAuditPlan,
  validateRealTagManualExecutorAuditPlan,
  renderRealTagManualExecutorAuditPlan,
  AUDIT_PLAN_STATUSES,
} from '../real-tag-manual-executor-audit-plan.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T20:30:00.000Z';

const READY_GUARD = {
  armed_guard_ready: true,
  target_tag: 'v3.0.0',
  requested_by: 'release-manager',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(AUDIT_PLAN_STATUSES),                                           '[A-01] statuses array');
assert(AUDIT_PLAN_STATUSES.length === 2,                                             '[A-02] 2 statuses');
assert(AUDIT_PLAN_STATUSES.includes('AUDIT_PLAN_BLOCKED_GUARD'),                    '[A-03] BLOCKED_GUARD');
assert(AUDIT_PLAN_STATUSES.includes('AUDIT_PLAN_READY'),                            '[A-04] READY');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagManualExecutorAuditPlan({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                      '[B-01] returns object');
assert(fix.schema_version    === 'v84.1',                                            '[B-02] schema=v84.1');
assert(fix.audit_plan_status === 'AUDIT_PLAN_READY',                                '[B-03] READY');
assert(fix.audit_plan_ready  === true,                                               '[B-04] ready=true');
assert(typeof fix.plan_id === 'string' && fix.plan_id.length === 24,               '[B-05] id 24 chars');
assert(fix.blocking_reason   === null,                                               '[B-06] blocking=null');
assert(fix.audit_log_required === true,                                              '[B-07] audit_log_required=true');
assert(fix.real_execution_not_performed === true,                                    '[B-08] not_performed=true');
assert(fix.tag_created       === false,                                              '[B-09] tag_created=false');
assert(Array.isArray(fix.pre_execution_checks) && fix.pre_execution_checks.length > 0, '[B-10] pre_checks array');
assert(Array.isArray(fix.post_execution_checks) && fix.post_execution_checks.length > 0, '[B-11] post_checks array');
assert(Array.isArray(fix.rollback_checks) && fix.rollback_checks.length > 0,        '[B-12] rollback_checks array');
assert(fix.created_at        === TS,                                                 '[B-13] created_at=TS');

// ─── Suite C: Blocked Guard ───────────────────────────────────────
console.log('\n[Suite C] Blocked Guard');
const blockedC1 = buildRealTagManualExecutorAuditPlan({ _mock_timestamp: TS });
assert(blockedC1.audit_plan_status === 'AUDIT_PLAN_BLOCKED_GUARD',                  '[C-01] no guard blocked');
assert(blockedC1.audit_plan_ready  === false,                                        '[C-02] not ready');
assert(blockedC1.blocking_reason   === 'armed_guard_not_ready',                     '[C-03] reason');
assert(blockedC1.pre_execution_checks.length  === 0,                                '[C-04] no pre checks when blocked');
assert(blockedC1.post_execution_checks.length === 0,                                '[C-05] no post checks when blocked');
assert(blockedC1.rollback_checks.length       === 0,                                '[C-06] no rollback when blocked');

const blockedC2 = buildRealTagManualExecutorAuditPlan({
  armed_guard: { armed_guard_ready: false }, _mock_timestamp: TS,
});
assert(blockedC2.audit_plan_status === 'AUDIT_PLAN_BLOCKED_GUARD',                  '[C-07] false guard blocked');

// ─── Suite D: Valid ───────────────────────────────────────────────
console.log('\n[Suite D] Valid');
const valid = buildRealTagManualExecutorAuditPlan({
  armed_guard: READY_GUARD,
  requested_by: 'release-manager',
  _mock_timestamp: TS,
});
assert(valid.audit_plan_status  === 'AUDIT_PLAN_READY',                             '[D-01] status READY');
assert(valid.audit_plan_ready   === true,                                            '[D-02] ready=true');
assert(valid.blocking_reason    === null,                                            '[D-03] blocking=null');
assert(valid.target_tag         === READY_GUARD.target_tag,                         '[D-04] target_tag from guard');
assert(valid.requested_by       === 'release-manager',                              '[D-05] requested_by');
assert(Array.isArray(valid.pre_execution_checks) && valid.pre_execution_checks.length > 0, '[D-06] pre_checks populated');
assert(Array.isArray(valid.post_execution_checks) && valid.post_execution_checks.length > 0, '[D-07] post_checks populated');
assert(Array.isArray(valid.rollback_checks) && valid.rollback_checks.length > 0,    '[D-08] rollback_checks populated');
assert(valid.pre_execution_checks.some(c => c.includes('armed_guard')),             '[D-09] guard check in pre_checks');
assert(valid.post_execution_checks.some(c => c.includes('receipt')),               '[D-10] receipt check in post_checks');
assert(valid.rollback_checks.some(c => c.includes('git tag -d')),                   '[D-11] rollback cmd in rollback_checks');

// ─── Suite E: Tag override ────────────────────────────────────────
console.log('\n[Suite E] Tag override');
const withOverride = buildRealTagManualExecutorAuditPlan({
  armed_guard: READY_GUARD,
  target_tag: 'v5.0.0',
  _mock_timestamp: TS,
});
assert(withOverride.target_tag === 'v5.0.0',                                         '[E-01] explicit tag override used');

// ─── Suite F: Invariants ──────────────────────────────────────────
console.log('\n[Suite F] Invariants');
assert(valid.audit_log_required           === true,  '[F-01] audit_log_required=true');
assert(valid.real_execution_not_performed === true,  '[F-02] not_performed=true');
assert(valid.tag_created                  === false, '[F-03] tag_created=false');
assert(valid.git_push_performed           === false, '[F-04] push=false');
assert(valid.deploy_performed             === false, '[F-05] deploy=false');
assert(valid.stable_promoted              === false, '[F-06] stable=false');
assert(valid.release_performed            === false, '[F-07] release=false');
assert(fix.audit_log_required             === true,  '[F-08] fixture: audit_log=true');
assert(fix.real_execution_not_performed   === true,  '[F-09] fixture: not_performed=true');

// ─── Suite G: Validate ────────────────────────────────────────────
console.log('\n[Suite G] Validate');
assert(validateRealTagManualExecutorAuditPlan(null).valid === false,                 '[G-01] null → invalid');
assert(validateRealTagManualExecutorAuditPlan({ ...valid, audit_plan_status: 'BAD' }).valid === false, '[G-02] unknown status');
assert(validateRealTagManualExecutorAuditPlan({ ...valid, audit_log_required: false }).valid === false, '[G-03] audit_log=false → invalid');
assert(validateRealTagManualExecutorAuditPlan({ ...valid, real_execution_not_performed: false }).valid === false, '[G-04] performed=false → invalid');
assert(validateRealTagManualExecutorAuditPlan({ ...valid, tag_created: true }).valid === false, '[G-05] tag=true → invalid');
assert(validateRealTagManualExecutorAuditPlan(valid).valid === true,                 '[G-06] valid → valid');

// ─── Suite H: Render ──────────────────────────────────────────────
console.log('\n[Suite H] Render');
const rendered = renderRealTagManualExecutorAuditPlan(fix);
assert(typeof rendered === 'string',                                                 '[H-01] returns string');
assert(rendered.includes('AUDIT_PLAN_READY'),                                        '[H-02] status in output');
assert(rendered.includes('audit_log_required             : true'),                  '[H-03] audit_log=true');
assert(rendered.includes('real_execution_not_performed   : true'),                  '[H-04] not_performed=true');
assert(rendered.includes('tag_created                    : false'),                 '[H-05] tag=false');
assert(rendered.includes('pre_execution_checks'),                                    '[H-06] pre section');
assert(rendered.includes('post_execution_checks'),                                   '[H-07] post section');
assert(rendered.includes('rollback_checks'),                                         '[H-08] rollback section');
assert(renderRealTagManualExecutorAuditPlan(null) === 'real_tag_manual_executor_audit_plan: null', '[H-09] null → string');

// ─── Suite I: Deterministic ID ────────────────────────────────────
console.log('\n[Suite I] Deterministic ID');
const d1 = buildRealTagManualExecutorAuditPlan({ fixture_mode: true, _mock_timestamp: TS });
const d2 = buildRealTagManualExecutorAuditPlan({ fixture_mode: true, _mock_timestamp: TS });
assert(d1.plan_id === d2.plan_id,                                                    '[I-01] deterministic id');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-executor-audit-plan: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
