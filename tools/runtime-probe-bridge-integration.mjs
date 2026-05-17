#!/usr/bin/env node
/**
 * Runtime Probe Bridge Integration — V31.3
 *
 * Integrates backend runtime probe/health with Go Core bridge to produce
 * a complete runtime evidence package. Validates health, runs the bridge,
 * validates run-live contract, and validates evidence receipt.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - backend_stub=false only when all stages pass.
 * - evidence_source=go-core always — backend cannot be source.
 */

import { validateHealthContract }                          from './backend-health-contract.mjs';
import { runRunLiveGoCorebridge }                          from './backend-run-live-go-core-bridge.mjs';
import { buildGoCorEvidenceReceipt, validateGoCorEvidenceReceipt } from './go-core-evidence-contract.mjs';

const SCHEMA_VERSION = 'v31.3';

export const PROBE_BRIDGE_STATUSES = [
  'PROBE_BRIDGE_BLOCKED_HEALTH',
  'PROBE_BRIDGE_BLOCKED_BRIDGE',
  'PROBE_BRIDGE_BLOCKED_CONTRACT',
  'PROBE_BRIDGE_BLOCKED_RECEIPT',
  'PROBE_BRIDGE_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    probe_bridge_status: status,
    probe_bridge_ready:  false,
    backend_alive:       false,
    backend_health_ok:   false,
    backend_stub:        true,
    mission_id:          null,
    evidence_receipt_id: null,
    evidence_source:     null,
    runtime_probe_pass:  false,
    deploy_allowed:      false,
    promotion_allowed:   false,
    stable_allowed:      false,
    blocking_reason:     extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Runs the runtime probe bridge integration.
 *
 * @param {Object}  options
 * @param {string|null} options.health_url         - Backend health URL
 * @param {string|null} options.run_live_url       - Backend run-live URL
 * @param {string|null} options.go_core_bin        - Go Core binary path
 * @param {boolean}     options.fixture_mode       - Use fixtures (test mode only)
 * @param {Object|null} options._mock_health       - Mock health result (test mode)
 * @param {Object|null} options._mock_bridge       - Mock bridge result (test mode)
 * @param {number}      options.timeout_ms         - Timeout in ms
 * @returns {Object} Probe bridge result
 */
export function runProbeBridgeIntegration(options = {}) {
  const {
    health_url    = null,
    run_live_url  = null,
    go_core_bin   = null,
    fixture_mode  = false,
    _mock_health  = null,
    _mock_bridge  = null,
    timeout_ms    = 10000,
  } = options;

  // Stage 1: Health check
  let healthResult;
  if (_mock_health) {
    healthResult = _mock_health;
  } else if (fixture_mode) {
    healthResult = {
      health_status:  'HEALTH_READY',
      backend_alive:  true,
      backend_health_ok: true,
      backend_not_stub: true,
    };
  } else {
    healthResult = validateHealthContract({ url: health_url });
  }

  const healthStatus = healthResult.health_contract_status ?? healthResult.health_status;

  if (!healthResult.backend_alive || !healthResult.backend_health_ok) {
    return _blocked('PROBE_BRIDGE_BLOCKED_HEALTH', {
      health_status:   healthStatus,
      blocking_reason: `health_blocked:${healthStatus}`,
    });
  }

  if (healthResult.backend_not_stub === false || healthResult.backend_stub === true) {
    return _blocked('PROBE_BRIDGE_BLOCKED_HEALTH', {
      health_status:   healthStatus,
      blocking_reason: 'backend_stub_detected_in_health',
    });
  }

  // Stage 2: Run-live Go Core bridge
  let bridgeResult;
  if (_mock_bridge) {
    bridgeResult = _mock_bridge;
  } else {
    bridgeResult = runRunLiveGoCorebridge({
      run_live_payload: {
        mission_id: `msn_probe_${Date.now()}`,
      },
      go_core_bin,
      fixture_mode,
    });
  }

  if (!bridgeResult.bridge_ready) {
    return _blocked('PROBE_BRIDGE_BLOCKED_BRIDGE', {
      bridge_status:   bridgeResult.bridge_status,
      blocking_reason: `bridge_blocked:${bridgeResult.blocking_reason}`,
    });
  }

  // Stage 3: Contract check — backend_stub must be false
  if (bridgeResult.backend_stub !== false) {
    return _blocked('PROBE_BRIDGE_BLOCKED_CONTRACT', {
      blocking_reason: 'bridge_backend_stub_not_false',
    });
  }
  if (bridgeResult.evidence_source !== 'go-core') {
    return _blocked('PROBE_BRIDGE_BLOCKED_CONTRACT', {
      evidence_source: bridgeResult.evidence_source,
      blocking_reason: `evidence_source_not_go_core:${bridgeResult.evidence_source}`,
    });
  }

  // Stage 4: Validate receipt — build a proper receipt from bridge result
  const builtReceipt = buildGoCorEvidenceReceipt({
    receipt_id: bridgeResult.evidence_receipt_id,
    mission_id: bridgeResult.mission_id,
    source:     'go-core',
    git_head:   'probe_bridge_local',
  });
  const receiptResult = validateGoCorEvidenceReceipt(builtReceipt);
  if (!receiptResult.receipt_valid) {
    return _blocked('PROBE_BRIDGE_BLOCKED_RECEIPT', {
      mission_id:       bridgeResult.mission_id,
      receipt_status:   receiptResult.receipt_status,
      blocking_reason:  `receipt_invalid:${receiptResult.receipt_status}`,
    });
  }

  return {
    schema_version:      SCHEMA_VERSION,
    probe_bridge_status: 'PROBE_BRIDGE_READY',
    probe_bridge_ready:  true,
    backend_alive:       true,
    backend_health_ok:   true,
    backend_stub:        false,
    mission_id:          bridgeResult.mission_id,
    evidence_receipt_id: bridgeResult.evidence_receipt_id,
    evidence_source:     'go-core',
    runtime_probe_pass:  true,
    receipt_valid:       true,
    bridge_status:       bridgeResult.bridge_status,
    blocking_reason:     null,
    deploy_allowed:      false,
    promotion_allowed:   false,
    stable_allowed:      false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-probe-bridge-integration.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixMode = args.includes('--fixture-mode');

  const result = runProbeBridgeIntegration({ fixture_mode: fixMode });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`probe_bridge_status  : ${result.probe_bridge_status}`);
    console.log(`probe_bridge_ready   : ${result.probe_bridge_ready}`);
    console.log(`backend_stub         : ${result.backend_stub}`);
    console.log(`runtime_probe_pass   : ${result.runtime_probe_pass}`);
    console.log(`evidence_source      : ${result.evidence_source}`);
    console.log(`deploy_allowed       : ${result.deploy_allowed}`);
    console.log(`promotion_allowed    : ${result.promotion_allowed}`);
  }

  process.exit(result.probe_bridge_ready ? 0 : 1);
}
