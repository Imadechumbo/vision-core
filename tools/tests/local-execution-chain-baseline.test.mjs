#!/usr/bin/env node
/**
 * Tests — Local Execution Chain Baseline V166.0 (Capstone)
 */

import {
  buildLocalExecutionChainBaseline,
  validateLocalExecutionChainBaseline,
  renderLocalExecutionChainBaseline,
  LOCAL_EXECUTION_CHAIN_BASELINE_STATUSES,
} from '../local-execution-chain-baseline.mjs';

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

const VALID_PROOF = { proof_status: 'LOCAL_EXECUTION_PROOF_CAPTURED', proof_id: 'proof-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false };
const VALID_RECEIPT = { receipt_status: 'LOCAL_EXECUTION_RECEIPT_READY', receipt_id: 'receipt-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false };
const VALID_LEDGER = { ledger_status: 'LOCAL_EXECUTION_LEDGER_READY', ledger_id: 'ledger-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false };
const VALID_ROLLBACK = { rollback_proof_gate_status: 'LOCAL_ROLLBACK_PROOF_GATE_READY', rollback_proof_id: 'rollback-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false };
const VALID_POST_STATE = { post_state_status: 'LOCAL_POST_STATE_VERIFIED', post_state_verified: true, post_state_id: 'post-state-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false };
const VALID_EVIDENCE = { evidence_package_status: 'LOCAL_EVIDENCE_SEALED', evidence_sealed: true, evidence_package_id: 'evidence-pkg-001', evidence_hash: 'abc123', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false };
const VALID_CANDIDATE = { candidate_status: 'LOCAL_PASS_GOLD_CANDIDATE_PASS', candidate_pass: true, candidate_id: 'candidate-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false };
const VALID_REPORT = { report_status: 'LOCAL_FINAL_REPORT_PASS', pass_gold_local: true, report_id: 'report-001', report_hash: 'xyz789', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false };

const VALID_INPUT = {
  baseline_id: 'baseline-v1660-001',
  proof: VALID_PROOF,
  receipt: VALID_RECEIPT,
  ledger: VALID_LEDGER,
  rollback_gate: VALID_ROLLBACK,
  post_state: VALID_POST_STATE,
  evidence_package: VALID_EVIDENCE,
  candidate_gate: VALID_CANDIDATE,
  final_report: VALID_REPORT,
  local_only: true,
  production_touched: false,
};

console.log('\n=== local-execution-chain-baseline tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(LOCAL_EXECUTION_CHAIN_BASELINE_STATUSES));
assert('has READY', LOCAL_EXECUTION_CHAIN_BASELINE_STATUSES.includes('LOCAL_CHAIN_BASELINE_READY'));
assert('has FAIL', LOCAL_EXECUTION_CHAIN_BASELINE_STATUSES.includes('LOCAL_CHAIN_BASELINE_FAIL'));
assert('has BLOCKED_INPUT', LOCAL_EXECUTION_CHAIN_BASELINE_STATUSES.includes('LOCAL_CHAIN_BASELINE_BLOCKED_INPUT'));
assert('has BLOCKED_PRODUCTION', LOCAL_EXECUTION_CHAIN_BASELINE_STATUSES.includes('LOCAL_CHAIN_BASELINE_BLOCKED_PRODUCTION'));
assert('has BLOCKED_CHAIN', LOCAL_EXECUTION_CHAIN_BASELINE_STATUSES.includes('LOCAL_CHAIN_BASELINE_BLOCKED_CHAIN'));
assert('build is function', typeof buildLocalExecutionChainBaseline === 'function');
assert('validate is function', typeof validateLocalExecutionChainBaseline === 'function');
assert('render is function', typeof renderLocalExecutionChainBaseline === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildLocalExecutionChainBaseline(null);
  assert('null → BLOCKED_INPUT', r.baseline_status === 'LOCAL_CHAIN_BASELINE_BLOCKED_INPUT');
  assert('null: local_only=true', r.local_only === true);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: baseline_ready=false', r.baseline_ready === false);
}
{
  const r = buildLocalExecutionChainBaseline({});
  assert('empty → BLOCKED_INPUT', r.baseline_status === 'LOCAL_CHAIN_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildLocalExecutionChainBaseline({ baseline_id: '  ' });
  assert('blank id → BLOCKED_INPUT', r.baseline_status === 'LOCAL_CHAIN_BASELINE_BLOCKED_INPUT');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildLocalExecutionChainBaseline({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.baseline_status === 'LOCAL_CHAIN_BASELINE_BLOCKED_PRODUCTION');
  assert('production: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildLocalExecutionChainBaseline({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.baseline_status === 'LOCAL_CHAIN_BASELINE_BLOCKED_PRODUCTION');
}
{
  const r = buildLocalExecutionChainBaseline({ ...VALID_INPUT, proof: { ...VALID_PROOF, production_touched: true } });
  assert('component production_touched → BLOCKED_PRODUCTION', r.baseline_status === 'LOCAL_CHAIN_BASELINE_BLOCKED_PRODUCTION');
}

// --- chain fail ---
console.log('--- chain fail ---');
{
  const r = buildLocalExecutionChainBaseline({ ...VALID_INPUT, proof: { proof_status: 'LOCAL_EXECUTION_PROOF_INVALID', proof_id: 'proof-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false } });
  assert('bad proof → FAIL', r.baseline_status === 'LOCAL_CHAIN_BASELINE_FAIL');
  assert('fail: baseline_ready=false', r.baseline_ready === false);
  assert('fail: chain_complete=false', r.chain_complete === false);
  assert('fail: failed_checks not empty', r.failed_checks.length > 0);
  assert('fail: proof_captured=false', r.chain_checks.proof_captured === false);
  assert('fail: production_touched=false', r.production_touched === false);
}
{
  const r = buildLocalExecutionChainBaseline({ ...VALID_INPUT, final_report: { report_status: 'LOCAL_FINAL_REPORT_FAIL', pass_gold_local: false, report_id: 'report-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false } });
  assert('fail final_report → FAIL', r.baseline_status === 'LOCAL_CHAIN_BASELINE_FAIL');
  assert('fail: final_report_pass=false', r.chain_checks.final_report_pass === false);
}

// --- baseline ready ---
console.log('--- baseline ready ---');
{
  const r = buildLocalExecutionChainBaseline(VALID_INPUT);
  assert('valid input → READY', r.baseline_status === 'LOCAL_CHAIN_BASELINE_READY');
  assert('ready: baseline_ready=true', r.baseline_ready === true);
  assert('ready: chain_complete=true', r.chain_complete === true);
  assert('ready: failed_checks empty', r.failed_checks.length === 0);
  assert('ready: all chain_checks true', Object.values(r.chain_checks).every(v => v === true));
  assert('ready: local_only=true', r.local_only === true);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
  assert('ready: schema_version=v166.0', r.schema_version === 'v166.0');
  assert('ready: baseline_id set', r.baseline_id === 'baseline-v1660-001');
  assert('ready: chain_hash is string', typeof r.chain_hash === 'string' && r.chain_hash.length > 0);
  assert('ready: proof_id set', r.proof_id === 'proof-001');
  assert('ready: receipt_id set', r.receipt_id === 'receipt-001');
  assert('ready: ledger_id set', r.ledger_id === 'ledger-001');
  assert('ready: post_state_id set', r.post_state_id === 'post-state-001');
  assert('ready: evidence_package_id set', r.evidence_package_id === 'evidence-pkg-001');
  assert('ready: candidate_id set', r.candidate_id === 'candidate-001');
  assert('ready: report_id set', r.report_id === 'report-001');
}
{
  const r = buildLocalExecutionChainBaseline({
    ...VALID_INPUT,
    rollback_gate: { rollback_proof_gate_status: 'LOCAL_ROLLBACK_PROOF_GATE_COMPLETED', rollback_proof_id: 'rb-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false },
  });
  assert('COMPLETED rollback also → READY', r.baseline_status === 'LOCAL_CHAIN_BASELINE_READY');
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildLocalExecutionChainBaseline(VALID_INPUT);
  const v = validateLocalExecutionChainBaseline(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildLocalExecutionChainBaseline(null);
  const v = validateLocalExecutionChainBaseline(r);
  assert('validate blocked: invariants hold', v.valid === true);
}
{
  const v = validateLocalExecutionChainBaseline(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildLocalExecutionChainBaseline(VALID_INPUT);
  const s = renderLocalExecutionChainBaseline(r);
  assert('render ready: is string', typeof s === 'string');
  assert('render ready: contains READY', s.includes('LOCAL_CHAIN_BASELINE_READY'));
  assert('render ready: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render ready: contains baseline_ready=true', s.includes('LOCAL_EXECUTION_CHAIN_BASELINE_READY=true'));
}
{
  const s = renderLocalExecutionChainBaseline(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildLocalExecutionChainBaseline(null),
    buildLocalExecutionChainBaseline({}),
    buildLocalExecutionChainBaseline(VALID_INPUT),
    buildLocalExecutionChainBaseline({ ...VALID_INPUT, local_only: false }),
    buildLocalExecutionChainBaseline({ ...VALID_INPUT, production_touched: true }),
    buildLocalExecutionChainBaseline({ ...VALID_INPUT, proof: { proof_status: 'LOCAL_EXECUTION_PROOF_INVALID', proof_id: 'p', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false } }),
    buildLocalExecutionChainBaseline({ ...VALID_INPUT, final_report: { report_status: 'LOCAL_FINAL_REPORT_FAIL', pass_gold_local: false, report_id: 'r', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false } }),
  ];
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: local_only=true', cases.every(r => r.local_only === true));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
