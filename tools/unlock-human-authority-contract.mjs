#!/usr/bin/env node
/**
 * Unlock Human Authority Contract — V61.1
 *
 * Human authority contract for unlock review. Review-only.
 * Does NOT execute unlock, release, tag, stable, or deploy.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * unlock_executed=false always. unlock_review_only=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v61.1';

export const UNLOCK_AUTHORITY_STATUSES = [
  'UNLOCK_AUTHORITY_MISSING',
  'UNLOCK_AUTHORITY_INVALID',
  'UNLOCK_AUTHORITY_REJECTED',
  'UNLOCK_AUTHORITY_EXPIRED',
  'UNLOCK_AUTHORITY_SCOPE_MISMATCH',
  'UNLOCK_AUTHORITY_PHRASE_MISMATCH',
  'UNLOCK_AUTHORITY_READY_REVIEW',
];

export const REQUIRED_CONFIRMATION_PHRASE =
  'I ACKNOWLEDGE THIS IS AN UNLOCK REVIEW ONLY AND DOES NOT EXECUTE RELEASE TAG STABLE PROMOTION OR DEPLOY';

export const AUTHORITY_DENIED_CAPABILITIES = [
  'release_execution',
  'tag_creation',
  'stable_promotion',
  'deploy_execution',
  'git_push',
  'production_write',
  'evidence_override',
  'go_core_override',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    unlock_executed:              false,
    unlock_review_only:           true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:     SCHEMA_VERSION,
    authority_status:   status,
    authority_ready:    false,
    blocking_reason,
    ...extra,
    ..._locked(),
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    unlock_executed:              false,
    unlock_review_only:           true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create an unlock human authority contract (review-only).
 */
export function createUnlockHumanAuthorityContract(params = {}) {
  const {
    unlock_contract_id,
    confirmed_by,
    confirmer_role,
    authority_decision,
    authority_scope,
    confirmation_phrase,
    evidence_acknowledged,
    lock_acknowledged,
    production_risk_acknowledged,
    rollback_acknowledged,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const unlock_authority_id = _sha256(`fixture-unlock-authority:${now}`).slice(0, 24);
    const expires_at = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();
    return {
      schema_version:               SCHEMA_VERSION,
      unlock_authority_id,
      authority_status:             'UNLOCK_AUTHORITY_READY_REVIEW',
      authority_ready:              true,
      unlock_contract_id:           'fixture-unlock-contract-id',
      confirmed_by:                 'fixture-reviewer',
      confirmer_role:               'release_authority',
      authority_decision:           'approved',
      authority_scope:              'review_full_manual_release_unlock',
      confirmation_phrase:          REQUIRED_CONFIRMATION_PHRASE,
      evidence_acknowledged:        true,
      lock_acknowledged:            true,
      production_risk_acknowledged: true,
      rollback_acknowledged:        true,
      denied_capabilities:          AUTHORITY_DENIED_CAPABILITIES,
      created_at:                   now,
      expires_at,
      blocking_reason:              null,
      ..._locked(),
    };
  }

  // Decision must be approved
  if (!authority_decision || authority_decision !== 'approved') {
    return _blocked('UNLOCK_AUTHORITY_REJECTED', 'authority_decision_not_approved', {
      authority_decision: authority_decision ?? null,
    });
  }

  // Phrase must match exactly
  if (!confirmation_phrase || confirmation_phrase !== REQUIRED_CONFIRMATION_PHRASE) {
    return _blocked('UNLOCK_AUTHORITY_PHRASE_MISMATCH', 'confirmation_phrase_mismatch');
  }

  // All acknowledgements required
  if (evidence_acknowledged !== true) {
    return _blocked('UNLOCK_AUTHORITY_INVALID', 'evidence_acknowledged_required');
  }
  if (lock_acknowledged !== true) {
    return _blocked('UNLOCK_AUTHORITY_INVALID', 'lock_acknowledged_required');
  }
  if (production_risk_acknowledged !== true) {
    return _blocked('UNLOCK_AUTHORITY_INVALID', 'production_risk_acknowledged_required');
  }
  if (rollback_acknowledged !== true) {
    return _blocked('UNLOCK_AUTHORITY_INVALID', 'rollback_acknowledged_required');
  }

  const unlock_authority_id = _sha256([
    'unlock-authority',
    unlock_contract_id ?? '',
    confirmed_by ?? '',
    authority_scope ?? '',
    now,
  ].join(':')).slice(0, 24);

  const expires_at = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();

  return {
    schema_version:               SCHEMA_VERSION,
    unlock_authority_id,
    authority_status:             'UNLOCK_AUTHORITY_READY_REVIEW',
    authority_ready:              true,
    unlock_contract_id:           unlock_contract_id ?? null,
    confirmed_by:                 confirmed_by ?? null,
    confirmer_role:               confirmer_role ?? null,
    authority_decision,
    authority_scope:              authority_scope ?? null,
    confirmation_phrase,
    evidence_acknowledged:        true,
    lock_acknowledged:            true,
    production_risk_acknowledged: true,
    rollback_acknowledged:        true,
    denied_capabilities:          AUTHORITY_DENIED_CAPABILITIES,
    created_at:                   now,
    expires_at,
    blocking_reason:              null,
    ..._locked(),
  };
}

