#!/usr/bin/env node
/**
 * Release Pipeline Orchestrator — V18.0
 *
 * Coordinates all pipeline stages and produces a unified pipeline
 * status report. Reads outputs from each stage tool and classifies
 * the overall pipeline readiness.
 * Classification only — never executes, deploys, or promotes.
 *
 * REGRA ABSOLUTA:
 * - deploy_performed=false always.
 * - tag_created=false always.
 * - stable_promoted=false always.
 * - Orchestrator reads stage results; never performs any release action.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v18.0';

const PIPELINE_STAGES = [
  'release_plan',
  'simulation',
  'manual_gate',
  'tag_controller',
  'stable_gate',
  'rollback_drill',
  'audit_ledger',
  'chain_validator',
];

const PIPELINE_STATUSES = [
  'PIPELINE_READY',                      // all stages pass
  'PIPELINE_BLOCKED_PLAN',               // release plan stage blocked
  'PIPELINE_BLOCKED_SIMULATION',         // simulation stage blocked
  'PIPELINE_BLOCKED_GATE',               // manual gate stage blocked
  'PIPELINE_BLOCKED_TAG',                // tag controller stage blocked
  'PIPELINE_BLOCKED_STABLE',             // stable gate stage blocked
  'PIPELINE_BLOCKED_ROLLBACK',           // rollback drill stage blocked
  'PIPELINE_BLOCKED_LEDGER',             // audit ledger stage blocked
  'PIPELINE_BLOCKED_CHAIN',              // chain validator stage blocked
  'PIPELINE_BLOCKED_MULTIPLE',           // multiple stages blocked
];

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * @param {Object} input
 * @param {Object} input.releasePlanResult       - Output of release-plan-generator
 * @param {Object} input.simulationResult        - Output of release-execution-simulator
 * @param {Object} input.manualGateResult        - Output of manual-release-gate
 * @param {Object} input.tagControllerResult     - Output of github-release-tag-controller
 * @param {Object} input.stableGateResult        - Output of stable-promotion-gate
 * @param {Object} input.rollbackDrillResult     - Output of rollback-drill
 * @param {Object} input.auditLedgerResult       - Output of release-audit-ledger validate
 * @param {Object} input.chainValidatorResult    - Output of release-evidence-chain-validator
 * @param {string} input.gitHead
 * @param {string} input.branch
 */
function orchestratePipeline(input = {}) {
  const {
    releasePlanResult    = null,
    simulationResult     = null,
    manualGateResult     = null,
    tagControllerResult  = null,
    stableGateResult     = null,
    rollbackDrillResult  = null,
    auditLedgerResult    = null,
    chainValidatorResult = null,
    gitHead              = null,
    branch               = null,
  } = input;

  const orchestratorId = _buildId(gitHead, branch);
  const evaluatedAt    = new Date().toISOString();

  // ── Evaluate each stage ──────────────────────────────────────────
  const stageEvals = {
    release_plan:    _evalPlan(releasePlanResult),
    simulation:      _evalSimulation(simulationResult),
    manual_gate:     _evalManualGate(manualGateResult),
    tag_controller:  _evalTagController(tagControllerResult),
    stable_gate:     _evalStableGate(stableGateResult),
    rollback_drill:  _evalRollback(rollbackDrillResult),
    audit_ledger:    _evalLedger(auditLedgerResult),
    chain_validator: _evalChain(chainValidatorResult),
  };

  const blockedStages  = PIPELINE_STAGES.filter(s => !stageEvals[s].pass);
  const passedStages   = PIPELINE_STAGES.filter(s => stageEvals[s].pass);
  const skippedStages  = PIPELINE_STAGES.filter(s => stageEvals[s].skipped);

  // ── Overall status ───────────────────────────────────────────────
  let pipelineStatus;
  if (blockedStages.length === 0) {
    pipelineStatus = 'PIPELINE_READY';
  } else if (blockedStages.length > 1) {
    pipelineStatus = 'PIPELINE_BLOCKED_MULTIPLE';
  } else {
    const stageStatusMap = {
      release_plan:    'PIPELINE_BLOCKED_PLAN',
      simulation:      'PIPELINE_BLOCKED_SIMULATION',
      manual_gate:     'PIPELINE_BLOCKED_GATE',
      tag_controller:  'PIPELINE_BLOCKED_TAG',
      stable_gate:     'PIPELINE_BLOCKED_STABLE',
      rollback_drill:  'PIPELINE_BLOCKED_ROLLBACK',
      audit_ledger:    'PIPELINE_BLOCKED_LEDGER',
      chain_validator: 'PIPELINE_BLOCKED_CHAIN',
    };
    pipelineStatus = stageStatusMap[blockedStages[0]] || 'PIPELINE_BLOCKED_MULTIPLE';
  }

  return {
    schema_version:      SCHEMA_VERSION,
    orchestrator_id:     orchestratorId,
    pipeline_status:     pipelineStatus,
    pipeline_ready:      pipelineStatus === 'PIPELINE_READY',
    stages_total:        PIPELINE_STAGES.length,
    stages_passed:       passedStages.length,
    stages_blocked:      blockedStages.length,
    stages_skipped:      skippedStages.length,
    blocked_stage_names: blockedStages,
    passed_stage_names:  passedStages,
    skipped_stage_names: skippedStages,
    stage_details:       stageEvals,
    evaluated_at:        evaluatedAt,
    git_head:            gitHead,
    branch:              branch,

    // Invariants — always false
    deploy_performed:    false,
    deploy_allowed:      false,
    tag_created:         false,
    stable_promoted:     false,
    release_performed:   false,

    note: 'Pipeline orchestrator — classification only. Never executes in V18.0',
  };
}

