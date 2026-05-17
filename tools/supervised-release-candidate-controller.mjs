#!/usr/bin/env node
/**
 * Supervised Release Candidate Controller — V42.0
 *
 * Declares a supervised release candidate when runtime candidate +
 * release intent + authority binding + tests + policy are all valid.
 *
 * REGRA ABSOLUTA:
 * - production_release_allowed=false always.
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - release_performed=false always.
 * - release_candidate=true only when SUPERVISED_RC_READY.
 * - local_only=true required.
 * - supervised_only=true required.
 */

import { createHash } from 'crypto';
import { _resetLedgerForTest }                           from './runtime-execution-ledger-binding.mjs';
import { runRuntimePassGoldCandidateController }         from './runtime-pass-gold-candidate-controller.mjs';
import { validateSupervisedReleaseIntent,
         createSupervisedReleaseIntent }                 from './supervised-release-intent-contract.mjs';
import { bindReleaseIntentToAuthority }                  from './release-intent-authority-binding.mjs';
import { createReleaseIntentFromRuntimeCandidate }       from './runtime-candidate-release-intent-bridge.mjs';

const SCHEMA_VERSION = 'v42.0';

export const SUPERVISED_RC_STATUSES = [
  'SUPERVISED_RC_BLOCKED_CANDIDATE',
  'SUPERVISED_RC_BLOCKED_INTENT',
  'SUPERVISED_RC_BLOCKED_AUTHORITY',
  'SUPERVISED_RC_BLOCKED_TESTS',
  'SUPERVISED_RC_BLOCKED_POLICY',
  'SUPERVISED_RC_READY',
];

function _locked() {
  return {
    production_release_allowed: false,
    deploy_allowed:             false,
    promotion_allowed:          false,
    stable_allowed:             false,
    tag_allowed:                false,
    release_performed:          false,
  };
}

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:                       SCHEMA_VERSION,
    supervised_release_candidate_status:  status,
    supervised_release_candidate_ready:   false,
    release_candidate:                    false,
    release_candidate_mode:               'supervised',
    blocking_reason,
    ..._locked(),
    ...extra,
    // Re-lock invariants — cannot be overridden
    production_release_allowed: false,
    deploy_allowed:             false,
    promotion_allowed:          false,
    stable_allowed:             false,
    tag_allowed:                false,
    release_performed:          false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Run supervised release candidate controller.
 *
 * @param {Object}  options
 * @param {Object}  options.candidate_result           - Runtime candidate (runtime_pass_gold_ready=true)
 * @param {Object}  options.release_intent             - Validated release intent
 * @param {Object}  options.intent_authority_binding   - Authority binding result
 * @param {boolean} options.tests_verified             - External tests passed
 * @param {boolean} options.policy_clean               - Policy gates clean
 * @param {boolean} options.fixture_mode               - Use built-in fixture
 * @param {string}  [options.rc_id]                    - Override generated RC id
 * @returns {Object} Supervised RC result
 */
