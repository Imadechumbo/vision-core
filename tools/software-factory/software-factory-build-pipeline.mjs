import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_BUILD_PIPELINE_STATUSES = [
  'BUILD_PIPELINE_BLOCKED_INPUT',
  'BUILD_PIPELINE_BLOCKED_STEPS',
  'BUILD_PIPELINE_READY',
];

const BUILD_PIPELINE_BLOCKED_INPUT = {
  schema_version: 'v204.0',
  build_pipeline_id: null,
  contract_id: null,
  scope_inspector_id: null,
  recipe_engine_id: null,
  steps: [],
  step_count: 0,
  pipeline_valid: false,
  pipeline_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: ['BUILD_PIPELINE_BLOCKED_INPUT'],
};

const BUILD_PIPELINE_BLOCKED_STEPS = {
  schema_version: 'v204.0',
  build_pipeline_id: null,
  contract_id: null,
  scope_inspector_id: null,
  recipe_engine_id: null,
  steps: [],
  step_count: 0,
  pipeline_valid: false,
  pipeline_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: ['BUILD_PIPELINE_BLOCKED_STEPS'],
};

function id() {
  return 'build-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BUILD_PIPELINE_BLOCKED_INPUT };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    const r = { ...BUILD_PIPELINE_BLOCKED_INPUT };
    r.errors = ['BUILD_PIPELINE_BLOCKED_INPUT: missing contract_id'];
    return r;
  }
  if (!input.scope_inspector_id || typeof input.scope_inspector_id !== 'string') {
    const r = { ...BUILD_PIPELINE_BLOCKED_INPUT };
    r.errors = ['BUILD_PIPELINE_BLOCKED_INPUT: missing scope_inspector_id'];
    return r;
  }
  if (!input.recipe_engine_id || typeof input.recipe_engine_id !== 'string') {
    const r = { ...BUILD_PIPELINE_BLOCKED_INPUT };
    r.errors = ['BUILD_PIPELINE_BLOCKED_INPUT: missing recipe_engine_id'];
    return r;
  }
  if (!Array.isArray(input.steps) || input.steps.length === 0) {
    const r = { ...BUILD_PIPELINE_BLOCKED_STEPS };
    r.contract_id = input.contract_id;
    r.scope_inspector_id = input.scope_inspector_id;
    r.recipe_engine_id = input.recipe_engine_id;
    r.errors = ['BUILD_PIPELINE_BLOCKED_STEPS: must provide at least one step'];
    return r;
  }

  const blockedSteps = { ...BUILD_PIPELINE_BLOCKED_STEPS };
  blockedSteps.contract_id = input.contract_id;
  blockedSteps.scope_inspector_id = input.scope_inspector_id;
  blockedSteps.recipe_engine_id = input.recipe_engine_id;

  const validatedSteps = [];
  const stepErrors = [];

  for (let i = 0; i < input.steps.length; i++) {
    const s = input.steps[i];

    if (!s || typeof s !== 'object') {
      stepErrors.push(`step[${i}]: invalid step object`);
      continue;
    }
    if (!s.op || typeof s.op !== 'string') {
      stepErrors.push(`step[${i}]: missing or invalid op`);
      continue;
    }
    if (!s.file_path || typeof s.file_path !== 'string') {
      stepErrors.push(`step[${i}]: missing or invalid file_path`);
      continue;
    }
    if (!s.content_hash || typeof s.content_hash !== 'string' || s.content_hash.length !== 64) {
      stepErrors.push(`step[${i}]: missing or invalid content_hash (must be 64 hex chars)`);
      continue;
    }

    validatedSteps.push({
      op: s.op,
      file_path: s.file_path,
      content_hash: s.content_hash,
      status: 'pending',
    });
  }

  if (stepErrors.length > 0) {
    blockedSteps.steps = validatedSteps;
    blockedSteps.step_count = validatedSteps.length;
    blockedSteps.errors = ['BUILD_PIPELINE_BLOCKED_STEPS: step validation failed', ...stepErrors];
    return blockedSteps;
  }

  const hashContent = validatedSteps.map(s => `${s.op}:${s.file_path}:${s.content_hash}`).join('|');
  const pipeline_hash = createHash('sha256').update(hashContent).digest('hex');

  const result = {
    schema_version: 'v204.0',
    build_pipeline_id: id(),
    contract_id: input.contract_id,
    scope_inspector_id: input.scope_inspector_id,
    recipe_engine_id: input.recipe_engine_id,
    steps: validatedSteps,
    step_count: validatedSteps.length,
    pipeline_valid: true,
    pipeline_hash,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    real_execution_allowed: false,
    errors: [],
  };

  return result;
}

