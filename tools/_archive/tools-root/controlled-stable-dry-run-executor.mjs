#!/usr/bin/env node
/**
 * Controlled Stable Dry-Run Executor — V74.1
 *
 * Simulates stable promotion without altering stable branch.
 * Generates command preview and receipt preview only.
 * dry_run=true mandatory. stable_promoted=false always.
 *
 * REGRA ABSOLUTA: stable_promoted=false always. git_push_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v74.1';

export const STABLE_DRY_RUN_STATUSES = [
  'STABLE_DRY_RUN_BLOCKED_GATE',
  'STABLE_DRY_RUN_BLOCKED_NOT_DRY_RUN',
  'STABLE_DRY_RUN_READY',
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
    schema_version:        SCHEMA_VERSION,
    stable_dry_run_status: status,
    stable_dry_run_ready:  false,
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

export function runControlledStableDryRun(params = {}) {
  const {
    stable_gate,
    dry_run = true,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const dry_run_id = _sha256(`fixture-stable-dry-run:${now}`).slice(0, 24);
    const preview_id = _sha256(`fixture-stable-receipt-preview:${now}`).slice(0, 24);
    return {
      schema_version:           SCHEMA_VERSION,
      stable_dry_run_id:        dry_run_id,
      stable_dry_run_status:    'STABLE_DRY_RUN_READY',
      stable_dry_run_ready:     true,
      simulated_stable_command: 'git checkout stable && git merge --ff-only v0.0.0-fixture',
      simulated_push_command:   'git push origin stable',
      stable_receipt_preview_id: preview_id,
      rollback_note:            'git checkout stable && git reset --hard HEAD~1 && git push origin stable --force',
      blocking_reason:          null,
      created_at:               now,
      ..._locked(),
    };
  }

  if (dry_run !== true) {
    return _blocked('STABLE_DRY_RUN_BLOCKED_NOT_DRY_RUN', 'dry_run_must_be_true', { dry_run });
  }

  if (!stable_gate || stable_gate.stable_gate_status !== 'STABLE_GATE_READY_REQUIRES_COMMAND') {
    return _blocked('STABLE_DRY_RUN_BLOCKED_GATE', 'stable_gate_not_ready', {
      stable_gate_status: stable_gate?.stable_gate_status ?? null,
    });
  }

  const ref  = stable_gate.target_stable_ref ?? 'stable';
  const tag  = stable_gate.target_tag ?? 'UNKNOWN';
  const dry_run_id = _sha256([
    'stable-dry-run', ref, tag, now,
  ].join(':')).slice(0, 24);
  const preview_id = _sha256(`stable-receipt-preview:${dry_run_id}:${now}`).slice(0, 24);

  return {
    schema_version:            SCHEMA_VERSION,
    stable_dry_run_id:         dry_run_id,
    stable_dry_run_status:     'STABLE_DRY_RUN_READY',
    stable_dry_run_ready:      true,
    simulated_stable_command:  `git checkout ${ref} && git merge --ff-only ${tag}`,
    simulated_push_command:    `git push origin ${ref}`,
    stable_receipt_preview_id: preview_id,
    rollback_note:             `git checkout ${ref} && git reset --hard HEAD~1 && git push origin ${ref} --force`,
    blocking_reason:           null,
    created_at:                now,
    ..._locked(),
  };
}

export function renderControlledStableDryRunSummary(result) {
  if (!result) return 'controlled_stable_dry_run: null';
  return [
    `stable_dry_run_status          : ${result.stable_dry_run_status ?? 'UNKNOWN'}`,
    `stable_dry_run_id              : ${result.stable_dry_run_id ?? 'none'}`,
    `simulated_stable_command       : ${result.simulated_stable_command ?? 'none'}`,
    `stable_receipt_preview_id      : ${result.stable_receipt_preview_id ?? 'none'}`,
    `real_command_required          : true`,
    `stable_promoted                : false`,
    `git_push_performed             : false`,
    `production_execution_locked    : true`,
    `blocking_reason                : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('controlled-stable-dry-run-executor.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runControlledStableDryRun({ fixture_mode: fixture, dry_run: true });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledStableDryRunSummary(result));
  }

  process.exit(result.stable_dry_run_ready ? 0 : 1);
}
