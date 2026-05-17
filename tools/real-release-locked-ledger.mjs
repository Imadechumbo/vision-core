#!/usr/bin/env node
/**
 * Real Release Locked Ledger — V57.1
 *
 * Append-only hash-chain ledger for real release locked events.
 * Records gate, lock, readiness, finalizer and blocked states.
 * Never executes release/tag/stable/deploy.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always. unlock_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v57.1';
const GENESIS_HASH   = '0'.repeat(64);

export const REAL_RELEASE_LOCKED_EVENT_TYPES = [
  'REAL_MANUAL_RELEASE_GATE_READY_LOCKED',
  'PRODUCTION_EXECUTION_LOCK_ACTIVE',
  'REAL_RELEASE_READINESS_READY_LOCKED',
  'REAL_RELEASE_EVIDENCE_FINALIZER_READY_LOCKED',
  'REAL_RELEASE_BLOCKED',
];

export const REAL_RELEASE_LOCKED_LEDGER_STATUSES = [
  'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_EVENT_TYPE',
  'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_EVIDENCE',
  'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_LEDGER_ID',
  'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_TAMPER',
  'REAL_RELEASE_LOCKED_LEDGER_READY',
];

const READY_LOCKED_EVENTS = [
  'REAL_MANUAL_RELEASE_GATE_READY_LOCKED',
  'PRODUCTION_EXECUTION_LOCK_ACTIVE',
  'REAL_RELEASE_READINESS_READY_LOCKED',
  'REAL_RELEASE_EVIDENCE_FINALIZER_READY_LOCKED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

let _ledger = [];

export function _resetRealReleaseLedgerForTest() {
  _ledger = [];
}

function _locked() {
  return {
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    unlock_required:              true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Append a real release locked ledger event.
 */
export function appendRealReleaseLedgerEvent(params = {}) {
  const {
    event_type,
    actor_id,
    ledger_id,
    evidence_refs,
    evidence_source,
    finalizer_id,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (!REAL_RELEASE_LOCKED_EVENT_TYPES.includes(event_type)) {
    return {
      appended: false,
      reason:   `unknown_event_type:${event_type}`,
      status:   'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_EVENT_TYPE',
      ..._locked(),
    };
  }

  // Ready-locked events require ledger_id and evidence_refs
  if (READY_LOCKED_EVENTS.includes(event_type)) {
    if (!ledger_id) {
      return {
        appended: false,
        reason:   'ledger_id_required_for_ready_locked_event',
        status:   'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_LEDGER_ID',
        ..._locked(),
      };
    }
    if (!evidence_refs || (Array.isArray(evidence_refs) && evidence_refs.length === 0)) {
      return {
        appended: false,
        reason:   'evidence_refs_required_for_ready_locked_event',
        status:   'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_EVIDENCE',
        ..._locked(),
      };
    }
    if (evidence_source && evidence_source !== 'go-core') {
      return {
        appended: false,
        reason:   'evidence_source_must_be_go_core',
        status:   'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_EVIDENCE',
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
    actor_id:       actor_id ?? null,
    ledger_id:      ledger_id ?? null,
    evidence_refs:  evidence_refs ?? null,
    evidence_source: evidence_source ?? null,
    finalizer_id:   finalizer_id ?? null,
    timestamp:      now,
  };

  const chain_hash = _sha256(`${prev_hash}:${JSON.stringify(event_body)}`);

  const entry = {
    event_id,
    ...event_body,
    prev_hash,
    chain_hash,
    index:        _ledger.length,
    ..._locked(),
  };

  _ledger.push(entry);

  return { appended: true, event_id, chain_hash, index: entry.index, ..._locked() };
}

/**
 * Verify the real release locked ledger chain integrity.
 */
export function verifyRealReleaseLedgerChain() {
  if (_ledger.length === 0) {
    return {
      valid:             true,
      entries:           0,
      status:            'REAL_RELEASE_LOCKED_LEDGER_READY',
      schema_version:    SCHEMA_VERSION,
      tampered_at_index: null,
      ..._locked(),
    };
  }

  let prev = GENESIS_HASH;
  for (let i = 0; i < _ledger.length; i++) {
    const entry = _ledger[i];
    if (entry.prev_hash !== prev) {
      return {
        valid:             false,
        entries:           _ledger.length,
        status:            'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_TAMPER',
        schema_version:    SCHEMA_VERSION,
        tampered_at_index: i,
        ..._locked(),
      };
    }
    const event_body = {
      event_type:      entry.event_type,
      actor_id:        entry.actor_id,
      ledger_id:       entry.ledger_id,
      evidence_refs:   entry.evidence_refs,
      evidence_source: entry.evidence_source,
      finalizer_id:    entry.finalizer_id,
      timestamp:       entry.timestamp,
    };
    const expected = _sha256(`${prev}:${JSON.stringify(event_body)}`);
    if (entry.chain_hash !== expected) {
      return {
        valid:             false,
        entries:           _ledger.length,
        status:            'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_TAMPER',
        schema_version:    SCHEMA_VERSION,
        tampered_at_index: i,
        ..._locked(),
      };
    }
    prev = entry.chain_hash;
  }

  return {
    valid:             true,
    entries:           _ledger.length,
    status:            'REAL_RELEASE_LOCKED_LEDGER_READY',
    schema_version:    SCHEMA_VERSION,
    tampered_at_index: null,
    ..._locked(),
  };
}

/**
 * Read current real release locked ledger state.
 */
export function readRealReleaseLedger() {
  return {
    entries:        _ledger.length,
    events:         _ledger.map(e => ({ event_id: e.event_id, event_type: e.event_type, index: e.index })),
    schema_version: SCHEMA_VERSION,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-release-locked-ledger.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');

  const chain = verifyRealReleaseLedgerChain();

  if (json) {
    console.log(JSON.stringify({ ...chain, ...readRealReleaseLedger() }, null, 2));
  } else {
    console.log(`real_release_locked_ledger_status: ${chain.status}`);
    console.log(`entries: ${chain.entries}`);
    console.log(`valid: ${chain.valid}`);
  }

  process.exit(chain.valid ? 0 : 1);
}
