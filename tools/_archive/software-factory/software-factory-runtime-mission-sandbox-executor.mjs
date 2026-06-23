import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RUNTIME_MISSION_SANDBOX_EXECUTOR_STATUSES = [
  'RUNTIME_MISSION_SANDBOX_BLOCKED_INPUT',
  'RUNTIME_MISSION_SANDBOX_BLOCKED_APPROVAL',
  'RUNTIME_MISSION_SANDBOX_DENIED',
  'RUNTIME_MISSION_SANDBOX_READY',
];

const ALLOWED_SANDBOX_MODES = [
  'dry-run',
  'simulation',
  'planning-only',
];

const ALLOWED_RESULTS = [
  'pass',
  'fail',
  'skipped',
  'pending',
];

const REQUIRED_CONSTRAINTS = [
  'no-production-touch',
  'no-real-execution',
  'no-filesystem-write',
  'no-network',
  'no-deploy',
  'no-release',
  'no-stable-promotion',
];

const BASE = {
  schema_version: 'v281.0',
  sandbox_executor_id: null,
  runtime_mission_sandbox_executor_ready: false,
  sandbox_mode: null,
  sandbox_constraints_count: 0,
  sandbox_hash: null,
  sandbox_executed: false,
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
    return { ...BASE, errors: ['RUNTIME_MISSION_SANDBOX_BLOCKED_INPUT'] };
  }
  if (!input.sandbox_executor_id || typeof input.sandbox_executor_id !== 'string') {
    return { ...BASE, errors: ['RUNTIME_MISSION_SANDBOX_BLOCKED_INPUT: missing sandbox_executor_id'] };
  }
  if (input.runtime_mission_approval_gate_ready !== true) {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_BLOCKED_APPROVAL: runtime_mission_approval_gate_ready must be true'] };
  }
  if (!input.approval_gate_id || typeof input.approval_gate_id !== 'string') {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_BLOCKED_APPROVAL: missing approval_gate_id'] };
  }
  if (!input.sandbox_mode || !ALLOWED_SANDBOX_MODES.includes(input.sandbox_mode)) {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_DENIED: invalid sandbox_mode'] };
  }
  if (!input.mission_preview || typeof input.mission_preview !== 'string') {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_DENIED: missing mission_preview'] };
  }
  if (!Array.isArray(input.sandbox_constraints) || input.sandbox_constraints.length === 0) {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_DENIED: missing sandbox_constraints'] };
  }
  const missingConstraints = REQUIRED_CONSTRAINTS.filter(c => !input.sandbox_constraints.includes(c));
  if (missingConstraints.length > 0) {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_DENIED: missing required constraints: ' + missingConstraints.join(', ')] };
  }
  if (!input.simulated_execution_result || typeof input.simulated_execution_result !== 'object') {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_DENIED: missing simulated_execution_result'] };
  }
  if (input.simulated_execution_result.simulated !== true) {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_DENIED: simulated must be true'] };
  }
  if (input.simulated_execution_result.sandbox_executed !== false) {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_DENIED: sandbox_executed must be false'] };
  }
  if (input.simulated_execution_result.external_call_performed !== false) {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_DENIED: external_call_performed must be false'] };
  }
  if (input.simulated_execution_result.filesystem_write_performed !== false) {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_DENIED: filesystem_write_performed must be false'] };
  }
  if (!input.simulated_execution_result.result || !ALLOWED_RESULTS.includes(input.simulated_execution_result.result)) {
    return { ...BASE, sandbox_executor_id: input.sandbox_executor_id, errors: ['RUNTIME_MISSION_SANDBOX_DENIED: invalid result'] };
  }

  const seId = input.sandbox_executor_id;
  const sandboxHash = hash({
    seId,
    approval: input.approval_gate_id,
    mode: input.sandbox_mode,
    constraints: input.sandbox_constraints,
    result: input.simulated_execution_result,
  });

  return {
    ...BASE,
    sandbox_executor_id: seId,
    runtime_mission_sandbox_executor_ready: true,
    sandbox_mode: input.sandbox_mode,
    sandbox_constraints_count: input.sandbox_constraints.length,
    sandbox_hash: sandboxHash,
    sandbox_executed: false,
    external_call_performed: false,
    filesystem_write_performed: false,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid runtime mission sandbox executor'] };
  }
  const errors = [];
  if (!result.sandbox_executor_id) errors.push('missing sandbox_executor_id');
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
  if (result.sandbox_executed !== false) errors.push('sandbox_executed must be false');
  if (result.external_call_performed !== false) errors.push('external_call_performed must be false');
  if (result.filesystem_write_performed !== false) errors.push('filesystem_write_performed must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'RUNTIME_MISSION_SANDBOX_BLOCKED_INPUT';
  }
  const status = result.runtime_mission_sandbox_executor_ready ? 'RUNTIME_MISSION_SANDBOX_READY' :
    result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_SANDBOX_BLOCKED_APPROVAL'))
      ? 'RUNTIME_MISSION_SANDBOX_BLOCKED_APPROVAL' :
      result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_SANDBOX_DENIED'))
        ? 'RUNTIME_MISSION_SANDBOX_DENIED' : 'RUNTIME_MISSION_SANDBOX_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `sandbox_executor_id: ${result.sandbox_executor_id || '(none)'}\n`;
  out += `runtime_mission_sandbox_executor_ready: ${result.runtime_mission_sandbox_executor_ready}\n`;
  out += `sandbox_mode: ${result.sandbox_mode || '(none)'}\n`;
  out += `sandbox_constraints_count: ${result.sandbox_constraints_count}\n`;
  if (result.sandbox_hash) out += `sandbox_hash: ${result.sandbox_hash}\n`;
  out += `sandbox_executed: ${result.sandbox_executed}\n`;
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
