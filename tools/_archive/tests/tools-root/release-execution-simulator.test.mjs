#!/usr/bin/env node
/**
 * Release Execution Simulator — Unit Tests V15.15
 * No subprocess spawning. No PI Harness invocation.
 */

import {
  simulateRelease,
  SIM_STATUSES,
  SIM_FORBIDDEN_STEPS,
  SIM_SCHEMA_VERSION,
} from '../release-execution-simulator.mjs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Shared fixtures
// ═══════════════════════════════════════════════════════════════════

const readyPlan = {
  release_plan_status: 'PLAN_READY',
  release_plan_ready:  true,
};

const blockedPlan = {
  release_plan_status: 'PLAN_BLOCKED_NO_EVIDENCE',
  release_plan_ready:  false,
};

const goodEvidence = {
  id:     'ev_gocore_v1515_test',
  source: 'go-core',
};

const badEvidence = {
  id:     'ev_fake_001',
  source: 'manual',
};

const readyBinding = {
  status:      'BINDING_READY',
  contract_id: 'contract_v1515_test',
  reviewer:    'pass_gold_authority',
};

const blockedBinding = {
  status:      'BINDING_BLOCKED_EVIDENCE',
  contract_id: null,
};

const goodRollback = {
  rollback_target: 'abc123def456',
  steps:           [{ id: 'snapshot', description: 'Record current state' }],
};

const emptyRollback = {
  rollback_target: null,
  steps:           [],
};

const allTestsPass = {
  quickPass: true,
  fullPass:  true,
  goPass:    true,
};

const humanApproval = {
  confirmed: true,
  approver:  'release_authority',
};

const fullInput = {
  releasePlan:      readyPlan,
  evidenceReceipt:  goodEvidence,
  authorityBinding: readyBinding,
  rollbackPlan:     goodRollback,
  testResults:      allTestsPass,
  manualApproval:   humanApproval,
  gitHead:          'abc123def456',
  branch:           'feat/v1515-test',
};

// ═══════════════════════════════════════════════════════════════════
// Suite A — Constants and Schema
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite A] Constants and Schema');

assert(SIM_SCHEMA_VERSION === 'v15.15',                              '[A-01] SIM_SCHEMA_VERSION=v15.15');
assert(Array.isArray(SIM_STATUSES) && SIM_STATUSES.length === 5,     '[A-02] SIM_STATUSES has 5 entries');
assert(SIM_STATUSES.includes('SIM_READY_MANUAL_RELEASE'),            '[A-03] SIM_STATUSES includes SIM_READY_MANUAL_RELEASE');
assert(SIM_STATUSES.includes('SIM_BLOCKED_PLAN'),                    '[A-04] SIM_STATUSES includes SIM_BLOCKED_PLAN');
assert(SIM_STATUSES.includes('SIM_BLOCKED_EVIDENCE'),                '[A-05] SIM_STATUSES includes SIM_BLOCKED_EVIDENCE');
assert(SIM_STATUSES.includes('SIM_BLOCKED_AUTHORITY'),               '[A-06] SIM_STATUSES includes SIM_BLOCKED_AUTHORITY');
assert(SIM_STATUSES.includes('SIM_BLOCKED_ROLLBACK'),                '[A-07] SIM_STATUSES includes SIM_BLOCKED_ROLLBACK');
assert(Array.isArray(SIM_FORBIDDEN_STEPS) && SIM_FORBIDDEN_STEPS.length > 0, '[A-08] SIM_FORBIDDEN_STEPS non-empty');
assert(SIM_FORBIDDEN_STEPS.includes('execute_production_deploy'),    '[A-09] forbidden: execute_production_deploy');
assert(SIM_FORBIDDEN_STEPS.includes('create_github_release_tag'),    '[A-10] forbidden: create_github_release_tag');

// ═══════════════════════════════════════════════════════════════════
// Suite B — Invariants always false
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite B] Invariants — always false');

