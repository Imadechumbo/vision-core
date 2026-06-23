import crypto from 'node:crypto';

const MODULE_VERSION = 'RTA-0';

export const STATUSES = Object.freeze({
  READY: 'REAL_RUNTIME_PASS_GOLD_AUTHORIZATION_PLAN_READY',
  BLOCKED_INPUT: 'REAL_RUNTIME_PASS_GOLD_AUTHORIZATION_PLAN_BLOCKED_INPUT',
  BLOCKED_CLOSURE: 'REAL_RUNTIME_PASS_GOLD_AUTHORIZATION_PLAN_BLOCKED_CLOSURE',
  FAIL: 'REAL_RUNTIME_PASS_GOLD_AUTHORIZATION_PLAN_FAIL',
});

const REQUIRED_PLAN_FIELDS = Object.freeze([
  'health_probe_declared',
  'readiness_probe_declared',
  'version_probe_declared',
  'smoke_probe_declared',
  'rollback_readiness_probe_declared',
  'rollback_drill_evidence_declared',
  'watchdog_evidence_declared',
  'human_authority_required',
  'no_release_execution',
  'no_deploy_execution',
  'no_tag_creation',
  'no_stable_promotion',
  'no_production_touch',
  'no_billing_access',
  'no_secret_access',
  'no_network_to_production',
  'no_real_rollback_execution',
]);

const REQUIRED_EVIDENCE = Object.freeze([
  'exact-command',
  'timestamp',
  'exit-code',
  'stdout-summary',
  'stderr-summary',
  'commit-hash',
  'environment',
  'no-production-touch-proof',
  'no-secrets-proof',
  'rollback-readiness-proof',
  'watchdog-proof',
  'human-authority-record',
]);

const REQUIRED_CONTROLS = Object.freeze([
  'v466-v470-closure-required',
  'human-authority-required',
  'runtime-health-required',
  'runtime-readiness-required',
  'runtime-version-binding-required',
  'smoke-flow-required',
  'rollback-readiness-required',
  'rollback-drill-evidence-required',
  'watchdog-evidence-required',
  'no-release-execution',
  'no-deploy-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'no-production-touch',
  'no-billing-access',
  'no-secret-access',
  'no-network-to-production',
  'no-real-rollback-execution',
  'v471-blocked',
]);

const FINAL_MESSAGE = 'RTA-0 real-runtime PASS GOLD authorization plan prepared. Runtime execution remains blocked until explicit human authorization and complete evidence binding.';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function blockedInput(reason) {
  return {
    module_version: MODULE_VERSION,
    status: STATUSES.BLOCKED_INPUT,
    ready: false,
    errors: [reason],
    real_runtime_authorization_plan_ready: false,
    v466_v470_closure_complete: false,
    runtime_execution_authorized: false,
    pass_gold_real_achieved: false,
    v471_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
    production_touched: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
  };
}

