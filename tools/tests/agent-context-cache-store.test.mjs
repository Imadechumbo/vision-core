#!/usr/bin/env node
/**
 * Tests — Agent Context Cache Store V131.1
 */

import { createHash } from 'crypto';
import {
  buildAgentContextCacheStore,
  writeAgentContextCache,
  readAgentContextCache,
  validateAgentContextCacheStore,
  renderAgentContextCacheStore,
  CACHE_STORE_STATUSES,
} from '../agent-context-cache-store.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

function sha256(s) { return createHash('sha256').update(String(s)).digest('hex'); }

const GOOD_CONTRACT = {
  contract_ready:      true,
  contract_id:         'contract-001',
  cache_key:           'a'.repeat(64),
  cache_hash:          'b'.repeat(64),
  ttl_minutes:         5,
  cache_read_allowed:  true,
  cache_write_allowed: true,
};

console.log('\n=== agent-context-cache-store tests ===\n');

console.log('--- null contract ---');
{
  const s = buildAgentContextCacheStore({});
  assert(s.store_status === 'CACHE_STORE_BLOCKED_CONTRACT', 'null contract → BLOCKED_CONTRACT');
  assert(s.store_ready === false, 'store_ready false');
}

console.log('--- contract not ready ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: { contract_ready: false } });
  assert(s.store_status === 'CACHE_STORE_BLOCKED_CONTRACT', 'not-ready → BLOCKED_CONTRACT');
}

console.log('--- store ready ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  assert(s.store_status === 'CACHE_STORE_READY', 'ready status');
  assert(s.store_ready === true, 'store_ready true');
  assert(typeof s.store_id === 'string' && s.store_id.length === 64, 'store_id sha256');
  assert(s.schema_version === 'v131.1', 'schema version');
  assert(s.contract_id === 'contract-001', 'contract_id');
  assert(s.ttl_minutes === 5, 'ttl_minutes');
  assert(s.read_allowed === true, 'read_allowed');
  assert(s.write_allowed === true, 'write_allowed');
  assert(typeof s.entries === 'object', 'entries object');
}

console.log('--- write: missing entry_key ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  const r = writeAgentContextCache(s, null, 'value', sha256('value'));
  assert(r.success === false, 'missing key → fail');
}

console.log('--- write: hash mismatch ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  const r = writeAgentContextCache(s, 'key1', 'value1', 'wrong-hash');
  assert(r.success === false, 'hash mismatch → fail');
  assert(r.reason.includes('hash mismatch'), 'hash mismatch reason');
}

console.log('--- write: success ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  const val = 'my-cached-context';
  const hash = sha256(val);
  const r = writeAgentContextCache(s, 'key1', val, hash);
  assert(r.success === true, 'write success');
  assert(r.entry_key === 'key1', 'entry_key');
  assert(r.entry_hash === hash, 'entry_hash');
  assert(typeof r.expires_at === 'number', 'expires_at number');
  assert(typeof r.entries === 'object', 'entries returned');
  assert(r.entries['key1'] !== undefined, 'entry in entries');
}

console.log('--- write: not allowed ---');
{
  const noWriteContract = { ...GOOD_CONTRACT, cache_write_allowed: false };
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: noWriteContract });
  const r = writeAgentContextCache(s, 'key1', 'val', sha256('val'));
  assert(r.success === false, 'write not allowed → fail');
}

console.log('--- read: store not ready ---');
{
  const r = readAgentContextCache({ store_ready: false }, 'key1', null);
  assert(r.cache_hit === false, 'not-ready → no hit');
  assert(r.cache_miss === true, 'not-ready → miss');
}

console.log('--- read: miss (key not found) ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  const r = readAgentContextCache(s, 'nonexistent', null);
  assert(r.cache_status === 'CACHE_STORE_MISS', 'not found → MISS');
  assert(r.cache_hit === false, 'cache_hit false');
  assert(r.cache_miss === true, 'cache_miss true');
}

console.log('--- read: hit ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  const val = 'cached-value';
  const hash = sha256(val);
  const write_result = writeAgentContextCache(s, 'mykey', val, hash);
  const store_with_entry = { ...s, entries: write_result.entries };
  const r = readAgentContextCache(store_with_entry, 'mykey', hash);
  assert(r.cache_status === 'CACHE_STORE_HIT', 'found → HIT');
  assert(r.cache_hit === true, 'cache_hit true');
  assert(r.cache_miss === false, 'cache_miss false');
  assert(r.entry_value === val, 'entry_value correct');
  assert(r.entry_hash === hash, 'entry_hash correct');
}

console.log('--- read: hash mismatch → miss ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  const val = 'cached-value';
  const hash = sha256(val);
  const write_result = writeAgentContextCache(s, 'mykey', val, hash);
  const store_with_entry = { ...s, entries: write_result.entries };
  const r = readAgentContextCache(store_with_entry, 'mykey', 'different-hash');
  assert(r.cache_status === 'CACHE_STORE_MISS', 'hash mismatch → MISS');
  assert(r.reason === 'hash mismatch', 'hash mismatch reason');
}

console.log('--- read: stale (expired) ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  const val = 'stale-value';
  const hash = sha256(val);
  const entries = {
    stalekey: {
      value:      val,
      hash,
      written_at: Date.now() - 10000,
      expires_at: Date.now() - 5000,
      stale:      false,
      invalidated: false,
    },
  };
  const store_with_stale = { ...s, entries };
  const r = readAgentContextCache(store_with_stale, 'stalekey', hash);
  assert(r.cache_status === 'CACHE_STORE_STALE', 'expired → STALE');
  assert(r.stale === true, 'stale true');
  assert(r.cache_hit === false, 'cache_hit false for stale');
}

console.log('--- read: invalidated → miss ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  const val = 'inv-value';
  const hash = sha256(val);
  const entries = {
    invkey: {
      value:      val,
      hash,
      written_at: Date.now(),
      expires_at: Date.now() + 300000,
      stale:      false,
      invalidated: true,
    },
  };
  const store_with_inv = { ...s, entries };
  const r = readAgentContextCache(store_with_inv, 'invkey', hash);
  assert(r.cache_status === 'CACHE_STORE_MISS', 'invalidated → MISS');
}

console.log('--- stable_promoted=false ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  assert(s.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- deploy_performed=false ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  assert(s.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  assert(s.release_performed === false, 'release_performed=false');
}

console.log('--- validate ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  const v = validateAgentContextCacheStore(s);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateAgentContextCacheStore(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const s = buildAgentContextCacheStore({ agent_context_cache_contract: GOOD_CONTRACT });
  const txt = renderAgentContextCacheStore(s);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('AGENT CONTEXT CACHE STORE V131.1'), 'render title');
  assert(txt.includes('CACHE_STORE_READY'), 'status in output');
  assert(txt.includes('stable_promoted:'), 'invariant in output');
}

console.log('--- render blocked ---');
{
  const s = buildAgentContextCacheStore({});
  const txt = renderAgentContextCacheStore(s);
  assert(txt.includes('CACHE STORE BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(CACHE_STORE_STATUSES.includes('CACHE_STORE_READY'), 'ready in statuses');
  assert(CACHE_STORE_STATUSES.includes('CACHE_STORE_BLOCKED_CONTRACT'), 'blocked in statuses');
  assert(CACHE_STORE_STATUSES.includes('CACHE_STORE_MISS'), 'miss in statuses');
  assert(CACHE_STORE_STATUSES.includes('CACHE_STORE_HIT'), 'hit in statuses');
  assert(CACHE_STORE_STATUSES.includes('CACHE_STORE_STALE'), 'stale in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
