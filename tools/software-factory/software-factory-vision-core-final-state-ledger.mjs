import crypto from 'node:crypto';

const MODULE_VERSION = 'UNIFY-0';

export const STATUSES = Object.freeze({
  READY: 'VISION_CORE_FINAL_STATE_LEDGER_READY',
  BLOCKED_INPUT: 'VISION_CORE_FINAL_STATE_LEDGER_BLOCKED_INPUT',
  BLOCKED_RTP_REVIEW: 'VISION_CORE_FINAL_STATE_LEDGER_BLOCKED_RTP_REVIEW',
  FAIL: 'VISION_CORE_FINAL_STATE_LEDGER_FAIL'
});

const REQUIRED_LEDGER_FIELDS = [
  'governance_closure_bound',
  'runtime_authorization_bound',
  'rtp_review_bound',
  'pass_gold_real_not_claimed',
  'stable_promotion_blocked',
  'release_blocked',
  'deploy_blocked',
  'tag_blocked',
  'production_untouched',
  'billing_blocked',
  'secrets_blocked',
  'network_blocked',
  'rollback_blocked',
  'v471_blocked',
  'rta10_blocked',
  'next_human_decision_required'
];

const REQUIRED_SEQUENCES = ['V466-V470', 'RTA-0-RTA-9', 'RTP-0-RTP-2'];
const ALLOWED_PATHS = ['RTE', 'RC'];

const REQUIRED_CONTROLS = [
  'v466-v470-bound',
  'rta0-rta9-bound',
  'rtp0-rtp2-bound',
  'no-rta10',
  'no-v471',
  'no-rc0-yet',
  'no-rte0-yet',
  'pass-gold-real-not-claimed',
  'stable-promotion-blocked',
  'no-release',
  'no-deploy',
  'no-tag',
  'no-production-touch',
  'no-billing-access',
  'no-secret-access',
  'no-network-execution',
  'no-rollback-execution',
  'next-human-decision-required'
];

