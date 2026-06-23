import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCT_DASHBOARD_CONTRACT_STATUSES = [
  'PRODUCT_DASHBOARD_CONTRACT_BLOCKED_INPUT',
  'PRODUCT_DASHBOARD_CONTRACT_BLOCKED_PHASE_GATE',
  'PRODUCT_DASHBOARD_CONTRACT_DENIED',
  'PRODUCT_DASHBOARD_CONTRACT_READY',
];

const ALLOWED_DASHBOARD_MODES = [
  'contract-only',
  'metadata-only',
  'planning',
];

const ALLOWED_DASHBOARD_SURFACES = [
  'mission_status',
  'project_registry',
  'policy_status',
  'evidence_summary',
  'pass_gold_status',
  'audit_ledger',
  'runtime_summary',
];

const BASE = {
  schema_version: 'v285.0',
  dashboard_contract_id: null,
  product_dashboard_contract_ready: false,
  explicit_command_received: false,
  dashboard_mode: null,
  dashboard_surfaces_count: 0,
  contract_hash: null,
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
    return { ...BASE, errors: ['PRODUCT_DASHBOARD_CONTRACT_BLOCKED_INPUT'] };
  }
  if (!input.dashboard_contract_id || typeof input.dashboard_contract_id !== 'string') {
    return { ...BASE, errors: ['PRODUCT_DASHBOARD_CONTRACT_BLOCKED_INPUT: missing dashboard_contract_id'] };
  }
  if (input.runtime_mission_execution_phase_gate_ready !== true) {
    return { ...BASE, dashboard_contract_id: input.dashboard_contract_id, errors: ['PRODUCT_DASHBOARD_CONTRACT_BLOCKED_PHASE_GATE: V284 phase gate must be ready'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, dashboard_contract_id: input.dashboard_contract_id, errors: ['PRODUCT_DASHBOARD_CONTRACT_BLOCKED_PHASE_GATE: missing phase_gate_id'] };
  }
  if (input.explicit_v285_command !== true) {
    return { ...BASE, dashboard_contract_id: input.dashboard_contract_id, errors: ['PRODUCT_DASHBOARD_CONTRACT_DENIED: explicit_v285_command must be true'] };
  }
  if (!input.requested_by || typeof input.requested_by !== 'string') {
    return { ...BASE, dashboard_contract_id: input.dashboard_contract_id, errors: ['PRODUCT_DASHBOARD_CONTRACT_DENIED: missing requested_by'] };
  }
  if (!input.dashboard_goal || typeof input.dashboard_goal !== 'string') {
    return { ...BASE, dashboard_contract_id: input.dashboard_contract_id, errors: ['PRODUCT_DASHBOARD_CONTRACT_DENIED: missing dashboard_goal'] };
  }
  if (!input.dashboard_scope || typeof input.dashboard_scope !== 'string') {
    return { ...BASE, dashboard_contract_id: input.dashboard_contract_id, errors: ['PRODUCT_DASHBOARD_CONTRACT_DENIED: missing dashboard_scope'] };
  }
  if (!input.dashboard_mode || !ALLOWED_DASHBOARD_MODES.includes(input.dashboard_mode)) {
    return { ...BASE, dashboard_contract_id: input.dashboard_contract_id, errors: ['PRODUCT_DASHBOARD_CONTRACT_DENIED: invalid dashboard_mode'] };
  }
  if (!Array.isArray(input.dashboard_surfaces) || input.dashboard_surfaces.length === 0) {
    return { ...BASE, dashboard_contract_id: input.dashboard_contract_id, errors: ['PRODUCT_DASHBOARD_CONTRACT_DENIED: dashboard_surfaces must be non-empty array'] };
  }
  const invalidSurfaces = input.dashboard_surfaces.filter(s => !ALLOWED_DASHBOARD_SURFACES.includes(s));
  if (invalidSurfaces.length > 0) {
    return { ...BASE, dashboard_contract_id: input.dashboard_contract_id, errors: ['PRODUCT_DASHBOARD_CONTRACT_DENIED: invalid surfaces: ' + invalidSurfaces.join(', ')] };
  }

  const dcId = input.dashboard_contract_id;
  const contractHash = hash({
    dcId,
    gate: input.phase_gate_id,
    mode: input.dashboard_mode,
    surfaces: input.dashboard_surfaces,
  });

  return {
    ...BASE,
    dashboard_contract_id: dcId,
    product_dashboard_contract_ready: true,
    explicit_command_received: true,
    dashboard_mode: input.dashboard_mode,
    dashboard_surfaces_count: input.dashboard_surfaces.length,
    contract_hash: contractHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid product dashboard contract'] };
  }
  const errors = [];
  if (!result.dashboard_contract_id) errors.push('missing dashboard_contract_id');
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
    return 'PRODUCT_DASHBOARD_CONTRACT_BLOCKED_INPUT';
  }
  const status = result.product_dashboard_contract_ready ? 'PRODUCT_DASHBOARD_CONTRACT_READY' :
    result.errors && result.errors.some(e => e.startsWith('PRODUCT_DASHBOARD_CONTRACT_BLOCKED_PHASE_GATE'))
      ? 'PRODUCT_DASHBOARD_CONTRACT_BLOCKED_PHASE_GATE' :
      result.errors && result.errors.some(e => e.startsWith('PRODUCT_DASHBOARD_CONTRACT_DENIED'))
        ? 'PRODUCT_DASHBOARD_CONTRACT_DENIED' : 'PRODUCT_DASHBOARD_CONTRACT_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `dashboard_contract_id: ${result.dashboard_contract_id || '(none)'}\n`;
  out += `product_dashboard_contract_ready: ${result.product_dashboard_contract_ready}\n`;
  out += `explicit_command_received: ${result.explicit_command_received}\n`;
  out += `dashboard_mode: ${result.dashboard_mode || '(none)'}\n`;
  out += `dashboard_surfaces_count: ${result.dashboard_surfaces_count}\n`;
  if (result.contract_hash) out += `contract_hash: ${result.contract_hash}\n`;
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
