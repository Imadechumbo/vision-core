#!/usr/bin/env node
/**
 * Real Repo Patch Final Authority Review — V188.0
 * Final authority gate that reviews simulation results before any future release.
 * Does NOT deploy, promote, or release. real_release_allowed=false always.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_AUTHORITY_REVIEW_STATUSES = [
  'AUTHORITY_REVIEW_BLOCKED_INPUT',
  'AUTHORITY_REVIEW_BLOCKED_SIMULATION',
  'AUTHORITY_REVIEW_REJECTED',
  'AUTHORITY_REVIEW_APPROVED',
];

const SCHEMA_VERSION = 'v188.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    review_id: null,
    sim_id: null,
    reviewer_decision: null,
    real_release_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    review_hash: null,
    status: 'AUTHORITY_REVIEW_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildRealRepoPatchFinalAuthorityReview(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { review_id, sim_id, simulation_passed, reviewer_decision } = input;

  if (!review_id || typeof review_id !== 'string' || !review_id.trim()) {
    return blockedInput('Missing or invalid review_id');
  }
  if (!sim_id || typeof sim_id !== 'string' || !sim_id.trim()) {
    return blockedInput('Missing or invalid sim_id');
  }

  if (!simulation_passed) {
    return {
      schema_version: SCHEMA_VERSION,
      review_id,
      sim_id,
      reviewer_decision: null,
      real_release_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      review_hash: null,
      status: 'AUTHORITY_REVIEW_BLOCKED_SIMULATION',
      errors: ['simulation_passed must be true'],
    };
  }

  if (!reviewer_decision || typeof reviewer_decision !== 'string' ||
      !['approved', 'rejected'].includes(reviewer_decision)) {
    const reason = !reviewer_decision
      ? 'reviewer_decision is required'
      : `reviewer_decision must be "approved" or "rejected", got: ${reviewer_decision}`;
    return {
      schema_version: SCHEMA_VERSION,
      review_id,
      sim_id,
      reviewer_decision: reviewer_decision ?? null,
      real_release_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      review_hash: null,
      status: 'AUTHORITY_REVIEW_BLOCKED_INPUT',
      errors: [reason],
    };
  }

  const review_hash = sha256(`${review_id}:${sim_id}:${reviewer_decision}`);

  if (reviewer_decision === 'rejected') {
    return {
      schema_version: SCHEMA_VERSION,
      review_id,
      sim_id,
      reviewer_decision,
      real_release_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      review_hash,
      status: 'AUTHORITY_REVIEW_REJECTED',
      errors: [],
    };
  }

  return {
    schema_version: SCHEMA_VERSION,
    review_id,
    sim_id,
    reviewer_decision,
    real_release_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    review_hash,
    status: 'AUTHORITY_REVIEW_APPROVED',
    errors: [],
  };
}

export function validateRealRepoPatchFinalAuthorityReview(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.real_release_allowed !== false) errors.push('real_release_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_AUTHORITY_REVIEW_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (['AUTHORITY_REVIEW_APPROVED', 'AUTHORITY_REVIEW_REJECTED'].includes(result.status) &&
      (!result.review_hash || result.review_hash.length !== 64)) {
    errors.push('Completed review requires 64-char review_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchFinalAuthorityReview(result) {
  if (!result || typeof result !== 'object') return '[FinalAuthorityReview: null]';
  const lines = [
    `=== Real Repo Patch Final Authority Review ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Review ID           : ${result.review_id ?? 'N/A'}`,
    `Sim ID              : ${result.sim_id ?? 'N/A'}`,
    `Reviewer Decision   : ${result.reviewer_decision ?? 'N/A'}`,
    `Real Release Allowed: ${result.real_release_allowed}`,
    `Review Hash         : ${result.review_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-final-authority-review.mjs')) {
  const demo = buildRealRepoPatchFinalAuthorityReview({
    review_id: 'review-demo-001',
    sim_id: 'sim-demo-001',
    simulation_passed: true,
    reviewer_decision: 'approved',
  });
  console.log(renderRealRepoPatchFinalAuthorityReview(demo));
  console.log(`\nreal_release_allowed: ${demo.real_release_allowed}`);
  const v = validateRealRepoPatchFinalAuthorityReview(demo);
  console.log(`Validation: ${v.valid ? 'OK' : 'FAIL'}`);
}
