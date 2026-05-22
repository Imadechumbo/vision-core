export const SOFTWARE_FACTORY_PR_CHECKS_MONITOR_STATUSES = [
  'PR_CHECKS_MONITOR_BLOCKED_INPUT',
  'PR_CHECKS_MONITOR_DENIED',
  'PR_CHECKS_MONITOR_READY',
];

const REQUIRED_CHECKS = [
  'syntax-check',
  'unit-tests',
  'pass-gold',
  'build',
  'security-review',
  'forbidden-flags',
];

const BASE = {
  schema_version: 'v262.0',
  checks_monitor_id: null,
  pr_checks_monitor_ready: false,
  all_checks_pass: false,
  failed_checks: [],
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  production_touched: false,
  real_pr_created: false,
  errors: [],
};

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PR_CHECKS_MONITOR_BLOCKED_INPUT'] };
  }
  if (!input.checks_monitor_id || typeof input.checks_monitor_id !== 'string') {
    return { ...BASE, errors: ['PR_CHECKS_MONITOR_BLOCKED_INPUT: missing checks_monitor_id'] };
  }
  if (!input.pr_number) {
    return { ...BASE, checks_monitor_id: input.checks_monitor_id, errors: ['PR_CHECKS_MONITOR_BLOCKED_INPUT: missing pr_number'] };
  }
  if (!input.checks || typeof input.checks !== 'object' || Array.isArray(input.checks)) {
    return { ...BASE, checks_monitor_id: input.checks_monitor_id, errors: ['PR_CHECKS_MONITOR_BLOCKED_INPUT: missing checks object'] };
  }

  const failed = [];
  for (const checkName of REQUIRED_CHECKS) {
    const status = input.checks && input.checks[checkName];
    if (!status || status.status !== 'pass') {
      failed.push(checkName);
    }
  }

  if (failed.length > 0) {
    return {
      ...BASE,
      checks_monitor_id: input.checks_monitor_id,
      pr_checks_monitor_ready: false,
      all_checks_pass: false,
      failed_checks: failed,
      errors: [`PR_CHECKS_MONITOR_DENIED: ${failed.join(', ')}`],
    };
  }

  return {
    ...BASE,
    checks_monitor_id: input.checks_monitor_id,
    pr_checks_monitor_ready: true,
    all_checks_pass: true,
    failed_checks: [],
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid pr checks monitor'] };
  }
  const errors = [];
  if (!result.checks_monitor_id) errors.push('missing checks_monitor_id');
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
    return 'PR_CHECKS_MONITOR_BLOCKED_INPUT';
  }
  const status = result.pr_checks_monitor_ready ? 'PR_CHECKS_MONITOR_READY' :
    result.errors && result.errors.some(e => e.startsWith('PR_CHECKS_MONITOR_DENIED'))
      ? 'PR_CHECKS_MONITOR_DENIED' : 'PR_CHECKS_MONITOR_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `checks_monitor_id: ${result.checks_monitor_id || '(none)'}\n`;
  out += `pr_checks_monitor_ready: ${result.pr_checks_monitor_ready}\n`;
  out += `all_checks_pass: ${result.all_checks_pass}\n`;
  if (result.failed_checks && result.failed_checks.length > 0) {
    out += `failed_checks: ${result.failed_checks.join(', ')}\n`;
  }
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
