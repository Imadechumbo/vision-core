#!/usr/bin/env node
/**
 * Release Plan Generator — Unit Tests V15.14
 * No subprocess spawning. No PI Harness invocation.
 */

import {
  generateReleasePlan,
  PLAN_STATUSES,
  PLAN_SCHEMA_VERSION,
} from '../release-plan-generator.mjs';

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

const fullRC = {
  release_candidate_status:  'RC_DRY_RUN_READY',
  release_candidate_allowed: true,
  release_candidate_blockers: [],
};

const blockedRC = {
  release_candidate_status:  'RC_BLOCKED_EVIDENCE',
  release_candidate_allowed: false,
  release_candidate_blockers: ['RC_BLOCKED_EVIDENCE'],
};

const fullBinding = {
  pass_gold_authority_binding_status:  'BINDING_READY',
  pass_gold_authority_binding_valid:   true,
  pass_gold_binding_evidence_receipt_id: 'ev_gocore_v1514_test',
  pass_gold_binding_evidence_source:   'go-core',
  pass_gold_binding_contract_id:       'contract_test_v1514',
  pass_gold_binding_reviewer:          'pass_gold_authority',
};

const blockedBinding = {
  pass_gold_authority_binding_status: 'BINDING_BLOCKED_EVIDENCE',
  pass_gold_authority_binding_valid:  false,
};

const fullAuthorityGate = {
  pass_gold_confirmed:  true,
  release_authorized:   true,
  approved_actions:     ['pass_gold_confirmation'],
};

const fullHarnessState = {
  backendAlive:       true,
  evidenceSource:     'go-core',
  goRuntimeEvidenceId: 'ev_gocore_v1514_test',
  runtimeProbePass:   true,
  fakeEvidenceAbsent: true,
  syntaxOk:           true,
  goCoreTestPass:     true,
  goCoreBuildPass:    true,
};

const fullInput = {
  releaseCandidateResult: fullRC,
  passGoldBinding:        fullBinding,
  authorityGate:          fullAuthorityGate,
  harnessState:           fullHarnessState,
  gitHead:                'abc123def456',
  branch:                 'feat/v1514-test',
  authorityContractId:    'contract_test_v1514',
};

// ═══════════════════════════════════════════════════════════════════
// Suite A — Constants and Schema
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite A] Constants and Schema');

assert(PLAN_SCHEMA_VERSION === 'v15.14',                           '[A-01] PLAN_SCHEMA_VERSION=v15.14');
assert(Array.isArray(PLAN_STATUSES) && PLAN_STATUSES.length === 5, '[A-02] PLAN_STATUSES has 5 entries');
assert(PLAN_STATUSES.includes('PLAN_READY'),                       '[A-03] PLAN_STATUSES includes PLAN_READY');
assert(PLAN_STATUSES.includes('PLAN_BLOCKED_NO_CANDIDATE'),        '[A-04] PLAN_STATUSES includes PLAN_BLOCKED_NO_CANDIDATE');
assert(PLAN_STATUSES.includes('PLAN_BLOCKED_NO_EVIDENCE'),         '[A-05] PLAN_STATUSES includes PLAN_BLOCKED_NO_EVIDENCE');
assert(PLAN_STATUSES.includes('PLAN_BLOCKED_NO_AUTHORITY'),        '[A-06] PLAN_STATUSES includes PLAN_BLOCKED_NO_AUTHORITY');
assert(PLAN_STATUSES.includes('PLAN_BLOCKED_POLICY'),              '[A-07] PLAN_STATUSES includes PLAN_BLOCKED_POLICY');

// ═══════════════════════════════════════════════════════════════════
// Suite B — Invariants always false
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite B] Invariants — always false');

const anyPlan = generateReleasePlan({});
assert(anyPlan.deploy_performed   === false, '[B-01] empty input → deploy_performed=false');
assert(anyPlan.tag_created        === false, '[B-02] empty input → tag_created=false');
assert(anyPlan.stable_promoted    === false, '[B-03] empty input → stable_promoted=false');
assert(anyPlan.deploy_allowed     === false, '[B-04] empty input → deploy_allowed=false');
assert(anyPlan.tag_allowed        === false, '[B-05] empty input → tag_allowed=false');
assert(anyPlan.stable_allowed     === false, '[B-06] empty input → stable_allowed=false');
assert(anyPlan.release_allowed    === false, '[B-07] empty input → release_allowed=false');
assert(anyPlan.promotion_allowed  === false, '[B-08] empty input → promotion_allowed=false');
assert(anyPlan.schema_version === 'v15.14', '[B-09] schema_version=v15.14');

