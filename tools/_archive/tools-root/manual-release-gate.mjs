#!/usr/bin/env node
/**
 * Manual Release Execution Gate — V16.0
 *
 * Evaluates whether a human operator may proceed with a manual release.
 * This gate classifies readiness only — it does NOT execute any release action.
 *
 * REGRA ABSOLUTA:
 * - MANUAL_RELEASE_READY is a readiness classification, not an execution grant.
 * - deploy_allowed=false always.
 * - tag_allowed=false always.
 * - stable_allowed=false always.
 * - deploy_performed=false always.
 * - tag_created=false always.
 * - stable_promoted=false always.
 * - release_performed=false always.
 *
 * Required flags (all must be present for MANUAL_RELEASE_READY):
 *   --manual-release-intent
 *   --confirm-no-auto-deploy
 *   --confirm-no-stable-promotion
 *   --confirm-rollback-plan-reviewed
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v16.0';

// ═══════════════════════════════════════════════════════════════════
// GATE STATUS CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const GATE_STATUSES = [
  'MANUAL_RELEASE_BLOCKED_SIMULATION',    // release simulation not ready
  'MANUAL_RELEASE_BLOCKED_EVIDENCE',      // evidence receipt missing or invalid
  'MANUAL_RELEASE_BLOCKED_AUTHORITY',     // authority binding not ready
  'MANUAL_RELEASE_BLOCKED_ROLLBACK',      // rollback plan missing or incomplete
  'MANUAL_RELEASE_BLOCKED_CONFIRMATION',  // required confirmation flags missing
  'MANUAL_RELEASE_READY',                 // all conditions met — human may proceed
];

// ═══════════════════════════════════════════════════════════════════
// EVALUATE MANUAL RELEASE GATE
// ═══════════════════════════════════════════════════════════════════

/**
 * Evaluates whether all preconditions for a manual release are met.
 *
 * @param {Object} input
 * @param {Object}  input.simulationResult    - From simulateRelease() — must be SIM_READY_MANUAL_RELEASE
 * @param {Object}  input.evidenceReceipt     - { id, source } — must be go-core
 * @param {Object}  input.authorityBinding    - { status, contract_id, reviewer }
 * @param {Object}  input.rollbackPlan        - { rollback_target, steps[] }
 * @param {boolean} input.gitClean            - Working tree is clean
 * @param {boolean} input.ciGreenEvidence     - CI green confirmed
 * @param {Object}  input.confirmations       - Explicit flags from human operator
 * @param {boolean} input.confirmations.manualReleaseIntent      - --manual-release-intent
 * @param {boolean} input.confirmations.noAutoDeploy             - --confirm-no-auto-deploy
 * @param {boolean} input.confirmations.noStablePromotion        - --confirm-no-stable-promotion
 * @param {boolean} input.confirmations.rollbackPlanReviewed     - --confirm-rollback-plan-reviewed
 * @param {string}  input.gitHead             - Current git HEAD SHA
 * @param {string}  input.branch              - Current branch name
 */
