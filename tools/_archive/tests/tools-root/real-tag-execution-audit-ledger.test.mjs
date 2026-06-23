#!/usr/bin/env node
/**
 * Real Tag Execution Audit Ledger — Unit Tests V88.1
 */

import {
  AUDIT_LEDGER_STATUSES,
  AUDIT_EVENT_TYPES,
  buildRealTagExecutionAuditLedger,
  validateAuditLedgerResult,
  renderAuditLedgerSummary,
} from '../real-tag-execution-audit-ledger.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS      = '2026-05-19T00:30:00.000Z';
const TAG     = 'v1.0.0-test';
const RCPT_ID = 'rcpt-001';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(AUDIT_LEDGER_STATUSES),                                            '[A-01] statuses array');
assert(AUDIT_LEDGER_STATUSES.length === 2,                                              '[A-02] 2 statuses');
assert(AUDIT_LEDGER_STATUSES.includes('AUDIT_LEDGER_BLOCKED_RECEIPT'),                 '[A-03] BLOCKED_RECEIPT');
assert(AUDIT_LEDGER_STATUSES.includes('AUDIT_LEDGER_READY'),                           '[A-04] READY');
assert(Array.isArray(AUDIT_EVENT_TYPES),                                                '[A-05] event types array');
assert(AUDIT_EVENT_TYPES.length === 8,                                                  '[A-06] 8 event types');
assert(AUDIT_EVENT_TYPES.includes('CONTROLLER_EVALUATED'),                             '[A-07] CONTROLLER_EVALUATED');
assert(AUDIT_EVENT_TYPES.includes('EXECUTOR_DRY_RUN_COMPLETED'),                       '[A-08] DRY_RUN_COMPLETED');
assert(AUDIT_EVENT_TYPES.includes('EXECUTOR_REAL_TAG_EXECUTED'),                       '[A-09] REAL_TAG_EXECUTED');
assert(AUDIT_EVENT_TYPES.includes('VERIFIER_PASSED'),                                  '[A-10] VERIFIER_PASSED');
assert(AUDIT_EVENT_TYPES.includes('VERIFIER_FAILED'),                                  '[A-11] VERIFIER_FAILED');
assert(AUDIT_EVENT_TYPES.includes('ROLLBACK_SIMULATED'),                               '[A-12] ROLLBACK_SIMULATED');
assert(AUDIT_EVENT_TYPES.includes('ROLLBACK_EXECUTED'),                                '[A-13] ROLLBACK_EXECUTED');
assert(AUDIT_EVENT_TYPES.includes('RECEIPT_GENERATED'),                                '[A-14] RECEIPT_GENERATED');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagExecutionAuditLedger({ fixture_mode: true, target_tag: TAG, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                         '[B-01] returns object');
assert(fix.ledger_status   === 'AUDIT_LEDGER_READY',                                   '[B-02] READY');
assert(fix.ledger_ready    === true,                                                    '[B-03] ready=true');
assert(Array.isArray(fix.entries),                                                      '[B-04] entries array');
assert(fix.entries_count   === fix.entries.length,                                     '[B-05] count matches');
assert(fix.entries_count   >= 3,                                                        '[B-06] at least 3 entries');
assert(typeof fix.ledger_hash === 'string' && fix.ledger_hash.length === 32,          '[B-07] ledger_hash 32 chars');
assert(fix.blocking_reason === null,                                                    '[B-08] blocking=null');
assert(fix.created_at      === TS,                                                      '[B-09] created_at=TS');
assert(typeof fix.ledger_id === 'string' && fix.ledger_id.length === 24,             '[B-10] id 24 chars');
assert(fix.schema_version  === 'v88.1',                                               '[B-11] schema=v88.1');

// ─── Suite C: Fixture entry structure ─────────────────────────────
console.log('\n[Suite C] Entry structure');
const first = fix.entries[0];
assert(first.entry_index   === 0,                                                      '[C-01] first index=0');
assert(first.event_type    === 'CONTROLLER_EVALUATED',                                 '[C-02] first=CONTROLLER_EVALUATED');
assert(typeof first.entry_hash === 'string' && first.entry_hash.length === 32,       '[C-03] hash 32 chars');
assert(first.prev_hash     === '0'.repeat(32),                                         '[C-04] first prev=zeros');
assert(first.recorded_at   === TS,                                                     '[C-05] recorded_at=TS');

const last = fix.entries[fix.entries.length - 1];
assert(last.event_type     === 'RECEIPT_GENERATED',                                    '[C-06] last=RECEIPT_GENERATED');
assert(last.entry_hash     === fix.ledger_hash,                                        '[C-07] last hash = ledger_hash');

// ─── Suite D: Hash chain integrity ───────────────────────────────
console.log('\n[Suite D] Hash chain');
for (let i = 1; i < fix.entries.length; i++) {
  assert(fix.entries[i].prev_hash === fix.entries[i-1].entry_hash,
    `[D-0${i}] chain[${i}].prev = chain[${i-1}].hash`);
}
assert(fix.entries.length >= 1,                                                        '[D-chain] at least one transition');

// ─── Suite E: Block — no receipt ──────────────────────────────────
console.log('\n[Suite E] Block scenarios');
const e_noreceipt = buildRealTagExecutionAuditLedger({
  receipt_ready: false, _mock_timestamp: TS,
});
assert(e_noreceipt.ledger_status === 'AUDIT_LEDGER_BLOCKED_RECEIPT',                  '[E-01] BLOCKED_RECEIPT');
assert(e_noreceipt.ledger_ready  === false,                                            '[E-02] ready=false');
assert(e_noreceipt.entries_count === 0,                                                '[E-03] 0 entries');
assert(e_noreceipt.tag_created   === false,                                            '[E-04] tag_created=false');

// ─── Suite F: Non-fixture dry_run path ────────────────────────────
console.log('\n[Suite F] Non-fixture dry run');
const f_dry = buildRealTagExecutionAuditLedger({
  receipt_ready: true, receipt_status: 'RECEIPT_DRY_RUN_VERIFIED',
  receipt_id: RCPT_ID, receipt_type: 'dry_run_verified',
  executor_status: 'LOCAL_EXEC_DRY_RUN_COMPLETE',
  target_tag: TAG, _mock_timestamp: TS,
});
assert(f_dry.ledger_status   === 'AUDIT_LEDGER_READY',                                '[F-01] READY');
assert(f_dry.entries_count   >= 3,                                                     '[F-02] at least 3 entries');
assert(f_dry.entries.some(e => e.event_type === 'EXECUTOR_DRY_RUN_COMPLETED'),        '[F-03] has DRY_RUN_COMPLETED');
assert(f_dry.entries.some(e => e.event_type === 'RECEIPT_GENERATED'),                 '[F-04] has RECEIPT_GENERATED');
assert(f_dry.tag_created     === false,                                                '[F-05] tag_created=false');

// ─── Suite G: Non-fixture real_tag_created path ───────────────────
console.log('\n[Suite G] Non-fixture real tag');
const g_real = buildRealTagExecutionAuditLedger({
  receipt_ready: true, receipt_status: 'RECEIPT_REAL_TAG_CREATED',
  receipt_id: RCPT_ID, receipt_type: 'real_tag_created',
  executor_status: 'LOCAL_EXEC_REAL_TAG_EXECUTED',
  verifier_status: 'POST_EXEC_VERIFY_PASSED',
  target_tag: TAG, _mock_timestamp: TS,
});
assert(g_real.ledger_status  === 'AUDIT_LEDGER_READY',                                '[G-01] READY');
assert(g_real.entries.some(e => e.event_type === 'EXECUTOR_REAL_TAG_EXECUTED'),       '[G-02] has REAL_TAG_EXECUTED');
assert(g_real.entries.some(e => e.event_type === 'VERIFIER_PASSED'),                  '[G-03] has VERIFIER_PASSED');
assert(g_real.tag_created    === false,                                                '[G-04] tag_created=false (ledger)');

// ─── Suite H: Non-fixture rollback path ───────────────────────────
console.log('\n[Suite H] Non-fixture rollback');
const h_rbk = buildRealTagExecutionAuditLedger({
  receipt_ready: true, receipt_status: 'RECEIPT_ROLLBACK_EXECUTED',
  receipt_id: RCPT_ID, receipt_type: 'rollback_executed',
  rollback_status: 'ROLLBACK_EXEC_EXECUTED',
  target_tag: TAG, _mock_timestamp: TS,
});
assert(h_rbk.entries.some(e => e.event_type === 'ROLLBACK_EXECUTED'),                 '[H-01] has ROLLBACK_EXECUTED');
assert(h_rbk.tag_created === false,                                                    '[H-02] tag_created=false');

// ─── Suite I: Invariants ──────────────────────────────────────────
console.log('\n[Suite I] Invariants');
assert(fix.tag_created                  === false, '[I-01] tag_created=false');
assert(fix.git_push_performed           === false, '[I-02] push=false');
assert(fix.deploy_performed             === false, '[I-03] deploy=false');
assert(fix.stable_promoted              === false, '[I-04] stable=false');
assert(fix.release_performed            === false, '[I-05] release=false');
assert(fix.real_execution_not_performed === true,  '[I-06] not_performed=true');

// ─── Suite J: Validate ────────────────────────────────────────────
console.log('\n[Suite J] Validate');
const j_ok = validateAuditLedgerResult(fix);
assert(j_ok.valid === true,                                                            '[J-01] valid fixture');
const j_null = validateAuditLedgerResult(null);
assert(j_null.valid === false,                                                         '[J-02] null invalid');
const j_bad = validateAuditLedgerResult({ ledger_status: 'AUDIT_LEDGER_READY', ledger_ready: true, entries: [], entries_count: 5 });
assert(j_bad.errors.includes('entries_count_mismatch'),                               '[J-03] count mismatch → error');

// ─── Suite K: Deterministic ID ────────────────────────────────────
console.log('\n[Suite K] Deterministic ID');
const k1 = buildRealTagExecutionAuditLedger({ fixture_mode: true, target_tag: TAG, _mock_timestamp: TS });
const k2 = buildRealTagExecutionAuditLedger({ fixture_mode: true, target_tag: TAG, _mock_timestamp: TS });
assert(k1.ledger_id   === k2.ledger_id,                                               '[K-01] deterministic id');
assert(k1.ledger_hash === k2.ledger_hash,                                             '[K-02] deterministic hash');

// ─── Suite L: Render ──────────────────────────────────────────────
console.log('\n[Suite L] Render');
const rendered = renderAuditLedgerSummary(fix);
assert(typeof rendered === 'string',                                                   '[L-01] returns string');
assert(rendered.includes('AUDIT_LEDGER_READY'),                                        '[L-02] status in output');
assert(rendered.includes('tag_created                   : false'),                     '[L-03] tag=false');
assert(rendered.includes('deploy_performed              : false'),                     '[L-04] deploy=false');
assert(rendered.includes('CONTROLLER_EVALUATED'),                                      '[L-05] entry in output');
assert(renderAuditLedgerSummary(null) === 'real_tag_execution_audit_ledger: null',    '[L-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-execution-audit-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
