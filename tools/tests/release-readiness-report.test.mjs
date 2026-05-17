#!/usr/bin/env node
/**
 * Release Readiness Report — Unit Tests V20.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  generateReadinessReport,
  REPORT_VERDICTS,
  REPORT_SCHEMA_VERSION,
} from '../release-readiness-report.mjs';

const CLI = resolve(process.cwd(), 'tools', 'release-readiness-report.mjs');
let passed = 0, failed = 0;
function assert(c, m) { if (c) { console.log(`  ✓ ${m}`); passed++; } else { console.error(`  ✗ FAIL: ${m}`); failed++; } }
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// Canonical passing stage results
const allStagesReady = {
  releasePlanResult:    { plan_status: 'PLAN_READY' },
  simulationResult:     { simulation_status: 'SIM_READY_MANUAL_RELEASE' },
  manualGateResult:     { gate_status: 'MANUAL_RELEASE_READY' },
  tagControllerResult:  { tag_controller_status: 'TAG_DRY_RUN_READY' },
  stableGateResult:     { stable_gate_status: 'STABLE_READY_MANUAL_PROMOTION' },
  rollbackDrillResult:  { rollback_drill_status: 'ROLLBACK_DRY_RUN_READY' },
  auditLedgerResult:    { valid: true },
  chainValidatorResult: { chain_validator_status: 'CHAIN_VALID', chain_valid: true },
  orchestratorResult:   { pipeline_status: 'PIPELINE_READY', stages_passed: 8 },
  policyResult:         { policy_pass: true, violations_found: 0 },
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(REPORT_SCHEMA_VERSION === 'v20.0',                               '[A-01] schema=v20.0');
assert(Array.isArray(REPORT_VERDICTS) && REPORT_VERDICTS.length === 4,  '[A-02] 4 verdicts');
assert(REPORT_VERDICTS.includes('READY'),                               '[A-03] READY');
assert(REPORT_VERDICTS.includes('NOT_READY'),                           '[A-04] NOT_READY');
assert(REPORT_VERDICTS.includes('POLICY_FAIL'),                         '[A-05] POLICY_FAIL');
assert(REPORT_VERDICTS.includes('INCOMPLETE'),                          '[A-06] INCOMPLETE');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Report own invariants');
const anyR = generateReadinessReport({});
assert(anyR.deploy_performed  === false,  '[B-01] deploy_performed=false');
assert(anyR.deploy_allowed    === false,  '[B-02] deploy_allowed=false');
assert(anyR.tag_created       === false,  '[B-03] tag_created=false');
assert(anyR.stable_promoted   === false,  '[B-04] stable_promoted=false');
assert(anyR.release_performed === false,  '[B-05] release_performed=false');
assert(anyR.schema_version === 'v20.0',   '[B-06] schema=v20.0');

// ─── Suite C: No inputs → INCOMPLETE ─────────────────────────────
console.log('\n[Suite C] No inputs');
const noInput = generateReadinessReport({});
assert(noInput.report_verdict === 'INCOMPLETE',    '[C-01] no inputs → INCOMPLETE');
assert(noInput.release_ready  === false,           '[C-02] release_ready=false');
assert(noInput.stages_total   === 8,               '[C-03] 8 stages in table');
assert(noInput.stages_ready   === 0,               '[C-04] 0 stages ready');
assert(typeof noInput.report_id === 'string',      '[C-05] report_id is string');
assert(noInput.report_id.startsWith('report_'),    '[C-06] id starts with report_');
assert(Array.isArray(noInput.summary_lines),       '[C-07] summary_lines is array');
assert(typeof noInput.summary_text === 'string',   '[C-08] summary_text is string');

// ─── Suite D: All stages pass → READY ────────────────────────────
console.log('\n[Suite D] All stages pass');
const allReady = generateReadinessReport({ ...allStagesReady, releaseVersion: '20.0.0' });
assert(allReady.report_verdict === 'READY',    '[D-01] all ready → READY');
assert(allReady.release_ready  === true,       '[D-02] release_ready=true');
assert(allReady.stages_ready   === 8,          '[D-03] 8 stages ready');
assert(allReady.stages_not_ready === 0,        '[D-04] 0 stages not ready');
assert(allReady.policy_pass    === true,       '[D-05] policy_pass=true');
assert(allReady.chain_valid    === true,       '[D-06] chain_valid=true');
assert(allReady.release_version === '20.0.0', '[D-07] release_version set');
assert(allReady.deploy_performed === false,    '[D-08] deploy_performed=false');
assert(allReady.tag_created === false,         '[D-09] tag_created=false');
assert(allReady.summary_text.includes('READY'), '[D-10] summary contains READY');

// ─── Suite E: One stage not ready → NOT_READY ────────────────────
console.log('\n[Suite E] One stage not ready');
const oneBlocked = generateReadinessReport({
  ...allStagesReady,
  releasePlanResult: { plan_status: 'PLAN_BLOCKED_EVIDENCE' },
});
assert(oneBlocked.report_verdict === 'NOT_READY',          '[E-01] plan blocked → NOT_READY');
assert(oneBlocked.release_ready  === false,                '[E-02] release_ready=false');
assert(oneBlocked.stages_not_ready === 1,                  '[E-03] 1 stage not ready');
assert(oneBlocked.stage_table.find(s => s.stage === 'release_plan').ready === false, '[E-04] release_plan not ready');
assert(oneBlocked.summary_text.includes('NOT_READY') || oneBlocked.summary_text.includes('NOT_READY') || oneBlocked.report_verdict === 'NOT_READY', '[E-05] verdict is NOT_READY');

// ─── Suite F: Policy fail → POLICY_FAIL ──────────────────────────
console.log('\n[Suite F] Policy fail');
const policyFail = generateReadinessReport({
  ...allStagesReady,
  policyResult: { policy_pass: false, violations_found: 2 },
});
assert(policyFail.report_verdict === 'POLICY_FAIL',         '[F-01] policy fail → POLICY_FAIL');
assert(policyFail.release_ready  === false,                 '[F-02] release_ready=false');
assert(policyFail.policy_pass    === false,                 '[F-03] policy_pass=false');
assert(policyFail.policy_violations === 2,                  '[F-04] 2 policy violations');
assert(policyFail.summary_text.includes('POLICY'),          '[F-05] summary mentions POLICY');

// ─── Suite G: POLICY_FAIL takes priority over NOT_READY ──────────
console.log('\n[Suite G] POLICY_FAIL priority');
const policyAndNotReady = generateReadinessReport({
  ...allStagesReady,
  releasePlanResult: { plan_status: 'PLAN_BLOCKED_EVIDENCE' },
  policyResult:      { policy_pass: false, violations_found: 1 },
});
assert(policyAndNotReady.report_verdict === 'POLICY_FAIL',  '[G-01] POLICY_FAIL takes priority over NOT_READY');

// ─── Suite H: Stage table completeness ───────────────────────────
console.log('\n[Suite H] Stage table completeness');
const fullReport = generateReadinessReport(allStagesReady);
const stageNames = fullReport.stage_table.map(s => s.stage);
assert(stageNames.includes('release_plan'),    '[H-01] release_plan in table');
assert(stageNames.includes('simulation'),      '[H-02] simulation in table');
assert(stageNames.includes('manual_gate'),     '[H-03] manual_gate in table');
assert(stageNames.includes('tag_controller'),  '[H-04] tag_controller in table');
assert(stageNames.includes('stable_gate'),     '[H-05] stable_gate in table');
assert(stageNames.includes('rollback_drill'),  '[H-06] rollback_drill in table');
assert(stageNames.includes('audit_ledger'),    '[H-07] audit_ledger in table');
assert(stageNames.includes('chain_validator'), '[H-08] chain_validator in table');
assert(fullReport.stage_table.every(s => 'provided' in s && 'ready' in s && 'status' in s), '[H-09] all rows have provided/ready/status');

// ─── Suite I: Rollback local drill pass = ready ───────────────────
console.log('\n[Suite I] Rollback local drill pass accepted as ready');
const localDrillPass = generateReadinessReport({
  ...allStagesReady,
  rollbackDrillResult: { rollback_drill_status: 'ROLLBACK_LOCAL_DRILL_PASS' },
});
assert(localDrillPass.report_verdict === 'READY',              '[I-01] ROLLBACK_LOCAL_DRILL_PASS → READY');
assert(localDrillPass.stage_table.find(s => s.stage === 'rollback_drill').ready === true, '[I-02] rollback_drill ready=true');

// ─── Suite J: CLI ─────────────────────────────────────────────────
console.log('\n[Suite J] CLI entrypoint');

// No inputs → INCOMPLETE, exit 2
const cliNone = runCLI(['--json']);
assert(cliNone.exitCode === 2,                                          '[J-01] no inputs → exit 2');
(() => {
  try {
    const o = JSON.parse(cliNone.stdout);
    assert(o.report_verdict === 'INCOMPLETE',                          '[J-02] → INCOMPLETE');
    assert(o.deploy_performed === false,                               '[J-03] deploy_performed=false');
    assert(o.release_ready    === false,                               '[J-04] release_ready=false');
  } catch { assert(false, '[J-02..04] valid JSON'); }
})();

// Plain text CLI
const cliText = runCLI(['--version', '20.0.0']);
assert(cliText.exitCode === 2,                                          '[J-05] text mode → exit 2 (incomplete)');
assert(cliText.stdout.includes('RELEASE READINESS REPORT'),            '[J-06] text output includes header');

// ─── Result ───────────────────────────────────────────────────────
console.log(`\nRelease Readiness Report Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
