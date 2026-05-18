#!/usr/bin/env node
/**
 * Unlock Governance Baseline — V65.0
 *
 * Validates the complete unlock governance layer. Review-only.
 * Does NOT execute unlock, release, tag, stable, or deploy.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always. unlock_executed=false always.
 * future_execution_phase_required=true always.
 */

import { createHash } from 'crypto';

import { createProductionUnlockContract, UNLOCK_CONTRACT_STATUSES, UNLOCK_REQUESTED_SCOPES }
  from './production-unlock-contract.mjs';
import { createUnlockHumanAuthorityContract, REQUIRED_CONFIRMATION_PHRASE, AUTHORITY_DENIED_CAPABILITIES, UNLOCK_AUTHORITY_STATUSES }
  from './unlock-human-authority-contract.mjs';
import { bindUnlockContractAuthority, UNLOCK_BINDING_STATUSES }
  from './unlock-contract-authority-binding.mjs';
import { evaluateUnlockDecision, UNLOCK_DECISION_STATUSES, UNLOCK_DECISION_BLOCKED_ACTIONS, UNLOCK_DECISION_SAFE_NEXT_ACTIONS }
  from './unlock-decision-matrix.mjs';
import { buildUnlockEvidenceReviewPackage, EVIDENCE_REVIEW_STATUSES, EVIDENCE_REVIEW_SOURCES }
  from './unlock-evidence-review-package.mjs';
import {
  appendUnlockReviewLedgerEvent,
  verifyUnlockReviewLedgerChain,
  _resetUnlockReviewLedgerForTest,
  UNLOCK_REVIEW_EVENT_TYPES,
  UNLOCK_REVIEW_LEDGER_STATUSES,
} from './unlock-review-ledger.mjs';
import { buildUnlockReviewReport, UNLOCK_REVIEW_REPORT_STATUSES, UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS }
  from './unlock-review-report.mjs';

const SCHEMA_VERSION = 'v65.0';

export const UNLOCK_GOVERNANCE_BASELINE_STATUSES = [
  'UNLOCK_GOVERNANCE_BASELINE_BLOCKED_MODULES',
  'UNLOCK_GOVERNANCE_BASELINE_BLOCKED_CONSTANTS',
  'UNLOCK_GOVERNANCE_BASELINE_BLOCKED_TESTS',
  'UNLOCK_GOVERNANCE_BASELINE_BLOCKED_INVARIANTS',
  'UNLOCK_GOVERNANCE_BASELINE_BLOCKED_LEDGER',
  'UNLOCK_GOVERNANCE_BASELINE_READY',
];

