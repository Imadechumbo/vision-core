#!/usr/bin/env node
/**
 * Tests — Local Execution PASS GOLD Candidate Gate V165.0
 */

import {
  buildLocalExecutionPassGoldCandidateGate,
  validateLocalExecutionPassGoldCandidateGate,
  renderLocalExecutionPassGoldCandidateGate,
  LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_STATUSES,
} from '../local-execution-pass-gold-candidate-gate.mjs';

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

const VALID_EVIDENCE = {
  evidence_package_status: 'LOCAL_EVIDENCE_SEALED',
  evidence_package_id: 'evidence-pkg-001',
  evidence_hash: 'abc123def456',
  evidence_sealed: true,
  local_only: true,
  production_touched: false,
  deploy_performed: false,
  stable_promoted: false,
  release_performed: false,
  proof_id: 'proof-001',
  receipt_id: 'receipt-001',
  ledger_id: 'ledger-001',
  rollback_proof_id: 'rollback-001',
  post_state_id: 'post-state-001',
};

const VALID_INPUT = {
  candidate_id: 'candidate-v1650-001',
  evidence_package: VALID_EVIDENCE,
  local_only: true,
  production_touched: false,
};

console.log('\n=== local-execution-pass-gold-candidate-gate tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_STATUSES));
assert('has CANDIDATE_PASS', LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_STATUSES.includes('LOCAL_PASS_GOLD_CANDIDATE_PASS'));
assert('has CANDIDATE_FAIL', LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_STATUSES.includes('LOCAL_PASS_GOLD_CANDIDATE_FAIL'));
assert('has BLOCKED_INPUT', LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_STATUSES.includes('LOCAL_PASS_GOLD_BLOCKED_INPUT'));
assert('has BLOCKED_EVIDENCE', LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_STATUSES.includes('LOCAL_PASS_GOLD_BLOCKED_EVIDENCE'));
assert('has BLOCKED_PRODUCTION', LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_STATUSES.includes('LOCAL_PASS_GOLD_BLOCKED_PRODUCTION'));
assert('build is function', typeof buildLocalExecutionPassGoldCandidateGate === 'function');
assert('validate is function', typeof validateLocalExecutionPassGoldCandidateGate === 'function');
assert('render is function', typeof renderLocalExecutionPassGoldCandidateGate === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildLocalExecutionPassGoldCandidateGate(null);
  assert('null → BLOCKED_INPUT', r.candidate_status === 'LOCAL_PASS_GOLD_BLOCKED_INPUT');
  assert('null: local_only=true', r.local_only === true);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: candidate_pass=false', r.candidate_pass === false);
  assert('null: pass_gold_local=false', r.pass_gold_local === false);
}
{
  const r = buildLocalExecutionPassGoldCandidateGate({});
  assert('empty → BLOCKED_INPUT', r.candidate_status === 'LOCAL_PASS_GOLD_BLOCKED_INPUT');
}
{
  const r = buildLocalExecutionPassGoldCandidateGate({ candidate_id: '  ' });
  assert('blank id → BLOCKED_INPUT', r.candidate_status === 'LOCAL_PASS_GOLD_BLOCKED_INPUT');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildLocalExecutionPassGoldCandidateGate({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.candidate_status === 'LOCAL_PASS_GOLD_BLOCKED_PRODUCTION');
  assert('production: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildLocalExecutionPassGoldCandidateGate({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.candidate_status === 'LOCAL_PASS_GOLD_BLOCKED_PRODUCTION');
}

// --- blocked evidence ---
console.log('--- blocked evidence ---');
{
  const r = buildLocalExecutionPassGoldCandidateGate({ ...VALID_INPUT, evidence_package: null });
  assert('null evidence → BLOCKED_EVIDENCE', r.candidate_status === 'LOCAL_PASS_GOLD_BLOCKED_EVIDENCE');
}
{
  const r = buildLocalExecutionPassGoldCandidateGate({ ...VALID_INPUT, evidence_package: { ...VALID_EVIDENCE, evidence_package_status: 'LOCAL_EVIDENCE_BLOCKED_INPUT' } });
  assert('wrong evidence_status → BLOCKED_EVIDENCE', r.candidate_status === 'LOCAL_PASS_GOLD_BLOCKED_EVIDENCE');
}
{
  const r = buildLocalExecutionPassGoldCandidateGate({ ...VALID_INPUT, evidence_package: { ...VALID_EVIDENCE, evidence_sealed: false } });
  assert('evidence_sealed=false → BLOCKED_EVIDENCE', r.candidate_status === 'LOCAL_PASS_GOLD_BLOCKED_EVIDENCE');
}
{
  const r = buildLocalExecutionPassGoldCandidateGate({ ...VALID_INPUT, evidence_package: { ...VALID_EVIDENCE, local_only: false } });
  assert('evidence.local_only=false → BLOCKED_EVIDENCE', r.candidate_status === 'LOCAL_PASS_GOLD_BLOCKED_EVIDENCE');
}

// --- candidate pass ---
console.log('--- candidate pass ---');
{
  const r = buildLocalExecutionPassGoldCandidateGate(VALID_INPUT);
  assert('valid input → CANDIDATE_PASS', r.candidate_status === 'LOCAL_PASS_GOLD_CANDIDATE_PASS');
  assert('pass: candidate_pass=true', r.candidate_pass === true);
  assert('pass: pass_gold_local=true', r.pass_gold_local === true);
  assert('pass: local_only=true', r.local_only === true);
  assert('pass: production_touched=false', r.production_touched === false);
  assert('pass: deploy_performed=false', r.deploy_performed === false);
  assert('pass: stable_promoted=false', r.stable_promoted === false);
  assert('pass: release_performed=false', r.release_performed === false);
  assert('pass: schema_version=v165.0', r.schema_version === 'v165.0');
  assert('pass: candidate_id set', r.candidate_id === 'candidate-v1650-001');
  assert('pass: evidence_package_id set', r.evidence_package_id === 'evidence-pkg-001');
  assert('pass: candidate_hash is string', typeof r.candidate_hash === 'string' && r.candidate_hash.length > 0);
  assert('pass: failed_criteria empty', r.failed_criteria.length === 0);
}

// --- candidate fail ---
console.log('--- candidate fail ---');
{
  const r = buildLocalExecutionPassGoldCandidateGate({
    ...VALID_INPUT,
    evidence_package: { ...VALID_EVIDENCE, proof_id: null },
  });
  assert('missing proof_id → CANDIDATE_FAIL', r.candidate_status === 'LOCAL_PASS_GOLD_CANDIDATE_FAIL');
  assert('fail: candidate_pass=false', r.candidate_pass === false);
  assert('fail: pass_gold_local=false', r.pass_gold_local === false);
  assert('fail: failed_criteria not empty', r.failed_criteria.length > 0);
  assert('fail: blocked_reason set', typeof r.blocked_reason === 'string');
  assert('fail: production_touched=false', r.production_touched === false);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildLocalExecutionPassGoldCandidateGate(VALID_INPUT);
  const v = validateLocalExecutionPassGoldCandidateGate(r);
  assert('validate pass: valid=true', v.valid === true);
  assert('validate pass: no errors', v.errors.length === 0);
}
{
  const r = buildLocalExecutionPassGoldCandidateGate(null);
  const v = validateLocalExecutionPassGoldCandidateGate(r);
  assert('validate blocked: invariants hold', v.valid === true);
}
{
  const v = validateLocalExecutionPassGoldCandidateGate(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildLocalExecutionPassGoldCandidateGate(VALID_INPUT);
  const s = renderLocalExecutionPassGoldCandidateGate(r);
  assert('render pass: is string', typeof s === 'string');
  assert('render pass: contains CANDIDATE_PASS', s.includes('CANDIDATE_PASS'));
  assert('render pass: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderLocalExecutionPassGoldCandidateGate(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildLocalExecutionPassGoldCandidateGate(null),
    buildLocalExecutionPassGoldCandidateGate({}),
    buildLocalExecutionPassGoldCandidateGate(VALID_INPUT),
    buildLocalExecutionPassGoldCandidateGate({ ...VALID_INPUT, local_only: false }),
    buildLocalExecutionPassGoldCandidateGate({ ...VALID_INPUT, production_touched: true }),
    buildLocalExecutionPassGoldCandidateGate({ ...VALID_INPUT, evidence_package: null }),
    buildLocalExecutionPassGoldCandidateGate({ ...VALID_INPUT, evidence_package: { ...VALID_EVIDENCE, proof_id: null } }),
  ];
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: local_only=true', cases.every(r => r.local_only === true));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