function evaluateManualReleaseGate(input = {}) {
  const {
    simulationResult    = null,
    evidenceReceipt     = null,
    authorityBinding    = null,
    rollbackPlan        = null,
    gitClean            = false,
    ciGreenEvidence     = false,
    confirmations       = {},
    gitHead             = null,
    branch              = null,
  } = input;

  const conf = confirmations || {};

  // ── Evaluate preconditions ───────────────────────────────────────
  const simReady       = simulationResult?.simulation_status === 'SIM_READY_MANUAL_RELEASE'
                         && simulationResult?.simulation_safe === true;
  const evidenceOk     = !!(evidenceReceipt?.id) && evidenceReceipt?.source === 'go-core';
  const authorityOk    = authorityBinding?.status === 'BINDING_READY';
  const rollbackOk     = !!(rollbackPlan?.rollback_target)
                         && Array.isArray(rollbackPlan?.steps)
                         && rollbackPlan.steps.length > 0;
  const confirmationOk = conf.manualReleaseIntent === true
                         && conf.noAutoDeploy === true
                         && conf.noStablePromotion === true
                         && conf.rollbackPlanReviewed === true;

  // ── Collect blockers ─────────────────────────────────────────────
  const blockers = [];
  if (!simReady)       blockers.push('SIMULATION_NOT_READY');
  if (!evidenceOk)     blockers.push('EVIDENCE_MISSING_OR_INVALID');
  if (!authorityOk)    blockers.push('AUTHORITY_BINDING_NOT_READY');
  if (!rollbackOk)     blockers.push('ROLLBACK_PLAN_MISSING');
  if (!confirmationOk) blockers.push('CONFIRMATIONS_MISSING');

  // Missing individual confirmations
  if (!conf.manualReleaseIntent)    blockers.push('MISSING_FLAG_manual_release_intent');
  if (!conf.noAutoDeploy)           blockers.push('MISSING_FLAG_confirm_no_auto_deploy');
  if (!conf.noStablePromotion)      blockers.push('MISSING_FLAG_confirm_no_stable_promotion');
  if (!conf.rollbackPlanReviewed)   blockers.push('MISSING_FLAG_confirm_rollback_plan_reviewed');

  // ── Determine gate status ────────────────────────────────────────
  let gateStatus;
  if (!simReady) {
    gateStatus = 'MANUAL_RELEASE_BLOCKED_SIMULATION';
  } else if (!evidenceOk) {
    gateStatus = 'MANUAL_RELEASE_BLOCKED_EVIDENCE';
  } else if (!authorityOk) {
    gateStatus = 'MANUAL_RELEASE_BLOCKED_AUTHORITY';
  } else if (!rollbackOk) {
    gateStatus = 'MANUAL_RELEASE_BLOCKED_ROLLBACK';
  } else if (!confirmationOk) {
    gateStatus = 'MANUAL_RELEASE_BLOCKED_CONFIRMATION';
  } else {
    gateStatus = 'MANUAL_RELEASE_READY';
  }

  const gateReady = gateStatus === 'MANUAL_RELEASE_READY';
  const gateId    = _buildGateId(gitHead, branch);
  const createdAt = new Date().toISOString();

  return {
    schema_version:                SCHEMA_VERSION,
    manual_release_gate_id:        gateId,
    manual_release_gate_status:    gateStatus,
    manual_release_gate_valid:     gateReady,
    manual_release_gate_ready:     gateReady,
    manual_release_gate_blockers:  blockers,
    created_at:                    createdAt,
    git_head:                      gitHead,
    branch:                        branch,

    // ── Input summary ────────────────────────────────────────────
    inputs_evaluated: {
      simulation_status:        simulationResult?.simulation_status || null,
      simulation_safe:          simulationResult?.simulation_safe   || false,
      evidence_receipt_id:      evidenceReceipt?.id                 || null,
      evidence_source:          evidenceReceipt?.source             || null,
      authority_binding_status: authorityBinding?.status            || null,
      authority_contract_id:    authorityBinding?.contract_id       || null,
      rollback_target:          rollbackPlan?.rollback_target        || null,
      rollback_steps_count:     Array.isArray(rollbackPlan?.steps) ? rollbackPlan.steps.length : 0,
      git_clean:                gitClean,
      ci_green_evidence:        ciGreenEvidence,
    },

    // ── Confirmations received ───────────────────────────────────
    confirmations_received: {
      manual_release_intent:    conf.manualReleaseIntent    === true,
      no_auto_deploy:           conf.noAutoDeploy           === true,
      no_stable_promotion:      conf.noStablePromotion      === true,
      rollback_plan_reviewed:   conf.rollbackPlanReviewed   === true,
    },

    // ── Required flags ───────────────────────────────────────────
    required_flags: [
      '--manual-release-intent',
      '--confirm-no-auto-deploy',
      '--confirm-no-stable-promotion',
      '--confirm-rollback-plan-reviewed',
    ],

    // Explicit invariants — always false
    deploy_allowed:     false,
    tag_allowed:        false,
    stable_allowed:     false,
    deploy_performed:   false,
    tag_created:        false,
    stable_promoted:    false,
    release_performed:  false,
    promotion_allowed:  false,

    note: 'Manual release gate is readiness classification only — no deploy, no tag, no stable in V16.0',
  };
}

// ═══════════════════════════════════════════════════════════════════
// GATE ID
// ═══════════════════════════════════════════════════════════════════

function _buildGateId(gitHead, branch) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const raw   = `${gitHead || 'unknown'}:${branch || 'unknown'}:${Date.now()}:${nonce}`;
  const hash  = createHash('sha256').update(raw).digest('hex').slice(0, 12);
  return `gate_${hash}`;
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export {
  evaluateManualReleaseGate,
  GATE_STATUSES,
  SCHEMA_VERSION as GATE_SCHEMA_VERSION,
};
