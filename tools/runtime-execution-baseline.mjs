#!/usr/bin/env node
/**
 * Runtime Execution Baseline — V40.0
 *
 * Consolidation baseline for V36.0→V40.0 real runtime execution path.
 * Verifies all required modules and test files exist, runs a full
 * fixture-mode drill through the complete pipeline, and validates
 * all invariants.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - baseline_ready=true only when all modules, tests, and drill pass.
 * - evidence_source=go-core required for baseline_ready=true.
 * - deploy_performed=false always.
 * - stable_promoted=false always.
 */

import { existsSync }                             from 'fs';
import { resolve }                                from 'path';
import { runLocalRuntimeExecutionController }     from './local-runtime-execution-controller.mjs';
import { buildRuntimeExecutionEvidencePackage }   from './runtime-execution-evidence-package.mjs';
import { bindRuntimeExecutionToLedger, _resetLedgerForTest } from './runtime-execution-ledger-binding.mjs';
import { runRuntimePassGoldCandidateController }  from './runtime-pass-gold-candidate-controller.mjs';
import { generateRuntimeCandidateReport }         from './runtime-candidate-report.mjs';
import { generateRuntimeCandidateCIProof }        from './runtime-candidate-ci-proof.mjs';

const SCHEMA_VERSION = 'v40.0';

const REQUIRED_MODULES = [
  'tools/local-runtime-execution-controller.mjs',       // V36.0
  'tools/runtime-execution-evidence-package.mjs',       // V36.1
  'tools/runtime-execution-ledger-binding.mjs',         // V36.2
  'tools/runtime-pass-gold-candidate-controller.mjs',   // V37.0
  'tools/runtime-candidate-report.mjs',                 // V38.0
  'tools/runtime-candidate-ci-proof.mjs',               // V39.0
];

const REQUIRED_TESTS = [
  'tools/tests/local-runtime-execution-controller.test.mjs',
  'tools/tests/runtime-execution-evidence-package.test.mjs',
  'tools/tests/runtime-execution-ledger-binding.test.mjs',
  'tools/tests/runtime-pass-gold-candidate-controller.test.mjs',
  'tools/tests/runtime-candidate-report.test.mjs',
  'tools/tests/runtime-candidate-ci-proof.test.mjs',
];

export const BASELINE_STATUSES = [
  'BASELINE_SKIPPED',
  'BASELINE_BLOCKED_MODULES',
  'BASELINE_BLOCKED_TESTS',
  'BASELINE_BLOCKED_DRILL',
  'BASELINE_BLOCKED_INVARIANTS',
  'BASELINE_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _skipped(extra = {}) {
  return {
    schema_version:       SCHEMA_VERSION,
    baseline_status:      'BASELINE_SKIPPED',
    baseline_ready:       false,
    modules_verified:     false,
    tests_verified:       false,
    drill_passed:         false,
    invariants_passed:    false,
    deploy_performed:     false,
    stable_promoted:      false,
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
    tag_allowed:          false,
    blocking_reason:      extra.blocking_reason ?? 'not_requested',
    missing_modules:      [],
    missing_tests:        [],
    ...extra,
  };
}

