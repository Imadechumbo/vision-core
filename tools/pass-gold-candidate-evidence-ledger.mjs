#!/usr/bin/env node
/**
 * PASS GOLD Candidate Evidence Ledger — V34.0
 *
 * Append-only ledger for PASS GOLD candidate drill events.
 * Records candidate drill outcomes for audit without creating
 * real evidence, tags, or promotions.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_created=false always.
 * - stable_promoted=false always.
 * - ledger is append-only; no entry can be mutated or deleted.
 * - candidate_is_local_drill=true for all drill entries.
 */

const SCHEMA_VERSION = 'v34.0';

export const LEDGER_EVENT_TYPES = [
  'RUNTIME_BRIDGE_READY',
  'PASS_GOLD_CANDIDATE_DRILL_READY',
  'PASS_GOLD_CANDIDATE_BLOCKED',
  'PASS_GOLD_CANDIDATE_CONFIRMED_LOCAL',
];

export const LEDGER_STATUSES = [
  'LEDGER_BLOCKED_INVALID_EVENT',
  'LEDGER_BLOCKED_IMMUTABILITY',
  'LEDGER_APPEND_OK',
];

// ═══════════════════════════════════════════════════════════════════
// IN-MEMORY STORE (append-only)
// ═══════════════════════════════════════════════════════════════════

const _entries = [];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:     SCHEMA_VERSION,
    ledger_status:      status,
    ledger_append_ok:   false,
    entry_id:           null,
    deploy_allowed:     false,
    promotion_allowed:  false,
    stable_allowed:     false,
    tag_created:        false,
    stable_promoted:    false,
    blocking_reason:    extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

function _makeEntryId(event_type, seq) {
  return `ledger-${event_type.toLowerCase().replace(/_/g, '-')}-${seq}-${Date.now()}`;
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Append an event to the candidate evidence ledger.
 *
 * @param {Object} options
 * @param {string} options.event_type           - One of LEDGER_EVENT_TYPES
 * @param {string|null} options.mission_id      - Mission identifier
 * @param {string|null} options.evidence_receipt_id - Receipt identifier
 * @param {string|null} options.evidence_source - Must be 'go-core' for non-blocked events
 * @param {string|null} options.drill_status    - Drill status from candidate drill
 * @param {Object}      options.metadata        - Additional metadata (arbitrary)
 * @returns {Object} Ledger append result
 */
export function appendCandidateLedgerEntry(options = {}) {
  const {
    event_type          = null,
    mission_id          = null,
    evidence_receipt_id = null,
    evidence_source     = null,
    drill_status        = null,
    metadata            = {},
  } = options;

  // Gate 1: event_type must be valid
  if (!event_type || !LEDGER_EVENT_TYPES.includes(event_type)) {
    return _blocked('LEDGER_BLOCKED_INVALID_EVENT', {
      blocking_reason: `invalid_event_type:${event_type ?? 'null'}`,
    });
  }

  // Gate 2: PASS_GOLD_CANDIDATE_DRILL_READY and PASS_GOLD_CANDIDATE_CONFIRMED_LOCAL
  //         require go-core evidence source
  if (
    (event_type === 'PASS_GOLD_CANDIDATE_DRILL_READY' || event_type === 'PASS_GOLD_CANDIDATE_CONFIRMED_LOCAL') &&
    evidence_source !== 'go-core'
  ) {
    return _blocked('LEDGER_BLOCKED_INVALID_EVENT', {
      event_type,
      evidence_source,
      blocking_reason: `evidence_source_not_go_core:${evidence_source ?? 'null'}`,
    });
  }

  // Gate 3: append-only — sequence is always increasing
  const seq = _entries.length + 1;
  const entry_id = _makeEntryId(event_type, seq);
  const entry = {
    entry_id,
    seq,
    schema_version:       SCHEMA_VERSION,
    event_type,
    mission_id,
    evidence_receipt_id,
    evidence_source,
    drill_status,
    candidate_is_local_drill: true,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
    tag_created:              false,
    stable_promoted:          false,
    appended_at:              new Date().toISOString(),
    metadata,
  };

  // Immutability check: ensure no existing entry has same entry_id
  if (_entries.some(e => e.entry_id === entry_id)) {
    return _blocked('LEDGER_BLOCKED_IMMUTABILITY', {
      entry_id,
      blocking_reason: 'duplicate_entry_id',
    });
  }

  _entries.push(Object.freeze(entry));

  return {
    schema_version:    SCHEMA_VERSION,
    ledger_status:     'LEDGER_APPEND_OK',
    ledger_append_ok:  true,
    entry_id,
    seq,
    event_type,
    mission_id,
    evidence_receipt_id,
    evidence_source,
    drill_status,
    candidate_is_local_drill: true,
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    tag_created:       false,
    stable_promoted:   false,
    total_entries:     _entries.length,
    blocking_reason:   null,
  };
}

/**
 * Read the full ledger (read-only snapshot).
 * @returns {Object} Ledger snapshot
 */
export function readCandidateLedger() {
  return {
    schema_version:    SCHEMA_VERSION,
    total_entries:     _entries.length,
    entries:           _entries.map(e => Object.freeze({ ...e })),
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
  };
}

/**
 * Get the last N entries from the ledger.
 * @param {number} n
 * @returns {Object[]}
 */
export function getLastLedgerEntries(n = 10) {
  return _entries.slice(-Math.max(0, n)).map(e => ({ ...e }));
}

/**
 * Reset ledger (test use only — not for production use).
 */
export function _resetLedgerForTest() {
  _entries.splice(0, _entries.length);
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('pass-gold-candidate-evidence-ledger.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const read      = args.includes('--read');
  const eventType = args.find((_, i) => args[i-1] === '--event-type') ?? 'RUNTIME_BRIDGE_READY';
  const missionId = args.find((_, i) => args[i-1] === '--mission-id') ?? `mission-cli-${Date.now()}`;
  const receiptId = args.find((_, i) => args[i-1] === '--receipt-id') ?? `receipt-cli-${Date.now()}`;

  if (read) {
    const ledger = readCandidateLedger();
    if (json) {
      console.log(JSON.stringify(ledger, null, 2));
    } else {
      console.log(`total_entries  : ${ledger.total_entries}`);
      console.log(`deploy_allowed : ${ledger.deploy_allowed}`);
    }
    process.exit(0);
  }

  const result = appendCandidateLedgerEntry({
    event_type:          eventType,
    mission_id:          missionId,
    evidence_receipt_id: receiptId,
    evidence_source:     'go-core',
    drill_status:        'FULL_CANDIDATE_DRILL_READY',
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`ledger_status      : ${result.ledger_status}`);
    console.log(`ledger_append_ok   : ${result.ledger_append_ok}`);
    console.log(`entry_id           : ${result.entry_id}`);
    console.log(`deploy_allowed     : ${result.deploy_allowed}`);
    console.log(`promotion_allowed  : ${result.promotion_allowed}`);
    console.log(`tag_created        : ${result.tag_created}`);
    console.log(`stable_promoted    : ${result.stable_promoted}`);
  }

  process.exit(result.ledger_append_ok ? 0 : 1);
}
