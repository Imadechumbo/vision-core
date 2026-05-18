#!/usr/bin/env node
/**
 * Real Manual Unlock Execution Contract — Unit Tests V71.0
 */

import {
  createRealManualUnlockExecutionContract,
  validateRealManualUnlockExecutionContract,
  normalizeRealManualUnlockExecutionContract,
  renderRealManualUnlockExecutionContractSummary,
  UNLOCK_EXEC_CONTRACT_STATUSES,
  UNLOCK_EXEC_CONTRACT_SCOPES,
  REQUIRED_UNLOCK_EXEC_CONFIRMATION_PHRASE,
} from '../real-manual-unlock-execution-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T06:00:00.000Z';
const PHRASE = 'I ACKNOWLEDGE THIS CONTRACT PREPARES REAL MANUAL UNLOCK BUT DOES NOT EXECUTE UNLOCK RELEASE TAG STABLE OR DEPLOY';

const GOOD_PARAMS = {
  final_preprod_baseline_id:      'bp-id',
  controlled_contract_id:         'cc-id',
  controlled_evidence_package_id: 'cep-id',
  evidence_receipt_id:            'rcpt-id',
  evidence_source:                'go-core',
  target_version:                 'v1.2.3',
  target_branch:                  'main',
  git_head:                       'abc1234',
  requested_by:                   'alice',
  requester_role:                  'release-manager',
  requested_unlock_scope:         'unlock_for_full_manual_execution_review',
  human_confirmation_phrase:      PHRASE,
  _mock_timestamp:                TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(UNLOCK_EXEC_CONTRACT_STATUSES),                                   '[A-01] statuses array');
assert(UNLOCK_EXEC_CONTRACT_STATUSES.length === 8,                                     '[A-02] 8 statuses');
assert(UNLOCK_EXEC_CONTRACT_STATUSES.includes('UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW'), '[A-03] READY_ARMED_REVIEW');
assert(UNLOCK_EXEC_CONTRACT_STATUSES.includes('UNLOCK_EXEC_CONTRACT_MISSING'),         '[A-04] MISSING');
assert(UNLOCK_EXEC_CONTRACT_STATUSES.includes('UNLOCK_EXEC_CONTRACT_BLOCKED_BASELINE'), '[A-05] BLOCKED_BASELINE');
assert(UNLOCK_EXEC_CONTRACT_STATUSES.includes('UNLOCK_EXEC_CONTRACT_BLOCKED_EVIDENCE'), '[A-06] BLOCKED_EVIDENCE');
assert(UNLOCK_EXEC_CONTRACT_STATUSES.includes('UNLOCK_EXEC_CONTRACT_BLOCKED_SCOPE'),   '[A-07] BLOCKED_SCOPE');
assert(UNLOCK_EXEC_CONTRACT_STATUSES.includes('UNLOCK_EXEC_CONTRACT_PHRASE_MISMATCH'), '[A-08] PHRASE_MISMATCH');

assert(Array.isArray(UNLOCK_EXEC_CONTRACT_SCOPES),                                     '[A-09] scopes array');
assert(UNLOCK_EXEC_CONTRACT_SCOPES.length === 4,                                       '[A-10] 4 scopes');
assert(UNLOCK_EXEC_CONTRACT_SCOPES.includes('unlock_for_tag_review'),                  '[A-11] tag_review');
assert(UNLOCK_EXEC_CONTRACT_SCOPES.includes('unlock_for_stable_review'),               '[A-12] stable_review');
assert(UNLOCK_EXEC_CONTRACT_SCOPES.includes('unlock_for_release_execution_review'),    '[A-13] release_review');
assert(UNLOCK_EXEC_CONTRACT_SCOPES.includes('unlock_for_full_manual_execution_review'), '[A-14] full_review');

