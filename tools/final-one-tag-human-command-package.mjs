#!/usr/bin/env node
/**
 * Final One-Tag Human Command Package — V96.1
 *
 * Generates final human command package for ONE real tag operation.
 * Contains preflight reference, real tag commands, verification, rollback,
 * and human receipt template. Does not execute any commands.
 *
 * REGRA ABSOLUTA: tag_created=false always. actual_real_tag_created=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v96.1';

export const COMMAND_PACKAGE_STATUSES = [
  'COMMAND_PACKAGE_BLOCKED_SNAPSHOT',
  'COMMAND_PACKAGE_BLOCKED_COMMANDS',
  'COMMAND_PACKAGE_BLOCKED_ROLLBACK',
  'COMMAND_PACKAGE_READY_FOR_HUMAN_ONE_TAG_OPERATION',
];

const FORBIDDEN_COMMANDS = [
  'deploy',
  'stable_promotion',
  'release_creation',
  'force_push',
  'branch_overwrite',
  'evidence_override',
  'go_core_override',
];

const COPY_PASTE_HEADER = [
  '╔══════════════════════════════════════════════════════════════╗',
  '║  HUMAN ONE-TAG OPERATION — READ CAREFULLY BEFORE EXECUTING  ║',
  '║  No deploy. No stable. No release. One tag. One push.       ║',
  '╚══════════════════════════════════════════════════════════════╝',
].join('\n');

const COPY_PASTE_FOOTER = [
  '── POST-EXECUTION ──────────────────────────────────────────────',
  'Run verification commands above.',
  'If tag is wrong: run rollback commands immediately.',
  'Then: import human receipt into receipt import gate (V97.0).',
  'BLOCKED: deploy / stable promotion / release creation.',
].join('\n');

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
    schema_version:          SCHEMA_VERSION,
    package_status:          status,
    package_ready:           false,
    blocking_reason,
    human_must_run_manually: true,
    copy_paste_safe:         false,
    forbidden_commands:      FORBIDDEN_COMMANDS,
    ...extra,
    ..._locked(),
  };
}

function _buildRealTagCommands(target_tag, git_head) {
  return [
    `git tag -a ${target_tag} ${git_head} -m "Vision Core ${target_tag} PASS GOLD verified"`,
    `git push origin refs/tags/${target_tag}`,
  ];
}

function _buildVerificationCommands(target_tag) {
  return [
    `git rev-parse ${target_tag}`,
    `git ls-remote --tags origin ${target_tag}`,
    `git status --porcelain`,
  ];
}

function _buildRollbackCommands(target_tag) {
  return [
    `git tag -d ${target_tag}`,
    `git push origin :refs/tags/${target_tag}`,
  ];
}

function _buildPreflightCommands(snapshot) {
  const tag = snapshot?.target_tag ?? '<target_tag>';
  const head = snapshot?.git_head ?? '<git_head>';
  return [
    `git status --porcelain`,
    `git rev-parse HEAD`,
    `git tag -l ${tag}`,
    `git ls-remote --tags origin refs/tags/${tag}`,
    `node tools/real-tag-human-operational-baseline.mjs --json`,
    `# Verify HEAD matches: ${head}`,
  ];
}

function _buildHumanReceiptTemplate(target_tag, git_head, evidence_receipt_id, rollback_anchor_id) {
  return {
    human_receipt_id:      '<fill-in-receipt-id>',
    schema_version:        'v97.0',
    target_tag:            target_tag ?? '<target_tag>',
    git_head:              git_head ?? '<git_head>',
    evidence_receipt_id:   evidence_receipt_id ?? '<evidence_receipt_id>',
    rollback_anchor_id:    rollback_anchor_id ?? '<rollback_anchor_id>',
    executed_by:           '<your-username>',
    executed_at:           '<ISO-timestamp>',
    tag_created:           '<true|false>',
    git_push_performed:    '<true|false>',
    local_tag_verified:    '<true|false>',
    remote_tag_verified:   '<true|false>',
    local_tag_head:        '<sha>',
    remote_tag_head:       '<sha>',
    deploy_performed:      false,
    stable_promoted:       false,
    release_performed:     false,
  };
}

export function buildFinalOneTagHumanCommandPackage(params = {}) {
  const {
    fixture_mode    = false,
    snapshot_result,
    _mock_timestamp,
  } = params ?? {};

  const now        = _mock_timestamp ?? new Date().toISOString();
  const package_id = _sha256(`one-tag-command-package:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const target_tag        = 'v1.0.0';
    const git_head          = 'abc1234def567890abc12345';
    const evidence_receipt_id = 'fixture-receipt-id-000000';
    const rollback_anchor_id  = 'fixture-rollback-id-000000';

    const preflight_commands    = _buildPreflightCommands({ target_tag, git_head });
    const real_tag_commands     = _buildRealTagCommands(target_tag, git_head);
    const verification_commands = _buildVerificationCommands(target_tag);
    const rollback_commands     = _buildRollbackCommands(target_tag);
    const human_receipt_template = _buildHumanReceiptTemplate(target_tag, git_head, evidence_receipt_id, rollback_anchor_id);

    return {
      schema_version:          SCHEMA_VERSION,
      command_package_id:      package_id,
      package_status:          'COMMAND_PACKAGE_READY_FOR_HUMAN_ONE_TAG_OPERATION',
      package_ready:           true,
      blocking_reason:         null,
      snapshot_id:             'fixture-snapshot-id-000000',
      target_tag,
      git_head,
      evidence_receipt_id,
      rollback_anchor_id,
      preflight_commands,
      real_tag_commands,
      verification_commands,
      rollback_commands,
      human_receipt_template,
      forbidden_commands:      FORBIDDEN_COMMANDS,
      copy_paste_safe:         true,
      human_must_run_manually: true,
      command_block:           `${COPY_PASTE_HEADER}\n\n${real_tag_commands.join('\n')}\n\n${COPY_PASTE_FOOTER}`,
      created_at:              now,
      ..._locked(),
    };
  }

  const eff_snapshot = snapshot_result !== undefined ? snapshot_result : null;

  // ── Gate 1: snapshot ready ─────────────────────────────────
  if (!eff_snapshot || eff_snapshot.preflight_ready !== true) {
    return _blocked('COMMAND_PACKAGE_BLOCKED_SNAPSHOT', 'preflight_snapshot_not_ready', {
      command_package_id: package_id,
      snapshot_verified:  false,
      created_at:         now,
    });
  }

  const target_tag          = eff_snapshot.target_tag ?? null;
  const git_head            = eff_snapshot.git_head ?? null;
  const evidence_receipt_id = eff_snapshot.evidence_receipt_id ?? null;
  const rollback_anchor_id  = eff_snapshot.rollback_anchor_id ?? null;

  // ── Gate 2: commands buildable (need target_tag and git_head) ──
  if (!target_tag || !git_head) {
    return _blocked('COMMAND_PACKAGE_BLOCKED_COMMANDS', 'missing_target_tag_or_git_head', {
      command_package_id: package_id,
      snapshot_verified:  true,
      created_at:         now,
    });
  }

  // ── Gate 3: rollback anchor required ───────────────────────
  if (!rollback_anchor_id) {
    return _blocked('COMMAND_PACKAGE_BLOCKED_ROLLBACK', 'rollback_anchor_missing', {
      command_package_id: package_id,
      snapshot_verified:  true,
      rollback_anchor_id: null,
      created_at:         now,
    });
  }

  const preflight_commands    = _buildPreflightCommands(eff_snapshot);
  const real_tag_commands     = _buildRealTagCommands(target_tag, git_head);
  const verification_commands = _buildVerificationCommands(target_tag);
  const rollback_commands     = _buildRollbackCommands(target_tag);
  const human_receipt_template = _buildHumanReceiptTemplate(target_tag, git_head, evidence_receipt_id, rollback_anchor_id);

  return {
    schema_version:          SCHEMA_VERSION,
    command_package_id:      package_id,
    package_status:          'COMMAND_PACKAGE_READY_FOR_HUMAN_ONE_TAG_OPERATION',
    package_ready:           true,
    blocking_reason:         null,
    snapshot_id:             eff_snapshot.snapshot_id ?? null,
    target_tag,
    git_head,
    evidence_receipt_id,
    rollback_anchor_id,
    preflight_commands,
    real_tag_commands,
    verification_commands,
    rollback_commands,
    human_receipt_template,
    forbidden_commands:      FORBIDDEN_COMMANDS,
    copy_paste_safe:         true,
    human_must_run_manually: true,
    command_block:           `${COPY_PASTE_HEADER}\n\n${real_tag_commands.join('\n')}\n\n${COPY_PASTE_FOOTER}`,
    snapshot_verified:       true,
    created_at:              now,
    ..._locked(),
  };
}

export function validateFinalOneTagHumanCommandPackage(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.tag_created             === true) failures.push('tag_created must be false');
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.git_push_performed      === true) failures.push('git_push_performed must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  if (result.human_must_run_manually !== true) failures.push('human_must_run_manually must be true');
  return failures;
}

export function renderFinalOneTagHumanCommandPackage(result) {
  if (!result) return 'final_one_tag_human_command_package: null';
  const lines = [
    `package_status          : ${result.package_status ?? 'UNKNOWN'}`,
    `command_package_id      : ${result.command_package_id ?? 'none'}`,
    `package_ready           : ${result.package_ready ?? false}`,
    `target_tag              : ${result.target_tag ?? 'none'}`,
    `git_head                : ${result.git_head ?? 'none'}`,
    `human_must_run_manually : true`,
    `copy_paste_safe         : ${result.copy_paste_safe ?? false}`,
    `tag_created             : false`,
    `git_push_performed      : false`,
    `actual_real_tag_created : false`,
    `deploy_performed        : false`,
    `stable_promoted         : false`,
    `release_performed       : false`,
    `blocking_reason         : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.package_ready && result.command_block) {
    lines.push('');
    lines.push('── COMMAND BLOCK ──────────────────────────────────────────────');
    lines.push(result.command_block);
    lines.push('');
    lines.push('── ROLLBACK COMMANDS ──────────────────────────────────────────');
    (result.rollback_commands ?? []).forEach(c => lines.push(`  ${c}`));
    lines.push('');
    lines.push('── FORBIDDEN ──────────────────────────────────────────────────');
    (result.forbidden_commands ?? []).forEach(c => lines.push(`  BLOCKED: ${c}`));
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('final-one-tag-human-command-package.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildFinalOneTagHumanCommandPackage({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderFinalOneTagHumanCommandPackage(result));
  }

  process.exit(result.package_ready ? 0 : 1);
}
