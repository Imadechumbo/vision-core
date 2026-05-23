import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_DEPLOYMENT_DRY_RUN_PLAN_STATUSES = [
  'DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_INPUT',
  'DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_ARTIFACT',
  'DEPLOYMENT_DRY_RUN_PLAN_FAIL',
  'DEPLOYMENT_DRY_RUN_PLAN_READY',
];

const ALLOWED_STEP_TYPES = ['deployment_preview','release_preview','tag_preview','stable_preview','production_preview','artifact_preview','rollback_preview','evidence_preview','audit_preview','blocker_preview'];
const ALLOWED_STEP_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_DRY_RUN_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_DRY_RUN_CONTROLS = ['no-production-touch','no-real-deploy','no-real-release','no-tag-create','no-stable-promotion','no-artifact-publish','no-network','no-filesystem-write','rollback-required','evidence-required','pass-gold-required','audit-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v338.0', deployment_dry_run_plan_id: null, deployment_dry_run_plan_ready: false,
  dry_run_steps_count: 0, required_dry_run_controls_count: 0, dry_run_level: null, deployment_dry_run_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_INPUT'] };
  if (!input.deployment_dry_run_plan_id || typeof input.deployment_dry_run_plan_id !== 'string') return { ...BASE, errors: ['DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_INPUT: missing deployment_dry_run_plan_id'] };
  if (input.release_artifact_evidence_binder_ready !== true) return { ...BASE, deployment_dry_run_plan_id: input.deployment_dry_run_plan_id, errors: ['DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_ARTIFACT: release_artifact_evidence_binder_ready must be true'] };
  if (!input.release_artifact_evidence_binder_id || typeof input.release_artifact_evidence_binder_id !== 'string') return { ...BASE, deployment_dry_run_plan_id: input.deployment_dry_run_plan_id, errors: ['DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_ARTIFACT: missing release_artifact_evidence_binder_id'] };
  if (!Array.isArray(input.dry_run_steps) || input.dry_run_steps.length === 0) return { ...BASE, deployment_dry_run_plan_id: input.deployment_dry_run_plan_id, errors: ['DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_ARTIFACT: dry_run_steps must be non-empty array'] };
  if (!input.dry_run_level || !ALLOWED_DRY_RUN_LEVELS.includes(input.dry_run_level)) return { ...BASE, deployment_dry_run_plan_id: input.deployment_dry_run_plan_id, errors: ['DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_ARTIFACT: invalid dry_run_level'] };

  const fE = [];
  for (let i = 0; i < input.dry_run_steps.length; i++) {
    const s = input.dry_run_steps[i];
    if (!s.step_id || typeof s.step_id !== 'string') fE.push(`step ${i}: missing step_id`);
    if (!s.step_type || !ALLOWED_STEP_TYPES.includes(s.step_type)) fE.push(`step ${i}: invalid step_type`);
    if (!s.step_mode || !ALLOWED_STEP_MODES.includes(s.step_mode)) fE.push(`step ${i}: invalid step_mode`);
    if (!s.step_hash || !HEX64_RE.test(s.step_hash)) fE.push(`step ${i}: step_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, deployment_dry_run_plan_id: input.deployment_dry_run_plan_id, errors: ['DEPLOYMENT_DRY_RUN_PLAN_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_dry_run_controls) ? input.required_dry_run_controls : REQUIRED_DRY_RUN_CONTROLS;
  const missingControls = REQUIRED_DRY_RUN_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, deployment_dry_run_plan_id: input.deployment_dry_run_plan_id, dry_run_steps_count: input.dry_run_steps.length, errors: ['DEPLOYMENT_DRY_RUN_PLAN_FAIL: missing required dry-run controls: ' + missingControls.join(', ')] };

  const argId = input.deployment_dry_run_plan_id;
  const h = hash({ argId, artifact: input.release_artifact_evidence_binder_id, steps: input.dry_run_steps, controls: reqControls, level: input.dry_run_level });
  return { ...BASE, deployment_dry_run_plan_id: argId, deployment_dry_run_plan_ready: true, dry_run_steps_count: input.dry_run_steps.length, required_dry_run_controls_count: reqControls.length, dry_run_level: input.dry_run_level, deployment_dry_run_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid deployment dry-run plan'] };
  const e = []; if (!result.deployment_dry_run_plan_id) e.push('missing deployment_dry_run_plan_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_INPUT';
  const status = result.deployment_dry_run_plan_ready ? 'DEPLOYMENT_DRY_RUN_PLAN_READY' :
    result.errors?.some(e => e.startsWith('DEPLOYMENT_DRY_RUN_PLAN_FAIL')) ? 'DEPLOYMENT_DRY_RUN_PLAN_FAIL' :
    result.errors?.some(e => e.startsWith('DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_ARTIFACT')) ? 'DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_ARTIFACT' : 'DEPLOYMENT_DRY_RUN_PLAN_BLOCKED_INPUT';
  let out = `=== ${status} ===\ndeployment_dry_run_plan_id: ${result.deployment_dry_run_plan_id || '(none)'}\ndeployment_dry_run_plan_ready: ${result.deployment_dry_run_plan_ready}\ndry_run_steps_count: ${result.dry_run_steps_count}\nrequired_dry_run_controls_count: ${result.required_dry_run_controls_count}\ndry_run_level: ${result.dry_run_level || '(none)'}\n`;
  if (result.deployment_dry_run_hash) out += `deployment_dry_run_hash: ${result.deployment_dry_run_hash}\n`;
  ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}