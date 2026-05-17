#!/usr/bin/env node
/**
 * Supervised Release Intent Contract — V41.0
 *
 * Models explicit human-controlled release supervision intent.
 * Does NOT execute release. Models intent only.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - release_performed=false always.
 * - local_only=true required.
 * - supervised_only=true required.
 * - evidence_source=go-core required for valid intent.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v41.0';

export const RELEASE_INTENT_STATUSES = [
  'RELEASE_INTENT_MISSING',
  'RELEASE_INTENT_INVALID',
  'RELEASE_INTENT_EXPIRED',
  'RELEASE_INTENT_EVIDENCE_MISSING',
  'RELEASE_INTENT_AUTHORITY_MISSING',
  'RELEASE_INTENT_CONFLICTING',
  'RELEASE_INTENT_VALID',
];

export const ALLOWED_REQUESTED_ACTIONS = [
  'release_review',
  'supervised_release_candidate',
  'manual_promotion_review',
];

function _locked() {
  return {
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    tag_allowed:       false,
    release_performed: false,
  };
}

function _blocked(status, blocking_reason = 'blocked', intent_id = null) {
  return {
    schema_version:        SCHEMA_VERSION,
    release_intent_status: status,
    release_intent_valid:  false,
    intent_id,
    blocking_reason,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a supervised release intent object with sensible defaults.
 */
export function createSupervisedReleaseIntent(options = {}) {
  const now    = options._mock_timestamp ?? new Date().toISOString();
  const future = options.expires_at      ?? new Date(new Date(now).getTime() + 86400000).toISOString();
  const seed   = `${now}:${options.runtime_candidate_id ?? 'seed'}`;
  return {
    intent_id:             options.intent_id             ?? `intent_${createHash('sha256').update(seed).digest('hex').slice(0, 16)}`,
    schema_version:        SCHEMA_VERSION,
    requested_by:          options.requested_by          ?? null,
    requested_action:      options.requested_action      ?? null,
    target_version:        options.target_version        ?? null,
    target_branch:         options.target_branch         ?? null,
    git_head:              options.git_head              ?? null,
    runtime_candidate_id:  options.runtime_candidate_id  ?? null,
    evidence_package_id:   options.evidence_package_id   ?? null,
    evidence_receipt_id:   options.evidence_receipt_id   ?? null,
    evidence_source:       options.evidence_source       ?? null,
    authority_contract_id: options.authority_contract_id ?? null,
    created_at:            now,
    expires_at:            future,
    local_only:            options.local_only      !== undefined ? options.local_only      : true,
    supervised_only:       options.supervised_only !== undefined ? options.supervised_only : true,
  };
}

/**
 * Normalize/coerce intent input — fills in missing defaults without enforcing rules.
 */
export function normalizeSupervisedReleaseIntent(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    ...input,
    schema_version:  input.schema_version  !== undefined ? input.schema_version  : SCHEMA_VERSION,
    local_only:      input.local_only      !== undefined ? input.local_only      : true,
    supervised_only: input.supervised_only !== undefined ? input.supervised_only : true,
  };
}

/**
 * Validate a supervised release intent.
 *
 * @param {Object} intent
 * @param {Object} options
 * @param {string} [options._mock_now] - ISO timestamp override for expiry check
 * @returns {Object} Validation result
 */
