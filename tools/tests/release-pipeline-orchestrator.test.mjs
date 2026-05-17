#!/usr/bin/env node
/**
 * Release Pipeline Orchestrator — Unit Tests V18.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  orchestratePipeline,
  PIPELINE_STAGES,
  PIPELINE_STATUSES,
  PIPELINE_SCHEMA_VERSION,
} from '../release-pipeline-orchestrator.mjs';

const CLI = resolve(process.cwd(), 'tools', 'release-pipeline-orchestrator.mjs');
let passed = 0, failed = 0;
function assert(c, m) { if (c) { console.log(`  ✓ ${m}`); passed++; } else { console.error(`  ✗ FAIL: ${m}`); failed++; } }
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// Canonical passing results for each stage
const planReady = { plan_status: 'PLAN_READY' };
const simReady  = { simulation_status: 'SIM_READY_MANUAL_RELEASE' };
const gateReady = { gate_status: 'MANUAL_RELEASE_READY' };
const tagReady  = { tag_controller_status: 'TAG_DRY_RUN_READY' };
const stableReady = { stable_gate_status: 'STABLE_READY_MANUAL_PROMOTION' };
const rollbackReady = { rollback_drill_status: 'ROLLBACK_DRY_RUN_READY' };
const ledgerValid = { valid: true };
const chainValid  = { chain_validator_status: 'CHAIN_VALID' };

const allReady = {
  releasePlanResult:    planReady,
  simulationResult:     simReady,
  manualGateResult:     gateReady,
  tagControllerResult:  tagReady,
  stableGateResult:     stableReady,
  rollbackDrillResult:  rollbackReady,
  auditLedgerResult:    ledgerValid,
  chainValidatorResult: chainValid,
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(PIPELINE_SCHEMA_VERSION === 'v18.0',                                    '[A-01] schema=v18.0');
assert(Array.isArray(PIPELINE_STAGES) && PIPELINE_STAGES.length === 8,         '[A-02] 8 pipeline stages');
assert(PIPELINE_STAGES.includes('release_plan'),                               '[A-03] release_plan stage');
assert(PIPELINE_STAGES.includes('chain_validator'),                            '[A-04] chain_validator stage');
assert(Array.isArray(PIPELINE_STATUSES) && PIPELINE_STATUSES.length === 10,    '[A-05] 10 statuses');
assert(PIPELINE_STATUSES.includes('PIPELINE_READY'),                           '[A-06] PIPELINE_READY');
assert(PIPELINE_STATUSES.includes('PIPELINE_BLOCKED_MULTIPLE'),                '[A-07] PIPELINE_BLOCKED_MULTIPLE');
assert(PIPELINE_STATUSES.includes('PIPELINE_BLOCKED_CHAIN'),                   '[A-08] PIPELINE_BLOCKED_CHAIN');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const anyR = orchestratePipeline({});
assert(anyR.deploy_performed  === false,  '[B-01] deploy_performed=false');
assert(anyR.deploy_allowed    === false,  '[B-02] deploy_allowed=false');
assert(anyR.tag_created       === false,  '[B-03] tag_created=false');
assert(anyR.stable_promoted   === false,  '[B-04] stable_promoted=false');
assert(anyR.release_performed === false,  '[B-05] release_performed=false');
assert(anyR.schema_version === 'v18.0',   '[B-06] schema=v18.0');

// ─── Suite C: No inputs → all skipped → PIPELINE_BLOCKED_MULTIPLE ─
console.log('\n[Suite C] No inputs');
const noInputs = orchestratePipeline({});
assert(noInputs.pipeline_status === 'PIPELINE_BLOCKED_MULTIPLE', '[C-01] no inputs → PIPELINE_BLOCKED_MULTIPLE');
assert(noInputs.pipeline_ready  === false,                       '[C-02] no inputs → pipeline_ready=false');
assert(noInputs.stages_blocked  === 8,                           '[C-03] all 8 stages blocked');
assert(noInputs.stages_passed   === 0,                           '[C-04] 0 stages passed');
assert(noInputs.stages_skipped  === 8,                           '[C-05] all 8 skipped');
assert(typeof noInputs.orchestrator_id === 'string',             '[C-06] orchestrator_id is string');
assert(noInputs.orchestrator_id.startsWith('orch_'),             '[C-07] id starts with orch_');

// ─── Suite D: All stages pass → PIPELINE_READY ───────────────────
console.log('\n[Suite D] All stages pass');
const allPass = orchestratePipeline(allReady);
assert(allPass.pipeline_status === 'PIPELINE_READY',    '[D-01] all ready → PIPELINE_READY');
assert(allPass.pipeline_ready  === true,                '[D-02] pipeline_ready=true');
assert(allPass.stages_passed   === 8,                   '[D-03] 8 stages passed');
assert(allPass.stages_blocked  === 0,                   '[D-04] 0 stages blocked');
assert(allPass.stages_skipped  === 0,                   '[D-05] 0 stages skipped');
assert(allPass.blocked_stage_names.length === 0,        '[D-06] no blocked stage names');
assert(allPass.deploy_performed === false,              '[D-07] deploy_performed=false');
assert(allPass.tag_created === false,                   '[D-08] tag_created=false');

// ─── Suite E: Single stage blocked ───────────────────────────────
console.log('\n[Suite E] Single stage blocked');

// Plan blocked
const planBlocked = orchestratePipeline({ ...allReady, releasePlanResult: { plan_status: 'PLAN_BLOCKED_EVIDENCE' } });
assert(planBlocked.pipeline_status === 'PIPELINE_BLOCKED_PLAN', '[E-01] plan blocked → PIPELINE_BLOCKED_PLAN');
assert(planBlocked.blocked_stage_names.includes('release_plan'), '[E-02] release_plan in blocked_stage_names');

// Simulation blocked
const simBlocked = orchestratePipeline({ ...allReady, simulationResult: { simulation_status: 'SIM_BLOCKED_PLAN' } });
assert(simBlocked.pipeline_status === 'PIPELINE_BLOCKED_SIMULATION', '[E-03] sim blocked → PIPELINE_BLOCKED_SIMULATION');

// Gate blocked
const gateBlocked = orchestratePipeline({ ...allReady, manualGateResult: { gate_status: 'MANUAL_RELEASE_BLOCKED_CONFIRMATION' } });
assert(gateBlocked.pipeline_status === 'PIPELINE_BLOCKED_GATE', '[E-04] gate blocked → PIPELINE_BLOCKED_GATE');

// Tag blocked
const tagBlocked = orchestratePipeline({ ...allReady, tagControllerResult: { tag_controller_status: 'TAG_BLOCKED_BRANCH' } });
assert(tagBlocked.pipeline_status === 'PIPELINE_BLOCKED_TAG', '[E-05] tag blocked → PIPELINE_BLOCKED_TAG');

// Stable gate blocked
const stableBlocked = orchestratePipeline({ ...allReady, stableGateResult: { stable_gate_status: 'STABLE_BLOCKED_NO_TAG' } });
assert(stableBlocked.pipeline_status === 'PIPELINE_BLOCKED_STABLE', '[E-06] stable blocked → PIPELINE_BLOCKED_STABLE');

// Rollback blocked
const rollbackBlocked = orchestratePipeline({ ...allReady, rollbackDrillResult: { rollback_drill_status: 'ROLLBACK_BLOCKED_PLAN' } });
assert(rollbackBlocked.pipeline_status === 'PIPELINE_BLOCKED_ROLLBACK', '[E-07] rollback blocked → PIPELINE_BLOCKED_ROLLBACK');

// Ledger blocked
const ledgerBlocked = orchestratePipeline({ ...allReady, auditLedgerResult: { valid: false } });
assert(ledgerBlocked.pipeline_status === 'PIPELINE_BLOCKED_LEDGER', '[E-08] ledger blocked → PIPELINE_BLOCKED_LEDGER');

// Chain blocked
const chainBlocked = orchestratePipeline({ ...allReady, chainValidatorResult: { chain_validator_status: 'CHAIN_BLOCKED_INTEGRITY' } });
assert(chainBlocked.pipeline_status === 'PIPELINE_BLOCKED_CHAIN', '[E-09] chain blocked → PIPELINE_BLOCKED_CHAIN');

// ─── Suite F: Multiple blocked ────────────────────────────────────
console.log('\n[Suite F] Multiple stages blocked');
const multBlocked = orchestratePipeline({
  releasePlanResult:    { plan_status: 'PLAN_BLOCKED_EVIDENCE' },
  simulationResult:     { simulation_status: 'SIM_BLOCKED_PLAN' },
  // rest null
});
assert(multBlocked.pipeline_status === 'PIPELINE_BLOCKED_MULTIPLE', '[F-01] multiple blocked → PIPELINE_BLOCKED_MULTIPLE');
assert(multBlocked.stages_blocked >= 2,                             '[F-02] stages_blocked >= 2');

// ─── Suite G: Rollback local drill pass also accepted ────────────
console.log('\n[Suite G] Rollback local drill pass accepted');
const localDrillPass = orchestratePipeline({
  ...allReady,
  rollbackDrillResult: { rollback_drill_status: 'ROLLBACK_LOCAL_DRILL_PASS' },
});
assert(localDrillPass.pipeline_status === 'PIPELINE_READY',        '[G-01] ROLLBACK_LOCAL_DRILL_PASS → PIPELINE_READY');
assert(localDrillPass.pipeline_ready === true,                     '[G-02] pipeline_ready=true with local drill pass');

// ─── Suite H: Stage details present ──────────────────────────────
console.log('\n[Suite H] Stage details');
const withDetails = orchestratePipeline(allReady);
assert(typeof withDetails.stage_details === 'object',              '[H-01] stage_details is object');
assert(withDetails.stage_details.release_plan.pass === true,       '[H-02] release_plan detail pass=true');
assert(withDetails.stage_details.chain_validator.pass === true,    '[H-03] chain_validator detail pass=true');
assert(withDetails.stage_details.release_plan.reason === null,     '[H-04] passing stage reason=null');
const withOneBlocked = orchestratePipeline({ ...allReady, releasePlanResult: { plan_status: 'PLAN_BLOCKED_EVIDENCE' } });
assert(typeof withOneBlocked.stage_details.release_plan.reason === 'string', '[H-05] blocked stage has reason string');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI entrypoint');

// No inputs → PIPELINE_BLOCKED_MULTIPLE, exit 2
const cliNone = runCLI(['--json']);
assert(cliNone.exitCode === 2,                                          '[I-01] no inputs → exit 2');
(() => {
  try {
    const o = JSON.parse(cliNone.stdout);
    assert(o.pipeline_status === 'PIPELINE_BLOCKED_MULTIPLE',          '[I-02] → PIPELINE_BLOCKED_MULTIPLE');
    assert(o.deploy_performed === false,                                '[I-03] deploy_performed=false');
    assert(o.pipeline_ready   === false,                               '[I-04] pipeline_ready=false');
  } catch { assert(false, '[I-02..04] valid JSON'); }
})();

// ─── Result ───────────────────────────────────────────────────────
console.log(`\nPipeline Orchestrator Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
