import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_EXECUTION_FIREWALL_PHASE_GATE_STATUSES = [
  'RELEASE_EXECUTION_FIREWALL_PHASE_GATE_BLOCKED_INPUT',
  'RELEASE_EXECUTION_FIREWALL_PHASE_GATE_BLOCKED_REVIEW',
  'RELEASE_EXECUTION_FIREWALL_PHASE_GATE_INCOMPLETE',
  'RELEASE_EXECUTION_FIREWALL_PHASE_GATE_READY',
];

const REQUIRED_IDS = [
  'release_execution_firewall_contract',
  'production_mutation_firewall',
  'secret_access_firewall',
  'billing_execution_firewall',
  'network_execution_firewall',
  'artifact_tag_stable_firewall',
  'rollback_execution_firewall',
  'last_mile_noop_execution_drill',
  'firewall_evidence_receipt',
  'firewall_final_authority_review',
];

const BASE = {
  schema_version: 'v375.0', phase_gate_id: null,
  phase_gate_ready: false,
  firewall_final_authority_review_id: null,
  firewall_final_authority_review_ready: false,
  ids: {},
  ids_count: 0,
  missing_ids: [],
  phase_summary: null,
  phase_gate_hash: null,
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

function collectMissingIds(ids) {
  const missing = [];
  for (const key of REQUIRED_IDS) {
    if (!ids[key] || typeof ids[key] !== 'string') missing.push(key);
  }
  return missing;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_EXECUTION_FIREWALL_PHASE_GATE_BLOCKED_INPUT'] };
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string')
    return { ...BASE, errors: ['RELEASE_EXECUTION_FIREWALL_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  if (input.firewall_final_authority_review_ready !== true)
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['RELEASE_EXECUTION_FIREWALL_PHASE_GATE_BLOCKED_REVIEW: firewall_final_authority_review_ready must be true'] };
  if (!input.firewall_final_authority_review_id || typeof input.firewall_final_authority_review_id !== 'string')
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['RELEASE_EXECUTION_FIREWALL_PHASE_GATE_BLOCKED_REVIEW: missing firewall_final_authority_review_id'] };
  if (!input.ids || typeof input.ids !== 'object')
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['RELEASE_EXECUTION_FIREWALL_PHASE_GATE_FAIL: ids object required'] };
  const missingIds = collectMissingIds(input.ids);
  if (missingIds.length > 0)
    return { ...BASE, phase_gate_id: input.phase_gate_id, ids: input.ids, missing_ids: missingIds, errors: ['RELEASE_EXECUTION_FIREWALL_PHASE_GATE_INCOMPLETE: missing ids: ' + missingIds.join(', ')] };
  if (!input.phase_summary || typeof input.phase_summary !== 'string')
    return { ...BASE, phase_gate_id: input.phase_gate_id, ids: input.ids, errors: ['RELEASE_EXECUTION_FIREWALL_PHASE_GATE_INCOMPLETE: phase_summary required'] };

  const h = hash({ id: input.phase_gate_id, review_id: input.firewall_final_authority_review_id, ids: input.ids, summary: input.phase_summary });
  return { ...BASE, phase_gate_id: input.phase_gate_id, phase_gate_ready: true, firewall_final_authority_review_id: input.firewall_final_authority_review_id, firewall_final_authority_review_ready: true, ids: input.ids, ids_count: Object.keys(input.ids).length, phase_summary: input.phase_summary, phase_gate_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release execution firewall phase gate'] };
  const e = [];
  if (!result.phase_gate_id) e.push('missing phase_gate_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_EXECUTION_FIREWALL_PHASE_GATE_BLOCKED_INPUT';
  let status;
  if (result.phase_gate_ready) {
    status = 'RELEASE_EXECUTION_FIREWALL_PHASE_GATE_READY';
  } else if (result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_FIREWALL_PHASE_GATE_BLOCKED_REVIEW'))) {
    status = 'RELEASE_EXECUTION_FIREWALL_PHASE_GATE_BLOCKED_REVIEW';
  } else if (result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_FIREWALL_PHASE_GATE_INCOMPLETE'))) {
    status = 'RELEASE_EXECUTION_FIREWALL_PHASE_GATE_INCOMPLETE';
  } else {
    status = 'RELEASE_EXECUTION_FIREWALL_PHASE_GATE_BLOCKED_INPUT';
  }
  let out = `=== ${status} ===\nphase_gate_id: ${result.phase_gate_id || '(none)'}\nphase_gate_ready: ${result.phase_gate_ready}\nfirewall_final_authority_review_id: ${result.firewall_final_authority_review_id || '(none)'}\nfirewall_final_authority_review_ready: ${result.firewall_final_authority_review_ready}\nids_count: ${result.ids_count}\nphase_summary: ${result.phase_summary || '(none)'}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
  if (result.ids && typeof result.ids === 'object') {
    for (const [key, val] of Object.entries(result.ids)) {
      out += `id ${key}: ${val}\n`;
    }
  }
  if (result.missing_ids?.length) {
    result.missing_ids.forEach(id => { out += `missing_id: ${id}\n`; });
  }
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (status === 'RELEASE_EXECUTION_FIREWALL_PHASE_GATE_READY') {
    out += 'V365-V375 release execution firewall complete. Real release, deploy, tag, stable promotion, artifact publish, production touch, billing, network, secret access, and rollback remain blocked until explicit V376 command.\n';
  }
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}