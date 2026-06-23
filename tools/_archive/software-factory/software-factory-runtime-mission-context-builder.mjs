import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RUNTIME_MISSION_CONTEXT_BUILDER_STATUSES = [
  'RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_INPUT',
  'RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_COMMAND',
  'RUNTIME_MISSION_CONTEXT_BUILDER_READY',
];

const BASE = {
  schema_version: 'v277.0',
  mission_context_builder_id: null,
  runtime_mission_context_builder_ready: false,
  mission_command_id: null,
  mission_scope_binder_id: null,
  mission_type: null,
  target_project: null,
  allowed_runtime_mode: null,
  context_hash: null,
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
    return { ...BASE, errors: ['RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_INPUT'] };
  }
  if (!input.mission_context_builder_id || typeof input.mission_context_builder_id !== 'string') {
    return { ...BASE, errors: ['RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_INPUT: missing mission_context_builder_id'] };
  }
  if (input.runtime_mission_scope_binder_ready !== true) {
    return { ...BASE, mission_context_builder_id: input.mission_context_builder_id, errors: ['RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_COMMAND: runtime_mission_scope_binder_ready must be true'] };
  }
  if (!input.mission_command_id || typeof input.mission_command_id !== 'string') {
    return { ...BASE, mission_context_builder_id: input.mission_context_builder_id, errors: ['RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_COMMAND: missing mission_command_id'] };
  }
  if (!input.mission_scope_binder_id || typeof input.mission_scope_binder_id !== 'string') {
    return { ...BASE, mission_context_builder_id: input.mission_context_builder_id, errors: ['RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_COMMAND: missing mission_scope_binder_id'] };
  }
  if (!input.mission_type || typeof input.mission_type !== 'string') {
    return { ...BASE, mission_context_builder_id: input.mission_context_builder_id, errors: ['RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_COMMAND: missing mission_type'] };
  }
  if (!input.target_project || typeof input.target_project !== 'string') {
    return { ...BASE, mission_context_builder_id: input.mission_context_builder_id, errors: ['RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_COMMAND: missing target_project'] };
  }

  const mcbId = input.mission_context_builder_id;
  const ctxHash = hash({
    mcbId,
    cmdId: input.mission_command_id,
    scopeId: input.mission_scope_binder_id,
    type: input.mission_type,
    project: input.target_project,
  });

  return {
    ...BASE,
    mission_context_builder_id: mcbId,
    runtime_mission_context_builder_ready: true,
    mission_command_id: input.mission_command_id,
    mission_scope_binder_id: input.mission_scope_binder_id,
    mission_type: input.mission_type,
    target_project: input.target_project,
    allowed_runtime_mode: input.allowed_runtime_mode || null,
    context_hash: ctxHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid runtime mission context builder'] };
  }
  const errors = [];
  if (!result.mission_context_builder_id) errors.push('missing mission_context_builder_id');
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
    return 'RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_INPUT';
  }
  const status = result.runtime_mission_context_builder_ready ? 'RUNTIME_MISSION_CONTEXT_BUILDER_READY' :
    result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_COMMAND'))
      ? 'RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_COMMAND' : 'RUNTIME_MISSION_CONTEXT_BUILDER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `mission_context_builder_id: ${result.mission_context_builder_id || '(none)'}\n`;
  out += `runtime_mission_context_builder_ready: ${result.runtime_mission_context_builder_ready}\n`;
  out += `mission_command_id: ${result.mission_command_id || '(none)'}\n`;
  out += `mission_scope_binder_id: ${result.mission_scope_binder_id || '(none)'}\n`;
  out += `mission_type: ${result.mission_type || '(none)'}\n`;
  out += `target_project: ${result.target_project || '(none)'}\n`;
  out += `allowed_runtime_mode: ${result.allowed_runtime_mode || '(none)'}\n`;
  if (result.context_hash) out += `context_hash: ${result.context_hash}\n`;
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
