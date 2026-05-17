#!/usr/bin/env node
/**
 * Manual Release Handoff Package — V48.0
 *
 * Creates the final handoff package for human review before any release.
 * Does NOT execute any release, deploy, tag, or stable promotion.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v48.0';

export const HANDOFF_STATUSES = [
  'HANDOFF_BLOCKED_PREFLIGHT',
  'HANDOFF_BLOCKED_DRY_RUN',
  'HANDOFF_BLOCKED_EVIDENCE',
  'HANDOFF_BLOCKED_HASH',
  'HANDOFF_READY',
];

export const BLOCKED_ACTIONS = [
  'auto_deploy',
  'auto_tag',
  'auto_stable_promotion',
  'evidence_override',
  'go_core_override',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    release_execution_allowed: false,
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
  };
}

function _blocked(status, reason = 'blocked') {
  return {
    schema_version:          SCHEMA_VERSION,
    handoff_status:          status,
    handoff_ready:           false,
    handoff_id:              null,
    package_hash:            null,
    blocking_reason:         reason,
    local_only:              true,
    manual_only:             true,
    blocked_actions:         BLOCKED_ACTIONS,
    ..._locked(),
    release_execution_allowed: false,
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Build manual release handoff package.
 */
export function buildManualReleaseHandoffPackage(params = {}) {
  const {
    preflight_result,
    dry_run_result,
    manual_release_request,
    human_confirmation,
    request_authority_binding,
    supervised_rc_result,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    return _buildFixtureHandoff(now);
  }

  // Preflight required
  if (!preflight_result || preflight_result.manual_release_preflight_ready !== true) {
    return _blocked('HANDOFF_BLOCKED_PREFLIGHT', 'preflight_not_ready');
  }

  // Dry-run required
  if (!dry_run_result || dry_run_result.manual_release_dry_run_ready !== true) {
    return _blocked('HANDOFF_BLOCKED_DRY_RUN', 'dry_run_not_ready');
  }

  // Evidence must be go-core
  const evidence_source     = preflight_result.evidence_source ?? manual_release_request?.evidence_source;
  const evidence_receipt_id = preflight_result.evidence_receipt_id ?? manual_release_request?.evidence_receipt_id;

  if (!evidence_source || evidence_source !== 'go-core') {
    return _blocked('HANDOFF_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core');
  }
  if (!evidence_receipt_id) {
    return _blocked('HANDOFF_BLOCKED_EVIDENCE', 'evidence_receipt_id_required');
  }

  const request_id       = manual_release_request?.request_id        ?? preflight_result.preflight_id;
  const confirmation_id  = human_confirmation?.confirmation_id        ?? null;
  const authority_id     = request_authority_binding?.binding_id      ?? null;
  const preflight_id     = preflight_result.preflight_id;
  const dry_run_report_id = dry_run_result.dry_run_report_id;
  const rc_id            = supervised_rc_result?.rc_id                ?? null;
  const target_version   = preflight_result.target_version            ?? dry_run_result.target_version;
  const target_branch    = preflight_result.target_branch             ?? dry_run_result.target_branch;
  const git_head         = preflight_result.git_head                  ?? dry_run_result.git_head;
  const simulated_tag    = dry_run_result.simulated_tag_name;
  const simulated_stable = dry_run_result.simulated_stable_target;
  const rollback_anchor  = dry_run_result.simulated_rollback_anchor;

  // Build deterministic package hash
  const hash_input = [request_id, confirmation_id, preflight_id, dry_run_report_id, evidence_receipt_id, now].join(':');
  let package_hash;
  try {
    package_hash = _sha256(hash_input).slice(0, 48);
  } catch (e) {
    return _blocked('HANDOFF_BLOCKED_HASH', `hash_failed:${e.message}`);
  }

  const handoff_id = _sha256(`handoff:${request_id}:${now}`).slice(0, 32);

  const checklist = preflight_result.preflight_checklist ?? null;

  const human_next_actions = [
    '1. Review the dry-run execution plan',
    '2. Verify evidence receipt with Go Core',
    '3. Confirm rollback anchor is saved',
    '4. If approved, execute manually with explicit human action',
    '5. Do NOT use automated tooling for the release',
  ];

  return {
    schema_version:          SCHEMA_VERSION,
    handoff_status:          'HANDOFF_READY',
    handoff_ready:           true,
    handoff_id,
    package_hash,
    request_id,
    confirmation_id,
    authority_binding_id:    authority_id,
    preflight_id,
    dry_run_report_id,
    supervised_rc_id:        rc_id,
    evidence_package_id:     supervised_rc_result?.evidence_package_id ?? null,
    evidence_receipt_id,
    evidence_source:         'go-core',
    target_version,
    target_branch,
    git_head,
    simulated_tag_name:      simulated_tag,
    simulated_stable_target: simulated_stable,
    rollback_anchor,
    checklist,
    human_next_actions,
    blocked_actions:         BLOCKED_ACTIONS,
    local_only:              true,
    manual_only:             true,
    blocking_reason:         null,
    ..._locked(),
  };
}

