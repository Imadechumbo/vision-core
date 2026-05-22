import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PROJECT_CONTEXT_ISOLATION_STATUSES = [
  'PROJECT_CONTEXT_ISOLATION_BLOCKED_INPUT',
  'PROJECT_CONTEXT_ISOLATION_BLOCKED_REGISTRY',
  'PROJECT_CONTEXT_ISOLATION_FAIL',
  'PROJECT_CONTEXT_ISOLATION_READY',
];

const ALLOWED_ISOLATION_LEVELS = [
  'metadata-only',
  'read-only',
  'sandboxed',
];

const ALLOWED_ACCESS_MODES = [
  'read-only',
  'metadata-only',
  'no-write',
];

const REQUIRED_ISOLATION_CONTROLS = [
  'no-cross-project-write',
  'no-secret-sharing',
  'no-production-touch',
  'no-deploy',
  'no-release',
  'no-stable-promotion',
];

const BASE = {
  schema_version: 'v288.0',
  isolation_gate_id: null,
  project_context_isolation_gate_ready: false,
  context_bindings_count: 0,
  denied_cross_project_access_count: 0,
  isolation_controls_count: 0,
  isolation_hash: null,
  dashboard_enabled: false,
  dashboard_deployed: false,
  multi_project_enabled: false,
  policy_enforced: false,
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
    return { ...BASE, errors: ['PROJECT_CONTEXT_ISOLATION_BLOCKED_INPUT'] };
  }
  if (!input.isolation_gate_id || typeof input.isolation_gate_id !== 'string') {
    return { ...BASE, errors: ['PROJECT_CONTEXT_ISOLATION_BLOCKED_INPUT: missing isolation_gate_id'] };
  }
  if (input.multi_project_registry_contract_ready !== true) {
    return { ...BASE, isolation_gate_id: input.isolation_gate_id, errors: ['PROJECT_CONTEXT_ISOLATION_BLOCKED_REGISTRY: multi_project_registry_contract_ready must be true'] };
  }
  if (!input.registry_contract_id || typeof input.registry_contract_id !== 'string') {
    return { ...BASE, isolation_gate_id: input.isolation_gate_id, errors: ['PROJECT_CONTEXT_ISOLATION_BLOCKED_REGISTRY: missing registry_contract_id'] };
  }
  if (!Array.isArray(input.context_bindings) || input.context_bindings.length === 0) {
    return { ...BASE, isolation_gate_id: input.isolation_gate_id, errors: ['PROJECT_CONTEXT_ISOLATION_BLOCKED_REGISTRY: context_bindings must be non-empty array'] };
  }

  const failErrors = [];
  for (let i = 0; i < input.context_bindings.length; i++) {
    const b = input.context_bindings[i];
    if (!b.project_id || typeof b.project_id !== 'string') {
      failErrors.push(`binding ${i}: missing project_id`);
    }
    if (!b.context_id || typeof b.context_id !== 'string') {
      failErrors.push(`binding ${i}: missing context_id`);
    }
    if (!b.isolation_level || !ALLOWED_ISOLATION_LEVELS.includes(b.isolation_level)) {
      failErrors.push(`binding ${i}: invalid isolation_level`);
    }
    if (!b.access_mode || !ALLOWED_ACCESS_MODES.includes(b.access_mode)) {
      failErrors.push(`binding ${i}: invalid access_mode`);
    }
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      isolation_gate_id: input.isolation_gate_id,
      errors: ['PROJECT_CONTEXT_ISOLATION_FAIL: ' + failErrors.join('; ')],
    };
  }

  const controls = Array.isArray(input.isolation_controls) ? input.isolation_controls : REQUIRED_ISOLATION_CONTROLS;
  const missingControls = REQUIRED_ISOLATION_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) {
    return {
      ...BASE,
      isolation_gate_id: input.isolation_gate_id,
      context_bindings_count: input.context_bindings.length,
      errors: ['PROJECT_CONTEXT_ISOLATION_FAIL: missing required isolation controls: ' + missingControls.join(', ')],
    };
  }

  const deniedAccess = Array.isArray(input.denied_cross_project_access) ? input.denied_cross_project_access : [];

  const igId = input.isolation_gate_id;
  const isolationHash = hash({
    igId,
    registry: input.registry_contract_id,
    bindings: input.context_bindings,
    controls,
    denied: deniedAccess,
  });

  return {
    ...BASE,
    isolation_gate_id: igId,
    project_context_isolation_gate_ready: true,
    context_bindings_count: input.context_bindings.length,
    denied_cross_project_access_count: deniedAccess.length,
    isolation_controls_count: controls.length,
    isolation_hash: isolationHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid project context isolation gate'] };
  }
  const errors = [];
  if (!result.isolation_gate_id) errors.push('missing isolation_gate_id');
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
  if (result.dashboard_enabled !== false) errors.push('dashboard_enabled must be false');
  if (result.dashboard_deployed !== false) errors.push('dashboard_deployed must be false');
  if (result.multi_project_enabled !== false) errors.push('multi_project_enabled must be false');
  if (result.policy_enforced !== false) errors.push('policy_enforced must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'PROJECT_CONTEXT_ISOLATION_BLOCKED_INPUT';
  }
  const status = result.project_context_isolation_gate_ready ? 'PROJECT_CONTEXT_ISOLATION_READY' :
    result.errors && result.errors.some(e => e.startsWith('PROJECT_CONTEXT_ISOLATION_BLOCKED_REGISTRY'))
      ? 'PROJECT_CONTEXT_ISOLATION_BLOCKED_REGISTRY' :
      result.errors && result.errors.some(e => e.startsWith('PROJECT_CONTEXT_ISOLATION_FAIL'))
        ? 'PROJECT_CONTEXT_ISOLATION_FAIL' : 'PROJECT_CONTEXT_ISOLATION_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `isolation_gate_id: ${result.isolation_gate_id || '(none)'}\n`;
  out += `project_context_isolation_gate_ready: ${result.project_context_isolation_gate_ready}\n`;
  out += `context_bindings_count: ${result.context_bindings_count}\n`;
  out += `denied_cross_project_access_count: ${result.denied_cross_project_access_count}\n`;
  out += `isolation_controls_count: ${result.isolation_controls_count}\n`;
  if (result.isolation_hash) out += `isolation_hash: ${result.isolation_hash}\n`;
  out += `dashboard_enabled: ${result.dashboard_enabled}\n`;
  out += `dashboard_deployed: ${result.dashboard_deployed}\n`;
  out += `multi_project_enabled: ${result.multi_project_enabled}\n`;
  out += `policy_enforced: ${result.policy_enforced}\n`;
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