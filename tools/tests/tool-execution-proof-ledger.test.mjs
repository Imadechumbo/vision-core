#!/usr/bin/env node
/**
 * Tests — Tool Execution Proof Ledger V147.1
 */

import {
  createProofLedger,
  appendProofEntry,
  sealProofLedger,
  verifyProofLedger,
  validateProofLedger,
  renderProofLedger,
  PROOF_LEDGER_STATUSES,
  PROOF_EVENT_TYPES,
} from '../tool-execution-proof-ledger.mjs';

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

const ENTRY1 = {
  proof_id:   'p1',
  event_type: 'TEST_EXECUTED',
  command:    'npm run test:foo',
  exit_code:  0,
  output_hash: 'abc123',
  completed_at: '2026-05-21T10:00:00.000Z',
};

const ENTRY2 = {
  proof_id:   'p2',
  event_type: 'GIT_STATUS_CAPTURED',
  command:    'git status',
  exit_code:  0,
  completed_at: '2026-05-21T10:01:00.000Z',
};

console.log('\n=== tool-execution-proof-ledger tests ===\n');

// --- create ledger ---
console.log('--- create ledger ---');
{
  const r = createProofLedger({});
  assert('no ledger_id → PROOF_LEDGER_EMPTY invalid', r.ledger_status === 'PROOF_LEDGER_EMPTY' && r.valid === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = createProofLedger(null);
  assert('null → PROOF_LEDGER_EMPTY invalid', r.ledger_status === 'PROOF_LEDGER_EMPTY' && r.valid === false);
}
{
  const r = createProofLedger({ ledger_id: 'L1', mission_id: 'm1' });
  assert('valid create → PROOF_LEDGER_EMPTY valid', r.ledger_status === 'PROOF_LEDGER_EMPTY' && r.valid === true);
  assert('schema_version=v147.1', r.schema_version === 'v147.1');
  assert('ledger_id=L1', r.ledger_id === 'L1');
  assert('mission_id=m1', r.mission_id === 'm1');
  assert('entry_count=0', r.entry_count === 0);
  assert('entries empty', r.entries.length === 0);
  assert('genesis_hash sha256', /^[a-f0-9]{64}$/.test(r.genesis_hash));
  assert('head_hash=genesis_hash', r.head_hash === r.genesis_hash);
  assert('sealed=false', r.sealed === false);
}

// --- append entry ---
console.log('--- append entry ---');
{
  const l0 = createProofLedger({ ledger_id: 'L2', mission_id: 'm2' });
  const l1 = appendProofEntry(l0, ENTRY1);
  assert('after append → PROOF_LEDGER_READY', l1.ledger_status === 'PROOF_LEDGER_READY');
  assert('entry_count=1', l1.entry_count === 1);
  assert('entry event_type', l1.entries[0].event_type === 'TEST_EXECUTED');
  assert('entry proof_id', l1.entries[0].proof_id === 'p1');
  assert('entry exit_code', l1.entries[0].exit_code === 0);
  assert('entry entry_hash sha256', /^[a-f0-9]{64}$/.test(l1.entries[0].entry_hash));
  assert('entry previous_hash = genesis', l1.entries[0].previous_hash === l0.genesis_hash);
  assert('head_hash updated', l1.head_hash !== l0.genesis_hash);
  assert('head_hash = entry_hash', l1.head_hash === l1.entries[0].entry_hash);
  assert('stable_promoted=false', l1.stable_promoted === false);
}
{
  const l0 = createProofLedger({ ledger_id: 'L3' });
  const l1 = appendProofEntry(l0, ENTRY1);
  const l2 = appendProofEntry(l1, ENTRY2);
  assert('two entries → entry_count=2', l2.entry_count === 2);
  assert('chain: entry2.prev = entry1.hash', l2.entries[1].previous_hash === l2.entries[0].entry_hash);
  assert('head_hash = entry2.hash', l2.head_hash === l2.entries[1].entry_hash);
}
{
  const l0 = createProofLedger({ ledger_id: 'L4' });
  const r = appendProofEntry(l0, { proof_id: 'x', event_type: 'UNKNOWN_EVENT' });
  assert('unknown event_type → no append', r.entry_count === 0);
}
{
  const l0 = createProofLedger({ ledger_id: 'L5' });
  const r = appendProofEntry(l0, { event_type: 'TEST_EXECUTED' });
  assert('missing proof_id → no append', r.entry_count === 0);
}
{
  // Cannot append to sealed
  const l0 = createProofLedger({ ledger_id: 'L6' });
  const l1 = sealProofLedger(l0);
  const l2 = appendProofEntry(l1, ENTRY1);
  assert('append to sealed → no-op', l2.entry_count === 0);
}
{
  // append to null → null
  assert('append to null → null', appendProofEntry(null, ENTRY1) === null);
}

// --- seal ---
console.log('--- seal ---');
{
  const l0 = createProofLedger({ ledger_id: 'LS1' });
  const l1 = appendProofEntry(l0, ENTRY1);
  const l2 = sealProofLedger(l1);
  assert('sealed → PROOF_LEDGER_SEALED', l2.ledger_status === 'PROOF_LEDGER_SEALED');
  assert('sealed=true', l2.sealed === true);
  assert('sealed_at set', typeof l2.sealed_at === 'string');
  assert('stable_promoted=false', l2.stable_promoted === false);
}
{
  assert('seal null → null', sealProofLedger(null) === null);
}

// --- verify ---
console.log('--- verify ---');
{
  const l0 = createProofLedger({ ledger_id: 'LV1', mission_id: 'mv1' });
  const l1 = appendProofEntry(l0, ENTRY1);
  const l2 = appendProofEntry(l1, ENTRY2);
  const v = verifyProofLedger(l2);
  assert('valid chain → verify ok', v.valid === true);
  assert('tampered=false', v.tampered === false);
  assert('no errors', v.errors.length === 0);
}
{
  const l0 = createProofLedger({ ledger_id: 'LV2' });
  const v = verifyProofLedger(l0);
  assert('empty ledger → verify ok', v.valid === true);
}
{
  const l0 = createProofLedger({ ledger_id: 'LV3' });
  const l1 = appendProofEntry(l0, ENTRY1);
  const tampered = {
    ...l1,
    entries: [{ ...l1.entries[0], exit_code: 99 }],
  };
  const v = verifyProofLedger(tampered);
  assert('tampered entry → verify fails', v.valid === false);
  assert('tampered=true', v.tampered === true);
}
{
  const l0 = createProofLedger({ ledger_id: 'LV4' });
  const l1 = appendProofEntry(l0, ENTRY1);
  const wrongGenesis = { ...l1, genesis_hash: 'badhash' };
  const v = verifyProofLedger(wrongGenesis);
  assert('wrong genesis → tampered', v.tampered === true);
}
{
  const v = verifyProofLedger(null);
  assert('verify null → invalid tampered', v.valid === false && v.tampered === true);
}

// --- REGRA ABSOLUTA all ops ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    createProofLedger({}),
    createProofLedger({ ledger_id: 'x' }),
    appendProofEntry(createProofLedger({ ledger_id: 'x' }), ENTRY1),
    sealProofLedger(createProofLedger({ ledger_id: 'x' })),
  ];
  for (const r of cases) {
    if (!r) continue;
    assert(`stable_promoted=false [${r.ledger_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.ledger_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.ledger_status}]`, r.release_performed === false);
  }
}

