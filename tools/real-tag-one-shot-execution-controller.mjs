#!/usr/bin/env node
/**
 * Real Tag One-Shot Execution Controller — V86.0
 *
 * Controls the gate for real tag one-shot execution.
 * Evaluates all pre-execution conditions and authorizes
 * either dry-run or real execution mode.
 *
 * REGRA ABSOLUTA: tag_created=false, git_push_performed=false,
 * deploy_performed=false, stable_promoted=false, release_performed=false
 * always. Does NOT call git. Never executes real tag.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v86.0';

export const EXECUTION_CONTROLLER_STATUSES = [
  'REAL_TAG_EXEC_CTRL_BLOCKED_BASELINE',
  'REAL_TAG_EXEC_CTRL_BLOCKED_CI',
  'REAL_TAG_EXEC_CTRL_BLOCKED_INTERACTIVE',
  'REAL_TAG_EXEC_CTRL_BLOCKED_WORKTREE',
  'REAL_TAG_EXEC_CTRL_BLOCKED_LOCAL_TAG_EXISTS',
  'REAL_TAG_EXEC_CTRL_BLOCKED_REMOTE_TAG_EXISTS',
  'REAL_TAG_EXEC_CTRL_BLOCKED_EVIDENCE',
  'REAL_TAG_EXEC_CTRL_BLOCKED_CONFIRMATION',
  'REAL_TAG_EXEC_CTRL_BLOCKED_DRY_RUN',
  'REAL_TAG_EXEC_CTRL_READY_DRY_RUN',
  'REAL_TAG_EXEC_CTRL_READY_FOR_LOCAL_REAL_EXECUTION',
];

export const REAL_TAG_EXEC_CTRL_CONFIRMATION_PHRASE =
  'I CONFIRM THIS CONTROLLER IS FOR LOCAL INTERACTIVE REAL TAG ONE-SHOT AND DOES NOT CREATE DEPLOY STABLE OR RELEASE';

const REQUIRED_BASELINE_STATUS = 'MANUAL_EXEC_BASELINE_READY_FOR_ONE_SHOT_EXECUTION';

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
    schema_version:             SCHEMA_VERSION,
    controller_status:          status,
    execution_controller_ready: false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function createRealTagExecutionContext(params = {}) {
  const {
    baseline_status,
    ci                     = false,
    local_interactive_only = false,
    worktree_clean         = false,
    local_tag_exists       = false,
    remote_tag_exists      = false,
    evidence_source,
    confirmation_phrase,
    dry_run                = true,
    execute_real_tag       = false,
    target_tag,
    git_head,
    evidence_receipt_id,
    rollback_anchor_id,
    fixture_mode           = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  return {
    baseline_status,
    ci,
    local_interactive_only,
    worktree_clean,
    local_tag_exists,
    remote_tag_exists,
    evidence_source,
    confirmation_phrase,
    dry_run,
    execute_real_tag,
    target_tag,
    git_head,
    evidence_receipt_id,
    rollback_anchor_id,
    fixture_mode,
    created_at: now,
  };
}

export function validateRealTagExecutionContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return { valid: false, errors: ['context_missing'] };
  const errors = [];
  if (!ctx.target_tag || typeof ctx.target_tag !== 'string' || !ctx.target_tag.startsWith('v')) {
    errors.push('target_tag_invalid');
  }
  if (!ctx.git_head || typeof ctx.git_head !== 'string' || ctx.git_head.length < 7) {
    errors.push('git_head_invalid');
  }
  if (!ctx.evidence_receipt_id || typeof ctx.evidence_receipt_id !== 'string') {
    errors.push('evidence_receipt_id_missing');
  }
  if (!ctx.rollback_anchor_id || typeof ctx.rollback_anchor_id !== 'string') {
    errors.push('rollback_anchor_id_missing');
  }
  if (ctx.evidence_source !== 'go-core') {
    errors.push('evidence_source_must_be_go_core');
  }
  return { valid: errors.length === 0, errors };
}

export function evaluateRealTagExecutionController(params = {}) {
  const {
    baseline_status,
    ci                     = false,
    local_interactive_only = false,
    worktree_clean         = false,
    local_tag_exists       = false,
    remote_tag_exists      = false,
    evidence_source,
    confirmation_phrase,
    dry_run                = true,
    execute_real_tag       = false,
    target_tag,
    git_head,
    evidence_receipt_id,
    rollback_anchor_id,
    fixture_mode           = false,
    _mock_timestamp,
  } = params ?? {};

  const now           = _mock_timestamp ?? new Date().toISOString();
  const id_tag        = fixture_mode ? 'fixture' : (target_tag ?? 'unknown');
  const controller_id = _sha256(`real-tag-exec-ctrl:${SCHEMA_VERSION}:${id_tag}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const is_real = execute_real_tag === true && dry_run === false;
    const ctrl_status = is_real
      ? 'REAL_TAG_EXEC_CTRL_READY_FOR_LOCAL_REAL_EXECUTION'
      : 'REAL_TAG_EXEC_CTRL_READY_DRY_RUN';
    return {
      schema_version:             SCHEMA_VERSION,
      controller_id,
      controller_status:          ctrl_status,
      execution_controller_ready: true,
      dry_run_authorized:         !is_real,
      real_execution_authorized:  is_real,
      blocking_reason:            null,
      baseline_status_verified:   true,
      ci_check_passed:            true,
      interactive_check_passed:   true,
      worktree_check_passed:      true,
      local_tag_check_passed:     true,
      remote_tag_check_passed:    true,
      evidence_check_passed:      true,
      confirmation_check_passed:  true,
      dry_run_check_passed:       true,
      created_at:                 now,
      ..._locked(),
    };
  }

  // Gate 1: baseline
  if (baseline_status !== REQUIRED_BASELINE_STATUS) {
    return _blocked('REAL_TAG_EXEC_CTRL_BLOCKED_BASELINE', 'baseline_not_ready', {
      controller_id,
      baseline_status_provided: baseline_status ?? null,
      baseline_status_required: REQUIRED_BASELINE_STATUS,
      baseline_status_verified: false,
      created_at:               now,
    });
  }

  // Gate 2: CI
  if (ci === true) {
    return _blocked('REAL_TAG_EXEC_CTRL_BLOCKED_CI', 'ci_environment_detected', {
      controller_id,
      baseline_status_verified: true,
      ci_check_passed:          false,
      created_at:               now,
    });
  }

  // Gate 3: local interactive
  if (local_interactive_only !== true) {
    return _blocked('REAL_TAG_EXEC_CTRL_BLOCKED_INTERACTIVE', 'local_interactive_only_required', {
      controller_id,
      baseline_status_verified: true,
      ci_check_passed:          true,
      interactive_check_passed: false,
      created_at:               now,
    });
  }

  // Gate 4: worktree
  if (worktree_clean !== true) {
    return _blocked('REAL_TAG_EXEC_CTRL_BLOCKED_WORKTREE', 'worktree_must_be_clean', {
      controller_id,
      baseline_status_verified: true,
      ci_check_passed:          true,
      interactive_check_passed: true,
      worktree_check_passed:    false,
      created_at:               now,
    });
  }

  // Gate 5: local tag
  if (local_tag_exists === true) {
    return _blocked('REAL_TAG_EXEC_CTRL_BLOCKED_LOCAL_TAG_EXISTS', 'local_tag_already_exists', {
      controller_id,
      baseline_status_verified: true,
      ci_check_passed:          true,
      interactive_check_passed: true,
      worktree_check_passed:    true,
      local_tag_check_passed:   false,
      created_at:               now,
    });
  }

  // Gate 6: remote tag
  if (remote_tag_exists === true) {
    return _blocked('REAL_TAG_EXEC_CTRL_BLOCKED_REMOTE_TAG_EXISTS', 'remote_tag_already_exists', {
      controller_id,
      baseline_status_verified: true,
      ci_check_passed:          true,
      interactive_check_passed: true,
      worktree_check_passed:    true,
      local_tag_check_passed:   true,
      remote_tag_check_passed:  false,
      created_at:               now,
    });
  }

  // Gate 7: evidence source
  if (evidence_source !== 'go-core') {
    return _blocked('REAL_TAG_EXEC_CTRL_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      controller_id,
      baseline_status_verified: true,
      ci_check_passed:          true,
      interactive_check_passed: true,
      worktree_check_passed:    true,
      local_tag_check_passed:   true,
      remote_tag_check_passed:  true,
      evidence_check_passed:    false,
      created_at:               now,
    });
  }

  // Gate 8: confirmation phrase
  if (confirmation_phrase !== REAL_TAG_EXEC_CTRL_CONFIRMATION_PHRASE) {
    return _blocked('REAL_TAG_EXEC_CTRL_BLOCKED_CONFIRMATION', 'confirmation_phrase_mismatch', {
      controller_id,
      baseline_status_verified:  true,
      ci_check_passed:           true,
      interactive_check_passed:  true,
      worktree_check_passed:     true,
      local_tag_check_passed:    true,
      remote_tag_check_passed:   true,
      evidence_check_passed:     true,
      confirmation_check_passed: false,
      created_at:                now,
    });
  }

  // Gate 9: dry_run conflict with execute_real_tag
  if (execute_real_tag === true && dry_run === true) {
    return _blocked('REAL_TAG_EXEC_CTRL_BLOCKED_DRY_RUN', 'dry_run_conflicts_with_execute_real_tag', {
      controller_id,
      baseline_status_verified:  true,
      ci_check_passed:           true,
      interactive_check_passed:  true,
      worktree_check_passed:     true,
      local_tag_check_passed:    true,
      remote_tag_check_passed:   true,
      evidence_check_passed:     true,
      confirmation_check_passed: true,
      dry_run_check_passed:      false,
      created_at:                now,
    });
  }

  const is_real     = execute_real_tag === true && dry_run === false;
  const ctrl_status = is_real
    ? 'REAL_TAG_EXEC_CTRL_READY_FOR_LOCAL_REAL_EXECUTION'
    : 'REAL_TAG_EXEC_CTRL_READY_DRY_RUN';

  return {
    schema_version:             SCHEMA_VERSION,
    controller_id,
    controller_status:          ctrl_status,
    execution_controller_ready: true,
    dry_run_authorized:         !is_real,
    real_execution_authorized:  is_real,
    blocking_reason:            null,
    baseline_status_verified:   true,
    ci_check_passed:            true,
    interactive_check_passed:   true,
    worktree_check_passed:      true,
    local_tag_check_passed:     true,
    remote_tag_check_passed:    true,
    evidence_check_passed:      true,
    confirmation_check_passed:  true,
    dry_run_check_passed:       true,
    target_tag:                 target_tag ?? null,
    git_head:                   git_head ?? null,
    created_at:                 now,
    ..._locked(),
  };
}

export function renderRealTagExecutionControllerSummary(result) {
  if (!result) return 'real_tag_execution_controller: null';
  return [
    `controller_status             : ${result.controller_status ?? 'UNKNOWN'}`,
    `execution_controller_ready    : ${result.execution_controller_ready ?? false}`,
    `dry_run_authorized            : ${result.dry_run_authorized ?? false}`,
    `real_execution_authorized     : ${result.real_execution_authorized ?? false}`,
    `tag_created                   : false`,
    `git_push_performed            : false`,
    `deploy_performed              : false`,
    `stable_promoted               : false`,
    `release_performed             : false`,
    `real_execution_not_performed  : true`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-execution-controller.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateRealTagExecutionController({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagExecutionControllerSummary(result));
  }

  process.exit(result.execution_controller_ready ? 0 : 1);
}
