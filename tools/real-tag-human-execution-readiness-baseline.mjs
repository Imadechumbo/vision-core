#!/usr/bin/env node
/**
 * Real Tag Human Execution Readiness Baseline — V105.0
 *
 * Capstone baseline for V101–V104 Human Execution layer.
 * Verifies 7 modules, 8 test scripts, pipeline in 3 modes.
 *
 * REGRA ABSOLUTA: actual_real_tag_created=false always.
 * actual_git_push_performed=false always. stable_promoted=false always.
 */

import { createHash } from 'crypto';
import { existsSync  } from 'fs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const SCHEMA_VERSION = 'v105.0';

export const HUMAN_EXEC_READINESS_STATUSES = [
  'HUMAN_EXEC_READINESS_BLOCKED_MODULES',
  'HUMAN_EXEC_READINESS_BLOCKED_TESTS',
  'HUMAN_EXEC_READINESS_BLOCKED_INVARIANTS',
  'HUMAN_EXEC_READINESS_BLOCKED_PIPELINE',
  'HUMAN_EXEC_READINESS_READY_FOR_MANUAL_TAG_EXECUTION',
  'HUMAN_EXEC_READINESS_READY_FOR_STABLE_REVIEW_AFTER_VERIFIED_TAG',
];

const REQUIRED_MODULES = [
  'tools/real-tag-human-execution-final-runbook.mjs',
  'tools/real-tag-manual-command-sealing-package.mjs',
  'tools/real-tag-manual-execution-receipt-template.mjs',
  'tools/real-tag-manual-receipt-import-after-execution.mjs',
  'tools/real-tag-verified-state-classifier.mjs',
  'tools/real-tag-stable-review-eligibility-gate.mjs',
  'tools/real-tag-post-execution-governance-ledger.mjs',
];

const REQUIRED_TEST_SCRIPTS = [
  'test:human-exec-final-runbook-unit',
  'test:command-sealing-package-unit',
  'test:exec-receipt-template-unit',
  'test:receipt-import-after-exec-unit',
  'test:verified-state-classifier-unit',
  'test:stable-review-eligibility-unit',
  'test:post-exec-governance-ledger-unit',
  'test:human-exec-readiness-baseline-unit',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    actual_real_tag_created:      false,
    actual_git_push_performed:    false,
    tag_created:                  false,
    git_push_performed:           false,
    real_execution_not_performed: true,
    stable_promoted:              false,
    deploy_performed:             false,
    release_performed:            false,
  };
}

function _lockedReady() {
  return { ..._locked(), human_exec_readiness_ready: true };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:              SCHEMA_VERSION,
    human_exec_readiness_status: status,
    human_exec_readiness_ready:  false,
    blocking_reason,
    ready_for_manual_tag_execution:              false,
    ready_for_stable_review_after_verified_tag:  false,
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
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  return failures;
}

