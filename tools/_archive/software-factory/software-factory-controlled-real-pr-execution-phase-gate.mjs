export const SOFTWARE_FACTORY_CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_STATUSES = [
  'CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_INPUT',
  'CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_PHASE',
  'CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_READY',
];

const BASE = {
  schema_version: 'v264.0',
  phase_gate_id: null,
  controlled_real_pr_execution_phase_gate_ready: false,
  phase_passed: false,
  merge_allowed: false,
  real_pr_creation_allowed: false,
  real_pr_merged: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  production_touched: false,
  final_message: null,
  module_report: [],
  errors: [],
};

const REQUIRED_MODULES = [
  { id: 'real_pr_creation_approval_gate_id', field: 'real_pr_creation_approval_gate_ready', label: 'V259 approval gate' },
  { id: 'real_pr_creation_executor_id', field: 'real_pr_creation_executor_ready', label: 'V260 executor' },
  { id: 'real_pr_creation_verifier_id', field: 'real_pr_creation_verifier_ready', label: 'V261 verifier' },
  { id: 'pr_checks_monitor_id', field: 'pr_checks_monitor_ready', label: 'V262 checks monitor' },
  { id: 'merge_blocker_id', field: 'merge_blocker_gate_ready', label: 'V263 merge blocker' },
];

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_INPUT'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, errors: ['CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  }

  const report = [];
  let blocked = false;
  for (const mod of REQUIRED_MODULES) {
    const id = input[mod.id];
    const ready = input[mod.field];
    if (!id || ready !== true) {
      report.push({ module: mod.label, id: id || null, ready: ready === true });
      blocked = true;
    } else {
      report.push({ module: mod.label, id, ready: true });
    }
  }

  if (blocked) {
    return {
      ...BASE,
      phase_gate_id: input.phase_gate_id,
      module_report: report,
      errors: ['CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_PHASE: one or more sub-modules not ready'],
    };
  }

  return {
    ...BASE,
    phase_gate_id: input.phase_gate_id,
    controlled_real_pr_execution_phase_gate_ready: true,
    module_report: report,
    final_message: 'V255-V264 controlled real PR execution complete. Real PR creation and merge remain blocked until explicit V265 controlled patch execution command.',
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid controlled real pr execution phase gate'] };
  }
  const errors = [];
  if (!result.phase_gate_id) errors.push('missing phase_gate_id');
  if (result.phase_passed !== false) errors.push('phase_passed must be false');
  if (result.merge_allowed !== false) errors.push('merge_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_pr_merged !== false) errors.push('real_pr_merged must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_INPUT';
  }
  const status = result.controlled_real_pr_execution_phase_gate_ready
    ? 'CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_READY' :
    result.errors && result.errors.some(e => e.includes('BLOCKED_PHASE'))
      ? 'CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_PHASE'
      : 'CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `phase_gate_id: ${result.phase_gate_id || '(none)'}\n`;
  out += `controlled_real_pr_execution_phase_gate_ready: ${result.controlled_real_pr_execution_phase_gate_ready}\n`;
  out += `phase_passed: ${result.phase_passed}\n`;
  out += `merge_allowed: ${result.merge_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_pr_merged: ${result.real_pr_merged}\n`;
  if (result.final_message) out += `final_message: ${result.final_message}\n`;
  if (result.module_report && result.module_report.length > 0) {
    for (const m of result.module_report) {
      out += `  module: ${m.module} | id: ${m.id} | ready: ${m.ready}\n`;
    }
  }
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
