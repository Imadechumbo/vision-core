#!/usr/bin/env node
/**
 * Tests — Stable Promotion Governance Baseline V125.0 (Capstone)
 */

import {
  buildStablePromotionGovernanceBaseline,
  validateStablePromotionGovernanceBaseline,
  renderStablePromotionGovernanceBaseline,
  GOVERNANCE_BASELINE_STATUSES,
} from '../stable-promotion-governance-baseline.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

console.log('\n=== stable-promotion-governance-baseline tests (V125.0 Capstone) ===\n');

console.log('--- baseline build ---');
const baseline = buildStablePromotionGovernanceBaseline({
  mock_target_tag:      'v125.0-test',
  mock_target_ref:      'stable',
  mock_rollback_anchor: 'v124.1-test',
});

assert(typeof baseline === 'object', 'baseline is object');
assert(baseline.schema_version === 'v125.0', 'schema version v125.0');
assert(typeof baseline.baseline_id === 'string' && baseline.baseline_id.length === 64, 'baseline_id sha256');
assert(typeof baseline.baseline_status === 'string', 'baseline_status string');
assert(GOVERNANCE_BASELINE_STATUSES.includes(baseline.baseline_status), 'baseline_status in statuses');

console.log('--- stable_governance_baseline_ready ---');
assert(typeof baseline.stable_governance_baseline_ready === 'boolean', 'stable_governance_baseline_ready boolean');
assert(baseline.stable_governance_baseline_ready === true, 'baseline READY');

console.log('--- pipeline results ---');
assert(typeof baseline.pipeline_results === 'object', 'pipeline_results object');
assert(baseline.pipeline_results.contract_ready   === true, 'contract_ready');
assert(baseline.pipeline_results.binding_ready    === true, 'binding_ready');
assert(baseline.pipeline_results.package_ready    === true, 'package_ready');
assert(baseline.pipeline_results.block_ready      === true, 'block_ready');
assert(baseline.pipeline_results.dryrun_ready     === true, 'dryrun_ready');
assert(baseline.pipeline_results.receipt_issued   === true, 'receipt_issued');
assert(baseline.pipeline_results.lock_issued      === true, 'lock_issued');
assert(baseline.pipeline_results.rollback_ready   === true, 'rollback_ready');
assert(baseline.pipeline_results.ledger_active    === true, 'ledger_active');
assert(baseline.pipeline_results.gov_report_ready === true, 'gov_report_ready');
assert(baseline.pipeline_results.readiness_ready  === true, 'readiness_ready');
assert(baseline.pipeline_results.runbook_ready    === true, 'runbook_ready');
assert(baseline.pipeline_results.snapshot_ready   === true, 'snapshot_ready');
assert(baseline.pipeline_results.seal_ready       === true, 'seal_ready');
assert(baseline.pipeline_results.gate_open        === true, 'gate_open');
assert(baseline.pipeline_results.verifier_verified === true, 'verifier_verified');
assert(baseline.pipeline_results.post_ledger_active === true, 'post_ledger_active');
assert(baseline.pipeline_results.post_report_ready  === true, 'post_report_ready');

console.log('--- pipeline counts ---');
assert(baseline.passed_pipelines === 18, 'passed_pipelines 18');
assert(baseline.total_pipelines === 18, 'total_pipelines 18');

console.log('--- target propagation ---');
assert(baseline.target_stable_ref === 'stable', 'target_stable_ref');
assert(baseline.target_tag === 'v125.0-test', 'target_tag');
assert(baseline.rollback_anchor === 'v124.1-test', 'rollback_anchor');

console.log('--- ledger hashes ---');
assert(typeof baseline.ledger_hash === 'string' && baseline.ledger_hash.length === 64, 'ledger_hash sha256');
assert(typeof baseline.post_ledger_hash === 'string' && baseline.post_ledger_hash.length === 64, 'post_ledger_hash sha256');

console.log('--- governance_complete ---');
assert(baseline.governance_complete === true, 'governance_complete true');

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

console.log('--- future_human_stable_execution_required=true ---');
assert(baseline.future_human_stable_execution_required === true, 'future_human_stable_execution_required=true');

console.log('--- automated_stable_promotion_forbidden=true ---');
assert(baseline.automated_stable_promotion_forbidden === true, 'automated_stable_promotion_forbidden=true');

console.log('--- validate ---');
{
  const v = validateStablePromotionGovernanceBaseline(baseline);
  assert(v.valid === true, 'validate baseline');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionGovernanceBaseline(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ---');
{
  const txt = renderStablePromotionGovernanceBaseline(baseline);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION GOVERNANCE BASELINE V125.0'), 'render title');
  assert(txt.includes('GOVERNANCE_BASELINE_READY'), 'status in output');
  assert(txt.includes('stable_governance_baseline_ready:'), 'baseline_ready field in output');
  assert(txt.includes('PIPELINE RESULTS'), 'pipeline section');
  assert(txt.includes('PASS contract_ready'), 'contract_ready PASS');
  assert(txt.includes('future_human_stable_execution_required:'), 'human exec field in output');
  assert(txt.includes('automated_stable_promotion_forbidden:'), 'automation forbidden field');
}

console.log('--- statuses export ---');
{
  assert(GOVERNANCE_BASELINE_STATUSES.includes('GOVERNANCE_BASELINE_READY'), 'ready in statuses');
  assert(GOVERNANCE_BASELINE_STATUSES.includes('GOVERNANCE_BASELINE_PARTIAL'), 'partial in statuses');
  assert(GOVERNANCE_BASELINE_STATUSES.includes('GOVERNANCE_BASELINE_BLOCKED'), 'blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
