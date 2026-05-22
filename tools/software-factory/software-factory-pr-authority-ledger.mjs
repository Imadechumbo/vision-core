import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_AUTHORITY_LEDGER_STATUSES = [
  'PR_LEDGER_BLOCKED_INPUT',
  'PR_LEDGER_BLOCKED_DRILL',
  'PR_LEDGER_READY',
];

const BASE = {
  schema_version: 'v241.0',
  ledger_id: null,
  drill_id: null,
  pr_authority_ledger_ready: false,
  entries_count: 0,
  audit_trail_complete: false,
  ledger_hash: null,
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
    return { ...BASE, errors: ['PR_LEDGER_BLOCKED_INPUT'] };
  }
  if (!input.ledger_id || typeof input.ledger_id !== 'string') {
    return { ...BASE, errors: ['PR_LEDGER_BLOCKED_INPUT: missing ledger_id'] };
  }
  if (!input.drill_id || typeof input.drill_id !== 'string') {
    return { ...BASE, errors: ['PR_LEDGER_BLOCKED_INPUT: missing drill_id'] };
  }
  if (!input.supervised_pr_drill_ready) {
    return { ...BASE, drill_id: input.drill_id, errors: ['PR_LEDGER_BLOCKED_DRILL: supervised_pr_drill not ready'] };
  }
  if (!Array.isArray(input.entries) || input.entries.length === 0) {
    return { ...BASE, drill_id: input.drill_id, errors: ['PR_LEDGER_BLOCKED_DRILL: entries required'] };
  }
  for (const entry of input.entries) {
    if (!entry.action || typeof entry.action !== 'string') {
      return { ...BASE, drill_id: input.drill_id, errors: ['PR_LEDGER_BLOCKED_DRILL: each entry requires action'] };
    }
    if (!entry.timestamp || typeof entry.timestamp !== 'string') {
      return { ...BASE, drill_id: input.drill_id, errors: ['PR_LEDGER_BLOCKED_DRILL: each entry requires timestamp'] };
    }
    if (!entry.authority_reference || typeof entry.authority_reference !== 'string') {
      return { ...BASE, drill_id: input.drill_id, errors: ['PR_LEDGER_BLOCKED_DRILL: each entry requires authority_reference'] };
    }
  }

  const lid = input.ledger_id;
  return {
    ...BASE,
    ledger_id: lid,
    drill_id: input.drill_id,
    pr_authority_ledger_ready: true,
    entries_count: input.entries.length,
    audit_trail_complete: true,
    ledger_hash: hash({ lid, drill_id: input.drill_id, entries_count: input.entries.length }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.ledger_id) {
    return { valid: false, errors: ['PR_LEDGER_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || !result.ledger_id) {
    return 'PR_LEDGER_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_pr_creation_allowed=false production_touched=false';
  }
  let out = `=== Software Factory PR Authority Ledger ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `ledger_id: ${result.ledger_id}\n`;
  out += `drill_id: ${result.drill_id}\n`;
  out += `pr_authority_ledger_ready: ${result.pr_authority_ledger_ready}\n`;
  out += `entries_count: ${result.entries_count}\n`;
  out += `audit_trail_complete: ${result.audit_trail_complete}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
