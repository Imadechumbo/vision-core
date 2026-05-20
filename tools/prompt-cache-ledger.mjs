#!/usr/bin/env node
/**
 * Prompt Cache Ledger — V132.0
 *
 * Append-only hash-chain ledger recording prompt cache events.
 * Does NOT execute real API calls.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v132.0';

export const PROMPT_CACHE_EVENT_TYPES = [
  'CACHE_CONTRACT_CREATED',
  'CACHE_STORE_INITIALIZED',
  'CACHE_WRITE_ATTEMPTED',
  'CACHE_WRITE_SUCCESS',
  'CACHE_WRITE_FAILED',
  'CACHE_READ_ATTEMPTED',
  'CACHE_HIT',
  'CACHE_MISS',
  'CACHE_STALE',
  'CACHE_INVALIDATED',
  'CACHE_EVICTED',
];

export const LEDGER_STATUSES = [
  'LEDGER_EMPTY',
  'LEDGER_ACTIVE',
  'LEDGER_SEALED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:   false,
    deploy_performed:  false,
    release_performed: false,
  };
}

function _eventId(type, entry_key, ts, prev_hash) {
  return _sha256([type, entry_key || '', String(ts), prev_hash].join('|'));
}

function _chainHash(prev_hash, event_id, type) {
  return _sha256([prev_hash, event_id, type].join('|'));
}

export function buildPromptCacheLedger(params) {
  const { mission_id, contract_id, store_id } = params || {};

  const ledger_id = _sha256([mission_id || '', contract_id || '', store_id || '', 'pcl-v132.0'].join('|'));

  return {
    schema_version:   SCHEMA_VERSION,
    ledger_id,
    ledger_status:    'LEDGER_EMPTY',
    mission_id:       mission_id || null,
    contract_id:      contract_id || null,
    store_id:         store_id || null,
    events:           [],
    event_count:      0,
    head_hash:        null,
    hit_count:        0,
    miss_count:       0,
    write_count:      0,
    stale_count:      0,
    created_at:       Date.now(),
    ..._locked(),
  };
}

export function appendPromptCacheLedgerEvent(ledger, event_type, event_data) {
  if (!ledger || typeof ledger !== 'object') {
    return { success: false, reason: 'ledger is null/undefined', ..._locked() };
  }
  if (ledger.ledger_status === 'LEDGER_SEALED') {
    return { success: false, reason: 'ledger is sealed', ..._locked() };
  }
  if (!PROMPT_CACHE_EVENT_TYPES.includes(event_type)) {
    return { success: false, reason: `unknown event_type: ${event_type}`, ..._locked() };
  }

  const ts        = Date.now();
  const prev_hash = ledger.head_hash || 'GENESIS';
  const entry_key = event_data?.entry_key || null;
  const event_id  = _eventId(event_type, entry_key, ts, prev_hash);
  const chain_hash = _chainHash(prev_hash, event_id, event_type);

  const event = {
    event_id,
    event_type,
    entry_key,
    event_data:  event_data || {},
    ts,
    prev_hash,
    chain_hash,
    ..._locked(),
  };

  const updated_events = [...ledger.events, event];
  const hit_count   = ledger.hit_count   + (event_type === 'CACHE_HIT'          ? 1 : 0);
  const miss_count  = ledger.miss_count  + (event_type === 'CACHE_MISS'         ? 1 : 0);
  const write_count = ledger.write_count + (event_type === 'CACHE_WRITE_SUCCESS' ? 1 : 0);
  const stale_count = ledger.stale_count + (event_type === 'CACHE_STALE'        ? 1 : 0);

  const updated_ledger = {
    ...ledger,
    ledger_status: 'LEDGER_ACTIVE',
    events:        updated_events,
    event_count:   updated_events.length,
    head_hash:     chain_hash,
    hit_count,
    miss_count,
    write_count,
    stale_count,
    ..._locked(),
  };

  return {
    success:        true,
    event_id,
    event_type,
    chain_hash,
    event_count:    updated_events.length,
    ledger:         updated_ledger,
    ..._locked(),
  };
}

export function sealPromptCacheLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { success: false, reason: 'ledger is null/undefined', ..._locked() };
  }
  if (ledger.ledger_status === 'LEDGER_SEALED') {
    return { success: false, reason: 'already sealed', ..._locked() };
  }

  const seal_hash = _sha256([ledger.head_hash || 'GENESIS', ledger.event_count, 'seal-v132.0'].join('|'));

  return {
    success:   true,
    ledger: {
      ...ledger,
      ledger_status: 'LEDGER_SEALED',
      seal_hash,
      sealed_at:     Date.now(),
      ..._locked(),
    },
    seal_hash,
    ..._locked(),
  };
}

export function validatePromptCacheLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, errors: ['ledger is null/undefined'] };
  }

  const errors = [];

  if (!LEDGER_STATUSES.includes(ledger.ledger_status)) {
    errors.push(`invalid ledger_status: ${ledger.ledger_status}`);
  }
  if (ledger.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (!Array.isArray(ledger.events)) errors.push('events must be array');
  if (ledger.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (ledger.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (ledger.release_performed !== false) errors.push('release_performed must be false');

  if (Array.isArray(ledger.events) && ledger.events.length > 0) {
    let prev_hash = 'GENESIS';
    for (let i = 0; i < ledger.events.length; i++) {
      const ev = ledger.events[i];
      if (ev.prev_hash !== prev_hash) {
        errors.push(`chain broken at event index ${i}: prev_hash mismatch`);
        break;
      }
      prev_hash = ev.chain_hash;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function renderPromptCacheLedger(ledger) {
  if (!ledger) return '[PROMPT CACHE LEDGER] null';

  const lines = [
    `=== PROMPT CACHE LEDGER V132.0 ===`,
    `Schema:        ${ledger.schema_version}`,
    `Ledger ID:     ${ledger.ledger_id}`,
    `Status:        ${ledger.ledger_status}`,
    `Mission ID:    ${ledger.mission_id || 'not set'}`,
    `Contract ID:   ${ledger.contract_id || 'not set'}`,
    `Store ID:      ${ledger.store_id || 'not set'}`,
    `Events:        ${ledger.event_count}`,
    `Head Hash:     ${ledger.head_hash || 'GENESIS'}`,
    `Hits:          ${ledger.hit_count}`,
    `Misses:        ${ledger.miss_count}`,
    `Writes:        ${ledger.write_count}`,
    `Stale:         ${ledger.stale_count}`,
    ``,
    `stable_promoted:   ${ledger.stable_promoted}`,
    `deploy_performed:  ${ledger.deploy_performed}`,
    `release_performed: ${ledger.release_performed}`,
  ];

  if (ledger.ledger_status === 'LEDGER_SEALED') {
    lines.push(`Seal Hash:     ${ledger.seal_hash}`);
  }

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('prompt-cache-ledger.mjs')) {
  const isJson = process.argv.includes('--json');

  let ledger = buildPromptCacheLedger({
    mission_id:  'mission-v132-cli',
    contract_id: 'contract-mock-001',
    store_id:    'store-mock-001',
  });

  let r = appendPromptCacheLedgerEvent(ledger, 'CACHE_STORE_INITIALIZED', { note: 'cli demo' });
  ledger = r.ledger;
  r = appendPromptCacheLedgerEvent(ledger, 'CACHE_WRITE_SUCCESS', { entry_key: 'k1' });
  ledger = r.ledger;
  r = appendPromptCacheLedgerEvent(ledger, 'CACHE_HIT', { entry_key: 'k1' });
  ledger = r.ledger;

  if (isJson) {
    console.log(JSON.stringify(ledger, null, 2));
  } else {
    console.log(renderPromptCacheLedger(ledger));
  }
}
