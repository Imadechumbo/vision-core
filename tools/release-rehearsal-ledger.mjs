#!/usr/bin/env node
/**
 * Release Rehearsal Ledger — V53.0
 *
 * Append-only in-memory hash-chain ledger for release rehearsal events.
 * Records sandbox creation, policy verification, command simulation,
 * rehearsal plan readiness, and rehearsal result.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * local_only=true, rehearsal_only=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v53.0';
const GENESIS_HASH   = '0'.repeat(64);

export const REHEARSAL_LEDGER_EVENT_TYPES = [
  'RELEASE_SANDBOX_CREATED',
  'SANDBOX_POLICY_VERIFIED',
  'RELEASE_COMMANDS_SIMULATED',
  'IMMUTABLE_REHEARSAL_PLAN_READY',
  'RELEASE_REHEARSAL_READY',
  'RELEASE_REHEARSAL_BLOCKED',
];

export const REHEARSAL_LEDGER_STATUSES = [
  'REHEARSAL_LEDGER_BLOCKED_EVENT_TYPE',
  'REHEARSAL_LEDGER_BLOCKED_EVIDENCE',
  'REHEARSAL_LEDGER_BLOCKED_REHEARSAL_ID',
  'REHEARSAL_LEDGER_BLOCKED_TAMPER',
  'REHEARSAL_LEDGER_READY',
];

const READY_EVENTS = [
  'RELEASE_SANDBOX_CREATED',
  'SANDBOX_POLICY_VERIFIED',
  'RELEASE_COMMANDS_SIMULATED',
  'IMMUTABLE_REHEARSAL_PLAN_READY',
  'RELEASE_REHEARSAL_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

let _ledger = [];

export function _resetRehearsalLedgerForTest() {
  _ledger = [];
}

function _locked() {
  return {
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_execution_allowed: false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
    local_only:                true,
    rehearsal_only:            true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Append a rehearsal ledger event.
 */
export function appendRehearsalLedgerEvent(params = {}) {
  const {
    event_type,
    actor_id,
    rehearsal_id,
    evidence_refs,
    evidence_source,
    rehearsal_report_id,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (!REHEARSAL_LEDGER_EVENT_TYPES.includes(event_type)) {
    return {
      appended: false,
      reason:   `unknown_event_type:${event_type}`,
      status:   'REHEARSAL_LEDGER_BLOCKED_EVENT_TYPE',
      ..._locked(),
    };
  }

  // Ready events require rehearsal_id and evidence_refs
  if (READY_EVENTS.includes(event_type)) {
    if (!rehearsal_id) {
      return {
        appended: false,
        reason:   'rehearsal_id_required_for_ready_event',
        status:   'REHEARSAL_LEDGER_BLOCKED_REHEARSAL_ID',
        ..._locked(),
      };
    }
    if (!evidence_refs || (Array.isArray(evidence_refs) && evidence_refs.length === 0)) {
      return {
        appended: false,
        reason:   'evidence_refs_required_for_ready_event',
        status:   'REHEARSAL_LEDGER_BLOCKED_EVIDENCE',
        ..._locked(),
      };
    }
    if (evidence_source && evidence_source !== 'go-core') {
      return {
        appended: false,
        reason:   'evidence_source_must_be_go_core',
        status:   'REHEARSAL_LEDGER_BLOCKED_EVIDENCE',
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
    actor_id:           actor_id ?? null,
    rehearsal_id:       rehearsal_id ?? null,
    evidence_refs:      evidence_refs ?? null,
    evidence_source:    evidence_source ?? null,
    rehearsal_report_id: rehearsal_report_id ?? null,
    timestamp:          now,
  };

  const chain_hash = _sha256(`${prev_hash}:${JSON.stringify(event_body)}`);

  const entry = {
    event_id,
    ...event_body,
    prev_hash,
    chain_hash,
    index:        _ledger.length,
    local_only:   true,
    rehearsal_only: true,
    ..._locked(),
  };

  _ledger.push(entry);

  return { appended: true, event_id, chain_hash, index: entry.index, ..._locked() };
}

/**
 * Verify the rehearsal ledger chain integrity.
 */
export function verifyRehearsalLedgerChain() {
  if (_ledger.length === 0) {
    return {
      valid:             true,
      entries:           0,
      status:            'REHEARSAL_LEDGER_READY',
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
        status:            'REHEARSAL_LEDGER_BLOCKED_TAMPER',
        schema_version:    SCHEMA_VERSION,
        tampered_at_index: i,
        ..._locked(),
      };
    }
    const event_body = {
      event_type:          entry.event_type,
      actor_id:            entry.actor_id,
      rehearsal_id:        entry.rehearsal_id,
      evidence_refs:       entry.evidence_refs,
      evidence_source:     entry.evidence_source,
      rehearsal_report_id: entry.rehearsal_report_id,
      timestamp:           entry.timestamp,
    };
    const expected = _sha256(`${prev}:${JSON.stringify(event_body)}`);
    if (entry.chain_hash !== expected) {
      return {
        valid:             false,
        entries:           _ledger.length,
        status:            'REHEARSAL_LEDGER_BLOCKED_TAMPER',
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
    status:            'REHEARSAL_LEDGER_READY',
    schema_version:    SCHEMA_VERSION,
    tampered_at_index: null,
    ..._locked(),
  };
}

/**
 * Read current ledger state.
 */
export function readRehearsalLedger() {
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

if (process.argv[1] && process.argv[1].endsWith('release-rehearsal-ledger.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');

  const chain = verifyRehearsalLedgerChain();

  if (json) {
    console.log(JSON.stringify({ ...chain, ...readRehearsalLedger() }, null, 2));
  } else {
    console.log(`rehearsal_ledger_status: ${chain.status}`);
    console.log(`entries: ${chain.entries}`);
    console.log(`valid: ${chain.valid}`);
  }

  process.exit(chain.valid ? 0 : 1);
}