const anyResult = simulateRelease({});
assert(anyResult.deploy_performed   === false, '[B-01] empty input → deploy_performed=false');
assert(anyResult.tag_created        === false, '[B-02] empty input → tag_created=false');
assert(anyResult.stable_promoted    === false, '[B-03] empty input → stable_promoted=false');
assert(anyResult.deploy_allowed     === false, '[B-04] empty input → deploy_allowed=false');
assert(anyResult.tag_allowed        === false, '[B-05] empty input → tag_allowed=false');
assert(anyResult.stable_allowed     === false, '[B-06] empty input → stable_allowed=false');
assert(anyResult.release_allowed    === false, '[B-07] empty input → release_allowed=false');
assert(anyResult.promotion_allowed  === false, '[B-08] empty input → promotion_allowed=false');
assert(anyResult.schema_version === 'v15.15',  '[B-09] schema_version=v15.15');

const fullResult = simulateRelease(fullInput);
assert(fullResult.deploy_performed  === false, '[B-10] ready → deploy_performed=false');
assert(fullResult.tag_created       === false, '[B-11] ready → tag_created=false');
assert(fullResult.stable_promoted   === false, '[B-12] ready → stable_promoted=false');
assert(fullResult.deploy_allowed    === false, '[B-13] ready → deploy_allowed=false');
assert(fullResult.tag_allowed       === false, '[B-14] ready → tag_allowed=false');
assert(fullResult.stable_allowed    === false, '[B-15] ready → stable_allowed=false');

// ═══════════════════════════════════════════════════════════════════
// Suite C — Blocked scenarios
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite C] Blocked scenarios');

// No plan → SIM_BLOCKED_PLAN
const pNoInput = simulateRelease({});
assert(pNoInput.simulation_status === 'SIM_BLOCKED_PLAN',    '[C-01] no plan → SIM_BLOCKED_PLAN');
assert(pNoInput.simulation_safe   === false,                  '[C-02] no plan → simulation_safe=false');

// Invalid plan → SIM_BLOCKED_PLAN
const pBadPlan = simulateRelease({ ...fullInput, releasePlan: blockedPlan });
assert(pBadPlan.simulation_status === 'SIM_BLOCKED_PLAN',    '[C-03] blocked plan → SIM_BLOCKED_PLAN');
assert(pBadPlan.simulation_safe   === false,                  '[C-04] blocked plan → simulation_safe=false');

// Null plan → SIM_BLOCKED_PLAN
const pNullPlan = simulateRelease({ ...fullInput, releasePlan: null });
assert(pNullPlan.simulation_status === 'SIM_BLOCKED_PLAN',   '[C-05] null plan → SIM_BLOCKED_PLAN');

// Evidence absent → SIM_BLOCKED_EVIDENCE
const pNoEv = simulateRelease({ ...fullInput, evidenceReceipt: null });
assert(pNoEv.simulation_status === 'SIM_BLOCKED_EVIDENCE',   '[C-06] no evidence → SIM_BLOCKED_EVIDENCE');
assert(pNoEv.simulation_safe   === false,                     '[C-07] no evidence → simulation_safe=false');

// Bad evidence source → SIM_BLOCKED_EVIDENCE
const pBadEv = simulateRelease({ ...fullInput, evidenceReceipt: badEvidence });
assert(pBadEv.simulation_status === 'SIM_BLOCKED_EVIDENCE',  '[C-08] bad evidence source → SIM_BLOCKED_EVIDENCE');

// Authority absent → SIM_BLOCKED_AUTHORITY
const pNoAuth = simulateRelease({ ...fullInput, authorityBinding: blockedBinding });
assert(pNoAuth.simulation_status === 'SIM_BLOCKED_AUTHORITY', '[C-09] blocked authority → SIM_BLOCKED_AUTHORITY');
assert(pNoAuth.simulation_safe   === false,                   '[C-10] blocked authority → simulation_safe=false');

// Null authority → SIM_BLOCKED_AUTHORITY
const pNullAuth = simulateRelease({ ...fullInput, authorityBinding: null });
assert(pNullAuth.simulation_status === 'SIM_BLOCKED_AUTHORITY', '[C-11] null authority → SIM_BLOCKED_AUTHORITY');

