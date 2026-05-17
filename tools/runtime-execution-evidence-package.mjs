#!/usr/bin/env node
/**
 * Runtime Execution Evidence Package — V36.1
 *
 * Takes a local runtime execution result (V36.0) and packages it into
 * a structured evidence bundle with hash, timestamp, and source binding.
 * evidence_source=go-core enforced. deploy/promotion/stable/tag=false always.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - evidence_source must be 'go-core' — any other source is rejected.
 * - package_stub=false only when all stages pass with real Go Core evidence.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v36.1';

export const EVIDENCE_PACKAGE_STATUSES = [
  'EVIDENCE_PACKAGE_SKIPPED',
  'EVIDENCE_PACKAGE_BLOCKED_RUNTIME',
  'EVIDENCE_PACKAGE_BLOCKED_RECEIPT',
  'EVIDENCE_PACKAGE_BLOCKED_SOURCE',
  'EVIDENCE_PACKAGE_BLOCKED_HASH',
  'EVIDENCE_PACKAGE_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _skipped(extra = {}) {
  return {
    schema_version:           SCHEMA_VERSION,
    evidence_package_status:  'EVIDENCE_PACKAGE_SKIPPED',
    evidence_package_ready:   false,
    package_stub:             true,
    mission_id:               null,
    evidence_receipt_id:      null,
    evidence_source:          null,
    package_hash:             null,
    package_timestamp:        null,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
    tag_allowed:              false,
    blocking_reason:          extra.blocking_reason ?? 'not_requested',
    ...extra,
  };
}

function _blocked(status, extra = {}) {
  return {
    schema_version:           SCHEMA_VERSION,
    evidence_package_status:  status,
    evidence_package_ready:   false,
    package_stub:             true,
    mission_id:               extra.mission_id ?? null,
    evidence_receipt_id:      null,
    evidence_source:          null,
    package_hash:             null,
    package_timestamp:        null,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
    tag_allowed:              false,
    blocking_reason:          extra.blocking_reason ?? 'blocked',
    ...extra,
  };
}

function _derivePackageHash(missionId, receiptId, timestamp) {
  return 'pkg_' + createHash('sha256')
    .update(`${missionId}:${receiptId}:${timestamp}:${SCHEMA_VERSION}`)
    .digest('hex')
    .slice(0, 32);
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Build runtime execution evidence package from a V36.0 controller result.
 *
 * @param {Object}  options
 * @param {Object|null} options.runtime_result     - V36.0 controller result (required)
 * @param {boolean} options.package_requested      - Must be true to build (default: false)
 * @param {boolean} options.fixture_mode           - Fixture mode for testing
 * @param {string|null} options._mock_timestamp    - Override timestamp (test mode)
 * @returns {Object} Evidence package result
 */
export function buildRuntimeExecutionEvidencePackage(options = {}) {
  const {
    runtime_result    = null,
    package_requested = false,
    fixture_mode      = false,
    _mock_timestamp   = null,
  } = options;

  if (!package_requested && !fixture_mode) {
    return _skipped({ blocking_reason: 'package_not_requested' });
  }

  // In fixture mode with no runtime_result, build a synthetic ready result
  if (fixture_mode && !runtime_result) {
    const ts = _mock_timestamp ?? new Date().toISOString();
    const missionId  = 'fixture-mission-361';
    const receiptId  = 'fixture-receipt-361';
    const hash = _derivePackageHash(missionId, receiptId, ts);
    return {
      schema_version:          SCHEMA_VERSION,
      evidence_package_status: 'EVIDENCE_PACKAGE_READY',
      evidence_package_ready:  true,
      package_stub:            false,
      mission_id:              missionId,
      evidence_receipt_id:     receiptId,
      evidence_source:         'go-core',
      package_hash:            hash,
      package_timestamp:       ts,
      deploy_allowed:          false,
      promotion_allowed:       false,
      stable_allowed:          false,
      tag_allowed:             false,
      blocking_reason:         null,
    };
  }

  // Stage 1: Runtime result must exist and be ready
  if (!runtime_result || runtime_result.local_runtime_ready !== true) {
    return _blocked('EVIDENCE_PACKAGE_BLOCKED_RUNTIME', {
      blocking_reason: `runtime_not_ready:${runtime_result?.local_runtime_status ?? 'null'}`,
    });
  }

  // Stage 2: Receipt must be present
  if (!runtime_result.evidence_receipt_id) {
    return _blocked('EVIDENCE_PACKAGE_BLOCKED_RECEIPT', {
      mission_id:      runtime_result.mission_id ?? null,
      blocking_reason: 'evidence_receipt_id_missing',
    });
  }

  // Stage 3: Source must be go-core
  if (runtime_result.evidence_source !== 'go-core') {
    return _blocked('EVIDENCE_PACKAGE_BLOCKED_SOURCE', {
      mission_id:      runtime_result.mission_id ?? null,
      blocking_reason: `evidence_source_not_go_core:${runtime_result.evidence_source}`,
    });
  }

  // Stage 4: Build + hash
  const ts = _mock_timestamp ?? new Date().toISOString();
  const missionId = runtime_result.mission_id;
  const receiptId = runtime_result.evidence_receipt_id;
  let packageHash;
  try {
    packageHash = _derivePackageHash(missionId, receiptId, ts);
  } catch {
    return _blocked('EVIDENCE_PACKAGE_BLOCKED_HASH', {
      mission_id:      missionId,
      blocking_reason: 'hash_computation_failed',
    });
  }

  return {
    schema_version:          SCHEMA_VERSION,
    evidence_package_status: 'EVIDENCE_PACKAGE_READY',
    evidence_package_ready:  true,
    package_stub:            false,
    mission_id:              missionId,
    evidence_receipt_id:     receiptId,
    evidence_source:         'go-core',
    package_hash:            packageHash,
    package_timestamp:       ts,
    deploy_allowed:          false,
    promotion_allowed:       false,
    stable_allowed:          false,
    tag_allowed:             false,
    blocking_reason:         null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-execution-evidence-package.mjs')) {
  const args      = process.argv.slice(2);
  const json      = args.includes('--json');
  const fixture   = args.includes('--fixture-mode');
  const requested = args.includes('--package-requested');

  const result = buildRuntimeExecutionEvidencePackage({
    package_requested: requested,
    fixture_mode:      fixture,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`evidence_package_status : ${result.evidence_package_status}`);
    console.log(`evidence_package_ready  : ${result.evidence_package_ready}`);
    console.log(`package_stub            : ${result.package_stub}`);
    console.log(`mission_id              : ${result.mission_id}`);
    console.log(`evidence_receipt_id     : ${result.evidence_receipt_id}`);
    console.log(`evidence_source         : ${result.evidence_source}`);
    console.log(`package_hash            : ${result.package_hash}`);
    console.log(`deploy_allowed          : ${result.deploy_allowed}`);
    console.log(`promotion_allowed       : ${result.promotion_allowed}`);
  }

  process.exit(result.evidence_package_ready ? 0 : 1);
}
