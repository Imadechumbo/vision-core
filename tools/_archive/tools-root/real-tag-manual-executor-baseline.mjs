#!/usr/bin/env node
/**
 * Real Tag Manual Executor Baseline — V85.0
 *
 * Capstone baseline for V81.0–V84.1 Real Tag Manual Executor layer.
 * Verifies all 8 modules, 9 test scripts, invariants, and pipeline.
 *
 * REGRA ABSOLUTA: All execution flags false always (except real_tag_execution_allowed
 * which may be true only in armed_guard fixture). real_execution_not_performed=true.
 * ready_for_one_shot_execution=true when baseline passes.
 */

import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const SCHEMA_VERSION = 'v85.0';

export const MANUAL_EXECUTOR_BASELINE_STATUSES = [
  'MANUAL_EXEC_BASELINE_BLOCKED_MODULES',
  'MANUAL_EXEC_BASELINE_BLOCKED_TESTS',
  'MANUAL_EXEC_BASELINE_BLOCKED_INVARIANTS',
  'MANUAL_EXEC_BASELINE_BLOCKED_PIPELINE',
  'MANUAL_EXEC_BASELINE_READY_FOR_ONE_SHOT_EXECUTION',
];

const REQUIRED_MODULES = [
  'tools/real-tag-manual-executor-contract.mjs',
  'tools/real-tag-manual-confirmation-contract.mjs',
  'tools/real-tag-manual-safety-lock.mjs',
  'tools/real-tag-manual-command-builder.mjs',
  'tools/real-tag-manual-dry-run-executor.mjs',
  'tools/real-tag-manual-execution-receipt-preview.mjs',
  'tools/real-tag-manual-armed-executor-guard.mjs',
  'tools/real-tag-manual-executor-audit-plan.mjs',
];

const REQUIRED_TEST_SCRIPTS = [
  'test:manual-exec-contract-unit',
  'test:manual-confirmation-unit',
  'test:manual-safety-lock-unit',
  'test:manual-command-builder-unit',
  'test:manual-dry-run-executor-unit',
  'test:manual-receipt-preview-unit',
  'test:manual-armed-guard-unit',
  'test:manual-audit-plan-unit',
  'test:real-tag-manual-exec-baseline-unit',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
    ready_for_one_shot_execution: false,
  };
}

function _locked_ready() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
    ready_for_one_shot_execution: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                  SCHEMA_VERSION,
    baseline_status:                 status,
    baseline_ready:                  false,
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
  return failures;
}

