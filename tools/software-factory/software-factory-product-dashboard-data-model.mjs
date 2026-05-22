import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCT_DASHBOARD_DATA_MODEL_STATUSES = [
  'PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_INPUT',
  'PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT',
  'PRODUCT_DASHBOARD_DATA_MODEL_FAIL',
  'PRODUCT_DASHBOARD_DATA_MODEL_READY',
];

const ALLOWED_ENTITY_TYPES = [
  'mission',
  'project',
  'policy',
  'evidence',
  'audit',
  'gate',
  'status',
  'report',
];

const REQUIRED_ENTITIES = [
  'mission',
  'project',
  'policy',
  'evidence',
  'audit',
];

const ALLOWED_DATA_MODEL_LEVELS = [
  'metadata-only',
  'contract-only',
  'planning',
];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v286.0',
  data_model_id: null,
  product_dashboard_data_model_ready: false,
  entities_count: 0,
  required_entities_count: 0,
  data_model_level: null,
  data_model_hash: null,
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
    return { ...BASE, errors: ['PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_INPUT'] };
  }
  if (!input.data_model_id || typeof input.data_model_id !== 'string') {
    return { ...BASE, errors: ['PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_INPUT: missing data_model_id'] };
  }
  if (input.product_dashboard_contract_ready !== true) {
    return { ...BASE, data_model_id: input.data_model_id, errors: ['PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT: product_dashboard_contract_ready must be true'] };
  }
  if (!input.dashboard_contract_id || typeof input.dashboard_contract_id !== 'string') {
    return { ...BASE, data_model_id: input.data_model_id, errors: ['PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT: missing dashboard_contract_id'] };
  }
  if (!input.data_model_level || !ALLOWED_DATA_MODEL_LEVELS.includes(input.data_model_level)) {
    return { ...BASE, data_model_id: input.data_model_id, errors: ['PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT: invalid data_model_level'] };
  }
  if (!Array.isArray(input.entities) || input.entities.length === 0) {
    return { ...BASE, data_model_id: input.data_model_id, errors: ['PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT: entities must be non-empty array'] };
  }

  const failErrors = [];
  for (let i = 0; i < input.entities.length; i++) {
    const e = input.entities[i];
    if (!e.entity_name || typeof e.entity_name !== 'string') {
      failErrors.push(`entry ${i}: missing entity_name`);
    }
    if (!e.entity_type || !ALLOWED_ENTITY_TYPES.includes(e.entity_type)) {
      failErrors.push(`entry ${i}: invalid entity_type`);
    }
    if (!e.schema_hash || !HEX64_RE.test(e.schema_hash)) {
      failErrors.push(`entry ${i}: schema_hash must be 64 hex chars`);
    }
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      data_model_id: input.data_model_id,
      errors: ['PRODUCT_DASHBOARD_DATA_MODEL_FAIL: ' + failErrors.join('; ')],
    };
  }

  const requiredCheck = Array.isArray(input.required_entities) ? input.required_entities : REQUIRED_ENTITIES;
  const missingRequired = REQUIRED_ENTITIES.filter(re => !requiredCheck.includes(re));
  if (missingRequired.length > 0) {
    return {
      ...BASE,
      data_model_id: input.data_model_id,
      entities_count: input.entities.length,
      errors: ['PRODUCT_DASHBOARD_DATA_MODEL_FAIL: missing required entities: ' + missingRequired.join(', ')],
    };
  }

  const dmId = input.data_model_id;
  const dataModelHash = hash({
    dmId,
    contract: input.dashboard_contract_id,
    entities: input.entities,
    required: requiredCheck,
    level: input.data_model_level,
  });

  return {
    ...BASE,
    data_model_id: dmId,
    product_dashboard_data_model_ready: true,
    entities_count: input.entities.length,
    required_entities_count: requiredCheck.length,
    data_model_level: input.data_model_level,
    data_model_hash: dataModelHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid product dashboard data model'] };
  }
  const errors = [];
  if (!result.data_model_id) errors.push('missing data_model_id');
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
    return 'PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_INPUT';
  }
  const status = result.product_dashboard_data_model_ready ? 'PRODUCT_DASHBOARD_DATA_MODEL_READY' :
    result.errors && result.errors.some(e => e.startsWith('PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT'))
      ? 'PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_CONTRACT' :
      result.errors && result.errors.some(e => e.startsWith('PRODUCT_DASHBOARD_DATA_MODEL_FAIL'))
        ? 'PRODUCT_DASHBOARD_DATA_MODEL_FAIL' : 'PRODUCT_DASHBOARD_DATA_MODEL_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `data_model_id: ${result.data_model_id || '(none)'}\n`;
  out += `product_dashboard_data_model_ready: ${result.product_dashboard_data_model_ready}\n`;
  out += `entities_count: ${result.entities_count}\n`;
  out += `required_entities_count: ${result.required_entities_count}\n`;
  out += `data_model_level: ${result.data_model_level || '(none)'}\n`;
  if (result.data_model_hash) out += `data_model_hash: ${result.data_model_hash}\n`;
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
