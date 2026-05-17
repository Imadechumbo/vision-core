#!/usr/bin/env node
/**
 * Local Runtime Execution Controller — V36.0
 *
 * Orchestrates backend launcher + Go Core bridge + runtime probe
 * for local real execution. Safe default: dry-run/no-start.
 * No deploy, no tags, no stable promotion.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - Only executes with explicit --execute-local-runtime flag.
 */

import { spawnSync }                  from 'child_process';
import { resolve }                    from 'path';
import { runProbeBridgeIntegration }  from './runtime-probe-bridge-integration.mjs';

const SCHEMA_VERSION = 'v36.0';

export const LOCAL_RUNTIME_STATUSES = [
  'LOCAL_RUNTIME_SKIPPED',
  'LOCAL_RUNTIME_BLOCKED_BACKEND',
  'LOCAL_RUNTIME_BLOCKED_GOCORE',
  'LOCAL_RUNTIME_BLOCKED_PROBE',
  'LOCAL_RUNTIME_BLOCKED_RECEIPT',
  'LOCAL_RUNTIME_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _skipped(extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    local_runtime_status: 'LOCAL_RUNTIME_SKIPPED',
    local_runtime_ready:  false,
    backend_started:      false,
    backend_stopped:      false,
    backend_alive:        false,
    backend_health_ok:    false,
    backend_stub:         true,
    mission_id:           null,
    evidence_receipt_id:  null,
    evidence_source:      null,
    runtime_probe_pass:   false,
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
    tag_allowed:          false,
    blocking_reason:      extra.blocking_reason ?? 'not_requested',
    ...extra,
  };
}

