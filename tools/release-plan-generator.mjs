#!/usr/bin/env node
/**
 * Release Plan Generator — V15.14
 *
 * Generates an auditable, immutable release plan.
 * The plan describes what a release would require — it does NOT execute anything.
 *
 * REGRA ABSOLUTA:
 * - deploy_performed=false always.
 * - tag_created=false always.
 * - stable_promoted=false always.
 * - Plan is classification/documentation only — not an execution grant.
 * - All allowed flags remain false.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v15.14';

// ═══════════════════════════════════════════════════════════════════
// PLAN STATUS CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const PLAN_STATUSES = [
  'PLAN_BLOCKED_NO_CANDIDATE',   // RC not ready
  'PLAN_BLOCKED_NO_EVIDENCE',    // evidence missing
  'PLAN_BLOCKED_NO_AUTHORITY',   // authority binding missing
  'PLAN_BLOCKED_POLICY',         // policy violation
  'PLAN_READY',                  // plan fully generated, pending manual execution
];

// ═══════════════════════════════════════════════════════════════════
// GENERATE RELEASE PLAN
// ═══════════════════════════════════════════════════════════════════

/**
 * Generates an auditable release plan from harness evaluation results.
 *
 * @param {Object} input
 * @param {Object} input.releaseCandidateResult - From evaluateReleaseCandidate()
 * @param {Object} input.passGoldBinding        - From evaluatePassGoldAuthorityBinding()
 * @param {Object} input.authorityGate          - From evaluateAuthorityReviewGate()
 * @param {Object} input.harnessState           - PI Harness runtime state (s)
 * @param {string} input.gitHead                - Current git HEAD SHA
 * @param {string} input.branch                 - Current branch name
 * @param {string} input.authorityContractId    - Authority contract ID if present
 */
function generateReleasePlan(input = {}) {
  const {
    releaseCandidateResult: _rc = null,
    passGoldBinding:        _pg = null,
    authorityGate:          _ag = null,
    harnessState:           _hs = {},
    gitHead                     = null,
    branch                      = null,
    authorityContractId         = null,
  } = input;

  const hs = _hs || {};

  // ── Evaluate preconditions ───────────────────────────────────────
  const rcStatus       = _rc?.release_candidate_status        || null;
  const rcReady        = rcStatus === 'RC_DRY_RUN_READY';
  const evidenceId     = hs.goRuntimeEvidenceId               || _pg?.pass_gold_binding_evidence_receipt_id || null;
  const evidenceSource = hs.evidenceSource                    || _pg?.pass_gold_binding_evidence_source     || null;
  const evidenceOk     = !!evidenceId && evidenceSource === 'go-core';
  const bindingReady   = _pg?.pass_gold_authority_binding_status === 'BINDING_READY';
  const contractId     = authorityContractId                  || _pg?.pass_gold_binding_contract_id        || _ag?.approved_actions?.length > 0 ? (_pg?.pass_gold_binding_contract_id || null) : null;

  // ── Determine plan status ────────────────────────────────────────
  let planStatus;
  if (!rcReady) {
    planStatus = 'PLAN_BLOCKED_NO_CANDIDATE';
  } else if (!evidenceOk) {
    planStatus = 'PLAN_BLOCKED_NO_EVIDENCE';
  } else if (!bindingReady) {
    planStatus = 'PLAN_BLOCKED_NO_AUTHORITY';
  } else {
    planStatus = 'PLAN_READY';
  }

  const planReady = planStatus === 'PLAN_READY';
  const planId    = _buildPlanId(gitHead, branch, evidenceId);
  const createdAt = new Date().toISOString();

  const plan = {
    schema_version:            SCHEMA_VERSION,
    release_plan_id:           planId,
    release_plan_status:       planStatus,
    release_plan_ready:        planReady,
    created_at:                createdAt,
    git_head:                  gitHead,
    branch:                    branch,
    candidate_status:          rcStatus,
    evidence_receipt_id:       evidenceId,
    evidence_source:           evidenceSource,
    authority_contract_id:     contractId,
    authority_binding_status:  _pg?.pass_gold_authority_binding_status  || null,
    authority_reviewer:        _pg?.pass_gold_binding_reviewer           || null,

    // ── Manual steps required (human must perform) ───────────────
    required_manual_steps: _buildRequiredManualSteps(planReady, hs),

    // ── Steps that must NEVER happen automatically ───────────────
    forbidden_automatic_steps: [
      'create_github_release_tag',
      'push_to_stable_branch',
      'execute_production_deploy',
      'override_pass_gold',
      'create_evidence_artificially',
      'promote_stable_without_human_approval',
    ],

    // ── Rollback plan ────────────────────────────────────────────
    rollback_plan: _buildRollbackPlan(branch, gitHead, evidenceId),

    // ── Validation plan ──────────────────────────────────────────
    validation_plan: _buildValidationPlan(hs),

    // ── Risk summary ─────────────────────────────────────────────
    risk_summary: _buildRiskSummary(planReady, _rc, _pg, hs),

    // ── Approval requirements ────────────────────────────────────
    approval_requirements: _buildApprovalRequirements(planReady, _ag),

    // Explicit invariants — always false
    deploy_performed:   false,
    tag_created:        false,
    stable_promoted:    false,
    deploy_allowed:     false,
    tag_allowed:        false,
    stable_allowed:     false,
    release_allowed:    false,
    promotion_allowed:  false,

    note: 'Release plan is auditable documentation only — no tag, no deploy, no stable in V15.14',
  };

  return plan;
}

