#!/usr/bin/env node
/**
 * Human Confirmation Contract — V46.1
 *
 * Creates and validates the explicit human confirmation required before
 * any manual release execution review. Human confirmation does NOT
 * substitute Go Core evidence and does NOT execute any release.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always
 * - promotion_allowed=false always
 * - stable_allowed=false always
 * - tag_allowed=false always
 * - release_performed=false always
 * - tag_created=false always
 * - stable_promoted=false always
 * - deploy_performed=false always
 */

import { sha256, makeLockedFlags } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v46.1';

export const REQUIRED_CONFIRMATION_PHRASE =
  'I ACKNOWLEDGE THIS IS MANUAL REVIEW ONLY AND DOES NOT EXECUTE DEPLOY TAG OR STABLE PROMOTION';

export const REQUIRED_DENIED_CAPABILITIES = [
  'deploy_execution',
  'tag_creation',
  'stable_promotion',
  'automatic_release',
  'evidence_override',
  'go_core_override',
];

export const HUMAN_CONFIRMATION_STATUSES = [
  'HUMAN_CONFIRMATION_MISSING',
  'HUMAN_CONFIRMATION_INVALID',
  'HUMAN_CONFIRMATION_REJECTED',
  'HUMAN_CONFIRMATION_EXPIRED',
  'HUMAN_CONFIRMATION_SCOPE_MISMATCH',
  'HUMAN_CONFIRMATION_PHRASE_MISMATCH',
  'HUMAN_CONFIRMATION_READY',
];

function _sha256(input) {
  return sha256(input);
}

