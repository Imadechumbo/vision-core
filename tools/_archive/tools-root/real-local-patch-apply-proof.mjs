#!/usr/bin/env node
/**
 * Real Local Patch Apply Proof — V167.1
 * Captures cryptographic proof of a patch applied within a local sandbox.
 */

import { createHash } from 'crypto';

export const REAL_LOCAL_PATCH_APPLY_PROOF_STATUSES = [
  'PATCH_PROOF_BLOCKED_INPUT',
  'PATCH_PROOF_BLOCKED_SANDBOX',
  'PATCH_PROOF_BLOCKED_PRODUCTION',
  'PATCH_PROOF_CAPTURED',
  'PATCH_PROOF_FAIL',
];

const SCHEMA_VERSION = 'v167.1';

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function blocked(status, reason, extra = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    patch_proof_status: status,
    patch_proof_captured: false,
    blocked_reason: reason,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    is_real_execution: false,
    patch_proof_hash: null,
    ...extra,
  };
}

export function buildRealLocalPatchApplyProof(input) {
  if (!input || typeof input !== 'object') {
    return blocked('PATCH_PROOF_BLOCKED_INPUT', 'input required');
  }

  const {
    patch_proof_id,
    sandbox_id,
    sandbox_status,
    sandbox_hash,
    patch_target,
    patch_type,
    pre_patch_hash,
    post_patch_hash,
    patch_description,
    local_only,
    production_touched,
  } = input;

  if (!patch_proof_id || String(patch_proof_id).trim() === '') {
    return blocked('PATCH_PROOF_BLOCKED_INPUT', 'patch_proof_id required');
  }
  if (!sandbox_id || String(sandbox_id).trim() === '') {
    return blocked('PATCH_PROOF_BLOCKED_INPUT', 'sandbox_id required');
  }
  if (!patch_target || String(patch_target).trim() === '') {
    return blocked('PATCH_PROOF_BLOCKED_INPUT', 'patch_target required');
  }
  if (!patch_type || String(patch_type).trim() === '') {
    return blocked('PATCH_PROOF_BLOCKED_INPUT', 'patch_type required');
  }
  if (!pre_patch_hash || String(pre_patch_hash).trim() === '') {
    return blocked('PATCH_PROOF_BLOCKED_INPUT', 'pre_patch_hash required');
  }
  if (!post_patch_hash || String(post_patch_hash).trim() === '') {
    return blocked('PATCH_PROOF_BLOCKED_INPUT', 'post_patch_hash required');
  }

  if (sandbox_status !== 'SANDBOX_READY') {
    return blocked(
      'PATCH_PROOF_BLOCKED_SANDBOX',
      `sandbox not READY: ${sandbox_status}`
    );
  }
  if (!sandbox_hash || String(sandbox_hash).trim() === '') {
    return blocked('PATCH_PROOF_BLOCKED_SANDBOX', 'sandbox_hash required');
  }

  if (local_only === false || production_touched === true) {
    return blocked(
      'PATCH_PROOF_BLOCKED_PRODUCTION',
      'production access forbidden in patch apply'
    );
  }

  if (pre_patch_hash === post_patch_hash) {
    return blocked('PATCH_PROOF_FAIL', 'pre and post patch hashes are identical — no change detected');
  }

  const patch_proof_hash = sha256(
    `${patch_proof_id}:${sandbox_id}:${sandbox_hash}:${patch_target}:${patch_type}:${pre_patch_hash}:${post_patch_hash}`
  );

  return {
    schema_version: SCHEMA_VERSION,
    patch_proof_id: String(patch_proof_id).trim(),
    sandbox_id: String(sandbox_id).trim(),
    sandbox_hash: String(sandbox_hash).trim(),
    patch_target: String(patch_target).trim(),
    patch_type: String(patch_type).trim(),
    pre_patch_hash: String(pre_patch_hash).trim(),
    post_patch_hash: String(post_patch_hash).trim(),
    patch_description: patch_description ? String(patch_description).trim() : null,
    patch_proof_status: 'PATCH_PROOF_CAPTURED',
    patch_proof_captured: true,
    blocked_reason: null,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    is_real_execution: false,
    patch_proof_hash,
  };
}

