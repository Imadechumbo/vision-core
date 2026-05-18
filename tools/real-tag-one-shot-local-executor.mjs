#!/usr/bin/env node
/**
 * Real Tag One-Shot Local Executor — V86.1
 *
 * Injectable spawn_adapter for real tag execution.
 * In DRY_RUN mode: simulates all steps, never calls git.
 * In REAL mode: requires explicit execute_real_tag=true with all confirmations.
 *
 * REGRA ABSOLUTA: By default tag_created=false. Only when execute_real_tag=true
 * AND all guards pass AND spawn_adapter called successfully does tag_created=true.
 * Never runs in CI, tests, or by default.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v86.1';

export const LOCAL_EXECUTOR_STATUSES = [
  'LOCAL_EXEC_BLOCKED_CONTROLLER',
  'LOCAL_EXEC_BLOCKED_NOT_AUTHORIZED',
  'LOCAL_EXEC_BLOCKED_CI',
  'LOCAL_EXEC_BLOCKED_ADAPTER',
  'LOCAL_EXEC_DRY_RUN_COMPLETE',
  'LOCAL_EXEC_REAL_TAG_EXECUTED',
];

export const LOCAL_EXECUTOR_DRY_RUN_STEPS = [
  'CHECK: controller_status=READY',
  'CHECK: execute_real_tag flag present',
  'CHECK: ci=false',
  'SIM: git tag -a <tag> <head> -m "Vision Core <tag> PASS GOLD verified"',
  'SIM: git push origin refs/tags/<tag>',
  'RESULT: tag_created=false (dry_run only)',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked_default() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
  };
}

function _locked_executed(tag_created, git_push_performed) {
  return {
    tag_created,
    git_push_performed,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: !tag_created,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    executor_status:   status,
    executor_ready:    false,
    blocking_reason,
    ...extra,
    ..._locked_default(),
  };
}

export function runRealTagOneShotLocalExecutor(params = {}) {
  const {
    controller_status,
    execution_controller_ready = false,
    execute_real_tag           = false,
    dry_run                    = true,
    ci                         = false,
    target_tag,
    git_head,
    spawn_adapter,
    fixture_mode               = false,
    _mock_timestamp,
  } = params ?? {};

  const now         = _mock_timestamp ?? new Date().toISOString();
  const id_tag      = fixture_mode ? 'fixture' : (target_tag ?? 'unknown');
  const executor_id = _sha256(`real-tag-local-exec:${SCHEMA_VERSION}:${id_tag}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const is_real = execute_real_tag === true && dry_run === false;
    if (is_real) {
      return {
        schema_version:   SCHEMA_VERSION,
        executor_id,
        executor_status:  'LOCAL_EXEC_REAL_TAG_EXECUTED',
        executor_ready:   true,
        dry_run:          false,
        execute_real_tag: true,
        simulated_steps:  null,
        target_tag:       target_tag ?? 'v0.0.0-fixture',
        git_head:         git_head ?? 'abc1234fixture',
        blocking_reason:  null,
        created_at:       now,
        ..._locked_executed(true, true),
      };
    }
    return {
      schema_version:   SCHEMA_VERSION,
      executor_id,
      executor_status:  'LOCAL_EXEC_DRY_RUN_COMPLETE',
      executor_ready:   true,
      dry_run:          true,
      execute_real_tag: false,
      simulated_steps:  LOCAL_EXECUTOR_DRY_RUN_STEPS.slice(),
      target_tag:       target_tag ?? 'v0.0.0-fixture',
      git_head:         git_head ?? 'abc1234fixture',
      blocking_reason:  null,
      created_at:       now,
      ..._locked_default(),
    };
  }

  // Gate 1: controller must be ready
  if (execution_controller_ready !== true ||
      (controller_status !== 'REAL_TAG_EXEC_CTRL_READY_DRY_RUN' &&
       controller_status !== 'REAL_TAG_EXEC_CTRL_READY_FOR_LOCAL_REAL_EXECUTION')) {
    return _blocked('LOCAL_EXEC_BLOCKED_CONTROLLER', 'execution_controller_not_ready', {
      executor_id,
      controller_status_provided: controller_status ?? null,
      created_at:                 now,
    });
  }

  // Gate 2: authorization check
  if (execute_real_tag === true && controller_status !== 'REAL_TAG_EXEC_CTRL_READY_FOR_LOCAL_REAL_EXECUTION') {
    return _blocked('LOCAL_EXEC_BLOCKED_NOT_AUTHORIZED', 'real_execution_not_authorized_by_controller', {
      executor_id,
      created_at: now,
    });
  }

  // Gate 3: CI block
  if (ci === true) {
    return _blocked('LOCAL_EXEC_BLOCKED_CI', 'ci_environment_detected', {
      executor_id,
      created_at: now,
    });
  }

  // Dry run path
  if (execute_real_tag !== true || dry_run === true) {
    const steps = LOCAL_EXECUTOR_DRY_RUN_STEPS.map(s =>
      s.replace('<tag>', target_tag ?? '<tag>').replace('<head>', git_head ?? '<head>')
    );
    return {
      schema_version:   SCHEMA_VERSION,
      executor_id,
      executor_status:  'LOCAL_EXEC_DRY_RUN_COMPLETE',
      executor_ready:   true,
      dry_run:          true,
      execute_real_tag: false,
      simulated_steps:  steps,
      target_tag:       target_tag ?? null,
      git_head:         git_head ?? null,
      blocking_reason:  null,
      created_at:       now,
      ..._locked_default(),
    };
  }

  // Real execution path — requires spawn_adapter
  if (typeof spawn_adapter !== 'function') {
    return _blocked('LOCAL_EXEC_BLOCKED_ADAPTER', 'spawn_adapter_required_for_real_execution', {
      executor_id,
      created_at: now,
    });
  }

  // Execute via injectable adapter
  try {
    const tag_result  = spawn_adapter('git', ['tag', '-a', target_tag, git_head, '-m',
      `Vision Core ${target_tag} PASS GOLD verified`]);
    const push_result = spawn_adapter('git', ['push', 'origin', `refs/tags/${target_tag}`]);

    const tag_ok  = tag_result  && tag_result.status  === 0;
    const push_ok = push_result && push_result.status === 0;

    return {
      schema_version:   SCHEMA_VERSION,
      executor_id,
      executor_status:  'LOCAL_EXEC_REAL_TAG_EXECUTED',
      executor_ready:   true,
      dry_run:          false,
      execute_real_tag: true,
      simulated_steps:  null,
      target_tag:       target_tag ?? null,
      git_head:         git_head ?? null,
      tag_command_ok:   tag_ok,
      push_command_ok:  push_ok,
      blocking_reason:  null,
      created_at:       now,
      ..._locked_executed(tag_ok, push_ok),
    };
  } catch (err) {
    return _blocked('LOCAL_EXEC_BLOCKED_ADAPTER', `spawn_adapter_threw: ${err.message}`, {
      executor_id,
      created_at: now,
    });
  }
}

export function validateLocalExecutorResult(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['result_missing'] };
  const errors = [];
  if (!LOCAL_EXECUTOR_STATUSES.includes(result.executor_status)) errors.push('executor_status_invalid');
  if (result.deploy_performed          === true) errors.push('deploy_performed_must_be_false');
  if (result.stable_promoted           === true) errors.push('stable_promoted_must_be_false');
  if (result.release_performed         === true) errors.push('release_performed_must_be_false');
  if (result.executor_status !== 'LOCAL_EXEC_REAL_TAG_EXECUTED') {
    if (result.tag_created         === true) errors.push('tag_created_must_be_false_in_non_executed');
    if (result.git_push_performed  === true) errors.push('push_must_be_false_in_non_executed');
  }
  return { valid: errors.length === 0, errors };
}

export function renderLocalExecutorSummary(result) {
  if (!result) return 'real_tag_one_shot_local_executor: null';
  return [
    `executor_status               : ${result.executor_status ?? 'UNKNOWN'}`,
    `executor_ready                : ${result.executor_ready ?? false}`,
    `dry_run                       : ${result.dry_run ?? true}`,
    `execute_real_tag              : ${result.execute_real_tag ?? false}`,
    `tag_created                   : ${result.tag_created ?? false}`,
    `git_push_performed            : ${result.git_push_performed ?? false}`,
    `deploy_performed              : false`,
    `stable_promoted               : false`,
    `release_performed             : false`,
    `real_execution_not_performed  : ${result.real_execution_not_performed ?? true}`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-local-executor.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runRealTagOneShotLocalExecutor({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderLocalExecutorSummary(result));
  }

  process.exit(result.executor_ready ? 0 : 1);
}
