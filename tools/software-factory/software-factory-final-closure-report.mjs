import crypto from 'node:crypto';

const MODULE_VERSION = 'FINAL-CLOSURE-0';

export const STATUSES = Object.freeze({
  READY: 'VISION_CORE_FINAL_CLOSURE_REPORT_READY',
  BLOCKED_INPUT: 'VISION_CORE_FINAL_CLOSURE_REPORT_BLOCKED_INPUT',
  BLOCKED_RTE3: 'VISION_CORE_FINAL_CLOSURE_REPORT_BLOCKED_RTE3',
  FAIL: 'VISION_CORE_FINAL_CLOSURE_REPORT_FAIL',
});

const REQUIRED_FINAL_CLOSURE_FIELDS = [
  'v466_v470_bound',
  'rta0_rta9_bound',
  'rtp0_rtp2_bound',
  'unify0_bound',
  'rte0_rte3_bound',
  'rte_chain_closed',
  'no_rte4',
  'pass_gold_real_not_claimed',
  'stable_blocked',
  'release_blocked',
  'deploy_blocked',
  'tag_blocked',
  'production_untouched',
  'v471_blocked',
  'rta10_not_created',
  'unify1_not_created',
  'rc0_not_created',
  'no_next_automated_gate_required',
  'final_human_decision_required',
];

const REQUIRED_CONTROLS = [
  'rte3-required',
  'rte-chain-complete',
  'no-rte4',
  'no-v471',
  'no-rta10',
  'no-unify1',
  'no-rc0',
  'no-final-closure-1',
  'no-new-gate-chain',
  'pass-gold-real-not-claimed',
  'stable-promotion-blocked',
  'release-blocked',
  'deploy-blocked',
  'tag-blocked',
  'production-untouched',
  'final-human-decision-required',
];

function blockedResult(status, errors) {
  return {
    status,
    module_version: MODULE_VERSION,
    ready: false,
    final_closure_report_ready: false,
    pass_gold_real_final_authority_review_ready: false,
    rte_chain_complete: false,
    no_rte4_required: false,
    no_final_closure_1_required: false,
    no_new_gate_chain_required: false,
    final_human_decision_required: false,
    final_next_step: null,
    project_state: null,
    pass_gold_real_achieved: false,
    stable_promotion_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    production_touched: false,
    v471_allowed: false,
    rta10_allowed: false,
    unify1_allowed: false,
    rc0_created: false,
    evidence_hash: null,
    final_message: null,
    errors,
  };
}

