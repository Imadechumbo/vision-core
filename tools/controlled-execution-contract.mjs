#!/usr/bin/env node
/**
 * Controlled Execution Contract — V66.0
 *
 * Review-only contract for final controlled execution review.
 * Does NOT execute release, tag, stable, deploy, or unlock.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * controlled_execution_allowed=false always.
 * unlock_executed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v66.0';

export const CONTROLLED_CONTRACT_STATUSES = [
  'CONTROLLED_CONTRACT_MISSING',
  'CONTROLLED_CONTRACT_INVALID',
  'CONTROLLED_CONTRACT_EXPIRED',
  'CONTROLLED_CONTRACT_BLOCKED_UNLOCK_BASELINE',
  'CONTROLLED_CONTRACT_BLOCKED_UNLOCK_REPORT',
  'CONTROLLED_CONTRACT_BLOCKED_EVIDENCE',
  'CONTROLLED_CONTRACT_BLOCKED_SCOPE',
  'CONTROLLED_CONTRACT_READY_REVIEW',
];

export const CONTROLLED_EXECUTION_SCOPES = [
  'review_controlled_release_execution',
  'review_controlled_tag_creation',
  'review_controlled_stable_promotion',
  'review_controlled_deploy',
  'review_controlled_full_manual_execution',
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
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                     SCHEMA_VERSION,
    contract_status:                    status,
    contract_ready:                     false,
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
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a controlled execution contract (review-only).
 */
export function createControlledExecutionContract(params = {}) {
  const {
    unlock_baseline_id,
    unlock_report_id,
    unlock_review_package_id,
    evidence_receipt_id,
    evidence_source,
    target_version,
    target_branch,
    git_head,
    requested_by,
    requester_role,
    requested_execution_scope,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const controlled_contract_id = _sha256(`fixture-controlled-contract:${now}`).slice(0, 24);
    const expires_at = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();
    return {
      schema_version:                     SCHEMA_VERSION,
      controlled_contract_id,
      contract_status:                    'CONTROLLED_CONTRACT_READY_REVIEW',
      contract_ready:                     true,
      unlock_baseline_id:                 'fixture-unlock-baseline-id',
      unlock_report_id:                   'fixture-unlock-report-id',
      unlock_review_package_id:           'fixture-unlock-review-package-id',
      evidence_receipt_id:                'fixture-evidence-receipt-id',
      evidence_source:                    'go-core',
      target_version:                     'fixture-target-version',
      target_branch:                      'fixture-target-branch',
      git_head:                           'fixture-git-head',
      requested_by:                       'fixture-requester',
      requester_role:                     'release_authority',
      requested_execution_scope:          'review_controlled_full_manual_execution',
      created_at:                         now,
      expires_at,
      blocking_reason:                    null,
      ..._locked(),
    };
  }

  // evidence_source must be go-core
  if (!evidence_source || evidence_source !== 'go-core') {
    return _blocked('CONTROLLED_CONTRACT_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: evidence_source ?? null,
    });
  }

  // unlock baseline required
  if (!unlock_baseline_id) {
    return _blocked('CONTROLLED_CONTRACT_BLOCKED_UNLOCK_BASELINE', 'unlock_baseline_id_required');
  }

  // unlock report required
  if (!unlock_report_id) {
    return _blocked('CONTROLLED_CONTRACT_BLOCKED_UNLOCK_REPORT', 'unlock_report_id_required');
  }

  // scope must be valid
  if (!requested_execution_scope || !CONTROLLED_EXECUTION_SCOPES.includes(requested_execution_scope)) {
    return _blocked('CONTROLLED_CONTRACT_BLOCKED_SCOPE', 'requested_execution_scope_invalid', {
      requested_execution_scope: requested_execution_scope ?? null,
    });
  }

  const controlled_contract_id = _sha256([
    'controlled-contract',
    unlock_baseline_id ?? '',
    unlock_report_id ?? '',
    evidence_receipt_id ?? '',
    requested_by ?? '',
    now,
  ].join(':')).slice(0, 24);

  const expires_at = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();

  return {
    schema_version:                     SCHEMA_VERSION,
    controlled_contract_id,
    contract_status:                    'CONTROLLED_CONTRACT_READY_REVIEW',
    contract_ready:                     true,
    unlock_baseline_id,
    unlock_report_id,
    unlock_review_package_id:           unlock_review_package_id ?? null,
    evidence_receipt_id:                evidence_receipt_id ?? null,
    evidence_source,
    target_version:                     target_version ?? null,
    target_branch:                      target_branch ?? null,
    git_head:                           git_head ?? null,
    requested_by:                       requested_by ?? null,
    requester_role:                     requester_role ?? null,
    requested_execution_scope,
    created_at:                         now,
    expires_at,
    blocking_reason:                    null,
    ..._locked(),
  };
}

