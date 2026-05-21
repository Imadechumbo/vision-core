#!/usr/bin/env node
/**
 * Real Local Patch Baseline — V170.0 (capstone)
 * Validates the full local patch pipeline: sandbox → apply-proof → test-lane → rollback-drill → evidence-report.
 */

import { createHash } from 'crypto';

export const REAL_LOCAL_PATCH_BASELINE_STATUSES = [
  'PATCH_BASELINE_BLOCKED_INPUT',
  'PATCH_BASELINE_BLOCKED_EVIDENCE',
  'PATCH_BASELINE_BLOCKED_PRODUCTION',
  'PATCH_BASELINE_READY',
  'PATCH_BASELINE_FAIL',
];

const SCHEMA_VERSION = 'v170.0';
const PIPELINE_STAGES = [
  'sandbox',
  'patch_proof',
  'test_lane',
  'rollback_drill',
  'evidence_report',
];

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function blocked(status, reason, overrides = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    baseline_status: status,
    baseline_ready: false,
    patch_baseline_ready: false,
    blocked_reason: reason,
    baseline_hash: null,
    pipeline_stages: PIPELINE_STAGES,
    stages_total: PIPELINE_STAGES.length,
    stages_ok: 0,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    local_only: true,
    is_real_execution: false,
    ...overrides,
  };
}

export function buildRealLocalPatchBaseline(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    !input.baseline_id ||
    typeof input.baseline_id !== 'string' ||
    !input.baseline_id.trim()
  ) {
    return blocked('PATCH_BASELINE_BLOCKED_INPUT', 'Missing or invalid baseline_id');
  }

  const {
    baseline_id,
    evidence_report_id,
    evidence_report_status,
    evidence_hash,
    sandbox_id,
    sandbox_status,
    patch_proof_id,
    patch_proof_status,
    test_lane_id,
    test_lane_status,
    rollback_drill_id,
    rollback_drill_status,
    patch_target,
    patch_type,
  } = input;

  if (!evidence_report_id || typeof evidence_report_id !== 'string' || !evidence_report_id.trim()) {
    return blocked('PATCH_BASELINE_BLOCKED_INPUT', 'Missing or invalid evidence_report_id');
  }
  if (!sandbox_id || typeof sandbox_id !== 'string' || !sandbox_id.trim()) {
    return blocked('PATCH_BASELINE_BLOCKED_INPUT', 'Missing or invalid sandbox_id');
  }
  if (!patch_proof_id || typeof patch_proof_id !== 'string' || !patch_proof_id.trim()) {
    return blocked('PATCH_BASELINE_BLOCKED_INPUT', 'Missing or invalid patch_proof_id');
  }
  if (!test_lane_id || typeof test_lane_id !== 'string' || !test_lane_id.trim()) {
    return blocked('PATCH_BASELINE_BLOCKED_INPUT', 'Missing or invalid test_lane_id');
  }
  if (!rollback_drill_id || typeof rollback_drill_id !== 'string' || !rollback_drill_id.trim()) {
    return blocked('PATCH_BASELINE_BLOCKED_INPUT', 'Missing or invalid rollback_drill_id');
  }
  if (!patch_target || typeof patch_target !== 'string' || !patch_target.trim()) {
    return blocked('PATCH_BASELINE_BLOCKED_INPUT', 'Missing or invalid patch_target');
  }
  if (!patch_type || typeof patch_type !== 'string' || !patch_type.trim()) {
    return blocked('PATCH_BASELINE_BLOCKED_INPUT', 'Missing or invalid patch_type');
  }

  if (input.production_touched === true) {
    return blocked('PATCH_BASELINE_BLOCKED_PRODUCTION', 'production_touched must be false');
  }
  if (input.local_only === false) {
    return blocked('PATCH_BASELINE_BLOCKED_PRODUCTION', 'local_only must be true');
  }

  if (evidence_report_status !== 'PATCH_EVIDENCE_COMPLETE') {
    return blocked(
      'PATCH_BASELINE_BLOCKED_EVIDENCE',
      `evidence_report_status must be PATCH_EVIDENCE_COMPLETE, got: ${evidence_report_status}`
    );
  }
  if (!evidence_hash || typeof evidence_hash !== 'string' || !evidence_hash.trim()) {
    return blocked('PATCH_BASELINE_BLOCKED_EVIDENCE', 'Missing evidence_hash');
  }

  const stage_statuses = {
    sandbox: sandbox_status === 'SANDBOX_READY',
    patch_proof: patch_proof_status === 'PATCH_PROOF_CAPTURED',
    test_lane: test_lane_status === 'TEST_LANE_PASS',
    rollback_drill: rollback_drill_status === 'ROLLBACK_DRILL_PASS',
    evidence_report: evidence_report_status === 'PATCH_EVIDENCE_COMPLETE',
  };
  const stages_ok = Object.values(stage_statuses).filter(Boolean).length;
  const stages_total = PIPELINE_STAGES.length;
  const all_pass = stages_ok === stages_total;

  const baseline_hash = sha256(
    `${baseline_id}:${evidence_report_id}:${evidence_hash}:${sandbox_id}:${patch_proof_id}:${test_lane_id}:${rollback_drill_id}:${patch_target}:${patch_type}`
  );

  if (!all_pass) {
    return {
      schema_version: SCHEMA_VERSION,
      baseline_id,
      evidence_report_id,
      evidence_report_status,
      sandbox_id,
      sandbox_status,
      patch_proof_id,
      patch_proof_status,
      test_lane_id,
      test_lane_status,
      rollback_drill_id,
      rollback_drill_status,
      patch_target,
      patch_type,
      pipeline_stages: PIPELINE_STAGES,
      stage_statuses,
      stages_total,
      stages_ok,
      baseline_hash,
      baseline_status: 'PATCH_BASELINE_FAIL',
      baseline_ready: false,
      patch_baseline_ready: false,
      blocked_reason: `Only ${stages_ok}/${stages_total} pipeline stages passed`,
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
    baseline_id,
    evidence_report_id,
    evidence_report_status,
    evidence_hash,
    sandbox_id,
    sandbox_status,
    patch_proof_id,
    patch_proof_status,
    test_lane_id,
    test_lane_status,
    rollback_drill_id,
    rollback_drill_status,
    patch_target,
    patch_type,
    pipeline_stages: PIPELINE_STAGES,
    stage_statuses,
    stages_total,
    stages_ok,
    baseline_hash,
    baseline_status: 'PATCH_BASELINE_READY',
    baseline_ready: true,
    patch_baseline_ready: true,
    blocked_reason: null,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    local_only: true,
    is_real_execution: false,
  };
}

