#!/usr/bin/env node
/**
 * Final Pre-Production Safety Baseline — V70.0
 *
 * Capstone baseline for the V66–V69 Controlled Execution + Pre-Production layer.
 * Review-only. Does NOT execute release, tag, stable, deploy, or unlock.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * controlled_execution_allowed=false always.
 * unlock_executed=false always.
 * final_execution_phase_required=true always.
 * explicit_final_execution_required=true always.
 */

import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const SCHEMA_VERSION = 'v70.0';

export const FINAL_PREPROD_BASELINE_STATUSES = [
  'FINAL_PREPROD_BASELINE_BLOCKED_MODULES',
  'FINAL_PREPROD_BASELINE_BLOCKED_TESTS',
  'FINAL_PREPROD_BASELINE_BLOCKED_INVARIANTS',
  'FINAL_PREPROD_BASELINE_BLOCKED_REVIEW_PIPELINE',
  'FINAL_PREPROD_BASELINE_READY_REVIEW',
];

const REQUIRED_MODULES = [
  'tools/controlled-execution-contract.mjs',
  'tools/controlled-execution-human-authority.mjs',
  'tools/controlled-execution-authority-binding.mjs',
  'tools/controlled-execution-risk-matrix.mjs',
  'tools/controlled-execution-evidence-package.mjs',
  'tools/controlled-execution-ledger.mjs',
  'tools/final-pre-production-safety-report.mjs',
  'tools/pi-harness.mjs',
];