export function build(input = {}) {
  // 1. Input must be object
  if (typeof input !== 'object' || input === null) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['INPUT_NOT_OBJECT']
    };
  }

  const {
    v466_v470_closure_complete = false,
    rta_sequence_complete = false,
    rta_final_gate = false,
    rta10_allowed = false,
    rtp_review_ready = false,
    pass_gold_real_review_ready = false,
    pass_gold_real_achieved = false,
    stable_promotion_allowed = false,
    final_state_ledger,
    completed_sequences,
    allowed_next_paths,
    required_controls
  } = input;

  // 2. v466_v470_closure_complete must be true
  if (v466_v470_closure_complete !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['V466_V470_CLOSURE_NOT_COMPLETE']
    };
  }

  // 3. rta_sequence_complete and rta_final_gate must be true
  if (rta_sequence_complete !== true || rta_final_gate !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['RTA_SEQUENCE_NOT_COMPLETE']
    };
  }

  // 4. rta10_allowed must be false
  if (rta10_allowed !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['RTA10_MUST_REMAIN_BLOCKED']
    };
  }

  // 5. rtp_review_ready and pass_gold_real_review_ready must be true
  if (rtp_review_ready !== true || pass_gold_real_review_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_RTP_REVIEW,
      ready: false,
      blocked_rtp_review: true,
      errors: ['RTP_REVIEW_NOT_READY']
    };
  }

  // 6. pass_gold_real_achieved must be false
  if (pass_gold_real_achieved !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_UNIFY0']
    };
  }

  // 7. stable_promotion_allowed must be false
  if (stable_promotion_allowed !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['STABLE_PROMOTION_MUST_REMAIN_BLOCKED']
    };
  }

  // 8. final_state_ledger must be object
  if (typeof final_state_ledger !== 'object' || final_state_ledger === null) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['FINAL_STATE_LEDGER_MISSING_OR_NOT_OBJECT']
    };
  }

  // 9. completed_sequences must be array
  if (!Array.isArray(completed_sequences)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['COMPLETED_SEQUENCES_NOT_ARRAY']
    };
  }

  // 10. allowed_next_paths must be array
  if (!Array.isArray(allowed_next_paths)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['ALLOWED_NEXT_PATHS_NOT_ARRAY']
    };
  }

  // 11. required_controls must be array
  if (!Array.isArray(required_controls)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['REQUIRED_CONTROLS_NOT_ARRAY']
    };
  }

  // Validate each required ledger field is true
  for (const field of REQUIRED_LEDGER_FIELDS) {
    if (final_state_ledger[field] !== true) {
      return {
        module_version: MODULE_VERSION,
        status: STATUSES.FAIL,
        ready: false,
        fail: true,
        errors: [`REQUIRED_FINAL_STATE_LEDGER_FIELD_NOT_TRUE: ${field}`]
      };
    }
  }

  // Validate required completed sequences present
  for (const seq of REQUIRED_SEQUENCES) {
    if (!completed_sequences.includes(seq)) {
      return {
        module_version: MODULE_VERSION,
        status: STATUSES.FAIL,
        ready: false,
        fail: true,
        errors: [`MISSING_COMPLETED_SEQUENCE: ${seq}`]
      };
    }
  }

  // Validate no invalid paths
  for (const path of allowed_next_paths) {
    if (!ALLOWED_PATHS.includes(path)) {
      return {
        module_version: MODULE_VERSION,
        status: STATUSES.FAIL,
        ready: false,
        fail: true,
        errors: [`INVALID_NEXT_PATH: ${path}`]
      };
    }
  }

  // Validate required paths present
  for (const path of ALLOWED_PATHS) {
    if (!allowed_next_paths.includes(path)) {
      return {
        module_version: MODULE_VERSION,
        status: STATUSES.FAIL,
        ready: false,
        fail: true,
        errors: [`MISSING_ALLOWED_NEXT_PATH: ${path}`]
      };
    }
  }

  // Validate required controls present
  for (const control of REQUIRED_CONTROLS) {
    if (!required_controls.includes(control)) {
      return {
        module_version: MODULE_VERSION,
        status: STATUSES.FAIL,
        ready: false,
        fail: true,
        errors: [`MISSING_REQUIRED_CONTROL: ${control}`]
      };
    }
  }

  const evidence_hash = crypto.createHash('sha256')
    .update(JSON.stringify({
      module_version: MODULE_VERSION,
      v466_v470_closure_complete,
      rta_sequence_complete,
      rta_final_gate,
      rta10_allowed,
      rtp_review_ready,
      pass_gold_real_review_ready,
      pass_gold_real_achieved,
      stable_promotion_allowed,
      completed_sequences,
      allowed_next_paths,
      required_controls
    }))
    .digest('hex');

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    vision_core_final_state_ledger_ready: true,
    v466_v470_closure_complete: true,
    rta_sequence_complete: true,
    rta_final_gate: true,
    rta10_allowed: false,
    rtp_review_ready: true,
    pass_gold_real_review_ready: true,
    pass_gold_real_achieved: false,
    stable_promotion_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    production_touched: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
    v471_allowed: false,
    rc0_created: false,
    rte0_created: false,
    unified_state: 'REVIEW_READY_NOT_EXECUTED',
    next_human_decision_required: true,
    allowed_next_paths: ['RTE', 'RC'],
    no_unify1_required: true,
    evidence_hash,
    final_message: 'UNIFY-0 final state ledger prepared. Vision Core is review-ready but PASS GOLD REAL is not claimed; next human decision must choose RTE local execution or RC controlled closure.'
  };
}

