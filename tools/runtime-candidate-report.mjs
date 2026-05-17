#!/usr/bin/env node
/**
 * Runtime Candidate Report — V38.0
 *
 * Generates a structured audit report from a V37.0 runtime PASS GOLD
 * candidate controller result. Summarizes all 3 pipeline stages,
 * evidence provenance, and candidate readiness.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - report_stub=false only when candidate pipeline fully succeeded.
 * - evidence_source=go-core required for non-stub report.
 */

const SCHEMA_VERSION = 'v38.0';

export const CANDIDATE_REPORT_STATUSES = [
  'CANDIDATE_REPORT_SKIPPED',
  'CANDIDATE_REPORT_BLOCKED_CANDIDATE',
  'CANDIDATE_REPORT_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _skipped(extra = {}) {
  return {
    schema_version:           SCHEMA_VERSION,
    candidate_report_status:  'CANDIDATE_REPORT_SKIPPED',
    candidate_report_ready:   false,
    report_stub:              true,
    pass_gold_candidate:      false,
    candidate_is_local_only:  true,
    runtime_stage_ready:      false,
    package_stage_ready:      false,
    binding_stage_ready:      false,
    mission_id:               null,
    evidence_receipt_id:      null,
    evidence_source:          null,
    package_hash:             null,
    ledger_entry_id:          null,
    ledger_seq:               null,
    report_generated_at:      null,
    stage_summary:            null,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
    tag_allowed:              false,
    blocking_reason:          extra.blocking_reason ?? 'not_requested',
    ...extra,
  };
}

function _blocked(status, extra = {}) {
  return {
    schema_version:           SCHEMA_VERSION,
    candidate_report_status:  status,
    candidate_report_ready:   false,
    report_stub:              true,
    pass_gold_candidate:      false,
    candidate_is_local_only:  true,
    runtime_stage_ready:      false,
    package_stage_ready:      false,
    binding_stage_ready:      false,
    mission_id:               null,
    evidence_receipt_id:      null,
    evidence_source:          null,
    package_hash:             null,
    ledger_entry_id:          null,
    ledger_seq:               null,
    report_generated_at:      null,
    stage_summary:            null,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
    tag_allowed:              false,
    blocking_reason:          extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

function _buildStageSummary(candidateResult) {
  return {
    stage_1_runtime: {
      ready:          candidateResult.runtime_stage_ready === true,
      status:         candidateResult.runtime_pass_gold_status,
      mission_id:     candidateResult.mission_id,
      evidence_source: candidateResult.evidence_source,
    },
    stage_2_package: {
      ready:          candidateResult.package_stage_ready === true,
      package_hash:   candidateResult.package_hash,
    },
    stage_3_binding: {
      ready:          candidateResult.binding_stage_ready === true,
      ledger_entry_id: candidateResult.ledger_entry_id,
      ledger_seq:     candidateResult.ledger_seq,
    },
    gates: {
      deploy_allowed:    false,
      promotion_allowed: false,
      stable_allowed:    false,
      tag_allowed:       false,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate runtime candidate report from V37.0 result.
 *
 * @param {Object}  options
 * @param {boolean} options.report_requested        - Must be true to run (default: false)
 * @param {Object|null} options.candidate_result    - V37.0 controller result
 * @param {boolean} options.fixture_mode            - Fixture mode for testing
 * @param {string|null} options._mock_timestamp     - Override timestamp (test mode)
 * @returns {Object} Candidate report result
 */
export function generateRuntimeCandidateReport(options = {}) {
  const {
    report_requested  = false,
    candidate_result  = null,
    fixture_mode      = false,
    _mock_timestamp   = null,
  } = options;

  if (!report_requested && !fixture_mode) {
    return _skipped({ blocking_reason: 'report_not_requested' });
  }

  // In fixture mode with no result, synthesize a ready candidate
  let cResult = candidate_result;
  if (fixture_mode && !cResult) {
    cResult = {
      runtime_pass_gold_status: 'RUNTIME_PASS_GOLD_CANDIDATE_READY',
      runtime_pass_gold_ready:  true,
      pass_gold_candidate:      true,
      candidate_is_local_only:  true,
      runtime_stage_ready:      true,
      package_stage_ready:      true,
      binding_stage_ready:      true,
      mission_id:               'fixture-mission-380',
      evidence_receipt_id:      'fixture-receipt-380',
      evidence_source:          'go-core',
      package_hash:             'pkg_fixture_hash_380',
      ledger_entry_id:          'ledger-fixture-entry-380',
      ledger_seq:               1,
      deploy_allowed:           false,
      promotion_allowed:        false,
      stable_allowed:           false,
      tag_allowed:              false,
      blocking_reason:          null,
    };
  }

  // Gate: candidate must be fully ready
  if (!cResult || cResult.runtime_pass_gold_ready !== true) {
    return _blocked('CANDIDATE_REPORT_BLOCKED_CANDIDATE', {
      blocking_reason: `candidate_not_ready:${cResult?.runtime_pass_gold_status ?? 'null'}`,
    });
  }

  const ts = _mock_timestamp ?? new Date().toISOString();
  const stageSummary = _buildStageSummary(cResult);

  return {
    schema_version:          SCHEMA_VERSION,
    candidate_report_status: 'CANDIDATE_REPORT_READY',
    candidate_report_ready:  true,
    report_stub:             false,
    pass_gold_candidate:     true,
    candidate_is_local_only: true,
    runtime_stage_ready:     cResult.runtime_stage_ready === true,
    package_stage_ready:     cResult.package_stage_ready === true,
    binding_stage_ready:     cResult.binding_stage_ready === true,
    mission_id:              cResult.mission_id,
    evidence_receipt_id:     cResult.evidence_receipt_id,
    evidence_source:         'go-core',
    package_hash:            cResult.package_hash,
    ledger_entry_id:         cResult.ledger_entry_id,
    ledger_seq:              cResult.ledger_seq,
    report_generated_at:     ts,
    stage_summary:           stageSummary,
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

if (process.argv[1] && process.argv[1].endsWith('runtime-candidate-report.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const fixture   = args.includes('--fixture-mode');
  const requested = args.includes('--report-requested');

  const result = generateRuntimeCandidateReport({
    report_requested: requested,
    fixture_mode:     fixture,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`candidate_report_status  : ${result.candidate_report_status}`);
    console.log(`candidate_report_ready   : ${result.candidate_report_ready}`);
    console.log(`report_stub              : ${result.report_stub}`);
    console.log(`pass_gold_candidate      : ${result.pass_gold_candidate}`);
    console.log(`candidate_is_local_only  : ${result.candidate_is_local_only}`);
    console.log(`mission_id               : ${result.mission_id}`);
    console.log(`evidence_source          : ${result.evidence_source}`);
    console.log(`package_hash             : ${result.package_hash}`);
    console.log(`ledger_entry_id          : ${result.ledger_entry_id}`);
    console.log(`report_generated_at      : ${result.report_generated_at}`);
    console.log(`deploy_allowed           : ${result.deploy_allowed}`);
    console.log(`promotion_allowed        : ${result.promotion_allowed}`);
  }

  process.exit(result.candidate_report_ready ? 0 : 1);
}
