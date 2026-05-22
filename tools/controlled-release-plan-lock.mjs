#!/usr/bin/env node

import { createHash } from 'crypto';

export const CONTROLLED_RELEASE_PLAN_LOCK_STATUSES = [
  'RELEASE_LOCK_BLOCKED_INPUT',
  'RELEASE_LOCK_BLOCKED_TAG_PLAN',
  'RELEASE_LOCK_READY',
  'RELEASE_LOCK_TAMPERED',
];

const SCHEMA_VERSION = 'v197.0';

const LOCKED_COMPONENTS = [
  'controlled_tag_plan',
  'release_plan',
  'impact_manifest',
  'go_no_go_decision',
];

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    release_plan_lock_id: null,
    locked_components: [],
    release_plan_locked: false,
    tamper_detected: false,
    lock_hash: null,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'RELEASE_LOCK_BLOCKED_INPUT',
    errors: [reason],
  };
}

function computeLockHash(ids) {
  return sha256(`${ids.controlled_tag_plan_id}:${ids.release_plan_id}:${ids.impact_manifest_id}:${ids.go_no_go_decision_id}`);
}

export function buildControlledReleasePlanLock(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    release_lock_id,
    tag_plan_ready,
    release_plan_ready,
    impact_manifest_ready,
    go_dry_ready,
    controlled_tag_plan_id,
    release_plan_id,
    impact_manifest_id,
    go_no_go_decision_id,
    expected_lock_hash,
    production_touched,
    deploy_performed,
    stable_promoted,
    release_performed,
  } = input;

  if (!release_lock_id || typeof release_lock_id !== 'string' || !release_lock_id.trim()) {
    return blockedInput('Missing or invalid release_lock_id');
  }
  if (!controlled_tag_plan_id || typeof controlled_tag_plan_id !== 'string' || !controlled_tag_plan_id.trim()) {
    return blockedInput('Missing or invalid controlled_tag_plan_id');
  }
  if (!release_plan_id || typeof release_plan_id !== 'string' || !release_plan_id.trim()) {
    return blockedInput('Missing or invalid release_plan_id');
  }
  if (!impact_manifest_id || typeof impact_manifest_id !== 'string' || !impact_manifest_id.trim()) {
    return blockedInput('Missing or invalid impact_manifest_id');
  }
  if (!go_no_go_decision_id || typeof go_no_go_decision_id !== 'string' || !go_no_go_decision_id.trim()) {
    return blockedInput('Missing or invalid go_no_go_decision_id');
  }

  const prereqErrors = [];
  if (tag_plan_ready !== true) prereqErrors.push('tag_plan_ready must be true');
  if (release_plan_ready !== true) prereqErrors.push('release_plan_ready must be true');
  if (impact_manifest_ready !== true) prereqErrors.push('impact_manifest_ready must be true');
  if (go_dry_ready !== true) prereqErrors.push('go_dry_ready must be true');
  if (production_touched) prereqErrors.push('production_touched must be false');
  if (deploy_performed) prereqErrors.push('deploy_performed must be false');
  if (stable_promoted) prereqErrors.push('stable_promoted must be false');
  if (release_performed) prereqErrors.push('release_performed must be false');

  if (prereqErrors.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      release_plan_lock_id: release_lock_id,
      locked_components: [],
      release_plan_locked: false,
      tamper_detected: false,
      lock_hash: null,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'RELEASE_LOCK_BLOCKED_TAG_PLAN',
      errors: prereqErrors,
    };
  }

  const ids = { controlled_tag_plan_id, release_plan_id, impact_manifest_id, go_no_go_decision_id };
  const lock_hash = computeLockHash(ids);

  if (expected_lock_hash !== undefined && expected_lock_hash !== null) {
    if (expected_lock_hash !== lock_hash) {
      return {
        schema_version: SCHEMA_VERSION,
        release_plan_lock_id: release_lock_id,
        locked_components: LOCKED_COMPONENTS,
        release_plan_locked: false,
        tamper_detected: true,
        lock_hash,
        real_execution_allowed: false,
        release_allowed: false,
        deploy_allowed: false,
        stable_allowed: false,
        tag_allowed: false,
        production_touched: false,
        deploy_performed: false,
        stable_promoted: false,
        release_performed: false,
        status: 'RELEASE_LOCK_TAMPERED',
        errors: ['Lock hash mismatch: expected lock hash does not match computed lock hash'],
      };
    }
  }

  return {
    schema_version: SCHEMA_VERSION,
    release_plan_lock_id: release_lock_id,
    locked_components: LOCKED_COMPONENTS,
    release_plan_locked: true,
    tamper_detected: false,
    lock_hash,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'RELEASE_LOCK_READY',
    errors: [],
  };
}

export function validateControlledReleasePlanLock(result) {
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
  if (!CONTROLLED_RELEASE_PLAN_LOCK_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'RELEASE_LOCK_READY' && (!result.lock_hash || result.lock_hash.length !== 64)) {
    errors.push('Ready requires 64-char lock_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledReleasePlanLock(result) {
  if (!result || typeof result !== 'object') return '[ControlledReleasePlanLock: null]';
  const lines = [
    `=== Controlled Release Plan Lock ${SCHEMA_VERSION} ===`,
    `Status                  : ${result.status}`,
    `Release Plan Lock ID    : ${result.release_plan_lock_id ?? 'N/A'}`,
    `Release Plan Locked     : ${result.release_plan_locked}`,
    `Tamper Detected         : ${result.tamper_detected}`,
    `Locked Components       : ${(result.locked_components || []).join(', ') || 'N/A'}`,
    `Lock Hash               : ${result.lock_hash ?? 'N/A'}`,
    `Release Allowed         : ${result.release_allowed}`,
    `Real Exec Allowed       : ${result.real_execution_allowed}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors                  : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-release-plan-lock.mjs')) {
  const demo = buildControlledReleasePlanLock({
    release_lock_id: 'lock-001',
    tag_plan_ready: true,
    release_plan_ready: true,
    impact_manifest_ready: true,
    go_dry_ready: true,
    controlled_tag_plan_id: 'tp-001',
    release_plan_id: 'rp-001',
    impact_manifest_id: 'im-001',
    go_no_go_decision_id: 'gng-001',
  });
  console.log(renderControlledReleasePlanLock(demo));
  const v = validateControlledReleasePlanLock(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
