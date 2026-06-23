#!/usr/bin/env node
/**
 * Real Tag Manual Executor Audit Plan — V84.1
 *
 * Builds pre-execution, post-execution, and rollback audit plan
 * for the real tag manual executor. The plan documents what to audit
 * before and after execution. Does NOT execute anything.
 *
 * REGRA ABSOLUTA: audit_log_required=true always.
 * real_execution_not_performed=true always. tag_created=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v84.1';

export const AUDIT_PLAN_STATUSES = [
  'AUDIT_PLAN_BLOCKED_GUARD',
  'AUDIT_PLAN_READY',
];

const PRE_EXECUTION_CHECKS = [
  'VERIFY: armed_guard_ready=true',
  'VERIFY: execute_real_tag=true confirmed by human',
  'VERIFY: local_interactive_session=true',
  'VERIFY: ci_environment=false',
  'VERIFY: confirmation_contract.manual_confirmation_ready=true',
  'VERIFY: safety_lock.worktree_clean=true',
  'VERIFY: safety_lock.local_tag_exists=false',
  'VERIFY: safety_lock.remote_tag_exists=false',
  'VERIFY: target_tag starts with v',
  'VERIFY: evidence_source=go-core',
  'VERIFY: rollback_anchor_id present',
  'RECORD: pre_execution_state_snapshot',
];

const POST_EXECUTION_CHECKS = [
  'VERIFY: git tag -l <target_tag> shows tag exists locally',
  'VERIFY: git ls-remote --tags origin <target_tag> shows tag on remote',
  'RECORD: post_execution_receipt created',
  'RECORD: audit_log entry with timestamp, executor, tag, git_head, evidence_receipt',
  'NOTIFY: release-manager via configured channel',
];

const ROLLBACK_CHECKS = [
  'PROCEDURE: git tag -d <target_tag> to remove local tag',
  'PROCEDURE: git push origin :refs/tags/<target_tag> to remove remote tag',
  'VERIFY: git tag -l shows tag removed',
  'VERIFY: git ls-remote --tags shows tag removed from remote',
  'RECORD: rollback_log entry with timestamp and reason',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    audit_log_required:           true,
    real_execution_not_performed: true,
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    audit_plan_status: status,
    audit_plan_ready:  false,
    blocking_reason,
    pre_execution_checks:  [],
    post_execution_checks: [],
    rollback_checks:       [],
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagManualExecutorAuditPlan(params = {}) {
  const {
    fixture_mode  = false,
    armed_guard,
    target_tag,
    requested_by,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const plan_id = _sha256(`real-tag-manual-executor-audit-plan:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:         SCHEMA_VERSION,
      plan_id,
      audit_plan_status:      'AUDIT_PLAN_READY',
      audit_plan_ready:       true,
      blocking_reason:        null,
      target_tag:             'v1.2.3',
      requested_by:           'fixture-user',
      pre_execution_checks:   PRE_EXECUTION_CHECKS,
      post_execution_checks:  POST_EXECUTION_CHECKS,
      rollback_checks:        ROLLBACK_CHECKS,
      created_at:             now,
      ..._locked(),
    };
  }

  // Armed guard check
  if (!armed_guard || armed_guard.armed_guard_ready !== true) {
    return _blocked('AUDIT_PLAN_BLOCKED_GUARD', 'armed_guard_not_ready', {
      plan_id, created_at: now,
    });
  }

  const resolvedTag = target_tag ?? armed_guard.target_tag;

  return {
    schema_version:         SCHEMA_VERSION,
    plan_id,
    audit_plan_status:      'AUDIT_PLAN_READY',
    audit_plan_ready:       true,
    blocking_reason:        null,
    target_tag:             resolvedTag ?? null,
    requested_by:           requested_by ?? armed_guard.requested_by ?? null,
    pre_execution_checks:   PRE_EXECUTION_CHECKS,
    post_execution_checks:  POST_EXECUTION_CHECKS,
    rollback_checks:        ROLLBACK_CHECKS,
    created_at:             now,
    ..._locked(),
  };
}

export function validateRealTagManualExecutorAuditPlan(plan) {
  if (!plan || typeof plan !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!AUDIT_PLAN_STATUSES.includes(plan.audit_plan_status))
    return { valid: false, reason: 'unknown_status' };
  if (plan.audit_log_required          !== true) return { valid: false, reason: 'audit_log_must_be_required' };
  if (plan.real_execution_not_performed !== true) return { valid: false, reason: 'real_execution_must_not_be_performed' };
  if (plan.tag_created                  === true) return { valid: false, reason: 'tag_created_must_be_false' };
  return { valid: true };
}

export function renderRealTagManualExecutorAuditPlan(plan) {
  if (!plan) return 'real_tag_manual_executor_audit_plan: null';
  const preChecks  = (plan.pre_execution_checks  ?? []).map(s => `  ${s}`).join('\n');
  const postChecks = (plan.post_execution_checks ?? []).map(s => `  ${s}`).join('\n');
  const rbChecks   = (plan.rollback_checks       ?? []).map(s => `  ${s}`).join('\n');
  return [
    `audit_plan_status              : ${plan.audit_plan_status ?? 'UNKNOWN'}`,
    `plan_id                        : ${plan.plan_id ?? 'none'}`,
    `target_tag                     : ${plan.target_tag ?? 'none'}`,
    `requested_by                   : ${plan.requested_by ?? 'none'}`,
    `audit_log_required             : true`,
    `real_execution_not_performed   : true`,
    `tag_created                    : false`,
    `blocking_reason                : ${plan.blocking_reason ?? 'none'}`,
    `pre_execution_checks (${(plan.pre_execution_checks ?? []).length}):`,
    preChecks || '  (none)',
    `post_execution_checks (${(plan.post_execution_checks ?? []).length}):`,
    postChecks || '  (none)',
    `rollback_checks (${(plan.rollback_checks ?? []).length}):`,
    rbChecks || '  (none)',
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-executor-audit-plan.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');
  const result  = buildRealTagManualExecutorAuditPlan({ fixture_mode: fixture });
  if (json) console.log(JSON.stringify(result, null, 2));
  else      console.log(renderRealTagManualExecutorAuditPlan(result));
  process.exit(result.audit_plan_ready ? 0 : 1);
}
