#!/usr/bin/env node
/**
 * Real Local Patch Evidence Report — V169.0
 * Aggregates sandbox → apply-proof → test-lane → rollback-drill into a complete evidence record.
 */

import { createHash } from 'crypto';

export const REAL_LOCAL_PATCH_EVIDENCE_REPORT_STATUSES = [
  'PATCH_EVIDENCE_BLOCKED_INPUT',
  'PATCH_EVIDENCE_BLOCKED_ROLLBACK',
  'PATCH_EVIDENCE_BLOCKED_PRODUCTION',
  'PATCH_EVIDENCE_COMPLETE',
  'PATCH_EVIDENCE_INCOMPLETE',
];

const SCHEMA_VERSION = 'v169.0';

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function blocked(status, reason, overrides = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    evidence_report_status: status,
    evidence_complete: false,
    blocked_reason: reason,
    evidence_hash: null,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    local_only: true,
    is_real_execution: false,
    ...overrides,
  };
}

export function buildRealLocalPatchEvidenceReport(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    !input.evidence_report_id ||
    typeof input.evidence_report_id !== 'string' ||
    !input.evidence_report_id.trim()
  ) {
    return blocked('PATCH_EVIDENCE_BLOCKED_INPUT', 'Missing or invalid evidence_report_id');
  }

  const {
    evidence_report_id,
    sandbox_id,
    sandbox_status,
    sandbox_hash,
    patch_proof_id,
    patch_proof_status,
    patch_proof_hash,
    test_lane_id,
    test_lane_status,
    test_lane_hash,
    rollback_drill_id,
    rollback_drill_status,
    rollback_hash,
    patch_target,
    patch_type,
  } = input;

  if (!sandbox_id || typeof sandbox_id !== 'string' || !sandbox_id.trim()) {
    return blocked('PATCH_EVIDENCE_BLOCKED_INPUT', 'Missing or invalid sandbox_id');
  }
  if (!patch_proof_id || typeof patch_proof_id !== 'string' || !patch_proof_id.trim()) {
    return blocked('PATCH_EVIDENCE_BLOCKED_INPUT', 'Missing or invalid patch_proof_id');
  }
  if (!test_lane_id || typeof test_lane_id !== 'string' || !test_lane_id.trim()) {
    return blocked('PATCH_EVIDENCE_BLOCKED_INPUT', 'Missing or invalid test_lane_id');
  }
  if (!rollback_drill_id || typeof rollback_drill_id !== 'string' || !rollback_drill_id.trim()) {
    return blocked('PATCH_EVIDENCE_BLOCKED_INPUT', 'Missing or invalid rollback_drill_id');
  }
  if (!patch_target || typeof patch_target !== 'string' || !patch_target.trim()) {
    return blocked('PATCH_EVIDENCE_BLOCKED_INPUT', 'Missing or invalid patch_target');
  }
  if (!patch_type || typeof patch_type !== 'string' || !patch_type.trim()) {
    return blocked('PATCH_EVIDENCE_BLOCKED_INPUT', 'Missing or invalid patch_type');
  }

  if (input.production_touched === true) {
    return blocked('PATCH_EVIDENCE_BLOCKED_PRODUCTION', 'production_touched must be false');
  }
  if (input.local_only === false) {
    return blocked('PATCH_EVIDENCE_BLOCKED_PRODUCTION', 'local_only must be true');
  }

  if (rollback_drill_status !== 'ROLLBACK_DRILL_PASS') {
    return blocked(
      'PATCH_EVIDENCE_BLOCKED_ROLLBACK',
      `rollback_drill_status must be ROLLBACK_DRILL_PASS, got: ${rollback_drill_status}`
    );
  }
  if (!rollback_hash || typeof rollback_hash !== 'string' || !rollback_hash.trim()) {
    return blocked('PATCH_EVIDENCE_BLOCKED_ROLLBACK', 'Missing rollback_hash');
  }

  const evidence_hash = sha256(
    `${evidence_report_id}:${sandbox_id}:${sandbox_hash ?? ''}:${patch_proof_id}:${patch_proof_hash ?? ''}:${test_lane_id}:${test_lane_hash ?? ''}:${rollback_drill_id}:${rollback_hash}:${patch_target}:${patch_type}`
  );

  const stages_passed = [
    sandbox_status === 'SANDBOX_READY',
    patch_proof_status === 'PATCH_PROOF_CAPTURED',
    test_lane_status === 'TEST_LANE_PASS',
    rollback_drill_status === 'ROLLBACK_DRILL_PASS',
  ];
  const stages_total = 4;
  const stages_ok = stages_passed.filter(Boolean).length;
  const all_stages_pass = stages_ok === stages_total;

  if (!all_stages_pass) {
    return {
      schema_version: SCHEMA_VERSION,
      evidence_report_id,
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
      stages_total,
      stages_ok,
      evidence_hash,
      evidence_report_status: 'PATCH_EVIDENCE_INCOMPLETE',
      evidence_complete: false,
      blocked_reason: `Only ${stages_ok}/${stages_total} stages passed`,
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
    evidence_report_id,
    sandbox_id,
    sandbox_status,
    sandbox_hash: sandbox_hash ?? null,
    patch_proof_id,
    patch_proof_status,
    patch_proof_hash: patch_proof_hash ?? null,
    test_lane_id,
    test_lane_status,
    test_lane_hash: test_lane_hash ?? null,
    rollback_drill_id,
    rollback_drill_status,
    rollback_hash,
    patch_target,
    patch_type,
    stages_total,
    stages_ok,
    evidence_hash,
    evidence_report_status: 'PATCH_EVIDENCE_COMPLETE',
    evidence_complete: true,
    blocked_reason: null,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    local_only: true,
    is_real_execution: false,
  };
}

