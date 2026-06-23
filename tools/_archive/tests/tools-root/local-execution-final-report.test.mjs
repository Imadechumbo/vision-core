#!/usr/bin/env node
/**
 * Tests — Local Execution Final Report V165.1
 */

import {
  buildLocalExecutionFinalReport,
  validateLocalExecutionFinalReport,
  renderLocalExecutionFinalReport,
  LOCAL_EXECUTION_FINAL_REPORT_STATUSES,
} from '../local-execution-final-report.mjs';

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

const VALID_CANDIDATE_PASS = {
  candidate_status: 'LOCAL_PASS_GOLD_CANDIDATE_PASS',
  candidate_id: 'candidate-v1650-001',
  evidence_package_id: 'evidence-pkg-001',
  candidate_hash: 'abc123def456',
  candidate_pass: true,
  pass_gold_local: true,
  failed_criteria: [],
  local_only: true,
  production_touched: false,
  deploy_performed: false,
  stable_promoted: false,
  release_performed: false,
};

const VALID_CANDIDATE_FAIL = {
  candidate_status: 'LOCAL_PASS_GOLD_CANDIDATE_FAIL',
  candidate_id: 'candidate-v1650-002',
  evidence_package_id: 'evidence-pkg-002',
  candidate_hash: 'xyz789',
  candidate_pass: false,
  pass_gold_local: false,
  failed_criteria: ['has_proof_id'],
  local_only: true,
  production_touched: false,
  deploy_performed: false,
  stable_promoted: false,
  release_performed: false,
};

const VALID_INPUT = {
  report_id: 'report-v1651-001',
  candidate_gate: VALID_CANDIDATE_PASS,
  local_only: true,
  production_touched: false,
};

