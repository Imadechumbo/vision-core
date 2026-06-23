#!/usr/bin/env node
/**
 * Real Tag Human Runbook — V91.0
 *
 * Builds a structured runbook for human-operated real git tag creation.
 * Includes pre-checks, dry-run command, real execution command template,
 * post-checks, rollback commands, and blocked actions.
 *
 * REGRA ABSOLUTA: tag_created=false always. actual_real_tag_created=false always.
 * human_required=true always. local_interactive_only=true always. ci_blocked=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v91.0';

export const RUNBOOK_STATUSES = [
  'RUNBOOK_BLOCKED_BASELINE',
  'RUNBOOK_BLOCKED_EVIDENCE',
  'RUNBOOK_BLOCKED_TARGET',
  'RUNBOOK_READY',
];

const PRE_CHECKS = [
  'VERIFY: baseline_status=EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
  'VERIFY: evidence_receipt present and verified by Go Core',
  'VERIFY: target_tag format valid (vX.Y.Z or vX.Y.Z-suffix)',
  'VERIFY: git_head matches expected HEAD SHA',
  'VERIFY: no existing local tag with same name (git tag -l <tag>)',
  'VERIFY: no existing remote tag with same name (git ls-remote --tags origin <tag>)',
  'VERIFY: ci=false — must run local interactive only',
  'VERIFY: working tree clean (git status shows no uncommitted changes)',
];

const POST_CHECKS = [
  'VERIFY: git tag -l <tag> shows tag exists locally',
  'VERIFY: git ls-remote --tags origin refs/tags/<tag> shows tag on remote',
  'VERIFY: git rev-list -n 1 <tag> matches expected HEAD SHA',
  'VERIFY: execution receipt shows receipt_type=real_tag_created',
  'VERIFY: audit ledger contains EXECUTOR_REAL_TAG_EXECUTED event',
  'CONFIRM: deploy_to_production=BLOCKED (no deploy follows tag creation)',
  'CONFIRM: promote_to_stable=BLOCKED (no stable promotion follows)',
  'CONFIRM: release_to_users=BLOCKED (no release follows)',
];

const ROLLBACK_COMMANDS = [
  'git tag -d <tag>                        # delete local tag',
  'git push origin :refs/tags/<tag>        # delete remote tag',
  'VERIFY: git tag -l <tag> returns empty',
  'VERIFY: git ls-remote --tags origin <tag> returns empty',
];

const BLOCKED_ACTIONS = [
  'deploy_to_production',
  'promote_to_stable',
  'release_to_users',
  'modify_git_history',
  'push_unsigned_tags',
  'run_in_ci',
  'run_automated_without_human',
];

const DRY_RUN_COMMAND =
  'node tools/real-tag-one-shot-execution-controller.mjs --dry-run --json';

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _buildCommandTemplate(tag, head, receipt, anchor) {
  const t = tag     ?? '<target_tag>';
  const h = head    ?? '<git_head_sha>';
  const r = receipt ?? '<evidence_receipt_id>';
  const a = anchor  ?? '<rollback_anchor_id>';
  return [
    'node tools/real-tag-one-shot-execution-controller.mjs',
    '  --real-tag-one-shot',
    '  --execute-real-tag',
    '  --i-understand-this-creates-a-real-git-tag',
    `  --confirm-target-tag ${t}`,
    `  --confirm-git-head ${h}`,
    `  --confirm-evidence-receipt ${r}`,
    `  --confirm-rollback-anchor ${a}`,
    '  --confirm-no-deploy',
    '  --confirm-no-stable-promotion',
    '  --confirm-no-release',
    '  --local-interactive-only',
    '  --dry-run=false',
  ].join(' \\\n');
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
    schema_version:        SCHEMA_VERSION,
    runbook_status:        status,
    runbook_ready:         false,
    blocking_reason,
    human_required:        true,
    local_interactive_only: true,
    ci_blocked:            true,
    ...extra,
    ..._locked(),
  };
}

const TAG_PATTERN = /^v\d+\.\d+(\.\d+)?(-[a-zA-Z0-9._-]+)?$/;

export function buildRealTagHumanRunbook(params = {}) {
  const {
    fixture_mode    = false,
    baseline_status,
    evidence_receipt,
    target_tag,
    git_head,
    rollback_anchor,
    _mock_timestamp,
  } = params ?? {};

  const now        = _mock_timestamp ?? new Date().toISOString();
  const runbook_id = _sha256(`real-tag-human-runbook:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  // ── 1. Baseline gate ─────────────────────────────────────────────
  if (!fixture_mode) {
    const valid = baseline_status === 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL';
    if (!valid) {
      return _blocked('RUNBOOK_BLOCKED_BASELINE', 'baseline_not_ready', {
        runbook_id,
        baseline_status:                baseline_status ?? null,
        pre_checks:                     PRE_CHECKS,
        dry_run_command:                DRY_RUN_COMMAND,
        real_execution_command_template: _buildCommandTemplate(),
        post_checks:                    POST_CHECKS,
        rollback_commands:              ROLLBACK_COMMANDS,
        blocked_actions:                BLOCKED_ACTIONS,
        created_at:                     now,
      });
    }
  }

  // ── 2. Evidence gate ─────────────────────────────────────────────
  if (!fixture_mode) {
    const evOk = evidence_receipt && typeof evidence_receipt === 'string' &&
                 evidence_receipt.length >= 8;
    if (!evOk) {
      return _blocked('RUNBOOK_BLOCKED_EVIDENCE', 'evidence_receipt_missing_or_invalid', {
        runbook_id,
        pre_checks:                     PRE_CHECKS,
        dry_run_command:                DRY_RUN_COMMAND,
        real_execution_command_template: _buildCommandTemplate(),
        post_checks:                    POST_CHECKS,
        rollback_commands:              ROLLBACK_COMMANDS,
        blocked_actions:                BLOCKED_ACTIONS,
        created_at:                     now,
      });
    }
  }

  // ── 3. Target tag gate ───────────────────────────────────────────
  if (!fixture_mode) {
    const tagOk = target_tag && TAG_PATTERN.test(target_tag);
    if (!tagOk) {
      return _blocked('RUNBOOK_BLOCKED_TARGET', 'target_tag_missing_or_invalid', {
        runbook_id,
        target_tag:                     target_tag ?? null,
        pre_checks:                     PRE_CHECKS,
        dry_run_command:                DRY_RUN_COMMAND,
        real_execution_command_template: _buildCommandTemplate(target_tag),
        post_checks:                    POST_CHECKS,
        rollback_commands:              ROLLBACK_COMMANDS,
        blocked_actions:                BLOCKED_ACTIONS,
        created_at:                     now,
      });
    }
  }

  const eff_tag     = fixture_mode ? '<target_tag>'         : (target_tag     ?? '<target_tag>');
  const eff_head    = fixture_mode ? '<git_head_sha>'       : (git_head        ?? '<git_head_sha>');
  const eff_receipt = fixture_mode ? '<evidence_receipt_id>': (evidence_receipt ?? '<evidence_receipt_id>');
  const eff_anchor  = fixture_mode ? '<rollback_anchor_id>' : (rollback_anchor  ?? '<rollback_anchor_id>');

  return {
    schema_version:                 SCHEMA_VERSION,
    runbook_id,
    runbook_status:                 'RUNBOOK_READY',
    runbook_ready:                  true,
    blocking_reason:                null,
    human_required:                 true,
    local_interactive_only:         true,
    ci_blocked:                     true,
    pre_checks:                     PRE_CHECKS,
    dry_run_command:                DRY_RUN_COMMAND,
    real_execution_command_template: _buildCommandTemplate(eff_tag, eff_head, eff_receipt, eff_anchor),
    post_checks:                    POST_CHECKS,
    rollback_commands:              ROLLBACK_COMMANDS,
    blocked_actions:                BLOCKED_ACTIONS,
    required_modules_count:         8,
    created_at:                     now,
    ..._locked(),
  };
}

export function validateRealTagHumanRunbook(result) {
  if (!result || typeof result !== 'object') return { valid: false, reason: 'null_or_not_object' };
  if (result.tag_created                  === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (result.actual_real_tag_created      === true) return { valid: false, reason: 'actual_real_tag_created_must_be_false' };
  if (result.git_push_performed           === true) return { valid: false, reason: 'git_push_must_be_false' };
  if (result.deploy_performed             === true) return { valid: false, reason: 'deploy_performed_must_be_false' };
  if (result.stable_promoted              === true) return { valid: false, reason: 'stable_promoted_must_be_false' };
  if (result.release_performed            === true) return { valid: false, reason: 'release_performed_must_be_false' };
  if (result.human_required               !== true) return { valid: false, reason: 'human_required_must_be_true' };
  if (result.local_interactive_only       !== true) return { valid: false, reason: 'local_interactive_only_must_be_true' };
  if (result.ci_blocked                   !== true) return { valid: false, reason: 'ci_blocked_must_be_true' };
  if (!Array.isArray(result.pre_checks))            return { valid: false, reason: 'pre_checks_must_be_array' };
  if (!Array.isArray(result.post_checks))           return { valid: false, reason: 'post_checks_must_be_array' };
  if (!Array.isArray(result.rollback_commands))     return { valid: false, reason: 'rollback_commands_must_be_array' };
  if (!Array.isArray(result.blocked_actions))       return { valid: false, reason: 'blocked_actions_must_be_array' };
  return { valid: true };
}

export function renderRealTagHumanRunbook(result) {
  if (!result) return 'real_tag_human_runbook: null';
  const lines = [
    `runbook_status              : ${result.runbook_status ?? 'UNKNOWN'}`,
    `runbook_id                  : ${result.runbook_id ?? 'none'}`,
    `runbook_ready               : ${result.runbook_ready ?? false}`,
    `human_required              : ${result.human_required ?? false}`,
    `local_interactive_only      : ${result.local_interactive_only ?? false}`,
    `ci_blocked                  : ${result.ci_blocked ?? false}`,
    `tag_created                 : false`,
    `actual_real_tag_created     : false`,
    `git_push_performed          : false`,
    `real_execution_not_performed: true`,
    `blocking_reason             : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.runbook_ready) {
    lines.push('');
    lines.push('── DRY RUN COMMAND ──────────────────────────────────────');
    lines.push(result.dry_run_command ?? '(not set)');
    lines.push('');
    lines.push('── REAL EXECUTION COMMAND TEMPLATE ──────────────────────');
    lines.push(result.real_execution_command_template ?? '(not set)');
    lines.push('');
    lines.push('── PRE-CHECKS ───────────────────────────────────────────');
    (result.pre_checks ?? []).forEach(c => lines.push(`  ${c}`));
    lines.push('');
    lines.push('── POST-CHECKS ──────────────────────────────────────────');
    (result.post_checks ?? []).forEach(c => lines.push(`  ${c}`));
    lines.push('');
    lines.push('── ROLLBACK COMMANDS ────────────────────────────────────');
    (result.rollback_commands ?? []).forEach(c => lines.push(`  ${c}`));
    lines.push('');
    lines.push('── BLOCKED ACTIONS ──────────────────────────────────────');
    (result.blocked_actions ?? []).forEach(a => lines.push(`  BLOCKED: ${a}`));
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-human-runbook.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagHumanRunbook({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagHumanRunbook(result));
  }

  process.exit(result.runbook_ready ? 0 : 1);
}