export function validateRealLocalPatchBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') {
    return { valid: false, errors: ['baseline is null or not an object'] };
  }
  const errors = [];
  if (baseline.production_touched !== false) errors.push('production_touched must be false');
  if (baseline.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (baseline.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (baseline.release_performed !== false) errors.push('release_performed must be false');
  if (baseline.local_only !== true) errors.push('local_only must be true');
  if (baseline.is_real_execution !== false) errors.push('is_real_execution must be false');
  if (!REAL_LOCAL_PATCH_BASELINE_STATUSES.includes(baseline.baseline_status)) {
    errors.push(`Invalid baseline_status: ${baseline.baseline_status}`);
  }
  if (baseline.baseline_status === 'PATCH_BASELINE_READY') {
    if (!baseline.baseline_hash) errors.push('PATCH_BASELINE_READY requires baseline_hash');
    if (baseline.baseline_ready !== true) errors.push('PATCH_BASELINE_READY requires baseline_ready=true');
    if (baseline.patch_baseline_ready !== true) errors.push('PATCH_BASELINE_READY requires patch_baseline_ready=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealLocalPatchBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') {
    return '[RealLocalPatchBaseline: null]';
  }
  const lines = [
    `=== Real Local Patch Baseline ${SCHEMA_VERSION} ===`,
    `Status          : ${baseline.baseline_status}`,
    `Ready           : ${baseline.baseline_ready}`,
    `Baseline ID     : ${baseline.baseline_id ?? 'N/A'}`,
    `Evidence Report : ${baseline.evidence_report_id ?? 'N/A'} [${baseline.evidence_report_status ?? 'N/A'}]`,
    `Sandbox         : ${baseline.sandbox_id ?? 'N/A'} [${baseline.sandbox_status ?? 'N/A'}]`,
    `Patch Proof     : ${baseline.patch_proof_id ?? 'N/A'} [${baseline.patch_proof_status ?? 'N/A'}]`,
    `Test Lane       : ${baseline.test_lane_id ?? 'N/A'} [${baseline.test_lane_status ?? 'N/A'}]`,
    `Rollback Drill  : ${baseline.rollback_drill_id ?? 'N/A'} [${baseline.rollback_drill_status ?? 'N/A'}]`,
    `Patch Target    : ${baseline.patch_target ?? 'N/A'}`,
    `Stages          : ${baseline.stages_ok ?? 'N/A'}/${baseline.stages_total ?? 'N/A'}`,
    `Baseline Hash   : ${baseline.baseline_hash ?? 'N/A'}`,
    `Local Only      : ${baseline.local_only}`,
    `Prod Touched    : ${baseline.production_touched}`,
  ];
  if (baseline.blocked_reason) lines.push(`Blocked         : ${baseline.blocked_reason}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-local-patch-baseline.mjs')) {
  const demo = buildRealLocalPatchBaseline({
    baseline_id: 'baseline-demo-001',
    evidence_report_id: 'evidence-report-demo-001',
    evidence_report_status: 'PATCH_EVIDENCE_COMPLETE',
    evidence_hash: 'evidence-hash-demo-001',
    sandbox_id: 'sandbox-demo-001',
    sandbox_status: 'SANDBOX_READY',
    patch_proof_id: 'patch-proof-demo-001',
    patch_proof_status: 'PATCH_PROOF_CAPTURED',
    test_lane_id: 'test-lane-demo-001',
    test_lane_status: 'TEST_LANE_PASS',
    rollback_drill_id: 'rollback-drill-demo-001',
    rollback_drill_status: 'ROLLBACK_DRILL_PASS',
    patch_target: 'tools/sandbox-module.mjs',
    patch_type: 'code',
    local_only: true,
    production_touched: false,
  });
  console.log(renderRealLocalPatchBaseline(demo));
  const v = validateRealLocalPatchBaseline(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
  if (!v.valid) console.error(v.errors);
}
