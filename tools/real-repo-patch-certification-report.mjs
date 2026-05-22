#!/usr/bin/env node
/**
 * Real Repo Patch Certification Report — V189.0
 * Generates certification report from an authority-approved review.
 * Does NOT deploy, promote, or release. release_allowed=false always.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_CERTIFICATION_STATUSES = [
  'CERTIFICATION_BLOCKED_INPUT',
  'CERTIFICATION_BLOCKED_AUTHORITY',
  'CERTIFICATION_READY',
];

const SCHEMA_VERSION = 'v189.0';

const CERTIFIED_MODULES = [
  'scope_contract',
  'pre_state_snapshot',
  'apply_controller',
  'physical_apply_proof',
  'diff_truth_binding',
  'test_lane',
  'rollback_plan',
  'rollback_drill',
  'evidence_receipt',
  'ledger',
  'final_report',
  'pass_gold_candidate_gate',
  'baseline',
  'archive_record',
  'execution_baseline',
  'chain_integrity_gate',
  'evidence_graph',
  'replay_verifier',
  'human_approval_binding',
  'rc_dry_run',
];

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    cert_id: null,
    review_id: null,
    certified_modules: [],
    release_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    certification_hash: null,
    status: 'CERTIFICATION_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildRealRepoPatchCertificationReport(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { cert_id, review_id, authority_review_approved } = input;

  if (!cert_id || typeof cert_id !== 'string' || !cert_id.trim()) {
    return blockedInput('Missing or invalid cert_id');
  }
  if (!review_id || typeof review_id !== 'string' || !review_id.trim()) {
    return blockedInput('Missing or invalid review_id');
  }

  if (!authority_review_approved) {
    return {
      schema_version: SCHEMA_VERSION,
      cert_id,
      review_id,
      certified_modules: [],
      release_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      certification_hash: null,
      status: 'CERTIFICATION_BLOCKED_AUTHORITY',
      errors: ['authority_review_approved must be true'],
    };
  }

  const certification_hash = sha256(`${cert_id}:${review_id}:${CERTIFIED_MODULES.join(',')}`);

  return {
    schema_version: SCHEMA_VERSION,
    cert_id,
    review_id,
    certified_modules: CERTIFIED_MODULES,
    release_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    certification_hash,
    status: 'CERTIFICATION_READY',
    errors: [],
  };
}

export function validateRealRepoPatchCertificationReport(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_CERTIFICATION_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'CERTIFICATION_READY' && (!result.certification_hash || result.certification_hash.length !== 64)) {
    errors.push('CERTIFICATION_READY requires 64-char certification_hash');
  }
  if (result.status === 'CERTIFICATION_READY' && (!Array.isArray(result.certified_modules) || result.certified_modules.length === 0)) {
    errors.push('CERTIFICATION_READY requires non-empty certified_modules');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchCertificationReport(result) {
  if (!result || typeof result !== 'object') return '[CertificationReport: null]';
  const lines = [
    `=== Real Repo Patch Certification Report ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Cert ID             : ${result.cert_id ?? 'N/A'}`,
    `Review ID           : ${result.review_id ?? 'N/A'}`,
    `Certified Modules   : ${(result.certified_modules || []).length}`,
    `Release Allowed     : ${result.release_allowed}`,
    `Certification Hash  : ${result.certification_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-certification-report.mjs')) {
  const demo = buildRealRepoPatchCertificationReport({
    cert_id: 'cert-demo-001',
    review_id: 'review-demo-001',
    authority_review_approved: true,
  });
  console.log(renderRealRepoPatchCertificationReport(demo));
  console.log(`\nrelease_allowed: ${demo.release_allowed}`);
  const v = validateRealRepoPatchCertificationReport(demo);
  console.log(`Validation: ${v.valid ? 'OK' : 'FAIL'}`);
}
