#!/usr/bin/env node
/**
 * Backend Go Core Adapter Contract — V31.0
 *
 * Contract for the backend to call Go Core as the authority for
 * execution and evidence receipt generation. Never accepts backend
 * as the final evidence source — Go Core is authority.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - evidence_source must be 'go-core' — never 'backend'.
 * - backend_claim_rejected=true if backend tries to self-certify.
 */

import { spawnSync } from 'child_process';
import { existsSync } from 'fs';

const SCHEMA_VERSION = 'v31.0';

export const ADAPTER_STATUSES = [
  'ADAPTER_BLOCKED_NO_BINARY',
  'ADAPTER_BLOCKED_INVALID_INPUT',
  'ADAPTER_BLOCKED_EXECUTION_FAILED',
  'ADAPTER_BLOCKED_INVALID_JSON',
  'ADAPTER_BLOCKED_MISSION_ID',
  'ADAPTER_BLOCKED_RECEIPT',
  'ADAPTER_BLOCKED_SOURCE',
  'ADAPTER_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:        SCHEMA_VERSION,
    adapter_status:        status,
    adapter_ready:         false,
    go_core_invoked:       extra.go_core_invoked ?? false,
    mission_id:            null,
    evidence_receipt_id:   null,
    evidence_source:       null,
    receipt_valid:         false,
    backend_claim_rejected: extra.backend_claim_rejected ?? false,
    deploy_allowed:        false,
    promotion_allowed:     false,
    stable_allowed:        false,
    blocking_reason:       extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validates and executes Go Core adapter contract.
 *
 * @param {Object}  options
 * @param {string|null} options.go_core_bin     - Path to Go Core binary (required unless fixture)
 * @param {Object|null} options.mission_input   - Mission input object { mission_id, ... }
 * @param {number}      options.timeout_ms      - Execution timeout in ms (default: 10000)
 * @param {Object|null} options._fixture_output - Inject fixture output (test mode only)
 * @returns {Object} Adapter contract result
 */
export function evaluateGoCoreAdapterContract(options = {}) {
  const {
    go_core_bin      = null,
    mission_input    = null,
    timeout_ms       = 10000,
    _fixture_output  = null,
  } = options;

  // Gate 1: binary path required unless fixture mode
  if (!_fixture_output && (!go_core_bin || typeof go_core_bin !== 'string' || go_core_bin.trim() === '')) {
    return _blocked('ADAPTER_BLOCKED_NO_BINARY', {
      blocking_reason: 'go_core_binary_path_required',
    });
  }

  // Gate 2: binary must exist on disk (unless fixture mode)
  if (!_fixture_output && !existsSync(go_core_bin)) {
    return _blocked('ADAPTER_BLOCKED_NO_BINARY', {
      blocking_reason: `go_core_binary_not_found:${go_core_bin}`,
    });
  }

  // Gate 3: mission input must be valid
  if (!mission_input || typeof mission_input !== 'object') {
    return _blocked('ADAPTER_BLOCKED_INVALID_INPUT', {
      blocking_reason: 'mission_input_required',
    });
  }
  if (!mission_input.mission_id || typeof mission_input.mission_id !== 'string') {
    return _blocked('ADAPTER_BLOCKED_INVALID_INPUT', {
      blocking_reason: 'mission_input_missing_mission_id',
    });
  }

  // Execute Go Core (or use fixture)
  let rawOutput;
  let go_core_invoked = false;

  if (_fixture_output) {
    rawOutput = typeof _fixture_output === 'string'
      ? _fixture_output
      : JSON.stringify(_fixture_output);
    go_core_invoked = false;
  } else {
    const inputJson = JSON.stringify(mission_input);
    const result = spawnSync(go_core_bin, ['--input', inputJson], {
      encoding: 'utf-8',
      timeout:  timeout_ms,
    });
    go_core_invoked = true;

    if (result.status !== 0 || result.error) {
      return _blocked('ADAPTER_BLOCKED_EXECUTION_FAILED', {
        go_core_invoked,
        blocking_reason: `go_core_execution_failed:${result.error?.message ?? `exit_${result.status}`}`,
      });
    }
    rawOutput = result.stdout || '';
  }

  // Gate 4: output must be valid JSON
  let parsed;
  try {
    parsed = JSON.parse(rawOutput);
  } catch {
    return _blocked('ADAPTER_BLOCKED_INVALID_JSON', {
      go_core_invoked,
      blocking_reason: 'go_core_output_not_valid_json',
    });
  }

  // Gate 5: mission_id must be present
  if (!parsed.mission_id || typeof parsed.mission_id !== 'string') {
    return _blocked('ADAPTER_BLOCKED_MISSION_ID', {
      go_core_invoked,
      blocking_reason: 'go_core_output_missing_mission_id',
    });
  }

  // Gate 6: evidence_receipt must be present
  const receiptId = parsed.evidence_receipt_id ?? parsed.receipt_id ?? null;
  if (!receiptId) {
    return _blocked('ADAPTER_BLOCKED_RECEIPT', {
      go_core_invoked,
      mission_id:      parsed.mission_id,
      blocking_reason: 'go_core_output_missing_evidence_receipt',
    });
  }

  // Gate 7: source must be go-core — reject backend self-certification
  const source = parsed.evidence_source ?? parsed.source ?? null;
  if (source !== 'go-core') {
    return _blocked('ADAPTER_BLOCKED_SOURCE', {
      go_core_invoked,
      mission_id:            parsed.mission_id,
      evidence_receipt_id:   receiptId,
      evidence_source:       source,
      backend_claim_rejected: source === 'backend' || source === 'stub' || source === null,
      blocking_reason:       `source_not_go_core:${source}`,
    });
  }

  return {
    schema_version:        SCHEMA_VERSION,
    adapter_status:        'ADAPTER_READY',
    adapter_ready:         true,
    go_core_invoked,
    mission_id:            parsed.mission_id,
    evidence_receipt_id:   receiptId,
    evidence_source:       'go-core',
    receipt_valid:         true,
    backend_claim_rejected: false,
    raw_output:            parsed,
    deploy_allowed:        false,
    promotion_allowed:     false,
    stable_allowed:        false,
    blocking_reason:       null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('backend-go-core-adapter-contract.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const binIdx = args.indexOf('--go-core-bin');
  const inputIdx = args.indexOf('--mission-input');
  const bin   = binIdx   >= 0 ? args[binIdx + 1]   : null;
  const input = inputIdx >= 0 ? args[inputIdx + 1] : null;

  let missionInput = null;
  if (input) {
    try { missionInput = JSON.parse(input); } catch { missionInput = null; }
  }

  const result = evaluateGoCoreAdapterContract({
    go_core_bin:   bin,
    mission_input: missionInput,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`adapter_status         : ${result.adapter_status}`);
    console.log(`adapter_ready          : ${result.adapter_ready}`);
    console.log(`go_core_invoked        : ${result.go_core_invoked}`);
    console.log(`evidence_source        : ${result.evidence_source}`);
    console.log(`backend_claim_rejected : ${result.backend_claim_rejected}`);
    console.log(`deploy_allowed         : ${result.deploy_allowed}`);
    console.log(`promotion_allowed      : ${result.promotion_allowed}`);
  }

  process.exit(result.adapter_ready ? 0 : 1);
}