/**
 * Validate a controlled execution contract.
 */
export function validateControlledExecutionContract(contract) {
  if (!contract) return _blocked('CONTROLLED_CONTRACT_MISSING', 'contract_null');

  if (contract.schema_version !== SCHEMA_VERSION) {
    return _blocked('CONTROLLED_CONTRACT_INVALID', `schema_version_mismatch:expected_${SCHEMA_VERSION}`);
  }

  if (!contract.controlled_contract_id || typeof contract.controlled_contract_id !== 'string') {
    return _blocked('CONTROLLED_CONTRACT_INVALID', 'controlled_contract_id_missing');
  }

  if (contract.production_execution_locked !== true) {
    return _blocked('CONTROLLED_CONTRACT_INVALID', 'production_execution_locked_must_be_true');
  }

  if (contract.controlled_execution_allowed !== false) {
    return _blocked('CONTROLLED_CONTRACT_INVALID', 'controlled_execution_allowed_must_be_false');
  }

  if (contract.unlock_executed !== false) {
    return _blocked('CONTROLLED_CONTRACT_INVALID', 'unlock_executed_must_be_false');
  }

  if (contract.evidence_source !== 'go-core') {
    return _blocked('CONTROLLED_CONTRACT_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core');
  }

  return { valid: true, controlled_contract_id: contract.controlled_contract_id, ..._locked() };
}

/**
 * Normalize a controlled execution contract (returns canonical view).
 */
export function normalizeControlledExecutionContract(contract) {
  if (!contract) return null;
  return {
    controlled_contract_id:             contract.controlled_contract_id ?? null,
    schema_version:                     contract.schema_version ?? null,
    contract_status:                    contract.contract_status ?? null,
    contract_ready:                     contract.contract_ready ?? false,
    evidence_source:                    contract.evidence_source ?? null,
    requested_execution_scope:          contract.requested_execution_scope ?? null,
    ..._locked(),
  };
}

/**
 * Render a human-readable contract summary.
 */
export function renderControlledExecutionContractSummary(contract) {
  if (!contract) return 'controlled_execution_contract: null';
  const lines = [
    `contract_status                : ${contract.contract_status ?? 'UNKNOWN'}`,
    `controlled_contract_id         : ${contract.controlled_contract_id ?? 'none'}`,
    `evidence_source                : ${contract.evidence_source ?? 'none'}`,
    `requested_execution_scope      : ${contract.requested_execution_scope ?? 'none'}`,
    `unlock_baseline_id             : ${contract.unlock_baseline_id ?? 'none'}`,
    `unlock_report_id               : ${contract.unlock_report_id ?? 'none'}`,
    `production_execution_locked    : true`,
    `controlled_execution_allowed   : false`,
    `unlock_executed                : false`,
    `controlled_review_only         : true`,
    `final_execution_phase_required : true`,
    `blocking_reason                : ${contract.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('controlled-execution-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createControlledExecutionContract({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledExecutionContractSummary(result));
  }

  process.exit(result.contract_ready ? 0 : 1);
}