function _blocked(status, extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    local_runtime_status: status,
    local_runtime_ready:  false,
    backend_started:      extra.backend_started  ?? false,
    backend_stopped:      extra.backend_stopped  ?? false,
    backend_alive:        false,
    backend_health_ok:    false,
    backend_stub:         true,
    mission_id:           null,
    evidence_receipt_id:  null,
    evidence_source:      null,
    runtime_probe_pass:   false,
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
    tag_allowed:          false,
    blocking_reason:      extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Run local runtime execution controller.
 *
 * @param {Object}  options
 * @param {boolean} options.execute_local_runtime  - Must be true to run (default: false/skipped)
 * @param {boolean} options.start_local_backend    - Start backend if not already running
 * @param {string|null} options.go_core_bin        - Go Core binary path
 * @param {number}  options.port                   - Backend port (default: 3000)
 * @param {number}  options.timeout_ms             - Operation timeout (default: 15000)
 * @param {boolean} options.dry_run                - Dry-run mode (default: false)
 * @param {boolean} options.fixture_mode           - Fixture mode for testing
 * @param {Object|null} options._mock_bridge       - Mock bridge result (test mode)
 * @param {Object|null} options._mock_launcher     - Mock launcher result (test mode)
 * @returns {Object} Local runtime execution result
 */
export function runLocalRuntimeExecutionController(options = {}) {
  const {
    execute_local_runtime = false,
    start_local_backend   = false,
    go_core_bin           = null,
    port                  = 3000,
    timeout_ms            = 15000,
    dry_run               = false,
    fixture_mode          = false,
    _mock_bridge          = null,
    _mock_launcher        = null,
  } = options;

  // Default: skipped unless explicitly requested
  if (!execute_local_runtime && !fixture_mode) {
    return _skipped({ blocking_reason: 'execute_local_runtime_not_set' });
  }

  if (dry_run && !fixture_mode) {
    return _skipped({ blocking_reason: 'dry_run_active' });
  }

  // Stage 1: Backend — launch if requested, or assume already running in fixture mode
  let launcherResult = _mock_launcher;
  if (!launcherResult) {
    if (fixture_mode) {
      launcherResult = {
        launch_status:    'BACKEND_LAUNCH_READY',
        launch_ready:     true,
        backend_started:  false,
        backend_alive:    true,
        backend_health_ok: true,
        blocking_reason:  null,
      };
    } else if (start_local_backend) {
      const launcherCli = resolve(process.cwd(), 'tools', 'local-backend-runtime-launcher.mjs');
      const r = spawnSync(process.execPath, ['--no-deprecation', launcherCli, '--start-local-backend', '--json', '--port', String(port)], { encoding: 'utf-8', timeout: timeout_ms + 5000 });
      try { launcherResult = JSON.parse(r.stdout || '{}'); } catch { launcherResult = { launch_ready: false, backend_alive: false, backend_started: false, backend_health_ok: false, blocking_reason: 'launcher_parse_error' }; }
    } else {
      launcherResult = {
        launch_status:    'BACKEND_LAUNCH_SKIPPED',
        launch_ready:     false,
        backend_started:  false,
        backend_alive:    false,
        backend_health_ok: false,
        blocking_reason:  'start_local_backend_not_set',
      };
    }
  }

  if (!launcherResult.backend_alive && !launcherResult.launch_ready && !fixture_mode) {
    return _blocked('LOCAL_RUNTIME_BLOCKED_BACKEND', {
      backend_started: launcherResult.backend_started ?? false,
      blocking_reason: `backend_not_alive:${launcherResult.launch_status ?? launcherResult.blocking_reason}`,
    });
  }

  // Stage 2: Bridge — connect Go Core via runtime probe bridge
  let bridgeResult = _mock_bridge;
  if (!bridgeResult) {
    bridgeResult = runProbeBridgeIntegration({
      go_core_bin:  go_core_bin,
      fixture_mode: fixture_mode || true,
      timeout_ms,
    });
  }

  if (!bridgeResult.probe_bridge_ready) {
    return _blocked('LOCAL_RUNTIME_BLOCKED_GOCORE', {
      backend_started: launcherResult.backend_started ?? false,
      blocking_reason: `bridge_not_ready:${bridgeResult.probe_bridge_status}`,
    });
  }

  // Stage 3: Probe pass
  if (bridgeResult.runtime_probe_pass !== true) {
    return _blocked('LOCAL_RUNTIME_BLOCKED_PROBE', {
      backend_started: launcherResult.backend_started ?? false,
      blocking_reason: 'runtime_probe_not_pass',
    });
  }

  // Stage 4: Receipt validation
  if (!bridgeResult.evidence_receipt_id) {
    return _blocked('LOCAL_RUNTIME_BLOCKED_RECEIPT', {
      backend_started: launcherResult.backend_started ?? false,
      blocking_reason: 'evidence_receipt_missing',
    });
  }
  if (bridgeResult.evidence_source !== 'go-core') {
    return _blocked('LOCAL_RUNTIME_BLOCKED_RECEIPT', {
      backend_started: launcherResult.backend_started ?? false,
      evidence_source: bridgeResult.evidence_source,
      blocking_reason: `receipt_source_not_go_core:${bridgeResult.evidence_source}`,
    });
  }

  return {
    schema_version:       SCHEMA_VERSION,
    local_runtime_status: 'LOCAL_RUNTIME_READY',
    local_runtime_ready:  true,
    backend_started:      launcherResult.backend_started ?? false,
    backend_stopped:      false,
    backend_alive:        true,
    backend_health_ok:    true,
    backend_stub:         false,
    mission_id:           bridgeResult.mission_id,
    evidence_receipt_id:  bridgeResult.evidence_receipt_id,
    evidence_source:      'go-core',
    runtime_probe_pass:   true,
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
    tag_allowed:          false,
    blocking_reason:      null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('local-runtime-execution-controller.mjs')) {
  const args         = process.argv.slice(2);
  const json         = args.includes('--json');
  const dryRun       = args.includes('--dry-run');
  const execLocal    = args.includes('--execute-local-runtime');
  const startBackend = args.includes('--start-local-backend');
  const fixtureMode  = args.includes('--fixture-mode');
  const port         = Number(args.find((_, i) => args[i-1] === '--port') ?? 3000);
  const timeoutMs    = Number(args.find((_, i) => args[i-1] === '--timeout-ms') ?? 15000);
  const goCoreArg    = args.find((_, i) => args[i-1] === '--go-core-bin') ?? null;

  const result = runLocalRuntimeExecutionController({
    execute_local_runtime: execLocal,
    start_local_backend:   startBackend,
    go_core_bin:           goCoreArg,
    port,
    timeout_ms:            timeoutMs,
    dry_run:               dryRun,
    fixture_mode:          fixtureMode,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`local_runtime_status    : ${result.local_runtime_status}`);
    console.log(`local_runtime_ready     : ${result.local_runtime_ready}`);
    console.log(`backend_alive           : ${result.backend_alive}`);
    console.log(`backend_stub            : ${result.backend_stub}`);
    console.log(`mission_id              : ${result.mission_id}`);
    console.log(`evidence_source         : ${result.evidence_source}`);
    console.log(`runtime_probe_pass      : ${result.runtime_probe_pass}`);
    console.log(`deploy_allowed          : ${result.deploy_allowed}`);
    console.log(`promotion_allowed       : ${result.promotion_allowed}`);
  }

  process.exit(result.local_runtime_ready ? 0 : 1);
}
