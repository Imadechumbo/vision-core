#!/usr/bin/env node
/**
 * Local Execution Ledger — V163.0
 * Append-only ledger with hash-chain for drill/proof/receipt events. No production.
 */

import { createHash } from 'crypto';

export const LOCAL_EXECUTION_LEDGER_STATUSES = [
  'LOCAL_EXECUTION_LEDGER_EMPTY',
  'LOCAL_EXECUTION_LEDGER_READY',
  'LOCAL_EXECUTION_LEDGER_TAMPERED',
  'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT',
];

export const LOCAL_EXECUTION_LEDGER_EVENTS = [
  'LOCAL_DRILL_READY',
  'LOCAL_EXECUTION_PROOF_CAPTURED',
  'LOCAL_EXECUTION_RECEIPT_READY',
  'LOCAL_EXECUTION_BLOCKED',
  'LOCAL_ROLLBACK_REQUIRED',
  'LOCAL_ROLLBACK_READY',
  'LOCAL_ROLLBACK_COMPLETED',
];

const BLOCKED_EVENTS = [
  'DEPLOY',
  'STABLE_PROMOTE',
  'RELEASE',
  'PRODUCTION',
  'TAG_CREATE',
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function computeEntryHash(entry, previousHash) {
  return sha256(`${previousHash}:${entry.event}:${entry.event_id}:${entry.timestamp}`);
}

function computeLedgerHash(entries) {
  return sha256(entries.map(e => e.entry_hash).join(':'));
}

export function buildLocalExecutionLedger(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v163.0',
      ledger_status: 'LOCAL_EXECUTION_LEDGER_EMPTY',
      ledger_id: null,
      entry_count: 0,
      entries: [],
      ledger_hash: null,
      ledger_ready: false,
      tamper_detected: false,
      local_only: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    };
  }

  const { ledger_id } = input;

  if (!ledger_id || typeof ledger_id !== 'string' || !ledger_id.trim()) {
    return {
      schema_version: 'v163.0',
      ledger_status: 'LOCAL_EXECUTION_LEDGER_EMPTY',
      ledger_id: null,
      entry_count: 0,
      entries: [],
      ledger_hash: null,
      ledger_ready: false,
      tamper_detected: false,
      local_only: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    };
  }

  return {
    schema_version: 'v163.0',
    ledger_status: 'LOCAL_EXECUTION_LEDGER_EMPTY',
    ledger_id,
    entry_count: 0,
    entries: [],
    previous_hash: sha256('GENESIS'),
    ledger_hash: null,
    ledger_ready: false,
    tamper_detected: false,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
  };
}

export function appendLocalExecutionLedgerEvent(ledger, eventInput) {
  if (!ledger || typeof ledger !== 'object' || !ledger.ledger_id) {
    return {
      ...(ledger || {}),
      ledger_status: 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT',
      blocked_reason: 'invalid ledger',
      local_only: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    };
  }

  if (!eventInput || typeof eventInput !== 'object') {
    return {
      ...ledger,
      ledger_status: 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT',
      blocked_reason: 'invalid event input',
    };
  }

  const { event, event_id, payload } = eventInput;

  if (!event || typeof event !== 'string') {
    return {
      ...ledger,
      ledger_status: 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT',
      blocked_reason: 'event name required',
    };
  }

  const isBlocked = BLOCKED_EVENTS.some(b => event.toUpperCase().includes(b));
  if (isBlocked) {
    return {
      ...ledger,
      ledger_status: 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT',
      blocked_reason: `blocked event type: ${event}`,
    };
  }

  if (!LOCAL_EXECUTION_LEDGER_EVENTS.includes(event)) {
    return {
      ...ledger,
      ledger_status: 'LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT',
      blocked_reason: `unknown event: ${event}`,
    };
  }

  const timestamp = eventInput.timestamp || new Date().toISOString();
  const eid = event_id || sha256(`${event}:${timestamp}:${ledger.entry_count}`);
  const previousHash = ledger.previous_hash || sha256('GENESIS');

  const entry = {
    seq: (ledger.entry_count || 0) + 1,
    event,
    event_id: eid,
    timestamp,
    payload: payload || {},
    previous_hash: previousHash,
  };
  entry.entry_hash = computeEntryHash(entry, previousHash);

  const newEntries = [...(ledger.entries || []), entry];
  const newLedgerHash = computeLedgerHash(newEntries);

  return {
    ...ledger,
    ledger_status: 'LOCAL_EXECUTION_LEDGER_READY',
    entry_count: newEntries.length,
    entries: newEntries,
    previous_hash: entry.entry_hash,
    ledger_hash: newLedgerHash,
    ledger_ready: true,
    tamper_detected: false,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
  };
}

