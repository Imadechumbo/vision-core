#!/usr/bin/env node
/**
 * Tests — Controlled Runtime Execution Ledger V155.0
 */

import {
  buildControlledRuntimeExecutionLedger,
  appendControlledRuntimeLedgerEvent,
  validateControlledRuntimeExecutionLedger,
  renderControlledRuntimeExecutionLedger,
  CONTROLLED_EXECUTION_LEDGER_EVENT_TYPES,
  CONTROLLED_EXECUTION_LEDGER_STATUSES,
} from '../controlled-runtime-execution-ledger.mjs';

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

console.log('\n=== controlled-runtime-execution-ledger tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildControlledRuntimeExecutionLedger({});
  assert('no ledger_id → LEDGER_BLOCKED_INPUT', r.ledger_status === 'LEDGER_BLOCKED_INPUT');
  assert('event_count=0', r.event_count === 0);
  assert('events=[]', Array.isArray(r.events) && r.events.length === 0);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildControlledRuntimeExecutionLedger(null);
  assert('null → LEDGER_BLOCKED_INPUT', r.ledger_status === 'LEDGER_BLOCKED_INPUT');
}

// --- open ledger ---
console.log('--- open ledger ---');
{
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'l1' });
  assert('ledger_id=l1 → LEDGER_OPEN', r.ledger_status === 'LEDGER_OPEN');
  assert('ledger_id propagated', r.ledger_id === 'l1');
  assert('schema_version=v155.0', r.schema_version === 'v155.0');
  assert('event_count=0', r.event_count === 0);
  assert('events=[]', r.events.length === 0);
  assert('ledger_closed=false', r.ledger_closed === false);
  assert('chain_head is string', typeof r.chain_head === 'string');
}

// --- ledger with events ---
console.log('--- ledger with events ---');
{
  const r = buildControlledRuntimeExecutionLedger({
    ledger_id: 'l2',
    events: [
      { event_type: 'COMMAND_RECEIVED',     event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' },
      { event_type: 'TRUTH_VERIFIED',       event_id: 'e2', occurred_at: '2026-05-21T10:01:00.000Z' },
      { event_type: 'PASS_GOLD_CONFIRMED',  event_id: 'e3', occurred_at: '2026-05-21T10:02:00.000Z' },
    ],
  });
  assert('3 events → event_count=3', r.event_count === 3);
  assert('status=LEDGER_OPEN', r.ledger_status === 'LEDGER_OPEN');
  assert('ledger_closed=false', r.ledger_closed === false);
  assert('events[0].event_type=COMMAND_RECEIVED', r.events[0].event_type === 'COMMAND_RECEIVED');
  assert('events[1].prev_hash=events[0].event_hash', r.events[1].prev_hash === r.events[0].event_hash);
  assert('events[2].prev_hash=events[1].event_hash', r.events[2].prev_hash === r.events[1].event_hash);
  assert('chain_head=last event_hash', r.chain_head === r.events[2].event_hash);
}

// --- invalid event types filtered ---
{
  const r = buildControlledRuntimeExecutionLedger({
    ledger_id: 'l3',
    events: [
      { event_type: 'COMMAND_RECEIVED', event_id: 'e1' },
      { event_type: 'INVALID_TYPE',     event_id: 'e2' },
      { event_type: 'TRUTH_VERIFIED',   event_id: 'e3' },
    ],
  });
  assert('invalid event type filtered → 2 events', r.event_count === 2);
}

// --- closed via LEDGER_CLOSED event ---
{
  const r = buildControlledRuntimeExecutionLedger({
    ledger_id: 'l4',
    events: [
      { event_type: 'COMMAND_RECEIVED', event_id: 'e1' },
      { event_type: 'LEDGER_CLOSED',    event_id: 'e2' },
    ],
  });
  assert('LEDGER_CLOSED event → status=LEDGER_CLOSED', r.ledger_status === 'LEDGER_CLOSED');
  assert('ledger_closed=true via event', r.ledger_closed === true);
}

// --- closed via closed=true ---
{
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'l5', closed: true });
  assert('closed=true → LEDGER_CLOSED', r.ledger_status === 'LEDGER_CLOSED');
  assert('ledger_closed=true', r.ledger_closed === true);
}

// --- all 10 event types accepted ---
console.log('--- all 10 event types ---');
{
  const events = CONTROLLED_EXECUTION_LEDGER_EVENT_TYPES.map((t, i) => ({
    event_type: t,
    event_id: `e${i}`,
  }));
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'l6', events });
  assert('all 10 event types accepted', r.event_count === 10);
  assert('status=LEDGER_CLOSED (last is LEDGER_CLOSED)', r.ledger_status === 'LEDGER_CLOSED');
}

