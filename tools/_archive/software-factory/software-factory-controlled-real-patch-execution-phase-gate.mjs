import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_CONTROLLED_REAL_PATCH_PHASE_GATE_STATUSES = [
  'CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_INPUT',
  'CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_RECEIPT',
  'CONTROLLED_REAL_PATCH_PHASE_GATE_INCOMPLETE',
  'CONTROLLED_REAL_PATCH_PHASE_GATE_READY',
];

const REQUIRED_MODULE_KEYS = [
  'real_patch_command_contract',
  'real_patch_scope_binder',
  'real_patch_pre_state_snapshot',
  'real_patch_apply_controller',
  'real_patch_physical_apply_proof',
  'real_patch_test_lane',
  'real_patch_rollback_plan',
  'real_patch_rollback_drill',
  'real_patch_evidence_receipt',
];

const BASE = {
  schema_version: 'v274.0',
  phase_gate_id: null,
  controlled_real_patch_execution_phase_gate_ready: false,
  modules_verified: [],
  all_modules_present: false,
  phase_passed: false,
  final_message: 'V265-V274 controlled real patch execution complete. Real patch execution remains blocked until explicit V275 runtime mission execution command.',
  phase_gate_hash: null,
  rollback_executed: false,
  files_restored: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
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
    return { ...BASE, errors: ['CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_INPUT'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, errors: ['CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  }
  if (input.real_patch_evidence_receipt_ready !== true) {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_RECEIPT: evidence receipt must be ready'] };
  }
  if (!input.ids || typeof input.ids !== 'object') {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_RECEIPT: ids required'] };
  }
  if (!input.phase_summary || typeof input.phase_summary !== 'string') {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_RECEIPT: phase_summary required'] };
  }

  const incompleteErrors = [];
  const modulesVerified = [];
  for (const key of REQUIRED_MODULE_KEYS) {
    if (!input.ids[key] || typeof input.ids[key] !== 'string') {
      incompleteErrors.push(`CONTROLLED_REAL_PATCH_PHASE_GATE_INCOMPLETE: missing module id: ${key}`);
    } else {
      modulesVerified.push(key);
    }
  }

  if (incompleteErrors.length > 0) {
    return { ...BASE, phase_gate_id: input.phase_gate_id, modules_verified: modulesVerified, errors: incompleteErrors };
  }

  const gateHash = hash({ phase_gate_id: input.phase_gate_id, ids: input.ids, phase_summary: input.phase_summary });

  return {
    ...BASE,
    phase_gate_id: input.phase_gate_id,
    controlled_real_patch_execution_phase_gate_ready: true,
    modules_verified: [...REQUIRED_MODULE_KEYS],
    all_modules_present: true,
    phase_gate_hash: gateHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid controlled real patch execution phase gate'] };
  }
  const errors = [];
  if (!result.phase_gate_id) errors.push('missing phase_gate_id');
  if (result.phase_passed !== false) errors.push('phase_passed must be false');
  if (result.rollback_executed !== false) errors.push('rollback_executed must be false');
  if (result.files_restored !== false) errors.push('files_restored must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (result.real_patch_applied !== false) errors.push('real_patch_applied must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_INPUT';
  }
  let status;
  if (result.controlled_real_patch_execution_phase_gate_ready) {
    status = 'CONTROLLED_REAL_PATCH_PHASE_GATE_READY';
  } else if (result.errors && result.errors.some(e => e.startsWith('CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_RECEIPT'))) {
    status = 'CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_RECEIPT';
  } else if (result.errors && result.errors.some(e => e.startsWith('CONTROLLED_REAL_PATCH_PHASE_GATE_INCOMPLETE'))) {
    status = 'CONTROLLED_REAL_PATCH_PHASE_GATE_INCOMPLETE';
  } else {
    status = 'CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_INPUT';
  }

  let out = `=== ${status} ===\n`;
  out += `phase_gate_id: ${result.phase_gate_id || '(none)'}\n`;
  out += `controlled_real_patch_execution_phase_gate_ready: ${result.controlled_real_patch_execution_phase_gate_ready}\n`;
  out += `modules_verified: ${Array.isArray(result.modules_verified) ? result.modules_verified.join(', ') : '(none)'}\n`;
  out += `all_modules_present: ${result.all_modules_present}\n`;
  out += `phase_passed: ${result.phase_passed}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
  out += `final_message: ${result.final_message}\n`;
  out += `rollback_executed: ${result.rollback_executed}\n`;
  out += `files_restored: ${result.files_restored}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
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
