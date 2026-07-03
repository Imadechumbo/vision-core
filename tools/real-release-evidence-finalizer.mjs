#!/usr/bin/env node
/**
 * Real Release Evidence Finalizer — V57.0
 *
 * Consolidates receipts, baselines, rehearsal, ledger and handoff into
 * an immutable locked evidence package. Does NOT execute or unlock production.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always. immutable=true always.
 */

import { sha256, makeLockedFlags } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v57.0';

export const FINALIZER_STATUSES = [
  'FINALIZER_BLOCKED_READINESS',
  'FINALIZER_BLOCKED_EVIDENCE',
  'FINALIZER_BLOCKED_LEDGER',
  'FINALIZER_BLOCKED_HASH',
  'FINALIZER_READY_LOCKED',
];

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
    ]),
    production_execution_locked: true,
    human_review_required:       true,
    immutable:                   true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:       SCHEMA_VERSION,
    finalizer_status:     status,
    finalizer_ready:      false,
    blocking_reason,
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
    human_review_required:        true,
    immutable:                    true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Build a real release evidence finalizer package.
 */
export function buildRealReleaseEvidenceFinalizer(params = {}) {
  const {
    gate_id,
    lock_id,
    readiness_status,
    handoff_id,
    rehearsal_report_id,
    sandbox_baseline_id,
    manual_execution_baseline_id,
    supervised_control_plane_baseline_id,
    runtime_execution_baseline_id,
    evidence_receipt_id,
    evidence_source,
    ledger_chain_refs,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const finalizer_hash = _sha256(`fixture-finalizer:${now}`).slice(0, 48);
    const finalizer_id   = finalizer_hash.slice(0, 24);
    return {
      schema_version:                        SCHEMA_VERSION,
      finalizer_id,
      finalizer_status:                      'FINALIZER_READY_LOCKED',
      finalizer_ready:                       true,
      gate_id:                               'fixture-gate-id',
      lock_id:                               'fixture-lock-id',
      readiness_status:                      'REAL_READINESS_READY_LOCKED',
      handoff_id:                            'fixture-handoff-id',
      rehearsal_report_id:                   'fixture-rehearsal-report-id',
      sandbox_baseline_id:                   'fixture-sandbox-baseline-id',
      manual_execution_baseline_id:          'fixture-manual-execution-baseline-id',
      supervised_control_plane_baseline_id:  'fixture-supervised-baseline-id',
      runtime_execution_baseline_id:         'fixture-runtime-baseline-id',
      evidence_receipt_id:                   'fixture-receipt-id',
      evidence_source:                       'go-core',
      ledger_chain_refs:                     ['evt-1', 'evt-2', 'evt-3'],
      finalizer_hash,
      created_at:                            now,
      blocking_reason:                       null,
      ..._locked(),
    };
  }

  // Readiness required
  if (!readiness_status || readiness_status !== 'REAL_READINESS_READY_LOCKED') {
    return _blocked('FINALIZER_BLOCKED_READINESS', 'readiness_not_ready_locked', {
      readiness_status: readiness_status ?? null,
    });
  }

  // Evidence required
  if (!evidence_receipt_id) {
    return _blocked('FINALIZER_BLOCKED_EVIDENCE', 'evidence_receipt_id_required');
  }

  if (!evidence_source || evidence_source !== 'go-core') {
    return _blocked('FINALIZER_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: evidence_source ?? null,
    });
  }

  // Ledger refs required
  if (!ledger_chain_refs || (Array.isArray(ledger_chain_refs) && ledger_chain_refs.length === 0)) {
    return _blocked('FINALIZER_BLOCKED_LEDGER', 'ledger_chain_refs_required');
  }

  // Build deterministic hash
  const hashInput = [
    gate_id ?? '',
    lock_id ?? '',
    readiness_status,
    handoff_id ?? '',
    rehearsal_report_id ?? '',
    evidence_receipt_id,
    now,
  ].join(':');

  const finalizer_hash = _sha256(hashInput).slice(0, 48);
  const finalizer_id   = finalizer_hash.slice(0, 24);

  return {
    schema_version:                        SCHEMA_VERSION,
    finalizer_id,
    finalizer_status:                      'FINALIZER_READY_LOCKED',
    finalizer_ready:                       true,
    gate_id:                               gate_id ?? null,
    lock_id:                               lock_id ?? null,
    readiness_status,
    handoff_id:                            handoff_id ?? null,
    rehearsal_report_id:                   rehearsal_report_id ?? null,
    sandbox_baseline_id:                   sandbox_baseline_id ?? null,
    manual_execution_baseline_id:          manual_execution_baseline_id ?? null,
    supervised_control_plane_baseline_id:  supervised_control_plane_baseline_id ?? null,
    runtime_execution_baseline_id:         runtime_execution_baseline_id ?? null,
    evidence_receipt_id,
    evidence_source,
    ledger_chain_refs:                     Array.isArray(ledger_chain_refs) ? ledger_chain_refs : [ledger_chain_refs],
    finalizer_hash,
    created_at:                            now,
    blocking_reason:                       null,
    ..._locked(),
  };
}

/**
 * Validate a real release evidence finalizer.
 */
export function validateRealReleaseEvidenceFinalizer(finalizer) {
  if (!finalizer) return _blocked('FINALIZER_BLOCKED_READINESS', 'finalizer_null');

  if (finalizer.schema_version !== SCHEMA_VERSION) {
    return _blocked('FINALIZER_BLOCKED_READINESS', `schema_version_mismatch:expected_${SCHEMA_VERSION}`);
  }

  if (!finalizer.finalizer_hash || finalizer.finalizer_hash.length < 48) {
    return _blocked('FINALIZER_BLOCKED_HASH', 'finalizer_hash_missing_or_invalid');
  }

  if (finalizer.immutable !== true) {
    return _blocked('FINALIZER_BLOCKED_READINESS', 'immutable_must_be_true');
  }

  if (finalizer.production_execution_locked !== true) {
    return _blocked('FINALIZER_BLOCKED_READINESS', 'production_execution_locked_must_be_true');
  }

  return { valid: true, finalizer_id: finalizer.finalizer_id, ..._locked() };
}

/**
 * Render a human-readable finalizer summary.
 */
export function renderRealReleaseEvidenceFinalizerSummary(finalizer) {
  if (!finalizer) return 'finalizer: null';
  const lines = [
    `finalizer_status             : ${finalizer.finalizer_status ?? 'UNKNOWN'}`,
    `finalizer_id                 : ${finalizer.finalizer_id ?? 'none'}`,
    `evidence_source              : ${finalizer.evidence_source ?? 'none'}`,
    `finalizer_hash               : ${finalizer.finalizer_hash ? finalizer.finalizer_hash.slice(0, 16) + '...' : 'none'}`,
    `ledger_chain_refs            : ${finalizer.ledger_chain_refs?.length ?? 0}`,
    `production_execution_locked  : true`,
    `immutable                    : true`,
    `human_review_required        : true`,
    `release_execution_allowed    : false`,
    `blocking_reason              : ${finalizer.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-release-evidence-finalizer.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealReleaseEvidenceFinalizer({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealReleaseEvidenceFinalizerSummary(result));
  }

  process.exit(result.finalizer_ready ? 0 : 1);
}
