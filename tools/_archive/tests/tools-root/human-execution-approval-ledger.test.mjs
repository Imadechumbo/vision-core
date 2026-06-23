#!/usr/bin/env node
/**
 * Tests — Human Execution Approval Ledger V156.0
 */

import {
  buildHumanExecutionApprovalLedger,
  appendApprovalLedgerEvent,
  verifyApprovalLedgerChain,
  validateHumanExecutionApprovalLedger,
  renderHumanExecutionApprovalLedger,
  APPROVAL_LEDGER_EVENT_TYPES,
  APPROVAL_LEDGER_STATUSES,
} from '../human-execution-approval-ledger.mjs';

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

console.log('\n=== human-execution-approval-ledger tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildHumanExecutionApprovalLedger({});
  assert('no ledger_id → APPROVAL_LEDGER_BLOCKED_INPUT', r.approval_ledger_status === 'APPROVAL_LEDGER_BLOCKED_INPUT');
  assert('event_count=0', r.event_count === 0);
  assert('approval_active=false', r.approval_active === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildHumanExecutionApprovalLedger(null);
  assert('null → BLOCKED_INPUT', r.approval_ledger_status === 'APPROVAL_LEDGER_BLOCKED_INPUT');
}

// --- empty ledger ---
console.log('--- empty ledger ---');
{
  const r = buildHumanExecutionApprovalLedger({ ledger_id: 'l1' });
  assert('no events → APPROVAL_LEDGER_EMPTY', r.approval_ledger_status === 'APPROVAL_LEDGER_EMPTY');
  assert('schema_version=v156.0', r.schema_version === 'v156.0');
  assert('ledger_id propagated', r.ledger_id === 'l1');
  assert('event_count=0', r.event_count === 0);
  assert('events=[]', r.events.length === 0);
  assert('approval_active=false', r.approval_active === false);
  assert('chain_head is string', typeof r.chain_head === 'string');
  assert('ledger_id_hash sha256', /^[a-f0-9]{64}$/.test(r.ledger_id_hash));
}

// --- ready status: APPROVAL_GRANTED last ---
console.log('--- ready status ---');
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'l2',
    events: [
      { event_type: 'APPROVAL_REQUESTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' },
      { event_type: 'APPROVAL_GRANTED',   event_id: 'e2', occurred_at: '2026-05-21T10:01:00.000Z' },
    ],
  });
  assert('APPROVAL_GRANTED last → APPROVAL_LEDGER_READY', r.approval_ledger_status === 'APPROVAL_LEDGER_READY');
  assert('approval_active=true', r.approval_active === true);
  assert('event_count=2', r.event_count === 2);
  assert('chain intact', r.events[1].prev_hash === r.events[0].event_hash);
  assert('chain_head=last event_hash', r.chain_head === r.events[1].event_hash);
}

// --- revoked status: APPROVAL_REVOKED after GRANTED ---
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'l3',
    events: [
      { event_type: 'APPROVAL_REQUESTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' },
      { event_type: 'APPROVAL_GRANTED',   event_id: 'e2', occurred_at: '2026-05-21T10:01:00.000Z' },
      { event_type: 'APPROVAL_REVOKED',   event_id: 'e3', occurred_at: '2026-05-21T10:02:00.000Z' },
    ],
  });
  assert('APPROVAL_REVOKED after GRANTED → EMPTY (not READY)', r.approval_ledger_status === 'APPROVAL_LEDGER_EMPTY');
  assert('approval_active=false after revoke', r.approval_active === false);
}

// --- expired: APPROVAL_EXPIRED after GRANTED ---
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'l4',
    events: [
      { event_type: 'APPROVAL_GRANTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' },
      { event_type: 'APPROVAL_EXPIRED', event_id: 'e2', occurred_at: '2026-05-21T11:00:00.000Z' },
    ],
  });
  assert('APPROVAL_EXPIRED after GRANTED → EMPTY', r.approval_ledger_status === 'APPROVAL_LEDGER_EMPTY');
  assert('approval_active=false after expire', r.approval_active === false);
}

