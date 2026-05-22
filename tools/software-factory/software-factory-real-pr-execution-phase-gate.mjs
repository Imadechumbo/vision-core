import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_EXECUTION_PHASE_GATE_STATUSES = [
  'REAL_PR_EXEC_PHASE_GATE_BLOCKED_INPUT',
  'REAL_PR_EXEC_PHASE_GATE_BLOCKED_DRILL',
  'REAL_PR_EXEC_PHASE_GATE_APPROVED',
  'REAL_PR_EXEC_PHASE_GATE_READY',
];

const BASE = {
  schema_version: 'v252.0',
  gate_id: null,
  drill_id: null,
  drill_ready: false,
  phase: 'V252_REAL_PR_EXECUTION_PHASE_GATE',
  phase_gate_ready: false,
  exec_phase_allowed: false,
  gate_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  real_pr_created: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PR_EXEC_PHASE_GATE_BLOCKED_INPUT'] };
  }
  if (!input.gate_id || typeof input.gate_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_EXEC_PHASE_GATE_BLOCKED_INPUT: missing gate_id'] };
  }
  if (!input.drill_id || typeof input.drill_id !== 'string') {
    return { ...BASE, gate_id: input.gate_id, errors: ['REAL_PR_EXEC_PHASE_GATE_BLOCKED_INPUT: missing drill_id'] };
  }
  if (!input.drill_status || typeof input.drill_status !== 'object') {
    return { ...BASE, gate_id: input.gate_id, drill_id: input.drill_id, errors: ['REAL_PR_EXEC_PHASE_GATE_BLOCKED_INPUT: missing drill_status'] };
  }
  if (input.drill_status.supervised_real_pr_drill_ready !== true) {
    return { ...BASE, gate_id: input.gate_id, drill_id: input.drill_id, errors: ['REAL_PR_EXEC_PHASE_GATE_BLOCKED_DRILL: drill not ready'] };
  }

  const gid = input.gate_id;
  return {
    ...BASE,
    gate_id: gid,
    drill_id: input.drill_id,
    drill_ready: true,
    phase_gate_ready: true,
    gate_hash: hash({ gid, drill_id: input.drill_id, phase: 'V252_REAL_PR_EXECUTION_PHASE_GATE' }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid phase gate'] };
  }
  const errors = [];
  if (!result.gate_id) errors.push('missing gate_id');
  if (result.phase_gate_ready && !result.gate_hash) errors.push('gate_hash required when ready');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_pr_created !== false) errors.push('real_pr_created must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'REAL_PR_EXEC_PHASE_GATE_BLOCKED_INPUT';
  }
  const status = result.phase_gate_ready ? 'REAL_PR_EXEC_PHASE_GATE_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_EXEC_PHASE_GATE_BLOCKED_DRILL'))
      ? 'REAL_PR_EXEC_PHASE_GATE_BLOCKED_DRILL' : 'REAL_PR_EXEC_PHASE_GATE_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `gate_id: ${result.gate_id || '(none)'}\n`;
  out += `drill_id: ${result.drill_id || '(none)'}\n`;
  out += `drill_ready: ${result.drill_ready}\n`;
  out += `phase: ${result.phase}\n`;
  out += `phase_gate_ready: ${result.phase_gate_ready}\n`;
  out += `exec_phase_allowed: ${result.exec_phase_allowed}\n`;
  if (result.gate_hash) out += `gate_hash: ${result.gate_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_pr_created: ${result.real_pr_created}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
