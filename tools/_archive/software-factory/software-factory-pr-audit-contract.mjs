import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_AUDIT_CONTRACT_STATUSES = [
  'PR_AUDIT_BLOCKED_INPUT',
  'PR_AUDIT_BLOCKED_CONTRACT',
  'PR_AUDIT_READY',
];

const BASE = {
  schema_version: 'v235.0',
  pr_audit_id: null,
  contract_id: null,
  pr_audit_ready: false,
  branch_valid: false,
  title_provided: false,
  body_provided: false,
  audit_hash: null,
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
    return { ...BASE, errors: ['PR_AUDIT_BLOCKED_INPUT'] };
  }
  if (!input.pr_audit_id || typeof input.pr_audit_id !== 'string') {
    return { ...BASE, errors: ['PR_AUDIT_BLOCKED_INPUT: missing pr_audit_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['PR_AUDIT_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.pr_readiness_gate_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_AUDIT_BLOCKED_CONTRACT: pr_readiness_gate not ready'] };
  }
  if (!input.patch_execution_phase_gate_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_AUDIT_BLOCKED_CONTRACT: patch_execution_phase_gate not ready'] };
  }
  if (!input.branch_name || typeof input.branch_name !== 'string') {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_AUDIT_BLOCKED_CONTRACT: missing branch_name'] };
  }
  if (input.branch_name === 'main') {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_AUDIT_BLOCKED_CONTRACT: branch_name cannot be main'] };
  }
  if (!input.target_branch || input.target_branch !== 'main') {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_AUDIT_BLOCKED_CONTRACT: target_branch must be main'] };
  }
  if (!input.pr_title || typeof input.pr_title !== 'string') {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_AUDIT_BLOCKED_CONTRACT: missing pr_title'] };
  }
  if (!input.pr_body_summary || typeof input.pr_body_summary !== 'string') {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_AUDIT_BLOCKED_CONTRACT: missing pr_body_summary'] };
  }

  const aid = input.pr_audit_id;
  return {
    ...BASE,
    pr_audit_id: aid,
    contract_id: input.contract_id,
    pr_audit_ready: true,
    branch_valid: true,
    title_provided: true,
    body_provided: true,
    audit_hash: hash({ aid, contract_id: input.contract_id, branch_name: input.branch_name }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.pr_audit_id) {
    return { valid: false, errors: ['PR_AUDIT_BLOCKED_INPUT'] };
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
  if (!result || !result.pr_audit_id) {
    return 'PR_AUDIT_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_pr_creation_allowed=false production_touched=false';
  }
  let out = `=== Software Factory PR Audit Contract ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `pr_audit_id: ${result.pr_audit_id}\n`;
  out += `contract_id: ${result.contract_id}\n`;
  out += `pr_audit_ready: ${result.pr_audit_ready}\n`;
  out += `branch_valid: ${result.branch_valid}\n`;
  out += `title_provided: ${result.title_provided}\n`;
  out += `body_provided: ${result.body_provided}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
