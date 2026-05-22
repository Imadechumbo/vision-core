#!/usr/bin/env node
/**
 * Real Repo Patch Release Plan Generator — V186.0
 * Generates a structured release plan from an approved RC dry run.
 * Does NOT execute, deploy, promote, or release.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_RELEASE_PLAN_STATUSES = [
  'RELEASE_PLAN_BLOCKED_INPUT',
  'RELEASE_PLAN_BLOCKED_RC',
  'RELEASE_PLAN_READY',
];

const SCHEMA_VERSION = 'v186.0';

const PLANNED_STEPS = [
  'verify_scope_contract',
  'confirm_pre_state_snapshot',
  'validate_apply_controller',
  'confirm_physical_apply_proof',
  'verify_diff_truth_binding',
  'confirm_test_lane',
  'verify_rollback_plan',
  'confirm_rollback_drill',
  'verify_evidence_receipt',
  'confirm_ledger',
  'verify_final_report',
  'confirm_pass_gold_candidate_gate',
  'confirm_baseline',
  'confirm_archive_record',
  'confirm_execution_baseline',
];

const ROLLBACK_STEPS = [
  'halt_on_failure',
  'execute_rollback_plan',
  'restore_pre_state_snapshot',
  'verify_rollback_completion',
  'emit_rollback_evidence',
];

const VALIDATION_STEPS = [
  'validate_graph_integrity',
  'validate_replay_verifier',
  'validate_human_approval_binding',
  'validate_rc_dry_run',
  'validate_all_invariants',
];

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    plan_id: null,
    rc_id: null,
    planned_steps: [],
    rollback_steps: [],
    validation_steps: [],
    release_executed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    plan_hash: null,
    status: 'RELEASE_PLAN_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildRealRepoPatchReleasePlanGenerator(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { plan_id, rc_id, rc_dry_run_ready } = input;

  if (!plan_id || typeof plan_id !== 'string' || !plan_id.trim()) {
    return blockedInput('Missing or invalid plan_id');
  }
  if (!rc_id || typeof rc_id !== 'string' || !rc_id.trim()) {
    return blockedInput('Missing or invalid rc_id');
  }

  if (!rc_dry_run_ready) {
    return {
      schema_version: SCHEMA_VERSION,
      plan_id,
      rc_id,
      planned_steps: [],
      rollback_steps: [],
      validation_steps: [],
      release_executed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      plan_hash: null,
      status: 'RELEASE_PLAN_BLOCKED_RC',
      errors: ['rc_dry_run_ready must be true'],
    };
  }

  const plan_hash = sha256(`${plan_id}:${rc_id}:${PLANNED_STEPS.join(',')}`);

  return {
    schema_version: SCHEMA_VERSION,
    plan_id,
    rc_id,
    planned_steps: PLANNED_STEPS,
    rollback_steps: ROLLBACK_STEPS,
    validation_steps: VALIDATION_STEPS,
    release_executed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    plan_hash,
    status: 'RELEASE_PLAN_READY',
    errors: [],
  };
}

export function validateRealRepoPatchReleasePlanGenerator(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.release_executed !== false) errors.push('release_executed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_RELEASE_PLAN_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'RELEASE_PLAN_READY' && (!result.plan_hash || result.plan_hash.length !== 64)) {
    errors.push('RELEASE_PLAN_READY requires 64-char plan_hash');
  }
  if (result.status === 'RELEASE_PLAN_READY' && (!Array.isArray(result.planned_steps) || result.planned_steps.length === 0)) {
    errors.push('RELEASE_PLAN_READY requires non-empty planned_steps');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchReleasePlanGenerator(result) {
  if (!result || typeof result !== 'object') return '[ReleasePlanGenerator: null]';
  const lines = [
    `=== Real Repo Patch Release Plan Generator ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Plan ID             : ${result.plan_id ?? 'N/A'}`,
    `RC ID               : ${result.rc_id ?? 'N/A'}`,
    `Planned Steps       : ${(result.planned_steps || []).length}`,
    `Rollback Steps      : ${(result.rollback_steps || []).length}`,
    `Validation Steps    : ${(result.validation_steps || []).length}`,
    `Release Executed    : ${result.release_executed}`,
    `Plan Hash           : ${result.plan_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-release-plan-generator.mjs')) {
  const demo = buildRealRepoPatchReleasePlanGenerator({
    plan_id: 'plan-demo-001',
    rc_id: 'rc-demo-001',
    rc_dry_run_ready: true,
  });
  console.log(renderRealRepoPatchReleasePlanGenerator(demo));
  const v = validateRealRepoPatchReleasePlanGenerator(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
