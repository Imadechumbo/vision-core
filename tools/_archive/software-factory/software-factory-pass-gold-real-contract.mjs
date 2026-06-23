import crypto from 'node:crypto';

const MODULE_VERSION = 'V466';

export const STATUSES = Object.freeze({
  READY: 'PASS_GOLD_REAL_CONTRACT_READY',
  BLOCKED_INPUT: 'PASS_GOLD_REAL_CONTRACT_BLOCKED_INPUT',
  FAIL: 'PASS_GOLD_REAL_CONTRACT_FAIL',
});

const REQUIRED_REQUIREMENTS = Object.freeze([
  'runtime-health-verified',
  'runtime-readiness-verified',
  'runtime-version-verified',
  'primary-smoke-flow-verified',
  'rollback-ready-verified',
  'rollback-drill-verified',
  'previous-stable-bound',
  'stable-candidate-bound',
  'evidence-receipt-real-required',
  'human-authority-bound',
  'production-watchdog-required',
  'no-fake-pass-gold',
  'no-synthetic-evidence',
  'no-unverified-stable-promotion',
]);

const REQUIRED_CONTROLS = Object.freeze([
  'pass-gold-real-required',
  'runtime-truth-required',
  'smoke-flow-required',
  'rollback-proof-required',
  'stable-control-required',
  'watchdog-required',
  'evidence-receipt-required',
  'human-authority-required',
  'no-fake-pass-gold',
  'no-synthetic-evidence',
  'no-real-release',
  'no-real-deploy',
  'no-tag-create',
  'no-stable-promotion',
  'no-production-touch',
  'no-billing-execution',
  'no-secret-access',
  'no-network',
  'no-real-rollback',
]);

const FINAL_MESSAGE = 'V466 PASS GOLD REAL contract defined. Real release execution remains blocked until runtime truth, rollback proof, stable promotion control, watchdog evidence, and human authority are all verified.';

function stableHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function blockedInput(reason) {
  return {
    module_version: MODULE_VERSION,
    status: STATUSES.BLOCKED_INPUT,
    ready: false,
    errors: [reason],
    pass_gold_real_contract_ready: false,
    pass_gold_real_verified: false,
    real_release_execution_allowed: false,
    deploy_allowed: false,
    release_allowed: false,
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
  if (!isPlainObject(input)) return blockedInput('INPUT_NOT_OBJECT');

  const {
    pass_gold_real_requirements,
    required_controls,
  } = input;

  if (!Array.isArray(pass_gold_real_requirements)) {
    return blockedInput('PASS_GOLD_REAL_REQUIREMENTS_NOT_ARRAY');
  }

  if (!Array.isArray(required_controls)) {
    return blockedInput('REQUIRED_CONTROLS_NOT_ARRAY');
  }

  const errors = [];

  for (const item of pass_gold_real_requirements) {
    if (!isPlainObject(item) || typeof item.id !== 'string' || item.id.trim() === '') {
      errors.push('INVALID_PASS_GOLD_REAL_REQUIREMENT_ID');
    }

    if (!isPlainObject(item) || typeof item.type !== 'string' || item.type.trim() === '') {
      errors.push('INVALID_PASS_GOLD_REAL_REQUIREMENT_TYPE');
    }

    if (!isPlainObject(item) || item.verified !== true) {
      errors.push('PASS_GOLD_REAL_REQUIREMENT_NOT_VERIFIED');
    }
  }

  const requirementIds = pass_gold_real_requirements
    .filter(isPlainObject)
    .map((item) => item.id);

  for (const requirement of REQUIRED_REQUIREMENTS) {
    if (!requirementIds.includes(requirement)) {
      errors.push(`MISSING_REQUIRED_REQUIREMENT: ${requirement}`);
    }
  }

  for (const control of REQUIRED_CONTROLS) {
    if (!required_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  if (errors.length > 0) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors,
      pass_gold_real_contract_ready: false,
      pass_gold_real_verified: false,
      real_release_execution_allowed: false,
      deploy_allowed: false,
      release_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
      production_touched: false,
      billing_execution_allowed: false,
      secret_access_allowed: false,
      network_allowed: false,
      rollback_execution_allowed: false,
    };
  }

  const pass_gold_real_requirements_verified = pass_gold_real_requirements.map((item) => ({
    id: item.id,
    type: item.type,
    verified: true,
  }));

  const evidence_hash = stableHash({
    module_version: MODULE_VERSION,
    pass_gold_real_requirements_verified,
    required_controls: [...required_controls].sort(),
    final_message: FINAL_MESSAGE,
  });

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    errors: [],
    pass_gold_real_contract_ready: true,
    pass_gold_real_verified: false,
    runtime_health_verified: false,
    runtime_readiness_verified: false,
    primary_smoke_flow_verified: false,
    rollback_ready_verified: false,
    rollback_drill_verified: false,
    stable_candidate_bound: true,
    previous_stable_bound: true,
    evidence_receipt_real_required: true,
    human_authority_bound: true,
    production_watchdog_required: true,
    no_fake_pass_gold: true,
    no_synthetic_evidence: true,
    pass_gold_real_requirements_verified,
    required_controls,
    evidence_hash,
    final_message: FINAL_MESSAGE,
    real_release_execution_allowed: false,
    deploy_allowed: false,
    release_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
    production_touched: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
  };
}

export function validate(result) {
  return Boolean(
    result &&
    result.module_version === MODULE_VERSION &&
    result.status === STATUSES.READY &&
    result.ready === true &&
    result.pass_gold_real_contract_ready === true &&
    result.pass_gold_real_verified === false &&
    result.stable_candidate_bound === true &&
    result.previous_stable_bound === true &&
    result.evidence_receipt_real_required === true &&
    result.human_authority_bound === true &&
    result.production_watchdog_required === true &&
    result.no_fake_pass_gold === true &&
    result.no_synthetic_evidence === true &&
    result.real_release_execution_allowed === false &&
    result.deploy_allowed === false &&
    result.release_allowed === false &&
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
    return 'V466 PASS GOLD REAL Contract: NO RESULT. REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }

  return [
    'V466 PASS GOLD REAL Contract',
    `status=${result.status}`,
    `ready=${result.ready}`,
    `pass_gold_real_contract_ready=${result.pass_gold_real_contract_ready}`,
    `pass_gold_real_verified=${result.pass_gold_real_verified}`,
    `runtime_health_verified=${result.runtime_health_verified}`,
    `runtime_readiness_verified=${result.runtime_readiness_verified}`,
    `primary_smoke_flow_verified=${result.primary_smoke_flow_verified}`,
    `rollback_ready_verified=${result.rollback_ready_verified}`,
    `rollback_drill_verified=${result.rollback_drill_verified}`,
    `stable_candidate_bound=${result.stable_candidate_bound}`,
    `previous_stable_bound=${result.previous_stable_bound}`,
    `real_release_execution_allowed=${result.real_release_execution_allowed}`,
    `stable_promotion_allowed=${result.stable_promotion_allowed}`,
    `production_touched=${result.production_touched}`,
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