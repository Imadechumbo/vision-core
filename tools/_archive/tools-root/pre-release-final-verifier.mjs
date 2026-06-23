#!/usr/bin/env node

import { createHash } from 'crypto';

export const PRE_RELEASE_FINAL_VERIFIER_STATUSES = [
  'PRE_RELEASE_BLOCKED_INPUT',
  'PRE_RELEASE_BLOCKED_LOCK',
  'PRE_RELEASE_FAIL',
  'PRE_RELEASE_READY',
];

const SCHEMA_VERSION = 'v198.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    pre_release_verifier_id: null,
    pre_release_ready: false,
    failed_checks: [],
    verifier_hash: null,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'PRE_RELEASE_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildPreReleaseFinalVerifier(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    pre_release_verifier_id,
    release_plan_locked,
    tamper_detected,
    tag_plan_ready,
    go_dry_ready,
    phase_gate_ready,
    certification_ready,
    working_tree_clean,
    main_up_to_date,
    risk_level,
    production_touched,
    deploy_performed,
    stable_promoted,
    release_performed,
  } = input;

  if (!pre_release_verifier_id || typeof pre_release_verifier_id !== 'string' || !pre_release_verifier_id.trim()) {
    return blockedInput('Missing or invalid pre_release_verifier_id');
  }

  if (release_plan_locked !== true) {
    return {
      schema_version: SCHEMA_VERSION,
      pre_release_verifier_id,
      pre_release_ready: false,
      failed_checks: ['release_plan_locked must be true'],
      verifier_hash: null,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'PRE_RELEASE_BLOCKED_LOCK',
      errors: ['release_plan_locked must be true'],
    };
  }

  const failed = [];
  if (tamper_detected === true) failed.push('tamper_detected must be false');
  if (tag_plan_ready !== true) failed.push('tag_plan_ready must be true');
  if (go_dry_ready !== true) failed.push('go_dry_ready must be true');
  if (phase_gate_ready !== true) failed.push('phase_gate_ready must be true');
  if (certification_ready !== true) failed.push('certification_ready must be true');
  if (working_tree_clean !== true) failed.push('working_tree_clean must be true');
  if (main_up_to_date !== true) failed.push('main_up_to_date must be true');
  if (risk_level === 'BLOCKED') failed.push('risk_level must not be BLOCKED');
  if (production_touched) failed.push('production_touched must be false');
  if (deploy_performed) failed.push('deploy_performed must be false');
  if (stable_promoted) failed.push('stable_promoted must be false');
  if (release_performed) failed.push('release_performed must be false');

  if (failed.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      pre_release_verifier_id,
      pre_release_ready: false,
      failed_checks: failed,
      verifier_hash: null,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'PRE_RELEASE_FAIL',
      errors: failed,
    };
  }

  const verifier_hash = sha256(`${pre_release_verifier_id}:v198`);

  return {
    schema_version: SCHEMA_VERSION,
    pre_release_verifier_id,
    pre_release_ready: true,
    failed_checks: [],
    verifier_hash,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'PRE_RELEASE_READY',
    errors: [],
  };
}

export function validatePreReleaseFinalVerifier(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!PRE_RELEASE_FINAL_VERIFIER_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'PRE_RELEASE_READY' && (!result.verifier_hash || result.verifier_hash.length !== 64)) {
    errors.push('Ready requires 64-char verifier_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderPreReleaseFinalVerifier(result) {
  if (!result || typeof result !== 'object') return '[PreReleaseFinalVerifier: null]';
  const lines = [
    `=== Pre-Release Final Verifier ${SCHEMA_VERSION} ===`,
    `Status                  : ${result.status}`,
    `Verifier ID             : ${result.pre_release_verifier_id ?? 'N/A'}`,
    `Pre-Release Ready       : ${result.pre_release_ready}`,
    `Failed Checks           : ${(result.failed_checks || []).join(', ') || 'none'}`,
    `Verifier Hash           : ${result.verifier_hash ?? 'N/A'}`,
    `Release Allowed         : ${result.release_allowed}`,
    `Real Exec Allowed       : ${result.real_execution_allowed}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors                  : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('pre-release-final-verifier.mjs')) {
  const demo = buildPreReleaseFinalVerifier({
    pre_release_verifier_id: 'verifier-001',
    release_plan_locked: true,
    tamper_detected: false,
    tag_plan_ready: true,
    go_dry_ready: true,
    phase_gate_ready: true,
    certification_ready: true,
    working_tree_clean: true,
    main_up_to_date: true,
    risk_level: 'LOW',
  });
  console.log(renderPreReleaseFinalVerifier(demo));
  const v = validatePreReleaseFinalVerifier(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
