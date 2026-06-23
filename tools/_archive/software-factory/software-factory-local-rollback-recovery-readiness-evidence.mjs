import crypto from 'node:crypto';

const MODULE_VERSION = 'RTE-2';

export const STATUSES = Object.freeze({
  READY: 'LOCAL_ROLLBACK_RECOVERY_READINESS_EVIDENCE_READY',
  BLOCKED_INPUT: 'LOCAL_ROLLBACK_RECOVERY_READINESS_EVIDENCE_BLOCKED_INPUT',
  BLOCKED_RTE1: 'LOCAL_ROLLBACK_RECOVERY_READINESS_EVIDENCE_BLOCKED_RTE1',
  FAIL: 'LOCAL_ROLLBACK_RECOVERY_READINESS_EVIDENCE_FAIL',
});

export function build(input = {}) {
  const {
    local_smoke_flow_execution_evidence_ready,
    smoke_flow_execution_review_ready,
    operator_id,
    rollback_readiness_id,
    recovery_readiness_id,
    runtime_truth_receipt_id,
    smoke_flow_receipt_id,
  } = input;

  if (
    local_smoke_flow_execution_evidence_ready === undefined ||
    smoke_flow_execution_review_ready === undefined ||
    operator_id === undefined ||
    rollback_readiness_id === undefined ||
    recovery_readiness_id === undefined ||
    runtime_truth_receipt_id === undefined ||
    smoke_flow_receipt_id === undefined
  ) {
    return {
      status: STATUSES.BLOCKED_INPUT,
      module_version: MODULE_VERSION,
      local_smoke_flow_execution_evidence_ready: false,
      smoke_flow_execution_review_ready: false,
      local_scope_declared: false,
      operator_supervision_declared: false,
      rollback_readiness_declared: false,
      recovery_readiness_declared: false,
      rollback_execution_external_to_module: false,
      recovery_execution_external_to_module: false,
      evidence_capture_declared: false,
      rollback_target_declared: false,
      recovery_target_declared: false,
      restore_point_declared: false,
      pre_rollback_state_required: false,
      post_recovery_state_required: false,
      destructive_rollback_blocked: false,
      database_mutation_blocked: false,
      service_restart_blocked: false,
      runtime_truth_dependency_bound: false,
      smoke_flow_dependency_bound: false,
      production_scope_blocked: false,
      external_network_blocked: false,
      secrets_blocked: false,
      billing_blocked: false,
      deploy_release_tag_stable_blocked: false,
      pass_gold_real_not_claimed: false,
      v471_blocked: false,
      rta10_blocked: false,
      operator_id: null,
      rollback_readiness_id: null,
      recovery_readiness_id: null,
      runtime_truth_receipt_id: null,
      smoke_flow_receipt_id: null,
      execution_mode: null,
      target_environment: null,
      rollback_executed_by_module: false,
      recovery_executed_by_module: false,
      command_executed_by_module: false,
      endpoint_probe_performed_by_module: false,
      production_target: false,
      external_network_used: false,
      secrets_used: false,
      billing_used: false,
      rollback_executed: false,
      recovery_executed: false,
      database_mutated: false,
      service_restarted: false,
      deploy_used: false,
      release_used: false,
      tag_used: false,
      stable_promotion_used: false,
      controls: [],
      evidence_hash: null,
      final_message: null,
    };
  }

  if (
    local_smoke_flow_execution_evidence_ready !== true ||
    smoke_flow_execution_review_ready !== true
  ) {
    return {
      status: STATUSES.BLOCKED_RTE1,
      module_version: MODULE_VERSION,
      local_smoke_flow_execution_evidence_ready,
      smoke_flow_execution_review_ready,
      local_scope_declared: false,
      operator_supervision_declared: false,
      rollback_readiness_declared: false,
      recovery_readiness_declared: false,
      rollback_execution_external_to_module: false,
      recovery_execution_external_to_module: false,
      evidence_capture_declared: false,
      rollback_target_declared: false,
      recovery_target_declared: false,
      restore_point_declared: false,
      pre_rollback_state_required: false,
      post_recovery_state_required: false,
      destructive_rollback_blocked: false,
      database_mutation_blocked: false,
      service_restart_blocked: false,
      runtime_truth_dependency_bound: false,
      smoke_flow_dependency_bound: false,
      production_scope_blocked: false,
      external_network_blocked: false,
      secrets_blocked: false,
      billing_blocked: false,
      deploy_release_tag_stable_blocked: false,
      pass_gold_real_not_claimed: false,
      v471_blocked: false,
      rta10_blocked: false,
      operator_id: null,
      rollback_readiness_id: null,
      recovery_readiness_id: null,
      runtime_truth_receipt_id: null,
      smoke_flow_receipt_id: null,
      execution_mode: null,
      target_environment: null,
      rollback_executed_by_module: false,
      recovery_executed_by_module: false,
      command_executed_by_module: false,
      endpoint_probe_performed_by_module: false,
      production_target: false,
      external_network_used: false,
      secrets_used: false,
      billing_used: false,
      rollback_executed: false,
      recovery_executed: false,
      database_mutated: false,
      service_restarted: false,
      deploy_used: false,
      release_used: false,
      tag_used: false,
      stable_promotion_used: false,
      controls: [],
      evidence_hash: null,
      final_message: null,
    };
  }

  if (
    typeof operator_id !== 'string' || operator_id.trim() === '' ||
    typeof rollback_readiness_id !== 'string' || rollback_readiness_id.trim() === '' ||
    typeof recovery_readiness_id !== 'string' || recovery_readiness_id.trim() === '' ||
    typeof runtime_truth_receipt_id !== 'string' || runtime_truth_receipt_id.trim() === '' ||
    typeof smoke_flow_receipt_id !== 'string' || smoke_flow_receipt_id.trim() === ''
  ) {
    return {
      status: STATUSES.FAIL,
      module_version: MODULE_VERSION,
      local_smoke_flow_execution_evidence_ready,
      smoke_flow_execution_review_ready,
      local_scope_declared: false,
      operator_supervision_declared: false,
      rollback_readiness_declared: false,
      recovery_readiness_declared: false,
      rollback_execution_external_to_module: false,
      recovery_execution_external_to_module: false,
      evidence_capture_declared: false,
      rollback_target_declared: false,
      recovery_target_declared: false,
      restore_point_declared: false,
      pre_rollback_state_required: false,
      post_recovery_state_required: false,
      destructive_rollback_blocked: false,
      database_mutation_blocked: false,
      service_restart_blocked: false,
      runtime_truth_dependency_bound: false,
      smoke_flow_dependency_bound: false,
      production_scope_blocked: false,
      external_network_blocked: false,
      secrets_blocked: false,
      billing_blocked: false,
      deploy_release_tag_stable_blocked: false,
      pass_gold_real_not_claimed: false,
      v471_blocked: false,
      rta10_blocked: false,
      operator_id: null,
      rollback_readiness_id: null,
      recovery_readiness_id: null,
      runtime_truth_receipt_id: null,
      smoke_flow_receipt_id: null,
      execution_mode: null,
      target_environment: null,
      rollback_executed_by_module: false,
      recovery_executed_by_module: false,
      command_executed_by_module: false,
      endpoint_probe_performed_by_module: false,
      production_target: false,
      external_network_used: false,
      secrets_used: false,
      billing_used: false,
      rollback_executed: false,
      recovery_executed: false,
      database_mutated: false,
      service_restarted: false,
      deploy_used: false,
      release_used: false,
      tag_used: false,
      stable_promotion_used: false,
      controls: [],
      evidence_hash: null,
      final_message: null,
    };
  }

  const controls = [
    'rte1-required',
    'rte-path-chosen',
    'local-rollback-recovery-readiness-evidence-only',
    'manual-supervised-local-only',
    'rollback-execution-external-to-module',
    'recovery-execution-external-to-module',
    'no-module-runtime-execution',
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
    'v471-blocked',
    'rta10-blocked',
  ];

  const evidence_hash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        module_version: MODULE_VERSION,
        local_smoke_flow_execution_evidence_ready,
        smoke_flow_execution_review_ready,
        operator_id,
        rollback_readiness_id,
        recovery_readiness_id,
        runtime_truth_receipt_id,
        smoke_flow_receipt_id,
        controls,
      })
    )
    .digest('hex');

  return {
    status: STATUSES.READY,
    module_version: MODULE_VERSION,
    local_smoke_flow_execution_evidence_ready,
    smoke_flow_execution_review_ready,
    local_scope_declared: true,
    operator_supervision_declared: true,
    rollback_readiness_declared: true,
    recovery_readiness_declared: true,
    rollback_execution_external_to_module: true,
    recovery_execution_external_to_module: true,
    evidence_capture_declared: true,
    rollback_target_declared: true,
    recovery_target_declared: true,
    restore_point_declared: true,
    pre_rollback_state_required: true,
    post_recovery_state_required: true,
    destructive_rollback_blocked: true,
    database_mutation_blocked: true,
    service_restart_blocked: true,
    runtime_truth_dependency_bound: true,
    smoke_flow_dependency_bound: true,
    production_scope_blocked: true,
    external_network_blocked: true,
    secrets_blocked: true,
    billing_blocked: true,
    deploy_release_tag_stable_blocked: true,
    pass_gold_real_not_claimed: true,
    v471_blocked: true,
    rta10_blocked: true,
    operator_id,
    rollback_readiness_id,
    recovery_readiness_id,
    runtime_truth_receipt_id,
    smoke_flow_receipt_id,
    execution_mode: 'manual-supervised-local',
    target_environment: 'local',
    rollback_executed_by_module: false,
    recovery_executed_by_module: false,
    command_executed_by_module: false,
    endpoint_probe_performed_by_module: false,
    production_target: false,
    external_network_used: false,
    secrets_used: false,
    billing_used: false,
    rollback_executed: false,
    recovery_executed: false,
    database_mutated: false,
    service_restarted: false,
    deploy_used: false,
    release_used: false,
    tag_used: false,
    stable_promotion_used: false,
    controls,
    evidence_hash,
    final_message:
      'RTE-2 local rollback and recovery readiness evidence prepared. Rollback and recovery remain manual-supervised-local and external to the module; PASS GOLD REAL is not claimed.',
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.READY) return false;

  const evidenceFields = [
    'local_scope_declared',
    'operator_supervision_declared',
    'rollback_readiness_declared',
    'recovery_readiness_declared',
    'rollback_execution_external_to_module',
    'recovery_execution_external_to_module',
    'evidence_capture_declared',
    'rollback_target_declared',
    'recovery_target_declared',
    'restore_point_declared',
    'pre_rollback_state_required',
    'post_recovery_state_required',
    'destructive_rollback_blocked',
    'database_mutation_blocked',
    'service_restart_blocked',
    'runtime_truth_dependency_bound',
    'smoke_flow_dependency_bound',
    'production_scope_blocked',
    'external_network_blocked',
    'secrets_blocked',
    'billing_blocked',
    'deploy_release_tag_stable_blocked',
    'pass_gold_real_not_claimed',
    'v471_blocked',
    'rta10_blocked',
  ];
  for (const field of evidenceFields) {
    if (result[field] !== true) return false;
  }

  const receiptStringFields = [
    'operator_id',
    'rollback_readiness_id',
    'recovery_readiness_id',
    'runtime_truth_receipt_id',
    'smoke_flow_receipt_id',
  ];
  for (const field of receiptStringFields) {
    if (typeof result[field] !== 'string' || result[field].trim() === '') return false;
  }

  if (result.execution_mode !== 'manual-supervised-local') return false;
  if (result.target_environment !== 'local') return false;

  const mustBeFalse = [
    'rollback_executed_by_module',
    'recovery_executed_by_module',
    'command_executed_by_module',
    'endpoint_probe_performed_by_module',
    'production_target',
    'external_network_used',
    'secrets_used',
    'billing_used',
    'rollback_executed',
    'recovery_executed',
    'database_mutated',
    'service_restarted',
    'deploy_used',
    'release_used',
    'tag_used',
    'stable_promotion_used',
  ];
  for (const field of mustBeFalse) {
    if (result[field] !== false) return false;
  }

  const requiredControls = [
    'rte1-required',
    'rte-path-chosen',
    'local-rollback-recovery-readiness-evidence-only',
    'manual-supervised-local-only',
    'rollback-execution-external-to-module',
    'recovery-execution-external-to-module',
    'no-module-runtime-execution',
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
    'v471-blocked',
    'rta10-blocked',
  ];
  if (!Array.isArray(result.controls)) return false;
  for (const ctrl of requiredControls) {
    if (!result.controls.includes(ctrl)) return false;
  }

  if (typeof result.evidence_hash !== 'string' || result.evidence_hash.length !== 64) return false;
  if (
    result.final_message !==
    'RTE-2 local rollback and recovery readiness evidence prepared. Rollback and recovery remain manual-supervised-local and external to the module; PASS GOLD REAL is not claimed.'
  )
    return false;

  return true;
}

export function render(result) {
  return [
    `RTE-2 Local Rollback / Recovery Readiness Evidence`,
    `Status: ${result.status}`,
    `Module: ${result.module_version}`,
    `Execution Mode: ${result.execution_mode}`,
    `Target Environment: ${result.target_environment}`,
    `Operator ID: ${result.operator_id}`,
    `Rollback Readiness ID: ${result.rollback_readiness_id}`,
    `Recovery Readiness ID: ${result.recovery_readiness_id}`,
    `Runtime Truth Receipt ID: ${result.runtime_truth_receipt_id}`,
    `Smoke Flow Receipt ID: ${result.smoke_flow_receipt_id}`,
    `Evidence Hash: ${result.evidence_hash}`,
    `Controls: ${Array.isArray(result.controls) ? result.controls.join(', ') : 'none'}`,
    `Message: ${result.final_message}`,
    ``,
    `=== REGRA ABSOLUTA ===`,
    `SEM PASS GOLD REAL → não promove, não libera, não marca stable.`,
  ].join('\n');
}

export default { build, validate, render, STATUSES };
