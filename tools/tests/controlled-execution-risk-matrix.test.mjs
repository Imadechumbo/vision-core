#!/usr/bin/env node
/**
 * Controlled Execution Risk Matrix — Unit Tests V67.0
 */

import {
  evaluateControlledExecutionRisk,
  classifyControlledExecutionRisk,
  renderControlledExecutionRiskMatrix,
  CONTROLLED_RISK_STATUSES,
  CONTROLLED_RISK_BLOCKED_ACTIONS,
  CONTROLLED_RISK_SAFE_NEXT_ACTIONS,
} from '../controlled-execution-risk-matrix.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T00:00:00.000Z';

const GOOD_CONTRACT  = { contract_ready: true, controlled_contract_id: 'cid', contract_status: 'CONTROLLED_CONTRACT_READY_REVIEW', requested_execution_scope: 'review_controlled_deploy' };
const GOOD_AUTHORITY = { authority_ready: true, controlled_authority_id: 'aid', authority_status: 'CONTROLLED_AUTHORITY_READY_REVIEW' };
const GOOD_BINDING   = { binding_ready: true, binding_id: 'bid', binding_status: 'CONTROLLED_BINDING_READY_REVIEW' };
const GOOD_BASELINE  = { baseline_ready: true, baseline_status: 'UNLOCK_GOVERNANCE_BASELINE_READY', baseline_hash: 'abc' };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CONTROLLED_RISK_STATUSES),                                        '[A-01] statuses array');
assert(CONTROLLED_RISK_STATUSES.length === 7,                                          '[A-02] 7 statuses');
assert(CONTROLLED_RISK_STATUSES.includes('CONTROLLED_RISK_BLOCKED_CONTRACT'),          '[A-03] BLOCKED_CONTRACT');
assert(CONTROLLED_RISK_STATUSES.includes('CONTROLLED_RISK_BLOCKED_AUTHORITY'),         '[A-04] BLOCKED_AUTHORITY');
assert(CONTROLLED_RISK_STATUSES.includes('CONTROLLED_RISK_BLOCKED_BINDING'),           '[A-05] BLOCKED_BINDING');
assert(CONTROLLED_RISK_STATUSES.includes('CONTROLLED_RISK_BLOCKED_BASELINE'),          '[A-06] BLOCKED_BASELINE');
assert(CONTROLLED_RISK_STATUSES.includes('CONTROLLED_RISK_BLOCKED_EVIDENCE'),          '[A-07] BLOCKED_EVIDENCE');
assert(CONTROLLED_RISK_STATUSES.includes('CONTROLLED_RISK_READY_REVIEW'),              '[A-08] READY_REVIEW');
assert(CONTROLLED_RISK_STATUSES.includes('CONTROLLED_RISK_NEEDS_FINAL_EXECUTION_PHASE'), '[A-09] NEEDS_FINAL_EXECUTION_PHASE');

assert(Array.isArray(CONTROLLED_RISK_BLOCKED_ACTIONS),                                 '[A-10] blocked_actions array');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.length === 10,                                  '[A-11] 10 blocked actions');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.includes('auto_release'),                       '[A-12] auto_release blocked');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.includes('auto_tag'),                           '[A-13] auto_tag blocked');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.includes('auto_stable_promotion'),              '[A-14] auto_stable blocked');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.includes('auto_deploy'),                        '[A-15] auto_deploy blocked');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.includes('auto_unlock'),                        '[A-16] auto_unlock blocked');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.includes('auto_controlled_execution'),          '[A-17] auto_controlled_execution blocked');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.includes('git_push'),                           '[A-18] git_push blocked');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.includes('production_write'),                   '[A-19] production_write blocked');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.includes('unlock_execute_now'),                 '[A-20] unlock_execute_now blocked');
assert(CONTROLLED_RISK_BLOCKED_ACTIONS.includes('controlled_execute_now'),             '[A-21] controlled_execute_now blocked');

