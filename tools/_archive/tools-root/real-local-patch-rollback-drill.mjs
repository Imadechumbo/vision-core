#!/usr/bin/env node
/**
 * Real Local Patch Rollback Drill — V168.1
 * Validates that a patched sandbox can be cleanly rolled back to pre-patch state.
 */

import { createHash } from 'crypto';

export const REAL_LOCAL_PATCH_ROLLBACK_DRILL_STATUSES = [
  'ROLLBACK_DRILL_BLOCKED_INPUT',
  'ROLLBACK_DRILL_BLOCKED_TEST_LANE',
  'ROLLBACK_DRILL_BLOCKED_PRODUCTION',
  'ROLLBACK_DRILL_PASS',
  'ROLLBACK_DRILL_FAIL',
];

const SCHEMA_VERSION = 'v168.1';

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function blocked(status, reason, overrides = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    rollback_drill_status: status,
    rollback_drill_pass: false,
    blocked_reason: reason,
    rollback_hash: null,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    local_only: true,
    is_real_execution: false,
    ...overrides,
  };
}

export function buildRealLocalPatchRollbackDrill(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    !input.rollback_drill_id ||
    typeof input.rollback_drill_id !== 'string' ||
    !input.rollback_drill_id.trim()
  ) {
    return blocked('ROLLBACK_DRILL_BLOCKED_INPUT', 'Missing or invalid rollback_drill_id');
  }

  const {
    rollback_drill_id,
    test_lane_id,
    test_lane_status,
    test_lane_hash,
    sandbox_id,
    patch_target,
    patch_type,
    pre_patch_hash,
    post_patch_hash,
    rollback_outcome,
    restored_hash,
  } = input;

  if (!test_lane_id || typeof test_lane_id !== 'string' || !test_lane_id.trim()) {
    return blocked('ROLLBACK_DRILL_BLOCKED_INPUT', 'Missing or invalid test_lane_id');
  }
  if (!sandbox_id || typeof sandbox_id !== 'string' || !sandbox_id.trim()) {
    return blocked('ROLLBACK_DRILL_BLOCKED_INPUT', 'Missing or invalid sandbox_id');
  }
  if (!patch_target || typeof patch_target !== 'string' || !patch_target.trim()) {
    return blocked('ROLLBACK_DRILL_BLOCKED_INPUT', 'Missing or invalid patch_target');
  }
  if (!patch_type || typeof patch_type !== 'string' || !patch_type.trim()) {
    return blocked('ROLLBACK_DRILL_BLOCKED_INPUT', 'Missing or invalid patch_type');
  }
  if (!pre_patch_hash || typeof pre_patch_hash !== 'string' || !pre_patch_hash.trim()) {
    return blocked('ROLLBACK_DRILL_BLOCKED_INPUT', 'Missing or invalid pre_patch_hash');
  }
  if (!post_patch_hash || typeof post_patch_hash !== 'string' || !post_patch_hash.trim()) {
    return blocked('ROLLBACK_DRILL_BLOCKED_INPUT', 'Missing or invalid post_patch_hash');
  }
  if (!rollback_outcome || typeof rollback_outcome !== 'string' || !rollback_outcome.trim()) {
    return blocked('ROLLBACK_DRILL_BLOCKED_INPUT', 'Missing or invalid rollback_outcome');
  }
  if (!restored_hash || typeof restored_hash !== 'string' || !restored_hash.trim()) {
    return blocked('ROLLBACK_DRILL_BLOCKED_INPUT', 'Missing or invalid restored_hash');
  }

  if (input.production_touched === true) {
    return blocked('ROLLBACK_DRILL_BLOCKED_PRODUCTION', 'production_touched must be false');
  }
  if (input.local_only === false) {
    return blocked('ROLLBACK_DRILL_BLOCKED_PRODUCTION', 'local_only must be true');
  }

  if (test_lane_status !== 'TEST_LANE_PASS') {
    return blocked(
      'ROLLBACK_DRILL_BLOCKED_TEST_LANE',
      `test_lane_status must be TEST_LANE_PASS, got: ${test_lane_status}`
    );
  }
  if (!test_lane_hash || typeof test_lane_hash !== 'string' || !test_lane_hash.trim()) {
    return blocked('ROLLBACK_DRILL_BLOCKED_TEST_LANE', 'Missing test_lane_hash');
  }

  const rollback_hash = sha256(
    `${rollback_drill_id}:${test_lane_id}:${test_lane_hash}:${sandbox_id}:${patch_target}:${patch_type}:${pre_patch_hash}:${post_patch_hash}:${rollback_outcome}:${restored_hash}`
  );

  const valid_outcomes = ['success', 'fail', 'partial'];
  if (!valid_outcomes.includes(rollback_outcome)) {
    return {
      schema_version: SCHEMA_VERSION,
      rollback_drill_id,
      test_lane_id,
      sandbox_id,
      patch_target,
      patch_type,
      pre_patch_hash,
      post_patch_hash,
      rollback_outcome,
      restored_hash,
      rollback_hash,
      rollback_drill_status: 'ROLLBACK_DRILL_FAIL',
      rollback_drill_pass: false,
      blocked_reason: `Invalid rollback_outcome: ${rollback_outcome}`,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      local_only: true,
      is_real_execution: false,
    };
  }

  const restored_matches_pre = restored_hash === pre_patch_hash;

  if (rollback_outcome !== 'success' || !restored_matches_pre) {
    const reason = rollback_outcome !== 'success'
      ? `rollback_outcome is ${rollback_outcome}`
      : 'restored_hash does not match pre_patch_hash';
    return {
      schema_version: SCHEMA_VERSION,
      rollback_drill_id,
      test_lane_id,
      sandbox_id,
      patch_target,
      patch_type,
      pre_patch_hash,
      post_patch_hash,
      rollback_outcome,
      restored_hash,
      restored_matches_pre,
      rollback_hash,
      rollback_drill_status: 'ROLLBACK_DRILL_FAIL',
      rollback_drill_pass: false,
      blocked_reason: reason,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      local_only: true,
      is_real_execution: false,
    };
  }

  return {
    schema_version: SCHEMA_VERSION,
    rollback_drill_id,
    test_lane_id,
    sandbox_id,
    patch_target,
    patch_type,
    pre_patch_hash,
    post_patch_hash,
    rollback_outcome,
    restored_hash,
    restored_matches_pre,
    rollback_hash,
    rollback_drill_status: 'ROLLBACK_DRILL_PASS',
    rollback_drill_pass: true,
    blocked_reason: null,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    local_only: true,
    is_real_execution: false,
  };
}

