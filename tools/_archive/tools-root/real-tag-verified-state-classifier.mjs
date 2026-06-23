#!/usr/bin/env node
/**
 * Real Tag Verified State Classifier — V103.0
 *
 * Classifies post-import state: dry-run imported, real tag imported/verified.
 * stable_review_eligible=true only when real_tag_verified=true.
 * Does not promote stable. Does not execute anything.
 *
 * REGRA ABSOLUTA: stable_promoted=false always. deploy_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v103.0';

export const VERIFIED_STATE_STATUSES = [
  'VERIFIED_STATE_BLOCKED_IMPORT',
  'VERIFIED_STATE_COMMAND_SEALED',
  'VERIFIED_STATE_DRY_RUN_IMPORTED',
  'VERIFIED_STATE_REAL_TAG_IMPORTED',
  'VERIFIED_STATE_REAL_TAG_VERIFIED',
];

const BLOCKED_ACTIONS = [
  'auto_stable_promotion',
  'auto_deploy',
  'auto_release',
  'force_push',
  'evidence_override',
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
    verified_state:         status,
    state_ready:            false,
    blocking_reason,
    real_tag_verified:      false,
    stable_review_eligible: false,
    blocked_actions:        BLOCKED_ACTIONS,
    safe_next_actions:      [],
    ...extra,
    ..._locked(),
  };
}

export function classifyRealTagVerifiedState(params = {}) {
  const {
    fixture_mode  = false,
    import_result,
    _mock_timestamp,
  } = params ?? {};

  const now      = _mock_timestamp ?? new Date().toISOString();
  const state_id = _sha256(`verified-state:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:         SCHEMA_VERSION,
      state_id,
      verified_state:         'VERIFIED_STATE_DRY_RUN_IMPORTED',
      state_ready:            true,
      blocking_reason:        null,
      target_tag:             'v1.0.0',
      git_head:               'abc1234def567890abc12345',
      real_tag_verified:      false,
      stable_review_eligible: false,
      safe_next_actions:      ['execute_real_tag_to_unlock_stable_review'],
      blocked_actions:        BLOCKED_ACTIONS,
      created_at:             now,
      ..._locked(),
    };
  }

  const eff_import = import_result !== undefined ? import_result : null;

  if (!eff_import || eff_import.import_ready !== true) {
    return _blocked('VERIFIED_STATE_BLOCKED_IMPORT', 'import_not_ready', {
      state_id, created_at: now,
    });
  }

  const is_real_tag          = eff_import.is_real_tag === true;
  const target_tag           = eff_import.target_tag ?? null;
  const git_head             = eff_import.git_head   ?? null;
  const real_tag_verified    = is_real_tag;
  const stable_review_eligible = is_real_tag;

  let verified_state;
  let safe_next_actions;

  if (is_real_tag) {
    verified_state    = 'VERIFIED_STATE_REAL_TAG_VERIFIED';
    safe_next_actions = [
      'evaluate_stable_review_eligibility',
      'archive_receipt',
      'notify_team',
    ];
  } else {
    verified_state    = 'VERIFIED_STATE_DRY_RUN_IMPORTED';
    safe_next_actions = [
      'execute_real_tag_to_unlock_stable_review',
      'review_command_package',
      're_run_dry_run_if_needed',
    ];
  }

  return {
    schema_version:         SCHEMA_VERSION,
    state_id,
    verified_state,
    state_ready:            true,
    blocking_reason:        null,
    target_tag,
    git_head,
    real_tag_verified,
    stable_review_eligible,
    safe_next_actions,
    blocked_actions:        BLOCKED_ACTIONS,
    created_at:             now,
    ..._locked(),
  };
}

export function validateRealTagVerifiedState(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  if (result.stable_review_eligible === true && result.real_tag_verified !== true) {
    failures.push('stable_review_eligible=true requires real_tag_verified=true');
  }
  return failures;
}

export function renderRealTagVerifiedStateClassifier(result) {
  if (!result) return 'real_tag_verified_state_classifier: null';
  const lines = [
    `verified_state           : ${result.verified_state ?? 'UNKNOWN'}`,
    `state_id                 : ${result.state_id ?? 'none'}`,
    `state_ready              : ${result.state_ready ?? false}`,
    `target_tag               : ${result.target_tag ?? 'none'}`,
    `git_head                 : ${result.git_head ?? 'none'}`,
    `real_tag_verified        : ${result.real_tag_verified ?? false}`,
    `stable_review_eligible   : ${result.stable_review_eligible ?? false}`,
    `stable_promoted          : false`,
    `deploy_performed         : false`,
    `actual_real_tag_created  : false`,
    `blocking_reason          : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.state_ready) {
    lines.push('');
    lines.push('── SAFE NEXT ACTIONS ──────────────────────────────────────────');
    (result.safe_next_actions ?? []).forEach(a => lines.push(`  OK: ${a}`));
    lines.push('');
    lines.push('── BLOCKED ACTIONS ────────────────────────────────────────────');
    (result.blocked_actions ?? []).forEach(a => lines.push(`  BLOCKED: ${a}`));
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-verified-state-classifier.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = classifyRealTagVerifiedState({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagVerifiedStateClassifier(result));
  }

  process.exit(result.state_ready ? 0 : 1);
}
