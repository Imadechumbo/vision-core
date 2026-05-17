#!/usr/bin/env node
/**
 * Backend Run-Live Go Core Bridge — V31.2
 *
 * Bridge between /api/run-live payload and Go Core invocation harness.
 * Produces a run-live-compatible response from a Go Core-backed execution.
 * Go Core is the evidence authority — backend cannot self-certify receipts.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - backend_stub=false only when Go Core invocation is validated.
 * - evidence_source=go-core only — backend cannot be source.
 */

import { runGoCoreInvocationHarness }     from './local-go-core-invocation-harness.mjs';
import { validateRunLiveContract }         from './run-live-mission-contract.mjs';

const SCHEMA_VERSION = 'v31.2';

export const BRIDGE_STATUSES = [
  'BRIDGE_BLOCKED_PAYLOAD',
  'BRIDGE_BLOCKED_GOCORE',
  'BRIDGE_BLOCKED_RECEIPT',
  'BRIDGE_BLOCKED_RUNLIVE_CONTRACT',
  'BRIDGE_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:          SCHEMA_VERSION,
    bridge_status:           status,
    bridge_ready:            false,
    backend_stub:            true,
    mission_id:              null,
    evidence_receipt_id:     null,
    evidence_source:         null,
    run_live_contract_status: null,
    deploy_allowed:          false,
    promotion_allowed:       false,
    stable_allowed:          false,
    blocking_reason:         extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Runs the run-live Go Core bridge.
 *
 * @param {Object}  options
 * @param {Object|null} options.run_live_payload   - Payload from /api/run-live endpoint
 * @param {string|null} options.go_core_bin        - Path to Go Core binary
 * @param {boolean}     options.fixture_mode       - Use fixture (test mode only)
 * @param {Object|null} options._fixture_gocore    - Fixture for Go Core output (test mode)
 * @param {number}      options.timeout_ms         - Go Core timeout in ms
 * @returns {Object} Bridge result
 */
export function runRunLiveGoCorebridge(options = {}) {
  const {
    run_live_payload  = null,
    go_core_bin       = null,
    fixture_mode      = false,
    _fixture_gocore   = null,
    timeout_ms        = 10000,
  } = options;

  // Gate 1: payload must be present and valid
  if (!run_live_payload || typeof run_live_payload !== 'object') {
    return _blocked('BRIDGE_BLOCKED_PAYLOAD', {
      blocking_reason: 'run_live_payload_required',
    });
  }
  if (run_live_payload.pass_gold === true || run_live_payload.promotion_allowed === true) {
    return _blocked('BRIDGE_BLOCKED_PAYLOAD', {
      blocking_reason: 'payload_claims_pass_gold_rejected',
    });
  }

  // Gate 2: invoke Go Core harness
  const harnessResult = runGoCoreInvocationHarness({
    go_core_bin,
    fixture_mode,
    _fixture_output: _fixture_gocore,
    mission_input: {
      mission_id: run_live_payload.mission_id ?? `msn_bridge_${Date.now()}`,
      ...run_live_payload,
    },
  });

  if (!harnessResult.harness_ready) {
    return _blocked('BRIDGE_BLOCKED_GOCORE', {
      harness_status:  harnessResult.harness_status,
      blocking_reason: `gocore_harness_blocked:${harnessResult.blocking_reason}`,
    });
  }

  // Gate 3: receipt must be present and from go-core
  if (!harnessResult.evidence_receipt_id) {
    return _blocked('BRIDGE_BLOCKED_RECEIPT', {
      mission_id:      harnessResult.mission_id,
      blocking_reason: 'bridge_receipt_missing',
    });
  }
  if (harnessResult.evidence_source !== 'go-core') {
    return _blocked('BRIDGE_BLOCKED_RECEIPT', {
      mission_id:      harnessResult.mission_id,
      evidence_source: harnessResult.evidence_source,
      blocking_reason: `receipt_source_not_go_core:${harnessResult.evidence_source}`,
    });
  }

  // Build run-live compatible response (no stub-triggering keys in validated body)
  const runLiveResponse = {
    mission_id:          harnessResult.mission_id,
    evidence_receipt_id: harnessResult.evidence_receipt_id,
    evidence_source:     'go-core',
    status:              'LIVE',
    pass_gold:           false,
    promotion_allowed:   false,
  };

  // Gate 4: validate run-live contract
  const contractResult = validateRunLiveContract({
    http_status: 200,
    body_raw:    JSON.stringify(runLiveResponse),
  });

  if (contractResult.run_live_status !== 'RUNLIVE_READY') {
    return _blocked('BRIDGE_BLOCKED_RUNLIVE_CONTRACT', {
      run_live_contract_status: contractResult.run_live_status,
      mission_id:               harnessResult.mission_id,
      evidence_receipt_id:      harnessResult.evidence_receipt_id,
      blocking_reason:          `run_live_contract_blocked:${contractResult.run_live_status}`,
    });
  }

  return {
    schema_version:           SCHEMA_VERSION,
    bridge_status:            'BRIDGE_READY',
    bridge_ready:             true,
    backend_stub:             false,
    run_live_response:        runLiveResponse,
    mission_id:               harnessResult.mission_id,
    evidence_receipt_id:      harnessResult.evidence_receipt_id,
    evidence_source:          'go-core',
    run_live_contract_status: contractResult.run_live_status,
    blocking_reason:          null,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('backend-run-live-go-core-bridge.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const fixMode   = args.includes('--fixture-mode');
  const binIdx    = args.indexOf('--go-core-bin');
  const payIdx    = args.indexOf('--payload');
  const bin       = binIdx >= 0 ? args[binIdx + 1] : null;
  const payStr    = payIdx >= 0 ? args[payIdx + 1] : null;

  let payload = null;
  if (payStr) { try { payload = JSON.parse(payStr); } catch {} }
  if (!payload && fixMode) { payload = { mission_id: `msn_cli_${Date.now()}` }; }

  const result = runRunLiveGoCorebridge({
    run_live_payload: payload,
    go_core_bin:      bin,
    fixture_mode:     fixMode,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`bridge_status            : ${result.bridge_status}`);
    console.log(`bridge_ready             : ${result.bridge_ready}`);
    console.log(`backend_stub             : ${result.backend_stub}`);
    console.log(`evidence_source          : ${result.evidence_source}`);
    console.log(`run_live_contract_status : ${result.run_live_contract_status}`);
    console.log(`deploy_allowed           : ${result.deploy_allowed}`);
    console.log(`promotion_allowed        : ${result.promotion_allowed}`);
  }

  process.exit(result.bridge_ready ? 0 : 1);
}
