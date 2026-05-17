#!/usr/bin/env node
/**
 * PASS GOLD Runtime Evidence Binding — V27.1
 * (supersedes V21.4)
 *
 * Strict PASS GOLD gate: ALL 16 gates must pass.
 * Go Core receipt + backend runtime + mission_id + authority binding + tests
 * + syntax + go_core_compiled + go_test + go_build + backend_health_ok
 * + runtime_probe_pass + go_core_receipt_valid + runtime_evidence_ready.
 *
 * REGRA ABSOLUTA:
 * - PASSGOLD_RUNTIME_READY does NOT execute deploy, tag, or stable.
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 */

const SCHEMA_VERSION = 'v27.1';

export const PASSGOLD_RUNTIME_STATUSES = [
  'PASSGOLD_RUNTIME_BLOCKED_EVIDENCE',
  'PASSGOLD_RUNTIME_BLOCKED_RECEIPT',
  'PASSGOLD_RUNTIME_BLOCKED_AUTHORITY',
  'PASSGOLD_RUNTIME_BLOCKED_TESTS',
  'PASSGOLD_RUNTIME_READY',
];

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Evaluates whether PASS GOLD candidate is allowed given strict runtime evidence chain.
 * V27.1: 16 strict gates — ALL must pass.
 *
 * @param {Object}  input
 * @param {Object|null} input.runtime_evidence         - Result from activateRuntimeEvidence()
 * @param {Object|null} input.go_core_receipt          - Result from validateGoCorEvidenceReceipt()
 * @param {Object|null} input.authority_binding        - Authority binding result
 * @param {boolean}     input.tests_verified           - Were tests verified?
 * @param {boolean}     input.syntax_ok                - Syntax checks passed
 * @param {boolean}     input.go_core_compiled         - Go Core compiled OK
 * @param {boolean}     input.go_test_pass             - Go tests passed
 * @param {boolean}     input.go_build_pass            - Go build passed
 * @param {boolean}     input.fake_evidence_absent     - No fake evidence detected
 * @param {boolean}     input.forbidden_diff_absent    - No forbidden diff
 * @param {boolean}     input.backend_health_ok        - Backend health check OK
 * @param {boolean}     input.runtime_probe_pass       - Runtime probe passed
 * @param {boolean}     input.go_core_receipt_valid    - Go Core receipt is valid
 * @param {boolean}     input.runtime_evidence_ready   - Runtime evidence is ready
 * @returns {Object} Binding evaluation result
 */
