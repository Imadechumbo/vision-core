#!/usr/bin/env node
/**
 * Controlled Runtime Execution Plan — V152.1
 *
 * Builds a sealed execution plan from a completed dry-run. The plan is
 * immutable once sealed; actual execution requires a separate human command.
 *
 * Statuses:
 *   EXECUTION_PLAN_BLOCKED_DRY_RUN    — dry run not ready or inputs missing
 *   EXECUTION_PLAN_REQUIRES_HUMAN     — plan sealed but waiting for human command
 *   EXECUTION_PLAN_READY              — plan sealed and human command confirmed
 *
 * REGRA ABSOLUTA: command_is_sealed=true, command_executed=false,
 * execution_performed=false, stable_promoted=false, deploy_performed=false,
 * release_performed=false always. human_command_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v152.1';

export const EXECUTION_PLAN_STATUSES = [
  'EXECUTION_PLAN_BLOCKED_DRY_RUN',
  'EXECUTION_PLAN_REQUIRES_HUMAN',
  'EXECUTION_PLAN_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    command_is_sealed:    true,
    command_executed:     false,
    execution_performed:  false,
    stable_promoted:      false,
    deploy_performed:     false,
    release_performed:    false,
    human_command_required: true,
  };
}

export function buildControlledRuntimeExecutionPlan(params) {
  const {
    plan_id,
    dry_run_id,
    command_type,
    dry_run_status,
    dry_run_ready               = false,
    pass_gold_receipt_id,
    rollback_plan_id,
    human_command_confirmed     = false,
    human_command_token,
    planned_at,
  } = params || {};

  const plan_id_hash = _sha256([plan_id, dry_run_id, command_type].join('|'));
  const ts = planned_at ?? new Date().toISOString();

  if (!plan_id || String(plan_id).trim() === '' || !dry_run_id || !command_type) {
    return {
      plan_id_hash,
      schema_version:         SCHEMA_VERSION,
      execution_plan_status:  'EXECUTION_PLAN_BLOCKED_DRY_RUN',
      blocked_reason:         'plan_id, dry_run_id, and command_type are required.',
      plan_ready:             false,
      planned_at:             ts,
      ..._locked(),
    };
  }

  if (dry_run_status !== 'CONTROLLED_DRY_RUN_READY' || !dry_run_ready) {
    return {
      plan_id_hash,
      schema_version:         SCHEMA_VERSION,
      execution_plan_status:  'EXECUTION_PLAN_BLOCKED_DRY_RUN',
      blocked_reason:         'dry_run_status=CONTROLLED_DRY_RUN_READY and dry_run_ready=true required.',
      plan_ready:             false,
      plan_id,
      dry_run_id,
      command_type,
      dry_run_status:         dry_run_status ?? null,
      dry_run_ready,
      planned_at:             ts,
      ..._locked(),
    };
  }

  const approval_token_hash = human_command_token ? _sha256(human_command_token) : null;

  if (!human_command_confirmed) {
    return {
      plan_id_hash,
      schema_version:         SCHEMA_VERSION,
      execution_plan_status:  'EXECUTION_PLAN_REQUIRES_HUMAN',
      plan_ready:             false,
      plan_id,
      dry_run_id,
      command_type,
      dry_run_status,
      dry_run_ready,
      pass_gold_receipt_id:   pass_gold_receipt_id ?? null,
      rollback_plan_id:       rollback_plan_id ?? null,
      approval_token_hash,
      human_command_confirmed,
      planned_at:             ts,
      ..._locked(),
    };
  }

  return {
    plan_id_hash,
    schema_version:           SCHEMA_VERSION,
    execution_plan_status:    'EXECUTION_PLAN_READY',
    plan_ready:               true,
    plan_id,
    dry_run_id,
    command_type,
    dry_run_status,
    dry_run_ready,
    pass_gold_receipt_id:     pass_gold_receipt_id ?? null,
    rollback_plan_id:         rollback_plan_id ?? null,
    approval_token_hash,
    human_command_confirmed,
    planned_at:               ts,
    ..._locked(),
  };
}

export function validateControlledRuntimeExecutionPlan(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'plan_id_hash', 'schema_version', 'execution_plan_status',
    'plan_ready',
    'command_is_sealed', 'command_executed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
    'human_command_required',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.command_is_sealed    !== true)  errors.push('command_is_sealed must be true');
  if (result.command_executed     !== false) errors.push('command_executed must be false');
  if (result.execution_performed  !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted      !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed     !== false) errors.push('deploy_performed must be false');
  if (result.release_performed    !== false) errors.push('release_performed must be false');
  if (result.human_command_required !== true) errors.push('human_command_required must be true');
  if (!EXECUTION_PLAN_STATUSES.includes(result.execution_plan_status)) {
    errors.push(`invalid execution_plan_status: ${result.execution_plan_status}`);
  }
  if (result.execution_plan_status === 'EXECUTION_PLAN_READY') {
    if (result.plan_ready !== true) errors.push('READY requires plan_ready=true');
    if (!result.human_command_confirmed) errors.push('READY requires human_command_confirmed=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledRuntimeExecutionPlan(result) {
  if (!result || typeof result !== 'object') {
    return '[CONTROLLED_RUNTIME_EXECUTION_PLAN] No result to render.';
  }
  const lines = [
    `=== Controlled Runtime Execution Plan [${SCHEMA_VERSION}] ===`,
    `Status:                    ${result.execution_plan_status ?? 'N/A'}`,
    `Plan ID:                   ${result.plan_id ?? 'N/A'}`,
    `Dry-run ID:                ${result.dry_run_id ?? 'N/A'}`,
    `Command type:              ${result.command_type ?? 'N/A'}`,
    `Plan ready:                ${result.plan_ready}`,
    `--- Dry-run gate ---`,
    `dry_run_status:            ${result.dry_run_status ?? 'N/A'}`,
    `dry_run_ready:             ${result.dry_run_ready}`,
    `--- Human command ---`,
    `human_command_confirmed:   ${result.human_command_confirmed}`,
    `approval_token_hash:       ${result.approval_token_hash ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `command_is_sealed=true | command_executed=false | execution_performed=false | human_command_required=true`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:            ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-runtime-execution-plan.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildControlledRuntimeExecutionPlan({
    plan_id:                 'v152.1-plan',
    dry_run_id:              'v152.0-dry-run',
    command_type:            'CONTROLLED_RUNTIME_EXECUTION',
    dry_run_status:          'CONTROLLED_DRY_RUN_READY',
    dry_run_ready:           true,
    pass_gold_receipt_id:    'pg-receipt-001',
    rollback_plan_id:        'rbp-001',
    human_command_token:     'tok-human-001',
    human_command_confirmed: true,
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledRuntimeExecutionPlan(result));
  }
  const v = validateControlledRuntimeExecutionPlan(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
