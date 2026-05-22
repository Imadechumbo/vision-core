import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_REVIEW_ROUTER_STATUSES = [
  'PR_REVIEW_ROUTER_BLOCKED_INPUT',
  'PR_REVIEW_ROUTER_BLOCKED_LEDGER',
  'PR_REVIEW_ROUTER_READY',
];

const REQUIRED_REVIEWER_ROLES = [
  'architecture_review',
  'security_review',
  'test_review',
  'pass_gold_review',
  'rollback_review',
];

const BASE = {
  schema_version: 'v242.0',
  router_id: null,
  ledger_id: null,
  pr_review_router_ready: false,
  reviewers_assigned: 0,
  all_roles_covered: false,
  router_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PR_REVIEW_ROUTER_BLOCKED_INPUT'] };
  }
  if (!input.router_id || typeof input.router_id !== 'string') {
    return { ...BASE, errors: ['PR_REVIEW_ROUTER_BLOCKED_INPUT: missing router_id'] };
  }
  if (!input.ledger_id || typeof input.ledger_id !== 'string') {
    return { ...BASE, errors: ['PR_REVIEW_ROUTER_BLOCKED_INPUT: missing ledger_id'] };
  }
  if (!input.pr_authority_ledger_ready) {
    return { ...BASE, ledger_id: input.ledger_id, errors: ['PR_REVIEW_ROUTER_BLOCKED_LEDGER: pr_authority_ledger not ready'] };
  }
  if (!Array.isArray(input.reviewers) || input.reviewers.length === 0) {
    return { ...BASE, ledger_id: input.ledger_id, errors: ['PR_REVIEW_ROUTER_BLOCKED_LEDGER: reviewers required'] };
  }
  for (const reviewer of input.reviewers) {
    if (!reviewer.name || typeof reviewer.name !== 'string') {
      return { ...BASE, ledger_id: input.ledger_id, errors: ['PR_REVIEW_ROUTER_BLOCKED_LEDGER: each reviewer requires name'] };
    }
    if (!reviewer.role || typeof reviewer.role !== 'string') {
      return { ...BASE, ledger_id: input.ledger_id, errors: ['PR_REVIEW_ROUTER_BLOCKED_LEDGER: each reviewer requires role'] };
    }
  }
  const names = input.reviewers.map(r => r.name);
  if (new Set(names).size !== names.length) {
    return { ...BASE, ledger_id: input.ledger_id, errors: ['PR_REVIEW_ROUTER_BLOCKED_LEDGER: duplicate reviewer names not allowed'] };
  }
  const assignedRoles = input.reviewers.map(r => r.role);
  const missingRoles = REQUIRED_REVIEWER_ROLES.filter(role => !assignedRoles.includes(role));
  if (missingRoles.length > 0) {
    return { ...BASE, ledger_id: input.ledger_id, errors: [`PR_REVIEW_ROUTER_BLOCKED_LEDGER: missing required roles: ${missingRoles.join(', ')}`] };
  }

  const rid = input.router_id;
  return {
    ...BASE,
    router_id: rid,
    ledger_id: input.ledger_id,
    pr_review_router_ready: true,
    reviewers_assigned: input.reviewers.length,
    all_roles_covered: true,
    router_hash: hash({ rid, ledger_id: input.ledger_id, reviewers_assigned: input.reviewers.length }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.router_id) {
    return { valid: false, errors: ['PR_REVIEW_ROUTER_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || !result.router_id) {
    return 'PR_REVIEW_ROUTER_BLOCKED_INPUT\nREGRA ABSOLUTA: real_pr_creation_allowed=false production_touched=false';
  }
  let out = `=== Software Factory PR Review Router ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `router_id: ${result.router_id}\n`;
  out += `ledger_id: ${result.ledger_id}\n`;
  out += `pr_review_router_ready: ${result.pr_review_router_ready}\n`;
  out += `reviewers_assigned: ${result.reviewers_assigned}\n`;
  out += `all_roles_covered: ${result.all_roles_covered}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
