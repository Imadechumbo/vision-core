import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PATCH_DIFF_BINDER_STATUSES = [
  'PATCH_DIFF_BLOCKED_INPUT',
  'PATCH_DIFF_BLOCKED_CONTRACT',
  'PATCH_DIFF_READY',
];

const BASE = {
  schema_version: 'v226.0',
  binder_id: null,
  contract_id: null,
  audit_id: null,
  diffs: [],
  diff_count: 0,
  binder_ready: false,
  binder_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

const DEFAULT_DIFFS = [
  { index: 0, file: 'tools/software-factory/example.mjs', op: 'modify', diff_lines: 0, status: 'pending' },
  { index: 1, file: 'tools/tests/software-factory/example.test.mjs', op: 'modify', diff_lines: 0, status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PATCH_DIFF_BLOCKED_INPUT'] };
  }
  if (!input.binder_id || typeof input.binder_id !== 'string') {
    return { ...BASE, errors: ['PATCH_DIFF_BLOCKED_INPUT: missing binder_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['PATCH_DIFF_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.audit_id || typeof input.audit_id !== 'string') {
    return { ...BASE, errors: ['PATCH_DIFF_BLOCKED_INPUT: missing audit_id'] };
  }
  if (!input.patch_audit_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PATCH_DIFF_BLOCKED_CONTRACT: patch_audit not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PATCH_DIFF_BLOCKED_CONTRACT: scope not validated'] };
  }

  const rawDiffs = Array.isArray(input.diffs) && input.diffs.length > 0 ? input.diffs : DEFAULT_DIFFS;
  const diffs = rawDiffs.map((d, i) => ({
    index: i,
    file: typeof d === 'string' ? d : (d.file || `file_${i}`),
    op: d.op || 'modify',
    diff_lines: typeof d.diff_lines === 'number' ? d.diff_lines : 0,
    status: 'pending',
  }));

  const bid = input.binder_id;
  return {
    ...BASE,
    binder_id: bid,
    contract_id: input.contract_id,
    audit_id: input.audit_id,
    diffs,
    diff_count: diffs.length,
    binder_ready: true,
    binder_hash: hash({ bid, contract_id: input.contract_id, audit_id: input.audit_id }),
    errors: [],
  };
}

export function validate(binder) {
  if (!binder || !binder.binder_id) {
    return { valid: false, errors: ['PATCH_DIFF_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (binder.release_allowed !== false) errors.push('release_allowed must be false');
  if (binder.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (binder.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (binder.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (binder.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (binder.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (binder.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(binder) {
  if (!binder || !binder.binder_id) {
    return 'PATCH_DIFF_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_patch_execution_allowed=false production_touched=false';
  }
  let out = `=== Software Factory Patch Diff Binder ===\n`;
  out += `schema_version: ${binder.schema_version}\n`;
  out += `binder_id: ${binder.binder_id}\n`;
  out += `contract_id: ${binder.contract_id}\n`;
  out += `audit_id: ${binder.audit_id}\n`;
  out += `diff_count: ${binder.diff_count}\n`;
  out += `binder_ready: ${binder.binder_ready}\n`;
  out += `release_allowed: ${binder.release_allowed}\n`;
  out += `deploy_allowed: ${binder.deploy_allowed}\n`;
  out += `real_execution_allowed: ${binder.real_execution_allowed}\n`;
  out += `real_patch_execution_allowed: ${binder.real_patch_execution_allowed}\n`;
  out += `production_touched: ${binder.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
