import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_EXECUTION_READINESS_GATE_STATUSES = [
  'RELEASE_EXECUTION_READINESS_BLOCKED_INPUT',
  'RELEASE_EXECUTION_READINESS_BLOCKED_DRY_RUN',
  'RELEASE_EXECUTION_READINESS_FAIL',
  'RELEASE_EXECUTION_READINESS_READY',
];

const ALLOWED_READINESS_TYPES = ['release_command','deployment_scope','artifact_evidence','deployment_dry_run','rollback_requirement','evidence_requirement','audit_requirement','pass_gold_requirement','human_approval_requirement','deployment_blocker','release_blocker','tag_blocker','stable_blocker','production_blocker'];
const ALLOWED_READINESS_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_READINESS_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_READINESS_CONTROLS = ['no-production-touch','no-real-deploy','no-real-release','no-tag-create','no-stable-promotion','no-artifact-publish','rollback-required','evidence-required','audit-required','pass-gold-required','human-approval-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v339.0', release_execution_readiness_gate_id: null, release_execution_readiness_gate_ready: false,
  readiness_items_count: 0, required_readiness_controls_count: 0, readiness_level: null, release_execution_readiness_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_EXECUTION_READINESS_BLOCKED_INPUT'] };
  if (!input.release_execution_readiness_gate_id || typeof input.release_execution_readiness_gate_id !== 'string') return { ...BASE, errors: ['RELEASE_EXECUTION_READINESS_BLOCKED_INPUT: missing release_execution_readiness_gate_id'] };
  if (input.deployment_dry_run_plan_ready !== true) return { ...BASE, release_execution_readiness_gate_id: input.release_execution_readiness_gate_id, errors: ['RELEASE_EXECUTION_READINESS_BLOCKED_DRY_RUN: deployment_dry_run_plan_ready must be true'] };
  if (!input.deployment_dry_run_plan_id || typeof input.deployment_dry_run_plan_id !== 'string') return { ...BASE, release_execution_readiness_gate_id: input.release_execution_readiness_gate_id, errors: ['RELEASE_EXECUTION_READINESS_BLOCKED_DRY_RUN: missing deployment_dry_run_plan_id'] };
  if (!Array.isArray(input.readiness_items) || input.readiness_items.length === 0) return { ...BASE, release_execution_readiness_gate_id: input.release_execution_readiness_gate_id, errors: ['RELEASE_EXECUTION_READINESS_BLOCKED_DRY_RUN: readiness_items must be non-empty array'] };
  if (!input.readiness_level || !ALLOWED_READINESS_LEVELS.includes(input.readiness_level)) return { ...BASE, release_execution_readiness_gate_id: input.release_execution_readiness_gate_id, errors: ['RELEASE_EXECUTION_READINESS_BLOCKED_DRY_RUN: invalid readiness_level'] };

  const fE = [];
  for (let i = 0; i < input.readiness_items.length; i++) {
    const s = input.readiness_items[i];
    if (!s.readiness_id || typeof s.readiness_id !== 'string') fE.push(`item ${i}: missing readiness_id`);
    if (!s.readiness_type || !ALLOWED_READINESS_TYPES.includes(s.readiness_type)) fE.push(`item ${i}: invalid readiness_type`);
    if (!s.readiness_mode || !ALLOWED_READINESS_MODES.includes(s.readiness_mode)) fE.push(`item ${i}: invalid readiness_mode`);
    if (!s.readiness_hash || !HEX64_RE.test(s.readiness_hash)) fE.push(`item ${i}: readiness_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, release_execution_readiness_gate_id: input.release_execution_readiness_gate_id, errors: ['RELEASE_EXECUTION_READINESS_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_readiness_controls) ? input.required_readiness_controls : REQUIRED_READINESS_CONTROLS;
  const missingControls = REQUIRED_READINESS_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, release_execution_readiness_gate_id: input.release_execution_readiness_gate_id, readiness_items_count: input.readiness_items.length, errors: ['RELEASE_EXECUTION_READINESS_FAIL: missing required readiness controls: ' + missingControls.join(', ')] };

  const argId = input.release_execution_readiness_gate_id;
  const h = hash({ argId, dryRun: input.deployment_dry_run_plan_id, items: input.readiness_items, controls: reqControls, level: input.readiness_level });
  return { ...BASE, release_execution_readiness_gate_id: argId, release_execution_readiness_gate_ready: true, readiness_items_count: input.readiness_items.length, required_readiness_controls_count: reqControls.length, readiness_level: input.readiness_level, release_execution_readiness_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release execution readiness gate'] };
  const e = []; if (!result.release_execution_readiness_gate_id) e.push('missing release_execution_readiness_gate_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_EXECUTION_READINESS_BLOCKED_INPUT';
  const status = result.release_execution_readiness_gate_ready ? 'RELEASE_EXECUTION_READINESS_READY' :
    result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_READINESS_FAIL')) ? 'RELEASE_EXECUTION_READINESS_FAIL' :
    result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_READINESS_BLOCKED_DRY_RUN')) ? 'RELEASE_EXECUTION_READINESS_BLOCKED_DRY_RUN' : 'RELEASE_EXECUTION_READINESS_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_execution_readiness_gate_id: ${result.release_execution_readiness_gate_id || '(none)'}\nrelease_execution_readiness_gate_ready: ${result.release_execution_readiness_gate_ready}\nreadiness_items_count: ${result.readiness_items_count}\nrequired_readiness_controls_count: ${result.required_readiness_controls_count}\nreadiness_level: ${result.readiness_level || '(none)'}\n`;
  if (result.release_execution_readiness_hash) out += `release_execution_readiness_hash: ${result.release_execution_readiness_hash}\n`;
  ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}