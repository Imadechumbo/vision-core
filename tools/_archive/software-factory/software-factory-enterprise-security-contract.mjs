import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ENTERPRISE_SECURITY_CONTRACT_STATUSES = [
  'ENTERPRISE_SECURITY_CONTRACT_BLOCKED_INPUT',
  'ENTERPRISE_SECURITY_CONTRACT_BLOCKED_PHASE_GATE',
  'ENTERPRISE_SECURITY_CONTRACT_DENIED',
  'ENTERPRISE_SECURITY_CONTRACT_READY',
];

const ALLOWED_SECURITY_MODES = [
  'contract-only',
  'metadata-only',
  'planning',
  'dry-run',
];

const ALLOWED_SECURITY_DOMAINS = [
  'secrets',
  'dependencies',
  'supply_chain',
  'runtime',
  'permissions',
  'audit',
  'compliance',
  'policy',
  'access_control',
];

const REQUIRED_SECURITY_DOMAINS = [
  'secrets',
  'dependencies',
  'runtime',
  'permissions',
  'audit',
  'compliance',
  'policy',
];

const BASE = {
  schema_version: 'v295.0',
  enterprise_security_contract_id: null,
  enterprise_security_contract_ready: false,
  explicit_command_received: false,
  security_mode: null,
  security_domains_count: 0,
  security_contract_hash: null,
  enterprise_security_enabled: false,
  compliance_enforced: false,
  security_scan_executed: false,
  secrets_accessed: false,
  security_policy_enforced: false,
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
    return { ...BASE, errors: ['ENTERPRISE_SECURITY_CONTRACT_BLOCKED_INPUT'] };
  }
  if (!input.enterprise_security_contract_id || typeof input.enterprise_security_contract_id !== 'string') {
    return { ...BASE, errors: ['ENTERPRISE_SECURITY_CONTRACT_BLOCKED_INPUT: missing enterprise_security_contract_id'] };
  }
  if (input.product_dashboard_policy_phase_gate_ready !== true) {
    return { ...BASE, enterprise_security_contract_id: input.enterprise_security_contract_id, errors: ['ENTERPRISE_SECURITY_CONTRACT_BLOCKED_PHASE_GATE: product_dashboard_policy_phase_gate_ready must be true'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, enterprise_security_contract_id: input.enterprise_security_contract_id, errors: ['ENTERPRISE_SECURITY_CONTRACT_BLOCKED_PHASE_GATE: missing phase_gate_id'] };
  }
  if (input.explicit_v295_command !== true) {
    return { ...BASE, enterprise_security_contract_id: input.enterprise_security_contract_id, errors: ['ENTERPRISE_SECURITY_CONTRACT_DENIED: explicit_v295_command must be true'] };
  }
  if (!input.requested_by || typeof input.requested_by !== 'string') {
    return { ...BASE, enterprise_security_contract_id: input.enterprise_security_contract_id, errors: ['ENTERPRISE_SECURITY_CONTRACT_DENIED: requested_by required'] };
  }
  if (!input.security_scope || typeof input.security_scope !== 'string') {
    return { ...BASE, enterprise_security_contract_id: input.enterprise_security_contract_id, errors: ['ENTERPRISE_SECURITY_CONTRACT_DENIED: security_scope required'] };
  }
  if (!input.security_mode || !ALLOWED_SECURITY_MODES.includes(input.security_mode)) {
    return { ...BASE, enterprise_security_contract_id: input.enterprise_security_contract_id, errors: ['ENTERPRISE_SECURITY_CONTRACT_DENIED: invalid security_mode'] };
  }
  if (!Array.isArray(input.security_domains) || input.security_domains.length === 0) {
    return { ...BASE, enterprise_security_contract_id: input.enterprise_security_contract_id, errors: ['ENTERPRISE_SECURITY_CONTRACT_DENIED: security_domains must be non-empty array'] };
  }

  const missingDomains = REQUIRED_SECURITY_DOMAINS.filter(d => !input.security_domains.includes(d));
  if (missingDomains.length > 0) {
    return {
      ...BASE,
      enterprise_security_contract_id: input.enterprise_security_contract_id,
      security_domains_count: input.security_domains.length,
      errors: ['ENTERPRISE_SECURITY_CONTRACT_DENIED: missing required security domains: ' + missingDomains.join(', ')],
    };
  }

  const escId = input.enterprise_security_contract_id;
  const securityContractHash = hash({
    escId,
    phaseGate: input.phase_gate_id,
    requestedBy: input.requested_by,
    scope: input.security_scope,
    mode: input.security_mode,
    domains: input.security_domains,
  });

  return {
    ...BASE,
    enterprise_security_contract_id: escId,
    enterprise_security_contract_ready: true,
    explicit_command_received: true,
    security_mode: input.security_mode,
    security_domains_count: input.security_domains.length,
    security_contract_hash: securityContractHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid enterprise security contract'] };
  }
  const errors = [];
  if (!result.enterprise_security_contract_id) errors.push('missing enterprise_security_contract_id');
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
  if (result.enterprise_security_enabled !== false) errors.push('enterprise_security_enabled must be false');
  if (result.compliance_enforced !== false) errors.push('compliance_enforced must be false');
  if (result.security_scan_executed !== false) errors.push('security_scan_executed must be false');
  if (result.secrets_accessed !== false) errors.push('secrets_accessed must be false');
  if (result.security_policy_enforced !== false) errors.push('security_policy_enforced must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'ENTERPRISE_SECURITY_CONTRACT_BLOCKED_INPUT';
  }
  const status = result.enterprise_security_contract_ready ? 'ENTERPRISE_SECURITY_CONTRACT_READY' :
    result.errors && result.errors.some(e => e.startsWith('ENTERPRISE_SECURITY_CONTRACT_BLOCKED_PHASE_GATE'))
      ? 'ENTERPRISE_SECURITY_CONTRACT_BLOCKED_PHASE_GATE' :
      result.errors && result.errors.some(e => e.startsWith('ENTERPRISE_SECURITY_CONTRACT_DENIED'))
        ? 'ENTERPRISE_SECURITY_CONTRACT_DENIED' : 'ENTERPRISE_SECURITY_CONTRACT_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `enterprise_security_contract_id: ${result.enterprise_security_contract_id || '(none)'}\n`;
  out += `enterprise_security_contract_ready: ${result.enterprise_security_contract_ready}\n`;
  out += `explicit_command_received: ${result.explicit_command_received}\n`;
  out += `security_mode: ${result.security_mode || '(none)'}\n`;
  out += `security_domains_count: ${result.security_domains_count}\n`;
  if (result.security_contract_hash) out += `security_contract_hash: ${result.security_contract_hash}\n`;
  out += `enterprise_security_enabled: ${result.enterprise_security_enabled}\n`;
  out += `compliance_enforced: ${result.compliance_enforced}\n`;
  out += `security_scan_executed: ${result.security_scan_executed}\n`;
  out += `secrets_accessed: ${result.secrets_accessed}\n`;
  out += `security_policy_enforced: ${result.security_policy_enforced}\n`;
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