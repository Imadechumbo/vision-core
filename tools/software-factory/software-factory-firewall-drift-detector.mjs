import { createHash } from 'crypto';

export const STATUSES = [
  'FIREWALL_DRIFT_DETECTOR_BLOCKED_INPUT',
  'FIREWALL_DRIFT_DETECTOR_BLOCKED_EVIDENCE',
  'FIREWALL_DRIFT_DETECTOR_FAIL',
  'FIREWALL_DRIFT_DETECTOR_READY',
];

const ALLOWED_DRIFT_TYPES = new Set([
  'registry_drift','snapshot_drift','chain_drift','graph_drift','policy_drift',
  'report_drift','evidence_drift','invariant_drift','authority_drift',
  'execution_block_drift','emergency_stop_drift',
]);

const ALLOWED_DRIFT_MODES = new Set([
  'blocked','metadata-only','contract-only','dry-run','planning',
]);

const ALLOWED_SEVERITIES = new Set([
  'critical','high','medium','low','info',
]);

const REQUIRED_CONTROLS = [
  'firewall-drift-detector-required','evidence-index-required','no-unreviewed-drift',
  'no-real-execution','no-real-release','no-real-deploy','no-tag-create',
  'no-stable-promotion','no-artifact-publish','no-production-touch',
  'no-billing-execution','no-secret-access','no-network','no-real-rollback',
  'audit-required','pass-gold-required',
];

