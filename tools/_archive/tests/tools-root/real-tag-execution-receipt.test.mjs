#!/usr/bin/env node
/**
 * Real Tag Execution Receipt — Unit Tests V88.0
 */

import {
  RECEIPT_STATUSES,
  RECEIPT_TYPES,
  buildRealTagExecutionReceipt,
  validateRealTagExecutionReceipt,
  renderRealTagExecutionReceipt,
} from '../real-tag-execution-receipt.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS      = '2026-05-19T00:00:00.000Z';
const TAG     = 'v1.0.0-test';
const EXEC_ID = 'exec-id-fixture-001234';
const VER_ID  = 'ver-id-fixture-001234';
const RCPT_ID = 'rcpt-go-core-001';
const RBK_ID  = 'rbk-anchor-001';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RECEIPT_STATUSES),                                                '[A-01] statuses array');
assert(RECEIPT_STATUSES.length === 6,                                                  '[A-02] 6 statuses');
assert(RECEIPT_STATUSES.includes('RECEIPT_BLOCKED_EXECUTOR'),                          '[A-03] BLOCKED_EXECUTOR');
assert(RECEIPT_STATUSES.includes('RECEIPT_BLOCKED_VERIFIER'),                          '[A-04] BLOCKED_VERIFIER');
assert(RECEIPT_STATUSES.includes('RECEIPT_BLOCKED_HASH'),                              '[A-05] BLOCKED_HASH');
assert(RECEIPT_STATUSES.includes('RECEIPT_DRY_RUN_VERIFIED'),                          '[A-06] DRY_RUN_VERIFIED');
assert(RECEIPT_STATUSES.includes('RECEIPT_REAL_TAG_CREATED'),                          '[A-07] REAL_TAG_CREATED');
assert(RECEIPT_STATUSES.includes('RECEIPT_ROLLBACK_EXECUTED'),                         '[A-08] ROLLBACK_EXECUTED');
assert(Array.isArray(RECEIPT_TYPES),                                                   '[A-09] types array');
assert(RECEIPT_TYPES.length === 3,                                                     '[A-10] 3 types');
assert(RECEIPT_TYPES.includes('dry_run_verified'),                                     '[A-11] dry_run_verified');
assert(RECEIPT_TYPES.includes('real_tag_created'),                                     '[A-12] real_tag_created');
assert(RECEIPT_TYPES.includes('rollback_executed'),                                    '[A-13] rollback_executed');

