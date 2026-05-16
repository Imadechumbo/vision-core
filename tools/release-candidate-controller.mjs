#!/usr/bin/env node
/**
 * Release Candidate Dry-Run Controller — V15.13
 *
 * Evaluates whether a mission qualifies as a release candidate.
 * ALL evaluation is dry-run only — no release, no tag, no deploy, no stable.
 *
 * REGRA ABSOLUTA:
 * - release_candidate_allowed is a classification, not an execution grant.
 * - deploy_allowed/tag_allowed/stable_allowed/promotion_allowed always false.
 * - release_candidate_dry_run_only always true.
 */

const SCHEMA_VERSION = 'v15.13';

// ═══════════════════════════════════════════════════════════════════
// RC STATUS CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const RC_STATUSES = [
  'RC_BLOCKED_EVIDENCE',
  'RC_BLOCKED_AUTHORITY',
  'RC_BLOCKED_TESTS',
  'RC_BLOCKED_GIT_DIRTY',
  'RC_BLOCKED_POLICY',
  'RC_DRY_RUN_READY',
];

// Priority order for selecting primary blocker
const RC_BLOCKER_PRIORITY = [
  'RC_BLOCKED_GIT_DIRTY',
  'RC_BLOCKED_EVIDENCE',
  'RC_BLOCKED_AUTHORITY',
  'RC_BLOCKED_TESTS',
  'RC_BLOCKED_POLICY',
];

// ═══════════════════════════════════════════════════════════════════
// EVALUATE RELEASE CANDIDATE
// ═══════════════════════════════════════════════════════════════════

/**
 * Evaluates release candidate readiness in dry-run mode.
 *
 * @param {Object} input
 * @param {Object} input.harnessState      - PI Harness runtime state (s)
 * @param {Object} input.passGoldBinding   - Result from evaluatePassGoldAuthorityBinding
 * @param {boolean} input.gitClean         - Working tree is clean (no uncommitted changes)
 * @param {boolean} input.testsPassed      - JS/PI tests passed
 * @param {boolean} input.goTestsPassed    - Go tests passed
 * @param {string}  input.branch           - Current git branch
 * @param {Object}  input.evidenceReceipt  - { id, source } from runtime probe
 */
function evaluateReleaseCandidate(input = {}) {
  const {
    harnessState:    _hs = {},
    passGoldBinding = null,
    gitClean        = false,
    testsPassed     = false,
    goTestsPassed   = false,
    branch          = null,
    evidenceReceipt = null,
  } = input;
  const harnessState = _hs || {};

  const blockers = [];

  // ── 1. Git clean ─────────────────────────────────────────────────
  if (!gitClean) {
    blockers.push('RC_BLOCKED_GIT_DIRTY');
  }

  // ── 2. Evidence check ─────────────────────────────────────────────
  const evidenceId     = evidenceReceipt?.id     || harnessState.goRuntimeEvidenceId || null;
  const evidenceSource = evidenceReceipt?.source  || harnessState.evidenceSource      || null;
  const evidenceOk     = !!evidenceId && evidenceSource === 'go-core';
  if (!evidenceOk) {
    blockers.push('RC_BLOCKED_EVIDENCE');
  }

  // ── 3. Authority / binding check ─────────────────────────────────
  const bindingStatus = passGoldBinding?.pass_gold_authority_binding_status;
  const bindingReady  = bindingStatus === 'BINDING_READY';
  if (!bindingReady) {
    blockers.push('RC_BLOCKED_AUTHORITY');
  }

  // ── 4. Tests check ───────────────────────────────────────────────
  if (!testsPassed) {
    blockers.push('RC_BLOCKED_TESTS');
  }

  // ── Determine primary status ─────────────────────────────────────
  let status;
  if (blockers.length === 0) {
    status = 'RC_DRY_RUN_READY';
  } else {
    status = RC_BLOCKER_PRIORITY.find(p => blockers.includes(p)) || blockers[0];
  }

  const rcAllowed = status === 'RC_DRY_RUN_READY';

  return {
    release_candidate_dry_run_enabled: true,
    release_candidate_schema_version:  SCHEMA_VERSION,
    release_candidate_status:          status,
    release_candidate_allowed:         rcAllowed,
    release_candidate_dry_run_only:    true,
    release_candidate_blockers:        blockers,
    release_candidate_plan:            rcAllowed ? _buildRcPlan(input, evidenceId, evidenceSource) : null,
    release_candidate_required_evidence: _requiredEvidence(harnessState, evidenceId, evidenceSource),
    // Invariants — always false
    deploy_allowed:    false,
    tag_allowed:       false,
    stable_allowed:    false,
    promotion_allowed: false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// BUILD RC PLAN (only when RC_DRY_RUN_READY)
// ═══════════════════════════════════════════════════════════════════

function _buildRcPlan(input, evidenceId, evidenceSource) {
  return {
    schema_version:       SCHEMA_VERSION,
    plan_id:              `rc_plan_${Date.now()}`,
    branch:               input.branch || null,
    evidence_receipt_id:  evidenceId,
    evidence_source:      evidenceSource,
    binding_status:       input.passGoldBinding?.pass_gold_authority_binding_status || null,
    steps: [
      'validate_evidence_receipt',
      'validate_authority_binding',
      'validate_tests_pass',
      'validate_git_clean',
      'classify_as_release_candidate',
    ],
    // Explicit declarations — no execution
    deploy_performed:   false,
    tag_created:        false,
    stable_promoted:    false,
    note: 'RC plan is classification only — no tag, no deploy, no stable in V15.13',
  };
}

// ═══════════════════════════════════════════════════════════════════
// DERIVE REQUIRED EVIDENCE LIST
// ═══════════════════════════════════════════════════════════════════

function _requiredEvidence(harnessState, evidenceId, evidenceSource) {
  const required = [];
  if (!evidenceId)                           required.push('evidence_receipt_id');
  if (evidenceSource !== 'go-core')          required.push('evidence_source_go_core');
  if (!harnessState.runtimeProbePass)        required.push('runtime_probe_pass');
  if (!harnessState.backendAlive)            required.push('backend_alive');
  if (!harnessState.fakeEvidenceAbsent)      required.push('no_fake_evidence');
  return required;
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export {
  evaluateReleaseCandidate,
  RC_STATUSES,
  RC_BLOCKER_PRIORITY,
  SCHEMA_VERSION as RC_SCHEMA_VERSION,
};