assert(typeof REQUIRED_UNLOCK_EXEC_CONFIRMATION_PHRASE === 'string',                   '[A-15] phrase is string');
assert(REQUIRED_UNLOCK_EXEC_CONFIRMATION_PHRASE === PHRASE,                            '[A-16] phrase exact match');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = createRealManualUnlockExecutionContract({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.contract_status  === 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW',             '[B-02] status=READY_ARMED_REVIEW');
assert(fix.contract_ready   === true,                                                  '[B-03] contract_ready=true');
assert(fix.schema_version   === 'v71.0',                                               '[B-04] schema=v71.0');
assert(typeof fix.unlock_execution_contract_id === 'string' && fix.unlock_execution_contract_id.length === 24, '[B-05] id 24 chars');
assert(fix.evidence_source  === 'go-core',                                             '[B-06] evidence_source=go-core');
assert(fix.created_at       === TS,                                                    '[B-07] created_at=TS');
assert(fix.blocking_reason  === null,                                                  '[B-08] blocking_reason=null');
assert(fix.requested_unlock_scope === 'unlock_for_full_manual_execution_review',       '[B-09] scope set');
assert(fix.human_confirmation_phrase === PHRASE,                                        '[B-10] phrase set');

// ─── Suite C: Blocked — missing baseline ──────────────────────────
console.log('\n[Suite C] Missing baseline');
const noBaseline = createRealManualUnlockExecutionContract({ evidence_source: 'go-core', evidence_receipt_id: 'r', requested_unlock_scope: 'unlock_for_tag_review', human_confirmation_phrase: PHRASE, _mock_timestamp: TS });
assert(noBaseline.contract_ready  === false,                                           '[C-01] blocked');
assert(noBaseline.contract_status === 'UNLOCK_EXEC_CONTRACT_BLOCKED_BASELINE',        '[C-02] BLOCKED_BASELINE');

// ─── Suite D: Blocked — bad evidence source ────────────────────────
console.log('\n[Suite D] Bad evidence source');
const badEvidence = createRealManualUnlockExecutionContract({ ...GOOD_PARAMS, evidence_source: 'backend', _mock_timestamp: TS });
assert(badEvidence.contract_status === 'UNLOCK_EXEC_CONTRACT_BLOCKED_EVIDENCE',       '[D-01] BLOCKED_EVIDENCE');
assert(badEvidence.evidence_source === 'backend',                                      '[D-02] source preserved');

// ─── Suite E: Blocked — missing receipt ────────────────────────────
console.log('\n[Suite E] Missing receipt');
const noReceipt = createRealManualUnlockExecutionContract({ ...GOOD_PARAMS, evidence_receipt_id: null, _mock_timestamp: TS });
assert(noReceipt.contract_status === 'UNLOCK_EXEC_CONTRACT_BLOCKED_EVIDENCE',         '[E-01] BLOCKED_EVIDENCE missing receipt');

// ─── Suite F: Blocked — invalid scope ─────────────────────────────
console.log('\n[Suite F] Invalid scope');
const badScope = createRealManualUnlockExecutionContract({ ...GOOD_PARAMS, requested_unlock_scope: 'bad_scope', _mock_timestamp: TS });
assert(badScope.contract_status === 'UNLOCK_EXEC_CONTRACT_BLOCKED_SCOPE',             '[F-01] BLOCKED_SCOPE');
assert(badScope.requested_unlock_scope === 'bad_scope',                               '[F-02] scope preserved');

// ─── Suite G: Blocked — phrase mismatch ───────────────────────────
console.log('\n[Suite G] Phrase mismatch');
const badPhrase = createRealManualUnlockExecutionContract({ ...GOOD_PARAMS, human_confirmation_phrase: 'wrong phrase', _mock_timestamp: TS });
assert(badPhrase.contract_status === 'UNLOCK_EXEC_CONTRACT_PHRASE_MISMATCH',          '[G-01] PHRASE_MISMATCH');

// ─── Suite H: Valid contract ───────────────────────────────────────
console.log('\n[Suite H] Valid contract');
const valid = createRealManualUnlockExecutionContract(GOOD_PARAMS);
assert(valid.contract_ready   === true,                                                '[H-01] contract_ready=true');
assert(valid.contract_status  === 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW',          '[H-02] status=READY_ARMED_REVIEW');
assert(valid.evidence_source  === 'go-core',                                           '[H-03] evidence_source=go-core');
assert(valid.requested_unlock_scope === 'unlock_for_full_manual_execution_review',     '[H-04] scope set');
assert(valid.final_preprod_baseline_id === 'bp-id',                                   '[H-05] baseline_id set');
assert(valid.controlled_contract_id   === 'cc-id',                                    '[H-06] contract_id set');
assert(valid.evidence_receipt_id      === 'rcpt-id',                                  '[H-07] receipt_id set');
assert(valid.target_version  === 'v1.2.3',                                             '[H-08] target_version set');
assert(valid.target_branch   === 'main',                                               '[H-09] target_branch set');
assert(valid.git_head        === 'abc1234',                                            '[H-10] git_head set');
assert(typeof valid.expires_at === 'string',                                           '[H-11] expires_at set');

// ─── Suite I: Invariants ──────────────────────────────────────────
console.log('\n[Suite I] Invariants');
assert(fix.production_execution_locked  === true,  '[I-01] locked=true');
assert(fix.unlock_executed              === false, '[I-02] unlock_executed=false');
assert(fix.real_execution_armed         === false, '[I-03] real_execution_armed=false');
assert(fix.dry_run_required             === true,  '[I-04] dry_run_required=true');
assert(fix.manual_execution_only        === true,  '[I-05] manual_execution_only=true');
assert(fix.deploy_allowed               === false, '[I-06] deploy_allowed=false');
assert(fix.promotion_allowed            === false, '[I-07] promotion_allowed=false');
assert(fix.stable_allowed               === false, '[I-08] stable_allowed=false');
assert(fix.tag_allowed                  === false, '[I-09] tag_allowed=false');
assert(fix.release_execution_allowed    === false, '[I-10] release_exec=false');
assert(fix.release_performed            === false, '[I-11] release_performed=false');
assert(fix.tag_created                  === false, '[I-12] tag_created=false');
assert(fix.stable_promoted              === false, '[I-13] stable_promoted=false');
assert(fix.deploy_performed             === false, '[I-14] deploy_performed=false');

assert(valid.production_execution_locked === true,  '[I-15] valid: locked=true');
assert(valid.unlock_executed             === false, '[I-16] valid: unlock=false');
assert(valid.real_execution_armed        === false, '[I-17] valid: armed=false');

// Blocked invariants
const blk = createRealManualUnlockExecutionContract({ _mock_timestamp: TS });
assert(blk.production_execution_locked === true,  '[I-18] blocked: locked=true');
assert(blk.unlock_executed             === false, '[I-19] blocked: unlock=false');
assert(blk.real_execution_armed        === false, '[I-20] blocked: armed=false');
assert(blk.contract_ready              === false, '[I-21] blocked: ready=false');

// ─── Suite J: validateRealManualUnlockExecutionContract ───────────
console.log('\n[Suite J] Validate');
const vFix = validateRealManualUnlockExecutionContract(fix);
assert(vFix.valid   === true,  '[J-01] fixture valid');
assert(vFix.reason  === null,  '[J-02] reason null');

const vNull = validateRealManualUnlockExecutionContract(null);
assert(vNull.valid  === false, '[J-03] null invalid');
assert(vNull.reason === 'UNLOCK_EXEC_CONTRACT_MISSING', '[J-04] null reason MISSING');

const vBadSchema = validateRealManualUnlockExecutionContract({ ...fix, schema_version: 'v1.0' });
assert(vBadSchema.valid === false, '[J-05] bad schema invalid');

const vBadSource = validateRealManualUnlockExecutionContract({ ...fix, evidence_source: 'backend' });
assert(vBadSource.valid === false, '[J-06] bad source invalid');

// ─── Suite K: normalizeRealManualUnlockExecutionContract ──────────
console.log('\n[Suite K] Normalize');
const norm = normalizeRealManualUnlockExecutionContract(fix);
assert(norm !== null,                                  '[K-01] returns object');
assert(norm.contract_ready          === true,          '[K-02] contract_ready=true');
assert(norm.manual_execution_only   === true,          '[K-03] manual_execution_only=true');
assert(norm.dry_run_required        === true,          '[K-04] dry_run_required=true');
assert(norm.real_execution_armed    === false,         '[K-05] real_execution_armed=false');
assert(norm.unlock_executed         === false,         '[K-06] unlock_executed=false');
assert(normalizeRealManualUnlockExecutionContract(null) === null, '[K-07] null → null');

// ─── Suite L: renderRealManualUnlockExecutionContractSummary ──────
console.log('\n[Suite L] Render');
const rendered = renderRealManualUnlockExecutionContractSummary(fix);
assert(typeof rendered === 'string',                                                    '[L-01] returns string');
assert(rendered.includes('UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW'),                  '[L-02] status in output');
assert(rendered.includes('production_execution_locked   : true'),                     '[L-03] lock in output');
assert(rendered.includes('real_execution_armed          : false'),                    '[L-04] armed=false');
assert(rendered.includes('unlock_executed               : false'),                    '[L-05] unlock=false');
assert(renderRealManualUnlockExecutionContractSummary(null) === 'real_manual_unlock_execution_contract: null', '[L-06] null → string');

// ─── Suite M: Deterministic ID ────────────────────────────────────
console.log('\n[Suite M] Deterministic ID');
const r1 = createRealManualUnlockExecutionContract(GOOD_PARAMS);
const r2 = createRealManualUnlockExecutionContract(GOOD_PARAMS);
assert(r1.unlock_execution_contract_id === r2.unlock_execution_contract_id,           '[M-01] deterministic id');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-manual-unlock-execution-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
