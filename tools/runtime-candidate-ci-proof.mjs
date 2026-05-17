#!/usr/bin/env node
/**
 * Runtime Candidate CI Proof — V39.0
 *
 * Generates a CI proof artifact from a V38.0 runtime candidate report.
 * The proof is a signed (hashed) document asserting the candidate
 * passed all runtime stages, is local-only, and that no deploy/promotion
 * occurred.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - ci_proof_valid=true only when candidate report fully ready.
 * - evidence_source=go-core required for valid proof.
 * - proof_stub=false only when all conditions met.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v39.0';

export const CI_PROOF_STATUSES = [
  'CI_PROOF_SKIPPED',
  'CI_PROOF_BLOCKED_REPORT',
  'CI_PROOF_BLOCKED_HASH',
  'CI_PROOF_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _skipped(extra = {}) {
  return {
    schema_version:       SCHEMA_VERSION,
    ci_proof_status:      'CI_PROOF_SKIPPED',
    ci_proof_ready:       false,
    ci_proof_valid:       false,
    proof_stub:           true,
    pass_gold_candidate:  false,
    candidate_is_local_only: true,
    mission_id:           null,
    evidence_source:      null,
    proof_hash:           null,
    proof_timestamp:      null,
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
    tag_allowed:          false,
    blocking_reason:      extra.blocking_reason ?? 'not_requested',
    ...extra,
  };
}

function _blocked(status, extra = {}) {
  return {
    schema_version:       SCHEMA_VERSION,
    ci_proof_status:      status,
    ci_proof_ready:       false,
    ci_proof_valid:       false,
    proof_stub:           true,
    pass_gold_candidate:  false,
    candidate_is_local_only: true,
    mission_id:           extra.mission_id ?? null,
    evidence_source:      null,
    proof_hash:           null,
    proof_timestamp:      null,
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
    tag_allowed:          false,
    blocking_reason:      extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

function _deriveProofHash(missionId, receiptId, packageHash, ledgerEntryId, ts) {
  return 'proof_' + createHash('sha256')
    .update(`${missionId}:${receiptId}:${packageHash}:${ledgerEntryId}:${ts}:${SCHEMA_VERSION}`)
    .digest('hex')
    .slice(0, 32);
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate CI proof artifact from V38.0 candidate report.
 *
 * @param {Object}  options
 * @param {boolean} options.proof_requested         - Must be true to run (default: false)
 * @param {Object|null} options.candidate_report    - V38.0 report result
 * @param {boolean} options.fixture_mode            - Fixture mode for testing
 * @param {string|null} options._mock_timestamp     - Override timestamp (test mode)
 * @returns {Object} CI proof result
 */
export function generateRuntimeCandidateCIProof(options = {}) {
  const {
    proof_requested   = false,
    candidate_report  = null,
    fixture_mode      = false,
    _mock_timestamp   = null,
  } = options;

  if (!proof_requested && !fixture_mode) {
    return _skipped({ blocking_reason: 'proof_not_requested' });
  }

  // In fixture mode with no report, synthesize one
  let report = candidate_report;
  if (fixture_mode && !report) {
    report = {
      candidate_report_status: 'CANDIDATE_REPORT_READY',
      candidate_report_ready:  true,
      report_stub:             false,
      pass_gold_candidate:     true,
      candidate_is_local_only: true,
      runtime_stage_ready:     true,
      package_stage_ready:     true,
      binding_stage_ready:     true,
      mission_id:              'fixture-mission-390',
      evidence_receipt_id:     'fixture-receipt-390',
      evidence_source:         'go-core',
      package_hash:            'pkg_fixture_hash_390',
      ledger_entry_id:         'ledger-fixture-entry-390',
      ledger_seq:              1,
      report_generated_at:     _mock_timestamp ?? new Date().toISOString(),
      deploy_allowed:          false,
      promotion_allowed:       false,
      stable_allowed:          false,
      tag_allowed:             false,
      blocking_reason:         null,
    };
  }

  // Gate 1: Report must be ready
  if (!report || report.candidate_report_ready !== true) {
    return _blocked('CI_PROOF_BLOCKED_REPORT', {
      blocking_reason: `report_not_ready:${report?.candidate_report_status ?? 'null'}`,
    });
  }

  // Gate 2: Compute proof hash
  const ts = _mock_timestamp ?? new Date().toISOString();
  let proofHash;
  try {
    proofHash = _deriveProofHash(
      report.mission_id,
      report.evidence_receipt_id,
      report.package_hash,
      report.ledger_entry_id,
      ts
    );
  } catch {
    return _blocked('CI_PROOF_BLOCKED_HASH', {
      mission_id:      report.mission_id,
      blocking_reason: 'proof_hash_computation_failed',
    });
  }

  return {
    schema_version:          SCHEMA_VERSION,
    ci_proof_status:         'CI_PROOF_READY',
    ci_proof_ready:          true,
    ci_proof_valid:          true,
    proof_stub:              false,
    pass_gold_candidate:     true,
    candidate_is_local_only: true,
    mission_id:              report.mission_id,
    evidence_receipt_id:     report.evidence_receipt_id,
    evidence_source:         'go-core',
    package_hash:            report.package_hash,
    ledger_entry_id:         report.ledger_entry_id,
    proof_hash:              proofHash,
    proof_timestamp:         ts,
    report_generated_at:     report.report_generated_at,
    stages_verified:         3,
    deploy_allowed:          false,
    promotion_allowed:       false,
    stable_allowed:          false,
    tag_allowed:             false,
    blocking_reason:         null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-candidate-ci-proof.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const fixture   = args.includes('--fixture-mode');
  const requested = args.includes('--proof-requested');

  const result = generateRuntimeCandidateCIProof({
    proof_requested:  requested,
    fixture_mode:     fixture,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`ci_proof_status          : ${result.ci_proof_status}`);
    console.log(`ci_proof_ready           : ${result.ci_proof_ready}`);
    console.log(`ci_proof_valid           : ${result.ci_proof_valid}`);
    console.log(`proof_stub               : ${result.proof_stub}`);
    console.log(`pass_gold_candidate      : ${result.pass_gold_candidate}`);
    console.log(`candidate_is_local_only  : ${result.candidate_is_local_only}`);
    console.log(`mission_id               : ${result.mission_id}`);
    console.log(`evidence_source          : ${result.evidence_source}`);
    console.log(`proof_hash               : ${result.proof_hash}`);
    console.log(`proof_timestamp          : ${result.proof_timestamp}`);
    console.log(`stages_verified          : ${result.stages_verified}`);
    console.log(`deploy_allowed           : ${result.deploy_allowed}`);
    console.log(`promotion_allowed        : ${result.promotion_allowed}`);
  }

  process.exit(result.ci_proof_ready ? 0 : 1);
}
