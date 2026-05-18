#!/usr/bin/env node
/**
 * Unlock Review Ledger — V63.0
 *
 * Append-only ledger for unlock governance review events.
 * Review-only. Does NOT execute unlock, release, tag, stable, or deploy.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always. unlock_executed=false always.
 * future_execution_phase_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v63.0';

export const UNLOCK_REVIEW_EVENT_TYPES = [
  'UNLOCK_CONTRACT_CREATED',
  'UNLOCK_AUTHORITY_GRANTED',
  'UNLOCK_BINDING_CREATED',
  'UNLOCK_DECISION_EVALUATED',
  'UNLOCK_EVIDENCE_PACKAGE_BUILT',
];

export const UNLOCK_REVIEW_LEDGER_STATUSES = [
  'UNLOCK_LEDGER_OK',
  'UNLOCK_LEDGER_EMPTY',
  'UNLOCK_LEDGER_CHAIN_BROKEN',
  'UNLOCK_LEDGER_INVALID_EVENT',
  'UNLOCK_LEDGER_LOCKED',
];

const GENESIS_HASH = '0'.repeat(64);

let _ledger = [];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:                    false,
    promotion_allowed:                 false,
    stable_allowed:                    false,
    tag_allowed:                       false,
    release_execution_allowed:         false,
    release_performed:                 false,
    tag_created:                       false,
    stable_promoted:                   false,
    deploy_performed:                  false,
    production_execution_locked:       true,
    unlock_executed:                   false,
    unlock_review_only:                true,
    future_execution_phase_required:   true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Append an unlock review event to the ledger.
 */
export function appendUnlockReviewLedgerEvent(params = {}) {
  const {
    event_type,
    artifact_id,
    artifact_status,
    evidence_package_id = null,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (!UNLOCK_REVIEW_EVENT_TYPES.includes(event_type)) {
    return {
      schema_version:                  SCHEMA_VERSION,
      ledger_status:                   'UNLOCK_LEDGER_INVALID_EVENT',
      appended:                        false,
      blocking_reason:                 `invalid_event_type:${event_type}`,
      ..._locked(),
    };
  }

  const prev_hash = _ledger.length > 0
    ? _ledger[_ledger.length - 1].chain_hash
    : GENESIS_HASH;

  const event_body = {
    event_type,
    artifact_id:      artifact_id ?? null,
    artifact_status:  artifact_status ?? null,
    evidence_package_id,
    created_at:       now,
    fixture_mode:     fixture_mode === true,
  };

  const event_id = _sha256([
    'unlock-review-event',
    event_type,
    artifact_id ?? '',
    now,
    _ledger.length,
  ].join(':')).slice(0, 24);

  const chain_hash = _sha256(`${prev_hash}:${JSON.stringify(event_body)}`);

  const entry = {
    schema_version:                    SCHEMA_VERSION,
    event_id,
    sequence:                          _ledger.length + 1,
    event_type,
    artifact_id:                       artifact_id ?? null,
    artifact_status:                   artifact_status ?? null,
    evidence_package_id,
    prev_hash,
    chain_hash,
    created_at:                        now,
    fixture_mode:                      fixture_mode === true,
    ..._locked(),
  };

  _ledger.push(entry);

  return {
    schema_version:                    SCHEMA_VERSION,
    ledger_status:                     'UNLOCK_LEDGER_OK',
    appended:                          true,
    event_id,
    sequence:                          entry.sequence,
    chain_hash,
    total_events:                      _ledger.length,
    blocking_reason:                   null,
    ..._locked(),
  };
}

/**
 * Read the current ledger state.
 */
export function readUnlockReviewLedger() {
  return {
    schema_version:                    SCHEMA_VERSION,
    ledger_status:                     _ledger.length > 0 ? 'UNLOCK_LEDGER_OK' : 'UNLOCK_LEDGER_EMPTY',
    total_events:                      _ledger.length,
    events:                            [..._ledger],
    ..._locked(),
  };
}

/**
 * Verify the hash chain integrity of the ledger.
 */
export function verifyUnlockReviewLedgerChain() {
  if (_ledger.length === 0) {
    return {
      schema_version:                  SCHEMA_VERSION,
      valid:                           true,
      ledger_status:                   'UNLOCK_LEDGER_EMPTY',
      total_events:                    0,
      chain_valid:                     true,
      ..._locked(),
    };
  }

  let prev_hash = GENESIS_HASH;
  for (let i = 0; i < _ledger.length; i++) {
    const entry = _ledger[i];
    if (entry.prev_hash !== prev_hash) {
      return {
        schema_version:                SCHEMA_VERSION,
        valid:                         false,
        ledger_status:                 'UNLOCK_LEDGER_CHAIN_BROKEN',
        broken_at_sequence:            entry.sequence,
        total_events:                  _ledger.length,
        chain_valid:                   false,
        ..._locked(),
      };
    }
    prev_hash = entry.chain_hash;
  }

  return {
    schema_version:                    SCHEMA_VERSION,
    valid:                             true,
    ledger_status:                     'UNLOCK_LEDGER_OK',
    total_events:                      _ledger.length,
    chain_valid:                       true,
    ..._locked(),
  };
}

/**
 * Reset ledger (test use only).
 */
export function _resetUnlockReviewLedgerForTest() {
  _ledger = [];
}

/**
 * Render a human-readable ledger summary.
 */
export function renderUnlockReviewLedger(state) {
  if (!state) return 'unlock_review_ledger: null';
  const lines = [
    `ledger_status                  : ${state.ledger_status ?? 'UNKNOWN'}`,
    `total_events                   : ${state.total_events ?? 0}`,
    `production_execution_locked    : true`,
    `unlock_executed                : false`,
    `future_execution_phase_required: true`,
    `unlock_review_only             : true`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('unlock-review-ledger.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  if (fixture) {
    for (const event_type of UNLOCK_REVIEW_EVENT_TYPES) {
      appendUnlockReviewLedgerEvent({ event_type, artifact_id: `fixture-${event_type}`, fixture_mode: true });
    }
  }

  const state = readUnlockReviewLedger();
  const chain = verifyUnlockReviewLedgerChain();

  const result = { ...state, chain_valid: chain.chain_valid };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderUnlockReviewLedger(result));
  }

  process.exit(chain.valid ? 0 : 1);
}
