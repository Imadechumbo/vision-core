import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_MEMORY_LEDGER_STATUSES = [
  'MEMORY_LEDGER_BLOCKED_INPUT',
  'MEMORY_LEDGER_BLOCKED_CONTRACT',
  'MEMORY_LEDGER_READY',
];

const BASE = {
  schema_version: 'v220.0',
  ledger_id: null,
  contract_id: null,
  entries: [],
  entry_count: 0,
  ledger_ready: false,
  ledger_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['MEMORY_LEDGER_BLOCKED_INPUT'] };
  }
  if (!input.ledger_id || typeof input.ledger_id !== 'string') {
    return { ...BASE, errors: ['MEMORY_LEDGER_BLOCKED_INPUT: missing ledger_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['MEMORY_LEDGER_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.cli_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['MEMORY_LEDGER_BLOCKED_CONTRACT: cli not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['MEMORY_LEDGER_BLOCKED_CONTRACT: scope not validated'] };
  }

  const entries = Array.isArray(input.entries) && input.entries.length > 0
    ? input.entries.map((e, i) => ({
        index: i,
        key: typeof e === 'string' ? e : e.key,
        value: typeof e === 'object' && e.value !== undefined ? e.value : null,
        timestamp: Date.now(),
      }))
    : [
        { index: 0, key: 'session_start', value: new Date().toISOString(), timestamp: Date.now() },
      ];

  const lid = input.ledger_id;
  return {
    ...BASE,
    ledger_id: lid,
    contract_id: input.contract_id,
    entries,
    entry_count: entries.length,
    ledger_ready: true,
    ledger_hash: hash({ lid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(ledger) {
  if (!ledger || !ledger.ledger_id) {
    return { valid: false, errors: ['MEMORY_LEDGER_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (ledger.release_allowed !== false) errors.push('release_allowed must be false');
  if (ledger.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (ledger.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(ledger) {
  if (!ledger || !ledger.ledger_id) {
    return 'MEMORY_LEDGER_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory Memory Ledger ===\n`;
  out += `schema_version: ${ledger.schema_version}\n`;
  out += `ledger_id: ${ledger.ledger_id}\n`;
  out += `contract_id: ${ledger.contract_id}\n`;
  out += `entry_count: ${ledger.entry_count}\n`;
  out += `ledger_ready: ${ledger.ledger_ready}\n`;
  out += `release_allowed: ${ledger.release_allowed}\n`;
  out += `deploy_allowed: ${ledger.deploy_allowed}\n`;
  out += `real_execution_allowed: ${ledger.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
