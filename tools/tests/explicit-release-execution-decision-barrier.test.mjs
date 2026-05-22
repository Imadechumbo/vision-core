#!/usr/bin/env node

import {
  buildExplicitReleaseExecutionDecisionBarrier,
  validateExplicitReleaseExecutionDecisionBarrier,
  renderExplicitReleaseExecutionDecisionBarrier,
  EXPLICIT_RELEASE_EXECUTION_BARRIER_STATUSES,
} from '../explicit-release-execution-decision-barrier.mjs';

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
  execution_barrier_id: 'barrier-001',
  release_authority_report_ready: true,
  pre_release_ready: true,
  release_plan_locked: true,
  explicit_release_execution_requested: true,
  explicit_release_execution_authorized: true,
};

console.log('\n=== explicit-release-execution-decision-barrier tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(EXPLICIT_RELEASE_EXECUTION_BARRIER_STATUSES));
assert('contains EXECUTION_BARRIER_BLOCKED_INPUT', EXPLICIT_RELEASE_EXECUTION_BARRIER_STATUSES.includes('EXECUTION_BARRIER_BLOCKED_INPUT'));
assert('contains EXECUTION_BARRIER_BLOCKED_REPORT', EXPLICIT_RELEASE_EXECUTION_BARRIER_STATUSES.includes('EXECUTION_BARRIER_BLOCKED_REPORT'));
assert('contains EXECUTION_BARRIER_DENIED', EXPLICIT_RELEASE_EXECUTION_BARRIER_STATUSES.includes('EXECUTION_BARRIER_DENIED'));
assert('contains EXECUTION_BARRIER_READY', EXPLICIT_RELEASE_EXECUTION_BARRIER_STATUSES.includes('EXECUTION_BARRIER_READY'));
assert('build is function', typeof buildExplicitReleaseExecutionDecisionBarrier === 'function');
assert('validate is function', typeof validateExplicitReleaseExecutionDecisionBarrier === 'function');
assert('render is function', typeof renderExplicitReleaseExecutionDecisionBarrier === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildExplicitReleaseExecutionDecisionBarrier(null);
  assert('null -> BLOCKED_INPUT', r.status === 'EXECUTION_BARRIER_BLOCKED_INPUT');
  assert('null: barrier_ready=false', r.barrier_ready === false);
  assert('null: errors non-empty', r.errors.length > 0);
}
{
  const r = buildExplicitReleaseExecutionDecisionBarrier({});
  assert('{} -> BLOCKED_INPUT', r.status === 'EXECUTION_BARRIER_BLOCKED_INPUT');
}
{
  const r = buildExplicitReleaseExecutionDecisionBarrier({ execution_barrier_id: '' });
  assert('empty barrier_id -> BLOCKED_INPUT', r.status === 'EXECUTION_BARRIER_BLOCKED_INPUT');
}

// --- blocked report ---
console.log('--- blocked report ---');
{
  const base = { execution_barrier_id: 'b-1' };
  const r = buildExplicitReleaseExecutionDecisionBarrier({ ...base, release_authority_report_ready: false });
  assert('report_ready=false -> BLOCKED_REPORT', r.status === 'EXECUTION_BARRIER_BLOCKED_REPORT');
}
{
  const base = { execution_barrier_id: 'b-1' };
  const r = buildExplicitReleaseExecutionDecisionBarrier({ ...base, release_authority_report_ready: true, pre_release_ready: false });
  assert('pre_release_ready=false -> BLOCKED_REPORT', r.status === 'EXECUTION_BARRIER_BLOCKED_REPORT');
}
{
  const base = { execution_barrier_id: 'b-1' };
  const r = buildExplicitReleaseExecutionDecisionBarrier({ ...base, release_authority_report_ready: true, pre_release_ready: true, release_plan_locked: false });
  assert('release_plan_locked=false -> BLOCKED_REPORT', r.status === 'EXECUTION_BARRIER_BLOCKED_REPORT');
}

// --- denied ---
console.log('--- denied ---');
{
  const base = { execution_barrier_id: 'b-1', release_authority_report_ready: true, pre_release_ready: true, release_plan_locked: true };
  const r = buildExplicitReleaseExecutionDecisionBarrier({ ...base, explicit_release_execution_requested: false });
  assert('requested=false -> DENIED', r.status === 'EXECUTION_BARRIER_DENIED');
}
{
  const base = { execution_barrier_id: 'b-1', release_authority_report_ready: true, pre_release_ready: true, release_plan_locked: true };
  const r = buildExplicitReleaseExecutionDecisionBarrier({ ...base, explicit_release_execution_requested: true, explicit_release_execution_authorized: false });
  assert('authorized=false -> DENIED', r.status === 'EXECUTION_BARRIER_DENIED');
}
{
  const base = { execution_barrier_id: 'b-1', release_authority_report_ready: true, pre_release_ready: true, release_plan_locked: true };
  const r = buildExplicitReleaseExecutionDecisionBarrier({ ...base, explicit_release_execution_requested: true, explicit_release_execution_authorized: true, production_touched: true });
  assert('production_touched=true -> DENIED', r.status === 'EXECUTION_BARRIER_DENIED');
}
{
  const base = { execution_barrier_id: 'b-1', release_authority_report_ready: true, pre_release_ready: true, release_plan_locked: true };
  const r = buildExplicitReleaseExecutionDecisionBarrier({ ...base, explicit_release_execution_requested: true, explicit_release_execution_authorized: true, deploy_performed: true });
  assert('deploy_performed=true -> DENIED', r.status === 'EXECUTION_BARRIER_DENIED');
}
{
  const base = { execution_barrier_id: 'b-1', release_authority_report_ready: true, pre_release_ready: true, release_plan_locked: true };
  const r = buildExplicitReleaseExecutionDecisionBarrier({ ...base, explicit_release_execution_requested: true, explicit_release_execution_authorized: true, stable_promoted: true });
  assert('stable_promoted=true -> DENIED', r.status === 'EXECUTION_BARRIER_DENIED');
}
{
  const base = { execution_barrier_id: 'b-1', release_authority_report_ready: true, pre_release_ready: true, release_plan_locked: true };
  const r = buildExplicitReleaseExecutionDecisionBarrier({ ...base, explicit_release_execution_requested: true, explicit_release_execution_authorized: true, release_performed: true });
  assert('release_performed=true -> DENIED', r.status === 'EXECUTION_BARRIER_DENIED');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildExplicitReleaseExecutionDecisionBarrier(VALID_INPUT);
  assert('valid -> EXECUTION_BARRIER_READY', r.status === 'EXECUTION_BARRIER_READY');
  assert('ready: schema_version=v200.0', r.schema_version === 'v200.0');
  assert('ready: execution_barrier_id set', r.execution_barrier_id === 'barrier-001');
  assert('ready: barrier_ready=true', r.barrier_ready === true);
  assert('ready: next_phase_allowed=true', r.next_phase_allowed === true);
  assert('ready: next_phase=V201_CONTROLLED_REAL_TAG_EXECUTION', r.next_phase === 'V201_CONTROLLED_REAL_TAG_EXECUTION');
  assert('ready: final_message contains V191-V200', r.final_message.includes('V191-V200'));
  assert('ready: barrier_hash 64 chars', r.barrier_hash && r.barrier_hash.length === 64);
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: deploy_allowed=false', r.deploy_allowed === false);
  assert('ready: stable_allowed=false', r.stable_allowed === false);
  assert('ready: tag_allowed=false', r.tag_allowed === false);
  assert('ready: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('ready: errors empty', Array.isArray(r.errors) && r.errors.length === 0);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildExplicitReleaseExecutionDecisionBarrier(VALID_INPUT);
  const v = validateExplicitReleaseExecutionDecisionBarrier(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildExplicitReleaseExecutionDecisionBarrier(null);
  const v = validateExplicitReleaseExecutionDecisionBarrier(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateExplicitReleaseExecutionDecisionBarrier(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildExplicitReleaseExecutionDecisionBarrier(VALID_INPUT);
  const s = renderExplicitReleaseExecutionDecisionBarrier(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains V191-V200', s.includes('V191-V200'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains V201', s.includes('V201'));
}
{
  const s = renderExplicitReleaseExecutionDecisionBarrier(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const r = buildExplicitReleaseExecutionDecisionBarrier(VALID_INPUT);
  assert('all: release_allowed=false', r.release_allowed === false);
  assert('all: deploy_allowed=false', r.deploy_allowed === false);
  assert('all: stable_allowed=false', r.stable_allowed === false);
  assert('all: tag_allowed=false', r.tag_allowed === false);
  assert('all: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('all: production_touched=false', r.production_touched === false);
  assert('all: deploy_performed=false', r.deploy_performed === false);
  assert('all: stable_promoted=false', r.stable_promoted === false);
  assert('all: release_performed=false', r.release_performed === false);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
