#!/usr/bin/env node
/**
 * Controlled Runtime Execution Ledger — V155.0
 *
 * Append-only, hash-chained ledger for controlled runtime execution events.
 *
 * Event types (10):
 *   COMMAND_RECEIVED        — human command accepted for processing
 *   TRUTH_VERIFIED          — anti-hallucination truth check passed
 *   PASS_GOLD_CONFIRMED     — PASS GOLD evidence confirmed
 *   ROLLBACK_BOUND          — rollback plan binding verified
 *   SNAPSHOT_CAPTURED       — pre-execution snapshot captured
 *   DRY_RUN_COMPLETED       — controlled dry-run completed
 *   PLAN_SEALED             — execution plan sealed
 *   PROOF_RECEIPT_ISSUED    — execution proof receipt issued
 *   EVIDENCE_PACKAGE_SEALED — all artifacts assembled
 *   LEDGER_CLOSED           — ledger sealed, no further events
 *
 * REGRA ABSOLUTA: execution_performed=false, stable_promoted=false,
 * deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v155.0';

export const CONTROLLED_EXECUTION_LEDGER_EVENT_TYPES = [
  'COMMAND_RECEIVED',
  'TRUTH_VERIFIED',
  'PASS_GOLD_CONFIRMED',
  'ROLLBACK_BOUND',
  'SNAPSHOT_CAPTURED',
  'DRY_RUN_COMPLETED',
  'PLAN_SEALED',
  'PROOF_RECEIPT_ISSUED',
  'EVIDENCE_PACKAGE_SEALED',
  'LEDGER_CLOSED',
];

export const CONTROLLED_EXECUTION_LEDGER_STATUSES = [
  'LEDGER_BLOCKED_INPUT',
  'LEDGER_OPEN',
  'LEDGER_CLOSED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    execution_performed: false,
    stable_promoted:     false,
    deploy_performed:    false,
    release_performed:   false,
  };
}

export function buildControlledRuntimeExecutionLedger(params) {
  const {
    ledger_id,
    events,
    closed,
    created_at,
  } = params || {};

  const ts = created_at ?? new Date().toISOString();

  if (!ledger_id || String(ledger_id).trim() === '') {
    return {
      schema_version:                    SCHEMA_VERSION,
      ledger_status:                     'LEDGER_BLOCKED_INPUT',
      blocked_reason:                    'ledger_id is required.',
      ledger_id:                         null,
      ledger_id_hash:                    _sha256(''),
      event_count:                       0,
      events:                            [],
      chain_head:                        null,
      ledger_closed:                     false,
      created_at:                        ts,
      ..._locked(),
    };
  }

  const safeEvents = Array.isArray(events) ? events : [];
  const validatedEvents = [];
  let prev_hash = _sha256(ledger_id);

  for (const ev of safeEvents) {
    if (!ev || !ev.event_type || !CONTROLLED_EXECUTION_LEDGER_EVENT_TYPES.includes(ev.event_type)) {
      continue;
    }
    const event_hash = _sha256([prev_hash, ev.event_type, ev.event_id ?? '', ev.occurred_at ?? ''].join('|'));
    validatedEvents.push({
      event_type:   ev.event_type,
      event_id:     ev.event_id ?? null,
      occurred_at:  ev.occurred_at ?? ts,
      payload:      ev.payload ?? null,
      prev_hash,
      event_hash,
    });
    prev_hash = event_hash;
  }

  const isClosed = closed === true || validatedEvents.some(e => e.event_type === 'LEDGER_CLOSED');
  const chain_head = validatedEvents.length > 0
    ? validatedEvents[validatedEvents.length - 1].event_hash
    : _sha256(ledger_id);

  return {
    schema_version:   SCHEMA_VERSION,
    ledger_status:    isClosed ? 'LEDGER_CLOSED' : 'LEDGER_OPEN',
    ledger_id,
    ledger_id_hash:   _sha256(ledger_id),
    event_count:      validatedEvents.length,
    events:           validatedEvents,
    chain_head,
    ledger_closed:    isClosed,
    created_at:       ts,
    ..._locked(),
  };
}

export function appendControlledRuntimeLedgerEvent(ledger, event) {
  if (!ledger || typeof ledger !== 'object') {
    return { appended: false, error: 'ledger is null or not an object' };
  }
  if (ledger.ledger_closed) {
    return { appended: false, error: 'ledger is closed; no further events allowed' };
  }
  if (!event || !event.event_type || !CONTROLLED_EXECUTION_LEDGER_EVENT_TYPES.includes(event.event_type)) {
    return { appended: false, error: `invalid event_type: ${event?.event_type}` };
  }
  const prev_hash = ledger.chain_head ?? _sha256(ledger.ledger_id ?? '');
  const ts = event.occurred_at ?? new Date().toISOString();
  const event_hash = _sha256([prev_hash, event.event_type, event.event_id ?? '', ts].join('|'));
  const newEvent = {
    event_type:  event.event_type,
    event_id:    event.event_id ?? null,
    occurred_at: ts,
    payload:     event.payload ?? null,
    prev_hash,
    event_hash,
  };
  const newEvents = [...(ledger.events ?? []), newEvent];
  const isClosed = event.event_type === 'LEDGER_CLOSED';
  return {
    appended: true,
    ledger: {
      ...ledger,
      event_count:  newEvents.length,
      events:       newEvents,
      chain_head:   event_hash,
      ledger_status: isClosed ? 'LEDGER_CLOSED' : 'LEDGER_OPEN',
      ledger_closed: isClosed,
      ..._locked(),
    },
  };
}

export function validateControlledRuntimeExecutionLedger(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'ledger_status', 'event_count', 'events',
    'chain_head', 'ledger_closed', 'created_at',
    'execution_performed', 'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted     !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed    !== false) errors.push('deploy_performed must be false');
  if (result.release_performed   !== false) errors.push('release_performed must be false');
  if (!CONTROLLED_EXECUTION_LEDGER_STATUSES.includes(result.ledger_status)) {
    errors.push(`invalid ledger_status: ${result.ledger_status}`);
  }
  if (!Array.isArray(result.events)) {
    errors.push('events must be an array');
  } else if (result.event_count !== result.events.length) {
    errors.push(`event_count mismatch: ${result.event_count} vs ${result.events.length}`);
  }
  if (result.ledger_status === 'LEDGER_CLOSED' && result.ledger_closed !== true) {
    errors.push('LEDGER_CLOSED status requires ledger_closed=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledRuntimeExecutionLedger(result) {
  if (!result || typeof result !== 'object') {
    return '[CONTROLLED_RUNTIME_EXECUTION_LEDGER] No result to render.';
  }
  const lines = [
    `=== Controlled Runtime Execution Ledger [${SCHEMA_VERSION}] ===`,
    `Status:        ${result.ledger_status ?? 'N/A'}`,
    `Ledger ID:     ${result.ledger_id ?? 'N/A'}`,
    `Event count:   ${result.event_count ?? 0}`,
    `Chain head:    ${result.chain_head ?? 'N/A'}`,
    `Closed:        ${result.ledger_closed}`,
    `--- Events ---`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason: ${result.blocked_reason}`);
  for (const ev of (result.events ?? [])) {
    lines.push(`  [${ev.event_type}] id=${ev.event_id ?? 'N/A'} at=${ev.occurred_at}`);
  }
  lines.push(`--- REGRA ABSOLUTA ---`);
  lines.push(`execution_performed=false | stable_promoted=false | deploy_performed=false | release_performed=false`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-runtime-execution-ledger.mjs')) {
  const showJson = process.argv.includes('--json');
  let result = buildControlledRuntimeExecutionLedger({ ledger_id: 'v155.0-ledger' });
  const append1 = appendControlledRuntimeLedgerEvent(result, { event_type: 'COMMAND_RECEIVED', event_id: 'ev-1' });
  if (append1.appended) result = append1.ledger;
  const append2 = appendControlledRuntimeLedgerEvent(result, { event_type: 'TRUTH_VERIFIED', event_id: 'ev-2' });
  if (append2.appended) result = append2.ledger;
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledRuntimeExecutionLedger(result));
  }
  const v = validateControlledRuntimeExecutionLedger(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
