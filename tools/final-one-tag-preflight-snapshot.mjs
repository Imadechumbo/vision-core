#!/usr/bin/env node
/**
 * Final One-Tag Preflight Snapshot — V96.0
 *
 * Captures final pre-tag state: HEAD, branch, worktree, target tag, local/remote
 * tag absence, evidence receipt, rollback anchor, V95 baseline. Does not execute tag.
 *
 * REGRA ABSOLUTA: tag_created=false always. actual_real_tag_created=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v96.0';

export const PREFLIGHT_SNAPSHOT_STATUSES = [
  'PREFLIGHT_SNAPSHOT_BLOCKED_BASELINE',
  'PREFLIGHT_SNAPSHOT_BLOCKED_WORKTREE',
  'PREFLIGHT_SNAPSHOT_BLOCKED_HEAD',
  'PREFLIGHT_SNAPSHOT_BLOCKED_LOCAL_TAG',
  'PREFLIGHT_SNAPSHOT_BLOCKED_REMOTE_TAG',
  'PREFLIGHT_SNAPSHOT_BLOCKED_EVIDENCE',
  'PREFLIGHT_SNAPSHOT_BLOCKED_ROLLBACK',
  'PREFLIGHT_SNAPSHOT_READY',
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
    actual_real_tag_created:      false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                   SCHEMA_VERSION,
    snapshot_status:                  status,
    preflight_ready:                  false,
    blocking_reason,
    local_interactive_session_required: true,
    ...extra,
    ..._locked(),
  };
}

export function buildFinalOneTagPreflightSnapshot(params = {}) {
  const {
    fixture_mode        = false,
    baseline_result,
    target_tag,
    target_version,
    current_branch,
    git_head,
    expected_git_head,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id,
    working_tree_clean,
    local_tag_exists,
    remote_tag_exists,
    ci_environment,
    github_actions,
    _mock_timestamp,
  } = params ?? {};

  const now         = _mock_timestamp ?? new Date().toISOString();
  const snapshot_id = _sha256(`preflight-snapshot:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const eff_head = git_head ?? 'abc1234def567890abc1234d';
    return {
      schema_version:                     SCHEMA_VERSION,
      snapshot_id,
      snapshot_status:                    'PREFLIGHT_SNAPSHOT_READY',
      preflight_ready:                    true,
      blocking_reason:                    null,
      human_op_baseline_id:               'fixture-baseline-id-000000',
      target_tag:                         target_tag ?? 'v1.0.0',
      target_version:                     target_version ?? '1.0.0',
      current_branch:                     current_branch ?? 'main',
      git_head:                           eff_head,
      expected_git_head:                  expected_git_head ?? eff_head,
      evidence_receipt_id:                evidence_receipt_id ?? 'fixture-receipt-id-000000',
      evidence_source:                    'go-core',
      rollback_anchor_id:                 rollback_anchor_id ?? 'fixture-rollback-id-000000',
      working_tree_clean:                 true,
      local_tag_exists:                   false,
      remote_tag_exists:                  false,
      ci_environment:                     false,
      github_actions:                     false,
      local_interactive_session_required: true,
      baseline_verified:                  true,
      created_at:                         now,
      ..._locked(),
    };
  }

  const eff_baseline     = baseline_result !== undefined ? baseline_result : null;
  const eff_worktree     = working_tree_clean !== undefined ? working_tree_clean : null;
  const eff_head         = git_head ?? null;
  const eff_expected     = expected_git_head ?? null;
  const eff_local_tag    = local_tag_exists !== undefined ? local_tag_exists : null;
  const eff_remote_tag   = remote_tag_exists !== undefined ? remote_tag_exists : null;
  const eff_evidence_src = evidence_source ?? null;
  const eff_rollback     = rollback_anchor_id ?? null;

  // ── Gate 1: V95 baseline ready ─────────────────────────────
  if (!eff_baseline || eff_baseline.baseline_ready !== true) {
    return _blocked('PREFLIGHT_SNAPSHOT_BLOCKED_BASELINE', 'human_op_baseline_not_ready', {
      snapshot_id,
      baseline_verified: false,
      created_at:        now,
    });
  }

  // ── Gate 2: working tree clean ─────────────────────────────
  if (eff_worktree !== true) {
    return _blocked('PREFLIGHT_SNAPSHOT_BLOCKED_WORKTREE', 'working_tree_not_clean', {
      snapshot_id,
      baseline_verified: true,
      working_tree_clean: eff_worktree ?? false,
      created_at:        now,
    });
  }

  // ── Gate 3: HEAD matches expected ──────────────────────────
  if (!eff_head || !eff_expected || eff_head !== eff_expected) {
    return _blocked('PREFLIGHT_SNAPSHOT_BLOCKED_HEAD', 'git_head_mismatch', {
      snapshot_id,
      baseline_verified: true,
      working_tree_clean: true,
      git_head:          eff_head,
      expected_git_head: eff_expected,
      created_at:        now,
    });
  }

  // ── Gate 4: local tag must not exist ───────────────────────
  if (eff_local_tag !== false) {
    return _blocked('PREFLIGHT_SNAPSHOT_BLOCKED_LOCAL_TAG', 'local_tag_already_exists', {
      snapshot_id,
      baseline_verified: true,
      working_tree_clean: true,
      local_tag_exists:  eff_local_tag ?? true,
      created_at:        now,
    });
  }

  // ── Gate 5: remote tag must not exist ──────────────────────
  if (eff_remote_tag !== false) {
    return _blocked('PREFLIGHT_SNAPSHOT_BLOCKED_REMOTE_TAG', 'remote_tag_already_exists', {
      snapshot_id,
      baseline_verified: true,
      working_tree_clean: true,
      local_tag_exists:  false,
      remote_tag_exists: eff_remote_tag ?? true,
      created_at:        now,
    });
  }

  // ── Gate 6: evidence source must be go-core ────────────────
  if (eff_evidence_src !== 'go-core') {
    return _blocked('PREFLIGHT_SNAPSHOT_BLOCKED_EVIDENCE', 'evidence_source_not_go_core', {
      snapshot_id,
      baseline_verified: true,
      working_tree_clean: true,
      local_tag_exists:  false,
      remote_tag_exists: false,
      evidence_source:   eff_evidence_src,
      created_at:        now,
    });
  }

  // ── Gate 7: rollback anchor required ───────────────────────
  if (!eff_rollback) {
    return _blocked('PREFLIGHT_SNAPSHOT_BLOCKED_ROLLBACK', 'rollback_anchor_missing', {
      snapshot_id,
      baseline_verified: true,
      working_tree_clean: true,
      local_tag_exists:  false,
      remote_tag_exists: false,
      evidence_source:   'go-core',
      rollback_anchor_id: null,
      created_at:        now,
    });
  }

  return {
    schema_version:                     SCHEMA_VERSION,
    snapshot_id,
    snapshot_status:                    'PREFLIGHT_SNAPSHOT_READY',
    preflight_ready:                    true,
    blocking_reason:                    null,
    human_op_baseline_id:               eff_baseline.baseline_id ?? null,
    target_tag:                         target_tag ?? null,
    target_version:                     target_version ?? null,
    current_branch:                     current_branch ?? null,
    git_head:                           eff_head,
    expected_git_head:                  eff_expected,
    evidence_receipt_id:                evidence_receipt_id ?? null,
    evidence_source:                    'go-core',
    rollback_anchor_id:                 eff_rollback,
    working_tree_clean:                 true,
    local_tag_exists:                   false,
    remote_tag_exists:                  false,
    ci_environment:                     ci_environment ?? false,
    github_actions:                     github_actions ?? false,
    local_interactive_session_required: true,
    baseline_verified:                  true,
    created_at:                         now,
    ..._locked(),
  };
}

export function validateFinalOneTagPreflightSnapshot(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.tag_created                  === true) failures.push('tag_created must be false');
  if (result.actual_real_tag_created      === true) failures.push('actual_real_tag_created must be false');
  if (result.git_push_performed           === true) failures.push('git_push_performed must be false');
  if (result.deploy_performed             === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted              === true) failures.push('stable_promoted must be false');
  if (result.release_performed            === true) failures.push('release_performed must be false');
  if (result.local_interactive_session_required !== true) failures.push('local_interactive_session_required must be true');
  return failures;
}

export function renderFinalOneTagPreflightSnapshot(result) {
  if (!result) return 'final_one_tag_preflight_snapshot: null';
  return [
    `snapshot_status                    : ${result.snapshot_status ?? 'UNKNOWN'}`,
    `snapshot_id                        : ${result.snapshot_id ?? 'none'}`,
    `preflight_ready                    : ${result.preflight_ready ?? false}`,
    `target_tag                         : ${result.target_tag ?? 'none'}`,
    `git_head                           : ${result.git_head ?? 'none'}`,
    `expected_git_head                  : ${result.expected_git_head ?? 'none'}`,
    `evidence_source                    : ${result.evidence_source ?? 'none'}`,
    `rollback_anchor_id                 : ${result.rollback_anchor_id ?? 'none'}`,
    `working_tree_clean                 : ${result.working_tree_clean ?? false}`,
    `local_tag_exists                   : ${result.local_tag_exists ?? 'unknown'}`,
    `remote_tag_exists                  : ${result.remote_tag_exists ?? 'unknown'}`,
    `local_interactive_session_required : true`,
    `tag_created                        : false`,
    `git_push_performed                 : false`,
    `actual_real_tag_created            : false`,
    `deploy_performed                   : false`,
    `stable_promoted                    : false`,
    `release_performed                  : false`,
    `real_execution_not_performed       : true`,
    `blocking_reason                    : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('final-one-tag-preflight-snapshot.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildFinalOneTagPreflightSnapshot({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderFinalOneTagPreflightSnapshot(result));
  }

  process.exit(result.preflight_ready ? 0 : 1);
}
