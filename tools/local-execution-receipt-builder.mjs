#!/usr/bin/env node
/**
 * Local Execution Receipt Builder — V162.1
 * Transforms V162.0 local execution proof into a verifiable local receipt.
 */

import { createHash } from 'crypto';

export const LOCAL_EXECUTION_RECEIPT_STATUSES = [
  'LOCAL_EXECUTION_RECEIPT_BLOCKED_INPUT',
  'LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF',
  'LOCAL_EXECUTION_RECEIPT_BLOCKED_HASH',
  'LOCAL_EXECUTION_RECEIPT_READY',
  'LOCAL_EXECUTION_RECEIPT_INVALID',
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function blocked(status, extra = {}) {
  return {
    schema_version: 'v162.1',
    receipt_status: status,
    receipt_id: null,
    receipt_hash: null,
    proof_id: null,
    drill_id: null,
    mission_id: null,
    proof_hash: null,
    command_hash: null,
    before_hash: null,
    after_hash: null,
    stdout_hash: null,
    stderr_hash: null,
    exit_code: null,
    local_execution_receipt_ready: false,
    local_only: true,
    production_touched: false,
    receipt_sealed: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    ...extra,
  };
}

export function buildLocalExecutionReceipt(input) {
  if (!input || typeof input !== 'object') {
    return blocked('LOCAL_EXECUTION_RECEIPT_BLOCKED_INPUT');
  }

  const {
    receipt_id,
    proof,
    proof_hash,
  } = input;

  if (!receipt_id || typeof receipt_id !== 'string' || !receipt_id.trim()) {
    return blocked('LOCAL_EXECUTION_RECEIPT_BLOCKED_INPUT');
  }

  if (!proof || typeof proof !== 'object') {
    return blocked('LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF');
  }

  if (proof.proof_status !== 'LOCAL_EXECUTION_PROOF_CAPTURED') {
    return blocked('LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF', {
      blocked_reason: `proof_status must be LOCAL_EXECUTION_PROOF_CAPTURED, got: ${proof.proof_status}`,
    });
  }

  if (!proof.local_execution_proof_captured) {
    return blocked('LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF', {
      blocked_reason: 'local_execution_proof_captured must be true',
    });
  }

  if (proof.production_touched === true) {
    return blocked('LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF', {
      blocked_reason: 'production_touched must be false',
    });
  }

  if (!proof_hash || typeof proof_hash !== 'string' || !proof_hash.trim()) {
    return blocked('LOCAL_EXECUTION_RECEIPT_BLOCKED_HASH', {
      blocked_reason: 'proof_hash required',
    });
  }

  if (!proof.before_hash || !proof.after_hash) {
    return blocked('LOCAL_EXECUTION_RECEIPT_BLOCKED_HASH', {
      blocked_reason: 'before_hash and after_hash required in proof',
    });
  }

  const receipt_hash = sha256(
    `${receipt_id}:${proof.proof_id}:${proof_hash}:${proof.command_hash}:${proof.before_hash}:${proof.after_hash}`
  );

  return {
    schema_version: 'v162.1',
    receipt_status: 'LOCAL_EXECUTION_RECEIPT_READY',
    receipt_id,
    receipt_hash,
    proof_id: proof.proof_id,
    drill_id: proof.drill_id,
    mission_id: proof.mission_id,
    proof_hash,
    command_hash: proof.command_hash,
    before_hash: proof.before_hash,
    after_hash: proof.after_hash,
    stdout_hash: proof.stdout_hash,
    stderr_hash: proof.stderr_hash,
    exit_code: proof.exit_code,
    local_execution_receipt_ready: true,
    local_only: true,
    production_touched: false,
    receipt_sealed: true,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
  };
}

export function validateLocalExecutionReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { valid: false, errors: ['null or non-object input'] };
  }

  const errors = [];

  if (receipt.production_touched !== false) errors.push('production_touched must be false');
  if (receipt.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (receipt.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (receipt.release_performed !== false) errors.push('release_performed must be false');
  if (receipt.local_only !== true) errors.push('local_only must be true');

  if (receipt.receipt_status === 'LOCAL_EXECUTION_RECEIPT_READY') {
    if (!receipt.receipt_id) errors.push('receipt_id required for READY');
    if (!receipt.receipt_hash) errors.push('receipt_hash required for READY');
    if (!receipt.proof_id) errors.push('proof_id required for READY');
    if (!receipt.proof_hash) errors.push('proof_hash required for READY');
    if (!receipt.local_execution_receipt_ready) errors.push('local_execution_receipt_ready must be true for READY');
    if (!receipt.receipt_sealed) errors.push('receipt_sealed must be true for READY');
    if (!receipt.before_hash) errors.push('before_hash required for READY');
    if (!receipt.after_hash) errors.push('after_hash required for READY');
  }

  return { valid: errors.length === 0, errors };
}

export function renderLocalExecutionReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return '[LOCAL_EXECUTION_RECEIPT_BUILDER] No receipt data';
  }

  const lines = [
    `[LOCAL_EXECUTION_RECEIPT_BUILDER] ${receipt.receipt_status || 'UNKNOWN'}`,
    `  schema_version              : ${receipt.schema_version || 'n/a'}`,
    `  receipt_id                  : ${receipt.receipt_id || 'null'}`,
    `  receipt_hash                : ${receipt.receipt_hash || 'null'}`,
    `  proof_id                    : ${receipt.proof_id || 'null'}`,
    `  proof_hash                  : ${receipt.proof_hash || 'null'}`,
    `  drill_id                    : ${receipt.drill_id || 'null'}`,
    `  before_hash                 : ${receipt.before_hash || 'null'}`,
    `  after_hash                  : ${receipt.after_hash || 'null'}`,
    `  exit_code                   : ${receipt.exit_code}`,
    `  local_execution_receipt_ready: ${receipt.local_execution_receipt_ready}`,
    `  local_only                  : ${receipt.local_only}`,
    `  production_touched          : ${receipt.production_touched}`,
    `  receipt_sealed              : ${receipt.receipt_sealed}`,
    `  deploy_performed            : ${receipt.deploy_performed}`,
    `  stable_promoted             : ${receipt.stable_promoted}`,
    `  release_performed           : ${receipt.release_performed}`,
  ];

  if (receipt.blocked_reason) {
    lines.push(`  blocked_reason              : ${receipt.blocked_reason}`);
  }

  lines.push('  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.');

  return lines.join('\n');
}

// CLI self-run
if (process.argv[1] && process.argv[1].endsWith('local-execution-receipt-builder.mjs')) {
  const useJson = process.argv.includes('--json');
  const mockProof = {
    proof_status: 'LOCAL_EXECUTION_PROOF_CAPTURED',
    local_execution_proof_captured: true,
    proof_id: 'proof-v162-001',
    drill_id: 'drill-v161-001',
    mission_id: 'mission-001',
    command_hash: 'abc123def456',
    before_hash: 'before-hash-001',
    after_hash: 'after-hash-001',
    stdout_hash: 'stdout-hash-001',
    stderr_hash: 'stderr-hash-001',
    exit_code: 0,
    production_touched: false,
  };
  const sample = buildLocalExecutionReceipt({
    receipt_id: 'receipt-v1621-001',
    proof: mockProof,
    proof_hash: 'proof-hash-abc123',
  });
  if (useJson) {
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log(renderLocalExecutionReceipt(sample));
  }
}
