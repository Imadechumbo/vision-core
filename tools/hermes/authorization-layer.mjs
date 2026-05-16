#!/usr/bin/env node
/**
 * Hermes Authorization Layer — V15.8
 * Runtime Evidence Authorization Layer
 *
 * REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não stable.
 * Authorization is modeled, not executed.
 * deploy/tag/stable remain blocked in V15.8.
 * Explicit authorization is required for any release action.
 */

const SCHEMA_VERSION = 'v15.8';
const VALID_SIGNATURE_ALGORITHMS = ['simulation-sha256', 'simulation-hmac-sha256'];

// ═══════════════════════════════════════════════════════════════════
// AUTHORIZATION STATUSES
// ═══════════════════════════════════════════════════════════════════

const AUTHORIZATION_STATUSES = [
  'AUTHORIZATION_MISSING',
  'AUTHORIZATION_INVALID',
  'AUTHORIZATION_PARTIAL',
  'AUTHORIZATION_VALID',
  'AUTHORIZATION_REJECTED',
  'AUTHORIZATION_EXPIRED',
];

const VALID_REQUESTED_ACTIONS = [
  'release_review',
  'release_candidate_approval',
  'deploy_approval',
  'tag_approval',
  'stable_promotion_approval',
];

// ═══════════════════════════════════════════════════════════════════
// CREATE AUTHORIZATION MANIFEST
// ═══════════════════════════════════════════════════════════════════

function createAuthorizationManifest(overrides = {}) {
  const now = Date.now();
  const id  = `auth_${now}_${Math.random().toString(36).slice(2, 10)}`;
  return {
    schema_version:   SCHEMA_VERSION,
    created_at:       now,
    authorization_id: overrides.authorization_id || id,
    mission_id:       overrides.mission_id       || null,
    requested_action: overrides.requested_action || 'release_review',
    requested_by:     overrides.requested_by     || null,
    requested_at:     overrides.requested_at     || now,
    expires_at:       overrides.expires_at       || null,
    scope:            overrides.scope            || null,
    reason:           overrides.reason           || null,
    approvals:        Array.isArray(overrides.approvals)     ? overrides.approvals     : [],
    constraints:      overrides.constraints                  || {},
    evidence_refs:    Array.isArray(overrides.evidence_refs) ? overrides.evidence_refs : [],
    status:           'AUTHORIZATION_MISSING',
  };
}

// ═══════════════════════════════════════════════════════════════════
// CREATE AUTHORIZATION POLICY
// ═══════════════════════════════════════════════════════════════════

