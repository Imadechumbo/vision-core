#!/usr/bin/env node
/**
 * Release Execution Sandbox Baseline — V55.0
 *
 * Validates that all sandbox/rehearsal modules are present, loaded, and
 * enforce the correct invariants. Aggregates module status into a single
 * baseline readiness report. Never executes any action.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * local_only=true, rehearsal_only=true, human_review_required=true always.
 */

import { createHash } from 'crypto';

import {
  createReleaseExecutionSandbox,
  SANDBOX_STATUSES,
} from './release-execution-sandbox-contract.mjs';

import {
  createSandboxOperationPolicy,
  SANDBOX_ALLOWED_OPERATIONS,
  SANDBOX_BLOCKED_OPERATIONS,
} from './sandbox-operation-policy.mjs';

import {
  runReleaseCommandSimulator,
  SIMULATED_COMMAND_TYPES,
} from './release-command-simulator.mjs';

import {
  buildImmutableReleaseRehearsalPlan,
  REHEARSAL_PLAN_STATUSES,
} from './immutable-release-rehearsal-plan.mjs';

import {
  runReleaseRehearsal,
  REHEARSAL_STATUSES,
} from './release-rehearsal-executor.mjs';

import {
  appendRehearsalLedgerEvent,
  verifyRehearsalLedgerChain,
  _resetRehearsalLedgerForTest,
  REHEARSAL_LEDGER_EVENT_TYPES,
  REHEARSAL_LEDGER_STATUSES,
} from './release-rehearsal-ledger.mjs';

import {
  buildReleaseRehearsalReport,
  REHEARSAL_REPORT_STATUSES,
  REPORT_BLOCKED_ACTIONS,
  REPORT_SAFE_NEXT_ACTIONS,
} from './release-rehearsal-report.mjs';

const SCHEMA_VERSION   = 'v55.0';
const BASELINE_VERSION = 'v55.0';

