#!/usr/bin/env node
/**
 * Production Unlock Contract — V61.0
 *
 * Explicit contract for production unlock review. Review-only.
 * Does NOT execute unlock, release, tag, stable, or deploy.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * unlock_executed=false always. unlock_review_only=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v61.0';

export const UNLOCK_CONTRACT_STATUSES = [
  'UNLOCK_CONTRACT_MISSING',
  'UNLOCK_CONTRACT_INVALID',
  'UNLOCK_CONTRACT_EXPIRED',
  'UNLOCK_CONTRACT_BLOCKED_LOCK',
  'UNLOCK_CONTRACT_BLOCKED_GATE',
  'UNLOCK_CONTRACT_BLOCKED_EVIDENCE',
  'UNLOCK_CONTRACT_BLOCKED_SCOPE',
  'UNLOCK_CONTRACT_READY_REVIEW',
];

export const UNLOCK_REQUESTED_SCOPES = [
  'review_release_execution_unlock',
  'review_tag_creation_unlock',
  'review_stable_promotion_unlock',
  'review_deploy_unlock',
  'review_full_manual_release_unlock',
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
    production_execution_locked:       true,
    unlock_executed:                   false,
    unlock_review_only:                true,
    future_execution_phase_required:   true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    contract_status:  status,
    contract_ready:   false,
    blocking_reason,
    ...extra,
    ..._locked(),
    deploy_allowed:                    false,
    promotion_allowed:                 false,
    stable_allowed:                    false,
    tag_allowed:                       false,
    release_execution_allowed:         false,
    release_performed:                 false,
    tag_created:                       false,
    stable_promoted:                   false,
    deploy_performed:                  false,
    production_execution_locked:       true,
    unlock_executed:                   false,
    unlock_review_only:                true,
    future_execution_phase_required:   true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a production unlock contract (review-only).
 */
export function createProductionUnlockContract(params = {}) {
  const {
    lock_id,
    gate_id,
    finalizer_id,
    locked_report_id,
    requested_by,
    requester_role,
    requested_scope,
    target_version,
    target_branch,
    git_head,
    evidence_receipt_id,
    evidence_source,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const unlock_contract_id = _sha256(`fixture-unlock-contract:${now}`).slice(0, 24);
    const expires_at = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();
    return {
      schema_version:               SCHEMA_VERSION,
      unlock_contract_id,
      contract_status:              'UNLOCK_CONTRACT_READY_REVIEW',
      contract_ready:               true,
      lock_id:                      'fixture-lock-id',
      gate_id:                      'fixture-gate-id',
      finalizer_id:                 'fixture-finalizer-id',
      locked_report_id:             'fixture-locked-report-id',
      requested_by:                 'fixture-requester',
      requester_role:               'release_engineer',
      requested_scope:              'review_full_manual_release_unlock',
      target_version:               '1.0.0-fixture',
      target_branch:                'main',
      git_head:                     'fixture-head-sha',
      evidence_receipt_id:          'fixture-receipt-id',
      evidence_source:              'go-core',
      created_at:                   now,
      expires_at,
      blocking_reason:              null,
      unlock_requested:             true,
      ..._locked(),
    };
  }

  // Lock required
  if (!lock_id) {
    return _blocked('UNLOCK_CONTRACT_BLOCKED_LOCK', 'lock_id_required');
  }

  // Gate required
  if (!gate_id) {
    return _blocked('UNLOCK_CONTRACT_BLOCKED_GATE', 'gate_id_required');
  }

  // Evidence required
  if (!evidence_receipt_id) {
    return _blocked('UNLOCK_CONTRACT_BLOCKED_EVIDENCE', 'evidence_receipt_id_required');
  }

  if (!evidence_source || evidence_source !== 'go-core') {
    return _blocked('UNLOCK_CONTRACT_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: evidence_source ?? null,
    });
  }

  // Scope required and valid
  if (!requested_scope || !UNLOCK_REQUESTED_SCOPES.includes(requested_scope)) {
    return _blocked('UNLOCK_CONTRACT_BLOCKED_SCOPE', 'requested_scope_invalid', {
      requested_scope: requested_scope ?? null,
      valid_scopes:    UNLOCK_REQUESTED_SCOPES,
    });
  }

  const unlock_contract_id = _sha256([
    'unlock-contract',
    lock_id,
    gate_id,
    evidence_receipt_id,
    requested_scope,
    now,
  ].join(':')).slice(0, 24);

  const expires_at = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();

  return {
    schema_version:               SCHEMA_VERSION,
    unlock_contract_id,
    contract_status:              'UNLOCK_CONTRACT_READY_REVIEW',
    contract_ready:               true,
    lock_id,
    gate_id,
    finalizer_id:                 finalizer_id ?? null,
    locked_report_id:             locked_report_id ?? null,
    requested_by:                 requested_by ?? null,
    requester_role:               requester_role ?? null,
    requested_scope,
    target_version:               target_version ?? null,
    target_branch:                target_branch ?? null,
    git_head:                     git_head ?? null,
    evidence_receipt_id,
    evidence_source,
    created_at:                   now,
    expires_at,
    blocking_reason:              null,
    unlock_requested:             true,
    ..._locked(),
  };
}