// --- deterministic chain ---
console.log('--- deterministic chain ---');
{
  const opts = {
    ledger_id: 'l7',
    events: [
      { event_type: 'COMMAND_RECEIVED',  event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' },
      { event_type: 'TRUTH_VERIFIED',    event_id: 'e2', occurred_at: '2026-05-21T10:01:00.000Z' },
    ],
  };
  const r1 = buildControlledRuntimeExecutionLedger(opts);
  const r2 = buildControlledRuntimeExecutionLedger(opts);
  assert('chain_head deterministic', r1.chain_head === r2.chain_head);
}
{
  const r1 = buildControlledRuntimeExecutionLedger({ ledger_id: 'a' });
  const r2 = buildControlledRuntimeExecutionLedger({ ledger_id: 'b' });
  assert('different ledger_id → different chain_head', r1.chain_head !== r2.chain_head);
}

// --- append ---
console.log('--- append ---');
{
  let r = buildControlledRuntimeExecutionLedger({ ledger_id: 'l8' });
  const a1 = appendControlledRuntimeLedgerEvent(r, { event_type: 'COMMAND_RECEIVED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' });
  assert('append returns appended=true', a1.appended === true);
  r = a1.ledger;
  assert('after append event_count=1', r.event_count === 1);
  assert('chain_head updated', r.chain_head === r.events[0].event_hash);

  const a2 = appendControlledRuntimeLedgerEvent(r, { event_type: 'TRUTH_VERIFIED', event_id: 'e2', occurred_at: '2026-05-21T10:01:00.000Z' });
  assert('append 2nd returns appended=true', a2.appended === true);
  r = a2.ledger;
  assert('after 2nd append event_count=2', r.event_count === 2);
  assert('chain intact', r.events[1].prev_hash === r.events[0].event_hash);
}

// --- append to closed ledger blocked ---
{
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'l9', closed: true });
  const a = appendControlledRuntimeLedgerEvent(r, { event_type: 'COMMAND_RECEIVED', event_id: 'e1' });
  assert('append to closed ledger → appended=false', a.appended === false);
  assert('error message present', typeof a.error === 'string');
}

// --- append with invalid event type ---
{
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'l10' });
  const a = appendControlledRuntimeLedgerEvent(r, { event_type: 'BOGUS' });
  assert('append invalid type → appended=false', a.appended === false);
}

// --- append null ---
{
  const a = appendControlledRuntimeLedgerEvent(null, { event_type: 'COMMAND_RECEIVED' });
  assert('append to null → appended=false', a.appended === false);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildControlledRuntimeExecutionLedger({}),
    buildControlledRuntimeExecutionLedger({ ledger_id: 'lx' }),
    buildControlledRuntimeExecutionLedger({ ledger_id: 'ly', closed: true }),
  ];
  for (const r of cases) {
    assert(`execution_performed=false [${r.ledger_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.ledger_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.ledger_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.ledger_status}]`, r.release_performed === false);
  }
}
{
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'lz' });
  const a = appendControlledRuntimeLedgerEvent(r, { event_type: 'COMMAND_RECEIVED', event_id: 'e1' });
  if (a.appended) {
    assert('appended ledger execution_performed=false', a.ledger.execution_performed === false);
    assert('appended ledger stable_promoted=false', a.ledger.stable_promoted === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'lv1' });
  const v = validateControlledRuntimeExecutionLedger(r);
  assert('validate open → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildControlledRuntimeExecutionLedger({});
  const v = validateControlledRuntimeExecutionLedger(r);
  assert('validate blocked → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateControlledRuntimeExecutionLedger(null).valid === false);
}
{
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'lv2' });
  assert('execution_performed tampered → invalid', validateControlledRuntimeExecutionLedger({ ...r, execution_performed: true }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'lv3' });
  assert('stable_promoted tampered → invalid', validateControlledRuntimeExecutionLedger({ ...r, stable_promoted: true }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'lv4' });
  assert('event_count mismatch → invalid', validateControlledRuntimeExecutionLedger({ ...r, event_count: 99 }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionLedger({ ledger_id: 'lv5', closed: true });
  assert('CLOSED but ledger_closed=false → invalid', validateControlledRuntimeExecutionLedger({ ...r, ledger_closed: false }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledRuntimeExecutionLedger({
    ledger_id: 'l-render',
    events: [{ event_type: 'COMMAND_RECEIVED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' }],
  });
  const s = renderControlledRuntimeExecutionLedger(r);
  assert('render string', typeof s === 'string');
  assert('render shows LEDGER_OPEN', s.includes('LEDGER_OPEN'));
  assert('render shows REGRA', s.includes('execution_performed=false'));
  assert('render shows ledger_id', s.includes('l-render'));
  assert('render shows COMMAND_RECEIVED', s.includes('COMMAND_RECEIVED'));
}
{
  const r = buildControlledRuntimeExecutionLedger({});
  const s = renderControlledRuntimeExecutionLedger(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderControlledRuntimeExecutionLedger(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('CONTROLLED_EXECUTION_LEDGER_EVENT_TYPES is array', Array.isArray(CONTROLLED_EXECUTION_LEDGER_EVENT_TYPES));
  assert('event types length=10', CONTROLLED_EXECUTION_LEDGER_EVENT_TYPES.length === 10);
  assert('CONTROLLED_EXECUTION_LEDGER_STATUSES is array', Array.isArray(CONTROLLED_EXECUTION_LEDGER_STATUSES));
  assert('statuses length=3', CONTROLLED_EXECUTION_LEDGER_STATUSES.length === 3);
  for (const t of [
    'COMMAND_RECEIVED', 'TRUTH_VERIFIED', 'PASS_GOLD_CONFIRMED', 'ROLLBACK_BOUND',
    'SNAPSHOT_CAPTURED', 'DRY_RUN_COMPLETED', 'PLAN_SEALED', 'PROOF_RECEIPT_ISSUED',
    'EVIDENCE_PACKAGE_SEALED', 'LEDGER_CLOSED',
  ]) {
    assert(`event type present: ${t}`, CONTROLLED_EXECUTION_LEDGER_EVENT_TYPES.includes(t));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
