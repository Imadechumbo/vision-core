import { createHash } from 'crypto';

export const STATUSES = [
  'SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_INPUT',
  'SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_REVIEW',
  'SUPERVISED_RELEASE_DRILL_PHASE_GATE_INCOMPLETE',
  'SUPERVISED_RELEASE_DRILL_PHASE_GATE_READY',
];

const REQUIRED_IDS = [
  'supervised_release_drill_command_contract',
  'release_drill_scope_binder',
  'release_drill_execution_plan',
  'release_drill_noop_executor',
  'release_drill_result_verifier',
  'release_drill_evidence_receipt',
  'release_drill_risk_classifier',
  'release_drill_final_authority_review',
];

const BASE = {
  schema_version: 'v395.0',
  phase_gate_id: null,
  phase_gate_ready: false,
  release_drill_final_authority_review_id: null,
  release_drill_final_authority_review_ready: false,
  ids: {},
  missing_ids: [],
  phase_summary: null,
  phase_hash: null,
  release_drill_evidence_published: false,
  release_drill_risk_accepted: false,
  release_drill_authority_approved: false,
  supervised_release_drill_command_received: false,
  release_drill_scope_bound: false,
  release_drill_plan_published: false,
  release_drill_noop_executed: false,
  release_drill_result_verified: false,
  release_drill_evidence_receipt_published: false,
  release_drill_risk_classified: false,
  release_drill_final_authority_approved: false,
  supervised_release_drill_phase_passed: false,
  release_firewall_consolidation_phase_passed: false,
  release_firewall_registry_published: false,
  unified_firewall_snapshot_published: false,
  firewall_chain_integrity_confirmed: false,
  firewall_dependency_graph_published: false,
  firewall_policy_bound: false,
  unified_release_authority_report_published: false,
  firewall_evidence_index_published: false,
  firewall_drift_detected: false,
  firewall_regression_guard_enabled: false,
  unified_firewall_final_review_approved: false,
  release_execution_firewall_phase_passed: false,
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
  real_release_executed: false,
  real_deploy_executed: false,
  real_tag_created: false,
  real_stable_promoted: false,
  artifact_published: false,
  production_touched: false,
  billing_executed: false,
  secrets_accessed: false,
  network_accessed: false,
  rollback_executed: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  final_message: null,
  errors: [],
};

