import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCT_DASHBOARD_POLICY_PHASE_GATE_STATUSES = [
  'PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_INPUT',
  'PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_PROJECTION',
  'PRODUCT_DASHBOARD_POLICY_PHASE_GATE_INCOMPLETE',
  'PRODUCT_DASHBOARD_POLICY_PHASE_GATE_READY',
];

const REQUIRED_MODULE_IDS = [
  'product_dashboard_contract',
  'product_dashboard_data_model',
  'multi_project_registry_contract',
  'project_context_isolation_gate',
  'policy_vault_contract',
  'dashboard_view_contract',
  'project_policy_binding_contract',
  'product_audit_ledger_contract',
  'dashboard_evidence_projection',
];

const FINAL_MESSAGE = 'V285-V294 product dashboard, multi-project, and policy complete. Dashboard, policy enforcement, and production operations remain blocked until explicit V295 enterprise security command.';

const BASE = {
  schema_version: 'v294.0',
  phase_gate_id: null,
  product_dashboard_policy_phase_gate_ready: false,
  modules_verified: [],
  all_modules_present: false,
  phase_passed: false,
  final_message: FINAL_MESSAGE,
  phase_gate_hash: null,
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
    return { ...BASE, errors: ['PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_INPUT'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, errors: ['PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  }
  if (input.dashboard_evidence_projection_ready !== true) {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_PROJECTION: dashboard_evidence_projection_ready must be true'] };
  }
  if (!input.evidence_projection_id || typeof input.evidence_projection_id !== 'string') {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_PROJECTION: missing evidence_projection_id'] };
  }
  if (!input.phase_summary || typeof input.phase_summary !== 'string') {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_PROJECTION: phase_summary required'] };
  }

  const ids = input.ids || {};
  const modulesVerified = [];
  const missingModules = [];

  for (const key of REQUIRED_MODULE_IDS) {
    if (ids[key] && typeof ids[key] === 'string') {
      modulesVerified.push(key);
    } else {
      missingModules.push(key);
    }
  }

  if (missingModules.length > 0) {
    return {
      ...BASE,
      phase_gate_id: input.phase_gate_id,
      modules_verified: modulesVerified,
      all_modules_present: false,
      errors: ['PRODUCT_DASHBOARD_POLICY_PHASE_GATE_INCOMPLETE: missing modules: ' + missingModules.join(', ')],
    };
  }

  const pgId = input.phase_gate_id;
  const phaseGateHash = hash({
    pgId,
    projection: input.evidence_projection_id,
    ids,
    summary: input.phase_summary,
  });

  return {
    ...BASE,
    phase_gate_id: pgId,
    product_dashboard_policy_phase_gate_ready: true,
    modules_verified: modulesVerified,
    all_modules_present: true,
    phase_passed: false,
    final_message: FINAL_MESSAGE,
    phase_gate_hash: phaseGateHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid product dashboard policy phase gate'] };
  }
  const errors = [];
  if (!result.phase_gate_id) errors.push('missing phase_gate_id');
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
    return 'PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_INPUT';
  }
  const status = result.product_dashboard_policy_phase_gate_ready ? 'PRODUCT_DASHBOARD_POLICY_PHASE_GATE_READY' :
    result.errors && result.errors.some(e => e.startsWith('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_PROJECTION'))
      ? 'PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_PROJECTION' :
      result.errors && result.errors.some(e => e.startsWith('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_INCOMPLETE'))
        ? 'PRODUCT_DASHBOARD_POLICY_PHASE_GATE_INCOMPLETE' :
        'PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `phase_gate_id: ${result.phase_gate_id || '(none)'}\n`;
  out += `product_dashboard_policy_phase_gate_ready: ${result.product_dashboard_policy_phase_gate_ready}\n`;
  out += `modules_verified: ${result.modules_verified.join(', ') || '(none)'}\n`;
  out += `all_modules_present: ${result.all_modules_present}\n`;
  out += `phase_passed: ${result.phase_passed}\n`;
  out += `final_message: ${result.final_message || '(none)'}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
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