export function validateLocalExecutionLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, errors: ['null or non-object input'] };
  }

  const errors = [];

  if (ledger.production_touched !== false) errors.push('production_touched must be false');
  if (ledger.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (ledger.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (ledger.release_performed !== false) errors.push('release_performed must be false');
  if (ledger.local_only !== true) errors.push('local_only must be true');

  if (ledger.ledger_status === 'LOCAL_EXECUTION_LEDGER_READY') {
    if (!ledger.ledger_id) errors.push('ledger_id required for READY');
    if (!ledger.ledger_hash) errors.push('ledger_hash required for READY');
    if (!ledger.ledger_ready) errors.push('ledger_ready must be true for READY');
    if (ledger.entry_count < 1) errors.push('entry_count must be >= 1 for READY');

    // verify hash chain
    let prevHash = sha256('GENESIS');
    for (const entry of (ledger.entries || [])) {
      const expected = computeEntryHash(entry, prevHash);
      if (expected !== entry.entry_hash) {
        errors.push(`tamper detected at seq ${entry.seq}`);
      }
      prevHash = entry.entry_hash;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function renderLocalExecutionLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return '[LOCAL_EXECUTION_LEDGER] No ledger data';
  }

  const lines = [
    `[LOCAL_EXECUTION_LEDGER] ${ledger.ledger_status || 'UNKNOWN'}`,
    `  schema_version    : ${ledger.schema_version || 'n/a'}`,
    `  ledger_id         : ${ledger.ledger_id || 'null'}`,
    `  entry_count       : ${ledger.entry_count}`,
    `  ledger_hash       : ${ledger.ledger_hash || 'null'}`,
    `  ledger_ready      : ${ledger.ledger_ready}`,
    `  tamper_detected   : ${ledger.tamper_detected}`,
    `  local_only        : ${ledger.local_only}`,
    `  production_touched: ${ledger.production_touched}`,
    `  deploy_performed  : ${ledger.deploy_performed}`,
    `  stable_promoted   : ${ledger.stable_promoted}`,
    `  release_performed : ${ledger.release_performed}`,
  ];

  if (ledger.blocked_reason) {
    lines.push(`  blocked_reason    : ${ledger.blocked_reason}`);
  }

  if (ledger.entries && ledger.entries.length > 0) {
    lines.push('  entries:');
    for (const e of ledger.entries) {
      lines.push(`    [${e.seq}] ${e.event} @ ${e.timestamp}`);
    }
  }

  lines.push('  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.');

  return lines.join('\n');
}

// CLI self-run
if (process.argv[1] && process.argv[1].endsWith('local-execution-ledger.mjs')) {
  const useJson = process.argv.includes('--json');
  let ledger = buildLocalExecutionLedger({ ledger_id: 'ledger-v163-001' });
  ledger = appendLocalExecutionLedgerEvent(ledger, {
    event: 'LOCAL_DRILL_READY',
    event_id: 'evt-001',
    timestamp: '2026-05-21T10:00:00.000Z',
  });
  ledger = appendLocalExecutionLedgerEvent(ledger, {
    event: 'LOCAL_EXECUTION_PROOF_CAPTURED',
    event_id: 'evt-002',
    timestamp: '2026-05-21T10:01:00.000Z',
  });
  if (useJson) {
    console.log(JSON.stringify(ledger, null, 2));
  } else {
    console.log(renderLocalExecutionLedger(ledger));
  }
}
