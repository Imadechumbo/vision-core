#!/usr/bin/env node
/**
 * Post-Tag Audit Ledger Binding — Unit Tests V98.0
 */

import {
  POST_TAG_LEDGER_STATUSES,
  POST_TAG_AUDIT_EVENT_TYPES,
  buildPostTagAuditLedgerBinding,
  validatePostTagAuditLedgerBinding,
  renderPostTagAuditLedgerBinding,
} from '../post-tag-audit-ledger-binding.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS       = '2026-05-19T11:00:00.000Z';
const SHA      = 'abc1234def567890abc12345';
const VERIFIER_DRY  = { verify_ready: true, verify_id: 'v-001', is_real_tag_verified: false };
const VERIFIER_REAL = { verify_ready: true, verify_id: 'v-002', is_real_tag_verified: true };
const SNAPSHOT = { snapshot_id: 's-001', target_tag: 'v1.0.0', git_head: SHA, evidence_source: 'go-core' };
const PKG      = { command_package_id: 'p-001', target_tag: 'v1.0.0' };
const GATE_DRY = { gate_id: 'g-001', is_real_tag_receipt: false };
const GATE_REAL= { gate_id: 'g-002', is_real_tag_receipt: true };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(POST_TAG_LEDGER_STATUSES),                                                  '[A-01] statuses array');
assert(POST_TAG_LEDGER_STATUSES.length === 2,                                                    '[A-02] 2 statuses');
assert(POST_TAG_LEDGER_STATUSES.includes('POST_TAG_LEDGER_BLOCKED_VERIFIER'),                    '[A-03] BLOCKED_VERIFIER');
assert(POST_TAG_LEDGER_STATUSES.includes('POST_TAG_LEDGER_READY'),                               '[A-04] READY');
assert(Array.isArray(POST_TAG_AUDIT_EVENT_TYPES),                                                '[A-05] event_types array');
assert(POST_TAG_AUDIT_EVENT_TYPES.length === 7,                                                  '[A-06] 7 event types');
assert(POST_TAG_AUDIT_EVENT_TYPES.includes('FINAL_PREFLIGHT_SNAPSHOT_READY'),                    '[A-07] FINAL_PREFLIGHT_SNAPSHOT_READY');
assert(POST_TAG_AUDIT_EVENT_TYPES.includes('FINAL_COMMAND_PACKAGE_READY'),                       '[A-08] FINAL_COMMAND_PACKAGE_READY');
assert(POST_TAG_AUDIT_EVENT_TYPES.includes('HUMAN_RECEIPT_IMPORT_GATE_DRY_RUN_READY'),           '[A-09] DRY_RUN_READY');
assert(POST_TAG_AUDIT_EVENT_TYPES.includes('HUMAN_RECEIPT_IMPORT_GATE_REAL_TAG_READY'),          '[A-10] REAL_TAG_READY');
assert(POST_TAG_AUDIT_EVENT_TYPES.includes('HUMAN_RECEIPT_VERIFY_DRY_RUN_CONFIRMED'),            '[A-11] DRY_RUN_CONFIRMED');
assert(POST_TAG_AUDIT_EVENT_TYPES.includes('HUMAN_RECEIPT_VERIFY_REAL_TAG_CONFIRMED'),           '[A-12] REAL_TAG_CONFIRMED');
assert(POST_TAG_AUDIT_EVENT_TYPES.includes('POST_TAG_OPERATION_BLOCKED'),                        '[A-13] POST_TAG_OPERATION_BLOCKED');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildPostTagAuditLedgerBinding({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                                  '[B-01] returns object');
assert(fix.ledger_status   === 'POST_TAG_LEDGER_READY',                                          '[B-02] READY status');
assert(fix.ledger_ready    === true,                                                             '[B-03] ledger_ready=true');
assert(fix.schema_version  === 'v98.0',                                                          '[B-04] schema=v98.0');
assert(typeof fix.ledger_id === 'string' && fix.ledger_id.length === 24,                        '[B-05] id 24 chars');
assert(fix.blocking_reason === null,                                                             '[B-06] blocking=null');
assert(Array.isArray(fix.entries) && fix.entries.length >= 4,                                   '[B-07] entries array ≥4');
assert(fix.entry_count     >= 4,                                                                 '[B-08] entry_count≥4');
assert(fix.hash_chain_valid === true,                                                            '[B-09] hash_chain_valid=true');
assert(typeof fix.last_entry_hash === 'string' && fix.last_entry_hash.length === 32,            '[B-10] last_hash 32 chars');
assert(fix.verifier_verified === true,                                                           '[B-11] verifier_verified=true');
assert(fix.created_at       === TS,                                                              '[B-12] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.actual_real_tag_created      === false, '[C-01] actual_real_tag_created=false');
assert(fix.tag_created                  === false, '[C-02] tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: Hash chain integrity ────────────────────────────────
console.log('\n[Suite D] Hash chain integrity');
const entries = fix.entries;
assert(entries[0].prev_hash === '0'.repeat(32),                                                  '[D-01] first prev_hash is zero');
for (let i = 1; i < entries.length; i++) {
  assert(entries[i].prev_hash === entries[i - 1].entry_hash,                                    `[D-02-${i}] chain link ${i} valid`);
}
assert(validatePostTagAuditLedgerBinding(fix).length === 0,                                     '[D-03] validation passes');

// ─── Suite E: BLOCKED_VERIFIER ────────────────────────────────────
console.log('\n[Suite E] BLOCKED_VERIFIER');
const bNoVerifier = buildPostTagAuditLedgerBinding({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoVerifier.ledger_status   === 'POST_TAG_LEDGER_BLOCKED_VERIFIER',                       '[E-01] no verifier → BLOCKED_VERIFIER');
assert(bNoVerifier.ledger_ready    === false,                                                    '[E-02] ready=false');
assert(bNoVerifier.actual_real_tag_created === false,                                            '[E-03] actual_tag=false in blocked');

const bBadVerifier = buildPostTagAuditLedgerBinding({
  fixture_mode:    false,
  verifier_result: { verify_ready: false },
  _mock_timestamp: TS,
});
assert(bBadVerifier.ledger_status === 'POST_TAG_LEDGER_BLOCKED_VERIFIER',                        '[E-04] bad verifier → BLOCKED_VERIFIER');

// ─── Suite F: Dry-run confirmed ledger ────────────────────────────
console.log('\n[Suite F] Dry-run confirmed ledger');
const dryLedger = buildPostTagAuditLedgerBinding({
  fixture_mode:           false,
  verifier_result:        VERIFIER_DRY,
  snapshot_result:        SNAPSHOT,
  command_package_result: PKG,
  import_gate_result:     GATE_DRY,
  _mock_timestamp:        TS,
});
assert(dryLedger.ledger_status  === 'POST_TAG_LEDGER_READY',                                    '[F-01] dry-run ledger READY');
assert(dryLedger.ledger_ready   === true,                                                        '[F-02] ready=true');
assert(dryLedger.entry_count    >= 4,                                                            '[F-03] ≥4 entries');
assert(dryLedger.hash_chain_valid === true,                                                      '[F-04] hash chain valid');
const dryTypes = dryLedger.entries.map(e => e.event_type);
assert(dryTypes.includes('FINAL_PREFLIGHT_SNAPSHOT_READY'),                                     '[F-05] snapshot event present');
assert(dryTypes.includes('FINAL_COMMAND_PACKAGE_READY'),                                        '[F-06] package event present');
assert(dryTypes.includes('HUMAN_RECEIPT_IMPORT_GATE_DRY_RUN_READY'),                            '[F-07] import gate event present');
assert(dryTypes.includes('HUMAN_RECEIPT_VERIFY_DRY_RUN_CONFIRMED'),                             '[F-08] verify event present');
// Verify entries have tag_created=false in data
const verifyEntry = dryLedger.entries.find(e => e.event_type === 'HUMAN_RECEIPT_VERIFY_DRY_RUN_CONFIRMED');
assert(verifyEntry?.data?.tag_created === false,                                                 '[F-09] verify event data tag_created=false');
assert(verifyEntry?.data?.actual_real_tag_created === false,                                     '[F-10] verify event data actual_tag=false');
assert(verifyEntry?.data?.deploy_performed === false,                                            '[F-11] verify event data deploy=false');

// ─── Suite G: Real tag confirmed ledger ───────────────────────────
console.log('\n[Suite G] Real tag confirmed ledger');
const realLedger = buildPostTagAuditLedgerBinding({
  fixture_mode:           false,
  verifier_result:        VERIFIER_REAL,
  snapshot_result:        SNAPSHOT,
  command_package_result: PKG,
  import_gate_result:     GATE_REAL,
  _mock_timestamp:        TS,
});
assert(realLedger.ledger_status  === 'POST_TAG_LEDGER_READY',                                   '[G-01] real tag ledger READY');
const realTypes = realLedger.entries.map(e => e.event_type);
assert(realTypes.includes('HUMAN_RECEIPT_IMPORT_GATE_REAL_TAG_READY'),                          '[G-02] real tag import gate event');
assert(realTypes.includes('HUMAN_RECEIPT_VERIFY_REAL_TAG_CONFIRMED'),                           '[G-03] real tag verify event');
assert(realLedger.actual_real_tag_created === false,                                             '[G-04] actual_tag=false in real tag ledger');

// ─── Suite H: Tamper detection ────────────────────────────────────
console.log('\n[Suite H] Tamper detection');
const tampered = JSON.parse(JSON.stringify(dryLedger));
tampered.entries[0].data.tag_created = true;
const tamperedFailures = validatePostTagAuditLedgerBinding(tampered);
assert(tamperedFailures.length > 0,                                                              '[H-01] tampered chain detected');

// ─── Suite I: Verifier-only ledger (no extras) ────────────────────
console.log('\n[Suite I] Verifier-only ledger');
const minLedger = buildPostTagAuditLedgerBinding({
  fixture_mode:    false,
  verifier_result: VERIFIER_DRY,
  _mock_timestamp: TS,
});
assert(minLedger.ledger_status === 'POST_TAG_LEDGER_READY',                                     '[I-01] minimal ledger READY');
assert(minLedger.entry_count   === 1,                                                            '[I-02] 1 entry for verifier only');

// ─── Suite J: Deterministic ID ────────────────────────────────────
console.log('\n[Suite J] Deterministic ID');
const j1 = buildPostTagAuditLedgerBinding({ fixture_mode: true, _mock_timestamp: TS });
const j2 = buildPostTagAuditLedgerBinding({ fixture_mode: true, _mock_timestamp: TS });
assert(j1.ledger_id === j2.ledger_id,                                                            '[J-01] deterministic id');

// ─── Suite K: Validate + Render ───────────────────────────────────
console.log('\n[Suite K] Validate + Render');
assert(validatePostTagAuditLedgerBinding(null).length > 0,                                      '[K-01] null fails validation');
const mut = { ...fix, actual_real_tag_created: true };
assert(validatePostTagAuditLedgerBinding(mut).length > 0,                                       '[K-02] actual_tag=true fails');
const rendered = renderPostTagAuditLedgerBinding(fix);
assert(typeof rendered === 'string',                                                             '[K-03] render returns string');
assert(rendered.includes('POST_TAG_LEDGER_READY'),                                              '[K-04] status in output');
assert(rendered.includes('actual_real_tag_created    : false'),                                 '[K-05] actual_tag=false in output');
assert(rendered.includes('AUDIT ENTRIES'),                                                      '[K-06] audit entries section');
assert(renderPostTagAuditLedgerBinding(null) === 'post_tag_audit_ledger_binding: null',         '[K-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\npost-tag-audit-ledger-binding: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
