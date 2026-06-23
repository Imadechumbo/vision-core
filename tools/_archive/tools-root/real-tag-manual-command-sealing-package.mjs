#!/usr/bin/env node
/**
 * Real Tag Manual Command Sealing Package — V101.1
 *
 * Seals the manual commands from the final runbook with deterministic hashes.
 * Does not execute anything.
 *
 * REGRA ABSOLUTA: tag_created=false always. git_push_performed=false always.
 * actual_real_tag_created=false always. stable_promoted=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v101.1';

export const COMMAND_SEAL_STATUSES = [
  'COMMAND_SEAL_BLOCKED_RUNBOOK',
  'COMMAND_SEAL_BLOCKED_HASH',
  'COMMAND_SEAL_READY',
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
    schema_version:     SCHEMA_VERSION,
    seal_status:        status,
    command_seal_valid: false,
    blocking_reason,
    immutable:          false,
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagManualCommandSealingPackage(params = {}) {
  const {
    fixture_mode    = false,
    runbook_result,
    _mock_timestamp,
  } = params ?? {};

  const now     = _mock_timestamp ?? new Date().toISOString();
  const seal_id = _sha256(`command-seal:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const sealed_cmds = [
      'git status --porcelain',
      'git rev-parse HEAD',
      'git tag -a v1.0.0 abc1234def567890abc12345 -m "Release v1.0.0"',
      'git push origin refs/tags/v1.0.0',
    ];
    const sealed_rb = [
      'git tag -d v1.0.0',
      'git push origin :refs/tags/v1.0.0',
    ];
    const receipt_tmpl = 'Fill in the receipt template after execution. Submit via receipt import gate.';
    const cmd_hash   = _sha256(JSON.stringify(sealed_cmds)).slice(0, 32);
    const rb_hash    = _sha256(JSON.stringify(sealed_rb)).slice(0, 32);
    const tmpl_hash  = _sha256(receipt_tmpl).slice(0, 32);
    const seal_hash  = _sha256(`${cmd_hash}:${rb_hash}:${tmpl_hash}`).slice(0, 32);
    return {
      schema_version:           SCHEMA_VERSION,
      seal_id,
      seal_status:              'COMMAND_SEAL_READY',
      command_seal_valid:       true,
      blocking_reason:          null,
      final_runbook_id:         'fixture-runbook-001',
      target_tag:               'v1.0.0',
      git_head:                 'abc1234def567890abc12345',
      evidence_receipt_id:      'receipt-fixture-001',
      rollback_anchor_id:       'anchor-fixture-001',
      command_hash:             cmd_hash,
      rollback_hash:            rb_hash,
      receipt_template_hash:    tmpl_hash,
      seal_hash,
      sealed_manual_commands:   sealed_cmds,
      sealed_rollback_commands: sealed_rb,
      receipt_template:         receipt_tmpl,
      immutable:                true,
      created_at:               now,
      ..._locked(),
    };
  }

  const eff_runbook = runbook_result !== undefined ? runbook_result : null;

  if (!eff_runbook || eff_runbook.runbook_ready !== true) {
    return _blocked('COMMAND_SEAL_BLOCKED_RUNBOOK', 'final_runbook_not_ready', {
      seal_id, created_at: now,
    });
  }

  const sealed_cmds = eff_runbook.exact_manual_commands ?? [];
  const sealed_rb   = eff_runbook.rollback_commands ?? [];
  const receipt_tmpl = eff_runbook.human_receipt_instructions ?? '';

  const cmd_hash   = _sha256(JSON.stringify(sealed_cmds)).slice(0, 32);
  const rb_hash    = _sha256(JSON.stringify(sealed_rb)).slice(0, 32);
  const tmpl_hash  = _sha256(String(receipt_tmpl)).slice(0, 32);
  const seal_hash  = _sha256(`${cmd_hash}:${rb_hash}:${tmpl_hash}`).slice(0, 32);

  return {
    schema_version:           SCHEMA_VERSION,
    seal_id,
    seal_status:              'COMMAND_SEAL_READY',
    command_seal_valid:       true,
    blocking_reason:          null,
    final_runbook_id:         eff_runbook.runbook_id ?? null,
    target_tag:               eff_runbook.target_tag ?? null,
    git_head:                 eff_runbook.git_head ?? null,
    evidence_receipt_id:      eff_runbook.evidence_receipt_id ?? null,
    rollback_anchor_id:       eff_runbook.rollback_anchor_id ?? null,
    command_hash:             cmd_hash,
    rollback_hash:            rb_hash,
    receipt_template_hash:    tmpl_hash,
    seal_hash,
    sealed_manual_commands:   sealed_cmds,
    sealed_rollback_commands: sealed_rb,
    receipt_template:         receipt_tmpl,
    immutable:                true,
    created_at:               now,
    ..._locked(),
  };
}

export function validateRealTagManualCommandSealingPackage(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.tag_created            === true) failures.push('tag_created must be false');
  if (result.git_push_performed     === true) failures.push('git_push_performed must be false');
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.deploy_performed       === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted        === true) failures.push('stable_promoted must be false');
  if (result.release_performed      === true) failures.push('release_performed must be false');
  if (result.command_seal_valid === true && result.immutable !== true) {
    failures.push('immutable must be true when seal is valid');
  }
  return failures;
}

export function renderRealTagManualCommandSealingPackage(result) {
  if (!result) return 'real_tag_manual_command_sealing_package: null';
  const lines = [
    `seal_status              : ${result.seal_status ?? 'UNKNOWN'}`,
    `seal_id                  : ${result.seal_id ?? 'none'}`,
    `command_seal_valid       : ${result.command_seal_valid ?? false}`,
    `target_tag               : ${result.target_tag ?? 'none'}`,
    `git_head                 : ${result.git_head ?? 'none'}`,
    `command_hash             : ${result.command_hash ?? 'none'}`,
    `rollback_hash            : ${result.rollback_hash ?? 'none'}`,
    `seal_hash                : ${result.seal_hash ?? 'none'}`,
    `immutable                : ${result.immutable ?? false}`,
    `tag_created              : false`,
    `git_push_performed       : false`,
    `actual_real_tag_created  : false`,
    `deploy_performed         : false`,
    `stable_promoted          : false`,
    `release_performed        : false`,
    `blocking_reason          : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.command_seal_valid) {
    lines.push('');
    lines.push('── SEALED COMMANDS ────────────────────────────────────────────');
    (result.sealed_manual_commands ?? []).forEach(c => lines.push(`  $ ${c}`));
    lines.push('');
    lines.push('── SEALED ROLLBACK ────────────────────────────────────────────');
    (result.sealed_rollback_commands ?? []).forEach(c => lines.push(`  $ ${c}`));
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-command-sealing-package.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagManualCommandSealingPackage({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagManualCommandSealingPackage(result));
  }

  process.exit(result.command_seal_valid ? 0 : 1);
}
