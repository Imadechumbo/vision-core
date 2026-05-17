#!/usr/bin/env node
/**
 * Manual Release Gate — Unit Tests V16.0.1
 * No subprocess spawning for unit suites. CLI suite uses spawnSync.
 */

import { spawnSync }  from 'child_process';
import { resolve }    from 'path';
import {
  evaluateManualReleaseGate,
  GATE_STATUSES,
  GATE_SCHEMA_VERSION,
} from '../manual-release-gate.mjs';

const GATE_CLI = resolve(process.cwd(), 'tools', 'manual-release-gate.mjs');

function runGateCLI(args = []) {
  const result = spawnSync(process.execPath, ['--no-deprecation', GATE_CLI, ...args], {
    encoding: 'utf-8',
    timeout:  15000,
  });
  return {
    stdout:   result.stdout || '',
    stderr:   result.stderr || '',
    exitCode: result.status,
  };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Shared fixtures
// ═══════════════════════════════════════════════════════════════════

const readySimulation = {
  simulation_status: 'SIM_READY_MANUAL_RELEASE',
  simulation_safe:   true,
};

const blockedSimulation = {
  simulation_status: 'SIM_BLOCKED_PLAN',
  simulation_safe:   false,
};

const goodEvidence = {
  id:     'ev_gocore_v160_test',
  source: 'go-core',
};

const badEvidence = {
  id:     'ev_manual_001',
  source: 'human',
};

const readyBinding = {
  status:      'BINDING_READY',
  contract_id: 'contract_v160_test',
  reviewer:    'pass_gold_authority',
};

const blockedBinding = {
  status:      'BINDING_BLOCKED_EVIDENCE',
  contract_id: null,
};

const goodRollback = {
  rollback_target: 'abc123def456',
  steps:           [{ id: 'snapshot', description: 'Record state' }],
};

const emptyRollback = {
  rollback_target: null,
  steps:           [],
};

const allConfirmations = {
  manualReleaseIntent:  true,
  noAutoDeploy:         true,
  noStablePromotion:    true,
  rollbackPlanReviewed: true,
};

const partialConfirmations = {
  manualReleaseIntent:  true,
  noAutoDeploy:         false,
  noStablePromotion:    true,
  rollbackPlanReviewed: true,
};

const fullInput = {
  simulationResult:  readySimulation,
  evidenceReceipt:   goodEvidence,
  authorityBinding:  readyBinding,
  rollbackPlan:      goodRollback,
  gitClean:          true,
  ciGreenEvidence:   true,
  confirmations:     allConfirmations,
  gitHead:           'abc123def456',
  branch:            'feat/v160-test',
};

// ═══════════════════════════════════════════════════════════════════
// Suite A — Constants and Schema
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite A] Constants and Schema');

assert(GATE_SCHEMA_VERSION === 'v16.0',                               '[A-01] GATE_SCHEMA_VERSION=v16.0');
assert(Array.isArray(GATE_STATUSES) && GATE_STATUSES.length === 6,    '[A-02] GATE_STATUSES has 6 entries');
assert(GATE_STATUSES.includes('MANUAL_RELEASE_READY'),                '[A-03] MANUAL_RELEASE_READY present');
assert(GATE_STATUSES.includes('MANUAL_RELEASE_BLOCKED_SIMULATION'),   '[A-04] MANUAL_RELEASE_BLOCKED_SIMULATION present');
assert(GATE_STATUSES.includes('MANUAL_RELEASE_BLOCKED_EVIDENCE'),     '[A-05] MANUAL_RELEASE_BLOCKED_EVIDENCE present');
assert(GATE_STATUSES.includes('MANUAL_RELEASE_BLOCKED_AUTHORITY'),    '[A-06] MANUAL_RELEASE_BLOCKED_AUTHORITY present');
assert(GATE_STATUSES.includes('MANUAL_RELEASE_BLOCKED_ROLLBACK'),     '[A-07] MANUAL_RELEASE_BLOCKED_ROLLBACK present');
assert(GATE_STATUSES.includes('MANUAL_RELEASE_BLOCKED_CONFIRMATION'), '[A-08] MANUAL_RELEASE_BLOCKED_CONFIRMATION present');

// ═══════════════════════════════════════════════════════════════════
// Suite B — Invariants always false
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite B] Invariants — always false');

