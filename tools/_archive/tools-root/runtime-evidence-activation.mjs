#!/usr/bin/env node
/**
 * Runtime Evidence Activation — V21.0
 *
 * Validates runtime evidence without triggering deploy, tag, or stable.
 * Detects backend state, mission_id, evidence_receipt, and evidence_source.
 * Classifies status only — never promotes.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - No deploy, no tag, no stable, no production writes.
 */

const SCHEMA_VERSION = 'v21.0';

export const RUNTIME_EVIDENCE_STATUSES = [
  'RUNTIME_EVIDENCE_BLOCKED_BACKEND_OFFLINE',
  'RUNTIME_EVIDENCE_BLOCKED_BACKEND_STUB',
  'RUNTIME_EVIDENCE_BLOCKED_MISSION_ID',
  'RUNTIME_EVIDENCE_BLOCKED_RECEIPT',
  'RUNTIME_EVIDENCE_BLOCKED_SOURCE',
  'RUNTIME_EVIDENCE_READY',
];

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Activates runtime evidence classification from a runtime snapshot.
 *
 * @param {Object} input
 * @param {boolean} input.backend_alive        - Is backend reachable?
 * @param {boolean} input.backend_health_ok    - Did /api/health return OK?
 * @param {boolean} input.backend_stub         - Is backend in stub mode?
 * @param {string|null} input.mission_id       - Mission ID from backend run
 * @param {string|null} input.evidence_receipt_id - Receipt ID from evidence
 * @param {string|null} input.evidence_source  - Source of evidence (must be "go-core")
 * @param {boolean} input.runtime_probe_pass   - Did runtime probe succeed?
 * @returns {Object} Runtime evidence activation result
 */
export function activateRuntimeEvidence(input = {}) {
  const {
    backend_alive        = false,
    backend_health_ok    = false,
    backend_stub         = true,
    mission_id           = null,
    evidence_receipt_id  = null,
    evidence_source      = null,
    runtime_probe_pass   = false,
  } = input;

  // Gate 1: backend must be alive
  if (!backend_alive || !backend_health_ok) {
    return _blocked('RUNTIME_EVIDENCE_BLOCKED_BACKEND_OFFLINE', {
      backend_alive,
      backend_health_ok,
      backend_stub,
      mission_id,
      evidence_receipt_id,
      evidence_source,
      runtime_probe_pass,
      blocking_reason: 'backend_offline',
    });
  }

  // Gate 2: backend must not be stub
  if (backend_stub) {
    return _blocked('RUNTIME_EVIDENCE_BLOCKED_BACKEND_STUB', {
      backend_alive,
      backend_health_ok,
      backend_stub,
      mission_id,
      evidence_receipt_id,
      evidence_source,
      runtime_probe_pass,
      blocking_reason: 'backend_stub_mode',
    });
  }

  // Gate 3: mission_id must be present and non-empty
  if (!mission_id || typeof mission_id !== 'string' || mission_id.trim() === '') {
    return _blocked('RUNTIME_EVIDENCE_BLOCKED_MISSION_ID', {
      backend_alive,
      backend_health_ok,
      backend_stub,
      mission_id,
      evidence_receipt_id,
      evidence_source,
      runtime_probe_pass,
      blocking_reason: 'mission_id_missing',
    });
  }

  // Gate 4: evidence_receipt_id must be present
  if (!evidence_receipt_id || typeof evidence_receipt_id !== 'string' || evidence_receipt_id.trim() === '') {
    return _blocked('RUNTIME_EVIDENCE_BLOCKED_RECEIPT', {
      backend_alive,
      backend_health_ok,
      backend_stub,
      mission_id,
      evidence_receipt_id,
      evidence_source,
      runtime_probe_pass,
      blocking_reason: 'evidence_receipt_missing',
    });
  }

  // Gate 5: evidence_source must be "go-core"
  if (evidence_source !== 'go-core') {
    return _blocked('RUNTIME_EVIDENCE_BLOCKED_SOURCE', {
      backend_alive,
      backend_health_ok,
      backend_stub,
      mission_id,
      evidence_receipt_id,
      evidence_source,
      runtime_probe_pass,
      blocking_reason: `evidence_source_invalid:${evidence_source}`,
    });
  }

  // All gates passed → READY (still no deploy/promotion)
  return {
    schema_version:           SCHEMA_VERSION,
    runtime_evidence_status:  'RUNTIME_EVIDENCE_READY',
    runtime_evidence_ready:   true,
    backend_alive,
    backend_health_ok,
    backend_stub,
    mission_id,
    evidence_receipt_id,
    evidence_source,
    runtime_probe_pass,
    blocking_reason:          null,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, fields = {}) {
  return {
    schema_version:          SCHEMA_VERSION,
    runtime_evidence_status: status,
    runtime_evidence_ready:  false,
    ...fields,
    deploy_allowed:          false,
    promotion_allowed:       false,
    stable_allowed:          false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-evidence-activation.mjs')) {
  const args  = process.argv.slice(2);
  const json  = args.includes('--json');
  const dryRun = args.includes('--dry-run');

  // Default: all blocked (no runtime present)
  const result = activateRuntimeEvidence({});

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`runtime_evidence_status : ${result.runtime_evidence_status}`);
    console.log(`runtime_evidence_ready  : ${result.runtime_evidence_ready}`);
    console.log(`deploy_allowed          : ${result.deploy_allowed}`);
    console.log(`promotion_allowed       : ${result.promotion_allowed}`);
  }

  process.exit(result.runtime_evidence_ready ? 0 : 1);
}
