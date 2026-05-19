#!/usr/bin/env node
/**
 * Real Tag Post-Execution Governance Ledger — Unit Tests V104.0
 */

import {
  POST_EXEC_GOVERNANCE_EVENT_TYPES,
  POST_EXEC_GOVERNANCE_LEDGER_STATUSES,
  buildRealTagPostExecutionGovernanceLedger,
  validateRealTagPostExecutionGovernanceLedger,
  renderRealTagPostExecutionGovernanceLedger,
} from '../real-tag-post-execution-governance-ledger.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS  = '2026-05-19T18:00:00.000Z';
const SHA = 'abc1234def567890abc12345';

const RUNBOOK  = { runbook_ready: true,     runbook_id:  'rb-001',  target_tag: 'v1.0.0' };
const SEAL     = { command_seal_valid: true, seal_id:     'seal-001', seal_hash: 'hash001' };
const TEMPLATE = { template_ready: true,    template_id: 'tmpl-001', target_tag: 'v1.0.0' };
const IMPORT   = { import_ready: true,      import_id:   'imp-001',  is_real_tag: false };
const STATE    = { state_ready: true,       state_id:    'state-001', real_tag_verified: false };
const ELIG     = { eligibility_ready: true, eligibility_id: 'elig-001', stable_review_phase_allowed: false, real_tag_verified: false };

