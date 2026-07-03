#!/usr/bin/env node
/**
 * Manual Release Execution Preflight — V47.0
 *
 * Verifies all prerequisites before any manual release action.
 * Does NOT execute any release, deploy, tag, or stable promotion.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 */

import { sha256, makeLockedFlags } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v47.0';

export const PREFLIGHT_STATUSES = [
  'PREFLIGHT_BLOCKED_REQUEST',
  'PREFLIGHT_BLOCKED_AUTHORITY',
  'PREFLIGHT_BLOCKED_EVIDENCE',
  'PREFLIGHT_BLOCKED_TESTS',
  'PREFLIGHT_BLOCKED_CI',
  'PREFLIGHT_BLOCKED_ROLLBACK',
  'PREFLIGHT_BLOCKED_AUDIT',
  'PREFLIGHT_READY',
];

function _sha256(input) {
  return sha256(input);
}

function _locked() {
  return makeLockedFlags([
    'release_execution_allowed',
    'deploy_allowed',
    'promotion_allowed',
    'stable_allowed',
    'tag_allowed',
    'release_performed',
    'tag_created',
    'stable_promoted',
    'deploy_performed',
  ]);
}

function _blocked(status, reason = 'blocked', extra = {}) {
  return {
    schema_version:                  SCHEMA_VERSION,
    manual_release_preflight_status: status,
    manual_release_preflight_ready:  false,
    preflight_checklist:             null,
    missing_requirements:            [reason],
    execution_plan_preview:          null,
    blocking_reason:                 reason,
    ...extra,
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
 * Run manual release execution preflight.
 */
export function runManualReleaseExecutionPreflight(params = {}) {
  const {
    manual_release_request,
    request_authority_binding,
    supervised_rc_result,
    promotion_package_result,
    manual_review_result,
    rollback_plan_present,
    audit_ledger_present,
    ci_status_verified,
    full_test_pass,
    go_test_pass,
    go_build_pass,
    explicit_preflight_requested,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const preflight_id = _sha256(`preflight:fixture:${now}`).slice(0, 32);
    const checklist = _buildChecklist({
      request_valid:              true,
      authority_ready:            true,
      evidence_ready:             true,
      tests_pass:                 true,
      ci_verified:                true,
      rollback_present:           true,
      audit_present:              true,
      request: { target_version: '0.0.0-fixture', target_branch: 'main', git_head: `fixture-head-${_sha256('head'+now).slice(0,12)}`, evidence_source: 'go-core' },
    });

    return {
      schema_version:                  SCHEMA_VERSION,
      manual_release_preflight_status: 'PREFLIGHT_READY',
      manual_release_preflight_ready:  true,
      preflight_id,
      preflight_checklist:             checklist,
      missing_requirements:            [],
      execution_plan_preview:          _buildExecutionPlan({ target_version: '0.0.0-fixture', target_branch: 'main' }),
      target_version:                  '0.0.0-fixture',
      target_branch:                   'main',
      git_head:                        `fixture-head-${_sha256('head'+now).slice(0,12)}`,
      evidence_source:                 'go-core',
      blocking_reason:                 null,
      ..._locked(),
    };
  }

  // Live: validate all prerequisites
  if (!explicit_preflight_requested) {
    return _blocked('PREFLIGHT_BLOCKED_REQUEST', 'explicit_preflight_requested_required');
  }

  if (!manual_release_request || manual_release_request.manual_release_request_valid !== true) {
    return _blocked('PREFLIGHT_BLOCKED_REQUEST', 'manual_release_request_not_valid');
  }

  if (!request_authority_binding || request_authority_binding.request_authority_binding_ready !== true) {
    return _blocked('PREFLIGHT_BLOCKED_AUTHORITY', 'request_authority_binding_not_ready');
  }

  const evidence_source = manual_release_request.evidence_source;
  const evidence_receipt_id = manual_release_request.evidence_receipt_id;
  if (!evidence_source || evidence_source !== 'go-core' || !evidence_receipt_id) {
    return _blocked('PREFLIGHT_BLOCKED_EVIDENCE', 'evidence_source_or_receipt_missing');
  }

  if (!supervised_rc_result || supervised_rc_result.supervised_release_candidate_ready !== true) {
    return _blocked('PREFLIGHT_BLOCKED_EVIDENCE', 'supervised_rc_not_ready');
  }

  if (full_test_pass !== true || go_test_pass !== true || go_build_pass !== true) {
    const missing = [];
    if (!full_test_pass) missing.push('full_test_pass');
    if (!go_test_pass)   missing.push('go_test_pass');
    if (!go_build_pass)  missing.push('go_build_pass');
    return _blocked('PREFLIGHT_BLOCKED_TESTS', `tests_not_passing:${missing.join(',')}`, { missing_requirements: missing });
  }

  if (ci_status_verified !== true) {
    return _blocked('PREFLIGHT_BLOCKED_CI', 'ci_status_not_verified');
  }

  if (rollback_plan_present !== true) {
    return _blocked('PREFLIGHT_BLOCKED_ROLLBACK', 'rollback_plan_required');
  }

  if (audit_ledger_present !== true) {
    return _blocked('PREFLIGHT_BLOCKED_AUDIT', 'audit_ledger_required');
  }

  const target_version = manual_release_request.target_version;
  const target_branch  = manual_release_request.target_branch;
  const git_head       = manual_release_request.git_head;

  if (!target_version || !target_branch || !git_head) {
    return _blocked('PREFLIGHT_BLOCKED_REQUEST', 'target_version_branch_head_required');
  }

  const preflight_id = _sha256(`preflight:${manual_release_request.request_id}:${now}`).slice(0, 32);
  const checklist = _buildChecklist({
    request_valid:    true,
    authority_ready:  true,
    evidence_ready:   true,
    tests_pass:       true,
    ci_verified:      true,
    rollback_present: true,
    audit_present:    true,
    request: { target_version, target_branch, git_head, evidence_source },
  });

  return {
    schema_version:                  SCHEMA_VERSION,
    manual_release_preflight_status: 'PREFLIGHT_READY',
    manual_release_preflight_ready:  true,
    preflight_id,
    preflight_checklist:             checklist,
    missing_requirements:            [],
    execution_plan_preview:          _buildExecutionPlan({ target_version, target_branch }),
    target_version,
    target_branch,
    git_head,
    evidence_source:                 'go-core',
    blocking_reason:                 null,
    ..._locked(),
  };
}

function _buildChecklist(state) {
  return {
    manual_release_request_valid:       state.request_valid ?? false,
    request_authority_binding_ready:    state.authority_ready ?? false,
    evidence_source_go_core:            state.evidence_ready ?? false,
    supervised_release_candidate_ready: state.evidence_ready ?? false,
    full_test_pass:                     state.tests_pass ?? false,
    go_test_pass:                       state.tests_pass ?? false,
    go_build_pass:                      state.tests_pass ?? false,
    ci_status_verified:                 state.ci_verified ?? false,
    rollback_plan_present:              state.rollback_present ?? false,
    audit_ledger_present:               state.audit_present ?? false,
    git_head_present:                   !!(state.request?.git_head),
    target_version_present:             !!(state.request?.target_version),
    target_branch_present:              !!(state.request?.target_branch),
  };
}

function _buildExecutionPlan(params) {
  return {
    step_1: 'verify_git_head',
    step_2: 'verify_target_branch',
    step_3: 'verify_evidence_receipt',
    step_4: 'verify_release_package',
    step_5: `simulate_tag_creation: ${params.target_version ?? 'unknown'}`,
    step_6: `simulate_stable_promotion: ${params.target_branch ?? 'unknown'}`,
    step_7: 'simulate_release_notes',
    step_8: 'simulate_rollback_anchor',
    note:   'DRY RUN ONLY — no real tag, deploy, or stable promotion',
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('manual-release-execution-preflight.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runManualReleaseExecutionPreflight({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const lines = [
      `manual_release_preflight_status: ${result.manual_release_preflight_status}`,
      `manual_release_preflight_ready : ${result.manual_release_preflight_ready}`,
      `release_execution_allowed      : false`,
      `deploy_allowed                 : false`,
      `blocking_reason                : ${result.blocking_reason ?? 'none'}`,
    ];
    console.log(lines.join('\n'));
  }

  process.exit(result.manual_release_preflight_ready ? 0 : 1);
}
