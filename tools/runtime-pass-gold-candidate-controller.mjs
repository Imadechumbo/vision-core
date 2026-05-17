#!/usr/bin/env node
/**
 * Runtime PASS GOLD Candidate Controller — V37.0
 *
 * Aggregates V36.x runtime execution stages (controller → evidence package
 * → ledger binding) and evaluates PASS GOLD candidate readiness with real
 * runtime evidence from Go Core.
 *
 * pass_gold_candidate=true ONLY when all runtime stages pass with real Go Core
 * evidence. Even so: deploy/promotion/stable/tag=false always.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - pass_gold_candidate=true is local-only — no deploy, no promotion.
 * - evidence_source must be 'go-core' for pass_gold_candidate=true.
 * - pass_gold_candidate=true without real runtime evidence = STOP CONDITION.
 */

import { runLocalRuntimeExecutionController }      from './local-runtime-execution-controller.mjs';
import { buildRuntimeExecutionEvidencePackage }    from './runtime-execution-evidence-package.mjs';
import { bindRuntimeExecutionToLedger, _resetLedgerForTest } from './runtime-execution-ledger-binding.mjs';

export { _resetLedgerForTest };

const SCHEMA_VERSION = 'v37.0';

export const RUNTIME_PASS_GOLD_STATUSES = [
  'RUNTIME_PASS_GOLD_SKIPPED',
  'RUNTIME_PASS_GOLD_BLOCKED_RUNTIME',
  'RUNTIME_PASS_GOLD_BLOCKED_PACKAGE',
  'RUNTIME_PASS_GOLD_BLOCKED_BINDING',
  'RUNTIME_PASS_GOLD_CANDIDATE_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _skipped(extra = {}) {
  return {
    schema_version:             SCHEMA_VERSION,
    runtime_pass_gold_status:   'RUNTIME_PASS_GOLD_SKIPPED',
    runtime_pass_gold_ready:    false,
    pass_gold_candidate:        false,
    candidate_is_local_only:    true,
    runtime_stage_ready:        false,
    package_stage_ready:        false,
    binding_stage_ready:        false,
    mission_id:                 null,
    evidence_receipt_id:        null,
    evidence_source:            null,
    package_hash:               null,
    ledger_entry_id:            null,
    deploy_allowed:             false,
    promotion_allowed:          false,
    stable_allowed:             false,
    tag_allowed:                false,
    blocking_reason:            extra.blocking_reason ?? 'not_requested',
    ...extra,
  };
}

