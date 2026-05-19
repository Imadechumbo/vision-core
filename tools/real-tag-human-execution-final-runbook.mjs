#!/usr/bin/env node
/**
 * Real Tag Human Execution Final Runbook — V101.0
 *
 * Human runbook for executing ONE real git tag. Does not execute anything.
 *
 * REGRA ABSOLUTA: tag_created=false always. git_push_performed=false always.
 * actual_real_tag_created=false always. deploy_performed=false always.
 * stable_promoted=false always. release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v101.0';

export const FINAL_RUNBOOK_STATUSES = [
  'FINAL_RUNBOOK_BLOCKED_BASELINE',
  'FINAL_RUNBOOK_BLOCKED_TARGET',
  'FINAL_RUNBOOK_BLOCKED_EVIDENCE',
  'FINAL_RUNBOOK_BLOCKED_ROLLBACK',
  'FINAL_RUNBOOK_READY',
];

const FORBIDDEN_ACTIONS = [
  'auto_deploy',
  'auto_stable_promotion',
  'auto_release',
  'force_push',
  'evidence_override',
  'go_core_override',
  'ci_execution',
  'non_interactive_execution',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    actual_real_tag_created:      false,
    actual_git_push_performed:    false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:         SCHEMA_VERSION,
    runbook_status:         status,
    runbook_ready:          false,
    blocking_reason,
    human_required:         true,
    local_interactive_only: true,
    ci_blocked:             true,
    forbidden_actions:      FORBIDDEN_ACTIONS,
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagHumanExecutionFinalRunbook(params = {}) {
  const {
    fixture_mode        = false,
    baseline_result,
    target_tag,
    git_head,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id,
    _mock_timestamp,
  } = params ?? {};

  const now        = _mock_timestamp ?? new Date().toISOString();
  const runbook_id = _sha256(`final-runbook:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:            SCHEMA_VERSION,
      runbook_id,
      runbook_status:            'FINAL_RUNBOOK_READY',
      runbook_ready:             true,
      blocking_reason:           null,
      target_tag:                'v1.0.0',
      git_head:                  'abc1234def567890abc12345',
      evidence_receipt_id:       'receipt-fixture-001',
      evidence_source:           'go-core',
      rollback_anchor_id:        'anchor-fixture-001',
      tag_operation_baseline_id: 'baseline-fixture-001',
      pre_execution_checklist: [
        'Confirm working tree is clean (git status --porcelain)',
        'Confirm current HEAD matches target SHA (git rev-parse HEAD)',
        'Confirm target tag does not exist locally',
        'Confirm target tag does not exist remotely',
        'Confirm rollback anchor is present',
        'Confirm evidence receipt from go-core',
        'Confirm NOT running in CI',
      ],
      exact_manual_commands: [
        'git status --porcelain',
        'git rev-parse HEAD',
        'git tag -a v1.0.0 abc1234def567890abc12345 -m "Release v1.0.0"',
        'git push origin refs/tags/v1.0.0',
      ],
      post_execution_checklist: [
        'Verify tag exists locally: git tag -l v1.0.0',
        'Verify tag exists remotely: git ls-remote origin refs/tags/v1.0.0',
        'Verify tag HEAD matches: git rev-list -n 1 v1.0.0',
        'Fill in human receipt template with actual values',
        'Submit filled receipt via receipt import gate',
      ],
      rollback_commands: [
        'git tag -d v1.0.0',
        'git push origin :refs/tags/v1.0.0',
      ],
      human_receipt_instructions: 'Fill in the receipt template after execution. Submit via receipt import gate.',
      forbidden_actions:          FORBIDDEN_ACTIONS,
      human_required:             true,
      local_interactive_only:     true,
      ci_blocked:                 true,
      created_at:                 now,
      ..._locked(),
    };
  }

  const eff_baseline = baseline_result !== undefined ? baseline_result : null;

  // Gate 1: baseline ready
  if (!eff_baseline || eff_baseline.tag_operation_baseline_ready !== true) {
    return _blocked('FINAL_RUNBOOK_BLOCKED_BASELINE', 'tag_operation_baseline_not_ready', {
      runbook_id, created_at: now,
    });
  }

  // Gate 2: target_tag
  if (!target_tag || !String(target_tag).startsWith('v')) {
    return _blocked('FINAL_RUNBOOK_BLOCKED_TARGET', 'target_tag_invalid', {
      runbook_id, created_at: now,
    });
  }

  // Gate 3: evidence_source
  if (evidence_source !== 'go-core') {
    return _blocked('FINAL_RUNBOOK_BLOCKED_EVIDENCE', 'evidence_source_not_go_core', {
      runbook_id, created_at: now,
    });
  }

  // Gate 4: rollback anchor
  if (!rollback_anchor_id) {
    return _blocked('FINAL_RUNBOOK_BLOCKED_ROLLBACK', 'rollback_anchor_missing', {
      runbook_id, created_at: now,
    });
  }

  const eff_head = git_head ?? null;
  const eff_rid  = evidence_receipt_id ?? null;

  return {
    schema_version:            SCHEMA_VERSION,
    runbook_id,
    runbook_status:            'FINAL_RUNBOOK_READY',
    runbook_ready:             true,
    blocking_reason:           null,
    target_tag,
    git_head:                  eff_head,
    evidence_receipt_id:       eff_rid,
    evidence_source,
    rollback_anchor_id,
    tag_operation_baseline_id: eff_baseline.baseline_id ?? null,
    pre_execution_checklist: [
      'Confirm working tree is clean (git status --porcelain)',
      `Confirm current HEAD matches ${eff_head} (git rev-parse HEAD)`,
      `Confirm tag ${target_tag} does not exist locally`,
      `Confirm tag ${target_tag} does not exist remotely`,
      `Confirm rollback anchor ${rollback_anchor_id} is present`,
      `Confirm evidence receipt ${eff_rid ?? '?'} from go-core`,
      'Confirm NOT running in CI (CI env var must be unset)',
    ],
    exact_manual_commands: [
      'git status --porcelain',
      'git rev-parse HEAD',
      `git tag -a ${target_tag} ${eff_head} -m "Release ${target_tag}"`,
      `git push origin refs/tags/${target_tag}`,
    ],
    post_execution_checklist: [
      `Verify tag exists locally: git tag -l ${target_tag}`,
      `Verify tag exists remotely: git ls-remote origin refs/tags/${target_tag}`,
      `Verify tag HEAD matches: git rev-list -n 1 ${target_tag}`,
      'Fill in human receipt template with actual values',
      'Submit filled receipt via receipt import gate',
    ],
    rollback_commands: [
      `git tag -d ${target_tag}`,
      `git push origin :refs/tags/${target_tag}`,
    ],
    human_receipt_instructions: `After executing the commands, fill the receipt template with tag_created=true, git_push_performed=true, local_tag_verified, remote_tag_verified, local_tag_head, remote_tag_head, executed_by, executed_at.`,
    forbidden_actions:          FORBIDDEN_ACTIONS,
    human_required:             true,
    local_interactive_only:     true,
    ci_blocked:                 true,
    created_at:                 now,
    ..._locked(),
  };
}

export function validateRealTagHumanExecutionFinalRunbook(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.tag_created             === true) failures.push('tag_created must be false');
  if (result.git_push_performed      === true) failures.push('git_push_performed must be false');
  if (result.actual_real_tag_created  === true) failures.push('actual_real_tag_created must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  if (result.human_required          !== true) failures.push('human_required must be true');
  if (result.local_interactive_only  !== true) failures.push('local_interactive_only must be true');
  if (result.ci_blocked              !== true) failures.push('ci_blocked must be true');
  return failures;
}

export function renderRealTagHumanExecutionFinalRunbook(result) {
  if (!result) return 'real_tag_human_execution_final_runbook: null';
  const lines = [
    `runbook_status           : ${result.runbook_status ?? 'UNKNOWN'}`,
    `runbook_id               : ${result.runbook_id ?? 'none'}`,
    `runbook_ready            : ${result.runbook_ready ?? false}`,
    `target_tag               : ${result.target_tag ?? 'none'}`,
    `git_head                 : ${result.git_head ?? 'none'}`,
    `evidence_source          : ${result.evidence_source ?? 'none'}`,
    `rollback_anchor_id       : ${result.rollback_anchor_id ?? 'none'}`,
    `human_required           : true`,
    `local_interactive_only   : true`,
    `ci_blocked               : true`,
    `tag_created              : false`,
    `git_push_performed       : false`,
    `actual_real_tag_created  : false`,
    `deploy_performed         : false`,
    `stable_promoted          : false`,
    `release_performed        : false`,
    `blocking_reason          : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.runbook_ready) {
    lines.push('');
    lines.push('── PRE-EXECUTION CHECKLIST ────────────────────────────────────');
    (result.pre_execution_checklist ?? []).forEach(c => lines.push(`  ☐ ${c}`));
    lines.push('');
    lines.push('── EXACT MANUAL COMMANDS ──────────────────────────────────────');
    (result.exact_manual_commands ?? []).forEach(c => lines.push(`  $ ${c}`));
    lines.push('');
    lines.push('── POST-EXECUTION CHECKLIST ───────────────────────────────────');
    (result.post_execution_checklist ?? []).forEach(c => lines.push(`  ☐ ${c}`));
    lines.push('');
    lines.push('── ROLLBACK COMMANDS ──────────────────────────────────────────');
    (result.rollback_commands ?? []).forEach(c => lines.push(`  $ ${c}`));
    lines.push('');
    lines.push('── FORBIDDEN ACTIONS ──────────────────────────────────────────');
    (result.forbidden_actions ?? []).forEach(a => lines.push(`  BLOCKED: ${a}`));
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-human-execution-final-runbook.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagHumanExecutionFinalRunbook({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagHumanExecutionFinalRunbook(result));
  }

  process.exit(result.runbook_ready ? 0 : 1);
}
