#!/usr/bin/env node
/**
 * Real Tag Manual Safety Lock — V82.0
 *
 * Multi-gate safety lock for real tag manual executor.
 * Checks contract, confirmation, git head, worktree cleanliness,
 * local/remote tag absence, rollback anchor, evidence source,
 * CI environment, interactive session, and dry-run requirement.
 *
 * REGRA ABSOLUTA: real_tag_execution_allowed=false by default.
 * explicit_real_command_required=true always. ci_blocked=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v82.0';

export const MANUAL_SAFETY_LOCK_STATUSES = [
  'MANUAL_SAFETY_LOCK_BLOCKED_CONTRACT',
  'MANUAL_SAFETY_LOCK_BLOCKED_CONFIRMATION',
  'MANUAL_SAFETY_LOCK_BLOCKED_HEAD',
  'MANUAL_SAFETY_LOCK_BLOCKED_WORKTREE',
  'MANUAL_SAFETY_LOCK_BLOCKED_LOCAL_TAG_EXISTS',
  'MANUAL_SAFETY_LOCK_BLOCKED_REMOTE_TAG_EXISTS',
  'MANUAL_SAFETY_LOCK_BLOCKED_ROLLBACK',
  'MANUAL_SAFETY_LOCK_BLOCKED_EVIDENCE',
  'MANUAL_SAFETY_LOCK_BLOCKED_CI',
  'MANUAL_SAFETY_LOCK_BLOCKED_INTERACTIVE',
  'MANUAL_SAFETY_LOCK_BLOCKED_DRY_RUN',
  'MANUAL_SAFETY_LOCK_READY_REVIEW',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    real_tag_execution_allowed:   false,
    explicit_real_command_required: true,
    ci_blocked:                   true,
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:           SCHEMA_VERSION,
    safety_lock_status:       status,
    safety_lock_ready:        false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function evaluateRealTagManualSafetyLock(params = {}) {
  const {
    fixture_mode             = false,
    executor_contract,
    confirmation_contract,
    target_git_head,
    worktree_clean,
    local_tag_exists,
    remote_tag_exists,
    rollback_anchor_id,
    evidence_source,
    ci_environment,
    local_interactive_session,
    dry_run,
    requested_by,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const lock_id = _sha256(`real-tag-manual-safety-lock:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:           SCHEMA_VERSION,
      safety_lock_id:           lock_id,
      safety_lock_status:       'MANUAL_SAFETY_LOCK_READY_REVIEW',
      safety_lock_ready:        true,
      blocking_reason:          null,
      target_tag:               'v1.2.3',
      target_git_head:          'abc1234def5678901234567890123456789012ab',
      evidence_source:          'go-core',
      worktree_clean:           true,
      local_tag_exists:         false,
      remote_tag_exists:        false,
      local_interactive_session: true,
      ci_environment:           false,
      dry_run:                  true,
      requested_by:             'fixture-user',
      created_at:               now,
      ..._locked(),
    };
  }

  // Contract check
  if (!executor_contract || executor_contract.manual_executor_contract_ready !== true) {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_CONTRACT', 'executor_contract_not_ready', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  // Confirmation check
  if (!confirmation_contract || confirmation_contract.manual_confirmation_ready !== true) {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_CONFIRMATION', 'confirmation_contract_not_ready', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  // Git head check
  if (!target_git_head) {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_HEAD', 'target_git_head_missing', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  // Worktree check
  if (worktree_clean !== true) {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_WORKTREE', 'worktree_not_clean', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  // Local tag check
  if (local_tag_exists === true) {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_LOCAL_TAG_EXISTS', 'local_tag_already_exists', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  // Remote tag check
  if (remote_tag_exists === true) {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_REMOTE_TAG_EXISTS', 'remote_tag_already_exists', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  // Rollback anchor check
  if (!rollback_anchor_id) {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_ROLLBACK', 'rollback_anchor_id_missing', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  // Evidence source check
  if (evidence_source !== 'go-core') {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_EVIDENCE', 'evidence_source_not_go_core', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  // CI environment check
  if (ci_environment === true) {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_CI', 'ci_environment_detected', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  // Interactive session check
  if (local_interactive_session !== true) {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_INTERACTIVE', 'non_interactive_session', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  // Dry run check
  if (dry_run !== true) {
    return _blocked('MANUAL_SAFETY_LOCK_BLOCKED_DRY_RUN', 'dry_run_required', {
      safety_lock_id: lock_id, created_at: now,
    });
  }

  return {
    schema_version:            SCHEMA_VERSION,
    safety_lock_id:            lock_id,
    safety_lock_status:        'MANUAL_SAFETY_LOCK_READY_REVIEW',
    safety_lock_ready:         true,
    blocking_reason:           null,
    target_tag:                executor_contract.target_tag ?? null,
    target_git_head,
    evidence_source,
    worktree_clean,
    local_tag_exists:          false,
    remote_tag_exists:         false,
    local_interactive_session,
    ci_environment:            false,
    dry_run,
    requested_by:              requested_by ?? null,
    created_at:                now,
    ..._locked(),
  };
}

export function validateRealTagManualSafetyLock(lock) {
  if (!lock || typeof lock !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!MANUAL_SAFETY_LOCK_STATUSES.includes(lock.safety_lock_status))
    return { valid: false, reason: 'unknown_status' };
  if (lock.real_tag_execution_allowed  === true) return { valid: false, reason: 'execution_must_be_false' };
  if (lock.tag_created                 === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (lock.ci_blocked                  === false) return { valid: false, reason: 'ci_blocked_must_be_true' };
  return { valid: true };
}

export function renderRealTagManualSafetyLock(lock) {
  if (!lock) return 'real_tag_manual_safety_lock: null';
  return [
    `safety_lock_status              : ${lock.safety_lock_status ?? 'UNKNOWN'}`,
    `safety_lock_id                  : ${lock.safety_lock_id ?? 'none'}`,
    `target_tag                      : ${lock.target_tag ?? 'none'}`,
    `target_git_head                 : ${lock.target_git_head ?? 'none'}`,
    `evidence_source                 : ${lock.evidence_source ?? 'none'}`,
    `worktree_clean                  : ${lock.worktree_clean ?? false}`,
    `local_tag_exists                : ${lock.local_tag_exists ?? 'unknown'}`,
    `remote_tag_exists               : ${lock.remote_tag_exists ?? 'unknown'}`,
    `local_interactive_session       : ${lock.local_interactive_session ?? false}`,
    `ci_environment                  : ${lock.ci_environment ?? 'unknown'}`,
    `dry_run                         : ${lock.dry_run ?? false}`,
    `real_tag_execution_allowed      : false`,
    `explicit_real_command_required  : true`,
    `ci_blocked                      : true`,
    `tag_created                     : false`,
    `git_push_performed              : false`,
    `blocking_reason                 : ${lock.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-safety-lock.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');
  const result  = evaluateRealTagManualSafetyLock({ fixture_mode: fixture });
  if (json) console.log(JSON.stringify(result, null, 2));
  else      console.log(renderRealTagManualSafetyLock(result));
  process.exit(result.safety_lock_ready ? 0 : 1);
}
