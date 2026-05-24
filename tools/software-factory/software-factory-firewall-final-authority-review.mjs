import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_FIREWALL_FINAL_AUTHORITY_REVIEW_STATUSES = [
  'FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_INPUT',
  'FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_EVIDENCE',
  'FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED',
  'FIREWALL_FINAL_AUTHORITY_REVIEW_READY',
];

const ALLOWED_AUTHORITY_DECISIONS = ['approved', 'denied', 'blocked'];

const ALLOWED_REVIEW_MODES = ['blocked', 'metadata-only', 'dry-run', 'contract-only', 'planning'];

const REQUIRED_REVIEW_CONTROLS = [
  'firewall-final-authority-required', 'human-approval-required',
  'firewall-evidence-required', 'no-real-execution-approval', 'no-real-release',
  'no-real-deploy', 'no-tag-create', 'no-stable-promotion', 'no-artifact-publish',
  'no-production-touch', 'no-billing-execution', 'no-secret-access', 'no-network',
  'no-real-rollback', 'audit-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v374.0', firewall_final_authority_review_id: null,
  firewall_final_authority_review_ready: false,
  firewall_evidence_receipt_id: null,
  firewall_evidence_receipt_ready: false,
  authority_decision: null,
  authority_id: null,
  review_reason: null,
  review_mode: null,
  required_review_controls: [],
  required_review_controls_count: 0,
  firewall_final_authority_review_hash: null,
  release_execution_firewall_enabled: false,
  production_mutation_firewall_locked: false,
  secret_access_firewall_locked: false,
  billing_execution_firewall_locked: false,
  network_execution_firewall_locked: false,
  artifact_tag_stable_firewall_locked: false,
  rollback_execution_firewall_locked: false,
  last_mile_noop_drill_completed: false,
  firewall_evidence_receipt_published: false,
  firewall_final_authority_approved: false,
  release_execution_firewall_phase_passed: false,
  real_release_execution_command_received: false,
  production_execution_environment_verified: false,
  real_release_dry_run_verified: false,
  real_release_rollback_ready: false,
  controlled_real_release_preparation_phase_passed: false,
  real_release_execution_ready: false,
  real_release_execution_allowed: false,
  real_deployment_execution_allowed: false,
  real_tag_creation_allowed: false,
  real_stable_promotion_allowed: false,
  real_release_executed: false, real_deploy_executed: false,
  real_tag_created: false, real_stable_promoted: false,
  artifact_published: false, production_touched: false,
  billing_executed: false, secrets_accessed: false,
  network_accessed: false, rollback_executed: false,
  release_allowed: false, deploy_allowed: false,
  stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false,
  runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false,
  real_patch_applied: false, saas_enabled: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function hasAllRequiredControls(controls) {
  for (const rc of REQUIRED_REVIEW_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_INPUT'] };
  if (!input.firewall_final_authority_review_id || typeof input.firewall_final_authority_review_id !== 'string')
    return { ...BASE, errors: ['FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_INPUT: missing firewall_final_authority_review_id'] };
  if (input.firewall_evidence_receipt_ready !== true)
    return { ...BASE, firewall_final_authority_review_id: input.firewall_final_authority_review_id, errors: ['FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_EVIDENCE: firewall_evidence_receipt_ready must be true'] };
  if (!input.firewall_evidence_receipt_id || typeof input.firewall_evidence_receipt_id !== 'string')
    return { ...BASE, firewall_final_authority_review_id: input.firewall_final_authority_review_id, errors: ['FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_EVIDENCE: missing firewall_evidence_receipt_id'] };
  if (!input.authority_decision || !ALLOWED_AUTHORITY_DECISIONS.includes(input.authority_decision))
    return { ...BASE, firewall_final_authority_review_id: input.firewall_final_authority_review_id, errors: ['FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED: authority_decision must be approved, denied, or blocked'] };
  if (input.authority_decision !== 'approved')
    return { ...BASE, firewall_final_authority_review_id: input.firewall_final_authority_review_id, errors: [`FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED: authority_decision is ${input.authority_decision}`] };
  if (!input.authority_id || typeof input.authority_id !== 'string')
    return { ...BASE, firewall_final_authority_review_id: input.firewall_final_authority_review_id, errors: ['FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED: authority_id required'] };
  if (!input.review_reason || typeof input.review_reason !== 'string')
    return { ...BASE, firewall_final_authority_review_id: input.firewall_final_authority_review_id, errors: ['FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED: review_reason required'] };
  if (!input.review_mode || !ALLOWED_REVIEW_MODES.includes(input.review_mode))
    return { ...BASE, firewall_final_authority_review_id: input.firewall_final_authority_review_id, errors: ['FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED: review_mode required'] };
  if (!Array.isArray(input.required_review_controls))
    return { ...BASE, firewall_final_authority_review_id: input.firewall_final_authority_review_id, errors: ['FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED: required_review_controls required'] };
  if (!hasAllRequiredControls(input.required_review_controls))
    return { ...BASE, firewall_final_authority_review_id: input.firewall_final_authority_review_id, errors: ['FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED: required_review_controls must include all required controls'] };

  const h = hash({ id: input.firewall_final_authority_review_id, evidence_id: input.firewall_evidence_receipt_id, decision: input.authority_decision, authority: input.authority_id, reason: input.review_reason, mode: input.review_mode, controls: input.required_review_controls });
  return { ...BASE, firewall_final_authority_review_id: input.firewall_final_authority_review_id, firewall_final_authority_review_ready: true, firewall_evidence_receipt_id: input.firewall_evidence_receipt_id, firewall_evidence_receipt_ready: true, authority_decision: input.authority_decision, authority_id: input.authority_id, review_reason: input.review_reason, review_mode: input.review_mode, required_review_controls: input.required_review_controls, required_review_controls_count: input.required_review_controls.length, firewall_final_authority_review_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid firewall final authority review'] };
  const e = [];
  if (!result.firewall_final_authority_review_id) e.push('missing firewall_final_authority_review_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_INPUT';
  const status = result.firewall_final_authority_review_ready ? 'FIREWALL_FINAL_AUTHORITY_REVIEW_READY' :
    result.errors?.some(e => e.startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_EVIDENCE')) ? 'FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_EVIDENCE' :
    result.errors?.some(e => e.startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')) ? 'FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED' : 'FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_INPUT';
  let out = `=== ${status} ===\nfirewall_final_authority_review_id: ${result.firewall_final_authority_review_id || '(none)'}\nfirewall_final_authority_review_ready: ${result.firewall_final_authority_review_ready}\nfirewall_evidence_receipt_id: ${result.firewall_evidence_receipt_id || '(none)'}\nfirewall_evidence_receipt_ready: ${result.firewall_evidence_receipt_ready}\nauthority_decision: ${result.authority_decision || '(none)'}\nauthority_id: ${result.authority_id || '(none)'}\nreview_reason: ${result.review_reason || '(none)'}\nreview_mode: ${result.review_mode || '(none)'}\nrequired_review_controls_count: ${result.required_review_controls_count}\n`;
  if (result.firewall_final_authority_review_hash) out += `firewall_final_authority_review_hash: ${result.firewall_final_authority_review_hash}\n`;
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}