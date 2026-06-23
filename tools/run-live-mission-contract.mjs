#!/usr/bin/env node
/**
 * Run-Live Mission Contract — V26.2
 *
 * Formalizes the /api/run-live contract, requiring a real mission_id and
 * blocking fake/stub responses, fake pass_gold claims, and stale identifiers.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 */

const SCHEMA_VERSION = 'v26.2';

export const RUNLIVE_STATUSES = [
  'RUNLIVE_BLOCKED_OFFLINE',
  'RUNLIVE_BLOCKED_HTTP_STATUS',
  'RUNLIVE_BLOCKED_INVALID_JSON',
  'RUNLIVE_BLOCKED_STUB',
  'RUNLIVE_BLOCKED_MISSION_ID',
  'RUNLIVE_BLOCKED_FAKE_PASS_GOLD',
  'RUNLIVE_READY',
];

// Patterns that suggest a fake/generated-only mission_id
const FAKE_MISSION_PATTERNS = [
  /^\d+$/,                           // pure timestamp
  /^mission-\d{10,}$/,               // mission-<unix timestamp>
  /^fake/i,
  /^stub/i,
  /^mock/i,
  /^test-only/i,
  /^placeholder/i,
  /^dry-?run/i,
  /^local-only/i,
];

// Stub markers in JSON response body
const STUB_MARKERS = ['stub', 'mock', 'fake', 'dummy', 'dry-run', 'placeholder', 'test-only'];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:          SCHEMA_VERSION,
    run_live_status:         status,
    mission_id:              null,
    backend_stub:            true,
    pass_gold_claimed:       false,
    promotion_allowed_claimed: false,
    run_live_ready:          false,
    deploy_allowed:          false,
    promotion_allowed:       false,
    stable_allowed:          false,
    ...extra,
  };
}

function _isFakeMissionId(id) {
  if (!id || typeof id !== 'string' || id.trim() === '') return true;
  for (const pat of FAKE_MISSION_PATTERNS) {
    if (pat.test(id)) return true;
  }
  return false;
}

