#!/usr/bin/env node
/**
 * Release Intent Authority Binding — V41.1
 *
 * Binds a supervised release intent to an authority review contract.
 * Authority validates INTENT only — cannot create evidence, override
 * Go Core, execute deploy, create tags, or promote stable.
 *
 * REGRA ABSOLUTA:
 * - can_create_evidence=false always.
 * - can_override_go_core=false always.
 * - can_execute_deploy=false always.
 * - can_create_tag=false always.
 * - can_promote_stable=false always.
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 */

import { createHash }                      from 'crypto';
import { validateAuthorityFixtureContract } from './runtime-authority-fixture-contract.mjs';
import {
  createSupervisedReleaseIntent,
  validateSupervisedReleaseIntent,
} from './supervised-release-intent-contract.mjs';

const SCHEMA_VERSION = 'v41.1';

export const INTENT_AUTHORITY_BINDING_STATUSES = [
  'INTENT_AUTHORITY_BLOCKED_INTENT',
  'INTENT_AUTHORITY_BLOCKED_CONTRACT',
  'INTENT_AUTHORITY_BLOCKED_SCOPE',
  'INTENT_AUTHORITY_BLOCKED_TEMPORAL',
  'INTENT_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE',
  'INTENT_AUTHORITY_READY',
];

// Scopes the authority must have to be eligible for release review binding
const VALID_RELEASE_REVIEW_SCOPES = [
  'release_review',
  'supervised_release_candidate',
  'local',
  'test',
  'drill',
  'candidate_drill',
  'pass_gold_drill',
];

function _locked() {
  return {
    can_create_evidence:  false,
    can_override_go_core: false,
    can_execute_deploy:   false,
    can_create_tag:       false,
    can_promote_stable:   false,
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
    tag_allowed:          false,
  };
}

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:                 SCHEMA_VERSION,
    intent_authority_binding_status: status,
    intent_authority_binding_ready: false,
    binding_id:                     null,
    intent_id:                      extra.intent_id         ?? null,
    authority_contract_id:          extra.authority_contract_id ?? null,
    authority_valid:                false,
    authority_scope_valid:          false,
    authority_temporal_valid:       false,
    authority_can_review_release:   false,
    blocking_reason,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Bind a validated release intent to an authority contract.
 *
 * @param {Object}  options
 * @param {Object}  options.intent             - Validated intent result (from validateSupervisedReleaseIntent)
 * @param {Object}  options.authority_contract - Authority contract result (from validateAuthorityFixtureContract)
 * @param {boolean} options.fixture_mode       - Use built-in fixture
 * @param {string}  [options.binding_id]       - Override generated binding_id
 * @returns {Object} Binding result
 */
