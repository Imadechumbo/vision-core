#!/usr/bin/env node
/**
 * Real Runtime Bridge Baseline — V35.0
 *
 * Consolidates V31–V34: verifies all runtime bridge + candidate drill
 * modules are present and their tests exist. Validates invariants
 * across the full runtime stack.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - No real deploy, no real tag, no stable promotion.
 */

import { existsSync } from 'fs';
import { resolve }    from 'path';
import { runLocalPassGoldFullCandidateDrill }  from './local-pass-gold-full-candidate-drill.mjs';
import { runProbeBridgeIntegration }           from './runtime-probe-bridge-integration.mjs';
import { buildDrillAuthorityFixture }          from './runtime-authority-fixture-contract.mjs';
import { appendCandidateLedgerEntry, _resetLedgerForTest } from './pass-gold-candidate-evidence-ledger.mjs';

const SCHEMA_VERSION = 'v35.0';

export const BRIDGE_BASELINE_STATUSES = [
  'BRIDGE_BASELINE_BLOCKED_MODULES',
  'BRIDGE_BASELINE_BLOCKED_TESTS',
  'BRIDGE_BASELINE_BLOCKED_INVARIANTS',
  'BRIDGE_BASELINE_READY',
];

// ═══════════════════════════════════════════════════════════════════
// REQUIRED MODULE MANIFEST
// ═══════════════════════════════════════════════════════════════════

const REQUIRED_MODULES = [
  'tools/backend-go-core-adapter-contract.mjs',
  'tools/local-go-core-invocation-harness.mjs',
  'tools/backend-run-live-go-core-bridge.mjs',
  'tools/runtime-probe-bridge-integration.mjs',
  'tools/runtime-authority-fixture-contract.mjs',
  'tools/local-pass-gold-full-candidate-drill.mjs',
  'tools/pass-gold-candidate-evidence-ledger.mjs',
];