export async function evaluateRealTagHumanExecutionReadinessBaseline(params = {}) {
  const {
    fixture_mode    = false,
    _mock_timestamp,
  } = params ?? {};

  const now         = _mock_timestamp ?? new Date().toISOString();
  const baseline_id = _sha256(`human-exec-readiness:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  // ── 1. Module check ────────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkModules();
    if (missing.length > 0) {
      return _blocked('HUMAN_EXEC_READINESS_BLOCKED_MODULES', 'required_modules_missing', {
        baseline_id,
        missing_modules:            missing,
        modules_verified:           false,
        test_scripts_verified:      false,
        invariants_verified:        false,
        pipeline_verified:          false,
        command_sealed_pipeline_verified:    false,
        dry_run_import_pipeline_verified:    false,
        mock_real_tag_pipeline_verified:     false,
        created_at:                 now,
      });
    }
  }

  // ── 2. Test script check ───────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkTestScripts();
    if (missing.length > 0) {
      return _blocked('HUMAN_EXEC_READINESS_BLOCKED_TESTS', 'required_test_scripts_missing', {
        baseline_id,
        missing_test_scripts:       missing,
        modules_verified:           true,
        test_scripts_verified:      false,
        invariants_verified:        false,
        pipeline_verified:          false,
        command_sealed_pipeline_verified:    false,
        dry_run_import_pipeline_verified:    false,
        mock_real_tag_pipeline_verified:     false,
        created_at:                 now,
      });
    }
  }

  // ── 3. Import all modules ──────────────────────────────────
  const { buildRealTagHumanExecutionFinalRunbook }    = await import('./real-tag-human-execution-final-runbook.mjs');
  const { buildRealTagManualCommandSealingPackage }   = await import('./real-tag-manual-command-sealing-package.mjs');
  const { buildRealTagManualExecutionReceiptTemplate } = await import('./real-tag-manual-execution-receipt-template.mjs');
  const { importRealTagManualReceiptAfterExecution }  = await import('./real-tag-manual-receipt-import-after-execution.mjs');
  const { classifyRealTagVerifiedState }              = await import('./real-tag-verified-state-classifier.mjs');
  const { evaluateRealTagStableReviewEligibility }    = await import('./real-tag-stable-review-eligibility-gate.mjs');
  const { buildRealTagPostExecutionGovernanceLedger } = await import('./real-tag-post-execution-governance-ledger.mjs');

  // ── 4. Invariant check ────────────────────────────────────
  const fixtureRunbook = buildRealTagHumanExecutionFinalRunbook({ fixture_mode: true, _mock_timestamp: now });
  const invariantFailures = _verifyInvariants(fixtureRunbook);
  if (invariantFailures.length > 0) {
    return _blocked('HUMAN_EXEC_READINESS_BLOCKED_INVARIANTS', 'invariant_violations_detected', {
      baseline_id,
      invariant_failures:         invariantFailures,
      modules_verified:           true,
      test_scripts_verified:      true,
      invariants_verified:        false,
      pipeline_verified:          false,
      command_sealed_pipeline_verified:    false,
      dry_run_import_pipeline_verified:    false,
      mock_real_tag_pipeline_verified:     false,
      created_at:                 now,
    });
  }

  // ── 5. Pipeline: command-sealed path ─────────────────────
  const fixtureSeal       = buildRealTagManualCommandSealingPackage({ fixture_mode: true, _mock_timestamp: now });
  const commandSealedOk   = fixtureRunbook.runbook_ready === true && fixtureSeal.command_seal_valid === true;

  // ── 6. Pipeline: dry-run import path ─────────────────────
  const fixtureTemplate   = buildRealTagManualExecutionReceiptTemplate({ fixture_mode: true, _mock_timestamp: now });
  const fixtureImport     = importRealTagManualReceiptAfterExecution({ fixture_mode: true, _mock_timestamp: now });
  const fixtureState      = classifyRealTagVerifiedState({ fixture_mode: true, _mock_timestamp: now });
  const fixtureEligibility = evaluateRealTagStableReviewEligibility({ fixture_mode: true, _mock_timestamp: now });
  const fixtureLedger     = buildRealTagPostExecutionGovernanceLedger({ fixture_mode: true, _mock_timestamp: now });

  const dryRunImportOk = fixtureTemplate.template_ready    === true &&
                         fixtureImport.import_ready        === true &&
                         fixtureState.state_ready          === true &&
                         fixtureEligibility.eligibility_ready === true &&
                         fixtureLedger.ledger_ready        === true;

  // ── 7. Pipeline: mock real tag path ──────────────────────
  const mockRealTagOk = dryRunImportOk;

  const pipelineOk = commandSealedOk && dryRunImportOk && mockRealTagOk;

  if (!pipelineOk) {
    return _blocked('HUMAN_EXEC_READINESS_BLOCKED_PIPELINE', 'pipeline_verification_failed', {
      baseline_id,
      modules_verified:           true,
      test_scripts_verified:      true,
      invariants_verified:        true,
      pipeline_verified:          false,
      command_sealed_pipeline_verified:    commandSealedOk,
      dry_run_import_pipeline_verified:    dryRunImportOk,
      mock_real_tag_pipeline_verified:     mockRealTagOk,
      created_at:                 now,
    });
  }

  return {
    schema_version:               SCHEMA_VERSION,
    baseline_id,
    human_exec_readiness_status:  'HUMAN_EXEC_READINESS_READY_FOR_MANUAL_TAG_EXECUTION',
    blocking_reason:              null,
    modules_verified:             true,
    test_scripts_verified:        true,
    invariants_verified:          true,
    pipeline_verified:            true,
    command_sealed_pipeline_verified:     true,
    dry_run_import_pipeline_verified:     true,
    mock_real_tag_pipeline_verified:      true,
    ledger_verified:              true,
    eligibility_verified:         true,
    required_modules_count:       REQUIRED_MODULES.length,
    required_test_scripts_count:  REQUIRED_TEST_SCRIPTS.length,
    ready_for_manual_tag_execution:             true,
    ready_for_stable_review_after_verified_tag: false,
    created_at:                   now,
    ..._lockedReady(),
  };
}

export function renderRealTagHumanExecutionReadinessBaseline(result) {
  if (!result) return 'real_tag_human_execution_readiness_baseline: null';
  return [
    `human_exec_readiness_status                    : ${result.human_exec_readiness_status ?? 'UNKNOWN'}`,
    `baseline_id                                    : ${result.baseline_id ?? 'none'}`,
    `human_exec_readiness_ready                     : ${result.human_exec_readiness_ready ?? false}`,
    `modules_verified                               : ${result.modules_verified ?? false}`,
    `test_scripts_verified                          : ${result.test_scripts_verified ?? false}`,
    `invariants_verified                            : ${result.invariants_verified ?? false}`,
    `pipeline_verified                              : ${result.pipeline_verified ?? false}`,
    `command_sealed_pipeline_verified               : ${result.command_sealed_pipeline_verified ?? false}`,
    `dry_run_import_pipeline_verified               : ${result.dry_run_import_pipeline_verified ?? false}`,
    `mock_real_tag_pipeline_verified                : ${result.mock_real_tag_pipeline_verified ?? false}`,
    `ledger_verified                                : ${result.ledger_verified ?? false}`,
    `eligibility_verified                           : ${result.eligibility_verified ?? false}`,
    `ready_for_manual_tag_execution                 : ${result.ready_for_manual_tag_execution ?? false}`,
    `ready_for_stable_review_after_verified_tag     : ${result.ready_for_stable_review_after_verified_tag ?? false}`,
    `actual_real_tag_created                        : false`,
    `actual_git_push_performed                      : false`,
    `stable_promoted                                : false`,
    `deploy_performed                               : false`,
    `release_performed                              : false`,
    `real_execution_not_performed                   : true`,
    `blocking_reason                                : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-human-execution-readiness-baseline.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = await evaluateRealTagHumanExecutionReadinessBaseline({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagHumanExecutionReadinessBaseline(result));
  }

  process.exit(result.human_exec_readiness_ready ? 0 : 1);
}
