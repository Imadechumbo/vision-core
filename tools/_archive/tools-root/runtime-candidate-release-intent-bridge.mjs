#!/usr/bin/env node
/**
 * Runtime Candidate → Release Intent Bridge — V41.2
 *
 * Creates a release intent from a validated local runtime candidate.
 * Does NOT execute release. Bridge only.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - release_performed=false always.
 * - Bridge does not execute release/deploy/tag/stable.
 * - local_only=true required.
 * - evidence_source=go-core required.
 */

import { createHash } from 'crypto';
import {
  runRuntimePassGoldCandidateController,
} from './runtime-pass-gold-candidate-controller.mjs';
import {
  createSupervisedReleaseIntent,
  validateSupervisedReleaseIntent,
} from './supervised-release-intent-contract.mjs';

const SCHEMA_VERSION = 'v41.2';

export const RUNTIME_CANDIDATE_BRIDGE_STATUSES = [
  'BRIDGE_BLOCKED_CANDIDATE',
  'BRIDGE_BLOCKED_EVIDENCE',
  'BRIDGE_BLOCKED_RECEIPT',
  'BRIDGE_BLOCKED_SOURCE',
  'BRIDGE_BLOCKED_AUTHORITY',
  'BRIDGE_READY',
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

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:                         SCHEMA_VERSION,
    runtime_candidate_bridge_status:        status,
    runtime_candidate_bridge_ready:         false,
    release_intent_created:                 false,
    intent_id:                              null,
    runtime_candidate_id:                   extra.runtime_candidate_id  ?? null,
    evidence_receipt_id:                    extra.evidence_receipt_id   ?? null,
    evidence_source:                        extra.evidence_source        ?? null,
    blocking_reason,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate a runtime candidate result for use in a release intent bridge.
 * Returns { valid, blocking_reason } — pure check, no side effects.
 */
export function validateRuntimeCandidateForReleaseIntent(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, blocking_reason: 'candidate_missing' };
  }
  if (candidate.runtime_pass_gold_ready !== true) {
    return { valid: false, blocking_reason: `candidate_not_ready:${candidate.runtime_pass_gold_status ?? 'unknown'}` };
  }
  if (candidate.pass_gold_candidate !== true) {
    return { valid: false, blocking_reason: 'pass_gold_candidate_not_allowed' };
  }
  if (candidate.evidence_source !== 'go-core') {
    return { valid: false, blocking_reason: `invalid_evidence_source:${candidate.evidence_source}` };
  }
  if (!candidate.evidence_receipt_id) {
    return { valid: false, blocking_reason: 'missing_evidence_receipt_id' };
  }
  if (!candidate.evidence_package_id && !candidate.ledger_entry_id) {
    return { valid: false, blocking_reason: 'missing_evidence_package_id' };
  }
  if (candidate.candidate_is_local_only !== true) {
    return { valid: false, blocking_reason: 'candidate_not_local_only' };
  }
  return { valid: true, blocking_reason: null };
}

/**
 * Create a release intent from a validated runtime candidate.
 *
 * @param {Object}  options
 * @param {Object}  options.candidate_result       - Runtime candidate result (runtime_pass_gold_ready=true)
 * @param {string}  options.authority_contract_id  - Authority contract to reference
 * @param {string}  options.requested_by           - Who requested the bridge
 * @param {string}  options.target_version         - Target version string
 * @param {string}  options.target_branch          - Target branch
 * @param {string}  options.git_head               - Git HEAD SHA
 * @param {boolean} options.fixture_mode           - Use built-in fixture
 * @param {string}  [options._mock_timestamp]      - Mock timestamp for testing
 * @returns {Object} Bridge result
 */
