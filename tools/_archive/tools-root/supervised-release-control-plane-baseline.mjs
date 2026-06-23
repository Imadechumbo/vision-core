#!/usr/bin/env node
/**
 * Supervised Release Control Plane Baseline — V45.0
 *
 * Verifies that all supervised release control plane modules are present,
 * all invariants hold, and the full pipeline can execute fixture mode
 * end-to-end. This is a read-only verification baseline — it does not
 * execute any release, deploy, or promotion.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - release_performed=false always.
 * - promote_performed=false always.
 * - baseline_executed=false always (no production actions).
 */

import {
  createSupervisedReleaseIntent,
  validateSupervisedReleaseIntent,
} from './supervised-release-intent-contract.mjs';
import { bindReleaseIntentToAuthority }         from './release-intent-authority-binding.mjs';
import { createReleaseIntentFromRuntimeCandidate } from './runtime-candidate-release-intent-bridge.mjs';
import { runSupervisedReleaseCandidateController } from './supervised-release-candidate-controller.mjs';
import { buildManualPromotionPackage }            from './manual-promotion-package-builder.mjs';
import { runManualPromotionReviewGate }           from './manual-promotion-review-gate.mjs';
import {
  appendSupervisedLedgerEvent,
  verifySupervisedLedgerChain,
  _resetSupervisedLedgerForTest,
  SUPERVISED_LEDGER_EVENT_TYPES,
} from './supervised-release-ledger-events.mjs';
import { _resetLedgerForTest } from './runtime-execution-ledger-binding.mjs';

const SCHEMA_VERSION = 'v45.0';

export const CONTROL_PLANE_BASELINE_STATUSES = [
  'CONTROL_PLANE_BASELINE_BLOCKED_MODULE',
  'CONTROL_PLANE_BASELINE_BLOCKED_INVARIANTS',
  'CONTROL_PLANE_BASELINE_BLOCKED_PIPELINE',
  'CONTROL_PLANE_BASELINE_BLOCKED_LEDGER',
  'CONTROL_PLANE_BASELINE_READY',
];

const REQUIRED_MODULES = [
  'supervised-release-intent-contract',
  'release-intent-authority-binding',
  'runtime-candidate-release-intent-bridge',
  'supervised-release-candidate-controller',
  'manual-promotion-package-builder',
  'manual-promotion-review-gate',
  'supervised-release-ledger-events',
];

function _locked() {
  return {
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
    tag_allowed:          false,
    release_performed:    false,
    promote_performed:    false,
    baseline_executed:    false,
  };
}

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:               SCHEMA_VERSION,
    control_plane_baseline_status: status,
    control_plane_baseline_ready:  false,
    modules_verified:              false,
    invariants_verified:           false,
    pipeline_verified:             false,
    ledger_verified:               false,
    blocking_reason,
    ..._locked(),
    ...extra,
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    tag_allowed:       false,
    release_performed: false,
    promote_performed: false,
    baseline_executed: false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Run supervised release control plane baseline verification.
 *
 * @param {Object} [options]
 * @param {string} [options._mock_timestamp] - Override timestamp for tests
 * @returns {Object} Baseline result
 */
