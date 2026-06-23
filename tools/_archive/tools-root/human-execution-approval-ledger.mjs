#!/usr/bin/env node
/**
 * Human Execution Approval Ledger — V156.0
 *
 * Records human approval events for controlled execution commands.
 * Append-only hash-chained ledger with tamper detection.
 *
 * Event types (6):
 *   APPROVAL_REQUESTED   — human command received, approval pending
 *   APPROVAL_GRANTED     — human approved the command
 *   APPROVAL_REVOKED     — human revoked a prior approval
 *   APPROVAL_EXPIRED     — approval window elapsed
 *   APPROVAL_TOKEN_SET   — approval token bound (hash only stored)
 *   APPROVAL_SEALED      — ledger sealed; no further approvals
 *
 * Statuses:
 *   APPROVAL_LEDGER_EMPTY    — ledger_id present but no events
 *   APPROVAL_LEDGER_READY    — has APPROVAL_GRANTED with no subsequent REVOKED/EXPIRED
 *   APPROVAL_LEDGER_SEALED   — APPROVAL_SEALED event present
 *   APPROVAL_LEDGER_TAMPERED — chain integrity check failed
 *
 * REGRA ABSOLUTA: execution_performed=false, stable_promoted=false,
 * deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v156.0';

export const APPROVAL_LEDGER_EVENT_TYPES = [
  'APPROVAL_REQUESTED',
  'APPROVAL_GRANTED',
  'APPROVAL_REVOKED',
  'APPROVAL_EXPIRED',
  'APPROVAL_TOKEN_SET',
  'APPROVAL_SEALED',
];

export const APPROVAL_LEDGER_STATUSES = [
  'APPROVAL_LEDGER_BLOCKED_INPUT',
  'APPROVAL_LEDGER_EMPTY',
  'APPROVAL_LEDGER_READY',
  'APPROVAL_LEDGER_SEALED',
  'APPROVAL_LEDGER_TAMPERED',
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

function _computeEventHash(prev_hash, event_type, event_id, occurred_at) {
  return _sha256([prev_hash, event_type, event_id ?? '', occurred_at ?? ''].join('|'));
}

function _verifyChain(events, genesis_hash) {
  let expected = genesis_hash;
  for (const ev of events) {
    if (ev.prev_hash !== expected) return false;
    const computed = _computeEventHash(ev.prev_hash, ev.event_type, ev.event_id, ev.occurred_at);
    if (ev.event_hash !== computed) return false;
    expected = ev.event_hash;
  }
  return true;
}

function _deriveStatus(events) {
  if (events.length === 0) return 'APPROVAL_LEDGER_EMPTY';
  const hasSealed = events.some(e => e.event_type === 'APPROVAL_SEALED');
  if (hasSealed) return 'APPROVAL_LEDGER_SEALED';
  const lastSignificant = [...events].reverse().find(e =>
    ['APPROVAL_GRANTED', 'APPROVAL_REVOKED', 'APPROVAL_EXPIRED'].includes(e.event_type)
  );
  if (lastSignificant && lastSignificant.event_type === 'APPROVAL_GRANTED') {
    return 'APPROVAL_LEDGER_READY';
  }
  return 'APPROVAL_LEDGER_EMPTY';
}

export function buildHumanExecutionApprovalLedger(params) {
  const {
    ledger_id,
    events,
    created_at,
  } = params || {};

  const ts = created_at ?? new Date().toISOString();

  if (!ledger_id || String(ledger_id).trim() === '') {
    return {
      schema_version:          SCHEMA_VERSION,
      approval_ledger_status:  'APPROVAL_LEDGER_BLOCKED_INPUT',
      blocked_reason:          'ledger_id is required.',
      ledger_id:               null,
      ledger_id_hash:          _sha256(''),
      event_count:             0,
      events:                  [],
      chain_head:              null,
      approval_active:         false,
      created_at:              ts,
      ..._locked(),
    };
  }

  const genesis_hash = _sha256(ledger_id);
  const safeEvents = Array.isArray(events) ? events : [];
  const validatedEvents = [];
  let prev_hash = genesis_hash;

  for (const ev of safeEvents) {
    if (!ev || !ev.event_type || !APPROVAL_LEDGER_EVENT_TYPES.includes(ev.event_type)) continue;
    const occurred_at = ev.occurred_at ?? ts;
    const payload = ev.event_type === 'APPROVAL_TOKEN_SET' && ev.approval_token
      ? { approval_token_hash: _sha256(ev.approval_token) }
      : (ev.payload ?? null);
    const event_hash = _computeEventHash(prev_hash, ev.event_type, ev.event_id, occurred_at);
    validatedEvents.push({
      event_type:  ev.event_type,
      event_id:    ev.event_id ?? null,
      occurred_at,
      payload,
      prev_hash,
      event_hash,
    });
    prev_hash = event_hash;
  }

  const chain_head = validatedEvents.length > 0
    ? validatedEvents[validatedEvents.length - 1].event_hash
    : genesis_hash;

  const status = _deriveStatus(validatedEvents);
  const approval_active = status === 'APPROVAL_LEDGER_READY';

  return {
    schema_version:         SCHEMA_VERSION,
    approval_ledger_status: status,
    ledger_id,
    ledger_id_hash:         _sha256(ledger_id),
    event_count:            validatedEvents.length,
    events:                 validatedEvents,
    chain_head,
    approval_active,
    created_at:             ts,
    ..._locked(),
  };
}

export function appendApprovalLedgerEvent(ledger, event) {
  if (!ledger || typeof ledger !== 'object') {
    return { appended: false, error: 'ledger is null or not an object' };
  }
  if (ledger.approval_ledger_status === 'APPROVAL_LEDGER_SEALED') {
    return { appended: false, error: 'ledger is sealed; no further events allowed' };
  }
  if (ledger.approval_ledger_status === 'APPROVAL_LEDGER_BLOCKED_INPUT') {
    return { appended: false, error: 'ledger is blocked; cannot append' };
  }
  if (!event || !event.event_type || !APPROVAL_LEDGER_EVENT_TYPES.includes(event.event_type)) {
    return { appended: false, error: `invalid event_type: ${event?.event_type}` };
  }
  const prev_hash = ledger.chain_head ?? _sha256(ledger.ledger_id ?? '');
  const ts = event.occurred_at ?? new Date().toISOString();
  const payload = event.event_type === 'APPROVAL_TOKEN_SET' && event.approval_token
    ? { approval_token_hash: _sha256(event.approval_token) }
    : (event.payload ?? null);
  const event_hash = _computeEventHash(prev_hash, event.event_type, event.event_id, ts);
  const newEvent = {
    event_type:  event.event_type,
    event_id:    event.event_id ?? null,
    occurred_at: ts,
    payload,
    prev_hash,
    event_hash,
  };
  const newEvents = [...(ledger.events ?? []), newEvent];
  const status = _deriveStatus(newEvents);
  return {
    appended: true,
    ledger: {
      ...ledger,
      event_count:            newEvents.length,
      events:                 newEvents,
      chain_head:             event_hash,
      approval_ledger_status: status,
      approval_active:        status === 'APPROVAL_LEDGER_READY',
      ..._locked(),
    },
  };
}

export function verifyApprovalLedgerChain(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, error: 'ledger is null or not an object' };
  }
  if (!Array.isArray(ledger.events)) {
    return { valid: false, error: 'events must be an array' };
  }
  const genesis_hash = _sha256(ledger.ledger_id ?? '');
  const intact = _verifyChain(ledger.events, genesis_hash);
  return { valid: intact, error: intact ? null : 'chain integrity check failed' };
}

export function validateHumanExecutionApprovalLedger(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'approval_ledger_status', 'event_count', 'events',
    'chain_head', 'approval_active', 'created_at',
    'execution_performed', 'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted     !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed    !== false) errors.push('deploy_performed must be false');
  if (result.release_performed   !== false) errors.push('release_performed must be false');
  if (!APPROVAL_LEDGER_STATUSES.includes(result.approval_ledger_status)) {
    errors.push(`invalid approval_ledger_status: ${result.approval_ledger_status}`);
  }
  if (!Array.isArray(result.events)) {
    errors.push('events must be an array');
  } else if (result.event_count !== result.events.length) {
    errors.push(`event_count mismatch: ${result.event_count} vs ${result.events.length}`);
  }
  if (result.approval_ledger_status === 'APPROVAL_LEDGER_SEALED' && result.approval_active === true) {
    errors.push('SEALED ledger cannot have approval_active=true');
  }
  if (result.approval_ledger_status === 'APPROVAL_LEDGER_READY' && result.approval_active !== true) {
    errors.push('READY ledger must have approval_active=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderHumanExecutionApprovalLedger(result) {
  if (!result || typeof result !== 'object') {
    return '[HUMAN_EXECUTION_APPROVAL_LEDGER] No result to render.';
  }
  const lines = [
    `=== Human Execution Approval Ledger [${SCHEMA_VERSION}] ===`,
    `Status:        ${result.approval_ledger_status ?? 'N/A'}`,
    `Ledger ID:     ${result.ledger_id ?? 'N/A'}`,
    `Event count:   ${result.event_count ?? 0}`,
    `Approval active: ${result.approval_active}`,
    `Chain head:    ${result.chain_head ?? 'N/A'}`,
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

if (process.argv[1] && process.argv[1].endsWith('human-execution-approval-ledger.mjs')) {
  const showJson = process.argv.includes('--json');
  let result = buildHumanExecutionApprovalLedger({ ledger_id: 'v156.0-ledger' });
  const a1 = appendApprovalLedgerEvent(result, { event_type: 'APPROVAL_REQUESTED', event_id: 'ev-1' });
  if (a1.appended) result = a1.ledger;
  const a2 = appendApprovalLedgerEvent(result, { event_type: 'APPROVAL_TOKEN_SET', event_id: 'ev-2', approval_token: 'secret-token' });
  if (a2.appended) result = a2.ledger;
  const a3 = appendApprovalLedgerEvent(result, { event_type: 'APPROVAL_GRANTED', event_id: 'ev-3' });
  if (a3.appended) result = a3.ledger;
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderHumanExecutionApprovalLedger(result));
  }
  const v = validateHumanExecutionApprovalLedger(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
  const chain = verifyApprovalLedgerChain(result);
  if (!chain.valid) {
    process.stderr.write(`Chain verification failed: ${chain.error}\n`);
    process.exit(1);
  }
}
