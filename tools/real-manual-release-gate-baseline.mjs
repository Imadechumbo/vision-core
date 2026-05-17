#!/usr/bin/env node
/**
 * Real Manual Release Gate Baseline — V60.0
 *
 * Validates all V56-V59 real manual release gate modules are present,
 * enforce correct invariants, and produce a locked baseline report.
 * Never executes any release action.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always. immutable=true always.
 */

import { createHash } from 'crypto';

import {
  createRealManualReleaseGate,
  REAL_GATE_STATUSES,
} from './real-manual-release-gate-contract.mjs';

import {
  createProductionExecutionLock,
  PRODUCTION_LOCK_STATUSES,
  LOCKED_CAPABILITIES,
} from './production-execution-lock.mjs';

import {
  evaluateRealReleaseReadiness,
  REAL_READINESS_STATUSES,
  REAL_READINESS_SAFE_NEXT_ACTIONS,
} from './real-release-readiness-decision-matrix.mjs';

import {
  buildRealReleaseEvidenceFinalizer,
  FINALIZER_STATUSES,
} from './real-release-evidence-finalizer.mjs';

import {
  appendRealReleaseLedgerEvent,
  verifyRealReleaseLedgerChain,
  _resetRealReleaseLedgerForTest,
  REAL_RELEASE_LOCKED_EVENT_TYPES,
  REAL_RELEASE_LOCKED_LEDGER_STATUSES,
} from './real-release-locked-ledger.mjs';

import {
  buildRealReleaseLockedReport,
  LOCKED_REPORT_STATUSES,
  LOCKED_REPORT_SAFE_NEXT_ACTIONS,
} from './real-release-locked-report.mjs';

const SCHEMA_VERSION   = 'v60.0';
const BASELINE_VERSION = 'v60.0';

