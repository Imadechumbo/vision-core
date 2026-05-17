#!/usr/bin/env node
/**
 * PASS GOLD Runtime Evidence Binding — V21.4
 *
 * Binds PASS GOLD candidate to the real evidence chain:
 * Go Core receipt + backend runtime + mission_id + authority binding + tests.
 *
 * REGRA ABSOLUTA:
 * - PASSGOLD_RUNTIME_READY does NOT execute deploy, tag, or stable.
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 */

const SCHEMA_VERSION = 'v21.4';

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
 * Evaluates whether PASS GOLD candidate is allowed given runtime evidence chain.
 *
 * @param {Object} input
 * @param {Object|null} input.runtime_evidence    - Result from activateRuntimeEvidence()
 * @param {Object|null} input.go_core_receipt     - Result from validateGoCorEvidenceReceipt()
 * @param {Object|null} input.authority_binding   - Authority binding result (optional)
 * @param {boolean}     input.tests_verified      - Were tests verified?
 * @returns {Object} Binding evaluation result
 */
export function evaluatePassGoldRuntimeBinding(input = {}) {
  const {
    runtime_evidence  = null,
    go_core_receipt   = null,
    authority_binding = null,
    tests_verified    = false,
  } = input;

  // Gate 1: runtime evidence must be READY
  const evidenceReady = runtime_evidence && runtime_evidence.runtime_evidence_ready === true
    && runtime_evidence.backend_stub === false
    && runtime_evidence.backend_alive === true;

  if (!evidenceReady) {
    return _blocked('PASSGOLD_RUNTIME_BLOCKED_EVIDENCE', {
      runtime_evidence_ready: false,
      go_core_receipt_valid:  go_core_receipt?.receipt_valid || false,
      authority_binding_valid: authority_binding?.authority_valid || false,
      tests_verified,
      blocking_reason: 'runtime_evidence_not_ready',
    });
  }

  // Gate 2: Go Core receipt must be VALID
  const receiptValid = go_core_receipt && go_core_receipt.receipt_valid === true
    && go_core_receipt.receipt_status === 'RECEIPT_VALID'
    && go_core_receipt.source === 'go-core';

  if (!receiptValid) {
    return _blocked('PASSGOLD_RUNTIME_BLOCKED_RECEIPT', {
      runtime_evidence_ready:  true,
      go_core_receipt_valid:   false,
      authority_binding_valid: authority_binding?.authority_valid || false,
      tests_verified,
      blocking_reason: 'go_core_receipt_invalid',
    });
  }

  // Gate 3: authority binding must be valid (if provided, must pass; if null, blocked)
  const authorityValid = authority_binding && authority_binding.authority_valid === true;
  if (!authorityValid) {
    return _blocked('PASSGOLD_RUNTIME_BLOCKED_AUTHORITY', {
      runtime_evidence_ready: true,
      go_core_receipt_valid:  true,
      authority_binding_valid: false,
      tests_verified,
      blocking_reason: authority_binding ? 'authority_binding_invalid' : 'authority_binding_missing',
    });
  }

  // Gate 4: tests must be verified
  if (!tests_verified) {
    return _blocked('PASSGOLD_RUNTIME_BLOCKED_TESTS', {
      runtime_evidence_ready:  true,
      go_core_receipt_valid:   true,
      authority_binding_valid: true,
      tests_verified:          false,
      blocking_reason: 'tests_not_verified',
    });
  }

  // All gates passed → READY (still no deploy/stable/promotion)
  return {
    schema_version:                      SCHEMA_VERSION,
    pass_gold_runtime_binding_status:    'PASSGOLD_RUNTIME_READY',
    pass_gold_runtime_binding_valid:     true,
    pass_gold_candidate_allowed:         true,
    pass_gold_candidate_reason:          'runtime_evidence_chain_complete',
    runtime_evidence_ready:              true,
    go_core_receipt_valid:               true,
    authority_binding_valid:             true,
    tests_verified:                      true,
    mission_id:                          runtime_evidence.mission_id,
    evidence_receipt_id:                 runtime_evidence.evidence_receipt_id,
    evidence_source:                     runtime_evidence.evidence_source,
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
