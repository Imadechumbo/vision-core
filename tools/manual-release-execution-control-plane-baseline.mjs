#!/usr/bin/env node
/**
 * Manual Release Execution Control Plane Baseline — V50.0
 *
 * Verifies that all manual release execution control plane modules (V46–V49)
 * are present, all invariants hold, and the full fixture handoff pipeline
 * can execute end-to-end. Read-only verification — never executes any release,
 * deploy, tag, or stable promotion.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - tag_allowed=false always.
 * - release_execution_allowed=false always.
 * - release_performed=false always.
 * - tag_created=false always.
 * - stable_promoted=false always.
 * - deploy_performed=false always.
 * - baseline_executed=false always.
 */

import { createManualReleaseRequest }         from './manual-release-request-contract.mjs';
import { createHumanConfirmationContract }    from './human-confirmation-contract.mjs';
import { bindManualReleaseRequestAuthority }  from './manual-release-request-authority-binding.mjs';
import { runManualReleaseExecutionPreflight } from './manual-release-execution-preflight.mjs';
import { runManualReleaseDryRun }             from './manual-release-dry-run-executor.mjs';
import { buildManualReleaseHandoffPackage }   from './manual-release-handoff-package.mjs';
import {
  appendHandoffLedgerEvent,
  verifyHandoffLedgerChain,
  _resetHandoffLedgerForTest,
  HANDOFF_LEDGER_EVENT_TYPES,
} from './manual-release-handoff-ledger.mjs';

const SCHEMA_VERSION = 'v50.0';

export const MANUAL_EXECUTION_BASELINE_STATUSES = [
  'MANUAL_EXECUTION_BASELINE_BLOCKED_MODULES',
  'MANUAL_EXECUTION_BASELINE_BLOCKED_TESTS',
  'MANUAL_EXECUTION_BASELINE_BLOCKED_INVARIANTS',
  'MANUAL_EXECUTION_BASELINE_BLOCKED_HANDOFF',
  'MANUAL_EXECUTION_BASELINE_READY',
];

const REQUIRED_MODULES = [
  'manual-release-request-contract',
  'human-confirmation-contract',
  'manual-release-request-authority-binding',
  'manual-release-execution-preflight',
  'manual-release-dry-run-executor',
  'manual-release-handoff-package',
  'manual-release-handoff-ledger',
];

function _locked() {
  return {
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_execution_allowed: false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
    baseline_executed:         false,
  };
}

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:                       SCHEMA_VERSION,
    manual_execution_baseline_status:     status,
    manual_execution_baseline_ready:      false,
    modules_verified:                     false,
    invariants_verified:                  false,
    pipeline_verified:                    false,
    handoff_verified:                     false,
    ledger_verified:                      false,
    blocking_reason,
    ..._locked(),
    ...extra,
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_execution_allowed: false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
    baseline_executed:         false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Run manual release execution control plane baseline verification.
 *
 * @param {Object} [options]
 * @param {string} [options._mock_timestamp] - Override timestamp for tests
 * @returns {Object} Baseline result
 */
