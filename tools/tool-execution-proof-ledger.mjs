#!/usr/bin/env node
/**
 * Tool Execution Proof Ledger — V147.1
 *
 * Append-only ledger recording tool executions, exit codes, outputs, hashes.
 * Hash-chained for tamper detection.
 * No real command execution happens here — records are passed in.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v147.1';

export const PROOF_LEDGER_STATUSES = [
  'PROOF_LEDGER_EMPTY',
  'PROOF_LEDGER_READY',
  'PROOF_LEDGER_TAMPERED',
  'PROOF_LEDGER_SEALED',
];

export const PROOF_EVENT_TYPES = [
  'COMMAND_EXECUTED',
  'COMMAND_FAILED',
  'TEST_EXECUTED',
  'TEST_PASSED',
  'TEST_FAILED',
  'GIT_STATUS_CAPTURED',
  'GIT_DIFF_CAPTURED',
  'FILESYSTEM_CHECK_CAPTURED',
  'CLAIM_VERIFIED',
  'CLAIM_BLOCKED',
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

export function createProofLedger(params) {
  const {
    ledger_id,
    mission_id  = null,
    created_at,
  } = params || {};

  if (!ledger_id || String(ledger_id).trim() === '') {
    return {
      ledger_id:      null,
      schema_version: SCHEMA_VERSION,
      ledger_status:  'PROOF_LEDGER_EMPTY',
      valid:          false,
      blocked_reason: 'ledger_id is required.',
      entries:        [],
      entry_count:    0,
      genesis_hash:   null,
      head_hash:      null,
      sealed:         false,
      ..._locked(),
    };
  }

  const genesis_hash = _sha256(`genesis:${ledger_id}:${mission_id ?? ''}`);

  return {
    ledger_id,
    schema_version: SCHEMA_VERSION,
    ledger_status:  'PROOF_LEDGER_EMPTY',
    valid:          true,
    mission_id,
    entries:        [],
    entry_count:    0,
    genesis_hash,
    head_hash:      genesis_hash,
    sealed:         false,
    created_at:     created_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function appendProofEntry(ledger, entry) {
  if (!ledger || typeof ledger !== 'object' || !ledger.valid || ledger.sealed) {
    return ledger;
  }

  const {
    event_type,
    command          = null,
    exit_code        = null,
    output_hash      = null,
    stderr_hash      = null,
    started_at       = null,
    completed_at     = null,
    working_directory = null,
    proof_id,
  } = entry || {};

  if (!event_type || !PROOF_EVENT_TYPES.includes(event_type)) {
    return ledger;
  }

  if (!proof_id || String(proof_id).trim() === '') {
    return ledger;
  }

  const prev_hash  = ledger.head_hash;
  const timestamp  = completed_at ?? new Date().toISOString();
  const entry_hash = _sha256(
    `${prev_hash}|${event_type}|${JSON.stringify({ command, exit_code, output_hash })}|${timestamp}`
  );

  const newEntry = {
    proof_id,
    event_type,
    command,
    exit_code,
    output_hash,
    stderr_hash,
    started_at,
    completed_at: timestamp,
    working_directory,
    previous_hash: prev_hash,
    entry_hash,
  };

  const newEntries = [...ledger.entries, newEntry];

  return {
    ...ledger,
    entries:      newEntries,
    entry_count:  newEntries.length,
    head_hash:    entry_hash,
    ledger_status: 'PROOF_LEDGER_READY',
    ..._locked(),
  };
}

export function sealProofLedger(ledger) {
  if (!ledger || typeof ledger !== 'object' || !ledger.valid) {
    return ledger;
  }
  return {
    ...ledger,
    sealed:        true,
    ledger_status: 'PROOF_LEDGER_SEALED',
    sealed_at:     new Date().toISOString(),
    ..._locked(),
  };
}

export function verifyProofLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, tampered: true, errors: ['ledger is null or not an object'] };
  }

  if (!ledger.valid || !ledger.ledger_id) {
    return { valid: false, tampered: false, errors: ['ledger not initialized'] };
  }

  const expectedGenesis = _sha256(`genesis:${ledger.ledger_id}:${ledger.mission_id ?? ''}`);
  if (ledger.genesis_hash !== expectedGenesis) {
    return { valid: false, tampered: true, errors: ['genesis_hash mismatch'] };
  }

  const entries = ledger.entries || [];
  let prevHash = ledger.genesis_hash;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const expectedHash = _sha256(
      `${e.previous_hash}|${e.event_type}|${JSON.stringify({ command: e.command, exit_code: e.exit_code, output_hash: e.output_hash })}|${e.completed_at}`
    );
    if (e.entry_hash !== expectedHash) {
      return {
        valid: false, tampered: true,
        errors: [`entry ${i} hash mismatch: expected=${expectedHash}, got=${e.entry_hash}`],
      };
    }
    if (e.previous_hash !== prevHash) {
      return {
        valid: false, tampered: true,
        errors: [`entry ${i} previous_hash mismatch`],
      };
    }
    prevHash = e.entry_hash;
  }

  if (ledger.head_hash !== prevHash) {
    return { valid: false, tampered: true, errors: ['head_hash does not match last entry'] };
  }

  return { valid: true, tampered: false, errors: [] };
}

export function validateProofLedger(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'ledger_id', 'schema_version', 'ledger_status',
    'entries', 'entry_count', 'genesis_hash',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!PROOF_LEDGER_STATUSES.includes(result.ledger_status)) {
    errors.push(`invalid ledger_status: ${result.ledger_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderProofLedger(result) {
  if (!result || typeof result !== 'object') {
    return '[TOOL_EXECUTION_PROOF_LEDGER] No result to render.';
  }
  const lines = [
    `=== Tool Execution Proof Ledger [${SCHEMA_VERSION}] ===`,
    `Status:        ${result.ledger_status ?? 'N/A'}`,
    `Ledger ID:     ${result.ledger_id ?? 'N/A'}`,
    `Mission:       ${result.mission_id ?? 'N/A'}`,
    `Entry count:   ${result.entry_count ?? 0}`,
    `Sealed:        ${result.sealed ?? false}`,
    `Head hash:     ${result.head_hash ? result.head_hash.substring(0, 16) + '...' : 'N/A'}`,
  ];
  const entries = result.entries ?? [];
  if (entries.length > 0) {
    lines.push(`--- Entries ---`);
    for (const e of entries) {
      lines.push(`  [${e.event_type}] exit=${e.exit_code ?? 'N/A'} cmd=${e.command ?? 'N/A'} hash=${e.entry_hash ? e.entry_hash.substring(0, 12) + '...' : 'N/A'}`);
    }
  }
  lines.push(`--- REGRA ABSOLUTA ---`);
  lines.push(`stable_promoted=false | deploy_performed=false | release_performed=false`);
  return lines.join('\n');
}
