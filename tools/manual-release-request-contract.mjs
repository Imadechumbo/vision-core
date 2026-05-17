#!/usr/bin/env node
/**
 * Manual Release Request Contract — V46.0
 *
 * Creates and validates the formal contract for a manual release request
 * derived from a supervised release candidate. This contract does NOT
 * execute any release, deploy, tag, or stable promotion.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always
 * - promotion_allowed=false always
 * - stable_allowed=false always
 * - tag_allowed=false always
 * - release_performed=false always
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v46.0';

export const MANUAL_RELEASE_REQUEST_STATUSES = [
  'MANUAL_RELEASE_REQUEST_MISSING',
  'MANUAL_RELEASE_REQUEST_INVALID',
  'MANUAL_RELEASE_REQUEST_EXPIRED',
  'MANUAL_RELEASE_REQUEST_BLOCKED_RC',
  'MANUAL_RELEASE_REQUEST_BLOCKED_EVIDENCE',
  'MANUAL_RELEASE_REQUEST_BLOCKED_AUTHORITY',
  'MANUAL_RELEASE_REQUEST_BLOCKED_PROMOTION_PACKAGE',
  'MANUAL_RELEASE_REQUEST_VALID',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    tag_allowed:       false,
    release_performed: false,
  };
}

function _blocked(status, reason = 'blocked') {
  return {
    schema_version:                  SCHEMA_VERSION,
    manual_release_request_status:   status,
    manual_release_request_valid:    false,
    blocking_reason:                 reason,
    local_only:                      true,
    manual_only:                     true,
    supervised_only:                 true,
    ..._locked(),
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    tag_allowed:       false,
    release_performed: false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a manual release request from a supervised release candidate pipeline.
 */
