#!/usr/bin/env node
/**
 * Supervised Release Ledger Events — V44.0
 *
 * Append-only, hash-chained ledger for supervised release control plane events.
 * 7 event types covering the full supervised release lifecycle.
 * In-memory storage (never writes to disk — prevents stale ledger state in tests).
 *
 * REGRA ABSOLUTA:
 * - Ledger is append-only. Never modifies existing entries.
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - release_performed=false always.
 * - promote_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v44.0';

export const SUPERVISED_LEDGER_EVENT_TYPES = [
  'SUPERVISED_RC_CANDIDATE_DECLARED',
  'SUPERVISED_RELEASE_INTENT_CREATED',
  'SUPERVISED_INTENT_AUTHORITY_BOUND',
  'SUPERVISED_PROMOTION_PACKAGE_BUILT',
  'SUPERVISED_PROMOTION_REVIEW_REQUESTED',
  'SUPERVISED_PROMOTION_REVIEW_COMPLETED',
  'SUPERVISED_RELEASE_CONTROL_PLANE_CHECKED',
];

export const SUPERVISED_LEDGER_STATUSES = [
  'SUPERVISED_LEDGER_READY',
  'SUPERVISED_LEDGER_BLOCKED_EVENT_TYPE',
  'SUPERVISED_LEDGER_BLOCKED_INVARIANTS',
  'SUPERVISED_LEDGER_BLOCKED_PAYLOAD',
];

const GENESIS_HASH = '0'.repeat(64);

// In-memory ledger (append-only)
let _ledger = [];

export function _resetSupervisedLedgerForTest() {
  _ledger = [];
}

export function readSupervisedLedger() {
  return [..._ledger];
}

function _locked() {
  return {
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    tag_allowed:       false,
    release_performed: false,
    promote_performed: false,
  };
}

function _buildEventId(eventType, actorId, timestamp) {
  return createHash('sha256')
    .update(`${eventType}:${actorId ?? 'system'}:${timestamp}`)
    .digest('hex')
    .slice(0, 24);
}

function _buildChainHash(prevHash, eventBody) {
  return createHash('sha256')
    .update(`${prevHash}:${JSON.stringify(eventBody)}`)
    .digest('hex');
}

function _getLastHash() {
  if (_ledger.length === 0) return GENESIS_HASH;
  return _ledger[_ledger.length - 1].chain_hash;
}

// ═══════════════════════════════════════════════════════════════════
// APPEND EVENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Append a supervised release ledger event.
 *
 * @param {Object} params
 * @param {string} params.event_type          - One of SUPERVISED_LEDGER_EVENT_TYPES
 * @param {string} [params.actor_id]          - Who triggered this event
 * @param {string} [params.rc_id]             - Supervised RC id (when applicable)
 * @param {string} [params.intent_id]         - Release intent id (when applicable)
 * @param {string} [params.package_hash]      - Promotion package hash (when applicable)
 * @param {string} [params.review_id]         - Review id (when applicable)
 * @param {string} [params.evidence_source]   - Evidence source (must be 'go-core' when set)
 * @param {Object} [params.payload]           - Additional event data (no secrets)
 * @param {string} [params._mock_timestamp]   - Override timestamp for tests
 * @returns {Object} Ledger append result
 */
