#!/usr/bin/env node
/**
 * Real Tag Manual Executor Contract — Unit Tests V81.0
 */

import {
  createRealTagManualExecutorContract,
  validateRealTagManualExecutorContract,
  normalizeRealTagManualExecutorContract,
  renderRealTagManualExecutorContractSummary,
  MANUAL_TAG_EXEC_CONTRACT_STATUSES,
  MANUAL_EXEC_CONTRACT_PHRASE,
} from '../real-tag-manual-executor-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T17:00:00.000Z';

const READY_BASELINE = {
  real_tag_baseline_status: 'REAL_TAG_BASELINE_READY_FOR_FUTURE_MANUAL_EXECUTOR',
  baseline_id: 'baseline-test-id-000001',
};
const READY_REPORT = {
  tag_report_status: 'TAG_REPORT_READY_FOR_FUTURE_MANUAL_EXECUTOR',
  report_id: 'report-test-id-000001',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(MANUAL_TAG_EXEC_CONTRACT_STATUSES),                             '[A-01] statuses array');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.length === 10,                              '[A-02] 10 statuses');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes('MANUAL_TAG_EXEC_CONTRACT_MISSING'),         '[A-03] MISSING');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes('MANUAL_TAG_EXEC_CONTRACT_INVALID'),         '[A-04] INVALID');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes('MANUAL_TAG_EXEC_CONTRACT_EXPIRED'),         '[A-05] EXPIRED');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes('MANUAL_TAG_EXEC_CONTRACT_BLOCKED_BASELINE'),'[A-06] BLOCKED_BASELINE');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes('MANUAL_TAG_EXEC_CONTRACT_BLOCKED_REPORT'),  '[A-07] BLOCKED_REPORT');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes('MANUAL_TAG_EXEC_CONTRACT_BLOCKED_EVIDENCE'),'[A-08] BLOCKED_EVIDENCE');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes('MANUAL_TAG_EXEC_CONTRACT_BLOCKED_ROLLBACK'),'[A-09] BLOCKED_ROLLBACK');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes('MANUAL_TAG_EXEC_CONTRACT_BLOCKED_TAG_NAME'),'[A-10] BLOCKED_TAG_NAME');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes('MANUAL_TAG_EXEC_CONTRACT_PHRASE_MISMATCH'), '[A-11] PHRASE_MISMATCH');