const REAL_IMPORT = { ...IMPORT, is_real_tag: true };
const REAL_STATE  = { ...STATE,  real_tag_verified: true };
const REAL_ELIG   = { ...ELIG,   stable_review_phase_allowed: true, real_tag_verified: true };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(POST_EXEC_GOVERNANCE_EVENT_TYPES),                               '[A-01] event types array');
assert(POST_EXEC_GOVERNANCE_EVENT_TYPES.length === 9,                                 '[A-02] 9 event types');
assert(POST_EXEC_GOVERNANCE_EVENT_TYPES.includes('FINAL_RUNBOOK_READY'),              '[A-03] FINAL_RUNBOOK_READY');
assert(POST_EXEC_GOVERNANCE_EVENT_TYPES.includes('COMMAND_SEAL_READY'),               '[A-04] COMMAND_SEAL_READY');
assert(POST_EXEC_GOVERNANCE_EVENT_TYPES.includes('RECEIPT_TEMPLATE_READY'),           '[A-05] RECEIPT_TEMPLATE_READY');
assert(POST_EXEC_GOVERNANCE_EVENT_TYPES.includes('MANUAL_RECEIPT_DRY_RUN_IMPORTED'),  '[A-06] MANUAL_RECEIPT_DRY_RUN_IMPORTED');
assert(POST_EXEC_GOVERNANCE_EVENT_TYPES.includes('MANUAL_RECEIPT_REAL_TAG_IMPORTED'), '[A-07] MANUAL_RECEIPT_REAL_TAG_IMPORTED');
assert(POST_EXEC_GOVERNANCE_EVENT_TYPES.includes('VERIFIED_STATE_DRY_RUN_IMPORTED'),  '[A-08] VERIFIED_STATE_DRY_RUN_IMPORTED');
assert(POST_EXEC_GOVERNANCE_EVENT_TYPES.includes('VERIFIED_STATE_REAL_TAG_VERIFIED'), '[A-09] VERIFIED_STATE_REAL_TAG_VERIFIED');
assert(POST_EXEC_GOVERNANCE_EVENT_TYPES.includes('STABLE_REVIEW_ELIGIBILITY_READY'),  '[A-10] STABLE_REVIEW_ELIGIBILITY_READY');
assert(POST_EXEC_GOVERNANCE_EVENT_TYPES.includes('POST_EXECUTION_BLOCKED'),           '[A-11] POST_EXECUTION_BLOCKED');
assert(Array.isArray(POST_EXEC_GOVERNANCE_LEDGER_STATUSES),                           '[A-12] ledger statuses array');
assert(POST_EXEC_GOVERNANCE_LEDGER_STATUSES.length === 2,                             '[A-13] 2 ledger statuses');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagPostExecutionGovernanceLedger({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                       '[B-01] returns object');
assert(fix.ledger_status     === 'POST_EXEC_LEDGER_READY',                           '[B-02] fixture=READY');
assert(fix.ledger_ready      === true,                                                '[B-03] ledger_ready=true');
assert(fix.schema_version    === 'v104.0',                                            '[B-04] schema=v104.0');
assert(typeof fix.ledger_id === 'string' && fix.ledger_id.length === 24,             '[B-05] id 24 chars');
assert(fix.blocking_reason   === null,                                                '[B-06] blocking=null');
assert(fix.hash_chain_valid  === true,                                                '[B-07] hash_chain_valid=true');
assert(Array.isArray(fix.entries) && fix.entries.length >= 4,                        '[B-08] entries array');
assert(fix.entry_count       === fix.entries.length,                                 '[B-09] entry_count matches');
assert(fix.created_at        === TS,                                                  '[B-10] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.stable_promoted              === false, '[C-01] stable_promoted=false');
assert(fix.deploy_performed             === false, '[C-02] deploy_performed=false');
assert(fix.release_performed            === false, '[C-03] release_performed=false');
assert(fix.actual_real_tag_created      === false, '[C-04] actual_real_tag_created=false');
assert(fix.tag_created                  === false, '[C-05] tag_created=false');
assert(fix.real_execution_not_performed === true,  '[C-06] real_execution_not_performed=true');

// ─── Suite D: BLOCKED ─────────────────────────────────────────────
console.log('\n[Suite D] BLOCKED');
const bNoElig = buildRealTagPostExecutionGovernanceLedger({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoElig.ledger_status === 'POST_EXEC_LEDGER_BLOCKED_ELIGIBILITY',             '[D-01] no eligibility → BLOCKED');
assert(bNoElig.ledger_ready  === false,                                               '[D-02] ready=false');
const bBadElig = buildRealTagPostExecutionGovernanceLedger({
  fixture_mode: false, eligibility_result: { eligibility_ready: false }, _mock_timestamp: TS,
});
assert(bBadElig.ledger_status === 'POST_EXEC_LEDGER_BLOCKED_ELIGIBILITY',            '[D-03] bad eligibility → BLOCKED');

// ─── Suite E: Full dry-run chain ledger ───────────────────────────
console.log('\n[Suite E] Dry-run chain ledger');
const dryLedger = buildRealTagPostExecutionGovernanceLedger({
  fixture_mode:       false,
  runbook_result:     RUNBOOK,
  seal_result:        SEAL,
  template_result:    TEMPLATE,
  import_result:      IMPORT,
  state_result:       STATE,
  eligibility_result: ELIG,
  _mock_timestamp:    TS,
});
assert(dryLedger.ledger_status  === 'POST_EXEC_LEDGER_READY',                        '[E-01] dry chain → READY');
assert(dryLedger.ledger_ready   === true,                                             '[E-02] ready=true');
assert(dryLedger.hash_chain_valid === true,                                           '[E-03] hash_chain_valid=true');
assert(dryLedger.entries.length >= 5,                                                 '[E-04] multiple entries');
assert(dryLedger.entries.some(e => e.event_type === 'FINAL_RUNBOOK_READY'),           '[E-05] runbook entry present');
assert(dryLedger.entries.some(e => e.event_type === 'COMMAND_SEAL_READY'),            '[E-06] seal entry present');
assert(dryLedger.entries.some(e => e.event_type === 'STABLE_REVIEW_ELIGIBILITY_READY'), '[E-07] eligibility entry present');

// ─── Suite F: Real-tag chain ledger ───────────────────────────────
console.log('\n[Suite F] Real-tag chain ledger');
const realLedger = buildRealTagPostExecutionGovernanceLedger({
  fixture_mode:       false,
  import_result:      REAL_IMPORT,
  state_result:       REAL_STATE,
  eligibility_result: REAL_ELIG,
  _mock_timestamp:    TS,
});
assert(realLedger.ledger_ready === true,                                              '[F-01] real chain → READY');
assert(realLedger.entries.some(e => e.event_type === 'MANUAL_RECEIPT_REAL_TAG_IMPORTED'), '[F-02] real import entry');
assert(realLedger.entries.some(e => e.event_type === 'VERIFIED_STATE_REAL_TAG_VERIFIED'), '[F-03] real verified entry');
assert(realLedger.stable_promoted === false,                                          '[F-04] stable=false in real ledger');
assert(realLedger.actual_real_tag_created === false,                                  '[F-05] actual_tag=false');

// ─── Suite G: Hash chain valid ─────────────────────────────────────
console.log('\n[Suite G] Hash chain valid');
assert(validateRealTagPostExecutionGovernanceLedger(dryLedger).length === 0,         '[G-01] dry ledger valid hash chain');
assert(validateRealTagPostExecutionGovernanceLedger(fix).length === 0,               '[G-02] fixture ledger valid hash chain');

// ─── Suite H: Tamper detection ────────────────────────────────────
console.log('\n[Suite H] Tamper detection');
const tampered = JSON.parse(JSON.stringify(dryLedger));
if (tampered.entries.length > 0) {
  tampered.entries[0].data = { runbook_id: 'tampered', target_tag: 'evil' };
}
assert(validateRealTagPostExecutionGovernanceLedger(tampered).length > 0,            '[H-01] tampered entry detected');

// ─── Suite I: Render ─────────────────────────────────────────────
console.log('\n[Suite I] Render');
const rendered = renderRealTagPostExecutionGovernanceLedger(fix);
assert(typeof rendered === 'string',                                                  '[I-01] returns string');
assert(rendered.includes('POST_EXEC_LEDGER_READY'),                                  '[I-02] status in output');
assert(rendered.includes('hash_chain_valid         : true'),                         '[I-03] hash_chain in output');
assert(rendered.includes('stable_promoted          : false'),                        '[I-04] stable=false in output');
assert(rendered.includes('LEDGER ENTRIES'),                                          '[I-05] entries section');
assert(renderRealTagPostExecutionGovernanceLedger(null) === 'real_tag_post_execution_governance_ledger: null', '[I-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-post-execution-governance-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
