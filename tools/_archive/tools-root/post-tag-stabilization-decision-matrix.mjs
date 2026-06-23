#!/usr/bin/env node
/**
 * Post-Tag Stabilization Decision Matrix — V98.1
 *
 * Decides post-tag state based on ledger evidence:
 * command_ready / dry_run_confirmed / real_tag_confirmed.
 * Recommends next step without automatic stable promotion.
 *
 * REGRA ABSOLUTA: stable_promoted=false always. deploy_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v98.1';

export const POST_TAG_DECISION_STATUSES = [
  'POST_TAG_DECISION_BLOCKED_LEDGER',
  'POST_TAG_DECISION_BLOCKED_RECEIPT',
  'POST_TAG_DECISION_COMMAND_READY',
  'POST_TAG_DECISION_DRY_RUN_CONFIRMED',
  'POST_TAG_DECISION_REAL_TAG_CONFIRMED',
  'POST_TAG_DECISION_READY_FOR_STABLE_REVIEW_PHASE',
];

const BLOCKED_ACTIONS = [
  'auto_stable',
  'auto_deploy',
  'auto_release',
  'force_push',
  'evidence_override',
  'go_core_override',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    actual_real_tag_created:      false,
    tag_created:                  false,
    git_push_performed:           false,
    real_execution_not_performed: true,
    stable_promoted:              false,
    deploy_performed:             false,
    release_performed:            false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:               SCHEMA_VERSION,
    decision_status:              status,
    decision_ready:               false,
    blocking_reason,
    stable_review_phase_allowed:  false,
    blocked_actions:              BLOCKED_ACTIONS,
    safe_next_actions:            [],
    ...extra,
    ..._locked(),
  };
}

export function buildPostTagStabilizationDecisionMatrix(params = {}) {
  const {
    fixture_mode    = false,
    ledger_result,
    verifier_result,
    _mock_timestamp,
  } = params ?? {};

  const now         = _mock_timestamp ?? new Date().toISOString();
  const decision_id = _sha256(`post-tag-decision:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:              SCHEMA_VERSION,
      decision_id,
      decision_status:             'POST_TAG_DECISION_DRY_RUN_CONFIRMED',
      decision_ready:              true,
      blocking_reason:             null,
      target_tag:                  'v1.0.0',
      git_head:                    'abc1234def567890abc12345',
      real_tag_confirmed:          false,
      stable_review_phase_allowed: false,
      blocked_actions:             BLOCKED_ACTIONS,
      safe_next_actions:           [
        'repeat_dry_run_if_needed',
        'execute_real_tag_manually_when_ready',
      ],
      ledger_verified:             true,
      receipt_verified:            true,
      created_at:                  now,
      ..._locked(),
    };
  }

  const eff_ledger   = ledger_result   !== undefined ? ledger_result   : null;
  const eff_verifier = verifier_result !== undefined ? verifier_result : null;

  // ── Gate 1: ledger ready ───────────────────────────────────
  if (!eff_ledger || eff_ledger.ledger_ready !== true) {
    return _blocked('POST_TAG_DECISION_BLOCKED_LEDGER', 'ledger_not_ready', {
      decision_id,
      ledger_verified:  false,
      created_at:       now,
    });
  }

  // ── Gate 2: verifier ready ─────────────────────────────────
  if (!eff_verifier || eff_verifier.verify_ready !== true) {
    return _blocked('POST_TAG_DECISION_BLOCKED_RECEIPT', 'verifier_not_ready', {
      decision_id,
      ledger_verified:  true,
      receipt_verified: false,
      created_at:       now,
    });
  }

  const is_real_tag     = eff_verifier.is_real_tag_verified === true;
  const target_tag      = eff_verifier.target_tag ?? null;
  const git_head        = eff_verifier.git_head   ?? null;

  let decision_status;
  let stable_review_phase_allowed;
  let safe_next_actions;

  if (is_real_tag) {
    decision_status              = 'POST_TAG_DECISION_REAL_TAG_CONFIRMED';
    stable_review_phase_allowed  = true;
    safe_next_actions            = [
      'create_next_phase_for_stable_review',
      'verify_tag_signature_if_applicable',
      'notify_team_of_confirmed_tag',
      'archive_execution_receipt',
      'review_audit_ledger_hash_chain',
    ];
  } else {
    decision_status              = 'POST_TAG_DECISION_DRY_RUN_CONFIRMED';
    stable_review_phase_allowed  = false;
    safe_next_actions            = [
      'repeat_dry_run_if_needed',
      'execute_real_tag_manually_when_ready',
      'verify_preflight_snapshot',
      'review_command_package',
    ];
  }

  return {
    schema_version:              SCHEMA_VERSION,
    decision_id,
    decision_status,
    decision_ready:              true,
    blocking_reason:             null,
    target_tag,
    git_head,
    real_tag_confirmed:          is_real_tag,
    stable_review_phase_allowed,
    blocked_actions:             BLOCKED_ACTIONS,
    safe_next_actions,
    ledger_verified:             true,
    receipt_verified:            true,
    created_at:                  now,
    ..._locked(),
  };
}

export function validatePostTagStabilizationDecisionMatrix(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  if (result.stable_review_phase_allowed === true && result.real_tag_confirmed !== true) {
    failures.push('stable_review_phase_allowed=true requires real_tag_confirmed=true');
  }
  return failures;
}

export function renderPostTagStabilizationDecisionMatrix(result) {
  if (!result) return 'post_tag_stabilization_decision_matrix: null';
  const lines = [
    `decision_status              : ${result.decision_status ?? 'UNKNOWN'}`,
    `decision_id                  : ${result.decision_id ?? 'none'}`,
    `decision_ready               : ${result.decision_ready ?? false}`,
    `target_tag                   : ${result.target_tag ?? 'none'}`,
    `real_tag_confirmed           : ${result.real_tag_confirmed ?? false}`,
    `stable_review_phase_allowed  : ${result.stable_review_phase_allowed ?? false}`,
    `stable_promoted              : false`,
    `deploy_performed             : false`,
    `release_performed            : false`,
    `actual_real_tag_created      : false`,
    `real_execution_not_performed : true`,
    `blocking_reason              : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.decision_ready) {
    lines.push('');
    lines.push('── SAFE NEXT ACTIONS ──────────────────────────────────────────');
    (result.safe_next_actions ?? []).forEach(a => lines.push(`  OK: ${a}`));
    lines.push('');
    lines.push('── BLOCKED ACTIONS ────────────────────────────────────────────');
    (result.blocked_actions ?? []).forEach(a => lines.push(`  BLOCKED: ${a}`));
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('post-tag-stabilization-decision-matrix.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildPostTagStabilizationDecisionMatrix({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderPostTagStabilizationDecisionMatrix(result));
  }

  process.exit(result.decision_ready ? 0 : 1);
}
