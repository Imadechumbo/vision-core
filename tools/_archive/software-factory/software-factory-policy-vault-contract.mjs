import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_POLICY_VAULT_CONTRACT_STATUSES = [
  'POLICY_VAULT_CONTRACT_BLOCKED_INPUT',
  'POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION',
  'POLICY_VAULT_CONTRACT_FAIL',
  'POLICY_VAULT_CONTRACT_READY',
];

const ALLOWED_POLICY_TYPES = [
  'pass_gold',
  'no_deploy',
  'no_release',
  'no_stable',
  'no_secret_access',
  'no_cross_project_write',
  'no_real_execution',
  'no_production_touch',
  'human_approval_required',
];

const ALLOWED_SEVERITIES = [
  'info',
  'warning',
  'blocking',
  'critical',
];

const REQUIRED_POLICY_TYPES = [
  'pass_gold',
  'no_deploy',
  'no_release',
  'no_stable',
  'no_real_execution',
  'no_production_touch',
  'human_approval_required',
];

const ALLOWED_ENFORCEMENT_MODES = [
  'contract-only',
  'dry-run',
  'planning',
];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v289.0',
  policy_vault_id: null,
  policy_vault_contract_ready: false,
  policies_count: 0,
  required_policy_types_count: 0,
  enforcement_mode: null,
  policy_vault_hash: null,
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
    return { ...BASE, errors: ['POLICY_VAULT_CONTRACT_BLOCKED_INPUT'] };
  }
  if (!input.policy_vault_id || typeof input.policy_vault_id !== 'string') {
    return { ...BASE, errors: ['POLICY_VAULT_CONTRACT_BLOCKED_INPUT: missing policy_vault_id'] };
  }
  if (input.project_context_isolation_gate_ready !== true) {
    return { ...BASE, policy_vault_id: input.policy_vault_id, errors: ['POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION: project_context_isolation_gate_ready must be true'] };
  }
  if (!input.isolation_gate_id || typeof input.isolation_gate_id !== 'string') {
    return { ...BASE, policy_vault_id: input.policy_vault_id, errors: ['POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION: missing isolation_gate_id'] };
  }
  if (!input.enforcement_mode || !ALLOWED_ENFORCEMENT_MODES.includes(input.enforcement_mode)) {
    return { ...BASE, policy_vault_id: input.policy_vault_id, errors: ['POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION: invalid enforcement_mode'] };
  }
  if (!Array.isArray(input.policies) || input.policies.length === 0) {
    return { ...BASE, policy_vault_id: input.policy_vault_id, errors: ['POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION: policies must be non-empty array'] };
  }

  const failErrors = [];
  for (let i = 0; i < input.policies.length; i++) {
    const p = input.policies[i];
    if (!p.policy_id || typeof p.policy_id !== 'string') {
      failErrors.push(`policy ${i}: missing policy_id`);
    }
    if (!p.policy_type || !ALLOWED_POLICY_TYPES.includes(p.policy_type)) {
      failErrors.push(`policy ${i}: invalid policy_type`);
    }
    if (!p.severity || !ALLOWED_SEVERITIES.includes(p.severity)) {
      failErrors.push(`policy ${i}: invalid severity`);
    }
    if (!p.policy_hash || !HEX64_RE.test(p.policy_hash)) {
      failErrors.push(`policy ${i}: policy_hash must be 64 hex chars`);
    }
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      policy_vault_id: input.policy_vault_id,
      errors: ['POLICY_VAULT_CONTRACT_FAIL: ' + failErrors.join('; ')],
    };
  }

  const requiredTypes = Array.isArray(input.required_policy_types) ? input.required_policy_types : REQUIRED_POLICY_TYPES;
  const missingTypes = REQUIRED_POLICY_TYPES.filter(t => !requiredTypes.includes(t));
  if (missingTypes.length > 0) {
    return {
      ...BASE,
      policy_vault_id: input.policy_vault_id,
      policies_count: input.policies.length,
      errors: ['POLICY_VAULT_CONTRACT_FAIL: missing required policy types: ' + missingTypes.join(', ')],
    };
  }

  const pvId = input.policy_vault_id;
  const policyVaultHash = hash({
    pvId,
    isolation: input.isolation_gate_id,
    policies: input.policies,
    required: requiredTypes,
    mode: input.enforcement_mode,
  });

  return {
    ...BASE,
    policy_vault_id: pvId,
    policy_vault_contract_ready: true,
    policies_count: input.policies.length,
    required_policy_types_count: requiredTypes.length,
    enforcement_mode: input.enforcement_mode,
    policy_vault_hash: policyVaultHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid policy vault contract'] };
  }
  const errors = [];
  if (!result.policy_vault_id) errors.push('missing policy_vault_id');
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
    return 'POLICY_VAULT_CONTRACT_BLOCKED_INPUT';
  }
  const status = result.policy_vault_contract_ready ? 'POLICY_VAULT_CONTRACT_READY' :
    result.errors && result.errors.some(e => e.startsWith('POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION'))
      ? 'POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION' :
      result.errors && result.errors.some(e => e.startsWith('POLICY_VAULT_CONTRACT_FAIL'))
        ? 'POLICY_VAULT_CONTRACT_FAIL' : 'POLICY_VAULT_CONTRACT_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `policy_vault_id: ${result.policy_vault_id || '(none)'}\n`;
  out += `policy_vault_contract_ready: ${result.policy_vault_contract_ready}\n`;
  out += `policies_count: ${result.policies_count}\n`;
  out += `required_policy_types_count: ${result.required_policy_types_count}\n`;
  out += `enforcement_mode: ${result.enforcement_mode || '(none)'}\n`;
  if (result.policy_vault_hash) out += `policy_vault_hash: ${result.policy_vault_hash}\n`;
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