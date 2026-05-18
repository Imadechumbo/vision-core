#!/usr/bin/env node
/**
 * Real Tag Manual Execution Receipt Preview — Unit Tests V83.1
 */

import {
  buildRealTagManualReceiptPreview,
  validateRealTagManualReceiptPreview,
  renderRealTagManualReceiptPreview,
  RECEIPT_PREVIEW_STATUSES,
} from '../real-tag-manual-execution-receipt-preview.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T19:30:00.000Z';

const READY_DRY_RUN = {
  dry_run_ready: true,
  executor_id: 'executor-test-001',
  target_tag: 'v3.0.0',
  target_git_head: 'cafebabe1234567890123456789012345678beef',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RECEIPT_PREVIEW_STATUSES),                                      '[A-01] statuses array');
assert(RECEIPT_PREVIEW_STATUSES.length === 4,                                        '[A-02] 4 statuses');
assert(RECEIPT_PREVIEW_STATUSES.includes('RECEIPT_PREVIEW_BLOCKED_DRY_RUN'),        '[A-03] BLOCKED_DRY_RUN');
assert(RECEIPT_PREVIEW_STATUSES.includes('RECEIPT_PREVIEW_BLOCKED_EVIDENCE'),       '[A-04] BLOCKED_EVIDENCE');
assert(RECEIPT_PREVIEW_STATUSES.includes('RECEIPT_PREVIEW_BLOCKED_HASH'),           '[A-05] BLOCKED_HASH');
assert(RECEIPT_PREVIEW_STATUSES.includes('RECEIPT_PREVIEW_READY'),                  '[A-06] READY');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagManualReceiptPreview({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                      '[B-01] returns object');
assert(fix.schema_version          === 'v83.1',                                      '[B-02] schema=v83.1');
assert(fix.receipt_preview_status  === 'RECEIPT_PREVIEW_READY',                     '[B-03] READY');
assert(fix.receipt_preview_ready   === true,                                         '[B-04] ready=true');
assert(typeof fix.preview_id === 'string' && fix.preview_id.length === 24,          '[B-05] id 24 chars');
assert(fix.blocking_reason         === null,                                         '[B-06] blocking=null');
assert(fix.preview_only            === true,                                         '[B-07] preview_only=true');
assert(fix.real_receipt_created    === false,                                        '[B-08] real_receipt=false');
assert(fix.tag_created             === false,                                        '[B-09] tag_created=false');
assert(typeof fix.preview_receipt_hash === 'string' && fix.preview_receipt_hash.length === 32, '[B-10] hash 32 chars');
assert(fix.evidence_source         === 'go-core',                                   '[B-11] evidence=go-core');
assert(fix.created_at              === TS,                                           '[B-12] created_at=TS');

// ─── Suite C: Blocked Dry Run ─────────────────────────────────────
console.log('\n[Suite C] Blocked Dry Run');
const blockedC1 = buildRealTagManualReceiptPreview({ _mock_timestamp: TS });
assert(blockedC1.receipt_preview_status === 'RECEIPT_PREVIEW_BLOCKED_DRY_RUN',      '[C-01] null dry_run blocked');
assert(blockedC1.receipt_preview_ready  === false,                                   '[C-02] not ready');
assert(blockedC1.blocking_reason        === 'dry_run_not_ready',                     '[C-03] reason');
assert(blockedC1.preview_receipt_hash   === null,                                    '[C-04] hash=null when blocked');

const blockedC2 = buildRealTagManualReceiptPreview({
  dry_run_result: { dry_run_ready: false }, _mock_timestamp: TS,
});
assert(blockedC2.receipt_preview_status === 'RECEIPT_PREVIEW_BLOCKED_DRY_RUN',      '[C-05] false dry_run blocked');

// ─── Suite D: Blocked Evidence ────────────────────────────────────
console.log('\n[Suite D] Blocked Evidence');
const blockedD1 = buildRealTagManualReceiptPreview({
  dry_run_result: READY_DRY_RUN, _mock_timestamp: TS,
});
assert(blockedD1.receipt_preview_status === 'RECEIPT_PREVIEW_BLOCKED_EVIDENCE',     '[D-01] no evidence blocked');
assert(blockedD1.blocking_reason        === 'evidence_not_ready_or_not_go_core',     '[D-02] reason');

const blockedD2 = buildRealTagManualReceiptPreview({
  dry_run_result: READY_DRY_RUN,
  evidence_receipt_id: 'r1',
  evidence_source: 'wrong-source',
  _mock_timestamp: TS,
});
assert(blockedD2.receipt_preview_status === 'RECEIPT_PREVIEW_BLOCKED_EVIDENCE',     '[D-03] wrong source blocked');

// ─── Suite E: Blocked Hash ────────────────────────────────────────
console.log('\n[Suite E] Blocked Hash');
const blockedE = buildRealTagManualReceiptPreview({
  dry_run_result: { dry_run_ready: true, executor_id: 'e1', target_tag: null, target_git_head: null },
  evidence_receipt_id: 'r1',
  evidence_source: 'go-core',
  _mock_timestamp: TS,
});
assert(blockedE.receipt_preview_status === 'RECEIPT_PREVIEW_BLOCKED_HASH',          '[E-01] null tag/head blocked');
assert(blockedE.blocking_reason        === 'tag_or_head_missing_for_hash',           '[E-02] reason');

// ─── Suite F: Valid ───────────────────────────────────────────────
console.log('\n[Suite F] Valid');
const valid = buildRealTagManualReceiptPreview({
  dry_run_result: READY_DRY_RUN,
  evidence_receipt_id: 'receipt-real-001',
  evidence_source: 'go-core',
  requested_by: 'release-manager',
  _mock_timestamp: TS,
});
assert(valid.receipt_preview_status  === 'RECEIPT_PREVIEW_READY',                   '[F-01] status READY');
assert(valid.receipt_preview_ready   === true,                                       '[F-02] ready=true');
assert(valid.blocking_reason         === null,                                       '[F-03] blocking=null');
assert(valid.target_tag              === READY_DRY_RUN.target_tag,                  '[F-04] target_tag from dry_run');
assert(valid.target_git_head         === READY_DRY_RUN.target_git_head,             '[F-05] git_head from dry_run');
assert(valid.evidence_receipt_id     === 'receipt-real-001',                        '[F-06] evidence_receipt stored');
assert(valid.evidence_source         === 'go-core',                                 '[F-07] evidence_source stored');
assert(valid.dry_run_executor_id     === READY_DRY_RUN.executor_id,                 '[F-08] executor_id ref');
assert(typeof valid.preview_receipt_hash === 'string' && valid.preview_receipt_hash.length === 32, '[F-09] hash 32 chars');
assert(valid.requested_by            === 'release-manager',                         '[F-10] requested_by');

// ─── Suite G: Deterministic Hash ─────────────────────────────────
console.log('\n[Suite G] Deterministic Hash');
const h1 = buildRealTagManualReceiptPreview({
  dry_run_result: READY_DRY_RUN, evidence_receipt_id: 'r1',
  evidence_source: 'go-core', _mock_timestamp: TS,
});
const h2 = buildRealTagManualReceiptPreview({
  dry_run_result: READY_DRY_RUN, evidence_receipt_id: 'r1',
  evidence_source: 'go-core', _mock_timestamp: TS,
});
assert(h1.preview_receipt_hash === h2.preview_receipt_hash,                         '[G-01] deterministic hash');
assert(h1.preview_id           === h2.preview_id,                                   '[G-02] deterministic id');

// Different evidence → different hash
const hDiff = buildRealTagManualReceiptPreview({
  dry_run_result: READY_DRY_RUN, evidence_receipt_id: 'different-r',
  evidence_source: 'go-core', _mock_timestamp: TS,
});
assert(h1.preview_receipt_hash !== hDiff.preview_receipt_hash,                      '[G-03] different evidence = different hash');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(valid.preview_only          === true,  '[H-01] preview_only=true');
assert(valid.real_receipt_created  === false, '[H-02] real_receipt=false');
assert(valid.tag_created           === false, '[H-03] tag_created=false');
assert(valid.git_push_performed    === false, '[H-04] push=false');
assert(valid.deploy_performed      === false, '[H-05] deploy=false');
assert(valid.stable_promoted       === false, '[H-06] stable=false');
assert(valid.release_performed     === false, '[H-07] release=false');
assert(fix.preview_only            === true,  '[H-08] fixture: preview_only=true');
assert(fix.real_receipt_created    === false, '[H-09] fixture: real_receipt=false');

// ─── Suite I: Validate ────────────────────────────────────────────
console.log('\n[Suite I] Validate');
assert(validateRealTagManualReceiptPreview(null).valid === false,                    '[I-01] null → invalid');
assert(validateRealTagManualReceiptPreview({ ...valid, receipt_preview_status: 'BAD' }).valid === false, '[I-02] unknown status');
assert(validateRealTagManualReceiptPreview({ ...valid, preview_only: false }).valid === false, '[I-03] preview_only=false → invalid');
assert(validateRealTagManualReceiptPreview({ ...valid, real_receipt_created: true }).valid === false, '[I-04] real_receipt=true → invalid');
assert(validateRealTagManualReceiptPreview({ ...valid, tag_created: true }).valid === false, '[I-05] tag=true → invalid');
assert(validateRealTagManualReceiptPreview({ ...valid, git_push_performed: true }).valid === false, '[I-06] push=true → invalid');
assert(validateRealTagManualReceiptPreview(valid).valid === true,                    '[I-07] valid → valid');

// ─── Suite J: Render ──────────────────────────────────────────────
console.log('\n[Suite J] Render');
const rendered = renderRealTagManualReceiptPreview(fix);
assert(typeof rendered === 'string',                                                 '[J-01] returns string');
assert(rendered.includes('RECEIPT_PREVIEW_READY'),                                  '[J-02] status in output');
assert(rendered.includes('preview_only              : true'),                       '[J-03] preview_only=true');
assert(rendered.includes('real_receipt_created      : false'),                      '[J-04] real_receipt=false');
assert(rendered.includes('tag_created               : false'),                      '[J-05] tag=false');
assert(rendered.includes('preview_receipt_hash'),                                    '[J-06] hash field in output');
assert(renderRealTagManualReceiptPreview(null) === 'real_tag_manual_execution_receipt_preview: null', '[J-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-execution-receipt-preview: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