function _buildFixtureHandoff(now) {
  const request_id      = `fixture-req-${_sha256('req'+now).slice(0,16)}`;
  const confirmation_id = `fixture-conf-${_sha256('conf'+now).slice(0,16)}`;
  const preflight_id    = `fixture-pf-${_sha256('pf'+now).slice(0,16)}`;
  const dry_run_id      = `fixture-dr-${_sha256('dr'+now).slice(0,16)}`;
  const evidence_rcpt   = `fixture-rcpt-${_sha256('rcpt'+now).slice(0,16)}`;

  const hash_input = [request_id, confirmation_id, preflight_id, dry_run_id, evidence_rcpt, now].join(':');
  const package_hash = _sha256(hash_input).slice(0, 48);
  const handoff_id   = _sha256(`handoff:${request_id}:${now}`).slice(0, 32);

  return {
    schema_version:          SCHEMA_VERSION,
    handoff_status:          'HANDOFF_READY',
    handoff_ready:           true,
    handoff_id,
    package_hash,
    request_id,
    confirmation_id,
    authority_binding_id:    `fixture-auth-${_sha256('auth'+now).slice(0,16)}`,
    preflight_id,
    dry_run_report_id:       dry_run_id,
    supervised_rc_id:        `fixture-rc-${_sha256('rc'+now).slice(0,16)}`,
    evidence_package_id:     `fixture-evpkg-${_sha256('evpkg'+now).slice(0,16)}`,
    evidence_receipt_id:     evidence_rcpt,
    evidence_source:         'go-core',
    target_version:          '0.0.0-fixture',
    target_branch:           'main',
    git_head:                `fixture-head-${_sha256('head'+now).slice(0,12)}`,
    simulated_tag_name:      'v0.0.0-fixture',
    simulated_stable_target: 'main',
    rollback_anchor:         _sha256('rollback'+now).slice(0,24),
    checklist:               null,
    human_next_actions: [
      '1. Review the dry-run execution plan',
      '2. Verify evidence receipt with Go Core',
      '3. Confirm rollback anchor is saved',
      '4. If approved, execute manually with explicit human action',
      '5. Do NOT use automated tooling for the release',
    ],
    blocked_actions:         BLOCKED_ACTIONS,
    local_only:              true,
    manual_only:             true,
    blocking_reason:         null,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('manual-release-handoff-package.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildManualReleaseHandoffPackage({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const lines = [
      `handoff_status            : ${result.handoff_status}`,
      `handoff_ready             : ${result.handoff_ready}`,
      `handoff_id                : ${result.handoff_id ?? 'none'}`,
      `package_hash              : ${result.package_hash ?? 'none'}`,
      `evidence_source           : ${result.evidence_source ?? 'none'}`,
      `release_execution_allowed : false`,
      `deploy_allowed            : false`,
      `tag_created               : false`,
      `stable_promoted           : false`,
      `blocking_reason           : ${result.blocking_reason ?? 'none'}`,
    ];
    console.log(lines.join('\n'));
  }

  process.exit(result.handoff_ready ? 0 : 1);
}
