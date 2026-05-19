#!/usr/bin/env node
/**
 * One Real Tag Post-Verification Ledger — V108.0
 *
 * Append-only ledger for one real tag operation events.
 * Records packet, command export, receipt capture and receipt verification.
 * Does NOT execute anything.
 *
 * REGRA ABSOLUTA: deploy_performed=false, stable_promoted=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v108.0';

export const LEDGER_EVENT_TYPES = [
  'ONE_TAG_EXEC_PACKET_READY',
  'ONE_TAG_COMMAND_EXPORT_READY',
  'ONE_TAG_RECEIPT_DRY_RUN_CAPTURED',
  'ONE_TAG_RECEIPT_REAL_TAG_CAPTURED',
  'ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED',
  'ONE_TAG_RECEIPT_REAL_TAG_CONFIRMED',
  'ONE_TAG_OPERATION_BLOCKED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _eventHash(event_type, event_id, ref_id, prev_hash) {
  return _sha256([event_type, event_id, ref_id, prev_hash].join('|'));
}

function _ledgerId(events) {
  const seed = events.map(e => e.event_hash).join('::');
  return _sha256(seed || 'empty');
}

function _eventId(event_type, ref_id, index) {
  return _sha256([event_type, ref_id, String(index)].join('|'));
}

function _lockedFields() {
  return {
    deploy_performed:  false,
    stable_promoted:   false,
    release_performed: false,
  };
}

function _appendEvent(ledger, event_type, ref_id, ref_data, extra = {}) {
  const index      = ledger.events.length;
  const prev_hash  = index === 0 ? 'genesis' : ledger.events[index - 1].event_hash;
  const event_id   = _eventId(event_type, ref_id, index);
  const event_hash = _eventHash(event_type, event_id, ref_id, prev_hash);

  const event = {
    event_type,
    event_id,
    event_hash,
    prev_hash,
    ref_id,
    index,
    ...extra,
  };

  const new_events = [...ledger.events, event];
  const ledger_id  = _ledgerId(new_events);

  return {
    ...ledger,
    schema_version: SCHEMA_VERSION,
    ledger_id,
    events:         new_events,
    event_count:    new_events.length,
    ..._lockedFields(),
  };
}

export function buildOneRealTagPostVerificationLedger(events_to_append, initial_ledger) {
  const base = initial_ledger || {
    schema_version: SCHEMA_VERSION,
    ledger_id:      _sha256('empty'),
    events:         [],
    event_count:    0,
    ..._lockedFields(),
  };

  let ledger = { ...base };

  for (const item of (events_to_append || [])) {
    const { event_type, ref_id, ref_data, extra } = item;

    if (!LEDGER_EVENT_TYPES.includes(event_type)) {
      return {
        schema_version:    SCHEMA_VERSION,
        ledger_id:         null,
        events:            ledger.events,
        event_count:       ledger.events.length,
        ledger_error:      `unknown event_type: ${event_type}`,
        ledger_valid:      false,
        ..._lockedFields(),
      };
    }

    if (!ref_id) {
      return {
        schema_version:    SCHEMA_VERSION,
        ledger_id:         null,
        events:            ledger.events,
        event_count:       ledger.events.length,
        ledger_error:      `ref_id required for event_type: ${event_type}`,
        ledger_valid:      false,
        ..._lockedFields(),
      };
    }

    ledger = _appendEvent(ledger, event_type, ref_id, ref_data, extra || {});
  }

  return {
    ...ledger,
    ledger_valid: true,
  };
}

export function validateOneRealTagPostVerificationLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') return { valid: false, errors: ['ledger is null/undefined'] };

  const errors = [];

  if (ledger.schema_version !== SCHEMA_VERSION) errors.push(`invalid schema_version: ${ledger.schema_version}`);
  if (ledger.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (ledger.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (ledger.release_performed !== false) errors.push('release_performed must be false');

  // Verify hash chain
  for (let i = 0; i < (ledger.events || []).length; i++) {
    const e = ledger.events[i];
    const expected_prev = i === 0 ? 'genesis' : ledger.events[i - 1].event_hash;
    if (e.prev_hash !== expected_prev) {
      errors.push(`hash chain broken at index ${i}: prev_hash mismatch`);
    }
    if (e.index !== i) {
      errors.push(`event index mismatch at position ${i}: got ${e.index}`);
    }
    const expected_hash = _eventHash(e.event_type, e.event_id, e.ref_id, e.prev_hash);
    if (e.event_hash !== expected_hash) {
      errors.push(`event_hash tampered at index ${i}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function renderOneRealTagPostVerificationLedger(ledger) {
  if (!ledger || !ledger.ledger_valid) {
    return `[LEDGER ERROR] ${ledger?.ledger_error || 'invalid ledger'}`;
  }

  const lines = [
    `=== ONE REAL TAG POST-VERIFICATION LEDGER ===`,
    `Schema:      ${ledger.schema_version}`,
    `Ledger ID:   ${ledger.ledger_id}`,
    `Events:      ${ledger.event_count}`,
    `deploy=false | stable=false | release=false`,
    ``,
  ];

  for (const e of ledger.events) {
    lines.push(`[${e.index}] ${e.event_type} | ref=${e.ref_id} | hash=${e.event_hash.slice(0, 16)}...`);
  }

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('one-real-tag-post-verification-ledger.mjs')) {
  const isJson = process.argv.includes('--json');

  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',      ref_id: 'packet-001' },
    { event_type: 'ONE_TAG_COMMAND_EXPORT_READY',   ref_id: 'export-001' },
    { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CAPTURED', ref_id: 'receipt-001' },
    { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED', ref_id: 'verify-001' },
  ]);

  if (isJson) {
    console.log(JSON.stringify(ledger, null, 2));
  } else {
    console.log(renderOneRealTagPostVerificationLedger(ledger));
  }
}