const readyPlan = generateReleasePlan(fullInput);
assert(readyPlan.deploy_performed  === false, '[B-10] PLAN_READY → deploy_performed=false');
assert(readyPlan.tag_created       === false, '[B-11] PLAN_READY → tag_created=false');
assert(readyPlan.stable_promoted   === false, '[B-12] PLAN_READY → stable_promoted=false');
assert(readyPlan.deploy_allowed    === false, '[B-13] PLAN_READY → deploy_allowed=false');
assert(readyPlan.tag_allowed       === false, '[B-14] PLAN_READY → tag_allowed=false');
assert(readyPlan.stable_allowed    === false, '[B-15] PLAN_READY → stable_allowed=false');

// ═══════════════════════════════════════════════════════════════════
// Suite C — Blocked scenarios
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite C] Blocked scenarios');

// RC not ready → PLAN_BLOCKED_NO_CANDIDATE
const pNoRC = generateReleasePlan({ ...fullInput, releaseCandidateResult: blockedRC });
assert(pNoRC.release_plan_status === 'PLAN_BLOCKED_NO_CANDIDATE', '[C-01] blocked RC → PLAN_BLOCKED_NO_CANDIDATE');
assert(pNoRC.release_plan_ready === false,                        '[C-02] blocked RC → plan_ready=false');

// No RC at all → PLAN_BLOCKED_NO_CANDIDATE
const pNullRC = generateReleasePlan({ ...fullInput, releaseCandidateResult: null });
assert(pNullRC.release_plan_status === 'PLAN_BLOCKED_NO_CANDIDATE', '[C-03] null RC → PLAN_BLOCKED_NO_CANDIDATE');

// RC ready, no evidence → PLAN_BLOCKED_NO_EVIDENCE
const pNoEv = generateReleasePlan({
  ...fullInput,
  harnessState: { ...fullHarnessState, evidenceSource: null, goRuntimeEvidenceId: null },
  passGoldBinding: { ...fullBinding, pass_gold_binding_evidence_receipt_id: null, pass_gold_binding_evidence_source: null },
});
assert(pNoEv.release_plan_status === 'PLAN_BLOCKED_NO_EVIDENCE', '[C-04] no evidence → PLAN_BLOCKED_NO_EVIDENCE');

// RC ready, evidence ok, binding blocked → PLAN_BLOCKED_NO_AUTHORITY
const pNoAuth = generateReleasePlan({ ...fullInput, passGoldBinding: blockedBinding });
assert(pNoAuth.release_plan_status === 'PLAN_BLOCKED_NO_AUTHORITY', '[C-05] blocked binding → PLAN_BLOCKED_NO_AUTHORITY');

// All ready but fakeEvidenceAbsent=false → PLAN_BLOCKED_POLICY
const pPolicy = generateReleasePlan({
  ...fullInput,
  harnessState: { ...fullHarnessState, fakeEvidenceAbsent: false },
});
assert(pPolicy.release_plan_status === 'PLAN_BLOCKED_POLICY', '[C-06] fakeEvidenceAbsent=false → PLAN_BLOCKED_POLICY');
assert(pPolicy.release_plan_ready === false,                   '[C-07] PLAN_BLOCKED_POLICY → release_plan_ready=false');
assert(pPolicy.deploy_performed   === false,                   '[C-08] PLAN_BLOCKED_POLICY → deploy_performed=false');
assert(pPolicy.tag_created        === false,                   '[C-09] PLAN_BLOCKED_POLICY → tag_created=false');
assert(pPolicy.stable_promoted    === false,                   '[C-10] PLAN_BLOCKED_POLICY → stable_promoted=false');

// ═══════════════════════════════════════════════════════════════════
// Suite D — PLAN_READY
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite D] PLAN_READY');

