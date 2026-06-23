#!/usr/bin/env node
/**
 * Real Repo Patch Pre-State Snapshot — V171.1
 * Captures the pre-patch state of a permitted repo file.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_PRE_STATE_STATUSES = [
  'REPO_PRE_STATE_BLOCKED_INPUT',
  'REPO_PRE_STATE_BLOCKED_SCOPE',
  'REPO_PRE_STATE_BLOCKED_MISSING_FILE',
  'REPO_PRE_STATE_READY',
];

const SCHEMA_VERSION = 'v171.1';

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function blocked(status, reason, overrides = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    pre_state_status: status,
    pre_state_snapshot_ready: false,
    blocked_reason: reason,
    snapshot_hash: null,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    local_only: true,
    is_real_execution: false,
    ...overrides,
  };
}

export function buildRealRepoPatchPreStateSnapshot(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    !input.snapshot_id ||
    typeof input.snapshot_id !== 'string' ||
    !input.snapshot_id.trim()
  ) {
    return blocked('REPO_PRE_STATE_BLOCKED_INPUT', 'Missing or invalid snapshot_id');
  }

  const {
    snapshot_id,
    scope_contract_id,
    scope_contract_status,
    target_file,
    file_exists_before,
    file_content_hash_before,
    git_head_before,
    branch_name,
    working_tree_clean_before,
    patch_type,
  } = input;

  if (!scope_contract_id || typeof scope_contract_id !== 'string' || !scope_contract_id.trim()) {
    return blocked('REPO_PRE_STATE_BLOCKED_INPUT', 'Missing or invalid scope_contract_id');
  }
  if (!target_file || typeof target_file !== 'string' || !target_file.trim()) {
    return blocked('REPO_PRE_STATE_BLOCKED_INPUT', 'Missing or invalid target_file');
  }
  if (!git_head_before || typeof git_head_before !== 'string' || !git_head_before.trim()) {
    return blocked('REPO_PRE_STATE_BLOCKED_INPUT', 'Missing or invalid git_head_before');
  }
  if (!branch_name || typeof branch_name !== 'string' || !branch_name.trim()) {
    return blocked('REPO_PRE_STATE_BLOCKED_INPUT', 'Missing or invalid branch_name');
  }
  if (typeof file_exists_before !== 'boolean') {
    return blocked('REPO_PRE_STATE_BLOCKED_INPUT', 'file_exists_before must be boolean');
  }
  if (typeof working_tree_clean_before !== 'boolean') {
    return blocked('REPO_PRE_STATE_BLOCKED_INPUT', 'working_tree_clean_before must be boolean');
  }

  if (input.production_touched === true) {
    return blocked('REPO_PRE_STATE_BLOCKED_INPUT', 'production_touched must be false');
  }
  if (input.local_only === false) {
    return blocked('REPO_PRE_STATE_BLOCKED_INPUT', 'local_only must be true');
  }

  if (scope_contract_status !== 'REPO_PATCH_SCOPE_READY') {
    return blocked(
      'REPO_PRE_STATE_BLOCKED_SCOPE',
      `scope_contract_status must be REPO_PATCH_SCOPE_READY, got: ${scope_contract_status}`
    );
  }

  if (!working_tree_clean_before) {
    return blocked('REPO_PRE_STATE_BLOCKED_INPUT', 'working_tree_clean_before must be true');
  }

  const is_create_patch = (patch_type === 'CREATE_DOC' || patch_type === 'CREATE');
  if (!file_exists_before && !is_create_patch) {
    return blocked('REPO_PRE_STATE_BLOCKED_MISSING_FILE', `target_file does not exist and patch_type is not CREATE: ${target_file}`);
  }

  const content_hash = file_exists_before
    ? (file_content_hash_before || sha256(`empty:${target_file}`))
    : sha256(`not_exists:${target_file}`);

  const snapshot_hash = sha256(
    `${snapshot_id}:${scope_contract_id}:${target_file}:${content_hash}:${git_head_before}:${branch_name}`
  );

  return {
    schema_version: SCHEMA_VERSION,
    snapshot_id,
    scope_contract_id,
    scope_contract_status,
    target_file,
    patch_type: patch_type ?? null,
    file_exists_before,
    file_content_hash_before: file_exists_before ? (file_content_hash_before ?? null) : null,
    git_head_before,
    branch_name,
    working_tree_clean_before,
    snapshot_hash,
    pre_state_status: 'REPO_PRE_STATE_READY',
    pre_state_snapshot_ready: true,
    blocked_reason: null,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    local_only: true,
    is_real_execution: false,
  };
}

export function validateRealRepoPatchPreStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { valid: false, errors: ['snapshot is null or not an object'] };
  }
  const errors = [];
  if (snapshot.production_touched !== false) errors.push('production_touched must be false');
  if (snapshot.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (snapshot.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (snapshot.release_performed !== false) errors.push('release_performed must be false');
  if (snapshot.local_only !== true) errors.push('local_only must be true');
  if (!REAL_REPO_PATCH_PRE_STATE_STATUSES.includes(snapshot.pre_state_status)) {
    errors.push(`Invalid pre_state_status: ${snapshot.pre_state_status}`);
  }
  if (snapshot.pre_state_status === 'REPO_PRE_STATE_READY' && !snapshot.snapshot_hash) {
    errors.push('REPO_PRE_STATE_READY requires snapshot_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchPreStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return '[RealRepoPatchPreStateSnapshot: null]';
  }
  const lines = [
    `=== Real Repo Patch Pre-State Snapshot ${SCHEMA_VERSION} ===`,
    `Status         : ${snapshot.pre_state_status}`,
    `Ready          : ${snapshot.pre_state_snapshot_ready}`,
    `Snapshot ID    : ${snapshot.snapshot_id ?? 'N/A'}`,
    `Target File    : ${snapshot.target_file ?? 'N/A'}`,
    `File Exists    : ${snapshot.file_exists_before ?? 'N/A'}`,
    `Content Hash   : ${snapshot.file_content_hash_before ?? 'N/A'}`,
    `Git HEAD       : ${snapshot.git_head_before ?? 'N/A'}`,
    `Branch         : ${snapshot.branch_name ?? 'N/A'}`,
    `Tree Clean     : ${snapshot.working_tree_clean_before ?? 'N/A'}`,
    `Snapshot Hash  : ${snapshot.snapshot_hash ?? 'N/A'}`,
    `Local Only     : ${snapshot.local_only}`,
    `Prod Touched   : ${snapshot.production_touched}`,
  ];
  if (snapshot.blocked_reason) lines.push(`Blocked        : ${snapshot.blocked_reason}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-pre-state-snapshot.mjs')) {
  const demo = buildRealRepoPatchPreStateSnapshot({
    snapshot_id: 'snapshot-demo-001',
    scope_contract_id: 'scope-001',
    scope_contract_status: 'REPO_PATCH_SCOPE_READY',
    target_file: 'docs/real-repo-patch-drill-target.md',
    patch_type: 'CREATE_DOC',
    file_exists_before: false,
    file_content_hash_before: null,
    git_head_before: 'abc123def456',
    branch_name: 'feat/v1721-real-repo-patch-physical-apply-proof',
    working_tree_clean_before: true,
    local_only: true,
    production_touched: false,
  });
  console.log(renderRealRepoPatchPreStateSnapshot(demo));
  const v = validateRealRepoPatchPreStateSnapshot(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
  if (!v.valid) console.error(v.errors);
}
