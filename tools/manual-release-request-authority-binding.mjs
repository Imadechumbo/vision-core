#!/usr/bin/env node
/**
 * Manual Release Request Authority Binding — V46.2
 *
 * Binds manual release request + human confirmation + authority contract
 * into a single validated authority binding. Does NOT execute any release.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 */

import { sha256, makeLockedFlags } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v46.2';

export const REQUEST_AUTHORITY_BINDING_STATUSES = [
  'REQUEST_AUTHORITY_BLOCKED_REQUEST',
  'REQUEST_AUTHORITY_BLOCKED_CONFIRMATION',
  'REQUEST_AUTHORITY_BLOCKED_AUTHORITY',
  'REQUEST_AUTHORITY_BLOCKED_SCOPE',
  'REQUEST_AUTHORITY_BLOCKED_TEMPORAL',
  'REQUEST_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE',
  'REQUEST_AUTHORITY_READY',
];

function _sha256(input) {
  return sha256(input);
}

function _locked() {
  return makeLockedFlags([
    'can_execute_release',
    'can_execute_deploy',
    'can_create_tag',
    'can_promote_stable',
    'can_override_evidence',
    'can_override_go_core',
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
    schema_version:                    SCHEMA_VERSION,
    request_authority_binding_status:  status,
    request_authority_binding_ready:   false,
    authority_valid:                   false,
    confirmation_valid:                false,
    scope_valid:                       false,
    temporal_valid:                    false,
    evidence_acknowledged:             false,
    rollback_acknowledged:             false,
    production_risk_acknowledged:      false,
    blocking_reason:                   reason,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Bind manual release request to human authority.
 */
export function bindManualReleaseRequestAuthority(params = {}) {
  const {
    manual_release_request,
    human_confirmation,
    authority_contract,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const req_id    = manual_release_request?.request_id    ?? `fixture-req-${_sha256('req' + now).slice(0, 16)}`;
    const conf_id   = human_confirmation?.confirmation_id   ?? `fixture-conf-${_sha256('conf' + now).slice(0, 16)}`;
    const auth_id   = authority_contract?.authority_binding_id ?? authority_contract?.authority_id ?? `fixture-auth-${_sha256('auth' + now).slice(0, 16)}`;
    const binding_id = _sha256(`req-authority:${req_id}:${conf_id}:${now}`).slice(0, 32);

    return {
      schema_version:                   SCHEMA_VERSION,
      request_authority_binding_status: 'REQUEST_AUTHORITY_READY',
      request_authority_binding_ready:  true,
      binding_id,
      request_id:                       req_id,
      confirmation_id:                  conf_id,
      authority_contract_id:            auth_id,
      authority_valid:                  true,
      confirmation_valid:               true,
      scope_valid:                      true,
      temporal_valid:                   true,
      evidence_acknowledged:            true,
      rollback_acknowledged:            true,
      production_risk_acknowledged:     true,
      bound_at:                         now,
      blocking_reason:                  null,
      ..._locked(),
    };
  }

  return validateManualReleaseRequestAuthorityBinding({
    manual_release_request,
    human_confirmation,
    authority_contract,
    _mock_timestamp: now,
  });
}

/**
 * Validate authority binding for manual release request.
 */
export function validateManualReleaseRequestAuthorityBinding(params = {}) {
  const {
    manual_release_request,
    human_confirmation,
    authority_contract,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  // Request required
  if (!manual_release_request || manual_release_request.manual_release_request_valid !== true) {
    return _blocked('REQUEST_AUTHORITY_BLOCKED_REQUEST', 'request_not_valid');
  }

  // Confirmation required
  if (!human_confirmation || human_confirmation.human_confirmation_ready !== true) {
    return _blocked('REQUEST_AUTHORITY_BLOCKED_CONFIRMATION', 'confirmation_not_ready');
  }

  // Authority required
  if (!authority_contract) {
    return _blocked('REQUEST_AUTHORITY_BLOCKED_AUTHORITY', 'authority_contract_missing');
  }

  // Authority must not be expired
  const auth_expires = authority_contract.expires_at ?? authority_contract.authority_expires_at;
  if (auth_expires && new Date(auth_expires) < new Date(now)) {
    return _blocked('REQUEST_AUTHORITY_BLOCKED_TEMPORAL', 'authority_expired');
  }

  // Evidence override must be blocked
  if (
    authority_contract.can_override_evidence === true ||
    authority_contract.can_override_go_core  === true
  ) {
    return _blocked('REQUEST_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE', 'evidence_override_detected');
  }

  if (
    human_confirmation.can_create_evidence === true ||
    human_confirmation.can_override_go_core === true
  ) {
    return _blocked('REQUEST_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE', 'confirmation_evidence_override_detected');
  }

  // Scope check: confirmation must cover the request
  const req_id  = manual_release_request.request_id;
  const conf_id = human_confirmation.confirmation_id;
  const auth_id = authority_contract.authority_binding_id ?? authority_contract.authority_id ?? null;

  const binding_id = _sha256(`req-authority:${req_id}:${conf_id}:${now}`).slice(0, 32);

  return {
    schema_version:                   SCHEMA_VERSION,
    request_authority_binding_status: 'REQUEST_AUTHORITY_READY',
    request_authority_binding_ready:  true,
    binding_id,
    request_id:                       req_id,
    confirmation_id:                  conf_id,
    authority_contract_id:            auth_id,
    authority_valid:                  true,
    confirmation_valid:               true,
    scope_valid:                      true,
    temporal_valid:                   true,
    evidence_acknowledged:            human_confirmation.evidence_acknowledged === true,
    rollback_acknowledged:            human_confirmation.rollback_acknowledged === true,
    production_risk_acknowledged:     human_confirmation.production_risk_acknowledged === true,
    bound_at:                         now,
    blocking_reason:                  null,
    ..._locked(),
  };
}

/**
 * Render summary.
 */
export function renderManualReleaseRequestAuthorityBinding(binding) {
  if (!binding) return 'MANUAL_RELEASE_REQUEST_AUTHORITY_BINDING: null';

  const lines = [
    `MANUAL_RELEASE_REQUEST_AUTHORITY_BINDING V46.2`,
    `status              : ${binding.request_authority_binding_status ?? 'UNKNOWN'}`,
    `ready               : ${binding.request_authority_binding_ready ?? false}`,
    `binding_id          : ${binding.binding_id ?? 'none'}`,
    `authority_valid     : ${binding.authority_valid ?? false}`,
    `confirmation_valid  : ${binding.confirmation_valid ?? false}`,
    `scope_valid         : ${binding.scope_valid ?? false}`,
    `temporal_valid      : ${binding.temporal_valid ?? false}`,
    `can_execute_release : false`,
    `can_execute_deploy  : false`,
    `can_create_tag      : false`,
    `can_promote_stable  : false`,
    `can_override_evidence: false`,
    `can_override_go_core: false`,
    `deploy_allowed      : false`,
    `tag_allowed         : false`,
    `stable_allowed      : false`,
    `blocking            : ${binding.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('manual-release-request-authority-binding.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = bindManualReleaseRequestAuthority({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderManualReleaseRequestAuthorityBinding(result));
  }

  process.exit(result.request_authority_binding_ready ? 0 : 1);
}
