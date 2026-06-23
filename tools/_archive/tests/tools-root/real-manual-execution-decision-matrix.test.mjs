#!/usr/bin/env node
/**
 * Real Manual Execution Decision Matrix — Unit Tests V72.1
 */

import {
  evaluateRealManualExecutionDecision,
  renderRealManualExecutionDecisionMatrix,
  REAL_EXEC_DECISION_STATUSES,
  REAL_EXEC_DECISION_BLOCKED_ACTIONS,
  REAL_EXEC_DECISION_SAFE_NEXT_ACTIONS,
} from '../real-manual-execution-decision-matrix.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T06:00:00.000Z';

const GOOD_CONTRACT = { contract_status: 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW', unlock_execution_contract_id: 'uc-id' };
const GOOD_BINDING  = { binding_status: 'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW', binding_id: 'ub-id' };
const GOOD_DRY_RUN  = { unlock_dry_run_status: 'UNLOCK_DRY_RUN_READY', unlock_dry_run_id: 'dr-id' };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REAL_EXEC_DECISION_STATUSES),                                     '[A-01] statuses array');
assert(REAL_EXEC_DECISION_STATUSES.length === 5,                                       '[A-02] 5 statuses');
assert(REAL_EXEC_DECISION_STATUSES.includes('REAL_EXEC_DECISION_BLOCKED_CONTRACT'),   '[A-03] BLOCKED_CONTRACT');
assert(REAL_EXEC_DECISION_STATUSES.includes('REAL_EXEC_DECISION_BLOCKED_BINDING'),    '[A-04] BLOCKED_BINDING');
assert(REAL_EXEC_DECISION_STATUSES.includes('REAL_EXEC_DECISION_BLOCKED_DRY_RUN'),   '[A-05] BLOCKED_DRY_RUN');
assert(REAL_EXEC_DECISION_STATUSES.includes('REAL_EXEC_DECISION_DRY_RUN_READY'),     '[A-06] DRY_RUN_READY');
assert(REAL_EXEC_DECISION_STATUSES.includes('REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND'), '[A-07] REQUIRES_EXPLICIT');

assert(Array.isArray(REAL_EXEC_DECISION_BLOCKED_ACTIONS),                              '[A-08] blocked_actions array');
assert(REAL_EXEC_DECISION_BLOCKED_ACTIONS.length === 9,                                '[A-09] 9 blocked actions');
assert(REAL_EXEC_DECISION_BLOCKED_ACTIONS.includes('auto_unlock'),                     '[A-10] auto_unlock blocked');
assert(REAL_EXEC_DECISION_BLOCKED_ACTIONS.includes('auto_release'),                    '[A-11] auto_release blocked');
assert(REAL_EXEC_DECISION_BLOCKED_ACTIONS.includes('auto_tag'),                        '[A-12] auto_tag blocked');
assert(REAL_EXEC_DECISION_BLOCKED_ACTIONS.includes('git_push'),                        '[A-13] git_push blocked');
assert(REAL_EXEC_DECISION_BLOCKED_ACTIONS.includes('production_write'),                '[A-14] production_write blocked');