export function validateRealLocalPatchEvidenceReport(report) {
  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['report is null or not an object'] };
  }
  const errors = [];
  if (report.production_touched !== false) errors.push('production_touched must be false');
  if (report.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (report.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (report.release_performed !== false) errors.push('release_performed must be false');
  if (report.local_only !== true) errors.push('local_only must be true');
  if (report.is_real_execution !== false) errors.push('is_real_execution must be false');
  if (!REAL_LOCAL_PATCH_EVIDENCE_REPORT_STATUSES.includes(report.evidence_report_status)) {
    errors.push(`Invalid evidence_report_status: ${report.evidence_report_status}`);
  }
  if (report.evidence_report_status === 'PATCH_EVIDENCE_COMPLETE' && !report.evidence_hash) {
    errors.push('PATCH_EVIDENCE_COMPLETE requires evidence_hash');
  }
  if (report.evidence_report_status === 'PATCH_EVIDENCE_COMPLETE' && report.evidence_complete !== true) {
    errors.push('PATCH_EVIDENCE_COMPLETE requires evidence_complete=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealLocalPatchEvidenceReport(report) {
  if (!report || typeof report !== 'object') {
    return '[RealLocalPatchEvidenceReport: null]';
  }
  const lines = [
    `=== Real Local Patch Evidence Report ${SCHEMA_VERSION} ===`,
    `Status       : ${report.evidence_report_status}`,
    `Complete     : ${report.evidence_complete}`,
    `Report ID    : ${report.evidence_report_id ?? 'N/A'}`,
    `Sandbox      : ${report.sandbox_id ?? 'N/A'} [${report.sandbox_status ?? 'N/A'}]`,
    `Patch Proof  : ${report.patch_proof_id ?? 'N/A'} [${report.patch_proof_status ?? 'N/A'}]`,
    `Test Lane    : ${report.test_lane_id ?? 'N/A'} [${report.test_lane_status ?? 'N/A'}]`,
    `Rollback     : ${report.rollback_drill_id ?? 'N/A'} [${report.rollback_drill_status ?? 'N/A'}]`,
    `Patch Target : ${report.patch_target ?? 'N/A'}`,
    `Stages       : ${report.stages_ok ?? 'N/A'}/${report.stages_total ?? 'N/A'}`,
    `Evidence Hash: ${report.evidence_hash ?? 'N/A'}`,
    `Local Only   : ${report.local_only}`,
    `Prod Touched : ${report.production_touched}`,
  ];
  if (report.blocked_reason) lines.push(`Blocked      : ${report.blocked_reason}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-local-patch-evidence-report.mjs')) {
  const demo = buildRealLocalPatchEvidenceReport({
    evidence_report_id: 'evidence-report-demo-001',
    sandbox_id: 'sandbox-demo-001',
    sandbox_status: 'SANDBOX_READY',
    sandbox_hash: 'sandbox-hash-demo-001',
    patch_proof_id: 'patch-proof-demo-001',
    patch_proof_status: 'PATCH_PROOF_CAPTURED',
    patch_proof_hash: 'patch-proof-hash-demo-001',
    test_lane_id: 'test-lane-demo-001',
    test_lane_status: 'TEST_LANE_PASS',
    test_lane_hash: 'test-lane-hash-demo-001',
    rollback_drill_id: 'rollback-drill-demo-001',
    rollback_drill_status: 'ROLLBACK_DRILL_PASS',
    rollback_hash: 'rollback-hash-demo-001',
    patch_target: 'tools/sandbox-module.mjs',
    patch_type: 'code',
    local_only: true,
    production_touched: false,
  });
  console.log(renderRealLocalPatchEvidenceReport(demo));
  const v = validateRealLocalPatchEvidenceReport(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
  if (!v.valid) console.error(v.errors);
}
