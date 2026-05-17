#!/usr/bin/env node
/**
 * Release Execution Simulator — V15.15
 *
 * Simulates a release end-to-end without touching GitHub Release, tag, deploy, or stable.
 * Produces an immutable simulation report for audit purposes.
 *
 * REGRA ABSOLUTA:
 * - deploy_performed=false always.
 * - tag_created=false always.
 * - stable_promoted=false always.
 * - Simulation is classification/documentation only — not an execution grant.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v15.15';

// ═══════════════════════════════════════════════════════════════════
// SIMULATION STATUS CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const SIM_STATUSES = [
  'SIM_BLOCKED_PLAN',        // release plan not ready or missing
  'SIM_BLOCKED_EVIDENCE',    // evidence receipt missing or invalid
  'SIM_BLOCKED_AUTHORITY',   // authority binding not ready
  'SIM_BLOCKED_ROLLBACK',    // rollback plan missing or incomplete
  'SIM_READY_MANUAL_RELEASE', // simulation complete — human may proceed
];

const FORBIDDEN_STEPS = [
  'execute_production_deploy',
  'create_github_release_tag',
  'push_to_stable_branch',
  'override_pass_gold',
  'create_evidence_artificially',
  'promote_stable_without_human_approval',
  'auto_trigger_release',
];

// ═══════════════════════════════════════════════════════════════════
// SIMULATE RELEASE
// ═══════════════════════════════════════════════════════════════════

/**
 * Simulates a release execution from a validated release plan.
 *
 * @param {Object} input
 * @param {Object} input.releasePlan      - From generateReleasePlan() — must be PLAN_READY
 * @param {Object} input.evidenceReceipt  - { id, source } from go-core runtime probe
 * @param {Object} input.authorityBinding - { status, contract_id, reviewer }
 * @param {Object} input.rollbackPlan     - { rollback_target, steps[] }
 * @param {Object} input.testResults      - { quickPass, fullPass, goPass }
 * @param {Object} input.manualApproval   - { confirmed, approver }
 * @param {string} input.gitHead          - Current git HEAD SHA
 * @param {string} input.branch           - Current branch name
 */
function simulateRelease(input = {}) {
  const {
    releasePlan      = null,
    evidenceReceipt  = null,
    authorityBinding = null,
    rollbackPlan     = null,
    testResults      = null,
    manualApproval   = null,
    gitHead          = null,
    branch           = null,
  } = input;

  // ── Evaluate preconditions ───────────────────────────────────────
  const planReady      = releasePlan?.release_plan_status === 'PLAN_READY'
                         && releasePlan?.release_plan_ready === true;
  const evidenceOk     = !!(evidenceReceipt?.id) && evidenceReceipt?.source === 'go-core';
  const authorityOk    = authorityBinding?.status === 'BINDING_READY';
  const rollbackOk     = !!(rollbackPlan?.rollback_target)
                         && Array.isArray(rollbackPlan?.steps)
                         && rollbackPlan.steps.length > 0;

  // ── Determine simulation status ──────────────────────────────────
  let simStatus;
  if (!planReady) {
    simStatus = 'SIM_BLOCKED_PLAN';
  } else if (!evidenceOk) {
    simStatus = 'SIM_BLOCKED_EVIDENCE';
  } else if (!authorityOk) {
    simStatus = 'SIM_BLOCKED_AUTHORITY';
  } else if (!rollbackOk) {
    simStatus = 'SIM_BLOCKED_ROLLBACK';
  } else {
    simStatus = 'SIM_READY_MANUAL_RELEASE';
  }

  const simReady = simStatus === 'SIM_READY_MANUAL_RELEASE';
  const simId    = _buildSimId(gitHead, branch);
  const createdAt = new Date().toISOString();

  return {
    schema_version:         SCHEMA_VERSION,
    release_simulation_id:  simId,
    simulation_status:      simStatus,
    simulation_safe:        simReady,
    created_at:             createdAt,
    git_head:               gitHead,
    branch:                 branch,

    // ── Simulated steps (dry-run classification only) ────────────
    simulated_steps:  _buildSimulatedSteps(simReady, releasePlan, evidenceReceipt, authorityBinding, rollbackPlan, testResults, manualApproval),

    // ── Blocked steps ────────────────────────────────────────────
    blocked_steps:    _buildBlockedSteps(simStatus),

    // ── Steps that must NEVER happen automatically ───────────────
    forbidden_steps:  FORBIDDEN_STEPS,

    // ── Approval summary ─────────────────────────────────────────
    approval_summary: _buildApprovalSummary(manualApproval),

    // ── Risk assessment ──────────────────────────────────────────
    risk_assessment:  _buildRiskAssessment(simReady, evidenceReceipt, authorityBinding, testResults),

    // Explicit invariants — always false
    deploy_performed:   false,
    tag_created:        false,
    stable_promoted:    false,
    deploy_allowed:     false,
    tag_allowed:        false,
    stable_allowed:     false,
    release_allowed:    false,
    promotion_allowed:  false,

    note: 'Release simulation is documentation only — no tag, no deploy, no stable in V15.15',
  };
}

// ═══════════════════════════════════════════════════════════════════
// SIMULATION ID
// ═══════════════════════════════════════════════════════════════════

