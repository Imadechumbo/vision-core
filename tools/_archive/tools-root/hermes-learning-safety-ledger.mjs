#!/usr/bin/env node
/**
 * Hermes Learning Safety Ledger — V144.1
 *
 * Append-only hash-chain ledger for learning safety events.
 * Records: learning_allowed, diagnostic_only, unsafe_learning_blocked,
 * evidence_reuse_allowed, evidence_reuse_blocked, prompt_compression_allowed,
 * expensive_analysis_skipped, expensive_analysis_blocked, pattern_recorded.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v144.1';

export const LEARNING_SAFETY_EVENT_TYPES = [
  'LEARNING_ALLOWED',
  'DIAGNOSTIC_ONLY',
  'UNSAFE_LEARNING_BLOCKED',
  'EVIDENCE_REUSE_ALLOWED',
  'EVIDENCE_REUSE_BLOCKED',
  'PROMPT_COMPRESSION_ALLOWED',
  'EXPENSIVE_ANALYSIS_SKIPPED',
  'EXPENSIVE_ANALYSIS_BLOCKED',
  'PATTERN_RECORDED',
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

export function createLearningSafetyLedger(mission_id) {
  if (!mission_id || String(mission_id).trim() === '') {
    throw new Error('mission_id is required to create a learning safety ledger.');
  }
  const genesis_hash = _sha256(`genesis:${mission_id}`);
  return {
    ledger_id:    _sha256(`ledger:${mission_id}`),
    schema_version: SCHEMA_VERSION,
    mission_id,
    genesis_hash,
    entries:      [],
    sealed:       false,
    entry_count:  0,
    ..._locked(),
  };
}

export function appendLearningSafetyEvent(ledger, event_type, payload = {}) {
  if (!ledger || typeof ledger !== 'object') {
    throw new Error('ledger must be an object.');
  }
  if (ledger.sealed) {
    throw new Error('Cannot append to a sealed ledger.');
  }
  if (!LEARNING_SAFETY_EVENT_TYPES.includes(event_type)) {
    throw new Error(`Invalid event_type: ${event_type}`);
  }
  const prev_hash = ledger.entries.length > 0
    ? ledger.entries[ledger.entries.length - 1].entry_hash
    : ledger.genesis_hash;

  const timestamp    = new Date().toISOString();
  const payloadStr   = JSON.stringify(payload);
  const entry_hash   = _sha256(`${prev_hash}|${event_type}|${payloadStr}|${timestamp}`);

  ledger.entries.push({ event_type, payload, timestamp, prev_hash, entry_hash });
  ledger.entry_count = ledger.entries.length;
  return ledger;
}

export function sealLearningSafetyLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    throw new Error('ledger must be an object.');
  }
  const final_hash = ledger.entries.length > 0
    ? ledger.entries[ledger.entries.length - 1].entry_hash
    : ledger.genesis_hash;
  ledger.sealed      = true;
  ledger.final_hash  = final_hash;
  ledger.sealed_at   = new Date().toISOString();
  return ledger;
}

export function verifyLearningSafetyLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, tampered: true, errors: ['ledger is not an object'] };
  }
  const errors = [];
  let prev_hash = ledger.genesis_hash;
  for (let i = 0; i < ledger.entries.length; i++) {
    const e = ledger.entries[i];
    if (e.prev_hash !== prev_hash) {
      errors.push(`Entry ${i}: prev_hash mismatch`);
    }
    const expected = _sha256(`${e.prev_hash}|${e.event_type}|${JSON.stringify(e.payload)}|${e.timestamp}`);
    if (e.entry_hash !== expected) {
      errors.push(`Entry ${i}: entry_hash tampered`);
    }
    prev_hash = e.entry_hash;
  }
  return { valid: errors.length === 0, tampered: errors.length > 0, errors };
}

export function renderLearningSafetyLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return '[HERMES_LEARNING_SAFETY_LEDGER] No ledger to render.';
  }
  const lines = [
    `=== Hermes Learning Safety Ledger [${SCHEMA_VERSION}] ===`,
    `Mission:    ${ledger.mission_id ?? 'N/A'}`,
    `Entries:    ${ledger.entry_count ?? 0}`,
    `Sealed:     ${ledger.sealed}`,
    `Final hash: ${ledger.final_hash ? ledger.final_hash.slice(0, 16) + '...' : 'N/A'}`,
  ];
  for (const e of (ledger.entries ?? [])) {
    lines.push(`  [${e.event_type}] ${e.timestamp}`);
  }
  lines.push(`--- REGRA ABSOLUTA ---`);
  lines.push(`stable_promoted=false | deploy_performed=false | release_performed=false`);
  return lines.join('\n');
}