// Rollback absent → SIM_BLOCKED_ROLLBACK
const pNoRoll = simulateRelease({ ...fullInput, rollbackPlan: emptyRollback });
assert(pNoRoll.simulation_status === 'SIM_BLOCKED_ROLLBACK', '[C-12] empty rollback → SIM_BLOCKED_ROLLBACK');
assert(pNoRoll.simulation_safe   === false,                   '[C-13] empty rollback → simulation_safe=false');

// Null rollback → SIM_BLOCKED_ROLLBACK
const pNullRoll = simulateRelease({ ...fullInput, rollbackPlan: null });
assert(pNullRoll.simulation_status === 'SIM_BLOCKED_ROLLBACK', '[C-14] null rollback → SIM_BLOCKED_ROLLBACK');

// ═══════════════════════════════════════════════════════════════════
// Suite D — SIM_READY_MANUAL_RELEASE
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite D] SIM_READY_MANUAL_RELEASE');

const s = simulateRelease(fullInput);
assert(s.simulation_status === 'SIM_READY_MANUAL_RELEASE',   '[D-01] all conditions → SIM_READY_MANUAL_RELEASE');
assert(s.simulation_safe   === true,                          '[D-02] ready → simulation_safe=true');
assert(typeof s.release_simulation_id === 'string',           '[D-03] simulation_id is string');
assert(s.release_simulation_id.startsWith('sim_'),            '[D-04] simulation_id starts with sim_');
assert(s.release_simulation_id.length > 4,                   '[D-05] simulation_id has content');
assert(typeof s.created_at === 'string',                      '[D-06] created_at is string');
assert(s.git_head === 'abc123def456',                         '[D-07] git_head populated');
assert(s.branch === 'feat/v1515-test',                        '[D-08] branch populated');
assert(typeof s.note === 'string' && s.note.length > 0,       '[D-09] note field present');

// ═══════════════════════════════════════════════════════════════════
// Suite E — Simulated steps
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite E] Simulated steps');

const steps = s.simulated_steps;
assert(Array.isArray(steps),                                  '[E-01] simulated_steps is array');
assert(steps.length > 0,                                      '[E-02] simulated_steps non-empty');
assert(steps.every(st => typeof st.id === 'string'),          '[E-03] all steps have id');
assert(steps.every(st => typeof st.description === 'string'), '[E-04] all steps have description');
assert(steps.every(st => typeof st.required === 'boolean'),   '[E-05] all steps have required flag');
assert(steps.some(st => st.id === 'validate_release_plan'),   '[E-06] validate_release_plan step present');
assert(steps.some(st => st.id === 'validate_evidence_receipt'), '[E-07] validate_evidence_receipt step present');
assert(steps.some(st => st.id === 'validate_authority_binding'), '[E-08] validate_authority_binding step present');
assert(steps.some(st => st.id === 'validate_rollback_plan'),  '[E-09] validate_rollback_plan step present');
assert(steps.some(st => st.id === 'validate_tests'),          '[E-10] validate_tests step present');
assert(steps.some(st => st.id === 'validate_manual_approval'), '[E-11] validate_manual_approval step present');

// Steps pass correctly for full input
const planStep = steps.find(st => st.id === 'validate_release_plan');
assert(planStep?.passed === true,                             '[E-12] validate_release_plan passed=true for ready plan');
const evStep = steps.find(st => st.id === 'validate_evidence_receipt');
assert(evStep?.passed === true,                               '[E-13] validate_evidence_receipt passed=true for good evidence');

// ═══════════════════════════════════════════════════════════════════
// Suite F — Blocked steps
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite F] Blocked steps');

const blocked = s.blocked_steps;
assert(Array.isArray(blocked),                                '[F-01] blocked_steps is array');
assert(blocked.some(b => b.id === 'execute_deploy'),          '[F-02] execute_deploy always blocked');
assert(blocked.some(b => b.id === 'create_tag'),              '[F-03] create_tag always blocked');
assert(blocked.some(b => b.id === 'promote_stable'),          '[F-04] promote_stable always blocked');

