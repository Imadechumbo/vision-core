#!/usr/bin/env node
/**
 * Local PASS GOLD Full Candidate Drill — V32.2
 *
 * Proves the complete path to pass_gold_candidate=true in a fully controlled
 * local fixture environment. Uses bridge fixture, Go Core receipt, and
 * authority fixture to satisfy all 17 strict gates.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - pass_gold_candidate_allowed=true ONLY within this drill scope.
 * - candidate_is_local_drill=true always.
 * - No production deploy, no real tag, no stable promotion.
 */

import { runProbeBridgeIntegration }        from './runtime-probe-bridge-integration.mjs';
import { buildDrillAuthorityFixture }        from './runtime-authority-fixture-contract.mjs';
import { evaluatePassGoldRuntimeBinding }    from './pass-gold-runtime-binding.mjs';

const SCHEMA_VERSION = 'v32.2';

export const FULL_CANDIDATE_DRILL_STATUSES = [
  'FULL_CANDIDATE_DRILL_BLOCKED_RUNTIME',
  'FULL_CANDIDATE_DRILL_BLOCKED_RECEIPT',
  'FULL_CANDIDATE_DRILL_BLOCKED_AUTHORITY',
  'FULL_CANDIDATE_DRILL_BLOCKED_TESTS',
  'FULL_CANDIDATE_DRILL_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:                SCHEMA_VERSION,
    full_candidate_drill_status:   status,
    full_candidate_drill_ready:    false,
    pass_gold_candidate_allowed:   false,
    candidate_is_local_drill:      true,
    all_strict_gates_present:      false,
    missing_gates:                 extra.missing_gates ?? [],
    deploy_allowed:                false,
    promotion_allowed:             false,
    stable_allowed:                false,
    blocking_reason:               extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Runs the full PASS GOLD candidate drill locally.
 *
 * @param {Object}  options
 * @param {boolean} options.tests_verified         - Tests verified flag (default: true)
 * @param {Object|null} options._mock_bridge       - Mock bridge result (test mode)
 * @param {Object|null} options._mock_authority    - Mock authority fixture (test mode)
 * @param {Object}      options.authority_overrides - Overrides for authority fixture
 * @returns {Object} Full candidate drill result
 */
export function runLocalPassGoldFullCandidateDrill(options = {}) {
  const {
    tests_verified      = true,
    _mock_bridge        = null,
    _mock_authority     = null,
    authority_overrides = {},
  } = options;

  // Stage 1: Runtime probe bridge (fixture mode for drill)
  const bridgeResult = _mock_bridge ?? runProbeBridgeIntegration({ fixture_mode: true });

  if (!bridgeResult.probe_bridge_ready) {
    return _blocked('FULL_CANDIDATE_DRILL_BLOCKED_RUNTIME', {
      bridge_status:   bridgeResult.probe_bridge_status,
      blocking_reason: `bridge_blocked:${bridgeResult.blocking_reason}`,
    });
  }

  // Stage 2: Receipt must be present and from go-core
  if (!bridgeResult.evidence_receipt_id) {
    return _blocked('FULL_CANDIDATE_DRILL_BLOCKED_RECEIPT', {
      mission_id:      bridgeResult.mission_id,
      blocking_reason: 'receipt_missing_from_bridge',
    });
  }
  if (bridgeResult.evidence_source !== 'go-core') {
    return _blocked('FULL_CANDIDATE_DRILL_BLOCKED_RECEIPT', {
      mission_id:      bridgeResult.mission_id,
      evidence_source: bridgeResult.evidence_source,
      blocking_reason: `receipt_source_not_go_core:${bridgeResult.evidence_source}`,
    });
  }

  // Stage 3: Authority fixture
  const authorityResult = _mock_authority ?? buildDrillAuthorityFixture(authority_overrides);

  if (!authorityResult.authority_valid) {
    return _blocked('FULL_CANDIDATE_DRILL_BLOCKED_AUTHORITY', {
      authority_status: authorityResult.authority_fixture_status,
      blocking_reason:  `authority_blocked:${authorityResult.blocking_reason}`,
    });
  }

  // Stage 4: tests_verified gate
  if (!tests_verified) {
    return _blocked('FULL_CANDIDATE_DRILL_BLOCKED_TESTS', {
      missing_gates:   ['tests_verified'],
      blocking_reason: 'tests_not_verified',
    });
  }

  // Stage 5: V27.1 strict binding — all 17 gates
  const bindingResult = evaluatePassGoldRuntimeBinding({
    runtime_evidence: {
      runtime_evidence_ready: true,
      backend_alive:          true,
      backend_stub:           false,
      backend_health_ok:      true,
      mission_id:             bridgeResult.mission_id,
      evidence_receipt_id:    bridgeResult.evidence_receipt_id,
      evidence_source:        'go-core',
    },
    go_core_receipt: {
      receipt_valid:  true,
      receipt_status: 'RECEIPT_VALID',
      source:         'go-core',
      receipt_id:     bridgeResult.evidence_receipt_id,
    },
    authority_binding: {
      authority_valid: true,
      source:          authorityResult.reviewer,
    },
    tests_verified,
    syntax_ok:             true,
    go_core_compiled:      true,
    go_test_pass:          true,
    go_build_pass:         true,
    fake_evidence_absent:  true,
    forbidden_diff_absent: true,
    backend_health_ok:     true,
    runtime_probe_pass:    true,
    go_core_receipt_valid: true,
    runtime_evidence_ready: true,
  });

  if (!bindingResult.pass_gold_runtime_binding_valid) {
    const missingGates = bindingResult.missing_gates ?? [];
    const status =
      bindingResult.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_RECEIPT'   ? 'FULL_CANDIDATE_DRILL_BLOCKED_RECEIPT'   :
      bindingResult.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_AUTHORITY' ? 'FULL_CANDIDATE_DRILL_BLOCKED_AUTHORITY' :
      bindingResult.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_TESTS'     ? 'FULL_CANDIDATE_DRILL_BLOCKED_TESTS'     :
      'FULL_CANDIDATE_DRILL_BLOCKED_RUNTIME';
    return _blocked(status, {
      missing_gates:   missingGates,
      binding_status:  bindingResult.pass_gold_runtime_binding_status,
      blocking_reason: `binding_blocked:${bindingResult.pass_gold_runtime_binding_status}`,
    });
  }

  return {
    schema_version:              SCHEMA_VERSION,
    full_candidate_drill_status: 'FULL_CANDIDATE_DRILL_READY',
    full_candidate_drill_ready:  true,
    pass_gold_candidate_allowed: true,
    candidate_is_local_drill:    true,
    all_strict_gates_present:    true,
    missing_gates:               [],
    mission_id:                  bridgeResult.mission_id,
    evidence_receipt_id:         bridgeResult.evidence_receipt_id,
    evidence_source:             'go-core',
    tests_verified,
    binding_status:              bindingResult.pass_gold_runtime_binding_status,
    authority_contract_id:       authorityResult.contract_id,
    blocking_reason:             null,
    deploy_allowed:              false,
    promotion_allowed:           false,
    stable_allowed:              false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('local-pass-gold-full-candidate-drill.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const noTests   = args.includes('--no-tests-verified');

  const result = runLocalPassGoldFullCandidateDrill({
    tests_verified: !noTests,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`full_candidate_drill_status  : ${result.full_candidate_drill_status}`);
    console.log(`full_candidate_drill_ready   : ${result.full_candidate_drill_ready}`);
    console.log(`pass_gold_candidate_allowed  : ${result.pass_gold_candidate_allowed}`);
    console.log(`candidate_is_local_drill     : ${result.candidate_is_local_drill}`);
    console.log(`all_strict_gates_present     : ${result.all_strict_gates_present}`);
    console.log(`deploy_allowed               : ${result.deploy_allowed}`);
    console.log(`promotion_allowed            : ${result.promotion_allowed}`);
  }

  process.exit(result.full_candidate_drill_ready ? 0 : 1);
}
