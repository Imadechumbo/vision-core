#!/usr/bin/env node
/**
 * Hermes Authority Review Gate — V15.10
 * Human Approval Contract + Authority Role Registry
 *
 * REGRA ABSOLUTA: authority review is validation, not execution.
 * human approval cannot override PASS GOLD.
 * deploy/tag/stable remain blocked in V15.10.
 * authority_review_valid may be true; deploy_allowed remains false.
 */

const SCHEMA_VERSION = 'v15.10';

// ═══════════════════════════════════════════════════════════════════
// CONTRACT STATUSES
// ═══════════════════════════════════════════════════════════════════

const CONTRACT_STATUSES = [
  'CONTRACT_MISSING',
  'CONTRACT_INVALID',
  'CONTRACT_PARTIAL',
  'CONTRACT_VALID',
  'CONTRACT_REJECTED',
  'CONTRACT_EXPIRED',
  'CONTRACT_SCOPE_MISMATCH',
  'CONTRACT_AUTHORITY_INSUFFICIENT',
  'CONTRACT_EVIDENCE_MISSING',
  'CONTRACT_CONFLICTING',
];

// ═══════════════════════════════════════════════════════════════════
// VALID ACTIONS & SCOPES
// ═══════════════════════════════════════════════════════════════════

const VALID_ACTIONS = [
  'review_only',
  'release_review',
  'release_authorization',
  'deploy_authorization',
  'tag_authorization',
  'stable_promotion_authorization',
  'pass_gold_confirmation',
];

const ALLOWED_SCOPES = [
  'review_only',
  'release_candidate',
  'deploy_request',
  'tag_request',
  'stable_promotion',
  'pass_gold_confirmation',
  'docs_only',
  'tools_only',
  'authorization_only',
];

const FORBIDDEN_SCOPES = [
  'frontend_visual_patch',
  'backend_runtime_patch',
  'go_core_patch',
  'github_workflow_patch',
  'secret_access',
  'production_deploy',
  'stable_write',
  'tag_write',
];

// Role → actions it can authorize
const ROLE_ACTION_MAP = {
  observer:          ['review_only'],
  reviewer:          ['review_only', 'release_review'],
  release_authority: ['review_only', 'release_review', 'release_authorization'],
  deploy_authority:  ['review_only', 'release_review', 'release_authorization', 'deploy_authorization'],
  stable_authority:  ['review_only', 'release_review', 'release_authorization', 'deploy_authorization', 'tag_authorization', 'stable_promotion_authorization'],
  pass_gold_authority: ['review_only', 'pass_gold_confirmation'],
};

// Required evidence refs per action
const ACTION_EVIDENCE_MAP = {
  release_review: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref'],
  release_authorization: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref', 'scenario_matrix_ref', 'ci_status_ref'],
  deploy_authorization:  ['release_authorization_ref', 'pass_gold_ref', 'go_core_evidence_ref', 'ci_status_ref'],
  tag_authorization:     ['release_authorization_ref', 'pass_gold_ref', 'git_head_ref'],
  stable_promotion_authorization: ['release_authorization_ref', 'pass_gold_ref', 'deployment_result_ref', 'rollback_snapshot_ref'],
  pass_gold_confirmation: ['go_core_evidence_ref', 'evidence_receipt_ref', 'pass_gold_report_ref'],
};

// ═══════════════════════════════════════════════════════════════════
// AUTHORITY ROLE REGISTRY
// ═══════════════════════════════════════════════════════════════════

