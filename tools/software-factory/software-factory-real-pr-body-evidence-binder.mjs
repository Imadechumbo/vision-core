import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_BODY_EVIDENCE_BINDER_STATUSES = [
  'REAL_PR_BODY_BINDER_BLOCKED_INPUT',
  'REAL_PR_BODY_BINDER_BLOCKED_BRANCH',
  'REAL_PR_BODY_BINDER_FAIL',
  'REAL_PR_BODY_BINDER_READY',
];

const FORBIDDEN_PATTERNS = [
  /secret/i, /token/i, /\.env/i, /private key/i, /password/i, /api[_-]?key/i,
];

const BASE = {
  schema_version: 'v258.0',
  body_binder_id: null,
  branch_binder_id: null,
  real_pr_body_evidence_binder_ready: false,
  body_safe: false,
  evidence_bound: false,
  body_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  real_pr_created: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PR_BODY_BINDER_BLOCKED_INPUT'] };
  }
  if (!input.body_binder_id || typeof input.body_binder_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_BODY_BINDER_BLOCKED_INPUT: missing body_binder_id'] };
  }
  if (!input.branch_binder_id || typeof input.branch_binder_id !== 'string') {
    return { ...BASE, body_binder_id: input.body_binder_id, errors: ['REAL_PR_BODY_BINDER_BLOCKED_INPUT: missing branch_binder_id'] };
  }
  if (!input.pr_title || typeof input.pr_title !== 'string') {
    return { ...BASE, body_binder_id: input.body_binder_id, errors: ['REAL_PR_BODY_BINDER_BLOCKED_INPUT: missing pr_title'] };
  }
  if (!input.pr_body || typeof input.pr_body !== 'string') {
    return { ...BASE, body_binder_id: input.body_binder_id, errors: ['REAL_PR_BODY_BINDER_BLOCKED_INPUT: missing pr_body'] };
  }
  if (!input.evidence_receipt || typeof input.evidence_receipt !== 'string') {
    return { ...BASE, body_binder_id: input.body_binder_id, errors: ['REAL_PR_BODY_BINDER_BLOCKED_INPUT: missing evidence_receipt'] };
  }
  if (!input.tests_summary || typeof input.tests_summary !== 'string') {
    return { ...BASE, body_binder_id: input.body_binder_id, errors: ['REAL_PR_BODY_BINDER_BLOCKED_INPUT: missing tests_summary'] };
  }
  if (input.real_pr_branch_binder_ready !== true) {
    return { ...BASE, body_binder_id: input.body_binder_id, errors: ['REAL_PR_BODY_BINDER_BLOCKED_BRANCH: real_pr_branch_binder_ready must be true'] };
  }

  if (!input.pr_body.includes('REGRA ABSOLUTA')) {
    return { ...BASE, body_binder_id: input.body_binder_id, errors: ['REAL_PR_BODY_BINDER_FAIL: pr_body must contain REGRA ABSOLUTA'] };
  }
  if (!input.pr_body.includes(input.evidence_receipt)) {
    return { ...BASE, body_binder_id: input.body_binder_id, errors: ['REAL_PR_BODY_BINDER_FAIL: pr_body must contain evidence receipt reference'] };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(input.pr_body)) {
      return { ...BASE, body_binder_id: input.body_binder_id, errors: ['REAL_PR_BODY_BINDER_FAIL: pr_body contains forbidden content'] };
    }
  }

  const bid = input.body_binder_id;
  return {
    ...BASE,
    body_binder_id: bid,
    branch_binder_id: input.branch_binder_id,
    real_pr_body_evidence_binder_ready: true,
    body_safe: true,
    evidence_bound: true,
    body_hash: hash({ bid, title: input.pr_title, body: input.pr_body, receipt: input.evidence_receipt }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real pr body evidence binder'] };
  }
  const errors = [];
  if (!result.body_binder_id) errors.push('missing body_binder_id');
  if (result.real_pr_body_evidence_binder_ready && !result.body_hash) errors.push('body_hash required when ready');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_pr_created !== false) errors.push('real_pr_created must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'REAL_PR_BODY_BINDER_BLOCKED_INPUT';
  }
  const status = result.real_pr_body_evidence_binder_ready ? 'REAL_PR_BODY_BINDER_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_BODY_BINDER_BLOCKED_BRANCH'))
      ? 'REAL_PR_BODY_BINDER_BLOCKED_BRANCH' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PR_BODY_BINDER_FAIL'))
        ? 'REAL_PR_BODY_BINDER_FAIL' : 'REAL_PR_BODY_BINDER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `body_binder_id: ${result.body_binder_id || '(none)'}\n`;
  out += `branch_binder_id: ${result.branch_binder_id || '(none)'}\n`;
  out += `real_pr_body_evidence_binder_ready: ${result.real_pr_body_evidence_binder_ready}\n`;
  out += `body_safe: ${result.body_safe}\n`;
  out += `evidence_bound: ${result.evidence_bound}\n`;
  if (result.body_hash) out += `body_hash: ${result.body_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_pr_created: ${result.real_pr_created}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
