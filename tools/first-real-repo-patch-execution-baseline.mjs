#!/usr/bin/env node
/**
 * First Real Repo Patch Execution Baseline — V180.0 (Final Capstone)
 * Seals the first real permitted patch pipeline as an immutable execution baseline.
 * Does NOT deploy, promote, or release.
 */

import { createHash } from 'crypto';

export const FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_STATUSES = [
  'FIRST_REAL_REPO_PATCH_BLOCKED_INPUT',
  'FIRST_REAL_REPO_PATCH_BLOCKED_ARCHIVE',
  'FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_READY',
];

const SCHEMA_VERSION = 'v180.0';

const PIPELINE_MODULES = [
  'real-repo-patch-scope-contract',
  'real-repo-patch-pre-state-snapshot',
  'real-repo-patch-apply-controller',
  'real-repo-patch-physical-apply-proof',
  'real-repo-patch-diff-truth-binding',
  'real-repo-patch-test-lane',
  'real-repo-patch-rollback-plan',
  'real-repo-patch-rollback-drill',
  'real-repo-patch-evidence-receipt',
  'real-repo-patch-ledger',
  'real-repo-patch-final-report',
  'real-repo-patch-pass-gold-candidate-gate',
  'real-repo-patch-baseline',
  'real-repo-patch-archive-record',
];

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason, overrides = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    execution_baseline_id: null,
    archive_record_id: null,
    pipeline_modules: PIPELINE_MODULES,
    baseline_hash: null,
    first_real_repo_patch_execution_baseline_ready: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'FIRST_REAL_REPO_PATCH_BLOCKED_INPUT',
    errors: [reason],
    ...overrides,
  };
}

export function buildFirstRealRepoPatchExecutionBaseline(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { execution_baseline_id, archive_record_id, archive_record_ready } = input;

  if (!execution_baseline_id || typeof execution_baseline_id !== 'string' || !execution_baseline_id.trim()) {
    return blockedInput('Missing or invalid execution_baseline_id');
  }
  if (!archive_record_id || typeof archive_record_id !== 'string' || !archive_record_id.trim()) {
    return blockedInput('Missing or invalid archive_record_id');
  }

  if (input.production_touched === true) {
    return blockedInput('production_touched must be false');
  }
  if (input.local_only === false) {
    return blockedInput('local_only must be true');
  }

  if (!archive_record_ready) {
    return {
      schema_version: SCHEMA_VERSION,
      execution_baseline_id,
      archive_record_id,
      pipeline_modules: PIPELINE_MODULES,
      baseline_hash: null,
      first_real_repo_patch_execution_baseline_ready: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'FIRST_REAL_REPO_PATCH_BLOCKED_ARCHIVE',
      errors: ['archive_record_ready must be true'],
    };
  }

  const baseline_hash = sha256(
    `${execution_baseline_id}:${archive_record_id}:${PIPELINE_MODULES.join(',')}`
  );

  return {
    schema_version: SCHEMA_VERSION,
    execution_baseline_id,
    archive_record_id,
    pipeline_modules: PIPELINE_MODULES,
    baseline_hash,
    first_real_repo_patch_execution_baseline_ready: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_READY',
    errors: [],
  };
}

export function validateFirstRealRepoPatchExecutionBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') {
    return { valid: false, errors: ['baseline is null or not an object'] };
  }
  const errors = [];
  if (baseline.production_touched !== false) errors.push('production_touched must be false');
  if (baseline.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (baseline.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (baseline.release_performed !== false) errors.push('release_performed must be false');
  if (!FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_STATUSES.includes(baseline.status)) {
    errors.push(`Invalid status: ${baseline.status}`);
  }
  if (
    baseline.status === 'FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_READY' &&
    !baseline.first_real_repo_patch_execution_baseline_ready
  ) {
    errors.push('BASELINE_READY requires first_real_repo_patch_execution_baseline_ready=true');
  }
  if (
    baseline.status === 'FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_READY' &&
    !baseline.baseline_hash
  ) {
    errors.push('BASELINE_READY requires baseline_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderFirstRealRepoPatchExecutionBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') return '[FirstRealRepoPatchExecutionBaseline: null]';
  const lines = [
    `=== First Real Repo Patch Execution Baseline ${SCHEMA_VERSION} ===`,
    `Status              : ${baseline.status}`,
    `Execution ID        : ${baseline.execution_baseline_id ?? 'N/A'}`,
    `Archive Record ID   : ${baseline.archive_record_id ?? 'N/A'}`,
    `Pipeline Modules    : ${(baseline.pipeline_modules || []).length}`,
    `Baseline Hash       : ${baseline.baseline_hash ?? 'N/A'}`,
    `Baseline Ready      : ${baseline.first_real_repo_patch_execution_baseline_ready}`,
    `Prod Touched        : ${baseline.production_touched}`,
  ];
  if (baseline.errors && baseline.errors.length) lines.push(`Errors              : ${baseline.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('first-real-repo-patch-execution-baseline.mjs')) {
  const demo = buildFirstRealRepoPatchExecutionBaseline({
    execution_baseline_id: 'exec-baseline-demo-001',
    archive_record_id: 'archive-demo-001',
    archive_record_ready: true,
    production_touched: false,
    local_only: true,
  });
  console.log(renderFirstRealRepoPatchExecutionBaseline(demo));
  const v = validateFirstRealRepoPatchExecutionBaseline(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
  if (!v.valid) console.error(v.errors);
}