const BASE = {
  schema_version: 'v384.0',
  firewall_drift_detector_id: null,
  firewall_drift_detector_ready: false,
  firewall_evidence_index_id: null,
  firewall_evidence_index_ready: false,
  drift_items: [],
  drift_items_count: 0,
  required_drift_controls: [],
  required_drift_controls_count: 0,
  drift_level: null,
  drift_hash: null,
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
  release_firewall_consolidation_phase_passed: false,
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
  errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['FIREWALL_DRIFT_DETECTOR_BLOCKED_INPUT'] };
  }
  if (!input.firewall_drift_detector_id || typeof input.firewall_drift_detector_id !== 'string') {
    return { ...BASE, errors: ['FIREWALL_DRIFT_DETECTOR_BLOCKED_INPUT: missing firewall_drift_detector_id'] };
  }
  if (input.firewall_evidence_index_ready !== true) {
    return { ...BASE, firewall_drift_detector_id: input.firewall_drift_detector_id, errors: ['FIREWALL_DRIFT_DETECTOR_BLOCKED_EVIDENCE: firewall_evidence_index_ready must be true'] };
  }
  if (!input.firewall_evidence_index_id || typeof input.firewall_evidence_index_id !== 'string') {
    return { ...BASE, firewall_drift_detector_id: input.firewall_drift_detector_id, errors: ['FIREWALL_DRIFT_DETECTOR_BLOCKED_EVIDENCE: missing firewall_evidence_index_id'] };
  }
  const items = input.drift_items || [];
  const errors = [];
  if (!items.length) { errors.push('FIREWALL_DRIFT_DETECTOR_FAIL: drift_items must not be empty'); }
  for (const it of items) {
    if (!it || !it.drift_id || typeof it.drift_id !== 'string') { errors.push('FIREWALL_DRIFT_DETECTOR_FAIL: item missing drift_id'); continue; }
    if (!ALLOWED_DRIFT_TYPES.has(it.drift_type)) { errors.push(`FIREWALL_DRIFT_DETECTOR_FAIL: item ${it.drift_id} invalid drift_type`); }
    if (!ALLOWED_DRIFT_MODES.has(it.drift_mode)) { errors.push(`FIREWALL_DRIFT_DETECTOR_FAIL: item ${it.drift_id} invalid drift_mode`); }
    if (!ALLOWED_SEVERITIES.has(it.severity)) { errors.push(`FIREWALL_DRIFT_DETECTOR_FAIL: item ${it.drift_id} invalid severity`); }
    if (!it.drift_hash || typeof it.drift_hash !== 'string' || it.drift_hash.length !== 64) { errors.push(`FIREWALL_DRIFT_DETECTOR_FAIL: item ${it.drift_id} invalid drift_hash`); }
  }
  const controls = input.required_drift_controls || [];
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) { errors.push(`FIREWALL_DRIFT_DETECTOR_FAIL: missing controls: ${missingControls.join(', ')}`); }
  if (!input.drift_level || typeof input.drift_level !== 'string') { errors.push('FIREWALL_DRIFT_DETECTOR_FAIL: missing drift_level'); }
  if (errors.length > 0) return { ...BASE, firewall_drift_detector_id: input.firewall_drift_detector_id, firewall_evidence_index_id: input.firewall_evidence_index_id, firewall_evidence_index_ready: true, errors };
  const h = hash({ id: input.firewall_drift_detector_id, items, controls, level: input.drift_level });
  return {
    ...BASE,
    firewall_drift_detector_id: input.firewall_drift_detector_id,
    firewall_drift_detector_ready: true,
    firewall_evidence_index_id: input.firewall_evidence_index_id,
    firewall_evidence_index_ready: true,
    drift_items: input.drift_items,
    drift_items_count: input.drift_items.length,
    required_drift_controls: controls,
    required_drift_controls_count: controls.length,
    drift_level: input.drift_level,
    drift_hash: h,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.firewall_drift_detector_id) e.push('missing firewall_drift_detector_id');
  const MUST_FALSE = [
    'release_firewall_registry_published','unified_firewall_snapshot_published',
    'firewall_chain_integrity_confirmed','firewall_dependency_graph_published',
    'firewall_policy_bound','unified_release_authority_report_published',
    'firewall_evidence_index_published','firewall_drift_detected',
    'firewall_regression_guard_enabled','unified_firewall_final_review_approved',
    'release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed',
    'release_execution_firewall_enabled','production_mutation_firewall_locked',
    'secret_access_firewall_locked','billing_execution_firewall_locked',
    'network_execution_firewall_locked','artifact_tag_stable_firewall_locked',
    'rollback_execution_firewall_locked','last_mile_noop_drill_completed',
    'firewall_evidence_receipt_published','firewall_final_authority_approved',
    'real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted',
    'artifact_published','production_touched','billing_executed','secrets_accessed',
    'network_accessed','rollback_executed','release_allowed','deploy_allowed',
    'stable_allowed','tag_allowed','real_execution_allowed',
  ];
  MUST_FALSE.forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'FIREWALL_DRIFT_DETECTOR_BLOCKED_INPUT';
  let status;
  if (result.firewall_drift_detector_ready) status = 'FIREWALL_DRIFT_DETECTOR_READY';
  else if (result.errors?.some(e => e.startsWith('FIREWALL_DRIFT_DETECTOR_BLOCKED_EVIDENCE'))) status = 'FIREWALL_DRIFT_DETECTOR_BLOCKED_EVIDENCE';
  else if (result.errors?.some(e => e.startsWith('FIREWALL_DRIFT_DETECTOR_FAIL'))) status = 'FIREWALL_DRIFT_DETECTOR_FAIL';
  else status = 'FIREWALL_DRIFT_DETECTOR_BLOCKED_INPUT';
  let out = `=== ${status} ===\nfirewall_drift_detector_id: ${result.firewall_drift_detector_id || '(none)'}\nfirewall_drift_detector_ready: ${result.firewall_drift_detector_ready}\nfirewall_evidence_index_id: ${result.firewall_evidence_index_id || '(none)'}\nfirewall_evidence_index_ready: ${result.firewall_evidence_index_ready}\ndrift_items_count: ${result.drift_items_count}\ndrift_level: ${result.drift_level || '(none)'}\n`;
  if (result.drift_hash) out += `drift_hash: ${result.drift_hash}\n`;
  ['firewall_drift_detected','firewall_regression_guard_enabled','release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','production_touched','artifact_published','billing_executed','secrets_accessed','network_accessed','rollback_executed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
