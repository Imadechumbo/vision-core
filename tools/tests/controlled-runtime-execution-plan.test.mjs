#!/usr/bin/env node
/**
 * Tests — Controlled Runtime Execution Plan V152.1
 */

import {
  buildControlledRuntimeExecutionPlan,
  validateControlledRuntimeExecutionPlan,
  renderControlledRuntimeExecutionPlan,
  EXECUTION_PLAN_STATUSES,
} from '../controlled-runtime-execution-plan.mjs';

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

const FULL_READY = {
  plan_id:                 'v152.1-plan',
  dry_run_id:              'v152.0-dry-run',
  command_type:            'CONTROLLED_RUNTIME_EXECUTION',
  dry_run_status:          'CONTROLLED_DRY_RUN_READY',
  dry_run_ready:           true,
  pass_gold_receipt_id:    'pg-receipt-001',
  rollback_plan_id:        'rbp-001',
  human_command_token:     'tok-human-001',
  human_command_confirmed: true,
  planned_at:              '2026-05-21T19:00:00.000Z',
};

console.log('\n=== controlled-runtime-execution-plan tests ===\n');

// --- blocked dry run ---
console.log('--- blocked dry run ---');
{
  const r = buildControlledRuntimeExecutionPlan({});
  assert('no plan_id → BLOCKED_DRY_RUN', r.execution_plan_status === 'EXECUTION_PLAN_BLOCKED_DRY_RUN');
  assert('plan_ready=false', r.plan_ready === false);
  assert('command_is_sealed=true', r.command_is_sealed === true);
  assert('command_executed=false', r.command_executed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
  assert('human_command_required=true', r.human_command_required === true);
}
{
  const r = buildControlledRuntimeExecutionPlan(null);
  assert('null → BLOCKED_DRY_RUN', r.execution_plan_status === 'EXECUTION_PLAN_BLOCKED_DRY_RUN');
}
{
  const r = buildControlledRuntimeExecutionPlan({ plan_id: 'p1', dry_run_id: 'dr1' });
  assert('no command_type → BLOCKED_DRY_RUN', r.execution_plan_status === 'EXECUTION_PLAN_BLOCKED_DRY_RUN');
}
{
  const r = buildControlledRuntimeExecutionPlan({
    plan_id: 'p1', dry_run_id: 'dr1', command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    dry_run_status: 'CONTROLLED_DRY_RUN_BLOCKED_ROLLBACK', dry_run_ready: false,
  });
  assert('dry run not ready → BLOCKED_DRY_RUN', r.execution_plan_status === 'EXECUTION_PLAN_BLOCKED_DRY_RUN');
}
{
  const r = buildControlledRuntimeExecutionPlan({
    plan_id: 'p1', dry_run_id: 'dr1', command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    dry_run_status: 'CONTROLLED_DRY_RUN_READY', dry_run_ready: false,
  });
  assert('dry_run_ready=false → BLOCKED_DRY_RUN', r.execution_plan_status === 'EXECUTION_PLAN_BLOCKED_DRY_RUN');
}

// --- requires human ---
console.log('--- requires human ---');
{
  const r = buildControlledRuntimeExecutionPlan({
    plan_id: 'p2', dry_run_id: 'dr1', command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    dry_run_status: 'CONTROLLED_DRY_RUN_READY', dry_run_ready: true,
  });
  assert('no human command → REQUIRES_HUMAN', r.execution_plan_status === 'EXECUTION_PLAN_REQUIRES_HUMAN');
  assert('plan_ready=false', r.plan_ready === false);
  assert('command_is_sealed=true', r.command_is_sealed === true);
  assert('human_command_required=true', r.human_command_required === true);
  assert('command_executed=false', r.command_executed === false);
}
{
  const r = buildControlledRuntimeExecutionPlan({
    plan_id: 'p2', dry_run_id: 'dr1', command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    dry_run_status: 'CONTROLLED_DRY_RUN_READY', dry_run_ready: true,
    human_command_token: 'tok', human_command_confirmed: false,
  });
  assert('human_command_confirmed=false → REQUIRES_HUMAN', r.execution_plan_status === 'EXECUTION_PLAN_REQUIRES_HUMAN');
  assert('approval_token_hash present', /^[a-f0-9]{64}$/.test(r.approval_token_hash));
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildControlledRuntimeExecutionPlan({ ...FULL_READY });
  assert('all ready → EXECUTION_PLAN_READY', r.execution_plan_status === 'EXECUTION_PLAN_READY');
  assert('plan_ready=true', r.plan_ready === true);
  assert('schema_version=v152.1', r.schema_version === 'v152.1');
  assert('plan_id propagated', r.plan_id === 'v152.1-plan');
  assert('dry_run_id propagated', r.dry_run_id === 'v152.0-dry-run');
  assert('command_type propagated', r.command_type === 'CONTROLLED_RUNTIME_EXECUTION');
  assert('planned_at propagated', r.planned_at === '2026-05-21T19:00:00.000Z');
  assert('pass_gold_receipt_id propagated', r.pass_gold_receipt_id === 'pg-receipt-001');
  assert('rollback_plan_id propagated', r.rollback_plan_id === 'rbp-001');
  assert('approval_token_hash sha256', /^[a-f0-9]{64}$/.test(r.approval_token_hash));
  assert('raw token NOT in output', !('human_command_token' in r));
  assert('command_is_sealed=true', r.command_is_sealed === true);
  assert('command_executed=false', r.command_executed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
  assert('human_command_required=true', r.human_command_required === true);
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildControlledRuntimeExecutionPlan({ ...FULL_READY });
  const r2 = buildControlledRuntimeExecutionPlan({ ...FULL_READY });
  assert('plan_id_hash deterministic', r1.plan_id_hash === r2.plan_id_hash);
  assert('plan_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.plan_id_hash));
}
{
  const r1 = buildControlledRuntimeExecutionPlan({ ...FULL_READY, plan_id: 'a' });
  const r2 = buildControlledRuntimeExecutionPlan({ ...FULL_READY, plan_id: 'b' });
  assert('different plan_id → different hash', r1.plan_id_hash !== r2.plan_id_hash);
}

// --- planned_at default ---
{
  const r = buildControlledRuntimeExecutionPlan({});
  assert('no planned_at → auto ISO', typeof r.planned_at === 'string' && r.planned_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildControlledRuntimeExecutionPlan({}),
    buildControlledRuntimeExecutionPlan({ ...FULL_READY }),
    buildControlledRuntimeExecutionPlan({ plan_id: 'px', dry_run_id: 'dx', command_type: 'CONTROLLED_DEPLOY', dry_run_status: 'CONTROLLED_DRY_RUN_READY', dry_run_ready: true }),
  ];
  for (const r of cases) {
    assert(`command_is_sealed=true [${r.execution_plan_status}]`, r.command_is_sealed === true);
    assert(`command_executed=false [${r.execution_plan_status}]`, r.command_executed === false);
    assert(`execution_performed=false [${r.execution_plan_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.execution_plan_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.execution_plan_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.execution_plan_status}]`, r.release_performed === false);
    assert(`human_command_required=true [${r.execution_plan_status}]`, r.human_command_required === true);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledRuntimeExecutionPlan({ ...FULL_READY });
  const v = validateControlledRuntimeExecutionPlan(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildControlledRuntimeExecutionPlan({});
  const v = validateControlledRuntimeExecutionPlan(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateControlledRuntimeExecutionPlan(null).valid === false);
}
{
  const r = buildControlledRuntimeExecutionPlan({ ...FULL_READY });
  assert('command_is_sealed tampered → invalid', validateControlledRuntimeExecutionPlan({ ...r, command_is_sealed: false }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionPlan({ ...FULL_READY });
  assert('command_executed tampered → invalid', validateControlledRuntimeExecutionPlan({ ...r, command_executed: true }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionPlan({ ...FULL_READY });
  assert('human_command_required tampered → invalid', validateControlledRuntimeExecutionPlan({ ...r, human_command_required: false }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionPlan({ ...FULL_READY });
  assert('READY with human_command_confirmed=false → invalid', validateControlledRuntimeExecutionPlan({ ...r, human_command_confirmed: false }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledRuntimeExecutionPlan({ ...FULL_READY });
  const s = renderControlledRuntimeExecutionPlan(r);
  assert('render string', typeof s === 'string');
  assert('render shows READY', s.includes('EXECUTION_PLAN_READY'));
  assert('render shows REGRA', s.includes('command_is_sealed=true'));
  assert('render shows plan_id', s.includes('v152.1-plan'));
  assert('render shows command_type', s.includes('CONTROLLED_RUNTIME_EXECUTION'));
}
{
  const r = buildControlledRuntimeExecutionPlan({});
  const s = renderControlledRuntimeExecutionPlan(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderControlledRuntimeExecutionPlan(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('EXECUTION_PLAN_STATUSES is array', Array.isArray(EXECUTION_PLAN_STATUSES));
  assert('EXECUTION_PLAN_STATUSES length=3', EXECUTION_PLAN_STATUSES.length === 3);
  assert('contains BLOCKED_DRY_RUN', EXECUTION_PLAN_STATUSES.includes('EXECUTION_PLAN_BLOCKED_DRY_RUN'));
  assert('contains REQUIRES_HUMAN', EXECUTION_PLAN_STATUSES.includes('EXECUTION_PLAN_REQUIRES_HUMAN'));
  assert('contains READY', EXECUTION_PLAN_STATUSES.includes('EXECUTION_PLAN_READY'));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
