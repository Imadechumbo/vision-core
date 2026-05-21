#!/usr/bin/env node
/**
 * Real Local Patch Test Lane — V168.0
 * Validates that a patched sandbox passes test lane checks before rollback consideration.
 */

import { createHash } from 'crypto';

export const REAL_LOCAL_PATCH_TEST_LANE_STATUSES = [
  'TEST_LANE_BLOCKED_INPUT',
  'TEST_LANE_BLOCKED_PROOF',
  'TEST_LANE_BLOCKED_PRODUCTION',
  'TEST_LANE_PASS',
  'TEST_LANE_FAIL',
];

const SCHEMA_VERSION = 'v168.0';

const VALID_TEST_OUTCOMES = ['pass', 'fail', 'skip'];

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function blocked(status, reason, extra = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    test_lane_status: status,
    test_lane_passed: false,
    blocked_reason: reason,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    is_real_execution: false,
    test_lane_hash: null,
    ...extra,
  };
}

export function buildRealLocalPatchTestLane(input) {
  if (!input || typeof input !== 'object') {
    return blocked('TEST_LANE_BLOCKED_INPUT', 'input required');
  }

  const {
    test_lane_id,
    patch_proof_id,
    patch_proof_status,
    patch_proof_hash,
    sandbox_id,
    test_suite,
    test_outcome,
    tests_total,
    tests_passed,
    local_only,
    production_touched,
  } = input;

  if (!test_lane_id || String(test_lane_id).trim() === '') {
    return blocked('TEST_LANE_BLOCKED_INPUT', 'test_lane_id required');
  }
  if (!patch_proof_id || String(patch_proof_id).trim() === '') {
    return blocked('TEST_LANE_BLOCKED_INPUT', 'patch_proof_id required');
  }
  if (!sandbox_id || String(sandbox_id).trim() === '') {
    return blocked('TEST_LANE_BLOCKED_INPUT', 'sandbox_id required');
  }
  if (!test_suite || String(test_suite).trim() === '') {
    return blocked('TEST_LANE_BLOCKED_INPUT', 'test_suite required');
  }
  if (!test_outcome || !VALID_TEST_OUTCOMES.includes(test_outcome)) {
    return blocked(
      'TEST_LANE_BLOCKED_INPUT',
      `test_outcome must be one of: ${VALID_TEST_OUTCOMES.join(', ')}`
    );
  }
  if (typeof tests_total !== 'number' || tests_total < 0) {
    return blocked('TEST_LANE_BLOCKED_INPUT', 'tests_total must be a non-negative number');
  }
  if (typeof tests_passed !== 'number' || tests_passed < 0) {
    return blocked('TEST_LANE_BLOCKED_INPUT', 'tests_passed must be a non-negative number');
  }
  if (tests_passed > tests_total) {
    return blocked('TEST_LANE_BLOCKED_INPUT', 'tests_passed cannot exceed tests_total');
  }

  if (patch_proof_status !== 'PATCH_PROOF_CAPTURED') {
    return blocked(
      'TEST_LANE_BLOCKED_PROOF',
      `patch proof not CAPTURED: ${patch_proof_status}`
    );
  }
  if (!patch_proof_hash || String(patch_proof_hash).trim() === '') {
    return blocked('TEST_LANE_BLOCKED_PROOF', 'patch_proof_hash required');
  }

  if (local_only === false || production_touched === true) {
    return blocked(
      'TEST_LANE_BLOCKED_PRODUCTION',
      'production access forbidden in test lane'
    );
  }

  const tests_failed = tests_total - tests_passed;
  const lane_outcome = test_outcome === 'pass' && tests_failed === 0 ? 'PASS' : 'FAIL';
  const test_lane_passed = lane_outcome === 'PASS';

  const test_lane_hash = sha256(
    `${test_lane_id}:${patch_proof_id}:${patch_proof_hash}:${sandbox_id}:${test_suite}:${test_outcome}:${tests_total}:${tests_passed}`
  );

  return {
    schema_version: SCHEMA_VERSION,
    test_lane_id: String(test_lane_id).trim(),
    patch_proof_id: String(patch_proof_id).trim(),
    patch_proof_hash: String(patch_proof_hash).trim(),
    sandbox_id: String(sandbox_id).trim(),
    test_suite: String(test_suite).trim(),
    test_outcome,
    tests_total,
    tests_passed,
    tests_failed,
    test_lane_status: `TEST_LANE_${lane_outcome}`,
    test_lane_passed,
    blocked_reason: null,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    is_real_execution: false,
    test_lane_hash,
  };
}

