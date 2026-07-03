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

import { sha256, makeLockedFlags, HashChainLedger } from './_shared/gate-kit.mjs';

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

const _ledger = new HashChainLedger();

function _sha256(input) {
  return sha256(input);
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
      'unlock_executed',
    ]),
    production_execution_locked:     true,
    unlock_review_only:              true,
    future_execution_phase_required: true,
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

  const sequence = _ledger.size + 1;

  const event_id = _sha256([
    'unlock-review-event',
    event_type,
    artifact_id ?? '',
    now,
    _ledger.size,
  ].join(':')).slice(0, 24);

  const entry = _ledger.append({
    schema_version:  SCHEMA_VERSION,
    event_id,
    sequence,
    event_type,
    artifact_id:     artifact_id ?? null,
    artifact_status: artifact_status ?? null,
    evidence_package_id,
    created_at:      now,
    fixture_mode:    fixture_mode === true,
    ..._locked(),
  });

  return {
    schema_version:                    SCHEMA_VERSION,
    ledger_status:                     'UNLOCK_LEDGER_OK',
    appended:                          true,
    event_id,
    sequence,
    chain_hash:                        entry.chain_hash,
    total_events:                      _ledger.size,
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
    ledger_status:                     _ledger.size > 0 ? 'UNLOCK_LEDGER_OK' : 'UNLOCK_LEDGER_EMPTY',
    total_events:                      _ledger.size,
    events:                            _ledger.read(),
    ..._locked(),
  };
}

/**
 * Verify the hash chain integrity of the ledger.
 */
export function verifyUnlockReviewLedgerChain() {
  const result = _ledger.verify();

  if (_ledger.size === 0) {
    return {
      schema_version:                  SCHEMA_VERSION,
      valid:                           true,
      ledger_status:                   'UNLOCK_LEDGER_EMPTY',
      total_events:                    0,
      chain_valid:                     true,
      ..._locked(),
    };
  }

  if (!result.valid) {
    return {
      schema_version:                SCHEMA_VERSION,
      valid:                         false,
      ledger_status:                 'UNLOCK_LEDGER_CHAIN_BROKEN',
      broken_at_sequence:            result.tampered_at_index + 1,
      total_events:                  result.entries,
      chain_valid:                   false,
      ..._locked(),
    };
  }

  return {
    schema_version:                    SCHEMA_VERSION,
    valid:                             true,
    ledger_status:                     'UNLOCK_LEDGER_OK',
    total_events:                      result.entries,
    chain_valid:                       true,
    ..._locked(),
  };
}

/**
 * Reset ledger (test use only).
 */
export function _resetUnlockReviewLedgerForTest() {
  _ledger.reset();
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
