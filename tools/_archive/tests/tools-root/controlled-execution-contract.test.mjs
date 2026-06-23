#!/usr/bin/env node
/**
 * Controlled Execution Contract — Unit Tests V66.0
 */

import {
  createControlledExecutionContract,
  validateControlledExecutionContract,
  normalizeControlledExecutionContract,
  renderControlledExecutionContractSummary,
  CONTROLLED_CONTRACT_STATUSES,
  CONTROLLED_EXECUTION_SCOPES,
} from '../controlled-execution-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T00:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CONTROLLED_CONTRACT_STATUSES),                                    '[A-01] statuses array');
assert(CONTROLLED_CONTRACT_STATUSES.length === 8,                                      '[A-02] 8 statuses');
assert(CONTROLLED_CONTRACT_STATUSES.includes('CONTROLLED_CONTRACT_MISSING'),           '[A-03] MISSING');
assert(CONTROLLED_CONTRACT_STATUSES.includes('CONTROLLED_CONTRACT_INVALID'),           '[A-04] INVALID');
assert(CONTROLLED_CONTRACT_STATUSES.includes('CONTROLLED_CONTRACT_EXPIRED'),           '[A-05] EXPIRED');
assert(CONTROLLED_CONTRACT_STATUSES.includes('CONTROLLED_CONTRACT_BLOCKED_UNLOCK_BASELINE'), '[A-06] BLOCKED_UNLOCK_BASELINE');
assert(CONTROLLED_CONTRACT_STATUSES.includes('CONTROLLED_CONTRACT_BLOCKED_UNLOCK_REPORT'),   '[A-07] BLOCKED_UNLOCK_REPORT');
assert(CONTROLLED_CONTRACT_STATUSES.includes('CONTROLLED_CONTRACT_BLOCKED_EVIDENCE'), '[A-08] BLOCKED_EVIDENCE');
assert(CONTROLLED_CONTRACT_STATUSES.includes('CONTROLLED_CONTRACT_BLOCKED_SCOPE'),    '[A-09] BLOCKED_SCOPE');
assert(CONTROLLED_CONTRACT_STATUSES.includes('CONTROLLED_CONTRACT_READY_REVIEW'),     '[A-10] READY_REVIEW');

