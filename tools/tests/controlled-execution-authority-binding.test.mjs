#!/usr/bin/env node
/**
 * Controlled Execution Authority Binding — Unit Tests V66.2
 */

import {
  bindControlledExecutionAuthorityToBaseline,
  validateControlledExecutionAuthorityBinding,
  renderControlledExecutionAuthorityBinding,
  CONTROLLED_BINDING_STATUSES,
} from '../controlled-execution-authority-binding.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T00:00:00.000Z';

const GOOD_CONTRACT = {
  contract_ready: true,
  controlled_contract_id: 'cid-abc',
  contract_status: 'CONTROLLED_CONTRACT_READY_REVIEW',
  requested_execution_scope: 'review_controlled_deploy',
};

const GOOD_AUTHORITY = {
  authority_ready: true,
  controlled_authority_id: 'aid-xyz',
  authority_status: 'CONTROLLED_AUTHORITY_READY_REVIEW',
  authority_scope: 'review_controlled_deploy',
  evidence_acknowledged: true,
  unlock_governance_acknowledged: true,
  rollback_acknowledged: true,
  production_risk_acknowledged: true,
};

const GOOD_BASELINE = {
  baseline_ready: true,
  baseline_status: 'UNLOCK_GOVERNANCE_BASELINE_READY',
  baseline_hash: 'aabbcc112233',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CONTROLLED_BINDING_STATUSES),                                     '[A-01] statuses array');
assert(CONTROLLED_BINDING_STATUSES.length === 6,                                       '[A-02] 6 statuses');
assert(CONTROLLED_BINDING_STATUSES.includes('CONTROLLED_BINDING_BLOCKED_CONTRACT'),    '[A-03] BLOCKED_CONTRACT');
assert(CONTROLLED_BINDING_STATUSES.includes('CONTROLLED_BINDING_BLOCKED_AUTHORITY'),   '[A-04] BLOCKED_AUTHORITY');
assert(CONTROLLED_BINDING_STATUSES.includes('CONTROLLED_BINDING_BLOCKED_BASELINE'),    '[A-05] BLOCKED_BASELINE');
assert(CONTROLLED_BINDING_STATUSES.includes('CONTROLLED_BINDING_BLOCKED_SCOPE'),       '[A-06] BLOCKED_SCOPE');
assert(CONTROLLED_BINDING_STATUSES.includes('CONTROLLED_BINDING_BLOCKED_TEMPORAL'),    '[A-07] BLOCKED_TEMPORAL');
assert(CONTROLLED_BINDING_STATUSES.includes('CONTROLLED_BINDING_READY_REVIEW'),        '[A-08] READY_REVIEW');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = bindControlledExecutionAuthorityToBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.binding_status       === 'CONTROLLED_BINDING_READY_REVIEW',                '[B-02] status=READY_REVIEW');
assert(fix.binding_ready        === true,                                              '[B-03] binding_ready=true');
assert(fix.schema_version       === 'v66.2',                                          '[B-04] schema=v66.2');
assert(typeof fix.binding_id    === 'string' && fix.binding_id.length === 24,         '[B-05] id 24 chars');
assert(fix.contract_valid       === true,                                              '[B-06] contract_valid=true');
assert(fix.authority_valid      === true,                                              '[B-07] authority_valid=true');
assert(fix.unlock_baseline_ready === true,                                             '[B-08] unlock_baseline_ready=true');
assert(fix.controlled_execution_review_ready === true,                                 '[B-09] review_ready=true');
assert(fix.blocking_reason      === null,                                              '[B-10] blocking_reason=null');
assert(fix.created_at           === TS,                                               '[B-11] created_at=TS');