export function evaluatePassGoldRuntimeBinding(input = {}) {
  const {
    runtime_evidence       = null,
    go_core_receipt        = null,
    authority_binding      = null,
    tests_verified         = false,
    syntax_ok              = false,
    go_core_compiled       = false,
    go_test_pass           = false,
    go_build_pass          = false,
    fake_evidence_absent   = false,
    forbidden_diff_absent  = false,
    backend_health_ok      = false,
    runtime_probe_pass     = false,
    go_core_receipt_valid  = false,
    runtime_evidence_ready = false,
  } = input;

  const strictGates = {
    syntax_ok,
    go_core_compiled,
    go_test_pass,
    go_build_pass,
    fake_evidence_absent,
    forbidden_diff_absent,
    backend_alive:                 runtime_evidence?.backend_alive === true,
    backend_health_ok,
    backend_not_stub:              runtime_evidence?.backend_stub === false,
    backend_mission_id:            !!(runtime_evidence?.mission_id),
    backend_evidence_receipt:      !!(runtime_evidence?.evidence_receipt_id || go_core_receipt?.receipt_id),
    evidence_source_go_core:       (runtime_evidence?.evidence_source === 'go-core' || go_core_receipt?.source === 'go-core'),
    runtime_probe_pass,
    go_core_receipt_valid,
    pass_gold_authority_binding_valid: !!(authority_binding?.authority_valid === true),
    runtime_evidence_ready,
    tests_verified,
  };

  const missingGates = Object.entries(strictGates)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missingGates.length > 0) {
    // Categorize into specific blocking status
    let blockStatus = 'PASSGOLD_RUNTIME_BLOCKED_EVIDENCE';
    if (!strictGates.syntax_ok || !strictGates.go_core_compiled || !strictGates.go_test_pass || !strictGates.go_build_pass) {
      blockStatus = 'PASSGOLD_RUNTIME_BLOCKED_EVIDENCE';
    } else if (!strictGates.runtime_evidence_ready || !strictGates.backend_alive || !strictGates.backend_not_stub || !strictGates.backend_health_ok || !strictGates.runtime_probe_pass) {
      blockStatus = 'PASSGOLD_RUNTIME_BLOCKED_EVIDENCE';
    } else if (!strictGates.go_core_receipt_valid || !strictGates.backend_evidence_receipt || !strictGates.evidence_source_go_core) {
      blockStatus = 'PASSGOLD_RUNTIME_BLOCKED_RECEIPT';
    } else if (!strictGates.pass_gold_authority_binding_valid) {
      blockStatus = 'PASSGOLD_RUNTIME_BLOCKED_AUTHORITY';
    } else if (!strictGates.tests_verified) {
      blockStatus = 'PASSGOLD_RUNTIME_BLOCKED_TESTS';
    } else {
      blockStatus = 'PASSGOLD_RUNTIME_BLOCKED_TESTS';
    }

    return _blocked(blockStatus, {
      runtime_evidence_ready:  strictGates.runtime_evidence_ready,
      go_core_receipt_valid:   strictGates.go_core_receipt_valid,
      authority_binding_valid: strictGates.pass_gold_authority_binding_valid,
      tests_verified,
      strict_gates:            strictGates,
      missing_gates:           missingGates,
      blocking_reason:         `strict_gates_missing:${missingGates.join(',')}`,
    });
  }

  // All 16 gates passed → READY (still no deploy/stable/promotion)
  return {
    schema_version:                      SCHEMA_VERSION,
    pass_gold_runtime_binding_status:    'PASSGOLD_RUNTIME_READY',
    pass_gold_runtime_binding_valid:     true,
    pass_gold_candidate_allowed:         true,
    pass_gold_candidate_reason:          'all_strict_gates_passed',
    runtime_evidence_ready:              true,
    go_core_receipt_valid:               true,
    authority_binding_valid:             true,
    tests_verified:                      strictGates.tests_verified,
    strict_gates:                        strictGates,
    missing_gates:                       [],
    mission_id:                          runtime_evidence?.mission_id ?? null,
    evidence_receipt_id:                 runtime_evidence?.evidence_receipt_id ?? go_core_receipt?.receipt_id ?? null,
    evidence_source:                     'go-core',
    blocking_reason:                     null,
    deploy_allowed:                      false,
    promotion_allowed:                   false,
    stable_allowed:                      false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, fields = {}) {
  return {
    schema_version:                   SCHEMA_VERSION,
    pass_gold_runtime_binding_status: status,
    pass_gold_runtime_binding_valid:  false,
    pass_gold_candidate_allowed:      false,
    pass_gold_candidate_reason:       fields.blocking_reason || 'blocked',
    deploy_allowed:                   false,
    promotion_allowed:                false,
    stable_allowed:                   false,
    ...fields,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('pass-gold-runtime-binding.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');

  const result = evaluatePassGoldRuntimeBinding({});

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`pass_gold_runtime_binding_status : ${result.pass_gold_runtime_binding_status}`);
    console.log(`pass_gold_candidate_allowed      : ${result.pass_gold_candidate_allowed}`);
    console.log(`deploy_allowed                   : ${result.deploy_allowed}`);
    console.log(`promotion_allowed                : ${result.promotion_allowed}`);
  }

  process.exit(result.pass_gold_runtime_binding_valid ? 0 : 1);
}
