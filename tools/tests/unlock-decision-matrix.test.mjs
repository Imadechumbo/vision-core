#!/usr/bin/env node
/**
 * Unlock Decision Matrix — Unit Tests V62.0
 */

import {
  evaluateUnlockDecision,
  classifyUnlockDecision,
  renderUnlockDecisionMatrix,
  UNLOCK_DECISION_STATUSES,
  UNLOCK_DECISION_BLOCKED_ACTIONS,
  UNLOCK_DECISION_SAFE_NEXT_ACTIONS,
} from '../unlock-decision-matrix.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const FIXTURE_CONTRACT = {
  contract_ready:      true,
  unlock_contract_id:  'contract-xyz',
  contract_status:     'UNLOCK_CONTRACT_READY_REVIEW',
};
const FIXTURE_AUTHORITY = {
  authority_ready:     true,
  unlock_authority_id: 'authority-xyz',
  authority_status:    'UNLOCK_AUTHORITY_READY_REVIEW',
};
const FIXTURE_BINDING = {
  binding_ready:       true,
  binding_id:          'binding-xyz',
  binding_status:      'UNLOCK_BINDING_READY_REVIEW',
};
const FIXTURE_BASELINE = {
  baseline_ready:      true,
  baseline_status:     'REAL_GATE_BASELINE_READY',
  baseline_version:    'v60.0',
};

const VALID_PARAMS = {
  unlock_contract:    FIXTURE_CONTRACT,
  unlock_authority:   FIXTURE_AUTHORITY,
  unlock_binding:     FIXTURE_BINDING,
  real_gate_baseline: FIXTURE_BASELINE,
  _mock_timestamp:    TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(UNLOCK_DECISION_STATUSES),                                        '[A-01] statuses array');
assert(UNLOCK_DECISION_STATUSES.length === 6,                                          '[A-02] 6 statuses');
assert(UNLOCK_DECISION_STATUSES.includes('UNLOCK_DECISION_BLOCKED_CONTRACT'),          '[A-03] BLOCKED_CONTRACT');
assert(UNLOCK_DECISION_STATUSES.includes('UNLOCK_DECISION_BLOCKED_AUTHORITY'),         '[A-04] BLOCKED_AUTHORITY');
assert(UNLOCK_DECISION_STATUSES.includes('UNLOCK_DECISION_BLOCKED_BINDING'),           '[A-05] BLOCKED_BINDING');
assert(UNLOCK_DECISION_STATUSES.includes('UNLOCK_DECISION_BLOCKED_BASELINE'),          '[A-06] BLOCKED_BASELINE');
assert(UNLOCK_DECISION_STATUSES.includes('UNLOCK_DECISION_READY_REVIEW'),              '[A-07] READY_REVIEW');
assert(UNLOCK_DECISION_STATUSES.includes('UNLOCK_DECISION_NEEDS_FUTURE_EXECUTION_PHASE'), '[A-08] FUTURE_PHASE');

assert(Array.isArray(UNLOCK_DECISION_BLOCKED_ACTIONS),                                 '[A-09] blocked_actions array');
assert(UNLOCK_DECISION_BLOCKED_ACTIONS.length === 9,                                   '[A-10] 9 blocked actions');
assert(UNLOCK_DECISION_BLOCKED_ACTIONS.includes('auto_release'),                       '[A-11] auto_release blocked');
assert(UNLOCK_DECISION_BLOCKED_ACTIONS.includes('unlock_execute_now'),                 '[A-12] unlock_execute_now blocked');
assert(UNLOCK_DECISION_BLOCKED_ACTIONS.includes('git_push'),                           '[A-13] git_push blocked');
assert(UNLOCK_DECISION_BLOCKED_ACTIONS.includes('production_write'),                   '[A-14] production_write blocked');