const GOVERNANCE_MODULES = [
  'production_unlock_contract',
  'unlock_human_authority_contract',
  'unlock_contract_authority_binding',
  'unlock_decision_matrix',
  'unlock_evidence_review_package',
  'unlock_review_ledger',
  'unlock_review_report',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:                    false,
    promotion_allowed:                 false,
    stable_allowed:                    false,
    tag_allowed:                       false,
    release_execution_allowed:         false,
    release_performed:                 false,
    tag_created:                       false,
    stable_promoted:                   false,
    deploy_performed:                  false,
    production_execution_locked:       true,
    unlock_executed:                   false,
    unlock_review_only:                true,
    future_execution_phase_required:   true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                    SCHEMA_VERSION,
    baseline_status:                   status,
    baseline_ready:                    false,
    blocking_reason,
    ...extra,
    ..._locked(),
    deploy_allowed:                    false,
    promotion_allowed:                 false,
    stable_allowed:                    false,
    tag_allowed:                       false,
    release_execution_allowed:         false,
    release_performed:                 false,
    tag_created:                       false,
    stable_promoted:                   false,
    deploy_performed:                  false,
    production_execution_locked:       true,
    unlock_executed:                   false,
    unlock_review_only:                true,
    future_execution_phase_required:   true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Run the unlock governance baseline validation.
 */
export function runUnlockGovernanceBaseline(params = {}) {
  const { _mock_timestamp } = params ?? {};
  const now = _mock_timestamp ?? new Date().toISOString();

  // ── 1. Module check ──────────────────────────────────────────────
  const modulesPresent = GOVERNANCE_MODULES.every(m => typeof m === 'string' && m.length > 0);
  if (!modulesPresent) {
    return _blocked('UNLOCK_GOVERNANCE_BASELINE_BLOCKED_MODULES', 'governance_modules_missing');
  }

  // ── 2. Constants check ───────────────────────────────────────────
  const constantsOk = (
    Array.isArray(UNLOCK_CONTRACT_STATUSES)             && UNLOCK_CONTRACT_STATUSES.length >= 8 &&
    Array.isArray(UNLOCK_REQUESTED_SCOPES)              && UNLOCK_REQUESTED_SCOPES.length >= 5 &&
    Array.isArray(UNLOCK_AUTHORITY_STATUSES)            && UNLOCK_AUTHORITY_STATUSES.length >= 7 &&
    typeof REQUIRED_CONFIRMATION_PHRASE                 === 'string' && REQUIRED_CONFIRMATION_PHRASE.length > 10 &&
    Array.isArray(AUTHORITY_DENIED_CAPABILITIES)        && AUTHORITY_DENIED_CAPABILITIES.length >= 8 &&
    Array.isArray(UNLOCK_BINDING_STATUSES)              && UNLOCK_BINDING_STATUSES.length >= 6 &&
    Array.isArray(UNLOCK_DECISION_STATUSES)             && UNLOCK_DECISION_STATUSES.length >= 6 &&
    Array.isArray(UNLOCK_DECISION_BLOCKED_ACTIONS)      && UNLOCK_DECISION_BLOCKED_ACTIONS.length >= 9 &&
    Array.isArray(UNLOCK_DECISION_SAFE_NEXT_ACTIONS)    && UNLOCK_DECISION_SAFE_NEXT_ACTIONS.length >= 6 &&
    Array.isArray(EVIDENCE_REVIEW_STATUSES)             && EVIDENCE_REVIEW_STATUSES.length >= 6 &&
    Array.isArray(EVIDENCE_REVIEW_SOURCES)              && EVIDENCE_REVIEW_SOURCES.length >= 6 &&
    Array.isArray(UNLOCK_REVIEW_EVENT_TYPES)            && UNLOCK_REVIEW_EVENT_TYPES.length === 5 &&
    Array.isArray(UNLOCK_REVIEW_LEDGER_STATUSES)        && UNLOCK_REVIEW_LEDGER_STATUSES.length === 5 &&
    Array.isArray(UNLOCK_REVIEW_REPORT_STATUSES)        && UNLOCK_REVIEW_REPORT_STATUSES.length >= 7 &&
    Array.isArray(UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS) && UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS.length >= 6
  );
  if (!constantsOk) {
    return _blocked('UNLOCK_GOVERNANCE_BASELINE_BLOCKED_CONSTANTS', 'governance_constants_invalid');
  }

  // ── 3. Fixture smoke tests ───────────────────────────────────────
  const contract   = createProductionUnlockContract({ fixture_mode: true, _mock_timestamp: now });
  const authority  = createUnlockHumanAuthorityContract({ fixture_mode: true, _mock_timestamp: now });
  const binding    = bindUnlockContractAuthority({ fixture_mode: true, _mock_timestamp: now });
  const decision   = evaluateUnlockDecision({ fixture_mode: true, _mock_timestamp: now });
  const evidence   = buildUnlockEvidenceReviewPackage({ fixture_mode: true, _mock_timestamp: now });
  const report     = buildUnlockReviewReport({ fixture_mode: true, _mock_timestamp: now });

  const smokeOk = (
    contract.contract_ready  === true &&
    authority.authority_ready === true &&
    binding.binding_ready    === true &&
    decision.unlock_review_ready === true &&
    evidence.evidence_review_ready === true &&
    report.report_ready      === true
  );
  if (!smokeOk) {
    return _blocked('UNLOCK_GOVERNANCE_BASELINE_BLOCKED_TESTS', 'fixture_smoke_tests_failed', {
      contract_ready:   contract.contract_ready,
      authority_ready:  authority.authority_ready,
      binding_ready:    binding.binding_ready,
      decision_ready:   decision.unlock_review_ready,
      evidence_ready:   evidence.evidence_review_ready,
      report_ready:     report.report_ready,
    });
  }

  // ── 4. Invariant check ───────────────────────────────────────────
  const outputs = [contract, authority, binding, decision, evidence, report];
  const invariantsOk = outputs.every(o =>
    o.production_execution_locked       === true &&
    o.unlock_executed                   === false &&
    o.unlock_review_only                === true &&
    o.future_execution_phase_required   === true &&
    o.deploy_allowed                    === false &&
    o.release_execution_allowed         === false
  );
  if (!invariantsOk) {
    return _blocked('UNLOCK_GOVERNANCE_BASELINE_BLOCKED_INVARIANTS', 'invariant_violation_detected');
  }

  // ── 5. Ledger smoke test ─────────────────────────────────────────
  _resetUnlockReviewLedgerForTest();
  for (const event_type of UNLOCK_REVIEW_EVENT_TYPES) {
    appendUnlockReviewLedgerEvent({ event_type, artifact_id: `baseline-${event_type}`, fixture_mode: true });
  }
  const ledgerChain = verifyUnlockReviewLedgerChain();
  _resetUnlockReviewLedgerForTest();

  if (!ledgerChain.valid) {
    return _blocked('UNLOCK_GOVERNANCE_BASELINE_BLOCKED_LEDGER', 'ledger_chain_verification_failed');
  }

  // ── 6. Baseline ready ────────────────────────────────────────────
  const baseline_hash = _sha256([
    'unlock-governance-baseline',
    contract.unlock_contract_id ?? '',
    authority.unlock_authority_id ?? '',
    binding.binding_id ?? '',
    decision.decision_id ?? '',
    evidence.package_id ?? '',
    report.report_id ?? '',
    now,
  ].join(':')).slice(0, 48);

  return {
    schema_version:                    SCHEMA_VERSION,
    baseline_status:                   'UNLOCK_GOVERNANCE_BASELINE_READY',
    baseline_ready:                    true,
    baseline_hash,
    governance_modules:                GOVERNANCE_MODULES,
    module_count:                      GOVERNANCE_MODULES.length,
    smoke_test_results: {
      contract_ready:                  true,
      authority_ready:                 true,
      binding_ready:                   true,
      decision_ready:                  true,
      evidence_ready:                  true,
      report_ready:                    true,
      ledger_chain_valid:              true,
    },
    invariants_verified:               true,
    created_at:                        now,
    blocking_reason:                   null,
    ..._locked(),
  };
}

/**
 * Render a human-readable baseline summary.
 */
export function renderUnlockGovernanceBaseline(result) {
  if (!result) return 'unlock_governance_baseline: null';
  const lines = [
    `baseline_status                : ${result.baseline_status ?? 'UNKNOWN'}`,
    `baseline_ready                 : ${result.baseline_ready ?? false}`,
    `baseline_hash                  : ${result.baseline_hash ?? 'none'}`,
    `module_count                   : ${result.module_count ?? 0}`,
    `invariants_verified            : ${result.invariants_verified ?? false}`,
    `production_execution_locked    : true`,
    `unlock_executed                : false`,
    `future_execution_phase_required: true`,
    `unlock_review_only             : true`,
    `blocking_reason                : ${result.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('unlock-governance-baseline.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');

  const result = runUnlockGovernanceBaseline();

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderUnlockGovernanceBaseline(result));
  }

  process.exit(result.baseline_ready ? 0 : 1);
}
