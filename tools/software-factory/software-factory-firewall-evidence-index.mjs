import { createHash } from 'crypto';

export const STATUSES = [
  'FIREWALL_EVIDENCE_INDEX_BLOCKED_INPUT',
  'FIREWALL_EVIDENCE_INDEX_BLOCKED_REPORT',
  'FIREWALL_EVIDENCE_INDEX_INCOMPLETE',
  'FIREWALL_EVIDENCE_INDEX_READY',
];

const REQUIRED_SOURCE_VERSIONS = [
  'V365','V366','V367','V368','V369','V370','V371','V372','V373','V374','V375',
  'V377','V378','V379','V380','V381','V382',
];

const ALLOWED_EVIDENCE_TYPES = new Set([
  'module_evidence','test_evidence','registry_evidence','snapshot_evidence',
  'chain_evidence','graph_evidence','policy_evidence','report_evidence',
  'firewall_evidence','authority_evidence','invariant_evidence','emergency_stop_evidence',
]);

const ALLOWED_EVIDENCE_MODES = new Set([
  'blocked','metadata-only','contract-only','dry-run','planning',
]);

const REQUIRED_CONTROLS = [
  'firewall-evidence-index-required','unified-report-required','all-evidence-sources-required',
  'no-real-evidence-publish','no-artifact-publish','no-network','no-secret-access',
  'no-production-touch','no-real-release','no-real-deploy','no-tag-create',
  'no-stable-promotion','no-real-rollback','audit-required','pass-gold-required',
];

