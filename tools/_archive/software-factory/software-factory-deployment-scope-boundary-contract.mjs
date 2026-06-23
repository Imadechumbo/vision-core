import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_DEPLOYMENT_SCOPE_BOUNDARY_CONTRACT_STATUSES = [
  'DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_INPUT',
  'DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND',
  'DEPLOYMENT_SCOPE_BOUNDARY_FAIL',
  'DEPLOYMENT_SCOPE_BOUNDARY_READY',
];

const ALLOWED_SCOPE_TYPES = ['frontend','backend','go_core','workflow','infrastructure','container','database','secrets','release','tag','stable','production','rollback','audit'];
const ALLOWED_SCOPE_MODES = ['blocked','metadata-only','dry-run','planning'];
const ALLOWED_SCOPE_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_SCOPE_CONTROLS = ['no-production-touch','no-real-deploy','no-real-release','no-tag-create','no-stable-promotion','no-infrastructure-change','no-container-push','no-database-write','no-secret-read','rollback-required','evidence-required','pass-gold-required','human-approval-required','audit-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v336.0', deployment_scope_boundary_id: null, deployment_scope_boundary_contract_ready: false,
  deployment_scope_items_count: 0, required_scope_controls_count: 0, scope_level: null, deployment_scope_boundary_hash: null,
  release_execution_allowed: false, deployment_execution_allowed: false, deployment_scope_bound: false,
  release_artifact_published: false, deployment_dry_run_completed: false, release_execution_ready: false,
  release_execution_approved: false, deployment_evidence_published: false, release_rollback_bound: false,
  release_authority_granted: false, release_execution_phase_passed: false,
  product_activation_execution_allowed: false, production_touch_allowed: false,
  activation_execution_phase_passed: false,
  product_activation_allowed: false, saas_enablement_allowed: false, production_readiness_confirmed: false,
  activation_dry_run_completed: false, activation_risk_accepted: false, activation_authority_granted: false, product_activation_phase_passed: false,
  activation_policy_enforced: false, activation_report_published: false, activation_evidence_published: false,
  activation_execution_dry_run_completed: false, activation_execution_ready: false, activation_execution_approved: false,
  activation_execution_evidence_published: false, activation_rollback_bound: false, activation_execution_authority_granted: false,
  saas_enabled: false, billing_executed: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false, real_patch_applied: false, production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_INPUT'] };
  if (!input.deployment_scope_boundary_id || typeof input.deployment_scope_boundary_id !== 'string') return { ...BASE, errors: ['DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_INPUT: missing deployment_scope_boundary_id'] };
  if (input.release_execution_command_ready !== true) return { ...BASE, deployment_scope_boundary_id: input.deployment_scope_boundary_id, errors: ['DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND: release_execution_command_ready must be true'] };
  if (!input.release_execution_command_id || typeof input.release_execution_command_id !== 'string') return { ...BASE, deployment_scope_boundary_id: input.deployment_scope_boundary_id, errors: ['DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND: missing release_execution_command_id'] };
  if (!Array.isArray(input.deployment_scope_items) || input.deployment_scope_items.length === 0) return { ...BASE, deployment_scope_boundary_id: input.deployment_scope_boundary_id, errors: ['DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND: deployment_scope_items must be non-empty array'] };
  if (!input.scope_level || !ALLOWED_SCOPE_LEVELS.includes(input.scope_level)) return { ...BASE, deployment_scope_boundary_id: input.deployment_scope_boundary_id, errors: ['DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND: invalid scope_level'] };

  const fE = [];
  for (let i = 0; i < input.deployment_scope_items.length; i++) {
    const s = input.deployment_scope_items[i];
    if (!s.scope_id || typeof s.scope_id !== 'string') fE.push(`item ${i}: missing scope_id`);
    if (!s.scope_type || !ALLOWED_SCOPE_TYPES.includes(s.scope_type)) fE.push(`item ${i}: invalid scope_type`);
    if (!s.scope_mode || !ALLOWED_SCOPE_MODES.includes(s.scope_mode)) fE.push(`item ${i}: invalid scope_mode`);
    if (!s.scope_hash || !HEX64_RE.test(s.scope_hash)) fE.push(`item ${i}: scope_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, deployment_scope_boundary_id: input.deployment_scope_boundary_id, errors: ['DEPLOYMENT_SCOPE_BOUNDARY_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_scope_controls) ? input.required_scope_controls : REQUIRED_SCOPE_CONTROLS;
  const missingControls = REQUIRED_SCOPE_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, deployment_scope_boundary_id: input.deployment_scope_boundary_id, deployment_scope_items_count: input.deployment_scope_items.length, errors: ['DEPLOYMENT_SCOPE_BOUNDARY_FAIL: missing required scope controls: ' + missingControls.join(', ')] };

  const argId = input.deployment_scope_boundary_id;
  const h = hash({ argId, cmd: input.release_execution_command_id, items: input.deployment_scope_items, controls: reqControls, level: input.scope_level });
  return { ...BASE, deployment_scope_boundary_id: argId, deployment_scope_boundary_contract_ready: true, deployment_scope_items_count: input.deployment_scope_items.length, required_scope_controls_count: reqControls.length, scope_level: input.scope_level, deployment_scope_boundary_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid deployment scope boundary contract'] };
  const e = []; if (!result.deployment_scope_boundary_id) e.push('missing deployment_scope_boundary_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','billing_executed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_INPUT';
  const status = result.deployment_scope_boundary_contract_ready ? 'DEPLOYMENT_SCOPE_BOUNDARY_READY' :
    result.errors?.some(e => e.startsWith('DEPLOYMENT_SCOPE_BOUNDARY_FAIL')) ? 'DEPLOYMENT_SCOPE_BOUNDARY_FAIL' :
    result.errors?.some(e => e.startsWith('DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND')) ? 'DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND' : 'DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_INPUT';
  let out = `=== ${status} ===\ndeployment_scope_boundary_id: ${result.deployment_scope_boundary_id || '(none)'}\ndeployment_scope_boundary_contract_ready: ${result.deployment_scope_boundary_contract_ready}\ndeployment_scope_items_count: ${result.deployment_scope_items_count}\nrequired_scope_controls_count: ${result.required_scope_controls_count}\nscope_level: ${result.scope_level || '(none)'}\n`;
  if (result.deployment_scope_boundary_hash) out += `deployment_scope_boundary_hash: ${result.deployment_scope_boundary_hash}\n`;
  ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}