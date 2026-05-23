import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_ROLLBACK_BINDER_STATUSES = [
  'RELEASE_ROLLBACK_BINDER_BLOCKED_INPUT',
  'RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE',
  'RELEASE_ROLLBACK_BINDER_FAIL',
  'RELEASE_ROLLBACK_BINDER_READY',
];

const ALLOWED_ROLLBACK_TYPES = ['code_rollback','config_rollback','artifact_rollback','deployment_rollback','release_rollback','tag_rollback','stable_rollback','production_rollback','infrastructure_rollback','database_rollback','evidence_rollback','audit_rollback','emergency_stop'];
const ALLOWED_ROLLBACK_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_ROLLBACK_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_ROLLBACK_CONTROLS = ['rollback-required','no-real-rollback','no-filesystem-write','no-database-write','no-network','no-secret-access','no-deploy','no-release','no-tag-create','no-stable-promotion','audit-required','evidence-required','human-approval-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v342.0', release_rollback_binder_id: null, release_rollback_binder_ready: false,
  rollback_items_count: 0, required_rollback_controls_count: 0, rollback_level: null, release_rollback_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_ROLLBACK_BINDER_BLOCKED_INPUT'] };
  if (!input.release_rollback_binder_id || typeof input.release_rollback_binder_id !== 'string') return { ...BASE, errors: ['RELEASE_ROLLBACK_BINDER_BLOCKED_INPUT: missing release_rollback_binder_id'] };
  if (input.deployment_evidence_receipt_ready !== true) return { ...BASE, release_rollback_binder_id: input.release_rollback_binder_id, errors: ['RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE: deployment_evidence_receipt_ready must be true'] };
  if (!input.deployment_evidence_receipt_id || typeof input.deployment_evidence_receipt_id !== 'string') return { ...BASE, release_rollback_binder_id: input.release_rollback_binder_id, errors: ['RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE: missing deployment_evidence_receipt_id'] };
  if (!Array.isArray(input.rollback_items) || input.rollback_items.length === 0) return { ...BASE, release_rollback_binder_id: input.release_rollback_binder_id, errors: ['RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE: rollback_items must be non-empty array'] };
  if (!input.rollback_level || !ALLOWED_ROLLBACK_LEVELS.includes(input.rollback_level)) return { ...BASE, release_rollback_binder_id: input.release_rollback_binder_id, errors: ['RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE: invalid rollback_level'] };

  const fE = [];
  for (let i = 0; i < input.rollback_items.length; i++) {
    const s = input.rollback_items[i];
    if (!s.rollback_id || typeof s.rollback_id !== 'string') fE.push(`item ${i}: missing rollback_id`);
    if (!s.rollback_type || !ALLOWED_ROLLBACK_TYPES.includes(s.rollback_type)) fE.push(`item ${i}: invalid rollback_type`);
    if (!s.rollback_mode || !ALLOWED_ROLLBACK_MODES.includes(s.rollback_mode)) fE.push(`item ${i}: invalid rollback_mode`);
    if (!s.rollback_hash || !HEX64_RE.test(s.rollback_hash)) fE.push(`item ${i}: rollback_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, release_rollback_binder_id: input.release_rollback_binder_id, errors: ['RELEASE_ROLLBACK_BINDER_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_rollback_controls) ? input.required_rollback_controls : REQUIRED_ROLLBACK_CONTROLS;
  const missingControls = REQUIRED_ROLLBACK_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, release_rollback_binder_id: input.release_rollback_binder_id, rollback_items_count: input.rollback_items.length, errors: ['RELEASE_ROLLBACK_BINDER_FAIL: missing required rollback controls: ' + missingControls.join(', ')] };

  const argId = input.release_rollback_binder_id;
  const h = hash({ argId, evidence: input.deployment_evidence_receipt_id, items: input.rollback_items, controls: reqControls, level: input.rollback_level });
  return { ...BASE, release_rollback_binder_id: argId, release_rollback_binder_ready: true, rollback_items_count: input.rollback_items.length, required_rollback_controls_count: reqControls.length, rollback_level: input.rollback_level, release_rollback_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release rollback binder'] };
  const e = []; if (!result.release_rollback_binder_id) e.push('missing release_rollback_binder_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_ROLLBACK_BINDER_BLOCKED_INPUT';
  const status = result.release_rollback_binder_ready ? 'RELEASE_ROLLBACK_BINDER_READY' :
    result.errors?.some(e => e.startsWith('RELEASE_ROLLBACK_BINDER_FAIL')) ? 'RELEASE_ROLLBACK_BINDER_FAIL' :
    result.errors?.some(e => e.startsWith('RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE')) ? 'RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE' : 'RELEASE_ROLLBACK_BINDER_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_rollback_binder_id: ${result.release_rollback_binder_id || '(none)'}\nrelease_rollback_binder_ready: ${result.release_rollback_binder_ready}\nrollback_items_count: ${result.rollback_items_count}\nrequired_rollback_controls_count: ${result.required_rollback_controls_count}\nrollback_level: ${result.rollback_level || '(none)'}\n`;
  if (result.release_rollback_hash) out += `release_rollback_hash: ${result.release_rollback_hash}\n`;
  ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}