assert(Array.isArray(REAL_EXEC_DECISION_SAFE_NEXT_ACTIONS),                            '[A-15] safe_actions array');
assert(REAL_EXEC_DECISION_SAFE_NEXT_ACTIONS.length === 5,                              '[A-16] 5 safe actions');
assert(REAL_EXEC_DECISION_SAFE_NEXT_ACTIONS.includes('do_not_execute_production_in_this_phase'), '[A-17] do_not_execute safe');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = evaluateRealManualExecutionDecision({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.real_execution_decision_status === 'REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND', '[B-02] status=REQUIRES_EXPLICIT');
assert(fix.real_execution_phase_ready   === true,                                      '[B-03] phase_ready=true');
assert(fix.schema_version               === 'v72.1',                                   '[B-04] schema=v72.1');
assert(typeof fix.decision_id === 'string' && fix.decision_id.length === 24,           '[B-05] id 24 chars');
assert(fix.dry_run_verified             === true,                                      '[B-06] dry_run_verified=true');
assert(fix.blocking_reason              === null,                                      '[B-07] blocking_reason=null');
assert(fix.created_at                   === TS,                                        '[B-08] created_at=TS');
assert(Array.isArray(fix.blocked_actions),                                             '[B-09] blocked_actions array');
assert(Array.isArray(fix.safe_next_actions),                                           '[B-10] safe_next_actions array');

// ─── Suite C: Blocked — missing contract ─────────────────────────
console.log('\n[Suite C] Missing contract');
const noC = evaluateRealManualExecutionDecision({ unlock_authority_binding: GOOD_BINDING, unlock_dry_run: GOOD_DRY_RUN, _mock_timestamp: TS });
assert(noC.real_execution_decision_status === 'REAL_EXEC_DECISION_BLOCKED_CONTRACT',  '[C-01] BLOCKED_CONTRACT');
assert(noC.real_execution_phase_ready     === false,                                   '[C-02] phase_ready=false');

// ─── Suite D: Blocked — missing binding ──────────────────────────
console.log('\n[Suite D] Missing binding');
const noB = evaluateRealManualExecutionDecision({ unlock_execution_contract: GOOD_CONTRACT, unlock_dry_run: GOOD_DRY_RUN, _mock_timestamp: TS });
assert(noB.real_execution_decision_status === 'REAL_EXEC_DECISION_BLOCKED_BINDING',   '[D-01] BLOCKED_BINDING');

// ─── Suite E: Blocked — missing dry-run ─────────────────────────
console.log('\n[Suite E] Missing dry-run');
const noDR = evaluateRealManualExecutionDecision({ unlock_execution_contract: GOOD_CONTRACT, unlock_authority_binding: GOOD_BINDING, _mock_timestamp: TS });
assert(noDR.real_execution_decision_status === 'REAL_EXEC_DECISION_BLOCKED_DRY_RUN', '[E-01] BLOCKED_DRY_RUN');

// ─── Suite F: Full decision requires explicit command ─────────────
console.log('\n[Suite F] Full decision');
const full = evaluateRealManualExecutionDecision({
  unlock_execution_contract: GOOD_CONTRACT,
  unlock_authority_binding:  GOOD_BINDING,
  unlock_dry_run:            GOOD_DRY_RUN,
  _mock_timestamp:           TS,
});
assert(full.real_execution_phase_ready === true,                                        '[F-01] phase_ready=true');
assert(full.real_execution_decision_status === 'REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND', '[F-02] REQUIRES_EXPLICIT');
assert(full.dry_run_verified           === true,                                        '[F-03] dry_run_verified=true');
assert(full.blocked_actions.includes('auto_unlock'),                                    '[F-04] auto actions blocked');

// ─── Suite G: Invariants ──────────────────────────────────────────
console.log('\n[Suite G] Invariants');
assert(fix.production_execution_locked      === true,  '[G-01] locked=true');
assert(fix.unlock_executed                  === false, '[G-02] unlock_executed=false');
assert(fix.real_execution_armed             === false, '[G-03] armed=false');
assert(fix.explicit_real_command_required   === true,  '[G-04] explicit_required=true');
assert(fix.deploy_allowed                   === false, '[G-05] deploy_allowed=false');
assert(fix.promotion_allowed                === false, '[G-06] promotion_allowed=false');
assert(fix.stable_allowed                   === false, '[G-07] stable_allowed=false');
assert(fix.tag_allowed                      === false, '[G-08] tag_allowed=false');
assert(fix.release_execution_allowed        === false, '[G-09] release_exec=false');
assert(fix.release_performed                === false, '[G-10] release_performed=false');
assert(fix.tag_created                      === false, '[G-11] tag_created=false');
assert(fix.stable_promoted                  === false, '[G-12] stable_promoted=false');
assert(fix.deploy_performed                 === false, '[G-13] deploy_performed=false');

assert(noC.production_execution_locked      === true,  '[G-14] blocked: locked=true');
assert(noC.explicit_real_command_required   === true,  '[G-15] blocked: explicit_required=true');

// ─── Suite H: render ─────────────────────────────────────────────
console.log('\n[Suite H] Render');
const rendered = renderRealManualExecutionDecisionMatrix(fix);
assert(typeof rendered === 'string',                                                    '[H-01] returns string');
assert(rendered.includes('REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND'),         '[H-02] status in output');
assert(rendered.includes('production_execution_locked    : true'),                    '[H-03] lock in output');
assert(rendered.includes('explicit_real_command_required : true'),                    '[H-04] explicit in output');
assert(rendered.includes('unlock_executed                : false'),                   '[H-05] unlock=false');
assert(renderRealManualExecutionDecisionMatrix(null) === 'real_manual_execution_decision_matrix: null', '[H-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-manual-execution-decision-matrix: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
