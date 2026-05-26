// V468 AUTO ROLLBACK DRILL CONTRACT
//*****************
// Generation: $(new Date().toISOString())
// Status: 🟢 Ready for PR
// Status Reason: Contract metadata only

import crypto from 'node:crypto';

const MODULE_VERSION = 'V468';

export const STATUSES = Object.freeze({
  READY: 'AUTO_ROLLBACK_DRILL_CONTRACT_READY',
  BLOCKED_INPUT: 'AUTO_ROLLBACK_DRILL_CONTRACT_BLOCKED_INPUT',
  BLOCKED_RUNTIME: 'AUTO_ROLLBACK_DRILL_CONTRACT_BLOCKED_RUNTIME',
  FAIL: 'AUTO_ROLLBACK_DRILL_CONTRACT_FAIL'
});

function isPlainObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

export function build(input = {}) {
  // 1. Input object check
  if (!isPlainObject(input)) {
    return { status: STATUSES.BLOCKED_INPUT, errors: ['INPUT_NOT_OBJECT'] };
  }

  // 2. Runtime truth probe ready
  if (input.runtime_truth_probe_ready !== true) {
    return { status: STATUSES.BLOCKED_RUNTIME, errors: ['RUNTIME_TRUTH_PROBE_NOT_READY'] };
  }

  // 3. Rollback drill plan existence
  if (!isPlainObject(input.rollback_drill_plan)) {
    return { status: STATUSES.BLOCKED_INPUT, errors: ['ROLLBACK_DRILL_PLAN_NOT_OBJECT'] };
  }

  // 4. Required controls array
  if (!Array.isArray(input.required_controls)) {
    return { status: STATUSES.BLOCKED_INPUT, errors: ['REQUIRED_CONTROLS_NOT_ARRAY'] };
  }

  const plan = input.rollback_drill_plan;
  const requiredFields = [
    'previous_stable_version_declared',
    'rollback_target_declared',
    'rollback_trigger_policy_declared',
    'rollback_health_check_declared',
    'rollback_smoke_check_declared',
    'rollback_evidence_required',
    'rollback_dry_run_only',
    'rollback_real_execution_blocked'
  ];

  for (const field of requiredFields) {
    if (plan[field] !== true) {
      return {
        status: STATUSES.FAIL,
        error: `REQUIRED_ROLLBACK_DRILL_FIELD_NOT_TRUE: ${field}`
      };
    }
  }

  // Required controls validation
  const requiredControls = [
    'runtime-truth-probe-required',
    'previous-stable-version-required',
    'rollback-target-required',
    'rollback-trigger-policy-required',
    'rollback-health-check-required',
    'rollback-smoke-check-required',
    'rollback-evidence-required',
    'rollback-dry-run-only',
    'rollback-real-execution-blocked',
    'no-real-rollback',
    'no-production-touch',
    'no-release-execution',
    'no-deploy-execution'
  ];
  for (const ctrl of requiredControls) {
    if (!input.required_controls.includes(ctrl)) {
      return {
        status: STATUSES.FAIL,
        error: `MISSING_REQUIRED_CONTROL: ${ctrl}`
      };
    }
  }

  // Dangerous flags (must be false if present)
  const dangerousFlags = [
    'rollback_execution_allowed',
    'production_touched',
    'deploy_allowed',
    'release_allowed',
    'real_release_execution_allowed',
    'network_allowed',
    'secret_access_allowed',
    'billing_execution_allowed',
    'tag_allowed',
    'stable_promotion_allowed'
  ];
  for (const flag of dangerousFlags) {
    if (input[flag] !== undefined && input[flag] !== false) {
      return {
        status: STATUSES.FAIL,
        error: `Dangerous flag ${flag} must be false`
      };
    }
  }

  // Build deterministic evidence hash
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify({
    module: MODULE_VERSION,
    plan,
    controls: input.required_controls.sort()
  }));
  const evidence_hash = hash.digest('hex');

  const result = {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    errors: [],
    auto_rollback_drill_contract_ready: true,
    rollback_ready_verified: false,
    rollback_drill_verified: false,
    previous_stable_version_declared: true,
    rollback_target_declared: true,
    rollback_trigger_policy_declared: true,
    rollback_health_check_declared: true,
    rollback_smoke_check_declared: true,
    rollback_evidence_required: true,
    rollback_dry_run_only: true,
    rollback_real_execution_blocked: true,
    evidence_hash,
    final_message: 'V468 auto rollback drill contract prepared. Real rollback execution remains blocked until explicit PASS GOLD REAL authorization.',
    // dangerous flags default false
    rollback_execution_allowed: false,
    production_touched: false,
    deploy_allowed: false,
    release_allowed: false,
    real_release_execution_allowed: false,
    network_allowed: false,
    secret_access_allowed: false,
    billing_execution_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false
  };

  return result;
}

export function validate(result) {
  if (!result) return { valid: false };
  const ok =
    result.module_version === MODULE_VERSION &&
    result.status === STATUSES.READY &&
    result.ready === true &&
    result.auto_rollback_drill_contract_ready === true &&
    result.rollback_ready_verified === false &&
    result.rollback_drill_verified === false &&
    result.rollback_dry_run_only === true &&
    result.rollback_real_execution_blocked === true &&
    result.evidence_hash && result.evidence_hash.length === 64 &&
    result.rollback_execution_allowed === false &&
    result.production_touched === false &&
    result.deploy_allowed === false &&
    result.release_allowed === false &&
    result.real_release_execution_allowed === false &&
    result.network_allowed === false &&
    result.secret_access_allowed === false &&
    result.billing_execution_allowed === false &&
    result.tag_allowed === false &&
    result.stable_promotion_allowed === false;
  return { valid: ok };
}

export function render(result) {
  const lines = [];
  lines.push('V468 Auto Rollback Drill Contract');
  lines.push(`STATUS: ${result.status}`);
  lines.push(`FINAL MESSAGE: ${result.final_message}`);
  lines.push(`EVIDENCE_HASH: ${result.evidence_hash}`);
  lines.push('DANGEROUS FLAGS:');
  lines.push(`rollback_execution_allowed=${result.rollback_execution_allowed}`);
  lines.push(`production_touched=${result.production_touched}`);
  lines.push(`deploy_allowed=${result.deploy_allowed}`);
  lines.push(`release_allowed=${result.release_allowed}`);
  lines.push(`network_allowed=${result.network_allowed}`);
  lines.push('REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable');
  return { status: STATUSES.READY, content: lines.join('\n') };
}

export default { STATUSES, build, validate, render };