function _blocked(status, extra = {}) {
  return {
    schema_version:             SCHEMA_VERSION,
    runtime_pass_gold_status:   status,
    runtime_pass_gold_ready:    false,
    pass_gold_candidate:        false,
    candidate_is_local_only:    true,
    runtime_stage_ready:        extra.runtime_stage_ready ?? false,
    package_stage_ready:        extra.package_stage_ready ?? false,
    binding_stage_ready:        false,
    mission_id:                 extra.mission_id ?? null,
    evidence_receipt_id:        null,
    evidence_source:            null,
    package_hash:               extra.package_hash ?? null,
    ledger_entry_id:            null,
    deploy_allowed:             false,
    promotion_allowed:          false,
    stable_allowed:             false,
    tag_allowed:                false,
    blocking_reason:            extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Run runtime PASS GOLD candidate evaluation.
 *
 * @param {Object}  options
 * @param {boolean} options.candidate_requested      - Must be true to run (default: false)
 * @param {boolean} options.fixture_mode             - Fixture mode for testing
 * @param {boolean} options.start_local_backend      - Start backend (for V36.0)
 * @param {string|null} options.go_core_bin          - Go Core binary path
 * @param {number}  options.timeout_ms               - Operation timeout (default: 15000)
 * @param {Object|null} options._mock_runtime        - Mock V36.0 result (test mode)
 * @param {Object|null} options._mock_package        - Mock V36.1 result (test mode)
 * @param {Object|null} options._mock_binding        - Mock V36.2 result (test mode)
 * @returns {Object} Runtime PASS GOLD candidate result
 */
export function runRuntimePassGoldCandidateController(options = {}) {
  const {
    candidate_requested  = false,
    fixture_mode         = false,
    start_local_backend  = false,
    go_core_bin          = null,
    timeout_ms           = 15000,
    _mock_runtime        = null,
    _mock_package        = null,
    _mock_binding        = null,
  } = options;

  if (!candidate_requested && !fixture_mode) {
    return _skipped({ blocking_reason: 'candidate_not_requested' });
  }

  // Stage 1: Local Runtime Execution (V36.0)
  let runtimeResult = _mock_runtime;
  if (!runtimeResult) {
    runtimeResult = runLocalRuntimeExecutionController({
      execute_local_runtime: candidate_requested,
      start_local_backend,
      go_core_bin,
      fixture_mode,
      timeout_ms,
    });
  }

  if (!runtimeResult?.local_runtime_ready) {
    return _blocked('RUNTIME_PASS_GOLD_BLOCKED_RUNTIME', {
      blocking_reason: `runtime_not_ready:${runtimeResult?.local_runtime_status ?? 'null'}`,
    });
  }

  // Stage 2: Evidence Package (V36.1)
  let pkgResult = _mock_package;
  if (!pkgResult) {
    pkgResult = buildRuntimeExecutionEvidencePackage({
      package_requested: true,
      runtime_result:    runtimeResult,
      fixture_mode:      false,
    });
  }

  if (!pkgResult?.evidence_package_ready) {
    return _blocked('RUNTIME_PASS_GOLD_BLOCKED_PACKAGE', {
      runtime_stage_ready: true,
      mission_id:          runtimeResult.mission_id,
      blocking_reason:     `package_not_ready:${pkgResult?.evidence_package_status ?? 'null'}`,
    });
  }

  // Stage 3: Ledger Binding (V36.2)
  let bindingResult = _mock_binding;
  if (!bindingResult) {
    bindingResult = bindRuntimeExecutionToLedger({
      binding_requested: true,
      evidence_package:  pkgResult,
      fixture_mode:      false,
    });
  }

  if (!bindingResult?.ledger_binding_ready) {
    return _blocked('RUNTIME_PASS_GOLD_BLOCKED_BINDING', {
      runtime_stage_ready: true,
      package_stage_ready: true,
      mission_id:          runtimeResult.mission_id,
      package_hash:        pkgResult.package_hash,
      blocking_reason:     `binding_not_ready:${bindingResult?.ledger_binding_status ?? 'null'}`,
    });
  }

  return {
    schema_version:           SCHEMA_VERSION,
    runtime_pass_gold_status: 'RUNTIME_PASS_GOLD_CANDIDATE_READY',
    runtime_pass_gold_ready:  true,
    pass_gold_candidate:      true,
    candidate_is_local_only:  true,
    runtime_stage_ready:      true,
    package_stage_ready:      true,
    binding_stage_ready:      true,
    mission_id:               runtimeResult.mission_id,
    evidence_receipt_id:      runtimeResult.evidence_receipt_id,
    evidence_source:          'go-core',
    package_hash:             pkgResult.package_hash,
    ledger_entry_id:          bindingResult.ledger_entry_id,
    ledger_seq:               bindingResult.ledger_seq,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
    tag_allowed:              false,
    blocking_reason:          null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-pass-gold-candidate-controller.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const fixture   = args.includes('--fixture-mode');
  const requested = args.includes('--candidate-requested');
  const startBk   = args.includes('--start-local-backend');
  const goCoreArg = args.find((_, i) => args[i-1] === '--go-core-bin') ?? null;
  const timeoutMs = Number(args.find((_, i) => args[i-1] === '--timeout-ms') ?? 15000);

  const result = runRuntimePassGoldCandidateController({
    candidate_requested: requested,
    fixture_mode:        fixture,
    start_local_backend: startBk,
    go_core_bin:         goCoreArg,
    timeout_ms:          timeoutMs,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`runtime_pass_gold_status : ${result.runtime_pass_gold_status}`);
    console.log(`runtime_pass_gold_ready  : ${result.runtime_pass_gold_ready}`);
    console.log(`pass_gold_candidate      : ${result.pass_gold_candidate}`);
    console.log(`candidate_is_local_only  : ${result.candidate_is_local_only}`);
    console.log(`runtime_stage_ready      : ${result.runtime_stage_ready}`);
    console.log(`package_stage_ready      : ${result.package_stage_ready}`);
    console.log(`binding_stage_ready      : ${result.binding_stage_ready}`);
    console.log(`mission_id               : ${result.mission_id}`);
    console.log(`evidence_source          : ${result.evidence_source}`);
    console.log(`deploy_allowed           : ${result.deploy_allowed}`);
    console.log(`promotion_allowed        : ${result.promotion_allowed}`);
  }

  process.exit(result.runtime_pass_gold_ready ? 0 : 1);
}
