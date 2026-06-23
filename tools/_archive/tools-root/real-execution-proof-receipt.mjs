#!/usr/bin/env node
/**
 * Real Execution Proof Receipt — V154.0
 *
 * Issues a proof receipt confirming that only a dry-run was performed — never
 * real execution. Requires dry-run proof ID and verification before issuing.
 *
 * Statuses:
 *   EXECUTION_RECEIPT_BLOCKED_INPUT    — missing receipt_id or required inputs
 *   EXECUTION_RECEIPT_BLOCKED_PROOF    — dry run proof missing or unverified
 *   EXECUTION_RECEIPT_READY_DRY_RUN    — dry run proof accepted; receipt issued
 *
 * REGRA ABSOLUTA: no_real_execution_performed=true, execution_performed=false,
 * stable_promoted=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v154.0';

export const EXECUTION_RECEIPT_STATUSES = [
  'EXECUTION_RECEIPT_BLOCKED_INPUT',
  'EXECUTION_RECEIPT_BLOCKED_PROOF',
  'EXECUTION_RECEIPT_READY_DRY_RUN',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    no_real_execution_performed: true,
    execution_performed:         false,
    stable_promoted:             false,
    deploy_performed:            false,
    release_performed:           false,
  };
}

export function buildRealExecutionProofReceipt(params) {
  const {
    receipt_id,
    command_type,
    dry_run_proof_id,
    dry_run_proof_verified     = false,
    snapshot_id,
    rollback_plan_id,
    issued_at,
  } = params || {};

  const receipt_id_hash = _sha256([receipt_id, command_type, dry_run_proof_id].join('|'));
  const ts = issued_at ?? new Date().toISOString();

  if (!receipt_id || String(receipt_id).trim() === '' || !command_type) {
    return {
      receipt_id_hash,
      schema_version:             SCHEMA_VERSION,
      execution_receipt_status:   'EXECUTION_RECEIPT_BLOCKED_INPUT',
      blocked_reason:             'receipt_id and command_type are required.',
      receipt_ready:              false,
      issued_at:                  ts,
      ..._locked(),
    };
  }

  if (!dry_run_proof_id || String(dry_run_proof_id).trim() === '' || !dry_run_proof_verified) {
    return {
      receipt_id_hash,
      schema_version:             SCHEMA_VERSION,
      execution_receipt_status:   'EXECUTION_RECEIPT_BLOCKED_PROOF',
      blocked_reason:             'dry_run_proof_id and dry_run_proof_verified=true required.',
      receipt_ready:              false,
      receipt_id,
      command_type,
      dry_run_proof_verified,
      issued_at:                  ts,
      ..._locked(),
    };
  }

  return {
    receipt_id_hash,
    schema_version:               SCHEMA_VERSION,
    execution_receipt_status:     'EXECUTION_RECEIPT_READY_DRY_RUN',
    receipt_ready:                true,
    receipt_id,
    command_type,
    dry_run_proof_id,
    dry_run_proof_verified,
    snapshot_id:                  snapshot_id ?? null,
    rollback_plan_id:             rollback_plan_id ?? null,
    issued_at:                    ts,
    ..._locked(),
  };
}

export function validateRealExecutionProofReceipt(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'receipt_id_hash', 'schema_version', 'execution_receipt_status',
    'receipt_ready',
    'no_real_execution_performed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.no_real_execution_performed !== true)  errors.push('no_real_execution_performed must be true');
  if (result.execution_performed         !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted             !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed            !== false) errors.push('deploy_performed must be false');
  if (result.release_performed           !== false) errors.push('release_performed must be false');
  if (!EXECUTION_RECEIPT_STATUSES.includes(result.execution_receipt_status)) {
    errors.push(`invalid execution_receipt_status: ${result.execution_receipt_status}`);
  }
  if (result.execution_receipt_status === 'EXECUTION_RECEIPT_READY_DRY_RUN') {
    if (result.receipt_ready !== true) errors.push('READY_DRY_RUN requires receipt_ready=true');
    if (!result.dry_run_proof_verified) errors.push('READY_DRY_RUN requires dry_run_proof_verified=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealExecutionProofReceipt(result) {
  if (!result || typeof result !== 'object') {
    return '[REAL_EXECUTION_PROOF_RECEIPT] No result to render.';
  }
  const lines = [
    `=== Real Execution Proof Receipt [${SCHEMA_VERSION}] ===`,
    `Status:                        ${result.execution_receipt_status ?? 'N/A'}`,
    `Receipt ID:                    ${result.receipt_id ?? 'N/A'}`,
    `Command type:                  ${result.command_type ?? 'N/A'}`,
    `Receipt ready:                 ${result.receipt_ready}`,
    `--- Proof ---`,
    `dry_run_proof_id:              ${result.dry_run_proof_id ?? 'N/A'}`,
    `dry_run_proof_verified:        ${result.dry_run_proof_verified}`,
    `--- Context ---`,
    `snapshot_id:                   ${result.snapshot_id ?? 'N/A'}`,
    `rollback_plan_id:              ${result.rollback_plan_id ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `no_real_execution_performed=true | execution_performed=false | stable_promoted=false`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:                ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-execution-proof-receipt.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildRealExecutionProofReceipt({
    receipt_id:             'v154.0-receipt',
    command_type:           'CONTROLLED_RUNTIME_EXECUTION',
    dry_run_proof_id:       'dry-run-proof-001',
    dry_run_proof_verified: true,
    snapshot_id:            'v153.1-snapshot',
    rollback_plan_id:       'rbp-001',
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealExecutionProofReceipt(result));
  }
  const v = validateRealExecutionProofReceipt(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
