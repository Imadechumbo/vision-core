import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_PHYSICAL_APPLY_PROOF_STATUSES = [
  'REAL_PATCH_APPLY_PROOF_BLOCKED_INPUT',
  'REAL_PATCH_APPLY_PROOF_BLOCKED_CONTROLLER',
  'REAL_PATCH_APPLY_PROOF_FAIL',
  'REAL_PATCH_APPLY_PROOF_READY',
];

const BASE = {
  schema_version: 'v269.0',
  proof_id: null,
  real_patch_physical_apply_proof_ready: false,
  dry_run_verified: false,
  real_patch_applied: false,
  files_written: false,
  git_apply_executed: false,
  proof_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PATCH_APPLY_PROOF_BLOCKED_INPUT'] };
  }
  if (!input.proof_id || typeof input.proof_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_APPLY_PROOF_BLOCKED_INPUT: missing proof_id'] };
  }
  if (input.real_patch_apply_controller_ready !== true) {
    return { ...BASE, proof_id: input.proof_id, errors: ['REAL_PATCH_APPLY_PROOF_BLOCKED_CONTROLLER: apply controller must be ready'] };
  }
  if (!input.observed_result || typeof input.observed_result !== 'object') {
    return { ...BASE, proof_id: input.proof_id, errors: ['REAL_PATCH_APPLY_PROOF_BLOCKED_CONTROLLER: missing observed_result'] };
  }

  const obs = input.observed_result;
  if (obs.real_patch_applied !== false) {
    return { ...BASE, proof_id: input.proof_id, errors: ['REAL_PATCH_APPLY_PROOF_FAIL: real_patch_applied must be false'] };
  }
  if (obs.files_written !== false) {
    return { ...BASE, proof_id: input.proof_id, errors: ['REAL_PATCH_APPLY_PROOF_FAIL: files_written must be false'] };
  }
  if (obs.git_apply_executed !== false) {
    return { ...BASE, proof_id: input.proof_id, errors: ['REAL_PATCH_APPLY_PROOF_FAIL: git_apply_executed must be false'] };
  }
  if (obs.dry_run_confirmed !== true) {
    return { ...BASE, proof_id: input.proof_id, errors: ['REAL_PATCH_APPLY_PROOF_FAIL: dry_run_confirmed must be true'] };
  }

  const pid = input.proof_id;
  const proofHash = hash({ proof_id: pid, observed_result: obs });

  return {
    ...BASE,
    proof_id: pid,
    real_patch_physical_apply_proof_ready: true,
    dry_run_verified: true,
    proof_hash: proofHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real patch physical apply proof'] };
  }
  const errors = [];
  if (!result.proof_id) errors.push('missing proof_id');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (result.real_patch_applied !== false) errors.push('real_patch_applied must be false');
  if (result.files_written !== false) errors.push('files_written must be false');
  if (result.git_apply_executed !== false) errors.push('git_apply_executed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'REAL_PATCH_APPLY_PROOF_BLOCKED_INPUT';
  }
  const status = result.real_patch_physical_apply_proof_ready ? 'REAL_PATCH_APPLY_PROOF_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_APPLY_PROOF_BLOCKED_CONTROLLER'))
      ? 'REAL_PATCH_APPLY_PROOF_BLOCKED_CONTROLLER' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_APPLY_PROOF_FAIL'))
        ? 'REAL_PATCH_APPLY_PROOF_FAIL' : 'REAL_PATCH_APPLY_PROOF_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `proof_id: ${result.proof_id || '(none)'}\n`;
  out += `real_patch_physical_apply_proof_ready: ${result.real_patch_physical_apply_proof_ready}\n`;
  out += `dry_run_verified: ${result.dry_run_verified}\n`;
  out += `real_patch_applied: ${result.real_patch_applied}\n`;
  out += `files_written: ${result.files_written}\n`;
  out += `git_apply_executed: ${result.git_apply_executed}\n`;
  if (result.proof_hash) out += `proof_hash: ${result.proof_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_patch_execution_allowed: ${result.real_patch_execution_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
