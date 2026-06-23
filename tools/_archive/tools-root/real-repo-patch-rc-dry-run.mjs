#!/usr/bin/env node
/**
 * Real Repo Patch Release Candidate Dry Run — V185.0
 * Validates that a release candidate is ready for dry-run simulation.
 * Does NOT deploy, promote, or release.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_RC_DRY_RUN_STATUSES = [
  'RC_DRY_RUN_BLOCKED_INPUT',
  'RC_DRY_RUN_BLOCKED_APPROVAL',
  'RC_DRY_RUN_READY',
];

const SCHEMA_VERSION = 'v185.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    rc_id: null,
    binding_id: null,
    dry_run_performed: false,
    release_executed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    rc_hash: null,
    status: 'RC_DRY_RUN_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildRealRepoPatchRcDryRun(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { rc_id, binding_id, approval_bound, approval_decision, replay_id } = input;

  if (!rc_id || typeof rc_id !== 'string' || !rc_id.trim()) {
    return blockedInput('Missing or invalid rc_id');
  }
  if (!binding_id || typeof binding_id !== 'string' || !binding_id.trim()) {
    return blockedInput('Missing or invalid binding_id');
  }
  if (!replay_id || typeof replay_id !== 'string' || !replay_id.trim()) {
    return blockedInput('Missing or invalid replay_id');
  }

  if (!approval_bound || approval_decision !== 'approved') {
    return {
      schema_version: SCHEMA_VERSION,
      rc_id,
      binding_id,
      dry_run_performed: false,
      release_executed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      rc_hash: null,
      status: 'RC_DRY_RUN_BLOCKED_APPROVAL',
      errors: ['approval_bound must be true and approval_decision must be "approved"'],
    };
  }

  const rc_hash = sha256(`${rc_id}:${binding_id}:${replay_id}`);

  return {
    schema_version: SCHEMA_VERSION,
    rc_id,
    binding_id,
    replay_id,
    dry_run_performed: false,
    release_executed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    rc_hash,
    status: 'RC_DRY_RUN_READY',
    errors: [],
  };
}

export function validateRealRepoPatchRcDryRun(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.dry_run_performed !== false) errors.push('dry_run_performed must be false');
  if (result.release_executed !== false) errors.push('release_executed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_RC_DRY_RUN_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'RC_DRY_RUN_READY' && (!result.rc_hash || result.rc_hash.length !== 64)) {
    errors.push('RC_DRY_RUN_READY requires 64-char rc_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchRcDryRun(result) {
  if (!result || typeof result !== 'object') return '[RcDryRun: null]';
  const lines = [
    `=== Real Repo Patch RC Dry Run ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `RC ID               : ${result.rc_id ?? 'N/A'}`,
    `Binding ID          : ${result.binding_id ?? 'N/A'}`,
    `Replay ID           : ${result.replay_id ?? 'N/A'}`,
    `Dry Run Performed   : ${result.dry_run_performed}`,
    `Release Executed    : ${result.release_executed}`,
    `RC Hash             : ${result.rc_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-rc-dry-run.mjs')) {
  const demo = buildRealRepoPatchRcDryRun({
    rc_id: 'rc-demo-001',
    binding_id: 'binding-demo-001',
    replay_id: 'replay-demo-001',
    approval_bound: true,
    approval_decision: 'approved',
  });
  console.log(renderRealRepoPatchRcDryRun(demo));
  const v = validateRealRepoPatchRcDryRun(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
