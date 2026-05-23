import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PROJECT_POLICY_BINDING_STATUSES = [
  'PROJECT_POLICY_BINDING_BLOCKED_INPUT',
  'PROJECT_POLICY_BINDING_BLOCKED_VIEW',
  'PROJECT_POLICY_BINDING_FAIL',
  'PROJECT_POLICY_BINDING_READY',
];

const ALLOWED_BINDING_MODES = [
  'read-only',
  'metadata-only',
  'planning',
];

const REQUIRED_BINDING_CONTROLS = [
  'pass-gold-required',
  'human-approval-required',
  'no-deploy',
  'no-release',
  'no-stable-promotion',
  'no-production-touch',
  'no-real-execution',
  'no-cross-project-write',
];

const ALLOWED_BINDING_LEVELS = [
  'contract-only',
  'metadata-only',
  'planning',
];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v291.0',
  policy_binding_id: null,
  project_policy_binding_contract_ready: false,
  bindings_count: 0,
  required_binding_controls_count: 0,
  binding_level: null,
  policy_binding_hash: null,
  dashboard_enabled: false,
  dashboard_deployed: false,
  multi_project_enabled: false,
  policy_enforced: false,
  audit_ledger_written: false,
  projection_published: false,
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
    return { ...BASE, errors: ['PROJECT_POLICY_BINDING_BLOCKED_INPUT'] };
  }
  if (!input.policy_binding_id || typeof input.policy_binding_id !== 'string') {
    return { ...BASE, errors: ['PROJECT_POLICY_BINDING_BLOCKED_INPUT: missing policy_binding_id'] };
  }
  if (input.dashboard_view_contract_ready !== true) {
    return { ...BASE, policy_binding_id: input.policy_binding_id, errors: ['PROJECT_POLICY_BINDING_BLOCKED_VIEW: dashboard_view_contract_ready must be true'] };
  }
  if (!input.dashboard_view_contract_id || typeof input.dashboard_view_contract_id !== 'string') {
    return { ...BASE, policy_binding_id: input.policy_binding_id, errors: ['PROJECT_POLICY_BINDING_BLOCKED_VIEW: missing dashboard_view_contract_id'] };
  }
  if (!input.binding_level || !ALLOWED_BINDING_LEVELS.includes(input.binding_level)) {
    return { ...BASE, policy_binding_id: input.policy_binding_id, errors: ['PROJECT_POLICY_BINDING_BLOCKED_VIEW: invalid binding_level'] };
  }
  if (!Array.isArray(input.bindings) || input.bindings.length === 0) {
    return { ...BASE, policy_binding_id: input.policy_binding_id, errors: ['PROJECT_POLICY_BINDING_BLOCKED_VIEW: bindings must be non-empty array'] };
  }

  const failErrors = [];
  for (let i = 0; i < input.bindings.length; i++) {
    const b = input.bindings[i];
    if (!b.project_id || typeof b.project_id !== 'string') {
      failErrors.push(`binding ${i}: missing project_id`);
    }
    if (!b.policy_id || typeof b.policy_id !== 'string') {
      failErrors.push(`binding ${i}: missing policy_id`);
    }
    if (!b.binding_mode || !ALLOWED_BINDING_MODES.includes(b.binding_mode)) {
      failErrors.push(`binding ${i}: invalid binding_mode`);
    }
    if (!b.binding_hash || !HEX64_RE.test(b.binding_hash)) {
      failErrors.push(`binding ${i}: binding_hash must be 64 hex chars`);
    }
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      policy_binding_id: input.policy_binding_id,
      errors: ['PROJECT_POLICY_BINDING_FAIL: ' + failErrors.join('; ')],
    };
  }

  const controls = Array.isArray(input.required_binding_controls) ? input.required_binding_controls : REQUIRED_BINDING_CONTROLS;
  const missingControls = REQUIRED_BINDING_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) {
    return {
      ...BASE,
      policy_binding_id: input.policy_binding_id,
      bindings_count: input.bindings.length,
      errors: ['PROJECT_POLICY_BINDING_FAIL: missing required binding controls: ' + missingControls.join(', ')],
    };
  }

  const pbId = input.policy_binding_id;
  const policyBindingHash = hash({
    pbId,
    view: input.dashboard_view_contract_id,
    bindings: input.bindings,
    controls,
    level: input.binding_level,
  });

  return {
    ...BASE,
    policy_binding_id: pbId,
    project_policy_binding_contract_ready: true,
    bindings_count: input.bindings.length,
    required_binding_controls_count: controls.length,
    binding_level: input.binding_level,
    policy_binding_hash: policyBindingHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid project policy binding contract'] };
  }
  const errors = [];
  if (!result.policy_binding_id) errors.push('missing policy_binding_id');
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
  if (result.audit_ledger_written !== false) errors.push('audit_ledger_written must be false');
  if (result.projection_published !== false) errors.push('projection_published must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'PROJECT_POLICY_BINDING_BLOCKED_INPUT';
  }
  const status = result.project_policy_binding_contract_ready ? 'PROJECT_POLICY_BINDING_READY' :
    result.errors && result.errors.some(e => e.startsWith('PROJECT_POLICY_BINDING_BLOCKED_VIEW'))
      ? 'PROJECT_POLICY_BINDING_BLOCKED_VIEW' :
      result.errors && result.errors.some(e => e.startsWith('PROJECT_POLICY_BINDING_FAIL'))
        ? 'PROJECT_POLICY_BINDING_FAIL' : 'PROJECT_POLICY_BINDING_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `policy_binding_id: ${result.policy_binding_id || '(none)'}\n`;
  out += `project_policy_binding_contract_ready: ${result.project_policy_binding_contract_ready}\n`;
  out += `bindings_count: ${result.bindings_count}\n`;
  out += `required_binding_controls_count: ${result.required_binding_controls_count}\n`;
  out += `binding_level: ${result.binding_level || '(none)'}\n`;
  if (result.policy_binding_hash) out += `policy_binding_hash: ${result.policy_binding_hash}\n`;
  out += `dashboard_enabled: ${result.dashboard_enabled}\n`;
  out += `dashboard_deployed: ${result.dashboard_deployed}\n`;
  out += `multi_project_enabled: ${result.multi_project_enabled}\n`;
  out += `policy_enforced: ${result.policy_enforced}\n`;
  out += `audit_ledger_written: ${result.audit_ledger_written}\n`;
  out += `projection_published: ${result.projection_published}\n`;
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