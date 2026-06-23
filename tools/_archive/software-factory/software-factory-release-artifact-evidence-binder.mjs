import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_ARTIFACT_EVIDENCE_BINDER_STATUSES = [
  'RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_INPUT',
  'RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE',
  'RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL',
  'RELEASE_ARTIFACT_EVIDENCE_BINDER_READY',
];

const ALLOWED_ARTIFACT_TYPES = ['source_snapshot','build_manifest','test_report','syntax_report','pass_gold_status','deployment_plan','release_notes','rollback_plan','audit_record','blocker_record','artifact_digest'];
const ALLOWED_ARTIFACT_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_ARTIFACT_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_ARTIFACT_CONTROLS = ['no-artifact-publish','no-release-publish','no-tag-create','no-deploy','no-production-touch','rollback-required','evidence-required','pass-gold-required','human-approval-required','audit-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v337.0', release_artifact_evidence_binder_id: null, release_artifact_evidence_binder_ready: false,
  artifact_items_count: 0, required_artifact_controls_count: 0, artifact_level: null, release_artifact_evidence_hash: null,
  release_execution_allowed: false, deployment_execution_allowed: false, deployment_scope_bound: false,
  release_artifact_published: false, deployment_dry_run_completed: false, release_execution_ready: false,
  release_execution_approved: false, deployment_evidence_published: false, release_rollback_bound: false,
  release_authority_granted: false, release_execution_phase_passed: false,
  product_activation_execution_allowed: false, production_touch_allowed: false,
  activation_execution_phase_passed: false,
  product_activation_allowed: false, saas_enablement_allowed: false,
  saas_enabled: false, billing_executed: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false, real_patch_applied: false, production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_INPUT'] };
  if (!input.release_artifact_evidence_binder_id || typeof input.release_artifact_evidence_binder_id !== 'string') return { ...BASE, errors: ['RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_INPUT: missing release_artifact_evidence_binder_id'] };
  if (input.deployment_scope_boundary_contract_ready !== true) return { ...BASE, release_artifact_evidence_binder_id: input.release_artifact_evidence_binder_id, errors: ['RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE: deployment_scope_boundary_contract_ready must be true'] };
  if (!input.deployment_scope_boundary_id || typeof input.deployment_scope_boundary_id !== 'string') return { ...BASE, release_artifact_evidence_binder_id: input.release_artifact_evidence_binder_id, errors: ['RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE: missing deployment_scope_boundary_id'] };
  if (!Array.isArray(input.artifact_items) || input.artifact_items.length === 0) return { ...BASE, release_artifact_evidence_binder_id: input.release_artifact_evidence_binder_id, errors: ['RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE: artifact_items must be non-empty array'] };
  if (!input.artifact_level || !ALLOWED_ARTIFACT_LEVELS.includes(input.artifact_level)) return { ...BASE, release_artifact_evidence_binder_id: input.release_artifact_evidence_binder_id, errors: ['RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE: invalid artifact_level'] };

  const fE = [];
  for (let i = 0; i < input.artifact_items.length; i++) {
    const s = input.artifact_items[i];
    if (!s.artifact_id || typeof s.artifact_id !== 'string') fE.push(`item ${i}: missing artifact_id`);
    if (!s.artifact_type || !ALLOWED_ARTIFACT_TYPES.includes(s.artifact_type)) fE.push(`item ${i}: invalid artifact_type`);
    if (!s.artifact_mode || !ALLOWED_ARTIFACT_MODES.includes(s.artifact_mode)) fE.push(`item ${i}: invalid artifact_mode`);
    if (!s.artifact_hash || !HEX64_RE.test(s.artifact_hash)) fE.push(`item ${i}: artifact_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, release_artifact_evidence_binder_id: input.release_artifact_evidence_binder_id, errors: ['RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_artifact_controls) ? input.required_artifact_controls : REQUIRED_ARTIFACT_CONTROLS;
  const missingControls = REQUIRED_ARTIFACT_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, release_artifact_evidence_binder_id: input.release_artifact_evidence_binder_id, artifact_items_count: input.artifact_items.length, errors: ['RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL: missing required artifact controls: ' + missingControls.join(', ')] };

  const argId = input.release_artifact_evidence_binder_id;
  const h = hash({ argId, scope: input.deployment_scope_boundary_id, items: input.artifact_items, controls: reqControls, level: input.artifact_level });
  return { ...BASE, release_artifact_evidence_binder_id: argId, release_artifact_evidence_binder_ready: true, artifact_items_count: input.artifact_items.length, required_artifact_controls_count: reqControls.length, artifact_level: input.artifact_level, release_artifact_evidence_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release artifact evidence binder'] };
  const e = []; if (!result.release_artifact_evidence_binder_id) e.push('missing release_artifact_evidence_binder_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_INPUT';
  const status = result.release_artifact_evidence_binder_ready ? 'RELEASE_ARTIFACT_EVIDENCE_BINDER_READY' :
    result.errors?.some(e => e.startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL')) ? 'RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL' :
    result.errors?.some(e => e.startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE')) ? 'RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE' : 'RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_artifact_evidence_binder_id: ${result.release_artifact_evidence_binder_id || '(none)'}\nrelease_artifact_evidence_binder_ready: ${result.release_artifact_evidence_binder_ready}\nartifact_items_count: ${result.artifact_items_count}\nrequired_artifact_controls_count: ${result.required_artifact_controls_count}\nartifact_level: ${result.artifact_level || '(none)'}\n`;
  if (result.release_artifact_evidence_hash) out += `release_artifact_evidence_hash: ${result.release_artifact_evidence_hash}\n`;
  ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}