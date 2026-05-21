#!/usr/bin/env node
/**
 * Real Repo Patch Archive Record — V179.0
 * Seals the patch pipeline evidence as an immutable archive record.
 * Does NOT deploy, promote, or release.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_ARCHIVE_RECORD_STATUSES = [
  'REPO_PATCH_ARCHIVE_BLOCKED_INPUT',
  'REPO_PATCH_ARCHIVE_BLOCKED_BASELINE',
  'REPO_PATCH_ARCHIVE_READY',
];

const SCHEMA_VERSION = 'v179.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason, overrides = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    archive_record_id: null,
    baseline_id: null,
    archive_hash: null,
    archive_record_ready: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'REPO_PATCH_ARCHIVE_BLOCKED_INPUT',
    errors: [reason],
    ...overrides,
  };
}

export function buildRealRepoPatchArchiveRecord(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { archive_record_id, baseline_id, real_repo_patch_baseline_ready } = input;

  if (!archive_record_id || typeof archive_record_id !== 'string' || !archive_record_id.trim()) {
    return blockedInput('Missing or invalid archive_record_id');
  }
  if (!baseline_id || typeof baseline_id !== 'string' || !baseline_id.trim()) {
    return blockedInput('Missing or invalid baseline_id');
  }

  if (input.production_touched === true) {
    return blockedInput('production_touched must be false');
  }
  if (input.local_only === false) {
    return blockedInput('local_only must be true');
  }

  if (!real_repo_patch_baseline_ready) {
    return {
      schema_version: SCHEMA_VERSION,
      archive_record_id,
      baseline_id,
      archive_hash: null,
      archive_record_ready: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'REPO_PATCH_ARCHIVE_BLOCKED_BASELINE',
      errors: ['real_repo_patch_baseline_ready must be true'],
    };
  }

  const archive_hash = sha256(`${archive_record_id}:${baseline_id}`);

  return {
    schema_version: SCHEMA_VERSION,
    archive_record_id,
    baseline_id,
    archive_hash,
    archive_record_ready: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'REPO_PATCH_ARCHIVE_READY',
    errors: [],
  };
}

export function validateRealRepoPatchArchiveRecord(record) {
  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['record is null or not an object'] };
  }
  const errors = [];
  if (record.production_touched !== false) errors.push('production_touched must be false');
  if (record.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (record.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (record.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_ARCHIVE_RECORD_STATUSES.includes(record.status)) {
    errors.push(`Invalid status: ${record.status}`);
  }
  if (record.status === 'REPO_PATCH_ARCHIVE_READY' && !record.archive_record_ready) {
    errors.push('ARCHIVE_READY requires archive_record_ready=true');
  }
  if (record.status === 'REPO_PATCH_ARCHIVE_READY' && !record.archive_hash) {
    errors.push('ARCHIVE_READY requires archive_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchArchiveRecord(record) {
  if (!record || typeof record !== 'object') return '[RealRepoPatchArchiveRecord: null]';
  const lines = [
    `=== Real Repo Patch Archive Record ${SCHEMA_VERSION} ===`,
    `Status              : ${record.status}`,
    `Archive Record ID   : ${record.archive_record_id ?? 'N/A'}`,
    `Baseline ID         : ${record.baseline_id ?? 'N/A'}`,
    `Archive Hash        : ${record.archive_hash ?? 'N/A'}`,
    `Archive Ready       : ${record.archive_record_ready}`,
    `Prod Touched        : ${record.production_touched}`,
  ];
  if (record.errors && record.errors.length) lines.push(`Errors              : ${record.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-archive-record.mjs')) {
  const demo = buildRealRepoPatchArchiveRecord({
    archive_record_id: 'archive-demo-001',
    baseline_id: 'baseline-demo-001',
    real_repo_patch_baseline_ready: true,
    production_touched: false,
    local_only: true,
  });
  console.log(renderRealRepoPatchArchiveRecord(demo));
  const v = validateRealRepoPatchArchiveRecord(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
  if (!v.valid) console.error(v.errors);
}
