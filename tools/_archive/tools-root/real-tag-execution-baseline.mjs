#!/usr/bin/env node
/**
 * Real Tag Execution Baseline — V90.0
 *
 * Capstone baseline for V86.0–V89.0 Real Tag Execution layer.
 * Verifies all 8 modules, 8 test scripts, invariants, and pipeline.
 *
 * real_tag_capability_available=true when baseline passes.
 * actual_real_tag_created=false always (baseline does not create tags).
 *
 * REGRA ABSOLUTA: All execution flags false. actual_real_tag_created=false always.
 */

import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const SCHEMA_VERSION = 'v90.0';

export const EXEC_BASELINE_STATUSES = [
  'EXEC_BASELINE_BLOCKED_MODULES',
  'EXEC_BASELINE_BLOCKED_TESTS',
  'EXEC_BASELINE_BLOCKED_INVARIANTS',
  'EXEC_BASELINE_BLOCKED_PIPELINE',
  'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
];

const REQUIRED_MODULES = [
  'tools/real-tag-one-shot-execution-controller.mjs',
  'tools/real-tag-one-shot-local-executor.mjs',
  'tools/real-tag-one-shot-post-execution-verifier.mjs',
  'tools/real-tag-one-shot-rollback-executor.mjs',
  'tools/real-tag-execution-receipt.mjs',
  'tools/real-tag-execution-audit-ledger.mjs',
  'tools/real-tag-execution-report.mjs',
  'tools/real-tag-manual-executor-baseline.mjs',
];

const REQUIRED_TEST_SCRIPTS = [
  'test:real-tag-exec-controller-unit',
  'test:real-tag-local-exec-unit',
  'test:real-tag-post-exec-unit',
  'test:real-tag-rollback-exec-unit',
  'test:real-tag-exec-receipt-unit',
  'test:real-tag-exec-ledger-unit',
  'test:real-tag-exec-report-unit',
  'test:real-tag-exec-baseline-unit',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    actual_real_tag_created:      false,
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
  };
}

