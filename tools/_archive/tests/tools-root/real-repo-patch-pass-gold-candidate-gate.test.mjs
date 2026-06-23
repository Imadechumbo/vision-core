#!/usr/bin/env node
/**
 * Tests — Real Repo Patch PASS GOLD Candidate Gate V177.0
 */

import {
  buildRealRepoPatchPassGoldCandidateGate,
  validateRealRepoPatchPassGoldCandidateGate,
  renderRealRepoPatchPassGoldCandidateGate,
  REAL_REPO_PATCH_PASS_GOLD_CANDIDATE_STATUSES,
} from '../real-repo-patch-pass-gold-candidate-gate.mjs';

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

const VALID_INPUT = {
  pass_gold_candidate_id: 'pg-001',
  final_report_ready: true,
  ledger_ready: true,
  production_touched: false,
  local_only: true,
};

console.log('\n=== real-repo-patch-pass-gold-candidate-gate tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_PASS_GOLD_CANDIDATE_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_PASS_GOLD_CANDIDATE_STATUSES.includes('REPO_PATCH_PASS_GOLD_BLOCKED_INPUT'));
assert('has BLOCKED_REPORT', REAL_REPO_PATCH_PASS_GOLD_CANDIDATE_STATUSES.includes('REPO_PATCH_PASS_GOLD_BLOCKED_REPORT'));
assert('has CANDIDATE', REAL_REPO_PATCH_PASS_GOLD_CANDIDATE_STATUSES.includes('REPO_PATCH_PASS_GOLD_CANDIDATE'));
assert('has FAIL', REAL_REPO_PATCH_PASS_GOLD_CANDIDATE_STATUSES.includes('REPO_PATCH_PASS_GOLD_FAIL'));
assert('build is function', typeof buildRealRepoPatchPassGoldCandidateGate === 'function');
assert('validate is function', typeof validateRealRepoPatchPassGoldCandidateGate === 'function');
assert('render is function', typeof renderRealRepoPatchPassGoldCandidateGate === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchPassGoldCandidateGate(null);
  assert('null → BLOCKED_INPUT', r.status === 'REPO_PATCH_PASS_GOLD_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: candidate_ready=false', r.pass_gold_candidate_ready === false);
}
{
  const r = buildRealRepoPatchPassGoldCandidateGate({});
  assert('empty → BLOCKED_INPUT', r.status === 'REPO_PATCH_PASS_GOLD_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, pass_gold_candidate_id: '' });
  assert('empty id → BLOCKED_INPUT', r.status === 'REPO_PATCH_PASS_GOLD_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, pass_gold_candidate_id: null });
  assert('null id → BLOCKED_INPUT', r.status === 'REPO_PATCH_PASS_GOLD_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_INPUT', r.status === 'REPO_PATCH_PASS_GOLD_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_INPUT', r.status === 'REPO_PATCH_PASS_GOLD_BLOCKED_INPUT');
}

// --- blocked report ---
console.log('--- blocked report ---');
{
  const r = buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, final_report_ready: false });
  assert('!final_report → BLOCKED_REPORT', r.status === 'REPO_PATCH_PASS_GOLD_BLOCKED_REPORT');
  assert('blocked_report: candidate_ready=false', r.pass_gold_candidate_ready === false);
  assert('blocked_report: all_gates_passed=false', r.all_gates_passed === false);
  assert('blocked_report: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, ledger_ready: false });
  assert('!ledger_ready → BLOCKED_REPORT', r.status === 'REPO_PATCH_PASS_GOLD_BLOCKED_REPORT');
}
{
  const r = buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, final_report_ready: false, ledger_ready: false });
  assert('both false → BLOCKED_REPORT', r.status === 'REPO_PATCH_PASS_GOLD_BLOCKED_REPORT');
}

// --- candidate ---
console.log('--- candidate ---');
{
  const r = buildRealRepoPatchPassGoldCandidateGate(VALID_INPUT);
  assert('valid → CANDIDATE', r.status === 'REPO_PATCH_PASS_GOLD_CANDIDATE');
  assert('candidate: pass_gold_candidate_ready=true', r.pass_gold_candidate_ready === true);
  assert('candidate: all_gates_passed=true', r.all_gates_passed === true);
  assert('candidate: schema_version=v177.0', r.schema_version === 'v177.0');
  assert('candidate: production_touched=false', r.production_touched === false);
  assert('candidate: deploy_performed=false', r.deploy_performed === false);
  assert('candidate: stable_promoted=false', r.stable_promoted === false);
  assert('candidate: release_performed=false', r.release_performed === false);
  assert('candidate: final_report_ready=true', r.final_report_ready === true);
  assert('candidate: ledger_ready=true', r.ledger_ready === true);
  assert('candidate: id set', r.pass_gold_candidate_id === 'pg-001');
  assert('candidate: errors empty', r.errors.length === 0);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchPassGoldCandidateGate(VALID_INPUT);
  const v = validateRealRepoPatchPassGoldCandidateGate(r);
  assert('validate candidate: valid=true', v.valid === true);
  assert('validate candidate: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchPassGoldCandidateGate(null);
  const v = validateRealRepoPatchPassGoldCandidateGate(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchPassGoldCandidateGate(null);
  assert('validate null: valid=false', v.valid === false);
}
{
  const r = buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, final_report_ready: false });
  const v = validateRealRepoPatchPassGoldCandidateGate(r);
  assert('validate blocked_report: valid=true', v.valid === true);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchPassGoldCandidateGate(VALID_INPUT);
  const s = renderRealRepoPatchPassGoldCandidateGate(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains CANDIDATE', s.includes('REPO_PATCH_PASS_GOLD_CANDIDATE'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderRealRepoPatchPassGoldCandidateGate(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchPassGoldCandidateGate(null),
    buildRealRepoPatchPassGoldCandidateGate({}),
    buildRealRepoPatchPassGoldCandidateGate(VALID_INPUT),
    buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, final_report_ready: false }),
    buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, ledger_ready: false }),
    buildRealRepoPatchPassGoldCandidateGate({ ...VALID_INPUT, production_touched: true }),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