assert(MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes('MANUAL_TAG_EXEC_CONTRACT_READY_REVIEW'),    '[A-12] READY_REVIEW');
assert(typeof MANUAL_EXEC_CONTRACT_PHRASE === 'string' && MANUAL_EXEC_CONTRACT_PHRASE.length > 20, '[A-13] phrase string');
assert(MANUAL_EXEC_CONTRACT_PHRASE.includes('DOES NOT CREATE'),                      '[A-14] phrase safety clause');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = createRealTagManualExecutorContract({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                      '[B-01] returns object');
assert(fix.schema_version === 'v81.0',                                               '[B-02] schema=v81.0');
assert(fix.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_READY_REVIEW', '[B-03] READY_REVIEW');
assert(fix.manual_executor_contract_ready  === true,                                 '[B-04] ready=true');
assert(typeof fix.manual_executor_contract_id === 'string' && fix.manual_executor_contract_id.length === 24, '[B-05] id 24 chars');
assert(fix.blocking_reason                === null,                                  '[B-06] blocking=null');
assert(fix.target_tag                     === 'v1.2.3',                              '[B-07] target_tag');
assert(fix.evidence_source                === 'go-core',                             '[B-08] evidence=go-core');
assert(fix.created_at                     === TS,                                    '[B-09] created_at=TS');
assert(fix.human_confirmation_phrase      === MANUAL_EXEC_CONTRACT_PHRASE,           '[B-10] phrase match');

// ─── Suite C: Missing fields ───────────────────────────────────────
console.log('\n[Suite C] Missing fields');
const missing1 = createRealTagManualExecutorContract({ _mock_timestamp: TS });
assert(missing1.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_MISSING', '[C-01] missing: status');
assert(missing1.manual_executor_contract_ready  === false,                           '[C-02] missing: not ready');
assert(missing1.blocking_reason                 === 'required_fields_missing',       '[C-03] missing: reason');

const missing2 = createRealTagManualExecutorContract({ target_tag: 'v1.0.0', _mock_timestamp: TS });
assert(missing2.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_MISSING', '[C-04] missing git_head');

const missing3 = createRealTagManualExecutorContract({
  target_tag: 'v1.0.0', git_head: 'abc123', _mock_timestamp: TS,
});
assert(missing3.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_MISSING', '[C-05] missing evidence_receipt_id');

// ─── Suite D: Expired ─────────────────────────────────────────────
console.log('\n[Suite D] Expired');
const exp = createRealTagManualExecutorContract({
  target_tag: 'v1.0.0', git_head: 'abc', evidence_receipt_id: 'r1',
  requested_by: 'user', force_expired: true, _mock_timestamp: TS,
});
assert(exp.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_EXPIRED',  '[D-01] expired: status');
assert(exp.manual_executor_contract_ready  === false,                                '[D-02] expired: not ready');
assert(exp.blocking_reason                 === 'contract_expired',                   '[D-03] expired: reason');

// ─── Suite E: Blocked Baseline ────────────────────────────────────
console.log('\n[Suite E] Blocked Baseline');
const blockedBase = createRealTagManualExecutorContract({
  target_tag: 'v1.0.0', git_head: 'abc', evidence_receipt_id: 'r1',
  requested_by: 'user', real_tag_baseline: { real_tag_baseline_status: 'WRONG_STATUS' },
  _mock_timestamp: TS,
});
assert(blockedBase.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_BASELINE', '[E-01] blocked_baseline: status');
assert(blockedBase.manual_executor_contract_ready  === false,                        '[E-02] blocked_baseline: not ready');
assert(blockedBase.blocking_reason                 === 'real_tag_baseline_not_ready','[E-03] blocked_baseline: reason');

const blockedBaseNull = createRealTagManualExecutorContract({
  target_tag: 'v1.0.0', git_head: 'abc', evidence_receipt_id: 'r1',
  requested_by: 'user', _mock_timestamp: TS,
});
assert(blockedBaseNull.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_BASELINE', '[E-04] null baseline blocked');

// ─── Suite F: Blocked Report ──────────────────────────────────────
console.log('\n[Suite F] Blocked Report');
const blockedReport = createRealTagManualExecutorContract({
  target_tag: 'v1.0.0', git_head: 'abc', evidence_receipt_id: 'r1',
  requested_by: 'user',
  real_tag_baseline: READY_BASELINE,
  one_shot_report: { tag_report_status: 'WRONG' },
  _mock_timestamp: TS,
});
assert(blockedReport.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_REPORT', '[F-01] blocked_report: status');
assert(blockedReport.manual_executor_contract_ready  === false,                      '[F-02] blocked_report: not ready');
assert(blockedReport.blocking_reason                 === 'one_shot_report_not_ready','[F-03] blocked_report: reason');

// ─── Suite G: Blocked Evidence ────────────────────────────────────
console.log('\n[Suite G] Blocked Evidence');
const blockedEvidence = createRealTagManualExecutorContract({
  target_tag: 'v1.0.0', git_head: 'abc', evidence_receipt_id: 'r1',
  requested_by: 'user',
  real_tag_baseline: READY_BASELINE,
  one_shot_report: READY_REPORT,
  evidence_source: 'wrong-source',
  rollback_anchor_id: 'anchor1',
  human_confirmation_phrase: MANUAL_EXEC_CONTRACT_PHRASE,
  _mock_timestamp: TS,
});
assert(blockedEvidence.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_EVIDENCE', '[G-01] blocked_evidence: status');
assert(blockedEvidence.manual_executor_contract_ready  === false,                    '[G-02] blocked_evidence: not ready');
assert(blockedEvidence.blocking_reason                 === 'evidence_source_not_go_core', '[G-03] blocked_evidence: reason');

// ─── Suite H: Blocked Rollback ────────────────────────────────────
console.log('\n[Suite H] Blocked Rollback');
const blockedRollback = createRealTagManualExecutorContract({
  target_tag: 'v1.0.0', git_head: 'abc', evidence_receipt_id: 'r1',
  requested_by: 'user',
  real_tag_baseline: READY_BASELINE,
  one_shot_report: READY_REPORT,
  evidence_source: 'go-core',
  _mock_timestamp: TS,
});
assert(blockedRollback.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_ROLLBACK', '[H-01] blocked_rollback: status');
assert(blockedRollback.manual_executor_contract_ready  === false,                    '[H-02] blocked_rollback: not ready');
assert(blockedRollback.blocking_reason                 === 'rollback_anchor_id_missing', '[H-03] blocked_rollback: reason');

// ─── Suite I: Blocked Tag Name ────────────────────────────────────
console.log('\n[Suite I] Blocked Tag Name');
const blockedTag = createRealTagManualExecutorContract({
  target_tag: '1.0.0', git_head: 'abc', evidence_receipt_id: 'r1',
  requested_by: 'user',
  real_tag_baseline: READY_BASELINE,
  one_shot_report: READY_REPORT,
  evidence_source: 'go-core',
  rollback_anchor_id: 'anchor1',
  human_confirmation_phrase: MANUAL_EXEC_CONTRACT_PHRASE,
  _mock_timestamp: TS,
});
assert(blockedTag.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_TAG_NAME', '[I-01] blocked_tag: status');
assert(blockedTag.manual_executor_contract_ready  === false,                         '[I-02] blocked_tag: not ready');
assert(blockedTag.blocking_reason                 === 'target_tag_must_start_with_v','[I-03] blocked_tag: reason');

// ─── Suite J: Phrase Mismatch ─────────────────────────────────────
console.log('\n[Suite J] Phrase Mismatch');
const phraseWrong = createRealTagManualExecutorContract({
  target_tag: 'v1.0.0', git_head: 'abc', evidence_receipt_id: 'r1',
  requested_by: 'user',
  real_tag_baseline: READY_BASELINE,
  one_shot_report: READY_REPORT,
  evidence_source: 'go-core',
  rollback_anchor_id: 'anchor1',
  human_confirmation_phrase: 'wrong phrase',
  _mock_timestamp: TS,
});
assert(phraseWrong.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_PHRASE_MISMATCH', '[J-01] phrase: status');
assert(phraseWrong.manual_executor_contract_ready  === false,                        '[J-02] phrase: not ready');
assert(phraseWrong.blocking_reason                 === 'confirmation_phrase_mismatch','[J-03] phrase: reason');

const phraseEmpty = createRealTagManualExecutorContract({
  target_tag: 'v1.0.0', git_head: 'abc', evidence_receipt_id: 'r1',
  requested_by: 'user',
  real_tag_baseline: READY_BASELINE,
  one_shot_report: READY_REPORT,
  evidence_source: 'go-core',
  rollback_anchor_id: 'anchor1',
  _mock_timestamp: TS,
});
assert(phraseEmpty.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_PHRASE_MISMATCH', '[J-04] empty phrase blocked');

// ─── Suite K: Valid (happy path) ──────────────────────────────────
console.log('\n[Suite K] Valid');
const valid = createRealTagManualExecutorContract({
  target_tag: 'v2.0.0',
  target_version: '2.0.0',
  git_head: 'deadbeef1234567890123456789012345678abcd',
  evidence_receipt_id: 'receipt-real-id-001',
  evidence_source: 'go-core',
  rollback_anchor_id: 'anchor-real-001',
  real_tag_baseline: READY_BASELINE,
  one_shot_report: READY_REPORT,
  requested_by: 'release-manager',
  requester_role: 'release-manager',
  human_confirmation_phrase: MANUAL_EXEC_CONTRACT_PHRASE,
  _mock_timestamp: TS,
});
assert(valid.manual_executor_contract_status === 'MANUAL_TAG_EXEC_CONTRACT_READY_REVIEW', '[K-01] valid: status');
assert(valid.manual_executor_contract_ready  === true,                               '[K-02] valid: ready=true');
assert(valid.blocking_reason                 === null,                               '[K-03] valid: blocking=null');
assert(valid.target_tag                      === 'v2.0.0',                           '[K-04] valid: target_tag');
assert(valid.target_version                  === '2.0.0',                            '[K-05] valid: target_version');
assert(valid.git_head                        === 'deadbeef1234567890123456789012345678abcd', '[K-06] valid: git_head');
assert(valid.evidence_source                 === 'go-core',                          '[K-07] valid: evidence_source');
assert(valid.rollback_anchor_id              === 'anchor-real-001',                  '[K-08] valid: rollback_anchor_id');
assert(valid.requested_by                    === 'release-manager',                  '[K-09] valid: requested_by');
assert(valid.real_tag_baseline_id            === READY_BASELINE.baseline_id,         '[K-10] valid: baseline_id ref');
assert(valid.one_shot_report_id              === READY_REPORT.report_id,             '[K-11] valid: report_id ref');
assert(typeof valid.manual_executor_contract_id === 'string' && valid.manual_executor_contract_id.length === 24, '[K-12] valid: id 24 chars');
assert(valid.created_at                      === TS,                                 '[K-13] valid: created_at');
assert(valid.human_confirmation_phrase       === MANUAL_EXEC_CONTRACT_PHRASE,        '[K-14] valid: phrase stored');

// ─── Suite L: Invariants ──────────────────────────────────────────
console.log('\n[Suite L] Invariants');
assert(valid.real_tag_execution_allowed === false, '[L-01] real_tag_execution_allowed=false');
assert(valid.tag_created                === false, '[L-02] tag_created=false');
assert(valid.git_push_performed         === false, '[L-03] git_push_performed=false');
assert(valid.deploy_performed           === false, '[L-04] deploy_performed=false');
assert(valid.stable_promoted            === false, '[L-05] stable_promoted=false');
assert(valid.release_performed          === false, '[L-06] release_performed=false');
assert(valid.manual_executor_only       === true,  '[L-07] manual_executor_only=true');
assert(valid.local_interactive_only     === true,  '[L-08] local_interactive_only=true');
assert(valid.ci_blocked                 === true,  '[L-09] ci_blocked=true');
assert(valid.dry_run_default            === true,  '[L-10] dry_run_default=true');
assert(fix.real_tag_execution_allowed   === false, '[L-11] fixture: real_tag_execution_allowed=false');
assert(fix.tag_created                  === false, '[L-12] fixture: tag_created=false');
assert(fix.ci_blocked                   === true,  '[L-13] fixture: ci_blocked=true');

// ─── Suite M: Normalize ───────────────────────────────────────────
console.log('\n[Suite M] Normalize');
assert(normalizeRealTagManualExecutorContract(null) === null,                        '[M-01] null → null');
const tampered = { ...valid, real_tag_execution_allowed: true, tag_created: true };
const normalized = normalizeRealTagManualExecutorContract(tampered);
assert(normalized.real_tag_execution_allowed === false,                              '[M-02] normalize: locks exec=false');
assert(normalized.tag_created               === false,                               '[M-03] normalize: locks tag=false');
assert(normalized.ci_blocked                === true,                                '[M-04] normalize: ci_blocked=true');
assert(normalized.manual_executor_only      === true,                                '[M-05] normalize: manual_executor_only=true');

// ─── Suite N: Validate ────────────────────────────────────────────
console.log('\n[Suite N] Validate');
const vNull = validateRealTagManualExecutorContract(null);
assert(vNull.valid === false && vNull.reason === 'null_or_invalid',                  '[N-01] null → invalid');
const vUnknown = validateRealTagManualExecutorContract({ ...valid, manual_executor_contract_status: 'UNKNOWN_STATUS' });
assert(vUnknown.valid === false && vUnknown.reason === 'unknown_status',             '[N-02] unknown status → invalid');
const vExecTrue = validateRealTagManualExecutorContract({ ...valid, real_tag_execution_allowed: true });
assert(vExecTrue.valid === false && vExecTrue.reason === 'execution_must_be_false',  '[N-03] exec=true → invalid');
const vTagTrue = validateRealTagManualExecutorContract({ ...valid, tag_created: true });
assert(vTagTrue.valid === false && vTagTrue.reason === 'tag_created_must_be_false',  '[N-04] tag=true → invalid');
const vPushTrue = validateRealTagManualExecutorContract({ ...valid, git_push_performed: true });
assert(vPushTrue.valid === false && vPushTrue.reason === 'git_push_must_be_false',   '[N-05] push=true → invalid');
const vOk = validateRealTagManualExecutorContract(valid);
assert(vOk.valid === true,                                                           '[N-06] valid contract → valid');

// ─── Suite O: Render ──────────────────────────────────────────────
console.log('\n[Suite O] Render');
const rendered = renderRealTagManualExecutorContractSummary(fix);
assert(typeof rendered === 'string',                                                 '[O-01] returns string');
assert(rendered.includes('MANUAL_TAG_EXEC_CONTRACT_READY_REVIEW'),                  '[O-02] status in output');
assert(rendered.includes('real_tag_execution_allowed       : false'),               '[O-03] exec=false');
assert(rendered.includes('tag_created                      : false'),               '[O-04] tag=false');
assert(rendered.includes('git_push_performed               : false'),               '[O-05] push=false');
assert(rendered.includes('manual_executor_only             : true'),                '[O-06] manual_executor=true');
assert(rendered.includes('ci_blocked                       : true'),                '[O-07] ci_blocked=true');
assert(rendered.includes('dry_run_default                  : true'),                '[O-08] dry_run=true');
assert(renderRealTagManualExecutorContractSummary(null) === 'real_tag_manual_executor_contract: null', '[O-09] null → string');

// ─── Suite P: Deterministic ID ────────────────────────────────────
console.log('\n[Suite P] Deterministic ID');
const d1 = createRealTagManualExecutorContract({ fixture_mode: true, _mock_timestamp: TS });
const d2 = createRealTagManualExecutorContract({ fixture_mode: true, _mock_timestamp: TS });
assert(d1.manual_executor_contract_id === d2.manual_executor_contract_id,           '[P-01] deterministic fixture id');

const v1 = createRealTagManualExecutorContract({
  target_tag: 'v3.0.0', git_head: 'aaa', evidence_receipt_id: 'r1',
  requested_by: 'u', real_tag_baseline: READY_BASELINE, one_shot_report: READY_REPORT,
  evidence_source: 'go-core', rollback_anchor_id: 'a1',
  human_confirmation_phrase: MANUAL_EXEC_CONTRACT_PHRASE, _mock_timestamp: TS,
});
const v2 = createRealTagManualExecutorContract({
  target_tag: 'v3.0.0', git_head: 'aaa', evidence_receipt_id: 'r1',
  requested_by: 'u', real_tag_baseline: READY_BASELINE, one_shot_report: READY_REPORT,
  evidence_source: 'go-core', rollback_anchor_id: 'a1',
  human_confirmation_phrase: MANUAL_EXEC_CONTRACT_PHRASE, _mock_timestamp: TS,
});
assert(v1.manual_executor_contract_id === v2.manual_executor_contract_id,           '[P-02] deterministic valid id');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-executor-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
