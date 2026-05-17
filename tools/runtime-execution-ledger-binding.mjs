#!/usr/bin/env node
/**
 * Runtime Execution Ledger Binding — V36.2
 *
 * Binds a completed runtime execution evidence package (V36.1) to the
 * candidate evidence ledger (V34.0) by appending a RUNTIME_BRIDGE_READY
 * entry. Provides the authoritative binding between execution evidence
 * and the append-only audit ledger.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - evidence_source must be 'go-core'.
 * - Ledger entry is only appended when package is fully ready.
 */

import {
  appendCandidateLedgerEntry,
  readCandidateLedger,
  _resetLedgerForTest,
} from './pass-gold-candidate-evidence-ledger.mjs';

import { buildRuntimeExecutionEvidencePackage } from './runtime-execution-evidence-package.mjs';

export { _resetLedgerForTest };

const SCHEMA_VERSION = 'v36.2';

export const LEDGER_BINDING_STATUSES = [
  'LEDGER_BINDING_SKIPPED',
  'LEDGER_BINDING_BLOCKED_PACKAGE',
  'LEDGER_BINDING_BLOCKED_APPEND',
  'LEDGER_BINDING_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _skipped(extra = {}) {
  return {
    schema_version:         SCHEMA_VERSION,
    ledger_binding_status:  'LEDGER_BINDING_SKIPPED',
    ledger_binding_ready:   false,
    ledger_entry_id:        null,
    ledger_seq:             null,
    package_hash:           null,
    mission_id:             null,
    evidence_receipt_id:    null,
    evidence_source:        null,
    deploy_allowed:         false,
    promotion_allowed:      false,
    stable_allowed:         false,
    tag_allowed:            false,
    blocking_reason:        extra.blocking_reason ?? 'not_requested',
    ...extra,
  };
}

function _blocked(status, extra = {}) {
  return {
    schema_version:         SCHEMA_VERSION,
    ledger_binding_status:  status,
    ledger_binding_ready:   false,
    ledger_entry_id:        null,
    ledger_seq:             null,
    package_hash:           extra.package_hash ?? null,
    mission_id:             extra.mission_id ?? null,
    evidence_receipt_id:    null,
    evidence_source:        null,
    deploy_allowed:         false,
    promotion_allowed:      false,
    stable_allowed:         false,
    tag_allowed:            false,
    blocking_reason:        extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Bind runtime execution evidence package to candidate ledger.
 *
 * @param {Object}  options
 * @param {boolean} options.binding_requested     - Must be true to run (default: false)
 * @param {Object|null} options.evidence_package  - V36.1 package result (or null for fixture)
 * @param {boolean} options.fixture_mode          - Fixture mode for testing
 * @param {string|null} options._mock_timestamp   - Override timestamp (test mode)
 * @returns {Object} Ledger binding result
 */
export function bindRuntimeExecutionToLedger(options = {}) {
  const {
    binding_requested  = false,
    evidence_package   = null,
    fixture_mode       = false,
    _mock_timestamp    = null,
  } = options;

  if (!binding_requested && !fixture_mode) {
    return _skipped({ blocking_reason: 'binding_not_requested' });
  }

  // In fixture mode with no package, build a synthetic one
  let pkg = evidence_package;
  if (fixture_mode && !pkg) {
    pkg = buildRuntimeExecutionEvidencePackage({
      fixture_mode:    true,
      _mock_timestamp: _mock_timestamp,
    });
  }

  // Stage 1: Package must be ready
  if (!pkg || pkg.evidence_package_ready !== true) {
    return _blocked('LEDGER_BINDING_BLOCKED_PACKAGE', {
      blocking_reason: `package_not_ready:${pkg?.evidence_package_status ?? 'null'}`,
    });
  }

  // Stage 2: Append ledger entry
  const appendResult = appendCandidateLedgerEntry({
    event_type:          'RUNTIME_BRIDGE_READY',
    mission_id:          pkg.mission_id,
    evidence_receipt_id: pkg.evidence_receipt_id,
    evidence_source:     pkg.evidence_source,
    drill_status:        'RUNTIME_EXECUTION_BOUND',
    metadata: {
      package_hash:      pkg.package_hash,
      package_timestamp: pkg.package_timestamp,
      schema_version:    SCHEMA_VERSION,
    },
  });

  if (!appendResult.ledger_append_ok) {
    return _blocked('LEDGER_BINDING_BLOCKED_APPEND', {
      package_hash:    pkg.package_hash,
      mission_id:      pkg.mission_id,
      blocking_reason: `ledger_append_failed:${appendResult.blocking_reason}`,
    });
  }

  return {
    schema_version:        SCHEMA_VERSION,
    ledger_binding_status: 'LEDGER_BINDING_READY',
    ledger_binding_ready:  true,
    ledger_entry_id:       appendResult.entry_id,
    ledger_seq:            appendResult.seq,
    package_hash:          pkg.package_hash,
    mission_id:            pkg.mission_id,
    evidence_receipt_id:   pkg.evidence_receipt_id,
    evidence_source:       'go-core',
    total_ledger_entries:  appendResult.total_entries,
    deploy_allowed:        false,
    promotion_allowed:     false,
    stable_allowed:        false,
    tag_allowed:           false,
    blocking_reason:       null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-execution-ledger-binding.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const fixture   = args.includes('--fixture-mode');
  const requested = args.includes('--binding-requested');

  const result = bindRuntimeExecutionToLedger({
    binding_requested: requested,
    fixture_mode:      fixture,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`ledger_binding_status   : ${result.ledger_binding_status}`);
    console.log(`ledger_binding_ready    : ${result.ledger_binding_ready}`);
    console.log(`ledger_entry_id         : ${result.ledger_entry_id}`);
    console.log(`ledger_seq              : ${result.ledger_seq}`);
    console.log(`package_hash            : ${result.package_hash}`);
    console.log(`mission_id              : ${result.mission_id}`);
    console.log(`evidence_source         : ${result.evidence_source}`);
    console.log(`deploy_allowed          : ${result.deploy_allowed}`);
    console.log(`promotion_allowed       : ${result.promotion_allowed}`);
  }

  process.exit(result.ledger_binding_ready ? 0 : 1);
}