export function createManualReleaseRequest(params = {}) {
  const {
    requested_by,
    target_version,
    target_branch,
    git_head,
    supervised_rc_result,
    promotion_package_result,
    manual_review_result,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const expires = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();

  // Fixture mode — build synthetic data
  if (fixture_mode) {
    const rc_id          = supervised_rc_result?.rc_id            ?? `fixture-rc-${_sha256('fixture-rc' + now).slice(0, 16)}`;
    const release_intent = supervised_rc_result?.release_intent_id ?? `fixture-intent-${_sha256('fixture-intent' + now).slice(0, 16)}`;
    const authority_id   = supervised_rc_result?.authority_binding_id ?? `fixture-authority-${_sha256('fixture-authority' + now).slice(0, 16)}`;
    const runtime_id     = supervised_rc_result?.runtime_candidate_id ?? `fixture-runtime-${_sha256('fixture-runtime' + now).slice(0, 16)}`;
    const evidence_pkg   = supervised_rc_result?.evidence_package_id ?? `fixture-evpkg-${_sha256('fixture-evpkg' + now).slice(0, 16)}`;
    const evidence_rcpt  = supervised_rc_result?.evidence_receipt_id ?? `fixture-receipt-${_sha256('fixture-receipt' + now).slice(0, 16)}`;
    const promo_pkg_id   = promotion_package_result?.package_id ?? `fixture-promopkg-${_sha256('fixture-promopkg' + now).slice(0, 16)}`;
    const review_id      = manual_review_result?.review_id ?? `fixture-review-${_sha256('fixture-review' + now).slice(0, 16)}`;

    const request_id = _sha256(`manual-request:${rc_id}:${now}`).slice(0, 32);

    return {
      schema_version:              SCHEMA_VERSION,
      manual_release_request_status: 'MANUAL_RELEASE_REQUEST_VALID',
      manual_release_request_valid:  true,
      request_id,
      requested_by:                requested_by ?? 'fixture-actor',
      requested_action:            'manual_release_execution_review',
      target_version:              target_version ?? '0.0.0-fixture',
      target_branch:               target_branch ?? 'main',
      git_head:                    git_head ?? `fixture-head-${_sha256('git-head' + now).slice(0, 16)}`,
      supervised_rc_id:            rc_id,
      release_intent_id:           release_intent,
      authority_binding_id:        authority_id,
      runtime_candidate_id:        runtime_id,
      evidence_package_id:         evidence_pkg,
      evidence_receipt_id:         evidence_rcpt,
      evidence_source:             'go-core',
      promotion_package_id:        promo_pkg_id,
      manual_review_id:            review_id,
      created_at:                  now,
      expires_at:                  expires,
      local_only:                  true,
      manual_only:                 true,
      supervised_only:             true,
      blocking_reason:             null,
      ..._locked(),
    };
  }

  // Live mode — validate inputs
  return validateManualReleaseRequest({
    requested_by,
    target_version,
    target_branch,
    git_head,
    supervised_rc_result,
    promotion_package_result,
    manual_review_result,
    _mock_timestamp: now,
    _expires_at: expires,
  });
}

/**
 * Validate a manual release request.
 */
export function validateManualReleaseRequest(params = {}) {
  const {
    requested_by,
    target_version,
    target_branch,
    git_head,
    supervised_rc_result,
    promotion_package_result,
    manual_review_result,
    _mock_timestamp,
    _expires_at,
  } = params ?? {};

  const now     = _mock_timestamp ?? new Date().toISOString();
  const expires = _expires_at ?? new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();

  if (!requested_by || !target_version || !target_branch || !git_head) {
    return _blocked('MANUAL_RELEASE_REQUEST_INVALID', 'missing_required_fields');
  }

  // Supervised RC required
  if (!supervised_rc_result || supervised_rc_result.supervised_release_candidate_ready !== true) {
    return _blocked('MANUAL_RELEASE_REQUEST_BLOCKED_RC', 'supervised_rc_not_ready');
  }

  if (supervised_rc_result.supervised_only !== true || supervised_rc_result.local_only !== true) {
    return _blocked('MANUAL_RELEASE_REQUEST_BLOCKED_RC', 'rc_supervised_local_required');
  }

  // Evidence required
  const evidence_source = supervised_rc_result.evidence_source;
  if (!evidence_source || evidence_source !== 'go-core') {
    return _blocked('MANUAL_RELEASE_REQUEST_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core');
  }

  const evidence_receipt_id = supervised_rc_result.evidence_receipt_id ?? supervised_rc_result.runtime_candidate_id;
  if (!evidence_receipt_id) {
    return _blocked('MANUAL_RELEASE_REQUEST_BLOCKED_EVIDENCE', 'evidence_receipt_id_required');
  }

  // Authority binding required
  if (!supervised_rc_result.authority_binding_id) {
    return _blocked('MANUAL_RELEASE_REQUEST_BLOCKED_AUTHORITY', 'authority_binding_required');
  }

  // Promotion package required
  if (!promotion_package_result || promotion_package_result.promotion_package_ready !== true) {
    return _blocked('MANUAL_RELEASE_REQUEST_BLOCKED_PROMOTION_PACKAGE', 'promotion_package_not_ready');
  }

  // Manual review required
  if (!manual_review_result || manual_review_result.promotion_review_ready !== true) {
    return _blocked('MANUAL_RELEASE_REQUEST_BLOCKED_PROMOTION_PACKAGE', 'manual_review_not_ready');
  }

  const request_id = _sha256(`manual-request:${supervised_rc_result.rc_id}:${now}`).slice(0, 32);

  return {
    schema_version:              SCHEMA_VERSION,
    manual_release_request_status: 'MANUAL_RELEASE_REQUEST_VALID',
    manual_release_request_valid:  true,
    request_id,
    requested_by,
    requested_action:            'manual_release_execution_review',
    target_version,
    target_branch,
    git_head,
    supervised_rc_id:            supervised_rc_result.rc_id,
    release_intent_id:           supervised_rc_result.release_intent_id ?? null,
    authority_binding_id:        supervised_rc_result.authority_binding_id,
    runtime_candidate_id:        supervised_rc_result.runtime_candidate_id ?? null,
    evidence_package_id:         supervised_rc_result.evidence_package_id ?? null,
    evidence_receipt_id,
    evidence_source:             'go-core',
    promotion_package_id:        promotion_package_result.package_id ?? null,
    manual_review_id:            manual_review_result.review_id ?? null,
    created_at:                  now,
    expires_at:                  expires,
    local_only:                  true,
    manual_only:                 true,
    supervised_only:             true,
    blocking_reason:             null,
    ..._locked(),
  };
}

/**
 * Normalize a manual release request to canonical form.
 */
export function normalizeManualReleaseRequest(request) {
  if (!request || typeof request !== 'object') {
    return _blocked('MANUAL_RELEASE_REQUEST_MISSING', 'no_request_provided');
  }

  if (request.manual_release_request_valid !== true) {
    return { ...request, ..._locked(), local_only: true, manual_only: true, supervised_only: true };
  }

  // Check expiry
  if (request.expires_at && new Date(request.expires_at) < new Date()) {
    return _blocked('MANUAL_RELEASE_REQUEST_EXPIRED', 'request_expired');
  }

  return {
    ...request,
    schema_version: SCHEMA_VERSION,
    local_only:     true,
    manual_only:    true,
    supervised_only: true,
    ..._locked(),
  };
}

/**
 * Render a human-readable summary of a manual release request.
 */
export function renderManualReleaseRequestSummary(request) {
  if (!request) return 'MANUAL_RELEASE_REQUEST: null';

  const lines = [
    `MANUAL_RELEASE_REQUEST_CONTRACT V46.0`,
    `status        : ${request.manual_release_request_status ?? 'UNKNOWN'}`,
    `valid         : ${request.manual_release_request_valid ?? false}`,
    `request_id    : ${request.request_id ?? 'none'}`,
    `requested_by  : ${request.requested_by ?? 'none'}`,
    `target_version: ${request.target_version ?? 'none'}`,
    `target_branch : ${request.target_branch ?? 'none'}`,
    `evidence_src  : ${request.evidence_source ?? 'none'}`,
    `local_only    : ${request.local_only ?? false}`,
    `manual_only   : ${request.manual_only ?? false}`,
    `supervised    : ${request.supervised_only ?? false}`,
    `deploy_allowed: false`,
    `tag_allowed   : false`,
    `stable_allowed: false`,
    `blocking      : ${request.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('manual-release-request-contract.mjs')) {
  const args = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createManualReleaseRequest({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderManualReleaseRequestSummary(result));
  }

  process.exit(result.manual_release_request_valid ? 0 : 1);
}
