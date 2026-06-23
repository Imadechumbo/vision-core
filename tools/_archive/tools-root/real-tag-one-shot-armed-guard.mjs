#!/usr/bin/env node
/**
 * Real Tag One-Shot Armed Guard — V78.1
 *
 * Evaluates whether all explicit confirmations are present to arm the guard.
 * READY_BUT_NOT_EXECUTED: does NOT create a tag even when all flags present.
 *
 * REGRA ABSOLUTA: tag_created=false always in this version.
 * CI always blocked. requires_manual_executor=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v78.1';

export const TAG_ARMED_STATUSES = [
  'TAG_ARMED_BLOCKED_NOT_REQUESTED',
  'TAG_ARMED_BLOCKED_CI',
  'TAG_ARMED_BLOCKED_CONFIRMATION',
  'TAG_ARMED_BLOCKED_TARGET',
  'TAG_ARMED_BLOCKED_EVIDENCE',
  'TAG_ARMED_BLOCKED_ROLLBACK',
  'TAG_ARMED_READY_BUT_NOT_EXECUTED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    real_execution_armed:     false,
    tag_execution_allowed:    false,
    tag_created:              false,
    git_push_performed:       false,
    deploy_performed:         false,
    stable_promoted:          false,
    release_performed:        false,
    requires_manual_executor: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    armed_guard_status:  status,
    armed_guard_ready:   false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function evaluateRealTagOneShotArmedGuard(params = {}) {
  const {
    fixture_mode                          = false,
    real_tag_one_shot                     = false,
    i_understand_this_creates_a_real_git_tag = false,
    confirm_target_tag,
    confirm_git_head,
    confirm_evidence_receipt,
    confirm_no_deploy                     = false,
    confirm_no_stable_promotion           = false,
    confirm_no_release                    = false,
    confirm_rollback_anchor               = false,
    local_interactive_session             = false,
    ci_environment                        = true,
    one_shot_contract,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const guard_id = _sha256(`real-tag-armed-guard:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:       SCHEMA_VERSION,
      armed_guard_id:       guard_id,
      armed_guard_status:   'TAG_ARMED_READY_BUT_NOT_EXECUTED',
      armed_guard_ready:    true,
      blocking_reason:      null,
      created_at:           now,
      real_execution_armed: false,
      tag_execution_allowed: false,
      tag_created:          false,
      git_push_performed:   false,
      deploy_performed:     false,
      stable_promoted:      false,
      release_performed:    false,
      requires_manual_executor: true,
    };
  }

  // Not requested
  if (!real_tag_one_shot) {
    return _blocked('TAG_ARMED_BLOCKED_NOT_REQUESTED', 'real_tag_one_shot_not_set', {
      armed_guard_id: guard_id, created_at: now,
    });
  }

  // CI environment always blocked
  if (ci_environment === true || !local_interactive_session) {
    return _blocked('TAG_ARMED_BLOCKED_CI', 'ci_environment_or_non_interactive_blocked', {
      armed_guard_id: guard_id, created_at: now,
    });
  }

  // All confirmation flags
  const allConfirmed = (
    i_understand_this_creates_a_real_git_tag === true &&
    confirm_no_deploy             === true &&
    confirm_no_stable_promotion   === true &&
    confirm_no_release            === true
  );
  if (!allConfirmed) {
    return _blocked('TAG_ARMED_BLOCKED_CONFIRMATION', 'required_confirmation_flags_missing', {
      armed_guard_id: guard_id, created_at: now,
    });
  }

  // Target match
  const contractTag     = one_shot_contract?.target_tag;
  const contractHead    = one_shot_contract?.git_head;
  const contractReceipt = one_shot_contract?.evidence_receipt_id;

  if (!confirm_target_tag || confirm_target_tag !== contractTag ||
      !confirm_git_head    || confirm_git_head    !== contractHead) {
    return _blocked('TAG_ARMED_BLOCKED_TARGET', 'target_tag_or_git_head_mismatch', {
      armed_guard_id: guard_id, created_at: now,
    });
  }

  // Evidence match
  if (!confirm_evidence_receipt || confirm_evidence_receipt !== contractReceipt) {
    return _blocked('TAG_ARMED_BLOCKED_EVIDENCE', 'evidence_receipt_mismatch', {
      armed_guard_id: guard_id, created_at: now,
    });
  }

  // Rollback anchor
  if (!confirm_rollback_anchor) {
    return _blocked('TAG_ARMED_BLOCKED_ROLLBACK', 'rollback_anchor_not_confirmed', {
      armed_guard_id: guard_id, created_at: now,
    });
  }

  return {
    schema_version:        SCHEMA_VERSION,
    armed_guard_id:        guard_id,
    armed_guard_status:    'TAG_ARMED_READY_BUT_NOT_EXECUTED',
    armed_guard_ready:     true,
    blocking_reason:       null,
    created_at:            now,
    real_execution_armed:  false,
    tag_execution_allowed: false,
    tag_created:           false,
    git_push_performed:    false,
    deploy_performed:      false,
    stable_promoted:       false,
    release_performed:     false,
    requires_manual_executor: true,
  };
}

export function validateRealTagOneShotArmedGuard(guard) {
  if (!guard || typeof guard !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!TAG_ARMED_STATUSES.includes(guard.armed_guard_status))
    return { valid: false, reason: 'unknown_status' };
  if (guard.tag_created          === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (guard.git_push_performed   === true) return { valid: false, reason: 'git_push_must_be_false' };
  if (guard.requires_manual_executor !== true) return { valid: false, reason: 'requires_manual_executor_must_be_true' };
  return { valid: true };
}

export function renderRealTagOneShotArmedGuard(guard) {
  if (!guard) return 'real_tag_one_shot_armed_guard: null';
  return [
    `armed_guard_status          : ${guard.armed_guard_status ?? 'UNKNOWN'}`,
    `armed_guard_id              : ${guard.armed_guard_id ?? 'none'}`,
    `armed_guard_ready           : ${guard.armed_guard_ready ?? false}`,
    `real_execution_armed        : false`,
    `tag_execution_allowed       : false`,
    `tag_created                 : false`,
    `git_push_performed          : false`,
    `requires_manual_executor    : true`,
    `blocking_reason             : ${guard.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-armed-guard.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateRealTagOneShotArmedGuard({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagOneShotArmedGuard(result));
  }

  process.exit(result.armed_guard_ready ? 0 : 1);
}
