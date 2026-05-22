import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_CREATION_FINAL_AUTHORITY_LEDGER_STATUSES = [
  'REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT',
  'REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_DRILL',
  'REAL_PR_CREATION_FINAL_AUTH_LEDGER_APPROVED',
  'REAL_PR_CREATION_FINAL_AUTH_LEDGER_READY',
];

const BASE = {
  schema_version: 'v254.0',
  ledger_id: null,
  drill_id: null,
  drill_ready: false,
  authority_decision: null,
  final_authority_ledger_ready: false,
  all_flags_locked: false,
  ledger_hash: null,
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
    return { ...BASE, errors: ['REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT'] };
  }
  if (!input.ledger_id || typeof input.ledger_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT: missing ledger_id'] };
  }
  if (!input.drill_id || typeof input.drill_id !== 'string') {
    return { ...BASE, ledger_id: input.ledger_id, errors: ['REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT: missing drill_id'] };
  }
  if (!input.drill_status || typeof input.drill_status !== 'object') {
    return { ...BASE, ledger_id: input.ledger_id, drill_id: input.drill_id, errors: ['REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT: missing drill_status'] };
  }
  if (input.drill_status.supervised_pr_creation_drill_ready !== true) {
    return { ...BASE, ledger_id: input.ledger_id, drill_id: input.drill_id, errors: ['REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_DRILL: drill not ready'] };
  }
  if (input.authority_decision !== 'approved') {
    return { ...BASE, ledger_id: input.ledger_id, drill_id: input.drill_id, errors: ['REAL_PR_CREATION_FINAL_AUTH_LEDGER_APPROVED: authority_decision must be approved'] };
  }

  const lid = input.ledger_id;
  return {
    ...BASE,
    ledger_id: lid,
    drill_id: input.drill_id,
    drill_ready: true,
    authority_decision: 'approved',
    final_authority_ledger_ready: true,
    all_flags_locked: true,
    ledger_hash: hash({ lid, drill_id: input.drill_id, authority_decision: 'approved' }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid final authority ledger'] };
  }
  const errors = [];
  if (!result.ledger_id) errors.push('missing ledger_id');
  if (result.final_authority_ledger_ready && !result.ledger_hash) errors.push('ledger_hash required when ready');
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
    return 'REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT';
  }
  const status = result.final_authority_ledger_ready ? 'REAL_PR_CREATION_FINAL_AUTH_LEDGER_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_DRILL'))
      ? 'REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_DRILL' : 'REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `ledger_id: ${result.ledger_id || '(none)'}\n`;
  out += `drill_id: ${result.drill_id || '(none)'}\n`;
  out += `drill_ready: ${result.drill_ready}\n`;
  out += `authority_decision: ${result.authority_decision || '(none)'}\n`;
  out += `final_authority_ledger_ready: ${result.final_authority_ledger_ready}\n`;
  out += `all_flags_locked: ${result.all_flags_locked}\n`;
  if (result.ledger_hash) out += `ledger_hash: ${result.ledger_hash}\n`;
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
