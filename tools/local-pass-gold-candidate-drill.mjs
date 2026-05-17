#!/usr/bin/env node
/**
 * Local PASS GOLD Candidate Drill — V28.0
 *
 * Controlled local drill proving the full path to PASS GOLD candidate
 * using fixtures/mocks. No deploy, no tag, no stable promotion ever.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - pass_gold_candidate_allowed=true only within controlled drill scope.
 * - candidate_drill_status=CANDIDATE_DRILL_READY only when ALL strict gates present.
 */

import { evaluatePassGoldRuntimeBinding } from './pass-gold-runtime-binding.mjs';

const SCHEMA_VERSION = 'v28.0';

export const CANDIDATE_DRILL_STATUSES = [
  'CANDIDATE_DRILL_BLOCKED_SETUP',
  'CANDIDATE_DRILL_BLOCKED_RUNTIME',
  'CANDIDATE_DRILL_BLOCKED_RECEIPT',
  'CANDIDATE_DRILL_BLOCKED_AUTHORITY',
  'CANDIDATE_DRILL_READY',
];

// Default fixture values for local drill
const DEFAULT_RUNTIME_EVIDENCE = {
  runtime_evidence_ready: true,
  backend_alive:          true,
  backend_stub:           false,
  backend_health_ok:      true,
  mission_id:             'drill-mission-local-v280',
  evidence_receipt_id:    'drill-rcpt-local-v280',
  evidence_source:        'go-core',
};

const DEFAULT_RECEIPT = {
  receipt_valid:  true,
  receipt_status: 'RECEIPT_VALID',
  source:         'go-core',
  receipt_id:     'drill-rcpt-local-v280',
};

const DEFAULT_AUTHORITY = { authority_valid: true, source: 'drill_local' };

const DEFAULT_STRICT_GATES = {
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
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:              SCHEMA_VERSION,
    candidate_drill_status:      status,
    pass_gold_candidate_allowed: false,
    all_strict_gates_present:    false,
    missing_gates:               extra.missing_gates ?? [],
    deploy_allowed:              false,
    promotion_allowed:           false,
    stable_allowed:              false,
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Runs a local PASS GOLD candidate drill using fixtures.
 *
 * @param {Object}  options
 * @param {boolean} options.use_fixtures         - Use default fixtures (default: true)
 * @param {Object}  options.runtime_evidence     - Override runtime evidence fixture
 * @param {Object}  options.go_core_receipt      - Override receipt fixture
 * @param {Object}  options.authority_binding    - Override authority fixture
 * @param {boolean} options.tests_verified       - Tests verified (default: true)
 * @param {Object}  options.strict_gate_overrides - Override individual strict gates
 * @returns {Object} Drill result
 */
export function runLocalPassGoldCandidateDrill(options = {}) {
  const {
    use_fixtures          = true,
    runtime_evidence      = null,
    go_core_receipt       = null,
    authority_binding     = null,
    tests_verified        = true,
    strict_gate_overrides = {},
  } = options;

  // Gate 0: fixtures required (drill only works with controlled fixtures)
  if (!use_fixtures && !runtime_evidence && !go_core_receipt && !authority_binding) {
    return _blocked('CANDIDATE_DRILL_BLOCKED_SETUP', {
      blocking_reason: 'fixtures_required_for_drill',
    });
  }

  // Resolve fixtures
  const runtimeEvidence  = runtime_evidence  ?? DEFAULT_RUNTIME_EVIDENCE;
  const goCorReceipt     = go_core_receipt   ?? DEFAULT_RECEIPT;
  const authorityBinding = authority_binding ?? DEFAULT_AUTHORITY;

  const strictGates = { ...DEFAULT_STRICT_GATES, ...strict_gate_overrides };

  // Gate 1: runtime evidence must be ready
  if (!runtimeEvidence || runtimeEvidence.runtime_evidence_ready !== true || runtimeEvidence.backend_alive !== true) {
    return _blocked('CANDIDATE_DRILL_BLOCKED_RUNTIME', {
      blocking_reason: 'runtime_evidence_not_ready',
      missing_gates:   ['runtime_evidence_ready', 'backend_alive'],
    });
  }

  // Gate 2: receipt must be valid
  if (!goCorReceipt || goCorReceipt.receipt_valid !== true || goCorReceipt.source !== 'go-core') {
    return _blocked('CANDIDATE_DRILL_BLOCKED_RECEIPT', {
      blocking_reason: 'receipt_invalid_or_wrong_source',
      missing_gates:   ['go_core_receipt_valid', 'evidence_source_go_core'],
    });
  }

  // Gate 3: authority must be valid
  if (!authorityBinding || authorityBinding.authority_valid !== true) {
    return _blocked('CANDIDATE_DRILL_BLOCKED_AUTHORITY', {
      blocking_reason: 'authority_not_valid',
      missing_gates:   ['pass_gold_authority_binding_valid'],
    });
  }

  // Evaluate through full V27.1 binding (strict 17-gate)
  const bindingResult = evaluatePassGoldRuntimeBinding({
    runtime_evidence:  runtimeEvidence,
    go_core_receipt:   goCorReceipt,
    authority_binding: authorityBinding,
    tests_verified,
    ...strictGates,
  });

  if (!bindingResult.pass_gold_runtime_binding_valid) {
    const missingGates = bindingResult.missing_gates ?? [];
    const status =
      bindingResult.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_RECEIPT'   ? 'CANDIDATE_DRILL_BLOCKED_RECEIPT'   :
      bindingResult.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_AUTHORITY' ? 'CANDIDATE_DRILL_BLOCKED_AUTHORITY' :
      bindingResult.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_TESTS'     ? 'CANDIDATE_DRILL_BLOCKED_AUTHORITY' :
      'CANDIDATE_DRILL_BLOCKED_RUNTIME';
    return _blocked(status, {
      missing_gates:   missingGates,
      blocking_reason: bindingResult.blocking_reason ?? bindingResult.pass_gold_runtime_binding_status,
      binding_status:  bindingResult.pass_gold_runtime_binding_status,
    });
  }

  return {
    schema_version:              SCHEMA_VERSION,
    candidate_drill_status:      'CANDIDATE_DRILL_READY',
    pass_gold_candidate_allowed: true,
    all_strict_gates_present:    true,
    missing_gates:               [],
    mission_id:                  runtimeEvidence.mission_id,
    evidence_receipt_id:         goCorReceipt.receipt_id,
    evidence_source:             'go-core',
    strict_gates_evaluated:      Object.keys(strictGates),
    binding_status:              bindingResult.pass_gold_runtime_binding_status,
    deploy_allowed:              false,
    promotion_allowed:           false,
    stable_allowed:              false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('local-pass-gold-candidate-drill.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const noFixtures = args.includes('--no-fixtures');

  const result = runLocalPassGoldCandidateDrill({
    use_fixtures: !noFixtures,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`candidate_drill_status       : ${result.candidate_drill_status}`);
    console.log(`pass_gold_candidate_allowed  : ${result.pass_gold_candidate_allowed}`);
    console.log(`all_strict_gates_present     : ${result.all_strict_gates_present}`);
    console.log(`missing_gates                : ${result.missing_gates?.join(',') || 'none'}`);
    console.log(`deploy_allowed               : ${result.deploy_allowed}`);
    console.log(`promotion_allowed            : ${result.promotion_allowed}`);
  }

  process.exit(result.candidate_drill_status === 'CANDIDATE_DRILL_READY' ? 0 : 1);
}