/**
 * Validate an unlock human authority contract.
 */
export function validateUnlockHumanAuthorityContract(authority) {
  if (!authority) return _blocked('UNLOCK_AUTHORITY_MISSING', 'authority_null');

  if (authority.schema_version !== SCHEMA_VERSION) {
    return _blocked('UNLOCK_AUTHORITY_INVALID', `schema_version_mismatch:expected_${SCHEMA_VERSION}`);
  }

  if (!authority.unlock_authority_id || typeof authority.unlock_authority_id !== 'string') {
    return _blocked('UNLOCK_AUTHORITY_INVALID', 'unlock_authority_id_missing');
  }

  if (authority.production_execution_locked !== true) {
    return _blocked('UNLOCK_AUTHORITY_INVALID', 'production_execution_locked_must_be_true');
  }

  if (authority.unlock_executed !== false) {
    return _blocked('UNLOCK_AUTHORITY_INVALID', 'unlock_executed_must_be_false');
  }

  if (authority.confirmation_phrase !== REQUIRED_CONFIRMATION_PHRASE) {
    return _blocked('UNLOCK_AUTHORITY_PHRASE_MISMATCH', 'confirmation_phrase_mismatch');
  }

  if (!Array.isArray(authority.denied_capabilities) || authority.denied_capabilities.length < AUTHORITY_DENIED_CAPABILITIES.length) {
    return _blocked('UNLOCK_AUTHORITY_INVALID', 'denied_capabilities_missing_or_incomplete');
  }

  return { valid: true, unlock_authority_id: authority.unlock_authority_id, ..._locked() };
}

/**
 * Bind unlock authority to a contract (returns combined view).
 */
export function bindUnlockAuthorityToContract(authority, contract) {
  if (!authority || authority.authority_ready !== true) {
    return _blocked('UNLOCK_AUTHORITY_MISSING', 'authority_not_ready');
  }
  if (!contract || contract.contract_ready !== true) {
    return _blocked('UNLOCK_AUTHORITY_INVALID', 'contract_not_ready');
  }
  return {
    schema_version:        SCHEMA_VERSION,
    unlock_authority_id:   authority.unlock_authority_id,
    unlock_contract_id:    contract.unlock_contract_id,
    authority_bound:       true,
    authority_status:      authority.authority_status,
    contract_status:       contract.contract_status,
    authority_scope:       authority.authority_scope,
    requested_scope:       contract.requested_scope,
    ..._locked(),
  };
}

/**
 * Render a human-readable authority summary.
 */
export function renderUnlockHumanAuthoritySummary(authority) {
  if (!authority) return 'unlock_authority: null';
  const lines = [
    `authority_status             : ${authority.authority_status ?? 'UNKNOWN'}`,
    `unlock_authority_id          : ${authority.unlock_authority_id ?? 'none'}`,
    `authority_decision           : ${authority.authority_decision ?? 'none'}`,
    `authority_scope              : ${authority.authority_scope ?? 'none'}`,
    `evidence_acknowledged        : ${authority.evidence_acknowledged ?? false}`,
    `production_execution_locked  : true`,
    `unlock_executed              : false`,
    `unlock_review_only           : true`,
    `denied_capabilities          : ${authority.denied_capabilities?.length ?? 0}`,
    `blocking_reason              : ${authority.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('unlock-human-authority-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createUnlockHumanAuthorityContract({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderUnlockHumanAuthoritySummary(result));
  }

  process.exit(result.authority_ready ? 0 : 1);
}
