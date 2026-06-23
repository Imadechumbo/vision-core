#!/usr/bin/env node

import {
  buildControlledTagPlan,
  validateControlledTagPlan,
  renderControlledTagPlan,
  CONTROLLED_TAG_PLAN_STATUSES,
} from '../controlled-tag-plan.mjs';

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
  tag_plan_id: 'tag-plan-001',
  go_dry_ready: true,
  decision: 'GO',
  release_plan_ready: true,
  certification_ready: true,
  requested_version: '196.0',
  target_commit: 'abc123def456',
  tag_message: 'Release v196.0',
};

console.log('\n=== controlled-tag-plan tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(CONTROLLED_TAG_PLAN_STATUSES));
assert('contains TAG_PLAN_BLOCKED_INPUT', CONTROLLED_TAG_PLAN_STATUSES.includes('TAG_PLAN_BLOCKED_INPUT'));
assert('contains TAG_PLAN_BLOCKED_GO_DECISION', CONTROLLED_TAG_PLAN_STATUSES.includes('TAG_PLAN_BLOCKED_GO_DECISION'));
assert('contains TAG_PLAN_READY', CONTROLLED_TAG_PLAN_STATUSES.includes('TAG_PLAN_READY'));
assert('build is function', typeof buildControlledTagPlan === 'function');
assert('validate is function', typeof validateControlledTagPlan === 'function');
assert('render is function', typeof renderControlledTagPlan === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildControlledTagPlan(null);
  assert('null -> BLOCKED_INPUT', r.status === 'TAG_PLAN_BLOCKED_INPUT');
  assert('null: release_allowed=false', r.release_allowed === false);
  assert('null: tag_plan_ready=false', r.tag_plan_ready === false);
  assert('null: tag_created=false', r.tag_created === false);
  assert('null: errors non-empty', r.errors.length > 0);
}
{
  const r = buildControlledTagPlan({});
  assert('{} -> BLOCKED_INPUT', r.status === 'TAG_PLAN_BLOCKED_INPUT');
}
{
  const r = buildControlledTagPlan({ tag_plan_id: '' });
  assert('empty tag_plan_id -> BLOCKED_INPUT', r.status === 'TAG_PLAN_BLOCKED_INPUT');
}
{
  const r = buildControlledTagPlan({ tag_plan_id: 'tp-1', requested_version: '' });
  assert('empty requested_version -> BLOCKED_INPUT', r.status === 'TAG_PLAN_BLOCKED_INPUT');
}
{
  const r = buildControlledTagPlan({ tag_plan_id: 'tp-1', requested_version: '1.0', target_commit: '' });
  assert('empty target_commit -> BLOCKED_INPUT', r.status === 'TAG_PLAN_BLOCKED_INPUT');
}
{
  const r = buildControlledTagPlan({ tag_plan_id: 'tp-1', requested_version: '1.0', target_commit: 'abc', tag_message: '' });
  assert('empty tag_message -> BLOCKED_INPUT', r.status === 'TAG_PLAN_BLOCKED_INPUT');
}

// --- blocked go decision ---
console.log('--- blocked go decision ---');
{
  const base = { tag_plan_id: 'tp-1', requested_version: '1.0', target_commit: 'abc', tag_message: 'msg' };
  const r = buildControlledTagPlan({ ...base, go_dry_ready: false });
  assert('go_dry_ready=false -> BLOCKED_GO_DECISION', r.status === 'TAG_PLAN_BLOCKED_GO_DECISION');
}
{
  const base = { tag_plan_id: 'tp-1', requested_version: '1.0', target_commit: 'abc', tag_message: 'msg' };
  const r = buildControlledTagPlan({ ...base, go_dry_ready: true, decision: 'NO_GO' });
  assert('decision=NO_GO -> BLOCKED_GO_DECISION', r.status === 'TAG_PLAN_BLOCKED_GO_DECISION');
}
{
  const base = { tag_plan_id: 'tp-1', requested_version: '1.0', target_commit: 'abc', tag_message: 'msg' };
  const r = buildControlledTagPlan({ ...base, go_dry_ready: true, decision: 'GO', release_plan_ready: false });
  assert('release_plan_ready=false -> BLOCKED_GO_DECISION', r.status === 'TAG_PLAN_BLOCKED_GO_DECISION');
}
{
  const base = { tag_plan_id: 'tp-1', requested_version: '1.0', target_commit: 'abc', tag_message: 'msg' };
  const r = buildControlledTagPlan({ ...base, go_dry_ready: true, decision: 'GO', release_plan_ready: true, certification_ready: false });
  assert('certification_ready=false -> BLOCKED_GO_DECISION', r.status === 'TAG_PLAN_BLOCKED_GO_DECISION');
}
{
  const base = { tag_plan_id: 'tp-1', requested_version: '1.0', target_commit: 'abc', tag_message: 'msg' };
  const r = buildControlledTagPlan({ ...base, go_dry_ready: true, decision: 'GO', release_plan_ready: true, certification_ready: true, production_touched: true });
  assert('production_touched=true -> BLOCKED_GO_DECISION', r.status === 'TAG_PLAN_BLOCKED_GO_DECISION');
}
{
  const base = { tag_plan_id: 'tp-1', requested_version: '1.0', target_commit: 'abc', tag_message: 'msg' };
  const r = buildControlledTagPlan({ ...base, go_dry_ready: true, decision: 'GO', release_plan_ready: true, certification_ready: true, deploy_performed: true });
  assert('deploy_performed=true -> BLOCKED_GO_DECISION', r.status === 'TAG_PLAN_BLOCKED_GO_DECISION');
}
{
  const base = { tag_plan_id: 'tp-1', requested_version: '1.0', target_commit: 'abc', tag_message: 'msg' };
  const r = buildControlledTagPlan({ ...base, go_dry_ready: true, decision: 'GO', release_plan_ready: true, certification_ready: true, stable_promoted: true });
  assert('stable_promoted=true -> BLOCKED_GO_DECISION', r.status === 'TAG_PLAN_BLOCKED_GO_DECISION');
}
{
  const base = { tag_plan_id: 'tp-1', requested_version: '1.0', target_commit: 'abc', tag_message: 'msg' };
  const r = buildControlledTagPlan({ ...base, go_dry_ready: true, decision: 'GO', release_plan_ready: true, certification_ready: true, release_performed: true });
  assert('release_performed=true -> BLOCKED_GO_DECISION', r.status === 'TAG_PLAN_BLOCKED_GO_DECISION');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildControlledTagPlan(VALID_INPUT);
  assert('valid -> TAG_PLAN_READY', r.status === 'TAG_PLAN_READY');
  assert('ready: schema_version=v196.0', r.schema_version === 'v196.0');
  assert('ready: controlled_tag_plan_id set', r.controlled_tag_plan_id === 'tag-plan-001');
  assert('ready: planned_tag=v196.0', r.planned_tag === 'v196.0');
  assert('ready: tag_message set', r.tag_message === 'Release v196.0');
  assert('ready: tag_target_commit set', r.tag_target_commit === 'abc123def456');
  assert('ready: tag_validation_steps has 8', r.tag_validation_steps.length === 8);
  assert('ready: has verify_main_clean', r.tag_validation_steps.includes('verify_main_clean'));
  assert('ready: has verify_target_commit', r.tag_validation_steps.includes('verify_target_commit'));
  assert('ready: has verify_pass_gold', r.tag_validation_steps.includes('verify_pass_gold'));
  assert('ready: has verify_phase_gate', r.tag_validation_steps.includes('verify_phase_gate'));
  assert('ready: has verify_go_decision', r.tag_validation_steps.includes('verify_go_decision'));
  assert('ready: has verify_no_release_execution', r.tag_validation_steps.includes('verify_no_release_execution'));
  assert('ready: has verify_no_deploy', r.tag_validation_steps.includes('verify_no_deploy'));
  assert('ready: has verify_no_stable_promotion', r.tag_validation_steps.includes('verify_no_stable_promotion'));
  assert('ready: tag_plan_ready=true', r.tag_plan_ready === true);
  assert('ready: tag_created=false', r.tag_created === false);
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: deploy_allowed=false', r.deploy_allowed === false);
  assert('ready: stable_allowed=false', r.stable_allowed === false);
  assert('ready: tag_allowed=false', r.tag_allowed === false);
  assert('ready: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('ready: tag_plan_hash 64 chars', r.tag_plan_hash && r.tag_plan_hash.length === 64);
  assert('ready: errors empty', Array.isArray(r.errors) && r.errors.length === 0);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledTagPlan(VALID_INPUT);
  const v = validateControlledTagPlan(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildControlledTagPlan(null);
  const v = validateControlledTagPlan(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateControlledTagPlan(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledTagPlan(VALID_INPUT);
  const s = renderControlledTagPlan(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains TAG_PLAN_READY', s.includes('TAG_PLAN_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains release_allowed', s.includes('Release Allowed'));
}
{
  const s = renderControlledTagPlan(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const r = buildControlledTagPlan(VALID_INPUT);
  assert('all: release_allowed=false', r.release_allowed === false);
  assert('all: deploy_allowed=false', r.deploy_allowed === false);
  assert('all: stable_allowed=false', r.stable_allowed === false);
  assert('all: tag_allowed=false', r.tag_allowed === false);
  assert('all: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('all: tag_created=false', r.tag_created === false);
  assert('all: production_touched=false', r.production_touched === false);
  assert('all: deploy_performed=false', r.deploy_performed === false);
  assert('all: stable_promoted=false', r.stable_promoted === false);
  assert('all: release_performed=false', r.release_performed === false);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
