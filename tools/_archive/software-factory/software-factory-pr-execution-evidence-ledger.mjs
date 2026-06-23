import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_EXECUTION_EVIDENCE_LEDGER_STATUSES = [
  'PR_EXEC_EVIDENCE_LEDGER_BLOCKED_INPUT',
  'PR_EXEC_EVIDENCE_LEDGER_BLOCKED_DRILL',
  'PR_EXEC_EVIDENCE_LEDGER_READY',
];

const BASE = {
  schema_version: 'v252.0',
  ledger_id: null,
  drill_id: null,
  pr_execution_evidence_ledger_ready: false,
  entries_count: 0,
  evidence_complete: false,
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
    return { ...BASE, errors: ['PR_EXEC_EVIDENCE_LEDGER_BLOCKED_INPUT'] };
  }
  if (!input.ledger_id || typeof input.ledger_id !== 'string') {
    return { ...BASE, errors: ['PR_EXEC_EVIDENCE_LEDGER_BLOCKED_INPUT: missing ledger_id'] };
  }
  if (!input.drill_id || typeof input.drill_id !== 'string') {
    return { ...BASE, errors: ['PR_EXEC_EVIDENCE_LEDGER_BLOCKED_INPUT: missing drill_id'] };
  }
  if (!input.supervised_real_pr_execution_drill_ready) {
    return { ...BASE, drill_id: input.drill_id, errors: ['PR_EXEC_EVIDENCE_LEDGER_BLOCKED_DRILL: supervised_real_pr_execution_drill not ready'] };
  }
  if (!Array.isArray(input.evidence_entries) || input.evidence_entries.length === 0) {
    return { ...BASE, drill_id: input.drill_id, errors: ['PR_EXEC_EVIDENCE_LEDGER_BLOCKED_DRILL: evidence_entries required'] };
  }
  for (const entry of input.evidence_entries) {
    if (!entry.evidence_type || typeof entry.evidence_type !== 'string') {
      return { ...BASE, drill_id: input.drill_id, errors: ['PR_EXEC_EVIDENCE_LEDGER_BLOCKED_DRILL: each entry requires evidence_type'] };
    }
    if (!entry.timestamp || typeof entry.timestamp !== 'string') {
      return { ...BASE, drill_id: input.drill_id, errors: ['PR_EXEC_EVIDENCE_LEDGER_BLOCKED_DRILL: each entry requires timestamp'] };
    }
    if (!entry.source || typeof entry.source !== 'string') {
      return { ...BASE, drill_id: input.drill_id, errors: ['PR_EXEC_EVIDENCE_LEDGER_BLOCKED_DRILL: each entry requires source'] };
    }
  }

  const lid = input.ledger_id;
  return {
    ...BASE,
    ledger_id: lid,
    drill_id: input.drill_id,
    pr_execution_evidence_ledger_ready: true,
    entries_count: input.evidence_entries.length,
    evidence_complete: true,
    ledger_hash: hash({ lid, drill_id: input.drill_id, entries_count: input.evidence_entries.length }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.ledger_id) {
    return { valid: false, errors: ['PR_EXEC_EVIDENCE_LEDGER_BLOCKED_INPUT'] };
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
    return 'PR_EXEC_EVIDENCE_LEDGER_BLOCKED_INPUT\nREGRA ABSOLUTA: real_pr_creation_allowed=false production_touched=false';
  }
  let out = `=== Software Factory PR Execution Evidence Ledger ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `ledger_id: ${result.ledger_id}\n`;
  out += `drill_id: ${result.drill_id}\n`;
  out += `pr_execution_evidence_ledger_ready: ${result.pr_execution_evidence_ledger_ready}\n`;
  out += `entries_count: ${result.entries_count}\n`;
  out += `evidence_complete: ${result.evidence_complete}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
