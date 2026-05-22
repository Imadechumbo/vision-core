import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_MULTI_PROJECT_REGISTRY_STATUSES = [
  'MULTI_PROJECT_REGISTRY_BLOCKED_INPUT',
  'MULTI_PROJECT_REGISTRY_BLOCKED_DATA_MODEL',
  'MULTI_PROJECT_REGISTRY_FAIL',
  'MULTI_PROJECT_REGISTRY_READY',
];

const ALLOWED_PROJECT_TYPES = [
  'software-factory',
  'frontend',
  'backend',
  'go-core',
  'worker',
  'documentation',
  'external',
];

const ALLOWED_ISOLATION_LEVELS = [
  'metadata-only',
  'read-only',
  'sandboxed',
];

const ALLOWED_REGISTRY_MODES = [
  'contract-only',
  'metadata-only',
  'planning',
];

const REQUIRED_CONTROLS = [
  'project-id-required',
  'isolation-required',
  'policy-binding-required',
  'evidence-binding-required',
  'no-cross-project-write',
];

const BASE = {
  schema_version: 'v287.0',
  registry_contract_id: null,
  multi_project_registry_contract_ready: false,
  projects_count: 0,
  registry_mode: null,
  required_controls_count: 0,
  registry_hash: null,
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
    return { ...BASE, errors: ['MULTI_PROJECT_REGISTRY_BLOCKED_INPUT'] };
  }
  if (!input.registry_contract_id || typeof input.registry_contract_id !== 'string') {
    return { ...BASE, errors: ['MULTI_PROJECT_REGISTRY_BLOCKED_INPUT: missing registry_contract_id'] };
  }
  if (input.product_dashboard_data_model_ready !== true) {
    return { ...BASE, registry_contract_id: input.registry_contract_id, errors: ['MULTI_PROJECT_REGISTRY_BLOCKED_DATA_MODEL: product_dashboard_data_model_ready must be true'] };
  }
  if (!input.data_model_id || typeof input.data_model_id !== 'string') {
    return { ...BASE, registry_contract_id: input.registry_contract_id, errors: ['MULTI_PROJECT_REGISTRY_BLOCKED_DATA_MODEL: missing data_model_id'] };
  }
  if (!input.registry_mode || !ALLOWED_REGISTRY_MODES.includes(input.registry_mode)) {
    return { ...BASE, registry_contract_id: input.registry_contract_id, errors: ['MULTI_PROJECT_REGISTRY_BLOCKED_DATA_MODEL: invalid registry_mode'] };
  }
  if (!Array.isArray(input.projects) || input.projects.length === 0) {
    return { ...BASE, registry_contract_id: input.registry_contract_id, errors: ['MULTI_PROJECT_REGISTRY_BLOCKED_DATA_MODEL: projects must be non-empty array'] };
  }

  const failErrors = [];
  for (let i = 0; i < input.projects.length; i++) {
    const p = input.projects[i];
    if (!p.project_id || typeof p.project_id !== 'string') {
      failErrors.push(`project ${i}: missing project_id`);
    }
    if (!p.project_name || typeof p.project_name !== 'string') {
      failErrors.push(`project ${i}: missing project_name`);
    }
    if (!p.project_type || !ALLOWED_PROJECT_TYPES.includes(p.project_type)) {
      failErrors.push(`project ${i}: invalid project_type`);
    }
    if (!p.isolation_level || !ALLOWED_ISOLATION_LEVELS.includes(p.isolation_level)) {
      failErrors.push(`project ${i}: invalid isolation_level`);
    }
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      registry_contract_id: input.registry_contract_id,
      errors: ['MULTI_PROJECT_REGISTRY_FAIL: ' + failErrors.join('; ')],
    };
  }

  const controls = Array.isArray(input.required_controls) ? input.required_controls : REQUIRED_CONTROLS;
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) {
    return {
      ...BASE,
      registry_contract_id: input.registry_contract_id,
      projects_count: input.projects.length,
      errors: ['MULTI_PROJECT_REGISTRY_FAIL: missing required controls: ' + missingControls.join(', ')],
    };
  }

  const rcId = input.registry_contract_id;
  const registryHash = hash({
    rcId,
    dataModel: input.data_model_id,
    projects: input.projects,
    controls,
    mode: input.registry_mode,
  });

  return {
    ...BASE,
    registry_contract_id: rcId,
    multi_project_registry_contract_ready: true,
    projects_count: input.projects.length,
    registry_mode: input.registry_mode,
    required_controls_count: controls.length,
    registry_hash: registryHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid multi-project registry contract'] };
  }
  const errors = [];
  if (!result.registry_contract_id) errors.push('missing registry_contract_id');
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
    return 'MULTI_PROJECT_REGISTRY_BLOCKED_INPUT';
  }
  const status = result.multi_project_registry_contract_ready ? 'MULTI_PROJECT_REGISTRY_READY' :
    result.errors && result.errors.some(e => e.startsWith('MULTI_PROJECT_REGISTRY_BLOCKED_DATA_MODEL'))
      ? 'MULTI_PROJECT_REGISTRY_BLOCKED_DATA_MODEL' :
      result.errors && result.errors.some(e => e.startsWith('MULTI_PROJECT_REGISTRY_FAIL'))
        ? 'MULTI_PROJECT_REGISTRY_FAIL' : 'MULTI_PROJECT_REGISTRY_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `registry_contract_id: ${result.registry_contract_id || '(none)'}\n`;
  out += `multi_project_registry_contract_ready: ${result.multi_project_registry_contract_ready}\n`;
  out += `projects_count: ${result.projects_count}\n`;
  out += `registry_mode: ${result.registry_mode || '(none)'}\n`;
  out += `required_controls_count: ${result.required_controls_count}\n`;
  if (result.registry_hash) out += `registry_hash: ${result.registry_hash}\n`;
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