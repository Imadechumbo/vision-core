#!/usr/bin/env node
/**
 * Release Evidence Chain Validator — V17.0
 *
 * Validates that all required ledger events for a release are present,
 * properly ordered, and integrity-verified against the audit ledger.
 * Classification only — never executes, deploys, or promotes.
 *
 * REGRA ABSOLUTA:
 * - deploy_performed=false always.
 * - tag_created=false always.
 * - stable_promoted=false always.
 * - Reads ledger; never writes to it directly.
 */

import { createHash }                       from 'crypto';
import { readFileSync, existsSync }         from 'fs';
import { resolve }                          from 'path';

const SCHEMA_VERSION = 'v17.0';

const REQUIRED_CHAIN_EVENTS = [
  'RELEASE_PLAN_CREATED',
  'RELEASE_SIMULATED',
  'MANUAL_RELEASE_GATE_CHECKED',
  'TAG_DRY_RUN_CHECKED',
  'ROLLBACK_DRILL_EXECUTED',
  'PASS_GOLD_AUTHORITY_BOUND',
];

const CHAIN_VALIDATOR_STATUSES = [
  'CHAIN_VALID',                    // all required events present, chain intact
  'CHAIN_BLOCKED_NO_LEDGER',        // ledger file not found
  'CHAIN_BLOCKED_EMPTY',            // ledger has no events
  'CHAIN_BLOCKED_INTEGRITY',        // hash chain broken
  'CHAIN_BLOCKED_MISSING_EVENTS',   // required event types absent
  'CHAIN_BLOCKED_WRONG_ORDER',      // events out of required order
];

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * @param {Object}   input
 * @param {string}   input.ledgerPath        - Path to events.ndjson
 * @param {string[]} input.requiredEvents    - Override required event list
 * @param {boolean}  input.strictOrder       - Enforce ordering (default true)
 * @param {string}   input.gitHead
 * @param {string}   input.branch
 */
function validateEvidenceChain(input = {}) {
  const {
    ledgerPath    = resolve(process.cwd(), '.vision', 'ledger', 'events.ndjson'),
    requiredEvents = REQUIRED_CHAIN_EVENTS,
    strictOrder   = true,
    gitHead       = null,
    branch        = null,
  } = input;

  const validatorId = _buildId(gitHead, branch);
  const checkedAt   = new Date().toISOString();

  // ── Ledger existence ─────────────────────────────────────────────
  if (!existsSync(ledgerPath)) {
    return _buildResult(validatorId, 'CHAIN_BLOCKED_NO_LEDGER', [], [], [], checkedAt, gitHead, branch, {
      missing_reason: 'Ledger file not found',
      ledger_path:    ledgerPath,
    });
  }

  // ── Parse NDJSON ─────────────────────────────────────────────────
  const raw    = readFileSync(ledgerPath, 'utf-8');
  const lines  = raw.split('\n').filter(Boolean);
  const events = lines.map((l, i) => {
    try { return JSON.parse(l); } catch { return { _parse_error: true, _line: i }; }
  });

  if (events.length === 0) {
    return _buildResult(validatorId, 'CHAIN_BLOCKED_EMPTY', events, [], [], checkedAt, gitHead, branch, {
      missing_reason: 'Ledger is empty',
    });
  }

  // ── Hash chain integrity ─────────────────────────────────────────
  const integrityResult = _verifyChain(events);
  if (!integrityResult.valid) {
    return _buildResult(validatorId, 'CHAIN_BLOCKED_INTEGRITY', events, [], [], checkedAt, gitHead, branch, {
      integrity_broken_at: integrityResult.broken_at_index,
      integrity_reason:    integrityResult.reason,
    });
  }

  // ── Required event coverage ──────────────────────────────────────
  const foundTypes  = events.map(e => e.event_type);
  const missing     = requiredEvents.filter(r => !foundTypes.includes(r));
  if (missing.length > 0) {
    return _buildResult(validatorId, 'CHAIN_BLOCKED_MISSING_EVENTS', events, missing, [], checkedAt, gitHead, branch, {
      found_types:    [...new Set(foundTypes)],
      missing_events: missing,
    });
  }

  // ── Order check ──────────────────────────────────────────────────
  if (strictOrder) {
    const orderViolations = _checkOrder(events, requiredEvents);
    if (orderViolations.length > 0) {
      return _buildResult(validatorId, 'CHAIN_BLOCKED_WRONG_ORDER', events, [], orderViolations, checkedAt, gitHead, branch, {
        order_violations: orderViolations,
      });
    }
  }

  // ── All good ─────────────────────────────────────────────────────
  return _buildResult(validatorId, 'CHAIN_VALID', events, [], [], checkedAt, gitHead, branch, {
    chain_length:         events.length,
    required_events_met:  requiredEvents,
  });
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _verifyChain(events) {
  const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev._parse_error) return { valid: false, broken_at_index: i, reason: 'parse_error' };

    const stored     = ev.chain_hash;
    const recomputed = _recomputeHash(ev);
    if (stored !== recomputed) {
      return { valid: false, broken_at_index: i, reason: 'hash_mismatch' };
    }
    const expectedPrev = i === 0 ? GENESIS : events[i - 1].chain_hash;
    if (ev.prev_hash !== expectedPrev) {
      return { valid: false, broken_at_index: i, reason: 'prev_hash_mismatch' };
    }
  }
  return { valid: true, broken_at_index: null, reason: null };
}

