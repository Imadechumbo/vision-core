#!/usr/bin/env node
/**
 * Controlled Execution Ledger — V68.0
 *
 * Append-only hash-chain ledger for controlled execution review events.
 * Does NOT execute release, tag, stable, deploy, or unlock.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * controlled_execution_allowed=false always.
 * unlock_executed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v68.0';

export const CONTROLLED_EXECUTION_EVENT_TYPES = [
  'CONTROLLED_EXECUTION_CONTRACT_READY_REVIEW',
  'CONTROLLED_EXECUTION_AUTHORITY_READY_REVIEW',
  'CONTROLLED_EXECUTION_BINDING_READY_REVIEW',
  'CONTROLLED_EXECUTION_RISK_READY_REVIEW',
  'CONTROLLED_EXECUTION_EVIDENCE_READY_REVIEW',
  'CONTROLLED_EXECUTION_BLOCKED',
];

export const CONTROLLED_EXECUTION_LEDGER_STATUSES = [
  'CONTROLLED_LEDGER_OK',
  'CONTROLLED_LEDGER_EMPTY',
  'CONTROLLED_LEDGER_CHAIN_BROKEN',
  'CONTROLLED_LEDGER_INVALID_EVENT',
  'CONTROLLED_LEDGER_LOCKED',
];

const GENESIS_HASH = '0'.repeat(64);

let _ledger = [];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:                     false,
    promotion_allowed:                  false,
    stable_allowed:                     false,
    tag_allowed:                        false,
    release_execution_allowed:          false,
    release_performed:                  false,
    tag_created:                        false,
    stable_promoted:                    false,
    deploy_performed:                   false,
    production_execution_locked:        true,
    unlock_executed:                    false,
    controlled_review_only:             true,
    controlled_execution_allowed:       false,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Append an event to the controlled execution ledger.
 */
export function appendControlledExecutionLedgerEvent(params = {}) {
  const {
    event_type,
    artifact_id,
    evidence_refs,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (!event_type || !CONTROLLED_EXECUTION_EVENT_TYPES.includes(event_type)) {
    return {
      appended: false,
      status:   'CONTROLLED_LEDGER_INVALID_EVENT',
      reason:   'invalid_event_type',
      ..._locked(),
    };
  }

  // READY events require evidence_refs (unless fixture_mode)
  const isReadyEvent = event_type !== 'CONTROLLED_EXECUTION_BLOCKED';
  if (isReadyEvent && !fixture_mode && (!evidence_refs || (Array.isArray(evidence_refs) && evidence_refs.length === 0))) {
    return {
      appended: false,
      status:   'CONTROLLED_LEDGER_INVALID_EVENT',
      reason:   'evidence_refs_required_for_ready_event',
      ..._locked(),
    };
  }

  const prev_hash = _ledger.length === 0 ? GENESIS_HASH : _ledger[_ledger.length - 1].event_hash;

  const event_body = {
    schema_version: SCHEMA_VERSION,
    event_type,
    artifact_id:    artifact_id ?? null,
    evidence_refs:  Array.isArray(evidence_refs) ? evidence_refs : (fixture_mode ? [] : []),
    created_at:     now,
    controlled_review_only:         true,
    controlled_execution_allowed:   false,
    production_execution_locked:    true,
    unlock_executed:                false,
    final_execution_phase_required: true,
  };

  const event_hash = _sha256(`${prev_hash}:${JSON.stringify(event_body)}`);
  const event = { ...event_body, prev_hash, event_hash };
  _ledger.push(event);

  return {
    appended:       true,
    status:         'CONTROLLED_LEDGER_OK',
    event_hash,
    event_index:    _ledger.length - 1,
    ..._locked(),
  };
}

/**
 * Read the controlled execution ledger (returns a copy).
 */
export function readControlledExecutionLedger() {
  return [..._ledger];
}

/**
 * Verify the hash chain of the controlled execution ledger.
 */
export function verifyControlledExecutionLedgerChain() {
  if (_ledger.length === 0) {
    return { valid: true, status: 'CONTROLLED_LEDGER_EMPTY', event_count: 0, ..._locked() };
  }

  let expected_prev = GENESIS_HASH;
  for (let i = 0; i < _ledger.length; i++) {
    const event = _ledger[i];
    if (event.prev_hash !== expected_prev) {
      return { valid: false, status: 'CONTROLLED_LEDGER_CHAIN_BROKEN', broken_at: i, ..._locked() };
    }
    const { event_hash: _, ...body } = event;
    const computed = _sha256(`${event.prev_hash}:${JSON.stringify({
      schema_version: body.schema_version,
      event_type: body.event_type,
      artifact_id: body.artifact_id,
      evidence_refs: body.evidence_refs,
      created_at: body.created_at,
      controlled_review_only: body.controlled_review_only,
      controlled_execution_allowed: body.controlled_execution_allowed,
      production_execution_locked: body.production_execution_locked,
      unlock_executed: body.unlock_executed,
      final_execution_phase_required: body.final_execution_phase_required,
    })}`);
    if (computed !== event.event_hash) {
      return { valid: false, status: 'CONTROLLED_LEDGER_CHAIN_BROKEN', broken_at: i, ..._locked() };
    }
    expected_prev = event.event_hash;
  }

  return {
    valid:       true,
    status:      'CONTROLLED_LEDGER_OK',
    event_count: _ledger.length,
    ..._locked(),
  };
}

/**
 * Reset the ledger (for tests only).
 */
export function _resetControlledExecutionLedgerForTest() {
  _ledger = [];
}

/**
 * Render a human-readable ledger summary.
 */
export function renderControlledExecutionLedger(state) {
  if (!state) return 'controlled_execution_ledger: null';
  const lines = [
    `ledger_status                  : ${state.status ?? 'UNKNOWN'}`,
    `event_count                    : ${state.event_count ?? 'n/a'}`,
    `chain_valid                    : ${state.valid ?? false}`,
    `controlled_execution_allowed   : false`,
    `production_execution_locked    : true`,
    `unlock_executed                : false`,
    `final_execution_phase_required : true`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('controlled-execution-ledger.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');

  // Smoke: append all event types with fixture_mode, then verify
  _resetControlledExecutionLedgerForTest();
  for (const t of CONTROLLED_EXECUTION_EVENT_TYPES) {
    appendControlledExecutionLedgerEvent({ event_type: t, artifact_id: `cli-${t}`, fixture_mode: true });
  }
  const chain = verifyControlledExecutionLedgerChain();
  _resetControlledExecutionLedgerForTest();

  if (json) {
    console.log(JSON.stringify({ ...chain, schema_version: SCHEMA_VERSION }, null, 2));
  } else {
    console.log(renderControlledExecutionLedger(chain));
  }

  process.exit(chain.valid ? 0 : 1);
}
