#!/usr/bin/env node
/**
 * Local Backend Runtime Launcher — V26.0
 *
 * Starts/stops the local backend safely for runtime evidence collection.
 * Never deploys to production. Never creates tags. Never promotes stable.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - Only starts backend locally with explicit --start-local-backend flag.
 */

import { existsSync }                             from 'fs';
import { resolve, join }                          from 'path';
import { spawnSync, spawn }                       from 'child_process';
import { createConnection }                       from 'net';

const SCHEMA_VERSION = 'v26.0';

export const LAUNCHER_STATUSES = [
  'BACKEND_LAUNCH_SKIPPED',
  'BACKEND_LAUNCH_BLOCKED_NO_SERVER',
  'BACKEND_LAUNCH_BLOCKED_PORT_BUSY',
  'BACKEND_LAUNCH_BLOCKED_HEALTH_TIMEOUT',
  'BACKEND_LAUNCH_READY',
  'BACKEND_LAUNCH_STOPPED',
];

const DEFAULT_PORT       = 3000;
const DEFAULT_TIMEOUT_MS = 15000;
const HEALTH_POLL_MS     = 300;
const SERVER_ENTRY       = 'backend/server.js';

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:     SCHEMA_VERSION,
    launcher_status:    status,
    backend_started:    false,
    backend_stopped:    false,
    backend_pid:        null,
    backend_alive:      false,
    backend_health_ok:  false,
    backend_port:       extra.backend_port ?? null,
    deploy_allowed:     false,
    promotion_allowed:  false,
    stable_allowed:     false,
    ...extra,
  };
}