const REQUIRED_TESTS = [
  'tools/tests/backend-go-core-adapter-contract.test.mjs',
  'tools/tests/local-go-core-invocation-harness.test.mjs',
  'tools/tests/backend-run-live-go-core-bridge.test.mjs',
  'tools/tests/runtime-probe-bridge-integration.test.mjs',
  'tools/tests/runtime-authority-fixture-contract.test.mjs',
  'tools/tests/local-pass-gold-full-candidate-drill.test.mjs',
  'tools/tests/pass-gold-candidate-evidence-ledger.test.mjs',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:              SCHEMA_VERSION,
    bridge_baseline_status:      status,
    bridge_baseline_ready:       false,
    deploy_allowed:              false,
    promotion_allowed:           false,
    stable_allowed:              false,
    missing_modules:             extra.missing_modules ?? [],
    missing_tests:               extra.missing_tests   ?? [],
    blocking_reason:             extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Run the real runtime bridge baseline check.
 *
 * @param {Object} options
 * @param {string}  options.root          - Project root (default: process.cwd())
 * @param {boolean} options.skip_ledger   - Skip ledger append (default: false)
 * @param {Object|null} options._mock_drill - Mock drill result (test mode)
 * @param {Object|null} options._mock_bridge - Mock bridge result (test mode)
 * @returns {Object} Baseline result
 */
export function runRealRuntimeBridgeBaseline(options = {}) {
  const {
    root        = process.cwd(),
    skip_ledger = false,
    _mock_drill  = null,
    _mock_bridge = null,
  } = options;

  // Stage 1: Verify all required modules exist
  const missingModules = REQUIRED_MODULES.filter(p => !existsSync(resolve(root, p)));
  if (missingModules.length > 0) {
    return _blocked('BRIDGE_BASELINE_BLOCKED_MODULES', {
      missing_modules: missingModules,
      blocking_reason: `modules_missing:${missingModules.join(',')}`,
    });
  }

  // Stage 2: Verify all required test files exist
  const missingTests = REQUIRED_TESTS.filter(p => !existsSync(resolve(root, p)));
  if (missingTests.length > 0) {
    return _blocked('BRIDGE_BASELINE_BLOCKED_TESTS', {
      missing_tests:   missingTests,
      blocking_reason: `tests_missing:${missingTests.join(',')}`,
    });
  }

  // Stage 3: Validate runtime bridge invariants
  const bridgeResult = _mock_bridge ?? runProbeBridgeIntegration({ fixture_mode: true });
  if (!bridgeResult.probe_bridge_ready) {
    return _blocked('BRIDGE_BASELINE_BLOCKED_INVARIANTS', {
      blocking_reason: `bridge_not_ready:${bridgeResult.probe_bridge_status}`,
      bridge_status:   bridgeResult.probe_bridge_status,
    });
  }

  // Validate authority fixture
  const authorityResult = buildDrillAuthorityFixture();
  if (!authorityResult.authority_valid) {
    return _blocked('BRIDGE_BASELINE_BLOCKED_INVARIANTS', {
      blocking_reason: `authority_not_valid:${authorityResult.authority_fixture_status}`,
    });
  }

  // Stage 4: Validate full candidate drill invariants
  const drillResult = _mock_drill ?? runLocalPassGoldFullCandidateDrill({
    tests_verified:  true,
    _mock_bridge:    bridgeResult,
    _mock_authority: authorityResult,
  });

  if (!drillResult.full_candidate_drill_ready) {
    return _blocked('BRIDGE_BASELINE_BLOCKED_INVARIANTS', {
      blocking_reason: `drill_not_ready:${drillResult.full_candidate_drill_status}`,
      drill_status:    drillResult.full_candidate_drill_status,
    });
  }

  // Invariant checks
  const invariantViolations = [];
  if (drillResult.deploy_allowed    !== false) invariantViolations.push('drill.deploy_allowed must be false');
  if (drillResult.promotion_allowed !== false) invariantViolations.push('drill.promotion_allowed must be false');
  if (drillResult.stable_allowed    !== false) invariantViolations.push('drill.stable_allowed must be false');
  if (drillResult.candidate_is_local_drill !== true) invariantViolations.push('drill.candidate_is_local_drill must be true');
  if (bridgeResult.deploy_allowed   !== false) invariantViolations.push('bridge.deploy_allowed must be false');

  if (invariantViolations.length > 0) {
    return _blocked('BRIDGE_BASELINE_BLOCKED_INVARIANTS', {
      invariant_violations: invariantViolations,
      blocking_reason:      `invariant_violated:${invariantViolations[0]}`,
    });
  }

  // Stage 5: Append ledger entry
  let ledger_entry_id = null;
  if (!skip_ledger) {
    _resetLedgerForTest();
    const ledgerResult = appendCandidateLedgerEntry({
      event_type:          'PASS_GOLD_CANDIDATE_DRILL_READY',
      mission_id:          drillResult.mission_id,
      evidence_receipt_id: drillResult.evidence_receipt_id,
      evidence_source:     'go-core',
      drill_status:        drillResult.full_candidate_drill_status,
    });
    if (ledgerResult.ledger_append_ok) {
      ledger_entry_id = ledgerResult.entry_id;
    }
  }

  return {
    schema_version:              SCHEMA_VERSION,
    bridge_baseline_status:      'BRIDGE_BASELINE_READY',
    bridge_baseline_ready:       true,
    modules_verified:            REQUIRED_MODULES.length,
    tests_verified:              REQUIRED_TESTS.length,
    missing_modules:             [],
    missing_tests:               [],
    bridge_status:               bridgeResult.probe_bridge_status,
    drill_status:                drillResult.full_candidate_drill_status,
    pass_gold_candidate_allowed: drillResult.pass_gold_candidate_allowed,
    candidate_is_local_drill:    true,
    evidence_source:             'go-core',
    mission_id:                  drillResult.mission_id,
    evidence_receipt_id:         drillResult.evidence_receipt_id,
    ledger_entry_id,
    deploy_allowed:              false,
    promotion_allowed:           false,
    stable_allowed:              false,
    blocking_reason:             null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-runtime-bridge-baseline.mjs')) {
  const args        = process.argv.slice(2);
  const json        = args.includes('--json');
  const skipLedger  = args.includes('--skip-ledger');

  const result = runRealRuntimeBridgeBaseline({ skip_ledger: skipLedger });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`bridge_baseline_status   : ${result.bridge_baseline_status}`);
    console.log(`bridge_baseline_ready    : ${result.bridge_baseline_ready}`);
    console.log(`modules_verified         : ${result.modules_verified ?? 0}`);
    console.log(`tests_verified           : ${result.tests_verified ?? 0}`);
    console.log(`pass_gold_candidate_allowed : ${result.pass_gold_candidate_allowed ?? false}`);
    console.log(`deploy_allowed           : ${result.deploy_allowed}`);
    console.log(`promotion_allowed        : ${result.promotion_allowed}`);
  }

  process.exit(result.bridge_baseline_ready ? 0 : 1);
}