export function runSupervisedReleaseControlPlaneBaseline(options = {}) {
  const { _mock_timestamp } = options ?? {};

  // Phase 1: Module verification (imports already resolved above)
  const modulesPresent = [
    typeof createSupervisedReleaseIntent    === 'function',
    typeof validateSupervisedReleaseIntent  === 'function',
    typeof bindReleaseIntentToAuthority     === 'function',
    typeof createReleaseIntentFromRuntimeCandidate === 'function',
    typeof runSupervisedReleaseCandidateController === 'function',
    typeof buildManualPromotionPackage      === 'function',
    typeof runManualPromotionReviewGate     === 'function',
    typeof appendSupervisedLedgerEvent      === 'function',
    typeof verifySupervisedLedgerChain      === 'function',
    Array.isArray(SUPERVISED_LEDGER_EVENT_TYPES) && SUPERVISED_LEDGER_EVENT_TYPES.length === 7,
  ];
  const allModulesPresent = modulesPresent.every(Boolean);

  if (!allModulesPresent) {
    return _blocked('CONTROL_PLANE_BASELINE_BLOCKED_MODULE', 'required_module_missing', {
      modules_checked: REQUIRED_MODULES,
    });
  }

  // Phase 2: Pipeline verification — run full fixture pipeline
  let rcResult, pkgResult, reviewResult;
  let pipelineError = null;

  try {
    _resetLedgerForTest();
    rcResult = runSupervisedReleaseCandidateController({ fixture_mode: true });
  } catch (e) {
    pipelineError = `rc_controller_failed:${e.message}`;
  }

  if (pipelineError || rcResult?.supervised_release_candidate_ready !== true) {
    return _blocked('CONTROL_PLANE_BASELINE_BLOCKED_PIPELINE', pipelineError ?? 'rc_not_ready', {
      modules_verified: true,
      rc_status: rcResult?.supervised_release_candidate_status ?? null,
    });
  }

  // Phase 3: Invariant check on RC result
  const rcInvariants = [
    rcResult.deploy_allowed    === false,
    rcResult.promotion_allowed === false,
    rcResult.stable_allowed    === false,
    rcResult.tag_allowed       === false,
    rcResult.release_performed === false,
    rcResult.evidence_source   === 'go-core',
    rcResult.supervised_only   === true,
    rcResult.local_only        === true,
  ];
  if (!rcInvariants.every(Boolean)) {
    return _blocked('CONTROL_PLANE_BASELINE_BLOCKED_INVARIANTS', 'rc_invariants_violated', {
      modules_verified: true,
    });
  }

  try {
    pkgResult = buildManualPromotionPackage({ supervised_rc_result: rcResult });
  } catch (e) {
    pipelineError = `pkg_builder_failed:${e.message}`;
  }

  if (pipelineError || pkgResult?.promotion_package_ready !== true) {
    return _blocked('CONTROL_PLANE_BASELINE_BLOCKED_PIPELINE', pipelineError ?? 'pkg_not_ready', {
      modules_verified:  true,
      invariants_verified: true,
    });
  }

  const pkgInvariants = [
    pkgResult.deploy_allowed    === false,
    pkgResult.promotion_allowed === false,
    pkgResult.manual_only       === true,
  ];
  if (!pkgInvariants.every(Boolean)) {
    return _blocked('CONTROL_PLANE_BASELINE_BLOCKED_INVARIANTS', 'pkg_invariants_violated', {
      modules_verified: true,
    });
  }

  try {
    reviewResult = runManualPromotionReviewGate({ fixture_mode: true });
  } catch (e) {
    pipelineError = `review_gate_failed:${e.message}`;
  }

  if (pipelineError || reviewResult?.promotion_review_ready !== true) {
    return _blocked('CONTROL_PLANE_BASELINE_BLOCKED_PIPELINE', pipelineError ?? 'review_not_ready', {
      modules_verified:  true,
      invariants_verified: true,
    });
  }

  const reviewInvariants = [
    reviewResult.deploy_allowed    === false,
    reviewResult.promotion_allowed === false,
    reviewResult.manual_only       === true,
    // promotion_review_allowed must be true when READY
    reviewResult.promotion_review_allowed === true,
  ];
  if (!reviewInvariants.every(Boolean)) {
    return _blocked('CONTROL_PLANE_BASELINE_BLOCKED_INVARIANTS', 'review_invariants_violated', {
      modules_verified: true,
    });
  }

  // Phase 4: Ledger verification
  _resetSupervisedLedgerForTest();
  let ledgerError = null;
  let ledgerSize = 0;
  let chainResult = null;

  try {
    for (const eventType of SUPERVISED_LEDGER_EVENT_TYPES) {
      appendSupervisedLedgerEvent({
        event_type:      eventType,
        actor_id:        'baseline-v450',
        evidence_source: 'go-core',
        _mock_timestamp,
      });
    }
    chainResult = verifySupervisedLedgerChain();
    ledgerSize  = chainResult.entries;
  } catch (e) {
    ledgerError = `ledger_failed:${e.message}`;
  }

  if (ledgerError || !chainResult?.valid || chainResult.entries !== 7) {
    return _blocked('CONTROL_PLANE_BASELINE_BLOCKED_LEDGER', ledgerError ?? 'ledger_chain_invalid', {
      modules_verified:  true,
      invariants_verified: true,
      pipeline_verified:   true,
      ledger_size:         ledgerSize,
      chain_valid:         chainResult?.valid ?? false,
    });
  }

  // All checks passed
  return {
    schema_version:                SCHEMA_VERSION,
    control_plane_baseline_status: 'CONTROL_PLANE_BASELINE_READY',
    control_plane_baseline_ready:  true,
    modules_verified:              true,
    modules_checked:               REQUIRED_MODULES,
    invariants_verified:           true,
    pipeline_verified:             true,
    ledger_verified:               true,
    ledger_size:                   ledgerSize,
    ledger_event_types:            SUPERVISED_LEDGER_EVENT_TYPES.length,
    chain_valid:                   true,
    rc_id:                         rcResult.rc_id,
    evidence_source:               'go-core',
    release_candidate_mode:        rcResult.release_candidate_mode ?? 'supervised',
    blocking_reason:               null,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('supervised-release-control-plane-baseline.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');

  const result = runSupervisedReleaseControlPlaneBaseline();

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const lines = [
      `control_plane_baseline_status : ${result.control_plane_baseline_status}`,
      `control_plane_baseline_ready  : ${result.control_plane_baseline_ready}`,
      `modules_verified              : ${result.modules_verified}`,
      `invariants_verified           : ${result.invariants_verified}`,
      `pipeline_verified             : ${result.pipeline_verified}`,
      `ledger_verified               : ${result.ledger_verified}`,
      `deploy_allowed                : ${result.deploy_allowed}`,
      `promotion_allowed             : ${result.promotion_allowed}`,
      `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
    ];
    console.log(lines.join('\n'));
  }

  process.exit(result.control_plane_baseline_ready ? 0 : 1);
}