export function validate(pipeline) {
  if (!pipeline || typeof pipeline !== 'object') {
    return { valid: false, errors: ['invalid build pipeline'] };
  }
  const errors = [];
  if (!pipeline.build_pipeline_id) errors.push('missing build_pipeline_id');
  if (!pipeline.contract_id) errors.push('missing contract_id');
  if (!pipeline.scope_inspector_id) errors.push('missing scope_inspector_id');
  if (!pipeline.recipe_engine_id) errors.push('missing recipe_engine_id');
  if (!Array.isArray(pipeline.steps)) errors.push('steps must be array');
  if (typeof pipeline.pipeline_valid !== 'boolean') errors.push('pipeline_valid must be boolean');
  if (pipeline.pipeline_valid && pipeline.pipeline_hash && typeof pipeline.pipeline_hash !== 'string') errors.push('pipeline_hash must be string');
  if (pipeline.release_allowed !== false) errors.push('release_allowed must be false');
  if (pipeline.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (pipeline.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (pipeline.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (pipeline.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(pipeline) {
  if (!pipeline || typeof pipeline !== 'object') {
    return 'BUILD_PIPELINE_BLOCKED_INPUT';
  }
  const status = pipeline.pipeline_valid ? 'BUILD_PIPELINE_READY' :
    pipeline.errors && pipeline.errors.some(e => e.startsWith('BUILD_PIPELINE_BLOCKED_STEPS'))
      ? 'BUILD_PIPELINE_BLOCKED_STEPS' : 'BUILD_PIPELINE_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `build_pipeline_id: ${pipeline.build_pipeline_id || '(none)'}\n`;
  out += `contract_id: ${pipeline.contract_id || '(none)'}\n`;
  out += `scope_inspector_id: ${pipeline.scope_inspector_id || '(none)'}\n`;
  out += `recipe_engine_id: ${pipeline.recipe_engine_id || '(none)'}\n`;
  out += `step_count: ${pipeline.step_count || 0}\n`;
  out += `pipeline_valid: ${pipeline.pipeline_valid}\n`;
  if (pipeline.pipeline_hash) {
    out += `pipeline_hash: ${pipeline.pipeline_hash}\n`;
  }
  if (pipeline.steps && pipeline.steps.length > 0) {
    out += 'steps:\n';
    for (const s of pipeline.steps) {
      out += `  [${s.status}] ${s.op} ${s.file_path} (hash: ${s.content_hash})\n`;
    }
  }
  out += `release_allowed: ${pipeline.release_allowed}\n`;
  out += `deploy_allowed: ${pipeline.deploy_allowed}\n`;
  out += `stable_allowed: ${pipeline.stable_allowed}\n`;
  out += `tag_allowed: ${pipeline.tag_allowed}\n`;
  out += `real_execution_allowed: ${pipeline.real_execution_allowed}\n`;
  out += 'REGRA ABSOLUTA: todas as flags permanecem false ate ordem explicita do contrato V201\n';
  if (pipeline.errors && pipeline.errors.length > 0) {
    out += `errors: ${pipeline.errors.join('; ')}\n`;
  }
  return out;
}
