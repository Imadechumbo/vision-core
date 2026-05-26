import crypto from 'node:crypto';

const MODULE_VERSION = 'V469';

export const STATUSES = Object.freeze({
  READY: 'STABLE_PROMOTION_CONTROLLER_READY',
  BLOCKED_INPUT: 'STABLE_PROMOTION_CONTROLLER_BLOCKED_INPUT',
  BLOCKED_ROLLBACK: 'STABLE_PROMOTION_CONTROLLER_BLOCKED_ROLLBACK',
  FAIL: 'STABLE_PROMOTION_CONTROLLER_FAIL',
});

const REQUIRED_FIELDS = Object.freeze([
  'pass_gold_real_contract_ready',
  'runtime_truth_verified',
  'rollback_drill_verified',
  'watchdog_bound',
  'final_pass_gold_receipt_bound',
  'human_authority_bound',
  'previous_stable_preserved',
  'stable_candidate_verified',
  'fake_pass_gold_rejected',
  'synthetic_evidence_rejected',
]);

const REQUIRED_CONTROLS = Object.freeze([
  'auto-rollback-drill-contract-required',
  'pass-gold-real-contract-required',
  'runtime-truth-required',
  'rollback-drill-required',
  'watchdog-required',
  'final-pass-gold-receipt-required',
  'human-authority-required',
  'previous-stable-preserved',
  'stable-candidate-verified',
  'fake-pass-gold-rejected',
  'synthetic-evidence-rejected',
  'no-unverified-stable-promotion',
  'stable-promotion-blocked-until-pass-gold-real',
]);

const FINAL_MESSAGE = 'V469 stable promotion controller prepared. Stable promotion remains blocked until PASS GOLD REAL evidence and human authority are verified.';

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
    stable_promotion_controller_ready: false,
    stable_promotion_allowed: false,
    pass_gold_real_verified: false,
    human_authority_verified: false,
    runtime_truth_verified: false,
    rollback_drill_verified: false,
    tag_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    production_touched: false,
    real_release_execution_allowed: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
  };
}

export function build(input = {}) {
  if (!isPlainObject(input)) return blockedInput('INPUT_NOT_OBJECT');

  const {
    auto_rollback_drill_contract_ready,
    stable_promotion_requirements,
    required_controls,
  } = input;

  if (auto_rollback_drill_contract_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_ROLLBACK,
      ready: false,
      errors: ['AUTO_ROLLBACK_DRILL_CONTRACT_NOT_READY'],
      stable_promotion_controller_ready: false,
      stable_promotion_allowed: false,
      pass_gold_real_verified: false,
      human_authority_verified: false,
      runtime_truth_verified: false,
      rollback_drill_verified: false,
      tag_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      production_touched: false,
      real_release_execution_allowed: false,
      billing_execution_allowed: false,
      secret_access_allowed: false,
      network_allowed: false,
      rollback_execution_allowed: false,
    };
  }

  if (!isPlainObject(stable_promotion_requirements)) {
    return blockedInput('STABLE_PROMOTION_REQUIREMENTS_NOT_OBJECT');
  }

  if (!Array.isArray(required_controls)) {
    return blockedInput('REQUIRED_CONTROLS_NOT_ARRAY');
  }

  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (stable_promotion_requirements[field] !== true) {
      errors.push(`REQUIRED_STABLE_PROMOTION_FIELD_NOT_TRUE: ${field}`);
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
      stable_promotion_controller_ready: false,
      stable_promotion_allowed: false,
      pass_gold_real_verified: false,
      human_authority_verified: false,
      runtime_truth_verified: false,
      rollback_drill_verified: false,
      tag_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      production_touched: false,
      real_release_execution_allowed: false,
      billing_execution_allowed: false,
      secret_access_allowed: false,
      network_allowed: false,
      rollback_execution_allowed: false,
    };
  }

  const evidence_hash = stableHash({
    module_version: MODULE_VERSION,
    stable_promotion_requirements,
    required_controls: [...required_controls].sort(),
    final_message: FINAL_MESSAGE,
  });

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    errors: [],
    stable_promotion_controller_ready: true,
    stable_promotion_allowed: false,
    stable_candidate_verified: true,
    previous_stable_preserved: true,
    pass_gold_real_verified: false,
    human_authority_verified: false,
    runtime_truth_verified: false,
    rollback_drill_verified: false,
    fake_pass_gold_rejected: true,
    synthetic_evidence_rejected: true,
    tag_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    production_touched: false,
    real_release_execution_allowed: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
    evidence_hash,
    final_message: FINAL_MESSAGE,
  };
}

export function validate(result) {
  return Boolean(
    result &&
    result.module_version === MODULE_VERSION &&
    result.status === STATUSES.READY &&
    result.ready === true &&
    result.stable_promotion_controller_ready === true &&
    result.stable_promotion_allowed === false &&
    result.pass_gold_real_verified === false &&
    result.human_authority_verified === false &&
    result.runtime_truth_verified === false &&
    result.rollback_drill_verified === false &&
    result.fake_pass_gold_rejected === true &&
    result.synthetic_evidence_rejected === true &&
    result.tag_allowed === false &&
    result.release_allowed === false &&
    result.deploy_allowed === false &&
    result.production_touched === false &&
    result.real_release_execution_allowed === false &&
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
    return 'V469 Stable Promotion Controller: NO RESULT. REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }

  return [
    'V469 Stable Promotion Controller',
    `status=${result.status}`,
    `ready=${result.ready}`,
    'stable promotion: controller prepared; no stable promotion authorized.',
    `stable_promotion_controller_ready=${result.stable_promotion_controller_ready}`,
    `stable_promotion_allowed=${result.stable_promotion_allowed}`,
    `pass_gold_real_verified=${result.pass_gold_real_verified}`,
    `human_authority_verified=${result.human_authority_verified}`,
    `runtime_truth_verified=${result.runtime_truth_verified}`,
    `rollback_drill_verified=${result.rollback_drill_verified}`,
    `production_touched=${result.production_touched}`,
    `real_release_execution_allowed=${result.real_release_execution_allowed}`,
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