// --- deterministic genesis ---
console.log('--- deterministic genesis ---');
{
  const l1 = createProofLedger({ ledger_id: 'DET', mission_id: 'dm' });
  const l2 = createProofLedger({ ledger_id: 'DET', mission_id: 'dm' });
  assert('genesis_hash deterministic', l1.genesis_hash === l2.genesis_hash);
}
{
  const l1 = createProofLedger({ ledger_id: 'A' });
  const l2 = createProofLedger({ ledger_id: 'B' });
  assert('different ledger_id → different genesis', l1.genesis_hash !== l2.genesis_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const l = appendProofEntry(createProofLedger({ ledger_id: 'VL1' }), ENTRY1);
  const v = validateProofLedger(l);
  assert('validate ready → valid=true', v.valid === true);
}
{
  const v = validateProofLedger(createProofLedger({}));
  assert('validate invalid create → struct fields present → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateProofLedger(null).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const l = appendProofEntry(createProofLedger({ ledger_id: 'RL1', mission_id: 'mr1' }), ENTRY1);
  const s = renderProofLedger(l);
  assert('render string', typeof s === 'string');
  assert('render shows PROOF_LEDGER_READY', s.includes('PROOF_LEDGER_READY'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows event', s.includes('TEST_EXECUTED'));
}
{
  assert('render null graceful', typeof renderProofLedger(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('PROOF_LEDGER_STATUSES is array', Array.isArray(PROOF_LEDGER_STATUSES));
  assert('PROOF_LEDGER_STATUSES length=4', PROOF_LEDGER_STATUSES.length === 4);
  assert('PROOF_EVENT_TYPES is array', Array.isArray(PROOF_EVENT_TYPES));
  assert('PROOF_EVENT_TYPES length=10', PROOF_EVENT_TYPES.length === 10);
  for (const t of [
    'COMMAND_EXECUTED', 'COMMAND_FAILED', 'TEST_EXECUTED', 'TEST_PASSED',
    'TEST_FAILED', 'GIT_STATUS_CAPTURED', 'GIT_DIFF_CAPTURED',
    'FILESYSTEM_CHECK_CAPTURED', 'CLAIM_VERIFIED', 'CLAIM_BLOCKED',
  ]) {
    assert(`event type present: ${t}`, PROOF_EVENT_TYPES.includes(t));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