const p = generateReleasePlan(fullInput);
assert(p.release_plan_status === 'PLAN_READY',     '[D-01] all conditions → PLAN_READY');
assert(p.release_plan_ready === true,              '[D-02] PLAN_READY → plan_ready=true');
assert(typeof p.release_plan_id === 'string',      '[D-03] plan_id is string');
assert(p.release_plan_id.startsWith('plan_'),      '[D-04] plan_id starts with plan_');
assert(p.release_plan_id.length > 5,               '[D-05] plan_id has content');
assert(typeof p.created_at === 'string',           '[D-06] created_at is string');
assert(p.git_head === 'abc123def456',              '[D-07] git_head populated');
assert(p.branch === 'feat/v1514-test',             '[D-08] branch populated');
assert(p.candidate_status === 'RC_DRY_RUN_READY',  '[D-09] candidate_status from RC');
assert(p.evidence_receipt_id === 'ev_gocore_v1514_test', '[D-10] evidence_receipt_id populated');
assert(p.evidence_source === 'go-core',            '[D-11] evidence_source=go-core');
assert(p.authority_binding_status === 'BINDING_READY', '[D-12] authority_binding_status=BINDING_READY');

// ═══════════════════════════════════════════════════════════════════
// Suite E — Required manual steps
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite E] Required manual steps');

const steps = p.required_manual_steps;
assert(Array.isArray(steps),                              '[E-01] required_manual_steps is array');
assert(steps.length > 0,                                  '[E-02] required_manual_steps non-empty');
assert(steps.every(s => typeof s.id === 'string'),        '[E-03] all steps have id');
assert(steps.every(s => typeof s.description === 'string'), '[E-04] all steps have description');
assert(steps.some(s => s.id === 'human_release_approval'), '[E-05] human_release_approval step present');
assert(steps.some(s => s.id === 'verify_pass_gold_real'), '[E-06] verify_pass_gold_real step present');
assert(steps.some(s => s.id === 'confirm_no_auto_deploy'), '[E-07] confirm_no_auto_deploy step present');

// ═══════════════════════════════════════════════════════════════════
// Suite F — Forbidden automatic steps
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite F] Forbidden automatic steps');

const forbidden = p.forbidden_automatic_steps;
assert(Array.isArray(forbidden),                                         '[F-01] forbidden_automatic_steps is array');
assert(forbidden.includes('create_github_release_tag'),                  '[F-02] create_github_release_tag is forbidden');
assert(forbidden.includes('push_to_stable_branch'),                      '[F-03] push_to_stable_branch is forbidden');
assert(forbidden.includes('execute_production_deploy'),                  '[F-04] execute_production_deploy is forbidden');
assert(forbidden.includes('override_pass_gold'),                         '[F-05] override_pass_gold is forbidden');
assert(forbidden.includes('promote_stable_without_human_approval'),      '[F-06] promote_stable_without_human_approval is forbidden');

// ═══════════════════════════════════════════════════════════════════
// Suite G — Rollback plan
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite G] Rollback plan');

const rollback = p.rollback_plan;
assert(typeof rollback === 'object' && rollback !== null, '[G-01] rollback_plan is object');
assert(rollback.rollback_performed === false,             '[G-02] rollback_performed=false');
assert(rollback.rollback_tested === false,               '[G-03] rollback_tested=false');
assert(rollback.rollback_target === 'abc123def456',      '[G-04] rollback_target = git_head');
assert(rollback.rollback_branch === 'feat/v1514-test',   '[G-05] rollback_branch = branch');
assert(Array.isArray(rollback.steps),                    '[G-06] rollback steps is array');
assert(rollback.steps.length > 0,                        '[G-07] rollback steps non-empty');

// ═══════════════════════════════════════════════════════════════════
// Suite H — Validation plan
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite H] Validation plan');

const valPlan = p.validation_plan;
assert(typeof valPlan === 'object' && valPlan !== null, '[H-01] validation_plan is object');
assert(Array.isArray(valPlan.steps),                   '[H-02] validation steps is array');
assert(valPlan.steps.length > 0,                       '[H-03] validation steps non-empty');
assert(valPlan.steps.some(s => s.id === 'test_full'),  '[H-04] test_full step present');
assert(valPlan.steps.some(s => s.id === 'test_go'),    '[H-05] test_go step present');
assert(valPlan.steps.every(s => typeof s.command === 'string'), '[H-06] all steps have command');

// ═══════════════════════════════════════════════════════════════════
// Suite I — Risk summary
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite I] Risk summary');

