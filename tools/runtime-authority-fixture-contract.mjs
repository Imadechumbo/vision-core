#!/usr/bin/env node
/**
 * Runtime Authority Fixture Contract — V32.1
 *
 * Authority fixture contract for local drills and tests.
 * Provides a valid authority binding for controlled test environments
 * without creating real evidence or overriding Go Core.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - can_create_evidence=false always.
 * - can_override_go_core=false always.
 * - Only satisfies authority gate in drill/test scope.
 */

const SCHEMA_VERSION = 'v32.1';

export const AUTH_FIXTURE_STATUSES = [
  'AUTH_FIXTURE_BLOCKED_MISSING',
  'AUTH_FIXTURE_BLOCKED_DECISION',
  'AUTH_FIXTURE_BLOCKED_SCOPE',
  'AUTH_FIXTURE_BLOCKED_TEMPORAL',
  'AUTH_FIXTURE_READY',
];

// Valid scope values for fixture authority
const VALID_SCOPES = ['drill', 'test', 'local', 'candidate_drill', 'pass_gold_drill'];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:          SCHEMA_VERSION,
    authority_fixture_status: status,
    authority_valid:         false,
    contract_id:             extra.contract_id ?? null,
    reviewer:                extra.reviewer ?? null,
    review_decision:         extra.review_decision ?? null,
    scope:                   extra.scope ?? null,
    can_create_evidence:     false,
    can_override_go_core:    false,
    deploy_allowed:          false,
    promotion_allowed:       false,
    stable_allowed:          false,
    blocking_reason:         extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validates an authority fixture for local drill use.
 *
 * @param {Object}  options
 * @param {string|null} options.contract_id      - Contract identifier
 * @param {string|null} options.reviewer         - Reviewer identifier
 * @param {string}      options.review_decision  - Decision: 'approved' | 'rejected' | 'pending'
 * @param {string}      options.scope            - Authority scope (must be drill/test/local)
 * @param {boolean}     options.temporal_valid   - Is authority temporally valid
 * @param {boolean}     options.authority_sufficient - Is authority sufficient for scope
 * @returns {Object} Authority fixture result
 */
export function validateAuthorityFixtureContract(options = {}) {
  const {
    contract_id         = null,
    reviewer            = null,
    review_decision     = null,
    scope               = null,
    temporal_valid      = true,
    authority_sufficient = true,
  } = options;

  // Gate 1: contract_id and reviewer required
  if (!contract_id || typeof contract_id !== 'string' || contract_id.trim() === '') {
    return _blocked('AUTH_FIXTURE_BLOCKED_MISSING', {
      blocking_reason: 'contract_id_required',
    });
  }
  if (!reviewer || typeof reviewer !== 'string' || reviewer.trim() === '') {
    return _blocked('AUTH_FIXTURE_BLOCKED_MISSING', {
      contract_id,
      blocking_reason: 'reviewer_required',
    });
  }

  // Gate 2: review_decision must be 'approved'
  if (!review_decision || review_decision !== 'approved') {
    return _blocked('AUTH_FIXTURE_BLOCKED_DECISION', {
      contract_id,
      reviewer,
      review_decision,
      blocking_reason: `review_decision_not_approved:${review_decision ?? 'null'}`,
    });
  }

  // Gate 3: scope must be valid drill/test scope
  if (!scope || !VALID_SCOPES.includes(scope)) {
    return _blocked('AUTH_FIXTURE_BLOCKED_SCOPE', {
      contract_id,
      reviewer,
      review_decision,
      scope,
      blocking_reason: `invalid_scope:${scope ?? 'null'}`,
    });
  }

  // Gate 4: temporal validity
  if (!temporal_valid) {
    return _blocked('AUTH_FIXTURE_BLOCKED_TEMPORAL', {
      contract_id,
      reviewer,
      review_decision,
      scope,
      blocking_reason: 'authority_fixture_expired',
    });
  }

  // Gate 5: authority_sufficient
  if (!authority_sufficient) {
    return _blocked('AUTH_FIXTURE_BLOCKED_MISSING', {
      contract_id,
      reviewer,
      review_decision,
      scope,
      blocking_reason: 'authority_insufficient_for_scope',
    });
  }

  return {
    schema_version:           SCHEMA_VERSION,
    authority_fixture_status: 'AUTH_FIXTURE_READY',
    authority_valid:          true,
    contract_id,
    reviewer,
    review_decision:          'approved',
    scope,
    temporal_valid:           true,
    authority_sufficient:     true,
    can_create_evidence:      false,
    can_override_go_core:     false,
    blocking_reason:          null,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
  };
}

/**
 * Build a default valid authority fixture for drill use.
 * @param {Object} overrides
 * @returns {Object} Authority fixture result
 */
export function buildDrillAuthorityFixture(overrides = {}) {
  return validateAuthorityFixtureContract({
    contract_id:          `auth-fixture-${Date.now()}`,
    reviewer:             'drill_local',
    review_decision:      'approved',
    scope:                'candidate_drill',
    temporal_valid:       true,
    authority_sufficient: true,
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-authority-fixture-contract.mjs')) {
  const args       = process.argv.slice(2);
  const json       = args.includes('--json');
  const useBuild   = args.includes('--build-fixture');
  const contractId = args.find((_, i) => args[i-1] === '--contract-id') ?? null;
  const reviewer   = args.find((_, i) => args[i-1] === '--reviewer') ?? null;
  const scope      = args.find((_, i) => args[i-1] === '--scope') ?? null;

  const result = useBuild
    ? buildDrillAuthorityFixture()
    : validateAuthorityFixtureContract({
        contract_id: contractId,
        reviewer,
        review_decision: 'approved',
        scope: scope ?? 'candidate_drill',
      });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`authority_fixture_status : ${result.authority_fixture_status}`);
    console.log(`authority_valid          : ${result.authority_valid}`);
    console.log(`can_create_evidence      : ${result.can_create_evidence}`);
    console.log(`can_override_go_core     : ${result.can_override_go_core}`);
    console.log(`deploy_allowed           : ${result.deploy_allowed}`);
    console.log(`promotion_allowed        : ${result.promotion_allowed}`);
  }

  process.exit(result.authority_valid ? 0 : 1);
}
