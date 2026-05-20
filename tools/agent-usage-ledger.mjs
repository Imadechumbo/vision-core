#!/usr/bin/env node
/**
 * Agent Usage Ledger — V137.0
 *
 * Append-only ledger with hash chain and tamper detection.
 * Does NOT execute real API calls or deployments.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v137.0';

export const AGENT_USAGE_EVENT_TYPES = [
  'AGENT_ROUTE_SELECTED',
  'TOKEN_BUDGET_EVALUATED',
  'COST_ESTIMATED',
  'COST_GATE_ALLOWED',
  'COST_GATE_BLOCKED',
  'CACHE_HIT_RECORDED',
  'CACHE_MISS_RECORDED',
  'FALLBACK_SELECTED',
  'PEAK_EXECUTION_BLOCKED',
];

const LEDGER_STATUSES = [
  'LEDGER_EMPTY',
  'LEDGER_ACTIVE',
  'LEDGER_SEALED',
  'LEDGER_TAMPERED',
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

function _entryHash(prev_hash, event_type, payload, timestamp) {
  const data = JSON.stringify({ prev_hash, event_type, payload, timestamp });
  return _sha256(data);
}

export function createAgentUsageLedger(mission_id) {
  if (!mission_id || String(mission_id).trim() === '') {
    return null;
  }
  return {
    schema_version: SCHEMA_VERSION,
    mission_id,
    ledger_status:  'LEDGER_EMPTY',
    entries:        [],
    entry_count:    0,
    head_hash:      _sha256(`genesis:${mission_id}`),
    sealed:         false,
    ..._locked(),
  };
}

export function appendAgentUsageEvent(ledger, event_type, payload = {}) {
  if (!ledger || typeof ledger !== 'object') return null;
  if (ledger.sealed) {
    return { ...ledger, append_error: 'Ledger is sealed. No new entries allowed.' };
  }
  if (!AGENT_USAGE_EVENT_TYPES.includes(event_type)) {
    return { ...ledger, append_error: `Unknown event_type: ${event_type}` };
  }

  const timestamp   = payload.timestamp ?? new Date().toISOString();
  const prev_hash   = ledger.head_hash;
  const entry_hash  = _entryHash(prev_hash, event_type, payload, timestamp);

  const entry = {
    entry_index:  ledger.entry_count,
    event_type,
    payload,
    timestamp,
    prev_hash,
    entry_hash,
  };

  const newEntries = [...ledger.entries, entry];

  return {
    ...ledger,
    ledger_status: 'LEDGER_ACTIVE',
    entries:       newEntries,
    entry_count:   newEntries.length,
    head_hash:     entry_hash,
    append_error:  undefined,
    ..._locked(),
  };
}

export function sealAgentUsageLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') return null;
  return {
    ...ledger,
    sealed:        true,
    ledger_status: 'LEDGER_SEALED',
    ..._locked(),
  };
}

export function verifyAgentUsageLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, tampered: true, error: 'Ledger is null or not an object.' };
  }
  if (!ledger.entries || !Array.isArray(ledger.entries)) {
    return { valid: false, tampered: true, error: 'entries is not an array.' };
  }

  const mission_id = ledger.mission_id;
  let expected_prev = _sha256(`genesis:${mission_id}`);

  for (let i = 0; i < ledger.entries.length; i++) {
    const entry = ledger.entries[i];
    if (entry.prev_hash !== expected_prev) {
      return {
        valid: false,
        tampered: true,
        error: `Hash chain broken at entry ${i}. Expected prev_hash ${expected_prev}, got ${entry.prev_hash}.`,
      };
    }
    const computed = _entryHash(entry.prev_hash, entry.event_type, entry.payload, entry.timestamp);
    if (computed !== entry.entry_hash) {
      return {
        valid: false,
        tampered: true,
        error: `Entry hash mismatch at index ${i}. Ledger may be tampered.`,
      };
    }
    expected_prev = entry.entry_hash;
  }

  if (ledger.head_hash !== expected_prev) {
    return {
      valid: false,
      tampered: true,
      error: `head_hash mismatch. Expected ${expected_prev}, got ${ledger.head_hash}.`,
    };
  }

  return { valid: true, tampered: false, error: null };
}

export function renderAgentUsageLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return '[AGENT_USAGE_LEDGER] No ledger to render.';
  }
  const lines = [
    `=== Agent Usage Ledger [${SCHEMA_VERSION}] ===`,
    `Ledger status:  ${ledger.ledger_status ?? 'N/A'}`,
    `Mission:        ${ledger.mission_id ?? 'N/A'}`,
    `Entry count:    ${ledger.entry_count ?? 0}`,
    `Head hash:      ${ledger.head_hash ? ledger.head_hash.slice(0, 16) + '…' : 'N/A'}`,
    `Sealed:         ${ledger.sealed}`,
  ];
  for (const entry of (ledger.entries ?? [])) {
    lines.push(`  [${entry.entry_index}] ${entry.event_type} @ ${entry.timestamp}`);
  }
  lines.push(`--- REGRA ABSOLUTA ---`);
  lines.push(`stable_promoted=false | deploy_performed=false | release_performed=false`);
  return lines.join('\n');
}
