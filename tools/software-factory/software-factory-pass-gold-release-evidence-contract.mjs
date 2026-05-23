import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PASS_GOLD_RELEASE_EVIDENCE_CONTRACT_STATUSES = [
  'PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_INPUT',
  'PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_PHASE',
  'PASS_GOLD_RELEASE_EVIDENCE_FAIL',
  'PASS_GOLD_RELEASE_EVIDENCE_READY',
];

const ALLOWED_EVIDENCE_TYPES = [
  'pass_gold_status', 'pass_gold_receipt', 'release_phase_gate',
  'deployment_blocker', 'stable_blocker', 'tag_blocker',
  'production_blocker', 'rollback_blocker', 'audit_record',
  'authority_record', 'final_blocker',
];

const REQUIRED_EVIDENCE_TYPES = [
  'pass_gold_status', 'pass_gold_receipt', 'release_phase_gate',
  'deployment_blocker', 'stable_blocker', 'tag_blocker',
  'production_blocker', 'rollback_blocker', 'audit_record',
  'authority_record', 'final_blocker',
];

const ALLOWED_EVIDENCE_MODES = ['metadata-only', 'dry-run', 'contract-only', 'planning'];
const ALLOWED_EVIDENCE_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];

const BASE = {
  schema_version: 'v345.0', pass_gold_release_evidence_contract_id: null,
  pass_gold_release_evidence_contract_ready: false,
  pass_gold_evidence_items_count: 0, required_evidence_types_count: 0,
  evidence_level: null, pass_gold_release_evidence_hash: null,
  pass_gold_release_evidence_bound: false,
  release_go_decision: false, release_no_go_decision: false,
  production_release_scope_locked: false, release_candidate_integrity_bound: false,
  final_release_ready: false, human_release_authority_bound: false,
  release_execution_plan_published: false, final_rollback_authority_bound: false,
  production_release_final_review_approved: false,
  pass_gold_release_authority_phase_passed: false,
  release_execution_allowed: false, deployment_execution_allowed: false,
  deployment_scope_bound: false, release_artifact_published: false,
  deployment_dry_run_completed: false, release_execution_ready: false,
  release_execution_approved: false, deployment_evidence_published: false,
  release_rollback_bound: false, release_authority_granted: false,
  release_execution_phase_passed: false,
  product_activation_execution_allowed: false, production_touch_allowed: false,
  activation_execution_phase_passed: false, product_activation_allowed: false,
  saas_enablement_allowed: false, saas_enabled: false, billing_executed: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false,
  real_patch_applied: false, production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function hasAllRequiredTypes(types) {
  for (const rt of REQUIRED_EVIDENCE_TYPES) {
    if (!types.includes(rt)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_INPUT'] };
  if (!input.pass_gold_release_evidence_contract_id || typeof input.pass_gold_release_evidence_contract_id !== 'string')
    return { ...BASE, errors: ['PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_INPUT: missing pass_gold_release_evidence_contract_id'] };
  if (input.controlled_release_execution_phase_gate_ready !== true)
    return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_PHASE: controlled_release_execution_phase_gate_ready must be true'] };
  if (!input.controlled_release_execution_phase_gate_id || typeof input.controlled_release_execution_phase_gate_id !== 'string')
    return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_PHASE: missing controlled_release_execution_phase_gate_id'] };
  if (!Array.isArray(input.pass_gold_evidence_items) || input.pass_gold_evidence_items.length === 0)
    return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_FAIL: pass_gold_evidence_items required and non-empty'] };
  if (!Array.isArray(input.required_evidence_types))
    return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_FAIL: required_evidence_types required'] };
  if (!input.evidence_level || typeof input.evidence_level !== 'string')
    return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_FAIL: evidence_level required'] };
  if (!ALLOWED_EVIDENCE_LEVELS.includes(input.evidence_level))
    return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_FAIL: evidence_level must be allowed'] };

  for (const item of input.pass_gold_evidence_items) {
    if (!item.evidence_id || typeof item.evidence_id !== 'string')
      return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_FAIL: each item requires evidence_id'] };
    if (!item.evidence_type || !ALLOWED_EVIDENCE_TYPES.includes(item.evidence_type))
      return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_FAIL: each item requires valid evidence_type'] };
    if (!item.evidence_mode || !ALLOWED_EVIDENCE_MODES.includes(item.evidence_mode))
      return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_FAIL: each item requires valid evidence_mode'] };
    if (!item.evidence_hash || typeof item.evidence_hash !== 'string' || item.evidence_hash.length !== 64 || !/^[0-9a-f]{64}$/.test(item.evidence_hash))
      return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_FAIL: each item requires valid 64-char hex evidence_hash'] };
  }

  if (!hasAllRequiredTypes(input.required_evidence_types))
    return { ...BASE, pass_gold_release_evidence_contract_id: input.pass_gold_release_evidence_contract_id, errors: ['PASS_GOLD_RELEASE_EVIDENCE_FAIL: required_evidence_types must include all required types'] };

  const cid = input.pass_gold_release_evidence_contract_id;
  const h = hash({ cid, phase_id: input.controlled_release_execution_phase_gate_id, items: input.pass_gold_evidence_items, types: input.required_evidence_types, level: input.evidence_level });
  return { ...BASE, pass_gold_release_evidence_contract_id: cid, pass_gold_release_evidence_contract_ready: true, pass_gold_evidence_items_count: input.pass_gold_evidence_items.length, required_evidence_types_count: input.required_evidence_types.length, evidence_level: input.evidence_level, pass_gold_release_evidence_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid PASS GOLD release evidence contract'] };
  const e = [];
  if (!result.pass_gold_release_evidence_contract_id) e.push('missing pass_gold_release_evidence_contract_id');
  ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_INPUT';
  const status = result.pass_gold_release_evidence_contract_ready ? 'PASS_GOLD_RELEASE_EVIDENCE_READY' :
    result.errors?.some(e => e.startsWith('PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_PHASE')) ? 'PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_PHASE' :
    result.errors?.some(e => e.startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')) ? 'PASS_GOLD_RELEASE_EVIDENCE_FAIL' : 'PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_INPUT';
  let out = `=== ${status} ===\npass_gold_release_evidence_contract_id: ${result.pass_gold_release_evidence_contract_id || '(none)'}\npass_gold_release_evidence_contract_ready: ${result.pass_gold_release_evidence_contract_ready}\npass_gold_evidence_items_count: ${result.pass_gold_evidence_items_count}\nrequired_evidence_types_count: ${result.required_evidence_types_count}\neidence_level: ${result.evidence_level || '(none)'}\n`;
  if (result.pass_gold_release_evidence_hash) out += `pass_gold_release_evidence_hash: ${result.pass_gold_release_evidence_hash}\n`;
  ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}