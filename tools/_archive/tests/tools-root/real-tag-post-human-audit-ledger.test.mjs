#!/usr/bin/env node
/**
 * Real Tag Post-Human Audit Ledger — Unit Tests V94.0
 */

import {
  POST_HUMAN_LEDGER_STATUSES,
  POST_HUMAN_AUDIT_EVENT_TYPES,
  buildRealTagPostHumanAuditLedger,
  validatePostHumanAuditLedger,
  renderPostHumanAuditLedger,
} from '../real-tag-post-human-audit-ledger.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T05:00:00.000Z';
const fixVerifier = { verifier_passed: true, verifier_status: 'VERIFIER_PASSED' };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(POST_HUMAN_LEDGER_STATUSES),                             '[A-01] statuses array');
assert(POST_HUMAN_LEDGER_STATUSES.length === 2,                               '[A-02] 2 statuses');
assert(POST_HUMAN_LEDGER_STATUSES.includes('POST_HUMAN_LEDGER_BLOCKED_VERIFIER'),'[A-03] BLOCKED_VERIFIER');
assert(POST_HUMAN_LEDGER_STATUSES.includes('POST_HUMAN_LEDGER_READY'),        '[A-04] READY');
assert(Array.isArray(POST_HUMAN_AUDIT_EVENT_TYPES),                           '[A-05] event_types array');
assert(POST_HUMAN_AUDIT_EVENT_TYPES.length === 8,                             '[A-06] 8 event types');
assert(POST_HUMAN_AUDIT_EVENT_TYPES.includes('RUNBOOK_BUILT'),                '[A-07] RUNBOOK_BUILT');
assert(POST_HUMAN_AUDIT_EVENT_TYPES.includes('RUNBOOK_VALIDATED'),            '[A-08] RUNBOOK_VALIDATED');
assert(POST_HUMAN_AUDIT_EVENT_TYPES.includes('COMMAND_GATE_EVALUATED'),       '[A-09] COMMAND_GATE_EVALUATED');
assert(POST_HUMAN_AUDIT_EVENT_TYPES.includes('COMMAND_RENDERED'),             '[A-10] COMMAND_RENDERED');
assert(POST_HUMAN_AUDIT_EVENT_TYPES.includes('RECEIPT_IMPORTED'),             '[A-11] RECEIPT_IMPORTED');
assert(POST_HUMAN_AUDIT_EVENT_TYPES.includes('RECEIPT_VERIFIED'),             '[A-12] RECEIPT_VERIFIED');
assert(POST_HUMAN_AUDIT_EVENT_TYPES.includes('HUMAN_TAG_OPERATION_RECORDED'), '[A-13] HUMAN_TAG_OPERATION_RECORDED');
assert(POST_HUMAN_AUDIT_EVENT_TYPES.includes('STABILIZATION_INITIATED'),      '[A-14] STABILIZATION_INITIATED');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagPostHumanAuditLedger({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                               '[B-01] returns object');
assert(fix.ledger_status    === 'POST_HUMAN_LEDGER_READY',                   '[B-02] READY');
assert(fix.ledger_ready     === true,                                         '[B-03] ready=true');
assert(fix.schema_version   === 'v94.0',                                      '[B-04] schema=v94.0');
assert(typeof fix.ledger_id === 'string' && fix.ledger_id.length === 24,     '[B-05] id 24 chars');
assert(fix.blocking_reason  === null,                                         '[B-06] blocking=null');
assert(Array.isArray(fix.entries),                                            '[B-07] entries array');
assert(fix.entry_count      === 8,                                            '[B-08] 8 entries');
assert(fix.entries.length   === 8,                                            '[B-09] entries length 8');
assert(fix.hash_chain_valid === true,                                         '[B-10] hash_chain_valid=true');
assert(fix.created_at       === TS,                                           '[B-11] created_at=TS');

// ─── Suite C: Invariants (REGRA ABSOLUTA) ────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[C-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: Entry structure ─────────────────────────────────────
console.log('\n[Suite D] Entry structure');
const e0 = fix.entries[0];
assert(typeof e0.entry_id === 'string' && e0.entry_id.length === 24,         '[D-01] entry_id 24 chars');
assert(e0.event_type      === 'RUNBOOK_BUILT',                                '[D-02] first event RUNBOOK_BUILT');
assert(e0.prev_hash       === '0'.repeat(32),                                '[D-03] first prev_hash is zeros');
assert(typeof e0.entry_hash === 'string' && e0.entry_hash.length === 32,     '[D-04] entry_hash 32 chars');
assert(e0.timestamp       === TS,                                             '[D-05] entry timestamp=TS');

const eLast = fix.entries[7];
assert(eLast.event_type   === 'STABILIZATION_INITIATED',                     '[D-06] last event STABILIZATION_INITIATED');
assert(eLast.prev_hash    === fix.entries[6].entry_hash,                     '[D-07] chain: prev=entry[6].hash');

// event_type sequence
const eventTypes = fix.entries.map(e => e.event_type);
assert(eventTypes[0] === 'RUNBOOK_BUILT',                                    '[D-08] entry[0]=RUNBOOK_BUILT');
assert(eventTypes[1] === 'RUNBOOK_VALIDATED',                                '[D-09] entry[1]=RUNBOOK_VALIDATED');
assert(eventTypes[2] === 'COMMAND_GATE_EVALUATED',                           '[D-10] entry[2]=COMMAND_GATE_EVALUATED');
assert(eventTypes[3] === 'COMMAND_RENDERED',                                 '[D-11] entry[3]=COMMAND_RENDERED');
assert(eventTypes[4] === 'RECEIPT_IMPORTED',                                 '[D-12] entry[4]=RECEIPT_IMPORTED');
assert(eventTypes[5] === 'RECEIPT_VERIFIED',                                 '[D-13] entry[5]=RECEIPT_VERIFIED');
assert(eventTypes[6] === 'HUMAN_TAG_OPERATION_RECORDED',                     '[D-14] entry[6]=HUMAN_TAG_OPERATION_RECORDED');
assert(eventTypes[7] === 'STABILIZATION_INITIATED',                          '[D-15] entry[7]=STABILIZATION_INITIATED');

// HUMAN_TAG_OPERATION_RECORDED invariants
const opEntry = fix.entries[6];
assert(opEntry.data.tag_created             === false,                        '[D-16] op entry: tag_created=false');
assert(opEntry.data.actual_real_tag_created === false,                        '[D-17] op entry: actual_tag=false');
assert(opEntry.data.real_execution_not_performed === true,                    '[D-18] op entry: not_performed=true');

// STABILIZATION_INITIATED blocked actions
const stabEntry = fix.entries[7];
assert(stabEntry.data.deploy_blocked  === true,                               '[D-19] stab: deploy_blocked=true');
assert(stabEntry.data.stable_blocked  === true,                               '[D-20] stab: stable_blocked=true');
assert(stabEntry.data.release_blocked === true,                               '[D-21] stab: release_blocked=true');

// ─── Suite E: Hash chain integrity ────────────────────────────────
console.log('\n[Suite E] Hash chain integrity');
// Verify each entry's entry_hash matches prev of next
for (let i = 0; i < fix.entries.length - 1; i++) {
  assert(fix.entries[i + 1].prev_hash === fix.entries[i].entry_hash,
    `[E-0${i+1}] chain[${i+1}].prev = chain[${i}].hash`);
}

// ─── Suite F: Blocked state ───────────────────────────────────────
console.log('\n[Suite F] Blocked states');
const bNoVerifier = buildRealTagPostHumanAuditLedger({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoVerifier.ledger_status === 'POST_HUMAN_LEDGER_BLOCKED_VERIFIER',   '[F-01] no verifier → BLOCKED_VERIFIER');
assert(bNoVerifier.ledger_ready  === false,                                   '[F-02] ready=false');
assert(bNoVerifier.entries.length === 0,                                      '[F-03] no entries when blocked');
assert(bNoVerifier.tag_created   === false,                                   '[F-04] tag_created=false in blocked');

const bFailedVerifier = buildRealTagPostHumanAuditLedger({
  fixture_mode: false,
  verifier_result: { verifier_passed: false, verifier_status: 'VERIFIER_BLOCKED_ADAPTER' },
  _mock_timestamp: TS,
});
assert(bFailedVerifier.ledger_status === 'POST_HUMAN_LEDGER_BLOCKED_VERIFIER','[F-05] failed verifier → BLOCKED_VERIFIER');

// ─── Suite G: Non-fixture READY ───────────────────────────────────
console.log('\n[Suite G] Non-fixture READY');
const ready = buildRealTagPostHumanAuditLedger({
  fixture_mode: false,
  verifier_result: fixVerifier,
  _mock_timestamp: TS,
});
assert(ready.ledger_status     === 'POST_HUMAN_LEDGER_READY',                '[G-01] non-fixture READY');
assert(ready.ledger_ready      === true,                                      '[G-02] ready=true');
assert(ready.hash_chain_valid  === true,                                      '[G-03] hash chain valid');
assert(ready.entry_count       === 8,                                         '[G-04] 8 entries');

// ─── Suite H: Deterministic hash chain ────────────────────────────
console.log('\n[Suite H] Deterministic hash chain');
const h1 = buildRealTagPostHumanAuditLedger({ fixture_mode: true, _mock_timestamp: TS });
const h2 = buildRealTagPostHumanAuditLedger({ fixture_mode: true, _mock_timestamp: TS });
assert(h1.entries[0].entry_hash === h2.entries[0].entry_hash,               '[H-01] deterministic first hash');
assert(h1.entries[7].entry_hash === h2.entries[7].entry_hash,               '[H-02] deterministic last hash');
assert(h1.ledger_id === h2.ledger_id,                                        '[H-03] deterministic ledger_id');

// ─── Suite I: Validate ────────────────────────────────────────────
console.log('\n[Suite I] Validate');
const vOk = validatePostHumanAuditLedger(fix);
assert(vOk.valid === true,                                                    '[I-01] fixture valid=true');

const vNull = validatePostHumanAuditLedger(null);
assert(vNull.valid === false,                                                 '[I-02] null → invalid');

const vTagTrue = validatePostHumanAuditLedger({ ...fix, tag_created: true });
assert(vTagTrue.valid === false,                                              '[I-03] tag_created=true → invalid');

const vActualTrue = validatePostHumanAuditLedger({ ...fix, actual_real_tag_created: true });
assert(vActualTrue.valid === false,                                           '[I-04] actual_tag=true → invalid');

// ─── Suite J: Render ──────────────────────────────────────────────
console.log('\n[Suite J] Render');
const rendered = renderPostHumanAuditLedger(fix);
assert(typeof rendered === 'string',                                          '[J-01] returns string');
assert(rendered.includes('POST_HUMAN_LEDGER_READY'),                         '[J-02] status in output');
assert(rendered.includes('tag_created                 : false'),             '[J-03] tag_created=false');
assert(rendered.includes('actual_real_tag_created     : false'),             '[J-04] actual_tag=false');
assert(rendered.includes('real_execution_not_performed: true'),              '[J-05] not_performed=true');
assert(rendered.includes('AUDIT ENTRIES'),                                   '[J-06] audit entries section');
assert(rendered.includes('RUNBOOK_BUILT'),                                   '[J-07] RUNBOOK_BUILT in render');
assert(rendered.includes('STABILIZATION_INITIATED'),                         '[J-08] STABILIZATION_INITIATED in render');
assert(rendered.includes('entry_count'),                                     '[J-09] entry_count field');

const renderedBlocked = renderPostHumanAuditLedger(bNoVerifier);
assert(!renderedBlocked.includes('AUDIT ENTRIES'),                           '[J-10] blocked: no entries');

assert(renderPostHumanAuditLedger(null) === 'post_human_audit_ledger: null', '[J-11] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-post-human-audit-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
