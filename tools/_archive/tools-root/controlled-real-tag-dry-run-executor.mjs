#!/usr/bin/env node
/**
 * Controlled Real Tag Dry-Run Executor — V73.1
 *
 * Simulates real tag creation without creating tag.
 * Generates command preview and receipt preview only.
 * dry_run=true mandatory. tag_created=false always.
 *
 * REGRA ABSOLUTA: tag_created=false always. git_push_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v73.1';

export const TAG_DRY_RUN_STATUSES = [
  'TAG_DRY_RUN_BLOCKED_GATE',
  'TAG_DRY_RUN_BLOCKED_NOT_DRY_RUN',
  'TAG_DRY_RUN_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:                  false,
    promotion_allowed:               false,
    stable_allowed:                  false,
    tag_allowed:                     false,
    release_execution_allowed:       false,
    release_performed:               false,
    tag_created:                     false,
    stable_promoted:                 false,
    deploy_performed:                false,
    production_execution_locked:     true,
    unlock_executed:                 false,
    git_push_performed:              false,
    real_command_required:           true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    tag_dry_run_status:  status,
    tag_dry_run_ready:   false,
    blocking_reason,
    ...extra,
    deploy_allowed:                  false,
    promotion_allowed:               false,
    stable_allowed:                  false,
    tag_allowed:                     false,
    release_execution_allowed:       false,
    release_performed:               false,
    tag_created:                     false,
    stable_promoted:                 false,
    deploy_performed:                false,
    production_execution_locked:     true,
    unlock_executed:                 false,
    git_push_performed:              false,
    real_command_required:           true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

export function runControlledRealTagDryRun(params = {}) {
  const {
    tag_gate,
    dry_run = true,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const dry_run_id = _sha256(`fixture-tag-dry-run:${now}`).slice(0, 24);
    const preview_id = _sha256(`fixture-tag-receipt-preview:${now}`).slice(0, 24);
    return {
      schema_version:           SCHEMA_VERSION,
      tag_dry_run_id:           dry_run_id,
      tag_dry_run_status:       'TAG_DRY_RUN_READY',
      tag_dry_run_ready:        true,
      simulated_command:        'git tag -a v0.0.0-fixture -m "Release v0.0.0-fixture" fixture-git-head',
      simulated_push_command:   'git push origin v0.0.0-fixture',
      tag_receipt_preview_id:   preview_id,
      rollback_note:            'git tag -d v0.0.0-fixture && git push origin :refs/tags/v0.0.0-fixture',
      blocking_reason:          null,
      created_at:               now,
      ..._locked(),
    };
  }

  if (dry_run !== true) {
    return _blocked('TAG_DRY_RUN_BLOCKED_NOT_DRY_RUN', 'dry_run_must_be_true', { dry_run });
  }

  if (!tag_gate || tag_gate.tag_gate_status !== 'TAG_GATE_READY_REQUIRES_COMMAND') {
    return _blocked('TAG_DRY_RUN_BLOCKED_GATE', 'tag_gate_not_ready', {
      tag_gate_status: tag_gate?.tag_gate_status ?? null,
    });
  }

  const tag    = tag_gate.target_tag ?? 'vUNKNOWN';
  const head   = tag_gate.git_head ?? 'UNKNOWN';
  const dry_run_id = _sha256([
    'tag-dry-run', tag, head, now,
  ].join(':')).slice(0, 24);
  const preview_id = _sha256(`tag-receipt-preview:${dry_run_id}:${now}`).slice(0, 24);

  return {
    schema_version:           SCHEMA_VERSION,
    tag_dry_run_id:           dry_run_id,
    tag_dry_run_status:       'TAG_DRY_RUN_READY',
    tag_dry_run_ready:        true,
    simulated_command:        `git tag -a ${tag} -m "Release ${tag}" ${head}`,
    simulated_push_command:   `git push origin ${tag}`,
    tag_receipt_preview_id:   preview_id,
    rollback_note:            `git tag -d ${tag} && git push origin :refs/tags/${tag}`,
    blocking_reason:          null,
    created_at:               now,
    ..._locked(),
  };
}

export function renderControlledRealTagDryRunSummary(result) {
  if (!result) return 'controlled_real_tag_dry_run: null';
  return [
    `tag_dry_run_status             : ${result.tag_dry_run_status ?? 'UNKNOWN'}`,
    `tag_dry_run_id                 : ${result.tag_dry_run_id ?? 'none'}`,
    `simulated_command              : ${result.simulated_command ?? 'none'}`,
    `tag_receipt_preview_id         : ${result.tag_receipt_preview_id ?? 'none'}`,
    `real_command_required          : true`,
    `tag_created                    : false`,
    `git_push_performed             : false`,
    `production_execution_locked    : true`,
    `blocking_reason                : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('controlled-real-tag-dry-run-executor.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runControlledRealTagDryRun({ fixture_mode: fixture, dry_run: true });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledRealTagDryRunSummary(result));
  }

  process.exit(result.tag_dry_run_ready ? 0 : 1);
}
