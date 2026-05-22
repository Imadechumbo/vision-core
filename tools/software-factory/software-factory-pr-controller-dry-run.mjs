import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_CONTROLLER_DRY_RUN_STATUSES = [
  'PR_CONTROLLER_DRY_RUN_BLOCKED_INPUT',
  'PR_CONTROLLER_DRY_RUN_BLOCKED_CONTRACT',
  'PR_CONTROLLER_DRY_RUN_READY',
];

const BASE = {
  schema_version: 'v223.0',
  dry_run_id: null,
  contract_id: null,
  dry_run_steps: [],
  step_count: 0,
  dry_run_completed: false,
  dry_run_ready: false,
  dry_run_hash: null,
  real_pr_creation_allowed: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

const DEFAULT_STEPS = [
  { name: 'validate_scope', mode: 'dry_run', status: 'pending' },
  { name: 'simulate_pr_create', mode: 'dry_run', status: 'pending' },
  { name: 'check_governance', mode: 'dry_run', status: 'pending' },
  { name: 'verify_no_real_flags', mode: 'dry_run', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PR_CONTROLLER_DRY_RUN_BLOCKED_INPUT'] };
  }
  if (!input.dry_run_id || typeof input.dry_run_id !== 'string') {
    return { ...BASE, errors: ['PR_CONTROLLER_DRY_RUN_BLOCKED_INPUT: missing dry_run_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['PR_CONTROLLER_DRY_RUN_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.binding_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_CONTROLLER_DRY_RUN_BLOCKED_CONTRACT: binding not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PR_CONTROLLER_DRY_RUN_BLOCKED_CONTRACT: scope not validated'] };
  }

  const dry_run_steps = Array.isArray(input.dry_run_steps) && input.dry_run_steps.length > 0
    ? input.dry_run_steps.map((s, i) => ({ index: i, name: typeof s === 'string' ? s : s.name, mode: 'dry_run', status: 'pending' }))
    : DEFAULT_STEPS.map((s, i) => ({ index: i, ...s }));

  const did = input.dry_run_id;
  return {
    ...BASE,
    dry_run_id: did,
    contract_id: input.contract_id,
    dry_run_steps,
    step_count: dry_run_steps.length,
    dry_run_completed: false,
    dry_run_ready: true,
    dry_run_hash: hash({ did, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(dryRun) {
  if (!dryRun || !dryRun.dry_run_id) {
    return { valid: false, errors: ['PR_CONTROLLER_DRY_RUN_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (dryRun.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (dryRun.release_allowed !== false) errors.push('release_allowed must be false');
  if (dryRun.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (dryRun.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (dryRun.dry_run_completed !== false) errors.push('dry_run_completed must be false by default');
  return { valid: errors.length === 0, errors };
}

export function render(dryRun) {
  if (!dryRun || !dryRun.dry_run_id) {
    return 'PR_CONTROLLER_DRY_RUN_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_pr_creation_allowed=false';
  }
  let out = `=== Software Factory PR Controller Dry Run ===\n`;
  out += `schema_version: ${dryRun.schema_version}\n`;
  out += `dry_run_id: ${dryRun.dry_run_id}\n`;
  out += `contract_id: ${dryRun.contract_id}\n`;
  out += `step_count: ${dryRun.step_count}\n`;
  out += `dry_run_completed: ${dryRun.dry_run_completed}\n`;
  out += `dry_run_ready: ${dryRun.dry_run_ready}\n`;
  out += `real_pr_creation_allowed: ${dryRun.real_pr_creation_allowed}\n`;
  out += `release_allowed: ${dryRun.release_allowed}\n`;
  out += `real_execution_allowed: ${dryRun.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