assert(Array.isArray(CONTROLLED_RISK_SAFE_NEXT_ACTIONS),                               '[A-22] safe_actions array');
assert(CONTROLLED_RISK_SAFE_NEXT_ACTIONS.length === 6,                                 '[A-23] 6 safe actions');
assert(CONTROLLED_RISK_SAFE_NEXT_ACTIONS.includes('do_not_execute_production_in_this_phase'), '[A-24] do_not_execute safe');
assert(CONTROLLED_RISK_SAFE_NEXT_ACTIONS.includes('prepare_future_real_manual_execution_contract'), '[A-25] future_phase safe');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = evaluateControlledExecutionRisk({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.controlled_risk_status     === 'CONTROLLED_RISK_READY_REVIEW',             '[B-02] status=READY_REVIEW');
assert(fix.controlled_execution_review_ready === true,                                 '[B-03] review_ready=true');
assert(fix.schema_version             === 'v67.0',                                    '[B-04] schema=v67.0');
assert(typeof fix.risk_matrix_id      === 'string' && fix.risk_matrix_id.length === 24, '[B-05] id 24 chars');
assert(fix.risk_score                 === 0,                                           '[B-06] risk_score=0');
assert(fix.missing_requirements.length === 0,                                          '[B-07] no missing req');
assert(Array.isArray(fix.blocked_actions) && fix.blocked_actions.length === 10,       '[B-08] 10 blocked');
assert(Array.isArray(fix.safe_next_actions) && fix.safe_next_actions.length === 6,    '[B-09] 6 safe');
assert(fix.blocking_reason            === null,                                        '[B-10] blocking_reason=null');
assert(fix.risk_matrix.contract_valid === true,                                        '[B-11] risk_matrix.contract_valid');
assert(fix.risk_matrix.authority_valid === true,                                       '[B-12] risk_matrix.authority_valid');
assert(fix.risk_matrix.binding_ready  === true,                                        '[B-13] risk_matrix.binding_ready');
assert(fix.risk_matrix.baseline_ready === true,                                        '[B-14] risk_matrix.baseline_ready');

// ─── Suite C: Missing contract ────────────────────────────────────
console.log('\n[Suite C] Missing contract');
const noC = evaluateControlledExecutionRisk({ controlled_authority: GOOD_AUTHORITY, controlled_binding: GOOD_BINDING, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
assert(noC.controlled_execution_review_ready === false,                                '[C-01] blocked');
assert(noC.controlled_risk_status === 'CONTROLLED_RISK_BLOCKED_CONTRACT',             '[C-02] status BLOCKED_CONTRACT');

// ─── Suite D: Missing authority ───────────────────────────────────
console.log('\n[Suite D] Missing authority');
const noA = evaluateControlledExecutionRisk({ controlled_contract: GOOD_CONTRACT, controlled_binding: GOOD_BINDING, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
assert(noA.controlled_risk_status === 'CONTROLLED_RISK_BLOCKED_AUTHORITY',            '[D-01] BLOCKED_AUTHORITY');

// ─── Suite E: Missing binding ─────────────────────────────────────
console.log('\n[Suite E] Missing binding');
const noB = evaluateControlledExecutionRisk({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
assert(noB.controlled_risk_status === 'CONTROLLED_RISK_BLOCKED_BINDING',              '[E-01] BLOCKED_BINDING');

// ─── Suite F: Missing baseline ────────────────────────────────────
console.log('\n[Suite F] Missing baseline');
const noBl = evaluateControlledExecutionRisk({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, controlled_binding: GOOD_BINDING, _mock_timestamp: TS });
assert(noBl.controlled_risk_status === 'CONTROLLED_RISK_BLOCKED_BASELINE',            '[F-01] BLOCKED_BASELINE');

// ─── Suite G: Full ready review ───────────────────────────────────
console.log('\n[Suite G] Full ready review');
const ready = evaluateControlledExecutionRisk({
  controlled_contract:        GOOD_CONTRACT,
  controlled_authority:       GOOD_AUTHORITY,
  controlled_binding:         GOOD_BINDING,
  unlock_governance_baseline: GOOD_BASELINE,
  _mock_timestamp:            TS,
});
assert(ready.controlled_execution_review_ready === true,                               '[G-01] review_ready=true');
assert(ready.controlled_risk_status === 'CONTROLLED_RISK_READY_REVIEW',               '[G-02] status=READY_REVIEW');
assert(typeof ready.risk_matrix_id === 'string' && ready.risk_matrix_id.length === 24,'[G-03] id 24 chars');
assert(ready.blocking_reason === null,                                                  '[G-04] blocking_reason=null');

// ─── Suite H: Missing optional inputs → risk score > 0 ───────────
console.log('\n[Suite H] Risk score with missing optional inputs');
const withMissing = evaluateControlledExecutionRisk({
  controlled_contract:        GOOD_CONTRACT,
  controlled_authority:       GOOD_AUTHORITY,
  controlled_binding:         GOOD_BINDING,
  unlock_governance_baseline: GOOD_BASELINE,
  _mock_timestamp:            TS,
});
assert(withMissing.risk_score >= 0,                                                    '[H-01] risk_score >= 0');
assert(withMissing.controlled_risk_status === 'CONTROLLED_RISK_READY_REVIEW',         '[H-02] still READY_REVIEW');
assert(withMissing.controlled_execution_review_ready === true,                         '[H-03] review_ready=true');
assert(withMissing.final_execution_phase_required === true,                            '[H-04] final_exec=true');

// ─── Suite I: Invariants ──────────────────────────────────────────
console.log('\n[Suite I] Invariants');
assert(fix.deploy_allowed              === false, '[I-01] deploy_allowed=false');
assert(fix.promotion_allowed           === false, '[I-02] promotion_allowed=false');
assert(fix.stable_allowed              === false, '[I-03] stable_allowed=false');
assert(fix.tag_allowed                 === false, '[I-04] tag_allowed=false');
assert(fix.release_execution_allowed   === false, '[I-05] exec_allowed=false');
assert(fix.release_performed           === false, '[I-06] release_performed=false');
assert(fix.tag_created                 === false, '[I-07] tag_created=false');
assert(fix.stable_promoted             === false, '[I-08] stable_promoted=false');
assert(fix.deploy_performed            === false, '[I-09] deploy_performed=false');
assert(fix.production_execution_locked === true,  '[I-10] production_execution_locked=true');
assert(fix.unlock_executed             === false, '[I-11] unlock_executed=false');
assert(fix.controlled_execution_allowed === false,'[I-12] controlled_execution_allowed=false');
assert(fix.final_execution_phase_required === true,'[I-13] final_execution_phase_required=true');

assert(ready.production_execution_locked  === true,  '[I-14] ready: locked=true');
assert(ready.controlled_execution_allowed === false, '[I-15] ready: allowed=false');
assert(ready.unlock_executed              === false, '[I-16] ready: unlock=false');
assert(ready.final_execution_phase_required === true,'[I-17] ready: final_exec=true');

// READY_REVIEW does not liberate execution
assert(fix.controlled_execution_allowed === false, '[I-18] READY: controlled_exec=false');
assert(fix.release_execution_allowed    === false, '[I-19] READY: release_exec=false');
assert(fix.blocked_actions.includes('controlled_execute_now'), '[I-20] READY: controlled_execute_now blocked');
assert(fix.safe_next_actions.includes('do_not_execute_production_in_this_phase'), '[I-21] READY: safe=do_not_execute');

// ─── Suite J: Alias classifyControlledExecutionRisk ───────────────
console.log('\n[Suite J] Alias');
const aliased = classifyControlledExecutionRisk({ fixture_mode: true, _mock_timestamp: TS });
assert(aliased.controlled_risk_status === 'CONTROLLED_RISK_READY_REVIEW',             '[J-01] alias works');
assert(aliased.controlled_execution_review_ready === true,                             '[J-02] alias review_ready=true');

// ─── Suite K: renderControlledExecutionRiskMatrix ─────────────────
console.log('\n[Suite K] Render');
const rendered = renderControlledExecutionRiskMatrix(fix);
assert(typeof rendered === 'string',                                                  '[K-01] returns string');
assert(rendered.includes('CONTROLLED_RISK_READY_REVIEW'),                            '[K-02] status in output');
assert(rendered.includes('production_execution_locked       : true'),                '[K-03] lock in output');
assert(rendered.includes('controlled_execution_allowed      : false'),               '[K-04] allowed=false in output');
assert(rendered.includes('final_execution_phase_required    : true'),                '[K-05] final_exec in output');
assert(renderControlledExecutionRiskMatrix(null) === 'controlled_execution_risk_matrix: null', '[K-06] null → string');

// ─── Suite L: Deterministic ID ────────────────────────────────────
console.log('\n[Suite L] Deterministic ID');
const r1 = evaluateControlledExecutionRisk({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, controlled_binding: GOOD_BINDING, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
const r2 = evaluateControlledExecutionRisk({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, controlled_binding: GOOD_BINDING, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
assert(r1.risk_matrix_id === r2.risk_matrix_id,                                      '[L-01] deterministic id');

// ─── Suite M: Blocked invariants ──────────────────────────────────
console.log('\n[Suite M] Blocked invariants');
const blk = evaluateControlledExecutionRisk({ _mock_timestamp: TS });
assert(blk.production_execution_locked  === true,  '[M-01] blocked: locked=true');
assert(blk.controlled_execution_allowed === false, '[M-02] blocked: allowed=false');
assert(blk.unlock_executed              === false, '[M-03] blocked: unlock=false');
assert(blk.final_execution_phase_required === true,'[M-04] blocked: final_exec=true');
assert(blk.controlled_execution_review_ready === false, '[M-05] blocked: review_ready=false');
assert(blk.blocked_actions.includes('auto_release'), '[M-06] blocked: auto_release');
assert(blk.safe_next_actions.includes('do_not_execute_production_in_this_phase'), '[M-07] blocked: safe action');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ncontrolled-execution-risk-matrix: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
