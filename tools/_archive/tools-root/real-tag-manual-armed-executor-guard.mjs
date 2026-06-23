#!/usr/bin/env node
/**
 * Real Tag Manual Armed Executor Guard — V84.0
 *
 * Final armed guard before real tag execution. Requires explicit
 * execute_real_tag=true flag in addition to all prior layer checks.
 * When fully armed, real_tag_execution_allowed=true CAN appear (unlike
 * earlier guards). However, tag_created=false still — actual execution
 * happens in a future human-run interactive session only.
 *
 * REGRA ABSOLUTA: tag_created=false always. ci_blocked=true always.
 * Only sets real_tag_execution_allowed=true when fully armed and
 * execute_real_tag=true is explicitly provided.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v84.0';

export const ARMED_EXECUTOR_GUARD_STATUSES = [
  'ARMED_EXECUTOR_GUARD_BLOCKED_NOT_REQUESTED',
  'ARMED_EXECUTOR_GUARD_BLOCKED_EXECUTE_FLAG',
  'ARMED_EXECUTOR_GUARD_BLOCKED_CI',
  'ARMED_EXECUTOR_GUARD_BLOCKED_CONFIRMATION',
  'ARMED_EXECUTOR_GUARD_BLOCKED_TARGET',
  'ARMED_EXECUTOR_GUARD_BLOCKED_HEAD',
  'ARMED_EXECUTOR_GUARD_BLOCKED_EVIDENCE',
  'ARMED_EXECUTOR_GUARD_BLOCKED_ROLLBACK',
  'ARMED_EXECUTOR_GUARD_READY_FOR_MANUAL_EXECUTOR',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _lockedBlocked() {
  return {
    real_tag_execution_allowed: false,
    tag_created:                false,
    git_push_performed:         false,
    deploy_performed:           false,
    stable_promoted:            false,
    release_performed:          false,
    ci_blocked:                 true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:              SCHEMA_VERSION,
    armed_guard_status:          status,
    armed_guard_ready:           false,
    blocking_reason,
    ...extra,
    ..._lockedBlocked(),
  };
}

export function evaluateRealTagManualArmedExecutorGuard(params = {}) {
  const {
    fixture_mode             = false,
    execute_real_tag,
    ci_environment,
    local_interactive_session,
    confirmation_contract,
    safety_lock,
    target_tag,
    target_git_head,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id,
    requested_by,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const guard_id = _sha256(`real-tag-manual-armed-guard:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:              SCHEMA_VERSION,
      guard_id,
      armed_guard_status:          'ARMED_EXECUTOR_GUARD_READY_FOR_MANUAL_EXECUTOR',
      armed_guard_ready:           true,
      blocking_reason:             null,
      target_tag:                  'v1.2.3',
      target_git_head:             'abc1234def5678901234567890123456789012ab',
      evidence_receipt_id:         'receipt-fixture-id',
      evidence_source:             'go-core',
      rollback_anchor_id:          'anchor-fixture-id',
      requested_by:                'fixture-user',
      created_at:                  now,
      real_tag_execution_allowed:  true,
      tag_created:                 false,
      git_push_performed:          false,
      deploy_performed:            false,
      stable_promoted:             false,
      release_performed:           false,
      ci_blocked:                  true,
    };
  }

  // Not requested check
  if (!requested_by) {
    return _blocked('ARMED_EXECUTOR_GUARD_BLOCKED_NOT_REQUESTED', 'requested_by_missing', {
      guard_id, created_at: now,
    });
  }

  // Execute flag check
  if (execute_real_tag !== true) {
    return _blocked('ARMED_EXECUTOR_GUARD_BLOCKED_EXECUTE_FLAG', 'execute_real_tag_must_be_true', {
      guard_id, created_at: now,
    });
  }

  // CI check
  if (ci_environment === true || local_interactive_session !== true) {
    return _blocked('ARMED_EXECUTOR_GUARD_BLOCKED_CI', 'ci_detected_or_non_interactive', {
      guard_id, created_at: now,
    });
  }

  // Confirmation check
  if (!confirmation_contract || confirmation_contract.manual_confirmation_ready !== true) {
    return _blocked('ARMED_EXECUTOR_GUARD_BLOCKED_CONFIRMATION', 'confirmation_not_ready', {
      guard_id, created_at: now,
    });
  }

  // Target tag check
  const resolvedTag = target_tag ?? safety_lock?.target_tag;
  if (!resolvedTag || !resolvedTag.startsWith('v')) {
    return _blocked('ARMED_EXECUTOR_GUARD_BLOCKED_TARGET', 'target_tag_invalid', {
      guard_id, created_at: now,
    });
  }

  // Head check
  const resolvedHead = target_git_head ?? safety_lock?.target_git_head;
  if (!resolvedHead) {
    return _blocked('ARMED_EXECUTOR_GUARD_BLOCKED_HEAD', 'target_git_head_missing', {
      guard_id, created_at: now,
    });
  }

  // Evidence check
  const resolvedEvidence = evidence_receipt_id ?? confirmation_contract?.confirm_evidence_receipt;
  if (!resolvedEvidence || evidence_source !== 'go-core') {
    return _blocked('ARMED_EXECUTOR_GUARD_BLOCKED_EVIDENCE', 'evidence_not_ready_or_not_go_core', {
      guard_id, created_at: now,
    });
  }

  // Rollback check
  const resolvedRollback = rollback_anchor_id ?? safety_lock?.rollback_anchor_id;
  if (!resolvedRollback) {
    return _blocked('ARMED_EXECUTOR_GUARD_BLOCKED_ROLLBACK', 'rollback_anchor_id_missing', {
      guard_id, created_at: now,
    });
  }

  return {
    schema_version:              SCHEMA_VERSION,
    guard_id,
    armed_guard_status:          'ARMED_EXECUTOR_GUARD_READY_FOR_MANUAL_EXECUTOR',
    armed_guard_ready:           true,
    blocking_reason:             null,
    target_tag:                  resolvedTag,
    target_git_head:             resolvedHead,
    evidence_receipt_id:         resolvedEvidence,
    evidence_source,
    rollback_anchor_id:          resolvedRollback,
    requested_by,
    created_at:                  now,
    real_tag_execution_allowed:  true,
    tag_created:                 false,
    git_push_performed:          false,
    deploy_performed:            false,
    stable_promoted:             false,
    release_performed:           false,
    ci_blocked:                  true,
  };
}

export function validateRealTagManualArmedExecutorGuard(guard) {
  if (!guard || typeof guard !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!ARMED_EXECUTOR_GUARD_STATUSES.includes(guard.armed_guard_status))
    return { valid: false, reason: 'unknown_status' };
  if (guard.tag_created        === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (guard.git_push_performed === true) return { valid: false, reason: 'git_push_must_be_false' };
  if (guard.ci_blocked         === false) return { valid: false, reason: 'ci_blocked_must_be_true' };
  return { valid: true };
}

export function renderRealTagManualArmedExecutorGuard(guard) {
  if (!guard) return 'real_tag_manual_armed_executor_guard: null';
  return [
    `armed_guard_status              : ${guard.armed_guard_status ?? 'UNKNOWN'}`,
    `guard_id                        : ${guard.guard_id ?? 'none'}`,
    `target_tag                      : ${guard.target_tag ?? 'none'}`,
    `target_git_head                 : ${guard.target_git_head ?? 'none'}`,
    `evidence_source                 : ${guard.evidence_source ?? 'none'}`,
    `rollback_anchor_id              : ${guard.rollback_anchor_id ?? 'none'}`,
    `real_tag_execution_allowed      : ${guard.real_tag_execution_allowed ?? false}`,
    `tag_created                     : false`,
    `git_push_performed              : false`,
    `ci_blocked                      : true`,
    `blocking_reason                 : ${guard.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-armed-executor-guard.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');
  const result  = evaluateRealTagManualArmedExecutorGuard({ fixture_mode: fixture });
  if (json) console.log(JSON.stringify(result, null, 2));
  else      console.log(renderRealTagManualArmedExecutorGuard(result));
  process.exit(result.armed_guard_ready ? 0 : 1);
}
