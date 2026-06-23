#!/usr/bin/env node
/**
 * Local Rollback Proof Gate — V163.1
 * Proves local execution has verifiable rollback available. No production rollback.
 */

import { createHash } from 'crypto';

export const LOCAL_ROLLBACK_PROOF_GATE_STATUSES = [
  'LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT',
  'LOCAL_ROLLBACK_PROOF_BLOCKED_SNAPSHOT',
  'LOCAL_ROLLBACK_PROOF_BLOCKED_RECEIPT',
  'LOCAL_ROLLBACK_PROOF_BLOCKED_HASH',
  'LOCAL_ROLLBACK_PROOF_READY',
  'LOCAL_ROLLBACK_PROOF_COMPLETED',
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function blocked(status, extra = {}) {
  return {
    schema_version: 'v163.1',
    rollback_proof_status: status,
    rollback_proof_id: null,
    snapshot_id: null,
    receipt_id: null,
    before_hash: null,
    after_hash: null,
    rollback_target_hash: null,
    rollback_command_hash: null,
    rollback_dry_run_status: null,
    rollback_verified: false,
    rollback_completed: false,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    ...extra,
  };
}

export function buildLocalRollbackProofGate(input) {
  if (!input || typeof input !== 'object') {
    return blocked('LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT');
  }

  const {
    rollback_proof_id,
    snapshot_id,
    receipt_id,
    before_hash,
    after_hash,
    rollback_target_hash,
    rollback_command_hash,
    rollback_dry_run_status,
    rollback_verified,
    rollback_completed,
    local_only,
    production_touched,
  } = input;

  if (!rollback_proof_id || typeof rollback_proof_id !== 'string' || !rollback_proof_id.trim()) {
    return blocked('LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT');
  }

  if (!snapshot_id || typeof snapshot_id !== 'string' || !snapshot_id.trim()) {
    return blocked('LOCAL_ROLLBACK_PROOF_BLOCKED_SNAPSHOT', {
      blocked_reason: 'snapshot_id required',
    });
  }

  if (!receipt_id || typeof receipt_id !== 'string' || !receipt_id.trim()) {
    return blocked('LOCAL_ROLLBACK_PROOF_BLOCKED_RECEIPT', {
      blocked_reason: 'receipt_id required',
    });
  }

  if (!before_hash || !after_hash || !rollback_target_hash) {
    return blocked('LOCAL_ROLLBACK_PROOF_BLOCKED_HASH', {
      blocked_reason: 'before_hash, after_hash, rollback_target_hash required',
    });
  }

  if (!rollback_command_hash) {
    return blocked('LOCAL_ROLLBACK_PROOF_BLOCKED_HASH', {
      blocked_reason: 'rollback_command_hash required',
    });
  }

  if (!rollback_dry_run_status) {
    return blocked('LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT', {
      blocked_reason: 'rollback_dry_run_status required',
    });
  }

  if (local_only === false) {
    return blocked('LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT', {
      blocked_reason: 'local_only must be true',
    });
  }

  if (production_touched === true) {
    return blocked('LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT', {
      blocked_reason: 'production_touched must be false',
    });
  }

  const base = {
    schema_version: 'v163.1',
    rollback_proof_id,
    snapshot_id,
    receipt_id,
    before_hash,
    after_hash,
    rollback_target_hash,
    rollback_command_hash,
    rollback_dry_run_status,
    rollback_verified: rollback_verified === true,
    rollback_completed: false,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
  };

  if (rollback_verified === true && rollback_completed === true) {
    return {
      ...base,
      rollback_proof_status: 'LOCAL_ROLLBACK_PROOF_COMPLETED',
      rollback_completed: true,
    };
  }

  return {
    ...base,
    rollback_proof_status: 'LOCAL_ROLLBACK_PROOF_READY',
  };
}

export function validateLocalRollbackProofGate(gate) {
  if (!gate || typeof gate !== 'object') {
    return { valid: false, errors: ['null or non-object input'] };
  }

  const errors = [];

  if (gate.production_touched !== false) errors.push('production_touched must be false');
  if (gate.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (gate.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (gate.release_performed !== false) errors.push('release_performed must be false');
  if (gate.local_only !== true) errors.push('local_only must be true');

  const readyStatuses = ['LOCAL_ROLLBACK_PROOF_READY', 'LOCAL_ROLLBACK_PROOF_COMPLETED'];
  if (readyStatuses.includes(gate.rollback_proof_status)) {
    if (!gate.rollback_proof_id) errors.push('rollback_proof_id required');
    if (!gate.snapshot_id) errors.push('snapshot_id required');
    if (!gate.receipt_id) errors.push('receipt_id required');
    if (!gate.before_hash) errors.push('before_hash required');
    if (!gate.after_hash) errors.push('after_hash required');
  }

  if (gate.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_COMPLETED') {
    if (!gate.rollback_verified) errors.push('rollback_verified must be true for COMPLETED');
    if (!gate.rollback_completed) errors.push('rollback_completed must be true for COMPLETED');
  }

  return { valid: errors.length === 0, errors };
}

export function renderLocalRollbackProofGate(gate) {
  if (!gate || typeof gate !== 'object') {
    return '[LOCAL_ROLLBACK_PROOF_GATE] No gate data';
  }

  const lines = [
    `[LOCAL_ROLLBACK_PROOF_GATE] ${gate.rollback_proof_status || 'UNKNOWN'}`,
    `  schema_version         : ${gate.schema_version || 'n/a'}`,
    `  rollback_proof_id      : ${gate.rollback_proof_id || 'null'}`,
    `  snapshot_id            : ${gate.snapshot_id || 'null'}`,
    `  receipt_id             : ${gate.receipt_id || 'null'}`,
    `  before_hash            : ${gate.before_hash || 'null'}`,
    `  after_hash             : ${gate.after_hash || 'null'}`,
    `  rollback_target_hash   : ${gate.rollback_target_hash || 'null'}`,
    `  rollback_dry_run_status: ${gate.rollback_dry_run_status || 'null'}`,
    `  rollback_verified      : ${gate.rollback_verified}`,
    `  rollback_completed     : ${gate.rollback_completed}`,
    `  local_only             : ${gate.local_only}`,
    `  production_touched     : ${gate.production_touched}`,
    `  deploy_performed       : ${gate.deploy_performed}`,
    `  stable_promoted        : ${gate.stable_promoted}`,
    `  release_performed      : ${gate.release_performed}`,
  ];

  if (gate.blocked_reason) {
    lines.push(`  blocked_reason         : ${gate.blocked_reason}`);
  }

  lines.push('  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.');

  return lines.join('\n');
}

// CLI self-run
if (process.argv[1] && process.argv[1].endsWith('local-rollback-proof-gate.mjs')) {
  const useJson = process.argv.includes('--json');
  const sample = buildLocalRollbackProofGate({
    rollback_proof_id: 'rbk-proof-001',
    snapshot_id: 'snap-001',
    receipt_id: 'receipt-v1621-001',
    before_hash: 'before-hash-001',
    after_hash: 'after-hash-001',
    rollback_target_hash: 'before-hash-001',
    rollback_command_hash: 'rbk-cmd-hash-001',
    rollback_dry_run_status: 'DRY_RUN_PASS',
    rollback_verified: true,
    local_only: true,
    production_touched: false,
  });
  if (useJson) {
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log(renderLocalRollbackProofGate(sample));
  }
}