// --- sealed ---
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'l5',
    events: [
      { event_type: 'APPROVAL_GRANTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' },
      { event_type: 'APPROVAL_SEALED',  event_id: 'e2', occurred_at: '2026-05-21T10:05:00.000Z' },
    ],
  });
  assert('APPROVAL_SEALED → APPROVAL_LEDGER_SEALED', r.approval_ledger_status === 'APPROVAL_LEDGER_SEALED');
  assert('approval_active=false when sealed', r.approval_active === false);
}

// --- token hashing ---
console.log('--- token hashing ---');
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'l6',
    events: [
      { event_type: 'APPROVAL_TOKEN_SET', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z', approval_token: 'my-secret' },
    ],
  });
  assert('token event stored', r.event_count === 1);
  assert('token hashed not stored raw', r.events[0].payload?.approval_token_hash !== undefined);
  assert('original token not in payload', !JSON.stringify(r.events[0]).includes('my-secret'));
  assert('token hash is sha256', /^[a-f0-9]{64}$/.test(r.events[0].payload?.approval_token_hash));
}

// --- chain verification ---
console.log('--- chain verification ---');
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'l7',
    events: [
      { event_type: 'APPROVAL_REQUESTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' },
      { event_type: 'APPROVAL_GRANTED',   event_id: 'e2', occurred_at: '2026-05-21T10:01:00.000Z' },
    ],
  });
  const cv = verifyApprovalLedgerChain(r);
  assert('intact chain → valid=true', cv.valid === true);
}
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'l8',
    events: [
      { event_type: 'APPROVAL_GRANTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' },
    ],
  });
  const tampered = { ...r, events: [{ ...r.events[0], event_hash: 'badhash' }] };
  const cv = verifyApprovalLedgerChain(tampered);
  assert('tampered event_hash → invalid', cv.valid === false);
}
{
  assert('verify null → invalid', verifyApprovalLedgerChain(null).valid === false);
}

// --- invalid event types filtered ---
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'l9',
    events: [
      { event_type: 'APPROVAL_GRANTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' },
      { event_type: 'BOGUS_TYPE',       event_id: 'e2' },
    ],
  });
  assert('invalid event type filtered → 1 event', r.event_count === 1);
}

// --- append ---
console.log('--- append ---');
{
  let r = buildHumanExecutionApprovalLedger({ ledger_id: 'l10' });
  const a1 = appendApprovalLedgerEvent(r, { event_type: 'APPROVAL_REQUESTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' });
  assert('append returns appended=true', a1.appended === true);
  r = a1.ledger;
  assert('event_count=1 after append', r.event_count === 1);
  assert('status=EMPTY (no GRANTED yet)', r.approval_ledger_status === 'APPROVAL_LEDGER_EMPTY');

  const a2 = appendApprovalLedgerEvent(r, { event_type: 'APPROVAL_GRANTED', event_id: 'e2', occurred_at: '2026-05-21T10:01:00.000Z' });
  assert('append GRANTED → appended=true', a2.appended === true);
  r = a2.ledger;
  assert('status=READY after GRANTED', r.approval_ledger_status === 'APPROVAL_LEDGER_READY');
  assert('approval_active=true', r.approval_active === true);
}

// --- append to sealed blocked ---
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'l11',
    events: [{ event_type: 'APPROVAL_SEALED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' }],
  });
  const a = appendApprovalLedgerEvent(r, { event_type: 'APPROVAL_GRANTED', event_id: 'e2' });
  assert('append to sealed → appended=false', a.appended === false);
  assert('error message present', typeof a.error === 'string');
}

// --- append to blocked blocked ---
{
  const r = buildHumanExecutionApprovalLedger({});
  const a = appendApprovalLedgerEvent(r, { event_type: 'APPROVAL_GRANTED', event_id: 'e1' });
  assert('append to blocked → appended=false', a.appended === false);
}

// --- append null ---
{
  const a = appendApprovalLedgerEvent(null, { event_type: 'APPROVAL_GRANTED' });
  assert('append to null → appended=false', a.appended === false);
}

