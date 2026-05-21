#!/usr/bin/env node
/**
 * Local Execution Evidence Package — V164.1
 * Bundles proof, receipt, ledger snapshot, rollback gate, and post-state verifier
 * into a single sealed local evidence package. No production.
 */

import { createHash } from 'crypto';

export const LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES = [
  'LOCAL_EVIDENCE_BLOCKED_INPUT',
  'LOCAL_EVIDENCE_BLOCKED_PROOF',
  'LOCAL_EVIDENCE_BLOCKED_RECEIPT',
  'LOCAL_EVIDENCE_BLOCKED_LEDGER',
  'LOCAL_EVIDENCE_BLOCKED_ROLLBACK',
  'LOCAL_EVIDENCE_BLOCKED_POST_STATE',
  'LOCAL_EVIDENCE_BLOCKED_PRODUCTION',
  'LOCAL_EVIDENCE_SEALED',
  'LOCAL_EVIDENCE_INCOMPLETE',
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function blocked(status, extra = {}) {
  return {
    schema_version: 'v164.1',
    evidence_package_status: status,
    evidence_package_id: null,
    proof_id: null,
    receipt_id: null,
    ledger_id: null,
    rollback_proof_id: null,
    post_state_id: null,
    evidence_hash: null,
    evidence_sealed: false,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    ...extra,
  };
}

export function buildLocalExecutionEvidencePackage(input) {
  if (!input || typeof input !== 'object') {
    return blocked('LOCAL_EVIDENCE_BLOCKED_INPUT');
  }

  const {
    evidence_package_id,
    proof,
    receipt,
    ledger,
    rollback_gate,
    post_state,
    local_only,
    production_touched,
  } = input;

  if (!evidence_package_id || typeof evidence_package_id !== 'string' || !evidence_package_id.trim()) {
    return blocked('LOCAL_EVIDENCE_BLOCKED_INPUT');
  }

  if (local_only === false) {
    return blocked('LOCAL_EVIDENCE_BLOCKED_PRODUCTION', {
      blocked_reason: 'local_only must be true',
    });
  }

  if (production_touched === true) {
    return blocked('LOCAL_EVIDENCE_BLOCKED_PRODUCTION', {
      blocked_reason: 'production_touched must be false',
    });
  }

  if (!proof || typeof proof !== 'object') {
    return blocked('LOCAL_EVIDENCE_BLOCKED_PROOF', {
      blocked_reason: 'proof required',
      evidence_package_id,
    });
  }

  if (proof.proof_status !== 'LOCAL_EXECUTION_PROOF_CAPTURED') {
    return blocked('LOCAL_EVIDENCE_BLOCKED_PROOF', {
      blocked_reason: `proof_status must be LOCAL_EXECUTION_PROOF_CAPTURED, got: ${proof.proof_status}`,
      evidence_package_id,
    });
  }

  if (!receipt || typeof receipt !== 'object') {
    return blocked('LOCAL_EVIDENCE_BLOCKED_RECEIPT', {
      blocked_reason: 'receipt required',
      evidence_package_id,
    });
  }

  if (receipt.receipt_status !== 'LOCAL_EXECUTION_RECEIPT_READY') {
    return blocked('LOCAL_EVIDENCE_BLOCKED_RECEIPT', {
      blocked_reason: `receipt_status must be LOCAL_EXECUTION_RECEIPT_READY, got: ${receipt.receipt_status}`,
      evidence_package_id,
    });
  }

  if (!ledger || typeof ledger !== 'object') {
    return blocked('LOCAL_EVIDENCE_BLOCKED_LEDGER', {
      blocked_reason: 'ledger required',
      evidence_package_id,
    });
  }

  if (ledger.ledger_status !== 'LOCAL_EXECUTION_LEDGER_READY') {
    return blocked('LOCAL_EVIDENCE_BLOCKED_LEDGER', {
      blocked_reason: `ledger_status must be LOCAL_EXECUTION_LEDGER_READY, got: ${ledger.ledger_status}`,
      evidence_package_id,
    });
  }

  if (!rollback_gate || typeof rollback_gate !== 'object') {
    return blocked('LOCAL_EVIDENCE_BLOCKED_ROLLBACK', {
      blocked_reason: 'rollback_gate required',
      evidence_package_id,
    });
  }

  if (
    rollback_gate.rollback_proof_gate_status !== 'LOCAL_ROLLBACK_PROOF_GATE_READY' &&
    rollback_gate.rollback_proof_gate_status !== 'LOCAL_ROLLBACK_PROOF_GATE_COMPLETED'
  ) {
    return blocked('LOCAL_EVIDENCE_BLOCKED_ROLLBACK', {
      blocked_reason: `rollback_gate_status must be READY or COMPLETED, got: ${rollback_gate.rollback_proof_gate_status}`,
      evidence_package_id,
    });
  }

  if (!post_state || typeof post_state !== 'object') {
    return blocked('LOCAL_EVIDENCE_BLOCKED_POST_STATE', {
      blocked_reason: 'post_state required',
      evidence_package_id,
    });
  }

  if (post_state.post_state_status !== 'LOCAL_POST_STATE_VERIFIED') {
    return blocked('LOCAL_EVIDENCE_BLOCKED_POST_STATE', {
      blocked_reason: `post_state_status must be LOCAL_POST_STATE_VERIFIED, got: ${post_state.post_state_status}`,
      evidence_package_id,
    });
  }

  const proof_id = proof.proof_id || null;
  const receipt_id = receipt.receipt_id || null;
  const ledger_id = ledger.ledger_id || null;
  const rollback_proof_id = rollback_gate.rollback_proof_id || null;
  const post_state_id = post_state.post_state_id || null;

  const evidence_hash = sha256(
    `${evidence_package_id}:${proof_id}:${receipt_id}:${ledger_id}:${rollback_proof_id}:${post_state_id}`
  );

  const allSealed =
    proof.proof_status === 'LOCAL_EXECUTION_PROOF_CAPTURED' &&
    receipt.receipt_status === 'LOCAL_EXECUTION_RECEIPT_READY' &&
    ledger.ledger_status === 'LOCAL_EXECUTION_LEDGER_READY' &&
    post_state.post_state_verified === true;

  if (!allSealed) {
    return {
      schema_version: 'v164.1',
      evidence_package_status: 'LOCAL_EVIDENCE_INCOMPLETE',
      evidence_package_id,
      proof_id,
      receipt_id,
      ledger_id,
      rollback_proof_id,
      post_state_id,
      evidence_hash,
      evidence_sealed: false,
      local_only: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      blocked_reason: 'one or more components not fully sealed',
    };
  }

  return {
    schema_version: 'v164.1',
    evidence_package_status: 'LOCAL_EVIDENCE_SEALED',
    evidence_package_id,
    proof_id,
    receipt_id,
    ledger_id,
    rollback_proof_id,
    post_state_id,
    evidence_hash,
    evidence_sealed: true,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
  };
}

export function validateLocalExecutionEvidencePackage(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    return { valid: false, errors: ['null or non-object input'] };
  }

  const errors = [];

  if (pkg.production_touched !== false) errors.push('production_touched must be false');
  if (pkg.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (pkg.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (pkg.release_performed !== false) errors.push('release_performed must be false');
  if (pkg.local_only !== true) errors.push('local_only must be true');

  if (pkg.evidence_package_status === 'LOCAL_EVIDENCE_SEALED') {
    if (!pkg.evidence_package_id) errors.push('evidence_package_id required for SEALED');
    if (!pkg.evidence_hash) errors.push('evidence_hash required for SEALED');
    if (!pkg.evidence_sealed) errors.push('evidence_sealed must be true for SEALED');
    if (!pkg.proof_id) errors.push('proof_id required for SEALED');
    if (!pkg.receipt_id) errors.push('receipt_id required for SEALED');
    if (!pkg.ledger_id) errors.push('ledger_id required for SEALED');
    if (!pkg.post_state_id) errors.push('post_state_id required for SEALED');
  }

  return { valid: errors.length === 0, errors };
}

export function renderLocalExecutionEvidencePackage(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    return '[LOCAL_EXECUTION_EVIDENCE_PACKAGE] No package data';
  }

  const lines = [
    `[LOCAL_EXECUTION_EVIDENCE_PACKAGE] ${pkg.evidence_package_status || 'UNKNOWN'}`,
    `  schema_version          : ${pkg.schema_version || 'n/a'}`,
    `  evidence_package_id     : ${pkg.evidence_package_id || 'null'}`,
    `  proof_id                : ${pkg.proof_id || 'null'}`,
    `  receipt_id              : ${pkg.receipt_id || 'null'}`,
    `  ledger_id               : ${pkg.ledger_id || 'null'}`,
    `  rollback_proof_id       : ${pkg.rollback_proof_id || 'null'}`,
    `  post_state_id           : ${pkg.post_state_id || 'null'}`,
    `  evidence_hash           : ${pkg.evidence_hash || 'null'}`,
    `  evidence_sealed         : ${pkg.evidence_sealed}`,
    `  local_only              : ${pkg.local_only}`,
    `  production_touched      : ${pkg.production_touched}`,
    `  deploy_performed        : ${pkg.deploy_performed}`,
    `  stable_promoted         : ${pkg.stable_promoted}`,
    `  release_performed       : ${pkg.release_performed}`,
  ];

  if (pkg.blocked_reason) {
    lines.push(`  blocked_reason          : ${pkg.blocked_reason}`);
  }

  lines.push('  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.');

  return lines.join('\n');
}

// CLI self-run
if (process.argv[1] && process.argv[1].endsWith('local-execution-evidence-package.mjs')) {
  const useJson = process.argv.includes('--json');
  const sample = buildLocalExecutionEvidencePackage({
    evidence_package_id: 'evidence-pkg-001',
    proof: {
      proof_status: 'LOCAL_EXECUTION_PROOF_CAPTURED',
      proof_id: 'proof-001',
    },
    receipt: {
      receipt_status: 'LOCAL_EXECUTION_RECEIPT_READY',
      receipt_id: 'receipt-001',
    },
    ledger: {
      ledger_status: 'LOCAL_EXECUTION_LEDGER_READY',
      ledger_id: 'ledger-001',
    },
    rollback_gate: {
      rollback_proof_gate_status: 'LOCAL_ROLLBACK_PROOF_GATE_READY',
      rollback_proof_id: 'rollback-001',
    },
    post_state: {
      post_state_status: 'LOCAL_POST_STATE_VERIFIED',
      post_state_verified: true,
      post_state_id: 'post-state-001',
    },
    local_only: true,
    production_touched: false,
  });
  if (useJson) {
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log(renderLocalExecutionEvidencePackage(sample));
  }
}
