import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PROMPT_BUILDER_STATUSES = [
  'PROMPT_BUILDER_BLOCKED_INPUT',
  'PROMPT_BUILDER_BLOCKED_CONTRACT',
  'PROMPT_BUILDER_READY',
];

const PROMPT_BUILDER_BLOCKED_INPUT = {
  schema_version: 'v206.0',
  prompt_builder_id: null,
  contract_id: null,
  mission_type: null,
  prompt_sections: [],
  prompt_ready: false,
  prompt_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: ['PROMPT_BUILDER_BLOCKED_INPUT'],
};

const PROMPT_BUILDER_BLOCKED_CONTRACT = {
  schema_version: 'v206.0',
  prompt_builder_id: null,
  contract_id: null,
  mission_type: null,
  prompt_sections: [],
  prompt_ready: false,
  prompt_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: ['PROMPT_BUILDER_BLOCKED_CONTRACT'],
};

function id() {
  return 'pb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...PROMPT_BUILDER_BLOCKED_INPUT };
  }
  if (!input.prompt_builder_id || typeof input.prompt_builder_id !== 'string') {
    const r = { ...PROMPT_BUILDER_BLOCKED_INPUT };
    r.errors = ['PROMPT_BUILDER_BLOCKED_INPUT: missing prompt_builder_id'];
    return r;
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    const r = { ...PROMPT_BUILDER_BLOCKED_INPUT };
    r.errors = ['PROMPT_BUILDER_BLOCKED_INPUT: missing contract_id'];
    return r;
  }
  if (!input.mission_type || typeof input.mission_type !== 'string') {
    const r = { ...PROMPT_BUILDER_BLOCKED_INPUT };
    r.errors = ['PROMPT_BUILDER_BLOCKED_INPUT: missing mission_type'];
    return r;
  }
  if (!input.scope_validated) {
    const r = { ...PROMPT_BUILDER_BLOCKED_CONTRACT };
    r.contract_id = input.contract_id;
    r.errors = ['PROMPT_BUILDER_BLOCKED_CONTRACT: scope not validated'];
    return r;
  }
  if (!input.safety_mode) {
    const r = { ...PROMPT_BUILDER_BLOCKED_CONTRACT };
    r.contract_id = input.contract_id;
    r.errors = ['PROMPT_BUILDER_BLOCKED_CONTRACT: safety_mode required'];
    return r;
  }

  const pbId = input.prompt_builder_id;
  const sections = [
    { section: 'mission_context', content: `Mission: ${input.mission_type}` },
    { section: 'scope_constraints', content: 'Scope: tools/software-factory/ only' },
    { section: 'safety_rules', content: 'REGRA ABSOLUTA: no deploy, no release, no stable, no tag, no real execution' },
    { section: 'allowed_tools', content: Array.isArray(input.allowed_tools) ? input.allowed_tools.join(', ') : 'default' },
  ];

  const result = {
    schema_version: 'v206.0',
    prompt_builder_id: pbId,
    contract_id: input.contract_id,
    mission_type: input.mission_type,
    prompt_sections: sections,
    prompt_ready: true,
    prompt_hash: hash({ pbId, contract_id: input.contract_id, mission_type: input.mission_type }),
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    real_execution_allowed: false,
    errors: [],
  };
  return result;
}

export function validate(prompt) {
  if (!prompt || !prompt.prompt_builder_id) {
    return { valid: false, errors: ['PROMPT_BUILDER_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (prompt.release_allowed !== false) errors.push('release_allowed must be false');
  if (prompt.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (prompt.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (prompt.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (prompt.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(prompt) {
  if (!prompt || !prompt.prompt_builder_id) {
    return 'PROMPT_BUILDER_BLOCKED_INPUT: no prompt to render\nREGRA ABSOLUTA: release_allowed=false deploy_allowed=false';
  }
  let out = `=== Software Factory Prompt Builder ===\n`;
  out += `schema_version: ${prompt.schema_version}\n`;
  out += `prompt_builder_id: ${prompt.prompt_builder_id}\n`;
  out += `contract_id: ${prompt.contract_id}\n`;
  out += `mission_type: ${prompt.mission_type}\n`;
  out += `prompt_ready: ${prompt.prompt_ready}\n`;
  out += `sections: ${prompt.prompt_sections.length}\n`;
  out += `release_allowed: ${prompt.release_allowed}\n`;
  out += `deploy_allowed: ${prompt.deploy_allowed}\n`;
  out += `stable_allowed: ${prompt.stable_allowed}\n`;
  out += `tag_allowed: ${prompt.tag_allowed}\n`;
  out += `real_execution_allowed: ${prompt.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  if (prompt.errors && prompt.errors.length > 0) {
    out += `errors: ${prompt.errors.join(', ')}\n`;
  }
  return out;
}