function _isStubBody(body) {
  if (!body || typeof body !== 'object') return true;
  // §131: Check stub markers only in STRING VALUES, not field names.
  // The field name "backend_stub" is a legitimate response field that contained "stub"
  // in its name — checking the full JSON string would incorrectly flag real responses.
  // Known safe boolean fields: backend_stub:false = NOT a stub.
  const { mission_id: _omit, ...rest } = body;
  const stringValues = Object.values(rest).filter(v => typeof v === 'string');
  for (const val of stringValues) {
    const low = val.toLowerCase();
    for (const m of STUB_MARKERS) {
      if (low.includes(m)) return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validates a /api/run-live response.
 *
 * @param {Object}  options
 * @param {number}  options.http_status         - HTTP status code
 * @param {string}  options.body_raw            - Raw response body
 * @param {boolean} options.offline             - Whether backend was unreachable
 * @returns {Object} Run-live contract result
 */
export function validateRunLiveContract(options = {}) {
  const {
    http_status = null,
    body_raw    = '',
    offline     = false,
  } = options;

  // Gate 0: offline
  if (offline || http_status === null) {
    return _blocked('RUNLIVE_BLOCKED_OFFLINE');
  }

  // Gate 1: HTTP 200
  if (http_status !== 200) {
    return _blocked('RUNLIVE_BLOCKED_HTTP_STATUS', {
      run_live_evidence: { http_status },
    });
  }

  // Gate 2: valid JSON
  let parsed = null;
  try {
    parsed = JSON.parse(body_raw);
  } catch {
    return _blocked('RUNLIVE_BLOCKED_INVALID_JSON', {
      run_live_evidence: { body_raw: body_raw.slice(0, 100) },
    });
  }

  // Gate 3: stub detection
  if (_isStubBody(parsed)) {
    return _blocked('RUNLIVE_BLOCKED_STUB', {
      run_live_evidence: { parsed },
    });
  }

  // Gate 4: mission_id required and must not be fake
  const missionId = parsed.mission_id ?? null;
  if (!missionId || _isFakeMissionId(missionId)) {
    return _blocked('RUNLIVE_BLOCKED_MISSION_ID', {
      mission_id:        missionId,
      run_live_evidence: { mission_id: missionId },
    });
  }

  // Gate 5: fake pass_gold/promotion_allowed claim detection
  // §131: A backend backed by real Go Core evidence (backend_stub:false +
  // evidence_receipt.source:'go-core') legitimately returns pass_gold:true AND
  // promotion_allowed:true. Block only when these are claimed WITHOUT real evidence.
  // deploy_allowed is a separate invariant always enforced (never true regardless).
  const passGoldClaimed       = parsed.pass_gold === true || parsed.pass_gold_candidate === true;
  const promotionAllowedClaim = parsed.promotion_allowed === true;
  const deployAllowedClaim    = parsed.deploy_allowed === true;
  const hasRealEvidence       = parsed.backend_stub === false
    && parsed.evidence_receipt?.source === 'go-core';

  if (deployAllowedClaim) {
    // deploy_allowed:true is ALWAYS blocked — absolute invariant
    return _blocked('RUNLIVE_BLOCKED_FAKE_PASS_GOLD', {
      mission_id:              missionId,
      pass_gold_claimed:       passGoldClaimed,
      promotion_allowed_claimed: promotionAllowedClaim,
      run_live_evidence:       { parsed },
    });
  }
  if ((passGoldClaimed || promotionAllowedClaim) && !hasRealEvidence) {
    // pass_gold or promotion_allowed without real go-core evidence → stub/fake claim
    return _blocked('RUNLIVE_BLOCKED_FAKE_PASS_GOLD', {
      mission_id:              missionId,
      pass_gold_claimed:       passGoldClaimed,
      promotion_allowed_claimed: promotionAllowedClaim,
      run_live_evidence:       { parsed },
    });
  }

  return {
    schema_version:            SCHEMA_VERSION,
    run_live_status:           'RUNLIVE_READY',
    mission_id:                missionId,
    backend_stub:              false,
    pass_gold_claimed:         false,
    promotion_allowed_claimed: false,
    run_live_ready:            true,
    run_live_evidence:         { parsed },
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
  };
}

/**
 * POSTs to /api/run-live and validates the response.
 *
 * @param {Object}  options
 * @param {string}  options.base_url    - Base URL (e.g. 'http://127.0.0.1:3000')
 * @param {number}  options.timeout_ms  - Request timeout ms (default: 10000)
 * @param {Object}  options.payload     - POST body payload (default: {})
 * @returns {Object} Run-live contract result
 */
export async function fetchAndValidateRunLive(options = {}) {
  const {
    base_url   = 'http://127.0.0.1:3000',
    timeout_ms = 10000,
    payload    = {},
  } = options;

  try {
    const resp = await fetch(`${base_url}/api/run-live`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(timeout_ms),
    });
    const body_raw = await resp.text();
    return validateRunLiveContract({ http_status: resp.status, body_raw, offline: false });
  } catch {
    return validateRunLiveContract({ offline: true });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('run-live-mission-contract.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const urlIdx    = args.indexOf('--url');
  const baseUrl   = urlIdx >= 0 ? args[urlIdx + 1] : 'http://127.0.0.1:3000';
  const tIdx      = args.indexOf('--timeout-ms');
  const timeoutMs = tIdx >= 0 ? parseInt(args[tIdx + 1], 10) : 10000;

  const result = await fetchAndValidateRunLive({ base_url: baseUrl, timeout_ms: timeoutMs });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`run_live_status    : ${result.run_live_status}`);
    console.log(`mission_id         : ${result.mission_id}`);
    console.log(`backend_stub       : ${result.backend_stub}`);
    console.log(`run_live_ready     : ${result.run_live_ready}`);
    console.log(`deploy_allowed     : ${result.deploy_allowed}`);
    console.log(`promotion_allowed  : ${result.promotion_allowed}`);
  }

  process.exit(result.run_live_ready ? 0 : 1);
}