const anyResult = evaluateManualReleaseGate({});
assert(anyResult.deploy_allowed    === false, '[B-01] empty → deploy_allowed=false');
assert(anyResult.tag_allowed       === false, '[B-02] empty → tag_allowed=false');
assert(anyResult.stable_allowed    === false, '[B-03] empty → stable_allowed=false');
assert(anyResult.deploy_performed  === false, '[B-04] empty → deploy_performed=false');
assert(anyResult.tag_created       === false, '[B-05] empty → tag_created=false');
assert(anyResult.stable_promoted   === false, '[B-06] empty → stable_promoted=false');
assert(anyResult.release_performed === false, '[B-07] empty → release_performed=false');
assert(anyResult.promotion_allowed === false, '[B-08] empty → promotion_allowed=false');
assert(anyResult.schema_version === 'v16.0',  '[B-09] schema_version=v16.0');

const readyResult = evaluateManualReleaseGate(fullInput);
assert(readyResult.deploy_allowed    === false, '[B-10] ready → deploy_allowed=false');
assert(readyResult.tag_allowed       === false, '[B-11] ready → tag_allowed=false');
assert(readyResult.stable_allowed    === false, '[B-12] ready → stable_allowed=false');
assert(readyResult.deploy_performed  === false, '[B-13] ready → deploy_performed=false');
assert(readyResult.tag_created       === false, '[B-14] ready → tag_created=false');
assert(readyResult.stable_promoted   === false, '[B-15] ready → stable_promoted=false');
assert(readyResult.release_performed === false, '[B-16] ready → release_performed=false');

// ═══════════════════════════════════════════════════════════════════
// Suite C — Blocked scenarios (priority order)
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite C] Blocked scenarios');

