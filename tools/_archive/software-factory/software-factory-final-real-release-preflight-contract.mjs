/**
 * V406 — Final Real Release Preflight Contract
 * Metadata-only. Does NOT pass real preflight. Does NOT allow real execution.
 * final_real_release_preflight_passed=false always.
 * real_release_execution_allowed=false always.
 */

import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_INPUT: 'FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_INPUT',
  FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_OPERATOR: 'FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_OPERATOR',
  FINAL_REAL_RELEASE_PREFLIGHT_FAIL: 'FINAL_REAL_RELEASE_PREFLIGHT_FAIL',
  FINAL_REAL_RELEASE_PREFLIGHT_READY: 'FINAL_REAL_RELEASE_PREFLIGHT_READY',
};

const ALLOWED_PREFLIGHT_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_PREFLIGHT_TYPES = new Set([
  'release_preflight', 'deploy_preflight', 'tag_preflight', 'stable_preflight',
  'artifact_preflight', 'production_preflight', 'billing_preflight',
  'secret_preflight', 'network_preflight', 'rollback_preflight',
  'operator_preflight', 'emergency_stop_preflight',
]);

const REQUIRED_CONTROLS = new Set([
  'final-real-release-preflight-required',
  'operator-go-no-go-required',
  'metadata-only-preflight',
  'preflight-not-passed',
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
  'hard-stop-required',
  'audit-required',
  'pass-gold-real-required',
]);

function invariants() {
  return {
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    real_execution_allowed: false,
    real_release_executed: false,
    real_deploy_executed: false,
    real_tag_created: false,
    real_stable_promoted: false,
    artifact_published: false,
    production_touched: false,
    billing_executed: false,
    secrets_accessed: false,
    network_accessed: false,
    rollback_executed: false,
    operator_go_no_go_phase_passed: false,
    operator_go_decision_granted: false,
    real_release_command_executed: false,
    real_release_execution_allowed: false,
    final_real_release_preflight_passed: false,
    hard_stop_enforced: false,
    release_kill_switch_bound: false,
    release_kill_switch_armed: false,
    final_operator_safety_acknowledged: false,
    real_release_hard_stop_phase_passed: false,
    real_release_hard_stop_lifted: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v406',
      status: STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_real_release_preflight_contract_id,
    operator_go_no_go_checklist_phase_gate_id,
    operator_go_no_go_checklist_phase_gate_ready,
    preflight_requested_by,
    preflight_reason,
    preflight_mode,
    preflight_items,
    required_preflight_controls,
  } = input;

  const errors = [];

  if (!final_real_release_preflight_contract_id) errors.push('final_real_release_preflight_contract_id required');
  if (!operator_go_no_go_checklist_phase_gate_id) errors.push('operator_go_no_go_checklist_phase_gate_id required');
  if (!preflight_requested_by) errors.push('preflight_requested_by required');
  if (!preflight_reason) errors.push('preflight_reason required');
  if (!preflight_mode) errors.push('preflight_mode required');
  if (!Array.isArray(preflight_items) || preflight_items.length === 0) errors.push('preflight_items required');
  if (!Array.isArray(required_preflight_controls) || required_preflight_controls.length === 0) errors.push('required_preflight_controls required');

  if (errors.length > 0) {
    return {
      schema_version: 'v406',
      status: STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_PREFLIGHT_MODES.has(preflight_mode)) {
    errors.push(`preflight_mode '${preflight_mode}' not allowed`);
  }

  for (const item of preflight_items) {
    if (!item.preflight_item_id) errors.push('preflight_item_id required');
    if (!item.preflight_type) errors.push('preflight_type required');
    else if (!ALLOWED_PREFLIGHT_TYPES.has(item.preflight_type)) errors.push(`preflight_type '${item.preflight_type}' not allowed`);
    if (!item.preflight_mode) errors.push('item preflight_mode required');
    else if (!ALLOWED_PREFLIGHT_MODES.has(item.preflight_mode)) errors.push(`item preflight_mode '${item.preflight_mode}' not allowed`);
    if (!item.preflight_hash) errors.push('preflight_hash required');
  }

  for (const ctrl of REQUIRED_CONTROLS) {
    if (!required_preflight_controls.includes(ctrl)) errors.push(`required control missing: ${ctrl}`);
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v406',
      status: STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_FAIL,
      errors,
      ...invariants(),
    };
  }

  if (!operator_go_no_go_checklist_phase_gate_ready) {
    return {
      schema_version: 'v406',
      status: STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_OPERATOR,
      errors: ['operator_go_no_go_checklist_phase_gate must be READY'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      final_real_release_preflight_contract_id,
      operator_go_no_go_checklist_phase_gate_id,
      preflight_requested_by,
      preflight_reason,
      preflight_mode,
      preflight_items: preflight_items.map(i => i.preflight_item_id),
      required_preflight_controls,
    }))
    .digest('hex');

  return {
    schema_version: 'v406',
    status: STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_READY,
    final_real_release_preflight_contract_id,
    operator_go_no_go_checklist_phase_gate_id,
    preflight_requested_by,
    preflight_reason,
    preflight_mode,
    preflight_items_count: preflight_items.length,
    required_preflight_controls,
    hash,
    errors: [],
    final_message: 'Final real release preflight contract created. Preflight NOT passed. Execution NOT allowed.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_READY) return false;
  if (result.final_real_release_preflight_passed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_execution_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V406] Final Real Release Preflight Contract — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '=== V406 Final Real Release Preflight Contract ===',
    `Status: ${result.status}`,
    `Schema: ${result.schema_version || 'v406'}`,
  ];
  if (result.final_real_release_preflight_contract_id) {
    lines.push(`Contract ID: ${result.final_real_release_preflight_contract_id}`);
  }
  if (result.preflight_mode) lines.push(`Mode: ${result.preflight_mode}`);
  if (result.hash) lines.push(`Hash: ${result.hash}`);
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join(', ')}`);
  }
  if (result.final_message) lines.push(`Message: ${result.final_message}`);
  lines.push('');
  lines.push('INVARIANTS:');
  lines.push(`  final_real_release_preflight_passed: ${result.final_real_release_preflight_passed}`);
  lines.push(`  real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`  real_execution_allowed: ${result.real_execution_allowed}`);
  lines.push(`  production_touched: ${result.production_touched}`);
  lines.push(`  hard_stop_enforced: ${result.hard_stop_enforced}`);
  lines.push('');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
