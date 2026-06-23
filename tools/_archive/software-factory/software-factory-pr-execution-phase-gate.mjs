import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_EXECUTION_PHASE_GATE_STATUSES = [
  'PR_EXEC_PHASE_GATE_BLOCKED_INPUT',
  'PR_EXEC_PHASE_GATE_BLOCKED_REVIEW',
  'PR_EXEC_PHASE_GATE_INCOMPLETE',
  'PR_EXEC_PHASE_GATE_READY',
];

const REQUIRED_MODULE_IDS = [
  'authority_contract_id',
  'command_binder_id',
  'sandbox_id',
  'dry_run_verifier_id',
  'approval_gate_id',
  'execution_barrier_id',
  'execution_drill_id',
  'evidence_ledger_id',
  'final_review_id',
];

const FINAL_MESSAGE =
  'V245-V254 real PR execution authority preparation complete. Real PR execution remains blocked until explicit V255 command.';

const BASE = {
  schema_version: 'v254.0',
  gate_id: null,
  final_review_id: null,
  pr_execution_phase_gate_ready: false,
  phase_passed: false,
  modules_verified: 0,
  all_modules_present: false,
  gate_hash: null,
  final_message: FINAL_MESSAGE,
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
    return { ...BASE, errors: ['PR_EXEC_PHASE_GATE_BLOCKED_INPUT'] };
  }
  if (!input.gate_id || typeof input.gate_id !== 'string') {
    return { ...BASE, errors: ['PR_EXEC_PHASE_GATE_BLOCKED_INPUT: missing gate_id'] };
  }
  if (!input.final_review_id || typeof input.final_review_id !== 'string') {
    return { ...BASE, errors: ['PR_EXEC_PHASE_GATE_BLOCKED_INPUT: missing final_review_id'] };
  }
  if (!input.pr_execution_final_authority_review_ready) {
    return { ...BASE, final_review_id: input.final_review_id, errors: ['PR_EXEC_PHASE_GATE_BLOCKED_REVIEW: pr_execution_final_authority_review not ready'] };
  }

  const missingIds = REQUIRED_MODULE_IDS.filter(id => !input[id] || typeof input[id] !== 'string');
  if (missingIds.length > 0) {
    return {
      ...BASE,
      final_review_id: input.final_review_id,
      modules_verified: REQUIRED_MODULE_IDS.length - missingIds.length,
      errors: [`PR_EXEC_PHASE_GATE_INCOMPLETE: missing module ids: ${missingIds.join(', ')}`],
    };
  }

  const gid = input.gate_id;
  return {
    ...BASE,
    gate_id: gid,
    final_review_id: input.final_review_id,
    pr_execution_phase_gate_ready: true,
    phase_passed: false,
    modules_verified: REQUIRED_MODULE_IDS.length,
    all_modules_present: true,
    gate_hash: hash({ gid, final_review_id: input.final_review_id, modules_verified: REQUIRED_MODULE_IDS.length }),
    final_message: FINAL_MESSAGE,
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.gate_id) {
    return { valid: false, errors: ['PR_EXEC_PHASE_GATE_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (result.phase_passed !== false) errors.push('phase_passed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || !result.gate_id) {
    return `PR_EXEC_PHASE_GATE_BLOCKED_INPUT\nREGRA ABSOLUTA: real_pr_creation_allowed=false production_touched=false\n${FINAL_MESSAGE}`;
  }
  let out = `=== Software Factory PR Execution Phase Gate ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `gate_id: ${result.gate_id}\n`;
  out += `final_review_id: ${result.final_review_id}\n`;
  out += `pr_execution_phase_gate_ready: ${result.pr_execution_phase_gate_ready}\n`;
  out += `phase_passed: ${result.phase_passed}\n`;
  out += `modules_verified: ${result.modules_verified}\n`;
  out += `all_modules_present: ${result.all_modules_present}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `final_message: ${result.final_message}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
