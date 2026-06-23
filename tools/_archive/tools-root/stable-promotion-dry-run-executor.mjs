#!/usr/bin/env node
/**
 * Stable Promotion Dry-Run Executor — V118.0
 *
 * Simulates stable promotion command execution in dry-run mode.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false,
 * commands_executed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v118.0';

export const DRY_RUN_EXECUTOR_STATUSES = [
  'DRY_RUN_BLOCKED_COMMAND_BLOCK',
  'DRY_RUN_BLOCKED_SAFETY',
  'DRY_RUN_SIMULATED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed: false,
    stable_promoted:          false,
    git_push_performed:       false,
    deploy_performed:         false,
    release_performed:        false,
    commands_executed:        false,
    real_execution_performed: false,
    dry_run_only:             true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    executor_status: status,
    dry_run_ready:   false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _executorId(block_id) {
  return _sha256([block_id || '', 'dre-v118.0'].join('|'));
}

function _simulateCommand(cmd) {
  return {
    command:      cmd,
    simulated:    true,
    executed:     false,
    exit_code_sim: 0,
    output_sim:   `[DRY-RUN] Would execute: ${cmd}`,
  };
}

export function runStablePromotionDryRunExecutor(params) {
  const { stable_promotion_command_block, allow_real_execution } = params || {};

  if (!stable_promotion_command_block || !stable_promotion_command_block.render_ready) {
    return _blocked('DRY_RUN_BLOCKED_COMMAND_BLOCK', 'stable_promotion_command_block not ready');
  }

  if (allow_real_execution === true) {
    return _blocked('DRY_RUN_BLOCKED_SAFETY', 'allow_real_execution=true is forbidden in dry-run executor');
  }

  const block = stable_promotion_command_block;
  const executor_id = _executorId(block.command_block_id);

  const simulated_preflight   = (block.rendered_preflight   || []).map(_simulateCommand);
  const simulated_promotion   = (block.rendered_promotion   || []).map(_simulateCommand);
  const simulated_verification = (block.rendered_verification || []).map(_simulateCommand);
  const simulated_rollback    = (block.rendered_rollback    || []).map(_simulateCommand);

  return {
    schema_version:        SCHEMA_VERSION,
    executor_id,
    executor_status:       'DRY_RUN_SIMULATED',
    dry_run_ready:         true,
    command_block_id:      block.command_block_id,
    target_stable_ref:     block.target_stable_ref,
    target_tag:            block.target_tag,
    simulated_preflight,
    simulated_promotion,
    simulated_verification,
    simulated_rollback,
    total_commands_simulated:
      simulated_preflight.length +
      simulated_promotion.length +
      simulated_verification.length +
      simulated_rollback.length,
    ..._locked(),
  };
}

export function validateStablePromotionDryRunExecutor(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null/undefined'] };
  }

  const errors = [];

  if (!DRY_RUN_EXECUTOR_STATUSES.includes(result.executor_status)) {
    errors.push(`invalid executor_status: ${result.executor_status}`);
  }
  if (result.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (result.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (result.commands_executed !== false) errors.push('commands_executed must be false');
  if (result.real_execution_performed !== false) errors.push('real_execution_performed must be false');
  if (result.dry_run_only !== true) errors.push('dry_run_only must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionDryRunExecutor(result) {
  if (!result || !result.dry_run_ready) {
    return `[DRY-RUN EXECUTOR BLOCKED] ${result?.executor_status || 'unknown'}: ${result?.blocking_reason || 'unknown reason'}`;
  }

  const lines = [
    `=== STABLE PROMOTION DRY-RUN EXECUTOR ===`,
    `Schema:          ${result.schema_version}`,
    `Executor ID:     ${result.executor_id}`,
    `Status:          ${result.executor_status}`,
    `Target Ref:      ${result.target_stable_ref}`,
    `Target Tag:      ${result.target_tag}`,
    `Commands Simulated: ${result.total_commands_simulated}`,
    ``,
    `--- SIMULATED PREFLIGHT ---`,
    ...result.simulated_preflight.map(s => `  [SIM] ${s.command}`),
    ``,
    `--- SIMULATED PROMOTION (NOT EXECUTED) ---`,
    ...result.simulated_promotion.map(s => `  [SIM] ${s.command}`),
    ``,
    `--- SIMULATED VERIFICATION ---`,
    ...result.simulated_verification.map(s => `  [SIM] ${s.command}`),
    ``,
    `--- SIMULATED ROLLBACK ---`,
    ...result.simulated_rollback.map(s => `  [SIM] ${s.command}`),
    ``,
    `stable_promotion_allowed:  ${result.stable_promotion_allowed}`,
    `stable_promoted:           ${result.stable_promoted}`,
    `commands_executed:         ${result.commands_executed}`,
    `dry_run_only:              ${result.dry_run_only}`,
  ];

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-dry-run-executor.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockBlock = {
    render_ready:          true,
    command_block_id:      'mock-block-v1180',
    target_stable_ref:     'stable',
    target_tag:            'v118.0-mock',
    rendered_preflight:    ['git fetch origin', 'git status'],
    rendered_promotion:    ['git branch -f stable v118.0-mock', 'git push origin stable'],
    rendered_verification: ['git log origin/stable --oneline -3'],
    rendered_rollback:     ['git branch -f stable <ROLLBACK>', 'git push origin stable'],
  };

  const result = runStablePromotionDryRunExecutor({ stable_promotion_command_block: mockBlock });

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderStablePromotionDryRunExecutor(result));
  }
}