export function validateRealLocalPatchTestLane(lane) {
  if (!lane || typeof lane !== 'object') {
    return { valid: false, errors: ['test lane record required'] };
  }

  const errors = [];

  if (lane.production_touched !== false) errors.push('production_touched must be false');
  if (lane.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (lane.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (lane.release_performed !== false) errors.push('release_performed must be false');
  if (lane.local_only !== true) errors.push('local_only must be true');
  if (lane.is_real_execution !== false) errors.push('is_real_execution must be false');
  if (lane.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  }

  if (lane.test_lane_status === 'TEST_LANE_PASS') {
    if (!lane.test_lane_hash) errors.push('test_lane_hash required when PASS');
    if (!lane.test_lane_id) errors.push('test_lane_id required when PASS');
    if (!lane.patch_proof_id) errors.push('patch_proof_id required when PASS');
    if (lane.test_lane_passed !== true) errors.push('test_lane_passed must be true when PASS');
  }

  if (lane.test_lane_status === 'TEST_LANE_FAIL') {
    if (!lane.test_lane_hash) errors.push('test_lane_hash required when FAIL');
    if (lane.test_lane_passed !== false) errors.push('test_lane_passed must be false when FAIL');
  }

  return { valid: errors.length === 0, errors };
}

export function renderRealLocalPatchTestLane(lane) {
  if (!lane || typeof lane !== 'object') {
    return '[RealLocalPatchTestLane] no record';
  }

  const lines = [
    `Real Local Patch Test Lane — ${lane.schema_version ?? 'unknown'}`,
    `  status:           ${lane.test_lane_status}`,
    `  test_lane_passed: ${lane.test_lane_passed}`,
  ];

  if (lane.test_lane_id) lines.push(`  test_lane_id:     ${lane.test_lane_id}`);
  if (lane.patch_proof_id) lines.push(`  patch_proof_id:   ${lane.patch_proof_id}`);
  if (lane.sandbox_id) lines.push(`  sandbox_id:       ${lane.sandbox_id}`);
  if (lane.test_suite) lines.push(`  test_suite:       ${lane.test_suite}`);
  if (lane.test_outcome) lines.push(`  test_outcome:     ${lane.test_outcome}`);
  if (typeof lane.tests_total === 'number') {
    lines.push(`  tests:            ${lane.tests_passed}/${lane.tests_total} passed, ${lane.tests_failed} failed`);
  }
  if (lane.test_lane_hash) lines.push(`  test_lane_hash:   ${lane.test_lane_hash}`);
  if (lane.blocked_reason) lines.push(`  blocked_reason:   ${lane.blocked_reason}`);

  lines.push('  --- invariants ---');
  lines.push(`  local_only:         ${lane.local_only}`);
  lines.push(`  production_touched: ${lane.production_touched}`);
  lines.push(`  deploy_performed:   ${lane.deploy_performed}`);
  lines.push(`  stable_promoted:    ${lane.stable_promoted}`);
  lines.push(`  release_performed:  ${lane.release_performed}`);
  lines.push(`  is_real_execution:  ${lane.is_real_execution}`);
  lines.push('  --- REGRA ABSOLUTA ---');
  lines.push('  SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  lines.push(`  REAL_LOCAL_PATCH_TEST_LANE_PASSED=${lane.test_lane_passed}`);

  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-local-patch-test-lane.mjs')) {
  const demo = buildRealLocalPatchTestLane({
    test_lane_id: 'test-lane-v168-demo',
    patch_proof_id: 'patch-proof-v1671-demo',
    patch_proof_status: 'PATCH_PROOF_CAPTURED',
    patch_proof_hash: 'proof-hash-demo-001',
    sandbox_id: 'sandbox-v167-demo',
    test_suite: 'tools/tests/sandbox-module.test.mjs',
    test_outcome: 'pass',
    tests_total: 10,
    tests_passed: 10,
    local_only: true,
    production_touched: false,
  });
  console.log(renderRealLocalPatchTestLane(demo));
}
