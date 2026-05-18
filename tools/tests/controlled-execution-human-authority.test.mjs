#!/usr/bin/env node
/**
 * Controlled Execution Human Authority — Unit Tests V66.1
 */

import {
  createControlledExecutionHumanAuthority,
  validateControlledExecutionHumanAuthority,
  bindControlledExecutionAuthority,
  renderControlledExecutionHumanAuthoritySummary,
  CONTROLLED_AUTHORITY_STATUSES,
  REQUIRED_CONTROLLED_CONFIRMATION_PHRASE,
  CONTROLLED_AUTHORITY_DENIED_CAPABILITIES,
} from '../controlled-execution-human-authority.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T00:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CONTROLLED_AUTHORITY_STATUSES),                                   '[A-01] statuses array');
assert(CONTROLLED_AUTHORITY_STATUSES.length === 7,                                     '[A-02] 7 statuses');
assert(CONTROLLED_AUTHORITY_STATUSES.includes('CONTROLLED_AUTHORITY_MISSING'),         '[A-03] MISSING');
assert(CONTROLLED_AUTHORITY_STATUSES.includes('CONTROLLED_AUTHORITY_INVALID'),         '[A-04] INVALID');
assert(CONTROLLED_AUTHORITY_STATUSES.includes('CONTROLLED_AUTHORITY_REJECTED'),        '[A-05] REJECTED');
assert(CONTROLLED_AUTHORITY_STATUSES.includes('CONTROLLED_AUTHORITY_EXPIRED'),         '[A-06] EXPIRED');
assert(CONTROLLED_AUTHORITY_STATUSES.includes('CONTROLLED_AUTHORITY_SCOPE_MISMATCH'), '[A-07] SCOPE_MISMATCH');
assert(CONTROLLED_AUTHORITY_STATUSES.includes('CONTROLLED_AUTHORITY_PHRASE_MISMATCH'),'[A-08] PHRASE_MISMATCH');
assert(CONTROLLED_AUTHORITY_STATUSES.includes('CONTROLLED_AUTHORITY_READY_REVIEW'),   '[A-09] READY_REVIEW');

assert(typeof REQUIRED_CONTROLLED_CONFIRMATION_PHRASE === 'string',                    '[A-10] phrase is string');
assert(REQUIRED_CONTROLLED_CONFIRMATION_PHRASE.length > 10,                            '[A-11] phrase not empty');
assert(REQUIRED_CONTROLLED_CONFIRMATION_PHRASE.includes('CONTROLLED EXECUTION REVIEW ONLY'), '[A-12] phrase content');
assert(REQUIRED_CONTROLLED_CONFIRMATION_PHRASE.includes('DOES NOT EXECUTE'),           '[A-13] phrase does not execute');

