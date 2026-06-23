import { createHash } from 'crypto';

export const STATUSES = [
  'FIREWALL_CHAIN_INTEGRITY_BLOCKED_INPUT',
  'FIREWALL_CHAIN_INTEGRITY_BLOCKED_SNAPSHOT',
  'FIREWALL_CHAIN_INTEGRITY_INCOMPLETE',
  'FIREWALL_CHAIN_INTEGRITY_READY',
];

const REQUIRED_VERSIONS = ['V365','V366','V367','V368','V369','V370','V371','V372','V373','V374','V375'];

const ALLOWED_CHAIN_TYPES = new Set([
  'firewall_contract','mutation_boundary','secret_boundary','billing_boundary',
  'network_boundary','artifact_boundary','rollback_boundary','noop_drill',
  'evidence_receipt','authority_review','phase_gate',
]);

const REQUIRED_CONTROLS = [
  'chain-integrity-required','all-versions-required','no-missing-module',
  'no-duplicate-module','no-chain-break','atomic-modules-preserved',
  'registry-required','snapshot-required','no-real-execution',
  'audit-required','pass-gold-required',
];

const BASE = {
  schema_version: 'v379.0',
  firewall_chain_integrity_verifier_id: null,
  firewall_chain_integrity_verifier_ready: false,
  unified_release_firewall_snapshot_id: null,
  unified_release_firewall_snapshot_ready: false,
  chain_items: [],
  chain_items_count: 0,
  missing_versions: [],
  required_chain_controls: [],
  required_chain_controls_count: 0,
  chain_level: null,
  chain_hash: null,
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

function findMissingVersions(items) {
  const found = new Set((items || []).map(it => it && it.version));
  return REQUIRED_VERSIONS.filter(v => !found.has(v));
}

function findDuplicateVersions(items) {
  const seen = new Map();
  const dupes = [];
  for (const it of (items || [])) {
    if (!it || !it.version) continue;
    if (seen.has(it.version)) dupes.push(it.version);
    else seen.set(it.version, true);
  }
  return dupes;
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['FIREWALL_CHAIN_INTEGRITY_BLOCKED_INPUT'] };
  }
  if (!input.firewall_chain_integrity_verifier_id || typeof input.firewall_chain_integrity_verifier_id !== 'string') {
    return { ...BASE, errors: ['FIREWALL_CHAIN_INTEGRITY_BLOCKED_INPUT: missing firewall_chain_integrity_verifier_id'] };
  }
  if (input.unified_release_firewall_snapshot_ready !== true) {
    return { ...BASE, firewall_chain_integrity_verifier_id: input.firewall_chain_integrity_verifier_id, errors: ['FIREWALL_CHAIN_INTEGRITY_BLOCKED_SNAPSHOT: unified_release_firewall_snapshot_ready must be true'] };
  }
  if (!input.unified_release_firewall_snapshot_id || typeof input.unified_release_firewall_snapshot_id !== 'string') {
    return { ...BASE, firewall_chain_integrity_verifier_id: input.firewall_chain_integrity_verifier_id, errors: ['FIREWALL_CHAIN_INTEGRITY_BLOCKED_SNAPSHOT: missing unified_release_firewall_snapshot_id'] };
  }
  const items = input.chain_items || [];
  const missing = findMissingVersions(items);
  const dupes = findDuplicateVersions(items);
  if (missing.length > 0) {
    return { ...BASE, firewall_chain_integrity_verifier_id: input.firewall_chain_integrity_verifier_id, unified_release_firewall_snapshot_id: input.unified_release_firewall_snapshot_id, unified_release_firewall_snapshot_ready: true, missing_versions: missing, errors: [`FIREWALL_CHAIN_INTEGRITY_INCOMPLETE: missing versions: ${missing.join(', ')}`] };
  }
  if (dupes.length > 0) {
    return { ...BASE, firewall_chain_integrity_verifier_id: input.firewall_chain_integrity_verifier_id, unified_release_firewall_snapshot_id: input.unified_release_firewall_snapshot_id, unified_release_firewall_snapshot_ready: true, errors: [`FIREWALL_CHAIN_INTEGRITY_INCOMPLETE: duplicate versions: ${dupes.join(', ')}`] };
  }
  const errors = [];
  for (const it of items) {
    if (!it || !it.chain_id || typeof it.chain_id !== 'string') { errors.push('FIREWALL_CHAIN_INTEGRITY_INCOMPLETE: item missing chain_id'); continue; }
    if (!ALLOWED_CHAIN_TYPES.has(it.chain_type)) { errors.push(`FIREWALL_CHAIN_INTEGRITY_INCOMPLETE: item ${it.chain_id} invalid chain_type`); }
    if (!it.chain_hash || typeof it.chain_hash !== 'string' || it.chain_hash.length !== 64) { errors.push(`FIREWALL_CHAIN_INTEGRITY_INCOMPLETE: item ${it.chain_id} invalid chain_hash`); }
  }
  const controls = input.required_chain_controls || [];
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) { errors.push(`FIREWALL_CHAIN_INTEGRITY_INCOMPLETE: missing controls: ${missingControls.join(', ')}`); }
  if (!input.chain_level || typeof input.chain_level !== 'string') { errors.push('FIREWALL_CHAIN_INTEGRITY_INCOMPLETE: missing chain_level'); }
  if (errors.length > 0) return { ...BASE, firewall_chain_integrity_verifier_id: input.firewall_chain_integrity_verifier_id, unified_release_firewall_snapshot_id: input.unified_release_firewall_snapshot_id, unified_release_firewall_snapshot_ready: true, errors };
  const h = hash({ id: input.firewall_chain_integrity_verifier_id, items, controls, level: input.chain_level });
  return {
    ...BASE,
    firewall_chain_integrity_verifier_id: input.firewall_chain_integrity_verifier_id,
    firewall_chain_integrity_verifier_ready: true,
    unified_release_firewall_snapshot_id: input.unified_release_firewall_snapshot_id,
    unified_release_firewall_snapshot_ready: true,
    chain_items: input.chain_items,
    chain_items_count: input.chain_items.length,
    missing_versions: [],
    required_chain_controls: controls,
    required_chain_controls_count: controls.length,
    chain_level: input.chain_level,
    chain_hash: h,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.firewall_chain_integrity_verifier_id) e.push('missing firewall_chain_integrity_verifier_id');
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
  if (!result || typeof result !== 'object') return 'FIREWALL_CHAIN_INTEGRITY_BLOCKED_INPUT';
  let status;
  if (result.firewall_chain_integrity_verifier_ready) status = 'FIREWALL_CHAIN_INTEGRITY_READY';
  else if (result.errors?.some(e => e.startsWith('FIREWALL_CHAIN_INTEGRITY_BLOCKED_SNAPSHOT'))) status = 'FIREWALL_CHAIN_INTEGRITY_BLOCKED_SNAPSHOT';
  else if (result.errors?.some(e => e.startsWith('FIREWALL_CHAIN_INTEGRITY_INCOMPLETE'))) status = 'FIREWALL_CHAIN_INTEGRITY_INCOMPLETE';
  else status = 'FIREWALL_CHAIN_INTEGRITY_BLOCKED_INPUT';
  let out = `=== ${status} ===\nfirewall_chain_integrity_verifier_id: ${result.firewall_chain_integrity_verifier_id || '(none)'}\nfirewall_chain_integrity_verifier_ready: ${result.firewall_chain_integrity_verifier_ready}\nunified_release_firewall_snapshot_id: ${result.unified_release_firewall_snapshot_id || '(none)'}\nunified_release_firewall_snapshot_ready: ${result.unified_release_firewall_snapshot_ready}\nchain_items_count: ${result.chain_items_count}\nchain_level: ${result.chain_level || '(none)'}\n`;
  if (result.chain_hash) out += `chain_hash: ${result.chain_hash}\n`;
  if (result.missing_versions?.length) out += `missing_versions: ${result.missing_versions.join(', ')}\n`;
  ['firewall_chain_integrity_confirmed','release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','production_touched','artifact_published','billing_executed','secrets_accessed','network_accessed','rollback_executed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
