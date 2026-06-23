#!/usr/bin/env node

import { createHash } from 'crypto';

export const CONTROLLED_TAG_PLAN_STATUSES = [
  'TAG_PLAN_BLOCKED_INPUT',
  'TAG_PLAN_BLOCKED_GO_DECISION',
  'TAG_PLAN_READY',
];

const SCHEMA_VERSION = 'v196.0';

const TAG_VALIDATION_STEPS = [
  'verify_main_clean',
  'verify_target_commit',
  'verify_pass_gold',
  'verify_phase_gate',
  'verify_go_decision',
  'verify_no_release_execution',
  'verify_no_deploy',
  'verify_no_stable_promotion',
];

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    controlled_tag_plan_id: null,
    planned_tag: null,
    tag_message: null,
    tag_target_commit: null,
    tag_validation_steps: [],
    tag_plan_ready: false,
    tag_created: false,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    tag_plan_hash: null,
    status: 'TAG_PLAN_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildControlledTagPlan(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    tag_plan_id,
    go_dry_ready,
    decision,
    release_plan_ready,
    certification_ready,
    requested_version,
    target_commit,
    tag_message,
    production_touched,
    deploy_performed,
    stable_promoted,
    release_performed,
  } = input;

  if (!tag_plan_id || typeof tag_plan_id !== 'string' || !tag_plan_id.trim()) {
    return blockedInput('Missing or invalid tag_plan_id');
  }
  if (!requested_version || typeof requested_version !== 'string' || !requested_version.trim()) {
    return blockedInput('Missing or invalid requested_version');
  }
  if (!target_commit || typeof target_commit !== 'string' || !target_commit.trim()) {
    return blockedInput('Missing or invalid target_commit');
  }
  if (!tag_message || typeof tag_message !== 'string' || !tag_message.trim()) {
    return blockedInput('Missing or invalid tag_message');
  }

  const goErrors = [];
  if (go_dry_ready !== true) goErrors.push('go_dry_ready must be true');
  if (decision !== 'GO') goErrors.push('decision must be "GO"');
  if (release_plan_ready !== true) goErrors.push('release_plan_ready must be true');
  if (certification_ready !== true) goErrors.push('certification_ready must be true');
  if (production_touched) goErrors.push('production_touched must be false');
  if (deploy_performed) goErrors.push('deploy_performed must be false');
  if (stable_promoted) goErrors.push('stable_promoted must be false');
  if (release_performed) goErrors.push('release_performed must be false');

  if (goErrors.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      controlled_tag_plan_id: tag_plan_id,
      planned_tag: null,
      tag_message: null,
      tag_target_commit: null,
      tag_validation_steps: [],
      tag_plan_ready: false,
      tag_created: false,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      tag_plan_hash: null,
      status: 'TAG_PLAN_BLOCKED_GO_DECISION',
      errors: goErrors,
    };
  }

  const planned_tag = `v${requested_version}`;
  const tag_plan_hash = sha256(`${tag_plan_id}:${planned_tag}:${target_commit}`);

  return {
    schema_version: SCHEMA_VERSION,
    controlled_tag_plan_id: tag_plan_id,
    planned_tag,
    tag_message,
    tag_target_commit: target_commit,
    tag_validation_steps: TAG_VALIDATION_STEPS,
    tag_plan_ready: true,
    tag_created: false,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    tag_plan_hash,
    status: 'TAG_PLAN_READY',
    errors: [],
  };
}

export function validateControlledTagPlan(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.tag_created !== false) errors.push('tag_created must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!CONTROLLED_TAG_PLAN_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'TAG_PLAN_READY' && (!result.tag_plan_hash || result.tag_plan_hash.length !== 64)) {
    errors.push('Ready requires 64-char tag_plan_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledTagPlan(result) {
  if (!result || typeof result !== 'object') return '[ControlledTagPlan: null]';
  const lines = [
    `=== Controlled Tag Plan ${SCHEMA_VERSION} ===`,
    `Status                  : ${result.status}`,
    `Tag Plan ID             : ${result.controlled_tag_plan_id ?? 'N/A'}`,
    `Planned Tag             : ${result.planned_tag ?? 'N/A'}`,
    `Tag Target Commit       : ${result.tag_target_commit ?? 'N/A'}`,
    `Tag Plan Ready          : ${result.tag_plan_ready}`,
    `Tag Created             : ${result.tag_created}`,
    `Tag Allowed             : ${result.tag_allowed}`,
    `Release Allowed         : ${result.release_allowed}`,
    `Real Exec Allowed       : ${result.real_execution_allowed}`,
    `Tag Plan Hash           : ${result.tag_plan_hash ?? 'N/A'}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors                  : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-tag-plan.mjs')) {
  const demo = buildControlledTagPlan({
    tag_plan_id: 'tag-plan-001',
    go_dry_ready: true,
    decision: 'GO',
    release_plan_ready: true,
    certification_ready: true,
    requested_version: '196.0',
    target_commit: 'abc123def456',
    tag_message: 'Release v196.0',
  });
  console.log(renderControlledTagPlan(demo));
  const v = validateControlledTagPlan(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
