import crypto from 'node:crypto';

const MODULE_VERSION = 'RTE-3';

export const STATUSES = Object.freeze({
  READY: 'PASS_GOLD_REAL_FINAL_AUTHORITY_REVIEW_READY',
  BLOCKED_INPUT: 'PASS_GOLD_REAL_FINAL_AUTHORITY_REVIEW_BLOCKED_INPUT',
  BLOCKED_RTE2: 'PASS_GOLD_REAL_FINAL_AUTHORITY_REVIEW_BLOCKED_RTE2',
  FAIL: 'PASS_GOLD_REAL_FINAL_AUTHORITY_REVIEW_FAIL',
});

const REQUIRED_FINAL_AUTHORITY_REVIEW_FIELDS = [
  'runtime_truth_evidence_bound',
  'smoke_flow_evidence_bound',
  'rollback_recovery_evidence_bound',
  'authority_review_declared',
  'human_final_decision_required',
  'rte_chain_complete',
  'no_rte4_required',
  'pass_gold_real_not_claimed',
  'stable_promotion_blocked',
  'release_blocked',
  'deploy_blocked',
  'tag_blocked',
  'production_untouched',
  'billing_blocked',
  'secrets_blocked',
  'network_blocked',
  'rollback_execution_blocked',
  'recovery_execution_blocked',
  'v471_blocked',
  'rta10_blocked',
  'unify1_blocked',
  'rc0_not_created',
];

const REQUIRED_CONTROLS = [
  'rte0-required',
  'rte1-required',
  'rte2-required',
  'rte-path-chosen',
  'final-authority-review-only',
  'manual-final-authority-review',
  'no-rte4',
  'no-v471',
  'no-rta10',
  'no-unify1',
  'no-rc0',
  'no-module-runtime-execution',
  'no-module-smoke-execution',
  'no-module-rollback-execution',
  'no-module-recovery-execution',
  'no-endpoint-probe',
  'no-production-target',
  'no-external-network',
  'no-secret-loading',
  'no-billing-access',
  'no-database-mutation',
  'no-service-restart',
  'no-deploy-execution',
  'no-release-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'pass-gold-real-not-claimed',
  'final-human-decision-required',
];

