import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RUNTIME_MISSION_APPROVAL_GATE_STATUSES = [
  'RUNTIME_MISSION_APPROVAL_BLOCKED_INPUT',
  'RUNTIME_MISSION_APPROVAL_BLOCKED_DRY_RUN',
  'RUNTIME_MISSION_APPROVAL_DENIED',
  'RUNTIME_MISSION_APPROVAL_READY',
];

const BASE = {
  schema_version: 'v280.0',
  approval_gate_id: null,
  runtime_mission_approval_gate_ready: false,
  human_approved: false,
  explicit_runtime_authority_received: false,
  approval_hash: null,
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
    return { ...BASE, errors: ['RUNTIME_MISSION_APPROVAL_BLOCKED_INPUT'] };
  }
  if (!input.approval_gate_id || typeof input.approval_gate_id !== 'string') {
    return { ...BASE, errors: ['RUNTIME_MISSION_APPROVAL_BLOCKED_INPUT: missing approval_gate_id'] };
  }
  if (!input.dry_run_controller_id || typeof input.dry_run_controller_id !== 'string') {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['RUNTIME_MISSION_APPROVAL_BLOCKED_DRY_RUN: missing dry_run_controller_id'] };
  }
  if (input.runtime_mission_execution_dry_run_controller_ready !== true) {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['RUNTIME_MISSION_APPROVAL_BLOCKED_DRY_RUN: runtime_mission_execution_dry_run_controller_ready must be true'] };
  }
  if (input.dry_run_completed !== false) {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['RUNTIME_MISSION_APPROVAL_BLOCKED_DRY_RUN: dry_run_completed must be false'] };
  }
  if (input.human_approval !== 'granted') {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['RUNTIME_MISSION_APPROVAL_DENIED: human_approval must be granted'] };
  }
  if (!input.approver_id || typeof input.approver_id !== 'string') {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['RUNTIME_MISSION_APPROVAL_DENIED: missing approver_id'] };
  }
  if (!input.approval_reason || typeof input.approval_reason !== 'string') {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['RUNTIME_MISSION_APPROVAL_DENIED: missing approval_reason'] };
  }
  if (input.explicit_runtime_authority !== true) {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['RUNTIME_MISSION_APPROVAL_DENIED: explicit_runtime_authority must be true'] };
  }

  const agId = input.approval_gate_id;
  const approvalHash = hash({
    agId,
    controller: input.dry_run_controller_id,
    approver: input.approver_id,
    reason: input.approval_reason,
  });

  return {
    ...BASE,
    approval_gate_id: agId,
    runtime_mission_approval_gate_ready: true,
    human_approved: true,
    explicit_runtime_authority_received: true,
    approval_hash: approvalHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid runtime mission approval gate'] };
  }
  const errors = [];
  if (!result.approval_gate_id) errors.push('missing approval_gate_id');
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
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'RUNTIME_MISSION_APPROVAL_BLOCKED_INPUT';
  }
  const status = result.runtime_mission_approval_gate_ready ? 'RUNTIME_MISSION_APPROVAL_READY' :
    result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_APPROVAL_BLOCKED_DRY_RUN'))
      ? 'RUNTIME_MISSION_APPROVAL_BLOCKED_DRY_RUN' :
      result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_APPROVAL_DENIED'))
        ? 'RUNTIME_MISSION_APPROVAL_DENIED' : 'RUNTIME_MISSION_APPROVAL_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `approval_gate_id: ${result.approval_gate_id || '(none)'}\n`;
  out += `runtime_mission_approval_gate_ready: ${result.runtime_mission_approval_gate_ready}\n`;
  out += `human_approved: ${result.human_approved}\n`;
  out += `explicit_runtime_authority_received: ${result.explicit_runtime_authority_received}\n`;
  if (result.approval_hash) out += `approval_hash: ${result.approval_hash}\n`;
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
