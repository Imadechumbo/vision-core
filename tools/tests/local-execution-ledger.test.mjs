#!/usr/bin/env node
/**
 * Tests — Local Execution Ledger V163.0
 */

import {
  buildLocalExecutionLedger,
  validateLocalExecutionLedger,
  appendLocalExecutionLedgerEvent,
  renderLocalExecutionLedger,
  LOCAL_EXECUTION_LEDGER_STATUSES,
  LOCAL_EXECUTION_LEDGER_EVENTS,
} from '../local-execution-ledger.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

console.log('\n=== local-execution-ledger tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(LOCAL_EXECUTION_LEDGER_STATUSES));
assert('STATUSES has EMPTY', LOCAL_EXECUTION_LEDGER_STATUSES.includes('LOCAL_EXECUTION_LEDGER_EMPTY'));
assert('STATUSES has READY', LOCAL_EXECUTION_LEDGER_STATUSES.includes('LOCAL_EXECUTION_LEDGER_READY'));
assert('STATUSES has TAMPERED', LOCAL_EXECUTION_LEDGER_STATUSES.includes('LOCAL_EXECUTION_LEDGER_TAMPERED'));
assert('STATUSES has BLOCKED_EVENT', LOCAL_EXECUTION_LEDGER_STATUSES.includes('LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT'));
assert('EVENTS is array', Array.isArray(LOCAL_EXECUTION_LEDGER_EVENTS));
assert('EVENTS has LOCAL_DRILL_READY', LOCAL_EXECUTION_LEDGER_EVENTS.includes('LOCAL_DRILL_READY'));
assert('EVENTS has LOCAL_EXECUTION_PROOF_CAPTURED', LOCAL_EXECUTION_LEDGER_EVENTS.includes('LOCAL_EXECUTION_PROOF_CAPTURED'));
assert('buildLocalExecutionLedger is function', typeof buildLocalExecutionLedger === 'function');
assert('validateLocalExecutionLedger is function', typeof validateLocalExecutionLedger === 'function');
assert('appendLocalExecutionLedgerEvent is function', typeof appendLocalExecutionLedgerEvent === 'function');
assert('renderLocalExecutionLedger is function', typeof renderLocalExecutionLedger === 'function');

// --- build empty ledger ---
console.log('--- build empty ledger ---');
{
  const l = buildLocalExecutionLedger(null);
  assert('null → EMPTY', l.ledger_status === 'LOCAL_EXECUTION_LEDGER_EMPTY');
  assert('null: production_touched=false', l.production_touched === false);
  assert('null: deploy_performed=false', l.deploy_performed === false);
  assert('null: stable_promoted=false', l.stable_promoted === false);
  assert('null: release_performed=false', l.release_performed === false);
  assert('null: local_only=true', l.local_only === true);
  assert('null: entry_count=0', l.entry_count === 0);
}
{
  const l = buildLocalExecutionLedger({ ledger_id: '' });
  assert('blank ledger_id → EMPTY', l.ledger_status === 'LOCAL_EXECUTION_LEDGER_EMPTY');
}
{
  const l = buildLocalExecutionLedger({ ledger_id: 'ledger-001' });
  assert('valid ledger_id → EMPTY with id', l.ledger_status === 'LOCAL_EXECUTION_LEDGER_EMPTY');
  assert('ledger_id set', l.ledger_id === 'ledger-001');
  assert('entry_count=0', l.entry_count === 0);
  assert('ledger_ready=false', l.ledger_ready === false);
  assert('schema_version=v163.0', l.schema_version === 'v163.0');
}

// --- append valid events ---
console.log('--- append valid events ---');
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-001' });
  l = appendLocalExecutionLedgerEvent(l, {
    event: 'LOCAL_DRILL_READY',
    event_id: 'evt-001',
    timestamp: '2026-05-21T10:00:00.000Z',
  });
  assert('append LOCAL_DRILL_READY → READY', l.ledger_status === 'LOCAL_EXECUTION_LEDGER_READY');
  assert('entry_count=1', l.entry_count === 1);
  assert('ledger_ready=true', l.ledger_ready === true);
  assert('ledger_hash set', typeof l.ledger_hash === 'string' && l.ledger_hash.length > 0);
  assert('entry_hash set', typeof l.entries[0].entry_hash === 'string');
  assert('entry seq=1', l.entries[0].seq === 1);
  assert('production_touched=false', l.production_touched === false);
  assert('deploy_performed=false', l.deploy_performed === false);
}
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-002' });
  l = appendLocalExecutionLedgerEvent(l, { event: 'LOCAL_DRILL_READY', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  l = appendLocalExecutionLedgerEvent(l, { event: 'LOCAL_EXECUTION_PROOF_CAPTURED', event_id: 'e2', timestamp: '2026-05-21T10:01:00.000Z' });
  l = appendLocalExecutionLedgerEvent(l, { event: 'LOCAL_EXECUTION_RECEIPT_READY', event_id: 'e3', timestamp: '2026-05-21T10:02:00.000Z' });
  assert('3 events appended', l.entry_count === 3);
  assert('seq chain correct', l.entries.map(e => e.seq).join(',') === '1,2,3');
  assert('each has entry_hash', l.entries.every(e => typeof e.entry_hash === 'string'));
  assert('local_only=true after 3 events', l.local_only === true);
}

// --- append all valid event types ---
console.log('--- all valid event types ---');
{
  for (const evt of LOCAL_EXECUTION_LEDGER_EVENTS) {
    let l = buildLocalExecutionLedger({ ledger_id: `ledger-${evt}` });
    l = appendLocalExecutionLedgerEvent(l, { event: evt, event_id: `id-${evt}`, timestamp: '2026-05-21T10:00:00.000Z' });
    assert(`event ${evt} accepted`, l.ledger_status === 'LOCAL_EXECUTION_LEDGER_READY');
  }
}

// --- blocked events ---
console.log('--- blocked events ---');
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-001' });
  const r = appendLocalExecutionLedgerEvent(l, { event: 'DEPLOY_APP', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  assert('DEPLOY_APP → BLOCKED_EVENT', r.ledger_status === 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT');
  assert('DEPLOY blocked: production_touched=false', r.production_touched === false);
}
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-001' });
  const r = appendLocalExecutionLedgerEvent(l, { event: 'STABLE_PROMOTE', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  assert('STABLE_PROMOTE → BLOCKED_EVENT', r.ledger_status === 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT');
}
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-001' });
  const r = appendLocalExecutionLedgerEvent(l, { event: 'RELEASE_NOW', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  assert('RELEASE_NOW → BLOCKED_EVENT', r.ledger_status === 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT');
}
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-001' });
  const r = appendLocalExecutionLedgerEvent(l, { event: 'PRODUCTION_RUN', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  assert('PRODUCTION_RUN → BLOCKED_EVENT', r.ledger_status === 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT');
}
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-001' });
  const r = appendLocalExecutionLedgerEvent(l, { event: 'UNKNOWN_EVENT', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  assert('unknown event → BLOCKED_EVENT', r.ledger_status === 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT');
}

// --- append to invalid ledger ---
console.log('--- append to invalid ledger ---');
{
  const r = appendLocalExecutionLedgerEvent(null, { event: 'LOCAL_DRILL_READY', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  assert('append to null ledger → BLOCKED_EVENT', r.ledger_status === 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT');
}
{
  let l = buildLocalExecutionLedger({ ledger_id: 'l1' });
  const r = appendLocalExecutionLedgerEvent(l, null);
  assert('append null event → BLOCKED_EVENT', r.ledger_status === 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT');
}

// --- detect tamper ---
console.log('--- detect tamper ---');
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-tamper' });
  l = appendLocalExecutionLedgerEvent(l, { event: 'LOCAL_DRILL_READY', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  // tamper the entry
  const tampered = { ...l, entries: [{ ...l.entries[0], entry_hash: 'fake-hash' }] };
  const v = validateLocalExecutionLedger(tampered);
  assert('tampered ledger: validate detects error', v.valid === false);
  assert('tampered ledger: errors mention tamper', v.errors.some(e => e.includes('tamper')));
}

// --- validate ready ---
console.log('--- validate ready ---');
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-v' });
  l = appendLocalExecutionLedgerEvent(l, { event: 'LOCAL_DRILL_READY', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  const v = validateLocalExecutionLedger(l);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}

// --- validate empty ---
console.log('--- validate empty ---');
{
  const l = buildLocalExecutionLedger({ ledger_id: 'ledger-e' });
  const v = validateLocalExecutionLedger(l);
  assert('validate empty: valid=true (invariants hold)', v.valid === true);
}
{
  const v = validateLocalExecutionLedger(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-r' });
  l = appendLocalExecutionLedgerEvent(l, { event: 'LOCAL_DRILL_READY', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  const s = renderLocalExecutionLedger(l);
  assert('render ready: is string', typeof s === 'string');
  assert('render ready: contains READY', s.includes('READY'));
  assert('render ready: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render ready: contains event', s.includes('LOCAL_DRILL_READY'));
}
{
  const l = buildLocalExecutionLedger(null);
  const s = renderLocalExecutionLedger(l);
  assert('render empty: is string', typeof s === 'string');
}
{
  const s = renderLocalExecutionLedger(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  let l = buildLocalExecutionLedger({ ledger_id: 'ledger-inv' });
  l = appendLocalExecutionLedgerEvent(l, { event: 'LOCAL_ROLLBACK_REQUIRED', event_id: 'e1', timestamp: '2026-05-21T10:00:00.000Z' });
  l = appendLocalExecutionLedgerEvent(l, { event: 'LOCAL_ROLLBACK_READY', event_id: 'e2', timestamp: '2026-05-21T10:01:00.000Z' });
  l = appendLocalExecutionLedgerEvent(l, { event: 'LOCAL_ROLLBACK_COMPLETED', event_id: 'e3', timestamp: '2026-05-21T10:02:00.000Z' });
  assert('rollback events accepted', l.entry_count === 3);
  assert('invariant: deploy_performed=false', l.deploy_performed === false);
  assert('invariant: stable_promoted=false', l.stable_promoted === false);
  assert('invariant: release_performed=false', l.release_performed === false);
  assert('invariant: production_touched=false', l.production_touched === false);
  assert('invariant: local_only=true', l.local_only === true);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
