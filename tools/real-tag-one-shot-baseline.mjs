#!/usr/bin/env node
/**
 * Real Tag One-Shot Baseline — V80.0
 *
 * Capstone baseline for V76–V79 Real Tag One-Shot layer.
 * Verifies all 8 modules, 9 test scripts, invariants, and preparation pipeline.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * future_manual_executor_required=true always.
 * No real tag, push, deploy, stable, or release.
 */

import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const SCHEMA_VERSION = 'v80.0';

export const REAL_TAG_BASELINE_STATUSES = [
  'REAL_TAG_BASELINE_BLOCKED_MODULES',
  'REAL_TAG_BASELINE_BLOCKED_TESTS',
  'REAL_TAG_BASELINE_BLOCKED_INVARIANTS',
  'REAL_TAG_BASELINE_BLOCKED_PIPELINE',
  'REAL_TAG_BASELINE_READY_FOR_FUTURE_MANUAL_EXECUTOR',
];

const REQUIRED_MODULES = [
  'tools/real-tag-one-shot-contract.mjs',
  'tools/real-tag-human-confirmation-binding.mjs',
  'tools/real-tag-one-shot-safety-validator.mjs',
  'tools/real-tag-rollback-anchor.mjs',
  'tools/real-tag-one-shot-executor.mjs',
  'tools/real-tag-one-shot-armed-guard.mjs',
  'tools/real-tag-one-shot-audit-ledger.mjs',
  'tools/real-tag-one-shot-report.mjs',
];

const REQUIRED_TEST_SCRIPTS = [
  'test:tag-one-shot-contract-unit',
  'test:tag-confirmation-binding-unit',
  'test:tag-safety-validator-unit',
  'test:tag-rollback-anchor-unit',
  'test:tag-one-shot-executor-unit',
  'test:tag-armed-guard-unit',
  'test:tag-audit-ledger-unit',
  'test:tag-one-shot-report-unit',
  'test:real-tag-baseline-unit',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                      false,
    git_push_performed:               false,
    deploy_performed:                 false,
    stable_promoted:                  false,
    release_performed:                false,
    real_execution_armed:             false,
    future_manual_executor_required:  true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:              SCHEMA_VERSION,
    real_tag_baseline_status:    status,
    real_tag_baseline_ready:     false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

function _checkModules() {
  const missing = [];
  for (const mod of REQUIRED_MODULES) {
    if (!existsSync(join(ROOT, mod))) missing.push(mod);
  }
  return missing;
}

function _checkTestScripts() {
  const missing = [];
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    for (const script of REQUIRED_TEST_SCRIPTS) {
      if (!pkg.scripts?.[script]) missing.push(script);
    }
  } catch (_) {
    return REQUIRED_TEST_SCRIPTS.slice();
  }
  return missing;
}

