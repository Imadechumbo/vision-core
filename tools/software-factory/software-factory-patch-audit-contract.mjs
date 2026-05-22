import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PATCH_AUDIT_CONTRACT_STATUSES = [
  'PATCH_AUDIT_BLOCKED_INPUT',
  'PATCH_AUDIT_BLOCKED_CONTRACT',
  'PATCH_AUDIT_READY',
];

const FORBIDDEN_PATHS = [
  '.env',
  'secrets',
  '.github/workflows',
  'deploy',
];

const BASE = {
  schema_version: 'v225.0',
  audit_id: null,
  contract_id: null,
  controller_id: null,
  changes_count: 0,
  all_rationales_provided: false,
  patch_audit_ready: false,
  audit_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function hasForbiddenPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  for (const fp of FORBIDDEN_PATHS) {
    if (filePath.includes(fp)) return true;
  }
  return false;
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PATCH_AUDIT_BLOCKED_INPUT'] };
  }
  if (!input.audit_id || typeof input.audit_id !== 'string') {
    return { ...BASE, errors: ['PATCH_AUDIT_BLOCKED_INPUT: missing audit_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['PATCH_AUDIT_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.controller_id || typeof input.controller_id !== 'string') {
    return { ...BASE, errors: ['PATCH_AUDIT_BLOCKED_INPUT: missing controller_id'] };
  }
  if (input.software_factory_phase_gate_ready !== true) {
    return { ...BASE, audit_id: input.audit_id, contract_id: input.contract_id, controller_id: input.controller_id, errors: ['PATCH_AUDIT_BLOCKED_CONTRACT: software_factory_phase_gate_ready must be true'] };
  }
  if (input.patch_controller_ready !== true) {
    return { ...BASE, audit_id: input.audit_id, contract_id: input.contract_id, controller_id: input.controller_id, errors: ['PATCH_AUDIT_BLOCKED_CONTRACT: patch_controller_ready must be true'] };
  }
  if (!Array.isArray(input.changes_summary) || input.changes_summary.length === 0) {
    return { ...BASE, audit_id: input.audit_id, contract_id: input.contract_id, controller_id: input.controller_id, errors: ['PATCH_AUDIT_BLOCKED_INPUT: changes_summary must be a non-empty array'] };
  }

  const changes = [];
  const changeErrors = [];

  for (let i = 0; i < input.changes_summary.length; i++) {
    const c = input.changes_summary[i];
    if (!c || typeof c !== 'object') {
      changeErrors.push(`changes_summary[${i}]: invalid change object`);
      continue;
    }
    if (!c.file_path || typeof c.file_path !== 'string') {
      changeErrors.push(`changes_summary[${i}]: missing file_path`);
      continue;
    }
    if (!c.change_type || typeof c.change_type !== 'string') {
      changeErrors.push(`changes_summary[${i}]: missing change_type`);
      continue;
    }
    if (!c.rationale || typeof c.rationale !== 'string') {
      changeErrors.push(`changes_summary[${i}]: missing rationale`);
      continue;
    }
    if (hasForbiddenPath(c.file_path)) {
      changeErrors.push(`changes_summary[${i}]: forbidden file path ${c.file_path}`);
      continue;
    }
    changes.push({ file_path: c.file_path, change_type: c.change_type, rationale: c.rationale });
  }

  if (changeErrors.length > 0) {
    return {
      ...BASE, audit_id: input.audit_id, contract_id: input.contract_id,
      controller_id: input.controller_id, changes_count: changes.length,
      errors: ['PATCH_AUDIT_BLOCKED_INPUT: change validation failed', ...changeErrors],
    };
  }

  const allRationales = changes.every(c => c.rationale && c.rationale.length > 0);

  const result = {
    schema_version: 'v225.0',
    audit_id: input.audit_id,
    contract_id: input.contract_id,
    controller_id: input.controller_id,
    changes_count: changes.length,
    all_rationales_provided: allRationales,
    patch_audit_ready: true,
    audit_hash: hash({ audit_id: input.audit_id, changes }),
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    real_execution_allowed: false,
    real_patch_execution_allowed: false,
    production_touched: false,
    errors: [],
  };

  return result;
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid patch audit contract'] };
  }
  const errors = [];
  if (!result.audit_id) errors.push('missing audit_id');
  if (!result.contract_id) errors.push('missing contract_id');
  if (!result.controller_id) errors.push('missing controller_id');
  if (typeof result.patch_audit_ready !== 'boolean') errors.push('patch_audit_ready must be boolean');
  if (result.patch_audit_ready && !result.audit_hash) errors.push('audit_hash required when ready');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'PATCH_AUDIT_BLOCKED_INPUT';
  }
  const status = result.patch_audit_ready ? 'PATCH_AUDIT_READY' :
    result.errors && result.errors.some(e => e.startsWith('PATCH_AUDIT_BLOCKED_CONTRACT'))
      ? 'PATCH_AUDIT_BLOCKED_CONTRACT' : 'PATCH_AUDIT_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `audit_id: ${result.audit_id || '(none)'}\n`;
  out += `contract_id: ${result.contract_id || '(none)'}\n`;
  out += `controller_id: ${result.controller_id || '(none)'}\n`;
  out += `changes_count: ${result.changes_count || 0}\n`;
  out += `all_rationales_provided: ${result.all_rationales_provided}\n`;
  out += `patch_audit_ready: ${result.patch_audit_ready}\n`;
  if (result.audit_hash) out += `audit_hash: ${result.audit_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_patch_execution_allowed: ${result.real_patch_execution_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
