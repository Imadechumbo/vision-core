#!/usr/bin/env node
/**
 * Stable Execution Post-Promotion Ledger — V128.0
 *
 * Append-only hash-chained ledger for post-promotion audit events.
 * Does NOT execute any commands.
 *
 * REGRA ABSOLUTA: system_execution_performed=false, automated_promotion_performed=false,
 * stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v128.0';

export const POST_PROMOTION_EVENT_TYPES = [
  'STABLE_EXECUTION_RECEIPT_IMPORTED',
  'STABLE_EXECUTION_STATE_VERIFIED',
  'STABLE_EXECUTION_SNAPSHOT_CAPTURED',
  'STABLE_EXECUTION_CONFIRMATION_ISSUED',
  'STABLE_EXECUTION_POST_PROMOTION_AUDIT',
  'STABLE_EXECUTION_PROMOTION_FINALIZED',
];

export const POST_PROMOTION_LEDGER_STATUSES = [
  'POST_PROMOTION_LEDGER_EMPTY',
  'POST_PROMOTION_LEDGER_ACTIVE',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    system_execution_performed:    false,
    automated_promotion_performed: false,
    stable_promotion_allowed:      false,
    stable_promoted:               false,
    git_push_performed:            false,
    deploy_performed:              false,
    release_performed:             false,
  };
}

function _eventHash(event_type, payload, prev_hash, sequence) {
  return _sha256([event_type, JSON.stringify(payload || {}), prev_hash, String(sequence)].join('|'));
}

function _ledgerHash(events) {
  if (events.length === 0) {
    return _sha256('empty-post-promotion-ledger-v128.0');
  }
  return events[events.length - 1].event_hash;
}

export function appendPostPromotionLedgerEvents(existing_ledger, new_events) {
  const valid_existing = (existing_ledger && Array.isArray(existing_ledger.events))
    ? existing_ledger.events
    : [];

  const valid_new = (new_events || []).filter(e => POST_PROMOTION_EVENT_TYPES.includes(e.event_type));

  const combined = [...valid_existing];
  let prev_hash = combined.length > 0 ? combined[combined.length - 1].event_hash : 'genesis';

  for (const ev of valid_new) {
    const sequence   = combined.length;
    const event_hash = _eventHash(ev.event_type, ev.payload, prev_hash, sequence);
    combined.push({
      sequence,
      event_type:  ev.event_type,
      payload:     ev.payload || {},
      prev_hash,
      event_hash,
    });
    prev_hash = event_hash;
  }

  const ledger_hash             = _ledgerHash(combined);
  const has_confirmation        = combined.some(e => e.event_type === 'STABLE_EXECUTION_CONFIRMATION_ISSUED');
  const has_state_verified      = combined.some(e => e.event_type === 'STABLE_EXECUTION_STATE_VERIFIED');
  const promotion_finalized     = combined.some(e => e.event_type === 'STABLE_EXECUTION_PROMOTION_FINALIZED');

  return {
    schema_version:     SCHEMA_VERSION,
    ledger_status:      combined.length === 0 ? 'POST_PROMOTION_LEDGER_EMPTY' : 'POST_PROMOTION_LEDGER_ACTIVE',
    event_count:        combined.length,
    events:             combined,
    ledger_hash,
    has_confirmation,
    has_state_verified,
    promotion_finalized,
    ..._locked(),
  };
}

export function validatePostPromotionLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, errors: ['ledger is null/undefined'] };
  }

  const errors = [];

  if (!POST_PROMOTION_LEDGER_STATUSES.includes(ledger.ledger_status)) {
    errors.push(`invalid ledger_status: ${ledger.ledger_status}`);
  }
  if (ledger.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (ledger.system_execution_performed !== false) errors.push('system_execution_performed must be false');
  if (ledger.automated_promotion_performed !== false) errors.push('automated_promotion_performed must be false');
  if (ledger.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (ledger.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (ledger.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (ledger.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (ledger.release_performed !== false) errors.push('release_performed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderPostPromotionLedger(ledger) {
  if (!ledger) return '[POST-PROMOTION LEDGER ERROR] ledger is null';

  const lines = [
    `=== STABLE EXECUTION POST-PROMOTION LEDGER V128.0 ===`,
    `Schema:                          ${ledger.schema_version}`,
    `Status:                          ${ledger.ledger_status}`,
    `Event Count:                     ${ledger.event_count}`,
    `Ledger Hash:                     ${ledger.ledger_hash}`,
    `Has Confirmation:                ${ledger.has_confirmation}`,
    `Has State Verified:              ${ledger.has_state_verified}`,
    `Promotion Finalized:             ${ledger.promotion_finalized}`,
    ``,
    `--- EVENTS ---`,
  ];

  for (const e of (ledger.events || [])) {
    lines.push(`  [${e.sequence}] ${e.event_type}`);
  }

  lines.push(
    ``,
    `stable_promotion_allowed:        ${ledger.stable_promotion_allowed}`,
    `system_execution_performed:      ${ledger.system_execution_performed}`,
    `automated_promotion_performed:   ${ledger.automated_promotion_performed}`,
  );

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-execution-post-promotion-ledger.mjs')) {
  const isJson = process.argv.includes('--json');

  const events = [
    { event_type: 'STABLE_EXECUTION_RECEIPT_IMPORTED',     payload: { source: 'human_manual_import' } },
    { event_type: 'STABLE_EXECUTION_STATE_VERIFIED',        payload: { verifier_id: 'mock-v128' } },
    { event_type: 'STABLE_EXECUTION_SNAPSHOT_CAPTURED',    payload: { snapshot_id: 'snap-mock' } },
    { event_type: 'STABLE_EXECUTION_CONFIRMATION_ISSUED',   payload: { confirmation_id: 'conf-mock' } },
    { event_type: 'STABLE_EXECUTION_PROMOTION_FINALIZED',   payload: {} },
  ];

  const ledger = appendPostPromotionLedgerEvents(null, events);

  if (isJson) {
    console.log(JSON.stringify(ledger, null, 2));
  } else {
    console.log(renderPostPromotionLedger(ledger));
  }
}
