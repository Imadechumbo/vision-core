export const SOFTWARE_FACTORY_SCOPE_INSPECTOR_STATUSES = [
  'SCOPE_INSPECTOR_BLOCKED_INPUT',
  'SCOPE_INSPECTOR_BLOCKED_SCOPE',
  'SCOPE_INSPECTOR_READY',
];

const SCOPE_INSPECTOR_BLOCKED_INPUT = {
  schema_version: 'v202.0',
  scope_inspector_id: null,
  contract_id: null,
  proposed_changes: null,
  scope_valid: false,
  allowed_files: [],
  forbidden_files: [],
  matched_allowed: [],
  matched_forbidden: [],
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: ['SCOPE_INSPECTOR_BLOCKED_INPUT'],
};

const SCOPE_INSPECTOR_BLOCKED_SCOPE = {
  schema_version: 'v202.0',
  scope_inspector_id: null,
  contract_id: null,
  proposed_changes: [],
  scope_valid: false,
  allowed_files: [],
  forbidden_files: [],
  matched_allowed: [],
  matched_forbidden: [],
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: ['SCOPE_INSPECTOR_BLOCKED_SCOPE'],
};

function id() {
  return 'scope-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function matches(test, pattern) {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return test.startsWith(prefix);
  }
  return test === pattern;
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...SCOPE_INSPECTOR_BLOCKED_INPUT };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    const r = { ...SCOPE_INSPECTOR_BLOCKED_INPUT };
    r.errors = ['SCOPE_INSPECTOR_BLOCKED_INPUT: missing contract_id'];
    return r;
  }
  if (!Array.isArray(input.proposed_changes)) {
    const r = { ...SCOPE_INSPECTOR_BLOCKED_INPUT };
    r.errors = ['SCOPE_INSPECTOR_BLOCKED_INPUT: proposed_changes must be array'];
    return r;
  }
  if (!input.allowed_files || !Array.isArray(input.allowed_files) || input.allowed_files.length === 0) {
    const r = { ...SCOPE_INSPECTOR_BLOCKED_SCOPE };
    r.contract_id = input.contract_id;
    r.errors = ['SCOPE_INSPECTOR_BLOCKED_SCOPE: must provide at least one allowed_file'];
    return r;
  }
  if (!input.forbidden_files || !Array.isArray(input.forbidden_files)) {
    input.forbidden_files = [];
  }

  const matched_allowed = [];
  const matched_forbidden = [];

  for (const change of input.proposed_changes) {
    let matched = false;

    for (const pattern of input.forbidden_files) {
      if (matches(change, pattern)) {
        matched_forbidden.push({ file: change, matched_by: pattern });
        matched = true;
        break;
      }
    }

    if (!matched) {
      for (const pattern of input.allowed_files) {
        if (matches(change, pattern)) {
          matched_allowed.push({ file: change, matched_by: pattern });
          matched = true;
          break;
        }
      }

      if (!matched) {
        matched_forbidden.push({ file: change, matched_by: null });
      }
    }
  }

  const scope_valid = matched_forbidden.length === 0;

  const result = {
    schema_version: 'v202.0',
    scope_inspector_id: id(),
    contract_id: input.contract_id,
    proposed_changes: [...input.proposed_changes],
    scope_valid,
    allowed_files: [...input.allowed_files],
    forbidden_files: [...input.forbidden_files],
    matched_allowed: [...matched_allowed],
    matched_forbidden: [...matched_forbidden],
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    real_execution_allowed: false,
    errors: [],
  };

  if (!scope_valid) {
    result.errors = ['SCOPE_INSPECTOR_BLOCKED_SCOPE: changes touch forbidden files'];
    result.schema_version = 'v202.0';
    return result;
  }

  return result;
}

export function validate(inspector) {
  if (!inspector || typeof inspector !== 'object') {
    return { valid: false, errors: ['invalid inspector'] };
  }
  const errors = [];
  if (!inspector.scope_inspector_id) errors.push('missing scope_inspector_id');
  if (!inspector.contract_id) errors.push('missing contract_id');
  if (!Array.isArray(inspector.proposed_changes)) errors.push('proposed_changes must be array');
  if (typeof inspector.scope_valid !== 'boolean') errors.push('scope_valid must be boolean');
  if (!inspector.scope_valid && inspector.errors.length === 0) errors.push('blocked inspector must have errors');
  if (inspector.release_allowed !== false) errors.push('release_allowed must be false');
  if (inspector.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (inspector.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (inspector.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (inspector.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(inspector) {
  if (!inspector || typeof inspector !== 'object') {
    return 'SCOPE_INSPECTOR_BLOCKED_INPUT';
  }
  const status = inspector.scope_valid ? 'SCOPE_INSPECTOR_READY' :
    inspector.errors.includes('SCOPE_INSPECTOR_BLOCKED_SCOPE') || inspector.errors.some(e => e.startsWith('SCOPE_INSPECTOR_BLOCKED_SCOPE'))
      ? 'SCOPE_INSPECTOR_BLOCKED_SCOPE' : 'SCOPE_INSPECTOR_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `scope_inspector_id: ${inspector.scope_inspector_id || '(none)'}\n`;
  out += `contract_id: ${inspector.contract_id || '(none)'}\n`;
  if (inspector.proposed_changes) {
    out += `proposed_changes (${inspector.proposed_changes.length}): ${inspector.proposed_changes.join(', ')}\n`;
  }
  out += `scope_valid: ${inspector.scope_valid}\n`;
  out += `matched_allowed: ${inspector.matched_allowed ? inspector.matched_allowed.length : 0}\n`;
  if (inspector.matched_allowed && inspector.matched_allowed.length > 0) {
    for (const m of inspector.matched_allowed) {
      out += `  + ${m.file} (matched: ${m.matched_by})\n`;
    }
  }
  out += `matched_forbidden: ${inspector.matched_forbidden ? inspector.matched_forbidden.length : 0}\n`;
  if (inspector.matched_forbidden && inspector.matched_forbidden.length > 0) {
    for (const m of inspector.matched_forbidden) {
      out += `  X ${m.file} (matched: ${m.matched_by || 'no pattern'})\n`;
    }
  }
  out += `release_allowed: ${inspector.release_allowed}\n`;
  out += `deploy_allowed: ${inspector.deploy_allowed}\n`;
  out += `stable_allowed: ${inspector.stable_allowed}\n`;
  out += `tag_allowed: ${inspector.tag_allowed}\n`;
  out += `real_execution_allowed: ${inspector.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: todas as flags permanecem false at� ordem expl�cita do contrato V201\n`;
  if (inspector.errors && inspector.errors.length > 0) {
    out += `errors: ${inspector.errors.join('; ')}\n`;
  }
  return out;
}