export function build(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return blockedResult(STATUSES.BLOCKED_INPUT, ['INPUT_NOT_OBJECT']);
  }

  const {
    pass_gold_real_final_authority_review_ready,
    rte_chain_complete,
    no_rte4_required,
    final_human_decision_required,
    final_next_step,
    pass_gold_real_achieved,
    stable_promotion_allowed,
    release_allowed,
    deploy_allowed,
    tag_allowed,
    production_touched,
    final_closure_report,
    required_controls,
  } = input;

  // Gate: RTE-3 dependency
  if (pass_gold_real_final_authority_review_ready !== true) {
    return blockedResult(STATUSES.BLOCKED_RTE3, ['RTE3_FINAL_AUTHORITY_REVIEW_NOT_READY']);
  }

  // Gate: RTE chain complete
  if (rte_chain_complete !== true) {
    return blockedResult(STATUSES.FAIL, ['RTE_CHAIN_NOT_COMPLETE']);
  }

  // Gate: RTE-4 forbidden
  if (no_rte4_required !== true) {
    return blockedResult(STATUSES.FAIL, ['RTE4_MUST_REMAIN_FORBIDDEN']);
  }

  // Gate: final human decision required
  if (final_human_decision_required !== true) {
    return blockedResult(STATUSES.FAIL, ['FINAL_HUMAN_DECISION_REQUIRED']);
  }

  // Gate: final_next_step
  if (final_next_step !== 'HUMAN_DECISION_REQUIRED') {
    return blockedResult(STATUSES.FAIL, ['FINAL_NEXT_STEP_MUST_BE_HUMAN_DECISION_REQUIRED']);
  }

  // Gate: PASS GOLD REAL must not be claimed
  if (pass_gold_real_achieved !== false) {
    return blockedResult(STATUSES.FAIL, ['PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_FINAL_CLOSURE_0']);
  }

  // Gate: stable must remain blocked
  if (stable_promotion_allowed !== false) {
    return blockedResult(STATUSES.FAIL, ['STABLE_PROMOTION_MUST_REMAIN_BLOCKED']);
  }

  // Gate: release/deploy/tag blocked
  if (release_allowed !== false || deploy_allowed !== false || tag_allowed !== false) {
    return blockedResult(STATUSES.FAIL, ['RELEASE_DEPLOY_TAG_MUST_REMAIN_BLOCKED']);
  }

  // Gate: production untouched
  if (production_touched !== false) {
    return blockedResult(STATUSES.FAIL, ['PRODUCTION_MUST_REMAIN_UNTOUCHED']);
  }

  // Gate: final_closure_report object
  if (!final_closure_report || typeof final_closure_report !== 'object' || Array.isArray(final_closure_report)) {
    return blockedResult(STATUSES.BLOCKED_INPUT, ['FINAL_CLOSURE_REPORT_MISSING_OR_NOT_OBJECT']);
  }

  // Gate: required_controls array
  if (!Array.isArray(required_controls)) {
    return blockedResult(STATUSES.BLOCKED_INPUT, ['REQUIRED_CONTROLS_NOT_ARRAY']);
  }

  // Validate all final_closure_report fields must be true
  for (const field of REQUIRED_FINAL_CLOSURE_FIELDS) {
    if (final_closure_report[field] !== true) {
      return blockedResult(STATUSES.FAIL, [
        `REQUIRED_FINAL_CLOSURE_FIELD_NOT_TRUE: ${field}`,
      ]);
    }
  }

  // Validate required_controls
  for (const ctrl of REQUIRED_CONTROLS) {
    if (!required_controls.includes(ctrl)) {
      return blockedResult(STATUSES.FAIL, [`MISSING_REQUIRED_CONTROL: ${ctrl}`]);
    }
  }

  // Build evidence hash
  const evidence_hash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        module_version: MODULE_VERSION,
        pass_gold_real_final_authority_review_ready,
        rte_chain_complete,
        no_rte4_required,
        final_human_decision_required,
        final_next_step,
        pass_gold_real_achieved: false,
        stable_promotion_allowed: false,
        release_allowed: false,
        deploy_allowed: false,
        tag_allowed: false,
        production_touched: false,
        final_closure_report,
        required_controls,
      })
    )
    .digest('hex');

  return {
    status: STATUSES.READY,
    module_version: MODULE_VERSION,
    ready: true,
    final_closure_report_ready: true,
    pass_gold_real_final_authority_review_ready: true,
    rte_chain_complete: true,
    no_rte4_required: true,
    no_final_closure_1_required: true,
    no_new_gate_chain_required: true,
    final_human_decision_required: true,
    final_next_step: 'HUMAN_DECISION_REQUIRED',
    project_state: 'REVIEW_READY_CONTROLLED_CLOSURE',
    pass_gold_real_achieved: false,
    stable_promotion_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    production_touched: false,
    v471_allowed: false,
    rta10_allowed: false,
    unify1_allowed: false,
    rc0_created: false,
    evidence_hash,
    final_message:
      'FINAL-CLOSURE-0 controlled closure report prepared. Vision Core is review-ready with RTE chain complete; PASS GOLD REAL is not claimed, stable promotion remains blocked, and no next automated gate is required.',
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.READY) return false;

  const mustBeTrue = [
    'final_closure_report_ready',
    'pass_gold_real_final_authority_review_ready',
    'rte_chain_complete',
    'no_rte4_required',
    'no_final_closure_1_required',
    'no_new_gate_chain_required',
    'final_human_decision_required',
  ];
  for (const field of mustBeTrue) {
    if (result[field] !== true) return false;
  }

  const mustBeFalse = [
    'pass_gold_real_achieved',
    'stable_promotion_allowed',
    'release_allowed',
    'deploy_allowed',
    'tag_allowed',
    'production_touched',
    'v471_allowed',
    'rta10_allowed',
    'unify1_allowed',
    'rc0_created',
  ];
  for (const field of mustBeFalse) {
    if (result[field] !== false) return false;
  }

  if (result.final_next_step !== 'HUMAN_DECISION_REQUIRED') return false;
  if (result.project_state !== 'REVIEW_READY_CONTROLLED_CLOSURE') return false;
  if (typeof result.evidence_hash !== 'string' || result.evidence_hash.length !== 64) return false;

  return true;
}

export function render(result) {
  return [
    `FINAL-CLOSURE-0 Vision Core Controlled Closure Report`,
    `Status: ${result.status}`,
    `Module: ${result.module_version}`,
    `Project State: ${result.project_state}`,
    ``,
    `=== Published Artifacts Bound ===`,
    `V466–V470 PASS GOLD REAL Closure Block: bound`,
    `RTA-0–RTA-9 Runtime Authorization sequence: bound`,
    `RTP-0–RTP-2 review-ready sequence: bound`,
    `UNIFY-0 Vision Core Final State Ledger: bound`,
    `RTE-0–RTE-3 local execution evidence chain: bound`,
    ``,
    `=== RTE Chain State ===`,
    `RTE chain complete: ${result.rte_chain_complete}`,
    `RTE-4 forbidden`,
    `No final closure 1 required: ${result.no_final_closure_1_required}`,
    `No new gate chain required: ${result.no_new_gate_chain_required}`,
    `No next automated gate is required`,
    ``,
    `=== Blocked Operations ===`,
    `PASS GOLD REAL is not claimed`,
    `Stable promotion remains blocked`,
    `Release/deploy/tag remain blocked`,
    `Production untouched`,
    `V471 blocked`,
    `RTA-10 not created`,
    `UNIFY-1 not created`,
    `RC-0 not created`,
    ``,
    `=== Final State ===`,
    `Final human decision required: ${result.final_human_decision_required}`,
    `Final next step: ${result.final_next_step}`,
    `Evidence hash: ${result.evidence_hash}`,
    `Message: ${result.final_message}`,
    ``,
    `=== REGRA ABSOLUTA ===`,
    `SEM PASS GOLD REAL → não promove, não libera, não marca stable.`,
  ].join('\n');
}

export default { STATUSES, build, validate, render };
