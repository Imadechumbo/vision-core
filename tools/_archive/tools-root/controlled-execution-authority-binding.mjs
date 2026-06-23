#!/usr/bin/env node
/**
 * Controlled Execution Authority Binding — V66.2
 *
 * Binds controlled execution contract + human authority + unlock governance baseline.
 * Review-only. Does NOT execute release, tag, stable, deploy, or unlock.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * controlled_execution_allowed=false always.
 * unlock_executed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v66.2';

export const CONTROLLED_BINDING_STATUSES = [
  'CONTROLLED_BINDING_BLOCKED_CONTRACT',
  'CONTROLLED_BINDING_BLOCKED_AUTHORITY',
  'CONTROLLED_BINDING_BLOCKED_BASELINE',
  'CONTROLLED_BINDING_BLOCKED_SCOPE',
  'CONTROLLED_BINDING_BLOCKED_TEMPORAL',
  'CONTROLLED_BINDING_READY_REVIEW',
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
    controlled_execution_review_ready:  false,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                     SCHEMA_VERSION,
    binding_status:                     status,
    binding_ready:                      false,
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
    controlled_execution_review_ready:  false,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Bind controlled execution contract to human authority with unlock governance baseline.
 */
export function bindControlledExecutionAuthorityToBaseline(params = {}) {
  const {
    controlled_contract,
    controlled_authority,
    unlock_governance_baseline,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const binding_id = _sha256(`fixture-controlled-binding:${now}`).slice(0, 24);
    return {
      schema_version:                     SCHEMA_VERSION,
      binding_id,
      binding_status:                     'CONTROLLED_BINDING_READY_REVIEW',
      binding_ready:                      true,
      controlled_contract_id:             'fixture-controlled-contract-id',
      controlled_authority_id:            'fixture-controlled-authority-id',
      unlock_baseline_id:                 'fixture-unlock-baseline-id',
      contract_valid:                     true,
      authority_valid:                    true,
      unlock_baseline_ready:              true,
      scope_valid:                        true,
      temporal_valid:                     true,
      evidence_acknowledged:              true,
      unlock_governance_acknowledged:     true,
      rollback_acknowledged:              true,
      production_risk_acknowledged:       true,
      controlled_execution_review_ready:  true,
      created_at:                         now,
      blocking_reason:                    null,
      ..._locked(),
      controlled_execution_review_ready:  true,
    };
  }

  // Contract required and ready
  if (!controlled_contract || controlled_contract.contract_ready !== true) {
    return _blocked('CONTROLLED_BINDING_BLOCKED_CONTRACT', 'controlled_contract_not_ready', {
      contract_status: controlled_contract?.contract_status ?? null,
    });
  }

  // Authority required and ready
  if (!controlled_authority || controlled_authority.authority_ready !== true) {
    return _blocked('CONTROLLED_BINDING_BLOCKED_AUTHORITY', 'controlled_authority_not_ready', {
      authority_status: controlled_authority?.authority_status ?? null,
    });
  }

  // Unlock governance baseline required
  if (!unlock_governance_baseline || unlock_governance_baseline.baseline_ready !== true) {
    return _blocked('CONTROLLED_BINDING_BLOCKED_BASELINE', 'unlock_governance_baseline_not_ready', {
      baseline_status: unlock_governance_baseline?.baseline_status ?? null,
    });
  }

  // Scope validation (optional — if both set, must match)
  const contractScope   = controlled_contract.requested_execution_scope;
  const authorityScope  = controlled_authority.authority_scope;
  if (authorityScope && contractScope && authorityScope !== contractScope) {
    return _blocked('CONTROLLED_BINDING_BLOCKED_SCOPE', 'scope_mismatch', {
      contract_scope:  contractScope,
      authority_scope: authorityScope,
    });
  }

  const binding_id = _sha256([
    'controlled-binding',
    controlled_contract.controlled_contract_id ?? '',
    controlled_authority.controlled_authority_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  return {
    schema_version:                     SCHEMA_VERSION,
    binding_id,
    binding_status:                     'CONTROLLED_BINDING_READY_REVIEW',
    binding_ready:                      true,
    controlled_contract_id:             controlled_contract.controlled_contract_id,
    controlled_authority_id:            controlled_authority.controlled_authority_id,
    unlock_baseline_id:                 unlock_governance_baseline.baseline_hash ?? null,
    contract_valid:                     true,
    authority_valid:                    true,
    unlock_baseline_ready:              true,
    scope_valid:                        true,
    temporal_valid:                     true,
    evidence_acknowledged:              controlled_authority.evidence_acknowledged === true,
    unlock_governance_acknowledged:     controlled_authority.unlock_governance_acknowledged === true,
    rollback_acknowledged:              controlled_authority.rollback_acknowledged === true,
    production_risk_acknowledged:       controlled_authority.production_risk_acknowledged === true,
    controlled_execution_review_ready:  true,
    created_at:                         now,
    blocking_reason:                    null,
    ..._locked(),
    controlled_execution_review_ready:  true,
  };
}

/**
 * Validate a controlled execution authority binding.
 */
export function validateControlledExecutionAuthorityBinding(binding) {
  if (!binding) return _blocked('CONTROLLED_BINDING_BLOCKED_CONTRACT', 'binding_null');

  if (binding.schema_version !== SCHEMA_VERSION) {
    return _blocked('CONTROLLED_BINDING_BLOCKED_CONTRACT', `schema_version_mismatch:expected_${SCHEMA_VERSION}`);
  }

  if (!binding.binding_id || typeof binding.binding_id !== 'string') {
    return _blocked('CONTROLLED_BINDING_BLOCKED_CONTRACT', 'binding_id_missing');
  }

  if (binding.production_execution_locked !== true) {
    return _blocked('CONTROLLED_BINDING_BLOCKED_CONTRACT', 'production_execution_locked_must_be_true');
  }

  if (binding.controlled_execution_allowed !== false) {
    return _blocked('CONTROLLED_BINDING_BLOCKED_CONTRACT', 'controlled_execution_allowed_must_be_false');
  }

  if (binding.unlock_executed !== false) {
    return _blocked('CONTROLLED_BINDING_BLOCKED_CONTRACT', 'unlock_executed_must_be_false');
  }

  return { valid: true, binding_id: binding.binding_id, ..._locked() };
}

/**
 * Render a human-readable binding summary.
 */
export function renderControlledExecutionAuthorityBinding(binding) {
  if (!binding) return 'controlled_execution_authority_binding: null';
  const lines = [
    `binding_status                  : ${binding.binding_status ?? 'UNKNOWN'}`,
    `binding_id                      : ${binding.binding_id ?? 'none'}`,
    `controlled_contract_id          : ${binding.controlled_contract_id ?? 'none'}`,
    `controlled_authority_id         : ${binding.controlled_authority_id ?? 'none'}`,
    `contract_valid                  : ${binding.contract_valid ?? false}`,
    `authority_valid                 : ${binding.authority_valid ?? false}`,
    `unlock_baseline_ready           : ${binding.unlock_baseline_ready ?? false}`,
    `controlled_execution_review_ready: ${binding.controlled_execution_review_ready ?? false}`,
    `production_execution_locked     : true`,
    `controlled_execution_allowed    : false`,
    `unlock_executed                 : false`,
    `final_execution_phase_required  : true`,
    `blocking_reason                 : ${binding.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('controlled-execution-authority-binding.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = bindControlledExecutionAuthorityToBaseline({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledExecutionAuthorityBinding(result));
  }

  process.exit(result.binding_ready ? 0 : 1);
}
