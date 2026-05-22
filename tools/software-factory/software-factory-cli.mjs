import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_CLI_STATUSES = [
  'CLI_BLOCKED_INPUT',
  'CLI_BLOCKED_CONTRACT',
  'CLI_READY',
];

const BASE = {
  schema_version: 'v219.0',
  cli_id: null,
  contract_id: null,
  commands: [],
  command_count: 0,
  cli_ready: false,
  cli_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

const DEFAULT_COMMANDS = [
  { name: 'build', description: 'Run software factory build pipeline' },
  { name: 'verify', description: 'Run verification suite' },
  { name: 'report', description: 'Generate mission report' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['CLI_BLOCKED_INPUT'] };
  }
  if (!input.cli_id || typeof input.cli_id !== 'string') {
    return { ...BASE, errors: ['CLI_BLOCKED_INPUT: missing cli_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['CLI_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.orchestrator_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['CLI_BLOCKED_CONTRACT: orchestrator not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['CLI_BLOCKED_CONTRACT: scope not validated'] };
  }

  const commands = Array.isArray(input.commands) && input.commands.length > 0
    ? input.commands.map((c, i) => ({ index: i, name: typeof c === 'string' ? c : c.name, description: typeof c === 'object' && c.description ? c.description : '' }))
    : DEFAULT_COMMANDS.map((c, i) => ({ index: i, ...c }));

  const cid = input.cli_id;
  return {
    ...BASE,
    cli_id: cid,
    contract_id: input.contract_id,
    commands,
    command_count: commands.length,
    cli_ready: true,
    cli_hash: hash({ cid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(cli) {
  if (!cli || !cli.cli_id) {
    return { valid: false, errors: ['CLI_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (cli.release_allowed !== false) errors.push('release_allowed must be false');
  if (cli.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (cli.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(cli) {
  if (!cli || !cli.cli_id) {
    return 'CLI_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory CLI ===\n`;
  out += `schema_version: ${cli.schema_version}\n`;
  out += `cli_id: ${cli.cli_id}\n`;
  out += `contract_id: ${cli.contract_id}\n`;
  out += `command_count: ${cli.command_count}\n`;
  out += `cli_ready: ${cli.cli_ready}\n`;
  out += `release_allowed: ${cli.release_allowed}\n`;
  out += `deploy_allowed: ${cli.deploy_allowed}\n`;
  out += `real_execution_allowed: ${cli.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