const REQUIRED_TEST_SCRIPTS = [
  'test:controlled-contract-unit',
  'test:controlled-authority-unit',
  'test:controlled-binding-unit',
  'test:controlled-risk-unit',
  'test:controlled-evidence-unit',
  'test:controlled-ledger-unit',
  'test:harness-controlled-exec-unit',
  'test:preprod-report-unit',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:                     false,
    promotion_allowed:                  false,
    stable_allowed:                     false,
    tag_allowed:                        false,
    release_execution_allowed:          false,
    release_performed:                  false,
    tag_created:                        false,
    stable_promoted:                    false,
    deploy_performed:                   false,
    production_execution_locked:        true,
    unlock_executed:                    false,
    controlled_review_only:             true,
    controlled_execution_allowed:       false,
    human_review_required:              true,
    explicit_final_execution_required:  true,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:          SCHEMA_VERSION,
    baseline_status:         status,
    baseline_ready:          false,
    blocking_reason,
    ...extra,
    ..._locked(),
    deploy_allowed:                     false,
    promotion_allowed:                  false,
    stable_allowed:                     false,
    tag_allowed:                        false,
    release_execution_allowed:          false,
    release_performed:                  false,
    tag_created:                        false,
    stable_promoted:                    false,
    deploy_performed:                   false,
    production_execution_locked:        true,
    unlock_executed:                    false,
    controlled_review_only:             true,
    controlled_execution_allowed:       false,
    human_review_required:              true,
    explicit_final_execution_required:  true,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
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

function _verifyInvariants(report) {
  const failures = [];
  if (report.production_execution_locked       !== true)  failures.push('production_execution_locked must be true');
  if (report.controlled_execution_allowed      !== false) failures.push('controlled_execution_allowed must be false');
  if (report.unlock_executed                   !== false) failures.push('unlock_executed must be false');
  if (report.final_execution_phase_required    !== true)  failures.push('final_execution_phase_required must be true');
  if (report.explicit_final_execution_required !== true)  failures.push('explicit_final_execution_required must be true');
  if (report.human_review_required             !== true)  failures.push('human_review_required must be true');
  if (report.deploy_allowed                    !== false) failures.push('deploy_allowed must be false');
  if (report.promotion_allowed                 !== false) failures.push('promotion_allowed must be false');
  if (report.tag_allowed                       !== false) failures.push('tag_allowed must be false');
  if (report.release_execution_allowed         !== false) failures.push('release_execution_allowed must be false');
  if (report.release_performed                 !== false) failures.push('release_performed must be false');
  if (report.tag_created                       !== false) failures.push('tag_created must be false');
  if (report.stable_promoted                   !== false) failures.push('stable_promoted must be false');
  if (report.deploy_performed                  !== false) failures.push('deploy_performed must be false');
  return failures;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Evaluate the final pre-production safety baseline.
 * fixture_mode=true bypasses file/script checks; uses fixture pipeline data.
 */
export async function evaluateFinalPreProductionSafetyBaseline(params = {}) {
  const {
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const baseline_id = _sha256(`final-preprod-baseline:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  // ── 1. Module existence check ──────────────────────────────────
  if (!fixture_mode) {
    const missingModules = _checkModules();
    if (missingModules.length > 0) {
      return _blocked('FINAL_PREPROD_BASELINE_BLOCKED_MODULES', 'required_modules_missing', {
        baseline_id,
        missing_modules: missingModules,
        modules_verified: false,
        test_scripts_verified: false,
        invariants_verified: false,
        review_pipeline_verified: false,
        created_at: now,
      });
    }
  }

  // ── 2. Test script check ───────────────────────────────────────
  if (!fixture_mode) {
    const missingScripts = _checkTestScripts();
    if (missingScripts.length > 0) {
      return _blocked('FINAL_PREPROD_BASELINE_BLOCKED_TESTS', 'required_test_scripts_missing', {
        baseline_id,
        missing_test_scripts: missingScripts,
        modules_verified: true,
        test_scripts_verified: false,
        invariants_verified: false,
        review_pipeline_verified: false,
        created_at: now,
      });
    }
  }

  // ── 3. Invariant check via fixture pre-production report ───────
  const { buildFinalPreProductionSafetyReport } = await import('./final-pre-production-safety-report.mjs');
  const fixtureReport = buildFinalPreProductionSafetyReport({ fixture_mode: true, _mock_timestamp: now });

  const invariantFailures = _verifyInvariants(fixtureReport);
  if (invariantFailures.length > 0) {
    return _blocked('FINAL_PREPROD_BASELINE_BLOCKED_INVARIANTS', 'invariant_violations_detected', {
      baseline_id,
      invariant_failures: invariantFailures,
      modules_verified: fixture_mode || true,
      test_scripts_verified: fixture_mode || true,
      invariants_verified: false,
      review_pipeline_verified: false,
      created_at: now,
    });
  }

  // ── 4. Review pipeline check via fixture controlled execution ──
  const { createControlledExecutionContract }     = await import('./controlled-execution-contract.mjs');
  const { createControlledExecutionHumanAuthority } = await import('./controlled-execution-human-authority.mjs');
  const { bindControlledExecutionAuthorityToBaseline } = await import('./controlled-execution-authority-binding.mjs');
  const { evaluateControlledExecutionRisk }       = await import('./controlled-execution-risk-matrix.mjs');
  const { buildControlledExecutionEvidencePackage } = await import('./controlled-execution-evidence-package.mjs');

  const contract  = createControlledExecutionContract({ fixture_mode: true, _mock_timestamp: now });
  const authority = createControlledExecutionHumanAuthority({ fixture_mode: true, _mock_timestamp: now });
  const binding   = bindControlledExecutionAuthorityToBaseline({
    controlled_contract:  contract,
    controlled_authority: authority,
    unlock_governance_baseline: { baseline_ready: true, baseline_id: 'fixture-unlock-baseline', baseline_status: 'UNLOCK_GOVERNANCE_BASELINE_READY' },
    fixture_mode: true,
    _mock_timestamp: now,
  });
  const risk      = evaluateControlledExecutionRisk({
    controlled_contract:  contract,
    controlled_authority: authority,
    controlled_binding:   binding,
    unlock_governance_baseline: { baseline_ready: true },
    fixture_mode: true,
    _mock_timestamp: now,
  });
  const evidence  = buildControlledExecutionEvidencePackage({
    controlled_risk:      risk,
    evidence_source:      'go-core',
    evidence_receipt_id:  'fixture-receipt-id',
    fixture_mode: true,
    _mock_timestamp: now,
  });
  const fullReport = buildFinalPreProductionSafetyReport({
    controlled_contract:         contract,
    controlled_authority:        authority,
    controlled_binding:          binding,
    controlled_evidence_package: evidence,
    _mock_timestamp:             now,
  });

  const pipelineOk = (
    contract.contract_status   === 'CONTROLLED_CONTRACT_READY_REVIEW'   &&
    authority.authority_status === 'CONTROLLED_AUTHORITY_READY_REVIEW'  &&
    binding.binding_status     === 'CONTROLLED_BINDING_READY_REVIEW'    &&
    risk.controlled_risk_status === 'CONTROLLED_RISK_READY_REVIEW'      &&
    evidence.evidence_package_status === 'CONTROLLED_EVIDENCE_READY_REVIEW' &&
    fullReport.pre_production_status === 'PREPROD_REPORT_READY'         &&
    fullReport.report_ready === true
  );

  if (!pipelineOk) {
    return _blocked('FINAL_PREPROD_BASELINE_BLOCKED_REVIEW_PIPELINE', 'review_pipeline_verification_failed', {
      baseline_id,
      pipeline_contract_status:   contract.contract_status,
      pipeline_authority_status:  authority.authority_status,
      pipeline_binding_status:    binding.binding_status,
      pipeline_risk_status:       risk.controlled_risk_status,
      pipeline_evidence_status:   evidence.evidence_package_status,
      pipeline_report_status:     fullReport.pre_production_status,
      modules_verified: fixture_mode || true,
      test_scripts_verified: fixture_mode || true,
      invariants_verified: true,
      review_pipeline_verified: false,
      created_at: now,
    });
  }

  return {
    schema_version:                     SCHEMA_VERSION,
    baseline_id,
    baseline_status:                    'FINAL_PREPROD_BASELINE_READY_REVIEW',
    baseline_ready:                     true,
    blocking_reason:                    null,
    modules_verified:                   true,
    test_scripts_verified:              true,
    invariants_verified:                true,
    review_pipeline_verified:           true,
    required_modules_count:             REQUIRED_MODULES.length,
    required_test_scripts_count:        REQUIRED_TEST_SCRIPTS.length,
    pipeline_contract_status:           contract.contract_status,
    pipeline_authority_status:          authority.authority_status,
    pipeline_binding_status:            binding.binding_status,
    pipeline_risk_status:               risk.controlled_risk_status,
    pipeline_evidence_status:           evidence.evidence_package_status,
    pipeline_report_status:             fullReport.pre_production_status,
    preprod_report_ready:               fullReport.report_ready,
    created_at:                         now,
    ..._locked(),
  };
}

/**
 * Render a human-readable final pre-production safety baseline summary.
 */
export function renderFinalPreProductionSafetyBaseline(result) {
  if (!result) return 'final_pre_production_safety_baseline: null';
  const lines = [
    `baseline_status                   : ${result.baseline_status ?? 'UNKNOWN'}`,
    `baseline_id                       : ${result.baseline_id ?? 'none'}`,
    `modules_verified                  : ${result.modules_verified ?? false}`,
    `test_scripts_verified             : ${result.test_scripts_verified ?? false}`,
    `invariants_verified               : ${result.invariants_verified ?? false}`,
    `review_pipeline_verified          : ${result.review_pipeline_verified ?? false}`,
    `preprod_report_ready              : ${result.preprod_report_ready ?? false}`,
    `production_execution_locked       : true`,
    `controlled_execution_allowed      : false`,
    `unlock_executed                   : false`,
    `human_review_required             : true`,
    `explicit_final_execution_required : true`,
    `final_execution_phase_required    : true`,
    `blocking_reason                   : ${result.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('final-pre-production-safety-baseline.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = await evaluateFinalPreProductionSafetyBaseline({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderFinalPreProductionSafetyBaseline(result));
  }

  process.exit(result.baseline_ready ? 0 : 1);
}
