import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_FINAL_VERIFIER_STATUSES = [
  'FINAL_VERIFIER_BLOCKED_INPUT',
  'FINAL_VERIFIER_BLOCKED_VERIFICATION',
  'FINAL_VERIFIER_FAIL',
  'FINAL_VERIFIER_READY',
];

const FINAL_VERIFIER_BLOCKED_INPUT = {
  schema_version: 'v205.0',
  final_verifier_id: null,
  contract_id: null,
  scope_inspector_id: null,
  recipe_engine_id: null,
  build_pipeline_id: null,
  step_results: [],
  total_steps: 0,
  built_steps: 0,
  failed_steps: 0,
  verification_valid: false,
  verification_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: ['FINAL_VERIFIER_BLOCKED_INPUT'],
};

const FINAL_VERIFIER_BLOCKED_VERIFICATION = {
  schema_version: 'v205.0',
  final_verifier_id: null,
  contract_id: null,
  scope_inspector_id: null,
  recipe_engine_id: null,
  build_pipeline_id: null,
  step_results: [],
  total_steps: 0,
  built_steps: 0,
  failed_steps: 0,
  verification_valid: false,
  verification_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: ['FINAL_VERIFIER_BLOCKED_VERIFICATION'],
};

function id() {
  return 'verify-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...FINAL_VERIFIER_BLOCKED_INPUT };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    const r = { ...FINAL_VERIFIER_BLOCKED_INPUT };
    r.errors = ['FINAL_VERIFIER_BLOCKED_INPUT: missing contract_id'];
    return r;
  }
  if (!input.scope_inspector_id || typeof input.scope_inspector_id !== 'string') {
    const r = { ...FINAL_VERIFIER_BLOCKED_INPUT };
    r.errors = ['FINAL_VERIFIER_BLOCKED_INPUT: missing scope_inspector_id'];
    return r;
  }
  if (!input.recipe_engine_id || typeof input.recipe_engine_id !== 'string') {
    const r = { ...FINAL_VERIFIER_BLOCKED_INPUT };
    r.errors = ['FINAL_VERIFIER_BLOCKED_INPUT: missing recipe_engine_id'];
    return r;
  }
  if (!input.build_pipeline_id || typeof input.build_pipeline_id !== 'string') {
    const r = { ...FINAL_VERIFIER_BLOCKED_INPUT };
    r.errors = ['FINAL_VERIFIER_BLOCKED_INPUT: missing build_pipeline_id'];
    return r;
  }
  if (!Array.isArray(input.step_results) || input.step_results.length === 0) {
    const r = { ...FINAL_VERIFIER_BLOCKED_VERIFICATION };
    r.contract_id = input.contract_id;
    r.scope_inspector_id = input.scope_inspector_id;
    r.recipe_engine_id = input.recipe_engine_id;
    r.build_pipeline_id = input.build_pipeline_id;
    r.errors = ['FINAL_VERIFIER_BLOCKED_VERIFICATION: must provide at least one step_result'];
    return r;
  }

  const blockedVerification = { ...FINAL_VERIFIER_BLOCKED_VERIFICATION };
  blockedVerification.contract_id = input.contract_id;
  blockedVerification.scope_inspector_id = input.scope_inspector_id;
  blockedVerification.recipe_engine_id = input.recipe_engine_id;
  blockedVerification.build_pipeline_id = input.build_pipeline_id;

  const validatedResults = [];
  const resultErrors = [];
  let builtCount = 0;
  let failedCount = 0;

  for (let i = 0; i < input.step_results.length; i++) {
    const s = input.step_results[i];

    if (!s || typeof s !== 'object') {
      resultErrors.push(`step_result[${i}]: invalid step result object`);
      continue;
    }
    if (!s.file_path || typeof s.file_path !== 'string') {
      resultErrors.push(`step_result[${i}]: missing or invalid file_path`);
      continue;
    }
    if (!s.status || !['built', 'failed', 'skipped'].includes(s.status)) {
      resultErrors.push(`step_result[${i}]: invalid status (must be built, failed, or skipped)`);
      continue;
    }

    if (s.status === 'built') builtCount++;
    if (s.status === 'failed') failedCount++;

    validatedResults.push({
      file_path: s.file_path,
      status: s.status,
    });
  }

  if (resultErrors.length > 0) {
    blockedVerification.step_results = validatedResults;
    blockedVerification.total_steps = validatedResults.length;
    blockedVerification.built_steps = builtCount;
    blockedVerification.failed_steps = failedCount;
    blockedVerification.errors = ['FINAL_VERIFIER_BLOCKED_VERIFICATION: result validation failed', ...resultErrors];
    return blockedVerification;
  }

  if (failedCount > 0) {
    const failResult = {
      ...FINAL_VERIFIER_BLOCKED_VERIFICATION,
      schema_version: 'v205.0',
      final_verifier_id: id(),
      contract_id: input.contract_id,
      scope_inspector_id: input.scope_inspector_id,
      recipe_engine_id: input.recipe_engine_id,
      build_pipeline_id: input.build_pipeline_id,
      step_results: validatedResults,
      total_steps: validatedResults.length,
      built_steps: builtCount,
      failed_steps: failedCount,
      verification_valid: false,
      errors: ['FINAL_VERIFIER_FAIL: some steps failed verification'],
    };
    return failResult;
  }

  const hashContent = validatedResults.map(s => `${s.file_path}:${s.status}`).join('|');
  const verification_hash = createHash('sha256').update(hashContent).digest('hex');

  const result = {
    schema_version: 'v205.0',
    final_verifier_id: id(),
    contract_id: input.contract_id,
    scope_inspector_id: input.scope_inspector_id,
    recipe_engine_id: input.recipe_engine_id,
    build_pipeline_id: input.build_pipeline_id,
    step_results: validatedResults,
    total_steps: validatedResults.length,
    built_steps: builtCount,
    failed_steps: 0,
    verification_valid: true,
    verification_hash,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    real_execution_allowed: false,
    errors: [],
  };

  return result;
}

