#!/usr/bin/env node
/**
 * Release Audit Ledger — V16.4
 *
 * Append-only audit ledger with hash chain integrity.
 * Each event contains a SHA-256 hash of the previous event (chain_hash).
 * Ledger file: .vision/ledger/events.ndjson (one JSON per line).
 *
 * REGRA ABSOLUTA:
 * - Ledger is append-only. Never modifies existing entries.
 * - No secrets, no tokens in ledger.
 * - Ledger never creates deploy, tag, or stable promotion.
 * - deploy_performed=false always.
 */

import { createHash }                                         from 'crypto';
import { mkdirSync, appendFileSync, readFileSync, existsSync } from 'fs';
import { join, resolve, dirname }                             from 'path';

const SCHEMA_VERSION = 'v16.4';

const LEDGER_EVENT_TYPES = [
  'RELEASE_PLAN_CREATED',
  'RELEASE_SIMULATED',
  'MANUAL_RELEASE_GATE_CHECKED',
  'TAG_DRY_RUN_CHECKED',
  'TAG_CREATED',
  'STABLE_GATE_CHECKED',
  'ROLLBACK_DRILL_EXECUTED',
  'BLOCKED_DECISION',
  'PASS_GOLD_AUTHORITY_BOUND',
];

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// ═══════════════════════════════════════════════════════════════════
// LEDGER CLASS
// ═══════════════════════════════════════════════════════════════════

class ReleaseLedger {
  constructor(ledgerPath = null) {
    this._path = ledgerPath || resolve(process.cwd(), '.vision', 'ledger', 'events.ndjson');
  }

  /**
   * Appends a new event to the ledger.
   * @param {Object} params
   * @param {string} params.eventType    - One of LEDGER_EVENT_TYPES
   * @param {string} params.actor        - Who or what triggered this event
   * @param {string} params.gitHead      - Current git HEAD SHA
   * @param {string} params.branch       - Current branch
   * @param {Object} params.evidenceRefs - References to evidence (no values, only IDs)
   * @param {Object} params.authorityRefs- References to authority contracts (no values)
   * @param {Object} params.payload      - Event-specific data (no secrets/tokens)
   */
  appendEvent({ eventType, actor = 'system', gitHead = null, branch = null, evidenceRefs = {}, authorityRefs = {}, payload = {} } = {}) {
    if (!LEDGER_EVENT_TYPES.includes(eventType)) {
      throw new Error(`Invalid event type: ${eventType}. Must be one of: ${LEDGER_EVENT_TYPES.join(', ')}`);
    }
    if (eventType === 'RELEASE_PLAN_CREATED' || eventType === 'RELEASE_SIMULATED' || eventType === 'TAG_CREATED' || eventType === 'STABLE_GATE_CHECKED') {
      if (!evidenceRefs.evidence_receipt_id && !evidenceRefs.evidence_source) {
        const err = new Error(`Release-critical event ${eventType} requires evidence references`);
        err.code  = 'EVIDENCE_REQUIRED';
        throw err;
      }
    }

    const prevHash   = this._getLastHash();
    const timestamp  = new Date().toISOString();
    const eventId    = _buildEventId(eventType, gitHead, timestamp);
    const eventBody  = {
      schema_version:  SCHEMA_VERSION,
      event_id:        eventId,
      event_type:      eventType,
      timestamp,
      actor,
      git_head:        gitHead,
      branch,
      evidence_refs:   evidenceRefs,
      authority_refs:  authorityRefs,
      payload,
      prev_hash:       prevHash,
      chain_hash:      null,
      deploy_performed:   false,
      tag_created_real:   eventType === 'TAG_CREATED' ? false : undefined,
      stable_promoted:    false,
    };
    eventBody.chain_hash = _hashEvent(eventBody);

    _ensureDir(dirname(this._path));
    appendFileSync(this._path, JSON.stringify(eventBody) + '\n', 'utf-8');
    return eventBody;
  }