function _isPortBusy(port) {
  return new Promise(resolve => {
    const sock = createConnection({ port, host: '127.0.0.1' }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
    sock.setTimeout(500);
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
  });
}

async function _waitHealthy(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (resp.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, HEALTH_POLL_MS));
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Launches or skips the local backend.
 *
 * @param {Object}  options
 * @param {string}  options.root               - Project root (default: cwd)
 * @param {boolean} options.start_local_backend - Start backend locally (default: false)
 * @param {number}  options.port               - Port to use (default: 3000)
 * @param {number}  options.timeout_ms         - Health check timeout ms (default: 15000)
 * @param {boolean} options.no_start           - Force skip (default: false)
 * @returns {Object} Launcher result
 */
export async function launchLocalBackend(options = {}) {
  const {
    root                 = process.cwd(),
    start_local_backend  = false,
    port                 = DEFAULT_PORT,
    timeout_ms           = DEFAULT_TIMEOUT_MS,
    no_start             = false,
  } = options;

  // Gate 0: no_start or not start_local_backend → skip
  if (no_start || !start_local_backend) {
    return _blocked('BACKEND_LAUNCH_SKIPPED', { backend_port: port });
  }

  // Gate 1: server.js must exist
  const serverPath = resolve(root, SERVER_ENTRY);
  if (!existsSync(serverPath)) {
    return _blocked('BACKEND_LAUNCH_BLOCKED_NO_SERVER', { backend_port: port });
  }

  // Gate 2: port must not be busy — §131: if port already occupied, check if an existing
  // backend is healthy. D4 may have started a backend that is still running (or OS port
  // release is delayed post-SIGKILL on Windows). If health check passes, treat as
  // BACKEND_LAUNCH_SKIPPED (reuse existing backend) so the E2E probe can proceed.
  const busy = await _isPortBusy(port);
  if (busy) {
    const alreadyHealthy = await _waitHealthy(port, Math.min(timeout_ms, 3000));
    if (alreadyHealthy) {
      return {
        schema_version:     SCHEMA_VERSION,
        launcher_status:    'BACKEND_LAUNCH_SKIPPED',
        backend_started:    false,
        backend_stopped:    false,
        backend_pid:        null,
        backend_alive:      true,
        backend_health_ok:  true,
        backend_port:       port,
        deploy_allowed:     false,
        promotion_allowed:  false,
        stable_allowed:     false,
        note:               '§131: port busy but backend is healthy — reusing existing instance',
      };
    }
    return _blocked('BACKEND_LAUNCH_BLOCKED_PORT_BUSY', { backend_port: port });
  }

  // Start backend
  const nodeExec = process.execPath;
  const child = spawn(nodeExec, ['--no-deprecation', serverPath], {
    cwd:      resolve(root, 'backend'),
    env:      { ...process.env, PORT: String(port), NODE_ENV: 'local' },
    detached: false,
    stdio:    'ignore',
  });

  const pid = child.pid;

  // Gate 3: wait for /api/health
  const healthy = await _waitHealthy(port, timeout_ms);
  if (!healthy) {
    try { child.kill('SIGTERM'); } catch {}
    return _blocked('BACKEND_LAUNCH_BLOCKED_HEALTH_TIMEOUT', {
      backend_pid:  pid,
      backend_port: port,
    });
  }

  return {
    schema_version:     SCHEMA_VERSION,
    launcher_status:    'BACKEND_LAUNCH_READY',
    backend_started:    true,
    backend_stopped:    false,
    backend_pid:        pid,
    backend_alive:      true,
    backend_health_ok:  true,
    backend_port:       port,
    _child:             child,      // internal — callers can stop via stopLocalBackend()
    deploy_allowed:     false,
    promotion_allowed:  false,
    stable_allowed:     false,
  };
}

/**
 * Stops a running local backend started by launchLocalBackend().
 *
 * @param {Object} launchResult - Result from launchLocalBackend()
 * @returns {Object} Stop result
 */
export function stopLocalBackend(launchResult) {
  if (!launchResult || launchResult.launcher_status !== 'BACKEND_LAUNCH_READY') {
    return _blocked('BACKEND_LAUNCH_SKIPPED', {
      backend_port: launchResult?.backend_port ?? null,
    });
  }

  const child = launchResult._child;
  try {
    if (child && !child.killed) child.kill('SIGTERM');
  } catch {}

  return {
    schema_version:     SCHEMA_VERSION,
    launcher_status:    'BACKEND_LAUNCH_STOPPED',
    backend_started:    true,
    backend_stopped:    true,
    backend_pid:        launchResult.backend_pid,
    backend_alive:      false,
    backend_health_ok:  false,
    backend_port:       launchResult.backend_port,
    deploy_allowed:     false,
    promotion_allowed:  false,
    stable_allowed:     false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('local-backend-runtime-launcher.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const noStart = args.includes('--no-start');
  const doStart = args.includes('--start-local-backend');

  const portArg    = args.indexOf('--port');
  const timeoutArg = args.indexOf('--timeout-ms');
  const port       = portArg    >= 0 ? parseInt(args[portArg + 1],    10) : DEFAULT_PORT;
  const timeoutMs  = timeoutArg >= 0 ? parseInt(args[timeoutArg + 1], 10) : DEFAULT_TIMEOUT_MS;

  const result = await launchLocalBackend({
    start_local_backend: doStart,
    port,
    timeout_ms: timeoutMs,
    no_start:   noStart,
  });

  if (json) {
    const { _child, ...safe } = result;
    console.log(JSON.stringify(safe, null, 2));
  } else {
    console.log(`launcher_status   : ${result.launcher_status}`);
    console.log(`backend_started   : ${result.backend_started}`);
    console.log(`backend_alive     : ${result.backend_alive}`);
    console.log(`backend_health_ok : ${result.backend_health_ok}`);
    console.log(`backend_port      : ${result.backend_port}`);
    console.log(`deploy_allowed    : ${result.deploy_allowed}`);
    console.log(`promotion_allowed : ${result.promotion_allowed}`);
  }

  if (result.launcher_status === 'BACKEND_LAUNCH_READY') {
    // Keep process alive briefly so callers can stop it
    // In CLI mode, immediately stop after confirming ready
    const stopped = stopLocalBackend(result);
    if (json) {
      const { _child, ...safe } = stopped;
      console.log(JSON.stringify(safe, null, 2));
    }
  }

  process.exit(result.backend_alive === true || result.launcher_status === 'BACKEND_LAUNCH_SKIPPED' ? 0 : 1);
}
