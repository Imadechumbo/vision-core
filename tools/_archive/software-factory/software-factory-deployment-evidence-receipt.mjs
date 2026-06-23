import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_DEPLOYMENT_EVIDENCE_RECEIPT_STATUSES = [
  'DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  'DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_APPROVAL',
  'DEPLOYMENT_EVIDENCE_RECEIPT_FAIL',
  'DEPLOYMENT_EVIDENCE_RECEIPT_READY',
];

const ALLOWED_EVIDENCE_TYPES = ['release_command','deployment_scope','artifact_evidence','deployment_dry_run','release_readiness_gate','release_approval_binding','pass_gold_status','rollback_requirement','audit_record','blocker_record','tag_blocker','stable_blocker','production_blocker'];
const ALLOWED_EVIDENCE_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_RECEIPT_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_EVIDENCE_TYPES = ['release_command','deployment_scope','artifact_evidence','deployment_dry_run','release_readiness_gate','release_approval_binding','pass_gold_status','rollback_requirement','audit_record','blocker_record','tag_blocker','stable_blocker','production_blocker'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v341.0', deployment_evidence_receipt_id: null, deployment_evidence_receipt_ready: false,
  evidence_entries_count: 0, required_evidence_types_count: 0, receipt_level: null, deployment_evidence_receipt_hash: null,
  release_execution_allowed: false, deployment_execution_allowed: false, deployment_scope_bound: false,
  release_artifact_published: false, deployment_dry_run_completed: false, release_execution_ready: false,
  release_execution_approved: false, deployment_evidence_published: false, release_rollback_bound: false,
  release_authority_granted: false, release_execution_phase_passed: false,
  product_activation_execution_allowed: false, production_touch_allowed: false, activation_execution_phase_passed: false,
  product_activation_allowed: false, saas_enablement_allowed: false,
  saas_enabled: false, billing_executed: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false, real_patch_applied: false, production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_INPUT'] };
  if (!input.deployment_evidence_receipt_id || typeof input.deployment_evidence_receipt_id !== 'string') return { ...BASE, errors: ['DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_INPUT: missing deployment_evidence_receipt_id'] };
  if (input.release_approval_binding_ready !== true) return { ...BASE, deployment_evidence_receipt_id: input.deployment_evidence_receipt_id, errors: ['DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_APPROVAL: release_approval_binding_ready must be true'] };
  if (!input.release_approval_binding_id || typeof input.release_approval_binding_id !== 'string') return { ...BASE, deployment_evidence_receipt_id: input.deployment_evidence_receipt_id, errors: ['DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_APPROVAL: missing release_approval_binding_id'] };
  if (!Array.isArray(input.evidence_entries) || input.evidence_entries.length === 0) return { ...BASE, deployment_evidence_receipt_id: input.deployment_evidence_receipt_id, errors: ['DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_APPROVAL: evidence_entries must be non-empty array'] };
  if (!input.receipt_level || !ALLOWED_RECEIPT_LEVELS.includes(input.receipt_level)) return { ...BASE, deployment_evidence_receipt_id: input.deployment_evidence_receipt_id, errors: ['DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_APPROVAL: invalid receipt_level'] };

  const fE = [];
  for (let i = 0; i < input.evidence_entries.length; i++) {
    const s = input.evidence_entries[i];
    if (!s.evidence_id || typeof s.evidence_id !== 'string') fE.push(`evidence ${i}: missing evidence_id`);
    if (!s.evidence_type || !ALLOWED_EVIDENCE_TYPES.includes(s.evidence_type)) fE.push(`evidence ${i}: invalid evidence_type`);
    if (!s.evidence_mode || !ALLOWED_EVIDENCE_MODES.includes(s.evidence_mode)) fE.push(`evidence ${i}: invalid evidence_mode`);
    if (!s.evidence_hash || !HEX64_RE.test(s.evidence_hash)) fE.push(`evidence ${i}: evidence_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, deployment_evidence_receipt_id: input.deployment_evidence_receipt_id, errors: ['DEPLOYMENT_EVIDENCE_RECEIPT_FAIL: ' + fE.join('; ')] };

  const reqTypes = Array.isArray(input.required_evidence_types) ? input.required_evidence_types : REQUIRED_EVIDENCE_TYPES;
  const missingTypes = REQUIRED_EVIDENCE_TYPES.filter(t => !reqTypes.includes(t));
  if (missingTypes.length > 0) return { ...BASE, deployment_evidence_receipt_id: input.deployment_evidence_receipt_id, evidence_entries_count: input.evidence_entries.length, errors: ['DEPLOYMENT_EVIDENCE_RECEIPT_FAIL: missing required evidence types: ' + missingTypes.join(', ')] };

  const argId = input.deployment_evidence_receipt_id;
  const h = hash({ argId, approval: input.release_approval_binding_id, entries: input.evidence_entries, types: reqTypes, level: input.receipt_level });
  return { ...BASE, deployment_evidence_receipt_id: argId, deployment_evidence_receipt_ready: true, evidence_entries_count: input.evidence_entries.length, required_evidence_types_count: reqTypes.length, receipt_level: input.receipt_level, deployment_evidence_receipt_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid deployment evidence receipt'] };
  const e = []; if (!result.deployment_evidence_receipt_id) e.push('missing deployment_evidence_receipt_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  const status = result.deployment_evidence_receipt_ready ? 'DEPLOYMENT_EVIDENCE_RECEIPT_READY' :
    result.errors?.some(e => e.startsWith('DEPLOYMENT_EVIDENCE_RECEIPT_FAIL')) ? 'DEPLOYMENT_EVIDENCE_RECEIPT_FAIL' :
    result.errors?.some(e => e.startsWith('DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_APPROVAL')) ? 'DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_APPROVAL' : 'DEPLOYMENT_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  let out = `=== ${status} ===\ndeployment_evidence_receipt_id: ${result.deployment_evidence_receipt_id || '(none)'}\ndeployment_evidence_receipt_ready: ${result.deployment_evidence_receipt_ready}\nevidence_entries_count: ${result.evidence_entries_count}\nrequired_evidence_types_count: ${result.required_evidence_types_count}\nreceipt_level: ${result.receipt_level || '(none)'}\n`;
  if (result.deployment_evidence_receipt_hash) out += `deployment_evidence_receipt_hash: ${result.deployment_evidence_receipt_hash}\n`;
  ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}