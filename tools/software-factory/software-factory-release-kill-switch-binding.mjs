/**
 * V408 — Release Kill-Switch Binding
 * Metadata-only. Kill-switch NOT armed. Hard stop NOT lifted.
 * release_kill_switch_bound=false always.
 * release_kill_switch_armed=false always.
 * real_release_hard_stop_lifted=false always.
 * real_release_execution_allowed=false always.
 */

import { createHash } from 'crypto';

export const STATUSES = {
  RELEASE_KILL_SWITCH_BINDING_BLOCKED_INPUT: 'RELEASE_KILL_SWITCH_BINDING_BLOCKED_INPUT',
  RELEASE_KILL_SWITCH_BINDING_BLOCKED_HARD_STOP: 'RELEASE_KILL_SWITCH_BINDING_BLOCKED_HARD_STOP',
  RELEASE_KILL_SWITCH_BINDING_FAIL: 'RELEASE_KILL_SWITCH_BINDING_FAIL',
  RELEASE_KILL_SWITCH_BINDING_READY: 'RELEASE_KILL_SWITCH_BINDING_READY',
};

const ALLOWED_KILL_SWITCH_TYPES = new Set([
  'release_kill_switch', 'deploy_kill_switch', 'tag_kill_switch', 'stable_kill_switch',
  'artifact_kill_switch', 'production_kill_switch', 'billing_kill_switch',
  'secret_kill_switch', 'network_kill_switch', 'rollback_kill_switch',
  'operator_kill_switch', 'emergency_stop_kill_switch',
]);

const ALLOWED_KILL_SWITCH_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const REQUIRED_CONTROLS = new Set([
  'release-kill-switch-binding-required',
  'hard-stop-required',
  'kill-switch-not-armed',
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
      schema_version: 'v408',
      status: STATUSES.RELEASE_KILL_SWITCH_BINDING_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    release_kill_switch_binding_id,
    hard_stop_enforcement_gate_id,
    hard_stop_enforcement_gate_ready,
    kill_switch_items,
    required_kill_switch_controls,
    kill_switch_level,
  } = input;

  const errors = [];

  if (!release_kill_switch_binding_id) errors.push('release_kill_switch_binding_id required');
  if (!hard_stop_enforcement_gate_id) errors.push('hard_stop_enforcement_gate_id required');
  if (!kill_switch_level) errors.push('kill_switch_level required');
  if (!Array.isArray(kill_switch_items) || kill_switch_items.length === 0) errors.push('kill_switch_items required');
  if (!Array.isArray(required_kill_switch_controls) || required_kill_switch_controls.length === 0) errors.push('required_kill_switch_controls required');

  if (errors.length > 0) {
    return {
      schema_version: 'v408',
      status: STATUSES.RELEASE_KILL_SWITCH_BINDING_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  for (const item of kill_switch_items) {
    if (!item.kill_switch_item_id) errors.push('kill_switch_item_id required');
    if (!item.kill_switch_type) errors.push('kill_switch_type required');
    else if (!ALLOWED_KILL_SWITCH_TYPES.has(item.kill_switch_type)) errors.push(`kill_switch_type '${item.kill_switch_type}' not allowed`);
    if (!item.kill_switch_mode) errors.push('kill_switch_mode required');
    else if (!ALLOWED_KILL_SWITCH_MODES.has(item.kill_switch_mode)) errors.push(`kill_switch_mode '${item.kill_switch_mode}' not allowed`);
    if (!item.kill_switch_hash) errors.push('kill_switch_hash required');
  }

  for (const ctrl of REQUIRED_CONTROLS) {
    if (!required_kill_switch_controls.includes(ctrl)) errors.push(`required control missing: ${ctrl}`);
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v408',
      status: STATUSES.RELEASE_KILL_SWITCH_BINDING_FAIL,
      errors,
      ...invariants(),
    };
  }

  if (!hard_stop_enforcement_gate_ready) {
    return {
      schema_version: 'v408',
      status: STATUSES.RELEASE_KILL_SWITCH_BINDING_BLOCKED_HARD_STOP,
      errors: ['hard_stop_enforcement_gate must be READY'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      release_kill_switch_binding_id,
      hard_stop_enforcement_gate_id,
      kill_switch_level,
      kill_switch_items: kill_switch_items.map(i => i.kill_switch_item_id),
      required_kill_switch_controls,
    }))
    .digest('hex');

  return {
    schema_version: 'v408',
    status: STATUSES.RELEASE_KILL_SWITCH_BINDING_READY,
    release_kill_switch_binding_id,
    hard_stop_enforcement_gate_id,
    kill_switch_level,
    kill_switch_items_count: kill_switch_items.length,
    required_kill_switch_controls,
    hash,
    errors: [],
    final_message: 'Release kill-switch binding READY. Kill-switch NOT armed. Hard stop NOT lifted. Execution NOT allowed.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.RELEASE_KILL_SWITCH_BINDING_READY) return false;
  if (result.release_kill_switch_bound !== false) return false;
  if (result.release_kill_switch_armed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V408] Release Kill-Switch Binding — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '=== V408 Release Kill-Switch Binding ===',
    `Status: ${result.status}`,
    `Schema: ${result.schema_version || 'v408'}`,
  ];
  if (result.release_kill_switch_binding_id) {
    lines.push(`Binding ID: ${result.release_kill_switch_binding_id}`);
  }
  if (result.kill_switch_level) lines.push(`Level: ${result.kill_switch_level}`);
  if (result.hash) lines.push(`Hash: ${result.hash}`);
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join(', ')}`);
  }
  if (result.final_message) lines.push(`Message: ${result.final_message}`);
  lines.push('');
  lines.push('INVARIANTS:');
  lines.push(`  release_kill_switch_bound: ${result.release_kill_switch_bound}`);
  lines.push(`  release_kill_switch_armed: ${result.release_kill_switch_armed}`);
  lines.push(`  real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`  real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`  production_touched: ${result.production_touched}`);
  lines.push('');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
