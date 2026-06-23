#!/usr/bin/env node
/**
 * Stable Promotion Audit Ledger — V120.0
 *
 * Append-only hash-chain ledger for stable promotion audit events.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v120.0';

export const AUDIT_EVENT_TYPES = [
  'STABLE_PROMOTION_CONTRACT_READY',
  'STABLE_PROMOTION_APPROVAL_BOUND',
  'STABLE_PROMOTION_COMMAND_PACKAGE_READY',
  'STABLE_PROMOTION_COMMAND_RENDERED',
  'STABLE_PROMOTION_DRY_RUN_SIMULATED',
  'STABLE_PROMOTION_DRY_RUN_RECEIPT_ISSUED',
  'STABLE_PROMOTION_SAFETY_LOCK_ISSUED',
  'STABLE_PROMOTION_ROLLBACK_PLAN_READY',
  'STABLE_PROMOTION_AUDIT_BLOCKED',
];

export const AUDIT_LEDGER_STATUSES = [
  'AUDIT_LEDGER_EMPTY',
  'AUDIT_LEDGER_ACTIVE',
  'AUDIT_LEDGER_INVALID_EVENT',
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

export function appendStablePromotionAuditEvents(existing_ledger, new_events) {
  const existing = (existing_ledger && Array.isArray(existing_ledger.events)) ? existing_ledger.events : [];

  const valid_new = (new_events || []).filter(e => AUDIT_EVENT_TYPES.includes(e.event_type));

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

  const ledger_status = combined.length === 0 ? 'AUDIT_LEDGER_EMPTY' : 'AUDIT_LEDGER_ACTIVE';
  const ledger_hash = combined.length === 0
    ? _sha256('genesis')
    : combined[combined.length - 1].event_hash;

  return {
    schema_version:  SCHEMA_VERSION,
    ledger_status,
    event_count:     combined.length,
    ledger_hash,
    events:          combined,
    ..._locked(),
  };
}

export function validateStablePromotionAuditLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { valid: false, errors: ['ledger is null/undefined'] };
  }

  const errors = [];

  if (!AUDIT_LEDGER_STATUSES.includes(ledger.ledger_status)) {
    errors.push(`invalid ledger_status: ${ledger.ledger_status}`);
  }
  if (ledger.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (ledger.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (ledger.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (ledger.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (ledger.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (ledger.release_performed !== false) errors.push('release_performed must be false');

  if (ledger.ledger_status === 'AUDIT_LEDGER_ACTIVE' && ledger.event_count === 0) {
    errors.push('ACTIVE ledger must have events');
  }

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionAuditLedger(ledger) {
  if (!ledger) {
    return `[AUDIT LEDGER ERROR] ledger is null`;
  }

  const lines = [
    `=== STABLE PROMOTION AUDIT LEDGER ===`,
    `Schema:          ${ledger.schema_version}`,
    `Status:          ${ledger.ledger_status}`,
    `Event Count:     ${ledger.event_count}`,
    `Ledger Hash:     ${ledger.ledger_hash}`,
    ``,
    `--- EVENTS ---`,
  ];

  for (const evt of (ledger.events || [])) {
    lines.push(`  [${evt.sequence}] ${evt.event_type}`);
    lines.push(`       hash: ${evt.event_hash}`);
    lines.push(`       prev: ${evt.prev_hash}`);
  }

  lines.push(``, `stable_promotion_allowed:  ${ledger.stable_promotion_allowed}`);
  lines.push(`stable_promoted:           ${ledger.stable_promoted}`);

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-audit-ledger.mjs')) {
  const isJson = process.argv.includes('--json');

  const events = [
    { event_type: 'STABLE_PROMOTION_CONTRACT_READY', payload: { contract_id: 'c-001' } },
    { event_type: 'STABLE_PROMOTION_APPROVAL_BOUND', payload: { binding_id: 'b-001' } },
    { event_type: 'STABLE_PROMOTION_DRY_RUN_SIMULATED', payload: { total_commands: 7 } },
    { event_type: 'STABLE_PROMOTION_SAFETY_LOCK_ISSUED', payload: { lock_id: 'lk-001' } },
  ];

  const ledger = appendStablePromotionAuditEvents(null, events);

  if (isJson) {
    console.log(JSON.stringify(ledger, null, 2));
  } else {
    console.log(renderStablePromotionAuditLedger(ledger));
  }
}