function _locked() {
  return makeLockedFlags([
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

function _blocked(status, reason = 'blocked') {
  return {
    schema_version:               SCHEMA_VERSION,
    human_confirmation_status:    status,
    human_confirmation_ready:     false,
    blocking_reason:              reason,
    local_only:                   true,
    manual_only:                  true,
    can_create_evidence:          false,
    can_override_go_core:         false,
    can_execute_release:          false,
    ..._locked(),
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    tag_allowed:       false,
    release_performed: false,
    tag_created:       false,
    stable_promoted:   false,
    deploy_performed:  false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a human confirmation contract.
 */
export function createHumanConfirmationContract(params = {}) {
  const {
    confirmed_by,
    confirmer_role,
    confirmation_decision,
    confirmation_phrase,
    allowed_scope,
    denied_capabilities,
    evidence_acknowledged,
    rollback_acknowledged,
    production_risk_acknowledged,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const expires = new Date(new Date(now).getTime() + 4 * 60 * 60 * 1000).toISOString();

  if (fixture_mode) {
    const confirmation_id = _sha256(`human-confirm:fixture:${now}`).slice(0, 32);
    return {
      schema_version:               SCHEMA_VERSION,
      human_confirmation_status:    'HUMAN_CONFIRMATION_READY',
      human_confirmation_ready:     true,
      confirmation_id,
      confirmed_by:                 confirmed_by ?? 'fixture-human-reviewer',
      confirmer_role:               confirmer_role ?? 'release-reviewer',
      confirmation_decision:        'approved',
      confirmation_phrase:          REQUIRED_CONFIRMATION_PHRASE,
      confirmed_at:                 now,
      expires_at:                   expires,
      allowed_scope:                allowed_scope ?? ['manual_release_review'],
      denied_capabilities:          REQUIRED_DENIED_CAPABILITIES,
      evidence_acknowledged:        true,
      rollback_acknowledged:        true,
      production_risk_acknowledged: true,
      local_only:                   true,
      manual_only:                  true,
      can_create_evidence:          false,
      can_override_go_core:         false,
      can_execute_release:          false,
      blocking_reason:              null,
      ..._locked(),
    };
  }

  return validateHumanConfirmationContract({
    confirmed_by,
    confirmer_role,
    confirmation_decision,
    confirmation_phrase,
    allowed_scope,
    denied_capabilities,
    evidence_acknowledged,
    rollback_acknowledged,
    production_risk_acknowledged,
    _mock_timestamp: now,
    _expires_at: expires,
  });
}

/**
 * Validate a human confirmation contract.
 */
export function validateHumanConfirmationContract(params = {}) {
  const {
    confirmed_by,
    confirmer_role,
    confirmation_decision,
    confirmation_phrase,
    allowed_scope,
    denied_capabilities,
    evidence_acknowledged,
    rollback_acknowledged,
    production_risk_acknowledged,
    _mock_timestamp,
    _expires_at,
  } = params ?? {};

  const now     = _mock_timestamp ?? new Date().toISOString();
  const expires = _expires_at ?? new Date(new Date(now).getTime() + 4 * 60 * 60 * 1000).toISOString();

  if (!confirmed_by || !confirmer_role) {
    return _blocked('HUMAN_CONFIRMATION_INVALID', 'missing_confirmer_fields');
  }

  if (confirmation_decision !== 'approved') {
    return _blocked('HUMAN_CONFIRMATION_REJECTED', 'confirmation_not_approved');
  }

  if (confirmation_phrase !== REQUIRED_CONFIRMATION_PHRASE) {
    return _blocked('HUMAN_CONFIRMATION_PHRASE_MISMATCH', 'confirmation_phrase_mismatch');
  }

  // Scope check
  if (!Array.isArray(allowed_scope) || allowed_scope.length === 0) {
    return _blocked('HUMAN_CONFIRMATION_SCOPE_MISMATCH', 'allowed_scope_required');
  }

  // Denied capabilities check
  const caps = Array.isArray(denied_capabilities) ? denied_capabilities : [];
  const missingCaps = REQUIRED_DENIED_CAPABILITIES.filter(c => !caps.includes(c));
  if (missingCaps.length > 0) {
    return _blocked('HUMAN_CONFIRMATION_SCOPE_MISMATCH', `missing_denied_capabilities:${missingCaps.join(',')}`);
  }

  if (evidence_acknowledged !== true || rollback_acknowledged !== true || production_risk_acknowledged !== true) {
    return _blocked('HUMAN_CONFIRMATION_INVALID', 'acknowledgements_required');
  }

  const confirmation_id = _sha256(`human-confirm:${confirmed_by}:${confirmer_role}:${now}`).slice(0, 32);

  return {
    schema_version:               SCHEMA_VERSION,
    human_confirmation_status:    'HUMAN_CONFIRMATION_READY',
    human_confirmation_ready:     true,
    confirmation_id,
    confirmed_by,
    confirmer_role,
    confirmation_decision:        'approved',
    confirmation_phrase,
    confirmed_at:                 now,
    expires_at:                   expires,
    allowed_scope,
    denied_capabilities:          caps,
    evidence_acknowledged:        true,
    rollback_acknowledged:        true,
    production_risk_acknowledged: true,
    local_only:                   true,
    manual_only:                  true,
    can_create_evidence:          false,
    can_override_go_core:         false,
    can_execute_release:          false,
    blocking_reason:              null,
    ..._locked(),
  };
}

/**
 * Bind a human confirmation to a manual release request.
 */
export function bindHumanConfirmationToManualRequest(confirmation, request) {
  if (!confirmation || confirmation.human_confirmation_ready !== true) {
    return _blocked('HUMAN_CONFIRMATION_INVALID', 'confirmation_not_ready');
  }
  if (!request || request.manual_release_request_valid !== true) {
    return _blocked('HUMAN_CONFIRMATION_INVALID', 'request_not_valid');
  }
  return {
    ...confirmation,
    bound_to_request_id: request.request_id,
    binding_valid:       true,
    ..._locked(),
  };
}

/**
 * Render human confirmation summary.
 */
export function renderHumanConfirmationSummary(confirmation) {
  if (!confirmation) return 'HUMAN_CONFIRMATION_CONTRACT: null';

  const lines = [
    `HUMAN_CONFIRMATION_CONTRACT V46.1`,
    `status               : ${confirmation.human_confirmation_status ?? 'UNKNOWN'}`,
    `ready                : ${confirmation.human_confirmation_ready ?? false}`,
    `confirmation_id      : ${confirmation.confirmation_id ?? 'none'}`,
    `confirmed_by         : ${confirmation.confirmed_by ?? 'none'}`,
    `confirmer_role       : ${confirmation.confirmer_role ?? 'none'}`,
    `decision             : ${confirmation.confirmation_decision ?? 'none'}`,
    `evidence_acknowledged: ${confirmation.evidence_acknowledged ?? false}`,
    `rollback_acknowledged: ${confirmation.rollback_acknowledged ?? false}`,
    `production_risk      : ${confirmation.production_risk_acknowledged ?? false}`,
    `can_create_evidence  : false`,
    `can_override_go_core : false`,
    `can_execute_release  : false`,
    `deploy_allowed       : false`,
    `tag_allowed          : false`,
    `stable_allowed       : false`,
    `blocking             : ${confirmation.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('human-confirmation-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createHumanConfirmationContract({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderHumanConfirmationSummary(result));
  }

  process.exit(result.human_confirmation_ready ? 0 : 1);
}