export function bindReleaseIntentToAuthority(options = {}) {
  const { fixture_mode = false } = options;

  let intent            = options.intent;
  let authority_contract = options.authority_contract;

  if (fixture_mode) {
    const fi = createSupervisedReleaseIntent({
      intent_id:             'fixture-intent-411',
      requested_by:          'fixture-operator',
      requested_action:      'supervised_release_candidate',
      target_version:        'v41.1',
      target_branch:         'main',
      git_head:              'abc1234fixture411',
      runtime_candidate_id:  'fixture-candidate-411',
      evidence_package_id:   'fixture-pkg-411',
      evidence_receipt_id:   'fixture-receipt-411',
      evidence_source:       'go-core',
      authority_contract_id: 'fixture-authority-contract-411',
      expires_at:            '2099-12-31T00:00:00.000Z',
    });
    intent = validateSupervisedReleaseIntent(fi);
    authority_contract = validateAuthorityFixtureContract({
      contract_id:          'fixture-authority-contract-411',
      reviewer:             'fixture-reviewer-411',
      review_decision:      'approved',
      scope:                'local',
      temporal_valid:       true,
      authority_sufficient: true,
    });
  }

  // Gate 1: intent must be valid
  if (!intent || typeof intent !== 'object' || intent.release_intent_valid !== true) {
    return _blocked('INTENT_AUTHORITY_BLOCKED_INTENT', 'intent_not_valid', {
      intent_id: intent?.intent_id ?? null,
    });
  }

  // Gate 2: authority contract must be present and valid
  if (!authority_contract || typeof authority_contract !== 'object' || authority_contract.authority_valid !== true) {
    return _blocked('INTENT_AUTHORITY_BLOCKED_CONTRACT', 'authority_contract_not_valid', {
      intent_id:             intent.intent_id,
      authority_contract_id: authority_contract?.contract_id ?? intent.authority_contract_id,
    });
  }

  // Gate 3: authority scope must be valid for release review
  const scope = authority_contract.scope;
  const scopeValid = scope && VALID_RELEASE_REVIEW_SCOPES.includes(scope);
  if (!scopeValid) {
    return _blocked('INTENT_AUTHORITY_BLOCKED_SCOPE', `invalid_scope_for_release:${scope}`, {
      intent_id:             intent.intent_id,
      authority_contract_id: authority_contract.contract_id ?? null,
    });
  }

  // Gate 4: temporal validity
  if (authority_contract.temporal_valid !== true) {
    return _blocked('INTENT_AUTHORITY_BLOCKED_TEMPORAL', 'authority_temporal_invalid', {
      intent_id:             intent.intent_id,
      authority_contract_id: authority_contract.contract_id ?? null,
    });
  }

  // Gate 5: authority must NOT be able to create evidence or override Go Core
  if (authority_contract.can_create_evidence === true || authority_contract.can_override_go_core === true) {
    return _blocked('INTENT_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE', 'authority_claims_evidence_override', {
      intent_id:             intent.intent_id,
      authority_contract_id: authority_contract.contract_id ?? null,
    });
  }

  const bindingId = options.binding_id ?? `binding_${
    createHash('sha256')
      .update(`${intent.intent_id}:${authority_contract.contract_id ?? ''}`)
      .digest('hex').slice(0, 16)
  }`;

  return {
    schema_version:                  SCHEMA_VERSION,
    intent_authority_binding_status: 'INTENT_AUTHORITY_READY',
    intent_authority_binding_ready:  true,
    binding_id:                      bindingId,
    intent_id:                       intent.intent_id,
    authority_contract_id:           authority_contract.contract_id ?? intent.authority_contract_id,
    authority_valid:                 true,
    authority_scope_valid:           true,
    authority_temporal_valid:        true,
    authority_can_review_release:    true,
    blocking_reason:                 null,
    ..._locked(),
  };
}

/**
 * Validate structural integrity of a binding result — checks all invariants are set.
 */
export function validateReleaseIntentAuthorityBinding(binding) {
  if (!binding || typeof binding !== 'object') return false;
  if (binding.schema_version        !== SCHEMA_VERSION) return false;
  if (binding.can_create_evidence   !== false) return false;
  if (binding.can_override_go_core  !== false) return false;
  if (binding.can_execute_deploy    !== false) return false;
  if (binding.can_create_tag        !== false) return false;
  if (binding.can_promote_stable    !== false) return false;
  if (binding.deploy_allowed        !== false) return false;
  if (binding.promotion_allowed     !== false) return false;
  if (binding.stable_allowed        !== false) return false;
  if (binding.tag_allowed           !== false) return false;
  return true;
}

/**
 * Render human-readable summary of a binding result.
 */
export function renderReleaseIntentAuthorityBinding(result) {
  if (!result) return 'No result provided.';
  return [
    `intent_authority_binding_status: ${result.intent_authority_binding_status ?? 'N/A'}`,
    `intent_authority_binding_ready : ${result.intent_authority_binding_ready  ?? false}`,
    `binding_id                     : ${result.binding_id                     ?? 'null'}`,
    `intent_id                      : ${result.intent_id                      ?? 'null'}`,
    `authority_valid                : ${result.authority_valid}`,
    `authority_scope_valid          : ${result.authority_scope_valid}`,
    `authority_can_review_release   : ${result.authority_can_review_release}`,
    `can_create_evidence            : ${result.can_create_evidence}`,
    `can_override_go_core           : ${result.can_override_go_core}`,
    `can_execute_deploy             : ${result.can_execute_deploy}`,
    `deploy_allowed                 : ${result.deploy_allowed}`,
    `blocking_reason                : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('release-intent-authority-binding.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture-mode');

  const result = bindReleaseIntentToAuthority({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReleaseIntentAuthorityBinding(result));
  }

  process.exit(result.intent_authority_binding_ready ? 0 : 1);
}
