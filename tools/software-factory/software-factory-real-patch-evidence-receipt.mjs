import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_EVIDENCE_RECEIPT_STATUSES = [
  'REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  'REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_DRILL',
  'REAL_PATCH_EVIDENCE_RECEIPT_FAIL',
  'REAL_PATCH_EVIDENCE_RECEIPT_READY',
];

const ALLOWED_EVIDENCE_TYPES = [
  'command_contract',
  'scope_binding',
  'pre_state_snapshot',
  'apply_controller',
  'physical_apply_proof',
  'test_lane',
  'rollback_plan',
  'rollback_drill',
];

const HASH_HEX_PATTERN = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v273.0',
  receipt_id: null,
  real_patch_evidence_receipt_ready: false,
  evidence_entries_count: 0,
  evidence_level: null,
  receipt_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  real_patch_execution_allowed: false,
  real_patch_applied: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_INPUT'] };
  }
  if (!input.receipt_id || typeof input.receipt_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_INPUT: missing receipt_id'] };
  }
  if (input.real_patch_rollback_drill_ready !== true) {
    return { ...BASE, receipt_id: input.receipt_id, errors: ['REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_DRILL: rollback drill must be ready'] };
  }
  if (!Array.isArray(input.evidence_entries) || input.evidence_entries.length === 0) {
    return { ...BASE, receipt_id: input.receipt_id, errors: ['REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_DRILL: evidence_entries required and non-empty'] };
  }
  if (input.evidence_level !== 'dry-run') {
    return { ...BASE, receipt_id: input.receipt_id, errors: ['REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_DRILL: evidence_level must be dry-run'] };
  }

  const failErrors = [];
  for (const entry of input.evidence_entries) {
    if (!entry.evidence_type || typeof entry.evidence_type !== 'string') {
      failErrors.push('REAL_PATCH_EVIDENCE_RECEIPT_FAIL: entry missing evidence_type');
      continue;
    }
    if (!ALLOWED_EVIDENCE_TYPES.includes(entry.evidence_type)) {
      failErrors.push(`REAL_PATCH_EVIDENCE_RECEIPT_FAIL: invalid evidence_type: ${entry.evidence_type}`);
      continue;
    }
    if (!entry.evidence_hash || typeof entry.evidence_hash !== 'string') {
      failErrors.push(`REAL_PATCH_EVIDENCE_RECEIPT_FAIL: entry ${entry.evidence_type} missing evidence_hash`);
      continue;
    }
    if (!HASH_HEX_PATTERN.test(entry.evidence_hash)) {
      failErrors.push(`REAL_PATCH_EVIDENCE_RECEIPT_FAIL: entry ${entry.evidence_type} evidence_hash must be 64 hex chars`);
      continue;
    }
    if (!entry.description || typeof entry.description !== 'string') {
      failErrors.push(`REAL_PATCH_EVIDENCE_RECEIPT_FAIL: entry ${entry.evidence_type} missing description`);
    }
  }

  if (failErrors.length > 0) {
    return { ...BASE, receipt_id: input.receipt_id, errors: failErrors };
  }

  const receiptHash = hash({ receipt_id: input.receipt_id, evidence_entries: input.evidence_entries, evidence_level: input.evidence_level });

  return {
    ...BASE,
    receipt_id: input.receipt_id,
    real_patch_evidence_receipt_ready: true,
    evidence_entries_count: input.evidence_entries.length,
    evidence_level: 'dry-run',
    receipt_hash: receiptHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real patch evidence receipt'] };
  }
  const errors = [];
  if (!result.receipt_id) errors.push('missing receipt_id');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (result.real_patch_applied !== false) errors.push('real_patch_applied must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  }
  let status;
  if (result.real_patch_evidence_receipt_ready) {
    status = 'REAL_PATCH_EVIDENCE_RECEIPT_READY';
  } else if (result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_DRILL'))) {
    status = 'REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_DRILL';
  } else if (result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_EVIDENCE_RECEIPT_FAIL'))) {
    status = 'REAL_PATCH_EVIDENCE_RECEIPT_FAIL';
  } else {
    status = 'REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  }

  let out = `=== ${status} ===\n`;
  out += `receipt_id: ${result.receipt_id || '(none)'}\n`;
  out += `real_patch_evidence_receipt_ready: ${result.real_patch_evidence_receipt_ready}\n`;
  out += `evidence_entries_count: ${result.evidence_entries_count}\n`;
  out += `evidence_level: ${result.evidence_level || '(none)'}\n`;
  if (result.receipt_hash) out += `receipt_hash: ${result.receipt_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_patch_execution_allowed: ${result.real_patch_execution_allowed}\n`;
  out += `real_patch_applied: ${result.real_patch_applied}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
