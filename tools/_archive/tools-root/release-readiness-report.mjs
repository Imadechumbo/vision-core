#!/usr/bin/env node
/**
 * Release Readiness Report — V20.0
 *
 * Final capstone of the release pipeline. Aggregates all stage outputs
 * and produces a unified, structured readiness report with:
 *   - Overall READY / NOT_READY / POLICY_FAIL classification
 *   - Stage-by-stage readiness table
 *   - Policy enforcement summary
 *   - Evidence chain summary
 *   - Human-readable summary text
 *   - Machine-readable JSON report
 *
 * Classification only — never executes, deploys, or promotes.
 *
 * REGRA ABSOLUTA:
 * - deploy_performed=false always.
 * - tag_created=false always.
 * - stable_promoted=false always.
 * - Report generation never triggers any release action.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v24.0';

const REPORT_VERDICTS = [
  'READY',          // all checks pass, pipeline is release-ready (human decision required to proceed)
  'NOT_READY',      // one or more pipeline stages not ready
  'POLICY_FAIL',    // policy enforcer detected invariant violations
  'INCOMPLETE',     // insufficient stage results to render a verdict
];

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * @param {Object} input
 * @param {Object} input.releasePlanResult
 * @param {Object} input.simulationResult
 * @param {Object} input.manualGateResult
 * @param {Object} input.tagControllerResult
 * @param {Object} input.stableGateResult
 * @param {Object} input.rollbackDrillResult
 * @param {Object} input.auditLedgerResult
 * @param {Object} input.chainValidatorResult
 * @param {Object} input.orchestratorResult     - Output of pipeline-orchestrator
 * @param {Object} input.policyResult           - Output of policy-enforcer
 * @param {string} input.releaseVersion         - Semantic version string being released
 * @param {string} input.gitHead
 * @param {string} input.branch
 * @param {Object} input.runtimeEvidenceResult    - Output of activateRuntimeEvidence() [V24.0]
 * @param {Object} input.goCorReceiptResult       - Output of validateGoCorEvidenceReceipt() [V24.0]
 * @param {Object} input.passGoldRuntimeBinding   - Output of evaluatePassGoldRuntimeBinding() [V24.0]
 * @param {Object} input.localDrillResult         - Output of runLocalPassGoldDrill() [V24.0]
 */
