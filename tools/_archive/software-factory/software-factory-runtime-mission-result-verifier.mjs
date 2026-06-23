import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RUNTIME_MISSION_RESULT_VERIFIER_STATUSES = [
  'RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_INPUT',
  'RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_SANDBOX',
  'RUNTIME_MISSION_RESULT_VERIFIER_FAIL',
  'RUNTIME_MISSION_RESULT_VERIFIER_READY',
];

const BASE = {
  schema_version: 'v282.0',
  result_verifier_id: null,
  runtime_mission_result_verifier_ready: false,
  dry_run_verified: false,
  verification_hash: null,
  external_call_performed: false,
  filesystem_write_performed: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  runtime_execution_allowed: false,
  runtime_mission_executed: false,
  real_pr_creation_allowed: false,
  real_patch_execution_allowed: false,
  real_patch_applied: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_INPUT'] };
  }
  if (!input.result_verifier_id || typeof input.result_verifier_id !== 'string') {
    return { ...BASE, errors: ['RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_INPUT: missing result_verifier_id'] };
  }
  if (input.runtime_mission_sandbox_executor_ready !== true) {
    return { ...BASE, result_verifier_id: input.result_verifier_id, errors: ['RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_SANDBOX: runtime_mission_sandbox_executor_ready must be true'] };
  }
  if (!input.sandbox_executor_id || typeof input.sandbox_executor_id !== 'string') {
    return { ...BASE, result_verifier_id: input.result_verifier_id, errors: ['RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_SANDBOX: missing sandbox_executor_id'] };
  }
  if (!input.observed_result || typeof input.observed_result !== 'object') {
    return { ...BASE, result_verifier_id: input.result_verifier_id, errors: ['RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_SANDBOX: missing observed_result'] };
  }

  const obs = input.observed_result;
  const failErrors = [];

  if (obs.runtime_mission_executed !== false) {
    failErrors.push('runtime_mission_executed must be false');
  }
  if (obs.runtime_execution_allowed !== false) {
    failErrors.push('runtime_execution_allowed must be false');
  }
  if (obs.production_touched !== false) {
    failErrors.push('production_touched must be false');
  }
  if (obs.external_call_performed !== false) {
    failErrors.push('external_call_performed must be false');
  }
  if (obs.filesystem_write_performed !== false) {
    failErrors.push('filesystem_write_performed must be false');
  }
  if (obs.validation_passed !== true) {
    failErrors.push('validation_passed must be true');
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      result_verifier_id: input.result_verifier_id,
      errors: ['RUNTIME_MISSION_RESULT_VERIFIER_FAIL: ' + failErrors.join('; ')],
    };
  }

  const rvId = input.result_verifier_id;
  const verificationHash = hash({
    rvId,
    sandbox: input.sandbox_executor_id,
    observed: obs,
  });

  return {
    ...BASE,
    result_verifier_id: rvId,
    runtime_mission_result_verifier_ready: true,
    dry_run_verified: true,
    verification_hash: verificationHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid runtime mission result verifier'] };
  }
  const errors = [];
  if (!result.result_verifier_id) errors.push('missing result_verifier_id');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.runtime_execution_allowed !== false) errors.push('runtime_execution_allowed must be false');
  if (result.runtime_mission_executed !== false) errors.push('runtime_mission_executed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (result.real_patch_applied !== false) errors.push('real_patch_applied must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.external_call_performed !== false) errors.push('external_call_performed must be false');
  if (result.filesystem_write_performed !== false) errors.push('filesystem_write_performed must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_INPUT';
  }
  const status = result.runtime_mission_result_verifier_ready ? 'RUNTIME_MISSION_RESULT_VERIFIER_READY' :
    result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_SANDBOX'))
      ? 'RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_SANDBOX' :
      result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_RESULT_VERIFIER_FAIL'))
        ? 'RUNTIME_MISSION_RESULT_VERIFIER_FAIL' : 'RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `result_verifier_id: ${result.result_verifier_id || '(none)'}\n`;
  out += `runtime_mission_result_verifier_ready: ${result.runtime_mission_result_verifier_ready}\n`;
  out += `dry_run_verified: ${result.dry_run_verified}\n`;
  if (result.verification_hash) out += `verification_hash: ${result.verification_hash}\n`;
  out += `external_call_performed: ${result.external_call_performed}\n`;
  out += `filesystem_write_performed: ${result.filesystem_write_performed}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `runtime_execution_allowed: ${result.runtime_execution_allowed}\n`;
  out += `runtime_mission_executed: ${result.runtime_mission_executed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_patch_execution_allowed: ${result.real_patch_execution_allowed}\n`;
  out += `real_patch_applied: ${result.real_patch_applied}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
