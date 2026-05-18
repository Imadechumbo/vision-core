#!/usr/bin/env node
/**
 * Real Tag Manual Confirmation Contract — Unit Tests V81.1
 */

import {
  createRealTagManualConfirmationContract,
  validateRealTagManualConfirmationContract,
  bindRealTagManualConfirmation,
  renderRealTagManualConfirmationSummary,
  MANUAL_CONFIRMATION_STATUSES,
  MANUAL_CONFIRMATION_PHRASE,
} from '../real-tag-manual-confirmation-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T17:30:00.000Z';

const MOCK_CONTRACT = {
  manual_executor_contract_id: 'contract-test-id-000001',
  target_tag: 'v2.0.0',
  git_head: 'deadbeef1234567890123456789012345678abcd',
  evidence_receipt_id: 'receipt-test-001',
  rollback_anchor_id: 'anchor-test-001',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(MANUAL_CONFIRMATION_STATUSES),                                  '[A-01] statuses array');
assert(MANUAL_CONFIRMATION_STATUSES.length === 9,                                    '[A-02] 9 statuses');
assert(MANUAL_CONFIRMATION_STATUSES.includes('MANUAL_TAG_CONFIRMATION_BLOCKED_CONTRACT'), '[A-03] BLOCKED_CONTRACT');
assert(MANUAL_CONFIRMATION_STATUSES.includes('MANUAL_TAG_CONFIRMATION_REJECTED'),    '[A-04] REJECTED');
assert(MANUAL_CONFIRMATION_STATUSES.includes('MANUAL_TAG_CONFIRMATION_EXPIRED'),     '[A-05] EXPIRED');
assert(MANUAL_CONFIRMATION_STATUSES.includes('MANUAL_TAG_CONFIRMATION_PHRASE_MISMATCH'), '[A-06] PHRASE_MISMATCH');
assert(MANUAL_CONFIRMATION_STATUSES.includes('MANUAL_TAG_CONFIRMATION_TARGET_MISMATCH'), '[A-07] TARGET_MISMATCH');
assert(MANUAL_CONFIRMATION_STATUSES.includes('MANUAL_TAG_CONFIRMATION_HEAD_MISMATCH'),   '[A-08] HEAD_MISMATCH');
assert(MANUAL_CONFIRMATION_STATUSES.includes('MANUAL_TAG_CONFIRMATION_EVIDENCE_MISMATCH'), '[A-09] EVIDENCE_MISMATCH');
assert(MANUAL_CONFIRMATION_STATUSES.includes('MANUAL_TAG_CONFIRMATION_ROLLBACK_MISMATCH'), '[A-10] ROLLBACK_MISMATCH');
assert(MANUAL_CONFIRMATION_STATUSES.includes('MANUAL_TAG_CONFIRMATION_READY_REVIEW'),'[A-11] READY_REVIEW');
assert(typeof MANUAL_CONFIRMATION_PHRASE === 'string' && MANUAL_CONFIRMATION_PHRASE.length > 20, '[A-12] phrase string');
assert(MANUAL_CONFIRMATION_PHRASE.includes('DOES NOT RUN'),                          '[A-13] phrase safety clause');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = createRealTagManualConfirmationContract({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                      '[B-01] returns object');
assert(fix.schema_version === 'v81.1',                                               '[B-02] schema=v81.1');
assert(fix.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_READY_REVIEW',   '[B-03] READY_REVIEW');
assert(fix.manual_confirmation_ready  === true,                                      '[B-04] ready=true');
assert(typeof fix.manual_confirmation_id === 'string' && fix.manual_confirmation_id.length === 24, '[B-05] id 24 chars');
assert(fix.blocking_reason             === null,                                     '[B-06] blocking=null');
assert(fix.confirm_target_tag          === 'v1.2.3',                                 '[B-07] confirm_target_tag');
assert(fix.created_at                  === TS,                                       '[B-08] created_at=TS');
assert(fix.human_confirmation_phrase   === MANUAL_CONFIRMATION_PHRASE,              '[B-09] phrase match');
assert(fix.confirm_no_deploy           === true,                                     '[B-10] confirm_no_deploy=true');
assert(fix.confirm_local_interactive_only === true,                                  '[B-11] local_only=true');
assert(fix.confirm_ci_blocked          === true,                                     '[B-12] ci_blocked=true');

// ─── Suite C: Missing fields ───────────────────────────────────────
console.log('\n[Suite C] Missing fields');
const missing1 = createRealTagManualConfirmationContract({ _mock_timestamp: TS });
assert(missing1.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_BLOCKED_CONTRACT', '[C-01] missing: status');
assert(missing1.manual_confirmation_ready  === false,                                '[C-02] missing: not ready');
assert(missing1.blocking_reason            === 'required_confirmation_fields_missing','[C-03] missing: reason');

const missing2 = createRealTagManualConfirmationContract({
  confirm_target_tag: 'v2.0.0', _mock_timestamp: TS,
});
assert(missing2.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_BLOCKED_CONTRACT', '[C-04] missing git_head');

// ─── Suite D: Expired ─────────────────────────────────────────────
console.log('\n[Suite D] Expired');
const exp = createRealTagManualConfirmationContract({
  confirm_target_tag: 'v2.0.0', confirm_git_head: 'abc', confirm_evidence_receipt: 'r1',
  confirm_rollback_anchor: 'a1', force_expired: true, _mock_timestamp: TS,
});
assert(exp.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_EXPIRED',        '[D-01] expired: status');
assert(exp.manual_confirmation_ready  === false,                                     '[D-02] expired: not ready');
assert(exp.blocking_reason            === 'confirmation_expired',                    '[D-03] expired: reason');

// ─── Suite E: Rejected ────────────────────────────────────────────
console.log('\n[Suite E] Rejected');
const rej = createRealTagManualConfirmationContract({
  confirm_target_tag: 'v2.0.0', confirm_git_head: 'abc', confirm_evidence_receipt: 'r1',
  confirm_rollback_anchor: 'a1', force_rejected: true, _mock_timestamp: TS,
});
assert(rej.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_REJECTED',       '[E-01] rejected: status');
assert(rej.manual_confirmation_ready  === false,                                     '[E-02] rejected: not ready');
assert(rej.blocking_reason            === 'confirmation_rejected_by_user',           '[E-03] rejected: reason');

// ─── Suite F: Phrase Mismatch ─────────────────────────────────────
console.log('\n[Suite F] Phrase Mismatch');
const phraseWrong = createRealTagManualConfirmationContract({
  confirm_target_tag: 'v2.0.0', confirm_git_head: 'abc', confirm_evidence_receipt: 'r1',
  confirm_rollback_anchor: 'a1', human_confirmation_phrase: 'wrong', _mock_timestamp: TS,
});
assert(phraseWrong.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_PHRASE_MISMATCH', '[F-01] phrase: status');
assert(phraseWrong.manual_confirmation_ready  === false,                             '[F-02] phrase: not ready');
assert(phraseWrong.blocking_reason            === 'confirmation_phrase_mismatch',   '[F-03] phrase: reason');

const phraseEmpty = createRealTagManualConfirmationContract({
  confirm_target_tag: 'v2.0.0', confirm_git_head: 'abc', confirm_evidence_receipt: 'r1',
  confirm_rollback_anchor: 'a1', _mock_timestamp: TS,
});
assert(phraseEmpty.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_PHRASE_MISMATCH', '[F-04] empty phrase blocked');

// ─── Suite G: Target Mismatch ─────────────────────────────────────
console.log('\n[Suite G] Target Mismatch');
const targetMismatch = createRealTagManualConfirmationContract({
  confirm_target_tag: 'v3.0.0',
  confirm_git_head: MOCK_CONTRACT.git_head,
  confirm_evidence_receipt: MOCK_CONTRACT.evidence_receipt_id,
  confirm_rollback_anchor: MOCK_CONTRACT.rollback_anchor_id,
  executor_contract: MOCK_CONTRACT,
  human_confirmation_phrase: MANUAL_CONFIRMATION_PHRASE,
  _mock_timestamp: TS,
});
assert(targetMismatch.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_TARGET_MISMATCH', '[G-01] target: status');
assert(targetMismatch.manual_confirmation_ready  === false,                          '[G-02] target: not ready');
assert(targetMismatch.blocking_reason            === 'target_tag_mismatch',          '[G-03] target: reason');

// ─── Suite H: Head Mismatch ───────────────────────────────────────
console.log('\n[Suite H] Head Mismatch');
const headMismatch = createRealTagManualConfirmationContract({
  confirm_target_tag: MOCK_CONTRACT.target_tag,
  confirm_git_head: 'wronghead',
  confirm_evidence_receipt: MOCK_CONTRACT.evidence_receipt_id,
  confirm_rollback_anchor: MOCK_CONTRACT.rollback_anchor_id,
  executor_contract: MOCK_CONTRACT,
  human_confirmation_phrase: MANUAL_CONFIRMATION_PHRASE,
  _mock_timestamp: TS,
});
assert(headMismatch.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_HEAD_MISMATCH', '[H-01] head: status');
assert(headMismatch.manual_confirmation_ready  === false,                            '[H-02] head: not ready');
assert(headMismatch.blocking_reason            === 'git_head_mismatch',              '[H-03] head: reason');

// ─── Suite I: Evidence Mismatch ───────────────────────────────────
console.log('\n[Suite I] Evidence Mismatch');
const evMismatch = createRealTagManualConfirmationContract({
  confirm_target_tag: MOCK_CONTRACT.target_tag,
  confirm_git_head: MOCK_CONTRACT.git_head,
  confirm_evidence_receipt: 'wrong-receipt',
  confirm_rollback_anchor: MOCK_CONTRACT.rollback_anchor_id,
  executor_contract: MOCK_CONTRACT,
  human_confirmation_phrase: MANUAL_CONFIRMATION_PHRASE,
  _mock_timestamp: TS,
});
assert(evMismatch.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_EVIDENCE_MISMATCH', '[I-01] evidence: status');
assert(evMismatch.manual_confirmation_ready  === false,                              '[I-02] evidence: not ready');
assert(evMismatch.blocking_reason            === 'evidence_receipt_mismatch',        '[I-03] evidence: reason');

// ─── Suite J: Rollback Mismatch ───────────────────────────────────
console.log('\n[Suite J] Rollback Mismatch');
const rbMismatch = createRealTagManualConfirmationContract({
  confirm_target_tag: MOCK_CONTRACT.target_tag,
  confirm_git_head: MOCK_CONTRACT.git_head,
  confirm_evidence_receipt: MOCK_CONTRACT.evidence_receipt_id,
  confirm_rollback_anchor: 'wrong-anchor',
  executor_contract: MOCK_CONTRACT,
  human_confirmation_phrase: MANUAL_CONFIRMATION_PHRASE,
  _mock_timestamp: TS,
});
assert(rbMismatch.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_ROLLBACK_MISMATCH', '[J-01] rollback: status');
assert(rbMismatch.manual_confirmation_ready  === false,                              '[J-02] rollback: not ready');
assert(rbMismatch.blocking_reason            === 'rollback_anchor_mismatch',         '[J-03] rollback: reason');

// ─── Suite K: Valid ───────────────────────────────────────────────
console.log('\n[Suite K] Valid');
const valid = createRealTagManualConfirmationContract({
  confirm_target_tag: MOCK_CONTRACT.target_tag,
  confirm_git_head: MOCK_CONTRACT.git_head,
  confirm_evidence_receipt: MOCK_CONTRACT.evidence_receipt_id,
  confirm_rollback_anchor: MOCK_CONTRACT.rollback_anchor_id,
  executor_contract: MOCK_CONTRACT,
  human_confirmation_phrase: MANUAL_CONFIRMATION_PHRASE,
  requested_by: 'release-manager',
  _mock_timestamp: TS,
});
assert(valid.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_READY_REVIEW', '[K-01] valid: status');
assert(valid.manual_confirmation_ready  === true,                                    '[K-02] valid: ready=true');
assert(valid.blocking_reason            === null,                                    '[K-03] valid: blocking=null');
assert(valid.confirm_target_tag         === MOCK_CONTRACT.target_tag,               '[K-04] valid: target_tag stored');
assert(valid.confirm_git_head           === MOCK_CONTRACT.git_head,                 '[K-05] valid: git_head stored');
assert(valid.confirm_evidence_receipt   === MOCK_CONTRACT.evidence_receipt_id,      '[K-06] valid: evidence stored');
assert(valid.confirm_rollback_anchor    === MOCK_CONTRACT.rollback_anchor_id,       '[K-07] valid: rollback stored');
assert(valid.executor_contract_id       === MOCK_CONTRACT.manual_executor_contract_id, '[K-08] valid: contract_id ref');
assert(typeof valid.manual_confirmation_id === 'string' && valid.manual_confirmation_id.length === 24, '[K-09] valid: id 24 chars');

// ─── Suite L: Invariants ──────────────────────────────────────────
console.log('\n[Suite L] Invariants');
assert(valid.confirm_no_deploy           === true,  '[L-01] confirm_no_deploy=true');
assert(valid.confirm_no_stable_promotion === true,  '[L-02] confirm_no_stable_promotion=true');
assert(valid.confirm_no_release          === true,  '[L-03] confirm_no_release=true');
assert(valid.confirm_local_interactive_only === true, '[L-04] local_interactive_only=true');
assert(valid.confirm_ci_blocked          === true,  '[L-05] ci_blocked=true');
assert(valid.tag_created                 === false, '[L-06] tag_created=false');
assert(valid.git_push_performed          === false, '[L-07] git_push_performed=false');
assert(valid.deploy_performed            === false, '[L-08] deploy_performed=false');
assert(valid.stable_promoted             === false, '[L-09] stable_promoted=false');
assert(valid.release_performed           === false, '[L-10] release_performed=false');

// ─── Suite M: Bind alias ──────────────────────────────────────────
console.log('\n[Suite M] Bind alias');
const bound = bindRealTagManualConfirmation({ fixture_mode: true, _mock_timestamp: TS });
assert(bound.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_READY_REVIEW', '[M-01] bind alias works');
assert(bound.manual_confirmation_ready  === true,                                    '[M-02] bind ready=true');

// ─── Suite N: Validate ────────────────────────────────────────────
console.log('\n[Suite N] Validate');
const vNull = validateRealTagManualConfirmationContract(null);
assert(vNull.valid === false && vNull.reason === 'null_or_invalid',                  '[N-01] null → invalid');
const vUnknown = validateRealTagManualConfirmationContract({ ...valid, manual_confirmation_status: 'BAD' });
assert(vUnknown.valid === false && vUnknown.reason === 'unknown_status',             '[N-02] unknown status');
const vTagTrue = validateRealTagManualConfirmationContract({ ...valid, tag_created: true });
assert(vTagTrue.valid === false && vTagTrue.reason === 'tag_created_must_be_false',  '[N-03] tag=true → invalid');
const vPushTrue = validateRealTagManualConfirmationContract({ ...valid, git_push_performed: true });
assert(vPushTrue.valid === false && vPushTrue.reason === 'git_push_must_be_false',   '[N-04] push=true → invalid');
const vDeployTrue = validateRealTagManualConfirmationContract({ ...valid, deploy_performed: true });
assert(vDeployTrue.valid === false && vDeployTrue.reason === 'deploy_performed_must_be_false', '[N-05] deploy=true → invalid');
const vOk = validateRealTagManualConfirmationContract(valid);
assert(vOk.valid === true,                                                           '[N-06] valid → valid');

// ─── Suite O: Render ──────────────────────────────────────────────
console.log('\n[Suite O] Render');
const rendered = renderRealTagManualConfirmationSummary(fix);
assert(typeof rendered === 'string',                                                 '[O-01] returns string');
assert(rendered.includes('MANUAL_TAG_CONFIRMATION_READY_REVIEW'),                   '[O-02] status in output');
assert(rendered.includes('confirm_no_deploy               : true'),                 '[O-03] no_deploy=true');
assert(rendered.includes('confirm_ci_blocked              : true'),                 '[O-04] ci_blocked=true');
assert(rendered.includes('tag_created                     : false'),                '[O-05] tag=false');
assert(rendered.includes('git_push_performed              : false'),                '[O-06] push=false');
assert(renderRealTagManualConfirmationSummary(null) === 'real_tag_manual_confirmation_contract: null', '[O-07] null → string');

// ─── Suite P: Deterministic ID ────────────────────────────────────
console.log('\n[Suite P] Deterministic ID');
const d1 = createRealTagManualConfirmationContract({ fixture_mode: true, _mock_timestamp: TS });
const d2 = createRealTagManualConfirmationContract({ fixture_mode: true, _mock_timestamp: TS });
assert(d1.manual_confirmation_id === d2.manual_confirmation_id,                     '[P-01] deterministic id');

// ─── Suite Q: No-contract mode (no executor_contract provided) ────
console.log('\n[Suite Q] No executor_contract cross-check');
const noCrossCheck = createRealTagManualConfirmationContract({
  confirm_target_tag: 'v99.0.0',
  confirm_git_head: 'any-head',
  confirm_evidence_receipt: 'any-receipt',
  confirm_rollback_anchor: 'any-anchor',
  human_confirmation_phrase: MANUAL_CONFIRMATION_PHRASE,
  _mock_timestamp: TS,
});
assert(noCrossCheck.manual_confirmation_status === 'MANUAL_TAG_CONFIRMATION_READY_REVIEW', '[Q-01] no contract cross-check ok');
assert(noCrossCheck.manual_confirmation_ready  === true,                             '[Q-02] no contract ready=true');
assert(noCrossCheck.executor_contract_id       === null,                             '[Q-03] contract_id=null when absent');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-confirmation-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
