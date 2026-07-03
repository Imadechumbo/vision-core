#!/usr/bin/env node
/**
 * Manual Promotion Package Builder — V43.0
 *
 * Builds a manual promotion package from a supervised release candidate.
 * Does NOT promote, deploy, tag, or mark stable. Creates a structured
 * package for human review only.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - release_performed=false always.
 * - promote_performed=false always.
 * - manual_only=true always.
 */

import { sha256, makeLockedFlags } from './_shared/gate-kit.mjs';
import { runSupervisedReleaseCandidateController } from './supervised-release-candidate-controller.mjs';

const SCHEMA_VERSION = 'v43.0';

export const PROMOTION_PACKAGE_STATUSES = [
  'PROMOTION_PACKAGE_BLOCKED_NO_RC',
  'PROMOTION_PACKAGE_BLOCKED_RC_NOT_READY',
  'PROMOTION_PACKAGE_BLOCKED_EVIDENCE',
  'PROMOTION_PACKAGE_BLOCKED_INVARIANTS',
  'PROMOTION_PACKAGE_READY',
];

function _locked() {
  return {
    ...makeLockedFlags([
      'deploy_allowed',
      'promotion_allowed',
      'stable_allowed',
      'tag_allowed',
      'release_performed',
      'promote_performed',
    ]),
    manual_only: true,
  };
}

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:               SCHEMA_VERSION,
    promotion_package_status:     status,
    promotion_package_ready:      false,
    package_hash:                 null,
    blocking_reason,
    ..._locked(),
    ...extra,
    // Re-lock invariants
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    tag_allowed:       false,
    release_performed: false,
    promote_performed: false,
    manual_only:       true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Build a manual promotion package from a supervised release candidate.
 *
 * @param {Object}  options
 * @param {Object}  options.supervised_rc_result   - Result from runSupervisedReleaseCandidateController
 * @param {string}  [options.requested_by]         - Operator requesting the package
 * @param {string}  [options.target_environment]   - Intended target (informational only)
 * @param {string}  [options.notes]                - Human notes for review
 * @param {boolean} options.fixture_mode           - Use built-in fixture
 * @param {string}  [options._mock_timestamp]      - Override timestamp for tests
 * @returns {Object} Promotion package result
 */
export function buildManualPromotionPackage(options = {}) {
  const { fixture_mode = false, _mock_timestamp } = options;

  let rcResult         = options.supervised_rc_result;
  const requestedBy    = options.requested_by    ?? 'unknown-operator';
  const targetEnv      = options.target_environment ?? 'staging';
  const notes          = options.notes           ?? '';

  if (fixture_mode) {
    rcResult = runSupervisedReleaseCandidateController({ fixture_mode: true });
  }

  // Gate 1: RC must be provided
  if (!rcResult) {
    return _blocked('PROMOTION_PACKAGE_BLOCKED_NO_RC', 'supervised_rc_result_missing');
  }

  // Gate 2: RC must be ready
  if (rcResult.supervised_release_candidate_ready !== true) {
    return _blocked('PROMOTION_PACKAGE_BLOCKED_RC_NOT_READY', 'supervised_rc_not_ready', {
      rc_status:   rcResult.supervised_release_candidate_status ?? null,
      rc_id:       rcResult.rc_id ?? null,
    });
  }

  // Gate 3: evidence_source must be go-core
  if (rcResult.evidence_source !== 'go-core') {
    return _blocked('PROMOTION_PACKAGE_BLOCKED_EVIDENCE', `evidence_source_invalid:${rcResult.evidence_source}`, {
      rc_id:           rcResult.rc_id ?? null,
      evidence_source: rcResult.evidence_source ?? null,
    });
  }

  // Gate 4: invariants on RC — deploy/promotion must be false
  if (rcResult.deploy_allowed === true || rcResult.promotion_allowed === true) {
    return _blocked('PROMOTION_PACKAGE_BLOCKED_INVARIANTS', 'rc_invariants_violated', {
      rc_id: rcResult.rc_id ?? null,
    });
  }

  const ts = _mock_timestamp ?? new Date().toISOString();

  const package_hash = sha256(
    `${rcResult.rc_id}:${rcResult.intent_id}:${rcResult.evidence_receipt_id}:${ts}`
  ).slice(0, 32);

  return {
    schema_version:             SCHEMA_VERSION,
    promotion_package_status:   'PROMOTION_PACKAGE_READY',
    promotion_package_ready:    true,
    package_hash,
    rc_id:                      rcResult.rc_id,
    intent_id:                  rcResult.intent_id ?? null,
    runtime_candidate_id:       rcResult.runtime_candidate_id ?? null,
    evidence_source:             'go-core',
    evidence_receipt_id:        rcResult.evidence_receipt_id ?? null,
    release_candidate_mode:     rcResult.release_candidate_mode ?? 'supervised',
    requested_by:               requestedBy,
    target_environment:         targetEnv,
    notes:                      notes || null,
    built_at:                   ts,
    blocking_reason:            null,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('manual-promotion-package-builder.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture-mode');

  const result = buildManualPromotionPackage({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const lines = [
      `promotion_package_status : ${result.promotion_package_status}`,
      `promotion_package_ready  : ${result.promotion_package_ready}`,
      `package_hash             : ${result.package_hash ?? 'null'}`,
      `deploy_allowed           : ${result.deploy_allowed}`,
      `promotion_allowed        : ${result.promotion_allowed}`,
      `stable_allowed           : ${result.stable_allowed}`,
      `tag_allowed              : ${result.tag_allowed}`,
      `manual_only              : ${result.manual_only}`,
      `blocking_reason          : ${result.blocking_reason ?? 'none'}`,
    ];
    console.log(lines.join('\n'));
  }

  process.exit(result.promotion_package_ready ? 0 : 1);
}
