#!/usr/bin/env node
/**
 * Real Manual Unlock Execution Contract — V71.0
 *
 * Prepares real manual unlock but does NOT execute unlock.
 * Requires explicit human confirmation. Review-only until future real command.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * unlock_executed=false always.
 * real_execution_armed=false always.
 * dry_run_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v71.0';

export const UNLOCK_EXEC_CONTRACT_SCOPES = [
  'unlock_for_tag_review',
  'unlock_for_stable_review',
  'unlock_for_release_execution_review',
  'unlock_for_full_manual_execution_review',
];

export const REQUIRED_UNLOCK_EXEC_CONFIRMATION_PHRASE =
  'I ACKNOWLEDGE THIS CONTRACT PREPARES REAL MANUAL UNLOCK BUT DOES NOT EXECUTE UNLOCK RELEASE TAG STABLE OR DEPLOY';

export const UNLOCK_EXEC_CONTRACT_STATUSES = [
  'UNLOCK_EXEC_CONTRACT_MISSING',
  'UNLOCK_EXEC_CONTRACT_INVALID',
  'UNLOCK_EXEC_CONTRACT_EXPIRED',
  'UNLOCK_EXEC_CONTRACT_BLOCKED_BASELINE',
  'UNLOCK_EXEC_CONTRACT_BLOCKED_EVIDENCE',
  'UNLOCK_EXEC_CONTRACT_BLOCKED_SCOPE',
  'UNLOCK_EXEC_CONTRACT_PHRASE_MISMATCH',
  'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:              false,
    promotion_allowed:           false,
    stable_allowed:              false,
    tag_allowed:                 false,
    release_execution_allowed:   false,
    release_performed:           false,
    tag_created:                 false,
    stable_promoted:             false,
    deploy_performed:            false,
    production_execution_locked: true,
    unlock_executed:             false,
    manual_execution_only:       true,
    dry_run_required:            true,
    real_execution_armed:        false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    contract_status:  status,
    contract_ready:   false,
    blocking_reason,
    ...extra,
    deploy_allowed:              false,
    promotion_allowed:           false,
    stable_allowed:              false,
    tag_allowed:                 false,
    release_execution_allowed:   false,
    release_performed:           false,
    tag_created:                 false,
    stable_promoted:             false,
    deploy_performed:            false,
    production_execution_locked: true,
    unlock_executed:             false,
    manual_execution_only:       true,
    dry_run_required:            true,
    real_execution_armed:        false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

export function createRealManualUnlockExecutionContract(params = {}) {
  const {
    final_preprod_baseline_id,
    controlled_contract_id,
    controlled_evidence_package_id,
    evidence_receipt_id,
    evidence_source,
    target_version,
    target_branch,
    git_head,
    requested_by,
    requester_role,
    requested_unlock_scope,
    human_confirmation_phrase,
    expires_in_hours = 8,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const contract_id = _sha256(`fixture-unlock-exec-contract:${now}`).slice(0, 24);
    const expires_at  = new Date(new Date(now).getTime() + 8 * 3600000).toISOString();
    return {
      schema_version:                  SCHEMA_VERSION,
      unlock_execution_contract_id:    contract_id,
      contract_status:                 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW',
      contract_ready:                  true,
      final_preprod_baseline_id:       'fixture-preprod-baseline-id',
      controlled_contract_id:          'fixture-controlled-contract-id',
      controlled_evidence_package_id:  'fixture-evidence-package-id',
      evidence_receipt_id:             'fixture-receipt-id',
      evidence_source:                 'go-core',
      target_version:                  'v0.0.0-fixture',
      target_branch:                   'main',
      git_head:                        'fixture-git-head',
      requested_by:                    'fixture-user',
      requester_role:                  'release-manager',
      requested_unlock_scope:          'unlock_for_full_manual_execution_review',
      human_confirmation_phrase:       REQUIRED_UNLOCK_EXEC_CONFIRMATION_PHRASE,
      created_at:                      now,
      expires_at,
      blocking_reason:                 null,
      ..._locked(),
    };
  }

  if (!final_preprod_baseline_id) {
    return _blocked('UNLOCK_EXEC_CONTRACT_BLOCKED_BASELINE', 'final_preprod_baseline_required', {});
  }

  if (evidence_source !== 'go-core') {
    return _blocked('UNLOCK_EXEC_CONTRACT_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: evidence_source ?? null,
    });
  }

  if (!evidence_receipt_id) {
    return _blocked('UNLOCK_EXEC_CONTRACT_BLOCKED_EVIDENCE', 'evidence_receipt_id_required', {});
  }

  if (!UNLOCK_EXEC_CONTRACT_SCOPES.includes(requested_unlock_scope)) {
    return _blocked('UNLOCK_EXEC_CONTRACT_BLOCKED_SCOPE', 'invalid_unlock_scope', {
      requested_unlock_scope: requested_unlock_scope ?? null,
    });
  }

  if (human_confirmation_phrase !== REQUIRED_UNLOCK_EXEC_CONFIRMATION_PHRASE) {
    return _blocked('UNLOCK_EXEC_CONTRACT_PHRASE_MISMATCH', 'confirmation_phrase_mismatch', {});
  }

  const expires_at  = new Date(new Date(now).getTime() + expires_in_hours * 3600000).toISOString();
  const contract_id = _sha256([
    'unlock-exec-contract',
    final_preprod_baseline_id,
    controlled_contract_id ?? '',
    evidence_receipt_id,
    now,
  ].join(':')).slice(0, 24);

  return {
    schema_version:                  SCHEMA_VERSION,
    unlock_execution_contract_id:    contract_id,
    contract_status:                 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW',
    contract_ready:                  true,
    final_preprod_baseline_id,
    controlled_contract_id:          controlled_contract_id ?? null,
    controlled_evidence_package_id:  controlled_evidence_package_id ?? null,
    evidence_receipt_id,
    evidence_source,
    target_version:                  target_version ?? null,
    target_branch:                   target_branch ?? null,
    git_head:                        git_head ?? null,
    requested_by:                    requested_by ?? null,
    requester_role:                  requester_role ?? null,
    requested_unlock_scope,
    human_confirmation_phrase,
    created_at:                      now,
    expires_at,
    blocking_reason:                 null,
    ..._locked(),
  };
}

export function validateRealManualUnlockExecutionContract(contract) {
  if (!contract)                                                         return { valid: false, reason: 'UNLOCK_EXEC_CONTRACT_MISSING' };
  if (contract.schema_version !== SCHEMA_VERSION)                        return { valid: false, reason: 'UNLOCK_EXEC_CONTRACT_INVALID' };
  if (!contract.unlock_execution_contract_id)                            return { valid: false, reason: 'UNLOCK_EXEC_CONTRACT_INVALID' };
  if (contract.contract_status !== 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW') return { valid: false, reason: contract.contract_status };
  if (contract.production_execution_locked !== true)                     return { valid: false, reason: 'UNLOCK_EXEC_CONTRACT_INVALID' };
  if (contract.unlock_executed !== false)                                return { valid: false, reason: 'UNLOCK_EXEC_CONTRACT_INVALID' };
  if (contract.real_execution_armed !== false)                           return { valid: false, reason: 'UNLOCK_EXEC_CONTRACT_INVALID' };
  if (contract.evidence_source !== 'go-core')                           return { valid: false, reason: 'UNLOCK_EXEC_CONTRACT_BLOCKED_EVIDENCE' };
  return { valid: true, reason: null };
}

export function normalizeRealManualUnlockExecutionContract(contract) {
  if (!contract) return null;
  return {
    unlock_execution_contract_id: contract.unlock_execution_contract_id ?? null,
    schema_version:               contract.schema_version ?? null,
    contract_status:              contract.contract_status ?? null,
    contract_ready:               contract.contract_ready === true,
    evidence_source:              contract.evidence_source ?? null,
    requested_unlock_scope:       contract.requested_unlock_scope ?? null,
    manual_execution_only:        contract.manual_execution_only === true,
    dry_run_required:             contract.dry_run_required === true,
    real_execution_armed:         contract.real_execution_armed === true,
    unlock_executed:              contract.unlock_executed === true,
    production_execution_locked:  contract.production_execution_locked === true,
  };
}

export function renderRealManualUnlockExecutionContractSummary(contract) {
  if (!contract) return 'real_manual_unlock_execution_contract: null';
  return [
    `contract_status               : ${contract.contract_status ?? 'UNKNOWN'}`,
    `unlock_execution_contract_id  : ${contract.unlock_execution_contract_id ?? 'none'}`,
    `evidence_source               : ${contract.evidence_source ?? 'none'}`,
    `requested_unlock_scope        : ${contract.requested_unlock_scope ?? 'none'}`,
    `manual_execution_only         : true`,
    `dry_run_required              : true`,
    `real_execution_armed          : false`,
    `unlock_executed               : false`,
    `production_execution_locked   : true`,
    `blocking_reason               : ${contract.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-manual-unlock-execution-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createRealManualUnlockExecutionContract({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealManualUnlockExecutionContractSummary(result));
  }

  process.exit(result.contract_ready ? 0 : 1);
}
