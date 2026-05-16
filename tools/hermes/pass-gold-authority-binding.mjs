#!/usr/bin/env node
/**
 * PASS GOLD Authority Binding — V15.12
 *
 * Connects authority contract + runtime evidence + Go Core evidence receipt
 * into a formal binding decision.
 *
 * REGRA ABSOLUTA:
 * - Human approval contract cannot substitute Go Core evidence.
 * - BINDING_READY never enables deploy/tag/stable — only classifies readiness.
 * - All allowed flags remain false in V15.12.
 */

const SCHEMA_VERSION = 'v15.12';

// ═══════════════════════════════════════════════════════════════════
// BINDING STATUS CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const BINDING_STATUSES = [
  'BINDING_BLOCKED_EVIDENCE',   // evidence conditions not met
  'BINDING_BLOCKED_AUTHORITY',  // authority conditions not met (evidence ok)
  'BINDING_READY',              // both evidence and authority conditions met
];

// ═══════════════════════════════════════════════════════════════════
// EVALUATE PASS GOLD AUTHORITY BINDING
// ═══════════════════════════════════════════════════════════════════

function evaluatePassGoldAuthorityBinding(harnessState = {}, authorityGate = null, authorityContract = null) {
  const errors   = [];
  const warnings = [];

  // ── Evidence conditions (runtime state from harness layers) ──────
  const evidenceSource      = harnessState.evidenceSource || null;
  const evidenceReceiptId   = harnessState.goRuntimeEvidenceId || null;
  const goCorEvidenceValid  = evidenceSource === 'go-core';
  const evidenceReceiptPresent = !!evidenceReceiptId;
  const runtimeProbePass    = harnessState.runtimeProbePass === true;
  const fakeEvidenceAbsent  = harnessState.fakeEvidenceAbsent === true;
  const backendAlive        = harnessState.backendAlive === true;

  const evidenceConditions = {
    go_core_evidence_valid:   goCorEvidenceValid,
    evidence_receipt_present: evidenceReceiptPresent,
    evidence_source_go_core:  goCorEvidenceValid,
    runtime_probe_pass:       runtimeProbePass,
    no_fake_evidence:         fakeEvidenceAbsent,
    backend_alive:            backendAlive,
  };

  // ── Authority conditions (from evaluateAuthorityReviewGate) ──────
  const contractValid       = authorityGate?.human_approval_contract_valid === true;
  const reviewApproved      = authorityGate?.review_decision === 'approved';
  const authoritySufficient = authorityGate?.authority_sufficient === true;
  const scopeValid          = authorityGate?.scope_valid === true;
  const temporalValid       = authorityGate?.temporal_valid === true;
  // none of the allowed flags may be true — authority is validation, not execution
  const noAllowedFlagsTrue  = !authorityGate?.release_allowed
    && !authorityGate?.deploy_allowed
    && !authorityGate?.tag_allowed
    && !authorityGate?.stable_allowed;

  const authorityConditions = {
    contract_valid:        contractValid,
    review_approved:       reviewApproved,
    authority_sufficient:  authoritySufficient,
    scope_valid:           scopeValid,
    temporal_valid:        temporalValid,
    no_allowed_flags_true: noAllowedFlagsTrue,
  };

  // ── Determine binding status ─────────────────────────────────────
  const evidenceReady  = Object.values(evidenceConditions).every(Boolean);
  const authorityReady = Object.values(authorityConditions).every(Boolean);

  let bindingStatus;
  if (!evidenceReady) {
    bindingStatus = 'BINDING_BLOCKED_EVIDENCE';
    for (const [k, v] of Object.entries(evidenceConditions)) {
      if (!v) errors.push(`evidence_condition_failed:${k}`);
    }
    for (const [k, v] of Object.entries(authorityConditions)) {
      if (!v) warnings.push(`authority_condition_failed:${k}`);
    }
  } else if (!authorityReady) {
    bindingStatus = 'BINDING_BLOCKED_AUTHORITY';
    for (const [k, v] of Object.entries(authorityConditions)) {
      if (!v) errors.push(`authority_condition_failed:${k}`);
    }
  } else {
    bindingStatus = 'BINDING_READY';
  }

  const bindingValid = bindingStatus === 'BINDING_READY';

  return {
    pass_gold_authority_binding_enabled:        true,
    pass_gold_authority_binding_schema_version: SCHEMA_VERSION,
    pass_gold_authority_binding_status:         bindingStatus,
    pass_gold_authority_binding_valid:          bindingValid,
    pass_gold_authority_binding_errors:         errors,
    pass_gold_authority_binding_warnings:       warnings,
    pass_gold_confirmed_by_authority:           bindingValid && authorityGate?.pass_gold_confirmed === true,
    pass_gold_confirmed_by_go_core:             goCorEvidenceValid && evidenceReceiptPresent,
    pass_gold_binding_evidence_receipt_id:      evidenceReceiptId,
    pass_gold_binding_evidence_source:          evidenceSource,
    pass_gold_binding_contract_id:              authorityContract?.contract_id || null,
    pass_gold_binding_reviewer:                 authorityGate?.authority_role  || null,
    pass_gold_binding_allowed_actions:          bindingValid ? (authorityGate?.approved_actions || []) : [],
    // Invariants — always false in V15.12
    deploy_allowed:    false,
    release_allowed:   false,
    tag_allowed:       false,
    stable_allowed:    false,
    promotion_allowed: false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export {
  evaluatePassGoldAuthorityBinding,
  BINDING_STATUSES,
  SCHEMA_VERSION as BINDING_SCHEMA_VERSION,
};