function _verifyInvariants(result) {
  const failures = [];
  if (result.tag_created          === true) failures.push('tag_created must be false');
  if (result.git_push_performed   === true) failures.push('git_push_performed must be false');
  if (result.deploy_performed     === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted      === true) failures.push('stable_promoted must be false');
  if (result.release_performed    === true) failures.push('release_performed must be false');
  if (result.real_execution_armed === true) failures.push('real_execution_armed must be false');
  return failures;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

export async function evaluateRealTagOneShotBaseline(params = {}) {
  const {
    fixture_mode    = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const baseline_id = _sha256(`real-tag-one-shot-baseline:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  // ── 1. Module check ────────────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkModules();
    if (missing.length > 0) {
      return _blocked('REAL_TAG_BASELINE_BLOCKED_MODULES', 'required_modules_missing', {
        baseline_id,
        missing_modules:             missing,
        modules_verified:            false,
        test_scripts_verified:       false,
        invariants_verified:         false,
        pipeline_verified:           false,
        dry_run_verified:            false,
        rollback_anchor_verified:    false,
        armed_guard_verified:        false,
        ledger_verified:             false,
        report_verified:             false,
        one_shot_preparation_verified: false,
        created_at:                  now,
      });
    }
  }

  // ── 2. Test script check ───────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkTestScripts();
    if (missing.length > 0) {
      return _blocked('REAL_TAG_BASELINE_BLOCKED_TESTS', 'required_test_scripts_missing', {
        baseline_id,
        missing_test_scripts:        missing,
        modules_verified:            true,
        test_scripts_verified:       false,
        invariants_verified:         false,
        pipeline_verified:           false,
        dry_run_verified:            false,
        rollback_anchor_verified:    false,
        armed_guard_verified:        false,
        ledger_verified:             false,
        report_verified:             false,
        one_shot_preparation_verified: false,
        created_at:                  now,
      });
    }
  }

  // ── 3. Invariant check ─────────────────────────────────────────
  const { createRealTagOneShotContract }     = await import('./real-tag-one-shot-contract.mjs');
  const { bindRealTagHumanConfirmation }     = await import('./real-tag-human-confirmation-binding.mjs');
  const { validateRealTagOneShotSafety }     = await import('./real-tag-one-shot-safety-validator.mjs');
  const { createRealTagRollbackAnchor }      = await import('./real-tag-rollback-anchor.mjs');
  const { runRealTagOneShotExecutor }        = await import('./real-tag-one-shot-executor.mjs');
  const { evaluateRealTagOneShotArmedGuard } = await import('./real-tag-one-shot-armed-guard.mjs');
  const { createRealTagAuditLedger, appendRealTagAuditEvent } = await import('./real-tag-one-shot-audit-ledger.mjs');
  const { buildRealTagOneShotReport }        = await import('./real-tag-one-shot-report.mjs');

  const fixtureContract = createRealTagOneShotContract({ fixture_mode: true, _mock_timestamp: now });
  const invariantFailures = _verifyInvariants(fixtureContract);
  if (invariantFailures.length > 0) {
    return _blocked('REAL_TAG_BASELINE_BLOCKED_INVARIANTS', 'invariant_violations_detected', {
      baseline_id,
      invariant_failures:          invariantFailures,
      modules_verified:            true,
      test_scripts_verified:       true,
      invariants_verified:         false,
      pipeline_verified:           false,
      dry_run_verified:            false,
      rollback_anchor_verified:    false,
      armed_guard_verified:        false,
      ledger_verified:             false,
      report_verified:             false,
      one_shot_preparation_verified: false,
      created_at:                  now,
    });
  }

  // ── 4. Pipeline check ──────────────────────────────────────────
  const binding      = bindRealTagHumanConfirmation({ fixture_mode: true, _mock_timestamp: now });
  const safety       = validateRealTagOneShotSafety({ fixture_mode: true, _mock_timestamp: now });
  const anchor       = createRealTagRollbackAnchor({ fixture_mode: true, _mock_timestamp: now });
  const executor     = runRealTagOneShotExecutor({ fixture_mode: true, _mock_timestamp: now });
  const guard        = evaluateRealTagOneShotArmedGuard({ fixture_mode: true, _mock_timestamp: now });
  const ledger       = createRealTagAuditLedger();
  appendRealTagAuditEvent(ledger, 'REAL_TAG_CONTRACT_READY_REVIEW', {
    target_tag: 'v1.2.3', evidence_refs: [fixtureContract.one_shot_contract_id ?? 'fixture'],
    _mock_timestamp: now,
  });
  const report       = buildRealTagOneShotReport({ fixture_mode: true, _mock_timestamp: now });

  const dryRunOk      = executor.executor_status  === 'TAG_EXECUTOR_DRY_RUN_READY';
  const rollbackOk    = anchor.rollback_anchor_status === 'TAG_ROLLBACK_ANCHOR_READY';
  const armedOk       = guard.armed_guard_status   === 'TAG_ARMED_READY_BUT_NOT_EXECUTED';
  const ledgerOk      = ledger.event_count         >= 1;
  const reportOk      = report.tag_report_status   === 'TAG_REPORT_READY_FOR_FUTURE_MANUAL_EXECUTOR';

  const pipelineOk = (
    fixtureContract.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW' &&
    binding.binding_status                   === 'TAG_CONFIRMATION_READY_REVIEW'       &&
    safety.tag_safety_ready                  === true                                  &&
    rollbackOk && dryRunOk && armedOk && ledgerOk && reportOk
  );

  if (!pipelineOk) {
    return _blocked('REAL_TAG_BASELINE_BLOCKED_PIPELINE', 'pipeline_verification_failed', {
      baseline_id,
      modules_verified:            true,
      test_scripts_verified:       true,
      invariants_verified:         true,
      pipeline_verified:           false,
      dry_run_verified:            dryRunOk,
      rollback_anchor_verified:    rollbackOk,
      armed_guard_verified:        armedOk,
      ledger_verified:             ledgerOk,
      report_verified:             reportOk,
      one_shot_preparation_verified: false,
      created_at:                  now,
    });
  }

  return {
    schema_version:               SCHEMA_VERSION,
    baseline_id,
    real_tag_baseline_status:     'REAL_TAG_BASELINE_READY_FOR_FUTURE_MANUAL_EXECUTOR',
    real_tag_baseline_ready:      true,
    blocking_reason:              null,
    modules_verified:             true,
    test_scripts_verified:        true,
    invariants_verified:          true,
    pipeline_verified:            true,
    dry_run_verified:             true,
    rollback_anchor_verified:     true,
    armed_guard_verified:         true,
    ledger_verified:              true,
    report_verified:              true,
    one_shot_preparation_verified: true,
    required_modules_count:       REQUIRED_MODULES.length,
    required_test_scripts_count:  REQUIRED_TEST_SCRIPTS.length,
    created_at:                   now,
    ..._locked(),
  };
}

export function renderRealTagOneShotBaseline(result) {
  if (!result) return 'real_tag_one_shot_baseline: null';
  return [
    `real_tag_baseline_status            : ${result.real_tag_baseline_status ?? 'UNKNOWN'}`,
    `baseline_id                         : ${result.baseline_id ?? 'none'}`,
    `modules_verified                    : ${result.modules_verified ?? false}`,
    `test_scripts_verified               : ${result.test_scripts_verified ?? false}`,
    `invariants_verified                 : ${result.invariants_verified ?? false}`,
    `pipeline_verified                   : ${result.pipeline_verified ?? false}`,
    `dry_run_verified                    : ${result.dry_run_verified ?? false}`,
    `rollback_anchor_verified            : ${result.rollback_anchor_verified ?? false}`,
    `armed_guard_verified                : ${result.armed_guard_verified ?? false}`,
    `ledger_verified                     : ${result.ledger_verified ?? false}`,
    `report_verified                     : ${result.report_verified ?? false}`,
    `one_shot_preparation_verified       : ${result.one_shot_preparation_verified ?? false}`,
    `tag_created                         : false`,
    `git_push_performed                  : false`,
    `deploy_performed                    : false`,
    `stable_promoted                     : false`,
    `release_performed                   : false`,
    `real_execution_armed                : false`,
    `future_manual_executor_required     : true`,
    `blocking_reason                     : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-baseline.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = await evaluateRealTagOneShotBaseline({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagOneShotBaseline(result));
  }

  process.exit(result.real_tag_baseline_ready ? 0 : 1);
}
