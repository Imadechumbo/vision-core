#!/usr/bin/env node
/**
 * Controlled Execution Evidence Package — V67.1
 *
 * Aggregates evidence for controlled execution review.
 * Review-only. Does NOT execute release, tag, stable, deploy, or unlock.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * controlled_execution_allowed=false always.
 * unlock_executed=false always.
 * final_execution_phase_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v67.1';

export const CONTROLLED_EVIDENCE_STATUSES = [
  'CONTROLLED_EVIDENCE_BLOCKED_RISK',
  'CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE',
  'CONTROLLED_EVIDENCE_BLOCKED_LEDGER',
  'CONTROLLED_EVIDENCE_BLOCKED_HASH',
  'CONTROLLED_EVIDENCE_READY_REVIEW',
];

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
    immutable:                          true,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                     SCHEMA_VERSION,
    evidence_package_status:            status,
    evidence_review_ready:              false,
    blocking_reason,
    ...extra,
    ..._locked(),
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
    immutable:                          true,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Build a controlled execution evidence package (review-only).
 */
export function buildControlledExecutionEvidencePackage(params = {}) {
  const {
    controlled_contract,
    controlled_authority,
    controlled_binding,
    controlled_risk,
    unlock_governance_baseline,
    unlock_review_package,
    real_gate_baseline,
    sandbox_baseline,
    evidence_receipt_id,
    evidence_source,
    ledger_chain_refs,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const package_id = _sha256(`fixture-controlled-evidence:${now}`).slice(0, 24);
    const package_hash = _sha256(`fixture-controlled-evidence-hash:${now}`).slice(0, 48);
    return {
      schema_version:                     SCHEMA_VERSION,
      controlled_evidence_package_id:     package_id,
      evidence_package_status:            'CONTROLLED_EVIDENCE_READY_REVIEW',
      evidence_review_ready:              true,
      controlled_contract_id:             'fixture-controlled-contract-id',
      controlled_authority_id:            'fixture-controlled-authority-id',
      controlled_binding_id:              'fixture-controlled-binding-id',
      controlled_risk_status:             'CONTROLLED_RISK_READY_REVIEW',
      unlock_baseline_id:                 'fixture-unlock-baseline-id',
      unlock_review_package_id:           'fixture-unlock-review-package-id',
      real_gate_baseline_id:              'fixture-real-gate-baseline-id',
      sandbox_baseline_id:                'fixture-sandbox-baseline-id',
      evidence_receipt_id:                'fixture-evidence-receipt-id',
      evidence_source:                    'go-core',
      ledger_chain_refs:                  ['fixture-ledger-ref-1', 'fixture-ledger-ref-2'],
      package_hash,
      created_at:                         now,
      blocking_reason:                    null,
      ..._locked(),
    };
  }

  // Risk required
  if (!controlled_risk || controlled_risk.controlled_execution_review_ready !== true) {
    return _blocked('CONTROLLED_EVIDENCE_BLOCKED_RISK', 'controlled_risk_not_ready', {
      controlled_risk_status: controlled_risk?.controlled_risk_status ?? null,
    });
  }

  // evidence_source must be go-core
  if (!evidence_source || evidence_source !== 'go-core') {
    return _blocked('CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: evidence_source ?? null,
    });
  }

  const package_id = _sha256([
    'controlled-evidence',
    controlled_contract?.controlled_contract_id ?? '',
    controlled_authority?.controlled_authority_id ?? '',
    controlled_binding?.binding_id ?? '',
    evidence_receipt_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  const package_hash = _sha256([
    'controlled-evidence-hash',
    package_id,
    controlled_risk?.risk_matrix_id ?? '',
    unlock_governance_baseline?.baseline_hash ?? '',
    evidence_receipt_id ?? '',
    now,
  ].join(':')).slice(0, 48);

  return {
    schema_version:                     SCHEMA_VERSION,
    controlled_evidence_package_id:     package_id,
    evidence_package_status:            'CONTROLLED_EVIDENCE_READY_REVIEW',
    evidence_review_ready:              true,
    controlled_contract_id:             controlled_contract?.controlled_contract_id ?? null,
    controlled_authority_id:            controlled_authority?.controlled_authority_id ?? null,
    controlled_binding_id:              controlled_binding?.binding_id ?? null,
    controlled_risk_status:             controlled_risk.controlled_risk_status,
    unlock_baseline_id:                 unlock_governance_baseline?.baseline_hash ?? null,
    unlock_review_package_id:           unlock_review_package?.package_id ?? null,
    real_gate_baseline_id:              real_gate_baseline?.baseline_version ?? null,
    sandbox_baseline_id:                sandbox_baseline?.baseline_version ?? null,
    evidence_receipt_id:                evidence_receipt_id ?? null,
    evidence_source,
    ledger_chain_refs:                  Array.isArray(ledger_chain_refs) ? ledger_chain_refs : [],
    package_hash,
    created_at:                         now,
    blocking_reason:                    null,
    ..._locked(),
  };
}

/**
 * Validate a controlled execution evidence package.
 */
export function validateControlledExecutionEvidencePackage(pkg) {
  if (!pkg) return _blocked('CONTROLLED_EVIDENCE_BLOCKED_RISK', 'package_null');

  if (pkg.schema_version !== SCHEMA_VERSION) {
    return _blocked('CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE', `schema_version_mismatch:expected_${SCHEMA_VERSION}`);
  }

  if (!pkg.controlled_evidence_package_id || typeof pkg.controlled_evidence_package_id !== 'string') {
    return _blocked('CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE', 'controlled_evidence_package_id_missing');
  }

  if (pkg.production_execution_locked !== true) {
    return _blocked('CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE', 'production_execution_locked_must_be_true');
  }

  if (pkg.controlled_execution_allowed !== false) {
    return _blocked('CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE', 'controlled_execution_allowed_must_be_false');
  }

  if (pkg.unlock_executed !== false) {
    return _blocked('CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE', 'unlock_executed_must_be_false');
  }

  if (pkg.immutable !== true) {
    return _blocked('CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE', 'immutable_must_be_true');
  }

  if (pkg.final_execution_phase_required !== true) {
    return _blocked('CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE', 'final_execution_phase_required_must_be_true');
  }

  if (pkg.evidence_source !== 'go-core') {
    return _blocked('CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core');
  }

  return { valid: true, controlled_evidence_package_id: pkg.controlled_evidence_package_id, ..._locked() };
}

/**
 * Render a human-readable evidence package summary.
 */
export function renderControlledExecutionEvidencePackageSummary(pkg) {
  if (!pkg) return 'controlled_execution_evidence_package: null';
  const lines = [
    `evidence_package_status           : ${pkg.evidence_package_status ?? 'UNKNOWN'}`,
    `controlled_evidence_package_id    : ${pkg.controlled_evidence_package_id ?? 'none'}`,
    `evidence_source                   : ${pkg.evidence_source ?? 'none'}`,
    `evidence_receipt_id               : ${pkg.evidence_receipt_id ?? 'none'}`,
    `controlled_risk_status            : ${pkg.controlled_risk_status ?? 'none'}`,
    `package_hash                      : ${pkg.package_hash ? pkg.package_hash.slice(0, 12) + '...' : 'none'}`,
    `immutable                         : true`,
    `production_execution_locked       : true`,
    `controlled_execution_allowed      : false`,
    `unlock_executed                   : false`,
    `controlled_review_only            : true`,
    `final_execution_phase_required    : true`,
    `blocking_reason                   : ${pkg.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('controlled-execution-evidence-package.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildControlledExecutionEvidencePackage({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledExecutionEvidencePackageSummary(result));
  }

  process.exit(result.evidence_review_ready ? 0 : 1);
}