function _buildSimId(gitHead, branch) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const raw   = `${gitHead || 'unknown'}:${branch || 'unknown'}:${Date.now()}:${nonce}`;
  const hash  = createHash('sha256').update(raw).digest('hex').slice(0, 12);
  return `sim_${hash}`;
}

// ═══════════════════════════════════════════════════════════════════
// SIMULATED STEPS
// ═══════════════════════════════════════════════════════════════════

function _buildSimulatedSteps(simReady, releasePlan, evidenceReceipt, authorityBinding, rollbackPlan, testResults, manualApproval) {
  return [
    {
      id:          'validate_release_plan',
      description: 'Confirm release plan status = PLAN_READY with release_plan_ready=true',
      passed:      releasePlan?.release_plan_status === 'PLAN_READY' && releasePlan?.release_plan_ready === true,
      required:    true,
    },
    {
      id:          'validate_evidence_receipt',
      description: 'Confirm evidence_receipt.source = go-core with valid receipt ID from real runtime probe',
      passed:      !!(evidenceReceipt?.id) && evidenceReceipt?.source === 'go-core',
      required:    true,
    },
    {
      id:          'validate_authority_binding',
      description: 'Confirm authority binding status = BINDING_READY with approved contract',
      passed:      authorityBinding?.status === 'BINDING_READY',
      required:    true,
    },
    {
      id:          'validate_rollback_plan',
      description: 'Confirm rollback plan has valid target and documented steps',
      passed:      !!(rollbackPlan?.rollback_target) && Array.isArray(rollbackPlan?.steps) && rollbackPlan.steps.length > 0,
      required:    true,
    },
    {
      id:          'validate_tests',
      description: 'Confirm test:quick, test:full, test:go all passed',
      passed:      testResults?.quickPass === true && testResults?.fullPass === true && testResults?.goPass === true,
      required:    true,
    },
    {
      id:          'validate_manual_approval',
      description: 'Confirm explicit human approval is present before any release action',
      passed:      manualApproval?.confirmed === true,
      required:    true,
    },
    {
      id:          'generate_release_report',
      description: 'Generate immutable simulation report (this step — classification only)',
      passed:      true,
      required:    true,
    },
    {
      id:          'notify_human_operator',
      description: 'Human operator must be notified — no automatic notification or release action',
      passed:      false,
      required:    true,
      note:        'Human must act manually — simulation cannot trigger notifications',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// BLOCKED STEPS
// ═══════════════════════════════════════════════════════════════════

function _buildBlockedSteps(simStatus) {
  const always = [
    { id: 'execute_deploy',    reason: 'deploy_performed=false invariant — never automatic' },
    { id: 'create_tag',        reason: 'tag_created=false invariant — never automatic' },
    { id: 'promote_stable',    reason: 'stable_promoted=false invariant — never automatic' },
  ];

  if (simStatus !== 'SIM_READY_MANUAL_RELEASE') {
    always.unshift({ id: 'proceed_with_release', reason: `simulation blocked — status: ${simStatus}` });
  }

  return always;
}

// ═══════════════════════════════════════════════════════════════════
// APPROVAL SUMMARY
// ═══════════════════════════════════════════════════════════════════

function _buildApprovalSummary(manualApproval) {
  return {
    manual_approval_confirmed:  manualApproval?.confirmed === true,
    approver:                   manualApproval?.approver || null,
    auto_approval_possible:     false,
    note:                       'Manual human approval required — no automatic approval path',
  };
}

// ═══════════════════════════════════════════════════════════════════
// RISK ASSESSMENT
// ═══════════════════════════════════════════════════════════════════

function _buildRiskAssessment(simReady, evidenceReceipt, authorityBinding, testResults) {
  const risks = [];

  if (!simReady) {
    risks.push({ id: 'sim_not_ready',         severity: 'critical', description: 'Simulation not ready — all blockers must be resolved before release' });
  }
  if (!evidenceReceipt?.id || evidenceReceipt?.source !== 'go-core') {
    risks.push({ id: 'evidence_invalid',      severity: 'critical', description: 'Evidence receipt missing or not from go-core — release MUST NOT proceed' });
  }
  if (authorityBinding?.status !== 'BINDING_READY') {
    risks.push({ id: 'authority_not_ready',   severity: 'high',     description: 'Authority binding not BINDING_READY — release blocked' });
  }
  if (!testResults?.fullPass) {
    risks.push({ id: 'tests_not_full_pass',   severity: 'high',     description: 'Full test suite not confirmed passed — release blocked' });
  }
  if (!testResults?.goPass) {
    risks.push({ id: 'go_tests_not_passed',   severity: 'high',     description: 'Go tests not confirmed passed — release blocked' });
  }

  return {
    schema_version:  SCHEMA_VERSION,
    risk_count:      risks.length,
    critical_count:  risks.filter(r => r.severity === 'critical').length,
    high_count:      risks.filter(r => r.severity === 'high').length,
    risks,
    safe_to_proceed: simReady && risks.filter(r => r.severity === 'critical').length === 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export {
  simulateRelease,
  SIM_STATUSES,
  FORBIDDEN_STEPS as SIM_FORBIDDEN_STEPS,
  SCHEMA_VERSION as SIM_SCHEMA_VERSION,
};