export const REAL_GATE_BASELINE_STATUSES = [
  'REAL_GATE_BASELINE_BLOCKED_MODULES',
  'REAL_GATE_BASELINE_BLOCKED_CONSTANTS',
  'REAL_GATE_BASELINE_BLOCKED_TESTS',
  'REAL_GATE_BASELINE_BLOCKED_INVARIANTS',
  'REAL_GATE_BASELINE_BLOCKED_LEDGER',
  'REAL_GATE_BASELINE_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    unlock_required:              true,
    human_review_required:        true,
    immutable:                    true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    baseline_version: BASELINE_VERSION,
    baseline_status:  status,
    baseline_ready:   false,
    blocking_reason,
    ...extra,
    ..._locked(),
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    unlock_required:              true,
    human_review_required:        true,
    immutable:                    true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Run the real manual release gate baseline check.
 */
export function runRealManualReleaseGateBaseline(params = {}) {
  const { _mock_timestamp } = params ?? {};
  const now = _mock_timestamp ?? new Date().toISOString();

  // ── 1. Module presence check ────────────────────────────────────
  const modules = {
    real_manual_release_gate:    typeof createRealManualReleaseGate === 'function',
    production_execution_lock:   typeof createProductionExecutionLock === 'function',
    real_release_readiness:      typeof evaluateRealReleaseReadiness === 'function',
    evidence_finalizer:          typeof buildRealReleaseEvidenceFinalizer === 'function',
    real_locked_ledger:          typeof appendRealReleaseLedgerEvent === 'function',
    real_locked_report:          typeof buildRealReleaseLockedReport === 'function',
  };

  const missingModules = Object.entries(modules)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  if (missingModules.length > 0) {
    return _blocked('REAL_GATE_BASELINE_BLOCKED_MODULES', 'modules_missing', {
      missing_modules: missingModules,
    });
  }

  // ── 2. Constants check ──────────────────────────────────────────
  const constantsOk = (
    Array.isArray(REAL_GATE_STATUSES)                 && REAL_GATE_STATUSES.length >= 7 &&
    Array.isArray(PRODUCTION_LOCK_STATUSES)           && PRODUCTION_LOCK_STATUSES.length >= 5 &&
    Array.isArray(LOCKED_CAPABILITIES)                && LOCKED_CAPABILITIES.length >= 8 &&
    Array.isArray(REAL_READINESS_STATUSES)            && REAL_READINESS_STATUSES.length >= 5 &&
    Array.isArray(REAL_READINESS_SAFE_NEXT_ACTIONS)   && REAL_READINESS_SAFE_NEXT_ACTIONS.length >= 5 &&
    Array.isArray(FINALIZER_STATUSES)                 && FINALIZER_STATUSES.length >= 5 &&
    Array.isArray(REAL_RELEASE_LOCKED_EVENT_TYPES)    && REAL_RELEASE_LOCKED_EVENT_TYPES.length === 5 &&
    Array.isArray(REAL_RELEASE_LOCKED_LEDGER_STATUSES) && REAL_RELEASE_LOCKED_LEDGER_STATUSES.length === 5 &&
    Array.isArray(LOCKED_REPORT_STATUSES)             && LOCKED_REPORT_STATUSES.length >= 6 &&
    Array.isArray(LOCKED_REPORT_SAFE_NEXT_ACTIONS)    && LOCKED_REPORT_SAFE_NEXT_ACTIONS.length >= 6
  );

  if (!constantsOk) {
    return _blocked('REAL_GATE_BASELINE_BLOCKED_CONSTANTS', 'constants_invalid');
  }

  // ── 3. Fixture smoke tests ──────────────────────────────────────
  const gate       = createRealManualReleaseGate({ fixture_mode: true, _mock_timestamp: now });
  const lock       = createProductionExecutionLock({ fixture_mode: true, _mock_timestamp: now });
  const readiness  = evaluateRealReleaseReadiness({ fixture_mode: true, _mock_timestamp: now });
  const finalizer  = buildRealReleaseEvidenceFinalizer({ fixture_mode: true, _mock_timestamp: now });
  const report     = buildRealReleaseLockedReport({ fixture_mode: true, _mock_timestamp: now });

  const fixtureOk = (
    gate.gate_ready                   === true &&
    lock.lock_active                  === true &&
    readiness.real_release_readiness_ready === true &&
    finalizer.finalizer_ready         === true &&
    report.report_ready               === true
  );

  if (!fixtureOk) {
    const failed = [];
    if (gate.gate_ready                         !== true) failed.push('real_manual_release_gate');
    if (lock.lock_active                        !== true) failed.push('production_execution_lock');
    if (readiness.real_release_readiness_ready  !== true) failed.push('real_release_readiness');
    if (finalizer.finalizer_ready               !== true) failed.push('evidence_finalizer');
    if (report.report_ready                     !== true) failed.push('real_locked_report');
    return _blocked('REAL_GATE_BASELINE_BLOCKED_TESTS', 'fixture_smoke_failed', {
      failed_fixtures: failed,
    });
  }

  // ── 4. Invariant check ──────────────────────────────────────────
  const outputs = [gate, lock, readiness, finalizer, report];
  const invariantViolations = [];

  for (const [i, o] of outputs.entries()) {
    if (o.deploy_allowed               !== false) invariantViolations.push(`output[${i}].deploy_allowed`);
    if (o.promotion_allowed            !== false) invariantViolations.push(`output[${i}].promotion_allowed`);
    if (o.stable_allowed               !== false) invariantViolations.push(`output[${i}].stable_allowed`);
    if (o.tag_allowed                  !== false) invariantViolations.push(`output[${i}].tag_allowed`);
    if (o.release_execution_allowed    !== false) invariantViolations.push(`output[${i}].release_execution_allowed`);
    if (o.release_performed            !== false) invariantViolations.push(`output[${i}].release_performed`);
    if (o.tag_created                  !== false) invariantViolations.push(`output[${i}].tag_created`);
    if (o.stable_promoted              !== false) invariantViolations.push(`output[${i}].stable_promoted`);
    if (o.deploy_performed             !== false) invariantViolations.push(`output[${i}].deploy_performed`);
    if (o.production_execution_locked  !== true)  invariantViolations.push(`output[${i}].production_execution_locked`);
  }

  if (invariantViolations.length > 0) {
    return _blocked('REAL_GATE_BASELINE_BLOCKED_INVARIANTS', 'invariant_violation', {
      invariant_violations: invariantViolations,
    });
  }

  // ── 5. Ledger smoke test ─────────────────────────────────────────
  _resetRealReleaseLedgerForTest();
  const ledgerAppend = appendRealReleaseLedgerEvent({
    event_type:      'REAL_MANUAL_RELEASE_GATE_READY_LOCKED',
    actor_id:        'baseline',
    ledger_id:       'baseline-gate-id',
    evidence_refs:   ['baseline-receipt'],
    evidence_source: 'go-core',
    _mock_timestamp: now,
  });
  const ledgerChain = verifyRealReleaseLedgerChain();
  _resetRealReleaseLedgerForTest();

  if (!ledgerAppend.appended || ledgerChain.valid !== true) {
    return _blocked('REAL_GATE_BASELINE_BLOCKED_LEDGER', 'ledger_smoke_failed', {
      ledger_appended: ledgerAppend.appended,
      ledger_valid:    ledgerChain.valid,
    });
  }

  // ── 6. Baseline hash ─────────────────────────────────────────────
  const baseline_hash = _sha256([
    'real-gate-baseline',
    gate.gate_id   ?? '',
    lock.lock_id   ?? '',
    finalizer.finalizer_id ?? '',
    report.report_id ?? '',
    now,
  ].join(':')).slice(0, 48);

  return {
    schema_version:                    SCHEMA_VERSION,
    baseline_version:                  BASELINE_VERSION,
    baseline_status:                   'REAL_GATE_BASELINE_READY',
    baseline_ready:                    true,
    modules_verified:                  Object.keys(modules),
    fixture_smoke_results: {
      real_manual_release_gate:        gate.gate_status,
      production_execution_lock:       lock.lock_status,
      real_release_readiness:          readiness.real_release_readiness_status,
      evidence_finalizer:              finalizer.finalizer_status,
      real_locked_report:              report.report_status,
    },
    invariant_violations:              [],
    ledger_smoke_passed:               true,
    baseline_hash,
    created_at:                        now,
    blocking_reason:                   null,
    ..._locked(),
  };
}

/**
 * Render a human-readable baseline summary.
 */
export function renderRealManualReleaseGateBaseline(result) {
  if (!result) return 'baseline: null';
  const lines = [
    `baseline_status              : ${result.baseline_status ?? 'UNKNOWN'}`,
    `baseline_version             : ${result.baseline_version ?? 'none'}`,
    `modules_verified             : ${result.modules_verified?.length ?? 0}`,
    `ledger_smoke_passed          : ${result.ledger_smoke_passed ?? false}`,
    `production_execution_locked  : true`,
    `unlock_required              : true`,
    `immutable                    : true`,
    `blocking_reason              : ${result.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-manual-release-gate-baseline.mjs')) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');

  const result = runRealManualReleaseGateBaseline();

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealManualReleaseGateBaseline(result));
  }

  process.exit(result.baseline_ready ? 0 : 1);
}