export function appendSupervisedLedgerEvent(params = {}) {
  const {
    event_type,
    actor_id       = 'system',
    rc_id          = null,
    intent_id      = null,
    package_hash   = null,
    review_id      = null,
    evidence_source = null,
    payload        = {},
    _mock_timestamp,
  } = params;

  // Gate 1: valid event type
  if (!SUPERVISED_LEDGER_EVENT_TYPES.includes(event_type)) {
    return {
      schema_version:           SCHEMA_VERSION,
      supervised_ledger_status: 'SUPERVISED_LEDGER_BLOCKED_EVENT_TYPE',
      supervised_ledger_ready:  false,
      event_id:                 null,
      seq:                      null,
      chain_hash:               null,
      blocking_reason:          `invalid_event_type:${event_type}`,
      ..._locked(),
    };
  }

  // Gate 2: evidence_source must be go-core when provided
  if (evidence_source !== null && evidence_source !== 'go-core') {
    return {
      schema_version:           SCHEMA_VERSION,
      supervised_ledger_status: 'SUPERVISED_LEDGER_BLOCKED_INVARIANTS',
      supervised_ledger_ready:  false,
      event_id:                 null,
      seq:                      null,
      chain_hash:               null,
      blocking_reason:          `evidence_source_invalid:${evidence_source}`,
      ..._locked(),
    };
  }

  // Gate 3: payload must not contain dangerous fields
  if (payload && (payload.deploy_allowed === true || payload.promotion_allowed === true)) {
    return {
      schema_version:           SCHEMA_VERSION,
      supervised_ledger_status: 'SUPERVISED_LEDGER_BLOCKED_INVARIANTS',
      supervised_ledger_ready:  false,
      event_id:                 null,
      seq:                      null,
      chain_hash:               null,
      blocking_reason:          'payload_invariants_violated',
      ..._locked(),
    };
  }

  const ts       = _mock_timestamp ?? new Date().toISOString();
  const seq      = _ledger.length;
  const prevHash = _getLastHash();
  const event_id = _buildEventId(event_type, actor_id, ts);

  const eventBody = {
    schema_version:  SCHEMA_VERSION,
    seq,
    event_id,
    event_type,
    actor_id,
    rc_id,
    intent_id,
    package_hash,
    review_id,
    evidence_source,
    timestamp:       ts,
    payload,
    prev_hash:       prevHash,
  };

  const chain_hash = _buildChainHash(prevHash, eventBody);
  const entry = { ...eventBody, chain_hash };

  // Append-only
  _ledger.push(entry);

  return {
    schema_version:           SCHEMA_VERSION,
    supervised_ledger_status: 'SUPERVISED_LEDGER_READY',
    supervised_ledger_ready:  true,
    event_id,
    seq,
    chain_hash,
    event_type,
    actor_id,
    rc_id,
    intent_id,
    package_hash,
    review_id,
    evidence_source,
    timestamp:                ts,
    ledger_size:              _ledger.length,
    blocking_reason:          null,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// VERIFY CHAIN INTEGRITY
// ═══════════════════════════════════════════════════════════════════

/**
 * Verify hash chain integrity of the ledger.
 * @returns {{ valid: boolean, entries: number, broken_at: number|null }}
 */
export function verifySupervisedLedgerChain() {
  if (_ledger.length === 0) {
    return { valid: true, entries: 0, broken_at: null };
  }

  let prevHash = GENESIS_HASH;
  for (let i = 0; i < _ledger.length; i++) {
    const entry = _ledger[i];
    const { chain_hash, ...bodyWithoutChain } = entry;
    const expectedChain = _buildChainHash(prevHash, bodyWithoutChain);
    if (chain_hash !== expectedChain) {
      return { valid: false, entries: _ledger.length, broken_at: i };
    }
    prevHash = chain_hash;
  }

  return { valid: true, entries: _ledger.length, broken_at: null };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('supervised-release-ledger-events.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const demo    = args.includes('--demo');

  if (demo) {
    // Append one event of each type to demonstrate
    _resetSupervisedLedgerForTest();
    const events = [];
    const ts = '2026-05-17T12:00:00.000Z';
    for (const eventType of SUPERVISED_LEDGER_EVENT_TYPES) {
      const r = appendSupervisedLedgerEvent({
        event_type:      eventType,
        actor_id:        'demo-operator',
        evidence_source: eventType.includes('INTENT') || eventType.includes('RC') || eventType.includes('PACKAGE') || eventType.includes('REVIEW') || eventType.includes('CONTROL') ? 'go-core' : null,
        _mock_timestamp: ts,
      });
      events.push(r);
    }
    const chain = verifySupervisedLedgerChain();
    if (json) {
      console.log(JSON.stringify({ events, chain }, null, 2));
    } else {
      for (const e of events) {
        console.log(`${e.supervised_ledger_status} seq=${e.seq} type=${e.event_type}`);
      }
      console.log(`chain valid=${chain.valid} entries=${chain.entries}`);
    }
    process.exit(chain.valid ? 0 : 1);
  }

  // Default: show event types
  if (json) {
    console.log(JSON.stringify({
      schema_version:  SCHEMA_VERSION,
      event_types:     SUPERVISED_LEDGER_EVENT_TYPES,
      statuses:        SUPERVISED_LEDGER_STATUSES,
      ledger_size:     _ledger.length,
    }, null, 2));
  } else {
    console.log('SUPERVISED_LEDGER_EVENT_TYPES:');
    SUPERVISED_LEDGER_EVENT_TYPES.forEach(t => console.log(`  ${t}`));
  }
  process.exit(0);
}
