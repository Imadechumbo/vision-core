#!/usr/bin/env node
/**
 * Tests — Stable Review Ledger V113.0
 */

import {
  buildStableReviewLedger,
  validateStableReviewLedger,
  renderStableReviewLedger,
  STABLE_REVIEW_LEDGER_EVENT_TYPES,
  STABLE_REVIEW_LEDGER_STATUSES,
} from '../stable-review-ledger.mjs';

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

const ALL_EVENTS = [
  { event_type: 'STABLE_REVIEW_CONTRACT_READY',      ref_id: 'contract-001' },
  { event_type: 'STABLE_REVIEW_EVIDENCE_BOUND',       ref_id: 'binding-001' },
  { event_type: 'STABLE_REVIEW_DECISION_READY',       ref_id: 'decision-001' },
  { event_type: 'STABLE_REVIEW_HUMAN_APPROVAL_READY', ref_id: 'approval-001' },
];

console.log('\n=== stable-review-ledger tests ===\n');

// empty ledger
console.log('--- empty ledger ---');
{
  const r = buildStableReviewLedger([], null);
  assert(r.ledger_status === 'STABLE_REVIEW_LEDGER_EMPTY', 'empty status');
  assert(r.ledger_ready === true, 'ledger_ready true');
  assert(r.event_count === 0, 'event_count 0');
  assert(r.chain_valid === true, 'chain_valid true');
  assert(r.schema_version === 'v113.0', 'schema version');
}

// single event
console.log('--- single event ---');
{
  const r = buildStableReviewLedger([{ event_type: 'STABLE_REVIEW_CONTRACT_READY', ref_id: 'c-001' }]);
  assert(r.ledger_status === 'STABLE_REVIEW_LEDGER_ACTIVE', 'active status');
  assert(r.event_count === 1, 'event_count 1');
  assert(r.events[0].prev_hash === 'genesis', 'first event genesis');
  assert(r.events[0].event_type === 'STABLE_REVIEW_CONTRACT_READY', 'event_type correct');
  assert(r.events[0].index === 0, 'index 0');
}

// all events
console.log('--- all events ---');
{
  const r = buildStableReviewLedger(ALL_EVENTS);
  assert(r.event_count === 4, 'event_count 4');
  assert(r.events[1].prev_hash === r.events[0].event_hash, 'chain: 0→1');
  assert(r.events[2].prev_hash === r.events[1].event_hash, 'chain: 1→2');
  assert(r.events[3].prev_hash === r.events[2].event_hash, 'chain: 2→3');
}

// append to existing
console.log('--- append to existing ---');
{
  const initial = buildStableReviewLedger([{ event_type: 'STABLE_REVIEW_CONTRACT_READY', ref_id: 'c-001' }]);
  const r = buildStableReviewLedger(
    [{ event_type: 'STABLE_REVIEW_EVIDENCE_BOUND', ref_id: 'b-001' }],
    initial
  );
  assert(r.event_count === 2, 'event_count 2 after append');
  assert(r.events[1].prev_hash === r.events[0].event_hash, 'chain preserved after append');
}

// invalid event types skipped
console.log('--- invalid event types skipped ---');
{
  const r = buildStableReviewLedger([{ event_type: 'INVALID_TYPE', ref_id: 'x' }]);
  assert(r.event_count === 0, 'invalid type skipped');
  assert(r.ledger_status === 'STABLE_REVIEW_LEDGER_EMPTY', 'empty after skip');
}

// blocked event
console.log('--- blocked event ---');
{
  const r = buildStableReviewLedger([{ event_type: 'STABLE_REVIEW_BLOCKED', ref_id: 'block-001' }]);
  assert(r.event_count === 1, 'blocked event appended');
  assert(r.events[0].event_type === 'STABLE_REVIEW_BLOCKED', 'blocked event_type');
}

// stable_promotion_allowed=false always
console.log('--- stable_promotion_allowed=false ---');
{
  const r = buildStableReviewLedger(ALL_EVENTS);
  assert(r.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

// stable_promoted=false always
console.log('--- stable_promoted=false ---');
{
  const r = buildStableReviewLedger(ALL_EVENTS);
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

// deploy_performed=false always
console.log('--- deploy_performed=false ---');
{
  const r = buildStableReviewLedger(ALL_EVENTS);
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

// release_performed=false always
console.log('--- release_performed=false ---');
{
  const r = buildStableReviewLedger(ALL_EVENTS);
  assert(r.release_performed === false, 'release_performed=false');
}

// validate
console.log('--- validate ---');
{
  const r = buildStableReviewLedger(ALL_EVENTS);
  const v = validateStableReviewLedger(r);
  assert(v.valid === true, 'validate full ledger');
  assert(v.errors.length === 0, 'no errors');
}

// validate empty
console.log('--- validate empty ---');
{
  const r = buildStableReviewLedger([], null);
  const v = validateStableReviewLedger(r);
  assert(v.valid === true, 'validate empty ledger');
}

// tamper detection
console.log('--- tamper detection ---');
{
  const r = buildStableReviewLedger(ALL_EVENTS);
  const tampered = JSON.parse(JSON.stringify(r));
  tampered.events[1].event_hash = 'tampered_hash';
  const v = validateStableReviewLedger(tampered);
  assert(v.valid === false, 'tampered ledger fails');
  assert(v.errors.length > 0, 'errors present');
}

// render
console.log('--- render ---');
{
  const r = buildStableReviewLedger(ALL_EVENTS);
  const txt = renderStableReviewLedger(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('STABLE REVIEW LEDGER'), 'render includes title');
}

// event types export
console.log('--- event types export ---');
{
  assert(STABLE_REVIEW_LEDGER_EVENT_TYPES.includes('STABLE_REVIEW_CONTRACT_READY'), 'contract in exports');
  assert(STABLE_REVIEW_LEDGER_EVENT_TYPES.includes('STABLE_REVIEW_HUMAN_APPROVAL_READY'), 'approval in exports');
  assert(STABLE_REVIEW_LEDGER_EVENT_TYPES.includes('STABLE_REVIEW_BLOCKED'), 'blocked in exports');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(STABLE_REVIEW_LEDGER_STATUSES.includes('STABLE_REVIEW_LEDGER_ACTIVE'), 'active in exports');
  assert(STABLE_REVIEW_LEDGER_STATUSES.includes('STABLE_REVIEW_LEDGER_EMPTY'), 'empty in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
