#!/usr/bin/env node
/**
 * Real Local Patch Sandbox — V167.0
 * Bounded, reversible, local-only patch environment backed by chain baseline.
 */

import { createHash } from 'crypto';

export const REAL_LOCAL_PATCH_SANDBOX_STATUSES = [
  'SANDBOX_BLOCKED_INPUT',
  'SANDBOX_BLOCKED_CHAIN',
  'SANDBOX_BLOCKED_PRODUCTION',
  'SANDBOX_READY',
  'SANDBOX_FAIL',
];

const SCHEMA_VERSION = 'v167.0';

const SAFE_PATCH_TYPES = ['config', 'code', 'data', 'test'];
const SAFE_ISOLATION_LEVELS = ['strict', 'standard'];

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function blocked(status, reason, extra = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    sandbox_status: status,
    sandbox_ready: false,
    blocked_reason: reason,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    is_real_execution: false,
    sandbox_hash: null,
    ...extra,
  };
}

export function buildRealLocalPatchSandbox(input) {
  if (!input || typeof input !== 'object') {
    return blocked('SANDBOX_BLOCKED_INPUT', 'input required');
  }

  const {
    sandbox_id,
    chain_baseline_id,
    chain_baseline_status,
    patch_target,
    patch_type,
    pre_patch_hash,
    isolation_level = 'strict',
    local_only,
    production_touched,
  } = input;

  if (!sandbox_id || String(sandbox_id).trim() === '') {
    return blocked('SANDBOX_BLOCKED_INPUT', 'sandbox_id required');
  }
  if (!chain_baseline_id || String(chain_baseline_id).trim() === '') {
    return blocked('SANDBOX_BLOCKED_INPUT', 'chain_baseline_id required');
  }
  if (!patch_target || String(patch_target).trim() === '') {
    return blocked('SANDBOX_BLOCKED_INPUT', 'patch_target required');
  }
  if (!patch_type || !SAFE_PATCH_TYPES.includes(patch_type)) {
    return blocked(
      'SANDBOX_BLOCKED_INPUT',
      `patch_type must be one of: ${SAFE_PATCH_TYPES.join(', ')}`
    );
  }
  if (!pre_patch_hash || String(pre_patch_hash).trim() === '') {
    return blocked('SANDBOX_BLOCKED_INPUT', 'pre_patch_hash required');
  }
  if (!SAFE_ISOLATION_LEVELS.includes(isolation_level)) {
    return blocked(
      'SANDBOX_BLOCKED_INPUT',
      `isolation_level must be one of: ${SAFE_ISOLATION_LEVELS.join(', ')}`
    );
  }

  if (
    chain_baseline_status !== 'LOCAL_EXECUTION_CHAIN_BASELINE_READY'
  ) {
    return blocked(
      'SANDBOX_BLOCKED_CHAIN',
      `chain baseline not READY: ${chain_baseline_status}`
    );
  }

  if (local_only === false || production_touched === true) {
    return blocked(
      'SANDBOX_BLOCKED_PRODUCTION',
      'production access forbidden in sandbox'
    );
  }

  const sandbox_hash = sha256(
    `${sandbox_id}:${chain_baseline_id}:${patch_target}:${patch_type}:${pre_patch_hash}:${isolation_level}`
  );

  return {
    schema_version: SCHEMA_VERSION,
    sandbox_id: String(sandbox_id).trim(),
    chain_baseline_id: String(chain_baseline_id).trim(),
    patch_target: String(patch_target).trim(),
    patch_type,
    pre_patch_hash: String(pre_patch_hash).trim(),
    isolation_level,
    sandbox_status: 'SANDBOX_READY',
    sandbox_ready: true,
    blocked_reason: null,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    is_real_execution: false,
    sandbox_hash,
  };
}

export function validateRealLocalPatchSandbox(sandbox) {
  if (!sandbox || typeof sandbox !== 'object') {
    return { valid: false, errors: ['sandbox record required'] };
  }

  const errors = [];

  if (sandbox.production_touched !== false) errors.push('production_touched must be false');
  if (sandbox.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (sandbox.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (sandbox.release_performed !== false) errors.push('release_performed must be false');
  if (sandbox.local_only !== true) errors.push('local_only must be true');
  if (sandbox.is_real_execution !== false) errors.push('is_real_execution must be false');
  if (sandbox.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  }

  if (sandbox.sandbox_status === 'SANDBOX_READY') {
    if (!sandbox.sandbox_hash) errors.push('sandbox_hash required when READY');
    if (!sandbox.sandbox_id) errors.push('sandbox_id required when READY');
    if (!sandbox.chain_baseline_id) errors.push('chain_baseline_id required when READY');
    if (!sandbox.patch_target) errors.push('patch_target required when READY');
    if (!sandbox.patch_type) errors.push('patch_type required when READY');
    if (!sandbox.pre_patch_hash) errors.push('pre_patch_hash required when READY');
  }

  return { valid: errors.length === 0, errors };
}

export function renderRealLocalPatchSandbox(sandbox) {
  if (!sandbox || typeof sandbox !== 'object') {
    return '[RealLocalPatchSandbox] no record';
  }

  const lines = [
    `Real Local Patch Sandbox — ${sandbox.schema_version ?? 'unknown'}`,
    `  status:           ${sandbox.sandbox_status}`,
    `  sandbox_ready:    ${sandbox.sandbox_ready}`,
  ];

  if (sandbox.sandbox_id) lines.push(`  sandbox_id:       ${sandbox.sandbox_id}`);
  if (sandbox.chain_baseline_id) lines.push(`  chain_baseline:   ${sandbox.chain_baseline_id}`);
  if (sandbox.patch_target) lines.push(`  patch_target:     ${sandbox.patch_target}`);
  if (sandbox.patch_type) lines.push(`  patch_type:       ${sandbox.patch_type}`);
  if (sandbox.isolation_level) lines.push(`  isolation_level:  ${sandbox.isolation_level}`);
  if (sandbox.pre_patch_hash) lines.push(`  pre_patch_hash:   ${sandbox.pre_patch_hash}`);
  if (sandbox.sandbox_hash) lines.push(`  sandbox_hash:     ${sandbox.sandbox_hash}`);
  if (sandbox.blocked_reason) lines.push(`  blocked_reason:   ${sandbox.blocked_reason}`);

  lines.push('  --- invariants ---');
  lines.push(`  local_only:         ${sandbox.local_only}`);
  lines.push(`  production_touched: ${sandbox.production_touched}`);
  lines.push(`  deploy_performed:   ${sandbox.deploy_performed}`);
  lines.push(`  stable_promoted:    ${sandbox.stable_promoted}`);
  lines.push(`  release_performed:  ${sandbox.release_performed}`);
  lines.push(`  is_real_execution:  ${sandbox.is_real_execution}`);
  lines.push('  --- REGRA ABSOLUTA ---');
  lines.push('  SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  lines.push(`  REAL_LOCAL_PATCH_SANDBOX_READY=${sandbox.sandbox_ready}`);

  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-local-patch-sandbox.mjs')) {
  const demo = buildRealLocalPatchSandbox({
    sandbox_id: 'sandbox-v167-demo',
    chain_baseline_id: 'baseline-v166-demo',
    chain_baseline_status: 'LOCAL_EXECUTION_CHAIN_BASELINE_READY',
    patch_target: 'tools/sandbox-module.mjs',
    patch_type: 'config',
    pre_patch_hash: 'pre-hash-demo-001',
    isolation_level: 'strict',
    local_only: true,
    production_touched: false,
  });
  console.log(renderRealLocalPatchSandbox(demo));
}