// ═══════════════════════════════════════════════════════════════════
// STAGE EVALUATORS
// ═══════════════════════════════════════════════════════════════════

function _evalPlan(r) {
  if (!r) return { pass: false, skipped: true,  status: 'NOT_PROVIDED', reason: 'No release plan result' };
  const pass = r.plan_status === 'PLAN_READY';
  return { pass, skipped: false, status: r.plan_status || 'UNKNOWN', reason: pass ? null : `plan_status=${r.plan_status}` };
}

function _evalSimulation(r) {
  if (!r) return { pass: false, skipped: true, status: 'NOT_PROVIDED', reason: 'No simulation result' };
  const pass = r.simulation_status === 'SIM_READY_MANUAL_RELEASE';
  return { pass, skipped: false, status: r.simulation_status || 'UNKNOWN', reason: pass ? null : `simulation_status=${r.simulation_status}` };
}

function _evalManualGate(r) {
  if (!r) return { pass: false, skipped: true, status: 'NOT_PROVIDED', reason: 'No manual gate result' };
  const pass = r.gate_status === 'MANUAL_RELEASE_READY';
  return { pass, skipped: false, status: r.gate_status || 'UNKNOWN', reason: pass ? null : `gate_status=${r.gate_status}` };
}

function _evalTagController(r) {
  if (!r) return { pass: false, skipped: true, status: 'NOT_PROVIDED', reason: 'No tag controller result' };
  const pass = r.tag_controller_status === 'TAG_DRY_RUN_READY';
  return { pass, skipped: false, status: r.tag_controller_status || 'UNKNOWN', reason: pass ? null : `tag_controller_status=${r.tag_controller_status}` };
}

function _evalStableGate(r) {
  if (!r) return { pass: false, skipped: true, status: 'NOT_PROVIDED', reason: 'No stable gate result' };
  const pass = r.stable_gate_status === 'STABLE_READY_MANUAL_PROMOTION';
  return { pass, skipped: false, status: r.stable_gate_status || 'UNKNOWN', reason: pass ? null : `stable_gate_status=${r.stable_gate_status}` };
}

function _evalRollback(r) {
  if (!r) return { pass: false, skipped: true, status: 'NOT_PROVIDED', reason: 'No rollback drill result' };
  const pass = r.rollback_drill_status === 'ROLLBACK_DRY_RUN_READY' || r.rollback_drill_status === 'ROLLBACK_LOCAL_DRILL_PASS';
  return { pass, skipped: false, status: r.rollback_drill_status || 'UNKNOWN', reason: pass ? null : `rollback_drill_status=${r.rollback_drill_status}` };
}

function _evalLedger(r) {
  if (!r) return { pass: false, skipped: true, status: 'NOT_PROVIDED', reason: 'No audit ledger result' };
  const pass = r.valid === true;
  return { pass, skipped: false, status: pass ? 'LEDGER_VALID' : 'LEDGER_INVALID', reason: pass ? null : `valid=${r.valid}` };
}

function _evalChain(r) {
  if (!r) return { pass: false, skipped: true, status: 'NOT_PROVIDED', reason: 'No chain validator result' };
  const pass = r.chain_validator_status === 'CHAIN_VALID';
  return { pass, skipped: false, status: r.chain_validator_status || 'UNKNOWN', reason: pass ? null : `chain_validator_status=${r.chain_validator_status}` };
}

function _buildId(gitHead, branch) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const raw   = `${gitHead || 'unknown'}:${branch || 'unknown'}:${Date.now()}:${nonce}`;
  return `orch_${createHash('sha256').update(raw).digest('hex').slice(0, 12)}`;
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('release-pipeline-orchestrator.mjs')) {
  _runCLI();
}

function _runCLI() {
  const args  = process.argv.slice(2);
  const flags = { json: false, gitHead: null, branch: null, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--json':      flags.json    = true; break;
      case '--git-head':  flags.gitHead = args[++i] || null; break;
      case '--branch':    flags.branch  = args[++i] || null; break;
      case '--dry-run':   flags.dryRun  = true; break;
      default: break;
    }
  }

  // In dry-run mode with no inputs, all stages are skipped → multiple blocked
  const result = orchestratePipeline({ gitHead: flags.gitHead, branch: flags.branch });

  if (flags.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else {
    process.stdout.write(`pipeline_status: ${result.pipeline_status}\n`);
    process.stdout.write(`pipeline_ready: ${result.pipeline_ready}\n`);
    process.stdout.write(`stages_passed: ${result.stages_passed}/${result.stages_total}\n`);
    if (result.blocked_stage_names.length > 0) {
      process.stdout.write(`blocked_stages: ${result.blocked_stage_names.join(', ')}\n`);
    }
  }
  process.exit(result.pipeline_ready ? 0 : 2);
}

export {
  orchestratePipeline,
  PIPELINE_STAGES,
  PIPELINE_STATUSES,
  SCHEMA_VERSION as PIPELINE_SCHEMA_VERSION,
};