export function build(input = {}) {
  // 1. Input object check
  if (!isPlainObject(input)) {
    return blockedInput('INPUT_NOT_OBJECT');
  }

  const {
    v466_v470_closure_complete,
    runtime_authorization_plan,
    required_evidence,
    required_controls,
  } = input;

  // 2. V466-V470 closure check
  if (v466_v470_closure_complete !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_CLOSURE,
      ready: false,
      errors: ['V466_V470_CLOSURE_NOT_COMPLETE'],
      real_runtime_authorization_plan_ready: false,
      v466_v470_closure_complete: false,
      runtime_execution_authorized: false,
      pass_gold_real_achieved: false,
      v471_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
      production_touched: false,
      billing_execution_allowed: false,
      secret_access_allowed: false,
      network_allowed: false,
      rollback_execution_allowed: false,
    };
  }

  // 3. Runtime authorization plan check
  if (!isPlainObject(runtime_authorization_plan)) {
    return blockedInput('RUNTIME_AUTHORIZATION_PLAN_NOT_OBJECT');
  }

  // 4. Required evidence check
  if (!Array.isArray(required_evidence)) {
    return blockedInput('REQUIRED_EVIDENCE_NOT_ARRAY');
  }

  // 5. Required controls check
  if (!Array.isArray(required_controls)) {
    return blockedInput('REQUIRED_CONTROLS_NOT_ARRAY');
  }

  const errors = [];

  // 6. Check required runtime authorization plan fields
  for (const field of REQUIRED_PLAN_FIELDS) {
    if (runtime_authorization_plan[field] !== true) {
      errors.push(`REQUIRED_RUNTIME_AUTHORIZATION_FIELD_NOT_TRUE: ${field}`);
    }
  }

  // 7. Check required evidence items
  for (const item of REQUIRED_EVIDENCE) {
    if (!REQUIRED_EVIDENCE.includes(item)) {
      errors.push(`INVALID_EVIDENCE_ITEM: ${item}`);
    }
  }

  // 8. Check missing required evidence
  for (const item of REQUIRED_EVIDENCE) {
    if (!required_evidence.includes(item)) {
      errors.push(`MISSING_REQUIRED_EVIDENCE: ${item}`);
    }
  }

  // 9. Check missing required controls
  for (const control of REQUIRED_CONTROLS) {
    if (!required_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  // 10. Return FAIL if errors exist
  if (errors.length > 0) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors,
      real_runtime_authorization_plan_ready: false,
      v466_v470_closure_complete: true,
      runtime_execution_authorized: false,
      pass_gold_real_achieved: false,
      v471_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
      production_touched: false,
      billing_execution_allowed: false,
      secret_access_allowed: false,
      network_allowed: false,
      rollback_execution_allowed: false,
    };
  }

  // 11. Build deterministic evidence hash
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify({
    module_version: MODULE_VERSION,
    runtime_authorization_plan,
    required_evidence: [...required_evidence].sort(),
    required_controls: [...required_controls].sort(),
    final_message: FINAL_MESSAGE,
  }));
  const evidence_hash = hash.digest('hex');

  // 12. Return READY result
  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    errors: [],
    real_runtime_authorization_plan_ready: true,
    v466_v470_closure_complete: true,
    runtime_execution_authorized: false,
    pass_gold_real_achieved: false,
    v471_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
    production_touched: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
    evidence_hash,
    final_message: FINAL_MESSAGE,
    runtime_authorization_plan,
    required_evidence,
    required_controls,
  };
}

export function validate(result) {
  return Boolean(
    result &&
    result.module_version === MODULE_VERSION &&
    result.status === STATUSES.READY &&
    result.ready === true &&
    result.real_runtime_authorization_plan_ready === true &&
    result.v466_v470_closure_complete === true &&
    result.runtime_execution_authorized === false &&
    result.pass_gold_real_achieved === false &&
    result.v471_allowed === false &&
    result.release_allowed === false &&
    result.deploy_allowed === false &&
    result.tag_allowed === false &&
    result.stable_promotion_allowed === false &&
    result.production_touched === false &&
    result.billing_execution_allowed === false &&
    result.secret_access_allowed === false &&
    result.network_allowed === false &&
    result.rollback_execution_allowed === false &&
    typeof result.evidence_hash === 'string' &&
    result.evidence_hash.length === 64
  );
}

export function render(result) {
  if (!result) {
    return 'RTA-0 Real-Runtime PASS GOLD Authorization Plan: NO RESULT. REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }

  return [
    'RTA-0 Real-Runtime PASS GOLD Authorization Plan',
    'V466-V470 closure',
    'runtime execution remains blocked',
    'V471 blocked',
    `status=${result.status}`,
    `ready=${result.ready}`,
    `real_runtime_authorization_plan_ready=${result.real_runtime_authorization_plan_ready}`,
    `v466_v470_closure_complete=${result.v466_v470_closure_complete}`,
    `runtime_execution_authorized=${result.runtime_execution_authorized}`,
    `pass_gold_real_achieved=${result.pass_gold_real_achieved}`,
    `v471_allowed=${result.v471_allowed}`,
    `release_allowed=${result.release_allowed}`,
    `deploy_allowed=${result.deploy_allowed}`,
    `tag_allowed=${result.tag_allowed}`,
    `stable_promotion_allowed=${result.stable_promotion_allowed}`,
    `production_touched=${result.production_touched}`,
    `network_allowed=${result.network_allowed}`,
    `rollback_execution_allowed=${result.rollback_execution_allowed}`,
    `evidence_hash=${result.evidence_hash || 'none'}`,
    `final_message=${result.final_message || 'none'}`,
    'REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}

export default {
  STATUSES,
  build,
  validate,
  render,
};