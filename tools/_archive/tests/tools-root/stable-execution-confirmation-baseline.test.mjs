#!/usr/bin/env node
/**
 * Tests — Stable Execution Confirmation Baseline V130.0 (Capstone)
 */

import {
  buildStableExecutionConfirmationBaseline,
  validateStableExecutionConfirmationBaseline,
  renderStableExecutionConfirmationBaseline,
  CONFIRMATION_BASELINE_STATUSES,
} from '../stable-execution-confirmation-baseline.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

console.log('\n=== stable-execution-confirmation-baseline tests (V130.0 Capstone) ===\n');

console.log('--- baseline build ---');
const baseline = buildStableExecutionConfirmationBaseline({
  mock_target_tag:  'v130.0-test',
  mock_target_ref:  'stable',
  mock_executed_by: 'human-operator-test',
});

assert(typeof baseline === 'object', 'baseline is object');
assert(baseline.schema_version === 'v130.0', 'schema version v130.0');
assert(typeof baseline.baseline_id === 'string' && baseline.baseline_id.length === 64, 'baseline_id sha256');
assert(typeof baseline.baseline_status === 'string', 'baseline_status string');
assert(CONFIRMATION_BASELINE_STATUSES.includes(baseline.baseline_status), 'baseline_status in statuses');

console.log('--- stable_execution_confirmation_ready ---');
assert(typeof baseline.stable_execution_confirmation_ready === 'boolean', 'stable_execution_confirmation_ready boolean');
assert(baseline.stable_execution_confirmation_ready === true, 'baseline READY');

console.log('--- pipeline results ---');
assert(typeof baseline.pipeline_results === 'object', 'pipeline_results object');
assert(baseline.pipeline_results.import_ready    === true, 'import_ready');
assert(baseline.pipeline_results.diff_verified   === true, 'diff_verified');
assert(baseline.pipeline_results.snapshot_ready  === true, 'snapshot_ready');
assert(baseline.pipeline_results.document_issued === true, 'document_issued');
assert(baseline.pipeline_results.ledger_active   === true, 'ledger_active');
assert(baseline.pipeline_results.report_ready    === true, 'report_ready');
assert(baseline.pipeline_results.gate_open       === true, 'gate_open');
assert(baseline.pipeline_results.archive_ready   === true, 'archive_ready');

console.log('--- pipeline counts ---');
assert(baseline.passed_pipelines === 8, 'passed_pipelines 8');
assert(baseline.total_pipelines === 8, 'total_pipelines 8');

console.log('--- target propagation ---');
assert(baseline.target_stable_ref === 'stable', 'target_stable_ref');
assert(baseline.target_tag === 'v130.0-test', 'target_tag');
assert(baseline.executed_by === 'human-operator-test', 'executed_by');

console.log('--- governance artifacts ---');
assert(typeof baseline.confirmation_id === 'string' && baseline.confirmation_id.length === 64, 'confirmation_id sha256');
assert(typeof baseline.archive_id === 'string' && baseline.archive_id.length === 64, 'archive_id sha256');
assert(typeof baseline.archive_hash === 'string' && baseline.archive_hash.length === 64, 'archive_hash sha256');
assert(typeof baseline.ledger_hash === 'string' && baseline.ledger_hash.length === 64, 'ledger_hash sha256');

console.log('--- promotion_finalized ---');
assert(baseline.promotion_finalized === true, 'promotion_finalized true');

console.log('--- REGRA ABSOLUTA: system_execution_performed=false ---');
assert(baseline.system_execution_performed === false, 'system_execution_performed=false');

console.log('--- REGRA ABSOLUTA: automated_promotion_performed=false ---');
assert(baseline.automated_promotion_performed === false, 'automated_promotion_performed=false');

console.log('--- REGRA ABSOLUTA: stable_promotion_allowed=false ---');
assert(baseline.stable_promotion_allowed === false, 'stable_promotion_allowed=false');

console.log('--- REGRA ABSOLUTA: stable_promoted=false ---');
assert(baseline.stable_promoted === false, 'stable_promoted=false');

console.log('--- REGRA ABSOLUTA: git_push_performed=false ---');
assert(baseline.git_push_performed === false, 'git_push_performed=false');

console.log('--- REGRA ABSOLUTA: deploy_performed=false ---');
assert(baseline.deploy_performed === false, 'deploy_performed=false');

console.log('--- REGRA ABSOLUTA: release_performed=false ---');
assert(baseline.release_performed === false, 'release_performed=false');

console.log('--- future_promotion_requires_new_governance_cycle=true ---');
assert(baseline.future_promotion_requires_new_governance_cycle === true, 'future_promotion_requires_new_governance_cycle=true');

console.log('--- validate ---');
{
  const v = validateStableExecutionConfirmationBaseline(baseline);
  assert(v.valid === true, 'validate baseline');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStableExecutionConfirmationBaseline(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ---');
{
  const txt = renderStableExecutionConfirmationBaseline(baseline);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE EXECUTION CONFIRMATION BASELINE V130.0'), 'render title');
  assert(txt.includes('CONFIRMATION_BASELINE_READY'), 'status in output');
  assert(txt.includes('stable_execution_confirmation_ready:'), 'confirmation_ready field in output');
  assert(txt.includes('PIPELINE RESULTS'), 'pipeline section');
  assert(txt.includes('PASS import_ready'), 'import_ready PASS');
  assert(txt.includes('PASS archive_ready'), 'archive_ready PASS');
  assert(txt.includes('future_promotion_requires_new_governance_cycle:'), 'future cycle field in output');
}

console.log('--- statuses export ---');
{
  assert(CONFIRMATION_BASELINE_STATUSES.includes('CONFIRMATION_BASELINE_READY'), 'ready in statuses');
  assert(CONFIRMATION_BASELINE_STATUSES.includes('CONFIRMATION_BASELINE_PARTIAL'), 'partial in statuses');
  assert(CONFIRMATION_BASELINE_STATUSES.includes('CONFIRMATION_BASELINE_BLOCKED'), 'blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