export async function evaluateRealTagManualExecutorBaseline(params = {}) {
  const {
    fixture_mode    = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const baseline_id = _sha256(`real-tag-manual-executor-baseline:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  // ── 1. Module check ────────────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkModules();
    if (missing.length > 0) {
      return _blocked('MANUAL_EXEC_BASELINE_BLOCKED_MODULES', 'required_modules_missing', {
        baseline_id,
        missing_modules:              missing,
        modules_verified:             false,
        test_scripts_verified:        false,
        invariants_verified:          false,
        pipeline_verified:            false,
        contract_verified:            false,
        confirmation_verified:        false,
        safety_lock_verified:         false,
        command_builder_verified:     false,
        dry_run_verified:             false,
        receipt_preview_verified:     false,
        armed_guard_verified:         false,
        audit_plan_verified:          false,
        created_at:                   now,
      });
    }
  }

  // ── 2. Test script check ───────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkTestScripts();
    if (missing.length > 0) {
      return _blocked('MANUAL_EXEC_BASELINE_BLOCKED_TESTS', 'required_test_scripts_missing', {
        baseline_id,
        missing_test_scripts:         missing,
        modules_verified:             true,
        test_scripts_verified:        false,
        invariants_verified:          false,
        pipeline_verified:            false,
        contract_verified:            false,
        confirmation_verified:        false,
        safety_lock_verified:         false,
        command_builder_verified:     false,
        dry_run_verified:             false,
        receipt_preview_verified:     false,
        armed_guard_verified:         false,
        audit_plan_verified:          false,
        created_at:                   now,
      });
    }
  }

  // ── 3. Invariant check ─────────────────────────────────────────
  const { createRealTagManualExecutorContract }          = await import('./real-tag-manual-executor-contract.mjs');
  const { createRealTagManualConfirmationContract }      = await import('./real-tag-manual-confirmation-contract.mjs');
  const { evaluateRealTagManualSafetyLock }              = await import('./real-tag-manual-safety-lock.mjs');
  const { buildRealTagManualCommands }                   = await import('./real-tag-manual-command-builder.mjs');
  const { runRealTagManualDryRunExecutor }               = await import('./real-tag-manual-dry-run-executor.mjs');
  const { buildRealTagManualReceiptPreview }             = await import('./real-tag-manual-execution-receipt-preview.mjs');
  const { evaluateRealTagManualArmedExecutorGuard }      = await import('./real-tag-manual-armed-executor-guard.mjs');
  const { buildRealTagManualExecutorAuditPlan }          = await import('./real-tag-manual-executor-audit-plan.mjs');

  const fixtureContract = createRealTagManualExecutorContract({ fixture_mode: true, _mock_timestamp: now });
  const invariantFailures = _verifyInvariants(fixtureContract);
  if (invariantFailures.length > 0) {
    return _blocked('MANUAL_EXEC_BASELINE_BLOCKED_INVARIANTS', 'invariant_violations_detected', {
      baseline_id,
      invariant_failures:           invariantFailures,
      modules_verified:             true,
      test_scripts_verified:        true,
      invariants_verified:          false,
      pipeline_verified:            false,
      contract_verified:            false,
      confirmation_verified:        false,
      safety_lock_verified:         false,
      command_builder_verified:     false,
      dry_run_verified:             false,
      receipt_preview_verified:     false,
      armed_guard_verified:         false,
      audit_plan_verified:          false,
      created_at:                   now,
    });
  }

  // ── 4. Pipeline check ──────────────────────────────────────────
  const confirmation    = createRealTagManualConfirmationContract({ fixture_mode: true, _mock_timestamp: now });
  const safetyLock      = evaluateRealTagManualSafetyLock({ fixture_mode: true, _mock_timestamp: now });
  const commandBuilder  = buildRealTagManualCommands({ fixture_mode: true, _mock_timestamp: now });
  const dryRun          = runRealTagManualDryRunExecutor({ fixture_mode: true, _mock_timestamp: now });
  const receiptPreview  = buildRealTagManualReceiptPreview({ fixture_mode: true, _mock_timestamp: now });
  const armedGuard      = evaluateRealTagManualArmedExecutorGuard({ fixture_mode: true, _mock_timestamp: now });
  const auditPlan       = buildRealTagManualExecutorAuditPlan({ fixture_mode: true, _mock_timestamp: now });

  const contractOk        = fixtureContract.manual_executor_contract_ready === true;
  const confirmationOk    = confirmation.manual_confirmation_ready === true;
  const safetyLockOk      = safetyLock.safety_lock_ready === true;
  const commandBuilderOk  = commandBuilder.command_preview_ready === true;
  const dryRunOk          = dryRun.dry_run_ready === true;
  const receiptPreviewOk  = receiptPreview.receipt_preview_ready === true;
  const armedGuardOk      = armedGuard.armed_guard_ready === true;
  const auditPlanOk       = auditPlan.audit_plan_ready === true;

  const pipelineOk = contractOk && confirmationOk && safetyLockOk && commandBuilderOk &&
                     dryRunOk && receiptPreviewOk && armedGuardOk && auditPlanOk;

  if (!pipelineOk) {
    return _blocked('MANUAL_EXEC_BASELINE_BLOCKED_PIPELINE', 'pipeline_verification_failed', {
      baseline_id,
      modules_verified:             true,
      test_scripts_verified:        true,
      invariants_verified:          true,
      pipeline_verified:            false,
      contract_verified:            contractOk,
      confirmation_verified:        confirmationOk,
      safety_lock_verified:         safetyLockOk,
      command_builder_verified:     commandBuilderOk,
      dry_run_verified:             dryRunOk,
      receipt_preview_verified:     receiptPreviewOk,
      armed_guard_verified:         armedGuardOk,
      audit_plan_verified:          auditPlanOk,
      created_at:                   now,
    });
  }

  return {
    schema_version:               SCHEMA_VERSION,
    baseline_id,
    baseline_status:              'MANUAL_EXEC_BASELINE_READY_FOR_ONE_SHOT_EXECUTION',
    baseline_ready:               true,
    blocking_reason:              null,
    modules_verified:             true,
    test_scripts_verified:        true,
    invariants_verified:          true,
    pipeline_verified:            true,
    contract_verified:            true,
    confirmation_verified:        true,
    safety_lock_verified:         true,
    command_builder_verified:     true,
    dry_run_verified:             true,
    receipt_preview_verified:     true,
    armed_guard_verified:         true,
    audit_plan_verified:          true,
    required_modules_count:       REQUIRED_MODULES.length,
    required_test_scripts_count:  REQUIRED_TEST_SCRIPTS.length,
    created_at:                   now,
    ..._locked_ready(),
  };
}

export function renderRealTagManualExecutorBaseline(result) {
  if (!result) return 'real_tag_manual_executor_baseline: null';
  return [
    `baseline_status               : ${result.baseline_status ?? 'UNKNOWN'}`,
    `baseline_id                   : ${result.baseline_id ?? 'none'}`,
    `modules_verified              : ${result.modules_verified ?? false}`,
    `test_scripts_verified         : ${result.test_scripts_verified ?? false}`,
    `invariants_verified           : ${result.invariants_verified ?? false}`,
    `pipeline_verified             : ${result.pipeline_verified ?? false}`,
    `contract_verified             : ${result.contract_verified ?? false}`,
    `confirmation_verified         : ${result.confirmation_verified ?? false}`,
    `safety_lock_verified          : ${result.safety_lock_verified ?? false}`,
    `command_builder_verified      : ${result.command_builder_verified ?? false}`,
    `dry_run_verified              : ${result.dry_run_verified ?? false}`,
    `receipt_preview_verified      : ${result.receipt_preview_verified ?? false}`,
    `armed_guard_verified          : ${result.armed_guard_verified ?? false}`,
    `audit_plan_verified           : ${result.audit_plan_verified ?? false}`,
    `tag_created                   : false`,
    `git_push_performed            : false`,
    `deploy_performed              : false`,
    `stable_promoted               : false`,
    `release_performed             : false`,
    `real_execution_not_performed  : true`,
    `ready_for_one_shot_execution  : ${result.ready_for_one_shot_execution ?? false}`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-executor-baseline.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = await evaluateRealTagManualExecutorBaseline({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagManualExecutorBaseline(result));
  }

  process.exit(result.baseline_ready ? 0 : 1);
}