function blockedResult(status, errors) {
  return {
    status,
    module_version: MODULE_VERSION,
    ready: false,
    pass_gold_real_final_authority_review_ready: false,
    local_rollback_recovery_readiness_evidence_ready: false,
    rollback_recovery_readiness_review_ready: false,
    chosen_path: null,
    rte0_complete: false,
    rte1_complete: false,
    rte2_complete: false,
    rte_chain_complete: false,
    no_rte4_required: false,
    final_authority_review_ready: false,
    human_final_decision_required: false,
    local_scope_only: false,
    manual_final_authority_review_only: false,
    runtime_truth_evidence_bound: false,
    smoke_flow_evidence_bound: false,
    rollback_recovery_evidence_bound: false,
    pass_gold_real_achieved: false,
    pass_gold_real_claimed_by_module: false,
    stable_promotion_allowed: false,
    stable_promotion_executed_by_module: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    production_touched: false,
    production_touched_by_module: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
    recovery_execution_allowed: false,
    rollback_executed_by_module: false,
    recovery_executed_by_module: false,
    command_executed_by_module: false,
    runtime_execution_performed_by_module: false,
    endpoint_probe_performed_by_module: false,
    database_mutated: false,
    service_restarted: false,
    v471_allowed: false,
    rta10_allowed: false,
    unify1_allowed: false,
    rc0_created: false,
    final_next_step: null,
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
    local_rollback_recovery_readiness_evidence_ready,
    rollback_recovery_readiness_review_ready,
    chosen_path,
    rte0_complete,
    rte1_complete,
    rte2_complete,
    pass_gold_real_achieved,
    stable_promotion_allowed,
    final_authority_review,
    authority_receipt,
    required_controls,
  } = input;

  // Gate: RTE-2 dependency
  if (
    local_rollback_recovery_readiness_evidence_ready !== true ||
    rollback_recovery_readiness_review_ready !== true
  ) {
    return blockedResult(STATUSES.BLOCKED_RTE2, [
      'RTE2_ROLLBACK_RECOVERY_READINESS_EVIDENCE_NOT_READY',
    ]);
  }

  // Gate: path
  if (chosen_path !== 'RTE') {
    return blockedResult(STATUSES.FAIL, ['RTE_PATH_NOT_CHOSEN']);
  }

  // Gate: RTE chain completeness
  if (rte0_complete !== true) {
    return blockedResult(STATUSES.FAIL, ['RTE0_NOT_COMPLETE']);
  }
  if (rte1_complete !== true) {
    return blockedResult(STATUSES.FAIL, ['RTE1_NOT_COMPLETE']);
  }
  if (rte2_complete !== true) {
    return blockedResult(STATUSES.FAIL, ['RTE2_NOT_COMPLETE']);
  }

  // Gate: PASS GOLD REAL must not be claimed
  if (pass_gold_real_achieved !== false) {
    return blockedResult(STATUSES.FAIL, ['PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_RTE3']);
  }

  // Gate: stable promotion must remain blocked
  if (stable_promotion_allowed !== false) {
    return blockedResult(STATUSES.FAIL, ['STABLE_PROMOTION_MUST_REMAIN_BLOCKED']);
  }

  // Gate: final_authority_review object
  if (!final_authority_review || typeof final_authority_review !== 'object' || Array.isArray(final_authority_review)) {
    return blockedResult(STATUSES.BLOCKED_INPUT, ['FINAL_AUTHORITY_REVIEW_MISSING_OR_NOT_OBJECT']);
  }

  // Gate: authority_receipt object
  if (!authority_receipt || typeof authority_receipt !== 'object' || Array.isArray(authority_receipt)) {
    return blockedResult(STATUSES.BLOCKED_INPUT, ['AUTHORITY_RECEIPT_MISSING_OR_NOT_OBJECT']);
  }

  // Gate: required_controls array
  if (!Array.isArray(required_controls)) {
    return blockedResult(STATUSES.BLOCKED_INPUT, ['REQUIRED_CONTROLS_NOT_ARRAY']);
  }

  // Validate all final_authority_review fields must be true
  for (const field of REQUIRED_FINAL_AUTHORITY_REVIEW_FIELDS) {
    if (final_authority_review[field] !== true) {
      return blockedResult(STATUSES.FAIL, [
        `REQUIRED_FINAL_AUTHORITY_REVIEW_FIELD_NOT_TRUE: ${field}`,
      ]);
    }
  }

  // Validate authority_receipt string fields
  const stringFields = [
    'reviewer_id',
    'runtime_truth_receipt_id',
    'smoke_flow_receipt_id',
    'rollback_recovery_receipt_id',
  ];
  for (const field of stringFields) {
    if (typeof authority_receipt[field] !== 'string' || authority_receipt[field].trim() === '') {
      return blockedResult(STATUSES.FAIL, [`AUTHORITY_RECEIPT_INVALID_FIELD: ${field}`]);
    }
  }

  if (authority_receipt.review_mode !== 'manual-final-authority-review') {
    return blockedResult(STATUSES.FAIL, ['AUTHORITY_RECEIPT_INVALID_FIELD: review_mode']);
  }
  if (authority_receipt.target_environment !== 'local') {
    return blockedResult(STATUSES.FAIL, ['AUTHORITY_RECEIPT_INVALID_FIELD: target_environment']);
  }

  // Validate authority_receipt boolean-false fields
  const receiptMustBeFalse = [
    'pass_gold_real_claimed_by_module',
    'stable_promotion_executed_by_module',
    'release_executed_by_module',
    'deploy_executed_by_module',
    'tag_created_by_module',
    'production_touched_by_module',
    'rollback_executed_by_module',
    'recovery_executed_by_module',
    'command_executed_by_module',
    'endpoint_probe_performed_by_module',
    'external_network_used',
    'secrets_used',
    'billing_used',
  ];
  for (const field of receiptMustBeFalse) {
    if (authority_receipt[field] !== false) {
      return blockedResult(STATUSES.FAIL, [`AUTHORITY_RECEIPT_MUST_BE_FALSE: ${field}`]);
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
        local_rollback_recovery_readiness_evidence_ready,
        rollback_recovery_readiness_review_ready,
        chosen_path,
        rte0_complete,
        rte1_complete,
        rte2_complete,
        pass_gold_real_achieved: false,
        stable_promotion_allowed: false,
        final_authority_review,
        authority_receipt,
        required_controls,
      })
    )
    .digest('hex');

  return {
    status: STATUSES.READY,
    module_version: MODULE_VERSION,
    ready: true,
    pass_gold_real_final_authority_review_ready: true,
    local_rollback_recovery_readiness_evidence_ready: true,
    rollback_recovery_readiness_review_ready: true,
    chosen_path: 'RTE',
    rte0_complete: true,
    rte1_complete: true,
    rte2_complete: true,
    rte_chain_complete: true,
    no_rte4_required: true,
    final_authority_review_ready: true,
    human_final_decision_required: true,
    local_scope_only: true,
    manual_final_authority_review_only: true,
    runtime_truth_evidence_bound: true,
    smoke_flow_evidence_bound: true,
    rollback_recovery_evidence_bound: true,
    pass_gold_real_achieved: false,
    pass_gold_real_claimed_by_module: false,
    stable_promotion_allowed: false,
    stable_promotion_executed_by_module: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    production_touched: false,
    production_touched_by_module: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
    recovery_execution_allowed: false,
    rollback_executed_by_module: false,
    recovery_executed_by_module: false,
    command_executed_by_module: false,
    runtime_execution_performed_by_module: false,
    endpoint_probe_performed_by_module: false,
    database_mutated: false,
    service_restarted: false,
    v471_allowed: false,
    rta10_allowed: false,
    unify1_allowed: false,
    rc0_created: false,
    final_next_step: 'HUMAN_DECISION_REQUIRED',
    evidence_hash,
    final_message:
      'RTE-3 final authority review prepared. RTE chain is complete, RTE-4 is forbidden, PASS GOLD REAL is not claimed, and stable promotion remains blocked pending explicit human final decision.',
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.READY) return false;

  const mustBeTrue = [
    'pass_gold_real_final_authority_review_ready',
    'rte0_complete',
    'rte1_complete',
    'rte2_complete',
    'rte_chain_complete',
    'no_rte4_required',
    'final_authority_review_ready',
    'human_final_decision_required',
    'local_scope_only',
    'manual_final_authority_review_only',
    'runtime_truth_evidence_bound',
    'smoke_flow_evidence_bound',
    'rollback_recovery_evidence_bound',
  ];
  for (const field of mustBeTrue) {
    if (result[field] !== true) return false;
  }

  const mustBeFalse = [
    'pass_gold_real_achieved',
    'pass_gold_real_claimed_by_module',
    'stable_promotion_allowed',
    'stable_promotion_executed_by_module',
    'release_allowed',
    'deploy_allowed',
    'tag_allowed',
    'production_touched',
    'production_touched_by_module',
    'billing_execution_allowed',
    'secret_access_allowed',
    'network_allowed',
    'rollback_execution_allowed',
    'recovery_execution_allowed',
    'rollback_executed_by_module',
    'recovery_executed_by_module',
    'command_executed_by_module',
    'runtime_execution_performed_by_module',
    'endpoint_probe_performed_by_module',
    'database_mutated',
    'service_restarted',
    'v471_allowed',
    'rta10_allowed',
    'unify1_allowed',
    'rc0_created',
  ];
  for (const field of mustBeFalse) {
    if (result[field] !== false) return false;
  }

  if (result.final_next_step !== 'HUMAN_DECISION_REQUIRED') return false;
  if (typeof result.evidence_hash !== 'string' || result.evidence_hash.length !== 64) return false;

  return true;
}

