import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RUNTIME_MISSION_EVIDENCE_RECEIPT_STATUSES = [
  'RUNTIME_MISSION_EVIDENCE_BLOCKED_INPUT',
  'RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER',
  'RUNTIME_MISSION_EVIDENCE_FAIL',
  'RUNTIME_MISSION_EVIDENCE_READY',
];

const ALLOWED_EVIDENCE_TYPES = [
  'command_contract',
  'scope_binding',
  'context_builder',
  'plan_builder',
  'dry_run_controller',
  'approval_gate',
  'sandbox_executor',
  'result_verifier',
];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v283.0',
  receipt_id: null,
  runtime_mission_evidence_receipt_ready: false,
  evidence_entries_count: 0,
  evidence_level: null,
  receipt_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  runtime_execution_allowed: false,
  runtime_mission_executed: false,
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
    return { ...BASE, errors: ['RUNTIME_MISSION_EVIDENCE_BLOCKED_INPUT'] };
  }
  if (!input.receipt_id || typeof input.receipt_id !== 'string') {
    return { ...BASE, errors: ['RUNTIME_MISSION_EVIDENCE_BLOCKED_INPUT: missing receipt_id'] };
  }
  if (input.runtime_mission_result_verifier_ready !== true) {
    return { ...BASE, receipt_id: input.receipt_id, errors: ['RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER: runtime_mission_result_verifier_ready must be true'] };
  }
  if (!input.result_verifier_id || typeof input.result_verifier_id !== 'string') {
    return { ...BASE, receipt_id: input.receipt_id, errors: ['RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER: missing result_verifier_id'] };
  }
  if (input.evidence_level !== 'dry-run') {
    return { ...BASE, receipt_id: input.receipt_id, errors: ['RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER: evidence_level must be dry-run'] };
  }
  if (!Array.isArray(input.evidence_entries) || input.evidence_entries.length === 0) {
    return { ...BASE, receipt_id: input.receipt_id, errors: ['RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER: evidence_entries must be non-empty array'] };
  }

  const failErrors = [];
  for (let i = 0; i < input.evidence_entries.length; i++) {
    const entry = input.evidence_entries[i];
    if (!entry.evidence_type || !ALLOWED_EVIDENCE_TYPES.includes(entry.evidence_type)) {
      failErrors.push(`entry ${i}: invalid evidence_type`);
    }
    if (!entry.evidence_hash || !HEX64_RE.test(entry.evidence_hash)) {
      failErrors.push(`entry ${i}: evidence_hash must be 64 hex chars`);
    }
    if (!entry.description || typeof entry.description !== 'string') {
      failErrors.push(`entry ${i}: missing description`);
    }
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      receipt_id: input.receipt_id,
      errors: ['RUNTIME_MISSION_EVIDENCE_FAIL: ' + failErrors.join('; ')],
    };
  }

  const rId = input.receipt_id;
  const receiptHash = hash({
    rId,
    verifier: input.result_verifier_id,
    entries: input.evidence_entries,
    level: input.evidence_level,
  });

  return {
    ...BASE,
    receipt_id: rId,
    runtime_mission_evidence_receipt_ready: true,
    evidence_entries_count: input.evidence_entries.length,
    evidence_level: input.evidence_level,
    receipt_hash: receiptHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid runtime mission evidence receipt'] };
  }
  const errors = [];
  if (!result.receipt_id) errors.push('missing receipt_id');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.runtime_execution_allowed !== false) errors.push('runtime_execution_allowed must be false');
  if (result.runtime_mission_executed !== false) errors.push('runtime_mission_executed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (result.real_patch_applied !== false) errors.push('real_patch_applied must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'RUNTIME_MISSION_EVIDENCE_BLOCKED_INPUT';
  }
  const status = result.runtime_mission_evidence_receipt_ready ? 'RUNTIME_MISSION_EVIDENCE_READY' :
    result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER'))
      ? 'RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER' :
      result.errors && result.errors.some(e => e.startsWith('RUNTIME_MISSION_EVIDENCE_FAIL'))
        ? 'RUNTIME_MISSION_EVIDENCE_FAIL' : 'RUNTIME_MISSION_EVIDENCE_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `receipt_id: ${result.receipt_id || '(none)'}\n`;
  out += `runtime_mission_evidence_receipt_ready: ${result.runtime_mission_evidence_receipt_ready}\n`;
  out += `evidence_entries_count: ${result.evidence_entries_count}\n`;
  out += `evidence_level: ${result.evidence_level || '(none)'}\n`;
  if (result.receipt_hash) out += `receipt_hash: ${result.receipt_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `runtime_execution_allowed: ${result.runtime_execution_allowed}\n`;
  out += `runtime_mission_executed: ${result.runtime_mission_executed}\n`;
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