// ═══════════════════════════════════════════════════════════════════
// PLAN ID
// ═══════════════════════════════════════════════════════════════════

function _buildPlanId(gitHead, branch, evidenceId) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const raw   = `${gitHead || 'unknown'}:${branch || 'unknown'}:${evidenceId || 'none'}:${Date.now()}:${nonce}`;
  const hash  = createHash('sha256').update(raw).digest('hex').slice(0, 12);
  return `plan_${hash}`;
}

// ═══════════════════════════════════════════════════════════════════
// REQUIRED MANUAL STEPS
// ═══════════════════════════════════════════════════════════════════

function _buildRequiredManualSteps(planReady, hs) {
  const steps = [
    { id: 'verify_pass_gold_real',          required: true,  description: 'Confirm PASS GOLD came from real Go Core evidence — not human approval alone' },
    { id: 'verify_evidence_receipt_real',   required: true,  description: 'Confirm evidence_receipt.source = go-core and receipt ID is from real runtime probe' },
    { id: 'verify_authority_binding_valid', required: true,  description: 'Confirm authority binding status = BINDING_READY with approved contract' },
    { id: 'verify_tests_full_pass',         required: true,  description: 'Run npm run test:full and npm run test:go — confirm 0 failures' },
    { id: 'verify_working_tree_clean',      required: true,  description: 'Confirm git status shows nothing to commit, working tree clean' },
    { id: 'review_rollback_plan',           required: true,  description: 'Human must review rollback_plan before any release action' },
    { id: 'human_release_approval',         required: true,  description: 'Release requires explicit human approval — no automatic release' },
    { id: 'confirm_no_auto_deploy',         required: true,  description: 'Confirm no automatic deploy will occur — all deployments are manual' },
  ];
  if (!planReady) {
    steps.unshift({ id: 'resolve_plan_blockers', required: true, description: 'Resolve all PLAN_BLOCKED conditions before proceeding' });
  }
  if (!hs.runtimeProbePass) {
    steps.push({ id: 'run_runtime_probe', required: true, description: 'Run pi-harness with --runtime-probe to validate live backend' });
  }
  return steps;
}

// ═══════════════════════════════════════════════════════════════════
// ROLLBACK PLAN
// ═══════════════════════════════════════════════════════════════════

