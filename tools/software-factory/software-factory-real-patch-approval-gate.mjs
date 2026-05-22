import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_APPROVAL_GATE_STATUSES = [
  'REAL_PATCH_APPROVAL_BLOCKED_INPUT',
  'REAL_PATCH_APPROVAL_BLOCKED_CONTRACT',
  'REAL_PATCH_APPROVAL_READY',
];

const BASE = {
  schema_version: 'v230.0',
  gate_id: null,
  contract_id: null,
  review_id: null,
  approval_conditions: [],
  condition_count: 0,
  gate_ready: false,
  approval_granted: false,
  gate_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

const DEFAULT_CONDITIONS = [
  { index: 0, condition: 'sandbox_security_review_passed', status: 'pending' },
  { index: 1, condition: 'all_sandbox_tests_pass', status: 'pending' },
  { index: 2, condition: 'governance_flags_invariant_confirmed', status: 'pending' },
  { index: 3, condition: 'scope_confined_to_allowed_paths', status: 'pending' },
  { index: 4, condition: 'no_production_touch_confirmed', status: 'pending' },
  { index: 5, condition: 'explicit_human_approval_required', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PATCH_APPROVAL_BLOCKED_INPUT'] };
  }
  if (!input.gate_id || typeof input.gate_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_APPROVAL_BLOCKED_INPUT: missing gate_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_APPROVAL_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.review_id || typeof input.review_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_APPROVAL_BLOCKED_INPUT: missing review_id'] };
  }
  if (!input.review_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['REAL_PATCH_APPROVAL_BLOCKED_CONTRACT: review not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['REAL_PATCH_APPROVAL_BLOCKED_CONTRACT: scope not validated'] };
  }

  const rawConds = Array.isArray(input.approval_conditions) && input.approval_conditions.length > 0 ? input.approval_conditions : DEFAULT_CONDITIONS;
  const approval_conditions = rawConds.map((c, i) => ({
    index: i,
    condition: typeof c === 'string' ? c : (c.condition || `condition_${i}`),
    status: 'pending',
  }));

  const gid = input.gate_id;
  return {
    ...BASE,
    gate_id: gid,
    contract_id: input.contract_id,
    review_id: input.review_id,
    approval_conditions,
    condition_count: approval_conditions.length,
    gate_ready: true,
    approval_granted: false,
    gate_hash: hash({ gid, contract_id: input.contract_id, review_id: input.review_id }),
    errors: [],
  };
}

export function validate(gate) {
  if (!gate || !gate.gate_id) {
    return { valid: false, errors: ['REAL_PATCH_APPROVAL_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (gate.approval_granted !== false) errors.push('approval_granted must be false by default');
  if (gate.release_allowed !== false) errors.push('release_allowed must be false');
  if (gate.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (gate.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (gate.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (gate.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (gate.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (gate.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(gate) {
  if (!gate || !gate.gate_id) {
    return 'REAL_PATCH_APPROVAL_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_patch_execution_allowed=false production_touched=false';
  }
  let out = `=== Software Factory Real Patch Approval Gate ===\n`;
  out += `schema_version: ${gate.schema_version}\n`;
  out += `gate_id: ${gate.gate_id}\n`;
  out += `contract_id: ${gate.contract_id}\n`;
  out += `review_id: ${gate.review_id}\n`;
  out += `condition_count: ${gate.condition_count}\n`;
  out += `gate_ready: ${gate.gate_ready}\n`;
  out += `approval_granted: ${gate.approval_granted}\n`;
  out += `release_allowed: ${gate.release_allowed}\n`;
  out += `deploy_allowed: ${gate.deploy_allowed}\n`;
  out += `real_execution_allowed: ${gate.real_execution_allowed}\n`;
  out += `real_patch_execution_allowed: ${gate.real_patch_execution_allowed}\n`;
  out += `production_touched: ${gate.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
