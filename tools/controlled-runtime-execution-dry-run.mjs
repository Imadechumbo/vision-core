#!/usr/bin/env node
/**
 * Controlled Runtime Execution Dry-Run — V152.0
 *
 * Consolidates all prior gates (command contract, phrase verifier, truth gate,
 * pass gold, rollback plan) into a single dry-run readiness check. Only signals
 * READY when every gate passes; otherwise returns a specific blocked status.
 *
 * Statuses:
 *   CONTROLLED_DRY_RUN_BLOCKED_COMMAND    — missing/invalid command inputs
 *   CONTROLLED_DRY_RUN_BLOCKED_TRUTH      — anti-hallucination or truth gate failed
 *   CONTROLLED_DRY_RUN_BLOCKED_PASS_GOLD  — pass gold receipt missing or unverified
 *   CONTROLLED_DRY_RUN_BLOCKED_ROLLBACK   — rollback plan missing or not ready
 *   CONTROLLED_DRY_RUN_READY              — all gates passed; dry run may proceed
 *
 * REGRA ABSOLUTA: command_executed=false, execution_performed=false,
 * stable_promoted=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v152.0';

export const CONTROLLED_DRY_RUN_STATUSES = [
  'CONTROLLED_DRY_RUN_BLOCKED_COMMAND',
  'CONTROLLED_DRY_RUN_BLOCKED_TRUTH',
  'CONTROLLED_DRY_RUN_BLOCKED_PASS_GOLD',
  'CONTROLLED_DRY_RUN_BLOCKED_ROLLBACK',
  'CONTROLLED_DRY_RUN_READY',
];

export const CONTROLLED_DRY_RUN_COMMAND_TYPES = [
  'CONTROLLED_RUNTIME_EXECUTION',
  'CONTROLLED_STABLE_PROMOTION',
  'CONTROLLED_DEPLOY',
  'CONTROLLED_RELEASE',
  'CONTROLLED_ROLLBACK_DRILL',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    command_executed:    false,
    execution_performed: false,
    stable_promoted:     false,
    deploy_performed:    false,
    release_performed:   false,
  };
}

export function buildControlledRuntimeExecutionDryRun(params) {
  const {
    dry_run_id,
    command_type,
    contract_id,
    phrase_verified                    = false,
    anti_hallucination_runtime_ready   = false,
    truth_gate_status,
    truth_score                        = 0,
    pass_gold_receipt_id,
    pass_gold_verified                 = false,
    rollback_plan_id,
    rollback_plan_ready                = false,
    initiated_at,
  } = params || {};

  const dry_run_id_hash = _sha256([dry_run_id, command_type, contract_id].join('|'));
  const ts = initiated_at ?? new Date().toISOString();

  if (!dry_run_id || String(dry_run_id).trim() === '' || !command_type || !contract_id) {
    return {
      dry_run_id_hash,
      schema_version:            SCHEMA_VERSION,
      controlled_dry_run_status: 'CONTROLLED_DRY_RUN_BLOCKED_COMMAND',
      blocked_reason:            'dry_run_id, command_type, and contract_id are required.',
      dry_run_ready:             false,
      initiated_at:              ts,
      ..._locked(),
    };
  }

  if (!CONTROLLED_DRY_RUN_COMMAND_TYPES.includes(command_type)) {
    return {
      dry_run_id_hash,
      schema_version:            SCHEMA_VERSION,
      controlled_dry_run_status: 'CONTROLLED_DRY_RUN_BLOCKED_COMMAND',
      blocked_reason:            `unknown command_type: ${command_type}`,
      dry_run_ready:             false,
      dry_run_id,
      command_type,
      contract_id,
      initiated_at:              ts,
      ..._locked(),
    };
  }

  if (!phrase_verified) {
    return {
      dry_run_id_hash,
      schema_version:            SCHEMA_VERSION,
      controlled_dry_run_status: 'CONTROLLED_DRY_RUN_BLOCKED_COMMAND',
      blocked_reason:            'phrase_verified=true required.',
      dry_run_ready:             false,
      dry_run_id,
      command_type,
      contract_id,
      phrase_verified,
      initiated_at:              ts,
      ..._locked(),
    };
  }

  if (!anti_hallucination_runtime_ready || truth_gate_status !== 'TRUSTED' || truth_score < 80) {
    return {
      dry_run_id_hash,
      schema_version:            SCHEMA_VERSION,
      controlled_dry_run_status: 'CONTROLLED_DRY_RUN_BLOCKED_TRUTH',
      blocked_reason:            'anti_hallucination_runtime_ready=true, truth_gate_status=TRUSTED, truth_score>=80 required.',
      dry_run_ready:             false,
      dry_run_id,
      command_type,
      contract_id,
      phrase_verified,
      anti_hallucination_runtime_ready,
      truth_gate_status:         truth_gate_status ?? null,
      truth_score,
      initiated_at:              ts,
      ..._locked(),
    };
  }

  if (!pass_gold_receipt_id || String(pass_gold_receipt_id).trim() === '' || !pass_gold_verified) {
    return {
      dry_run_id_hash,
      schema_version:            SCHEMA_VERSION,
      controlled_dry_run_status: 'CONTROLLED_DRY_RUN_BLOCKED_PASS_GOLD',
      blocked_reason:            'pass_gold_receipt_id and pass_gold_verified=true required.',
      dry_run_ready:             false,
      dry_run_id,
      command_type,
      contract_id,
      phrase_verified,
      anti_hallucination_runtime_ready,
      truth_gate_status,
      truth_score,
      pass_gold_verified,
      initiated_at:              ts,
      ..._locked(),
    };
  }

  if (!rollback_plan_id || String(rollback_plan_id).trim() === '' || !rollback_plan_ready) {
    return {
      dry_run_id_hash,
      schema_version:            SCHEMA_VERSION,
      controlled_dry_run_status: 'CONTROLLED_DRY_RUN_BLOCKED_ROLLBACK',
      blocked_reason:            'rollback_plan_id and rollback_plan_ready=true required.',
      dry_run_ready:             false,
      dry_run_id,
      command_type,
      contract_id,
      phrase_verified,
      anti_hallucination_runtime_ready,
      truth_gate_status,
      truth_score,
      pass_gold_verified,
      rollback_plan_ready,
      initiated_at:              ts,
      ..._locked(),
    };
  }

  return {
    dry_run_id_hash,
    schema_version:                    SCHEMA_VERSION,
    controlled_dry_run_status:         'CONTROLLED_DRY_RUN_READY',
    dry_run_ready:                     true,
    dry_run_id,
    command_type,
    contract_id,
    phrase_verified,
    anti_hallucination_runtime_ready,
    truth_gate_status,
    truth_score,
    pass_gold_receipt_id,
    pass_gold_verified,
    rollback_plan_id,
    rollback_plan_ready,
    initiated_at:                      ts,
    ..._locked(),
  };
}

export function validateControlledRuntimeExecutionDryRun(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'dry_run_id_hash', 'schema_version', 'controlled_dry_run_status',
    'dry_run_ready',
    'command_executed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.command_executed    !== false) errors.push('command_executed must be false');
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted     !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed    !== false) errors.push('deploy_performed must be false');
  if (result.release_performed   !== false) errors.push('release_performed must be false');
  if (!CONTROLLED_DRY_RUN_STATUSES.includes(result.controlled_dry_run_status)) {
    errors.push(`invalid controlled_dry_run_status: ${result.controlled_dry_run_status}`);
  }
  if (result.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_READY') {
    if (result.dry_run_ready !== true) errors.push('READY requires dry_run_ready=true');
    if (!result.pass_gold_verified) errors.push('READY requires pass_gold_verified=true');
    if (!result.rollback_plan_ready) errors.push('READY requires rollback_plan_ready=true');
    if (!result.phrase_verified) errors.push('READY requires phrase_verified=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledRuntimeExecutionDryRun(result) {
  if (!result || typeof result !== 'object') {
    return '[CONTROLLED_RUNTIME_EXECUTION_DRY_RUN] No result to render.';
  }
  const lines = [
    `=== Controlled Runtime Execution Dry-Run [${SCHEMA_VERSION}] ===`,
    `Status:                          ${result.controlled_dry_run_status ?? 'N/A'}`,
    `Dry-run ID:                      ${result.dry_run_id ?? 'N/A'}`,
    `Command type:                    ${result.command_type ?? 'N/A'}`,
    `Contract ID:                     ${result.contract_id ?? 'N/A'}`,
    `Dry-run ready:                   ${result.dry_run_ready}`,
    `--- Gates ---`,
    `phrase_verified:                 ${result.phrase_verified}`,
    `anti_hallucination_ready:        ${result.anti_hallucination_runtime_ready}`,
    `truth_gate_status:               ${result.truth_gate_status ?? 'N/A'}`,
    `truth_score:                     ${result.truth_score ?? 'N/A'}`,
    `pass_gold_verified:              ${result.pass_gold_verified}`,
    `rollback_plan_ready:             ${result.rollback_plan_ready}`,
    `--- REGRA ABSOLUTA ---`,
    `command_executed=false | execution_performed=false | stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:                  ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-runtime-execution-dry-run.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildControlledRuntimeExecutionDryRun({
    dry_run_id:                       'v152.0-dry-run',
    command_type:                     'CONTROLLED_RUNTIME_EXECUTION',
    contract_id:                      'v151.0-contract',
    phrase_verified:                  true,
    anti_hallucination_runtime_ready: true,
    truth_gate_status:                'TRUSTED',
    truth_score:                      90,
    pass_gold_receipt_id:             'pg-receipt-001',
    pass_gold_verified:               true,
    rollback_plan_id:                 'rbp-001',
    rollback_plan_ready:              true,
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledRuntimeExecutionDryRun(result));
  }
  const v = validateControlledRuntimeExecutionDryRun(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
