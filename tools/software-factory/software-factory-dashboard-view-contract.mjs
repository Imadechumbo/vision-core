import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_DASHBOARD_VIEW_CONTRACT_STATUSES = [
  'DASHBOARD_VIEW_CONTRACT_BLOCKED_INPUT',
  'DASHBOARD_VIEW_CONTRACT_BLOCKED_POLICY',
  'DASHBOARD_VIEW_CONTRACT_FAIL',
  'DASHBOARD_VIEW_CONTRACT_READY',
];

const ALLOWED_VIEW_TYPES = [
  'mission_status',
  'project_registry',
  'policy_status',
  'evidence_summary',
  'pass_gold_status',
  'audit_ledger',
  'runtime_summary',
  'dashboard_health',
];

const ALLOWED_ACCESS_MODES = [
  'read-only',
  'metadata-only',
  'no-write',
];

const REQUIRED_VIEWS = [
  'mission_status',
  'project_registry',
  'policy_status',
  'evidence_summary',
  'audit_ledger',
];

const ALLOWED_VIEW_MODES = [
  'contract-only',
  'metadata-only',
  'planning',
];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v290.0',
  dashboard_view_contract_id: null,
  dashboard_view_contract_ready: false,
  views_count: 0,
  required_views_count: 0,
  view_mode: null,
  view_contract_hash: null,
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
    return { ...BASE, errors: ['DASHBOARD_VIEW_CONTRACT_BLOCKED_INPUT'] };
  }
  if (!input.dashboard_view_contract_id || typeof input.dashboard_view_contract_id !== 'string') {
    return { ...BASE, errors: ['DASHBOARD_VIEW_CONTRACT_BLOCKED_INPUT: missing dashboard_view_contract_id'] };
  }
  if (input.policy_vault_contract_ready !== true) {
    return { ...BASE, dashboard_view_contract_id: input.dashboard_view_contract_id, errors: ['DASHBOARD_VIEW_CONTRACT_BLOCKED_POLICY: policy_vault_contract_ready must be true'] };
  }
  if (!input.policy_vault_id || typeof input.policy_vault_id !== 'string') {
    return { ...BASE, dashboard_view_contract_id: input.dashboard_view_contract_id, errors: ['DASHBOARD_VIEW_CONTRACT_BLOCKED_POLICY: missing policy_vault_id'] };
  }
  if (!input.view_mode || !ALLOWED_VIEW_MODES.includes(input.view_mode)) {
    return { ...BASE, dashboard_view_contract_id: input.dashboard_view_contract_id, errors: ['DASHBOARD_VIEW_CONTRACT_BLOCKED_POLICY: invalid view_mode'] };
  }
  if (!Array.isArray(input.views) || input.views.length === 0) {
    return { ...BASE, dashboard_view_contract_id: input.dashboard_view_contract_id, errors: ['DASHBOARD_VIEW_CONTRACT_BLOCKED_POLICY: views must be non-empty array'] };
  }

  const failErrors = [];
  for (let i = 0; i < input.views.length; i++) {
    const v = input.views[i];
    if (!v.view_id || typeof v.view_id !== 'string') {
      failErrors.push(`view ${i}: missing view_id`);
    }
    if (!v.view_type || !ALLOWED_VIEW_TYPES.includes(v.view_type)) {
      failErrors.push(`view ${i}: invalid view_type`);
    }
    if (!v.access_mode || !ALLOWED_ACCESS_MODES.includes(v.access_mode)) {
      failErrors.push(`view ${i}: invalid access_mode`);
    }
    if (!v.schema_hash || !HEX64_RE.test(v.schema_hash)) {
      failErrors.push(`view ${i}: schema_hash must be 64 hex chars`);
    }
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      dashboard_view_contract_id: input.dashboard_view_contract_id,
      errors: ['DASHBOARD_VIEW_CONTRACT_FAIL: ' + failErrors.join('; ')],
    };
  }

  const requiredViews = Array.isArray(input.required_views) ? input.required_views : REQUIRED_VIEWS;
  const missingViews = REQUIRED_VIEWS.filter(v => !requiredViews.includes(v));
  if (missingViews.length > 0) {
    return {
      ...BASE,
      dashboard_view_contract_id: input.dashboard_view_contract_id,
      views_count: input.views.length,
      errors: ['DASHBOARD_VIEW_CONTRACT_FAIL: missing required views: ' + missingViews.join(', ')],
    };
  }

  const dvcId = input.dashboard_view_contract_id;
  const viewContractHash = hash({
    dvcId,
    policy: input.policy_vault_id,
    views: input.views,
    required: requiredViews,
    mode: input.view_mode,
  });

  return {
    ...BASE,
    dashboard_view_contract_id: dvcId,
    dashboard_view_contract_ready: true,
    views_count: input.views.length,
    required_views_count: requiredViews.length,
    view_mode: input.view_mode,
    view_contract_hash: viewContractHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid dashboard view contract'] };
  }
  const errors = [];
  if (!result.dashboard_view_contract_id) errors.push('missing dashboard_view_contract_id');
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
    return 'DASHBOARD_VIEW_CONTRACT_BLOCKED_INPUT';
  }
  const status = result.dashboard_view_contract_ready ? 'DASHBOARD_VIEW_CONTRACT_READY' :
    result.errors && result.errors.some(e => e.startsWith('DASHBOARD_VIEW_CONTRACT_BLOCKED_POLICY'))
      ? 'DASHBOARD_VIEW_CONTRACT_BLOCKED_POLICY' :
      result.errors && result.errors.some(e => e.startsWith('DASHBOARD_VIEW_CONTRACT_FAIL'))
        ? 'DASHBOARD_VIEW_CONTRACT_FAIL' : 'DASHBOARD_VIEW_CONTRACT_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `dashboard_view_contract_id: ${result.dashboard_view_contract_id || '(none)'}\n`;
  out += `dashboard_view_contract_ready: ${result.dashboard_view_contract_ready}\n`;
  out += `views_count: ${result.views_count}\n`;
  out += `required_views_count: ${result.required_views_count}\n`;
  out += `view_mode: ${result.view_mode || '(none)'}\n`;
  if (result.view_contract_hash) out += `view_contract_hash: ${result.view_contract_hash}\n`;
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