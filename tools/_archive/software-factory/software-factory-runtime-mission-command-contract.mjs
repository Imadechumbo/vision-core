import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RUNTIME_MISSION_COMMAND_CONTRACT_STATUSES = [
  'RUNTIME_MISSION_COMMAND_BLOCKED_INPUT',
  'RUNTIME_MISSION_COMMAND_BLOCKED_PHASE_GATE',
  'RUNTIME_MISSION_COMMAND_DENIED',
  'RUNTIME_MISSION_COMMAND_READY',
];

const ALLOWED_MISSION_TYPES = [
  'diagnosis',
  'planning',
  'repair',
  'validation',
  'report',
  'dry_run',
];

const ALLOWED_RUNTIME_MODES = [
  'dry-run',
  'simulation',
  'planning-only',
];

const BASE = {
  schema_version: 'v275.0',
  mission_command_id: null,
  runtime_mission_command_contract_ready: false,
  explicit_command_received: false,
  mission_type: null,
  target_project: null,
  allowed_runtime_mode: null,
  command_hash: null,
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
    return { ...BASE, errors: ['RUNTIME_MISSION_COMMAND_BLOCKED_INPUT'] };
  }
  if (!input.mission_command_id || typeof input.mission_command_id !== 'string') {
    return { ...BASE, errors: ['RUNTIME_MISSION_COMMAND_BLOCKED_INPUT: missing mission_command_id'] };
  }
  if (input.controlled_real_patch_execution_phase_gate_ready !== true) {
    return { ...BASE, mission_command_id: input.mission_command_id, errors: ['RUNTIME_MISSION_COMMAND_BLOCKED_PHASE_GATE: V274 phase gate must be ready'] };
  }
  if (input.explicit_v275_command !== true) {
    return { ...BASE, mission_command_id: input.mission_command_id, errors: ['RUNTIME_MISSION_COMMAND_DENIED: explicit_v275_command must be true'] };
  }
  if (!input.requested_by || typeof input.requested_by !== 'string') {
    return { ...BASE, mission_command_id: input.mission_command_id, errors: ['RUNTIME_MISSION_COMMAND_DENIED: missing requested_by'] };
  }
  if (!input.mission_reason || typeof input.mission_reason !== 'string') {
    return { ...BASE, mission_command_id: input.mission_command_id, errors: ['RUNTIME_MISSION_COMMAND_DENIED: missing mission_reason'] };
  }
  if (!input.mission_type || !ALLOWED_MISSION_TYPES.includes(input.mission_type)) {
    return { ...BASE, mission_command_id: input.mission_command_id, errors: ['RUNTIME_MISSION_COMMAND_DENIED: invalid or missing mission_type'] };
  }
  if (!input.mission_goal || typeof input.mission_goal !== 'string') {
    return { ...BASE, mission_command_id: input.mission_command_id, errors: ['RUNTIME_MISSION_COMMAND_DENIED: missing mission_goal'] };
  }
  if (!input.target_project || typeof input.target_project !== 'string') {
    return { ...BASE, mission_command_id: input.mission_command_id, errors: ['RUNTIME_MISSION_COMMAND_DENIED: missing target_project'] };
  }
  if (!input.allowed_runtime_mode || !ALLOWED_RUNTIME_MODES.includes(input.allowed_runtime_mode)) {
    return { ...BASE, mission_command_id: input.mission_command_id, errors: ['RUNTIME_MISSION_COMMAND_DENIED: invalid or missing allowed_runtime_mode'] };
  }

  const mid = input.mission_command_id;
  const cmdHash = hash({ mission_command_id: mid, mission_type: input.mission_type, target_project: input.target_project, allowed_runtime_mode: input.allowed_runtime_mode });

  return {
    ...BASE,
    mission_command_id: mid,
    runtime_mission_command_contract_ready: true,
    explicit_command_received: true,
    mission_type: input.mission_type,
    target_project: input.target_project,
    allowed_runtime_mode: input.allowed_runtime_mode,
    command_hash: cmdHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid runtime mission command contract'] };
  }
  const errors = [];
  if (!result.mission_command_id) errors.push('missing mission_command_id');
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
    return 'RUNTIME_MISSION_COMMAND_BLOCKED_INPUT';
  }
  const status = result.runtime_mission_command_contract_ready ? 'RUNTIME_MISSION_COMMAND_READY' :
    result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_COMMAND_BLOCKED_PHASE_GATE'))
      ? 'RUNTIME_MISSION_COMMAND_BLOCKED_PHASE_GATE' :
      result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_COMMAND_DENIED'))
        ? 'RUNTIME_MISSION_COMMAND_DENIED' : 'RUNTIME_MISSION_COMMAND_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `mission_command_id: ${result.mission_command_id || '(none)'}\n`;
  out += `runtime_mission_command_contract_ready: ${result.runtime_mission_command_contract_ready}\n`;
  out += `explicit_command_received: ${result.explicit_command_received}\n`;
  out += `mission_type: ${result.mission_type || '(none)'}\n`;
  out += `target_project: ${result.target_project || '(none)'}\n`;
  out += `allowed_runtime_mode: ${result.allowed_runtime_mode || '(none)'}\n`;
  if (result.command_hash) out += `command_hash: ${result.command_hash}\n`;
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
