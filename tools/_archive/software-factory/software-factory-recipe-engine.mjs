import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RECIPE_ENGINE_STATUSES = [
  'RECIPE_ENGINE_BLOCKED_INPUT',
  'RECIPE_ENGINE_BLOCKED_SCOPE',
  'RECIPE_ENGINE_BLOCKED_RECIPE',
  'RECIPE_ENGINE_READY',
];

const RECIPE_ENGINE_BLOCKED_INPUT = {
  schema_version: 'v203.0',
  recipe_engine_id: null,
  contract_id: null,
  scope_inspector_id: null,
  recipes: [],
  recipe_count: 0,
  recipe_valid: false,
  recipe_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: ['RECIPE_ENGINE_BLOCKED_INPUT'],
};

const RECIPE_ENGINE_BLOCKED_RECIPE = {
  schema_version: 'v203.0',
  recipe_engine_id: null,
  contract_id: null,
  scope_inspector_id: null,
  recipes: [],
  recipe_count: 0,
  recipe_valid: false,
  recipe_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: ['RECIPE_ENGINE_BLOCKED_RECIPE'],
};

const VALID_OPS = ['create_file', 'modify_file', 'delete_file', 'rename_file', 'create_directory'];

function id() {
  return 'recipe-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...RECIPE_ENGINE_BLOCKED_INPUT };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    const r = { ...RECIPE_ENGINE_BLOCKED_INPUT };
    r.errors = ['RECIPE_ENGINE_BLOCKED_INPUT: missing contract_id'];
    return r;
  }
  if (!input.scope_inspector_id || typeof input.scope_inspector_id !== 'string') {
    const r = { ...RECIPE_ENGINE_BLOCKED_INPUT };
    r.errors = ['RECIPE_ENGINE_BLOCKED_INPUT: missing scope_inspector_id'];
    return r;
  }
  if (!Array.isArray(input.recipes) || input.recipes.length === 0) {
    const r = { ...RECIPE_ENGINE_BLOCKED_RECIPE };
    r.contract_id = input.contract_id;
    r.scope_inspector_id = input.scope_inspector_id;
    r.recipe_valid = false;
    r.errors = ['RECIPE_ENGINE_BLOCKED_RECIPE: must provide at least one recipe'];
    return r;
  }

  const blockedScope = { ...RECIPE_ENGINE_BLOCKED_RECIPE };
  blockedScope.contract_id = input.contract_id;
  blockedScope.scope_inspector_id = input.scope_inspector_id;
  blockedScope.recipe_valid = false;

  const validated = [];
  const recipeErrors = [];

  for (let i = 0; i < input.recipes.length; i++) {
    const r = input.recipes[i];

    if (!r || typeof r !== 'object') {
      recipeErrors.push(`recipe[${i}]: invalid recipe object`);
      continue;
    }
    if (!r.op || !VALID_OPS.includes(r.op)) {
      recipeErrors.push(`recipe[${i}]: invalid or missing op (must be one of: ${VALID_OPS.join(', ')})`);
      continue;
    }
    if (!r.file_path || typeof r.file_path !== 'string') {
      recipeErrors.push(`recipe[${i}]: missing or invalid file_path`);
      continue;
    }
    if (!r.description || typeof r.description !== 'string') {
      recipeErrors.push(`recipe[${i}]: missing or invalid description`);
      continue;
    }

    validated.push({
      op: r.op,
      file_path: r.file_path,
      description: r.description,
    });
  }

  if (recipeErrors.length > 0) {
    blockedScope.recipes = validated;
    blockedScope.recipe_count = validated.length;
    blockedScope.errors = ['RECIPE_ENGINE_BLOCKED_RECIPE: recipe validation failed', ...recipeErrors];
    return blockedScope;
  }

  const recipe_hash = hashRecipes(validated);

  const result = {
    schema_version: 'v203.0',
    recipe_engine_id: id(),
    contract_id: input.contract_id,
    scope_inspector_id: input.scope_inspector_id,
    recipes: validated,
    recipe_count: validated.length,
    recipe_valid: true,
    recipe_hash,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    real_execution_allowed: false,
    errors: [],
  };

  return result;
}

function hashRecipes(recipes) {
  const normalised = recipes.map(r => ({ op: r.op, file_path: r.file_path, description: r.description }));
  const str = JSON.stringify(normalised);
  return createHash('sha256').update(str).digest('hex');
}

export function validate(engine) {
  if (!engine || typeof engine !== 'object') {
    return { valid: false, errors: ['invalid recipe engine'] };
  }
  const errors = [];
  if (!engine.recipe_engine_id) errors.push('missing recipe_engine_id');
  if (!engine.contract_id) errors.push('missing contract_id');
  if (!engine.scope_inspector_id) errors.push('missing scope_inspector_id');
  if (!Array.isArray(engine.recipes)) errors.push('recipes must be array');
  if (typeof engine.recipe_valid !== 'boolean') errors.push('recipe_valid must be boolean');
  if (engine.recipe_valid && engine.recipe_hash && typeof engine.recipe_hash !== 'string') errors.push('recipe_hash must be string');
  if (engine.release_allowed !== false) errors.push('release_allowed must be false');
  if (engine.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (engine.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (engine.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (engine.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(engine) {
  if (!engine || typeof engine !== 'object') {
    return 'RECIPE_ENGINE_BLOCKED_INPUT';
  }
  const status = engine.recipe_valid ? 'RECIPE_ENGINE_READY' :
    engine.errors && engine.errors.some(e => e.startsWith('RECIPE_ENGINE_BLOCKED_RECIPE'))
      ? 'RECIPE_ENGINE_BLOCKED_RECIPE' : 'RECIPE_ENGINE_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `recipe_engine_id: ${engine.recipe_engine_id || '(none)'}\n`;
  out += `contract_id: ${engine.contract_id || '(none)'}\n`;
  out += `scope_inspector_id: ${engine.scope_inspector_id || '(none)'}\n`;
  out += `recipe_count: ${engine.recipe_count || 0}\n`;
  out += `recipe_valid: ${engine.recipe_valid}\n`;
  if (engine.recipe_hash) {
    out += `recipe_hash: ${engine.recipe_hash}\n`;
  }
  if (engine.recipes && engine.recipes.length > 0) {
    out += 'recipes:\n';
    for (const r of engine.recipes) {
      out += `  [${r.op}] ${r.file_path}: ${r.description}\n`;
    }
  }
  out += `release_allowed: ${engine.release_allowed}\n`;
  out += `deploy_allowed: ${engine.deploy_allowed}\n`;
  out += `stable_allowed: ${engine.stable_allowed}\n`;
  out += `tag_allowed: ${engine.tag_allowed}\n`;
  out += `real_execution_allowed: ${engine.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: todas as flags permanecem false at� ordem expl�cita do contrato V201\n`;
  if (engine.errors && engine.errors.length > 0) {
    out += `errors: ${engine.errors.join('; ')}\n`;
  }
  return out;
}
