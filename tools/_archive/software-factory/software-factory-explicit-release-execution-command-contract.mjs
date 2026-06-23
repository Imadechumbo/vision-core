import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_EXPLICIT_RELEASE_EXECUTION_COMMAND_CONTRACT_STATUSES = [
  'EXPLICIT_RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT',
  'EXPLICIT_RELEASE_EXECUTION_COMMAND_BLOCKED_AUTHORITY',
  'EXPLICIT_RELEASE_EXECUTION_COMMAND_DENIED',
  'EXPLICIT_RELEASE_EXECUTION_COMMAND_READY',
];

const ALLOWED_COMMAND_MODES = ['contract-only', 'metadata-only', 'dry-run', 'planning'];
const REQUIRED_COMMAND_CONTROLS = [
  'explicit-command-required', 'pass-gold-required', 'human-authority-required',
  'no-production-touch', 'no-real-release', 'no-real-deploy', 'no-tag-create',
  'no-stable-promotion', 'no-artifact-publish', 'no-billing-execution',
  'no-secret-access', 'rollback-required', 'evidence-required', 'audit-required',
];

const BASE = {
  schema_version: 'v355.0', explicit_release_execution_command_id: null,
  explicit_release_execution_command_ready: false,
  command_mode: null, requested_by: null, command_reason: null,
  required_command_controls_count: 0,
  explicit_release_execution_command_hash: null,
  explicit_release_execution_command_received: false,
  release_execution_consent_bound: false, final_production_preflight_passed: false,
  real_release_execution_barrier_open: false,
  explicit_release_execution_phase_passed: false,
  real_release_executed: false, real_deploy_executed: false,
  real_tag_created: false, real_stable_promoted: false,
  pass_gold_release_authority_phase_passed: false,
  human_release_authority_bound: false,
  release_execution_plan_published: false,
  final_rollback_authority_bound: false,
  production_release_final_review_approved: false,
  pass_gold_release_evidence_bound: false,
  release_go_decision: false,
  production_release_scope_locked: false,
  release_candidate_integrity_bound: false,
  final_release_ready: false,
  release_execution_allowed: false, deployment_execution_allowed: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false,
  real_patch_applied: false, production_touched: false,
  saas_enabled: false, billing_executed: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function hasAllRequiredControls(controls) {
  for (const rc of REQUIRED_COMMAND_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['EXPLICIT_RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT'] };
  if (!input.explicit_release_execution_command_id || typeof input.explicit_release_execution_command_id !== 'string')
    return { ...BASE, errors: ['EXPLICIT_RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT: missing explicit_release_execution_command_id'] };
  if (input.pass_gold_release_authority_phase_gate_ready !== true)
    return { ...BASE, explicit_release_execution_command_id: input.explicit_release_execution_command_id, errors: ['EXPLICIT_RELEASE_EXECUTION_COMMAND_BLOCKED_AUTHORITY: pass_gold_release_authority_phase_gate_ready must be true'] };
  if (!input.pass_gold_release_authority_phase_gate_id || typeof input.pass_gold_release_authority_phase_gate_id !== 'string')
    return { ...BASE, explicit_release_execution_command_id: input.explicit_release_execution_command_id, errors: ['EXPLICIT_RELEASE_EXECUTION_COMMAND_BLOCKED_AUTHORITY: missing pass_gold_release_authority_phase_gate_id'] };
  if (input.explicit_v355_command !== true)
    return { ...BASE, explicit_release_execution_command_id: input.explicit_release_execution_command_id, errors: ['EXPLICIT_RELEASE_EXECUTION_COMMAND_DENIED: explicit_v355_command must be true'] };
  if (!input.requested_by || typeof input.requested_by !== 'string')
    return { ...BASE, explicit_release_execution_command_id: input.explicit_release_execution_command_id, errors: ['EXPLICIT_RELEASE_EXECUTION_COMMAND_DENIED: requested_by required'] };
  if (!input.command_reason || typeof input.command_reason !== 'string')
    return { ...BASE, explicit_release_execution_command_id: input.explicit_release_execution_command_id, errors: ['EXPLICIT_RELEASE_EXECUTION_COMMAND_DENIED: command_reason required'] };
  if (!input.command_mode || !ALLOWED_COMMAND_MODES.includes(input.command_mode))
    return { ...BASE, explicit_release_execution_command_id: input.explicit_release_execution_command_id, errors: ['EXPLICIT_RELEASE_EXECUTION_COMMAND_DENIED: command_mode must be allowed'] };
  if (!Array.isArray(input.required_command_controls))
    return { ...BASE, explicit_release_execution_command_id: input.explicit_release_execution_command_id, errors: ['EXPLICIT_RELEASE_EXECUTION_COMMAND_DENIED: required_command_controls required'] };
  if (!hasAllRequiredControls(input.required_command_controls))
    return { ...BASE, explicit_release_execution_command_id: input.explicit_release_execution_command_id, errors: ['EXPLICIT_RELEASE_EXECUTION_COMMAND_DENIED: required_command_controls must include all required controls'] };

  const cid = input.explicit_release_execution_command_id;
  const h = hash({ cid, authority_id: input.pass_gold_release_authority_phase_gate_id, command: input.explicit_v355_command, by: input.requested_by, reason: input.command_reason, mode: input.command_mode, controls: input.required_command_controls });
  return { ...BASE, explicit_release_execution_command_id: cid, explicit_release_execution_command_ready: true, command_mode: input.command_mode, requested_by: input.requested_by, command_reason: input.command_reason, required_command_controls_count: input.required_command_controls.length, explicit_release_execution_command_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid explicit release execution command contract'] };
  const e = [];
  if (!result.explicit_release_execution_command_id) e.push('missing explicit_release_execution_command_id');
  ['explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'EXPLICIT_RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT';
  const status = result.explicit_release_execution_command_ready ? 'EXPLICIT_RELEASE_EXECUTION_COMMAND_READY' :
    result.errors?.some(e => e.startsWith('EXPLICIT_RELEASE_EXECUTION_COMMAND_BLOCKED_AUTHORITY')) ? 'EXPLICIT_RELEASE_EXECUTION_COMMAND_BLOCKED_AUTHORITY' :
    result.errors?.some(e => e.startsWith('EXPLICIT_RELEASE_EXECUTION_COMMAND_DENIED')) ? 'EXPLICIT_RELEASE_EXECUTION_COMMAND_DENIED' : 'EXPLICIT_RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT';
  let out = `=== ${status} ===\nexplicit_release_execution_command_id: ${result.explicit_release_execution_command_id || '(none)'}\nexplicit_release_execution_command_ready: ${result.explicit_release_execution_command_ready}\ncommand_mode: ${result.command_mode || '(none)'}\nrequested_by: ${result.requested_by || '(none)'}\ncommand_reason: ${result.command_reason || '(none)'}\nrequired_command_controls_count: ${result.required_command_controls_count}\n`;
  if (result.explicit_release_execution_command_hash) out += `explicit_release_execution_command_hash: ${result.explicit_release_execution_command_hash}\n`;
  ['explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}