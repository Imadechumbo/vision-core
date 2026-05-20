#!/usr/bin/env node
/**
 * Agent Context Cache Store — V131.1
 *
 * Logical cache store with hit/miss, TTL, and hash validation.
 * Uses in-memory/deterministic objects only — no real DB.
 * Does NOT execute real API calls.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v131.1';

export const CACHE_STORE_STATUSES = [
  'CACHE_STORE_BLOCKED_CONTRACT',
  'CACHE_STORE_MISS',
  'CACHE_STORE_HIT',
  'CACHE_STORE_STALE',
  'CACHE_STORE_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:  false,
    deploy_performed: false,
    release_performed: false,
  };
}

function _storeId(contract_id) {
  return _sha256([contract_id || '', 'acs-v131.1'].join('|'));
}

export function buildAgentContextCacheStore(params) {
  const { agent_context_cache_contract } = params || {};

  if (!agent_context_cache_contract || agent_context_cache_contract.contract_ready !== true) {
    return {
      schema_version: SCHEMA_VERSION,
      store_status:   'CACHE_STORE_BLOCKED_CONTRACT',
      store_ready:    false,
      blocking_reason: 'agent_context_cache_contract not ready',
      entries:        {},
      ..._locked(),
    };
  }

  const contract = agent_context_cache_contract;
  const store_id = _storeId(contract.contract_id);

  return {
    schema_version:      SCHEMA_VERSION,
    store_id,
    store_status:        'CACHE_STORE_READY',
    store_ready:         true,
    contract_id:         contract.contract_id,
    cache_key:           contract.cache_key,
    cache_hash:          contract.cache_hash,
    ttl_minutes:         contract.ttl_minutes,
    read_allowed:        contract.cache_read_allowed,
    write_allowed:       contract.cache_write_allowed,
    entries:             {},
    ..._locked(),
  };
}

export function writeAgentContextCache(store, entry_key, entry_value, entry_hash) {
  if (!store || store.store_ready !== true) {
    return { success: false, reason: 'store not ready', ..._locked() };
  }
  if (!store.write_allowed) {
    return { success: false, reason: 'write not allowed', ..._locked() };
  }
  if (!entry_key || !entry_hash) {
    return { success: false, reason: 'entry_key and entry_hash required', ..._locked() };
  }

  const computed_hash = _sha256(String(entry_value));
  if (computed_hash !== entry_hash) {
    return { success: false, reason: 'hash mismatch: entry_hash does not match entry_value', ..._locked() };
  }

  const expires_at = Date.now() + store.ttl_minutes * 60 * 1000;

  const updated_entries = {
    ...store.entries,
    [entry_key]: {
      value:      entry_value,
      hash:       entry_hash,
      written_at: Date.now(),
      expires_at,
      stale:      false,
      invalidated: false,
    },
  };

  return {
    success:   true,
    entry_key,
    entry_hash,
    expires_at,
    store_id:  store.store_id,
    entries:   updated_entries,
    ..._locked(),
  };
}

export function readAgentContextCache(store, entry_key, current_hash) {
  if (!store || store.store_ready !== true) {
    return {
      cache_status: 'CACHE_STORE_BLOCKED_CONTRACT',
      cache_hit:    false,
      cache_miss:   true,
      ..._locked(),
    };
  }
  if (!store.read_allowed) {
    return {
      cache_status: 'CACHE_STORE_BLOCKED_CONTRACT',
      cache_hit:    false,
      cache_miss:   true,
      blocking_reason: 'read not allowed',
      ..._locked(),
    };
  }

  const entry = store.entries[entry_key];

  if (!entry) {
    return {
      cache_status: 'CACHE_STORE_MISS',
      cache_hit:    false,
      cache_miss:   true,
      entry_key,
      ..._locked(),
    };
  }

  if (entry.invalidated) {
    return {
      cache_status: 'CACHE_STORE_MISS',
      cache_hit:    false,
      cache_miss:   true,
      entry_key,
      reason: 'entry invalidated',
      ..._locked(),
    };
  }

  const now = Date.now();
  if (entry.expires_at && now > entry.expires_at) {
    return {
      cache_status: 'CACHE_STORE_STALE',
      cache_hit:    false,
      cache_miss:   false,
      stale:        true,
      entry_key,
      ..._locked(),
    };
  }

  if (current_hash && entry.hash !== current_hash) {
    return {
      cache_status: 'CACHE_STORE_MISS',
      cache_hit:    false,
      cache_miss:   true,
      entry_key,
      reason: 'hash mismatch',
      ..._locked(),
    };
  }

  return {
    cache_status: 'CACHE_STORE_HIT',
    cache_hit:    true,
    cache_miss:   false,
    stale:        false,
    entry_key,
    entry_value:  entry.value,
    entry_hash:   entry.hash,
    expires_at:   entry.expires_at,
    ..._locked(),
  };
}

export function validateAgentContextCacheStore(store) {
  if (!store || typeof store !== 'object') {
    return { valid: false, errors: ['store is null/undefined'] };
  }

  const errors = [];

  if (!CACHE_STORE_STATUSES.includes(store.store_status)) {
    errors.push(`invalid store_status: ${store.store_status}`);
  }
  if (store.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (store.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (store.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (store.release_performed !== false) errors.push('release_performed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderAgentContextCacheStore(store) {
  if (!store || !store.store_ready) {
    return `[CACHE STORE BLOCKED] ${store?.store_status || 'unknown'}: ${store?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== AGENT CONTEXT CACHE STORE V131.1 ===`,
    `Schema:          ${store.schema_version}`,
    `Store ID:        ${store.store_id}`,
    `Status:          ${store.store_status}`,
    `Contract ID:     ${store.contract_id}`,
    `Cache Key:       ${store.cache_key}`,
    `Cache Hash:      ${store.cache_hash}`,
    `TTL (minutes):   ${store.ttl_minutes}`,
    `Read Allowed:    ${store.read_allowed}`,
    `Write Allowed:   ${store.write_allowed}`,
    `Entries:         ${Object.keys(store.entries || {}).length}`,
    ``,
    `stable_promoted:   ${store.stable_promoted}`,
    `deploy_performed:  ${store.deploy_performed}`,
    `release_performed: ${store.release_performed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('agent-context-cache-store.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockContract = {
    contract_ready:      true,
    contract_id:         'mock-contract-v131',
    cache_key:           'a'.repeat(64),
    cache_hash:          'b'.repeat(64),
    ttl_minutes:         5,
    cache_read_allowed:  true,
    cache_write_allowed: true,
  };

  const store = buildAgentContextCacheStore({ agent_context_cache_contract: mockContract });

  if (isJson) {
    console.log(JSON.stringify(store, null, 2));
  } else {
    console.log(renderAgentContextCacheStore(store));
  }
}
