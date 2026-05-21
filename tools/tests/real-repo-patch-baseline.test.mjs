#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Baseline V178.0
 */

import {
  buildRealRepoPatchBaseline,
  validateRealRepoPatchBaseline,
  renderRealRepoPatchBaseline,
  REAL_REPO_PATCH_BASELINE_STATUSES,
} from '../real-repo-patch-baseline.mjs';

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

const ALL_STAGES = [
  'scope_contract',
  'pre_state_snapshot',
  'apply_controller',
  'physical_apply_proof',
  'diff_truth_binding',
  'test_lane',
  'rollback_plan',
  'rollback_drill',
  'evidence_receipt',
  'ledger',
  'final_report',
  'pass_gold_candidate',
];

const VALID_INPUT = {
  baseline_id: 'baseline-001',
  pass_gold_candidate_ready: true,
  stages_ready: ALL_STAGES,
  production_touched: false,
  local_only: true,
};

console.log('\n=== real-repo-patch-baseline tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_BASELINE_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_BASELINE_STATUSES.includes('REPO_PATCH_BASELINE_BLOCKED_INPUT'));
assert('has BLOCKED_CANDIDATE', REAL_REPO_PATCH_BASELINE_STATUSES.includes('REPO_PATCH_BASELINE_BLOCKED_CANDIDATE'));
assert('has BASELINE_READY', REAL_REPO_PATCH_BASELINE_STATUSES.includes('REPO_PATCH_BASELINE_READY'));
assert('has BASELINE_FAIL', REAL_REPO_PATCH_BASELINE_STATUSES.includes('REPO_PATCH_BASELINE_FAIL'));
assert('build is function', typeof buildRealRepoPatchBaseline === 'function');
assert('validate is function', typeof validateRealRepoPatchBaseline === 'function');
assert('render is function', typeof renderRealRepoPatchBaseline === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchBaseline(null);
  assert('null → BLOCKED_INPUT', r.status === 'REPO_PATCH_BASELINE_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: baseline_ready=false', r.real_repo_patch_baseline_ready === false);
}
{
  const r = buildRealRepoPatchBaseline({});
  assert('empty → BLOCKED_INPUT', r.status === 'REPO_PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchBaseline({ ...VALID_INPUT, baseline_id: '' });
  assert('empty id → BLOCKED_INPUT', r.status === 'REPO_PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchBaseline({ ...VALID_INPUT, baseline_id: null });
  assert('null id → BLOCKED_INPUT', r.status === 'REPO_PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchBaseline({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_INPUT', r.status === 'REPO_PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchBaseline({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_INPUT', r.status === 'REPO_PATCH_BASELINE_BLOCKED_INPUT');
}

// --- blocked candidate ---
console.log('--- blocked candidate ---');
{
  const r = buildRealRepoPatchBaseline({ ...VALID_INPUT, pass_gold_candidate_ready: false });
  assert('!pg_candidate → BLOCKED_CANDIDATE', r.status === 'REPO_PATCH_BASELINE_BLOCKED_CANDIDATE');
  assert('blocked_candidate: baseline_ready=false', r.real_repo_patch_baseline_ready === false);
  assert('blocked_candidate: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchBaseline({ ...VALID_INPUT, stages_ready: ALL_STAGES.slice(0, 5) });
  assert('incomplete stages → BLOCKED_CANDIDATE', r.status === 'REPO_PATCH_BASELINE_BLOCKED_CANDIDATE');
  assert('incomplete: all_stages_passed=false', r.all_stages_passed === false);
}
{
  const r = buildRealRepoPatchBaseline({ ...VALID_INPUT, stages_ready: [] });
  assert('no stages → BLOCKED_CANDIDATE', r.status === 'REPO_PATCH_BASELINE_BLOCKED_CANDIDATE');
}

// --- baseline ready ---
console.log('--- baseline ready ---');
{
  const r = buildRealRepoPatchBaseline(VALID_INPUT);
  assert('valid → BASELINE_READY', r.status === 'REPO_PATCH_BASELINE_READY');
  assert('ready: real_repo_patch_baseline_ready=true', r.real_repo_patch_baseline_ready === true);
  assert('ready: all_stages_passed=true', r.all_stages_passed === true);
  assert('ready: schema_version=v178.0', r.schema_version === 'v178.0');
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
  assert('ready: stages_ready has 12 stages', r.stages_ready.length === 12);
  assert('ready: pipeline_stages has 12 stages', r.pipeline_stages.length === 12);
  assert('ready: baseline_id set', r.baseline_id === 'baseline-001');
  assert('ready: errors empty', r.errors.length === 0);
  assert('ready: pass_gold_candidate_ready=true', r.pass_gold_candidate_ready === true);
}

// --- pipeline stages ---
console.log('--- pipeline stages ---');
{
  const r = buildRealRepoPatchBaseline(VALID_INPUT);
  assert('stages include scope_contract', r.pipeline_stages.includes('scope_contract'));
  assert('stages include pre_state_snapshot', r.pipeline_stages.includes('pre_state_snapshot'));
  assert('stages include apply_controller', r.pipeline_stages.includes('apply_controller'));
  assert('stages include physical_apply_proof', r.pipeline_stages.includes('physical_apply_proof'));
  assert('stages include diff_truth_binding', r.pipeline_stages.includes('diff_truth_binding'));
  assert('stages include test_lane', r.pipeline_stages.includes('test_lane'));
  assert('stages include rollback_plan', r.pipeline_stages.includes('rollback_plan'));
  assert('stages include rollback_drill', r.pipeline_stages.includes('rollback_drill'));
  assert('stages include evidence_receipt', r.pipeline_stages.includes('evidence_receipt'));
  assert('stages include ledger', r.pipeline_stages.includes('ledger'));
  assert('stages include final_report', r.pipeline_stages.includes('final_report'));
  assert('stages include pass_gold_candidate', r.pipeline_stages.includes('pass_gold_candidate'));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchBaseline(VALID_INPUT);
  const v = validateRealRepoPatchBaseline(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchBaseline(null);
  const v = validateRealRepoPatchBaseline(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchBaseline(null);
  assert('validate null: valid=false', v.valid === false);
}
{
  const r = buildRealRepoPatchBaseline({ ...VALID_INPUT, pass_gold_candidate_ready: false });
  const v = validateRealRepoPatchBaseline(r);
  assert('validate blocked_candidate: valid=true', v.valid === true);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchBaseline(VALID_INPUT);
  const s = renderRealRepoPatchBaseline(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains BASELINE_READY', s.includes('REPO_PATCH_BASELINE_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains 12/12', s.includes('12/12'));
}
{
  const s = renderRealRepoPatchBaseline(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchBaseline(null),
    buildRealRepoPatchBaseline({}),
    buildRealRepoPatchBaseline(VALID_INPUT),
    buildRealRepoPatchBaseline({ ...VALID_INPUT, pass_gold_candidate_ready: false }),
    buildRealRepoPatchBaseline({ ...VALID_INPUT, stages_ready: [] }),
    buildRealRepoPatchBaseline({ ...VALID_INPUT, production_touched: true }),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
