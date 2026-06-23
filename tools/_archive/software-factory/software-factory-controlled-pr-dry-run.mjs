import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_CONTROLLED_PR_DRY_RUN_STATUSES = [
  'PR_DRY_RUN_BLOCKED_INPUT',
  'PR_DRY_RUN_BLOCKED_CHECKLIST',
  'PR_DRY_RUN_READY',
];

const BASE = {
  schema_version: 'v238.0',
  dry_run_id: null,
  checklist_id: null,
  controlled_pr_dry_run_ready: false,
  preview_generated: false,
  real_pr_created: false,
  dry_run_hash: null,
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
    return { ...BASE, errors: ['PR_DRY_RUN_BLOCKED_INPUT'] };
  }
  if (!input.dry_run_id || typeof input.dry_run_id !== 'string') {
    return { ...BASE, errors: ['PR_DRY_RUN_BLOCKED_INPUT: missing dry_run_id'] };
  }
  if (!input.checklist_id || typeof input.checklist_id !== 'string') {
    return { ...BASE, errors: ['PR_DRY_RUN_BLOCKED_INPUT: missing checklist_id'] };
  }
  if (!input.pr_checklist_ready) {
    return { ...BASE, checklist_id: input.checklist_id, errors: ['PR_DRY_RUN_BLOCKED_CHECKLIST: pr_checklist not ready'] };
  }
  if (!input.preview_pr_title || typeof input.preview_pr_title !== 'string') {
    return { ...BASE, checklist_id: input.checklist_id, errors: ['PR_DRY_RUN_BLOCKED_CHECKLIST: missing preview_pr_title'] };
  }
  if (!input.preview_pr_body || typeof input.preview_pr_body !== 'string') {
    return { ...BASE, checklist_id: input.checklist_id, errors: ['PR_DRY_RUN_BLOCKED_CHECKLIST: missing preview_pr_body'] };
  }

  const did = input.dry_run_id;
  return {
    ...BASE,
    dry_run_id: did,
    checklist_id: input.checklist_id,
    controlled_pr_dry_run_ready: true,
    preview_generated: true,
    real_pr_created: false,
    dry_run_hash: hash({ did, checklist_id: input.checklist_id, preview_pr_title: input.preview_pr_title }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.dry_run_id) {
    return { valid: false, errors: ['PR_DRY_RUN_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (result.real_pr_created !== false) errors.push('real_pr_created must be false');
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
  if (!result || !result.dry_run_id) {
    return 'PR_DRY_RUN_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_pr_creation_allowed=false real_pr_created=false';
  }
  let out = `=== Software Factory Controlled PR Dry Run ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `dry_run_id: ${result.dry_run_id}\n`;
  out += `checklist_id: ${result.checklist_id}\n`;
  out += `controlled_pr_dry_run_ready: ${result.controlled_pr_dry_run_ready}\n`;
  out += `preview_generated: ${result.preview_generated}\n`;
  out += `real_pr_created: ${result.real_pr_created}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
