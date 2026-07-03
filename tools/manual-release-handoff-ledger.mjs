#!/usr/bin/env node
/**
 * Manual Release Handoff Ledger — V48.1
 *
 * Append-only in-memory ledger for manual release handoff events.
 * Hash chain ensures integrity. Never writes to disk.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 */

import { sha256, makeLockedFlags, HashChainLedger } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v48.1';

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
  return sha256(input);
}

// In-memory ledger state
const _ledger = new HashChainLedger();

/**
 * Reset ledger for testing.
 */
export function _resetHandoffLedgerForTest() {
  _ledger.reset();
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

  const event_id = _sha256(`${event_type}:${actor_id ?? 'unknown'}:${now}`).slice(0, 24);
  const index    = _ledger.size;

  const entry = _ledger.append({
    event_id,
    event_type,
    actor_id:      actor_id ?? null,
    handoff_id:    handoff_id ?? null,
    evidence_refs: evidence_refs ?? null,
    evidence_source: evidence_source ?? null,
    timestamp:     now,
    index,
    local_only:   true,
    manual_only:  true,
    ..._locked(),
  });

  return { appended: true, event_id, chain_hash: entry.chain_hash, index, ..._locked() };
}

/**
 * Verify handoff ledger chain integrity.
 */
export function verifyHandoffLedgerChain() {
  const result = _ledger.verify();
  return {
    valid:              result.valid,
    entries:            result.entries,
    status:             result.valid ? 'HANDOFF_LEDGER_READY' : 'HANDOFF_LEDGER_BLOCKED_TAMPER',
    schema_version:     SCHEMA_VERSION,
    tampered_at_index:  result.tampered_at_index,
    ..._locked(),
  };
}

/**
 * Read current ledger state.
 */
export function readHandoffLedger() {
  return {
    entries:        _ledger.size,
    events:         _ledger.read().map(e => ({ event_id: e.event_id, event_type: e.event_type, index: e.index })),
    schema_version: SCHEMA_VERSION,
    ..._locked(),
  };
}

function _locked() {
  return makeLockedFlags([
    'deploy_allowed',
    'promotion_allowed',
    'stable_allowed',
    'tag_allowed',
    'release_performed',
    'tag_created',
    'stable_promoted',
    'deploy_performed',
  ]);
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
