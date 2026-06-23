import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES = [
  'PR_EXEC_FINAL_AUTHORITY_BLOCKED_INPUT',
  'PR_EXEC_FINAL_AUTHORITY_BLOCKED_LEDGER',
  'PR_EXEC_FINAL_AUTHORITY_PENDING',
  'PR_EXEC_FINAL_AUTHORITY_REJECTED',
  'PR_EXEC_FINAL_AUTHORITY_APPROVED',
];

const ALLOWED_DECISIONS = ['pending', 'approved', 'rejected'];

const BASE = {
  schema_version: 'v253.0',
  review_id: null,
  ledger_id: null,
  pr_execution_final_authority_review_ready: false,
  decision: 'pending',
  review_notes_provided: false,
  review_hash: null,
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
    return { ...BASE, errors: ['PR_EXEC_FINAL_AUTHORITY_BLOCKED_INPUT'] };
  }
  if (!input.review_id || typeof input.review_id !== 'string') {
    return { ...BASE, errors: ['PR_EXEC_FINAL_AUTHORITY_BLOCKED_INPUT: missing review_id'] };
  }
  if (!input.ledger_id || typeof input.ledger_id !== 'string') {
    return { ...BASE, errors: ['PR_EXEC_FINAL_AUTHORITY_BLOCKED_INPUT: missing ledger_id'] };
  }
  if (!input.pr_execution_evidence_ledger_ready) {
    return { ...BASE, ledger_id: input.ledger_id, errors: ['PR_EXEC_FINAL_AUTHORITY_BLOCKED_LEDGER: pr_execution_evidence_ledger not ready'] };
  }
  if (!input.decision || !ALLOWED_DECISIONS.includes(input.decision)) {
    return { ...BASE, ledger_id: input.ledger_id, errors: [`PR_EXEC_FINAL_AUTHORITY_BLOCKED_LEDGER: decision must be one of: ${ALLOWED_DECISIONS.join(', ')}`] };
  }
  if (!input.review_notes || typeof input.review_notes !== 'string' || input.review_notes.trim() === '') {
    return { ...BASE, ledger_id: input.ledger_id, errors: ['PR_EXEC_FINAL_AUTHORITY_BLOCKED_LEDGER: review_notes required'] };
  }

  const rid = input.review_id;
  return {
    ...BASE,
    review_id: rid,
    ledger_id: input.ledger_id,
    pr_execution_final_authority_review_ready: true,
    decision: input.decision,
    review_notes_provided: true,
    review_hash: hash({ rid, ledger_id: input.ledger_id, decision: input.decision }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.review_id) {
    return { valid: false, errors: ['PR_EXEC_FINAL_AUTHORITY_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || !result.review_id) {
    return 'PR_EXEC_FINAL_AUTHORITY_BLOCKED_INPUT\nREGRA ABSOLUTA: real_pr_creation_allowed=false production_touched=false';
  }
  let out = `=== Software Factory PR Execution Final Authority Review ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `review_id: ${result.review_id}\n`;
  out += `ledger_id: ${result.ledger_id}\n`;
  out += `pr_execution_final_authority_review_ready: ${result.pr_execution_final_authority_review_ready}\n`;
  out += `decision: ${result.decision}\n`;
  out += `review_notes_provided: ${result.review_notes_provided}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