  /**
   * Reads all events from the ledger.
   */
  readAll() {
    if (!existsSync(this._path)) return [];
    const lines = readFileSync(this._path, 'utf-8').split('\n').filter(Boolean);
    return lines.map(l => JSON.parse(l));
  }

  /**
   * Validates the hash chain integrity.
   * Returns { valid, broken_at_index, total_events }
   */
  validateChain() {
    const events = this.readAll();
    if (events.length === 0) return { valid: true, broken_at_index: null, total_events: 0 };

    for (let i = 0; i < events.length; i++) {
      const ev      = events[i];
      const stored  = ev.chain_hash;
      const recomputed = _recomputeHash(ev);
      if (stored !== recomputed) {
        return { valid: false, broken_at_index: i, total_events: events.length, event_id: ev.event_id };
      }
      if (i > 0 && ev.prev_hash !== events[i - 1].chain_hash) {
        return { valid: false, broken_at_index: i, total_events: events.length, event_id: ev.event_id, reason: 'prev_hash_mismatch' };
      }
    }
    return { valid: true, broken_at_index: null, total_events: events.length };
  }

  _getLastHash() {
    const events = this.readAll();
    if (events.length === 0) return GENESIS_HASH;
    return events[events.length - 1].chain_hash || GENESIS_HASH;
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function _hashEvent(eventBody) {
  const clone = { ...eventBody, chain_hash: null };
  return createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}

function _recomputeHash(eventBody) {
  const clone = { ...eventBody, chain_hash: null };
  return createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}

function _buildEventId(eventType, gitHead, timestamp) {
  const nonce = Math.random().toString(36).slice(2, 8);
  const raw   = `${eventType}:${gitHead || 'unknown'}:${timestamp}:${nonce}`;
  return `evt_${createHash('sha256').update(raw).digest('hex').slice(0, 12)}`;
}

function _ensureDir(dirPath) {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════
// FUNCTIONAL API (stateless, ledger path as param)
// ═══════════════════════════════════════════════════════════════════

function appendLedgerEvent(ledgerPath, params) {
  return new ReleaseLedger(ledgerPath).appendEvent(params);
}

function readLedger(ledgerPath) {
  return new ReleaseLedger(ledgerPath).readAll();
}

function validateLedgerChain(ledgerPath) {
  return new ReleaseLedger(ledgerPath).validateChain();
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('release-audit-ledger.mjs')) {
  _runCLI();
}

function _runCLI() {
  const args   = process.argv.slice(2);
  const cmd    = args[0] || 'validate';
  const flags  = { json: false, ledgerPath: null, eventType: null, actor: 'cli', gitHead: null };
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--json':        flags.json       = true; break;
      case '--ledger':      flags.ledgerPath = args[++i] || null; break;
      case '--event-type':  flags.eventType  = args[++i] || null; break;
      case '--actor':       flags.actor      = args[++i] || 'cli'; break;
      case '--git-head':    flags.gitHead    = args[++i] || null; break;
      default: break;
    }
  }
  const ledgerPath = flags.ledgerPath || resolve(process.cwd(), '.vision', 'ledger', 'events.ndjson');

  if (cmd === 'validate') {
    const result = validateLedgerChain(ledgerPath);
    if (flags.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    else process.stdout.write(`chain_valid: ${result.valid}\ntotal_events: ${result.total_events}\n`);
    process.exit(result.valid ? 0 : 2);
  } else if (cmd === 'read') {
    const events = readLedger(ledgerPath);
    if (flags.json) process.stdout.write(JSON.stringify(events, null, 2) + '\n');
    else process.stdout.write(`total_events: ${events.length}\n`);
    process.exit(0);
  } else {
    process.stderr.write(`Unknown command: ${cmd}. Use: validate, read\n`);
    process.exit(1);
  }
}

export {
  ReleaseLedger,
  appendLedgerEvent,
  readLedger,
  validateLedgerChain,
  LEDGER_EVENT_TYPES,
  GENESIS_HASH as LEDGER_GENESIS_HASH,
  SCHEMA_VERSION as LEDGER_SCHEMA_VERSION,
};