const FINAL_MESSAGE = 'V387-V395 supervised real release execution drill complete. Real release execution remains blocked until explicit V396 command.';

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_INPUT'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, errors: ['SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  }
  if (input.release_drill_final_authority_review_ready !== true) {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_REVIEW: release_drill_final_authority_review_ready must be true'] };
  }
  if (!input.release_drill_final_authority_review_id || typeof input.release_drill_final_authority_review_id !== 'string') {
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_REVIEW: missing release_drill_final_authority_review_id'] };
  }
  const ids = input.ids || {};
  const missing = REQUIRED_IDS.filter(k => !ids[k] || typeof ids[k] !== 'string');
  if (missing.length > 0) {
    return { ...BASE, phase_gate_id: input.phase_gate_id, release_drill_final_authority_review_id: input.release_drill_final_authority_review_id, release_drill_final_authority_review_ready: true, missing_ids: missing, errors: [`SUPERVISED_RELEASE_DRILL_PHASE_GATE_INCOMPLETE: missing ids: ${missing.join(', ')}`] };
  }
  if (!input.phase_summary || typeof input.phase_summary !== 'string') {
    return { ...BASE, phase_gate_id: input.phase_gate_id, release_drill_final_authority_review_id: input.release_drill_final_authority_review_id, release_drill_final_authority_review_ready: true, errors: ['SUPERVISED_RELEASE_DRILL_PHASE_GATE_INCOMPLETE: missing phase_summary'] };
  }
  const h = hash({ id: input.phase_gate_id, review_id: input.release_drill_final_authority_review_id, ids, summary: input.phase_summary });
  return {
    ...BASE,
    phase_gate_id: input.phase_gate_id,
    phase_gate_ready: true,
    release_drill_final_authority_review_id: input.release_drill_final_authority_review_id,
    release_drill_final_authority_review_ready: true,
    ids: input.ids,
    missing_ids: [],
    phase_summary: input.phase_summary,
    phase_hash: h,
    final_message: FINAL_MESSAGE,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.phase_gate_id) e.push('missing phase_gate_id');
  const MUST_FALSE = [
    'release_drill_evidence_published', 'release_drill_risk_accepted', 'release_drill_authority_approved',
    'supervised_release_drill_command_received', 'release_drill_scope_bound', 'release_drill_plan_published',
    'release_drill_noop_executed', 'release_drill_result_verified', 'release_drill_evidence_receipt_published',
    'release_drill_risk_classified', 'release_drill_final_authority_approved', 'supervised_release_drill_phase_passed',
    'release_firewall_consolidation_phase_passed', 'release_firewall_registry_published',
    'unified_firewall_snapshot_published', 'firewall_chain_integrity_confirmed',
    'firewall_dependency_graph_published', 'firewall_policy_bound',
    'unified_release_authority_report_published', 'firewall_evidence_index_published',
    'firewall_drift_detected', 'firewall_regression_guard_enabled', 'unified_firewall_final_review_approved',
    'release_execution_firewall_phase_passed', 'release_execution_firewall_enabled',
    'production_mutation_firewall_locked', 'secret_access_firewall_locked',
    'billing_execution_firewall_locked', 'network_execution_firewall_locked',
    'artifact_tag_stable_firewall_locked', 'rollback_execution_firewall_locked',
    'last_mile_noop_drill_completed', 'firewall_evidence_receipt_published', 'firewall_final_authority_approved',
    'real_release_executed', 'real_deploy_executed', 'real_tag_created', 'real_stable_promoted',
    'artifact_published', 'production_touched', 'billing_executed', 'secrets_accessed',
    'network_accessed', 'rollback_executed', 'release_allowed', 'deploy_allowed',
    'stable_allowed', 'tag_allowed', 'real_execution_allowed',
  ];
  MUST_FALSE.forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_INPUT';
  let status;
  if (result.phase_gate_ready) status = 'SUPERVISED_RELEASE_DRILL_PHASE_GATE_READY';
  else if (result.errors?.some(e => e.startsWith('SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_REVIEW'))) status = 'SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_REVIEW';
  else if (result.errors?.some(e => e.startsWith('SUPERVISED_RELEASE_DRILL_PHASE_GATE_INCOMPLETE'))) status = 'SUPERVISED_RELEASE_DRILL_PHASE_GATE_INCOMPLETE';
  else status = 'SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_INPUT';
  let out = `=== ${status} ===\nphase_gate_id: ${result.phase_gate_id || '(none)'}\nphase_gate_ready: ${result.phase_gate_ready}\nrelease_drill_final_authority_review_id: ${result.release_drill_final_authority_review_id || '(none)'}\nrelease_drill_final_authority_review_ready: ${result.release_drill_final_authority_review_ready}\nphase_summary: ${result.phase_summary || '(none)'}\n`;
  if (result.phase_hash) out += `phase_hash: ${result.phase_hash}\n`;
  if (result.missing_ids?.length) out += `missing_ids: ${result.missing_ids.join(', ')}\n`;
  ['supervised_release_drill_phase_passed', 'release_drill_authority_approved',
   'release_drill_risk_accepted', 'release_drill_evidence_published',
   'release_drill_final_authority_approved', 'release_firewall_consolidation_phase_passed',
   'release_execution_firewall_phase_passed', 'release_allowed', 'deploy_allowed',
   'stable_allowed', 'tag_allowed', 'real_execution_allowed', 'production_touched',
   'artifact_published', 'billing_executed', 'secrets_accessed', 'network_accessed',
   'rollback_executed', 'real_release_executed', 'real_deploy_executed',
   'real_tag_created', 'real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.final_message) out += `final_message: ${result.final_message}\n`;
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
