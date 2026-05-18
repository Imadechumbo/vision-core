#!/usr/bin/env node
/**
 * Real Tag Manual Dry Run Executor — V83.0
 *
 * Simulates the full real tag execution path without creating anything.
 * Requires safety_lock ready, commands ready, dry_run=true, execute_now=false.
 *
 * REGRA ABSOLUTA: dry_run=true AND execute_now=false both required.
 * tag_created=false always. git_push_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v83.0';

export const MANUAL_DRY_RUN_STATUSES = [
  'MANUAL_DRY_RUN_BLOCKED_LOCK',
  'MANUAL_DRY_RUN_BLOCKED_COMMANDS',
  'MANUAL_DRY_RUN_BLOCKED_NOT_DRY_RUN',
  'MANUAL_DRY_RUN_BLOCKED_EXECUTE_NOW',
  'MANUAL_DRY_RUN_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    dry_run:              true,
    execute_now:          false,
    tag_created:          false,
    git_push_performed:   false,
    deploy_performed:     false,
    stable_promoted:      false,
    release_performed:    false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:        SCHEMA_VERSION,
    dry_run_status:        status,
    dry_run_ready:         false,
    blocking_reason,
    simulated_steps:       [],
    ...extra,
    ..._locked(),
  };
}

export function runRealTagManualDryRunExecutor(params = {}) {
  const {
    fixture_mode     = false,
    safety_lock,
    command_builder,
    dry_run,
    execute_now,
    requested_by,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const executor_id = _sha256(`real-tag-manual-dry-run:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:   SCHEMA_VERSION,
      executor_id,
      dry_run_status:   'MANUAL_DRY_RUN_READY',
      dry_run_ready:    true,
      blocking_reason:  null,
      target_tag:       'v1.2.3',
      target_git_head:  'abc1234def5678901234567890123456789012ab',
      simulated_steps: [
        'CHECK: safety_lock=ready',
        'CHECK: commands_preview=ready',
        'CHECK: worktree_clean=true',
        'CHECK: local_tag_exists=false',
        'CHECK: remote_tag_exists=false',
        'SIM: git tag -a v1.2.3 abc1234def... -m "Vision Core v1.2.3 PASS GOLD verified"',
        'SIM: git push origin refs/tags/v1.2.3',
        'RESULT: dry_run_complete=true, tag_created=false, git_push=false',
      ],
      requested_by:     'fixture-user',
      created_at:       now,
      ..._locked(),
    };
  }

  // Safety lock check
  if (!safety_lock || safety_lock.safety_lock_ready !== true) {
    return _blocked('MANUAL_DRY_RUN_BLOCKED_LOCK', 'safety_lock_not_ready', {
      executor_id, created_at: now,
    });
  }

  // Command builder check
  if (!command_builder || command_builder.command_preview_ready !== true) {
    return _blocked('MANUAL_DRY_RUN_BLOCKED_COMMANDS', 'command_builder_not_ready', {
      executor_id, created_at: now,
    });
  }

  // Dry run check
  if (dry_run !== true) {
    return _blocked('MANUAL_DRY_RUN_BLOCKED_NOT_DRY_RUN', 'dry_run_must_be_true', {
      executor_id, created_at: now,
    });
  }

  // Execute now check
  if (execute_now === true) {
    return _blocked('MANUAL_DRY_RUN_BLOCKED_EXECUTE_NOW', 'execute_now_must_be_false', {
      executor_id, created_at: now,
    });
  }

  const resolvedTag  = command_builder.target_tag ?? safety_lock.target_tag;
  const resolvedHead = command_builder.target_git_head ?? safety_lock.target_git_head;

  const simulated_steps = [
    `CHECK: safety_lock=ready`,
    `CHECK: commands_preview=ready`,
    `CHECK: worktree_clean=${safety_lock.worktree_clean}`,
    `CHECK: local_tag_exists=${safety_lock.local_tag_exists}`,
    `CHECK: remote_tag_exists=${safety_lock.remote_tag_exists}`,
    `SIM: ${command_builder.tag_command}`,
    `SIM: ${command_builder.push_command}`,
    `RESULT: dry_run_complete=true, tag_created=false, git_push=false`,
  ];

  return {
    schema_version:   SCHEMA_VERSION,
    executor_id,
    dry_run_status:   'MANUAL_DRY_RUN_READY',
    dry_run_ready:    true,
    blocking_reason:  null,
    target_tag:       resolvedTag,
    target_git_head:  resolvedHead,
    simulated_steps,
    requested_by:     requested_by ?? null,
    created_at:       now,
    ..._locked(),
  };
}

export function validateRealTagManualDryRunResult(result) {
  if (!result || typeof result !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!MANUAL_DRY_RUN_STATUSES.includes(result.dry_run_status))
    return { valid: false, reason: 'unknown_status' };
  if (result.dry_run           !== true)  return { valid: false, reason: 'dry_run_must_be_true' };
  if (result.execute_now       === true)  return { valid: false, reason: 'execute_now_must_be_false' };
  if (result.tag_created       === true)  return { valid: false, reason: 'tag_created_must_be_false' };
  if (result.git_push_performed === true) return { valid: false, reason: 'git_push_must_be_false' };
  return { valid: true };
}

export function renderRealTagManualDryRunSummary(result) {
  if (!result) return 'real_tag_manual_dry_run_executor: null';
  const steps = (result.simulated_steps ?? []).map(s => `  ${s}`).join('\n');
  return [
    `dry_run_status            : ${result.dry_run_status ?? 'UNKNOWN'}`,
    `executor_id               : ${result.executor_id ?? 'none'}`,
    `target_tag                : ${result.target_tag ?? 'none'}`,
    `target_git_head           : ${result.target_git_head ?? 'none'}`,
    `dry_run                   : true`,
    `execute_now               : false`,
    `tag_created               : false`,
    `git_push_performed        : false`,
    `blocking_reason           : ${result.blocking_reason ?? 'none'}`,
    `simulated_steps:`,
    steps || '  (none)',
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-dry-run-executor.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');
  const result  = runRealTagManualDryRunExecutor({ fixture_mode: fixture });
  if (json) console.log(JSON.stringify(result, null, 2));
  else      console.log(renderRealTagManualDryRunSummary(result));
  process.exit(result.dry_run_ready ? 0 : 1);
}
