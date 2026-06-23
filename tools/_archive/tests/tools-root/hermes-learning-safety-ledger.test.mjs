#!/usr/bin/env node
/**
 * Tests — Hermes Learning Safety Ledger V144.1
 */

import {
  createLearningSafetyLedger,
  appendLearningSafetyEvent,
  sealLearningSafetyLedger,
  verifyLearningSafetyLedger,
  renderLearningSafetyLedger,
  LEARNING_SAFETY_EVENT_TYPES,
} from '../hermes-learning-safety-ledger.mjs';

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

console.log('\n=== hermes-learning-safety-ledger tests ===\n');

// --- create ---
console.log('--- create ---');
{
  const l = createLearningSafetyLedger('ledger-mission-1');
  assert('ledger_id sha256', /^[a-f0-9]{64}$/.test(l.ledger_id));
  assert('genesis_hash sha256', /^[a-f0-9]{64}$/.test(l.genesis_hash));
  assert('schema_version=v144.1', l.schema_version === 'v144.1');
  assert('mission_id set', l.mission_id === 'ledger-mission-1');
  assert('entries empty', l.entries.length === 0);
  assert('sealed=false', l.sealed === false);
  assert('entry_count=0', l.entry_count === 0);
  assert('stable_promoted=false', l.stable_promoted === false);
  assert('deploy_performed=false', l.deploy_performed === false);
  assert('release_performed=false', l.release_performed === false);
}
{
  let threw = false;
  try { createLearningSafetyLedger(''); } catch { threw = true; }
  assert('empty mission_id throws', threw);
}

// --- append events ---
console.log('--- append events ---');
{
  let l = createLearningSafetyLedger('ledger-2');
  l = appendLearningSafetyEvent(l, 'LEARNING_ALLOWED', { mission_id: 'x' });
  assert('entry appended', l.entries.length === 1);
  assert('entry_count=1', l.entry_count === 1);
  assert('event_type set', l.entries[0].event_type === 'LEARNING_ALLOWED');
  assert('entry_hash sha256', /^[a-f0-9]{64}$/.test(l.entries[0].entry_hash));
  assert('prev_hash=genesis', l.entries[0].prev_hash === l.genesis_hash);
}
{
  let l = createLearningSafetyLedger('ledger-3');
  l = appendLearningSafetyEvent(l, 'LEARNING_ALLOWED', {});
  l = appendLearningSafetyEvent(l, 'DIAGNOSTIC_ONLY', {});
  l = appendLearningSafetyEvent(l, 'UNSAFE_LEARNING_BLOCKED', {});
  assert('3 entries', l.entries.length === 3);
  assert('chained hash', l.entries[1].prev_hash === l.entries[0].entry_hash);
  assert('chained hash 2', l.entries[2].prev_hash === l.entries[1].entry_hash);
}
{
  let threw = false;
  const l = createLearningSafetyLedger('x');
  try { appendLearningSafetyEvent(l, 'INVALID_EVENT', {}); } catch { threw = true; }
  assert('invalid event_type throws', threw);
}

// --- all event types ---
console.log('--- all event types ---');
{
  let l = createLearningSafetyLedger('ledger-4');
  for (const t of LEARNING_SAFETY_EVENT_TYPES) {
    l = appendLearningSafetyEvent(l, t, {});
  }
  assert('all 9 event types appended', l.entry_count === 9);
}

// --- seal ---
console.log('--- seal ---');
{
  let l = createLearningSafetyLedger('ledger-5');
  l = appendLearningSafetyEvent(l, 'LEARNING_ALLOWED', {});
  l = sealLearningSafetyLedger(l);
  assert('sealed=true', l.sealed === true);
  assert('final_hash set', /^[a-f0-9]{64}$/.test(l.final_hash));
  assert('sealed_at set', typeof l.sealed_at === 'string');
  assert('final_hash=last entry_hash', l.final_hash === l.entries[0].entry_hash);
}
{
  let l = createLearningSafetyLedger('ledger-6');
  l = sealLearningSafetyLedger(l);
  assert('empty ledger seal → final_hash=genesis', l.final_hash === l.genesis_hash);
}
{
  let threw = false;
  let l = createLearningSafetyLedger('x');
  l = sealLearningSafetyLedger(l);
  try { appendLearningSafetyEvent(l, 'LEARNING_ALLOWED', {}); } catch { threw = true; }
  assert('append to sealed throws', threw);
}

// --- verify ---
console.log('--- verify ---');
{
  let l = createLearningSafetyLedger('ledger-7');
  l = appendLearningSafetyEvent(l, 'LEARNING_ALLOWED', {});
  l = appendLearningSafetyEvent(l, 'EVIDENCE_REUSE_ALLOWED', {});
  l = sealLearningSafetyLedger(l);
  const v = verifyLearningSafetyLedger(l);
  assert('intact ledger → valid=true', v.valid === true);
  assert('tampered=false', v.tampered === false);
  assert('no errors', v.errors.length === 0);
}
{
  // Tamper with an entry
  let l = createLearningSafetyLedger('ledger-8');
  l = appendLearningSafetyEvent(l, 'PATTERN_RECORDED', {});
  l.entries[0].event_type = 'UNSAFE_LEARNING_BLOCKED'; // tamper
  const v = verifyLearningSafetyLedger(l);
  assert('tampered entry → tampered=true', v.tampered === true);
  assert('errors present', v.errors.length > 0);
}
{
  const v = verifyLearningSafetyLedger(null);
  assert('verify null → invalid', v.valid === false);
}

// --- REGRA invariants after operations ---
console.log('--- REGRA invariants ---');
{
  let l = createLearningSafetyLedger('ledger-9');
  l = appendLearningSafetyEvent(l, 'DIAGNOSTIC_ONLY', {});
  l = sealLearningSafetyLedger(l);
  assert('stable_promoted=false after ops', l.stable_promoted === false);
  assert('deploy_performed=false after ops', l.deploy_performed === false);
  assert('release_performed=false after ops', l.release_performed === false);
}

// --- render ---
console.log('--- render ---');
{
  let l = createLearningSafetyLedger('ledger-10');
  l = appendLearningSafetyEvent(l, 'LEARNING_ALLOWED', {});
  l = appendLearningSafetyEvent(l, 'UNSAFE_LEARNING_BLOCKED', {});
  const s = renderLearningSafetyLedger(l);
  assert('render string', typeof s === 'string');
  assert('render shows LEARNING_ALLOWED', s.includes('LEARNING_ALLOWED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const s = renderLearningSafetyLedger(null);
  assert('render null graceful', typeof s === 'string');
}

// --- event types export ---
console.log('--- event types export ---');
{
  assert('is array', Array.isArray(LEARNING_SAFETY_EVENT_TYPES));
  assert('length=9', LEARNING_SAFETY_EVENT_TYPES.length === 9);
  for (const t of [
    'LEARNING_ALLOWED', 'DIAGNOSTIC_ONLY', 'UNSAFE_LEARNING_BLOCKED',
    'EVIDENCE_REUSE_ALLOWED', 'EVIDENCE_REUSE_BLOCKED',
    'PROMPT_COMPRESSION_ALLOWED', 'EXPENSIVE_ANALYSIS_SKIPPED',
    'EXPENSIVE_ANALYSIS_BLOCKED', 'PATTERN_RECORDED',
  ]) {
    assert(`${t} present`, LEARNING_SAFETY_EVENT_TYPES.includes(t));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
