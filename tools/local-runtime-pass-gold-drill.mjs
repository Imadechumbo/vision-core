#!/usr/bin/env node
/**
 * Local Runtime PASS GOLD Drill — V22.0
 *
 * Executes a controlled local drill of PASS GOLD runtime flow
 * using temp root, fixture evidence, and local-only mocks.
 * Never writes to production. Never deploys. Never tags. Never promotes.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - local_only=true always.
 * - temp_root_only=true always.
 * - No production file writes.
 */

import { mkdirSync, mkdtempSync, rmSync, existsSync } from 'fs';
import { join, resolve }                              from 'path';
import { tmpdir }                                      from 'os';
import { activateRuntimeEvidence }                    from './runtime-evidence-activation.mjs';
import { buildGoCorEvidenceReceipt, validateGoCorEvidenceReceipt } from './go-core-evidence-contract.mjs';
import { classifyProbeSnapshot }                      from './backend-runtime-probe.mjs';
import { evaluatePassGoldRuntimeBinding }             from './pass-gold-runtime-binding.mjs';

const SCHEMA_VERSION = 'v22.0';

export const DRILL_STATUSES = [
  'DRILL_BLOCKED_SETUP',
  'DRILL_BLOCKED_RUNTIME',
  'DRILL_BLOCKED_RECEIPT',
  'DRILL_BLOCKED_BINDING',
  'DRILL_PASS_GOLD_READY_LOCAL',
];

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Runs a local PASS GOLD drill using controlled fixtures.
 *
 * @param {Object} options
 * @param {string|null} options.temp_root_override - Override temp dir (for testing)
 * @param {Object|null} options.runtime_fixture    - Override runtime evidence fixture
 * @param {Object|null} options.receipt_fixture    - Override receipt fixture
 * @param {Object|null} options.authority_fixture  - Override authority binding fixture
 * @param {boolean}     options.tests_verified     - Whether tests are verified
 * @param {boolean}     options.remove_temp_root   - Whether to remove temp root after drill (default true)
 * @returns {Object} Drill result
 */
export function runLocalPassGoldDrill(options = {}) {
  const {
    temp_root_override = null,
    runtime_fixture    = null,
    receipt_fixture    = null,
    authority_fixture  = null,
    tests_verified     = false,
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
        temp_root = mkdtempSync(join(tmpdir(), 'vision-drill-'));
        temp_root_created = true;
      }
    } catch (err) {
      return _blocked('DRILL_BLOCKED_SETUP', {
        temp_root, temp_root_created, temp_root_removed,
        blocking_reason: `setup_failed:${err.message}`,
      });
    }

    // Build runtime fixture
    const runtimeInput = runtime_fixture || {
      backend_alive:       true,
      backend_health_ok:   true,
      backend_stub:        false,
      mission_id:          `msn_drill_${Date.now()}`,
      evidence_receipt_id: `rcpt_drill_${Date.now()}`,
      evidence_source:     'go-core',
      runtime_probe_pass:  true,
    };

    const runtimeResult = activateRuntimeEvidence(runtimeInput);
    if (!runtimeResult.runtime_evidence_ready) {
      return _blocked('DRILL_BLOCKED_RUNTIME', {
        temp_root, temp_root_created, temp_root_removed,
        runtime_evidence_status: runtimeResult.runtime_evidence_status,
        blocking_reason: `runtime_blocked:${runtimeResult.runtime_evidence_status}`,
      });
    }

    // Build receipt fixture
    const receiptBase = receipt_fixture || buildGoCorEvidenceReceipt({
      receipt_id:  runtimeResult.evidence_receipt_id,
      mission_id:  runtimeResult.mission_id,
      source:      'go-core',
      git_head:    'drill_head',
    });
    const receiptResult = validateGoCorEvidenceReceipt(receiptBase);
    if (!receiptResult.receipt_valid) {
      return _blocked('DRILL_BLOCKED_RECEIPT', {
        temp_root, temp_root_created, temp_root_removed,
        receipt_status: receiptResult.receipt_status,
        blocking_reason: `receipt_blocked:${receiptResult.receipt_status}`,
      });
    }

    // Authority fixture (local drill uses minimal valid authority)
    const authorityBinding = authority_fixture || { authority_valid: true, source: 'drill_local' };

    // Binding evaluation
    const bindingResult = evaluatePassGoldRuntimeBinding({
      runtime_evidence:  runtimeResult,
      go_core_receipt:   receiptResult,
      authority_binding: authorityBinding,
      tests_verified,
    });

    if (!bindingResult.pass_gold_runtime_binding_valid) {
      return _blocked('DRILL_BLOCKED_BINDING', {
        temp_root, temp_root_created, temp_root_removed,
        binding_status:  bindingResult.pass_gold_runtime_binding_status,
        blocking_reason: `binding_blocked:${bindingResult.pass_gold_runtime_binding_status}`,
      });
    }

    // All stages passed → cleanup then return DRILL_PASS_GOLD_READY_LOCAL
    if (temp_root && temp_root_created && remove_temp_root) {
      try { rmSync(temp_root, { recursive: true, force: true }); temp_root_removed = true; } catch {}
    }

    return {
      schema_version:                   SCHEMA_VERSION,
      drill_status:                     'DRILL_PASS_GOLD_READY_LOCAL',
      drill_ready:                      true,
      local_only:                       true,
      temp_root,
      temp_root_created,
      temp_root_removed,
      runtime_evidence_status:          runtimeResult.runtime_evidence_status,
      receipt_status:                   receiptResult.receipt_status,
      binding_status:                   bindingResult.pass_gold_runtime_binding_status,
      mission_id:                       runtimeResult.mission_id,
      evidence_receipt_id:              runtimeResult.evidence_receipt_id,
      evidence_source:                  runtimeResult.evidence_source,
      pass_gold_candidate_allowed:      true,
      pass_gold_candidate_local_only:   true,
      blocking_reason:                  null,
      deploy_allowed:                   false,
      promotion_allowed:                false,
      stable_allowed:                   false,
    };
  } catch (err) {
    // Cleanup on unexpected error
    if (temp_root && temp_root_created && remove_temp_root) {
      try { rmSync(temp_root, { recursive: true, force: true }); } catch {}
    }
    return _blocked('DRILL_BLOCKED_SETUP', {
      temp_root, temp_root_created, temp_root_removed: false,
      blocking_reason: `unexpected:${err.message}`,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, fields = {}) {
  // Update temp_root_removed if it was removed in finally
  return {
    schema_version:              SCHEMA_VERSION,
    drill_status:                status,
    drill_ready:                 false,
    local_only:                  true,
    pass_gold_candidate_allowed: false,
    blocking_reason:             fields.blocking_reason || 'blocked',
    deploy_allowed:              false,
    promotion_allowed:           false,
    stable_allowed:              false,
    ...fields,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('local-runtime-pass-gold-drill.mjs')) {
  const args     = process.argv.slice(2);
  const json     = args.includes('--json');
  const noVerify = args.includes('--no-tests-verified');

  const result = runLocalPassGoldDrill({
    tests_verified:  !noVerify,
    remove_temp_root: true,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`drill_status             : ${result.drill_status}`);
    console.log(`drill_ready              : ${result.drill_ready}`);
    console.log(`pass_gold_candidate_allowed: ${result.pass_gold_candidate_allowed}`);
    console.log(`deploy_allowed           : ${result.deploy_allowed}`);
    console.log(`promotion_allowed        : ${result.promotion_allowed}`);
    console.log(`temp_root_removed        : ${result.temp_root_removed}`);
  }

  process.exit(result.drill_ready ? 0 : 1);
}
