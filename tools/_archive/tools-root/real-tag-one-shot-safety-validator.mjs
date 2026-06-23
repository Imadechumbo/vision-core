#!/usr/bin/env node
/**
 * Real Tag One-Shot Safety Validator — V77.0
 *
 * Validates all pre-conditions for a real tag one-shot operation.
 * Blocks tag execution if any condition fails.
 *
 * REGRA ABSOLUTA: tag_execution_allowed=false by default.
 * explicit_real_command_required=true always.
 * tag_created=false always. git_push_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v77.0';

export const TAG_SAFETY_STATUSES = [
  'TAG_SAFETY_BLOCKED_CONTRACT',
  'TAG_SAFETY_BLOCKED_CONFIRMATION',
  'TAG_SAFETY_BLOCKED_BASELINE',
  'TAG_SAFETY_BLOCKED_GIT_HEAD',
  'TAG_SAFETY_BLOCKED_WORKTREE',
  'TAG_SAFETY_BLOCKED_CI',
  'TAG_SAFETY_BLOCKED_ROLLBACK',
  'TAG_SAFETY_BLOCKED_DRY_RUN',
  'TAG_SAFETY_READY_REVIEW',
  'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND',
];

export const TAG_SAFETY_BLOCKED_ACTIONS = [
  'auto_tag_creation',
  'auto_git_push',
  'auto_deploy',
  'auto_stable_promotion',
  'auto_release',
  'ci_tag_execution',
  'default_tag_execution',
  'evidence_override',
  'go_core_override',
];

export const TAG_SAFETY_SAFE_NEXT_ACTIONS = [
  'review_safety_report',
  'verify_rollback_anchor',
  'verify_dry_run_output',
  'if_approved_run_armed_guard_only',
  'do_not_execute_tag_in_this_phase',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    explicit_real_command_required: true,
    explicit_real_command_present:  false,
    tag_execution_allowed:          false,
    tag_created:                    false,
    git_push_performed:             false,
    deploy_performed:               false,
    stable_promoted:                false,
    release_performed:              false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:          SCHEMA_VERSION,
    tag_safety_status:       status,
    tag_safety_ready:        false,
    blocking_reason,
    blocked_actions:         TAG_SAFETY_BLOCKED_ACTIONS,
    safe_next_actions:       TAG_SAFETY_SAFE_NEXT_ACTIONS,
    ...extra,
    ..._locked(),
  };
}

export function validateRealTagOneShotSafety(params = {}) {
  const {
    fixture_mode                = false,
    one_shot_contract,
    human_confirmation_binding,
    real_manual_exec_baseline,
    current_git_head,
    working_tree_clean,
    ci_status_green,
    rollback_anchor_present,
    dry_run_verified,
    explicit_real_command_present = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const validator_id = _sha256(`real-tag-safety:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:                 SCHEMA_VERSION,
      validator_id,
      tag_safety_status:              'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND',
      tag_safety_ready:               true,
      blocking_reason:                null,
      blocked_actions:                TAG_SAFETY_BLOCKED_ACTIONS,
      safe_next_actions:              TAG_SAFETY_SAFE_NEXT_ACTIONS,
      created_at:                     now,
      explicit_real_command_required: true,
      explicit_real_command_present:  false,
      tag_execution_allowed:          false,
      tag_created:                    false,
      git_push_performed:             false,
      deploy_performed:               false,
      stable_promoted:                false,
      release_performed:              false,
    };
  }

  // Contract check
  if (one_shot_contract?.one_shot_contract_status !== 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW') {
    return _blocked('TAG_SAFETY_BLOCKED_CONTRACT', 'one_shot_contract_not_ready', {
      validator_id, created_at: now,
    });
  }

  // Confirmation check
  if (human_confirmation_binding?.binding_status !== 'TAG_CONFIRMATION_READY_REVIEW') {
    return _blocked('TAG_SAFETY_BLOCKED_CONFIRMATION', 'human_confirmation_not_ready', {
      validator_id, created_at: now,
    });
  }

  // Baseline check
  if (real_manual_exec_baseline?.real_manual_exec_baseline_status !== 'REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY') {
    return _blocked('TAG_SAFETY_BLOCKED_BASELINE', 'baseline_not_ready', {
      validator_id, created_at: now,
    });
  }

  // Git head check
  const expectedHead = one_shot_contract.git_head;
  if (!current_git_head || current_git_head !== expectedHead) {
    return _blocked('TAG_SAFETY_BLOCKED_GIT_HEAD', 'git_head_mismatch', {
      validator_id, created_at: now,
    });
  }

  // Worktree check
  if (working_tree_clean !== true) {
    return _blocked('TAG_SAFETY_BLOCKED_WORKTREE', 'working_tree_not_clean', {
      validator_id, created_at: now,
    });
  }

  // CI check
  if (ci_status_green !== true) {
    return _blocked('TAG_SAFETY_BLOCKED_CI', 'ci_status_not_green', {
      validator_id, created_at: now,
    });
  }

  // Rollback anchor check
  if (rollback_anchor_present !== true) {
    return _blocked('TAG_SAFETY_BLOCKED_ROLLBACK', 'rollback_anchor_not_present', {
      validator_id, created_at: now,
    });
  }

  // Dry run check
  if (dry_run_verified !== true) {
    return _blocked('TAG_SAFETY_BLOCKED_DRY_RUN', 'dry_run_not_verified', {
      validator_id, created_at: now,
    });
  }

  // Ready — explicit command still absent by default
  const status = explicit_real_command_present
    ? 'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND'
    : 'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND';

  return {
    schema_version:                 SCHEMA_VERSION,
    validator_id,
    tag_safety_status:              status,
    tag_safety_ready:               true,
    blocking_reason:                null,
    blocked_actions:                TAG_SAFETY_BLOCKED_ACTIONS,
    safe_next_actions:              TAG_SAFETY_SAFE_NEXT_ACTIONS,
    created_at:                     now,
    explicit_real_command_required: true,
    explicit_real_command_present:  false,
    tag_execution_allowed:          false,
    tag_created:                    false,
    git_push_performed:             false,
    deploy_performed:               false,
    stable_promoted:                false,
    release_performed:              false,
  };
}

export function classifyRealTagOneShotSafety(safety_result) {
  if (!safety_result) return 'unknown';
  if (!safety_result.tag_safety_ready) return 'blocked';
  return 'ready_review';
}

export function renderRealTagOneShotSafetyValidator(result) {
  if (!result) return 'real_tag_one_shot_safety_validator: null';
  return [
    `tag_safety_status               : ${result.tag_safety_status ?? 'UNKNOWN'}`,
    `validator_id                    : ${result.validator_id ?? 'none'}`,
    `tag_safety_ready                : ${result.tag_safety_ready ?? false}`,
    `explicit_real_command_required  : true`,
    `explicit_real_command_present   : false`,
    `tag_execution_allowed           : false`,
    `tag_created                     : false`,
    `git_push_performed              : false`,
    `deploy_performed                : false`,
    `stable_promoted                 : false`,
    `release_performed               : false`,
    `blocking_reason                 : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-safety-validator.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = validateRealTagOneShotSafety({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagOneShotSafetyValidator(result));
  }

  process.exit(result.tag_safety_ready ? 0 : 1);
}
