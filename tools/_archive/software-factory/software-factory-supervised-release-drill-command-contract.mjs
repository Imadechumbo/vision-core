import { createHash } from 'crypto';

export const STATUSES = [
  'SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_INPUT',
  'SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_FIREWALL',
  'SUPERVISED_RELEASE_DRILL_COMMAND_DENIED',
  'SUPERVISED_RELEASE_DRILL_COMMAND_READY',
];

const ALLOWED_COMMAND_MODES = [
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
];

const REQUIRED_CONTROLS = [
  'supervised-release-drill-command-required',
  'firewall-consolidation-required',
  'explicit-v387-command-required',
  'no-real-release',
  'no-real-deploy',
  'no-tag-create',
  'no-stable-promotion',
  'no-artifact-publish',
  'no-production-touch',
  'no-billing-execution',
  'no-secret-access',
  'no-network',
  'no-real-rollback',
  'audit-required',
  'human-approval-required',
  'pass-gold-required',
];

const BASE = {
  schema_version: 'v387.0',
  supervised_release_drill_command_contract_id: null,
  contract_ready: false,
  release_firewall_consolidation_phase_gate_id: null,
  release_firewall_consolidation_phase_gate_ready: false,
  explicit_v387_drill_command: false,
  requested_by: null,
  command_reason: null,
  command_mode: null,
  required_command_controls: [],
  missing_controls: [],
  contract_hash: null,
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

const FINAL_MESSAGE = 'V387 supervised release drill command contract registered. This is metadata-only drill preparation, not real release execution. All firewall consolidation modules (V377-V386) remain active governance. Real release, deploy, tag, stable promotion, artifact publish, production touch, billing, network, secret access, and rollback remain blocked until explicit PASS GOLD REAL authority.';

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_INPUT'] };
  }
  if (!input.supervised_release_drill_command_contract_id || typeof input.supervised_release_drill_command_contract_id !== 'string') {
    return { ...BASE, errors: ['SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_INPUT: missing supervised_release_drill_command_contract_id'] };
  }
  if (!input.release_firewall_consolidation_phase_gate_id || typeof input.release_firewall_consolidation_phase_gate_id !== 'string') {
    return { ...BASE, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, errors: ['SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_FIREWALL: missing release_firewall_consolidation_phase_gate_id'] };
  }
  if (input.release_firewall_consolidation_phase_gate_ready !== true) {
    return { ...BASE, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, release_firewall_consolidation_phase_gate_id: input.release_firewall_consolidation_phase_gate_id, errors: ['SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_FIREWALL: release_firewall_consolidation_phase_gate_ready must be true'] };
  }
  if (input.explicit_v387_drill_command !== true) {
    return { ...BASE, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, release_firewall_consolidation_phase_gate_id: input.release_firewall_consolidation_phase_gate_id, release_firewall_consolidation_phase_gate_ready: true, errors: ['SUPERVISED_RELEASE_DRILL_COMMAND_DENIED: explicit_v387_drill_command must be true'] };
  }
  if (!input.requested_by || typeof input.requested_by !== 'string') {
    return { ...BASE, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, release_firewall_consolidation_phase_gate_id: input.release_firewall_consolidation_phase_gate_id, release_firewall_consolidation_phase_gate_ready: true, errors: ['SUPERVISED_RELEASE_DRILL_COMMAND_DENIED: missing requested_by'] };
  }
  if (!input.command_reason || typeof input.command_reason !== 'string') {
    return { ...BASE, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, release_firewall_consolidation_phase_gate_id: input.release_firewall_consolidation_phase_gate_id, release_firewall_consolidation_phase_gate_ready: true, errors: ['SUPERVISED_RELEASE_DRILL_COMMAND_DENIED: missing command_reason'] };
  }
  if (!input.command_mode || !ALLOWED_COMMAND_MODES.includes(input.command_mode)) {
    return { ...BASE, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, release_firewall_consolidation_phase_gate_id: input.release_firewall_consolidation_phase_gate_id, release_firewall_consolidation_phase_gate_ready: true, errors: [`SUPERVISED_RELEASE_DRILL_COMMAND_DENIED: invalid command_mode: ${input.command_mode}`] };
  }
  const controls = Array.isArray(input.required_command_controls) ? input.required_command_controls : [];
  const missing = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missing.length > 0) {
    return { ...BASE, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, release_firewall_consolidation_phase_gate_id: input.release_firewall_consolidation_phase_gate_id, release_firewall_consolidation_phase_gate_ready: true, missing_controls: missing, errors: [`SUPERVISED_RELEASE_DRILL_COMMAND_DENIED: missing controls: ${missing.join(', ')}`] };
  }
  const h = hash({ id: input.supervised_release_drill_command_contract_id, gate_id: input.release_firewall_consolidation_phase_gate_id, by: input.requested_by, reason: input.command_reason, mode: input.command_mode, controls });
  return {
    ...BASE,
    supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id,
    contract_ready: true,
    release_firewall_consolidation_phase_gate_id: input.release_firewall_consolidation_phase_gate_id,
    release_firewall_consolidation_phase_gate_ready: true,
    explicit_v387_drill_command: true,
    requested_by: input.requested_by,
    command_reason: input.command_reason,
    command_mode: input.command_mode,
    required_command_controls: controls,
    missing_controls: [],
    contract_hash: h,
    final_message: FINAL_MESSAGE,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.supervised_release_drill_command_contract_id) e.push('missing supervised_release_drill_command_contract_id');
  const MUST_FALSE = [
    'supervised_release_drill_command_received',
    'release_drill_scope_bound', 'release_drill_plan_published',
    'release_drill_noop_executed', 'release_drill_result_verified',
    'release_drill_evidence_receipt_published', 'release_drill_risk_classified',
    'release_drill_final_authority_approved', 'supervised_release_drill_phase_passed',
    'release_firewall_consolidation_phase_passed', 'release_firewall_registry_published',
    'unified_firewall_snapshot_published', 'firewall_chain_integrity_confirmed',
    'firewall_dependency_graph_published', 'firewall_policy_bound',
    'unified_release_authority_report_published', 'firewall_evidence_index_published',
    'firewall_drift_detected', 'firewall_regression_guard_enabled',
    'unified_firewall_final_review_approved', 'release_execution_firewall_phase_passed',
    'release_execution_firewall_enabled', 'production_mutation_firewall_locked',
    'secret_access_firewall_locked', 'billing_execution_firewall_locked',
    'network_execution_firewall_locked', 'artifact_tag_stable_firewall_locked',
    'rollback_execution_firewall_locked', 'last_mile_noop_drill_completed',
    'firewall_evidence_receipt_published', 'firewall_final_authority_approved',
    'real_release_executed', 'real_deploy_executed', 'real_tag_created',
    'real_stable_promoted', 'artifact_published', 'production_touched',
    'billing_executed', 'secrets_accessed', 'network_accessed', 'rollback_executed',
    'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
    'real_execution_allowed',
  ];
  MUST_FALSE.forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_INPUT';
  let status;
  if (result.contract_ready) status = 'SUPERVISED_RELEASE_DRILL_COMMAND_READY';
  else if (result.errors?.some(e => e.startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_FIREWALL'))) status = 'SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_FIREWALL';
  else if (result.errors?.some(e => e.startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_DENIED'))) status = 'SUPERVISED_RELEASE_DRILL_COMMAND_DENIED';
  else status = 'SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_INPUT';
  let out = `=== ${status} ===\nsupervised_release_drill_command_contract_id: ${result.supervised_release_drill_command_contract_id || '(none)'}\ncontract_ready: ${result.contract_ready}\nrelease_firewall_consolidation_phase_gate_id: ${result.release_firewall_consolidation_phase_gate_id || '(none)'}\nrelease_firewall_consolidation_phase_gate_ready: ${result.release_firewall_consolidation_phase_gate_ready}\nexplicit_v387_drill_command: ${result.explicit_v387_drill_command}\nrequested_by: ${result.requested_by || '(none)'}\ncommand_reason: ${result.command_reason || '(none)'}\ncommand_mode: ${result.command_mode || '(none)'}\n`;
  if (result.contract_hash) out += `contract_hash: ${result.contract_hash}\n`;
  if (result.missing_controls?.length) out += `missing_controls: ${result.missing_controls.join(', ')}\n`;
  ['supervised_release_drill_command_received', 'release_drill_scope_bound', 'supervised_release_drill_phase_passed',
   'release_firewall_consolidation_phase_passed', 'release_execution_firewall_phase_passed',
   'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed', 'real_execution_allowed',
   'production_touched', 'artifact_published', 'billing_executed', 'secrets_accessed',
   'network_accessed', 'rollback_executed', 'real_release_executed', 'real_deploy_executed',
   'real_tag_created', 'real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.final_message) out += `final_message: ${result.final_message}\n`;
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