export function createReleaseIntentFromRuntimeCandidate(options = {}) {
  const { fixture_mode = false } = options;

  let candidate = options.candidate_result;

  if (fixture_mode) {
    candidate = runRuntimePassGoldCandidateController({ fixture_mode: true });
  }

  // Gate 1: candidate must be present and ready
  const { valid: candidateValid, blocking_reason: candidateReason } = validateRuntimeCandidateForReleaseIntent(candidate);
  if (!candidateValid) {
    const status = candidateReason?.startsWith('invalid_evidence_source') ? 'BRIDGE_BLOCKED_SOURCE'
                 : candidateReason?.startsWith('missing_evidence_receipt') ? 'BRIDGE_BLOCKED_RECEIPT'
                 : 'BRIDGE_BLOCKED_CANDIDATE';
    return _blocked(status, candidateReason, {
      runtime_candidate_id: candidate?.runtime_candidate_id ?? candidate?.mission_id ?? null,
      evidence_source:      candidate?.evidence_source      ?? null,
      evidence_receipt_id:  candidate?.evidence_receipt_id  ?? null,
    });
  }

  // Gate 2: authority_contract_id required (unless fixture)
  const authorityContractId = options.authority_contract_id
    ?? (fixture_mode ? 'fixture-authority-412' : null);
  if (!authorityContractId) {
    return _blocked('BRIDGE_BLOCKED_AUTHORITY', 'missing_authority_contract_id', {
      runtime_candidate_id: candidate.mission_id ?? null,
      evidence_source:      'go-core',
      evidence_receipt_id:  candidate.evidence_receipt_id,
    });
  }

  // Build release intent from candidate fields
  const ts       = options._mock_timestamp ?? new Date().toISOString();
  const intentId = `bridge_intent_${createHash('sha256').update(
    `${candidate.mission_id ?? ''}:${candidate.evidence_receipt_id ?? ''}:${ts}`
  ).digest('hex').slice(0, 16)}`;

  const rawIntent = createSupervisedReleaseIntent({
    intent_id:             intentId,
    requested_by:          options.requested_by    ?? 'bridge_auto',
    requested_action:      'supervised_release_candidate',
    target_version:        options.target_version  ?? candidate.schema_version ?? 'v41.2',
    target_branch:         options.target_branch   ?? 'main',
    git_head:              options.git_head        ?? candidate.mission_id ?? 'unknown',
    runtime_candidate_id:  candidate.mission_id    ?? candidate.runtime_candidate_id ?? null,
    evidence_package_id:   candidate.ledger_entry_id ?? candidate.evidence_package_id ?? null,
    evidence_receipt_id:   candidate.evidence_receipt_id,
    evidence_source:       'go-core',
    authority_contract_id: authorityContractId,
    expires_at:            options.expires_at      ?? '2099-12-31T00:00:00.000Z',
    _mock_timestamp:       ts,
  });

  const intentValidation = validateSupervisedReleaseIntent(rawIntent);

  if (!intentValidation.release_intent_valid) {
    return _blocked('BRIDGE_BLOCKED_CANDIDATE', `intent_validation_failed:${intentValidation.blocking_reason}`, {
      runtime_candidate_id: candidate.mission_id ?? null,
      evidence_source:      'go-core',
      evidence_receipt_id:  candidate.evidence_receipt_id,
    });
  }

  return {
    schema_version:                   SCHEMA_VERSION,
    runtime_candidate_bridge_status:  'BRIDGE_READY',
    runtime_candidate_bridge_ready:   true,
    release_intent_created:           true,
    intent_id:                        rawIntent.intent_id,
    runtime_candidate_id:             candidate.mission_id ?? candidate.runtime_candidate_id ?? null,
    evidence_receipt_id:              candidate.evidence_receipt_id,
    evidence_package_id:              candidate.ledger_entry_id ?? candidate.evidence_package_id ?? null,
    evidence_source:                  'go-core',
    pass_gold_candidate:              true,
    candidate_is_local_only:          true,
    local_only:                       true,
    authority_contract_id:            authorityContractId,
    intent:                           intentValidation,
    blocking_reason:                  null,
    ..._locked(),
  };
}

/**
 * Render human-readable summary of a bridge result.
 */
export function renderRuntimeCandidateReleaseIntentBridge(result) {
  if (!result) return 'No result provided.';
  return [
    `runtime_candidate_bridge_status : ${result.runtime_candidate_bridge_status ?? 'N/A'}`,
    `runtime_candidate_bridge_ready  : ${result.runtime_candidate_bridge_ready  ?? false}`,
    `release_intent_created          : ${result.release_intent_created          ?? false}`,
    `intent_id                       : ${result.intent_id                       ?? 'null'}`,
    `runtime_candidate_id            : ${result.runtime_candidate_id            ?? 'null'}`,
    `evidence_source                 : ${result.evidence_source                 ?? 'null'}`,
    `deploy_allowed                  : ${result.deploy_allowed}`,
    `promotion_allowed               : ${result.promotion_allowed}`,
    `stable_allowed                  : ${result.stable_allowed}`,
    `blocking_reason                 : ${result.blocking_reason                 ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-candidate-release-intent-bridge.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture-mode');

  const result = createReleaseIntentFromRuntimeCandidate({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRuntimeCandidateReleaseIntentBridge(result));
  }

  process.exit(result.runtime_candidate_bridge_ready ? 0 : 1);
}
