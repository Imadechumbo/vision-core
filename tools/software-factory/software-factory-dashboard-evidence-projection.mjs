import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_DASHBOARD_EVIDENCE_PROJECTION_STATUSES = [
  'DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_INPUT',
  'DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER',
  'DASHBOARD_EVIDENCE_PROJECTION_FAIL',
  'DASHBOARD_EVIDENCE_PROJECTION_READY',
];

const ALLOWED_EVIDENCE_TYPES = [
  'runtime_gate',
  'policy_vault',
  'audit_ledger',
  'project_registry',
  'dashboard_view',
  'policy_binding',
  'pass_gold_status',
  'evidence_receipt',
  'validation_report',
];

const ALLOWED_PROJECTION_MODES = [
  'read-only',
  'metadata-only',
  'planning',
];

const REQUIRED_EVIDENCE_TYPES = [
  'runtime_gate',
  'policy_vault',
  'audit_ledger',
  'dashboard_view',
  'policy_binding',
  'evidence_receipt',
];

const ALLOWED_PROJECTION_LEVELS = [
  'contract-only',
  'metadata-only',
  'planning',
];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v293.0',
  evidence_projection_id: null,
  dashboard_evidence_projection_ready: false,
  projected_evidence_count: 0,
  required_evidence_types_count: 0,
  projection_level: null,
  projection_hash: null,
  audit_ledger_written: false,
  projection_published: false,
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
    return { ...BASE, errors: ['DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_INPUT'] };
  }
  if (!input.evidence_projection_id || typeof input.evidence_projection_id !== 'string') {
    return { ...BASE, errors: ['DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_INPUT: missing evidence_projection_id'] };
  }
  if (input.product_audit_ledger_contract_ready !== true) {
    return { ...BASE, evidence_projection_id: input.evidence_projection_id, errors: ['DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER: product_audit_ledger_contract_ready must be true'] };
  }
  if (!input.audit_ledger_id || typeof input.audit_ledger_id !== 'string') {
    return { ...BASE, evidence_projection_id: input.evidence_projection_id, errors: ['DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER: missing audit_ledger_id'] };
  }
  if (!input.projection_level || !ALLOWED_PROJECTION_LEVELS.includes(input.projection_level)) {
    return { ...BASE, evidence_projection_id: input.evidence_projection_id, errors: ['DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER: invalid projection_level'] };
  }
  if (!Array.isArray(input.projected_evidence) || input.projected_evidence.length === 0) {
    return { ...BASE, evidence_projection_id: input.evidence_projection_id, errors: ['DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER: projected_evidence must be non-empty array'] };
  }

  const failErrors = [];
  for (let i = 0; i < input.projected_evidence.length; i++) {
    const e = input.projected_evidence[i];
    if (!e.evidence_id || typeof e.evidence_id !== 'string') {
      failErrors.push(`evidence ${i}: missing evidence_id`);
    }
    if (!e.evidence_type || !ALLOWED_EVIDENCE_TYPES.includes(e.evidence_type)) {
      failErrors.push(`evidence ${i}: invalid evidence_type`);
    }
    if (!e.projection_mode || !ALLOWED_PROJECTION_MODES.includes(e.projection_mode)) {
      failErrors.push(`evidence ${i}: invalid projection_mode`);
    }
    if (!e.evidence_hash || !HEX64_RE.test(e.evidence_hash)) {
      failErrors.push(`evidence ${i}: evidence_hash must be 64 hex chars`);
    }
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      evidence_projection_id: input.evidence_projection_id,
      errors: ['DASHBOARD_EVIDENCE_PROJECTION_FAIL: ' + failErrors.join('; ')],
    };
  }

  const requiredTypes = Array.isArray(input.required_evidence_types) ? input.required_evidence_types : REQUIRED_EVIDENCE_TYPES;
  const missingTypes = REQUIRED_EVIDENCE_TYPES.filter(t => !requiredTypes.includes(t));
  if (missingTypes.length > 0) {
    return {
      ...BASE,
      evidence_projection_id: input.evidence_projection_id,
      projected_evidence_count: input.projected_evidence.length,
      errors: ['DASHBOARD_EVIDENCE_PROJECTION_FAIL: missing required evidence types: ' + missingTypes.join(', ')],
    };
  }

  const epId = input.evidence_projection_id;
  const projectionHash = hash({
    epId,
    ledger: input.audit_ledger_id,
    evidence: input.projected_evidence,
    required: requiredTypes,
    level: input.projection_level,
  });

  return {
    ...BASE,
    evidence_projection_id: epId,
    dashboard_evidence_projection_ready: true,
    projected_evidence_count: input.projected_evidence.length,
    required_evidence_types_count: requiredTypes.length,
    projection_level: input.projection_level,
    projection_hash: projectionHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid dashboard evidence projection'] };
  }
  const errors = [];
  if (!result.evidence_projection_id) errors.push('missing evidence_projection_id');
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
    return 'DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_INPUT';
  }
  const status = result.dashboard_evidence_projection_ready ? 'DASHBOARD_EVIDENCE_PROJECTION_READY' :
    result.errors && result.errors.some(e => e.startsWith('DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER'))
      ? 'DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER' :
      result.errors && result.errors.some(e => e.startsWith('DASHBOARD_EVIDENCE_PROJECTION_FAIL'))
        ? 'DASHBOARD_EVIDENCE_PROJECTION_FAIL' : 'DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `evidence_projection_id: ${result.evidence_projection_id || '(none)'}\n`;
  out += `dashboard_evidence_projection_ready: ${result.dashboard_evidence_projection_ready}\n`;
  out += `projected_evidence_count: ${result.projected_evidence_count}\n`;
  out += `required_evidence_types_count: ${result.required_evidence_types_count}\n`;
  out += `projection_level: ${result.projection_level || '(none)'}\n`;
  if (result.projection_hash) out += `projection_hash: ${result.projection_hash}\n`;
  out += `audit_ledger_written: ${result.audit_ledger_written}\n`;
  out += `projection_published: ${result.projection_published}\n`;
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