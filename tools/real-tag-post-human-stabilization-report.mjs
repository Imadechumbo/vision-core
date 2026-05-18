#!/usr/bin/env node
/**
 * Real Tag Post-Human Stabilization Report — V94.1
 *
 * Final stabilization report after human real tag operation.
 * 4 statuses: STAB_REPORT_BLOCKED_LEDGER, STAB_REPORT_BLOCKED_VERIFIER,
 *             STAB_REPORT_BLOCKED_HASH_CHAIN, STAB_REPORT_READY.
 *
 * REGRA ABSOLUTA: tag_created=false always. actual_real_tag_created=false always.
 * Report records state — does not create tags, deploy, promote, or release.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v94.1';

export const STAB_REPORT_STATUSES = [
  'STAB_REPORT_BLOCKED_LEDGER',
  'STAB_REPORT_BLOCKED_VERIFIER',
  'STAB_REPORT_BLOCKED_HASH_CHAIN',
  'STAB_REPORT_READY',
];

const BLOCKED_ACTIONS = [
  'deploy_to_production',
  'promote_to_stable',
  'release_to_users',
  'modify_git_history',
  'push_unsigned_tags',
];

const SAFE_NEXT_ACTIONS = [
  'archive_execution_receipt',
  'review_audit_ledger_hash_chain',
  'notify_team_of_tag_creation',
  'verify_tag_signature_if_applicable',
  'schedule_post_tag_smoke_tests',
  'update_release_tracking_system',
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
    schema_version:  SCHEMA_VERSION,
    report_status:   status,
    report_ready:    false,
    blocking_reason,
    blocked_actions:    BLOCKED_ACTIONS,
    safe_next_actions:  [],
    operation_summary:  null,
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagPostHumanStabilizationReport(params = {}) {
  const {
    fixture_mode     = false,
    ledger_result,
    verifier_result,
    _mock_timestamp,
  } = params ?? {};

  const now       = _mock_timestamp ?? new Date().toISOString();
  const report_id = _sha256(`stab-report:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  const eff_ledger   = fixture_mode ? { ledger_ready: true, hash_chain_valid: true, entry_count: 8 } : (ledger_result !== undefined ? ledger_result : null);
  const eff_verifier = fixture_mode ? { verifier_passed: true, verifier_status: 'VERIFIER_PASSED' } : (verifier_result !== undefined ? verifier_result : null);

  // ── Gate 1: Ledger ─────────────────────────────────────────
  if (!fixture_mode && (!eff_ledger || eff_ledger.ledger_ready !== true)) {
    return _blocked('STAB_REPORT_BLOCKED_LEDGER', 'ledger_not_ready', {
      report_id,
      ledger_verified:       false,
      verifier_verified:     false,
      hash_chain_verified:   false,
      created_at:            now,
    });
  }

  // ── Gate 2: Verifier ───────────────────────────────────────
  if (!fixture_mode && (!eff_verifier || eff_verifier.verifier_passed !== true)) {
    return _blocked('STAB_REPORT_BLOCKED_VERIFIER', 'verifier_not_passed', {
      report_id,
      ledger_verified:       true,
      verifier_verified:     false,
      hash_chain_verified:   false,
      created_at:            now,
    });
  }

  // ── Gate 3: Hash chain ─────────────────────────────────────
  if (!fixture_mode && eff_ledger.hash_chain_valid !== true) {
    return _blocked('STAB_REPORT_BLOCKED_HASH_CHAIN', 'hash_chain_invalid', {
      report_id,
      ledger_verified:       true,
      verifier_verified:     true,
      hash_chain_verified:   false,
      created_at:            now,
    });
  }

  const operation_summary = {
    operation_type:          'real_tag_creation',
    ledger_entries:          eff_ledger.entry_count ?? 0,
    verifier_status:         eff_verifier.verifier_status ?? 'VERIFIER_PASSED',
    deploy_to_production:    'BLOCKED',
    promote_to_stable:       'BLOCKED',
    release_to_users:        'BLOCKED',
    tag_created_by_report:   false,
    report_generated_at:     now,
  };

  return {
    schema_version:        SCHEMA_VERSION,
    report_id,
    report_status:         'STAB_REPORT_READY',
    report_ready:          true,
    blocking_reason:       null,
    ledger_verified:       true,
    verifier_verified:     true,
    hash_chain_verified:   true,
    blocked_actions:       BLOCKED_ACTIONS,
    safe_next_actions:     SAFE_NEXT_ACTIONS,
    operation_summary,
    created_at:            now,
    ..._locked(),
  };
}

export function renderStabilizationReport(result) {
  if (!result) return 'stab_report: null';
  const lines = [
    `report_status               : ${result.report_status ?? 'UNKNOWN'}`,
    `report_id                   : ${result.report_id ?? 'none'}`,
    `report_ready                : ${result.report_ready ?? false}`,
    `ledger_verified             : ${result.ledger_verified ?? false}`,
    `verifier_verified           : ${result.verifier_verified ?? false}`,
    `hash_chain_verified         : ${result.hash_chain_verified ?? false}`,
    `tag_created                 : false`,
    `actual_real_tag_created     : false`,
    `git_push_performed          : false`,
    `real_execution_not_performed: true`,
    `blocking_reason             : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.report_ready) {
    lines.push('');
    lines.push('── OPERATION SUMMARY ─────────────────────────────────────');
    const s = result.operation_summary ?? {};
    lines.push(`  operation_type       : ${s.operation_type ?? 'unknown'}`);
    lines.push(`  ledger_entries       : ${s.ledger_entries ?? 0}`);
    lines.push(`  deploy_to_production : ${s.deploy_to_production ?? 'BLOCKED'}`);
    lines.push(`  promote_to_stable    : ${s.promote_to_stable ?? 'BLOCKED'}`);
    lines.push(`  release_to_users     : ${s.release_to_users ?? 'BLOCKED'}`);
    lines.push('');
    lines.push('── BLOCKED ACTIONS ───────────────────────────────────────');
    (result.blocked_actions ?? []).forEach(a => lines.push(`  BLOCKED: ${a}`));
    lines.push('');
    lines.push('── SAFE NEXT ACTIONS ─────────────────────────────────────');
    (result.safe_next_actions ?? []).forEach(a => lines.push(`  OK: ${a}`));
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-post-human-stabilization-report.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagPostHumanStabilizationReport({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderStabilizationReport(result));
  }

  process.exit(result.report_ready ? 0 : 1);
}
