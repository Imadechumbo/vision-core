import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_STATUSES = [
  'RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_INPUT',
  'RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_COMMAND',
  'RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_DRY_RUN_READY',
];

const ALLOWED_DRY_RUN_MODES = [
  'simulate',
  'validate',
  'preview',
];

const BASE = {
  schema_version: 'v279.0',
  mission_dry_run_controller_id: null,
  runtime_mission_execution_dry_run_controller_ready: false,
  dry_run_completed: false,
  mission_plan_builder_id: null,
  dry_run_mode: null,
  dry_run_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  runtime_execution_allowed: false,
  runtime_mission_executed: false,
  real_pr_creation_allowed: false,
  real_patch_execution_allowed: false,
  real_patch_applied: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_INPUT'] };
  }
  if (!input.mission_dry_run_controller_id || typeof input.mission_dry_run_controller_id !== 'string') {
    return { ...BASE, errors: ['RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_INPUT: missing mission_dry_run_controller_id'] };
  }
  if (input.runtime_mission_plan_builder_ready !== true) {
    return { ...BASE, mission_dry_run_controller_id: input.mission_dry_run_controller_id, errors: ['RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_COMMAND: runtime_mission_plan_builder_ready must be true'] };
  }
  if (!input.mission_plan_builder_id || typeof input.mission_plan_builder_id !== 'string') {
    return { ...BASE, mission_dry_run_controller_id: input.mission_dry_run_controller_id, errors: ['RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_COMMAND: missing mission_plan_builder_id'] };
  }
  if (!input.dry_run_mode || !ALLOWED_DRY_RUN_MODES.includes(input.dry_run_mode)) {
    return { ...BASE, mission_dry_run_controller_id: input.mission_dry_run_controller_id, errors: ['RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_COMMAND: invalid or missing dry_run_mode'] };
  }

  const mdcId = input.mission_dry_run_controller_id;
  const dryRunHash = hash({ mdcId, planId: input.mission_plan_builder_id, mode: input.dry_run_mode });

  return {
    ...BASE,
    mission_dry_run_controller_id: mdcId,
    runtime_mission_execution_dry_run_controller_ready: true,
    dry_run_completed: false,
    mission_plan_builder_id: input.mission_plan_builder_id,
    dry_run_mode: input.dry_run_mode,
    dry_run_hash: dryRunHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid runtime mission execution dry run controller'] };
  }
  const errors = [];
  if (!result.mission_dry_run_controller_id) errors.push('missing mission_dry_run_controller_id');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.runtime_execution_allowed !== false) errors.push('runtime_execution_allowed must be false');
  if (result.runtime_mission_executed !== false) errors.push('runtime_mission_executed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (result.real_patch_applied !== false) errors.push('real_patch_applied must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_INPUT';
  }
  const status = result.runtime_mission_execution_dry_run_controller_ready
    ? 'RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_DRY_RUN_READY' :
    result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_COMMAND'))
      ? 'RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_COMMAND' : 'RUNTIME_MISSION_EXECUTION_DRY_RUN_CONTROLLER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `mission_dry_run_controller_id: ${result.mission_dry_run_controller_id || '(none)'}\n`;
  out += `runtime_mission_execution_dry_run_controller_ready: ${result.runtime_mission_execution_dry_run_controller_ready}\n`;
  out += `dry_run_completed: ${result.dry_run_completed}\n`;
  out += `mission_plan_builder_id: ${result.mission_plan_builder_id || '(none)'}\n`;
  out += `dry_run_mode: ${result.dry_run_mode || '(none)'}\n`;
  if (result.dry_run_hash) out += `dry_run_hash: ${result.dry_run_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `runtime_execution_allowed: ${result.runtime_execution_allowed}\n`;
  out += `runtime_mission_executed: ${result.runtime_mission_executed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_patch_execution_allowed: ${result.real_patch_execution_allowed}\n`;
  out += `real_patch_applied: ${result.real_patch_applied}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