function createAuthorizationPolicy() {
  return {
    schema_version: SCHEMA_VERSION,
    required_authorizations: [
      'release_authorization',
      'deploy_authorization',
      'tag_authorization',
      'stable_promotion_authorization',
    ],
    allowed_actions: [],
    forbidden_actions: [
      'deploy',
      'tag',
      'stable_promotion',
      'auto_merge',
      'bypass_pass_gold',
      'accept_backend_evidence_as_real',
    ],
    invariants: {
      deploy_allowed:     false,
      promotion_allowed:  false,
      stable_allowed:     false,
      release_allowed:    false,
      tag_allowed:        false,
    },
    note: 'authorization is modeled, not executed — explicit authorization is required — deploy/tag/stable remain blocked in V15.8',
  };
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATE AUTHORIZATION MANIFEST
// ═══════════════════════════════════════════════════════════════════

function validateAuthorizationManifest(manifest, runtimeEvidence, decisionMatrix) {
  const errors   = [];
  const warnings = [];
  const missing  = [];
  const auditEvents = [];

  // Invariants — always false regardless of manifest
  const invariants = {
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    release_allowed:   false,
    tag_allowed:       false,
  };

  if (!manifest) {
    auditEvents.push(_auditEvent('authorization_missing',   null, 'validation', 'system', 'Authorization manifest not provided'));
    auditEvents.push(_auditEvent('explicit_authorization_required', null, 'policy', 'system', 'Explicit authorization is required for any release action'));
    return {
      ok:               false,
      status:           'AUTHORIZATION_MISSING',
      errors:           [],
      warnings:         ['No authorization manifest provided'],
      missing:          ['authorization_manifest'],
      approved_actions: [],
      rejected_actions: [],
      expired:          false,
      audit_events:     auditEvents,
      invariants,
    };
  }

  auditEvents.push(_auditEvent('authorization_validation_started', manifest.authorization_id, 'validation', 'system', 'Validation started'));

  // Schema check
  if (manifest.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be ${SCHEMA_VERSION}, got: ${manifest.schema_version}`);
    auditEvents.push(_auditEvent('authorization_status_resolved', manifest.authorization_id, 'validation', 'system', 'AUTHORIZATION_INVALID: schema mismatch', 'AUTHORIZATION_INVALID'));
    return _buildResult('AUTHORIZATION_INVALID', false, errors, warnings, missing, [], [], false, auditEvents, invariants);
  }

  // requested_action check
  if (!VALID_REQUESTED_ACTIONS.includes(manifest.requested_action)) {
    errors.push(`requested_action "${manifest.requested_action}" is not valid — must be one of: ${VALID_REQUESTED_ACTIONS.join(', ')}`);
    auditEvents.push(_auditEvent('authorization_status_resolved', manifest.authorization_id, 'validation', 'system', 'AUTHORIZATION_INVALID: invalid action', 'AUTHORIZATION_INVALID'));
    return _buildResult('AUTHORIZATION_INVALID', false, errors, warnings, missing, [], [], false, auditEvents, invariants);
  }

  // Signature structure check (V15.9) — hash verification is done by authorization-harness
  const sigPresent = !!(manifest.signature);
  if (sigPresent) {
    const sigCheck = _validateSignatureStructure(manifest.signature);
    if (!sigCheck.valid) {
      for (const e of sigCheck.errors) errors.push(`signature: ${e}`);
      auditEvents.push(_auditEvent('authorization_status_resolved', manifest.authorization_id, 'validation', 'system', 'AUTHORIZATION_INVALID: signature structure invalid', 'AUTHORIZATION_INVALID'));
      return _buildResult('AUTHORIZATION_INVALID', false, errors, warnings, missing, [], [], false, auditEvents, invariants, sigPresent);
    }
  }

  // Expiry check
  const now = Date.now();
  let expired = false;
  if (manifest.expires_at && manifest.expires_at < now) {
    expired = true;
    errors.push(`Authorization expired at ${new Date(manifest.expires_at).toISOString()}`);
    auditEvents.push(_auditEvent('authorization_status_resolved', manifest.authorization_id, 'validation', 'system', 'AUTHORIZATION_EXPIRED', 'AUTHORIZATION_EXPIRED'));
    return _buildResult('AUTHORIZATION_EXPIRED', false, errors, warnings, missing, [], [], true, auditEvents, invariants);
  }

  // Approvals validation
  const approvedActions  = [];
  const rejectedActions  = [];
  let hasRejected = false;
  let hasApprovals = Array.isArray(manifest.approvals) && manifest.approvals.length > 0;

  if (hasApprovals) {
    for (const approval of manifest.approvals) {
      if (!approval.approver) {
        errors.push('approval missing approver field');
        continue;
      }
      if (!approval.approved_at) {
        errors.push(`approval from ${approval.approver} missing approved_at`);
        continue;
      }
      if (approval.approved === false) {
        hasRejected = true;
        rejectedActions.push(approval.approver);
        auditEvents.push(_auditEvent('approval_rejected', manifest.authorization_id, 'approval', approval.approver, `Approval rejected by ${approval.approver}`, 'AUTHORIZATION_REJECTED'));
      } else if (approval.approved === true) {
        approvedActions.push(approval.approver);
        auditEvents.push(_auditEvent('approval_granted', manifest.authorization_id, 'approval', approval.approver, `Approval granted by ${approval.approver}`, 'APPROVED'));
      }
    }
  }

  if (hasRejected) {
    auditEvents.push(_auditEvent('authorization_status_resolved', manifest.authorization_id, 'validation', 'system', 'AUTHORIZATION_REJECTED: at least one approver rejected', 'AUTHORIZATION_REJECTED'));
    return _buildResult('AUTHORIZATION_REJECTED', false, errors, warnings, missing, approvedActions, rejectedActions, false, auditEvents, invariants);
  }

  // Critical actions requiring explicit approval
  const criticalActions = ['deploy_approval', 'tag_approval', 'stable_promotion_approval'];
  const needsApproval   = criticalActions.includes(manifest.requested_action);
  if (needsApproval && !hasApprovals) {
    missing.push('explicit_approval_for_critical_action');
    warnings.push(`Action "${manifest.requested_action}" requires explicit approvals`);
  }

  // Evidence refs check
  const criticalActionsForEvidence = ['release_candidate_approval', 'deploy_approval', 'tag_approval', 'stable_promotion_approval'];
  const needsEvidenceRefs = criticalActionsForEvidence.includes(manifest.requested_action);
  const hasEvidenceRefs   = Array.isArray(manifest.evidence_refs) && manifest.evidence_refs.length > 0;

  if (needsEvidenceRefs && !hasEvidenceRefs) {
    missing.push('evidence_refs_for_critical_action');
    warnings.push(`Action "${manifest.requested_action}" requires evidence_refs`);
  }

  // Decision state constraint — blocked states cannot be elevated
  const decisionState = decisionMatrix?.decision_state || 'BLOCKED_RUNTIME';
  const blockedStates = ['BLOCKED_RUNTIME', 'BLOCKED_EVIDENCE', 'BLOCKED_POLICY'];
  if (blockedStates.includes(decisionState)) {
    warnings.push(`Decision state is ${decisionState} — authorization cannot elevate to release`);
  }

  // Determine status
  let status;
  if (errors.length > 0) {
    status = 'AUTHORIZATION_INVALID';
  } else if (missing.length > 0) {
    status = 'AUTHORIZATION_PARTIAL';
  } else if (!hasApprovals && manifest.requested_action !== 'release_review') {
    status = 'AUTHORIZATION_PARTIAL';
    missing.push('required_approvals');
  } else {
    status = 'AUTHORIZATION_VALID';
  }

  auditEvents.push(_auditEvent('authorization_status_resolved', manifest.authorization_id, 'validation', 'system', `Status resolved: ${status}`, status));
  auditEvents.push(_auditEvent('invariant_enforced', manifest.authorization_id, 'policy', 'system', 'deploy/tag/stable always blocked', 'BLOCKED'));
  auditEvents.push(_auditEvent('deploy_blocked_by_policy', manifest.authorization_id, 'policy', 'system', 'deploy_allowed=false — absolute policy invariant', 'BLOCKED'));
  auditEvents.push(_auditEvent('tag_blocked_by_policy', manifest.authorization_id, 'policy', 'system', 'tag_allowed=false — authorization is modeled, not executed', 'BLOCKED'));
  auditEvents.push(_auditEvent('stable_blocked_by_policy', manifest.authorization_id, 'policy', 'system', 'stable_allowed=false — deploy/tag/stable remain blocked in V15.8', 'BLOCKED'));

  const ok = status === 'AUTHORIZATION_VALID';
  return _buildResult(status, ok, errors, warnings, missing, approvedActions, rejectedActions, expired, auditEvents, invariants);
}

function _buildResult(status, ok, errors, warnings, missing, approvedActions, rejectedActions, expired, auditEvents, invariants, signaturePresent = false) {
  return { ok, status, errors, warnings, missing, approved_actions: approvedActions, rejected_actions: rejectedActions, expired, audit_events: auditEvents, invariants, signature_present: signaturePresent };
}

function _validateSignatureStructure(sig) {
  if (!sig) return { valid: false, errors: ['signature block is null or undefined'] };
  const errors = [];
  if (!sig.algorithm || !VALID_SIGNATURE_ALGORITHMS.includes(sig.algorithm)) {
    errors.push(`signature.algorithm must be one of [${VALID_SIGNATURE_ALGORITHMS.join(', ')}], got: ${sig.algorithm}`);
  }
  if (sig.simulation !== true) {
    errors.push('signature.simulation must be true — only simulation signatures accepted in V15.9 harness');
  }
  if (!sig.signed_by) {
    errors.push('signature.signed_by is required');
  }
  if (!sig.payload_hash) {
    errors.push('signature.payload_hash is required');
  }
  if (!sig.signature_value) {
    errors.push('signature.signature_value is required');
  }
  return { valid: errors.length === 0, errors };
}

function _auditEvent(type, authId, category, actor, message, status = null) {
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    event_id:     id,
    timestamp:    Date.now(),
    type,
    actor,
    action:       category,
    status:       status || 'INFO',
    evidence_ref: authId || null,
    message,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EVALUATE AUTHORIZATION LAYER
// ═══════════════════════════════════════════════════════════════════

function evaluateAuthorizationLayer(manifest, decisionMatrix, runtimeEvidence, hermesContext) {
  const validation    = validateAuthorizationManifest(manifest, runtimeEvidence, decisionMatrix);
  const requirements  = deriveAuthorizationRequirements(decisionMatrix, runtimeEvidence);
  const auditTrail    = deriveAuthorizationAuditTrail(manifest, validation, decisionMatrix);

  const decisionState = decisionMatrix?.decision_state || 'BLOCKED_RUNTIME';
  const blockedStates = ['BLOCKED_RUNTIME', 'BLOCKED_EVIDENCE', 'BLOCKED_POLICY'];
  const isBlocked     = blockedStates.includes(decisionState);
  const isSupervised  = decisionState === 'SUPERVISED_READY';
  const isCandidate   = decisionState === 'RELEASE_CANDIDATE';

  const authValid     = validation.status === 'AUTHORIZATION_VALID';

  // release_authorized: only if SUPERVISED_READY or RELEASE_CANDIDATE + valid auth
  const releaseAuthorized = authValid && (isSupervised || isCandidate);
  // deploy/tag/stable authorized: only if RELEASE_CANDIDATE + valid auth
  const deployAuthorized  = authValid && isCandidate;
  const tagAuthorized     = authValid && isCandidate;
  const stableAuthorized  = authValid && isCandidate;

  // gate effective state: blocked states cannot be elevated by authorization
  let releaseGateEffectiveState = decisionState;
  if (isBlocked) {
    releaseGateEffectiveState = decisionState; // stays blocked
  }

  return {
    schema_version:               SCHEMA_VERSION,
    enabled:                      true,
    authorization_status:         validation.status,
    authorization_valid:          authValid,
    release_authorized:           releaseAuthorized,
    deploy_authorized:            deployAuthorized,
    tag_authorized:               tagAuthorized,
    stable_promotion_authorized:  stableAuthorized,
    approved_actions:             validation.approved_actions,
    missing_authorizations:       validation.missing,
    authorization_errors:         validation.errors,
    authorization_warnings:       validation.warnings,
    authorization_audit_trail:    auditTrail,
    authorization_requirements:   requirements,
    release_gate_effective_state: releaseGateEffectiveState,
    signature_present:            !!(manifest?.signature),
    // Invariants — always false
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    release_allowed:   false,
    tag_allowed:       false,
    note: 'authorization is modeled, not executed — explicit authorization is required — deploy/tag/stable remain blocked in V15.8',
  };
}

// ═══════════════════════════════════════════════════════════════════
// DERIVE AUTHORIZATION REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════

function deriveAuthorizationRequirements(decisionMatrix, runtimeEvidence) {
  const decisionState = decisionMatrix?.decision_state || 'BLOCKED_RUNTIME';
  const isCandidate   = decisionState === 'RELEASE_CANDIDATE';
  const needsRelease  = decisionState === 'SUPERVISED_READY' || isCandidate;

  return [
    {
      id:                 'release_authorization',
      required:           needsRelease,
      present:            false,
      blocking_if_missing: needsRelease,
      source:             'human_operator',
      required_role:      'release_manager',
      remediation:        'Obtain explicit release authorization from release manager',
    },
    {
      id:                 'deploy_authorization',
      required:           isCandidate,
      present:            false,
      blocking_if_missing: isCandidate,
      source:             'human_operator',
      required_role:      'deployment_manager',
      remediation:        'Obtain explicit deploy authorization — only valid for RELEASE_CANDIDATE state',
    },
    {
      id:                 'tag_authorization',
      required:           isCandidate,
      present:            false,
      blocking_if_missing: isCandidate,
      source:             'human_operator',
      required_role:      'release_manager',
      remediation:        'Obtain explicit tag authorization — only valid for RELEASE_CANDIDATE state',
    },
    {
      id:                 'stable_promotion_authorization',
      required:           isCandidate,
      present:            false,
      blocking_if_missing: isCandidate,
      source:             'human_operator',
      required_role:      'product_owner',
      remediation:        'Obtain explicit stable promotion authorization — only valid for RELEASE_CANDIDATE state',
    },
    {
      id:                 'pass_gold_authority_confirmation',
      required:           true,
      present:            false,
      blocking_if_missing: true,
      source:             'go_core_runtime',
      required_role:      'pass_gold_authority',
      remediation:        'PASS GOLD authority must confirm with real Go Core evidence — evidence_receipt.source must be go-core',
    },
    {
      id:                 'go_core_evidence_confirmation',
      required:           true,
      present:            runtimeEvidence?.sources?.go_core?.evidence_present === true,
      blocking_if_missing: true,
      source:             'go_core_runtime',
      required_role:      'go_core_agent',
      remediation:        'Go Core must run and produce evidence_receipt — backend_stub must be false',
    },
    {
      id:                 'ci_remote_confirmation',
      required:           true,
      present:            false,
      blocking_if_missing: false,
      source:             'ci_system',
      required_role:      'ci_agent',
      remediation:        'All remote CI checks must pass — verify via GitHub API',
    },
    {
      id:                 'scope_review_confirmation',
      required:           true,
      present:            runtimeEvidence?.sources?.security?.forbidden_scope_clean === true,
      blocking_if_missing: true,
      source:             'security_scan',
      required_role:      'security_reviewer',
      remediation:        'Scope review must confirm no forbidden files (frontend/backend/go-core) were changed',
    },
    {
      id:                 'security_review_confirmation',
      required:           true,
      present:            runtimeEvidence?.sources?.security?.fake_evidence_scan_clean === true,
      blocking_if_missing: true,
      source:             'security_scan',
      required_role:      'security_reviewer',
      remediation:        'Security review must confirm fake evidence absent and no hardcoded PASS GOLD',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// DERIVE AUTHORIZATION AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════

function deriveAuthorizationAuditTrail(manifest, validation, decisionMatrix) {
  const events = [];

  if (!manifest) {
    events.push(_auditEvent('authorization_missing',          null, 'manifest', 'system', 'Authorization manifest not provided — AUTHORIZATION_MISSING', 'AUTHORIZATION_MISSING'));
    events.push(_auditEvent('explicit_authorization_required', null, 'policy',   'system', 'Explicit authorization is required for any release action',    'REQUIRED'));
    events.push(_auditEvent('deploy_blocked_by_policy',        null, 'policy',   'system', 'deploy_allowed=false — absolute policy invariant enforced',     'BLOCKED'));
    events.push(_auditEvent('tag_blocked_by_policy',           null, 'policy',   'system', 'tag_allowed=false — authorization is modeled, not executed',    'BLOCKED'));
    events.push(_auditEvent('stable_blocked_by_policy',        null, 'policy',   'system', 'stable_allowed=false — deploy/tag/stable remain blocked',       'BLOCKED'));
    return events;
  }

  const authId = manifest.authorization_id || null;

  events.push(_auditEvent('authorization_manifest_created',  authId, 'manifest',   'system', `Manifest created: action=${manifest.requested_action}`,     'CREATED'));
  events.push(_auditEvent('authorization_validation_started', authId, 'validation', 'system', 'Validation process started',                                 'STARTED'));

  // Include events from validation
  if (validation && Array.isArray(validation.audit_events)) {
    for (const evt of validation.audit_events) {
      events.push(evt);
    }
  }

  events.push(_auditEvent('authorization_status_resolved', authId, 'validation', 'system', `Final status: ${validation?.status || 'UNKNOWN'}`, validation?.status || 'UNKNOWN'));
  events.push(_auditEvent('invariant_enforced',           authId, 'policy',     'system', 'All action flags remain false — authorization is modeled, not executed', 'ENFORCED'));
  events.push(_auditEvent('deploy_blocked_by_policy',     authId, 'policy',     'system', 'deploy_allowed=false enforced by absolute policy invariant',    'BLOCKED'));
  events.push(_auditEvent('tag_blocked_by_policy',        authId, 'policy',     'system', 'tag_allowed=false — authorization is modeled, not executed',    'BLOCKED'));
  events.push(_auditEvent('stable_blocked_by_policy',     authId, 'policy',     'system', 'stable_allowed=false — deploy/tag/stable remain blocked in V15.8', 'BLOCKED'));

  return events;
}

// ═══════════════════════════════════════════════════════════════════
// RENDER AUTHORIZATION SUMMARY
// ═══════════════════════════════════════════════════════════════════

function renderAuthorizationSummary(authLayer) {
  if (!authLayer) return null;
  return {
    schema_version:        SCHEMA_VERSION,
    authorization_status:  authLayer.authorization_status,
    authorization_valid:   authLayer.authorization_valid,
    release_authorized:    authLayer.release_authorized,
    deploy_authorized:     authLayer.deploy_authorized,
    tag_authorized:        authLayer.tag_authorized,
    stable_authorized:     authLayer.stable_promotion_authorized,
    missing_count:         (authLayer.missing_authorizations || []).length,
    error_count:           (authLayer.authorization_errors   || []).length,
    warning_count:         (authLayer.authorization_warnings || []).length,
    audit_event_count:     (authLayer.authorization_audit_trail || []).length,
    deploy_allowed:        false,
    promotion_allowed:     false,
    stable_allowed:        false,
    release_allowed:       false,
    tag_allowed:           false,
    note: 'authorization is modeled, not executed — explicit authorization is required — deploy/tag/stable remain blocked in V15.8',
  };
}

// ═══════════════════════════════════════════════════════════════════
// RENDER AUTHORIZATION GATE
// ═══════════════════════════════════════════════════════════════════

function renderAuthorizationGate(authLayer) {
  if (!authLayer) return null;
  const requirements = authLayer.authorization_requirements || [];
  const missing      = authLayer.missing_authorizations     || [];
  const errors       = authLayer.authorization_errors       || [];

  return {
    schema_version:               SCHEMA_VERSION,
    authorization_status:         authLayer.authorization_status,
    authorization_valid:          authLayer.authorization_valid,
    release_gate_effective_state: authLayer.release_gate_effective_state,
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    release_allowed:              false,
    tag_allowed:                  false,
    required_authorizations:      requirements.filter(r => r.required).map(r => r.id),
    missing_authorizations:       missing,
    blocking_missing:             requirements.filter(r => r.required && !r.present && r.blocking_if_missing).map(r => r.id),
    missing_count:                missing.length,
    blocker_count:                errors.length,
    note: 'explicit authorization required for any release action — deploy/tag/stable remain blocked in V15.8',
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export {
  createAuthorizationManifest,
  createAuthorizationPolicy,
  validateAuthorizationManifest,
  evaluateAuthorizationLayer,
  deriveAuthorizationRequirements,
  deriveAuthorizationAuditTrail,
  renderAuthorizationSummary,
  renderAuthorizationGate,
};
