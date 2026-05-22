import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_READINESS_GATE_STATUSES = [
  'PR_READINESS_GATE_BLOCKED_INPUT',
  'PR_READINESS_GATE_BLOCKED_CONTRACT',
  'PR_READINESS_GATE_READY',
];

const BASE = {
  schema_version: 'v216.0',
  pr_gate_id: null,
  contract_id: null,
  readiness_checks: [],
  readiness_count: 0,
  pr_ready: false,
  gate_ready: false,
  gate_hash: null,
  real_pr_creation_allowed: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

const DEFAULT_READINESS = [
  { name: 'tests_pass', status: 'pending' },
  { name: 'evidence_complete', status: 'pending' },
  { name: 'scope_clean', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PR_READINESS_GATE_BLOCKED_INPUT'] };
  }
  if (!input.pr_gate_id || typeof input.pr_gate_id !== 'string') {
    return { ...BASE, errors: ['PR_READINESS_GATE_BLOCKED_INPUT: missing pr_gate_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['PR_READINESS_GATE_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.receipt_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_READINESS_GATE_BLOCKED_CONTRACT: receipt not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_READINESS_GATE_BLOCKED_CONTRACT: scope not validated'] };
  }

  const readiness_checks = Array.isArray(input.readiness_checks) && input.readiness_checks.length > 0
    ? input.readiness_checks.map((c, i) => ({ index: i, name: typeof c === 'string' ? c : c.name, status: 'pending' }))
    : DEFAULT_READINESS.map((c, i) => ({ index: i, ...c }));

  const pgid = input.pr_gate_id;
  return {
    ...BASE,
    pr_gate_id: pgid,
    contract_id: input.contract_id,
    readiness_checks,
    readiness_count: readiness_checks.length,
    pr_ready: false,
    gate_ready: true,
    gate_hash: hash({ pgid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(gate) {
  if (!gate || !gate.pr_gate_id) {
    return { valid: false, errors: ['PR_READINESS_GATE_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (gate.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (gate.release_allowed !== false) errors.push('release_allowed must be false');
  if (gate.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (gate.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(gate) {
  if (!gate || !gate.pr_gate_id) {
    return 'PR_READINESS_GATE_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_pr_creation_allowed=false';
  }
  let out = `=== Software Factory PR Readiness Gate ===\n`;
  out += `schema_version: ${gate.schema_version}\n`;
  out += `pr_gate_id: ${gate.pr_gate_id}\n`;
  out += `contract_id: ${gate.contract_id}\n`;
  out += `readiness_count: ${gate.readiness_count}\n`;
  out += `pr_ready: ${gate.pr_ready}\n`;
  out += `gate_ready: ${gate.gate_ready}\n`;
  out += `real_pr_creation_allowed: ${gate.real_pr_creation_allowed}\n`;
  out += `release_allowed: ${gate.release_allowed}\n`;
  out += `real_execution_allowed: ${gate.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
