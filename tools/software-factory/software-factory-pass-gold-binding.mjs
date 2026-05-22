import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PASS_GOLD_BINDING_STATUSES = [
  'PASS_GOLD_BINDING_BLOCKED_INPUT',
  'PASS_GOLD_BINDING_BLOCKED_CONTRACT',
  'PASS_GOLD_BINDING_READY',
];

const BASE = {
  schema_version: 'v222.0',
  binding_id: null,
  contract_id: null,
  binding_conditions: [],
  condition_count: 0,
  pass_gold_achieved: false,
  binding_ready: false,
  binding_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

const DEFAULT_CONDITIONS = [
  { name: 'all_tests_pass', required: true, status: 'pending' },
  { name: 'security_review_pass', required: true, status: 'pending' },
  { name: 'scope_clean', required: true, status: 'pending' },
  { name: 'no_forbidden_flags', required: true, status: 'pending' },
  { name: 'evidence_complete', required: true, status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PASS_GOLD_BINDING_BLOCKED_INPUT'] };
  }
  if (!input.binding_id || typeof input.binding_id !== 'string') {
    return { ...BASE, errors: ['PASS_GOLD_BINDING_BLOCKED_INPUT: missing binding_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['PASS_GOLD_BINDING_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.review_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PASS_GOLD_BINDING_BLOCKED_CONTRACT: review not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PASS_GOLD_BINDING_BLOCKED_CONTRACT: scope not validated'] };
  }

  const binding_conditions = Array.isArray(input.binding_conditions) && input.binding_conditions.length > 0
    ? input.binding_conditions.map((c, i) => ({ index: i, name: typeof c === 'string' ? c : c.name, required: true, status: 'pending' }))
    : DEFAULT_CONDITIONS.map((c, i) => ({ index: i, ...c }));

  const bid = input.binding_id;
  return {
    ...BASE,
    binding_id: bid,
    contract_id: input.contract_id,
    binding_conditions,
    condition_count: binding_conditions.length,
    pass_gold_achieved: false,
    binding_ready: true,
    binding_hash: hash({ bid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(binding) {
  if (!binding || !binding.binding_id) {
    return { valid: false, errors: ['PASS_GOLD_BINDING_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (binding.pass_gold_achieved !== false) errors.push('pass_gold_achieved must be false by default');
  if (binding.release_allowed !== false) errors.push('release_allowed must be false');
  if (binding.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (binding.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(binding) {
  if (!binding || !binding.binding_id) {
    return 'PASS_GOLD_BINDING_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false pass_gold_achieved=false';
  }
  let out = `=== Software Factory PASS GOLD Binding ===\n`;
  out += `schema_version: ${binding.schema_version}\n`;
  out += `binding_id: ${binding.binding_id}\n`;
  out += `contract_id: ${binding.contract_id}\n`;
  out += `condition_count: ${binding.condition_count}\n`;
  out += `pass_gold_achieved: ${binding.pass_gold_achieved}\n`;
  out += `binding_ready: ${binding.binding_ready}\n`;
  out += `release_allowed: ${binding.release_allowed}\n`;
  out += `deploy_allowed: ${binding.deploy_allowed}\n`;
  out += `real_execution_allowed: ${binding.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
