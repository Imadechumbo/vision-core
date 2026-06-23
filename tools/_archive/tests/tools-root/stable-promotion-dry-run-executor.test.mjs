#!/usr/bin/env node
/**
 * Tests — Stable Promotion Dry-Run Executor V118.0
 */

import {
  runStablePromotionDryRunExecutor,
  validateStablePromotionDryRunExecutor,
  renderStablePromotionDryRunExecutor,
  DRY_RUN_EXECUTOR_STATUSES,
} from '../stable-promotion-dry-run-executor.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_BLOCK = {
  render_ready:          true,
  command_block_id:      'block-001',
  target_stable_ref:     'stable',
  target_tag:            'v1.0.0',
  rendered_preflight:    ['git fetch origin', 'git status'],
  rendered_promotion:    ['git branch -f stable v1.0.0', 'git push origin stable'],
  rendered_verification: ['git log origin/stable --oneline -3'],
  rendered_rollback:     ['git branch -f stable rollback-001', 'git push origin stable'],
};

console.log('\n=== stable-promotion-dry-run-executor tests ===\n');

console.log('--- null block ---');
{
  const r = runStablePromotionDryRunExecutor({});
  assert(r.executor_status === 'DRY_RUN_BLOCKED_COMMAND_BLOCK', 'null block → BLOCKED_COMMAND_BLOCK');
  assert(r.dry_run_ready === false, 'dry_run_ready false');
}

console.log('--- block not ready ---');
{
  const r = runStablePromotionDryRunExecutor({ stable_promotion_command_block: { render_ready: false } });
  assert(r.executor_status === 'DRY_RUN_BLOCKED_COMMAND_BLOCK', 'not-ready → BLOCKED_COMMAND_BLOCK');
}

console.log('--- allow_real_execution blocked ---');
{
  const r = runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK, allow_real_execution: true });
  assert(r.executor_status === 'DRY_RUN_BLOCKED_SAFETY', 'real exec → BLOCKED_SAFETY');
  assert(r.dry_run_ready === false, 'dry_run_ready false');
}

console.log('--- simulated result ---');
{
  const r = runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK });
  assert(r.executor_status === 'DRY_RUN_SIMULATED', 'ready status');
  assert(r.dry_run_ready === true, 'dry_run_ready true');
  assert(r.command_block_id === 'block-001', 'block_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(Array.isArray(r.simulated_preflight), 'simulated_preflight array');
  assert(r.simulated_preflight.length === 2, 'preflight count');
  assert(Array.isArray(r.simulated_promotion), 'simulated_promotion array');
  assert(r.simulated_promotion.length === 2, 'promotion count');
  assert(Array.isArray(r.simulated_verification), 'simulated_verification array');
  assert(Array.isArray(r.simulated_rollback), 'simulated_rollback array');
  assert(r.total_commands_simulated === 7, 'total commands simulated');
  assert(typeof r.executor_id === 'string' && r.executor_id.length === 64, 'executor_id sha256');
  assert(r.schema_version === 'v118.0', 'schema version');
}

console.log('--- simulated command shape ---');
{
  const r = runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK });
  const sim = r.simulated_preflight[0];
  assert(sim.command === 'git fetch origin', 'command string');
  assert(sim.simulated === true, 'simulated=true');
  assert(sim.executed === false, 'executed=false');
  assert(sim.exit_code_sim === 0, 'exit_code_sim=0');
  assert(typeof sim.output_sim === 'string', 'output_sim string');
  assert(sim.output_sim.includes('[DRY-RUN]'), 'output_sim has DRY-RUN tag');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = runStablePromotionDryRunExecutor({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK });
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK }).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK }).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK }).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK }).release_performed === false, 'release_performed=false');
}

console.log('--- commands_executed=false ---');
{
  assert(runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK }).commands_executed === false, 'commands_executed=false');
}

console.log('--- real_execution_performed=false ---');
{
  assert(runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK }).real_execution_performed === false, 'real_execution_performed=false');
}

console.log('--- dry_run_only=true ---');
{
  assert(runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK }).dry_run_only === true, 'dry_run_only=true');
}

console.log('--- validate ---');
{
  const r = runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK });
  const v = validateStablePromotionDryRunExecutor(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionDryRunExecutor(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = runStablePromotionDryRunExecutor({ stable_promotion_command_block: GOOD_BLOCK });
  const txt = renderStablePromotionDryRunExecutor(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION DRY-RUN EXECUTOR'), 'render title');
  assert(txt.includes('[SIM]'), 'sim marker in output');
  assert(txt.includes('commands_executed:         false'), 'invariant in output');
  assert(txt.includes('dry_run_only:              true'), 'dry_run_only in output');
}

console.log('--- render blocked ---');
{
  const r = runStablePromotionDryRunExecutor({});
  const txt = renderStablePromotionDryRunExecutor(r);
  assert(txt.includes('DRY-RUN EXECUTOR BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(DRY_RUN_EXECUTOR_STATUSES.includes('DRY_RUN_SIMULATED'), 'simulated in statuses');
  assert(DRY_RUN_EXECUTOR_STATUSES.includes('DRY_RUN_BLOCKED_COMMAND_BLOCK'), 'blocked in statuses');
  assert(DRY_RUN_EXECUTOR_STATUSES.includes('DRY_RUN_BLOCKED_SAFETY'), 'safety blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