function generateReadinessReport(input = {}) {
  const {
    releasePlanResult    = null,
    simulationResult     = null,
    manualGateResult     = null,
    tagControllerResult  = null,
    stableGateResult     = null,
    rollbackDrillResult  = null,
    auditLedgerResult    = null,
    chainValidatorResult = null,
    orchestratorResult   = null,
    policyResult         = null,
    releaseVersion       = null,
    gitHead              = null,
    branch               = null,
    // V24.0: Runtime Evidence
    runtimeEvidenceResult  = null,
    goCorReceiptResult     = null,
    passGoldRuntimeBinding = null,
    localDrillResult       = null,
  } = input;

  const reportId    = _buildId(gitHead, branch, releaseVersion);
  const generatedAt = new Date().toISOString();

  // ── Stage readiness table ────────────────────────────────────────
  const stageTable = _buildStageTable({
    releasePlanResult, simulationResult, manualGateResult,
    tagControllerResult, stableGateResult, rollbackDrillResult,
    auditLedgerResult, chainValidatorResult,
  });

  const stagesReady   = stageTable.filter(s => s.ready).length;
  const stagesNotReady = stageTable.filter(s => !s.ready).length;
  const stagesTotal   = stageTable.length;

  // ── Policy summary ───────────────────────────────────────────────
  const policyPass         = policyResult?.policy_pass === true;
  const policyViolations   = policyResult?.violations_found ?? null;
  const policyChecked      = policyResult !== null;

  // ── Chain summary ────────────────────────────────────────────────
  const chainValid         = chainValidatorResult?.chain_valid === true;
  const chainStatus        = chainValidatorResult?.chain_validator_status ?? null;

  // ── V24.0: Runtime Evidence summary ─────────────────────────────
  const runtimeEvidenceStatus      = runtimeEvidenceResult?.runtime_evidence_status ?? null;
  const runtimeEvidenceReady       = runtimeEvidenceResult?.runtime_evidence_ready  === true;
  const goCorReceiptStatus         = goCorReceiptResult?.receipt_status              ?? null;
  const goCorReceiptValid          = goCorReceiptResult?.receipt_valid               === true;
  const passGoldBindingStatus      = passGoldRuntimeBinding?.pass_gold_runtime_binding_status ?? null;
  const passGoldBindingValid       = passGoldRuntimeBinding?.pass_gold_runtime_binding_valid  === true;
  const localDrillStatus           = localDrillResult?.drill_status                 ?? null;
  const localDrillReady            = localDrillResult?.drill_ready                  === true;
  const runtimeReleaseReady        = runtimeEvidenceReady && goCorReceiptValid && passGoldBindingValid;

  const missingRuntimeEvidence = [];
  if (!runtimeEvidenceReady)  missingRuntimeEvidence.push('runtime_evidence_ready');
  if (!goCorReceiptValid)     missingRuntimeEvidence.push('go_core_receipt_valid');
  if (!passGoldBindingValid)  missingRuntimeEvidence.push('pass_gold_runtime_binding_valid');

  const runtimeBlockers = [];
  if (runtimeEvidenceResult && !runtimeEvidenceReady) runtimeBlockers.push(runtimeEvidenceStatus);
  if (goCorReceiptResult    && !goCorReceiptValid)    runtimeBlockers.push(goCorReceiptStatus);
  if (passGoldRuntimeBinding && !passGoldBindingValid) runtimeBlockers.push(passGoldBindingStatus);

  // ── Overall verdict ──────────────────────────────────────────────
  let verdict;
  const hasMinInputs = stageTable.some(s => s.result !== null);
  if (!hasMinInputs) {
    verdict = 'INCOMPLETE';
  } else if (policyChecked && !policyPass) {
    verdict = 'POLICY_FAIL';
  } else if (stagesNotReady > 0) {
    verdict = 'NOT_READY';
  } else if (!runtimeReleaseReady && (runtimeEvidenceResult || goCorReceiptResult || passGoldRuntimeBinding)) {
    verdict = 'NOT_READY';
  } else {
    verdict = 'READY';
  }

  // ── Human-readable summary ───────────────────────────────────────
  const summaryLines = _buildSummary(verdict, stageTable, policyResult, chainValidatorResult, releaseVersion, generatedAt);

  return {
    schema_version:       SCHEMA_VERSION,
    report_id:            reportId,
    report_verdict:       verdict,
    release_ready:        verdict === 'READY',
    release_version:      releaseVersion,
    generated_at:         generatedAt,
    git_head:             gitHead,
    branch:               branch,

    // Stage summary
    stages_total:         stagesTotal,
    stages_ready:         stagesReady,
    stages_not_ready:     stagesNotReady,
    stage_table:          stageTable,

    // Policy enforcement
    policy_checked:       policyChecked,
    policy_pass:          policyChecked ? policyPass : null,
    policy_violations:    policyChecked ? (policyViolations ?? 0) : null,

    // Evidence chain
    chain_valid:          chainValid,
    chain_status:         chainStatus,

    // Pipeline orchestrator summary
    pipeline_status:      orchestratorResult?.pipeline_status ?? null,
    pipeline_stages_passed: orchestratorResult?.stages_passed ?? null,

    // Human summary
    summary_lines:        summaryLines,
    summary_text:         summaryLines.join('\n'),

    // V24.0: Runtime Evidence fields
    runtime_evidence_status:          runtimeEvidenceStatus,
    runtime_evidence_ready:           runtimeEvidenceReady,
    go_core_receipt_status:           goCorReceiptStatus,
    go_core_receipt_valid:            goCorReceiptValid,
    pass_gold_runtime_binding_status: passGoldBindingStatus,
    pass_gold_runtime_binding_valid:  passGoldBindingValid,
    local_runtime_drill_status:       localDrillStatus,
    local_runtime_drill_ready:        localDrillReady,
    runtime_release_ready:            runtimeReleaseReady,
    missing_runtime_evidence:         missingRuntimeEvidence,
    runtime_blockers:                 runtimeBlockers,

    // Invariants — always false
    deploy_performed:     false,
    deploy_allowed:       false,
    tag_created:          false,
    stable_promoted:      false,
    release_performed:    false,

    note: 'Release readiness report — classification and summary only. Human decision required to proceed in V24.0',
  };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _buildStageTable(results) {
  return [
    _stageRow('release_plan',    results.releasePlanResult,    r => r?.plan_status === 'PLAN_READY',                             r => r?.plan_status),
    _stageRow('simulation',      results.simulationResult,     r => r?.simulation_status === 'SIM_READY_MANUAL_RELEASE',         r => r?.simulation_status),
    _stageRow('manual_gate',     results.manualGateResult,     r => r?.gate_status === 'MANUAL_RELEASE_READY',                   r => r?.gate_status),
    _stageRow('tag_controller',  results.tagControllerResult,  r => r?.tag_controller_status === 'TAG_DRY_RUN_READY',            r => r?.tag_controller_status),
    _stageRow('stable_gate',     results.stableGateResult,     r => r?.stable_gate_status === 'STABLE_READY_MANUAL_PROMOTION',   r => r?.stable_gate_status),
    _stageRow('rollback_drill',  results.rollbackDrillResult,  r => r?.rollback_drill_status === 'ROLLBACK_DRY_RUN_READY' || r?.rollback_drill_status === 'ROLLBACK_LOCAL_DRILL_PASS', r => r?.rollback_drill_status),
    _stageRow('audit_ledger',    results.auditLedgerResult,    r => r?.valid === true,                                          r => r?.valid ? 'LEDGER_VALID' : 'LEDGER_INVALID'),
    _stageRow('chain_validator', results.chainValidatorResult, r => r?.chain_validator_status === 'CHAIN_VALID',                 r => r?.chain_validator_status),
  ];
}

function _stageRow(name, result, readyFn, statusFn) {
  const provided = result !== null && result !== undefined;
  const ready    = provided ? readyFn(result) : false;
  return {
    stage:    name,
    provided: provided,
    ready:    ready,
    status:   provided ? (statusFn(result) ?? 'UNKNOWN') : 'NOT_PROVIDED',
    result:   provided ? result : null,
  };
}

function _buildSummary(verdict, stageTable, policyResult, chainResult, releaseVersion, generatedAt) {
  const lines = [];
  const ver   = releaseVersion ? `v${releaseVersion}` : '(version not set)';
  lines.push(`=== RELEASE READINESS REPORT ===`);
  lines.push(`Version: ${ver}`);
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Verdict: ${verdict}`);
  lines.push('');
  lines.push('Stage readiness:');
  for (const row of stageTable) {
    const icon = !row.provided ? '⬜ SKIP' : row.ready ? '✓ PASS' : '✗ FAIL';
    lines.push(`  ${icon}  ${row.stage}: ${row.status}`);
  }
  if (policyResult) {
    lines.push('');
    lines.push(`Policy enforcement: ${policyResult.policy_pass ? 'PASS' : 'FAIL'} (${policyResult.violations_found ?? 0} violations)`);
  }
  if (chainResult) {
    lines.push(`Evidence chain: ${chainResult.chain_valid ? 'VALID' : 'INVALID'} (${chainResult.chain_validator_status})`);
  }
  lines.push('');
  if (verdict === 'READY') {
    lines.push('Pipeline is release-ready. Human decision required to proceed.');
    lines.push('deploy_performed=false  tag_created=false  stable_promoted=false');
  } else if (verdict === 'POLICY_FAIL') {
    lines.push('POLICY VIOLATION DETECTED. Release blocked by policy enforcer.');
  } else if (verdict === 'NOT_READY') {
    const failing = stageTable.filter(s => s.provided && !s.ready).map(s => s.stage);
    lines.push(`Release blocked. Failing stages: ${failing.join(', ')}`);
  } else {
    lines.push('Insufficient stage data to determine readiness.');
  }
  return lines;
}

function _buildId(gitHead, branch, version) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const raw   = `${gitHead || 'unknown'}:${branch || 'unknown'}:${version || 'unknown'}:${Date.now()}:${nonce}`;
  return `report_${createHash('sha256').update(raw).digest('hex').slice(0, 12)}`;
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('release-readiness-report.mjs')) {
  _runCLI();
}

function _runCLI() {
  const args  = process.argv.slice(2);
  const flags = { json: false, gitHead: null, branch: null, version: null };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--json':           flags.json    = true; break;
      case '--git-head':       flags.gitHead = args[++i] || null; break;
      case '--branch':         flags.branch  = args[++i] || null; break;
      case '--version':        flags.version = args[++i] || null; break;
      default: break;
    }
  }

  const result = generateReadinessReport({
    gitHead:        flags.gitHead,
    branch:         flags.branch,
    releaseVersion: flags.version,
  });

  if (flags.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(result.summary_text + '\n');
  }
  process.exit(result.release_ready ? 0 : 2);
}

export {
  generateReadinessReport,
  REPORT_VERDICTS,
  SCHEMA_VERSION as REPORT_SCHEMA_VERSION,
};
