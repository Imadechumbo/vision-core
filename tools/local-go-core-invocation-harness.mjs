#!/usr/bin/env node
/**
 * Local Go Core Invocation Harness — V31.1
 *
 * Harness for controlled local invocation of Go Core binary
 * using a temp root, validated mission input, and full output
 * validation via adapter contract.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - local_only=true always.
 * - temp_root_only=true always.
 * - No production file writes.
 * - fixture_mode only for tests — never for real production.
 */

import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join }                                        from 'path';
import { tmpdir }                                      from 'os';
import { evaluateGoCoreAdapterContract }               from './backend-go-core-adapter-contract.mjs';

const SCHEMA_VERSION = 'v31.1';

export const GOCORE_HARNESS_STATUSES = [
  'GOCORE_HARNESS_BLOCKED_SETUP',
  'GOCORE_HARNESS_BLOCKED_BINARY',
  'GOCORE_HARNESS_BLOCKED_TIMEOUT',
  'GOCORE_HARNESS_BLOCKED_OUTPUT',
  'GOCORE_HARNESS_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    harness_status:      status,
    harness_ready:       false,
    go_core_invoked:     extra.go_core_invoked ?? false,
    local_only:          true,
    temp_root_created:   extra.temp_root_created ?? false,
    temp_root_removed:   extra.temp_root_removed ?? false,
    mission_id:          null,
    evidence_receipt_id: null,
    evidence_source:     null,
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
 * Runs Go Core invocation harness locally with temp root isolation.
 *
 * @param {Object}  options
 * @param {string|null} options.go_core_bin        - Path to Go Core binary
 * @param {Object|null} options.mission_input      - Mission input object
 * @param {number}      options.timeout_ms         - Timeout in ms (default: 10000)
 * @param {boolean}     options.fixture_mode       - Use fixture output (test mode only)
 * @param {Object|null} options._fixture_output    - Fixture output to inject (test mode)
 * @param {string|null} options.temp_root_override - Override temp dir path
 * @param {boolean}     options.remove_temp_root   - Remove temp root after run (default: true)
 * @returns {Object} Harness result
 */
export function runGoCoreInvocationHarness(options = {}) {
  const {
    go_core_bin        = null,
    mission_input      = null,
    timeout_ms         = 10000,
    fixture_mode       = false,
    _fixture_output    = null,
    temp_root_override = null,
    remove_temp_root   = true,
  } = options;

  let temp_root        = null;
  let temp_root_created = false;
  let temp_root_removed = false;

  try {
    // Setup: create temp root
    try {
      if (temp_root_override) {
        temp_root = temp_root_override;
        if (!existsSync(temp_root)) {
          mkdirSync(temp_root, { recursive: true });
          temp_root_created = true;
        }
      } else {
        temp_root = mkdtempSync(join(tmpdir(), 'vision-gocore-'));
        temp_root_created = true;
      }
    } catch (err) {
      return _blocked('GOCORE_HARNESS_BLOCKED_SETUP', {
        blocking_reason: `temp_root_setup_failed:${err.message}`,
      });
    }

    // Gate 1: binary required unless fixture mode
    if (!fixture_mode && !_fixture_output) {
      if (!go_core_bin || typeof go_core_bin !== 'string' || go_core_bin.trim() === '') {
        if (remove_temp_root && temp_root_created) {
          try { rmSync(temp_root, { recursive: true, force: true }); temp_root_removed = true; } catch {}
        }
        return _blocked('GOCORE_HARNESS_BLOCKED_BINARY', {
          temp_root, temp_root_created, temp_root_removed,
          blocking_reason: 'go_core_binary_required',
        });
      }
      if (!existsSync(go_core_bin)) {
        if (remove_temp_root && temp_root_created) {
          try { rmSync(temp_root, { recursive: true, force: true }); temp_root_removed = true; } catch {}
        }
        return _blocked('GOCORE_HARNESS_BLOCKED_BINARY', {
          temp_root, temp_root_created, temp_root_removed,
          blocking_reason: `go_core_binary_not_found:${go_core_bin}`,
        });
      }
    }

    // Build default mission input if not provided
    const missionInput = mission_input || {
      mission_id: `msn_harness_${Date.now()}`,
      temp_root,
    };

    // Execute via adapter contract
    const adapterResult = evaluateGoCoreAdapterContract({
      go_core_bin:    (!fixture_mode && !_fixture_output) ? go_core_bin : null,
      mission_input:  missionInput,
      timeout_ms,
      _fixture_output: _fixture_output ?? (fixture_mode ? {
        mission_id:          missionInput.mission_id,
        evidence_receipt_id: `rcpt_harness_${Date.now()}`,
        evidence_source:     'go-core',
      } : null),
    });

    // Map adapter blocked statuses to harness statuses
    if (!adapterResult.adapter_ready) {
      const harnessStatus =
        adapterResult.adapter_status === 'ADAPTER_BLOCKED_NO_BINARY'         ? 'GOCORE_HARNESS_BLOCKED_BINARY'  :
        adapterResult.adapter_status === 'ADAPTER_BLOCKED_EXECUTION_FAILED'  ? 'GOCORE_HARNESS_BLOCKED_TIMEOUT' :
        'GOCORE_HARNESS_BLOCKED_OUTPUT';

      if (remove_temp_root && temp_root_created) {
        try { rmSync(temp_root, { recursive: true, force: true }); temp_root_removed = true; } catch {}
      }
      return _blocked(harnessStatus, {
        temp_root, temp_root_created, temp_root_removed,
        go_core_invoked: adapterResult.go_core_invoked,
        blocking_reason: adapterResult.blocking_reason ?? adapterResult.adapter_status,
        adapter_status:  adapterResult.adapter_status,
      });
    }

    // Success: cleanup then return
    if (remove_temp_root && temp_root_created) {
      try { rmSync(temp_root, { recursive: true, force: true }); temp_root_removed = true; } catch {}
    }

    return {
      schema_version:      SCHEMA_VERSION,
      harness_status:      'GOCORE_HARNESS_READY',
      harness_ready:       true,
      go_core_invoked:     adapterResult.go_core_invoked,
      local_only:          true,
      temp_root,
      temp_root_created,
      temp_root_removed,
      mission_id:          adapterResult.mission_id,
      evidence_receipt_id: adapterResult.evidence_receipt_id,
      evidence_source:     'go-core',
      receipt_valid:       true,
      adapter_status:      adapterResult.adapter_status,
      blocking_reason:     null,
      deploy_allowed:      false,
      promotion_allowed:   false,
      stable_allowed:      false,
    };

  } catch (err) {
    if (remove_temp_root && temp_root && temp_root_created) {
      try { rmSync(temp_root, { recursive: true, force: true }); } catch {}
    }
    return _blocked('GOCORE_HARNESS_BLOCKED_SETUP', {
      temp_root, temp_root_created, temp_root_removed: false,
      blocking_reason: `unexpected:${err.message}`,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('local-go-core-invocation-harness.mjs')) {
  const args        = process.argv.slice(2);
  const json        = args.includes('--json');
  const fixMode     = args.includes('--fixture-mode');
  const binIdx      = args.indexOf('--go-core-bin');
  const inputIdx    = args.indexOf('--mission-input');
  const timeoutIdx  = args.indexOf('--timeout-ms');
  const bin         = binIdx     >= 0 ? args[binIdx + 1]     : null;
  const inputStr    = inputIdx   >= 0 ? args[inputIdx + 1]   : null;
  const timeoutStr  = timeoutIdx >= 0 ? args[timeoutIdx + 1] : null;

  let missionInput = null;
  if (inputStr) { try { missionInput = JSON.parse(inputStr); } catch {} }
  const timeoutMs = timeoutStr ? parseInt(timeoutStr, 10) : 10000;

  const result = runGoCoreInvocationHarness({
    go_core_bin:   bin,
    mission_input: missionInput,
    timeout_ms:    timeoutMs,
    fixture_mode:  fixMode,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`harness_status       : ${result.harness_status}`);
    console.log(`harness_ready        : ${result.harness_ready}`);
    console.log(`go_core_invoked      : ${result.go_core_invoked}`);
    console.log(`evidence_source      : ${result.evidence_source}`);
    console.log(`temp_root_removed    : ${result.temp_root_removed}`);
    console.log(`deploy_allowed       : ${result.deploy_allowed}`);
    console.log(`promotion_allowed    : ${result.promotion_allowed}`);
  }

  process.exit(result.harness_ready ? 0 : 1);
}
