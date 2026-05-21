#!/usr/bin/env node
/**
 * Tests — Real Execution Dry-Run Proof Report V149.1
 */

import {
  buildDryRunProofReport,
  validateDryRunProofReport,
  renderDryRunProofReport,
  DRY_RUN_PROOF_REPORT_STATUSES,
} from '../real-execution-dry-run-proof-report.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const FULL_PASS = {
  report_id:                    'report-1',
  agent_name:                   'Claude',
  mission_id:                   'mission-1',
  claim_verification_status:    'CLAIM_VERIFIED',
  filesystem_reality_status:    'FS_REALITY_READY',
  git_diff_truth_status:        'DIFF_TRUTH_BOUND',
  proof_ledger_status:          'PROOF_LEDGER_SEALED',
  hallucination_incident_status: 'HALLUCINATION_INCIDENT_RECORDED',
  agent_truth_status:           'AGENT_TRUTH_TRUSTED',
  controlled_gate_status:       'CONTROLLED_GATE_READY_FOR_HUMAN',
  rollback_readiness_status:    'ROLLBACK_READY',
  reported_at:                  '2026-05-21T14:00:00.000Z',
};

console.log('\n=== real-execution-dry-run-proof-report tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildDryRunProofReport({});
  assert('no report_id → BLOCKED_INPUT', r.dry_run_proof_report_status === 'DRY_RUN_PROOF_REPORT_BLOCKED_INPUT');
  assert('dry_run_proof_complete=false', r.dry_run_proof_complete === false);
  assert('dry_run_proof_report_ready=false', r.dry_run_proof_report_ready === false);
  assert('passed=0', r.passed_subsystem_count === 0);
  assert('execution_allowed=false', r.execution_allowed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
  assert('unsafe_learning_blocked=true', r.unsafe_learning_blocked === true);
  assert('positive_learning_requires_pass_gold=true', r.positive_learning_requires_pass_gold === true);
}
{
  const r = buildDryRunProofReport(null);
  assert('null → BLOCKED_INPUT', r.dry_run_proof_report_status === 'DRY_RUN_PROOF_REPORT_BLOCKED_INPUT');
}

// --- complete ---
console.log('--- complete ---');
{
  const r = buildDryRunProofReport({ ...FULL_PASS });
  assert('all pass → DRY_RUN_PROOF_COMPLETE', r.dry_run_proof_report_status === 'DRY_RUN_PROOF_COMPLETE');
  assert('dry_run_proof_complete=true', r.dry_run_proof_complete === true);
  assert('dry_run_proof_report_ready=true', r.dry_run_proof_report_ready === true);
  assert('schema_version=v149.1', r.schema_version === 'v149.1');
  assert('report_id propagated', r.report_id === 'report-1');
  assert('agent_name propagated', r.agent_name === 'Claude');
  assert('mission_id propagated', r.mission_id === 'mission-1');
  assert('reported_at propagated', r.reported_at === '2026-05-21T14:00:00.000Z');
  assert('passed=8', r.passed_subsystem_count === 8);
  assert('failed=0', r.failed_subsystem_count === 0);
  assert('failed_subsystems empty', r.failed_subsystems.length === 0);
  assert('total=8', r.total_subsystem_count === 8);
  assert('claim_verification_ok=true', r.claim_verification_ok === true);
  assert('filesystem_reality_ok=true', r.filesystem_reality_ok === true);
  assert('git_diff_truth_ok=true', r.git_diff_truth_ok === true);
  assert('proof_ledger_ok=true', r.proof_ledger_ok === true);
  assert('hallucination_incident_ok=true', r.hallucination_incident_ok === true);
  assert('agent_truth_ok=true', r.agent_truth_ok === true);
  assert('controlled_gate_ok=true', r.controlled_gate_ok === true);
  assert('rollback_readiness_ok=true', r.rollback_readiness_ok === true);
  assert('execution_allowed=false', r.execution_allowed === false);
}

// --- PROOF_LEDGER_READY also counts as passing ---
{
  const r = buildDryRunProofReport({ ...FULL_PASS, proof_ledger_status: 'PROOF_LEDGER_READY' });
  assert('PROOF_LEDGER_READY → ledger ok', r.proof_ledger_ok === true);
}

// --- AGENT_TRUTH_SUPERVISED also passes ---
{
  const r = buildDryRunProofReport({ ...FULL_PASS, agent_truth_status: 'AGENT_TRUTH_SUPERVISED' });
  assert('SUPERVISED → agent_truth_ok', r.agent_truth_ok === true);
  assert('still complete', r.dry_run_proof_report_status === 'DRY_RUN_PROOF_COMPLETE');
}

// --- HALLUCINATION_PATTERN_SAFE_RECORDED passes ---
{
  const r = buildDryRunProofReport({ ...FULL_PASS, hallucination_incident_status: 'HALLUCINATION_PATTERN_SAFE_RECORDED' });
  assert('PATTERN_SAFE_RECORDED → hallucination ok', r.hallucination_incident_ok === true);
}

// --- partial ---
console.log('--- partial ---');
{
  const r = buildDryRunProofReport({
    ...FULL_PASS,
    git_diff_truth_status: 'DIFF_TRUTH_MISMATCH',
    proof_ledger_status:   'PROOF_LEDGER_EMPTY',
    agent_truth_status:    'AGENT_TRUTH_BLOCKED',
    rollback_readiness_status: null,
  });
  assert('4 fail → DRY_RUN_PROOF_PARTIAL', r.dry_run_proof_report_status === 'DRY_RUN_PROOF_PARTIAL');
  assert('dry_run_proof_complete=false', r.dry_run_proof_complete === false);
  assert('dry_run_proof_report_ready=false', r.dry_run_proof_report_ready === false);
  assert('passed=4', r.passed_subsystem_count === 4);
  assert('failed=4', r.failed_subsystem_count === 4);
}

// --- incomplete ---
console.log('--- incomplete ---');
{
  const r = buildDryRunProofReport({
    report_id: 'r2',
    claim_verification_status: 'CLAIM_HALLUCINATION_RISK',
    filesystem_reality_status: 'FS_REALITY_MISSING_EXPECTED_FILE',
    git_diff_truth_status:     'DIFF_TRUTH_BLOCKED_EMPTY_DIFF',
    proof_ledger_status:       'PROOF_LEDGER_EMPTY',
    hallucination_incident_status: 'HALLUCINATION_ESCALATION_REQUIRED',
    agent_truth_status:        'AGENT_TRUTH_BLOCKED',
    controlled_gate_status:    'CONTROLLED_GATE_BLOCKED_TRUTH',
  });
  assert('7 of 8 fail → DRY_RUN_PROOF_INCOMPLETE', r.dry_run_proof_report_status === 'DRY_RUN_PROOF_INCOMPLETE');
  assert('dry_run_proof_complete=false', r.dry_run_proof_complete === false);
  assert('failed_subsystems includes rollback_readiness', r.failed_subsystems.includes('rollback_readiness'));
}

// --- null sub-statuses count as fail ---
{
  const r = buildDryRunProofReport({ report_id: 'r3' });
  assert('all null statuses → INCOMPLETE', r.dry_run_proof_report_status === 'DRY_RUN_PROOF_INCOMPLETE');
  assert('passed=0 all null', r.passed_subsystem_count === 0);
  assert('failed=8 all null', r.failed_subsystem_count === 8);
}

// --- failed_subsystems populated correctly ---
{
  const r = buildDryRunProofReport({ ...FULL_PASS, git_diff_truth_status: 'DIFF_TRUTH_MISMATCH' });
  assert('failed_subsystems has git_diff_truth', r.failed_subsystems.includes('git_diff_truth'));
  assert('failed_subsystems length=1', r.failed_subsystems.length === 1);
}

// --- deterministic report_id_hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildDryRunProofReport({ ...FULL_PASS });
  const r2 = buildDryRunProofReport({ ...FULL_PASS });
  assert('report_id_hash deterministic', r1.report_id_hash === r2.report_id_hash);
  assert('report_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.report_id_hash));
}
{
  const r1 = buildDryRunProofReport({ ...FULL_PASS, report_id: 'a' });
  const r2 = buildDryRunProofReport({ ...FULL_PASS, report_id: 'b' });
  assert('different report_id → different hash', r1.report_id_hash !== r2.report_id_hash);
}

// --- reported_at default ---
{
  const r = buildDryRunProofReport({ report_id: 'rx' });
  assert('no reported_at → auto ISO', typeof r.reported_at === 'string' && r.reported_at.length > 0);
}

// --- REGRA ABSOLUTA invariants ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildDryRunProofReport({}),
    buildDryRunProofReport({ ...FULL_PASS }),
    buildDryRunProofReport({ report_id: 'r2', claim_verification_status: 'CLAIM_HALLUCINATION_RISK' }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.dry_run_proof_report_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.dry_run_proof_report_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.dry_run_proof_report_status}]`, r.release_performed === false);
    assert(`execution_allowed=false [${r.dry_run_proof_report_status}]`, r.execution_allowed === false);
    assert(`unsafe_learning_blocked=true [${r.dry_run_proof_report_status}]`, r.unsafe_learning_blocked === true);
    assert(`positive_learning_requires_pass_gold=true [${r.dry_run_proof_report_status}]`, r.positive_learning_requires_pass_gold === true);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildDryRunProofReport({ ...FULL_PASS });
  const v = validateDryRunProofReport(r);
  assert('validate complete → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildDryRunProofReport({});
  const v = validateDryRunProofReport(r);
  assert('validate blocked_input → valid=true struct', v.valid === true);
}
{
  assert('validate null → invalid', validateDryRunProofReport(null).valid === false);
}
{
  const r = buildDryRunProofReport({ ...FULL_PASS });
  const tampered = { ...r, execution_allowed: true };
  assert('execution_allowed tampered → invalid', validateDryRunProofReport(tampered).valid === false);
}
{
  const r = buildDryRunProofReport({ ...FULL_PASS });
  const tampered = { ...r, stable_promoted: true };
  assert('stable_promoted tampered → invalid', validateDryRunProofReport(tampered).valid === false);
}
{
  const r = buildDryRunProofReport({ ...FULL_PASS });
  const tampered = { ...r, unsafe_learning_blocked: false };
  assert('unsafe_learning_blocked tampered → invalid', validateDryRunProofReport(tampered).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildDryRunProofReport({ ...FULL_PASS });
  const s = renderDryRunProofReport(r);
  assert('render string', typeof s === 'string');
  assert('render shows DRY_RUN_PROOF_COMPLETE', s.includes('DRY_RUN_PROOF_COMPLETE'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows report-1', s.includes('report-1'));
  assert('render shows execution_allowed', s.includes('execution_allowed:'));
  assert('render shows claim_verification', s.includes('claim_verification:'));
}
{
  assert('render null graceful', typeof renderDryRunProofReport(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('DRY_RUN_PROOF_REPORT_STATUSES is array', Array.isArray(DRY_RUN_PROOF_REPORT_STATUSES));
  assert('DRY_RUN_PROOF_REPORT_STATUSES length=4', DRY_RUN_PROOF_REPORT_STATUSES.length === 4);
  for (const s of [
    'DRY_RUN_PROOF_REPORT_BLOCKED_INPUT', 'DRY_RUN_PROOF_INCOMPLETE',
    'DRY_RUN_PROOF_PARTIAL', 'DRY_RUN_PROOF_COMPLETE',
  ]) {
    assert(`status present: ${s}`, DRY_RUN_PROOF_REPORT_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
