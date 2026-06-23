#!/usr/bin/env node
/**
 * Real Tag One-Shot Post-Execution Verifier — V87.0
 *
 * Verifies that a tag was created successfully after execution.
 * Checks local tag exists, remote tag exists, and tag points to HEAD.
 * Uses injectable spawn_adapter for all git queries.
 *
 * REGRA ABSOLUTA: tag_created=false (verifier does not create tags),
 * deploy_performed=false, stable_promoted=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v87.0';

export const POST_EXEC_VERIFIER_STATUSES = [
  'POST_EXEC_VERIFY_BLOCKED_EXECUTOR',
  'POST_EXEC_VERIFY_BLOCKED_NOT_EXECUTED',
  'POST_EXEC_VERIFY_BLOCKED_CI',
  'POST_EXEC_VERIFY_BLOCKED_LOCAL_TAG_MISSING',
  'POST_EXEC_VERIFY_BLOCKED_REMOTE_TAG_MISSING',
  'POST_EXEC_VERIFY_BLOCKED_HEAD_MISMATCH',
  'POST_EXEC_VERIFY_BLOCKED_ADAPTER',
  'POST_EXEC_VERIFY_SKIPPED_DRY_RUN',
  'POST_EXEC_VERIFY_PASSED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    verifier_status:   status,
    verification_passed: false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function runPostExecutionVerifier(params = {}) {
  const {
    executor_status,
    executor_ready         = false,
    tag_created            = false,
    git_push_performed     = false,
    target_tag,
    expected_git_head,
    ci                     = false,
    spawn_adapter,
    fixture_mode           = false,
    _mock_timestamp,
  } = params ?? {};

  const now          = _mock_timestamp ?? new Date().toISOString();
  const id_tag       = fixture_mode ? 'fixture' : (target_tag ?? 'unknown');
  const verifier_id  = _sha256(`post-exec-verify:${SCHEMA_VERSION}:${id_tag}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const is_dry = executor_status === 'LOCAL_EXEC_DRY_RUN_COMPLETE' ||
                   tag_created !== true;
    if (is_dry) {
      return {
        schema_version:      SCHEMA_VERSION,
        verifier_id,
        verifier_status:     'POST_EXEC_VERIFY_SKIPPED_DRY_RUN',
        verification_passed: true,
        dry_run_skipped:     true,
        blocking_reason:     null,
        created_at:          now,
        ..._locked(),
      };
    }
    return {
      schema_version:         SCHEMA_VERSION,
      verifier_id,
      verifier_status:        'POST_EXEC_VERIFY_PASSED',
      verification_passed:    true,
      dry_run_skipped:        false,
      local_tag_verified:     true,
      remote_tag_verified:    true,
      head_match_verified:    true,
      blocking_reason:        null,
      created_at:             now,
      ..._locked(),
    };
  }

  // Gate 1: executor must be ready
  if (executor_ready !== true) {
    return _blocked('POST_EXEC_VERIFY_BLOCKED_EXECUTOR', 'executor_not_ready', {
      verifier_id,
      created_at: now,
    });
  }

  // Gate 2: executor must have executed
  if (executor_status === 'LOCAL_EXEC_DRY_RUN_COMPLETE') {
    return {
      schema_version:      SCHEMA_VERSION,
      verifier_id,
      verifier_status:     'POST_EXEC_VERIFY_SKIPPED_DRY_RUN',
      verification_passed: true,
      dry_run_skipped:     true,
      blocking_reason:     null,
      created_at:          now,
      ..._locked(),
    };
  }

  if (executor_status !== 'LOCAL_EXEC_REAL_TAG_EXECUTED' || tag_created !== true) {
    return _blocked('POST_EXEC_VERIFY_BLOCKED_NOT_EXECUTED', 'tag_was_not_created', {
      verifier_id,
      executor_status_provided: executor_status ?? null,
      tag_created_provided:     tag_created,
      created_at:               now,
    });
  }

  // Gate 3: CI block
  if (ci === true) {
    return _blocked('POST_EXEC_VERIFY_BLOCKED_CI', 'ci_environment_detected', {
      verifier_id,
      created_at: now,
    });
  }

  // Gate 4: need spawn_adapter for real verification
  if (typeof spawn_adapter !== 'function') {
    return _blocked('POST_EXEC_VERIFY_BLOCKED_ADAPTER', 'spawn_adapter_required', {
      verifier_id,
      created_at: now,
    });
  }

  // Verify local tag
  try {
    const local_check = spawn_adapter('git', ['tag', '-l', target_tag]);
    const local_ok = local_check && local_check.status === 0 &&
                     local_check.stdout && local_check.stdout.trim() === target_tag;
    if (!local_ok) {
      return _blocked('POST_EXEC_VERIFY_BLOCKED_LOCAL_TAG_MISSING', 'local_tag_not_found', {
        verifier_id,
        local_tag_verified: false,
        created_at:         now,
      });
    }

    // Verify remote tag
    const remote_check = spawn_adapter('git', ['ls-remote', '--tags', 'origin', `refs/tags/${target_tag}`]);
    const remote_ok = remote_check && remote_check.status === 0 &&
                      remote_check.stdout && remote_check.stdout.includes(target_tag);
    if (!remote_ok) {
      return _blocked('POST_EXEC_VERIFY_BLOCKED_REMOTE_TAG_MISSING', 'remote_tag_not_found', {
        verifier_id,
        local_tag_verified:  true,
        remote_tag_verified: false,
        created_at:          now,
      });
    }

    // Verify HEAD match
    if (expected_git_head) {
      const head_check = spawn_adapter('git', ['rev-list', '-n', '1', target_tag]);
      const actual_head = head_check && head_check.stdout ? head_check.stdout.trim() : null;
      const head_ok = actual_head && actual_head.startsWith(expected_git_head.slice(0, 7));
      if (!head_ok) {
        return _blocked('POST_EXEC_VERIFY_BLOCKED_HEAD_MISMATCH', 'tag_head_does_not_match_expected', {
          verifier_id,
          local_tag_verified:  true,
          remote_tag_verified: true,
          head_match_verified: false,
          expected_head:       expected_git_head,
          actual_head,
          created_at:          now,
        });
      }
    }

    return {
      schema_version:         SCHEMA_VERSION,
      verifier_id,
      verifier_status:        'POST_EXEC_VERIFY_PASSED',
      verification_passed:    true,
      dry_run_skipped:        false,
      local_tag_verified:     true,
      remote_tag_verified:    true,
      head_match_verified:    true,
      target_tag,
      blocking_reason:        null,
      created_at:             now,
      ..._locked(),
    };
  } catch (err) {
    return _blocked('POST_EXEC_VERIFY_BLOCKED_ADAPTER', `spawn_adapter_threw: ${err.message}`, {
      verifier_id,
      created_at: now,
    });
  }
}

export function validatePostExecutionVerifierResult(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['result_missing'] };
  const errors = [];
  if (!POST_EXEC_VERIFIER_STATUSES.includes(result.verifier_status)) errors.push('verifier_status_invalid');
  if (result.tag_created         === true) errors.push('tag_created_must_be_false');
  if (result.git_push_performed  === true) errors.push('push_must_be_false');
  if (result.deploy_performed    === true) errors.push('deploy_performed_must_be_false');
  if (result.stable_promoted     === true) errors.push('stable_promoted_must_be_false');
  if (result.release_performed   === true) errors.push('release_performed_must_be_false');
  return { valid: errors.length === 0, errors };
}

export function renderPostExecutionVerifierSummary(result) {
  if (!result) return 'real_tag_post_execution_verifier: null';
  return [
    `verifier_status               : ${result.verifier_status ?? 'UNKNOWN'}`,
    `verification_passed           : ${result.verification_passed ?? false}`,
    `dry_run_skipped               : ${result.dry_run_skipped ?? false}`,
    `local_tag_verified            : ${result.local_tag_verified ?? false}`,
    `remote_tag_verified           : ${result.remote_tag_verified ?? false}`,
    `head_match_verified           : ${result.head_match_verified ?? false}`,
    `tag_created                   : false`,
    `git_push_performed            : false`,
    `deploy_performed              : false`,
    `stable_promoted               : false`,
    `release_performed             : false`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-post-execution-verifier.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runPostExecutionVerifier({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderPostExecutionVerifierSummary(result));
  }

  process.exit(result.verification_passed ? 0 : 1);
}