function createAuthorityRoleRegistry() {
  return {
    schema_version: SCHEMA_VERSION,
    roles: {
      observer: {
        can_review: true,
        can_authorize_release: false,
        can_authorize_deploy: false,
        can_authorize_tag: false,
        can_authorize_stable: false,
      },
      reviewer: {
        can_review: true,
        can_authorize_release: false,
        can_authorize_deploy: false,
        can_authorize_tag: false,
        can_authorize_stable: false,
      },
      release_authority: {
        can_review: true,
        can_authorize_release: true,
        can_authorize_deploy: false,
        can_authorize_tag: false,
        can_authorize_stable: false,
      },
      deploy_authority: {
        can_review: true,
        can_authorize_release: true,
        can_authorize_deploy: true,
        can_authorize_tag: false,
        can_authorize_stable: false,
      },
      stable_authority: {
        can_review: true,
        can_authorize_release: true,
        can_authorize_deploy: true,
        can_authorize_tag: true,
        can_authorize_stable: true,
      },
      pass_gold_authority: {
        can_review: true,
        can_confirm_pass_gold: true,
        can_override_evidence: false,
      },
    },
    invariants: {
      authority_cannot_override_pass_gold: true,
      authority_cannot_create_evidence: true,
      authority_cannot_override_go_core: true,
      authority_cannot_execute_deploy: true,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// HUMAN APPROVAL CONTRACT
// ═══════════════════════════════════════════════════════════════════

function createHumanApprovalContract(overrides = {}) {
  const now = Date.now();
  const id  = `contract_${now}_${Math.random().toString(36).slice(2, 10)}`;
  return {
    schema_version:         SCHEMA_VERSION,
    contract_id:            overrides.contract_id            || id,
    mission_id:             overrides.mission_id             || null,
    authorization_id:       overrides.authorization_id       || null,
    requested_action:       overrides.requested_action       || 'review_only',
    requested_scope:        Array.isArray(overrides.requested_scope) ? overrides.requested_scope : [],
    requested_by:           overrides.requested_by           || null,
    reviewed_by:            overrides.reviewed_by            || null,
    reviewer_role:          overrides.reviewer_role          || null,
    review_decision:        overrides.review_decision        || null,
    review_reason:          overrides.review_reason          || null,
    evidence_refs:          Array.isArray(overrides.evidence_refs)          ? overrides.evidence_refs          : [],
    required_evidence_refs: Array.isArray(overrides.required_evidence_refs) ? overrides.required_evidence_refs : [],
    constraints:            overrides.constraints            || { deploy_allowed: false, tag_allowed: false, stable_allowed: false },
    issued_at:              overrides.issued_at              || now,
    expires_at:             overrides.expires_at             || null,
    status:                 'CONTRACT_MISSING',
  };
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATE HUMAN APPROVAL CONTRACT
// ═══════════════════════════════════════════════════════════════════

function validateHumanApprovalContract(contract, authorityRegistry, runtimeEvidence, decisionMatrix, authorizationLayer) {
  const errors       = [];
  const warnings     = [];
  const missingEvidence = [];
  const auditEvents  = [];
  const invariants   = {
    deploy_allowed:    false,
    release_allowed:   false,
    tag_allowed:       false,
    stable_allowed:    false,
    promotion_allowed: false,
  };

  // No contract
  if (!contract) {
    auditEvents.push(_auditEvent('contract_missing', null, 'validation', 'system', 'No contract provided'));
    return {
      ok: false,
      status: 'CONTRACT_MISSING',
      errors: [],
      warnings: ['No human approval contract provided'],
      missing_evidence: ['contract'],
      authority_role: null,
      authority_sufficient: false,
      scope_valid: false,
      temporal_valid: false,
      conflicts: [],
      approved_actions: [],
      audit_events: auditEvents,
      invariants,
    };
  }

  auditEvents.push(_auditEvent('contract_validation_started', contract.contract_id, 'validation', 'system', 'Contract validation started'));

  // Schema version
  if (contract.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be ${SCHEMA_VERSION}, got: ${contract.schema_version}`);
    auditEvents.push(_auditEvent('contract_invalid', contract.contract_id, 'validation', 'system', 'CONTRACT_INVALID: schema mismatch', 'CONTRACT_INVALID'));
    return _buildContractResult('CONTRACT_INVALID', false, errors, warnings, missingEvidence, null, false, false, false, [], auditEvents, invariants);
  }

  // Unknown action
  if (!VALID_ACTIONS.includes(contract.requested_action)) {
    errors.push(`requested_action "${contract.requested_action}" is invalid — must be one of: ${VALID_ACTIONS.join(', ')}`);
    auditEvents.push(_auditEvent('contract_invalid', contract.contract_id, 'validation', 'system', 'CONTRACT_INVALID: unknown action', 'CONTRACT_INVALID'));
    return _buildContractResult('CONTRACT_INVALID', false, errors, warnings, missingEvidence, null, false, false, false, [], auditEvents, invariants);
  }

  // review_decision = rejected
  if (contract.review_decision === 'rejected') {
    auditEvents.push(_auditEvent('contract_rejected', contract.contract_id, 'validation', contract.reviewed_by || 'system', 'Contract rejected by reviewer', 'CONTRACT_REJECTED'));
    return _buildContractResult('CONTRACT_REJECTED', false, errors, warnings, missingEvidence, contract.reviewer_role, false, true, true, [], auditEvents, invariants);
  }

  // Expiry
  const now = Date.now();
  if (contract.expires_at && contract.expires_at < now) {
    errors.push(`Contract expired at ${new Date(contract.expires_at).toISOString()}`);
    auditEvents.push(_auditEvent('contract_expired', contract.contract_id, 'validation', 'system', 'CONTRACT_EXPIRED', 'CONTRACT_EXPIRED'));
    return _buildContractResult('CONTRACT_EXPIRED', false, errors, warnings, missingEvidence, contract.reviewer_role, false, false, false, [], auditEvents, invariants);
  }
  const temporalValid = true;

  // Scope check
  const scope = Array.isArray(contract.requested_scope) ? contract.requested_scope : [];
  const forbiddenFound = scope.filter(s => FORBIDDEN_SCOPES.includes(s));
  const unknownScope   = scope.filter(s => !ALLOWED_SCOPES.includes(s) && !FORBIDDEN_SCOPES.includes(s));
  let scopeValid = true;
  if (forbiddenFound.length > 0) {
    errors.push(`Forbidden scope(s): ${forbiddenFound.join(', ')}`);
    scopeValid = false;
    auditEvents.push(_auditEvent('contract_scope_mismatch', contract.contract_id, 'validation', 'system', `CONTRACT_SCOPE_MISMATCH: ${forbiddenFound.join(', ')}`, 'CONTRACT_SCOPE_MISMATCH'));
    return _buildContractResult('CONTRACT_SCOPE_MISMATCH', false, errors, warnings, missingEvidence, contract.reviewer_role, false, scopeValid, temporalValid, [], auditEvents, invariants);
  }
  if (unknownScope.length > 0) {
    warnings.push(`Unknown scope(s): ${unknownScope.join(', ')}`);
  }

  // Role authority check
  const role = contract.reviewer_role;
  const allowedActionsForRole = ROLE_ACTION_MAP[role] || [];
  const authoritySufficient = allowedActionsForRole.includes(contract.requested_action);
  if (!authoritySufficient) {
    errors.push(`Role "${role}" is not authorized for action "${contract.requested_action}"`);
    auditEvents.push(_auditEvent('contract_authority_insufficient', contract.contract_id, 'validation', 'system', `CONTRACT_AUTHORITY_INSUFFICIENT: role=${role} action=${contract.requested_action}`, 'CONTRACT_AUTHORITY_INSUFFICIENT'));
    return _buildContractResult('CONTRACT_AUTHORITY_INSUFFICIENT', false, errors, warnings, missingEvidence, role, false, scopeValid, temporalValid, [], auditEvents, invariants);
  }

  // Evidence check
  const requiredEvidence = ACTION_EVIDENCE_MAP[contract.requested_action] || [];
  const providedEvidence = Array.isArray(contract.evidence_refs) ? contract.evidence_refs : [];
  const requiredSpecified = Array.isArray(contract.required_evidence_refs) && contract.required_evidence_refs.length > 0
    ? contract.required_evidence_refs
    : requiredEvidence;

  // pass_gold_confirmation: special rule — cannot confirm without Go Core evidence
  if (contract.requested_action === 'pass_gold_confirmation') {
    const hasGoCore = providedEvidence.some(r => String(r).includes('go_core') || String(r).includes('go-core'));
    if (!hasGoCore) {
      errors.push('pass_gold_confirmation requires go_core_evidence_ref — cannot confirm PASS GOLD without real Go Core evidence');
      missingEvidence.push('go_core_evidence_ref');
      auditEvents.push(_auditEvent('contract_conflicting', contract.contract_id, 'validation', 'system', 'CONTRACT_CONFLICTING: pass_gold_confirmation without Go Core evidence', 'CONTRACT_CONFLICTING'));
      return _buildContractResult('CONTRACT_CONFLICTING', false, errors, warnings, missingEvidence, role, true, scopeValid, temporalValid, [], auditEvents, invariants);
    }
  }

  // General evidence: if required_evidence_refs declared, check all are in evidence_refs
  if (requiredSpecified.length > 0) {
    const missingRefs = requiredSpecified.filter(r => !providedEvidence.includes(r));
    for (const m of missingRefs) missingEvidence.push(m);
    if (missingRefs.length > 0) {
      errors.push(`Missing required evidence refs: ${missingRefs.join(', ')}`);
      auditEvents.push(_auditEvent('contract_evidence_missing', contract.contract_id, 'validation', 'system', `CONTRACT_EVIDENCE_MISSING: ${missingRefs.join(', ')}`, 'CONTRACT_EVIDENCE_MISSING'));
      return _buildContractResult('CONTRACT_EVIDENCE_MISSING', false, errors, warnings, missingEvidence, role, true, scopeValid, temporalValid, [], auditEvents, invariants);
    }
  }

  // Conflict: trying to authorize release when decision state is BLOCKED_RUNTIME
  const decisionState = decisionMatrix?.decision_state || 'BLOCKED_RUNTIME';
  const blockedStates = ['BLOCKED_RUNTIME', 'BLOCKED_EVIDENCE', 'BLOCKED_POLICY'];
  const releasingActions = ['release_authorization', 'deploy_authorization', 'tag_authorization', 'stable_promotion_authorization'];
  if (blockedStates.includes(decisionState) && releasingActions.includes(contract.requested_action)) {
    warnings.push(`Decision state is ${decisionState} — authority cannot elevate blocked runtime to release`);
    auditEvents.push(_auditEvent('contract_conflicting', contract.contract_id, 'validation', 'system', `Decision state ${decisionState} blocks release authority actions`, 'BLOCKED'));
  }

  // reviewer_identity
  if (!contract.reviewed_by) {
    warnings.push('reviewed_by is not specified');
  }
  if (!contract.review_decision || contract.review_decision === null) {
    warnings.push('review_decision not specified — contract may be incomplete');
  }

  // Determine status
  let status;
  if (errors.length > 0) {
    status = 'CONTRACT_INVALID';
  } else if (missingEvidence.length > 0) {
    status = 'CONTRACT_EVIDENCE_MISSING';
  } else if (!contract.reviewed_by || !contract.review_decision || contract.review_decision !== 'approved') {
    // review_decision must be exactly "approved" — pending/denied/unknown are not sufficient
    status = 'CONTRACT_PARTIAL';
  } else {
    status = 'CONTRACT_VALID';
  }

  const ok = status === 'CONTRACT_VALID';
  const approvedActions = ok ? [contract.requested_action] : [];

  auditEvents.push(_auditEvent('contract_status_resolved', contract.contract_id, 'validation', 'system', `Status: ${status}`, status));
  auditEvents.push(_auditEvent('invariant_enforced', contract.contract_id, 'policy', 'system', 'deploy/tag/stable always blocked — authority review is validation, not execution', 'ENFORCED'));

  return _buildContractResult(status, ok, errors, warnings, missingEvidence, role, authoritySufficient, scopeValid, temporalValid, approvedActions, auditEvents, invariants);
}

function _buildContractResult(status, ok, errors, warnings, missingEvidence, authorityRole, authoritySufficient, scopeValid, temporalValid, approvedActions, auditEvents, invariants) {
  return { ok, status, errors, warnings, missing_evidence: missingEvidence, authority_role: authorityRole, authority_sufficient: authoritySufficient, scope_valid: scopeValid, temporal_valid: temporalValid, conflicts: [], approved_actions: approvedActions, audit_events: auditEvents, invariants };
}

// ═══════════════════════════════════════════════════════════════════
// EVALUATE AUTHORITY REVIEW GATE
// ═══════════════════════════════════════════════════════════════════

function evaluateAuthorityReviewGate(contract, context = {}) {
  const authorityRegistry = context.authorityRegistry || createAuthorityRoleRegistry();
  const decisionMatrix    = context.decisionMatrix    || null;
  const runtimeEvidence   = context.runtimeEvidence   || null;
  const authorizationLayer = context.authorizationLayer || null;

  const validation  = validateHumanApprovalContract(contract, authorityRegistry, runtimeEvidence, decisionMatrix, authorizationLayer);
  const requirements = deriveAuthorityRequirements(contract?.requested_action || null, decisionMatrix, authorizationLayer);
  const conflicts    = deriveAuthorityConflicts(contract, { decisionMatrix, runtimeEvidence, authorizationLayer });
  const auditTrail   = deriveAuthorityAuditTrail(contract, validation, { decisionMatrix });

  const contractValid = validation.status === 'CONTRACT_VALID';

  // Logical authorization fields — may be true when contract valid
  // But do NOT enable actual deployment/release
  const decisionState = decisionMatrix?.decision_state || 'BLOCKED_RUNTIME';
  const blockedStates = ['BLOCKED_RUNTIME', 'BLOCKED_EVIDENCE', 'BLOCKED_POLICY'];
  const isBlocked = blockedStates.includes(decisionState);

  const releaseAuthorized = contractValid && !isBlocked;
  const deployAuthorized  = contractValid && !isBlocked && contract?.requested_action === 'deploy_authorization';
  const tagAuthorized     = contractValid && !isBlocked && contract?.requested_action === 'tag_authorization';
  const stableAuthorized  = contractValid && !isBlocked && contract?.requested_action === 'stable_promotion_authorization';
  const passGoldConfirmed = contractValid && contract?.requested_action === 'pass_gold_confirmation';

  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  const authorityReviewStatus = criticalConflicts.length > 0
    ? 'CONTRACT_CONFLICTING'
    : validation.status;

  return {
    schema_version:                SCHEMA_VERSION,
    enabled:                       true,
    authority_review_status:       authorityReviewStatus,
    authority_review_valid:        contractValid && criticalConflicts.length === 0,
    human_approval_contract_valid: contractValid,
    authority_role:                validation.authority_role,
    authority_sufficient:          validation.authority_sufficient,
    review_decision:               contract?.review_decision || null,
    approved_actions:              validation.approved_actions,
    missing_evidence:              validation.missing_evidence,
    scope_valid:                   validation.scope_valid,
    temporal_valid:                validation.temporal_valid,
    authority_conflicts:           conflicts,
    authority_audit_trail:         auditTrail,
    authority_requirements:        requirements,
    release_authorized:            releaseAuthorized,
    deploy_authorized:             deployAuthorized,
    tag_authorized:                tagAuthorized,
    stable_promotion_authorized:   stableAuthorized,
    pass_gold_confirmed:           passGoldConfirmed,
    // Invariants — always false
    release_allowed:               false,
    deploy_allowed:                false,
    tag_allowed:                   false,
    stable_allowed:                false,
    promotion_allowed:             false,
    note: 'authority review is validation, not execution — human approval cannot override PASS GOLD — deploy/tag/stable remain blocked in V15.10',
  };
}

// ═══════════════════════════════════════════════════════════════════
// DERIVE AUTHORITY REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════

function deriveAuthorityRequirements(action, decisionMatrix, authorizationLayer) {
  const decisionState = decisionMatrix?.decision_state || 'BLOCKED_RUNTIME';
  const isCandidate   = decisionState === 'RELEASE_CANDIDATE';

  return [
    { id: 'required_role_present',             required: true,         present: false, blocking_if_missing: true,  source: 'human_operator',    remediation: 'Specify reviewer_role in contract' },
    { id: 'reviewer_identity_present',         required: true,         present: false, blocking_if_missing: true,  source: 'human_operator',    remediation: 'Specify reviewed_by in contract' },
    { id: 'review_decision_present',           required: true,         present: false, blocking_if_missing: true,  source: 'human_operator',    remediation: 'Specify review_decision in contract' },
    { id: 'scope_declared',                    required: true,         present: false, blocking_if_missing: false, source: 'human_operator',    remediation: 'Declare requested_scope in contract' },
    { id: 'scope_allowed',                     required: true,         present: false, blocking_if_missing: true,  source: 'scope_validator',   remediation: 'Remove forbidden scope entries' },
    { id: 'required_evidence_present',         required: true,         present: false, blocking_if_missing: true,  source: 'evidence_registry', remediation: 'Provide all required_evidence_refs in evidence_refs' },
    { id: 'not_expired',                       required: true,         present: false, blocking_if_missing: true,  source: 'time_validator',    remediation: 'Renew contract — expires_at must be in the future' },
    { id: 'no_conflict_with_runtime',          required: true,         present: false, blocking_if_missing: true,  source: 'decision_matrix',   remediation: 'Wait for runtime to clear blocked state' },
    { id: 'no_conflict_with_decision_matrix',  required: true,         present: false, blocking_if_missing: true,  source: 'decision_matrix',   remediation: 'Decision matrix must not be in blocked state for release actions' },
    { id: 'no_conflict_with_pass_gold',        required: true,         present: false, blocking_if_missing: true,  source: 'go_core_runtime',   remediation: 'PASS GOLD must come from real Go Core evidence — cannot be confirmed by authority alone' },
    { id: 'no_forbidden_scope',                required: true,         present: true,  blocking_if_missing: true,  source: 'scope_validator',   remediation: 'Remove all forbidden scope entries from requested_scope' },
    { id: 'no_fake_evidence',                  required: true,         present: true,  blocking_if_missing: true,  source: 'security_scan',     remediation: 'Remove any fake or backend-derived evidence references' },
    { id: 'no_allowed_flags_true',             required: true,         present: true,  blocking_if_missing: true,  source: 'policy_enforcer',   remediation: 'deploy_allowed/release_allowed/tag_allowed/stable_allowed must remain false' },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// DERIVE AUTHORITY CONFLICTS
// ═══════════════════════════════════════════════════════════════════

function deriveAuthorityConflicts(contract, context = {}) {
  const conflicts = [];
  const decisionMatrix  = context.decisionMatrix  || null;
  const runtimeEvidence = context.runtimeEvidence || null;
  const authorizationLayer = context.authorizationLayer || null;

  if (!contract) return conflicts;

  const action       = contract.requested_action;
  const role         = contract.reviewer_role;
  const decision     = contract.review_decision;
  const expiresAt    = contract.expires_at;
  const evidenceRefs = Array.isArray(contract.evidence_refs) ? contract.evidence_refs : [];
  const now          = Date.now();
  const decisionState = decisionMatrix?.decision_state || 'BLOCKED_RUNTIME';
  const blockedStates = ['BLOCKED_RUNTIME', 'BLOCKED_EVIDENCE', 'BLOCKED_POLICY'];

  // override pass gold
  if (action === 'pass_gold_confirmation' && !evidenceRefs.some(r => String(r).includes('go_core') || String(r).includes('go-core'))) {
    conflicts.push({ id: 'authority_attempts_to_override_pass_gold', severity: 'critical', message: 'Authority attempting to confirm PASS GOLD without Go Core evidence — not permitted', remediation: 'Provide real Go Core evidence receipt before pass_gold_confirmation' });
  }

  // create evidence
  if (evidenceRefs.some(r => String(r).includes('backend') || String(r).includes('fake'))) {
    conflicts.push({ id: 'authority_attempts_to_create_evidence', severity: 'critical', message: 'Evidence refs appear to reference backend/fake sources — authority cannot create evidence', remediation: 'Remove backend-derived or fake evidence references' });
  }

  // release blocked runtime
  const releasingActions = ['release_authorization', 'deploy_authorization', 'tag_authorization', 'stable_promotion_authorization'];
  if (blockedStates.includes(decisionState) && releasingActions.includes(action)) {
    conflicts.push({ id: 'authority_attempts_to_release_blocked_runtime', severity: 'high', message: `Authority attempting ${action} while decision state is ${decisionState}`, remediation: 'Runtime must clear blocked state before release authority actions' });
  }

  // deploy without pass gold
  if ((action === 'deploy_authorization' || action === 'stable_promotion_authorization') && !evidenceRefs.some(r => String(r).includes('pass_gold'))) {
    conflicts.push({ id: 'authority_attempts_to_deploy_without_pass_gold', severity: 'critical', message: `${action} requires pass_gold_ref in evidence_refs`, remediation: 'Provide PASS GOLD evidence reference before deploy/stable authorization' });
  }

  // scope exceeds role
  const allowedActions = ROLE_ACTION_MAP[role] || [];
  if (action && !allowedActions.includes(action)) {
    conflicts.push({ id: 'authority_scope_exceeds_role', severity: 'high', message: `Role "${role}" is not authorized for action "${action}"`, remediation: 'Use a role with sufficient authority or choose a different action' });
  }

  // expired but used
  if (expiresAt && expiresAt < now) {
    conflicts.push({ id: 'authority_expired_but_used', severity: 'high', message: `Contract expired at ${new Date(expiresAt).toISOString()} but is being evaluated`, remediation: 'Renew contract before use' });
  }

  // rejected but used
  if (decision === 'rejected') {
    conflicts.push({ id: 'authority_rejected_but_used', severity: 'high', message: 'Contract review_decision is rejected but evaluation is proceeding', remediation: 'Request new approval — rejected contracts cannot authorize any action' });
  }

  // missing required evidence
  const requiredEvidence = ACTION_EVIDENCE_MAP[action] || [];
  if (requiredEvidence.length > 0 && evidenceRefs.length === 0) {
    conflicts.push({ id: 'authority_missing_required_evidence', severity: 'high', message: `Action "${action}" requires evidence refs but none provided`, remediation: `Provide: ${requiredEvidence.join(', ')}` });
  }

  // backend evidence as real
  if (evidenceRefs.some(r => String(r).startsWith('evr_backend') || String(r).includes('backend_receipt'))) {
    conflicts.push({ id: 'authority_claims_backend_evidence_as_real', severity: 'critical', message: 'Backend-derived evidence cannot be accepted as real — evidence_receipt.source must be go-core', remediation: 'Remove backend-derived evidence refs' });
  }

  // conflict with decision matrix
  if (decisionMatrix && blockedStates.includes(decisionMatrix.decision_state) && releasingActions.includes(action)) {
    conflicts.push({ id: 'authority_conflicts_with_decision_matrix', severity: 'high', message: `Decision matrix state "${decisionMatrix.decision_state}" conflicts with action "${action}"`, remediation: 'Resolve decision matrix blockers before requesting release authorization' });
  }

  // conflict with authorization layer
  if (authorizationLayer && authorizationLayer.authorization_status !== 'AUTHORIZATION_VALID' && releasingActions.includes(action)) {
    conflicts.push({ id: 'authority_conflicts_with_authorization_layer', severity: 'medium', message: `Authorization layer status "${authorizationLayer.authorization_status}" — must be AUTHORIZATION_VALID for release actions`, remediation: 'Provide a valid authorization manifest before requesting authority review' });
  }

  return conflicts;
}

// ═══════════════════════════════════════════════════════════════════
// DERIVE AUTHORITY AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════

function deriveAuthorityAuditTrail(contract, validation, context = {}) {
  const events = [];

  if (!contract) {
    events.push(_auditEvent('contract_missing',         null, 'contract',  'system', 'Human approval contract not provided — CONTRACT_MISSING'));
    events.push(_auditEvent('deploy_blocked_by_policy', null, 'policy',    'system', 'deploy_allowed=false — absolute policy invariant enforced'));
    events.push(_auditEvent('tag_blocked_by_policy',    null, 'policy',    'system', 'tag_allowed=false — authority review is validation, not execution'));
    events.push(_auditEvent('stable_blocked_by_policy', null, 'policy',    'system', 'stable_allowed=false — deploy/tag/stable remain blocked in V15.10'));
    return events;
  }

  const cid = contract.contract_id || null;
  events.push(_auditEvent('contract_evaluation_started', cid, 'contract', 'system',                          `Contract created: action=${contract.requested_action} role=${contract.reviewer_role}`));
  events.push(_auditEvent('authority_role_checked',      cid, 'authority', contract.reviewer_role || 'system', `Role ${contract.reviewer_role} checked for ${contract.requested_action}`));
  events.push(_auditEvent('scope_checked',               cid, 'scope',    'system',                           `Scope valid=${validation.scope_valid}`));
  events.push(_auditEvent('evidence_checked',            cid, 'evidence', 'system',                           `Missing evidence: ${(validation.missing_evidence || []).join(', ') || 'none'}`));
  events.push(_auditEvent('temporal_checked',            cid, 'time',     'system',                           `Temporal valid=${validation.temporal_valid}`));
  if (Array.isArray(validation.audit_events)) {
    for (const e of validation.audit_events) events.push(e);
  }
  events.push(_auditEvent('contract_status_resolved',   cid, 'validation', 'system', `Final status: ${validation.status}`, validation.status));
  events.push(_auditEvent('invariant_enforced',         cid, 'policy',     'system', 'authority review is validation, not execution — all action flags remain false', 'ENFORCED'));
  events.push(_auditEvent('deploy_blocked_by_policy',   cid, 'policy',     'system', 'deploy_allowed=false — absolute policy invariant', 'BLOCKED'));
  events.push(_auditEvent('tag_blocked_by_policy',      cid, 'policy',     'system', 'tag_allowed=false — deploy/tag/stable remain blocked in V15.10', 'BLOCKED'));
  events.push(_auditEvent('stable_blocked_by_policy',   cid, 'policy',     'system', 'stable_allowed=false — human approval cannot override PASS GOLD', 'BLOCKED'));

  return events;
}

// ═══════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════

function renderAuthorityReviewSummary(gate) {
  if (!gate) return null;
  return {
    schema_version:                SCHEMA_VERSION,
    authority_review_status:       gate.authority_review_status,
    authority_review_valid:        gate.authority_review_valid,
    human_approval_contract_valid: gate.human_approval_contract_valid,
    authority_role:                gate.authority_role,
    authority_sufficient:          gate.authority_sufficient,
    scope_valid:                   gate.scope_valid,
    temporal_valid:                gate.temporal_valid,
    missing_evidence_count:        (gate.missing_evidence || []).length,
    conflict_count:                (gate.authority_conflicts || []).length,
    critical_conflicts:            (gate.authority_conflicts || []).filter(c => c.severity === 'critical').length,
    release_authorized:            gate.release_authorized,
    deploy_authorized:             gate.deploy_authorized,
    tag_authorized:                gate.tag_authorized,
    stable_promotion_authorized:   gate.stable_promotion_authorized,
    pass_gold_confirmed:           gate.pass_gold_confirmed,
    release_allowed:               false,
    deploy_allowed:                false,
    tag_allowed:                   false,
    stable_allowed:                false,
    promotion_allowed:             false,
    note: 'authority review is validation, not execution — human approval cannot override PASS GOLD — deploy/tag/stable remain blocked in V15.10',
  };
}

function renderAuthorityReviewGate(gate) {
  if (!gate) return null;
  return {
    schema_version:                SCHEMA_VERSION,
    authority_review_status:       gate.authority_review_status,
    authority_review_valid:        gate.authority_review_valid,
    human_approval_contract_valid: gate.human_approval_contract_valid,
    authority_role:                gate.authority_role,
    authority_sufficient:          gate.authority_sufficient,
    scope_valid:                   gate.scope_valid,
    temporal_valid:                gate.temporal_valid,
    missing_evidence:              gate.missing_evidence || [],
    conflict_count:                (gate.authority_conflicts || []).length,
    approved_actions:              gate.approved_actions || [],
    release_allowed:               false,
    deploy_allowed:                false,
    tag_allowed:                   false,
    stable_allowed:                false,
    promotion_allowed:             false,
    note: 'authority review is validation, not execution — human approval cannot override PASS GOLD — deploy/tag/stable remain blocked in V15.10',
  };
}

// ═══════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════

function _auditEvent(type, contractId, category, actor, message, status = null) {
  return {
    event_id:     `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp:    Date.now(),
    type,
    actor,
    action:       category,
    status:       status || 'INFO',
    contract_ref: contractId || null,
    message,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export {
  createAuthorityRoleRegistry,
  createHumanApprovalContract,
  validateHumanApprovalContract,
  evaluateAuthorityReviewGate,
  deriveAuthorityRequirements,
  deriveAuthorityConflicts,
  deriveAuthorityAuditTrail,
  renderAuthorityReviewSummary,
  renderAuthorityReviewGate,
};
