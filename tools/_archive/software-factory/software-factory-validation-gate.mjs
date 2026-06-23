import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_VALIDATION_GATE_STATUSES = [
  'VALIDATION_GATE_BLOCKED_INPUT',
  'VALIDATION_GATE_BLOCKED_CONTRACT',
  'VALIDATION_GATE_READY',
];

const BASE = {
  schema_version: 'v214.0',
  gate_id: null,
  contract_id: null,
  checks: [],
  check_count: 0,
  gate_passed: false,
  gate_ready: false,
  gate_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

const DEFAULT_CHECKS = [
  { name: 'scope_check', status: 'pending' },
  { name: 'syntax_check', status: 'pending' },
  { name: 'test_check', status: 'pending' },
  { name: 'governance_check', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['VALIDATION_GATE_BLOCKED_INPUT'] };
  }
  if (!input.gate_id || typeof input.gate_id !== 'string') {
    return { ...BASE, errors: ['VALIDATION_GATE_BLOCKED_INPUT: missing gate_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['VALIDATION_GATE_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.controller_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['VALIDATION_GATE_BLOCKED_CONTRACT: controller not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['VALIDATION_GATE_BLOCKED_CONTRACT: scope not validated'] };
  }

  const checks = Array.isArray(input.checks) && input.checks.length > 0
    ? input.checks.map((c, i) => ({ index: i, name: typeof c === 'string' ? c : c.name, status: 'pending' }))
    : DEFAULT_CHECKS.map((c, i) => ({ index: i, ...c }));

  const gid = input.gate_id;
  return {
    ...BASE,
    gate_id: gid,
    contract_id: input.contract_id,
    checks,
    check_count: checks.length,
    gate_passed: false,
    gate_ready: true,
    gate_hash: hash({ gid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(gate) {
  if (!gate || !gate.gate_id) {
    return { valid: false, errors: ['VALIDATION_GATE_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (gate.release_allowed !== false) errors.push('release_allowed must be false');
  if (gate.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (gate.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(gate) {
  if (!gate || !gate.gate_id) {
    return 'VALIDATION_GATE_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory Validation Gate ===\n`;
  out += `schema_version: ${gate.schema_version}\n`;
  out += `gate_id: ${gate.gate_id}\n`;
  out += `contract_id: ${gate.contract_id}\n`;
  out += `check_count: ${gate.check_count}\n`;
  out += `gate_passed: ${gate.gate_passed}\n`;
  out += `gate_ready: ${gate.gate_ready}\n`;
  out += `release_allowed: ${gate.release_allowed}\n`;
  out += `deploy_allowed: ${gate.deploy_allowed}\n`;
  out += `real_execution_allowed: ${gate.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
