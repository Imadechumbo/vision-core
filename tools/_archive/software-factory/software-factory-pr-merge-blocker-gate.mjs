export const SOFTWARE_FACTORY_MERGE_BLOCKER_GATE_STATUSES = [
  'MERGE_BLOCKER_GATE_BLOCKED_INPUT',
  'MERGE_BLOCKER_GATE_BLOCKED_MODULES',
  'MERGE_BLOCKER_GATE_DENIED',
  'MERGE_BLOCKER_GATE_READY',
];

const BASE = {
  schema_version: 'v263.0',
  merge_blocker_id: null,
  merge_blocker_gate_ready: false,
  merge_allowed: false,
  real_pr_merged: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  production_touched: false,
  errors: [],
};

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['MERGE_BLOCKER_GATE_BLOCKED_INPUT'] };
  }
  if (!input.merge_blocker_id || typeof input.merge_blocker_id !== 'string') {
    return { ...BASE, errors: ['MERGE_BLOCKER_GATE_BLOCKED_INPUT: missing merge_blocker_id'] };
  }
  if (input.pr_checks_monitor_ready !== true) {
    return { ...BASE, merge_blocker_id: input.merge_blocker_id, errors: ['MERGE_BLOCKER_GATE_BLOCKED_MODULES: pr_checks_monitor_ready must be true'] };
  }
  if (input.real_pr_creation_verifier_ready !== true) {
    return { ...BASE, merge_blocker_id: input.merge_blocker_id, errors: ['MERGE_BLOCKER_GATE_BLOCKED_MODULES: real_pr_creation_verifier_ready must be true'] };
  }
  if (input.merge_approved !== true) {
    return { ...BASE, merge_blocker_id: input.merge_blocker_id, errors: ['MERGE_BLOCKER_GATE_DENIED: merge_approved must be true'] };
  }

  return {
    ...BASE,
    merge_blocker_id: input.merge_blocker_id,
    merge_blocker_gate_ready: true,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid merge blocker gate'] };
  }
  const errors = [];
  if (!result.merge_blocker_id) errors.push('missing merge_blocker_id');
  if (result.merge_allowed !== false) errors.push('merge_allowed must be false');
  if (result.real_pr_merged !== false) errors.push('real_pr_merged must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'MERGE_BLOCKER_GATE_BLOCKED_INPUT';
  }
  const status = result.merge_blocker_gate_ready ? 'MERGE_BLOCKER_GATE_READY' :
    result.errors && result.errors.some(e => e.startsWith('MERGE_BLOCKER_GATE_BLOCKED_MODULES'))
      ? 'MERGE_BLOCKER_GATE_BLOCKED_MODULES' :
      result.errors && result.errors.some(e => e.startsWith('MERGE_BLOCKER_GATE_DENIED'))
        ? 'MERGE_BLOCKER_GATE_DENIED' : 'MERGE_BLOCKER_GATE_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `merge_blocker_id: ${result.merge_blocker_id || '(none)'}\n`;
  out += `merge_blocker_gate_ready: ${result.merge_blocker_gate_ready}\n`;
  out += `merge_allowed: ${result.merge_allowed}\n`;
  out += `real_pr_merged: ${result.real_pr_merged}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
