#!/usr/bin/env node
/**
 * Human Execution Command Contract — V151.0
 *
 * Validates that a human execution command meets all preconditions before
 * it can be queued for dry-run. Never authorizes actual execution.
 *
 * Command types:
 *   CONTROLLED_RUNTIME_EXECUTION
 *   CONTROLLED_STABLE_PROMOTION
 *   CONTROLLED_DEPLOY
 *   CONTROLLED_RELEASE
 *   CONTROLLED_ROLLBACK_DRILL
 *
 * REGRA ABSOLUTA: command_authorized=false, execution_performed=false,
 * stable_promoted=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v151.0';

export const HUMAN_COMMAND_STATUSES = [
  'HUMAN_COMMAND_BLOCKED_INPUT',
  'HUMAN_COMMAND_BLOCKED_TRUTH',
  'HUMAN_COMMAND_BLOCKED_PASS_GOLD',
  'HUMAN_COMMAND_BLOCKED_ROLLBACK',
  'HUMAN_COMMAND_BLOCKED_APPROVAL',
  'HUMAN_COMMAND_READY_FOR_DRY_RUN',
];

export const HUMAN_COMMAND_TYPES = [
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
    command_authorized:  false,
    execution_performed: false,
    stable_promoted:     false,
    deploy_performed:    false,
    release_performed:   false,
  };
}

export function buildHumanExecutionCommandContract(params) {
  const {
    contract_id,
    command_type,
    anti_hallucination_runtime_ready   = false,
    truth_gate_status,
    truth_score                        = 0,
    pass_gold_receipt_id,
    pass_gold_verified                 = false,
    rollback_plan_id,
    rollback_plan_ready                = false,
    human_approval_token,
    human_approval_verified            = false,
    issued_at,
  } = params || {};

  const contract_id_hash = _sha256([
    contract_id,
    command_type,
    pass_gold_receipt_id,
    rollback_plan_id,
  ].join('|'));

  const ts = issued_at ?? new Date().toISOString();

  if (!contract_id || String(contract_id).trim() === '' || !command_type) {
    return {
      contract_id_hash,
      schema_version:       SCHEMA_VERSION,
      human_command_status: 'HUMAN_COMMAND_BLOCKED_INPUT',
      blocked_reason:       'contract_id and command_type are required.',
      contract_ready:       false,
      issued_at:            ts,
      ..._locked(),
    };
  }

  if (!HUMAN_COMMAND_TYPES.includes(command_type)) {
    return {
      contract_id_hash,
      schema_version:       SCHEMA_VERSION,
      human_command_status: 'HUMAN_COMMAND_BLOCKED_INPUT',
      blocked_reason:       `unknown command_type: ${command_type}`,
      contract_ready:       false,
      contract_id,
      command_type,
      issued_at:            ts,
      ..._locked(),
    };
  }

  if (!anti_hallucination_runtime_ready || truth_gate_status !== 'TRUSTED' || truth_score < 80) {
    return {
      contract_id_hash,
      schema_version:       SCHEMA_VERSION,
      human_command_status: 'HUMAN_COMMAND_BLOCKED_TRUTH',
      blocked_reason:       'anti_hallucination_runtime_ready=true, truth_gate_status=TRUSTED, truth_score>=80 required.',
      contract_ready:       false,
      contract_id,
      command_type,
      anti_hallucination_runtime_ready,
      truth_gate_status:    truth_gate_status ?? null,
      truth_score,
      issued_at:            ts,
      ..._locked(),
    };
  }

  if (!pass_gold_receipt_id || String(pass_gold_receipt_id).trim() === '' || !pass_gold_verified) {
    return {
      contract_id_hash,
      schema_version:       SCHEMA_VERSION,
      human_command_status: 'HUMAN_COMMAND_BLOCKED_PASS_GOLD',
      blocked_reason:       'pass_gold_receipt_id and pass_gold_verified=true required.',
      contract_ready:       false,
      contract_id,
      command_type,
      anti_hallucination_runtime_ready,
      truth_gate_status,
      truth_score,
      pass_gold_verified,
      issued_at:            ts,
      ..._locked(),
    };
  }

  if (!rollback_plan_id || String(rollback_plan_id).trim() === '' || !rollback_plan_ready) {
    return {
      contract_id_hash,
      schema_version:       SCHEMA_VERSION,
      human_command_status: 'HUMAN_COMMAND_BLOCKED_ROLLBACK',
      blocked_reason:       'rollback_plan_id and rollback_plan_ready=true required.',
      contract_ready:       false,
      contract_id,
      command_type,
      anti_hallucination_runtime_ready,
      truth_gate_status,
      truth_score,
      pass_gold_verified,
      rollback_plan_ready,
      issued_at:            ts,
      ..._locked(),
    };
  }

  const approval_token_hash = human_approval_token
    ? _sha256(human_approval_token)
    : null;

  if (!human_approval_token || !human_approval_verified) {
    return {
      contract_id_hash,
      schema_version:       SCHEMA_VERSION,
      human_command_status: 'HUMAN_COMMAND_BLOCKED_APPROVAL',
      blocked_reason:       'human_approval_token and human_approval_verified=true required.',
      contract_ready:       false,
      contract_id,
      command_type,
      anti_hallucination_runtime_ready,
      truth_gate_status,
      truth_score,
      pass_gold_verified,
      rollback_plan_ready,
      approval_token_hash,
      human_approval_verified,
      issued_at:            ts,
      ..._locked(),
    };
  }

  return {
    contract_id_hash,
    schema_version:                    SCHEMA_VERSION,
    human_command_status:              'HUMAN_COMMAND_READY_FOR_DRY_RUN',
    contract_ready:                    true,
    contract_id,
    command_type,
    anti_hallucination_runtime_ready,
    truth_gate_status,
    truth_score,
    pass_gold_receipt_id,
    pass_gold_verified,
    rollback_plan_id,
    rollback_plan_ready,
    approval_token_hash,
    human_approval_verified,
    issued_at:                         ts,
    ..._locked(),
  };
}

export function validateHumanExecutionCommandContract(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'contract_id_hash', 'schema_version', 'human_command_status',
    'contract_ready',
    'command_authorized', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.command_authorized  !== false) errors.push('command_authorized must be false');
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted     !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed    !== false) errors.push('deploy_performed must be false');
  if (result.release_performed   !== false) errors.push('release_performed must be false');
  if (!HUMAN_COMMAND_STATUSES.includes(result.human_command_status)) {
    errors.push(`invalid human_command_status: ${result.human_command_status}`);
  }
  if (result.human_command_status === 'HUMAN_COMMAND_READY_FOR_DRY_RUN') {
    if (result.contract_ready !== true) errors.push('READY_FOR_DRY_RUN requires contract_ready=true');
    if (!result.pass_gold_verified) errors.push('READY_FOR_DRY_RUN requires pass_gold_verified=true');
    if (!result.rollback_plan_ready) errors.push('READY_FOR_DRY_RUN requires rollback_plan_ready=true');
    if (!result.human_approval_verified) errors.push('READY_FOR_DRY_RUN requires human_approval_verified=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderHumanExecutionCommandContract(result) {
  if (!result || typeof result !== 'object') {
    return '[HUMAN_EXECUTION_COMMAND_CONTRACT] No result to render.';
  }
  const lines = [
    `=== Human Execution Command Contract [${SCHEMA_VERSION}] ===`,
    `Status:                     ${result.human_command_status ?? 'N/A'}`,
    `Contract ID:                ${result.contract_id ?? 'N/A'}`,
    `Command type:               ${result.command_type ?? 'N/A'}`,
    `Contract ready:             ${result.contract_ready}`,
    `--- Truth gate ---`,
    `anti_hallucination_ready:   ${result.anti_hallucination_runtime_ready}`,
    `truth_gate_status:          ${result.truth_gate_status ?? 'N/A'}`,
    `truth_score:                ${result.truth_score ?? 'N/A'}`,
    `--- Pass Gold ---`,
    `pass_gold_receipt_id:       ${result.pass_gold_receipt_id ?? 'N/A'}`,
    `pass_gold_verified:         ${result.pass_gold_verified}`,
    `--- Rollback ---`,
    `rollback_plan_id:           ${result.rollback_plan_id ?? 'N/A'}`,
    `rollback_plan_ready:        ${result.rollback_plan_ready}`,
    `--- Approval ---`,
    `approval_token_hash:        ${result.approval_token_hash ?? 'N/A'}`,
    `human_approval_verified:    ${result.human_approval_verified}`,
    `--- REGRA ABSOLUTA ---`,
    `command_authorized=false | execution_performed=false | stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:             ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('human-execution-command-contract.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildHumanExecutionCommandContract({
    contract_id:                      'v151.0-contract',
    command_type:                     'CONTROLLED_RUNTIME_EXECUTION',
    anti_hallucination_runtime_ready: true,
    truth_gate_status:                'TRUSTED',
    truth_score:                      90,
    pass_gold_receipt_id:             'pg-receipt-001',
    pass_gold_verified:               true,
    rollback_plan_id:                 'rbp-001',
    rollback_plan_ready:              true,
    human_approval_token:             'tok-human-001',
    human_approval_verified:          true,
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderHumanExecutionCommandContract(result));
  }
  const v = validateHumanExecutionCommandContract(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