export function validateSupervisedReleaseIntent(intent, options = {}) {
  if (!intent || typeof intent !== 'object') {
    return _blocked('RELEASE_INTENT_MISSING', 'intent_missing');
  }

  const id = intent.intent_id ?? null;

  if (intent.schema_version !== SCHEMA_VERSION) {
    return _blocked('RELEASE_INTENT_INVALID', `invalid_schema:${intent.schema_version}`, id);
  }

  if (intent.local_only !== true) {
    return _blocked('RELEASE_INTENT_INVALID', 'local_only_required', id);
  }

  if (intent.supervised_only !== true) {
    return _blocked('RELEASE_INTENT_INVALID', 'supervised_only_required', id);
  }

  if (!ALLOWED_REQUESTED_ACTIONS.includes(intent.requested_action)) {
    return _blocked('RELEASE_INTENT_INVALID', `invalid_requested_action:${intent.requested_action}`, id);
  }

  for (const f of ['intent_id', 'requested_by', 'target_version', 'target_branch', 'git_head', 'created_at', 'expires_at']) {
    if (!intent[f]) {
      return _blocked('RELEASE_INTENT_INVALID', `missing_field:${f}`, id);
    }
  }

  const now = options._mock_now ?? new Date().toISOString();
  if (intent.expires_at < now) {
    return _blocked('RELEASE_INTENT_EXPIRED', `intent_expired:${intent.expires_at}`, id);
  }

  if (intent.evidence_source !== 'go-core') {
    return _blocked('RELEASE_INTENT_EVIDENCE_MISSING', `invalid_evidence_source:${intent.evidence_source}`, id);
  }

  if (!intent.runtime_candidate_id || !intent.evidence_package_id || !intent.evidence_receipt_id) {
    return _blocked('RELEASE_INTENT_EVIDENCE_MISSING', 'missing_evidence_fields', id);
  }

  if (!intent.authority_contract_id) {
    return _blocked('RELEASE_INTENT_AUTHORITY_MISSING', 'missing_authority_contract_id', id);
  }

  return {
    schema_version:        SCHEMA_VERSION,
    release_intent_status: 'RELEASE_INTENT_VALID',
    release_intent_valid:  true,
    intent_id:             intent.intent_id,
    requested_by:          intent.requested_by,
    requested_action:      intent.requested_action,
    target_version:        intent.target_version,
    target_branch:         intent.target_branch,
    git_head:              intent.git_head,
    runtime_candidate_id:  intent.runtime_candidate_id,
    evidence_package_id:   intent.evidence_package_id,
    evidence_receipt_id:   intent.evidence_receipt_id,
    evidence_source:       'go-core',
    authority_contract_id: intent.authority_contract_id,
    created_at:            intent.created_at,
    expires_at:            intent.expires_at,
    local_only:            true,
    supervised_only:       true,
    blocking_reason:       null,
    ..._locked(),
  };
}

/**
 * Render human-readable summary of a validation result.
 */
export function renderSupervisedReleaseIntentSummary(result) {
  if (!result) return 'No result provided.';
  return [
    `release_intent_status  : ${result.release_intent_status ?? 'N/A'}`,
    `release_intent_valid   : ${result.release_intent_valid  ?? false}`,
    `intent_id              : ${result.intent_id             ?? 'null'}`,
    `deploy_allowed         : ${result.deploy_allowed}`,
    `promotion_allowed      : ${result.promotion_allowed}`,
    `stable_allowed         : ${result.stable_allowed}`,
    `tag_allowed            : ${result.tag_allowed}`,
    `blocking_reason        : ${result.blocking_reason       ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('supervised-release-intent-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture-mode');

  let result;
  if (fixture) {
    const intent = createSupervisedReleaseIntent({
      intent_id:             'fixture-intent-410',
      requested_by:          'fixture-operator',
      requested_action:      'supervised_release_candidate',
      target_version:        'v41.0',
      target_branch:         'main',
      git_head:              'abc1234fixture410',
      runtime_candidate_id:  'fixture-candidate-410',
      evidence_package_id:   'fixture-pkg-410',
      evidence_receipt_id:   'fixture-receipt-410',
      evidence_source:       'go-core',
      authority_contract_id: 'fixture-authority-410',
      expires_at:            '2099-12-31T00:00:00.000Z',
    });
    result = validateSupervisedReleaseIntent(intent);
  } else {
    result = validateSupervisedReleaseIntent(null);
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderSupervisedReleaseIntentSummary(result));
  }

  process.exit(result.release_intent_valid ? 0 : 1);
}
