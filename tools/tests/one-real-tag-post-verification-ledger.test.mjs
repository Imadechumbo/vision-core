#!/usr/bin/env node
/**
 * Tests — One Real Tag Post-Verification Ledger V108.0
 */

import {
  buildOneRealTagPostVerificationLedger,
  validateOneRealTagPostVerificationLedger,
  renderOneRealTagPostVerificationLedger,
  LEDGER_EVENT_TYPES,
} from '../one-real-tag-post-verification-ledger.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

console.log('\n=== one-real-tag-post-verification-ledger tests ===\n');

// append packet
console.log('--- append packet ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY', ref_id: 'packet-001' },
  ]);
  assert(ledger.ledger_valid === true, 'ledger valid');
  assert(ledger.event_count === 1, 'event_count 1');
  assert(ledger.events[0].event_type === 'ONE_TAG_EXEC_PACKET_READY', 'event_type correct');
  assert(ledger.events[0].ref_id === 'packet-001', 'ref_id correct');
  assert(ledger.events[0].prev_hash === 'genesis', 'first event prev_hash is genesis');
  assert(ledger.deploy_performed === false, 'deploy false');
  assert(ledger.stable_promoted === false, 'stable false');
  assert(ledger.release_performed === false, 'release false');
  assert(ledger.schema_version === 'v108.0', 'schema version');
}

// append command export
console.log('--- append command export ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',    ref_id: 'packet-001' },
    { event_type: 'ONE_TAG_COMMAND_EXPORT_READY', ref_id: 'export-001' },
  ]);
  assert(ledger.event_count === 2, 'event_count 2');
  assert(ledger.events[1].event_type === 'ONE_TAG_COMMAND_EXPORT_READY', 'export event type');
  assert(ledger.events[1].prev_hash === ledger.events[0].event_hash, 'hash chain intact');
}

// append dry-run receipt
console.log('--- append dry-run receipt ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',          ref_id: 'packet-001' },
    { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CAPTURED',   ref_id: 'receipt-dry-001' },
  ]);
  assert(ledger.event_count === 2, 'event_count 2');
  assert(ledger.events[1].event_type === 'ONE_TAG_RECEIPT_DRY_RUN_CAPTURED', 'dry-run event type');
}

// append real-tag receipt mock
console.log('--- append real-tag receipt mock ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',           ref_id: 'packet-001' },
    { event_type: 'ONE_TAG_RECEIPT_REAL_TAG_CAPTURED',   ref_id: 'receipt-real-mock-001' },
  ]);
  assert(ledger.event_count === 2, 'event_count 2');
  assert(ledger.events[1].event_type === 'ONE_TAG_RECEIPT_REAL_TAG_CAPTURED', 'real-tag event type');
  assert(ledger.deploy_performed === false, 'deploy false for mock');
}

// append dry-run verification
console.log('--- append dry-run verification ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',          ref_id: 'packet-001' },
    { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CAPTURED',   ref_id: 'receipt-dry-001' },
    { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED',  ref_id: 'verify-dry-001' },
  ]);
  assert(ledger.event_count === 3, 'event_count 3');
  assert(ledger.events[2].event_type === 'ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED', 'dry verify event');
}

// append real-tag verification mock
console.log('--- append real-tag verification mock ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',           ref_id: 'packet-001' },
    { event_type: 'ONE_TAG_RECEIPT_REAL_TAG_CAPTURED',   ref_id: 'receipt-real-mock' },
    { event_type: 'ONE_TAG_RECEIPT_REAL_TAG_CONFIRMED',  ref_id: 'verify-real-mock' },
  ]);
  assert(ledger.event_count === 3, 'event_count 3');
  assert(ledger.events[2].event_type === 'ONE_TAG_RECEIPT_REAL_TAG_CONFIRMED', 'real verify event');
  assert(ledger.deploy_performed === false, 'deploy false for mock');
}

// blocked event
console.log('--- blocked event ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_OPERATION_BLOCKED', ref_id: 'block-001' },
  ]);
  assert(ledger.ledger_valid === true, 'blocked event valid in ledger');
  assert(ledger.events[0].event_type === 'ONE_TAG_OPERATION_BLOCKED', 'blocked event recorded');
}

// tamper detection
console.log('--- tamper detection ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',    ref_id: 'packet-001' },
    { event_type: 'ONE_TAG_COMMAND_EXPORT_READY', ref_id: 'export-001' },
  ]);
  // Tamper with event hash
  const tampered = JSON.parse(JSON.stringify(ledger));
  tampered.events[0].event_hash = 'tampered';
  const v = validateOneRealTagPostVerificationLedger(tampered);
  assert(v.valid === false, 'tamper detected');
  assert(v.errors.some(e => e.includes('tampered') || e.includes('hash chain')), 'hash chain error');
}

// deploy/stable/release false
console.log('--- deploy/stable/release false ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY', ref_id: 'packet-001' },
  ]);
  assert(ledger.deploy_performed === false, 'deploy_performed false');
  assert(ledger.stable_promoted === false, 'stable_promoted false');
  assert(ledger.release_performed === false, 'release_performed false');
}

// validate valid ledger
console.log('--- validate valid ledger ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',         ref_id: 'packet-001' },
    { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED', ref_id: 'verify-001' },
  ]);
  const v = validateOneRealTagPostVerificationLedger(ledger);
  assert(v.valid === true, 'valid ledger passes validation');
  assert(v.errors.length === 0, 'no validation errors');
}

// render
console.log('--- render ---');
{
  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY', ref_id: 'packet-001' },
  ]);
  const txt = renderOneRealTagPostVerificationLedger(ledger);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('POST-VERIFICATION LEDGER'), 'render includes title');
  assert(txt.includes('ONE_TAG_EXEC_PACKET_READY'), 'render includes event type');
}

// hash chain deterministic
console.log('--- hash chain deterministic ---');
{
  const l1 = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY', ref_id: 'packet-001' },
  ]);
  const l2 = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY', ref_id: 'packet-001' },
  ]);
  assert(l1.ledger_id === l2.ledger_id, 'ledger_id deterministic');
  assert(l1.events[0].event_hash === l2.events[0].event_hash, 'event_hash deterministic');
}

// event types export
console.log('--- event types export ---');
{
  assert(LEDGER_EVENT_TYPES.includes('ONE_TAG_EXEC_PACKET_READY'), 'packet event in exports');
  assert(LEDGER_EVENT_TYPES.includes('ONE_TAG_RECEIPT_REAL_TAG_CONFIRMED'), 'real-tag confirm in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