// ─── Suite B: Fixture mode — DRY_RUN_VERIFIED ─────────────────────
console.log('\n[Suite B] Fixture mode — DRY_RUN_VERIFIED');
const fix = buildRealTagExecutionReceipt({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                         '[B-01] returns object');
assert(fix.receipt_status   === 'RECEIPT_DRY_RUN_VERIFIED',                           '[B-02] DRY_RUN_VERIFIED');
assert(fix.receipt_type     === 'dry_run_verified',                                    '[B-03] type=dry_run_verified');
assert(fix.receipt_ready    === true,                                                   '[B-04] ready=true');
assert(typeof fix.receipt_hash === 'string' && fix.receipt_hash.length === 32,        '[B-05] hash 32 chars');
assert(fix.blocking_reason  === null,                                                   '[B-06] blocking=null');
assert(fix.created_at       === TS,                                                     '[B-07] created_at=TS');
assert(typeof fix.receipt_id === 'string' && fix.receipt_id.length === 24,            '[B-08] id 24 chars');
assert(fix.schema_version   === 'v88.0',                                              '[B-09] schema=v88.0');

// ─── Suite C: Fixture mode — REAL_TAG_CREATED ─────────────────────
console.log('\n[Suite C] Fixture mode — REAL_TAG_CREATED');
const fixReal = buildRealTagExecutionReceipt({
  fixture_mode: true, executor_status: 'LOCAL_EXEC_REAL_TAG_EXECUTED',
  target_tag: TAG, executor_id: EXEC_ID, verifier_id: VER_ID,
  evidence_receipt_id: RCPT_ID, rollback_anchor_id: RBK_ID, _mock_timestamp: TS,
});
assert(fixReal.receipt_status === 'RECEIPT_REAL_TAG_CREATED',                          '[C-01] REAL_TAG_CREATED');
assert(fixReal.receipt_type   === 'real_tag_created',                                  '[C-02] type=real_tag_created');
assert(fixReal.receipt_ready  === true,                                                 '[C-03] ready=true');
assert(fixReal.tag_created    === false,                                                '[C-04] tag_created=false (receipt)');
assert(fixReal.target_tag     === TAG,                                                  '[C-05] target_tag');

// ─── Suite D: Fixture mode — ROLLBACK_EXECUTED ────────────────────
console.log('\n[Suite D] Fixture mode — ROLLBACK_EXECUTED');
const fixRbk = buildRealTagExecutionReceipt({
  fixture_mode: true, rollback_executed: true,
  target_tag: TAG, _mock_timestamp: TS,
});
assert(fixRbk.receipt_status === 'RECEIPT_ROLLBACK_EXECUTED',                          '[D-01] ROLLBACK_EXECUTED');
assert(fixRbk.receipt_type   === 'rollback_executed',                                  '[D-02] type=rollback_executed');
assert(fixRbk.receipt_ready  === true,                                                  '[D-03] ready=true');
assert(fixRbk.tag_created    === false,                                                 '[D-04] tag_created=false');

// ─── Suite E: Block scenarios ──────────────────────────────────────
console.log('\n[Suite E] Block scenarios');
const e_noexec = buildRealTagExecutionReceipt({
  executor_ready: false, _mock_timestamp: TS,
});
assert(e_noexec.receipt_status === 'RECEIPT_BLOCKED_EXECUTOR',                        '[E-01] BLOCKED_EXECUTOR');
assert(e_noexec.tag_created    === false,                                              '[E-02] tag_created=false');

const e_noverify = buildRealTagExecutionReceipt({
  executor_ready: true, executor_status: 'LOCAL_EXEC_REAL_TAG_EXECUTED',
  verification_passed: false, _mock_timestamp: TS,
});
assert(e_noverify.receipt_status === 'RECEIPT_BLOCKED_VERIFIER',                      '[E-03] BLOCKED_VERIFIER');

// ─── Suite F: Non-fixture dry_run_verified ────────────────────────
console.log('\n[Suite F] Non-fixture dry_run_verified');
const f_dry = buildRealTagExecutionReceipt({
  executor_ready: true, executor_status: 'LOCAL_EXEC_DRY_RUN_COMPLETE',
  target_tag: TAG, executor_id: EXEC_ID, verifier_id: VER_ID, _mock_timestamp: TS,
});
assert(f_dry.receipt_status   === 'RECEIPT_DRY_RUN_VERIFIED',                         '[F-01] DRY_RUN_VERIFIED');
assert(f_dry.receipt_type     === 'dry_run_verified',                                  '[F-02] type=dry_run_verified');
assert(f_dry.receipt_ready    === true,                                                 '[F-03] ready=true');
assert(typeof f_dry.receipt_hash === 'string' && f_dry.receipt_hash.length === 32,    '[F-04] hash 32 chars');
assert(f_dry.tag_created      === false,                                               '[F-05] tag_created=false');

// ─── Suite G: Non-fixture real_tag_created ────────────────────────
console.log('\n[Suite G] Non-fixture real_tag_created');
const g_real = buildRealTagExecutionReceipt({
  executor_ready: true, executor_status: 'LOCAL_EXEC_REAL_TAG_EXECUTED',
  verification_passed: true, verifier_status: 'POST_EXEC_VERIFY_PASSED',
  target_tag: TAG, executor_id: EXEC_ID, verifier_id: VER_ID,
  evidence_receipt_id: RCPT_ID, _mock_timestamp: TS,
});
assert(g_real.receipt_status   === 'RECEIPT_REAL_TAG_CREATED',                        '[G-01] REAL_TAG_CREATED');
assert(g_real.receipt_type     === 'real_tag_created',                                 '[G-02] type=real_tag_created');
assert(g_real.receipt_hash.length === 32,                                              '[G-03] hash 32 chars');
assert(g_real.tag_created      === false,                                              '[G-04] tag_created=false (receipt)');

// ─── Suite H: Non-fixture rollback_executed ───────────────────────
console.log('\n[Suite H] Non-fixture rollback_executed');
const h_rbk = buildRealTagExecutionReceipt({
  executor_ready: true, rollback_executed: true, rollback_status: 'ROLLBACK_EXEC_EXECUTED',
  target_tag: TAG, rollback_id: 'rbk-001', _mock_timestamp: TS,
});
assert(h_rbk.receipt_status   === 'RECEIPT_ROLLBACK_EXECUTED',                        '[H-01] ROLLBACK_EXECUTED');
assert(h_rbk.receipt_type     === 'rollback_executed',                                 '[H-02] type=rollback_executed');
assert(h_rbk.tag_created      === false,                                               '[H-03] tag_created=false');

// ─── Suite I: Deterministic hash ─────────────────────────────────
console.log('\n[Suite I] Deterministic hash');
const i1 = buildRealTagExecutionReceipt({
  executor_ready: true, executor_status: 'LOCAL_EXEC_DRY_RUN_COMPLETE',
  target_tag: TAG, executor_id: EXEC_ID, verifier_id: VER_ID, _mock_timestamp: TS,
});
const i2 = buildRealTagExecutionReceipt({
  executor_ready: true, executor_status: 'LOCAL_EXEC_DRY_RUN_COMPLETE',
  target_tag: TAG, executor_id: EXEC_ID, verifier_id: VER_ID, _mock_timestamp: TS,
});
assert(i1.receipt_hash === i2.receipt_hash,                                            '[I-01] deterministic hash');
assert(i1.receipt_id   === i2.receipt_id,                                              '[I-02] deterministic id');

// ─── Suite J: Invariants ──────────────────────────────────────────
console.log('\n[Suite J] Invariants');
assert(fix.tag_created                  === false, '[J-01] tag_created=false');
assert(fix.git_push_performed           === false, '[J-02] push=false');
assert(fix.deploy_performed             === false, '[J-03] deploy=false');
assert(fix.stable_promoted              === false, '[J-04] stable=false');
assert(fix.release_performed            === false, '[J-05] release=false');
assert(fix.real_execution_not_performed === true,  '[J-06] not_performed=true');
assert(fixReal.tag_created              === false, '[J-07] real fixture: tag_created=false');

// ─── Suite K: Validate ────────────────────────────────────────────
console.log('\n[Suite K] Validate');
const k_ok = validateRealTagExecutionReceipt(fix);
assert(k_ok.valid === true,                                                            '[K-01] valid dry_run fix');
const k_null = validateRealTagExecutionReceipt(null);
assert(k_null.valid === false,                                                         '[K-02] null invalid');
const k_bad = validateRealTagExecutionReceipt({ receipt_status: 'RECEIPT_DRY_RUN_VERIFIED', receipt_ready: true, receipt_type: 'UNKNOWN' });
assert(k_bad.errors.includes('receipt_type_invalid'),                                  '[K-03] invalid type → error');

// ─── Suite L: Render ──────────────────────────────────────────────
console.log('\n[Suite L] Render');
const rendered = renderRealTagExecutionReceipt(fix);
assert(typeof rendered === 'string',                                                   '[L-01] returns string');
assert(rendered.includes('RECEIPT_DRY_RUN_VERIFIED'),                                  '[L-02] status in output');
assert(rendered.includes('tag_created                   : false'),                     '[L-03] tag=false');
assert(rendered.includes('deploy_performed              : false'),                     '[L-04] deploy=false');
assert(rendered.includes('receipt_hash'),                                              '[L-05] hash field');
assert(rendered.includes('receipt_type'),                                              '[L-06] type field');
assert(renderRealTagExecutionReceipt(null) === 'real_tag_execution_receipt: null',    '[L-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-execution-receipt: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