assert(Array.isArray(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES),                        '[A-14] denied_caps array');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.length === 10,                         '[A-15] 10 denied caps');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.includes('controlled_execution_execute'), '[A-16] controlled_execute denied');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.includes('release_execution'),         '[A-17] release denied');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.includes('tag_creation'),              '[A-18] tag denied');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.includes('stable_promotion'),          '[A-19] stable denied');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.includes('deploy_execution'),          '[A-20] deploy denied');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.includes('unlock_execution'),          '[A-21] unlock denied');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.includes('git_push'),                  '[A-22] git_push denied');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.includes('production_write'),          '[A-23] production_write denied');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.includes('evidence_override'),         '[A-24] evidence_override denied');
assert(CONTROLLED_AUTHORITY_DENIED_CAPABILITIES.includes('go_core_override'),          '[A-25] go_core_override denied');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = createControlledExecutionHumanAuthority({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.authority_status      === 'CONTROLLED_AUTHORITY_READY_REVIEW',             '[B-02] status=READY_REVIEW');
assert(fix.authority_ready       === true,                                             '[B-03] authority_ready=true');
assert(fix.schema_version        === 'v66.1',                                         '[B-04] schema=v66.1');
assert(typeof fix.controlled_authority_id === 'string' && fix.controlled_authority_id.length === 24, '[B-05] id 24 chars');
assert(fix.authority_decision    === 'approved',                                       '[B-06] decision=approved');
assert(fix.confirmation_phrase   === REQUIRED_CONTROLLED_CONFIRMATION_PHRASE,         '[B-07] phrase matches');
assert(fix.evidence_acknowledged === true,                                             '[B-08] evidence_acknowledged=true');
assert(fix.unlock_governance_acknowledged === true,                                    '[B-09] unlock_gov_acknowledged=true');
assert(fix.production_risk_acknowledged === true,                                      '[B-10] production_risk=true');
assert(fix.rollback_acknowledged === true,                                             '[B-11] rollback=true');
assert(Array.isArray(fix.denied_capabilities) && fix.denied_capabilities.length === 10, '[B-12] 10 denied caps');
assert(fix.blocking_reason       === null,                                             '[B-13] blocking_reason=null');

// ─── Suite C: Rejected (no approved decision) ─────────────────────
console.log('\n[Suite C] Rejected');
const rej = createControlledExecutionHumanAuthority({ _mock_timestamp: TS });
assert(rej.authority_ready       === false,                                            '[C-01] blocked');
assert(rej.authority_status      === 'CONTROLLED_AUTHORITY_REJECTED',                 '[C-02] status=REJECTED');

const rejBad = createControlledExecutionHumanAuthority({ authority_decision: 'denied', _mock_timestamp: TS });
assert(rejBad.authority_status   === 'CONTROLLED_AUTHORITY_REJECTED',                 '[C-03] denied→REJECTED');

// ─── Suite D: Phrase mismatch ─────────────────────────────────────
console.log('\n[Suite D] Phrase mismatch');
const phr = createControlledExecutionHumanAuthority({
  authority_decision: 'approved', confirmation_phrase: 'wrong phrase',
  evidence_acknowledged: true, unlock_governance_acknowledged: true,
  production_risk_acknowledged: true, rollback_acknowledged: true, _mock_timestamp: TS,
});
assert(phr.authority_ready       === false,                                            '[D-01] blocked bad phrase');
assert(phr.authority_status      === 'CONTROLLED_AUTHORITY_PHRASE_MISMATCH',          '[D-02] status=PHRASE_MISMATCH');

// ─── Suite E: Missing acknowledgements ────────────────────────────
console.log('\n[Suite E] Missing acknowledgements');
const noEvid = createControlledExecutionHumanAuthority({
  authority_decision: 'approved', confirmation_phrase: REQUIRED_CONTROLLED_CONFIRMATION_PHRASE,
  evidence_acknowledged: false, unlock_governance_acknowledged: true,
  production_risk_acknowledged: true, rollback_acknowledged: true, _mock_timestamp: TS,
});
assert(noEvid.authority_status   === 'CONTROLLED_AUTHORITY_INVALID',                  '[E-01] evidence_ack required');
assert(noEvid.blocking_reason    === 'evidence_acknowledged_required',                '[E-02] reason evidence');

const noUnlockGov = createControlledExecutionHumanAuthority({
  authority_decision: 'approved', confirmation_phrase: REQUIRED_CONTROLLED_CONFIRMATION_PHRASE,
  evidence_acknowledged: true, unlock_governance_acknowledged: false,
  production_risk_acknowledged: true, rollback_acknowledged: true, _mock_timestamp: TS,
});
assert(noUnlockGov.authority_status === 'CONTROLLED_AUTHORITY_INVALID',               '[E-03] unlock_gov required');
assert(noUnlockGov.blocking_reason  === 'unlock_governance_acknowledged_required',    '[E-04] reason unlock_gov');

const noProdRisk = createControlledExecutionHumanAuthority({
  authority_decision: 'approved', confirmation_phrase: REQUIRED_CONTROLLED_CONFIRMATION_PHRASE,
  evidence_acknowledged: true, unlock_governance_acknowledged: true,
  production_risk_acknowledged: false, rollback_acknowledged: true, _mock_timestamp: TS,
});
assert(noProdRisk.authority_status === 'CONTROLLED_AUTHORITY_INVALID',                '[E-05] prod_risk required');

const noRollback = createControlledExecutionHumanAuthority({
  authority_decision: 'approved', confirmation_phrase: REQUIRED_CONTROLLED_CONFIRMATION_PHRASE,
  evidence_acknowledged: true, unlock_governance_acknowledged: true,
  production_risk_acknowledged: true, rollback_acknowledged: false, _mock_timestamp: TS,
});
assert(noRollback.authority_status === 'CONTROLLED_AUTHORITY_INVALID',                '[E-06] rollback required');

// ─── Suite F: Valid authority ──────────────────────────────────────
console.log('\n[Suite F] Valid authority');
const valid = createControlledExecutionHumanAuthority({
  authority_decision:             'approved',
  confirmation_phrase:            REQUIRED_CONTROLLED_CONFIRMATION_PHRASE,
  evidence_acknowledged:          true,
  unlock_governance_acknowledged: true,
  production_risk_acknowledged:   true,
  rollback_acknowledged:          true,
  confirmed_by:                   'release-lead',
  confirmer_role:                 'release_authority',
  controlled_contract_id:         'contract-abc',
  authority_scope:                'review_controlled_full_manual_execution',
  _mock_timestamp:                TS,
});
assert(valid.authority_ready       === true,                                           '[F-01] authority_ready=true');
assert(valid.authority_status      === 'CONTROLLED_AUTHORITY_READY_REVIEW',           '[F-02] status=READY_REVIEW');
assert(valid.schema_version        === 'v66.1',                                       '[F-03] schema=v66.1');
assert(typeof valid.controlled_authority_id === 'string' && valid.controlled_authority_id.length === 24, '[F-04] id 24 chars');
assert(valid.controlled_contract_id === 'contract-abc',                               '[F-05] contract_id set');
assert(valid.authority_scope       === 'review_controlled_full_manual_execution',     '[F-06] scope set');
assert(valid.blocking_reason       === null,                                          '[F-07] blocking_reason=null');

// ─── Suite G: Invariants ──────────────────────────────────────────
console.log('\n[Suite G] Invariants');
assert(fix.deploy_allowed              === false, '[G-01] deploy_allowed=false');
assert(fix.promotion_allowed           === false, '[G-02] promotion_allowed=false');
assert(fix.stable_allowed              === false, '[G-03] stable_allowed=false');
assert(fix.tag_allowed                 === false, '[G-04] tag_allowed=false');
assert(fix.release_execution_allowed   === false, '[G-05] exec_allowed=false');
assert(fix.release_performed           === false, '[G-06] release_performed=false');
assert(fix.tag_created                 === false, '[G-07] tag_created=false');
assert(fix.stable_promoted             === false, '[G-08] stable_promoted=false');
assert(fix.deploy_performed            === false, '[G-09] deploy_performed=false');
assert(fix.production_execution_locked === true,  '[G-10] production_execution_locked=true');
assert(fix.unlock_executed             === false, '[G-11] unlock_executed=false');
assert(fix.controlled_review_only      === true,  '[G-12] controlled_review_only=true');
assert(fix.controlled_execution_allowed === false,'[G-13] controlled_execution_allowed=false');
assert(fix.final_execution_phase_required === true,'[G-14] final_execution_phase_required=true');

// authority cannot create evidence or override Go Core
assert(fix.denied_capabilities.includes('evidence_override'),                         '[G-15] cannot override evidence');
assert(fix.denied_capabilities.includes('go_core_override'),                          '[G-16] cannot override Go Core');
assert(fix.denied_capabilities.includes('unlock_execution'),                          '[G-17] cannot execute unlock');
assert(fix.denied_capabilities.includes('release_execution'),                         '[G-18] cannot execute release');

// ─── Suite H: validateControlledExecutionHumanAuthority ───────────
console.log('\n[Suite H] Validate');
const vNull = validateControlledExecutionHumanAuthority(null);
assert(vNull.authority_status === 'CONTROLLED_AUTHORITY_MISSING',                     '[H-01] null→MISSING');
assert(vNull.authority_ready  === false,                                              '[H-02] null ready=false');

const vOk = validateControlledExecutionHumanAuthority(fix);
assert(vOk.valid === true,                                                            '[H-03] fixture valid');
assert(vOk.controlled_authority_id === fix.controlled_authority_id,                  '[H-04] id propagated');
assert(vOk.production_execution_locked === true,                                      '[H-05] locked=true');
assert(vOk.controlled_execution_allowed === false,                                    '[H-06] allowed=false');

const badSchema = validateControlledExecutionHumanAuthority({ schema_version: 'v1.0', controlled_authority_id: 'abc', production_execution_locked: true, controlled_execution_allowed: false, unlock_executed: false, confirmation_phrase: REQUIRED_CONTROLLED_CONFIRMATION_PHRASE, denied_capabilities: CONTROLLED_AUTHORITY_DENIED_CAPABILITIES });
assert(badSchema.authority_status === 'CONTROLLED_AUTHORITY_INVALID',                 '[H-07] bad schema→INVALID');

// ─── Suite I: bindControlledExecutionAuthority ────────────────────
console.log('\n[Suite I] Bind');
const fakeContract = { contract_ready: true, controlled_contract_id: 'cid-123', contract_status: 'CONTROLLED_CONTRACT_READY_REVIEW', requested_execution_scope: 'review_controlled_deploy' };
const bound = bindControlledExecutionAuthority(fix, fakeContract);
assert(bound.authority_bound       === true,                                          '[I-01] bound=true');
assert(bound.controlled_authority_id === fix.controlled_authority_id,                '[I-02] authority_id set');
assert(bound.controlled_contract_id  === 'cid-123',                                  '[I-03] contract_id set');
assert(bound.production_execution_locked === true,                                    '[I-04] locked=true');
assert(bound.controlled_execution_allowed === false,                                  '[I-05] allowed=false');

const notReady = bindControlledExecutionAuthority({ authority_ready: false }, fakeContract);
assert(notReady.authority_status === 'CONTROLLED_AUTHORITY_MISSING',                  '[I-06] not ready→MISSING');

// ─── Suite J: renderControlledExecutionHumanAuthoritySummary ──────
console.log('\n[Suite J] Render');
const rendered = renderControlledExecutionHumanAuthoritySummary(fix);
assert(typeof rendered === 'string',                                                  '[J-01] returns string');
assert(rendered.includes('CONTROLLED_AUTHORITY_READY_REVIEW'),                       '[J-02] status in output');
assert(rendered.includes('production_execution_locked    : true'),                   '[J-03] lock in output');
assert(rendered.includes('controlled_execution_allowed   : false'),                  '[J-04] allowed=false in output');
assert(rendered.includes('unlock_executed                : false'),                  '[J-05] unlock_executed in output');
assert(rendered.includes('final_execution_phase_required : true'),                   '[J-06] final_exec in output');
assert(renderControlledExecutionHumanAuthoritySummary(null) === 'controlled_execution_human_authority: null', '[J-07] null → string');

// ─── Suite K: Deterministic ID ────────────────────────────────────
console.log('\n[Suite K] Deterministic ID');
const v1 = createControlledExecutionHumanAuthority({
  authority_decision: 'approved', confirmation_phrase: REQUIRED_CONTROLLED_CONFIRMATION_PHRASE,
  evidence_acknowledged: true, unlock_governance_acknowledged: true,
  production_risk_acknowledged: true, rollback_acknowledged: true,
  confirmed_by: 'u1', authority_scope: 'review_controlled_deploy', _mock_timestamp: TS,
});
const v2 = createControlledExecutionHumanAuthority({
  authority_decision: 'approved', confirmation_phrase: REQUIRED_CONTROLLED_CONFIRMATION_PHRASE,
  evidence_acknowledged: true, unlock_governance_acknowledged: true,
  production_risk_acknowledged: true, rollback_acknowledged: true,
  confirmed_by: 'u1', authority_scope: 'review_controlled_deploy', _mock_timestamp: TS,
});
assert(v1.controlled_authority_id === v2.controlled_authority_id,                    '[K-01] deterministic id');

// ─── Suite L: Blocked invariants ──────────────────────────────────
console.log('\n[Suite L] Blocked invariants');
const blk = createControlledExecutionHumanAuthority({ _mock_timestamp: TS });
assert(blk.production_execution_locked  === true,  '[L-01] blocked: locked=true');
assert(blk.controlled_execution_allowed === false, '[L-02] blocked: allowed=false');
assert(blk.unlock_executed              === false, '[L-03] blocked: unlock_executed=false');
assert(blk.release_execution_allowed    === false, '[L-04] blocked: release_exec=false');
assert(blk.deploy_allowed               === false, '[L-05] blocked: deploy=false');
assert(blk.final_execution_phase_required === true,'[L-06] blocked: final_exec=true');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ncontrolled-execution-human-authority: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