// ─── Suite C: Missing contract ────────────────────────────────────
console.log('\n[Suite C] Missing contract');
const noC = bindControlledExecutionAuthorityToBaseline({ controlled_authority: GOOD_AUTHORITY, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
assert(noC.binding_ready        === false,                                             '[C-01] blocked no contract');
assert(noC.binding_status       === 'CONTROLLED_BINDING_BLOCKED_CONTRACT',            '[C-02] status BLOCKED_CONTRACT');

const badC = bindControlledExecutionAuthorityToBaseline({ controlled_contract: { contract_ready: false }, controlled_authority: GOOD_AUTHORITY, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
assert(badC.binding_status      === 'CONTROLLED_BINDING_BLOCKED_CONTRACT',            '[C-03] not ready→BLOCKED_CONTRACT');

// ─── Suite D: Missing authority ───────────────────────────────────
console.log('\n[Suite D] Missing authority');
const noA = bindControlledExecutionAuthorityToBaseline({ controlled_contract: GOOD_CONTRACT, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
assert(noA.binding_ready        === false,                                             '[D-01] blocked no authority');
assert(noA.binding_status       === 'CONTROLLED_BINDING_BLOCKED_AUTHORITY',           '[D-02] status BLOCKED_AUTHORITY');

// ─── Suite E: Missing baseline ────────────────────────────────────
console.log('\n[Suite E] Missing baseline');
const noB = bindControlledExecutionAuthorityToBaseline({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, _mock_timestamp: TS });
assert(noB.binding_ready        === false,                                             '[E-01] blocked no baseline');
assert(noB.binding_status       === 'CONTROLLED_BINDING_BLOCKED_BASELINE',            '[E-02] status BLOCKED_BASELINE');

// ─── Suite F: Scope mismatch ──────────────────────────────────────
console.log('\n[Suite F] Scope mismatch');
const badScopeAuth = { ...GOOD_AUTHORITY, authority_scope: 'review_controlled_tag_creation' };
const scopeMismatch = bindControlledExecutionAuthorityToBaseline({ controlled_contract: GOOD_CONTRACT, controlled_authority: badScopeAuth, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
assert(scopeMismatch.binding_ready   === false,                                        '[F-01] blocked scope mismatch');
assert(scopeMismatch.binding_status  === 'CONTROLLED_BINDING_BLOCKED_SCOPE',          '[F-02] status BLOCKED_SCOPE');
assert(scopeMismatch.contract_scope  === 'review_controlled_deploy',                  '[F-03] contract_scope in output');
assert(scopeMismatch.authority_scope === 'review_controlled_tag_creation',            '[F-04] authority_scope in output');

// ─── Suite G: Valid binding ───────────────────────────────────────
console.log('\n[Suite G] Valid binding');
const valid = bindControlledExecutionAuthorityToBaseline({
  controlled_contract:         GOOD_CONTRACT,
  controlled_authority:        GOOD_AUTHORITY,
  unlock_governance_baseline:  GOOD_BASELINE,
  _mock_timestamp:             TS,
});
assert(valid.binding_ready        === true,                                            '[G-01] binding_ready=true');
assert(valid.binding_status       === 'CONTROLLED_BINDING_READY_REVIEW',              '[G-02] status=READY_REVIEW');
assert(valid.controlled_contract_id  === 'cid-abc',                                   '[G-03] contract_id set');
assert(valid.controlled_authority_id === 'aid-xyz',                                   '[G-04] authority_id set');
assert(valid.evidence_acknowledged  === true,                                          '[G-05] evidence_ack=true');
assert(valid.unlock_governance_acknowledged === true,                                  '[G-06] unlock_gov_ack=true');
assert(valid.controlled_execution_review_ready === true,                               '[G-07] review_ready=true');
assert(valid.blocking_reason       === null,                                           '[G-08] blocking_reason=null');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.deploy_allowed              === false, '[H-01] deploy_allowed=false');
assert(fix.promotion_allowed           === false, '[H-02] promotion_allowed=false');
assert(fix.stable_allowed              === false, '[H-03] stable_allowed=false');
assert(fix.tag_allowed                 === false, '[H-04] tag_allowed=false');
assert(fix.release_execution_allowed   === false, '[H-05] exec_allowed=false');
assert(fix.release_performed           === false, '[H-06] release_performed=false');
assert(fix.tag_created                 === false, '[H-07] tag_created=false');
assert(fix.stable_promoted             === false, '[H-08] stable_promoted=false');
assert(fix.deploy_performed            === false, '[H-09] deploy_performed=false');
assert(fix.production_execution_locked === true,  '[H-10] production_execution_locked=true');
assert(fix.unlock_executed             === false, '[H-11] unlock_executed=false');
assert(fix.controlled_review_only      === true,  '[H-12] controlled_review_only=true');
assert(fix.controlled_execution_allowed === false,'[H-13] controlled_execution_allowed=false');
assert(fix.final_execution_phase_required === true,'[H-14] final_execution_phase_required=true');

assert(valid.production_execution_locked  === true,  '[H-15] valid: locked=true');
assert(valid.controlled_execution_allowed === false, '[H-16] valid: allowed=false');
assert(valid.unlock_executed              === false, '[H-17] valid: unlock=false');

// ─── Suite I: validateControlledExecutionAuthorityBinding ─────────
console.log('\n[Suite I] Validate');
const vNull = validateControlledExecutionAuthorityBinding(null);
assert(vNull.binding_status === 'CONTROLLED_BINDING_BLOCKED_CONTRACT',                '[I-01] null→BLOCKED_CONTRACT');
assert(vNull.binding_ready  === false,                                                '[I-02] null ready=false');

const vOk = validateControlledExecutionAuthorityBinding(fix);
assert(vOk.valid === true,                                                            '[I-03] fixture valid');
assert(vOk.binding_id === fix.binding_id,                                            '[I-04] id propagated');
assert(vOk.production_execution_locked === true,                                      '[I-05] locked=true');
assert(vOk.controlled_execution_allowed === false,                                    '[I-06] allowed=false');

const badSchema = validateControlledExecutionAuthorityBinding({ schema_version: 'v1.0', binding_id: 'abc', production_execution_locked: true, controlled_execution_allowed: false, unlock_executed: false });
assert(badSchema.binding_status === 'CONTROLLED_BINDING_BLOCKED_CONTRACT',            '[I-07] bad schema→BLOCKED');

// ─── Suite J: renderControlledExecutionAuthorityBinding ───────────
console.log('\n[Suite J] Render');
const rendered = renderControlledExecutionAuthorityBinding(fix);
assert(typeof rendered === 'string',                                                  '[J-01] returns string');
assert(rendered.includes('CONTROLLED_BINDING_READY_REVIEW'),                         '[J-02] status in output');
assert(rendered.includes('production_execution_locked     : true'),                  '[J-03] lock in output');
assert(rendered.includes('controlled_execution_allowed    : false'),                 '[J-04] allowed=false in output');
assert(rendered.includes('unlock_executed                 : false'),                 '[J-05] unlock_executed in output');
assert(rendered.includes('final_execution_phase_required  : true'),                  '[J-06] final_exec in output');
assert(renderControlledExecutionAuthorityBinding(null) === 'controlled_execution_authority_binding: null', '[J-07] null → string');

// ─── Suite K: Deterministic ID ────────────────────────────────────
console.log('\n[Suite K] Deterministic ID');
const b1 = bindControlledExecutionAuthorityToBaseline({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
const b2 = bindControlledExecutionAuthorityToBaseline({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, unlock_governance_baseline: GOOD_BASELINE, _mock_timestamp: TS });
assert(b1.binding_id === b2.binding_id,                                              '[K-01] deterministic id');

// ─── Suite L: Blocked invariants ──────────────────────────────────
console.log('\n[Suite L] Blocked invariants');
const blk = bindControlledExecutionAuthorityToBaseline({ _mock_timestamp: TS });
assert(blk.production_execution_locked  === true,  '[L-01] blocked: locked=true');
assert(blk.controlled_execution_allowed === false, '[L-02] blocked: allowed=false');
assert(blk.unlock_executed              === false, '[L-03] blocked: unlock=false');
assert(blk.final_execution_phase_required === true,'[L-04] blocked: final_exec=true');
assert(blk.controlled_execution_review_ready === false, '[L-05] blocked: review_ready=false');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ncontrolled-execution-authority-binding: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