export function validate(verifier) {
  if (!verifier || typeof verifier !== 'object') {
    return { valid: false, errors: ['invalid final verifier'] };
  }
  const errors = [];
  if (!verifier.final_verifier_id) errors.push('missing final_verifier_id');
  if (!verifier.contract_id) errors.push('missing contract_id');
  if (!verifier.scope_inspector_id) errors.push('missing scope_inspector_id');
  if (!verifier.recipe_engine_id) errors.push('missing recipe_engine_id');
  if (!verifier.build_pipeline_id) errors.push('missing build_pipeline_id');
  if (!Array.isArray(verifier.step_results)) errors.push('step_results must be array');
  if (typeof verifier.verification_valid !== 'boolean') errors.push('verification_valid must be boolean');
  if (typeof verifier.total_steps !== 'number') errors.push('total_steps must be number');
  if (typeof verifier.built_steps !== 'number') errors.push('built_steps must be number');
  if (typeof verifier.failed_steps !== 'number') errors.push('failed_steps must be number');
  if (verifier.verification_valid && !verifier.verification_hash) errors.push('verification_hash required when valid');
  if (verifier.release_allowed !== false) errors.push('release_allowed must be false');
  if (verifier.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (verifier.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (verifier.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (verifier.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(verifier) {
  if (!verifier || typeof verifier !== 'object') {
    return 'FINAL_VERIFIER_BLOCKED_INPUT';
  }

  let status;
  if (verifier.verification_valid) {
    status = 'FINAL_VERIFIER_READY';
  } else if (verifier.errors && verifier.errors.some(e => e.startsWith('FINAL_VERIFIER_FAIL'))) {
    status = 'FINAL_VERIFIER_FAIL';
  } else if (verifier.errors && verifier.errors.some(e => e.startsWith('FINAL_VERIFIER_BLOCKED_VERIFICATION'))) {
    status = 'FINAL_VERIFIER_BLOCKED_VERIFICATION';
  } else {
    status = 'FINAL_VERIFIER_BLOCKED_INPUT';
  }

  let out = `=== ${status} ===\n`;
  out += `final_verifier_id: ${verifier.final_verifier_id || '(none)'}\n`;
  out += `contract_id: ${verifier.contract_id || '(none)'}\n`;
  out += `total_steps: ${verifier.total_steps || 0}\n`;
  out += `built_steps: ${verifier.built_steps || 0}\n`;
  out += `failed_steps: ${verifier.failed_steps || 0}\n`;
  out += `verification_valid: ${verifier.verification_valid}\n`;
  if (verifier.verification_hash) {
    out += `verification_hash: ${verifier.verification_hash}\n`;
  }
  if (verifier.step_results && verifier.step_results.length > 0) {
    out += 'step_results:\n';
    for (const s of verifier.step_results) {
      out += `  [${s.status}] ${s.file_path}\n`;
    }
  }
  out += `release_allowed: ${verifier.release_allowed}\n`;
  out += `deploy_allowed: ${verifier.deploy_allowed}\n`;
  out += `stable_allowed: ${verifier.stable_allowed}\n`;
  out += `tag_allowed: ${verifier.tag_allowed}\n`;
  out += `real_execution_allowed: ${verifier.real_execution_allowed}\n`;
  out += 'REGRA ABSOLUTA: todas as flags permanecem false ate ordem explicita do contrato V201\n';
  if (verifier.errors && verifier.errors.length > 0) {
    out += `errors: ${verifier.errors.join('; ')}\n`;
  }
  return out;
}
