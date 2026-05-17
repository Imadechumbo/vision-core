#!/usr/bin/env node
/**
 * Backend Health Contract — V26.1
 *
 * Hardens /api/health response validation to distinguish real backend,
 * stub, offline, and invalid states.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 */

const SCHEMA_VERSION = 'v26.1';

export const HEALTH_STATUSES = [
  'HEALTH_BLOCKED_OFFLINE',
  'HEALTH_BLOCKED_HTTP_STATUS',
  'HEALTH_BLOCKED_HTML',
  'HEALTH_BLOCKED_INVALID_JSON',
  'HEALTH_BLOCKED_STUB',
  'HEALTH_READY',
];

// Markers that indicate a stub/fake backend
const STUB_MARKERS = [
  'stub',
  'mock',
  'fake',
  'dummy',
  'test-only',
  'dry-run',
  'placeholder',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    health_contract_status: status,
    backend_alive:       false,
    backend_health_ok:   false,
    backend_stub:        true,
    backend_not_stub:    false,
    health_evidence:     extra.health_evidence ?? null,
    deploy_allowed:      false,
    promotion_allowed:   false,
    stable_allowed:      false,
    ...extra,
  };
}

function _detectStub(body) {
  if (!body || typeof body !== 'object') return true;
  const text = JSON.stringify(body).toLowerCase();
  for (const marker of STUB_MARKERS) {
    if (text.includes(marker)) return true;
  }
  // If status field exists and is not 'ok' or 'healthy', treat as suspect
  if ('status' in body && body.status !== 'ok' && body.status !== 'healthy' && body.status !== 'running') {
    return true;
  }
  return false;
}

function _detectNotStub(body) {
  if (!body || typeof body !== 'object') return false;
  // Real backend signals: service name, version, runtime metadata, uptime
  const hasService  = typeof body.service  === 'string' && body.service.length > 0;
  const hasVersion  = typeof body.version  === 'string' && body.version.length > 0;
  const hasRuntime  = typeof body.runtime  === 'string' && body.runtime.length > 0;
  const hasUptime   = typeof body.uptime   === 'number';
  const hasTimestamp = typeof body.timestamp === 'string' || typeof body.timestamp === 'number';
  const hasOkStatus = body.status === 'ok' || body.status === 'healthy' || body.status === 'running';

  // Must have at least 2 real signals + ok status to claim not-stub
  const signals = [hasService, hasVersion, hasRuntime, hasUptime, hasTimestamp].filter(Boolean).length;
  return hasOkStatus && signals >= 2;
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validates a /api/health response object.
 *
 * @param {Object} options
 * @param {number} options.http_status  - HTTP status code from health endpoint
 * @param {string} options.content_type - Content-Type header value
 * @param {string} options.body_raw     - Raw response body string
 * @param {boolean} options.offline     - Whether backend was unreachable
 * @returns {Object} Health contract result
 */
export function validateHealthContract(options = {}) {
  const {
    http_status  = null,
    content_type = '',
    body_raw     = '',
    offline      = false,
  } = options;

  // Gate 0: offline
  if (offline || http_status === null) {
    return _blocked('HEALTH_BLOCKED_OFFLINE', {
      health_evidence: { offline: true },
    });
  }

  // Gate 1: HTTP status must be 200
  if (http_status !== 200) {
    return _blocked('HEALTH_BLOCKED_HTTP_STATUS', {
      health_evidence: { http_status },
    });
  }

  // Gate 2: not HTML
  const isHtml = (content_type && content_type.includes('text/html')) ||
    (body_raw && body_raw.trimStart().startsWith('<'));
  if (isHtml) {
    return _blocked('HEALTH_BLOCKED_HTML', {
      health_evidence: { content_type, body_raw: body_raw.slice(0, 100) },
    });
  }

  // Gate 3: valid JSON
  let parsed = null;
  try {
    parsed = JSON.parse(body_raw);
  } catch {
    return _blocked('HEALTH_BLOCKED_INVALID_JSON', {
      health_evidence: { body_raw: body_raw.slice(0, 100) },
    });
  }

  // Gate 4: stub detection
  const isStub    = _detectStub(parsed);
  const notStub   = _detectNotStub(parsed);

  if (isStub) {
    return _blocked('HEALTH_BLOCKED_STUB', {
      backend_stub:  true,
      backend_not_stub: false,
      health_evidence: { parsed },
    });
  }

  return {
    schema_version:         SCHEMA_VERSION,
    health_contract_status: 'HEALTH_READY',
    backend_alive:          true,
    backend_health_ok:      true,
    backend_stub:           false,
    backend_not_stub:       notStub,
    health_evidence:        { parsed },
    deploy_allowed:         false,
    promotion_allowed:      false,
    stable_allowed:         false,
  };
}

/**
 * Fetches /api/health from a live backend and validates the contract.
 *
 * @param {Object}  options
 * @param {string}  options.base_url  - Base URL (e.g. 'http://127.0.0.1:3000')
 * @param {number}  options.timeout_ms - Request timeout (default: 5000)
 * @returns {Object} Health contract result
 */
export async function fetchAndValidateHealth(options = {}) {
  const { base_url = 'http://127.0.0.1:3000', timeout_ms = 5000 } = options;
  try {
    const resp = await fetch(`${base_url}/api/health`, {
      signal: AbortSignal.timeout(timeout_ms),
    });
    const body_raw     = await resp.text();
    const content_type = resp.headers.get('content-type') || '';
    return validateHealthContract({
      http_status:  resp.status,
      content_type,
      body_raw,
      offline:      false,
    });
  } catch {
    return validateHealthContract({ offline: true });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('backend-health-contract.mjs')) {
  const args     = process.argv.slice(2);
  const json     = args.includes('--json');
  const urlIdx   = args.indexOf('--url');
  const baseUrl  = urlIdx >= 0 ? args[urlIdx + 1] : 'http://127.0.0.1:3000';
  const tIdx     = args.indexOf('--timeout-ms');
  const timeoutMs = tIdx >= 0 ? parseInt(args[tIdx + 1], 10) : 5000;

  const result = await fetchAndValidateHealth({ base_url: baseUrl, timeout_ms: timeoutMs });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`health_contract_status : ${result.health_contract_status}`);
    console.log(`backend_alive          : ${result.backend_alive}`);
    console.log(`backend_health_ok      : ${result.backend_health_ok}`);
    console.log(`backend_stub           : ${result.backend_stub}`);
    console.log(`backend_not_stub       : ${result.backend_not_stub}`);
    console.log(`deploy_allowed         : ${result.deploy_allowed}`);
    console.log(`promotion_allowed      : ${result.promotion_allowed}`);
  }

  process.exit(result.health_contract_status === 'HEALTH_READY' ? 0 : 1);
}