// Blocked sim adds proceed_with_release to blocked
const pBlocked = simulateRelease({});
const blockedInBlocked = pBlocked.blocked_steps;
assert(blockedInBlocked.some(b => b.id === 'proceed_with_release'), '[F-05] blocked sim → proceed_with_release is blocked');

// ═══════════════════════════════════════════════════════════════════
// Suite G — Forbidden steps
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite G] Forbidden steps');

const forbidden = s.forbidden_steps;
assert(Array.isArray(forbidden),                                    '[G-01] forbidden_steps is array');
assert(forbidden.includes('execute_production_deploy'),             '[G-02] execute_production_deploy forbidden');
assert(forbidden.includes('create_github_release_tag'),             '[G-03] create_github_release_tag forbidden');
assert(forbidden.includes('push_to_stable_branch'),                 '[G-04] push_to_stable_branch forbidden');
assert(forbidden.includes('override_pass_gold'),                    '[G-05] override_pass_gold forbidden');
assert(forbidden.includes('promote_stable_without_human_approval'), '[G-06] promote_stable_without_human_approval forbidden');

// ═══════════════════════════════════════════════════════════════════
// Suite H — Approval summary
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite H] Approval summary');

const appr = s.approval_summary;
assert(typeof appr === 'object' && appr !== null,             '[H-01] approval_summary is object');
assert(appr.manual_approval_confirmed === true,               '[H-02] manual_approval_confirmed=true for confirmed approval');
assert(appr.approver === 'release_authority',                 '[H-03] approver populated');
assert(appr.auto_approval_possible === false,                 '[H-04] auto_approval_possible=false always');

const noApprResult = simulateRelease({ ...fullInput, manualApproval: null });
assert(noApprResult.approval_summary.manual_approval_confirmed === false, '[H-05] no approval → confirmed=false');

// ═══════════════════════════════════════════════════════════════════
// Suite I — Risk assessment
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite I] Risk assessment');

const risk = s.risk_assessment;
assert(typeof risk === 'object' && risk !== null,             '[I-01] risk_assessment is object');
assert(typeof risk.risk_count === 'number',                   '[I-02] risk_count is number');
assert(typeof risk.critical_count === 'number',               '[I-03] critical_count is number');
assert(Array.isArray(risk.risks),                             '[I-04] risks is array');
assert(risk.safe_to_proceed === true,                         '[I-05] full input → safe_to_proceed=true');

const riskBlocked = simulateRelease({}).risk_assessment;
assert(riskBlocked.critical_count > 0,                        '[I-06] blocked sim → critical risks present');
assert(riskBlocked.safe_to_proceed === false,                 '[I-07] blocked sim → safe_to_proceed=false');

// ═══════════════════════════════════════════════════════════════════
// Suite J — Edge cases
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite J] Edge cases');

const pEmpty = simulateRelease();
assert(typeof pEmpty.simulation_status === 'string',          '[J-01] no args → no crash, returns status');
assert(pEmpty.deploy_performed === false,                      '[J-02] no args → deploy_performed=false');
assert(pEmpty.tag_created === false,                           '[J-03] no args → tag_created=false');
assert(pEmpty.stable_promoted === false,                       '[J-04] no args → stable_promoted=false');

const pNull = simulateRelease({ releasePlan: null, evidenceReceipt: null, authorityBinding: null, rollbackPlan: null });
assert(typeof pNull.simulation_status === 'string',           '[J-05] null inputs → no crash');
assert(pNull.deploy_performed === false,                       '[J-06] null inputs → deploy_performed=false');

// Simulation IDs are unique per call
const sA = simulateRelease(fullInput);
const sB = simulateRelease(fullInput);
assert(sA.release_simulation_id !== sB.release_simulation_id, '[J-07] simulation_ids are unique');

// ═══════════════════════════════════════════════════════════════════
// Result
// ═══════════════════════════════════════════════════════════════════

console.log(`\nRelease Execution Simulator Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
