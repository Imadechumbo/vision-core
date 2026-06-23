#!/usr/bin/env node
/**
 * Real Repo Patch Scope Contract — V171.0
 * Defines the allowed scope for a real patch on a permitted repo file.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_SCOPE_CONTRACT_STATUSES = [
  'REPO_PATCH_SCOPE_BLOCKED_INPUT',
  'REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH',
  'REPO_PATCH_SCOPE_BLOCKED_PRODUCTION',
  'REPO_PATCH_SCOPE_READY',
];

const SCHEMA_VERSION = 'v171.0';

const FORBIDDEN_PATTERNS = [
  /^\.env/i,
  /secret/i,
  /credential/i,
  /token/i,
  /\.github\//,
  /^frontend\//,
  /^src\//,
  /deploy/i,
  /infra/i,
  /package-lock\.json$/,
  /node_modules\//,
  /^\.git\//,
  /workflow/i,
];

function isForbidden(file) {
  return FORBIDDEN_PATTERNS.some(p => p.test(file));
}

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function blocked(status, reason, overrides = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    scope_contract_status: status,
    repo_patch_scope_ready: false,
    blocked_reason: reason,
    scope_hash: null,
    rollback_required: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    local_only: true,
    is_real_execution: false,
    ...overrides,
  };
}

export function buildRealRepoPatchScopeContract(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    !input.scope_contract_id ||
    typeof input.scope_contract_id !== 'string' ||
    !input.scope_contract_id.trim()
  ) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_INPUT', 'Missing or invalid scope_contract_id');
  }

  const {
    scope_contract_id,
    target_file,
    patch_type,
    mission_id,
    allowed_files,
    forbidden_files,
    local_patch_baseline_ready,
    human_approval_verified,
    anti_hallucination_confirmed,
    pass_gold_confirmed,
  } = input;

  if (!target_file || typeof target_file !== 'string' || !target_file.trim()) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_INPUT', 'Missing or invalid target_file');
  }
  if (!patch_type || typeof patch_type !== 'string' || !patch_type.trim()) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_INPUT', 'Missing or invalid patch_type');
  }
  if (!mission_id || typeof mission_id !== 'string' || !mission_id.trim()) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_INPUT', 'Missing or invalid mission_id');
  }
  if (!Array.isArray(allowed_files) || allowed_files.length === 0) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_INPUT', 'allowed_files must be non-empty array');
  }

  if (input.production_touched === true) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_PRODUCTION', 'production_touched must be false');
  }
  if (input.local_only === false) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_PRODUCTION', 'local_only must be true');
  }

  if (local_patch_baseline_ready !== true) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_INPUT', 'local_patch_baseline_ready must be true');
  }
  if (human_approval_verified !== true) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_INPUT', 'human_approval_verified must be true');
  }
  if (anti_hallucination_confirmed !== true) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_INPUT', 'anti_hallucination_confirmed must be true');
  }
  if (pass_gold_confirmed !== true) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_INPUT', 'pass_gold_confirmed must be true');
  }

  if (isForbidden(target_file)) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH', `target_file is forbidden: ${target_file}`);
  }

  const detected_forbidden = (forbidden_files ?? []).filter(f => allowed_files.includes(f));
  if (!allowed_files.includes(target_file)) {
    return blocked('REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH', `target_file not in allowed_files: ${target_file}`);
  }

  const scope_hash = sha256(
    `${scope_contract_id}:${target_file}:${patch_type}:${mission_id}:${allowed_files.sort().join(',')}`
  );

  return {
    schema_version: SCHEMA_VERSION,
    scope_contract_id,
    target_file,
    patch_type,
    mission_id,
    allowed_files,
    forbidden_files: forbidden_files ?? [],
    local_patch_baseline_ready,
    human_approval_verified,
    anti_hallucination_confirmed,
    pass_gold_confirmed,
    scope_hash,
    scope_contract_status: 'REPO_PATCH_SCOPE_READY',
    repo_patch_scope_ready: true,
    rollback_required: true,
    blocked_reason: null,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    local_only: true,
    is_real_execution: false,
  };
}

export function validateRealRepoPatchScopeContract(contract) {
  if (!contract || typeof contract !== 'object') {
    return { valid: false, errors: ['contract is null or not an object'] };
  }
  const errors = [];
  if (contract.production_touched !== false) errors.push('production_touched must be false');
  if (contract.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (contract.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (contract.release_performed !== false) errors.push('release_performed must be false');
  if (contract.local_only !== true) errors.push('local_only must be true');
  if (contract.rollback_required !== true) errors.push('rollback_required must be true');
  if (!REAL_REPO_PATCH_SCOPE_CONTRACT_STATUSES.includes(contract.scope_contract_status)) {
    errors.push(`Invalid scope_contract_status: ${contract.scope_contract_status}`);
  }
  if (contract.scope_contract_status === 'REPO_PATCH_SCOPE_READY' && !contract.scope_hash) {
    errors.push('REPO_PATCH_SCOPE_READY requires scope_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchScopeContract(contract) {
  if (!contract || typeof contract !== 'object') {
    return '[RealRepoPatchScopeContract: null]';
  }
  const lines = [
    `=== Real Repo Patch Scope Contract ${SCHEMA_VERSION} ===`,
    `Status         : ${contract.scope_contract_status}`,
    `Ready          : ${contract.repo_patch_scope_ready}`,
    `Contract ID    : ${contract.scope_contract_id ?? 'N/A'}`,
    `Target File    : ${contract.target_file ?? 'N/A'}`,
    `Patch Type     : ${contract.patch_type ?? 'N/A'}`,
    `Mission ID     : ${contract.mission_id ?? 'N/A'}`,
    `Allowed Files  : ${(contract.allowed_files ?? []).join(', ') || 'N/A'}`,
    `Rollback Req   : ${contract.rollback_required}`,
    `Scope Hash     : ${contract.scope_hash ?? 'N/A'}`,
    `Local Only     : ${contract.local_only}`,
    `Prod Touched   : ${contract.production_touched}`,
  ];
  if (contract.blocked_reason) lines.push(`Blocked        : ${contract.blocked_reason}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-scope-contract.mjs')) {
  const demo = buildRealRepoPatchScopeContract({
    scope_contract_id: 'scope-contract-demo-001',
    target_file: 'docs/real-repo-patch-drill-target.md',
    patch_type: 'CREATE_DOC',
    mission_id: 'mission-v171-demo',
    allowed_files: ['docs/real-repo-patch-drill-target.md'],
    forbidden_files: [],
    local_patch_baseline_ready: true,
    human_approval_verified: true,
    anti_hallucination_confirmed: true,
    pass_gold_confirmed: true,
    local_only: true,
    production_touched: false,
  });
  console.log(renderRealRepoPatchScopeContract(demo));
  const v = validateRealRepoPatchScopeContract(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
  if (!v.valid) console.error(v.errors);
}
