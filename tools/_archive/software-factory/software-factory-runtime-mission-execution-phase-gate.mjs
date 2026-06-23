import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RUNTIME_MISSION_EXECUTION_PHASE_GATE_STATUSES = [
  'RUNTIME_MISSION_PHASE_GATE_BLOCKED_INPUT',
  'RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT',
  'RUNTIME_MISSION_PHASE_GATE_INCOMPLETE',
  'RUNTIME_MISSION_PHASE_GATE_READY',
];

const REQUIRED_IDS = [
  'runtime_mission_command_contract',
  'runtime_mission_scope_binder',
  'runtime_mission_context_builder',
  'runtime_mission_plan_builder',
  'runtime_mission_execution_dry_run_controller',
  'runtime_mission_approval_gate',
  'runtime_mission_sandbox_executor',
  'runtime_mission_result_verifier',
  'runtime_mission_evidence_receipt',
];

const FINAL_MESSAGE = 'V275-V284 runtime mission execution complete. Runtime mission execution remains blocked until explicit V285 product dashboard command.';

const BASE = {
  schema_version: 'v284.0',
  phase_gate_id: null,
  runtime_mission_execution_phase_gate_ready: false,
  modules_verified: [],
  all_modules_present: false,
  phase_passed: false,
  final_message: null,
  phase_gate_hash: null,
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
    return { ...BASE, errors: ['RUNTIME_MISSION_PHASE_GATE_BLOCKED_INPUT'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, errors: ['RUNTIME_MISSION_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  }
  if (input.runtime_mission_evidence_receipt_ready !== true) {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT: runtime_mission_evidence_receipt_ready must be true'] };
  }
  if (!input.receipt_id || typeof input.receipt_id !== 'string') {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT: missing receipt_id'] };
  }
  if (!input.ids || typeof input.ids !== 'object') {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT: missing ids object'] };
  }
  if (!input.phase_summary || typeof input.phase_summary !== 'string') {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT: missing phase_summary'] };
  }

  const missingModules = [];
  for (const key of REQUIRED_IDS) {
    if (!input.ids[key] || typeof input.ids[key] !== 'string') {
      missingModules.push(key);
    }
  }

  if (missingModules.length > 0) {
    return {
      ...BASE,
      phase_gate_id: input.phase_gate_id,
      modules_verified: REQUIRED_IDS.filter(k => input.ids[k] && typeof input.ids[k] === 'string'),
      all_modules_present: false,
      errors: ['RUNTIME_MISSION_PHASE_GATE_INCOMPLETE: missing modules: ' + missingModules.join(', ')],
    };
  }

  const pgId = input.phase_gate_id;
  const phaseGateHash = hash({
    pgId,
    receipt: input.receipt_id,
    ids: input.ids,
    summary: input.phase_summary,
  });

  return {
    ...BASE,
    phase_gate_id: pgId,
    runtime_mission_execution_phase_gate_ready: true,
    modules_verified: REQUIRED_IDS.map(k => input.ids[k]),
    all_modules_present: true,
    phase_passed: false,
    final_message: FINAL_MESSAGE,
    phase_gate_hash: phaseGateHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid runtime mission execution phase gate'] };
  }
  const errors = [];
  if (!result.phase_gate_id) errors.push('missing phase_gate_id');
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
    return 'RUNTIME_MISSION_PHASE_GATE_BLOCKED_INPUT';
  }
  const status = result.runtime_mission_execution_phase_gate_ready ? 'RUNTIME_MISSION_PHASE_GATE_READY' :
    result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT'))
      ? 'RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT' :
      result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_PHASE_GATE_INCOMPLETE'))
        ? 'RUNTIME_MISSION_PHASE_GATE_INCOMPLETE' : 'RUNTIME_MISSION_PHASE_GATE_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `phase_gate_id: ${result.phase_gate_id || '(none)'}\n`;
  out += `runtime_mission_execution_phase_gate_ready: ${result.runtime_mission_execution_phase_gate_ready}\n`;
  out += `all_modules_present: ${result.all_modules_present}\n`;
  out += `modules_verified: ${JSON.stringify(result.modules_verified)}\n`;
  out += `phase_passed: ${result.phase_passed}\n`;
  out += `final_message: ${result.final_message || '(none)'}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
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
