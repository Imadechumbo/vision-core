#!/usr/bin/env node
/**
 * Real Repo Patch Release Simulator — V187.0
 * Simulates execution of a release plan without actually releasing.
 * Does NOT deploy, promote, or release. tag_created=false always.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_RELEASE_SIM_STATUSES = [
  'RELEASE_SIM_BLOCKED_INPUT',
  'RELEASE_SIM_BLOCKED_PLAN',
  'RELEASE_SIM_FAIL',
  'RELEASE_SIM_PASS',
];

const SCHEMA_VERSION = 'v187.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    sim_id: null,
    plan_id: null,
    simulated_steps: [],
    failed_steps: [],
    tag_created: false,
    release_executed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    sim_hash: null,
    status: 'RELEASE_SIM_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildRealRepoPatchReleaseSimulator(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { sim_id, plan_id, release_plan_ready, planned_steps } = input;

  if (!sim_id || typeof sim_id !== 'string' || !sim_id.trim()) {
    return blockedInput('Missing or invalid sim_id');
  }
  if (!plan_id || typeof plan_id !== 'string' || !plan_id.trim()) {
    return blockedInput('Missing or invalid plan_id');
  }

  if (!release_plan_ready || !Array.isArray(planned_steps) || planned_steps.length === 0) {
    return {
      schema_version: SCHEMA_VERSION,
      sim_id,
      plan_id,
      simulated_steps: [],
      failed_steps: [],
      tag_created: false,
      release_executed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      sim_hash: null,
      status: 'RELEASE_SIM_BLOCKED_PLAN',
      errors: ['release_plan_ready must be true and planned_steps must be non-empty array'],
    };
  }

  const forced_failures = Array.isArray(input.forced_failures) ? input.forced_failures : [];

  const simulated_steps = planned_steps.map(step => ({
    step,
    simulated: true,
    passed: !forced_failures.includes(step),
  }));

  const failed_steps = simulated_steps.filter(s => !s.passed).map(s => s.step);

  if (failed_steps.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      sim_id,
      plan_id,
      simulated_steps,
      failed_steps,
      tag_created: false,
      release_executed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      sim_hash: null,
      status: 'RELEASE_SIM_FAIL',
      errors: failed_steps.map(s => `Simulation failed at step: ${s}`),
    };
  }

  const sim_hash = sha256(`${sim_id}:${plan_id}:${planned_steps.join(',')}`);

  return {
    schema_version: SCHEMA_VERSION,
    sim_id,
    plan_id,
    simulated_steps,
    failed_steps: [],
    tag_created: false,
    release_executed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    sim_hash,
    status: 'RELEASE_SIM_PASS',
    errors: [],
  };
}

export function validateRealRepoPatchReleaseSimulator(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.tag_created !== false) errors.push('tag_created must be false');
  if (result.release_executed !== false) errors.push('release_executed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_RELEASE_SIM_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'RELEASE_SIM_PASS' && (!result.sim_hash || result.sim_hash.length !== 64)) {
    errors.push('RELEASE_SIM_PASS requires 64-char sim_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchReleaseSimulator(result) {
  if (!result || typeof result !== 'object') return '[ReleaseSimulator: null]';
  const lines = [
    `=== Real Repo Patch Release Simulator ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Sim ID              : ${result.sim_id ?? 'N/A'}`,
    `Plan ID             : ${result.plan_id ?? 'N/A'}`,
    `Simulated Steps     : ${(result.simulated_steps || []).length}`,
    `Failed Steps        : ${(result.failed_steps || []).length}`,
    `Tag Created         : ${result.tag_created}`,
    `Release Executed    : ${result.release_executed}`,
    `Sim Hash            : ${result.sim_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-release-simulator.mjs')) {
  const STEPS = ['verify_scope_contract', 'confirm_pre_state_snapshot', 'validate_apply_controller',
    'confirm_physical_apply_proof', 'verify_diff_truth_binding', 'confirm_test_lane',
    'verify_rollback_plan', 'confirm_rollback_drill', 'verify_evidence_receipt',
    'confirm_ledger', 'verify_final_report', 'confirm_pass_gold_candidate_gate',
    'confirm_baseline', 'confirm_archive_record', 'confirm_execution_baseline'];
  const demo = buildRealRepoPatchReleaseSimulator({
    sim_id: 'sim-demo-001',
    plan_id: 'plan-demo-001',
    release_plan_ready: true,
    planned_steps: STEPS,
  });
  console.log(renderRealRepoPatchReleaseSimulator(demo));
  const v = validateRealRepoPatchReleaseSimulator(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
