#!/usr/bin/env node
/**
 * Real Tag One-Shot Executor — V78.0 (Dry-Run Mode)
 *
 * Simulates the exact tag creation + push commands without executing them.
 * dry_run=true and real_execute=false are required.
 *
 * REGRA ABSOLUTA: Does NOT call git tag or git push.
 * tag_created=false always. git_push_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v78.0';

export const TAG_EXECUTOR_STATUSES = [
  'TAG_EXECUTOR_BLOCKED_CONTRACT',
  'TAG_EXECUTOR_BLOCKED_SAFETY',
  'TAG_EXECUTOR_BLOCKED_ROLLBACK',
  'TAG_EXECUTOR_BLOCKED_NOT_DRY_RUN',
  'TAG_EXECUTOR_BLOCKED_REAL_EXECUTE',
  'TAG_EXECUTOR_DRY_RUN_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    real_execute:       false,
    tag_created:        false,
    git_push_performed: false,
    deploy_performed:   false,
    stable_promoted:    false,
    release_performed:  false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    executor_status:  status,
    dry_run_ready:    false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function runRealTagOneShotExecutor(params = {}) {
  const {
    fixture_mode                  = false,
    one_shot_contract,
    safety_result,
    rollback_anchor,
    dry_run                       = true,
    real_execute                  = false,
    explicit_real_command_present = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const executor_id = _sha256(`real-tag-one-shot-executor:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const fixTag = 'v1.2.3';
    const fixHead = 'abc1234def5678901234567890123456789012ab';
    return {
      schema_version:           SCHEMA_VERSION,
      executor_id,
      executor_status:          'TAG_EXECUTOR_DRY_RUN_READY',
      dry_run_ready:            true,
      blocking_reason:          null,
      simulated_tag_command:    `git tag -a ${fixTag} ${fixHead} -m "Release ${fixTag} [DRY RUN]"`,
      simulated_push_command:   `git push origin ${fixTag} [DRY RUN - NOT EXECUTED]`,
      tag_receipt_preview_id:   _sha256(`tag-receipt:${fixTag}:${fixHead}:${now}`).slice(0, 24),
      rollback_anchor_id:       'anchor-fixture-id',
      created_at:               now,
      ..._locked(),
    };
  }

  // dry_run=true required FIRST
  if (dry_run !== true) {
    return _blocked('TAG_EXECUTOR_BLOCKED_NOT_DRY_RUN', 'dry_run_must_be_true', {
      executor_id, created_at: now,
    });
  }

  // real_execute=false required
  if (real_execute === true) {
    return _blocked('TAG_EXECUTOR_BLOCKED_REAL_EXECUTE', 'real_execute_must_be_false', {
      executor_id, created_at: now,
    });
  }

  // Contract check
  if (one_shot_contract?.one_shot_contract_status !== 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW') {
    return _blocked('TAG_EXECUTOR_BLOCKED_CONTRACT', 'contract_not_ready', {
      executor_id, created_at: now,
    });
  }

  // Safety check
  if (!safety_result?.tag_safety_ready) {
    return _blocked('TAG_EXECUTOR_BLOCKED_SAFETY', 'safety_not_ready', {
      executor_id, created_at: now,
    });
  }

  // Rollback anchor check
  if (rollback_anchor?.anchor_ready !== true) {
    return _blocked('TAG_EXECUTOR_BLOCKED_ROLLBACK', 'rollback_anchor_not_ready', {
      executor_id, created_at: now,
    });
  }

  const tag   = one_shot_contract.target_tag;
  const head  = one_shot_contract.git_head;
  const receipt_preview_id = _sha256(`tag-receipt:${tag}:${head}:${now}`).slice(0, 24);

  return {
    schema_version:           SCHEMA_VERSION,
    executor_id,
    executor_status:          'TAG_EXECUTOR_DRY_RUN_READY',
    dry_run_ready:            true,
    blocking_reason:          null,
    simulated_tag_command:    `git tag -a ${tag} ${head} -m "Release ${tag} [DRY RUN]"`,
    simulated_push_command:   `git push origin ${tag} [DRY RUN - NOT EXECUTED]`,
    tag_receipt_preview_id:   receipt_preview_id,
    rollback_anchor_id:       rollback_anchor.rollback_anchor_id,
    created_at:               now,
    ..._locked(),
  };
}

export function validateRealTagOneShotExecutorResult(result) {
  if (!result || typeof result !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!TAG_EXECUTOR_STATUSES.includes(result.executor_status))
    return { valid: false, reason: 'unknown_status' };
  if (result.tag_created        === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (result.git_push_performed === true) return { valid: false, reason: 'git_push_must_be_false' };
  if (result.real_execute       === true) return { valid: false, reason: 'real_execute_must_be_false' };
  return { valid: true };
}

export function renderRealTagOneShotExecutorSummary(result) {
  if (!result) return 'real_tag_one_shot_executor: null';
  return [
    `executor_status             : ${result.executor_status ?? 'UNKNOWN'}`,
    `executor_id                 : ${result.executor_id ?? 'none'}`,
    `dry_run_ready               : ${result.dry_run_ready ?? false}`,
    `simulated_tag_command       : ${result.simulated_tag_command ?? 'none'}`,
    `simulated_push_command      : ${result.simulated_push_command ?? 'none'}`,
    `tag_receipt_preview_id      : ${result.tag_receipt_preview_id ?? 'none'}`,
    `rollback_anchor_id          : ${result.rollback_anchor_id ?? 'none'}`,
    `real_execute                : false`,
    `tag_created                 : false`,
    `git_push_performed          : false`,
    `deploy_performed            : false`,
    `stable_promoted             : false`,
    `release_performed           : false`,
    `blocking_reason             : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-executor.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runRealTagOneShotExecutor({ fixture_mode: fixture, dry_run: true });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagOneShotExecutorSummary(result));
  }

  process.exit(result.dry_run_ready ? 0 : 1);
}
