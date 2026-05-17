#!/usr/bin/env node
/**
 * Runtime Probe End-to-End Local Path — V26.4
 *
 * Connects launcher + health contract + run-live contract + receipt generator
 * into a single controlled local pipeline. Returns a complete runtime evidence
 * package without deploying or promoting anything.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - runtime_probe_pass=true only when all gates pass with real evidence.
 */

import { launchLocalBackend, stopLocalBackend }  from './local-backend-runtime-launcher.mjs';
import { validateHealthContract, fetchAndValidateHealth } from './backend-health-contract.mjs';
import { validateRunLiveContract, fetchAndValidateRunLive } from './run-live-mission-contract.mjs';
import { generateGoCorEvidenceReceipt }          from './go-core-evidence-receipt-generator.mjs';
import { validateGoCorEvidenceReceipt }          from './go-core-evidence-contract.mjs';

const SCHEMA_VERSION = 'v26.4';

export const E2E_STATUSES = [
  'E2E_SKIPPED_NO_START',
  'E2E_BLOCKED_BACKEND',
  'E2E_BLOCKED_HEALTH',
  'E2E_BLOCKED_RUNLIVE',
  'E2E_BLOCKED_RECEIPT',
  'E2E_RUNTIME_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    e2e_runtime_status:  status,
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
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Runs the full local runtime probe pipeline.
 *
 * @param {Object}  options
 * @param {boolean} options.no_start            - Skip everything (default: true = safe)
 * @param {boolean} options.start_local_backend - Launch local backend (default: false)
 * @param {string}  options.base_url            - Backend base URL (default: http://127.0.0.1:3000)
 * @param {number}  options.port                - Backend port (default: 3000)
 * @param {number}  options.timeout_ms          - Overall timeout ms (default: 20000)
 * @param {string}  options.git_head            - Git head for receipt (default: 'unknown')
 * @param {Object}  options._mock               - Internal mock overrides for testing
 * @returns {Object} E2E runtime result
 */
export async function runRuntimeProbeE2ELocal(options = {}) {
  const {
    no_start             = true,
    start_local_backend  = false,
    base_url             = 'http://127.0.0.1:3000',
    port                 = 3000,
    timeout_ms           = 20000,
    git_head             = 'unknown',
    _mock                = null,
  } = options;

  // Gate 0: safe default — skip unless explicitly requested
  if (no_start || !start_local_backend) {
    return _blocked('E2E_SKIPPED_NO_START');
  }

  let launchResult = null;
  let launched     = false;

  try {
    // Step 1: optionally launch backend
    if (start_local_backend) {
      if (_mock?.launchResult) {
        launchResult = _mock.launchResult;
      } else {
        launchResult = await launchLocalBackend({ start_local_backend: true, port, timeout_ms });
      }
      launched = launchResult?.launcher_status === 'BACKEND_LAUNCH_READY';

      if (!launched && launchResult?.launcher_status !== 'BACKEND_LAUNCH_SKIPPED') {
        return _blocked('E2E_BLOCKED_BACKEND', {
          launcher_status: launchResult?.launcher_status,
          blocking_reason: launchResult?.launcher_status,
        });
      }
    }

    // Step 2: health contract
    let healthResult;
    if (_mock?.healthResult) {
      healthResult = _mock.healthResult;
    } else {
      healthResult = await fetchAndValidateHealth({ base_url, timeout_ms: Math.min(timeout_ms, 5000) });
    }

    if (healthResult.health_contract_status !== 'HEALTH_READY') {
      return _blocked('E2E_BLOCKED_HEALTH', {
        health_contract_status: healthResult.health_contract_status,
        blocking_reason:        healthResult.health_contract_status,
      });
    }

    // Step 3: run-live mission contract
    let runLiveResult;
    if (_mock?.runLiveResult) {
      runLiveResult = _mock.runLiveResult;
    } else {
      runLiveResult = await fetchAndValidateRunLive({ base_url, timeout_ms: Math.min(timeout_ms, 10000) });
    }

    if (!runLiveResult.run_live_ready) {
      return _blocked('E2E_BLOCKED_RUNLIVE', {
        run_live_status:  runLiveResult.run_live_status,
        blocking_reason:  runLiveResult.run_live_status,
      });
    }

    // Step 4: generate Go Core receipt
    const missionId = runLiveResult.mission_id;
    const genResult = generateGoCorEvidenceReceipt({ mission_id: missionId, git_head });

    if (genResult.receipt_generation_status !== 'RECEIPT_GEN_READY') {
      return _blocked('E2E_BLOCKED_RECEIPT', {
        receipt_generation_status: genResult.receipt_generation_status,
        mission_id:                missionId,
        blocking_reason:           genResult.receipt_generation_status,
      });
    }

    // Step 5: validate receipt
    const validation = validateGoCorEvidenceReceipt(genResult.receipt);
    if (!validation.receipt_valid) {
      return _blocked('E2E_BLOCKED_RECEIPT', {
        mission_id:      missionId,
        blocking_reason: validation.blocking_reason ?? 'receipt_invalid',
      });
    }

    // All gates passed → E2E_RUNTIME_READY
    return {
      schema_version:            SCHEMA_VERSION,
      e2e_runtime_status:        'E2E_RUNTIME_READY',
      backend_alive:             true,
      backend_health_ok:         true,
      backend_stub:              false,
      mission_id:                missionId,
      evidence_receipt_id:       genResult.evidence_receipt_id,
      evidence_source:           'go-core',
      runtime_probe_pass:        true,
      receipt_hash:              genResult.receipt_hash,
      health_contract_status:    healthResult.health_contract_status,
      run_live_status:           runLiveResult.run_live_status,
      receipt_generation_status: genResult.receipt_generation_status,
      receipt_valid:             true,
      deploy_allowed:            false,
      promotion_allowed:         false,
      stable_allowed:            false,
    };

  } finally {
    // Cleanup: stop backend if we launched it
    if (launched && launchResult && !_mock?.launchResult) {
      try { stopLocalBackend(launchResult); } catch {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-probe-e2e-local.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const noStart   = args.includes('--no-start');
  const doStart   = args.includes('--start-local-backend');
  const portIdx   = args.indexOf('--port');
  const port      = portIdx >= 0 ? parseInt(args[portIdx + 1], 10) : 3000;
  const urlIdx    = args.indexOf('--url');
  const baseUrl   = urlIdx >= 0 ? args[urlIdx + 1] : `http://127.0.0.1:${port}`;
  const tIdx      = args.indexOf('--timeout-ms');
  const timeoutMs = tIdx >= 0 ? parseInt(args[tIdx + 1], 10) : 20000;
  const gitIdx    = args.indexOf('--git-head');
  const gitHead   = gitIdx >= 0 ? args[gitIdx + 1] : 'unknown';

  const result = await runRuntimeProbeE2ELocal({
    no_start:            noStart || !doStart,
    start_local_backend: doStart,
    base_url:            baseUrl,
    port,
    timeout_ms:          timeoutMs,
    git_head:            gitHead,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`e2e_runtime_status   : ${result.e2e_runtime_status}`);
    console.log(`backend_alive        : ${result.backend_alive}`);
    console.log(`backend_health_ok    : ${result.backend_health_ok}`);
    console.log(`backend_stub         : ${result.backend_stub}`);
    console.log(`mission_id           : ${result.mission_id}`);
    console.log(`evidence_receipt_id  : ${result.evidence_receipt_id}`);
    console.log(`evidence_source      : ${result.evidence_source}`);
    console.log(`runtime_probe_pass   : ${result.runtime_probe_pass}`);
    console.log(`deploy_allowed       : ${result.deploy_allowed}`);
    console.log(`promotion_allowed    : ${result.promotion_allowed}`);
  }

  process.exit(result.runtime_probe_pass ? 0 : 1);
}
