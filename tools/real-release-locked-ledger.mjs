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

import { sha256, makeLockedFlags, HashChainLedger } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v57.1';

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
  return sha256(input);
}

const _ledger = new HashChainLedger();

export function _resetRealReleaseLedgerForTest() {
  _ledger.reset();
}

function _locked() {
  return {
    ...makeLockedFlags([
      'deploy_allowed',
      'promotion_allowed',
      'stable_allowed',
      'tag_allowed',
      'release_execution_allowed',
      'release_performed',
      'tag_created',
      'stable_promoted',
      'deploy_performed',
    ]),
    production_execution_locked: true,
    unlock_required:             true,
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

  const event_id = _sha256(`${event_type}:${actor_id ?? 'unknown'}:${now}`).slice(0, 24);
  const index    = _ledger.size;

  const entry = _ledger.append({
    event_id,
    event_type,
    actor_id:       actor_id ?? null,
    ledger_id:      ledger_id ?? null,
    evidence_refs:  evidence_refs ?? null,
    evidence_source: evidence_source ?? null,
    finalizer_id:   finalizer_id ?? null,
    timestamp:      now,
    index,
    ..._locked(),
  });

  return { appended: true, event_id, chain_hash: entry.chain_hash, index, ..._locked() };
}

/**
 * Verify the real release locked ledger chain integrity.
 */
export function verifyRealReleaseLedgerChain() {
  const result = _ledger.verify();
  return {
    valid:             result.valid,
    entries:           result.entries,
    status:            result.valid ? 'REAL_RELEASE_LOCKED_LEDGER_READY' : 'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_TAMPER',
    schema_version:    SCHEMA_VERSION,
    tampered_at_index: result.tampered_at_index,
    ..._locked(),
  };
}

/**
 * Read current real release locked ledger state.
 */
export function readRealReleaseLedger() {
  return {
    entries:        _ledger.size,
    events:         _ledger.read().map(e => ({ event_id: e.event_id, event_type: e.event_type, index: e.index })),
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