export function validate(result) {
  if (typeof result !== 'object' || result === null) {
    return false;
  }

  if (result.module_version !== MODULE_VERSION) {
    return false;
  }

  if (!Object.values(STATUSES).includes(result.status)) {
    return false;
  }

  if (typeof result.ready !== 'boolean') {
    return false;
  }

  if (result.status !== STATUSES.READY) {
    return false;
  }

  if (result.status === STATUSES.READY) {
    if (result.vision_core_final_state_ledger_ready !== true) return false;
    if (result.v466_v470_closure_complete !== true) return false;
    if (result.rta_sequence_complete !== true) return false;
    if (result.rta_final_gate !== true) return false;
    if (result.rta10_allowed !== false) return false;
    if (result.rtp_review_ready !== true) return false;
    if (result.pass_gold_real_review_ready !== true) return false;
    if (result.pass_gold_real_achieved !== false) return false;
    if (result.stable_promotion_allowed !== false) return false;
    if (result.release_allowed !== false) return false;
    if (result.deploy_allowed !== false) return false;
    if (result.tag_allowed !== false) return false;
    if (result.production_touched !== false) return false;
    if (result.billing_execution_allowed !== false) return false;
    if (result.secret_access_allowed !== false) return false;
    if (result.network_allowed !== false) return false;
    if (result.rollback_execution_allowed !== false) return false;
    if (result.v471_allowed !== false) return false;
    if (result.rc0_created !== false) return false;
    if (result.rte0_created !== false) return false;
    if (result.unified_state !== 'REVIEW_READY_NOT_EXECUTED') return false;
    if (!Array.isArray(result.allowed_next_paths)) return false;
    if (result.allowed_next_paths.length !== 2) return false;
    if (!result.allowed_next_paths.includes('RTE')) return false;
    if (!result.allowed_next_paths.includes('RC')) return false;
    if (result.no_unify1_required !== true) return false;
    if (typeof result.evidence_hash !== 'string' || result.evidence_hash.length !== 64) return false;
  }

  return true;
}

export function render(result) {
  const lines = [
    `=== UNIFY-0 Vision Core Final State Ledger ===`,
    `Module: ${result.module_version}`,
    `Status: ${result.status}`,
    `Ready: ${result.ready}`,
    ``,
    `=== Completed Sequences ===`,
    `V466–V470 closure complete: ${result.v466_v470_closure_complete ? 'YES' : 'NO'}`,
    `RTA-0–RTA-9 complete: ${result.rta_sequence_complete ? 'YES' : 'NO'}`,
    `RTA-9 final gate: ${result.rta_final_gate ? 'PASSED' : 'NOT PASSED'}`,
    `RTP-0–RTP-2 review-ready: ${result.rtp_review_ready ? 'YES' : 'NO'}`,
    ``,
    `=== PASS GOLD REAL Review Status ===`,
    `PASS GOLD REAL review ready: ${result.pass_gold_real_review_ready ? 'YES' : 'NO'}`,
    `PASS GOLD REAL is not claimed: ${result.pass_gold_real_achieved === false ? 'CONFIRMED' : 'VIOLATION'}`,
    ``,
    `=== Blocked Actions ===`,
    `Stable promotion remains blocked: ${result.stable_promotion_allowed === false ? 'CONFIRMED' : 'VIOLATION'}`,
    `Release: ${result.release_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Deploy: ${result.deploy_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Tag: ${result.tag_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Production untouched: ${result.production_touched === false ? 'CONFIRMED' : 'VIOLATION'}`,
    ``,
    `=== Safety Controls ===`,
    `V471 blocked: ${result.v471_allowed === false ? 'CONFIRMED' : 'VIOLATION'}`,
    `RTA-10 blocked: ${result.rta10_allowed === false ? 'CONFIRMED' : 'VIOLATION'}`,
    `RC-0 created: ${result.rc0_created ? 'YES (VIOLATION)' : 'NO'}`,
    `RTE-0 created: ${result.rte0_created ? 'YES (VIOLATION)' : 'NO'}`,
    ``,
    `=== Access Controls ===`,
    `Billing: ${result.billing_execution_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Secret Access: ${result.secret_access_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Network: ${result.network_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Rollback: ${result.rollback_execution_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    ``,
    `=== Unified State ===`,
    `Unified State: ${result.unified_state}`,
    `No UNIFY-1 required: ${result.no_unify1_required ? 'YES' : 'NO'}`,
    ``,
    `=== Next Human Decision ===`,
    `Next human decision required: ${result.next_human_decision_required ? 'YES' : 'NO'}`,
    `Allowed next paths: ${Array.isArray(result.allowed_next_paths) ? result.allowed_next_paths.join(', ') : 'NONE'}`,
    `  - RTE local execution: human may choose RTE to execute local real runtime`,
    `  - RC controlled closure: human may choose RC controlled closure without execution`,
    ``,
    `=== Final Message ===`,
    `${result.final_message}`,
    ``,
    `=== REGRA ABSOLUTA ===`,
    `SEM PASS GOLD REAL → não promove, não libera, não marca stable.`
  ];

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };
