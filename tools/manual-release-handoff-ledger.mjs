#!/usr/bin/env node
/**
 * Manual Release Handoff Ledger — V48.1
 *
 * Append-only in-memory ledger for manual release handoff events.
 * Hash chain ensures integrity. Never writes to disk.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v48.1';
const GENESIS_HASH   = '0'.repeat(64);

export const HANDOFF_LEDGER_EVENT_TYPES = [
  'MANUAL_RELEASE_REQUEST_CREATED',
  'HUMAN_CONFIRMATION_BOUND',
  'MANUAL_RELEASE_PREFLIGHT_READY',
  'MANUAL_RELEASE_DRY_RUN_READY',
  'MANUAL_RELEASE_HANDOFF_READY',
  'MANUAL_RELEASE_BLOCKED',
];

export const HANDOFF_LEDGER_STATUSES = [
  'HANDOFF_LEDGER_BLOCKED_EVENT_TYPE',
  'HANDOFF_LEDGER_BLOCKED_EVIDENCE',
  'HANDOFF_LEDGER_BLOCKED_HANDOFF_ID',
  'HANDOFF_LEDGER_BLOCKED_TAMPER',
  'HANDOFF_LEDGER_READY',
];

const READY_EVENTS = [
  'MANUAL_RELEASE_REQUEST_CREATED',
  'HUMAN_CONFIRMATION_BOUND',
  'MANUAL_RELEASE_PREFLIGHT_READY',
  'MANUAL_RELEASE_DRY_RUN_READY',
  'MANUAL_RELEASE_HANDOFF_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

// In-memory ledger state
let _ledger = [];

/**
 * Reset ledger for testing.
 */
export function _resetHandoffLedgerForTest() {
  _ledger = [];
}

/**
 * Append an event to the handoff ledger.
 */
export function appendHandoffLedgerEvent(params = {}) {
  const {
    event_type,
    actor_id,
    handoff_id,
    evidence_refs,
    evidence_source,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (!HANDOFF_LEDGER_EVENT_TYPES.includes(event_type)) {
    return {
      appended: false,
      reason:   `unknown_event_type:${event_type}`,
      status:   'HANDOFF_LEDGER_BLOCKED_EVENT_TYPE',
      ..._locked(),
    };
  }

  // Ready events require evidence_refs and handoff_id
  if (READY_EVENTS.includes(event_type)) {
    if (!handoff_id) {
      return {
        appended: false,
        reason:   'handoff_id_required_for_ready_event',
        status:   'HANDOFF_LEDGER_BLOCKED_HANDOFF_ID',
        ..._locked(),
      };
    }
    if (!evidence_refs || (Array.isArray(evidence_refs) && evidence_refs.length === 0)) {
      return {
        appended: false,
        reason:   'evidence_refs_required_for_ready_event',
        status:   'HANDOFF_LEDGER_BLOCKED_EVIDENCE',
        ..._locked(),
      };
    }
    if (evidence_source && evidence_source !== 'go-core') {
      return {
        appended: false,
        reason:   'evidence_source_must_be_go_core',
        status:   'HANDOFF_LEDGER_BLOCKED_EVIDENCE',
        ..._locked(),
      };
    }
  }

  const prev_hash = _ledger.length === 0
    ? GENESIS_HASH
    : _ledger[_ledger.length - 1].chain_hash;

  const event_id = _sha256(`${event_type}:${actor_id ?? 'unknown'}:${now}`).slice(0, 24);

  const event_body = {
    event_type,
    actor_id:      actor_id ?? null,
    handoff_id:    handoff_id ?? null,
    evidence_refs: evidence_refs ?? null,
    evidence_source: evidence_source ?? null,
    timestamp:     now,
  };

  const chain_hash = _sha256(`${prev_hash}:${JSON.stringify(event_body)}`);

  const entry = {
    event_id,
    ...event_body,
    prev_hash,
    chain_hash,
    index:        _ledger.length,
    local_only:   true,
    manual_only:  true,
    ..._locked(),
  };

  _ledger.push(entry);

  return { appended: true, event_id, chain_hash, index: entry.index, ..._locked() };
}

/**
 * Verify handoff ledger chain integrity.
 */
export function verifyHandoffLedgerChain() {
  if (_ledger.length === 0) {
    return {
      valid:              true,
      entries:            0,
      status:             'HANDOFF_LEDGER_READY',
      schema_version:     SCHEMA_VERSION,
      tampered_at_index:  null,
      ..._locked(),
    };
  }

  let prev = GENESIS_HASH;
  for (let i = 0; i < _ledger.length; i++) {
    const entry = _ledger[i];
    if (entry.prev_hash !== prev) {
      return {
        valid:              false,
        entries:            _ledger.length,
        status:             'HANDOFF_LEDGER_BLOCKED_TAMPER',
        schema_version:     SCHEMA_VERSION,
        tampered_at_index:  i,
        ..._locked(),
      };
    }
    const event_body = {
      event_type:      entry.event_type,
      actor_id:        entry.actor_id,
      handoff_id:      entry.handoff_id,
      evidence_refs:   entry.evidence_refs,
      evidence_source: entry.evidence_source,
      timestamp:       entry.timestamp,
    };
    const expected = _sha256(`${prev}:${JSON.stringify(event_body)}`);
    if (entry.chain_hash !== expected) {
      return {
        valid:              false,
        entries:            _ledger.length,
        status:             'HANDOFF_LEDGER_BLOCKED_TAMPER',
        schema_version:     SCHEMA_VERSION,
        tampered_at_index:  i,
        ..._locked(),
      };
    }
    prev = entry.chain_hash;
  }

  return {
    valid:              true,
    entries:            _ledger.length,
    status:             'HANDOFF_LEDGER_READY',
    schema_version:     SCHEMA_VERSION,
    tampered_at_index:  null,
    ..._locked(),
  };
}

/**
 * Read current ledger state.
 */
export function readHandoffLedger() {
  return {
    entries:        _ledger.length,
    events:         _ledger.map(e => ({ event_id: e.event_id, event_type: e.event_type, index: e.index })),
    schema_version: SCHEMA_VERSION,
    ..._locked(),
  };
}

function _locked() {
  return {
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    tag_allowed:       false,
    release_performed: false,
    tag_created:       false,
    stable_promoted:   false,
    deploy_performed:  false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('manual-release-handoff-ledger.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');

  const chain = verifyHandoffLedgerChain();

  if (json) {
    console.log(JSON.stringify({ ...chain, ...readHandoffLedger() }, null, 2));
  } else {
    console.log(`handoff_ledger_status: ${chain.status}`);
    console.log(`entries: ${chain.entries}`);
    console.log(`valid: ${chain.valid}`);
  }

  process.exit(chain.valid ? 0 : 1);
}