function _blocked(status, extra = {}) {
  return {
    schema_version:       SCHEMA_VERSION,
    baseline_status:      status,
    baseline_ready:       false,
    modules_verified:     extra.modules_verified ?? false,
    tests_verified:       extra.tests_verified ?? false,
    drill_passed:         false,
    invariants_passed:    false,
    deploy_performed:     false,
    stable_promoted:      false,
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
    tag_allowed:          false,
    blocking_reason:      extra.blocking_reason ?? 'blocked',
    missing_modules:      extra.missing_modules ?? [],
    missing_tests:        extra.missing_tests ?? [],
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Run V36.0→V40.0 runtime execution baseline verification.
 *
 * @param {Object}  options
 * @param {boolean} options.baseline_requested  - Must be true to run (default: false)
 * @param {boolean} options.fixture_mode        - Fixture mode for testing
 * @param {boolean} options.skip_file_check     - Skip filesystem check (test mode)
 * @returns {Object} Baseline result
 */
export function runRuntimeExecutionBaseline(options = {}) {
  const {
    baseline_requested = false,
    fixture_mode       = false,
    skip_file_check    = false,
  } = options;

  if (!baseline_requested && !fixture_mode) {
    return _skipped({ blocking_reason: 'baseline_not_requested' });
  }

  const root = resolve(process.cwd());

  // Stage 1: Verify required modules exist
  const missingModules = skip_file_check ? [] : REQUIRED_MODULES.filter(m => !existsSync(resolve(root, m)));
  if (missingModules.length > 0) {
    return _blocked('BASELINE_BLOCKED_MODULES', {
      missing_modules: missingModules,
      blocking_reason: `missing_modules:${missingModules.join(',')}`,
    });
  }

  // Stage 2: Verify required test files exist
  const missingTests = skip_file_check ? [] : REQUIRED_TESTS.filter(t => !existsSync(resolve(root, t)));
  if (missingTests.length > 0) {
    return _blocked('BASELINE_BLOCKED_TESTS', {
      modules_verified: true,
      missing_tests:    missingTests,
      blocking_reason:  `missing_tests:${missingTests.join(',')}`,
    });
  }

  // Stage 3: Run full fixture-mode drill through V36.0→V39.0 pipeline
  _resetLedgerForTest();

  const runtimeResult = runLocalRuntimeExecutionController({ fixture_mode: true });
  if (!runtimeResult.local_runtime_ready) {
    return _blocked('BASELINE_BLOCKED_DRILL', {
      modules_verified: true, tests_verified: true,
      blocking_reason: `drill_runtime_failed:${runtimeResult.local_runtime_status}`,
    });
  }

  const pkgResult = buildRuntimeExecutionEvidencePackage({
    package_requested: true, runtime_result: runtimeResult,
  });
  if (!pkgResult.evidence_package_ready) {
    return _blocked('BASELINE_BLOCKED_DRILL', {
      modules_verified: true, tests_verified: true,
      blocking_reason: `drill_package_failed:${pkgResult.evidence_package_status}`,
    });
  }

  const bindResult = bindRuntimeExecutionToLedger({
    binding_requested: true, evidence_package: pkgResult,
  });
  if (!bindResult.ledger_binding_ready) {
    return _blocked('BASELINE_BLOCKED_DRILL', {
      modules_verified: true, tests_verified: true,
      blocking_reason: `drill_binding_failed:${bindResult.ledger_binding_status}`,
    });
  }

  _resetLedgerForTest();
  const candidateResult = runRuntimePassGoldCandidateController({ fixture_mode: true });
  if (!candidateResult.runtime_pass_gold_ready) {
    return _blocked('BASELINE_BLOCKED_DRILL', {
      modules_verified: true, tests_verified: true,
      blocking_reason: `drill_candidate_failed:${candidateResult.runtime_pass_gold_status}`,
    });
  }

  const reportResult = generateRuntimeCandidateReport({
    report_requested: true, candidate_result: candidateResult,
  });
  if (!reportResult.candidate_report_ready) {
    return _blocked('BASELINE_BLOCKED_DRILL', {
      modules_verified: true, tests_verified: true,
      blocking_reason: `drill_report_failed:${reportResult.candidate_report_status}`,
    });
  }

  const proofResult = generateRuntimeCandidateCIProof({
    proof_requested: true, candidate_report: reportResult,
  });
  if (!proofResult.ci_proof_ready) {
    return _blocked('BASELINE_BLOCKED_DRILL', {
      modules_verified: true, tests_verified: true,
      blocking_reason: `drill_proof_failed:${proofResult.ci_proof_status}`,
    });
  }

  // Stage 4: Validate invariants
  const invariantViolations = [];
  if (proofResult.deploy_allowed     !== false) invariantViolations.push('deploy_allowed must be false');
  if (proofResult.promotion_allowed  !== false) invariantViolations.push('promotion_allowed must be false');
  if (proofResult.stable_allowed     !== false) invariantViolations.push('stable_allowed must be false');
  if (proofResult.tag_allowed        !== false) invariantViolations.push('tag_allowed must be false');
  if (proofResult.evidence_source    !== 'go-core') invariantViolations.push('evidence_source must be go-core');
  if (proofResult.ci_proof_valid     !== true) invariantViolations.push('ci_proof_valid must be true');
  if (proofResult.candidate_is_local_only !== true) invariantViolations.push('candidate_is_local_only must be true');
  if (proofResult.stages_verified    !== 3) invariantViolations.push('stages_verified must be 3');

  if (invariantViolations.length > 0) {
    return _blocked('BASELINE_BLOCKED_INVARIANTS', {
      modules_verified: true, tests_verified: true,
      blocking_reason:  `invariant_violations:${invariantViolations.join(';')}`,
      invariant_violations: invariantViolations,
    });
  }

  return {
    schema_version:       SCHEMA_VERSION,
    baseline_status:      'BASELINE_READY',
    baseline_ready:       true,
    modules_verified:     true,
    tests_verified:       true,
    drill_passed:         true,
    invariants_passed:    true,
    modules_count:        REQUIRED_MODULES.length,
    tests_count:          REQUIRED_TESTS.length,
    mission_id:           proofResult.mission_id,
    evidence_source:      'go-core',
    proof_hash:           proofResult.proof_hash,
    ledger_entry_id:      bindResult.ledger_entry_id,
    stages_verified:      proofResult.stages_verified,
    ci_proof_valid:       true,
    pass_gold_candidate:  true,
    candidate_is_local_only: true,
    deploy_performed:     false,
    stable_promoted:      false,
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
    tag_allowed:          false,
    blocking_reason:      null,
    missing_modules:      [],
    missing_tests:        [],
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-execution-baseline.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const fixture   = args.includes('--fixture-mode');
  const requested = args.includes('--baseline-requested');

  const result = runRuntimeExecutionBaseline({
    baseline_requested: requested,
    fixture_mode:       fixture,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`baseline_status          : ${result.baseline_status}`);
    console.log(`baseline_ready           : ${result.baseline_ready}`);
    console.log(`modules_verified         : ${result.modules_verified}`);
    console.log(`tests_verified           : ${result.tests_verified}`);
    console.log(`drill_passed             : ${result.drill_passed}`);
    console.log(`invariants_passed        : ${result.invariants_passed}`);
    console.log(`modules_count            : ${result.modules_count ?? 0}`);
    console.log(`tests_count              : ${result.tests_count ?? 0}`);
    console.log(`stages_verified          : ${result.stages_verified ?? 0}`);
    console.log(`ci_proof_valid           : ${result.ci_proof_valid ?? false}`);
    console.log(`evidence_source          : ${result.evidence_source}`);
    console.log(`deploy_allowed           : ${result.deploy_allowed}`);
    console.log(`promotion_allowed        : ${result.promotion_allowed}`);
    console.log(`deploy_performed         : ${result.deploy_performed}`);
    console.log(`stable_promoted          : ${result.stable_promoted}`);
  }

  process.exit(result.baseline_ready ? 0 : 1);
}