export function validateRealLocalPatchApplyProof(proof) {
  if (!proof || typeof proof !== 'object') {
    return { valid: false, errors: ['proof record required'] };
  }

  const errors = [];

  if (proof.production_touched !== false) errors.push('production_touched must be false');
  if (proof.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (proof.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (proof.release_performed !== false) errors.push('release_performed must be false');
  if (proof.local_only !== true) errors.push('local_only must be true');
  if (proof.is_real_execution !== false) errors.push('is_real_execution must be false');
  if (proof.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  }

  if (proof.patch_proof_status === 'PATCH_PROOF_CAPTURED') {
    if (!proof.patch_proof_hash) errors.push('patch_proof_hash required when CAPTURED');
    if (!proof.patch_proof_id) errors.push('patch_proof_id required when CAPTURED');
    if (!proof.sandbox_id) errors.push('sandbox_id required when CAPTURED');
    if (!proof.sandbox_hash) errors.push('sandbox_hash required when CAPTURED');
    if (!proof.patch_target) errors.push('patch_target required when CAPTURED');
    if (!proof.pre_patch_hash) errors.push('pre_patch_hash required when CAPTURED');
    if (!proof.post_patch_hash) errors.push('post_patch_hash required when CAPTURED');
    if (proof.pre_patch_hash && proof.post_patch_hash && proof.pre_patch_hash === proof.post_patch_hash) {
      errors.push('pre_patch_hash and post_patch_hash must differ when CAPTURED');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function renderRealLocalPatchApplyProof(proof) {
  if (!proof || typeof proof !== 'object') {
    return '[RealLocalPatchApplyProof] no record';
  }

  const lines = [
    `Real Local Patch Apply Proof — ${proof.schema_version ?? 'unknown'}`,
    `  status:               ${proof.patch_proof_status}`,
    `  patch_proof_captured: ${proof.patch_proof_captured}`,
  ];

  if (proof.patch_proof_id) lines.push(`  patch_proof_id:   ${proof.patch_proof_id}`);
  if (proof.sandbox_id) lines.push(`  sandbox_id:       ${proof.sandbox_id}`);
  if (proof.patch_target) lines.push(`  patch_target:     ${proof.patch_target}`);
  if (proof.patch_type) lines.push(`  patch_type:       ${proof.patch_type}`);
  if (proof.pre_patch_hash) lines.push(`  pre_patch_hash:   ${proof.pre_patch_hash}`);
  if (proof.post_patch_hash) lines.push(`  post_patch_hash:  ${proof.post_patch_hash}`);
  if (proof.patch_description) lines.push(`  description:      ${proof.patch_description}`);
  if (proof.patch_proof_hash) lines.push(`  patch_proof_hash: ${proof.patch_proof_hash}`);
  if (proof.blocked_reason) lines.push(`  blocked_reason:   ${proof.blocked_reason}`);

  lines.push('  --- invariants ---');
  lines.push(`  local_only:         ${proof.local_only}`);
  lines.push(`  production_touched: ${proof.production_touched}`);
  lines.push(`  deploy_performed:   ${proof.deploy_performed}`);
  lines.push(`  stable_promoted:    ${proof.stable_promoted}`);
  lines.push(`  release_performed:  ${proof.release_performed}`);
  lines.push(`  is_real_execution:  ${proof.is_real_execution}`);
  lines.push('  --- REGRA ABSOLUTA ---');
  lines.push('  SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  lines.push(`  REAL_LOCAL_PATCH_APPLY_PROOF_CAPTURED=${proof.patch_proof_captured}`);

  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-local-patch-apply-proof.mjs')) {
  const demo = buildRealLocalPatchApplyProof({
    patch_proof_id: 'patch-proof-v1671-demo',
    sandbox_id: 'sandbox-v167-demo',
    sandbox_status: 'SANDBOX_READY',
    sandbox_hash: 'sandbox-hash-demo-001',
    patch_target: 'tools/sandbox-module.mjs',
    patch_type: 'config',
    pre_patch_hash: 'pre-hash-demo-001',
    post_patch_hash: 'post-hash-demo-002',
    patch_description: 'Increase log level to debug',
    local_only: true,
    production_touched: false,
  });
  console.log(renderRealLocalPatchApplyProof(demo));
}