const BASE = {
  schema_version: 'v383.0',
  firewall_evidence_index_id: null,
  firewall_evidence_index_ready: false,
  unified_release_authority_report_id: null,
  unified_release_authority_report_ready: false,
  evidence_index_items: [],
  evidence_index_items_count: 0,
  missing_source_versions: [],
  required_evidence_index_controls: [],
  required_evidence_index_controls_count: 0,
  evidence_index_level: null,
  evidence_index_hash: null,
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

function findMissingSourceVersions(items) {
  const found = new Set((items || []).map(it => it && it.source_version));
  return REQUIRED_SOURCE_VERSIONS.filter(v => !found.has(v));
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['FIREWALL_EVIDENCE_INDEX_BLOCKED_INPUT'] };
  }
  if (!input.firewall_evidence_index_id || typeof input.firewall_evidence_index_id !== 'string') {
    return { ...BASE, errors: ['FIREWALL_EVIDENCE_INDEX_BLOCKED_INPUT: missing firewall_evidence_index_id'] };
  }
  if (input.unified_release_authority_report_ready !== true) {
    return { ...BASE, firewall_evidence_index_id: input.firewall_evidence_index_id, errors: ['FIREWALL_EVIDENCE_INDEX_BLOCKED_REPORT: unified_release_authority_report_ready must be true'] };
  }
  if (!input.unified_release_authority_report_id || typeof input.unified_release_authority_report_id !== 'string') {
    return { ...BASE, firewall_evidence_index_id: input.firewall_evidence_index_id, errors: ['FIREWALL_EVIDENCE_INDEX_BLOCKED_REPORT: missing unified_release_authority_report_id'] };
  }
  const items = input.evidence_index_items || [];
  const missing = findMissingSourceVersions(items);
  if (missing.length > 0) {
    return { ...BASE, firewall_evidence_index_id: input.firewall_evidence_index_id, unified_release_authority_report_id: input.unified_release_authority_report_id, unified_release_authority_report_ready: true, missing_source_versions: missing, errors: [`FIREWALL_EVIDENCE_INDEX_INCOMPLETE: missing source versions: ${missing.join(', ')}`] };
  }
  const errors = [];
  for (const it of items) {
    if (!it || !it.evidence_id || typeof it.evidence_id !== 'string') { errors.push('FIREWALL_EVIDENCE_INDEX_INCOMPLETE: item missing evidence_id'); continue; }
    if (!ALLOWED_EVIDENCE_TYPES.has(it.evidence_type)) { errors.push(`FIREWALL_EVIDENCE_INDEX_INCOMPLETE: item ${it.evidence_id} invalid evidence_type`); }
    if (!ALLOWED_EVIDENCE_MODES.has(it.evidence_mode)) { errors.push(`FIREWALL_EVIDENCE_INDEX_INCOMPLETE: item ${it.evidence_id} invalid evidence_mode`); }
    if (!it.evidence_hash || typeof it.evidence_hash !== 'string' || it.evidence_hash.length !== 64) { errors.push(`FIREWALL_EVIDENCE_INDEX_INCOMPLETE: item ${it.evidence_id} invalid evidence_hash`); }
  }
  const controls = input.required_evidence_index_controls || [];
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) { errors.push(`FIREWALL_EVIDENCE_INDEX_INCOMPLETE: missing controls: ${missingControls.join(', ')}`); }
  if (!input.evidence_index_level || typeof input.evidence_index_level !== 'string') { errors.push('FIREWALL_EVIDENCE_INDEX_INCOMPLETE: missing evidence_index_level'); }
  if (errors.length > 0) return { ...BASE, firewall_evidence_index_id: input.firewall_evidence_index_id, unified_release_authority_report_id: input.unified_release_authority_report_id, unified_release_authority_report_ready: true, errors };
  const h = hash({ id: input.firewall_evidence_index_id, items, controls, level: input.evidence_index_level });
  return {
    ...BASE,
    firewall_evidence_index_id: input.firewall_evidence_index_id,
    firewall_evidence_index_ready: true,
    unified_release_authority_report_id: input.unified_release_authority_report_id,
    unified_release_authority_report_ready: true,
    evidence_index_items: input.evidence_index_items,
    evidence_index_items_count: input.evidence_index_items.length,
    missing_source_versions: [],
    required_evidence_index_controls: controls,
    required_evidence_index_controls_count: controls.length,
    evidence_index_level: input.evidence_index_level,
    evidence_index_hash: h,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.firewall_evidence_index_id) e.push('missing firewall_evidence_index_id');
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
  if (!result || typeof result !== 'object') return 'FIREWALL_EVIDENCE_INDEX_BLOCKED_INPUT';
  let status;
  if (result.firewall_evidence_index_ready) status = 'FIREWALL_EVIDENCE_INDEX_READY';
  else if (result.errors?.some(e => e.startsWith('FIREWALL_EVIDENCE_INDEX_BLOCKED_REPORT'))) status = 'FIREWALL_EVIDENCE_INDEX_BLOCKED_REPORT';
  else if (result.errors?.some(e => e.startsWith('FIREWALL_EVIDENCE_INDEX_INCOMPLETE'))) status = 'FIREWALL_EVIDENCE_INDEX_INCOMPLETE';
  else status = 'FIREWALL_EVIDENCE_INDEX_BLOCKED_INPUT';
  let out = `=== ${status} ===\nfirewall_evidence_index_id: ${result.firewall_evidence_index_id || '(none)'}\nfirewall_evidence_index_ready: ${result.firewall_evidence_index_ready}\nunified_release_authority_report_id: ${result.unified_release_authority_report_id || '(none)'}\nunified_release_authority_report_ready: ${result.unified_release_authority_report_ready}\nevidence_index_items_count: ${result.evidence_index_items_count}\nevidence_index_level: ${result.evidence_index_level || '(none)'}\n`;
  if (result.evidence_index_hash) out += `evidence_index_hash: ${result.evidence_index_hash}\n`;
  if (result.missing_source_versions?.length) out += `missing_source_versions: ${result.missing_source_versions.join(', ')}\n`;
  ['firewall_evidence_index_published','release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','production_touched','artifact_published','billing_executed','secrets_accessed','network_accessed','rollback_executed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