function _locked_ready() {
  return {
    actual_real_tag_created:      false,
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
    real_tag_capability_available: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    baseline_status: status,
    baseline_ready:  false,
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
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.tag_created             === true) failures.push('tag_created must be false');
  if (result.git_push_performed      === true) failures.push('git_push_performed must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  return failures;
}

export async function evaluateRealTagExecutionBaseline(params = {}) {
  const {
    fixture_mode    = false,
    _mock_timestamp,
  } = params ?? {};

  const now         = _mock_timestamp ?? new Date().toISOString();
  const baseline_id = _sha256(`real-tag-exec-baseline:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  // ── 1. Module check ────────────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkModules();
    if (missing.length > 0) {
      return _blocked('EXEC_BASELINE_BLOCKED_MODULES', 'required_modules_missing', {
        baseline_id,
        missing_modules:              missing,
        modules_verified:             false,
        test_scripts_verified:        false,
        invariants_verified:          false,
        pipeline_verified:            false,
        controller_verified:          false,
        local_executor_verified:      false,
        post_verifier_verified:       false,
        rollback_executor_verified:   false,
        receipt_verified:             false,
        ledger_verified:              false,
        report_verified:              false,
        manual_baseline_verified:     false,
        created_at:                   now,
      });
    }
  }

  // ── 2. Test script check ───────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkTestScripts();
    if (missing.length > 0) {
      return _blocked('EXEC_BASELINE_BLOCKED_TESTS', 'required_test_scripts_missing', {
        baseline_id,
        missing_test_scripts:         missing,
        modules_verified:             true,
        test_scripts_verified:        false,
        invariants_verified:          false,
        pipeline_verified:            false,
        controller_verified:          false,
        local_executor_verified:      false,
        post_verifier_verified:       false,
        rollback_executor_verified:   false,
        receipt_verified:             false,
        ledger_verified:              false,
        report_verified:              false,
        manual_baseline_verified:     false,
        created_at:                   now,
      });
    }
  }

  // ── 3. Invariant check ─────────────────────────────────────────
  const { evaluateRealTagExecutionController }    = await import('./real-tag-one-shot-execution-controller.mjs');
  const { runRealTagOneShotLocalExecutor }        = await import('./real-tag-one-shot-local-executor.mjs');
  const { runPostExecutionVerifier }              = await import('./real-tag-one-shot-post-execution-verifier.mjs');
  const { runRealTagRollbackExecutor }            = await import('./real-tag-one-shot-rollback-executor.mjs');
  const { buildRealTagExecutionReceipt }          = await import('./real-tag-execution-receipt.mjs');
  const { buildRealTagExecutionAuditLedger }      = await import('./real-tag-execution-audit-ledger.mjs');
  const { buildRealTagExecutionReport }           = await import('./real-tag-execution-report.mjs');
  const { evaluateRealTagManualExecutorBaseline } = await import('./real-tag-manual-executor-baseline.mjs');

  const fixtureController = evaluateRealTagExecutionController({ fixture_mode: true, _mock_timestamp: now });
  const invariantFailures = _verifyInvariants(fixtureController);
  if (invariantFailures.length > 0) {
    return _blocked('EXEC_BASELINE_BLOCKED_INVARIANTS', 'invariant_violations_detected', {
      baseline_id,
      invariant_failures:           invariantFailures,
      modules_verified:             true,
      test_scripts_verified:        true,
      invariants_verified:          false,
      pipeline_verified:            false,
      controller_verified:          false,
      local_executor_verified:      false,
      post_verifier_verified:       false,
      rollback_executor_verified:   false,
      receipt_verified:             false,
      ledger_verified:              false,
      report_verified:              false,
      manual_baseline_verified:     false,
      created_at:                   now,
    });
  }

  // ── 4. Pipeline check ──────────────────────────────────────────
  const localExecutor   = runRealTagOneShotLocalExecutor({ fixture_mode: true, _mock_timestamp: now });
  const postVerifier    = runPostExecutionVerifier({ fixture_mode: true, _mock_timestamp: now });
  const rollbackExec    = runRealTagRollbackExecutor({ fixture_mode: true, _mock_timestamp: now });
  const receipt         = buildRealTagExecutionReceipt({ fixture_mode: true, _mock_timestamp: now });
  const auditLedger     = buildRealTagExecutionAuditLedger({ fixture_mode: true, _mock_timestamp: now });
  const report          = buildRealTagExecutionReport({ fixture_mode: true, _mock_timestamp: now });
  const manualBaseline  = await evaluateRealTagManualExecutorBaseline({ fixture_mode: true, _mock_timestamp: now });

  const controllerOk        = fixtureController.execution_controller_ready === true;
  const localExecutorOk     = localExecutor.executor_ready                  === true;
  const postVerifierOk      = postVerifier.verification_passed              === true;
  const rollbackExecutorOk  = rollbackExec.rollback_ready                   === true;
  const receiptOk           = receipt.receipt_ready                         === true;
  const ledgerOk            = auditLedger.ledger_ready                      === true;
  const reportOk            = report.report_ready                           === true;
  const manualBaselineOk    = manualBaseline.baseline_ready                 === true;

  const pipelineOk = controllerOk && localExecutorOk && postVerifierOk && rollbackExecutorOk &&
                     receiptOk && ledgerOk && reportOk && manualBaselineOk;

  if (!pipelineOk) {
    return _blocked('EXEC_BASELINE_BLOCKED_PIPELINE', 'pipeline_verification_failed', {
      baseline_id,
      modules_verified:             true,
      test_scripts_verified:        true,
      invariants_verified:          true,
      pipeline_verified:            false,
      controller_verified:          controllerOk,
      local_executor_verified:      localExecutorOk,
      post_verifier_verified:       postVerifierOk,
      rollback_executor_verified:   rollbackExecutorOk,
      receipt_verified:             receiptOk,
      ledger_verified:              ledgerOk,
      report_verified:              reportOk,
      manual_baseline_verified:     manualBaselineOk,
      created_at:                   now,
    });
  }

  return {
    schema_version:               SCHEMA_VERSION,
    baseline_id,
    baseline_status:              'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
    baseline_ready:               true,
    blocking_reason:              null,
    modules_verified:             true,
    test_scripts_verified:        true,
    invariants_verified:          true,
    pipeline_verified:            true,
    controller_verified:          true,
    local_executor_verified:      true,
    post_verifier_verified:       true,
    rollback_executor_verified:   true,
    receipt_verified:             true,
    ledger_verified:              true,
    report_verified:              true,
    manual_baseline_verified:     true,
    required_modules_count:       REQUIRED_MODULES.length,
    required_test_scripts_count:  REQUIRED_TEST_SCRIPTS.length,
    created_at:                   now,
    ..._locked_ready(),
  };
}

export function renderRealTagExecutionBaseline(result) {
  if (!result) return 'real_tag_execution_baseline: null';
  return [
    `baseline_status               : ${result.baseline_status ?? 'UNKNOWN'}`,
    `baseline_id                   : ${result.baseline_id ?? 'none'}`,
    `modules_verified              : ${result.modules_verified ?? false}`,
    `test_scripts_verified         : ${result.test_scripts_verified ?? false}`,
    `invariants_verified           : ${result.invariants_verified ?? false}`,
    `pipeline_verified             : ${result.pipeline_verified ?? false}`,
    `controller_verified           : ${result.controller_verified ?? false}`,
    `local_executor_verified       : ${result.local_executor_verified ?? false}`,
    `post_verifier_verified        : ${result.post_verifier_verified ?? false}`,
    `rollback_executor_verified    : ${result.rollback_executor_verified ?? false}`,
    `receipt_verified              : ${result.receipt_verified ?? false}`,
    `ledger_verified               : ${result.ledger_verified ?? false}`,
    `report_verified               : ${result.report_verified ?? false}`,
    `manual_baseline_verified      : ${result.manual_baseline_verified ?? false}`,
    `real_tag_capability_available : ${result.real_tag_capability_available ?? false}`,
    `actual_real_tag_created       : false`,
    `tag_created                   : false`,
    `git_push_performed            : false`,
    `deploy_performed              : false`,
    `stable_promoted               : false`,
    `release_performed             : false`,
    `real_execution_not_performed  : true`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-execution-baseline.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = await evaluateRealTagExecutionBaseline({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagExecutionBaseline(result));
  }

  process.exit(result.baseline_ready ? 0 : 1);
}