export function validateRealLocalPatchRollbackDrill(drill) {
  if (!drill || typeof drill !== 'object') {
    return { valid: false, errors: ['drill is null or not an object'] };
  }
  const errors = [];
  if (drill.production_touched !== false) errors.push('production_touched must be false');
  if (drill.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (drill.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (drill.release_performed !== false) errors.push('release_performed must be false');
  if (drill.local_only !== true) errors.push('local_only must be true');
  if (drill.is_real_execution !== false) errors.push('is_real_execution must be false');
  if (!REAL_LOCAL_PATCH_ROLLBACK_DRILL_STATUSES.includes(drill.rollback_drill_status)) {
    errors.push(`Invalid rollback_drill_status: ${drill.rollback_drill_status}`);
  }
  if (drill.rollback_drill_status === 'ROLLBACK_DRILL_PASS' && !drill.rollback_hash) {
    errors.push('ROLLBACK_DRILL_PASS requires rollback_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealLocalPatchRollbackDrill(drill) {
  if (!drill || typeof drill !== 'object') {
    return '[RealLocalPatchRollbackDrill: null]';
  }
  const lines = [
    `=== Real Local Patch Rollback Drill ${SCHEMA_VERSION} ===`,
    `Status      : ${drill.rollback_drill_status}`,
    `Pass        : ${drill.rollback_drill_pass}`,
    `Drill ID    : ${drill.rollback_drill_id ?? 'N/A'}`,
    `Sandbox ID  : ${drill.sandbox_id ?? 'N/A'}`,
    `Patch Target: ${drill.patch_target ?? 'N/A'}`,
    `Outcome     : ${drill.rollback_outcome ?? 'N/A'}`,
    `Restored=Pre: ${drill.restored_matches_pre ?? 'N/A'}`,
    `Hash        : ${drill.rollback_hash ?? 'N/A'}`,
    `Local Only  : ${drill.local_only}`,
    `Prod Touched: ${drill.production_touched}`,
  ];
  if (drill.blocked_reason) lines.push(`Blocked     : ${drill.blocked_reason}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-local-patch-rollback-drill.mjs')) {
  const demo = buildRealLocalPatchRollbackDrill({
    rollback_drill_id: 'rollback-drill-demo-001',
    test_lane_id: 'test-lane-demo-001',
    test_lane_status: 'TEST_LANE_PASS',
    test_lane_hash: 'demo-test-lane-hash-001',
    sandbox_id: 'sandbox-demo-001',
    patch_target: 'tools/sandbox-module.mjs',
    patch_type: 'code',
    pre_patch_hash: 'pre-hash-demo-001',
    post_patch_hash: 'post-hash-demo-002',
    rollback_outcome: 'success',
    restored_hash: 'pre-hash-demo-001',
    local_only: true,
    production_touched: false,
  });
  console.log(renderRealLocalPatchRollbackDrill(demo));
  const v = validateRealLocalPatchRollbackDrill(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
  if (!v.valid) console.error(v.errors);
}