/**
 * Validate a production unlock contract.
 */
export function validateProductionUnlockContract(contract) {
  if (!contract) return _blocked('UNLOCK_CONTRACT_MISSING', 'contract_null');

  if (contract.schema_version !== SCHEMA_VERSION) {
    return _blocked('UNLOCK_CONTRACT_INVALID', `schema_version_mismatch:expected_${SCHEMA_VERSION}`);
  }

  if (!contract.unlock_contract_id || typeof contract.unlock_contract_id !== 'string') {
    return _blocked('UNLOCK_CONTRACT_INVALID', 'unlock_contract_id_missing');
  }

  if (contract.production_execution_locked !== true) {
    return _blocked('UNLOCK_CONTRACT_INVALID', 'production_execution_locked_must_be_true');
  }

  if (contract.unlock_executed !== false) {
    return _blocked('UNLOCK_CONTRACT_INVALID', 'unlock_executed_must_be_false');
  }

  if (contract.unlock_review_only !== true) {
    return _blocked('UNLOCK_CONTRACT_INVALID', 'unlock_review_only_must_be_true');
  }

  if (!UNLOCK_REQUESTED_SCOPES.includes(contract.requested_scope)) {
    return _blocked('UNLOCK_CONTRACT_BLOCKED_SCOPE', 'requested_scope_invalid');
  }

  return { valid: true, unlock_contract_id: contract.unlock_contract_id, ..._locked() };
}

/**
 * Normalize a production unlock contract (extract key fields).
 */
export function normalizeProductionUnlockContract(contract) {
  if (!contract) return _blocked('UNLOCK_CONTRACT_MISSING', 'contract_null');
  return {
    schema_version:               SCHEMA_VERSION,
    unlock_contract_id:           contract.unlock_contract_id ?? null,
    contract_status:              contract.contract_status ?? null,
    contract_ready:               contract.contract_ready === true,
    requested_scope:              contract.requested_scope ?? null,
    evidence_source:              contract.evidence_source ?? null,
    expires_at:                   contract.expires_at ?? null,
    ..._locked(),
  };
}

/**
 * Render a human-readable unlock contract summary.
 */
export function renderProductionUnlockContractSummary(contract) {
  if (!contract) return 'unlock_contract: null';
  const lines = [
    `contract_status              : ${contract.contract_status ?? 'UNKNOWN'}`,
    `unlock_contract_id           : ${contract.unlock_contract_id ?? 'none'}`,
    `requested_scope              : ${contract.requested_scope ?? 'none'}`,
    `evidence_source              : ${contract.evidence_source ?? 'none'}`,
    `production_execution_locked  : true`,
    `unlock_executed              : false`,
    `unlock_review_only           : true`,
    `release_execution_allowed    : false`,
    `blocking_reason              : ${contract.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('production-unlock-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createProductionUnlockContract({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderProductionUnlockContractSummary(result));
  }

  process.exit(result.contract_ready ? 0 : 1);
}