export function runSupervisedReleaseCandidateController(options = {}) {
  const { fixture_mode = false } = options;

  let candidate              = options.candidate_result;
  let releaseIntent          = options.release_intent;
  let intentAuthorityBinding = options.intent_authority_binding;
  let testsVerified          = options.tests_verified  ?? false;
  let policyClean            = options.policy_clean    ?? false;

  if (fixture_mode) {
    _resetLedgerForTest();
    candidate = runRuntimePassGoldCandidateController({ fixture_mode: true });

    const bridge = createReleaseIntentFromRuntimeCandidate({
      candidate_result:      candidate,
      authority_contract_id: 'fixture-authority-420',
      requested_by:          'fixture-operator-420',
      target_version:        'v42.0',
      target_branch:         'main',
      git_head:              'abc1234fixture420',
    });
    releaseIntent = bridge.intent;

    intentAuthorityBinding = bindReleaseIntentToAuthority({
      fixture_mode: true,
    });

    testsVerified = true;
    policyClean   = true;
  }

  // Gate 1: runtime candidate
  if (!candidate || candidate.runtime_pass_gold_ready !== true) {
    return _blocked('SUPERVISED_RC_BLOCKED_CANDIDATE', 'runtime_candidate_not_ready', {
      candidate_status: candidate?.runtime_pass_gold_status ?? null,
    });
  }
  if (candidate.evidence_source !== 'go-core') {
    return _blocked('SUPERVISED_RC_BLOCKED_CANDIDATE', `candidate_evidence_source_invalid:${candidate.evidence_source}`);
  }

  // Gate 2: release intent
  if (!releaseIntent || releaseIntent.release_intent_valid !== true) {
    return _blocked('SUPERVISED_RC_BLOCKED_INTENT', 'release_intent_not_valid', {
      intent_id: releaseIntent?.intent_id ?? null,
    });
  }
  if (releaseIntent.local_only !== true || releaseIntent.supervised_only !== true) {
    return _blocked('SUPERVISED_RC_BLOCKED_INTENT', 'intent_missing_local_supervised_flags', {
      intent_id: releaseIntent.intent_id,
    });
  }

  // Gate 3: authority binding
  if (!intentAuthorityBinding || intentAuthorityBinding.intent_authority_binding_ready !== true) {
    return _blocked('SUPERVISED_RC_BLOCKED_AUTHORITY', 'intent_authority_binding_not_ready', {
      intent_id:  releaseIntent.intent_id,
      binding_id: intentAuthorityBinding?.binding_id ?? null,
    });
  }

  // Gate 4: tests
  if (testsVerified !== true) {
    return _blocked('SUPERVISED_RC_BLOCKED_TESTS', 'tests_not_verified', {
      intent_id:  releaseIntent.intent_id,
      binding_id: intentAuthorityBinding.binding_id,
    });
  }

  // Gate 5: policy
  if (policyClean !== true) {
    return _blocked('SUPERVISED_RC_BLOCKED_POLICY', 'policy_not_clean', {
      intent_id:  releaseIntent.intent_id,
      binding_id: intentAuthorityBinding.binding_id,
    });
  }

  const rc_id = options.rc_id ?? `supervised_rc_${
    createHash('sha256')
      .update(`${releaseIntent.intent_id}:${intentAuthorityBinding.binding_id}`)
      .digest('hex').slice(0, 16)
  }`;

  return {
    schema_version:                       SCHEMA_VERSION,
    supervised_release_candidate_status:  'SUPERVISED_RC_READY',
    supervised_release_candidate_ready:   true,
    release_candidate:                    true,
    release_candidate_mode:               'supervised',
    supervised_only:                      true,
    local_only:                           true,
    rc_id,
    intent_id:                            releaseIntent.intent_id,
    runtime_candidate_id:                 candidate.mission_id ?? null,
    evidence_source:                      'go-core',
    evidence_receipt_id:                  candidate.evidence_receipt_id ?? null,
    binding_id:                           intentAuthorityBinding.binding_id,
    tests_verified:                       true,
    policy_clean:                         true,
    pass_gold_candidate:                  true,
    candidate_is_local_only:              true,
    blocking_reason:                      null,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('supervised-release-candidate-controller.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture-mode');

  const result = runSupervisedReleaseCandidateController({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const lines = [
      `supervised_release_candidate_status : ${result.supervised_release_candidate_status}`,
      `supervised_release_candidate_ready  : ${result.supervised_release_candidate_ready}`,
      `release_candidate                   : ${result.release_candidate}`,
      `release_candidate_mode              : ${result.release_candidate_mode}`,
      `production_release_allowed          : ${result.production_release_allowed}`,
      `deploy_allowed                      : ${result.deploy_allowed}`,
      `promotion_allowed                   : ${result.promotion_allowed}`,
      `stable_allowed                      : ${result.stable_allowed}`,
      `tag_allowed                         : ${result.tag_allowed}`,
      `blocking_reason                     : ${result.blocking_reason ?? 'none'}`,
    ];
    console.log(lines.join('\n'));
  }

  process.exit(result.supervised_release_candidate_ready ? 0 : 1);
}
