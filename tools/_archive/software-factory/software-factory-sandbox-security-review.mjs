import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SANDBOX_SECURITY_REVIEW_STATUSES = [
  'SANDBOX_SECURITY_BLOCKED_INPUT',
  'SANDBOX_SECURITY_BLOCKED_CONTRACT',
  'SANDBOX_SECURITY_READY',
];

const BASE = {
  schema_version: 'v229.0',
  review_id: null,
  contract_id: null,
  lane_id: null,
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
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

const DEFAULT_SECURITY_CHECKS = [
  { index: 0, check: 'no_forbidden_paths', mode: 'sandbox', status: 'pending' },
  { index: 1, check: 'no_real_execution_flags', mode: 'sandbox', status: 'pending' },
  { index: 2, check: 'no_production_touch', mode: 'sandbox', status: 'pending' },
  { index: 3, check: 'governance_flags_invariant', mode: 'sandbox', status: 'pending' },
  { index: 4, check: 'regra_absoluta_present', mode: 'sandbox', status: 'pending' },
  { index: 5, check: 'sandbox_scope_confined', mode: 'sandbox', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['SANDBOX_SECURITY_BLOCKED_INPUT'] };
  }
  if (!input.review_id || typeof input.review_id !== 'string') {
    return { ...BASE, errors: ['SANDBOX_SECURITY_BLOCKED_INPUT: missing review_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['SANDBOX_SECURITY_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.lane_id || typeof input.lane_id !== 'string') {
    return { ...BASE, errors: ['SANDBOX_SECURITY_BLOCKED_INPUT: missing lane_id'] };
  }
  if (!input.lane_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SANDBOX_SECURITY_BLOCKED_CONTRACT: lane not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SANDBOX_SECURITY_BLOCKED_CONTRACT: scope not validated'] };
  }

  const rawChecks = Array.isArray(input.security_checks) && input.security_checks.length > 0 ? input.security_checks : DEFAULT_SECURITY_CHECKS;
  const security_checks = rawChecks.map((c, i) => ({
    index: i,
    check: typeof c === 'string' ? c : (c.check || `check_${i}`),
    mode: c.mode || 'sandbox',
    status: 'pending',
  }));

  const rid = input.review_id;
  return {
    ...BASE,
    review_id: rid,
    contract_id: input.contract_id,
    lane_id: input.lane_id,
    security_checks,
    check_count: security_checks.length,
    review_passed: false,
    review_ready: true,
    review_hash: hash({ rid, contract_id: input.contract_id, lane_id: input.lane_id }),
    errors: [],
  };
}

export function validate(review) {
  if (!review || !review.review_id) {
    return { valid: false, errors: ['SANDBOX_SECURITY_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (review.review_passed !== false) errors.push('review_passed must be false by default');
  if (review.release_allowed !== false) errors.push('release_allowed must be false');
  if (review.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (review.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (review.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (review.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (review.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (review.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(review) {
  if (!review || !review.review_id) {
    return 'SANDBOX_SECURITY_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_patch_execution_allowed=false production_touched=false';
  }
  let out = `=== Software Factory Sandbox Security Review ===\n`;
  out += `schema_version: ${review.schema_version}\n`;
  out += `review_id: ${review.review_id}\n`;
  out += `contract_id: ${review.contract_id}\n`;
  out += `lane_id: ${review.lane_id}\n`;
  out += `check_count: ${review.check_count}\n`;
  out += `review_passed: ${review.review_passed}\n`;
  out += `review_ready: ${review.review_ready}\n`;
  out += `release_allowed: ${review.release_allowed}\n`;
  out += `deploy_allowed: ${review.deploy_allowed}\n`;
  out += `real_execution_allowed: ${review.real_execution_allowed}\n`;
  out += `real_patch_execution_allowed: ${review.real_patch_execution_allowed}\n`;
  out += `production_touched: ${review.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
