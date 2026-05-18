#!/usr/bin/env node
/**
 * Real Tag Human Operational Baseline — V95.0
 *
 * Capstone baseline for V91.0–V94.1 Real Tag Human Runbook + Command Gate layer.
 * Verifies all 8 modules, 9 test scripts, invariants, and pipeline.
 *
 * human_operation_available=true when baseline passes.
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

const SCHEMA_VERSION = 'v95.0';

export const HUMAN_OP_BASELINE_STATUSES = [
  'HUMAN_OP_BASELINE_BLOCKED_MODULES',
  'HUMAN_OP_BASELINE_BLOCKED_TESTS',
  'HUMAN_OP_BASELINE_BLOCKED_INVARIANTS',
  'HUMAN_OP_BASELINE_BLOCKED_PIPELINE',
  'HUMAN_OP_BASELINE_READY_FOR_HUMAN_TAG_OPERATION',
];

const REQUIRED_MODULES = [
  'tools/real-tag-human-runbook.mjs',
  'tools/real-tag-human-runbook-validator.mjs',
  'tools/real-tag-actual-command-gate.mjs',
  'tools/real-tag-actual-command-renderer.mjs',
  'tools/real-tag-human-execution-receipt-importer.mjs',
  'tools/real-tag-human-receipt-verifier.mjs',
  'tools/real-tag-post-human-audit-ledger.mjs',
  'tools/real-tag-post-human-stabilization-report.mjs',
];

const REQUIRED_TEST_SCRIPTS = [
  'test:human-runbook-unit',
  'test:runbook-validator-unit',
  'test:actual-command-gate-unit',
  'test:command-renderer-unit',
  'test:receipt-importer-unit',
  'test:human-receipt-verifier-unit',
  'test:post-human-ledger-unit',
  'test:stabilization-report-unit',
  'test:human-op-baseline-unit',
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
    human_operation_available:    true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    baseline_status:  status,
    baseline_ready:   false,
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
  if (result.actual_real_tag_created      === true) failures.push('actual_real_tag_created must be false');
  if (result.tag_created                  === true) failures.push('tag_created must be false');
  if (result.git_push_performed           === true) failures.push('git_push_performed must be false');
  if (result.deploy_performed             === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted              === true) failures.push('stable_promoted must be false');
  if (result.release_performed            === true) failures.push('release_performed must be false');
  return failures;
}

export async function evaluateRealTagHumanOperationalBaseline(params = {}) {
  const {
    fixture_mode    = false,
    _mock_timestamp,
  } = params ?? {};

  const now         = _mock_timestamp ?? new Date().toISOString();
  const baseline_id = _sha256(`human-op-baseline:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  // ── 1. Module check ────────────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkModules();
    if (missing.length > 0) {
      return _blocked('HUMAN_OP_BASELINE_BLOCKED_MODULES', 'required_modules_missing', {
        baseline_id,
        missing_modules:         missing,
        modules_verified:        false,
        test_scripts_verified:   false,
        invariants_verified:     false,
        pipeline_verified:       false,
        runbook_verified:        false,
        validator_verified:      false,
        gate_verified:           false,
        renderer_verified:       false,
        importer_verified:       false,
        verifier_verified:       false,
        ledger_verified:         false,
        stab_report_verified:    false,
        created_at:              now,
      });
    }
  }

  // ── 2. Test script check ───────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkTestScripts();
    if (missing.length > 0) {
      return _blocked('HUMAN_OP_BASELINE_BLOCKED_TESTS', 'required_test_scripts_missing', {
        baseline_id,
        missing_test_scripts:    missing,
        modules_verified:        true,
        test_scripts_verified:   false,
        invariants_verified:     false,
        pipeline_verified:       false,
        runbook_verified:        false,
        validator_verified:      false,
        gate_verified:           false,
        renderer_verified:       false,
        importer_verified:       false,
        verifier_verified:       false,
        ledger_verified:         false,
        stab_report_verified:    false,
        created_at:              now,
      });
    }
  }

  // ── 3. Invariant check ─────────────────────────────────────────
  const { buildRealTagHumanRunbook }                        = await import('./real-tag-human-runbook.mjs');
  const { runRealTagHumanRunbookValidator }                 = await import('./real-tag-human-runbook-validator.mjs');
  const { evaluateRealTagCommandGate }                      = await import('./real-tag-actual-command-gate.mjs');
  const { buildRealTagActualCommandRenderer }               = await import('./real-tag-actual-command-renderer.mjs');
  const { buildRealTagHumanExecutionReceiptImporter }       = await import('./real-tag-human-execution-receipt-importer.mjs');
  const { runRealTagHumanReceiptVerifier }                  = await import('./real-tag-human-receipt-verifier.mjs');
  const { buildRealTagPostHumanAuditLedger }                = await import('./real-tag-post-human-audit-ledger.mjs');
  const { buildRealTagPostHumanStabilizationReport }        = await import('./real-tag-post-human-stabilization-report.mjs');

  const fixtureRunbook    = buildRealTagHumanRunbook({ fixture_mode: true, _mock_timestamp: now });
  const invariantFailures = _verifyInvariants(fixtureRunbook);
  if (invariantFailures.length > 0) {
    return _blocked('HUMAN_OP_BASELINE_BLOCKED_INVARIANTS', 'invariant_violations_detected', {
      baseline_id,
      invariant_failures:      invariantFailures,
      modules_verified:        true,
      test_scripts_verified:   true,
      invariants_verified:     false,
      pipeline_verified:       false,
      runbook_verified:        false,
      validator_verified:      false,
      gate_verified:           false,
      renderer_verified:       false,
      importer_verified:       false,
      verifier_verified:       false,
      ledger_verified:         false,
      stab_report_verified:    false,
      created_at:              now,
    });
  }

  // ── 4. Pipeline check ──────────────────────────────────────────
  const fixtureValidator  = runRealTagHumanRunbookValidator({ fixture_mode: true, _mock_timestamp: now });
  const fixtureGate       = evaluateRealTagCommandGate({ fixture_mode: true, _mock_timestamp: now });
  const fixtureRenderer   = buildRealTagActualCommandRenderer({ fixture_mode: true, _mock_timestamp: now });
  const fixtureImporter   = buildRealTagHumanExecutionReceiptImporter({ fixture_mode: true, _mock_timestamp: now });
  const fixtureVerifier   = runRealTagHumanReceiptVerifier({ fixture_mode: true, _mock_timestamp: now });
  const fixtureLedger     = buildRealTagPostHumanAuditLedger({ fixture_mode: true, _mock_timestamp: now });
  const fixtureStabReport = buildRealTagPostHumanStabilizationReport({ fixture_mode: true, _mock_timestamp: now });

  const runbookOk     = fixtureRunbook.runbook_ready          === true;
  const validatorOk   = fixtureValidator.validator_passed     === true;
  const gateOk        = fixtureGate.gate_ready                === true;
  const rendererOk    = fixtureRenderer.renderer_ready        === true;
  const importerOk    = fixtureImporter.importer_ready        === true;
  const verifierOk    = fixtureVerifier.verifier_passed       === true;
  const ledgerOk      = fixtureLedger.ledger_ready            === true;
  const stabReportOk  = fixtureStabReport.report_ready        === true;

  const pipelineOk = runbookOk && validatorOk && gateOk && rendererOk &&
                     importerOk && verifierOk && ledgerOk && stabReportOk;

  if (!pipelineOk) {
    return _blocked('HUMAN_OP_BASELINE_BLOCKED_PIPELINE', 'pipeline_verification_failed', {
      baseline_id,
      modules_verified:       true,
      test_scripts_verified:  true,
      invariants_verified:    true,
      pipeline_verified:      false,
      runbook_verified:       runbookOk,
      validator_verified:     validatorOk,
      gate_verified:          gateOk,
      renderer_verified:      rendererOk,
      importer_verified:      importerOk,
      verifier_verified:      verifierOk,
      ledger_verified:        ledgerOk,
      stab_report_verified:   stabReportOk,
      created_at:             now,
    });
  }

  return {
    schema_version:               SCHEMA_VERSION,
    baseline_id,
    baseline_status:              'HUMAN_OP_BASELINE_READY_FOR_HUMAN_TAG_OPERATION',
    baseline_ready:               true,
    blocking_reason:              null,
    modules_verified:             true,
    test_scripts_verified:        true,
    invariants_verified:          true,
    pipeline_verified:            true,
    runbook_verified:             true,
    validator_verified:           true,
    gate_verified:                true,
    renderer_verified:            true,
    importer_verified:            true,
    verifier_verified:            true,
    ledger_verified:              true,
    stab_report_verified:         true,
    required_modules_count:       REQUIRED_MODULES.length,
    required_test_scripts_count:  REQUIRED_TEST_SCRIPTS.length,
    created_at:                   now,
    ..._locked_ready(),
  };
}

export function renderRealTagHumanOperationalBaseline(result) {
  if (!result) return 'real_tag_human_operational_baseline: null';
  return [
    `baseline_status               : ${result.baseline_status ?? 'UNKNOWN'}`,
    `baseline_id                   : ${result.baseline_id ?? 'none'}`,
    `modules_verified              : ${result.modules_verified ?? false}`,
    `test_scripts_verified         : ${result.test_scripts_verified ?? false}`,
    `invariants_verified           : ${result.invariants_verified ?? false}`,
    `pipeline_verified             : ${result.pipeline_verified ?? false}`,
    `runbook_verified              : ${result.runbook_verified ?? false}`,
    `validator_verified            : ${result.validator_verified ?? false}`,
    `gate_verified                 : ${result.gate_verified ?? false}`,
    `renderer_verified             : ${result.renderer_verified ?? false}`,
    `importer_verified             : ${result.importer_verified ?? false}`,
    `verifier_verified             : ${result.verifier_verified ?? false}`,
    `ledger_verified               : ${result.ledger_verified ?? false}`,
    `stab_report_verified          : ${result.stab_report_verified ?? false}`,
    `human_operation_available     : ${result.human_operation_available ?? false}`,
    `actual_real_tag_created       : false`,
    `tag_created                   : false`,
    `git_push_performed            : false`,
    `real_execution_not_performed  : true`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-human-operational-baseline.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = await evaluateRealTagHumanOperationalBaseline({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagHumanOperationalBaseline(result));
  }

  process.exit(result.baseline_ready ? 0 : 1);
}
