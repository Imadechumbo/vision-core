import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SECURITY_REVIEW_STATUSES = [
  'SECURITY_REVIEW_BLOCKED_INPUT',
  'SECURITY_REVIEW_BLOCKED_CONTRACT',
  'SECURITY_REVIEW_READY',
];

const BASE = {
  schema_version: 'v221.0',
  review_id: null,
  contract_id: null,
  security_checks: [],
  check_count: 0,
  review_passed: false,
  review_ready: false,
  review_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

const DEFAULT_SECURITY_CHECKS = [
  { name: 'no_forbidden_flags', status: 'pending' },
  { name: 'scope_boundary_check', status: 'pending' },
  { name: 'no_real_execution', status: 'pending' },
  { name: 'no_deploy_allowed', status: 'pending' },
  { name: 'no_release_allowed', status: 'pending' },
  { name: 'no_stable_allowed', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['SECURITY_REVIEW_BLOCKED_INPUT'] };
  }
  if (!input.review_id || typeof input.review_id !== 'string') {
    return { ...BASE, errors: ['SECURITY_REVIEW_BLOCKED_INPUT: missing review_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['SECURITY_REVIEW_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.ledger_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SECURITY_REVIEW_BLOCKED_CONTRACT: ledger not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SECURITY_REVIEW_BLOCKED_CONTRACT: scope not validated'] };
  }

  const security_checks = Array.isArray(input.security_checks) && input.security_checks.length > 0
    ? input.security_checks.map((c, i) => ({ index: i, name: typeof c === 'string' ? c : c.name, status: 'pending' }))
    : DEFAULT_SECURITY_CHECKS.map((c, i) => ({ index: i, ...c }));

  const rid = input.review_id;
  return {
    ...BASE,
    review_id: rid,
    contract_id: input.contract_id,
    security_checks,
    check_count: security_checks.length,
    review_passed: false,
    review_ready: true,
    review_hash: hash({ rid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(review) {
  if (!review || !review.review_id) {
    return { valid: false, errors: ['SECURITY_REVIEW_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (review.release_allowed !== false) errors.push('release_allowed must be false');
  if (review.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (review.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (review.review_passed !== false) errors.push('review_passed must be false by default');
  return { valid: errors.length === 0, errors };
}

export function render(review) {
  if (!review || !review.review_id) {
    return 'SECURITY_REVIEW_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory Security Review ===\n`;
  out += `schema_version: ${review.schema_version}\n`;
  out += `review_id: ${review.review_id}\n`;
  out += `contract_id: ${review.contract_id}\n`;
  out += `check_count: ${review.check_count}\n`;
  out += `review_passed: ${review.review_passed}\n`;
  out += `review_ready: ${review.review_ready}\n`;
  out += `release_allowed: ${review.release_allowed}\n`;
  out += `deploy_allowed: ${review.deploy_allowed}\n`;
  out += `real_execution_allowed: ${review.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
