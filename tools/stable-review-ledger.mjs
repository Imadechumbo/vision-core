#!/usr/bin/env node
/**
 * Stable Review Ledger — V113.0
 *
 * Append-only hash-chain ledger for stable review events.
 * Does NOT promote stable. Does NOT perform deploy or release.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v113.0';

export const STABLE_REVIEW_LEDGER_EVENT_TYPES = [
  'STABLE_REVIEW_CONTRACT_READY',
  'STABLE_REVIEW_EVIDENCE_BOUND',
  'STABLE_REVIEW_DECISION_READY',
  'STABLE_REVIEW_HUMAN_APPROVAL_READY',
  'STABLE_REVIEW_BLOCKED',
];

export const STABLE_REVIEW_LEDGER_STATUSES = [
  'STABLE_REVIEW_LEDGER_EMPTY',
  'STABLE_REVIEW_LEDGER_ACTIVE',
  'STABLE_REVIEW_LEDGER_TAMPERED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed: false,
    stable_promoted:          false,
    deploy_performed:         false,
    release_performed:        false,
  };
}

function _eventHash(event_type, ref_id, prev_hash, index) {
  return _sha256([event_type, ref_id, prev_hash, index, 'ledger-v113.0'].join('|'));
}

function _ledgerId(events) {
  if (!events || events.length === 0) return _sha256('empty-ledger-v113.0');
  const last = events[events.length - 1];
  return _sha256([last.event_hash, events.length, 'ledger-id-v113.0'].join('|'));
}

export function buildStableReviewLedger(events_to_append, initial_ledger) {
  const existing_events = (initial_ledger && Array.isArray(initial_ledger.events))
    ? initial_ledger.events
    : [];

  const new_events = Array.isArray(events_to_append) ? events_to_append : [];

  if (new_events.length === 0 && existing_events.length === 0) {
    return {
      schema_version:  SCHEMA_VERSION,
      ledger_id:       _ledgerId([]),
      ledger_status:   'STABLE_REVIEW_LEDGER_EMPTY',
      ledger_ready:    true,
      event_count:     0,
      events:          [],
      chain_valid:     true,
      ..._locked(),
    };
  }

  const combined = [...existing_events];

  for (const evt of new_events) {
    if (!STABLE_REVIEW_LEDGER_EVENT_TYPES.includes(evt.event_type)) continue;

    const index     = combined.length;
    const prev_hash = index === 0 ? 'genesis' : combined[index - 1].event_hash;
    const event_id  = _sha256([evt.event_type, evt.ref_id || '', index, 'evt-v113.0'].join('|'));
    const event_hash = _eventHash(evt.event_type, evt.ref_id || '', prev_hash, index);

    combined.push({
      event_type:  evt.event_type,
      event_id,
      event_hash,
      prev_hash,
      ref_id:      evt.ref_id || null,
      index,
    });
  }

  const ledger_id = _ledgerId(combined);
  const ledger_status = combined.length === 0
    ? 'STABLE_REVIEW_LEDGER_EMPTY'
    : 'STABLE_REVIEW_LEDGER_ACTIVE';

  return {
    schema_version:  SCHEMA_VERSION,
    ledger_id,
    ledger_status,
    ledger_ready:    true,
    event_count:     combined.length,
    events:          combined,
    chain_valid:     true,
    ..._locked(),
  };
}

export function validateStableReviewLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, errors: ['ledger is null/undefined'] };
  }

  const errors = [];

  if (!STABLE_REVIEW_LEDGER_STATUSES.includes(ledger.ledger_status)) {
    errors.push(`invalid ledger_status: ${ledger.ledger_status}`);
  }
  if (ledger.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (ledger.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (ledger.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (ledger.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (ledger.release_performed !== false) errors.push('release_performed must be false');

  // Verify hash chain
  if (Array.isArray(ledger.events)) {
    for (let i = 0; i < ledger.events.length; i++) {
      const evt = ledger.events[i];
      const expected_prev = i === 0 ? 'genesis' : ledger.events[i - 1].event_hash;
      if (evt.prev_hash !== expected_prev) {
        errors.push(`chain break at index ${i}`);
      }
      const expected_hash = _eventHash(evt.event_type, evt.ref_id || '', evt.prev_hash, evt.index);
      if (evt.event_hash !== expected_hash) {
        errors.push(`hash mismatch at index ${i}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function renderStableReviewLedger(ledger) {
  if (!ledger || !ledger.ledger_ready) {
    return `[STABLE REVIEW LEDGER ERROR] ${ledger?.ledger_status || 'unknown'}`;
  }

  const lines = [
    `=== STABLE REVIEW LEDGER ===`,
    `Schema:                  ${ledger.schema_version}`,
    `Ledger ID:               ${ledger.ledger_id}`,
    `Status:                  ${ledger.ledger_status}`,
    `Events:                  ${ledger.event_count}`,
    `chain_valid:             ${ledger.chain_valid}`,
    `stable_promotion_allowed: ${ledger.stable_promotion_allowed}`,
    `stable_promoted:         ${ledger.stable_promoted}`,
    `deploy_performed:        ${ledger.deploy_performed}`,
    ``,
  ];

  if (ledger.events && ledger.events.length > 0) {
    lines.push('Events:');
    for (const evt of ledger.events) {
      lines.push(`  [${evt.index}] ${evt.event_type} | ref=${evt.ref_id || 'null'}`);
    }
  }

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-review-ledger.mjs')) {
  const isJson = process.argv.includes('--json');

  const ledger = buildStableReviewLedger([
    { event_type: 'STABLE_REVIEW_CONTRACT_READY',   ref_id: 'mock-contract-v113' },
    { event_type: 'STABLE_REVIEW_EVIDENCE_BOUND',    ref_id: 'mock-binding-v113' },
    { event_type: 'STABLE_REVIEW_DECISION_READY',    ref_id: 'mock-decision-v113' },
    { event_type: 'STABLE_REVIEW_HUMAN_APPROVAL_READY', ref_id: 'mock-approval-v113' },
  ]);

  if (isJson) {
    console.log(JSON.stringify(ledger, null, 2));
  } else {
    console.log(renderStableReviewLedger(ledger));
  }
}
