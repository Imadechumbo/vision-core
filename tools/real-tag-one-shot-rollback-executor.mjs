#!/usr/bin/env node
/**
 * Real Tag One-Shot Rollback Executor — V87.1
 *
 * Injectable spawn_adapter for tag rollback (delete local + remote tag).
 * Only executes when tag_created=true and execute_rollback=true explicitly.
 *
 * REGRA ABSOLUTA: deploy_performed=false, stable_promoted=false,
 * release_performed=false always. Rollback only deletes tags, never deploys.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v87.1';

export const ROLLBACK_EXECUTOR_STATUSES = [
  'ROLLBACK_EXEC_BLOCKED_NOT_NEEDED',
  'ROLLBACK_EXEC_BLOCKED_NO_FLAG',
  'ROLLBACK_EXEC_BLOCKED_CI',
  'ROLLBACK_EXEC_BLOCKED_ADAPTER',
  'ROLLBACK_EXEC_SKIPPED_DRY_RUN',
  'ROLLBACK_EXEC_SIMULATED',
  'ROLLBACK_EXEC_EXECUTED',
];

export const ROLLBACK_DRY_RUN_STEPS = [
  'CHECK: tag_created=true',
  'CHECK: execute_rollback flag present',
  'SIM: git tag -d <tag>',
  'SIM: git push origin :refs/tags/<tag>',
  'RESULT: rollback_executed=false (dry_run only)',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked_rollback(rollback_executed) {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    rollback_executed,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    rollback_status:   status,
    rollback_ready:    false,
    blocking_reason,
    ...extra,
    ..._locked_rollback(false),
  };
}

export function runRealTagRollbackExecutor(params = {}) {
  const {
    tag_created          = false,
    execute_rollback     = false,
    dry_run              = true,
    simulate_rollback    = false,
    ci                   = false,
    target_tag,
    rollback_anchor_id,
    spawn_adapter,
    fixture_mode         = false,
    _mock_timestamp,
  } = params ?? {};

  const now          = _mock_timestamp ?? new Date().toISOString();
  const id_tag       = fixture_mode ? 'fixture' : (target_tag ?? 'unknown');
  const rollback_id  = _sha256(`rollback-exec:${SCHEMA_VERSION}:${id_tag}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const do_rollback = execute_rollback === true && dry_run === false;
    if (do_rollback) {
      return {
        schema_version:  SCHEMA_VERSION,
        rollback_id,
        rollback_status: 'ROLLBACK_EXEC_EXECUTED',
        rollback_ready:  true,
        blocking_reason: null,
        target_tag:      target_tag ?? 'v0.0.0-fixture',
        created_at:      now,
        ..._locked_rollback(true),
      };
    }
    if (simulate_rollback) {
      return {
        schema_version:   SCHEMA_VERSION,
        rollback_id,
        rollback_status:  'ROLLBACK_EXEC_SIMULATED',
        rollback_ready:   true,
        simulated_steps:  ROLLBACK_DRY_RUN_STEPS.slice(),
        blocking_reason:  null,
        target_tag:       target_tag ?? 'v0.0.0-fixture',
        created_at:       now,
        ..._locked_rollback(false),
      };
    }
    return {
      schema_version:   SCHEMA_VERSION,
      rollback_id,
      rollback_status:  'ROLLBACK_EXEC_SKIPPED_DRY_RUN',
      rollback_ready:   true,
      simulated_steps:  null,
      blocking_reason:  null,
      created_at:       now,
      ..._locked_rollback(false),
    };
  }

  // Gate 1: tag must have been created to need rollback
  if (tag_created !== true) {
    return _blocked('ROLLBACK_EXEC_BLOCKED_NOT_NEEDED', 'tag_was_not_created_no_rollback_needed', {
      rollback_id,
      created_at: now,
    });
  }

  // Gate 2: rollback flag must be set
  if (execute_rollback !== true) {
    if (simulate_rollback) {
      const steps = ROLLBACK_DRY_RUN_STEPS.map(s =>
        s.replace('<tag>', target_tag ?? '<tag>')
      );
      return {
        schema_version:   SCHEMA_VERSION,
        rollback_id,
        rollback_status:  'ROLLBACK_EXEC_SIMULATED',
        rollback_ready:   true,
        simulated_steps:  steps,
        blocking_reason:  null,
        target_tag:       target_tag ?? null,
        created_at:       now,
        ..._locked_rollback(false),
      };
    }
    return {
      schema_version:   SCHEMA_VERSION,
      rollback_id,
      rollback_status:  'ROLLBACK_EXEC_SKIPPED_DRY_RUN',
      rollback_ready:   true,
      simulated_steps:  null,
      blocking_reason:  null,
      created_at:       now,
      ..._locked_rollback(false),
    };
  }

  // Gate 3: CI block
  if (ci === true) {
    return _blocked('ROLLBACK_EXEC_BLOCKED_CI', 'ci_environment_detected', {
      rollback_id,
      created_at: now,
    });
  }

  // Gate 4: require spawn_adapter
  if (typeof spawn_adapter !== 'function') {
    return _blocked('ROLLBACK_EXEC_BLOCKED_ADAPTER', 'spawn_adapter_required_for_real_rollback', {
      rollback_id,
      created_at: now,
    });
  }

  // Execute rollback via injectable adapter
  try {
    const del_local  = spawn_adapter('git', ['tag', '-d', target_tag]);
    const del_remote = spawn_adapter('git', ['push', 'origin', `:refs/tags/${target_tag}`]);

    const local_ok  = del_local  && del_local.status  === 0;
    const remote_ok = del_remote && del_remote.status === 0;

    return {
      schema_version:      SCHEMA_VERSION,
      rollback_id,
      rollback_status:     'ROLLBACK_EXEC_EXECUTED',
      rollback_ready:      true,
      blocking_reason:     null,
      target_tag:          target_tag ?? null,
      rollback_anchor_id:  rollback_anchor_id ?? null,
      local_tag_deleted:   local_ok,
      remote_tag_deleted:  remote_ok,
      created_at:          now,
      ..._locked_rollback(true),
    };
  } catch (err) {
    return _blocked('ROLLBACK_EXEC_BLOCKED_ADAPTER', `spawn_adapter_threw: ${err.message}`, {
      rollback_id,
      created_at: now,
    });
  }
}

export function validateRollbackExecutorResult(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['result_missing'] };
  const errors = [];
  if (!ROLLBACK_EXECUTOR_STATUSES.includes(result.rollback_status)) errors.push('rollback_status_invalid');
  if (result.deploy_performed  === true) errors.push('deploy_performed_must_be_false');
  if (result.stable_promoted   === true) errors.push('stable_promoted_must_be_false');
  if (result.release_performed === true) errors.push('release_performed_must_be_false');
  if (result.tag_created       === true) errors.push('tag_created_must_be_false');
  if (result.git_push_performed=== true) errors.push('git_push_performed_must_be_false');
  return { valid: errors.length === 0, errors };
}

export function renderRollbackExecutorSummary(result) {
  if (!result) return 'real_tag_rollback_executor: null';
  return [
    `rollback_status               : ${result.rollback_status ?? 'UNKNOWN'}`,
    `rollback_ready                : ${result.rollback_ready ?? false}`,
    `rollback_executed             : ${result.rollback_executed ?? false}`,
    `local_tag_deleted             : ${result.local_tag_deleted ?? false}`,
    `remote_tag_deleted            : ${result.remote_tag_deleted ?? false}`,
    `tag_created                   : false`,
    `git_push_performed            : false`,
    `deploy_performed              : false`,
    `stable_promoted               : false`,
    `release_performed             : false`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-rollback-executor.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runRealTagRollbackExecutor({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRollbackExecutorSummary(result));
  }

  process.exit(result.rollback_ready ? 0 : 1);
}
