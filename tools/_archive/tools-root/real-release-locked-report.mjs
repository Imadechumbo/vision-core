#!/usr/bin/env node
/**
 * Real Release Locked Report — V59.0
 *
 * Aggregates gate, lock, readiness, finalizer and ledger into a
 * single immutable locked report. Does NOT execute or unlock production.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always. immutable=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v59.0';

export const LOCKED_REPORT_STATUSES = [
  'LOCKED_REPORT_BLOCKED_GATE',
  'LOCKED_REPORT_BLOCKED_LOCK',
  'LOCKED_REPORT_BLOCKED_READINESS',
  'LOCKED_REPORT_BLOCKED_FINALIZER',
  'LOCKED_REPORT_BLOCKED_LEDGER',
  'LOCKED_REPORT_READY',
];

export const LOCKED_REPORT_SAFE_NEXT_ACTIONS = [
  'review_gate_status',
  'verify_production_lock_active',
  'review_readiness_matrix',
  'verify_evidence_finalizer',
  'review_ledger_chain',
  'do_not_execute_production_in_this_phase',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    unlock_required:              true,
    human_review_required:        true,
    immutable:                    true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:         SCHEMA_VERSION,
    report_status:          status,
    report_ready:           false,
    blocking_reason,
    safe_next_actions:      LOCKED_REPORT_SAFE_NEXT_ACTIONS,
    ...extra,
    ..._locked(),
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    unlock_required:              true,
    human_review_required:        true,
    immutable:                    true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Build a real release locked report.
 */
export function buildRealReleaseLockedReport(params = {}) {
  const {
    gate,
    lock,
    readiness,
    finalizer,
    ledger_chain,
    ledger_event_ids,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const report_hash = _sha256(`fixture-locked-report:${now}`).slice(0, 48);
    const report_id   = report_hash.slice(0, 24);
    return {
      schema_version:               SCHEMA_VERSION,
      report_id,
      report_status:                'LOCKED_REPORT_READY',
      report_ready:                 true,
      gate_status:                  'REAL_GATE_READY_LOCKED',
      lock_status:                  'PRODUCTION_LOCK_ACTIVE',
      readiness_status:             'REAL_READINESS_READY_LOCKED',
      finalizer_status:             'FINALIZER_READY_LOCKED',
      ledger_entries:               4,
      ledger_chain_valid:           true,
      ledger_event_ids:             ['evt-1', 'evt-2', 'evt-3', 'evt-4'],
      report_hash,
      created_at:                   now,
      blocking_reason:              null,
      safe_next_actions:            LOCKED_REPORT_SAFE_NEXT_ACTIONS,
      ..._locked(),
    };
  }

  // Gate required
  if (!gate || gate.gate_ready !== true) {
    return _blocked('LOCKED_REPORT_BLOCKED_GATE', 'gate_not_ready', {
      gate_status: gate?.gate_status ?? null,
    });
  }

  // Lock required
  if (!lock || lock.lock_active !== true) {
    return _blocked('LOCKED_REPORT_BLOCKED_LOCK', 'lock_not_active', {
      lock_status: lock?.lock_status ?? null,
    });
  }

  // Readiness required
  const readinessStatus = readiness?.real_release_readiness_status ?? readiness?.readiness_status ?? null;
  if (!readiness || readinessStatus !== 'REAL_READINESS_READY_LOCKED') {
    return _blocked('LOCKED_REPORT_BLOCKED_READINESS', 'readiness_not_ready_locked', {
      readiness_status: readinessStatus,
    });
  }

  // Finalizer required
  if (!finalizer || finalizer.finalizer_ready !== true) {
    return _blocked('LOCKED_REPORT_BLOCKED_FINALIZER', 'finalizer_not_ready', {
      finalizer_status: finalizer?.finalizer_status ?? null,
    });
  }

  // Ledger required
  if (!ledger_chain || ledger_chain.valid !== true) {
    return _blocked('LOCKED_REPORT_BLOCKED_LEDGER', 'ledger_chain_invalid', {
      ledger_chain_valid: ledger_chain?.valid ?? null,
    });
  }

  const events = Array.isArray(ledger_event_ids) ? ledger_event_ids : [];
  if (events.length === 0) {
    return _blocked('LOCKED_REPORT_BLOCKED_LEDGER', 'ledger_event_ids_required');
  }

  const report_hash = _sha256([
    gate.gate_id ?? '',
    lock.lock_id ?? '',
    readinessStatus,
    finalizer.finalizer_id ?? '',
    events.join(','),
    now,
  ].join(':')).slice(0, 48);

  const report_id = report_hash.slice(0, 24);

  return {
    schema_version:               SCHEMA_VERSION,
    report_id,
    report_status:                'LOCKED_REPORT_READY',
    report_ready:                 true,
    gate_status:                  gate.gate_status,
    lock_status:                  lock.lock_status,
    readiness_status:             readinessStatus,
    finalizer_status:             finalizer.finalizer_status,
    ledger_entries:               ledger_chain.entries ?? events.length,
    ledger_chain_valid:           true,
    ledger_event_ids:             events,
    report_hash,
    created_at:                   now,
    blocking_reason:              null,
    safe_next_actions:            LOCKED_REPORT_SAFE_NEXT_ACTIONS,
    ..._locked(),
  };
}

/**
 * Render a human-readable locked report summary.
 */
export function renderRealReleaseLockedReport(report) {
  if (!report) return 'locked_report: null';
  const lines = [
    `report_status                : ${report.report_status ?? 'UNKNOWN'}`,
    `report_id                    : ${report.report_id ?? 'none'}`,
    `gate_status                  : ${report.gate_status ?? 'none'}`,
    `lock_status                  : ${report.lock_status ?? 'none'}`,
    `readiness_status             : ${report.readiness_status ?? 'none'}`,
    `finalizer_status             : ${report.finalizer_status ?? 'none'}`,
    `ledger_entries               : ${report.ledger_entries ?? 0}`,
    `ledger_chain_valid           : ${report.ledger_chain_valid ?? false}`,
    `production_execution_locked  : true`,
    `unlock_required              : true`,
    `immutable                    : true`,
    `human_review_required        : true`,
    `blocking_reason              : ${report.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-release-locked-report.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealReleaseLockedReport({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealReleaseLockedReport(result));
  }

  process.exit(result.report_ready ? 0 : 1);
}
