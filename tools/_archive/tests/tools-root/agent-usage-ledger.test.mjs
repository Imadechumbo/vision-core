#!/usr/bin/env node
/**
 * Tests — Agent Usage Ledger V137.0
 */

import {
  createAgentUsageLedger,
  appendAgentUsageEvent,
  sealAgentUsageLedger,
  verifyAgentUsageLedger,
  renderAgentUsageLedger,
  AGENT_USAGE_EVENT_TYPES,
} from '../agent-usage-ledger.mjs';

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

const TS = '2026-05-20T23:00:00.000Z';

console.log('\n=== agent-usage-ledger tests ===\n');

// --- create ---
console.log('--- create ---');
{
  const l = createAgentUsageLedger('mission-ledger-1');
  assert('create returns object', l !== null && typeof l === 'object');
  assert('ledger_status=LEDGER_EMPTY', l.ledger_status === 'LEDGER_EMPTY');
  assert('entry_count=0', l.entry_count === 0);
  assert('entries empty', l.entries.length === 0);
  assert('sealed=false', l.sealed === false);
  assert('schema_version=v137.0', l.schema_version === 'v137.0');
  assert('stable_promoted=false', l.stable_promoted === false);
  assert('deploy_performed=false', l.deploy_performed === false);
  assert('release_performed=false', l.release_performed === false);
}
{
  const l = createAgentUsageLedger('');
  assert('empty mission_id → null', l === null);
}

// --- append events ---
console.log('--- append events ---');
{
  let l = createAgentUsageLedger('mission-ledger-2');
  l = appendAgentUsageEvent(l, 'AGENT_ROUTE_SELECTED', { route: 'claude', timestamp: TS });
  assert('after append: ledger_status=LEDGER_ACTIVE', l.ledger_status === 'LEDGER_ACTIVE');
  assert('entry_count=1', l.entry_count === 1);
  assert('entry_type correct', l.entries[0].event_type === 'AGENT_ROUTE_SELECTED');
  assert('stable_promoted=false', l.stable_promoted === false);
}
{
  let l = createAgentUsageLedger('mission-ledger-3');
  l = appendAgentUsageEvent(l, 'TOKEN_BUDGET_EVALUATED', { status: 'ALLOWED', timestamp: TS });
  l = appendAgentUsageEvent(l, 'COST_ESTIMATED', { cost: 0.45, timestamp: TS });
  l = appendAgentUsageEvent(l, 'COST_GATE_ALLOWED', { timestamp: TS });
  assert('3 events appended', l.entry_count === 3);
  assert('head_hash updated', /^[a-f0-9]{64}$/.test(l.head_hash));
}

// --- all event types ---
console.log('--- all event types ---');
{
  let l = createAgentUsageLedger('mission-all-events');
  for (const et of AGENT_USAGE_EVENT_TYPES) {
    l = appendAgentUsageEvent(l, et, { timestamp: TS });
  }
  assert(`all ${AGENT_USAGE_EVENT_TYPES.length} event types appendable`, l.entry_count === AGENT_USAGE_EVENT_TYPES.length);
}

// --- unknown event type ---
console.log('--- unknown event type ---');
{
  let l = createAgentUsageLedger('mission-unknown');
  const result = appendAgentUsageEvent(l, 'INVALID_EVENT', { timestamp: TS });
  assert('unknown event → append_error set', typeof result.append_error === 'string');
  assert('entry_count unchanged', result.entry_count === 0);
}

// --- sealed ledger rejects append ---
console.log('--- sealed ledger ---');
{
  let l = createAgentUsageLedger('mission-sealed');
  l = appendAgentUsageEvent(l, 'CACHE_HIT_RECORDED', { timestamp: TS });
  l = sealAgentUsageLedger(l);
  assert('sealed=true', l.sealed === true);
  assert('ledger_status=LEDGER_SEALED', l.ledger_status === 'LEDGER_SEALED');
  const after = appendAgentUsageEvent(l, 'CACHE_MISS_RECORDED', { timestamp: TS });
  assert('sealed → append_error', typeof after.append_error === 'string');
  assert('entry_count unchanged after seal', after.entry_count === 1);
}

// --- hash chain integrity ---
console.log('--- hash chain integrity ---');
{
  let l = createAgentUsageLedger('mission-chain');
  l = appendAgentUsageEvent(l, 'AGENT_ROUTE_SELECTED',  { timestamp: TS });
  l = appendAgentUsageEvent(l, 'TOKEN_BUDGET_EVALUATED', { timestamp: TS });
  l = appendAgentUsageEvent(l, 'COST_GATE_BLOCKED',     { timestamp: TS });
  const v = verifyAgentUsageLedger(l);
  assert('hash chain valid', v.valid === true);
  assert('tampered=false', v.tampered === false);
}

// --- tamper detection ---
console.log('--- tamper detection ---');
{
  let l = createAgentUsageLedger('mission-tamper');
  l = appendAgentUsageEvent(l, 'CACHE_HIT_RECORDED', { timestamp: TS });
  l = appendAgentUsageEvent(l, 'FALLBACK_SELECTED',  { timestamp: TS });
  // Tamper: modify first entry event_type
  const tampered = {
    ...l,
    entries: [
      { ...l.entries[0], event_type: 'COST_GATE_BLOCKED' },
      l.entries[1],
    ],
  };
  const v = verifyAgentUsageLedger(tampered);
  assert('tampered ledger detected', v.valid === false);
  assert('tampered=true', v.tampered === true);
}
{
  // Tamper head_hash
  let l = createAgentUsageLedger('mission-tamper2');
  l = appendAgentUsageEvent(l, 'PEAK_EXECUTION_BLOCKED', { timestamp: TS });
  const tampered = { ...l, head_hash: 'deadbeef'.repeat(8) };
  const v = verifyAgentUsageLedger(tampered);
  assert('modified head_hash detected', v.valid === false);
}

// --- REGRA invariants throughout ---
console.log('--- REGRA invariants ---');
{
  let l = createAgentUsageLedger('mission-regra');
  l = appendAgentUsageEvent(l, 'AGENT_ROUTE_SELECTED', { timestamp: TS });
  l = sealAgentUsageLedger(l);
  assert('stable_promoted=false', l.stable_promoted === false);
  assert('deploy_performed=false', l.deploy_performed === false);
  assert('release_performed=false', l.release_performed === false);
}

// --- AGENT_USAGE_EVENT_TYPES export ---
console.log('--- event types export ---');
{
  assert('is array', Array.isArray(AGENT_USAGE_EVENT_TYPES));
  assert('length=9', AGENT_USAGE_EVENT_TYPES.length === 9);
  for (const et of [
    'AGENT_ROUTE_SELECTED', 'TOKEN_BUDGET_EVALUATED', 'COST_ESTIMATED',
    'COST_GATE_ALLOWED', 'COST_GATE_BLOCKED', 'CACHE_HIT_RECORDED',
    'CACHE_MISS_RECORDED', 'FALLBACK_SELECTED', 'PEAK_EXECUTION_BLOCKED',
  ]) {
    assert(`${et} present`, AGENT_USAGE_EVENT_TYPES.includes(et));
  }
}

// --- render ---
console.log('--- render ---');
{
  let l = createAgentUsageLedger('mission-render');
  l = appendAgentUsageEvent(l, 'CACHE_HIT_RECORDED', { timestamp: TS });
  const s = renderAgentUsageLedger(l);
  assert('render string', typeof s === 'string');
  assert('render shows CACHE_HIT_RECORDED', s.includes('CACHE_HIT_RECORDED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const s = renderAgentUsageLedger(null);
  assert('render null graceful', typeof s === 'string');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