export const SANDBOX_BASELINE_STATUSES = [
  'SANDBOX_BASELINE_BLOCKED_MODULES',
  'SANDBOX_BASELINE_BLOCKED_TESTS',
  'SANDBOX_BASELINE_BLOCKED_INVARIANTS',
  'SANDBOX_BASELINE_BLOCKED_REHEARSAL',
  'SANDBOX_BASELINE_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

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
    human_review_required:     true,
    local_only:                true,
    rehearsal_only:            true,
    sandbox_only:              true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    baseline_version: BASELINE_VERSION,
    baseline_status: status,
    baseline_ready:  false,
    blocking_reason,
    ...extra,
    ..._locked(),
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_execution_allowed: false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
    human_review_required:     true,
    local_only:                true,
    rehearsal_only:            true,
    sandbox_only:              true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Run the release execution sandbox baseline check.
 */
export function runReleaseExecutionSandboxBaseline(params = {}) {
  const { _mock_timestamp } = params ?? {};
  const now = _mock_timestamp ?? new Date().toISOString();

  // ── 1. Module presence check ────────────────────────────────────
  const modules = {
    sandbox_contract:      typeof createReleaseExecutionSandbox === 'function',
    sandbox_policy:        typeof createSandboxOperationPolicy === 'function',
    command_simulator:     typeof runReleaseCommandSimulator === 'function',
    rehearsal_plan:        typeof buildImmutableReleaseRehearsalPlan === 'function',
    rehearsal_executor:    typeof runReleaseRehearsal === 'function',
    rehearsal_ledger:      typeof appendRehearsalLedgerEvent === 'function',
    rehearsal_report:      typeof buildReleaseRehearsalReport === 'function',
  };

  const missingModules = Object.entries(modules)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  if (missingModules.length > 0) {
    return _blocked('SANDBOX_BASELINE_BLOCKED_MODULES', 'modules_missing', {
      missing_modules: missingModules,
    });
  }

  // ── 2. Constants check ──────────────────────────────────────────
  const constantsOk = (
    Array.isArray(SANDBOX_STATUSES)          && SANDBOX_STATUSES.length >= 4 &&
    Array.isArray(SANDBOX_ALLOWED_OPERATIONS) && SANDBOX_ALLOWED_OPERATIONS.length >= 6 &&
    Array.isArray(SANDBOX_BLOCKED_OPERATIONS) && SANDBOX_BLOCKED_OPERATIONS.length >= 6 &&
    Array.isArray(SIMULATED_COMMAND_TYPES)   && SIMULATED_COMMAND_TYPES.length >= 5 &&
    Array.isArray(REHEARSAL_PLAN_STATUSES)   && REHEARSAL_PLAN_STATUSES.length >= 3 &&
    Array.isArray(REHEARSAL_STATUSES)        && REHEARSAL_STATUSES.length >= 3 &&
    Array.isArray(REHEARSAL_LEDGER_EVENT_TYPES) && REHEARSAL_LEDGER_EVENT_TYPES.length === 6 &&
    Array.isArray(REHEARSAL_LEDGER_STATUSES) && REHEARSAL_LEDGER_STATUSES.length === 5 &&
    Array.isArray(REHEARSAL_REPORT_STATUSES) && REHEARSAL_REPORT_STATUSES.length === 3 &&
    Array.isArray(REPORT_BLOCKED_ACTIONS)    && REPORT_BLOCKED_ACTIONS.length === 6 &&
    Array.isArray(REPORT_SAFE_NEXT_ACTIONS)  && REPORT_SAFE_NEXT_ACTIONS.length === 5
  );

  if (!constantsOk) {
    return _blocked('SANDBOX_BASELINE_BLOCKED_MODULES', 'constants_invalid');
  }

  // ── 3. Fixture smoke tests ──────────────────────────────────────
  const sandbox  = createReleaseExecutionSandbox({ fixture_mode: true, _mock_timestamp: now });
  const policy   = createSandboxOperationPolicy({ fixture_mode: true, _mock_timestamp: now });
  const sim      = runReleaseCommandSimulator({ fixture_mode: true, _mock_timestamp: now });
  const plan     = buildImmutableReleaseRehearsalPlan({ fixture_mode: true, _mock_timestamp: now });
  const rehearsal = runReleaseRehearsal({ fixture_mode: true, _mock_timestamp: now });
  const report   = buildReleaseRehearsalReport({ fixture_mode: true, _mock_timestamp: now });

  const fixtureOk = (
    sandbox.sandbox_ready        === true &&
    policy.policy_ready          === true &&
    sim.simulator_ready          === true &&
    plan.rehearsal_plan_ready    === true &&
    rehearsal.rehearsal_ready    === true &&
    report.report_ready          === true
  );

  if (!fixtureOk) {
    const failed = [];
    if (sandbox.sandbox_ready        !== true) failed.push('sandbox_contract');
    if (policy.policy_ready          !== true) failed.push('sandbox_policy');
    if (sim.simulator_ready          !== true) failed.push('command_simulator');
    if (plan.rehearsal_plan_ready    !== true) failed.push('rehearsal_plan');
    if (rehearsal.rehearsal_ready    !== true) failed.push('rehearsal_executor');
    if (report.report_ready          !== true) failed.push('rehearsal_report');
    return _blocked('SANDBOX_BASELINE_BLOCKED_TESTS', 'fixture_smoke_failed', {
      failed_fixtures: failed,
    });
  }

  // ── 4. Invariant check across all fixture outputs ────────────────
  const outputs = [sandbox, policy, sim, plan, rehearsal, report];
  const invariantViolations = [];

  for (const [i, o] of outputs.entries()) {
    if (o.deploy_allowed            !== false) invariantViolations.push(`output[${i}].deploy_allowed`);
    if (o.promotion_allowed         !== false) invariantViolations.push(`output[${i}].promotion_allowed`);
    if (o.stable_allowed            !== false) invariantViolations.push(`output[${i}].stable_allowed`);
    if (o.tag_allowed               !== false) invariantViolations.push(`output[${i}].tag_allowed`);
    if (o.release_execution_allowed !== false) invariantViolations.push(`output[${i}].release_execution_allowed`);
    if (o.release_performed         !== false) invariantViolations.push(`output[${i}].release_performed`);
    if (o.tag_created               !== false) invariantViolations.push(`output[${i}].tag_created`);
    if (o.stable_promoted           !== false) invariantViolations.push(`output[${i}].stable_promoted`);
    if (o.deploy_performed          !== false) invariantViolations.push(`output[${i}].deploy_performed`);
  }

  if (invariantViolations.length > 0) {
    return _blocked('SANDBOX_BASELINE_BLOCKED_INVARIANTS', 'invariant_violation', {
      invariant_violations: invariantViolations,
    });
  }

  // ── 5. Ledger smoke test ─────────────────────────────────────────
  _resetRehearsalLedgerForTest();
  const ledgerAppend = appendRehearsalLedgerEvent({
    event_type:      'RELEASE_SANDBOX_CREATED',
    actor_id:        'baseline',
    rehearsal_id:    'baseline-rehearsal-id',
    evidence_refs:   ['baseline-receipt'],
    evidence_source: 'go-core',
    _mock_timestamp: now,
  });
  const ledgerChain = verifyRehearsalLedgerChain();
  _resetRehearsalLedgerForTest();

  if (ledgerAppend.appended !== true || ledgerChain.valid !== true) {
    return _blocked('SANDBOX_BASELINE_BLOCKED_REHEARSAL', 'ledger_smoke_failed', {
      ledger_append_ok: ledgerAppend.appended === true,
      ledger_chain_ok:  ledgerChain.valid === true,
    });
  }

  // ── 6. Baseline ready ────────────────────────────────────────────
  const baseline_id = _sha256(`sandbox-baseline:${now}`).slice(0, 24);

  return {
    schema_version:     SCHEMA_VERSION,
    baseline_version:   BASELINE_VERSION,
    baseline_id,
    baseline_status:    'SANDBOX_BASELINE_READY',
    baseline_ready:     true,
    modules_loaded:     Object.keys(modules).length,
    modules_ok:         Object.keys(modules),
    fixtures_verified:  outputs.length,
    invariants_checked: outputs.length * 9,
    ledger_smoke_ok:    true,
    blocking_reason:    null,
    created_at:         now,
    ..._locked(),
  };
}

/**
 * Render a human-readable baseline summary.
 */
export function renderReleaseExecutionSandboxBaseline(result) {
  if (!result) return 'baseline: null';
  const lines = [
    `baseline_status    : ${result.baseline_status ?? 'UNKNOWN'}`,
    `baseline_id        : ${result.baseline_id ?? 'none'}`,
    `baseline_version   : ${result.baseline_version ?? 'none'}`,
    `modules_loaded     : ${result.modules_loaded ?? 0}`,
    `fixtures_verified  : ${result.fixtures_verified ?? 0}`,
    `invariants_checked : ${result.invariants_checked ?? 0}`,
    `ledger_smoke_ok    : ${result.ledger_smoke_ok ?? false}`,
    `human_review_required : true`,
    `deploy_allowed     : false`,
    `blocking_reason    : ${result.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('release-execution-sandbox-baseline.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');

  const result = runReleaseExecutionSandboxBaseline();

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReleaseExecutionSandboxBaseline(result));
  }

  process.exit(result.baseline_ready ? 0 : 1);
}
