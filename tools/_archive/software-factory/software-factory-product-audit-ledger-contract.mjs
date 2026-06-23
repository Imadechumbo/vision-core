import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCT_AUDIT_LEDGER_STATUSES = [
  'PRODUCT_AUDIT_LEDGER_BLOCKED_INPUT',
  'PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING',
  'PRODUCT_AUDIT_LEDGER_FAIL',
  'PRODUCT_AUDIT_LEDGER_READY',
];

const ALLOWED_ENTRY_TYPES = [
  'dashboard_contract',
  'data_model',
  'project_registry',
  'context_isolation',
  'policy_vault',
  'dashboard_view',
  'policy_binding',
  'runtime_gate',
  'evidence',
  'audit',
];

const ALLOWED_SEVERITIES = [
  'info',
  'warning',
  'blocking',
  'critical',
];

const REQUIRED_ENTRY_TYPES = [
  'dashboard_contract',
  'data_model',
  'project_registry',
  'policy_vault',
  'dashboard_view',
  'policy_binding',
  'runtime_gate',
  'evidence',
];

const ALLOWED_LEDGER_MODES = [
  'contract-only',
  'metadata-only',
  'planning',
];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v292.0',
  audit_ledger_id: null,
  product_audit_ledger_contract_ready: false,
  ledger_entries_count: 0,
  required_entry_types_count: 0,
  ledger_mode: null,
  audit_ledger_hash: null,
  audit_ledger_written: false,
  dashboard_enabled: false,
  dashboard_deployed: false,
  multi_project_enabled: false,
  policy_enforced: false,
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
    return { ...BASE, errors: ['PRODUCT_AUDIT_LEDGER_BLOCKED_INPUT'] };
  }
  if (!input.audit_ledger_id || typeof input.audit_ledger_id !== 'string') {
    return { ...BASE, errors: ['PRODUCT_AUDIT_LEDGER_BLOCKED_INPUT: missing audit_ledger_id'] };
  }
  if (input.project_policy_binding_contract_ready !== true) {
    return { ...BASE, audit_ledger_id: input.audit_ledger_id, errors: ['PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING: project_policy_binding_contract_ready must be true'] };
  }
  if (!input.policy_binding_id || typeof input.policy_binding_id !== 'string') {
    return { ...BASE, audit_ledger_id: input.audit_ledger_id, errors: ['PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING: missing policy_binding_id'] };
  }
  if (!input.ledger_mode || !ALLOWED_LEDGER_MODES.includes(input.ledger_mode)) {
    return { ...BASE, audit_ledger_id: input.audit_ledger_id, errors: ['PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING: invalid ledger_mode'] };
  }
  if (!Array.isArray(input.ledger_entries) || input.ledger_entries.length === 0) {
    return { ...BASE, audit_ledger_id: input.audit_ledger_id, errors: ['PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING: ledger_entries must be non-empty array'] };
  }

  const failErrors = [];
  for (let i = 0; i < input.ledger_entries.length; i++) {
    const e = input.ledger_entries[i];
    if (!e.entry_id || typeof e.entry_id !== 'string') {
      failErrors.push(`entry ${i}: missing entry_id`);
    }
    if (!e.entry_type || !ALLOWED_ENTRY_TYPES.includes(e.entry_type)) {
      failErrors.push(`entry ${i}: invalid entry_type`);
    }
    if (!e.severity || !ALLOWED_SEVERITIES.includes(e.severity)) {
      failErrors.push(`entry ${i}: invalid severity`);
    }
    if (!e.entry_hash || !HEX64_RE.test(e.entry_hash)) {
      failErrors.push(`entry ${i}: entry_hash must be 64 hex chars`);
    }
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      audit_ledger_id: input.audit_ledger_id,
      errors: ['PRODUCT_AUDIT_LEDGER_FAIL: ' + failErrors.join('; ')],
    };
  }

  const requiredTypes = Array.isArray(input.required_entry_types) ? input.required_entry_types : REQUIRED_ENTRY_TYPES;
  const missingTypes = REQUIRED_ENTRY_TYPES.filter(t => !requiredTypes.includes(t));
  if (missingTypes.length > 0) {
    return {
      ...BASE,
      audit_ledger_id: input.audit_ledger_id,
      ledger_entries_count: input.ledger_entries.length,
      errors: ['PRODUCT_AUDIT_LEDGER_FAIL: missing required entry types: ' + missingTypes.join(', ')],
    };
  }

  const alId = input.audit_ledger_id;
  const auditLedgerHash = hash({
    alId,
    binding: input.policy_binding_id,
    entries: input.ledger_entries,
    required: requiredTypes,
    mode: input.ledger_mode,
  });

  return {
    ...BASE,
    audit_ledger_id: alId,
    product_audit_ledger_contract_ready: true,
    ledger_entries_count: input.ledger_entries.length,
    required_entry_types_count: requiredTypes.length,
    ledger_mode: input.ledger_mode,
    audit_ledger_hash: auditLedgerHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid product audit ledger contract'] };
  }
  const errors = [];
  if (!result.audit_ledger_id) errors.push('missing audit_ledger_id');
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
    return 'PRODUCT_AUDIT_LEDGER_BLOCKED_INPUT';
  }
  const status = result.product_audit_ledger_contract_ready ? 'PRODUCT_AUDIT_LEDGER_READY' :
    result.errors && result.errors.some(e => e.startsWith('PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING'))
      ? 'PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING' :
      result.errors && result.errors.some(e => e.startsWith('PRODUCT_AUDIT_LEDGER_FAIL'))
        ? 'PRODUCT_AUDIT_LEDGER_FAIL' : 'PRODUCT_AUDIT_LEDGER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `audit_ledger_id: ${result.audit_ledger_id || '(none)'}\n`;
  out += `product_audit_ledger_contract_ready: ${result.product_audit_ledger_contract_ready}\n`;
  out += `ledger_entries_count: ${result.ledger_entries_count}\n`;
  out += `required_entry_types_count: ${result.required_entry_types_count}\n`;
  out += `ledger_mode: ${result.ledger_mode || '(none)'}\n`;
  if (result.audit_ledger_hash) out += `audit_ledger_hash: ${result.audit_ledger_hash}\n`;
  out += `audit_ledger_written: ${result.audit_ledger_written}\n`;
  out += `dashboard_enabled: ${result.dashboard_enabled}\n`;
  out += `dashboard_deployed: ${result.dashboard_deployed}\n`;
  out += `multi_project_enabled: ${result.multi_project_enabled}\n`;
  out += `policy_enforced: ${result.policy_enforced}\n`;
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