#!/usr/bin/env node
/**
 * Stable Promotion Post-Receipt Ledger — V124.0
 *
 * Append-only hash-chain ledger for post-receipt stable promotion events.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v124.0';

export const POST_RECEIPT_EVENT_TYPES = [
  'STABLE_PROMOTION_RECEIPT_IMPORTED',
  'STABLE_PROMOTION_RECEIPT_VERIFIED',
  'STABLE_PROMOTION_RECEIPT_MISMATCH',
  'STABLE_PROMOTION_RECEIPT_REJECTED',
  'STABLE_PROMOTION_POST_RECEIPT_AUDIT',
  'STABLE_PROMOTION_GOVERNANCE_COMPLETE',
];

export const POST_RECEIPT_LEDGER_STATUSES = [
  'POST_RECEIPT_LEDGER_EMPTY',
  'POST_RECEIPT_LEDGER_ACTIVE',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed: false,
    stable_promoted:          false,
    git_push_performed:       false,
    deploy_performed:         false,
    release_performed:        false,
  };
}

function _eventHash(event_type, payload, prev_hash) {
  return _sha256([event_type, JSON.stringify(payload || {}), prev_hash].join('|'));
}

export function appendPostReceiptLedgerEvents(existing_ledger, new_events) {
  const existing = (existing_ledger && Array.isArray(existing_ledger.events)) ? existing_ledger.events : [];

  const valid_new = (new_events || []).filter(e => POST_RECEIPT_EVENT_TYPES.includes(e.event_type));

  const combined = [...existing];
  for (const evt of valid_new) {
    const prev_hash = combined.length === 0 ? 'genesis' : combined[combined.length - 1].event_hash;
    const event_hash = _eventHash(evt.event_type, evt.payload, prev_hash);
    combined.push({
      event_type: evt.event_type,
      payload:    evt.payload || {},
      prev_hash,
      event_hash,
      sequence:   combined.length,
    });
  }

  const ledger_status = combined.length === 0 ? 'POST_RECEIPT_LEDGER_EMPTY' : 'POST_RECEIPT_LEDGER_ACTIVE';
  const ledger_hash   = combined.length === 0
    ? _sha256('genesis')
    : combined[combined.length - 1].event_hash;

  const has_verified = combined.some(e => e.event_type === 'STABLE_PROMOTION_RECEIPT_VERIFIED');
  const has_mismatch = combined.some(e => e.event_type === 'STABLE_PROMOTION_RECEIPT_MISMATCH');
  const has_rejected = combined.some(e => e.event_type === 'STABLE_PROMOTION_RECEIPT_REJECTED');
  const has_complete = combined.some(e => e.event_type === 'STABLE_PROMOTION_GOVERNANCE_COMPLETE');

  return {
    schema_version:       SCHEMA_VERSION,
    ledger_status,
    event_count:          combined.length,
    ledger_hash,
    events:               combined,
    has_verified_receipt: has_verified,
    has_mismatch:         has_mismatch,
    has_rejected:         has_rejected,
    governance_complete:  has_complete,
    ..._locked(),
  };
}

export function validatePostReceiptLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, errors: ['ledger is null/undefined'] };
  }

  const errors = [];

  if (!POST_RECEIPT_LEDGER_STATUSES.includes(ledger.ledger_status)) {
    errors.push(`invalid ledger_status: ${ledger.ledger_status}`);
  }
  if (ledger.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (ledger.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (ledger.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (ledger.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (ledger.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (ledger.release_performed !== false) errors.push('release_performed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderPostReceiptLedger(ledger) {
  if (!ledger) {
    return `[POST-RECEIPT LEDGER ERROR] ledger is null`;
  }

  const lines = [
    `=== STABLE PROMOTION POST-RECEIPT LEDGER ===`,
    `Schema:                  ${ledger.schema_version}`,
    `Status:                  ${ledger.ledger_status}`,
    `Event Count:             ${ledger.event_count}`,
    `Ledger Hash:             ${ledger.ledger_hash}`,
    `Has Verified Receipt:    ${ledger.has_verified_receipt}`,
    `Has Mismatch:            ${ledger.has_mismatch}`,
    `Has Rejected:            ${ledger.has_rejected}`,
    `Governance Complete:     ${ledger.governance_complete}`,
    ``,
    `--- EVENTS ---`,
  ];

  for (const evt of (ledger.events || [])) {
    lines.push(`  [${evt.sequence}] ${evt.event_type}`);
    lines.push(`       hash: ${evt.event_hash}`);
  }

  lines.push(``, `stable_promotion_allowed:  ${ledger.stable_promotion_allowed}`);
  lines.push(`stable_promoted:           ${ledger.stable_promoted}`);

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-post-receipt-ledger.mjs')) {
  const isJson = process.argv.includes('--json');

  const events = [
    { event_type: 'STABLE_PROMOTION_RECEIPT_IMPORTED', payload: { source: 'human_manual_import' } },
    { event_type: 'STABLE_PROMOTION_RECEIPT_VERIFIED',  payload: { receipt_id: 'r-001' } },
    { event_type: 'STABLE_PROMOTION_POST_RECEIPT_AUDIT', payload: { auditor: 'human-001' } },
    { event_type: 'STABLE_PROMOTION_GOVERNANCE_COMPLETE', payload: {} },
  ];

  const ledger = appendPostReceiptLedgerEvents(null, events);

  if (isJson) {
    console.log(JSON.stringify(ledger, null, 2));
  } else {
    console.log(renderPostReceiptLedger(ledger));
  }
}
