#!/usr/bin/env node
/**
 * Backend Runtime Probe Adapter — V21.2
 *
 * Probe adapter for local/runtime backend. Does NOT start the backend
 * by default (start_backend=false). Does NOT deploy or promote.
 * Captures backend_stub, mission_id, evidence_receipt from backend response.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - No production writes. No deploy. No tag. No stable.
 * - Default: no-start mode (PROBE_SKIPPED_NO_START).
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v21.2';

export const PROBE_STATUSES = [
  'PROBE_SKIPPED_NO_START',
  'PROBE_BLOCKED_OFFLINE',
  'PROBE_BLOCKED_HEALTH',
  'PROBE_BLOCKED_RUN_LIVE',
  'PROBE_BLOCKED_STUB',
  'PROBE_READY',
];

const DEFAULT_TIMEOUT_MS = 8000;

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION (synchronous, for testing / dry-run)
// ═══════════════════════════════════════════════════════════════════

/**
 * Classifies a backend probe result from a pre-collected snapshot.
 * Does NOT perform any HTTP calls. Callers provide the snapshot.
 *
 * @param {Object} snapshot
 * @param {boolean} snapshot.no_start           - Skip probe (no-start mode)
 * @param {boolean} snapshot.backend_reachable  - Was backend reachable?
 * @param {boolean} snapshot.health_ok          - Did health check pass?
 * @param {Object|null} snapshot.run_live_result - Response from /api/run-live (dry-run)
 * @param {boolean} snapshot.timed_out          - Did probe time out?
 * @param {number}  snapshot.timeout_ms         - Configured timeout
 * @returns {Object} Probe classification result
 */
export function classifyProbeSnapshot(snapshot = {}) {
  const {
    no_start          = true,
    backend_reachable = false,
    health_ok         = false,
    run_live_result   = null,
    timed_out         = false,
    timeout_ms        = DEFAULT_TIMEOUT_MS,
  } = snapshot;

  // Gate 1: no-start mode → SKIPPED
  if (no_start) {
    return _result('PROBE_SKIPPED_NO_START', {
      backend_alive:   false,
      backend_stub:    true,
      mission_id:      null,
      evidence_receipt_id: null,
      evidence_source: null,
      timed_out,
      timeout_ms,
      blocking_reason: 'no_start_mode',
    });
  }

  // Gate 2: backend must be reachable
  if (!backend_reachable || timed_out) {
    return _result('PROBE_BLOCKED_OFFLINE', {
      backend_alive:   false,
      backend_stub:    true,
      mission_id:      null,
      evidence_receipt_id: null,
      evidence_source: null,
      timed_out,
      timeout_ms,
      blocking_reason: timed_out ? 'probe_timeout' : 'backend_offline',
    });
  }

  // Gate 3: health check must pass
  if (!health_ok) {
    return _result('PROBE_BLOCKED_HEALTH', {
      backend_alive:   true,
      backend_stub:    true,
      mission_id:      null,
      evidence_receipt_id: null,
      evidence_source: null,
      timed_out,
      timeout_ms,
      blocking_reason: 'health_check_failed',
    });
  }

  // Gate 4: run-live must return a result
  if (!run_live_result || typeof run_live_result !== 'object') {
    return _result('PROBE_BLOCKED_RUN_LIVE', {
      backend_alive:   true,
      backend_stub:    true,
      mission_id:      null,
      evidence_receipt_id: null,
      evidence_source: null,
      timed_out,
      timeout_ms,
      blocking_reason: 'run_live_no_response',
    });
  }

  const mission_id          = run_live_result.mission_id          || null;
  const evidence_receipt_id = run_live_result.evidence_receipt_id || null;
  const evidence_source     = run_live_result.evidence_source     || null;
  const backend_stub        = run_live_result.backend_stub        !== false;

  // Gate 5: backend must not be stub
  if (backend_stub) {
    return _result('PROBE_BLOCKED_STUB', {
      backend_alive:   true,
      backend_stub,
      mission_id,
      evidence_receipt_id,
      evidence_source,
      timed_out,
      timeout_ms,
      blocking_reason: 'backend_stub_mode',
    });
  }

  // All gates passed → READY
  return _result('PROBE_READY', {
    backend_alive:   true,
    backend_stub:    false,
    mission_id,
    evidence_receipt_id,
    evidence_source,
    timed_out,
    timeout_ms,
    blocking_reason: null,
  });
}

/**
 * Async probe against a live local backend.
 * Defaults to no-start mode — pass { start_backend: true } to enable.
 *
 * @param {Object} options
 * @param {string} options.base_url     - e.g. "http://localhost:8080"
 * @param {boolean} options.start_backend - Whether to start backend (default false)
 * @param {number}  options.timeout_ms  - HTTP timeout in ms
 * @returns {Promise<Object>} Probe classification result
 */
export async function runBackendProbe(options = {}) {
  const {
    base_url      = 'http://localhost:8080',
    start_backend = false,
    timeout_ms    = DEFAULT_TIMEOUT_MS,
  } = options;

  // Default: no-start mode
  if (!start_backend) {
    return classifyProbeSnapshot({ no_start: true, timeout_ms });
  }

  // Attempt live probe
  let backend_reachable = false;
  let health_ok         = false;
  let run_live_result   = null;
  let timed_out         = false;

  try {
    const healthRes = await _fetchWithTimeout(`${base_url}/api/health`, timeout_ms);
    backend_reachable = healthRes.ok_network;
    health_ok         = healthRes.status === 200;

    if (health_ok) {
      const runRes = await _fetchWithTimeout(`${base_url}/api/run-live`, timeout_ms, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: true, local_only: true }),
      });
      if (runRes.status === 200 && runRes.body) {
        run_live_result = runRes.body;
      }
    }
  } catch (err) {
    if (err.code === 'PROBE_TIMEOUT') timed_out = true;
    backend_reachable = false;
  }

  return classifyProbeSnapshot({ no_start: false, backend_reachable, health_ok, run_live_result, timed_out, timeout_ms });
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _result(status, fields = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    probe_status:      status,
    probe_ready:       status === 'PROBE_READY',
    probe_skipped:     status === 'PROBE_SKIPPED_NO_START',
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    ...fields,
  };
}

async function _fetchWithTimeout(url, timeoutMs, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);
  try {
    const res  = await fetch(url, { ...init, signal: controller.signal });
    let body   = null;
    try { body = await res.json(); } catch {}
    return { ok_network: true, status: res.status, body };
  } catch (err) {
    if (err.name === 'AbortError') {
      const e    = new Error('probe timeout');
      e.code     = 'PROBE_TIMEOUT';
      throw e;
    }
    return { ok_network: false, status: 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('backend-runtime-probe.mjs')) {
  const args   = process.argv.slice(2);
  const json   = args.includes('--json');

  // Default: no-start (safe)
  const result = classifyProbeSnapshot({ no_start: true });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`probe_status      : ${result.probe_status}`);
    console.log(`probe_ready       : ${result.probe_ready}`);
    console.log(`deploy_allowed    : ${result.deploy_allowed}`);
    console.log(`promotion_allowed : ${result.promotion_allowed}`);
  }

  process.exit(result.probe_ready ? 0 : 1);
}
