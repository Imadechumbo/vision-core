#!/usr/bin/env node
/**
 * Real Manual Unlock Dry-Run Executor — V72.0
 *
 * Simulates unlock execution in dry-run mode. Does NOT unlock production.
 * dry_run=true mandatory. real_execute=false mandatory.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * unlock_executed=false always.
 * real_execution_armed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v72.0';

export const UNLOCK_DRY_RUN_STATUSES = [
  'UNLOCK_DRY_RUN_BLOCKED_CONTRACT',
  'UNLOCK_DRY_RUN_BLOCKED_BINDING',
  'UNLOCK_DRY_RUN_BLOCKED_BASELINE',
  'UNLOCK_DRY_RUN_BLOCKED_NOT_DRY_RUN',
  'UNLOCK_DRY_RUN_READY',
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
    real_execution_armed:        false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:        SCHEMA_VERSION,
    unlock_dry_run_status: status,
    unlock_dry_run_ready:  false,
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
    real_execution_armed:        false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

export function runRealManualUnlockDryRun(params = {}) {
  const {
    unlock_execution_contract,
    unlock_authority_binding,
    final_preprod_baseline,
    dry_run = true,
    real_execute = false,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const dry_run_id = _sha256(`fixture-unlock-dry-run:${now}`).slice(0, 24);
    const preview_id = _sha256(`fixture-unlock-receipt-preview:${now}`).slice(0, 24);
    return {
      schema_version:              SCHEMA_VERSION,
      unlock_dry_run_id:           dry_run_id,
      unlock_dry_run_status:       'UNLOCK_DRY_RUN_READY',
      unlock_dry_run_ready:        true,
      simulated_unlock_result:     'DRY_RUN_UNLOCK_SIMULATED',
      simulated_unlocked_capabilities: [
        'tag_review_enabled',
        'stable_review_enabled',
        'release_execution_review_enabled',
      ],
      unlock_receipt_preview_id:   preview_id,
      blocking_reason:             null,
      created_at:                  now,
      ..._locked(),
    };
  }

  // dry_run must be true
  if (dry_run !== true || real_execute === true) {
    return _blocked('UNLOCK_DRY_RUN_BLOCKED_NOT_DRY_RUN', 'dry_run_must_be_true_and_real_execute_false', {
      dry_run,
      real_execute,
    });
  }

  // Contract required
  if (!unlock_execution_contract || unlock_execution_contract.contract_status !== 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW') {
    return _blocked('UNLOCK_DRY_RUN_BLOCKED_CONTRACT', 'unlock_execution_contract_not_ready', {
      contract_status: unlock_execution_contract?.contract_status ?? null,
    });
  }

  // Binding required
  if (!unlock_authority_binding || unlock_authority_binding.binding_status !== 'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW') {
    return _blocked('UNLOCK_DRY_RUN_BLOCKED_BINDING', 'unlock_authority_binding_not_ready', {
      binding_status: unlock_authority_binding?.binding_status ?? null,
    });
  }

  // Baseline required (optional but validated if present)
  if (final_preprod_baseline !== undefined && final_preprod_baseline !== null) {
    if (final_preprod_baseline.baseline_ready !== true) {
      return _blocked('UNLOCK_DRY_RUN_BLOCKED_BASELINE', 'final_preprod_baseline_not_ready', {
        baseline_status: final_preprod_baseline?.baseline_status ?? null,
      });
    }
  }

  const dry_run_id = _sha256([
    'unlock-dry-run',
    unlock_execution_contract.unlock_execution_contract_id ?? '',
    unlock_authority_binding.binding_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  const preview_id = _sha256(`unlock-receipt-preview:${dry_run_id}:${now}`).slice(0, 24);

  const scope = unlock_execution_contract.requested_unlock_scope ?? 'unlock_for_full_manual_execution_review';
  const capabilities = {
    unlock_for_tag_review:                  ['tag_review_enabled'],
    unlock_for_stable_review:               ['stable_review_enabled'],
    unlock_for_release_execution_review:    ['release_execution_review_enabled'],
    unlock_for_full_manual_execution_review: ['tag_review_enabled', 'stable_review_enabled', 'release_execution_review_enabled'],
  }[scope] ?? [];

  return {
    schema_version:              SCHEMA_VERSION,
    unlock_dry_run_id:           dry_run_id,
    unlock_dry_run_status:       'UNLOCK_DRY_RUN_READY',
    unlock_dry_run_ready:        true,
    simulated_unlock_result:     'DRY_RUN_UNLOCK_SIMULATED',
    simulated_unlocked_capabilities: capabilities,
    unlock_receipt_preview_id:   preview_id,
    blocking_reason:             null,
    created_at:                  now,
    ..._locked(),
  };
}

export function validateRealManualUnlockDryRun(result) {
  if (!result)                                                  return { valid: false, reason: 'UNLOCK_DRY_RUN_BLOCKED_CONTRACT' };
  if (result.schema_version !== SCHEMA_VERSION)                return { valid: false, reason: 'invalid_schema' };
  if (result.unlock_dry_run_status !== 'UNLOCK_DRY_RUN_READY') return { valid: false, reason: result.unlock_dry_run_status };
  if (result.production_execution_locked !== true)             return { valid: false, reason: 'invariant_violation' };
  if (result.unlock_executed !== false)                        return { valid: false, reason: 'invariant_violation' };
  if (result.real_execution_armed !== false)                   return { valid: false, reason: 'invariant_violation' };
  return { valid: true, reason: null };
}

export function renderRealManualUnlockDryRunSummary(result) {
  if (!result) return 'real_manual_unlock_dry_run: null';
  return [
    `unlock_dry_run_status          : ${result.unlock_dry_run_status ?? 'UNKNOWN'}`,
    `unlock_dry_run_id              : ${result.unlock_dry_run_id ?? 'none'}`,
    `simulated_unlock_result        : ${result.simulated_unlock_result ?? 'none'}`,
    `unlock_receipt_preview_id      : ${result.unlock_receipt_preview_id ?? 'none'}`,
    `real_execution_armed           : false`,
    `unlock_executed                : false`,
    `production_execution_locked    : true`,
    `blocking_reason                : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-manual-unlock-dry-run-executor.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runRealManualUnlockDryRun({ fixture_mode: fixture, dry_run: true, real_execute: false });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealManualUnlockDryRunSummary(result));
  }

  process.exit(result.unlock_dry_run_ready ? 0 : 1);
}