export function runManualReleaseExecutionControlPlaneBaseline(options = {}) {
  const { _mock_timestamp } = options ?? {};

  // Phase 1: Module verification (imports already resolved above)
  const modulesPresent = [
    typeof createManualReleaseRequest         === 'function',
    typeof createHumanConfirmationContract    === 'function',
    typeof bindManualReleaseRequestAuthority  === 'function',
    typeof runManualReleaseExecutionPreflight === 'function',
    typeof runManualReleaseDryRun             === 'function',
    typeof buildManualReleaseHandoffPackage   === 'function',
    typeof appendHandoffLedgerEvent           === 'function',
    typeof verifyHandoffLedgerChain           === 'function',
    Array.isArray(HANDOFF_LEDGER_EVENT_TYPES) && HANDOFF_LEDGER_EVENT_TYPES.length === 6,
  ];
  const allModulesPresent = modulesPresent.every(Boolean);

  if (!allModulesPresent) {
    return _blocked('MANUAL_EXECUTION_BASELINE_BLOCKED_MODULES', 'required_module_missing', {
      modules_checked: REQUIRED_MODULES,
    });
  }

  // Phase 2: Pipeline verification — run full fixture pipeline
  let reqResult, confResult, authResult, preflightResult, dryRunResult, handoffResult;
  let pipelineError = null;

  try {
    reqResult = createManualReleaseRequest({ fixture_mode: true, _mock_timestamp });
  } catch (e) {
    pipelineError = `request_contract_failed:${e.message}`;
  }

  if (pipelineError || reqResult?.manual_release_request_status !== 'MANUAL_RELEASE_REQUEST_VALID') {
    return _blocked('MANUAL_EXECUTION_BASELINE_BLOCKED_TESTS', pipelineError ?? 'request_not_valid', {
      modules_verified: true,
      request_status: reqResult?.manual_release_request_status ?? null,
    });
  }

  try {
    confResult = createHumanConfirmationContract({ fixture_mode: true, _mock_timestamp });
  } catch (e) {
    pipelineError = `human_confirmation_failed:${e.message}`;
  }

  if (pipelineError || confResult?.human_confirmation_ready !== true) {
    return _blocked('MANUAL_EXECUTION_BASELINE_BLOCKED_TESTS', pipelineError ?? 'confirmation_not_ready', {
      modules_verified: true,
      confirmation_status: confResult?.human_confirmation_status ?? null,
    });
  }

  try {
    authResult = bindManualReleaseRequestAuthority({ fixture_mode: true, _mock_timestamp });
  } catch (e) {
    pipelineError = `authority_binding_failed:${e.message}`;
  }

  if (pipelineError || authResult?.request_authority_binding_ready !== true) {
    return _blocked('MANUAL_EXECUTION_BASELINE_BLOCKED_TESTS', pipelineError ?? 'authority_binding_not_ready', {
      modules_verified: true,
      authority_status: authResult?.request_authority_binding_status ?? null,
    });
  }

  try {
    preflightResult = runManualReleaseExecutionPreflight({ fixture_mode: true, _mock_timestamp });
  } catch (e) {
    pipelineError = `preflight_failed:${e.message}`;
  }

  if (pipelineError || preflightResult?.manual_release_preflight_ready !== true) {
    return _blocked('MANUAL_EXECUTION_BASELINE_BLOCKED_TESTS', pipelineError ?? 'preflight_not_ready', {
      modules_verified: true,
      preflight_status: preflightResult?.manual_release_preflight_status ?? null,
    });
  }

  try {
    dryRunResult = runManualReleaseDryRun({ fixture_mode: true, _mock_timestamp });
  } catch (e) {
    pipelineError = `dry_run_failed:${e.message}`;
  }

  if (pipelineError || dryRunResult?.manual_release_dry_run_ready !== true) {
    return _blocked('MANUAL_EXECUTION_BASELINE_BLOCKED_TESTS', pipelineError ?? 'dry_run_not_ready', {
      modules_verified: true,
      dry_run_status: dryRunResult?.manual_release_dry_run_status ?? null,
    });
  }

  try {
    handoffResult = buildManualReleaseHandoffPackage({ fixture_mode: true, _mock_timestamp });
  } catch (e) {
    pipelineError = `handoff_package_failed:${e.message}`;
  }

  if (pipelineError || handoffResult?.handoff_ready !== true) {
    return _blocked('MANUAL_EXECUTION_BASELINE_BLOCKED_TESTS', pipelineError ?? 'handoff_package_not_ready', {
      modules_verified: true,
      handoff_status: handoffResult?.handoff_status ?? null,
    });
  }

  // Phase 3: Invariant check across all pipeline steps
  const invariantChecks = [
    // Request invariants
    reqResult.deploy_allowed            === false,
    reqResult.promotion_allowed         === false,
    reqResult.release_performed         === false,
    reqResult.evidence_source           === 'go-core',
    reqResult.manual_only               === true,
    reqResult.supervised_only           === true,
    reqResult.local_only                === true,
    // Confirmation invariants
    confResult.deploy_allowed           === false,
    confResult.promotion_allowed        === false,
    confResult.release_performed        === false,
    confResult.can_execute_release      === false,
    confResult.can_create_evidence      === false,
    // Authority binding invariants
    authResult.deploy_allowed           === false,
    authResult.promotion_allowed        === false,
    authResult.release_performed        === false,
    authResult.can_execute_release      === false,
    // Preflight invariants
    preflightResult.deploy_allowed      === false,
    preflightResult.promotion_allowed   === false,
    preflightResult.release_performed   === false,
    preflightResult.release_execution_allowed === false,
    // Dry run invariants
    dryRunResult.deploy_allowed         === false,
    dryRunResult.promotion_allowed      === false,
    dryRunResult.release_performed      === false,
    dryRunResult.deploy_performed       === false,
    dryRunResult.tag_created            === false,
    // Handoff package invariants
    handoffResult.deploy_allowed        === false,
    handoffResult.promotion_allowed     === false,
    handoffResult.release_performed     === false,
    handoffResult.deploy_performed      === false,
    handoffResult.tag_created           === false,
    handoffResult.stable_promoted       === false,
  ];

  if (!invariantChecks.every(Boolean)) {
    return _blocked('MANUAL_EXECUTION_BASELINE_BLOCKED_INVARIANTS', 'pipeline_invariants_violated', {
      modules_verified:  true,
      pipeline_verified: true,
    });
  }

  // Phase 4: Ledger verification — append all 6 event types, verify chain
  _resetHandoffLedgerForTest();
  let ledgerError  = null;
  let ledgerSize   = 0;
  let chainResult  = null;
  const BASELINE_HANDOFF_ID    = 'baseline-v500-handoff';
  const BASELINE_EVIDENCE_REFS = ['baseline-v500-receipt'];

  try {
    for (const eventType of HANDOFF_LEDGER_EVENT_TYPES) {
      const isReady = eventType !== 'MANUAL_RELEASE_BLOCKED';
      appendHandoffLedgerEvent({
        event_type:       eventType,
        actor_id:         'baseline-v500',
        handoff_id:       isReady ? BASELINE_HANDOFF_ID : undefined,
        evidence_refs:    isReady ? BASELINE_EVIDENCE_REFS : undefined,
        evidence_source:  isReady ? 'go-core' : undefined,
        _mock_timestamp,
      });
    }
    chainResult = verifyHandoffLedgerChain();
    ledgerSize  = chainResult.entries;
  } catch (e) {
    ledgerError = `ledger_failed:${e.message}`;
  }

  if (ledgerError || !chainResult?.valid || chainResult.entries !== 6) {
    return _blocked('MANUAL_EXECUTION_BASELINE_BLOCKED_HANDOFF', ledgerError ?? 'ledger_chain_invalid', {
      modules_verified:    true,
      invariants_verified: true,
      pipeline_verified:   true,
      ledger_size:         ledgerSize,
      chain_valid:         chainResult?.valid ?? false,
    });
  }

  // All checks passed
  return {
    schema_version:                   SCHEMA_VERSION,
    manual_execution_baseline_status: 'MANUAL_EXECUTION_BASELINE_READY',
    manual_execution_baseline_ready:  true,
    modules_verified:                 true,
    modules_checked:                  REQUIRED_MODULES,
    invariants_verified:              true,
    pipeline_verified:                true,
    handoff_verified:                 true,
    ledger_verified:                  true,
    ledger_size:                      ledgerSize,
    ledger_event_types:               HANDOFF_LEDGER_EVENT_TYPES.length,
    chain_valid:                      true,
    evidence_source:                  'go-core',
    handoff_id:                       handoffResult.handoff_id,
    blocking_reason:                  null,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('manual-release-execution-control-plane-baseline.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');

  const result = runManualReleaseExecutionControlPlaneBaseline();

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const lines = [
      `manual_execution_baseline_status : ${result.manual_execution_baseline_status}`,
      `manual_execution_baseline_ready  : ${result.manual_execution_baseline_ready}`,
      `modules_verified                 : ${result.modules_verified}`,
      `invariants_verified              : ${result.invariants_verified}`,
      `pipeline_verified                : ${result.pipeline_verified}`,
      `handoff_verified                 : ${result.handoff_verified}`,
      `ledger_verified                  : ${result.ledger_verified}`,
      `deploy_allowed                   : ${result.deploy_allowed}`,
      `release_execution_allowed        : ${result.release_execution_allowed}`,
      `blocking_reason                  : ${result.blocking_reason ?? 'none'}`,
    ];
    console.log(lines.join('\n'));
  }

  process.exit(result.manual_execution_baseline_ready ? 0 : 1);
}
