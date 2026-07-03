#!/usr/bin/env node
/**
 * Manual Release Dry-Run Executor — V47.1
 *
 * Simulates all manual release steps without executing any real commands.
 * No real tags, pushes, deploys, or stable promotions are performed.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 */

import { sha256, makeLockedFlags } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v47.1';

export const DRY_RUN_STATUSES = [
  'DRY_RUN_BLOCKED_PREFLIGHT',
  'DRY_RUN_BLOCKED_EVIDENCE',
  'DRY_RUN_BLOCKED_GIT',
  'DRY_RUN_READY',
];

export const DRY_RUN_STEPS = [
  'verify_preflight_ready',
  'verify_git_head',
  'verify_target_branch',
  'verify_evidence_receipt',
  'verify_release_package',
  'simulate_tag_creation',
  'simulate_stable_promotion',
  'simulate_release_notes',
  'simulate_rollback_anchor',
  'write_dry_run_report',
];

function _sha256(input) {
  return sha256(input);
}

function _locked() {
  return makeLockedFlags([
    'release_performed',
    'tag_created',
    'stable_promoted',
    'deploy_performed',
    'deploy_allowed',
    'promotion_allowed',
    'stable_allowed',
    'tag_allowed',
  ]);
}

function _blocked(status, reason = 'blocked') {
  return {
    schema_version:                   SCHEMA_VERSION,
    manual_release_dry_run_status:    status,
    manual_release_dry_run_ready:     false,
    dry_run_steps:                    null,
    dry_run_report_id:                null,
    simulated_tag_name:               null,
    simulated_stable_target:          null,
    simulated_release_notes:          null,
    simulated_rollback_anchor:        null,
    local_only:                       true,
    blocking_reason:                  reason,
    ..._locked(),
    release_performed:  false,
    tag_created:        false,
    stable_promoted:    false,
    deploy_performed:   false,
    deploy_allowed:     false,
    promotion_allowed:  false,
    stable_allowed:     false,
    tag_allowed:        false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Execute manual release dry-run.
 */
export function runManualReleaseDryRun(params = {}) {
  const {
    preflight_result,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const target_version   = preflight_result?.target_version   ?? '0.0.0-fixture';
    const target_branch    = preflight_result?.target_branch    ?? 'main';
    const git_head         = preflight_result?.git_head         ?? `fixture-head-${_sha256('head'+now).slice(0,12)}`;
    const evidence_receipt = preflight_result?.evidence_receipt_id ?? `fixture-receipt-${_sha256('receipt'+now).slice(0,12)}`;

    return _buildReadyResult({ target_version, target_branch, git_head, evidence_receipt, now });
  }

  // Preflight required
  if (!preflight_result || preflight_result.manual_release_preflight_ready !== true) {
    return _blocked('DRY_RUN_BLOCKED_PREFLIGHT', 'preflight_not_ready');
  }

  const evidence_source  = preflight_result.evidence_source;
  const evidence_receipt = preflight_result.evidence_receipt_id ?? null;

  if (!evidence_source || evidence_source !== 'go-core' || !evidence_receipt) {
    return _blocked('DRY_RUN_BLOCKED_EVIDENCE', 'evidence_source_or_receipt_missing');
  }

  const git_head      = preflight_result.git_head;
  const target_branch = preflight_result.target_branch;
  const target_version = preflight_result.target_version;

  if (!git_head || !target_branch || !target_version) {
    return _blocked('DRY_RUN_BLOCKED_GIT', 'git_head_branch_version_required');
  }

  return _buildReadyResult({ target_version, target_branch, git_head, evidence_receipt, now });
}

function _buildReadyResult({ target_version, target_branch, git_head, evidence_receipt, now }) {
  const dry_run_report_id     = _sha256(`dry-run:${target_version}:${git_head}:${now}`).slice(0, 32);
  const simulated_tag_name    = `v${target_version}`;
  const simulated_stable_target = target_branch;
  const simulated_rollback_anchor = _sha256(`rollback:${git_head}:${now}`).slice(0, 24);

  const simulated_release_notes = {
    version:           target_version,
    branch:            target_branch,
    git_head,
    evidence_receipt,
    generated_at:      now,
    type:              'SIMULATED_DRY_RUN',
    note:              'DRY RUN ONLY — not a real release',
  };

  const dry_run_steps = DRY_RUN_STEPS.map(step => ({
    step,
    status:     'SIMULATED',
    executed:   false,
    real_action: false,
  }));

  return {
    schema_version:                 SCHEMA_VERSION,
    manual_release_dry_run_status:  'DRY_RUN_READY',
    manual_release_dry_run_ready:   true,
    dry_run_report_id,
    dry_run_steps,
    simulated_tag_name,
    simulated_stable_target,
    simulated_release_notes,
    simulated_rollback_anchor,
    target_version,
    target_branch,
    git_head,
    evidence_receipt_id: evidence_receipt,
    local_only:          true,
    blocking_reason:     null,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('manual-release-dry-run-executor.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runManualReleaseDryRun({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const lines = [
      `manual_release_dry_run_status : ${result.manual_release_dry_run_status}`,
      `manual_release_dry_run_ready  : ${result.manual_release_dry_run_ready}`,
      `simulated_tag_name            : ${result.simulated_tag_name ?? 'none'}`,
      `simulated_stable_target       : ${result.simulated_stable_target ?? 'none'}`,
      `release_performed             : false`,
      `tag_created                   : false`,
      `stable_promoted               : false`,
      `deploy_performed              : false`,
      `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
    ];
    console.log(lines.join('\n'));
  }

  process.exit(result.manual_release_dry_run_ready ? 0 : 1);
}
