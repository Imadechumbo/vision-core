#!/usr/bin/env node
/**
 * Tests — Prompt Cache Ledger V132.0
 */

import {
  buildPromptCacheLedger,
  appendPromptCacheLedgerEvent,
  sealPromptCacheLedger,
  validatePromptCacheLedger,
  renderPromptCacheLedger,
  PROMPT_CACHE_EVENT_TYPES,
  LEDGER_STATUSES,
} from '../prompt-cache-ledger.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

console.log('\n=== prompt-cache-ledger tests ===\n');

console.log('--- build: default ---');
{
  const l = buildPromptCacheLedger({ mission_id: 'm1', contract_id: 'c1', store_id: 's1' });
  assert(l.ledger_status === 'LEDGER_EMPTY', 'initial status EMPTY');
  assert(l.schema_version === 'v132.0', 'schema version');
  assert(typeof l.ledger_id === 'string' && l.ledger_id.length === 64, 'ledger_id sha256');
  assert(l.mission_id === 'm1', 'mission_id');
  assert(l.contract_id === 'c1', 'contract_id');
  assert(l.store_id === 's1', 'store_id');
  assert(Array.isArray(l.events), 'events array');
  assert(l.event_count === 0, 'event_count 0');
  assert(l.head_hash === null, 'head_hash null');
  assert(l.hit_count === 0, 'hit_count 0');
  assert(l.miss_count === 0, 'miss_count 0');
  assert(l.write_count === 0, 'write_count 0');
  assert(l.stale_count === 0, 'stale_count 0');
  assert(l.stable_promoted === false, 'stable_promoted=false');
  assert(l.deploy_performed === false, 'deploy_performed=false');
  assert(l.release_performed === false, 'release_performed=false');
}

console.log('--- build: null params ---');
{
  const l = buildPromptCacheLedger(null);
  assert(l.ledger_status === 'LEDGER_EMPTY', 'null params → EMPTY');
  assert(l.mission_id === null, 'mission_id null');
}

console.log('--- append: null ledger ---');
{
  const r = appendPromptCacheLedgerEvent(null, 'CACHE_HIT', {});
  assert(r.success === false, 'null ledger → fail');
  assert(r.reason.includes('null'), 'reason mentions null');
}

console.log('--- append: unknown event type ---');
{
  const l = buildPromptCacheLedger({});
  const r = appendPromptCacheLedgerEvent(l, 'UNKNOWN_EVENT', {});
  assert(r.success === false, 'unknown type → fail');
  assert(r.reason.includes('unknown event_type'), 'reason mentions unknown');
}

console.log('--- append: first event ---');
{
  const l = buildPromptCacheLedger({ mission_id: 'm1' });
  const r = appendPromptCacheLedgerEvent(l, 'CACHE_STORE_INITIALIZED', { note: 'init' });
  assert(r.success === true, 'append success');
  assert(r.event_type === 'CACHE_STORE_INITIALIZED', 'event_type');
  assert(typeof r.event_id === 'string' && r.event_id.length === 64, 'event_id sha256');
  assert(typeof r.chain_hash === 'string', 'chain_hash');
  assert(r.event_count === 1, 'event_count 1');
  assert(r.ledger.ledger_status === 'LEDGER_ACTIVE', 'status ACTIVE');
  assert(r.ledger.head_hash === r.chain_hash, 'head_hash = chain_hash');
  assert(r.stable_promoted === false, 'stable_promoted=false');
  assert(r.deploy_performed === false, 'deploy_performed=false');
  assert(r.release_performed === false, 'release_performed=false');
}

console.log('--- append: chain integrity ---');
{
  let l = buildPromptCacheLedger({ mission_id: 'm1' });
  let r1 = appendPromptCacheLedgerEvent(l, 'CACHE_STORE_INITIALIZED', {});
  l = r1.ledger;
  let r2 = appendPromptCacheLedgerEvent(l, 'CACHE_WRITE_SUCCESS', { entry_key: 'k1' });
  l = r2.ledger;
  assert(l.event_count === 2, 'event_count 2');
  assert(l.events[1].prev_hash === r1.chain_hash, 'prev_hash = prior chain_hash');
  assert(l.head_hash === r2.chain_hash, 'head updated');
}

console.log('--- append: counters ---');
{
  let l = buildPromptCacheLedger({});
  l = appendPromptCacheLedgerEvent(l, 'CACHE_HIT', { entry_key: 'k1' }).ledger;
  l = appendPromptCacheLedgerEvent(l, 'CACHE_HIT', { entry_key: 'k2' }).ledger;
  l = appendPromptCacheLedgerEvent(l, 'CACHE_MISS', { entry_key: 'k3' }).ledger;
  l = appendPromptCacheLedgerEvent(l, 'CACHE_WRITE_SUCCESS', { entry_key: 'k4' }).ledger;
  l = appendPromptCacheLedgerEvent(l, 'CACHE_STALE', { entry_key: 'k5' }).ledger;
  assert(l.hit_count === 2, 'hit_count=2');
  assert(l.miss_count === 1, 'miss_count=1');
  assert(l.write_count === 1, 'write_count=1');
  assert(l.stale_count === 1, 'stale_count=1');
}

