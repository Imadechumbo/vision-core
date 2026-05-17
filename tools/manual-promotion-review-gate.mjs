#!/usr/bin/env node
/**
 * Manual Promotion Review Gate — V43.1
 *
 * Gates manual promotion reviews against a promotion package.
 * explicit_manual_review_requested=true required.
 * promotion_review_allowed=true ONLY when MANUAL_PROMOTION_REVIEW_READY.
 * promotion_allowed=false ALWAYS — review is not promotion.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - release_performed=false always.
 * - promote_performed=false always.
 * - manual_only=true always.
 * - promotion_review_allowed=true ONLY when MANUAL_PROMOTION_REVIEW_READY.
 */

import { createHash } from 'crypto';
import { buildManualPromotionPackage } from './manual-promotion-package-builder.mjs';

const SCHEMA_VERSION = 'v43.1';

export const PROMOTION_REVIEW_STATUSES = [
  'MANUAL_PROMOTION_REVIEW_BLOCKED_NO_PACKAGE',
  'MANUAL_PROMOTION_REVIEW_BLOCKED_PACKAGE_NOT_READY',
  'MANUAL_PROMOTION_REVIEW_BLOCKED_NOT_REQUESTED',
  'MANUAL_PROMOTION_REVIEW_BLOCKED_REVIEWER',
  'MANUAL_PROMOTION_REVIEW_BLOCKED_INVARIANTS',
  'MANUAL_PROMOTION_REVIEW_READY',
];

function _locked() {
  return {
    deploy_allowed:             false,
    promotion_allowed:          false,
    stable_allowed:             false,
    tag_allowed:                false,
    release_performed:          false,
    promote_performed:          false,
    manual_only:                true,
    promotion_review_allowed:   false,
  };
}

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:               SCHEMA_VERSION,
    promotion_review_status:      status,
    promotion_review_ready:       false,
    review_id:                    null,
    blocking_reason,
    ..._locked(),
    ...extra,
    // Re-lock invariants
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
    tag_allowed:              false,
    release_performed:        false,
    promote_performed:        false,
    manual_only:              true,
    promotion_review_allowed: false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Run manual promotion review gate.
 *
 * @param {Object}  options
 * @param {Object}  options.promotion_package               - Result from buildManualPromotionPackage
 * @param {boolean} options.explicit_manual_review_requested - Must be true
 * @param {string}  [options.reviewer_id]                   - Reviewer identifier (required when not fixture)
 * @param {string}  [options.review_notes]                  - Human review notes
 * @param {boolean} options.fixture_mode                    - Use built-in fixture
 * @param {string}  [options._mock_timestamp]               - Override timestamp for tests
 * @returns {Object} Promotion review gate result
 */
export function runManualPromotionReviewGate(options = {}) {
  const { fixture_mode = false, _mock_timestamp } = options;

  let pkg                        = options.promotion_package;
  let explicitReviewRequested    = options.explicit_manual_review_requested ?? false;
  const reviewerId               = options.reviewer_id   ?? null;
  const reviewNotes              = options.review_notes  ?? '';

  if (fixture_mode) {
    pkg = buildManualPromotionPackage({ fixture_mode: true });
    explicitReviewRequested = true;
  }

  // Gate 1: package must be provided
  if (!pkg) {
    return _blocked('MANUAL_PROMOTION_REVIEW_BLOCKED_NO_PACKAGE', 'promotion_package_missing');
  }

  // Gate 2: package must be ready
  if (pkg.promotion_package_ready !== true) {
    return _blocked('MANUAL_PROMOTION_REVIEW_BLOCKED_PACKAGE_NOT_READY', 'promotion_package_not_ready', {
      package_status: pkg.promotion_package_status ?? null,
      package_hash:   pkg.package_hash ?? null,
    });
  }

  // Gate 3: explicit review must be requested
  if (explicitReviewRequested !== true) {
    return _blocked('MANUAL_PROMOTION_REVIEW_BLOCKED_NOT_REQUESTED', 'explicit_manual_review_not_requested', {
      package_hash: pkg.package_hash,
      rc_id:        pkg.rc_id ?? null,
    });
  }

  // Gate 4: reviewer_id required when not fixture
  if (!fixture_mode && (!reviewerId || reviewerId.trim() === '')) {
    return _blocked('MANUAL_PROMOTION_REVIEW_BLOCKED_REVIEWER', 'reviewer_id_missing', {
      package_hash: pkg.package_hash,
    });
  }

  // Gate 5: package invariants — promotion/deploy must be false in package
  if (pkg.promotion_allowed === true || pkg.deploy_allowed === true) {
    return _blocked('MANUAL_PROMOTION_REVIEW_BLOCKED_INVARIANTS', 'package_invariants_violated', {
      package_hash: pkg.package_hash,
    });
  }

  const ts = _mock_timestamp ?? new Date().toISOString();

  const review_id = createHash('sha256')
    .update(`review:${pkg.package_hash}:${reviewerId ?? 'fixture'}:${ts}`)
    .digest('hex')
    .slice(0, 32);

  return {
    schema_version:              SCHEMA_VERSION,
    promotion_review_status:     'MANUAL_PROMOTION_REVIEW_READY',
    promotion_review_ready:      true,
    review_id,
    package_hash:                pkg.package_hash,
    rc_id:                       pkg.rc_id ?? null,
    intent_id:                   pkg.intent_id ?? null,
    evidence_source:             'go-core',
    evidence_receipt_id:         pkg.evidence_receipt_id ?? null,
    release_candidate_mode:      pkg.release_candidate_mode ?? 'supervised',
    explicit_manual_review_requested: true,
    reviewer_id:                 reviewerId ?? 'fixture-reviewer',
    review_notes:                reviewNotes || null,
    reviewed_at:                 ts,
    blocking_reason:             null,
    // REGRA ABSOLUTA — promotion_review_allowed ONLY when READY
    promotion_review_allowed:    true,
    ..._locked(),
    // Re-lock — promotion_allowed stays false even though review is allowed
    promotion_review_allowed:    true,
    deploy_allowed:              false,
    promotion_allowed:           false,
    stable_allowed:              false,
    tag_allowed:                 false,
    release_performed:           false,
    promote_performed:           false,
    manual_only:                 true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('manual-promotion-review-gate.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture-mode');

  const result = runManualPromotionReviewGate({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const lines = [
      `promotion_review_status          : ${result.promotion_review_status}`,
      `promotion_review_ready           : ${result.promotion_review_ready}`,
      `promotion_review_allowed         : ${result.promotion_review_allowed}`,
      `deploy_allowed                   : ${result.deploy_allowed}`,
      `promotion_allowed                : ${result.promotion_allowed}`,
      `stable_allowed                   : ${result.stable_allowed}`,
      `tag_allowed                      : ${result.tag_allowed}`,
      `manual_only                      : ${result.manual_only}`,
      `blocking_reason                  : ${result.blocking_reason ?? 'none'}`,
    ];
    console.log(lines.join('\n'));
  }

  process.exit(result.promotion_review_ready ? 0 : 1);
}
