#!/usr/bin/env node
/**
 * Real Manual Unlock Authority Binding — V71.1
 *
 * Binds real manual unlock execution contract to controlled execution human authority.
 * Does NOT execute unlock. Review-only.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * unlock_executed=false always.
 * real_execution_armed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v71.1';

export const REAL_UNLOCK_BINDING_STATUSES = [
  'REAL_UNLOCK_BINDING_BLOCKED_CONTRACT',
  'REAL_UNLOCK_BINDING_BLOCKED_AUTHORITY',
  'REAL_UNLOCK_BINDING_BLOCKED_SCOPE',
  'REAL_UNLOCK_BINDING_BLOCKED_TEMPORAL',
  'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW',
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
    real_unlock_review_ready:    false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    binding_status:  status,
    binding_ready:   false,
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
    real_unlock_review_ready:    false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

export function bindRealManualUnlockAuthority(params = {}) {
  const {
    unlock_execution_contract,
    controlled_authority,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const binding_id = _sha256(`fixture-unlock-binding:${now}`).slice(0, 24);
    return {
      schema_version:                  SCHEMA_VERSION,
      binding_id,
      binding_status:                  'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW',
      binding_ready:                   true,
      unlock_execution_contract_id:    'fixture-unlock-exec-contract-id',
      controlled_authority_id:         'fixture-controlled-authority-id',
      contract_valid:                  true,
      authority_valid:                 true,
      scope_valid:                     true,
      temporal_valid:                  true,
      evidence_acknowledged:           true,
      production_risk_acknowledged:    true,
      rollback_acknowledged:           true,
      real_unlock_review_ready:        true,
      blocking_reason:                 null,
      created_at:                      now,
      ..._locked(),
      real_unlock_review_ready:        true,
    };
  }

  // Contract required
  if (!unlock_execution_contract || unlock_execution_contract.contract_status !== 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW') {
    return _blocked('REAL_UNLOCK_BINDING_BLOCKED_CONTRACT', 'unlock_execution_contract_not_ready', {
      contract_status: unlock_execution_contract?.contract_status ?? null,
    });
  }

  // Authority required
  if (!controlled_authority || controlled_authority.authority_status !== 'CONTROLLED_AUTHORITY_READY_REVIEW') {
    return _blocked('REAL_UNLOCK_BINDING_BLOCKED_AUTHORITY', 'controlled_authority_not_ready', {
      authority_status: controlled_authority?.authority_status ?? null,
    });
  }

  // Scope check — authority must acknowledge unlock scope
  const scope = unlock_execution_contract.requested_unlock_scope;
  if (!scope) {
    return _blocked('REAL_UNLOCK_BINDING_BLOCKED_SCOPE', 'requested_unlock_scope_missing', {});
  }

  // Temporal check — contract must not be expired
  const expiresAt = unlock_execution_contract.expires_at;
  if (expiresAt && new Date(now) > new Date(expiresAt)) {
    return _blocked('REAL_UNLOCK_BINDING_BLOCKED_TEMPORAL', 'unlock_execution_contract_expired', {
      expires_at: expiresAt,
    });
  }

  const binding_id = _sha256([
    'real-unlock-binding',
    unlock_execution_contract.unlock_execution_contract_id ?? '',
    controlled_authority.controlled_authority_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  const evidence_acknowledged        = controlled_authority.acknowledgements?.includes('evidence_reviewed') === true;
  const production_risk_acknowledged = controlled_authority.acknowledgements?.includes('production_risk_understood') === true;
  const rollback_acknowledged        = controlled_authority.acknowledgements?.includes('rollback_plan_reviewed') === true;

  return {
    schema_version:                  SCHEMA_VERSION,
    binding_id,
    binding_status:                  'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW',
    binding_ready:                   true,
    unlock_execution_contract_id:    unlock_execution_contract.unlock_execution_contract_id,
    controlled_authority_id:         controlled_authority.controlled_authority_id ?? null,
    contract_valid:                  true,
    authority_valid:                 true,
    scope_valid:                     true,
    temporal_valid:                  true,
    evidence_acknowledged,
    production_risk_acknowledged,
    rollback_acknowledged,
    real_unlock_review_ready:        true,
    blocking_reason:                 null,
    created_at:                      now,
    ..._locked(),
    real_unlock_review_ready:        true,
  };
}

export function validateRealManualUnlockAuthorityBinding(binding) {
  if (!binding)                                                          return { valid: false, reason: 'REAL_UNLOCK_BINDING_BLOCKED_CONTRACT' };
  if (binding.schema_version !== SCHEMA_VERSION)                        return { valid: false, reason: 'REAL_UNLOCK_BINDING_BLOCKED_CONTRACT' };
  if (!binding.binding_id)                                              return { valid: false, reason: 'REAL_UNLOCK_BINDING_BLOCKED_CONTRACT' };
  if (binding.binding_status !== 'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW') return { valid: false, reason: binding.binding_status };
  if (binding.production_execution_locked !== true)                     return { valid: false, reason: 'invariant_violation' };
  if (binding.unlock_executed !== false)                                return { valid: false, reason: 'invariant_violation' };
  if (binding.real_execution_armed !== false)                           return { valid: false, reason: 'invariant_violation' };
  return { valid: true, reason: null };
}

export function renderRealManualUnlockAuthorityBinding(binding) {
  if (!binding) return 'real_manual_unlock_authority_binding: null';
  return [
    `binding_status                : ${binding.binding_status ?? 'UNKNOWN'}`,
    `binding_id                    : ${binding.binding_id ?? 'none'}`,
    `real_unlock_review_ready      : ${binding.real_unlock_review_ready ?? false}`,
    `contract_valid                : ${binding.contract_valid ?? false}`,
    `authority_valid               : ${binding.authority_valid ?? false}`,
    `manual_execution_only         : true`,
    `dry_run_required              : true`,
    `real_execution_armed          : false`,
    `unlock_executed               : false`,
    `production_execution_locked   : true`,
    `blocking_reason               : ${binding.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-manual-unlock-authority-binding.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = bindRealManualUnlockAuthority({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealManualUnlockAuthorityBinding(result));
  }

  process.exit(result.binding_ready ? 0 : 1);
}