assert(Array.isArray(UNLOCK_DECISION_SAFE_NEXT_ACTIONS),                               '[A-15] safe_next_actions array');
assert(UNLOCK_DECISION_SAFE_NEXT_ACTIONS.length === 6,                                 '[A-16] 6 safe next actions');
assert(UNLOCK_DECISION_SAFE_NEXT_ACTIONS.includes('do_not_execute_production_in_this_phase'), '[A-17] do_not_execute included');
assert(UNLOCK_DECISION_SAFE_NEXT_ACTIONS.includes('prepare_future_controlled_execution_contract'), '[A-18] future contract included');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = evaluateUnlockDecision({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                                '[B-01] returns object');
assert(fixture.unlock_decision_status    === 'UNLOCK_DECISION_READY_REVIEW',          '[B-02] status=READY_REVIEW');
assert(fixture.unlock_review_ready       === true,                                     '[B-03] unlock_review_ready=true');
assert(fixture.schema_version            === 'v62.0',                                  '[B-04] schema=v62.0');
assert(typeof fixture.decision_id        === 'string' && fixture.decision_id.length === 24, '[B-05] id 24 chars');
assert(fixture.decision_matrix?.contract_valid  === true,                              '[B-06] contract_valid=true');
assert(fixture.decision_matrix?.authority_valid === true,                              '[B-07] authority_valid=true');
assert(fixture.decision_matrix?.binding_ready   === true,                              '[B-08] binding_ready=true');
assert(fixture.decision_matrix?.baseline_ready  === true,                              '[B-09] baseline_ready=true');
assert(fixture.production_execution_locked === true,                                   '[B-10] production_execution_locked=true');
assert(fixture.unlock_executed           === false,                                    '[B-11] unlock_executed=false');
assert(fixture.unlock_review_only        === true,                                     '[B-12] unlock_review_only=true');
assert(fixture.future_execution_phase_required === true,                               '[B-13] future_execution_phase_required=true');
assert(fixture.blocking_reason           === null,                                     '[B-14] blocking_reason=null');
assert(Array.isArray(fixture.missing_requirements) && fixture.missing_requirements.length === 0, '[B-15] missing=[]');

// ─── Suite C: Blocked — missing contract ──────────────────────────
console.log('\n[Suite C] Blocked — missing contract');
const noContract = evaluateUnlockDecision({ ...VALID_PARAMS, unlock_contract: null });
assert(noContract.unlock_decision_status === 'UNLOCK_DECISION_BLOCKED_CONTRACT',      '[C-01] no contract → BLOCKED_CONTRACT');
assert(noContract.unlock_review_ready    === false,                                    '[C-02] ready=false');
assert(noContract.missing_requirements?.includes('unlock_contract'),                   '[C-03] missing requirement listed');

const badContract = evaluateUnlockDecision({ ...VALID_PARAMS, unlock_contract: { contract_ready: false } });
assert(badContract.unlock_decision_status === 'UNLOCK_DECISION_BLOCKED_CONTRACT',     '[C-04] bad contract → BLOCKED_CONTRACT');

// ─── Suite D: Blocked — missing authority ─────────────────────────
console.log('\n[Suite D] Blocked — missing authority');
const noAuthority = evaluateUnlockDecision({ ...VALID_PARAMS, unlock_authority: null });
assert(noAuthority.unlock_decision_status === 'UNLOCK_DECISION_BLOCKED_AUTHORITY',    '[D-01] no authority → BLOCKED_AUTHORITY');
assert(noAuthority.unlock_review_ready    === false,                                   '[D-02] ready=false');
assert(noAuthority.missing_requirements?.includes('unlock_authority'),                 '[D-03] missing requirement listed');

const badAuthority = evaluateUnlockDecision({ ...VALID_PARAMS, unlock_authority: { authority_ready: false } });
assert(badAuthority.unlock_decision_status === 'UNLOCK_DECISION_BLOCKED_AUTHORITY',   '[D-04] bad authority → BLOCKED_AUTHORITY');

// ─── Suite E: Blocked — missing binding ───────────────────────────
console.log('\n[Suite E] Blocked — missing binding');
const noBinding = evaluateUnlockDecision({ ...VALID_PARAMS, unlock_binding: null });
assert(noBinding.unlock_decision_status  === 'UNLOCK_DECISION_BLOCKED_BINDING',       '[E-01] no binding → BLOCKED_BINDING');
assert(noBinding.unlock_review_ready     === false,                                    '[E-02] ready=false');
assert(noBinding.missing_requirements?.includes('unlock_binding'),                     '[E-03] missing requirement listed');

const badBinding = evaluateUnlockDecision({ ...VALID_PARAMS, unlock_binding: { binding_ready: false } });
assert(badBinding.unlock_decision_status === 'UNLOCK_DECISION_BLOCKED_BINDING',       '[E-04] bad binding → BLOCKED_BINDING');

// ─── Suite F: Blocked — missing baseline ──────────────────────────
console.log('\n[Suite F] Blocked — missing baseline');
const noBaseline = evaluateUnlockDecision({ ...VALID_PARAMS, real_gate_baseline: null });
assert(noBaseline.unlock_decision_status === 'UNLOCK_DECISION_BLOCKED_BASELINE',      '[F-01] no baseline → BLOCKED_BASELINE');
assert(noBaseline.unlock_review_ready    === false,                                    '[F-02] ready=false');
assert(noBaseline.missing_requirements?.includes('real_gate_baseline'),                '[F-03] missing requirement listed');

const badBaseline = evaluateUnlockDecision({ ...VALID_PARAMS, real_gate_baseline: { baseline_ready: false } });
assert(badBaseline.unlock_decision_status === 'UNLOCK_DECISION_BLOCKED_BASELINE',     '[F-04] bad baseline → BLOCKED_BASELINE');

// ─── Suite G: Full ready review ───────────────────────────────────
console.log('\n[Suite G] Full ready review');
const full = evaluateUnlockDecision(VALID_PARAMS);
assert(full.unlock_decision_status       === 'UNLOCK_DECISION_READY_REVIEW',          '[G-01] status=READY_REVIEW');
assert(full.unlock_review_ready          === true,                                     '[G-02] unlock_review_ready=true');
assert(typeof full.decision_id           === 'string' && full.decision_id.length === 24, '[G-03] decision_id 24 chars');
assert(full.schema_version               === 'v62.0',                                  '[G-04] schema=v62.0');
assert(full.decision_matrix?.contract_valid  === true,                                 '[G-05] contract_valid=true');
assert(full.decision_matrix?.authority_valid === true,                                 '[G-06] authority_valid=true');
assert(full.decision_matrix?.binding_ready   === true,                                 '[G-07] binding_ready=true');
assert(full.decision_matrix?.baseline_ready  === true,                                 '[G-08] baseline_ready=true');
assert(full.blocking_reason              === null,                                     '[G-09] blocking_reason=null');
assert(Array.isArray(full.missing_requirements) && full.missing_requirements.length === 0, '[G-10] no missing');
assert(full.blocked_actions?.length      === 9,                                        '[G-11] 9 blocked actions');
assert(full.safe_next_actions?.length    === 6,                                        '[G-12] 6 safe actions');

// ─── Suite H: Future execution phase required ─────────────────────
console.log('\n[Suite H] Future execution phase required');
assert(full.future_execution_phase_required === true,                                  '[H-01] full: future_exec_required=true');
assert(fixture.future_execution_phase_required === true,                               '[H-02] fixture: future_exec_required=true');
assert(noContract.future_execution_phase_required === true,                            '[H-03] blocked: future_exec_required=true');
assert(noAuthority.future_execution_phase_required === true,                           '[H-04] blocked auth: future_exec_required=true');
assert(noBinding.future_execution_phase_required === true,                             '[H-05] blocked bind: future_exec_required=true');
assert(noBaseline.future_execution_phase_required === true,                            '[H-06] blocked base: future_exec_required=true');

// ─── Suite I: Alias ───────────────────────────────────────────────
console.log('\n[Suite I] Alias');
assert(typeof classifyUnlockDecision     === 'function',                               '[I-01] alias is function');
const aliasResult = classifyUnlockDecision(VALID_PARAMS);
assert(aliasResult.unlock_decision_status === 'UNLOCK_DECISION_READY_REVIEW',         '[I-02] alias same result');

// ─── Suite J: renderUnlockDecisionMatrix ─────────────────────────
console.log('\n[Suite J] Render');
const rendered = renderUnlockDecisionMatrix(full);
assert(typeof rendered                   === 'string',                                 '[J-01] returns string');
assert(rendered.includes('UNLOCK_DECISION_READY_REVIEW'),                             '[J-02] status in output');
assert(rendered.includes('production_execution_locked  : true'),                      '[J-03] lock in output');
assert(rendered.includes('unlock_executed              : false'),                      '[J-04] unlock_executed in output');
assert(rendered.includes('release_execution_allowed    : false'),                      '[J-05] exec_allowed in output');
assert(rendered.includes('future_execution_required    : true'),                       '[J-06] future_exec in output');
assert(renderUnlockDecisionMatrix(null)  === 'unlock_decision: null',                 '[J-07] null → string');

// ─── Suite K: Invariants — all cases ─────────────────────────────
console.log('\n[Suite K] Invariants');
const cases = [fixture, noContract, noAuthority, noBinding, noBaseline, full];
for (const [i, o] of cases.entries()) {
  assert(o.deploy_allowed              === false, `[K] case ${i}: deploy_allowed=false`);
  assert(o.promotion_allowed           === false, `[K] case ${i}: promotion_allowed=false`);
  assert(o.stable_allowed              === false, `[K] case ${i}: stable_allowed=false`);
  assert(o.tag_allowed                 === false, `[K] case ${i}: tag_allowed=false`);
  assert(o.release_execution_allowed   === false, `[K] case ${i}: exec_allowed=false`);
  assert(o.release_performed           === false, `[K] case ${i}: release_performed=false`);
  assert(o.tag_created                 === false, `[K] case ${i}: tag_created=false`);
  assert(o.stable_promoted             === false, `[K] case ${i}: stable_promoted=false`);
  assert(o.deploy_performed            === false, `[K] case ${i}: deploy_performed=false`);
  assert(o.production_execution_locked === true,  `[K] case ${i}: production_execution_locked=true`);
  assert(o.unlock_executed             === false, `[K] case ${i}: unlock_executed=false`);
  assert(o.unlock_review_only          === true,  `[K] case ${i}: unlock_review_only=true`);
  assert(o.future_execution_phase_required === true, `[K] case ${i}: future_execution_phase_required=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nunlock-decision-matrix: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