// No simulation → MANUAL_RELEASE_BLOCKED_SIMULATION
const pNoSim = evaluateManualReleaseGate({});
assert(pNoSim.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_SIMULATION', '[C-01] no sim → MANUAL_RELEASE_BLOCKED_SIMULATION');
assert(pNoSim.manual_release_gate_ready  === false,                                '[C-02] no sim → gate_ready=false');
assert(pNoSim.manual_release_gate_valid  === false,                                '[C-03] no sim → gate_valid=false');

// Blocked simulation → MANUAL_RELEASE_BLOCKED_SIMULATION
const pBadSim = evaluateManualReleaseGate({ ...fullInput, simulationResult: blockedSimulation });
assert(pBadSim.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_SIMULATION', '[C-04] blocked sim → MANUAL_RELEASE_BLOCKED_SIMULATION');

// Null simulation → MANUAL_RELEASE_BLOCKED_SIMULATION
const pNullSim = evaluateManualReleaseGate({ ...fullInput, simulationResult: null });
assert(pNullSim.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_SIMULATION', '[C-05] null sim → MANUAL_RELEASE_BLOCKED_SIMULATION');

// No evidence → MANUAL_RELEASE_BLOCKED_EVIDENCE
const pNoEv = evaluateManualReleaseGate({ ...fullInput, evidenceReceipt: null });
assert(pNoEv.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_EVIDENCE', '[C-06] no evidence → MANUAL_RELEASE_BLOCKED_EVIDENCE');

// Bad evidence source → MANUAL_RELEASE_BLOCKED_EVIDENCE
const pBadEv = evaluateManualReleaseGate({ ...fullInput, evidenceReceipt: badEvidence });
assert(pBadEv.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_EVIDENCE', '[C-07] bad evidence → MANUAL_RELEASE_BLOCKED_EVIDENCE');

// Blocked authority → MANUAL_RELEASE_BLOCKED_AUTHORITY
const pNoAuth = evaluateManualReleaseGate({ ...fullInput, authorityBinding: blockedBinding });
assert(pNoAuth.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_AUTHORITY', '[C-08] blocked auth → MANUAL_RELEASE_BLOCKED_AUTHORITY');

// Null authority → MANUAL_RELEASE_BLOCKED_AUTHORITY
const pNullAuth = evaluateManualReleaseGate({ ...fullInput, authorityBinding: null });
assert(pNullAuth.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_AUTHORITY', '[C-09] null auth → MANUAL_RELEASE_BLOCKED_AUTHORITY');

// Empty rollback → MANUAL_RELEASE_BLOCKED_ROLLBACK
const pNoRoll = evaluateManualReleaseGate({ ...fullInput, rollbackPlan: emptyRollback });
assert(pNoRoll.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_ROLLBACK', '[C-10] empty rollback → MANUAL_RELEASE_BLOCKED_ROLLBACK');

// Null rollback → MANUAL_RELEASE_BLOCKED_ROLLBACK
const pNullRoll = evaluateManualReleaseGate({ ...fullInput, rollbackPlan: null });
assert(pNullRoll.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_ROLLBACK', '[C-11] null rollback → MANUAL_RELEASE_BLOCKED_ROLLBACK');

// Partial confirmations → MANUAL_RELEASE_BLOCKED_CONFIRMATION
const pPartConf = evaluateManualReleaseGate({ ...fullInput, confirmations: partialConfirmations });
assert(pPartConf.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_CONFIRMATION', '[C-12] partial confirmations → MANUAL_RELEASE_BLOCKED_CONFIRMATION');
assert(pPartConf.manual_release_gate_ready  === false,                                  '[C-13] partial conf → gate_ready=false');

// No confirmations → MANUAL_RELEASE_BLOCKED_CONFIRMATION
const pNoConf = evaluateManualReleaseGate({ ...fullInput, confirmations: {} });
assert(pNoConf.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_CONFIRMATION', '[C-14] no confirmations → MANUAL_RELEASE_BLOCKED_CONFIRMATION');

// Null confirmations → MANUAL_RELEASE_BLOCKED_CONFIRMATION
const pNullConf = evaluateManualReleaseGate({ ...fullInput, confirmations: null });
assert(pNullConf.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_CONFIRMATION', '[C-15] null confirmations → MANUAL_RELEASE_BLOCKED_CONFIRMATION');

// ═══════════════════════════════════════════════════════════════════
// Suite D — MANUAL_RELEASE_READY
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite D] MANUAL_RELEASE_READY');

const g = evaluateManualReleaseGate(fullInput);
assert(g.manual_release_gate_status === 'MANUAL_RELEASE_READY', '[D-01] all conditions → MANUAL_RELEASE_READY');
assert(g.manual_release_gate_ready  === true,                   '[D-02] ready → gate_ready=true');
assert(g.manual_release_gate_valid  === true,                   '[D-03] ready → gate_valid=true');
assert(Array.isArray(g.manual_release_gate_blockers),           '[D-04] blockers is array');
assert(g.manual_release_gate_blockers.length === 0,             '[D-05] ready → no blockers');
assert(typeof g.manual_release_gate_id === 'string',            '[D-06] gate_id is string');
assert(g.manual_release_gate_id.startsWith('gate_'),            '[D-07] gate_id starts with gate_');
assert(typeof g.created_at === 'string',                        '[D-08] created_at is string');
assert(g.git_head === 'abc123def456',                           '[D-09] git_head populated');
assert(g.branch === 'feat/v160-test',                           '[D-10] branch populated');
assert(typeof g.note === 'string' && g.note.length > 0,         '[D-11] note present');

// ═══════════════════════════════════════════════════════════════════
// Suite E — Inputs evaluated
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite E] Inputs evaluated');

const inputs = g.inputs_evaluated;
assert(typeof inputs === 'object' && inputs !== null,               '[E-01] inputs_evaluated is object');
assert(inputs.simulation_status === 'SIM_READY_MANUAL_RELEASE',    '[E-02] simulation_status populated');
assert(inputs.simulation_safe   === true,                           '[E-03] simulation_safe populated');
assert(inputs.evidence_receipt_id === 'ev_gocore_v160_test',        '[E-04] evidence_receipt_id populated');
assert(inputs.evidence_source === 'go-core',                        '[E-05] evidence_source=go-core');
assert(inputs.authority_binding_status === 'BINDING_READY',        '[E-06] authority_binding_status populated');
assert(inputs.authority_contract_id === 'contract_v160_test',      '[E-07] authority_contract_id populated');
assert(inputs.rollback_target === 'abc123def456',                   '[E-08] rollback_target populated');
assert(inputs.rollback_steps_count === 1,                           '[E-09] rollback_steps_count=1');
assert(inputs.git_clean === true,                                   '[E-10] git_clean=true');
assert(inputs.ci_green_evidence === true,                           '[E-11] ci_green_evidence=true');

// ═══════════════════════════════════════════════════════════════════
// Suite F — Confirmations received
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite F] Confirmations received');

const confs = g.confirmations_received;
assert(typeof confs === 'object' && confs !== null,       '[F-01] confirmations_received is object');
assert(confs.manual_release_intent  === true,             '[F-02] manual_release_intent=true');
assert(confs.no_auto_deploy         === true,             '[F-03] no_auto_deploy=true');
assert(confs.no_stable_promotion    === true,             '[F-04] no_stable_promotion=true');
assert(confs.rollback_plan_reviewed === true,             '[F-05] rollback_plan_reviewed=true');

// Partial confirmations reflected correctly
const partConfs = evaluateManualReleaseGate({ ...fullInput, confirmations: partialConfirmations }).confirmations_received;
assert(partConfs.manual_release_intent === true,          '[F-06] partial → manual_release_intent still true');
assert(partConfs.no_auto_deploy        === false,         '[F-07] partial → no_auto_deploy=false');

// ═══════════════════════════════════════════════════════════════════
// Suite G — Required flags
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite G] Required flags');

const flags = g.required_flags;
assert(Array.isArray(flags),                                    '[G-01] required_flags is array');
assert(flags.includes('--manual-release-intent'),               '[G-02] --manual-release-intent listed');
assert(flags.includes('--confirm-no-auto-deploy'),              '[G-03] --confirm-no-auto-deploy listed');
assert(flags.includes('--confirm-no-stable-promotion'),         '[G-04] --confirm-no-stable-promotion listed');
assert(flags.includes('--confirm-rollback-plan-reviewed'),      '[G-05] --confirm-rollback-plan-reviewed listed');

// ═══════════════════════════════════════════════════════════════════
// Suite H — Blockers detail
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite H] Blockers detail');

const noSimBlockers = evaluateManualReleaseGate({}).manual_release_gate_blockers;
assert(noSimBlockers.includes('SIMULATION_NOT_READY'),            '[H-01] no sim → SIMULATION_NOT_READY in blockers');
assert(noSimBlockers.includes('EVIDENCE_MISSING_OR_INVALID'),     '[H-02] no sim → EVIDENCE_MISSING_OR_INVALID in blockers');
assert(noSimBlockers.includes('AUTHORITY_BINDING_NOT_READY'),     '[H-03] no sim → AUTHORITY_BINDING_NOT_READY in blockers');
assert(noSimBlockers.includes('ROLLBACK_PLAN_MISSING'),           '[H-04] no sim → ROLLBACK_PLAN_MISSING in blockers');

const noConfBlockers = evaluateManualReleaseGate({ ...fullInput, confirmations: {} }).manual_release_gate_blockers;
assert(noConfBlockers.includes('CONFIRMATIONS_MISSING'),                          '[H-05] no conf → CONFIRMATIONS_MISSING in blockers');
assert(noConfBlockers.includes('MISSING_FLAG_manual_release_intent'),             '[H-06] no conf → MISSING_FLAG_manual_release_intent');
assert(noConfBlockers.includes('MISSING_FLAG_confirm_no_auto_deploy'),            '[H-07] no conf → MISSING_FLAG_confirm_no_auto_deploy');
assert(noConfBlockers.includes('MISSING_FLAG_confirm_no_stable_promotion'),       '[H-08] no conf → MISSING_FLAG_confirm_no_stable_promotion');
assert(noConfBlockers.includes('MISSING_FLAG_confirm_rollback_plan_reviewed'),    '[H-09] no conf → MISSING_FLAG_confirm_rollback_plan_reviewed');

// ═══════════════════════════════════════════════════════════════════
// Suite I — Edge cases
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite I] Edge cases');

const pEmpty = evaluateManualReleaseGate();
assert(typeof pEmpty.manual_release_gate_status === 'string', '[I-01] no args → no crash');
assert(pEmpty.deploy_allowed   === false,                     '[I-02] no args → deploy_allowed=false');
assert(pEmpty.tag_allowed      === false,                     '[I-03] no args → tag_allowed=false');
assert(pEmpty.stable_allowed   === false,                     '[I-04] no args → stable_allowed=false');

const pNull = evaluateManualReleaseGate({ simulationResult: null, evidenceReceipt: null, authorityBinding: null });
assert(typeof pNull.manual_release_gate_status === 'string',  '[I-05] null inputs → no crash');
assert(pNull.deploy_performed  === false,                     '[I-06] null inputs → deploy_performed=false');

// Gate IDs unique per call
const gA = evaluateManualReleaseGate(fullInput);
const gB = evaluateManualReleaseGate(fullInput);
assert(gA.manual_release_gate_id !== gB.manual_release_gate_id, '[I-07] gate_ids are unique');

// MANUAL_RELEASE_READY does NOT execute anything
assert(g.deploy_performed  === false,  '[I-08] MANUAL_RELEASE_READY → deploy_performed=false');
assert(g.tag_created       === false,  '[I-09] MANUAL_RELEASE_READY → tag_created=false');
assert(g.stable_promoted   === false,  '[I-10] MANUAL_RELEASE_READY → stable_promoted=false');
assert(g.release_performed === false,  '[I-11] MANUAL_RELEASE_READY → release_performed=false');

// ═══════════════════════════════════════════════════════════════════
// Suite J — CLI entrypoint
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite J] CLI entrypoint');

// No flags → blocked JSON + exit 2
const cliNoFlags = runGateCLI(['--dry-run', '--json']);
assert(cliNoFlags.exitCode === 2,                                                       '[J-01] no flags → exit code 2');
assert(cliNoFlags.stdout.length > 0,                                                    '[J-02] no flags → stdout not empty');
(() => {
  try {
    const out = JSON.parse(cliNoFlags.stdout);
    assert(out.manual_release_gate_status === 'MANUAL_RELEASE_BLOCKED_SIMULATION',     '[J-03] no flags → MANUAL_RELEASE_BLOCKED_SIMULATION');
    assert(out.manual_release_gate_ready  === false,                                   '[J-04] no flags → gate_ready=false');
    assert(out.deploy_allowed             === false,                                   '[J-05] no flags → deploy_allowed=false');
    assert(out.tag_allowed                === false,                                   '[J-06] no flags → tag_allowed=false');
    assert(out.stable_allowed             === false,                                   '[J-07] no flags → stable_allowed=false');
  } catch {
    assert(false, '[J-03..07] no flags → valid JSON output');
  }
})();

// Incomplete flags → blocked JSON + exit 2
const cliPartial = runGateCLI([
  '--dry-run', '--json',
  '--manual-release-intent', '--confirm-no-auto-deploy',
]);
assert(cliPartial.exitCode === 2,                                                        '[J-08] partial flags → exit code 2');
(() => {
  try {
    const out = JSON.parse(cliPartial.stdout);
    assert(out.manual_release_gate_ready === false,                                    '[J-09] partial flags → gate_ready=false');
    assert(out.confirmations_received.manual_release_intent === true,                  '[J-10] partial flags → manual_release_intent captured');
    assert(out.confirmations_received.no_stable_promotion   === false,                 '[J-11] partial flags → no_stable_promotion=false');
  } catch {
    assert(false, '[J-09..11] partial flags → valid JSON');
  }
})();

// All flags → MANUAL_RELEASE_READY + exit 0
const cliReady = runGateCLI([
  '--dry-run', '--json',
  '--manual-release-intent', '--confirm-no-auto-deploy',
  '--confirm-no-stable-promotion', '--confirm-rollback-plan-reviewed',
  '--simulation-ready',
  '--evidence-receipt-id', 'ev_cli_test', '--evidence-source', 'go-core',
  '--authority-binding-ready', '--authority-contract-id', 'contract_cli_test',
  '--rollback-target', 'deadbeef123', '--rollback-step', 'snapshot current state',
  '--git-clean', '--ci-green',
]);
assert(cliReady.exitCode === 0,                                                          '[J-12] all flags → exit code 0');
(() => {
  try {
    const out = JSON.parse(cliReady.stdout);
    assert(out.manual_release_gate_status === 'MANUAL_RELEASE_READY',                 '[J-13] all flags → MANUAL_RELEASE_READY');
    assert(out.manual_release_gate_ready  === true,                                   '[J-14] all flags → gate_ready=true');
    assert(out.deploy_allowed             === false,                                   '[J-15] MANUAL_RELEASE_READY → deploy_allowed=false');
    assert(out.tag_allowed                === false,                                   '[J-16] MANUAL_RELEASE_READY → tag_allowed=false');
    assert(out.stable_allowed             === false,                                   '[J-17] MANUAL_RELEASE_READY → stable_allowed=false');
    assert(out.release_performed          === false,                                   '[J-18] MANUAL_RELEASE_READY → release_performed=false');
    assert(out.inputs_evaluated.evidence_receipt_id === 'ev_cli_test',                '[J-19] evidence_receipt_id from CLI');
    assert(out.inputs_evaluated.evidence_source === 'go-core',                        '[J-20] evidence_source=go-core from CLI');
    assert(out.inputs_evaluated.rollback_target === 'deadbeef123',                    '[J-21] rollback_target from CLI');
  } catch {
    assert(false, '[J-13..21] all flags → valid JSON with MANUAL_RELEASE_READY');
  }
})();

// npm run release:gate output is not silent
const cliViaScript = runGateCLI(['--json']);
assert(cliViaScript.stdout.trim().length > 0,                                           '[J-22] release:gate --json → non-empty stdout');

// ═══════════════════════════════════════════════════════════════════
// Result
// ═══════════════════════════════════════════════════════════════════

console.log(`\nManual Release Gate Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