const risk = p.risk_summary;
assert(typeof risk === 'object' && risk !== null,  '[I-01] risk_summary is object');
assert(typeof risk.risk_count === 'number',        '[I-02] risk_count is number');
assert(typeof risk.critical_count === 'number',    '[I-03] critical_count is number');
assert(Array.isArray(risk.risks),                  '[I-04] risks is array');

// Fake evidence → critical risk
const pFakeEv = generateReleasePlan({
  ...fullInput,
  harnessState: { ...fullHarnessState, fakeEvidenceAbsent: false },
});
const riskFake = pFakeEv.risk_summary;
assert(riskFake.critical_count > 0, '[I-05] fake evidence → critical risk');
assert(riskFake.risks.some(r => r.id === 'fake_evidence_detected'), '[I-06] fake_evidence_detected risk present');
assert(riskFake.safe_to_proceed === false,          '[I-07] fake evidence → safe_to_proceed=false');

// ═══════════════════════════════════════════════════════════════════
// Suite J — Approval requirements
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite J] Approval requirements');

const approvals = p.approval_requirements;
assert(Array.isArray(approvals),                                          '[J-01] approval_requirements is array');
assert(approvals.every(a => typeof a.id === 'string'),                    '[J-02] all approvals have id');
assert(approvals.every(a => typeof a.required === 'boolean'),             '[J-03] all approvals have required flag');
assert(approvals.some(a => a.id === 'human_final_approval'),              '[J-04] human_final_approval present');
assert(approvals.some(a => a.id === 'no_auto_deploy_confirmed'),          '[J-05] no_auto_deploy_confirmed present');
assert(approvals.find(a => a.id === 'no_auto_deploy_confirmed')?.present === true, '[J-06] no_auto_deploy_confirmed.present=true');
assert(approvals.find(a => a.id === 'human_final_approval')?.present === false,    '[J-07] human_final_approval.present=false (never auto)');

// ═══════════════════════════════════════════════════════════════════
// Suite K — Edge cases / no crash
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite K] Edge cases');

const pEmpty = generateReleasePlan();
assert(typeof pEmpty.release_plan_status === 'string', '[K-01] no args → no crash, returns status');
assert(pEmpty.deploy_performed === false,               '[K-02] no args → deploy_performed=false');
assert(pEmpty.tag_created === false,                   '[K-03] no args → tag_created=false');
assert(pEmpty.stable_promoted === false,               '[K-04] no args → stable_promoted=false');

const pNullAll = generateReleasePlan({ harnessState: null, passGoldBinding: null, releaseCandidateResult: null });
assert(typeof pNullAll.release_plan_status === 'string', '[K-05] null inputs → no crash');
assert(pNullAll.deploy_performed === false,              '[K-06] null inputs → deploy_performed=false');

// Plan IDs are unique per call
const pA = generateReleasePlan(fullInput);
const pB = generateReleasePlan(fullInput);
assert(pA.release_plan_id !== pB.release_plan_id, '[K-07] plan_ids are unique (timestamp differs)');

// Note field present
assert(typeof p.note === 'string' && p.note.length > 0, '[K-08] note field present');

// ═══════════════════════════════════════════════════════════════════
// Suite L — Authority contract ID preservation
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite L] Authority contract ID preservation');

// Explicit authorityContractId preserved even without pass_gold_binding_contract_id
const pExplicitContract = generateReleasePlan({
  ...fullInput,
  authorityContractId: 'explicit_contract_id',
  passGoldBinding: { ...fullBinding, pass_gold_binding_contract_id: null },
});
assert(pExplicitContract.authority_contract_id === 'explicit_contract_id', '[L-01] explicit authorityContractId preserved without pass_gold_binding_contract_id');

// authorityContractId takes precedence over pass_gold_binding_contract_id
const pContractPrecedence = generateReleasePlan({
  ...fullInput,
  authorityContractId: 'primary_contract',
  passGoldBinding: { ...fullBinding, pass_gold_binding_contract_id: 'secondary_contract' },
});
assert(pContractPrecedence.authority_contract_id === 'primary_contract', '[L-02] authorityContractId takes precedence over pass_gold_binding_contract_id');

// ═══════════════════════════════════════════════════════════════════
// Result
// ═══════════════════════════════════════════════════════════════════

console.log(`\nRelease Plan Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
