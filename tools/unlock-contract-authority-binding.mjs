#!/usr/bin/env node
/**
 * Unlock Contract Authority Binding — V61.2
 *
 * Binds production unlock contract + human authority + real gate baseline.
 * Review-only. Does NOT execute unlock, release, tag, stable, or deploy.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always. unlock_executed=false always.
 */

import { sha256, makeLockedFlags } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v61.2';

export const UNLOCK_BINDING_STATUSES = [
  'UNLOCK_BINDING_BLOCKED_CONTRACT',
  'UNLOCK_BINDING_BLOCKED_AUTHORITY',
  'UNLOCK_BINDING_BLOCKED_BASELINE',
  'UNLOCK_BINDING_BLOCKED_SCOPE',
  'UNLOCK_BINDING_BLOCKED_TEMPORAL',
  'UNLOCK_BINDING_READY_REVIEW',
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
      'unlock_executed',
    ]),
    production_execution_locked:     true,
    unlock_review_only:              true,
    future_execution_phase_required: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    binding_status:   status,
    binding_ready:    false,
    unlock_review_ready: false,
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
 * Bind unlock contract to human authority with real gate baseline.
 */
export function bindUnlockContractAuthority(params = {}) {
  const {
    unlock_contract,
    unlock_authority,
    real_gate_baseline,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const binding_id = _sha256(`fixture-unlock-binding:${now}`).slice(0, 24);
    return {
      schema_version:               SCHEMA_VERSION,
      binding_id,
      binding_status:               'UNLOCK_BINDING_READY_REVIEW',
      binding_ready:                true,
      unlock_contract_id:           'fixture-unlock-contract-id',
      unlock_authority_id:          'fixture-unlock-authority-id',
      real_gate_baseline_id:        'fixture-baseline-id',
      contract_valid:               true,
      authority_valid:              true,
      baseline_ready:               true,
      scope_valid:                  true,
      temporal_valid:               true,
      evidence_acknowledged:        true,
      lock_acknowledged:            true,
      rollback_acknowledged:        true,
      production_risk_acknowledged: true,
      unlock_review_ready:          true,
      created_at:                   now,
      blocking_reason:              null,
      ..._locked(),
    };
  }

  // Contract required and ready
  if (!unlock_contract || unlock_contract.contract_ready !== true) {
    return _blocked('UNLOCK_BINDING_BLOCKED_CONTRACT', 'unlock_contract_not_ready', {
      contract_status: unlock_contract?.contract_status ?? null,
    });
  }

  // Authority required and ready
  if (!unlock_authority || unlock_authority.authority_ready !== true) {
    return _blocked('UNLOCK_BINDING_BLOCKED_AUTHORITY', 'unlock_authority_not_ready', {
      authority_status: unlock_authority?.authority_status ?? null,
    });
  }

  // Real gate baseline required
  if (!real_gate_baseline || real_gate_baseline.baseline_ready !== true) {
    return _blocked('UNLOCK_BINDING_BLOCKED_BASELINE', 'real_gate_baseline_not_ready', {
      baseline_status: real_gate_baseline?.baseline_status ?? null,
    });
  }

  // Scope validation
  const contractScope   = unlock_contract.requested_scope;
  const authorityScope  = unlock_authority.authority_scope;
  if (authorityScope && contractScope && authorityScope !== contractScope) {
    return _blocked('UNLOCK_BINDING_BLOCKED_SCOPE', 'scope_mismatch', {
      contract_scope:  contractScope,
      authority_scope: authorityScope,
    });
  }

  const binding_id = _sha256([
    'unlock-binding',
    unlock_contract.unlock_contract_id ?? '',
    unlock_authority.unlock_authority_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  return {
    schema_version:               SCHEMA_VERSION,
    binding_id,
    binding_status:               'UNLOCK_BINDING_READY_REVIEW',
    binding_ready:                true,
    unlock_contract_id:           unlock_contract.unlock_contract_id,
    unlock_authority_id:          unlock_authority.unlock_authority_id,
    real_gate_baseline_id:        real_gate_baseline.baseline_version ?? null,
    contract_valid:               true,
    authority_valid:              true,
    baseline_ready:               true,
    scope_valid:                  true,
    temporal_valid:               true,
    evidence_acknowledged:        unlock_authority.evidence_acknowledged === true,
    lock_acknowledged:            unlock_authority.lock_acknowledged === true,
    rollback_acknowledged:        unlock_authority.rollback_acknowledged === true,
    production_risk_acknowledged: unlock_authority.production_risk_acknowledged === true,
    unlock_review_ready:          true,
    created_at:                   now,
    blocking_reason:              null,
    ..._locked(),
  };
}

/**
 * Validate an unlock contract authority binding.
 */
export function validateUnlockContractAuthorityBinding(binding) {
  if (!binding) return _blocked('UNLOCK_BINDING_BLOCKED_CONTRACT', 'binding_null');

  if (binding.schema_version !== SCHEMA_VERSION) {
    return _blocked('UNLOCK_BINDING_BLOCKED_CONTRACT', `schema_version_mismatch:expected_${SCHEMA_VERSION}`);
  }

  if (!binding.binding_id || typeof binding.binding_id !== 'string') {
    return _blocked('UNLOCK_BINDING_BLOCKED_CONTRACT', 'binding_id_missing');
  }

  if (binding.production_execution_locked !== true) {
    return _blocked('UNLOCK_BINDING_BLOCKED_CONTRACT', 'production_execution_locked_must_be_true');
  }

  if (binding.unlock_executed !== false) {
    return _blocked('UNLOCK_BINDING_BLOCKED_CONTRACT', 'unlock_executed_must_be_false');
  }

  return { valid: true, binding_id: binding.binding_id, ..._locked() };
}

/**
 * Render a human-readable binding summary.
 */
export function renderUnlockContractAuthorityBinding(binding) {
  if (!binding) return 'unlock_binding: null';
  const lines = [
    `binding_status               : ${binding.binding_status ?? 'UNKNOWN'}`,
    `binding_id                   : ${binding.binding_id ?? 'none'}`,
    `unlock_contract_id           : ${binding.unlock_contract_id ?? 'none'}`,
    `unlock_authority_id          : ${binding.unlock_authority_id ?? 'none'}`,
    `contract_valid               : ${binding.contract_valid ?? false}`,
    `authority_valid              : ${binding.authority_valid ?? false}`,
    `baseline_ready               : ${binding.baseline_ready ?? false}`,
    `unlock_review_ready          : ${binding.unlock_review_ready ?? false}`,
    `production_execution_locked  : true`,
    `unlock_executed              : false`,
    `blocking_reason              : ${binding.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('unlock-contract-authority-binding.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = bindUnlockContractAuthority({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderUnlockContractAuthorityBinding(result));
  }

  process.exit(result.binding_ready ? 0 : 1);
}