assert(Array.isArray(CONTROLLED_EXECUTION_SCOPES),                                    '[A-11] scopes array');
assert(CONTROLLED_EXECUTION_SCOPES.length === 5,                                      '[A-12] 5 scopes');
assert(CONTROLLED_EXECUTION_SCOPES.includes('review_controlled_full_manual_execution'), '[A-13] full scope');
assert(CONTROLLED_EXECUTION_SCOPES.includes('review_controlled_release_execution'),   '[A-14] release scope');
assert(CONTROLLED_EXECUTION_SCOPES.includes('review_controlled_tag_creation'),        '[A-15] tag scope');
assert(CONTROLLED_EXECUTION_SCOPES.includes('review_controlled_stable_promotion'),    '[A-16] stable scope');
assert(CONTROLLED_EXECUTION_SCOPES.includes('review_controlled_deploy'),              '[A-17] deploy scope');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = createControlledExecutionContract({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.contract_status       === 'CONTROLLED_CONTRACT_READY_REVIEW',              '[B-02] status=READY_REVIEW');
assert(fix.contract_ready        === true,                                             '[B-03] contract_ready=true');
assert(fix.schema_version        === 'v66.0',                                         '[B-04] schema=v66.0');
assert(typeof fix.controlled_contract_id === 'string' && fix.controlled_contract_id.length === 24, '[B-05] id 24 chars');
assert(fix.evidence_source       === 'go-core',                                       '[B-06] evidence_source=go-core');
assert(fix.requested_execution_scope === 'review_controlled_full_manual_execution',   '[B-07] scope set');
assert(fix.blocking_reason       === null,                                             '[B-08] blocking_reason=null');
assert(fix.created_at            === TS,                                              '[B-09] created_at=TS');
assert(typeof fix.expires_at     === 'string',                                        '[B-10] expires_at set');

// ─── Suite C: Missing evidence_source ─────────────────────────────
console.log('\n[Suite C] Missing / wrong evidence_source');
const noSource = createControlledExecutionContract({ _mock_timestamp: TS });
assert(noSource.contract_ready   === false,                                            '[C-01] blocked no source');
assert(noSource.contract_status  === 'CONTROLLED_CONTRACT_BLOCKED_EVIDENCE',          '[C-02] status BLOCKED_EVIDENCE');
assert(noSource.blocking_reason  === 'evidence_source_must_be_go_core',               '[C-03] reason');

const badSource = createControlledExecutionContract({ evidence_source: 'backend', unlock_baseline_id: 'x', unlock_report_id: 'y', requested_execution_scope: 'review_controlled_deploy', _mock_timestamp: TS });
assert(badSource.contract_ready  === false,                                            '[C-04] blocked bad source');
assert(badSource.contract_status === 'CONTROLLED_CONTRACT_BLOCKED_EVIDENCE',          '[C-05] status BLOCKED_EVIDENCE');

// ─── Suite D: Missing unlock baseline ─────────────────────────────
console.log('\n[Suite D] Missing unlock baseline');
const noBase = createControlledExecutionContract({ evidence_source: 'go-core', unlock_report_id: 'r', requested_execution_scope: 'review_controlled_deploy', _mock_timestamp: TS });
assert(noBase.contract_ready     === false,                                            '[D-01] blocked no baseline');
assert(noBase.contract_status    === 'CONTROLLED_CONTRACT_BLOCKED_UNLOCK_BASELINE',   '[D-02] status BLOCKED_BASELINE');

// ─── Suite E: Missing unlock report ───────────────────────────────
console.log('\n[Suite E] Missing unlock report');
const noReport = createControlledExecutionContract({ evidence_source: 'go-core', unlock_baseline_id: 'b', requested_execution_scope: 'review_controlled_deploy', _mock_timestamp: TS });
assert(noReport.contract_ready   === false,                                            '[E-01] blocked no report');
assert(noReport.contract_status  === 'CONTROLLED_CONTRACT_BLOCKED_UNLOCK_REPORT',     '[E-02] status BLOCKED_REPORT');

// ─── Suite F: Invalid scope ────────────────────────────────────────
console.log('\n[Suite F] Invalid scope');
const badScope = createControlledExecutionContract({ evidence_source: 'go-core', unlock_baseline_id: 'b', unlock_report_id: 'r', requested_execution_scope: 'execute_now', _mock_timestamp: TS });
assert(badScope.contract_ready   === false,                                            '[F-01] blocked bad scope');
assert(badScope.contract_status  === 'CONTROLLED_CONTRACT_BLOCKED_SCOPE',             '[F-02] status BLOCKED_SCOPE');

const noScope = createControlledExecutionContract({ evidence_source: 'go-core', unlock_baseline_id: 'b', unlock_report_id: 'r', _mock_timestamp: TS });
assert(noScope.contract_ready    === false,                                            '[F-03] blocked no scope');
assert(noScope.contract_status   === 'CONTROLLED_CONTRACT_BLOCKED_SCOPE',             '[F-04] status BLOCKED_SCOPE');

// ─── Suite G: Valid contract ───────────────────────────────────────
console.log('\n[Suite G] Valid contract');
const valid = createControlledExecutionContract({
  evidence_source:           'go-core',
  unlock_baseline_id:        'baseline-123',
  unlock_report_id:          'report-456',
  requested_execution_scope: 'review_controlled_full_manual_execution',
  requested_by:              'release-team',
  requester_role:            'release_authority',
  _mock_timestamp:           TS,
});
assert(valid.contract_ready        === true,                                           '[G-01] contract_ready=true');
assert(valid.contract_status       === 'CONTROLLED_CONTRACT_READY_REVIEW',            '[G-02] status=READY_REVIEW');
assert(valid.schema_version        === 'v66.0',                                       '[G-03] schema=v66.0');
assert(typeof valid.controlled_contract_id === 'string' && valid.controlled_contract_id.length === 24, '[G-04] id 24 chars');
assert(valid.unlock_baseline_id    === 'baseline-123',                                '[G-05] baseline_id set');
assert(valid.unlock_report_id      === 'report-456',                                  '[G-06] report_id set');
assert(valid.evidence_source       === 'go-core',                                     '[G-07] evidence_source=go-core');
assert(valid.blocking_reason       === null,                                          '[G-08] blocking_reason=null');

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
assert(fix.future_execution_phase_required === true, '[H-14] future_execution_phase_required=true');
assert(fix.final_execution_phase_required  === true, '[H-15] final_execution_phase_required=true');

assert(valid.production_execution_locked === true,  '[H-16] valid: production_execution_locked=true');
assert(valid.controlled_execution_allowed === false,'[H-17] valid: controlled_execution_allowed=false');
assert(valid.unlock_executed             === false, '[H-18] valid: unlock_executed=false');

// ─── Suite I: validateControlledExecutionContract ─────────────────
console.log('\n[Suite I] Validate');
const vNull = validateControlledExecutionContract(null);
assert(vNull.contract_status === 'CONTROLLED_CONTRACT_MISSING',                       '[I-01] null→MISSING');
assert(vNull.contract_ready  === false,                                               '[I-02] null ready=false');

const vOk = validateControlledExecutionContract(fix);
assert(vOk.valid === true,                                                            '[I-03] fixture valid');
assert(vOk.controlled_contract_id === fix.controlled_contract_id,                    '[I-04] id propagated');
assert(vOk.production_execution_locked === true,                                      '[I-05] locked=true');
assert(vOk.controlled_execution_allowed === false,                                    '[I-06] allowed=false');

const badSchema = validateControlledExecutionContract({ schema_version: 'v1.0', controlled_contract_id: 'abc', production_execution_locked: true, controlled_execution_allowed: false, unlock_executed: false, evidence_source: 'go-core' });
assert(badSchema.contract_status === 'CONTROLLED_CONTRACT_INVALID',                   '[I-07] bad schema→INVALID');

// ─── Suite J: normalizeControlledExecutionContract ────────────────
console.log('\n[Suite J] Normalize');
assert(normalizeControlledExecutionContract(null) === null,                           '[J-01] null→null');
const norm = normalizeControlledExecutionContract(fix);
assert(norm.controlled_contract_id === fix.controlled_contract_id,                    '[J-02] id preserved');
assert(norm.production_execution_locked === true,                                     '[J-03] locked=true');
assert(norm.controlled_execution_allowed === false,                                   '[J-04] allowed=false');

// ─── Suite K: renderControlledExecutionContractSummary ────────────
console.log('\n[Suite K] Render');
const rendered = renderControlledExecutionContractSummary(fix);
assert(typeof rendered === 'string',                                                  '[K-01] returns string');
assert(rendered.includes('CONTROLLED_CONTRACT_READY_REVIEW'),                        '[K-02] status in output');
assert(rendered.includes('production_execution_locked    : true'),                   '[K-03] lock in output');
assert(rendered.includes('controlled_execution_allowed   : false'),                  '[K-04] allowed=false in output');
assert(rendered.includes('unlock_executed                : false'),                  '[K-05] unlock_executed in output');
assert(rendered.includes('final_execution_phase_required : true'),                   '[K-06] final_exec in output');
assert(renderControlledExecutionContractSummary(null) === 'controlled_execution_contract: null', '[K-07] null → string');

// ─── Suite L: Deterministic ID ────────────────────────────────────
console.log('\n[Suite L] Deterministic ID');
const v1 = createControlledExecutionContract({
  evidence_source: 'go-core', unlock_baseline_id: 'b', unlock_report_id: 'r',
  requested_execution_scope: 'review_controlled_deploy', _mock_timestamp: TS,
});
const v2 = createControlledExecutionContract({
  evidence_source: 'go-core', unlock_baseline_id: 'b', unlock_report_id: 'r',
  requested_execution_scope: 'review_controlled_deploy', _mock_timestamp: TS,
});
assert(v1.controlled_contract_id === v2.controlled_contract_id,                      '[L-01] deterministic id');
assert(v1.expires_at === v2.expires_at,                                              '[L-02] deterministic expires_at');

// ─── Suite M: Blocked invariants ──────────────────────────────────
console.log('\n[Suite M] Blocked invariants');
const blk = createControlledExecutionContract({ _mock_timestamp: TS });
assert(blk.production_execution_locked  === true,  '[M-01] blocked: locked=true');
assert(blk.controlled_execution_allowed === false, '[M-02] blocked: allowed=false');
assert(blk.unlock_executed              === false, '[M-03] blocked: unlock_executed=false');
assert(blk.release_execution_allowed    === false, '[M-04] blocked: release_exec=false');
assert(blk.deploy_allowed               === false, '[M-05] blocked: deploy=false');
assert(blk.tag_allowed                  === false, '[M-06] blocked: tag=false');
assert(blk.stable_allowed               === false, '[M-07] blocked: stable=false');
assert(blk.final_execution_phase_required === true,'[M-08] blocked: final_exec=true');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ncontrolled-execution-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