export function render(result) {
  return [
    `RTE-3 PASS GOLD REAL Final Authority Review`,
    `Status: ${result.status}`,
    `Module: ${result.module_version}`,
    ``,
    `=== RTE Chain Summary ===`,
    `RTE-0: local runtime truth execution — complete`,
    `RTE-1: local smoke flow execution evidence — complete`,
    `RTE-2: local rollback and recovery readiness evidence — complete`,
    `RTE chain complete: ${result.rte_chain_complete}`,
    `RTE-4 forbidden`,
    ``,
    `=== Authority Review ===`,
    `Path A RTE selected`,
    `Execution mode: manual-final-authority-review`,
    `Final authority review ready: ${result.final_authority_review_ready}`,
    `Human final decision required: ${result.human_final_decision_required} — final human decision required`,
    ``,
    `=== Evidence Bindings ===`,
    `Runtime truth evidence bound: ${result.runtime_truth_evidence_bound}`,
    `Smoke flow evidence bound: ${result.smoke_flow_evidence_bound}`,
    `Rollback and recovery evidence bound: ${result.rollback_recovery_evidence_bound}`,
    ``,
    `=== Blocked Operations ===`,
    `PASS GOLD REAL is not claimed`,
    `Stable promotion remains blocked`,
    `Release blocked: ${result.release_allowed === false}`,
    `Deploy blocked: ${result.deploy_allowed === false}`,
    `Tag blocked: ${result.tag_allowed === false}`,
    `Production untouched`,
    `V471 blocked`,
    `RTA-10 blocked`,
    `UNIFY-1 blocked`,
    `RC-0 not created`,
    ``,
    `=== Module Execution Barriers ===`,
    `Rollback execution blocked (module): ${result.rollback_executed_by_module === false}`,
    `Recovery execution blocked (module): ${result.recovery_executed_by_module === false}`,
    `Command execution blocked (module): ${result.command_executed_by_module === false}`,
    `Runtime execution blocked (module): ${result.runtime_execution_performed_by_module === false}`,
    `Endpoint probe blocked (module): ${result.endpoint_probe_performed_by_module === false}`,
    `External network blocked: ${result.network_allowed === false}`,
    `Secrets blocked: ${result.secret_access_allowed === false}`,
    `Billing blocked: ${result.billing_execution_allowed === false}`,
    `Database mutated: ${result.database_mutated}`,
    `Service restarted: ${result.service_restarted}`,
    ``,
    `=== Final State ===`,
    `Final next step: ${result.final_next_step}`,
    `Evidence hash: ${result.evidence_hash}`,
    `Message: ${result.final_message}`,
    ``,
    `=== REGRA ABSOLUTA ===`,
    `SEM PASS GOLD REAL → não promove, não libera, não marca stable.`,
  ].join('\n');
}

export default { STATUSES, build, validate, render };
