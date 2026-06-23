import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_GITHUB_PR_SAFETY_PREFLIGHT_STATUSES = [
  'GITHUB_PR_PREFLIGHT_BLOCKED_INPUT',
  'GITHUB_PR_PREFLIGHT_BLOCKED_COMMAND',
  'GITHUB_PR_PREFLIGHT_FAIL',
  'GITHUB_PR_PREFLIGHT_READY',
];

const REQUIRED_CHECKS = [
  'repo_clean', 'branch_exists', 'source_not_main', 'target_is_main',
  'no_forbidden_files', 'tests_defined', 'rollback_defined',
  'no_deploy', 'no_release', 'no_tag', 'no_stable', 'no_secrets',
];

const BASE = {
  schema_version: 'v256.0',
  preflight_id: null,
  command_contract_id: null,
  github_pr_safety_preflight_ready: false,
  checks_total: 0,
  checks_passed: 0,
  safety_hash: null,
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
    return { ...BASE, errors: ['GITHUB_PR_PREFLIGHT_BLOCKED_INPUT'] };
  }
  if (!input.preflight_id || typeof input.preflight_id !== 'string') {
    return { ...BASE, errors: ['GITHUB_PR_PREFLIGHT_BLOCKED_INPUT: missing preflight_id'] };
  }
  if (!input.command_contract_id || typeof input.command_contract_id !== 'string') {
    return { ...BASE, preflight_id: input.preflight_id, errors: ['GITHUB_PR_PREFLIGHT_BLOCKED_INPUT: missing command_contract_id'] };
  }
  if (!input.repository || typeof input.repository !== 'string') {
    return { ...BASE, preflight_id: input.preflight_id, errors: ['GITHUB_PR_PREFLIGHT_BLOCKED_INPUT: missing repository'] };
  }
  if (!input.source_branch || typeof input.source_branch !== 'string') {
    return { ...BASE, preflight_id: input.preflight_id, errors: ['GITHUB_PR_PREFLIGHT_BLOCKED_INPUT: missing source_branch'] };
  }
  if (!input.target_branch || typeof input.target_branch !== 'string') {
    return { ...BASE, preflight_id: input.preflight_id, errors: ['GITHUB_PR_PREFLIGHT_BLOCKED_INPUT: missing target_branch'] };
  }
  if (!Array.isArray(input.safety_checks) || input.safety_checks.length === 0) {
    return { ...BASE, preflight_id: input.preflight_id, errors: ['GITHUB_PR_PREFLIGHT_BLOCKED_INPUT: missing safety_checks'] };
  }
  if (input.real_pr_command_contract_ready !== true) {
    return { ...BASE, preflight_id: input.preflight_id, errors: ['GITHUB_PR_PREFLIGHT_BLOCKED_COMMAND: real_pr_command_contract_ready must be true'] };
  }

  const checkNames = input.safety_checks.map(c => c.check);
  const missing = REQUIRED_CHECKS.filter(r => !checkNames.includes(r));
  if (missing.length > 0) {
    return { ...BASE, preflight_id: input.preflight_id, errors: [`GITHUB_PR_PREFLIGHT_FAIL: missing checks: ${missing.join(', ')}`] };
  }

  const failed = input.safety_checks.filter(c => c.passed !== true);
  if (failed.length > 0) {
    const failedNames = failed.map(c => c.check).join(', ');
    return { ...BASE, preflight_id: input.preflight_id, errors: [`GITHUB_PR_PREFLIGHT_FAIL: checks failed: ${failedNames}`] };
  }

  const pid = input.preflight_id;
  return {
    ...BASE,
    preflight_id: pid,
    command_contract_id: input.command_contract_id,
    github_pr_safety_preflight_ready: true,
    checks_total: REQUIRED_CHECKS.length,
    checks_passed: REQUIRED_CHECKS.length,
    safety_hash: hash({ pid, checks: REQUIRED_CHECKS }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid github pr safety preflight'] };
  }
  const errors = [];
  if (!result.preflight_id) errors.push('missing preflight_id');
  if (result.github_pr_safety_preflight_ready && !result.safety_hash) errors.push('safety_hash required when ready');
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
    return 'GITHUB_PR_PREFLIGHT_BLOCKED_INPUT';
  }
  const status = result.github_pr_safety_preflight_ready ? 'GITHUB_PR_PREFLIGHT_READY' :
    result.errors && result.errors.some(e => e.startsWith('GITHUB_PR_PREFLIGHT_BLOCKED_COMMAND'))
      ? 'GITHUB_PR_PREFLIGHT_BLOCKED_COMMAND' :
      result.errors && result.errors.some(e => e.startsWith('GITHUB_PR_PREFLIGHT_FAIL'))
        ? 'GITHUB_PR_PREFLIGHT_FAIL' : 'GITHUB_PR_PREFLIGHT_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `preflight_id: ${result.preflight_id || '(none)'}\n`;
  out += `command_contract_id: ${result.command_contract_id || '(none)'}\n`;
  out += `github_pr_safety_preflight_ready: ${result.github_pr_safety_preflight_ready}\n`;
  out += `checks_total: ${result.checks_total}\n`;
  out += `checks_passed: ${result.checks_passed}\n`;
  if (result.safety_hash) out += `safety_hash: ${result.safety_hash}\n`;
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