function _buildRollbackPlan(branch, gitHead, evidenceId) {
  return {
    schema_version:    SCHEMA_VERSION,
    rollback_target:   gitHead || null,
    rollback_branch:   branch  || null,
    evidence_snapshot: evidenceId || null,
    steps: [
      { id: 'snapshot_current_state',      description: 'Record current git HEAD, branch, and evidence receipt before any release action' },
      { id: 'prepare_rollback_commit',     description: 'Identify rollback target commit — must be a verified PASS GOLD state' },
      { id: 'validate_rollback_integrity', description: 'Verify rollback target passes test:full and test:go' },
      { id: 'document_rollback_reason',    description: 'Document why rollback is needed in release audit ledger' },
      { id: 'execute_rollback_manually',   description: 'Human executes rollback — no automatic rollback in V15.14' },
    ],
    rollback_performed: false,
    rollback_tested:    false,
    note: 'Rollback plan is documentation only — no automatic rollback in V15.14',
  };
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION PLAN
// ═══════════════════════════════════════════════════════════════════

function _buildValidationPlan(hs) {
  return {
    schema_version: SCHEMA_VERSION,
    steps: [
      { id: 'test_quick',      command: 'npm run test:quick',      required: true,  passed: hs.syntaxOk === true },
      { id: 'test_full',       command: 'npm run test:full',       required: true,  passed: null },
      { id: 'test_go',         command: 'npm run test:go',         required: true,  passed: hs.goCoreTestPass === true && hs.goCoreBuildPass === true },
      { id: 'runtime_probe',   command: 'pi-harness --runtime-probe', required: true, passed: hs.runtimeProbePass === true },
      { id: 'git_clean_check', command: 'git status --porcelain', required: true,  passed: null },
    ],
    all_required_passed: false,
    note: 'Validation plan must be completed by human before any release action',
  };
}

// ═══════════════════════════════════════════════════════════════════
// RISK SUMMARY
// ═══════════════════════════════════════════════════════════════════

function _buildRiskSummary(planReady, rc, pg, hs) {
  const risks = [];

  if (!planReady) {
    risks.push({ id: 'plan_not_ready',        severity: 'critical', description: 'Release plan is not ready — all PLAN_BLOCKED conditions must be resolved first' });
  }
  if (!hs.runtimeProbePass) {
    risks.push({ id: 'no_runtime_probe',       severity: 'high',     description: 'Runtime probe has not passed — live backend evidence unverified' });
  }
  if (!hs.backendAlive) {
    risks.push({ id: 'backend_offline',        severity: 'high',     description: 'Backend was offline during harness run — live evidence not collected' });
  }
  if (pg?.pass_gold_authority_binding_status !== 'BINDING_READY') {
    risks.push({ id: 'binding_not_ready',      severity: 'high',     description: 'PASS GOLD authority binding is not BINDING_READY — authority review incomplete' });
  }
  if (!hs.fakeEvidenceAbsent) {
    risks.push({ id: 'fake_evidence_detected', severity: 'critical', description: 'Fake evidence patterns detected — release MUST NOT proceed' });
  }

  risks.push({ id: 'no_rollback_drill', severity: 'medium', description: 'Rollback drill not yet executed (V16.3) — validate rollback manually before release' });
  risks.push({ id: 'no_audit_ledger',   severity: 'low',    description: 'Release audit ledger not yet implemented (V16.4) — document release manually' });

  return {
    schema_version: SCHEMA_VERSION,
    risk_count:     risks.length,
    critical_count: risks.filter(r => r.severity === 'critical').length,
    high_count:     risks.filter(r => r.severity === 'high').length,
    risks,
    safe_to_proceed: planReady && risks.filter(r => r.severity === 'critical').length === 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
// APPROVAL REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════

function _buildApprovalRequirements(planReady, ag) {
  return [
    { id: 'pass_gold_authority_approval',   required: true,  present: ag?.pass_gold_confirmed === true,      description: 'PASS GOLD must be confirmed by pass_gold_authority role' },
    { id: 'release_authority_approval',     required: true,  present: ag?.release_authorized === true,       description: 'Release must be authorized by release_authority role or higher' },
    { id: 'human_final_approval',           required: true,  present: false,                                 description: 'Human operator must give explicit final approval before any release action' },
    { id: 'rollback_plan_reviewed',         required: true,  present: false,                                 description: 'Rollback plan must be reviewed and acknowledged by human before release' },
    { id: 'no_auto_deploy_confirmed',       required: true,  present: true,                                  description: 'Confirmed: no automatic deploy will occur — deploy_allowed=false always' },
    { id: 'no_stable_auto_promotion',       required: true,  present: true,                                  description: 'Confirmed: no automatic stable promotion — stable_allowed=false always' },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export {
  generateReleasePlan,
  PLAN_STATUSES,
  SCHEMA_VERSION as PLAN_SCHEMA_VERSION,
};
