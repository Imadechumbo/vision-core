import crypto from 'node:crypto';

const MODULE_VERSION = 'V465';

export const STATUSES = Object.freeze({
  READY: 'FINAL_EXECUTION_LOCK_VERIFICATION_PHASE_GATE_READY',
  BLOCKED_INPUT: 'FINAL_EXECUTION_LOCK_VERIFICATION_PHASE_GATE_BLOCKED_INPUT',
  BLOCKED_REVIEW: 'FINAL_EXECUTION_LOCK_VERIFICATION_PHASE_GATE_BLOCKED_REVIEW',
  FAIL: 'FINAL_EXECUTION_LOCK_VERIFICATION_PHASE_GATE_FAIL',
});

const REQUIRED_PHASE_CONTROLS = Object.freeze([
  'final-execution-lock-verification-required',
  'release-freeze-integrity-required',
  'freeze-integrity-evidence-required',
  'final-freeze-review-required',
  'metadata-only-phase-gate',
  'release-freeze-integrity-not-verified',
  'release-freeze-not-lifted',
  'release-execution-not-unfrozen',
  'final-release-execution-not-unlocked',
  'final-real-execution-barrier-not-lifted',
  'post-barrier-execution-not-authorized',
  'controlled-release-not-unlocked',
  'real-release-not-executed',
  'real-release-command-not-armed',
  'hard-stop-not-lifted',
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
  'pass-gold-real-required',
]);

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
    final_execution_lock_verification_phase_passed: false,
    final_execution_lock_verified: false,
    real_release_execution_allowed: false,
    production_touched: false,
    deploy_allowed: false,
    release_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
  };
}

export function build(input = {}) {
  if (!isPlainObject(input)) return blockedInput('INPUT_NOT_OBJECT');

  const {
    final_freeze_review_gate_ready,
    phase_gate_items,
    required_phase_controls,
  } = input;

  if (final_freeze_review_gate_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_REVIEW,
      ready: false,
      errors: ['FINAL_FREEZE_REVIEW_GATE_NOT_READY'],
      final_execution_lock_verification_phase_passed: false,
      final_execution_lock_verified: false,
      real_release_execution_allowed: false,
      production_touched: false,
      deploy_allowed: false,
      release_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
    };
  }

  if (!Array.isArray(phase_gate_items)) {
    return blockedInput('PHASE_GATE_ITEMS_NOT_AN_ARRAY');
  }

  if (!Array.isArray(required_phase_controls)) {
    return blockedInput('REQUIRED_PHASE_CONTROLS_NOT_AN_ARRAY');
  }

  const errors = [];

  for (const item of phase_gate_items) {
    if (!isPlainObject(item) || typeof item.id !== 'string' || item.id.trim() === '') {
      errors.push('INVALID_PHASE_GATE_ITEM_ID');
    }

    if (!isPlainObject(item) || typeof item.type !== 'string' || item.type.trim() === '') {
      errors.push('INVALID_PHASE_GATE_ITEM_TYPE');
    }

    if (!isPlainObject(item) || item.verified !== true) {
      errors.push('PHASE_GATE_ITEM_NOT_VERIFIED');
    }
  }

  for (const control of REQUIRED_PHASE_CONTROLS) {
    if (!required_phase_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  if (errors.length > 0) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors,
      final_execution_lock_verification_phase_passed: false,
      final_execution_lock_verified: false,
      real_release_execution_allowed: false,
      production_touched: false,
      deploy_allowed: false,
      release_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
    };
  }

  const phase_gate_items_verified = phase_gate_items.map((item) => ({
    id: item.id,
    type: item.type,
    verified: true,
  }));

  const finalMessage = 'V461-V465 final execution lock verification and release freeze integrity complete. Real release execution remains blocked until explicit V466 command.';

  const evidence_hash = stableHash({
    module_version: MODULE_VERSION,
    phase_gate_items_verified,
    required_phase_controls,
    finalMessage,
  });

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    errors: [],
    final_execution_lock_verified: true,
    release_freeze_integrity_bound: true,
    freeze_integrity_evidence_bound: true,
    final_freeze_review_bound: true,
    final_execution_lock_verification_phase_passed: false,
    phase_gate_items_verified,
    required_phase_controls,
    evidence_hash,
    final_message: finalMessage,
    real_release_execution_allowed: false,
    production_touched: false,
    deploy_allowed: false,
    release_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
    artifact_publish_allowed: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
    v466_allowed: false,
  };
}

export function validate(result) {
  return Boolean(
    result &&
    result.status === STATUSES.READY &&
    result.ready === true &&
    result.final_execution_lock_verified === true &&
    result.release_freeze_integrity_bound === true &&
    result.freeze_integrity_evidence_bound === true &&
    result.final_freeze_review_bound === true &&
    result.final_execution_lock_verification_phase_passed === false &&
    result.real_release_execution_allowed === false &&
    result.production_touched === false &&
    result.deploy_allowed === false &&
    result.release_allowed === false &&
    result.tag_allowed === false &&
    result.stable_promotion_allowed === false &&
    result.v466_allowed === false &&
    typeof result.evidence_hash === 'string' &&
    result.evidence_hash.length === 64
  );
}

export function render(result) {
  if (!result) {
    return 'V465 Final Execution Lock Verification Phase Gate: NO RESULT. REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }

  return [
    'V465 Final Execution Lock Verification Phase Gate',
    `status=${result.status}`,
    `ready=${result.ready}`,
    `final_execution_lock_verified=${result.final_execution_lock_verified}`,
    `release_freeze_integrity_bound=${result.release_freeze_integrity_bound}`,
    `freeze_integrity_evidence_bound=${result.freeze_integrity_evidence_bound}`,
    `final_freeze_review_bound=${result.final_freeze_review_bound}`,
    `final_execution_lock_verification_phase_passed=${result.final_execution_lock_verification_phase_passed}`,
    `real_release_execution_allowed=${result.real_release_execution_allowed}`,
    `production_touched=${result.production_touched}`,
    `v466_allowed=${result.v466_allowed}`,
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