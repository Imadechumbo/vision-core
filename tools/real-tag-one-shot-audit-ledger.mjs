#!/usr/bin/env node
/**
 * Real Tag One-Shot Audit Ledger — V79.0
 *
 * Append-only ledger for real tag one-shot events.
 * Hash chain ensures tamper detection.
 *
 * REGRA ABSOLUTA: ledger does NOT execute tag/push/deploy/stable/release.
 * tag_created=false for all events in this phase.
 * git_push_performed=false for all events in this phase.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v79.0';

export const TAG_LEDGER_EVENTS = [
  'REAL_TAG_CONTRACT_READY_REVIEW',
  'REAL_TAG_CONFIRMATION_READY_REVIEW',
  'REAL_TAG_SAFETY_READY_REVIEW',
  'REAL_TAG_ROLLBACK_ANCHOR_READY',
  'REAL_TAG_DRY_RUN_READY',
  'REAL_TAG_ARMED_READY_NOT_EXECUTED',
  'REAL_TAG_BLOCKED',
];

const READY_EVENTS = new Set([
  'REAL_TAG_CONTRACT_READY_REVIEW',
  'REAL_TAG_CONFIRMATION_READY_REVIEW',
  'REAL_TAG_SAFETY_READY_REVIEW',
  'REAL_TAG_ROLLBACK_ANCHOR_READY',
  'REAL_TAG_DRY_RUN_READY',
  'REAL_TAG_ARMED_READY_NOT_EXECUTED',
]);

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _computeEventHash(event, previous_hash) {
  return _sha256(`${previous_hash}:${event.event_type}:${event.target_tag ?? ''}:${event.created_at}`).slice(0, 32);
}

export function createRealTagAuditLedger() {
  return {
    schema_version:     SCHEMA_VERSION,
    ledger_id:          _sha256(`real-tag-audit-ledger:${SCHEMA_VERSION}:${Date.now()}`).slice(0, 24),
    events:             [],
    chain_valid:        true,
    event_count:        0,
    last_hash:          'GENESIS',
    tag_created:        false,
    git_push_performed: false,
    deploy_performed:   false,
    stable_promoted:    false,
    release_performed:  false,
  };
}

export function appendRealTagAuditEvent(ledger, event_type, payload = {}) {
  if (!ledger || !event_type) {
    return { appended: false, reason: 'invalid_ledger_or_event_type' };
  }
  if (!TAG_LEDGER_EVENTS.includes(event_type)) {
    return { appended: false, reason: 'unknown_event_type' };
  }

  const now = payload._mock_timestamp ?? new Date().toISOString();
  const target_tag = payload.target_tag ?? null;
  const rollback_anchor_id = payload.rollback_anchor_id ?? null;

  // Ready events require evidence
  if (READY_EVENTS.has(event_type)) {
    if (!payload.evidence_refs || payload.evidence_refs.length === 0) {
      return { appended: false, reason: 'evidence_refs_required_for_ready_event' };
    }
  }

  // Armed event requires rollback anchor
  if (event_type === 'REAL_TAG_ARMED_READY_NOT_EXECUTED' && !rollback_anchor_id) {
    return { appended: false, reason: 'rollback_anchor_id_required_for_armed_event' };
  }

  const event = {
    event_id:           _sha256(`event:${event_type}:${ledger.event_count}:${now}`).slice(0, 24),
    event_type,
    target_tag,
    rollback_anchor_id,
    evidence_refs:      payload.evidence_refs ?? [],
    blocking_reason:    payload.blocking_reason ?? null,
    tag_created:        false,
    git_push_performed: false,
    created_at:         now,
  };

  event.event_hash = _computeEventHash(event, ledger.last_hash);

  ledger.events.push(event);
  ledger.last_hash = event.event_hash;
  ledger.event_count = ledger.events.length;

  return { appended: true, event_id: event.event_id, event_hash: event.event_hash };
}

export function verifyRealTagAuditLedger(ledger) {
  if (!ledger?.events) return { valid: false, reason: 'no_ledger' };
  let prev = 'GENESIS';
  for (const ev of ledger.events) {
    const expected = _computeEventHash(ev, prev);
    if (ev.event_hash !== expected) {
      return { valid: false, reason: 'hash_chain_broken', event_id: ev.event_id };
    }
    if (ev.tag_created        === true) return { valid: false, reason: 'tag_created_must_be_false' };
    if (ev.git_push_performed === true) return { valid: false, reason: 'git_push_must_be_false' };
    prev = ev.event_hash;
  }
  return { valid: true, event_count: ledger.event_count };
}

export function renderRealTagAuditLedger(ledger) {
  if (!ledger) return 'real_tag_one_shot_audit_ledger: null';
  const lines = [
    `ledger_id           : ${ledger.ledger_id ?? 'none'}`,
    `event_count         : ${ledger.event_count ?? 0}`,
    `chain_valid         : ${ledger.chain_valid ?? false}`,
    `tag_created         : false`,
    `git_push_performed  : false`,
  ];
  for (const ev of (ledger.events ?? [])) {
    lines.push(`  [${ev.event_type}] tag=${ev.target_tag ?? 'none'} hash=${ev.event_hash ?? 'none'}`);
  }
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-audit-ledger.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');

  const ledger = createRealTagAuditLedger();
  if (json) {
    console.log(JSON.stringify(ledger, null, 2));
  } else {
    console.log(renderRealTagAuditLedger(ledger));
  }
  process.exit(0);
}
