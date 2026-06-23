import crypto from 'node:crypto';

const MODULE_VERSION = 'V464';

export const STATUSES = Object.freeze({
  READY: 'FINAL_FREEZE_REVIEW_GATE_READY',
  BLOCKED_INPUT: 'FINAL_FREEZE_REVIEW_GATE_BLOCKED_INPUT',
  BLOCKED_EVIDENCE: 'FINAL_FREEZE_REVIEW_GATE_BLOCKED_EVIDENCE',
  FAIL: 'FINAL_FREEZE_REVIEW_GATE_FAIL',
});

const REQUIRED_CONTROLS = Object.freeze([
  'freeze-integrity-evidence-required',
  'final-freeze-review-required',
  'metadata-only-review',
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

function invalidInput(reason) {
  return {
    module_version: MODULE_VERSION,
    status: STATUSES.BLOCKED_INPUT,
    ready: false,
    errors: [reason],
    final_freeze_reviewed: false,
    final_freeze_review_gate_passed: false,
    real_release_execution_allowed: false,
    production_touched: false,
    deploy_allowed: false,
    release_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
  };
}

export function build(input = {}) {
  if (!isPlainObject(input)) return invalidInput('INPUT_NOT_OBJECT');

  const {
    freeze_integrity_evidence_receipt_ready,
    final_freeze_review_items,
    required_final_freeze_review_controls,
  } = input;

  if (freeze_integrity_evidence_receipt_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_EVIDENCE,
      ready: false,
      errors: ['FREEZE_INTEGRITY_EVIDENCE_RECEIPT_NOT_READY'],
      final_freeze_reviewed: false,
      final_freeze_review_gate_passed: false,
      real_release_execution_allowed: false,
      production_touched: false,
      deploy_allowed: false,
      release_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
    };
  }

  if (!Array.isArray(final_freeze_review_items)) {
    return invalidInput('FINAL_FREEZE_REVIEW_ITEMS_NOT_AN_ARRAY');
  }

  if (!Array.isArray(required_final_freeze_review_controls)) {
    return invalidInput('REQUIRED_FINAL_FREEZE_REVIEW_CONTROLS_NOT_AN_ARRAY');
  }

  const errors = [];

  for (const item of final_freeze_review_items) {
    if (!isPlainObject(item) || typeof item.id !== 'string' || item.id.trim() === '') {
      errors.push('INVALID_FINAL_FREEZE_REVIEW_ITEM_ID');
    }

    if (!isPlainObject(item) || typeof item.type !== 'string' || item.type.trim() === '') {
      errors.push('INVALID_FINAL_FREEZE_REVIEW_ITEM_TYPE');
    }

    if (!isPlainObject(item) || item.reviewed !== true) {
      errors.push('FINAL_FREEZE_REVIEW_ITEM_NOT_REVIEWED');
    }
  }

  for (const control of REQUIRED_CONTROLS) {
    if (!required_final_freeze_review_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  if (errors.length > 0) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors,
      final_freeze_reviewed: false,
      final_freeze_review_gate_passed: false,
      real_release_execution_allowed: false,
      production_touched: false,
      deploy_allowed: false,
      release_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
    };
  }

  const final_freeze_review_items_verified = final_freeze_review_items.map((item) => ({
    id: item.id,
    type: item.type,
    reviewed: true,
  }));

  const finalMessage = 'V461-V465 final execution lock verification and release freeze integrity complete. Real release execution remains blocked until explicit V466 command.';

  const evidence_hash = stableHash({
    module_version: MODULE_VERSION,
    final_freeze_review_items_verified,
    required_final_freeze_review_controls,
    finalMessage,
  });

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    errors: [],
    final_freeze_reviewed: true,
    final_freeze_review_gate_passed: false,
    final_freeze_review_items_verified,
    required_final_freeze_review_controls,
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
  };
}

export function validate(result) {
  return Boolean(
    result &&
    result.status === STATUSES.READY &&
    result.ready === true &&
    result.final_freeze_reviewed === true &&
    result.final_freeze_review_gate_passed === false &&
    result.real_release_execution_allowed === false &&
    result.production_touched === false &&
    result.deploy_allowed === false &&
    result.release_allowed === false &&
    result.tag_allowed === false &&
    result.stable_promotion_allowed === false &&
    typeof result.evidence_hash === 'string' &&
    result.evidence_hash.length === 64
  );
}

export function render(result) {
  if (!result) {
    return 'V464 Final Freeze Review Gate: NO RESULT. REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }

  return [
    `V464 Final Freeze Review Gate`,
    `status=${result.status}`,
    `ready=${result.ready}`,
    `final_freeze_reviewed=${result.final_freeze_reviewed}`,
    `final_freeze_review_gate_passed=${result.final_freeze_review_gate_passed}`,
    `real_release_execution_allowed=${result.real_release_execution_allowed}`,
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