function _recomputeHash(eventBody) {
  const clone = { ...eventBody, chain_hash: null };
  return createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}

function _checkOrder(events, requiredEvents) {
  const violations = [];
  const positions  = requiredEvents.map(type => {
    const idx = events.findIndex(e => e.event_type === type);
    return { type, position: idx };
  }).filter(e => e.position >= 0);

  for (let i = 1; i < positions.length; i++) {
    if (positions[i].position < positions[i - 1].position) {
      violations.push({
        event:    positions[i].type,
        before:   positions[i - 1].type,
        at_index: positions[i].position,
      });
    }
  }
  return violations;
}

function _buildResult(validatorId, status, events, missingEvents, orderViolations, checkedAt, gitHead, branch, extra = {}) {
  const chainValid = status === 'CHAIN_VALID';
  return {
    schema_version:          SCHEMA_VERSION,
    chain_validator_id:      validatorId,
    chain_validator_status:  status,
    chain_valid:             chainValid,
    chain_ready:             chainValid,
    total_events:            events.filter(e => !e._parse_error).length,
    missing_required_events: missingEvents,
    order_violations:        orderViolations,
    checked_at:              checkedAt,
    git_head:                gitHead,
    branch:                  branch,
    ...extra,

    // Invariants — always false
    deploy_performed:  false,
    deploy_allowed:    false,
    tag_created:       false,
    stable_promoted:   false,
    release_performed: false,

    note: 'Evidence chain validator — read-only classification. Never executes in V17.0',
  };
}

function _buildId(gitHead, branch) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const raw   = `${gitHead || 'unknown'}:${branch || 'unknown'}:${Date.now()}:${nonce}`;
  return `chainval_${createHash('sha256').update(raw).digest('hex').slice(0, 12)}`;
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('release-evidence-chain-validator.mjs')) {
  _runCLI();
}

function _runCLI() {
  const args  = process.argv.slice(2);
  const flags = {
    json:           false,
    ledgerPath:     null,
    gitHead:        null,
    branch:         null,
    noStrictOrder:  false,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--json':            flags.json          = true; break;
      case '--ledger':          flags.ledgerPath    = args[++i] || null; break;
      case '--git-head':        flags.gitHead       = args[++i] || null; break;
      case '--branch':          flags.branch        = args[++i] || null; break;
      case '--no-strict-order': flags.noStrictOrder = true; break;
      default: break;
    }
  }

  const result = validateEvidenceChain({
    ledgerPath:    flags.ledgerPath || undefined,
    strictOrder:   !flags.noStrictOrder,
    gitHead:       flags.gitHead,
    branch:        flags.branch,
  });

  if (flags.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else {
    process.stdout.write(`chain_validator_status: ${result.chain_validator_status}\n`);
    process.stdout.write(`chain_valid: ${result.chain_valid}\n`);
    process.stdout.write(`total_events: ${result.total_events}\n`);
    if (result.missing_required_events.length > 0) {
      process.stdout.write(`missing_events: ${result.missing_required_events.join(', ')}\n`);
    }
  }
  process.exit(result.chain_valid ? 0 : 2);
}

export {
  validateEvidenceChain,
  REQUIRED_CHAIN_EVENTS,
  CHAIN_VALIDATOR_STATUSES,
  SCHEMA_VERSION as CHAIN_VALIDATOR_SCHEMA_VERSION,
};