console.log('--- append: entry_key in event ---');
{
  let l = buildPromptCacheLedger({});
  const r = appendPromptCacheLedgerEvent(l, 'CACHE_WRITE_SUCCESS', { entry_key: 'mykey' });
  assert(r.ledger.events[0].entry_key === 'mykey', 'entry_key stored');
}

console.log('--- seal ---');
{
  let l = buildPromptCacheLedger({});
  l = appendPromptCacheLedgerEvent(l, 'CACHE_HIT', {}).ledger;
  const sr = sealPromptCacheLedger(l);
  assert(sr.success === true, 'seal success');
  assert(sr.ledger.ledger_status === 'LEDGER_SEALED', 'status SEALED');
  assert(typeof sr.seal_hash === 'string', 'seal_hash string');
  assert(typeof sr.ledger.sealed_at === 'number', 'sealed_at number');
  assert(sr.stable_promoted === false, 'stable_promoted=false');
  assert(sr.deploy_performed === false, 'deploy_performed=false');
  assert(sr.release_performed === false, 'release_performed=false');
}

console.log('--- seal: already sealed ---');
{
  let l = buildPromptCacheLedger({});
  const sr = sealPromptCacheLedger(l);
  const sr2 = sealPromptCacheLedger(sr.ledger);
  assert(sr2.success === false, 'already sealed → fail');
}

console.log('--- seal: null ledger ---');
{
  const sr = sealPromptCacheLedger(null);
  assert(sr.success === false, 'null → fail');
}

console.log('--- append: sealed ledger ---');
{
  let l = buildPromptCacheLedger({});
  const sr = sealPromptCacheLedger(l);
  const r = appendPromptCacheLedgerEvent(sr.ledger, 'CACHE_HIT', {});
  assert(r.success === false, 'sealed → fail');
  assert(r.reason.includes('sealed'), 'reason mentions sealed');
}

console.log('--- validate: valid ---');
{
  let l = buildPromptCacheLedger({ mission_id: 'm1' });
  l = appendPromptCacheLedgerEvent(l, 'CACHE_HIT', {}).ledger;
  const v = validatePromptCacheLedger(l);
  assert(v.valid === true, 'valid=true');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate: null ---');
{
  const v = validatePromptCacheLedger(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- validate: chain integrity check ---');
{
  let l = buildPromptCacheLedger({});
  l = appendPromptCacheLedgerEvent(l, 'CACHE_HIT', {}).ledger;
  l = appendPromptCacheLedgerEvent(l, 'CACHE_MISS', {}).ledger;
  // Tamper the chain
  const tampered = {
    ...l,
    events: [
      { ...l.events[0], prev_hash: 'TAMPERED' },
      l.events[1],
    ],
  };
  const v = validatePromptCacheLedger(tampered);
  assert(v.valid === false, 'tampered chain → invalid');
  assert(v.errors.some(e => e.includes('chain broken')), 'chain broken error');
}

console.log('--- validate: empty ledger ---');
{
  const l = buildPromptCacheLedger({});
  const v = validatePromptCacheLedger(l);
  assert(v.valid === true, 'empty ledger valid');
}

console.log('--- render ---');
{
  let l = buildPromptCacheLedger({ mission_id: 'm1', contract_id: 'c1' });
  l = appendPromptCacheLedgerEvent(l, 'CACHE_HIT', {}).ledger;
  const txt = renderPromptCacheLedger(l);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('PROMPT CACHE LEDGER V132.0'), 'render title');
  assert(txt.includes('LEDGER_ACTIVE'), 'status in output');
  assert(txt.includes('stable_promoted:'), 'invariant in output');
}

console.log('--- render: sealed ---');
{
  let l = buildPromptCacheLedger({});
  l = sealPromptCacheLedger(l).ledger;
  const txt = renderPromptCacheLedger(l);
  assert(txt.includes('LEDGER_SEALED'), 'sealed status');
  assert(txt.includes('Seal Hash:'), 'seal hash in output');
}

console.log('--- render: null ---');
{
  const txt = renderPromptCacheLedger(null);
  assert(txt.includes('null'), 'null renders gracefully');
}

console.log('--- event types export ---');
{
  assert(PROMPT_CACHE_EVENT_TYPES.includes('CACHE_HIT'), 'HIT in types');
  assert(PROMPT_CACHE_EVENT_TYPES.includes('CACHE_MISS'), 'MISS in types');
  assert(PROMPT_CACHE_EVENT_TYPES.includes('CACHE_WRITE_SUCCESS'), 'WRITE_SUCCESS in types');
  assert(PROMPT_CACHE_EVENT_TYPES.includes('CACHE_STALE'), 'STALE in types');
  assert(PROMPT_CACHE_EVENT_TYPES.includes('CACHE_CONTRACT_CREATED'), 'CONTRACT_CREATED in types');
  assert(PROMPT_CACHE_EVENT_TYPES.length === 11, 'exactly 11 event types');
}

console.log('--- ledger statuses export ---');
{
  assert(LEDGER_STATUSES.includes('LEDGER_EMPTY'), 'EMPTY in statuses');
  assert(LEDGER_STATUSES.includes('LEDGER_ACTIVE'), 'ACTIVE in statuses');
  assert(LEDGER_STATUSES.includes('LEDGER_SEALED'), 'SEALED in statuses');
  assert(LEDGER_STATUSES.length === 3, 'exactly 3 statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