console.log('\n=== local-execution-final-report tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(LOCAL_EXECUTION_FINAL_REPORT_STATUSES));
assert('has PASS', LOCAL_EXECUTION_FINAL_REPORT_STATUSES.includes('LOCAL_FINAL_REPORT_PASS'));
assert('has FAIL', LOCAL_EXECUTION_FINAL_REPORT_STATUSES.includes('LOCAL_FINAL_REPORT_FAIL'));
assert('has BLOCKED_INPUT', LOCAL_EXECUTION_FINAL_REPORT_STATUSES.includes('LOCAL_FINAL_REPORT_BLOCKED_INPUT'));
assert('has BLOCKED_CANDIDATE', LOCAL_EXECUTION_FINAL_REPORT_STATUSES.includes('LOCAL_FINAL_REPORT_BLOCKED_CANDIDATE'));
assert('has BLOCKED_PRODUCTION', LOCAL_EXECUTION_FINAL_REPORT_STATUSES.includes('LOCAL_FINAL_REPORT_BLOCKED_PRODUCTION'));
assert('build is function', typeof buildLocalExecutionFinalReport === 'function');
assert('validate is function', typeof validateLocalExecutionFinalReport === 'function');
assert('render is function', typeof renderLocalExecutionFinalReport === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildLocalExecutionFinalReport(null);
  assert('null → BLOCKED_INPUT', r.report_status === 'LOCAL_FINAL_REPORT_BLOCKED_INPUT');
  assert('null: local_only=true', r.local_only === true);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: pass_gold_local=false', r.pass_gold_local === false);
}
{
  const r = buildLocalExecutionFinalReport({});
  assert('empty → BLOCKED_INPUT', r.report_status === 'LOCAL_FINAL_REPORT_BLOCKED_INPUT');
}
{
  const r = buildLocalExecutionFinalReport({ report_id: '  ' });
  assert('blank id → BLOCKED_INPUT', r.report_status === 'LOCAL_FINAL_REPORT_BLOCKED_INPUT');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildLocalExecutionFinalReport({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.report_status === 'LOCAL_FINAL_REPORT_BLOCKED_PRODUCTION');
  assert('production: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildLocalExecutionFinalReport({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.report_status === 'LOCAL_FINAL_REPORT_BLOCKED_PRODUCTION');
}

// --- blocked candidate ---
console.log('--- blocked candidate ---');
{
  const r = buildLocalExecutionFinalReport({ ...VALID_INPUT, candidate_gate: null });
  assert('null candidate → BLOCKED_CANDIDATE', r.report_status === 'LOCAL_FINAL_REPORT_BLOCKED_CANDIDATE');
}
{
  const r = buildLocalExecutionFinalReport({ ...VALID_INPUT, candidate_gate: { candidate_status: 'LOCAL_PASS_GOLD_BLOCKED_INPUT', local_only: true, production_touched: false } });
  assert('wrong candidate_status → BLOCKED_CANDIDATE', r.report_status === 'LOCAL_FINAL_REPORT_BLOCKED_CANDIDATE');
}
{
  const r = buildLocalExecutionFinalReport({ ...VALID_INPUT, candidate_gate: { ...VALID_CANDIDATE_PASS, local_only: false } });
  assert('candidate.local_only=false → BLOCKED_CANDIDATE', r.report_status === 'LOCAL_FINAL_REPORT_BLOCKED_CANDIDATE');
}

// --- final report pass ---
console.log('--- final report pass ---');
{
  const r = buildLocalExecutionFinalReport(VALID_INPUT);
  assert('valid pass candidate → PASS', r.report_status === 'LOCAL_FINAL_REPORT_PASS');
  assert('pass: pass_gold_local=true', r.pass_gold_local === true);
  assert('pass: report_generated=true', r.report_generated === true);
  assert('pass: local_only=true', r.local_only === true);
  assert('pass: production_touched=false', r.production_touched === false);
  assert('pass: deploy_performed=false', r.deploy_performed === false);
  assert('pass: stable_promoted=false', r.stable_promoted === false);
  assert('pass: release_performed=false', r.release_performed === false);
  assert('pass: schema_version=v165.1', r.schema_version === 'v165.1');
  assert('pass: report_id set', r.report_id === 'report-v1651-001');
  assert('pass: candidate_id set', r.candidate_id === 'candidate-v1650-001');
  assert('pass: evidence_package_id set', r.evidence_package_id === 'evidence-pkg-001');
  assert('pass: report_hash is string', typeof r.report_hash === 'string' && r.report_hash.length > 0);
  assert('pass: failed_criteria empty', r.failed_criteria.length === 0);
}

// --- final report fail ---
console.log('--- final report fail ---');
{
  const r = buildLocalExecutionFinalReport({ ...VALID_INPUT, candidate_gate: VALID_CANDIDATE_FAIL });
  assert('fail candidate → FAIL', r.report_status === 'LOCAL_FINAL_REPORT_FAIL');
  assert('fail: pass_gold_local=false', r.pass_gold_local === false);
  assert('fail: report_generated=true', r.report_generated === true);
  assert('fail: failed_criteria not empty', r.failed_criteria.length > 0);
  assert('fail: blocked_reason set', typeof r.blocked_reason === 'string');
  assert('fail: production_touched=false', r.production_touched === false);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildLocalExecutionFinalReport(VALID_INPUT);
  const v = validateLocalExecutionFinalReport(r);
  assert('validate pass: valid=true', v.valid === true);
  assert('validate pass: no errors', v.errors.length === 0);
}
{
  const r = buildLocalExecutionFinalReport(null);
  const v = validateLocalExecutionFinalReport(r);
  assert('validate blocked: invariants hold', v.valid === true);
}
{
  const v = validateLocalExecutionFinalReport(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildLocalExecutionFinalReport(VALID_INPUT);
  const s = renderLocalExecutionFinalReport(r);
  assert('render pass: is string', typeof s === 'string');
  assert('render pass: contains PASS', s.includes('LOCAL_FINAL_REPORT_PASS'));
  assert('render pass: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderLocalExecutionFinalReport(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildLocalExecutionFinalReport(null),
    buildLocalExecutionFinalReport({}),
    buildLocalExecutionFinalReport(VALID_INPUT),
    buildLocalExecutionFinalReport({ ...VALID_INPUT, local_only: false }),
    buildLocalExecutionFinalReport({ ...VALID_INPUT, production_touched: true }),
    buildLocalExecutionFinalReport({ ...VALID_INPUT, candidate_gate: null }),
    buildLocalExecutionFinalReport({ ...VALID_INPUT, candidate_gate: VALID_CANDIDATE_FAIL }),
  ];
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: local_only=true', cases.every(r => r.local_only === true));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