// --- append invalid event type ---
{
  const r = buildHumanExecutionApprovalLedger({ ledger_id: 'l12' });
  const a = appendApprovalLedgerEvent(r, { event_type: 'INVALID' });
  assert('append invalid type → appended=false', a.appended === false);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildHumanExecutionApprovalLedger({}),
    buildHumanExecutionApprovalLedger({ ledger_id: 'lx' }),
    buildHumanExecutionApprovalLedger({
      ledger_id: 'ly',
      events: [{ event_type: 'APPROVAL_GRANTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' }],
    }),
  ];
  for (const r of cases) {
    assert(`execution_performed=false [${r.approval_ledger_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.approval_ledger_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.approval_ledger_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.approval_ledger_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildHumanExecutionApprovalLedger({ ledger_id: 'lv1' });
  const v = validateHumanExecutionApprovalLedger(r);
  assert('validate empty → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'lv2',
    events: [{ event_type: 'APPROVAL_GRANTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' }],
  });
  const v = validateHumanExecutionApprovalLedger(r);
  assert('validate READY → valid=true', v.valid === true);
}
{
  const r = buildHumanExecutionApprovalLedger({});
  const v = validateHumanExecutionApprovalLedger(r);
  assert('validate blocked → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateHumanExecutionApprovalLedger(null).valid === false);
}
{
  const r = buildHumanExecutionApprovalLedger({ ledger_id: 'lv3' });
  assert('execution_performed tampered → invalid', validateHumanExecutionApprovalLedger({ ...r, execution_performed: true }).valid === false);
}
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'lv4',
    events: [{ event_type: 'APPROVAL_GRANTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' }],
  });
  assert('READY with approval_active=false → invalid', validateHumanExecutionApprovalLedger({ ...r, approval_active: false }).valid === false);
}
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'lv5',
    events: [{ event_type: 'APPROVAL_SEALED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' }],
  });
  assert('SEALED with approval_active=true → invalid', validateHumanExecutionApprovalLedger({ ...r, approval_active: true }).valid === false);
}
{
  const r = buildHumanExecutionApprovalLedger({ ledger_id: 'lv6' });
  assert('event_count mismatch → invalid', validateHumanExecutionApprovalLedger({ ...r, event_count: 5 }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildHumanExecutionApprovalLedger({
    ledger_id: 'l-render',
    events: [
      { event_type: 'APPROVAL_REQUESTED', event_id: 'e1', occurred_at: '2026-05-21T10:00:00.000Z' },
      { event_type: 'APPROVAL_GRANTED',   event_id: 'e2', occurred_at: '2026-05-21T10:01:00.000Z' },
    ],
  });
  const s = renderHumanExecutionApprovalLedger(r);
  assert('render string', typeof s === 'string');
  assert('render shows READY', s.includes('APPROVAL_LEDGER_READY'));
  assert('render shows REGRA', s.includes('execution_performed=false'));
  assert('render shows ledger_id', s.includes('l-render'));
  assert('render shows APPROVAL_GRANTED', s.includes('APPROVAL_GRANTED'));
}
{
  const r = buildHumanExecutionApprovalLedger({});
  const s = renderHumanExecutionApprovalLedger(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderHumanExecutionApprovalLedger(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('APPROVAL_LEDGER_EVENT_TYPES is array', Array.isArray(APPROVAL_LEDGER_EVENT_TYPES));
  assert('event types length=6', APPROVAL_LEDGER_EVENT_TYPES.length === 6);
  assert('APPROVAL_LEDGER_STATUSES is array', Array.isArray(APPROVAL_LEDGER_STATUSES));
  assert('statuses length=5', APPROVAL_LEDGER_STATUSES.length === 5);
  for (const t of [
    'APPROVAL_REQUESTED', 'APPROVAL_GRANTED', 'APPROVAL_REVOKED',
    'APPROVAL_EXPIRED', 'APPROVAL_TOKEN_SET', 'APPROVAL_SEALED',
  ]) {
    assert(`event type present: ${t}`, APPROVAL_LEDGER_EVENT_TYPES.includes(t));
  }
  for (const s of [
    'APPROVAL_LEDGER_BLOCKED_INPUT', 'APPROVAL_LEDGER_EMPTY',
    'APPROVAL_LEDGER_READY', 'APPROVAL_LEDGER_SEALED', 'APPROVAL_LEDGER_TAMPERED',
  ]) {
    assert(`status present: ${s}`, APPROVAL_LEDGER_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
