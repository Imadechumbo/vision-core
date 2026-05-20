#!/usr/bin/env node
/**
 * Tests — Token Budget Controller V133.0
 */

import {
  evaluateTokenBudget,
  validateTokenBudgetResult,
  renderTokenBudgetResult,
  TOKEN_BUDGET_STATUSES,
} from '../token-budget-controller.mjs';

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

const BASE = {
  mission_id:              'mission-abc',
  agent_id:                'agent-1',
  phase:                   'planning',
  max_input_tokens:        10000,
  max_output_tokens:       5000,
  estimated_input_tokens:  2000,
  estimated_output_tokens: 1000,
  warning_threshold_ratio: 0.8,
  hard_block_ratio:        1.0,
  cache_tokens_saved:      0,
  cache_discount_applied:  false,
};

console.log('\n=== token-budget-controller tests ===\n');

// --- missing mission_id ---
console.log('--- missing mission_id ---');
{
  const r = evaluateTokenBudget({ ...BASE, mission_id: '' });
  assert('empty mission_id → BLOCKED_MISSION', r.budget_status === 'TOKEN_BUDGET_BLOCKED_MISSION');
  assert('budget_blocked=true', r.budget_blocked === true);
  assert('budget_allowed=false', r.budget_allowed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = evaluateTokenBudget({ ...BASE, mission_id: null });
  assert('null mission_id → BLOCKED_MISSION', r.budget_status === 'TOKEN_BUDGET_BLOCKED_MISSION');
}
{
  const r = evaluateTokenBudget({ ...BASE, mission_id: '   ' });
  assert('whitespace mission_id → BLOCKED_MISSION', r.budget_status === 'TOKEN_BUDGET_BLOCKED_MISSION');
}

// --- invalid max tokens ---
console.log('--- invalid max tokens ---');
{
  const r = evaluateTokenBudget({ ...BASE, max_input_tokens: 0 });
  assert('max_input_tokens=0 → BLOCKED_LIMIT', r.budget_status === 'TOKEN_BUDGET_BLOCKED_LIMIT');
  assert('budget_blocked=true', r.budget_blocked === true);
}
{
  const r = evaluateTokenBudget({ ...BASE, max_output_tokens: -1 });
  assert('max_output_tokens=-1 → BLOCKED_LIMIT', r.budget_status === 'TOKEN_BUDGET_BLOCKED_LIMIT');
}
{
  const r = evaluateTokenBudget({ ...BASE, max_input_tokens: null });
  assert('max_input_tokens=null → BLOCKED_LIMIT', r.budget_status === 'TOKEN_BUDGET_BLOCKED_LIMIT');
}

// --- estimated tokens negative ---
console.log('--- estimated tokens negative ---');
{
  const r = evaluateTokenBudget({ ...BASE, estimated_input_tokens: -5 });
  assert('estimated_input_tokens=-5 → BLOCKED_LIMIT', r.budget_status === 'TOKEN_BUDGET_BLOCKED_LIMIT');
}
{
  const r = evaluateTokenBudget({ ...BASE, estimated_output_tokens: -1 });
  assert('estimated_output_tokens=-1 → BLOCKED_LIMIT', r.budget_status === 'TOKEN_BUDGET_BLOCKED_LIMIT');
}

// --- under budget → ALLOWED ---
console.log('--- under budget → ALLOWED ---');
{
  const r = evaluateTokenBudget({ ...BASE });
  assert('under budget → ALLOWED', r.budget_status === 'TOKEN_BUDGET_ALLOWED');
  assert('budget_allowed=true', r.budget_allowed === true);
  assert('budget_blocked=false', r.budget_blocked === false);
  assert('budget_warning=false', r.budget_warning === false);
  assert('schema_version=v133.0', r.schema_version === 'v133.0');
  assert('total_max_tokens=15000', r.total_max_tokens === 15000);
  assert('total_estimated_tokens=3000', r.total_estimated_tokens === 3000);
  assert('remaining_total_tokens=12000', r.remaining_total_tokens === 12000);
  assert('input_usage_ratio=0.2', Math.abs(r.input_usage_ratio - 0.2) < 0.0001);
  assert('output_usage_ratio=0.2', Math.abs(r.output_usage_ratio - 0.2) < 0.0001);
  assert('total_usage_ratio=0.2', Math.abs(r.total_usage_ratio - 0.2) < 0.0001);
}

// --- near budget → WARNING ---
console.log('--- near budget → WARNING ---');
{
  // total = 12000+4000=16000, max=15000 → over, use input near 80%
  // max_input=10000, est_input=8000, max_out=5000, est_out=1000
  // total_est=9000, total_max=15000, ratio=0.6 → below 0.8
  // use: est_input=7000, est_out=5000 → total=12000/15000=0.8 = warning threshold
  const r = evaluateTokenBudget({
    ...BASE,
    estimated_input_tokens:  7000,
    estimated_output_tokens: 5000,
    warning_threshold_ratio: 0.8,
    hard_block_ratio:        1.0,
  });
  assert('at 80% → WARNING', r.budget_status === 'TOKEN_BUDGET_WARNING');
  assert('budget_allowed=true in WARNING', r.budget_allowed === true);
  assert('budget_blocked=false in WARNING', r.budget_blocked === false);
  assert('budget_warning=true', r.budget_warning === true);
}

// --- over input budget → BLOCKED_LIMIT ---
console.log('--- over input budget → BLOCKED_LIMIT ---');
{
  const r = evaluateTokenBudget({
    ...BASE,
    estimated_input_tokens:  11000,
    estimated_output_tokens: 100,
    hard_block_ratio:        1.0,
  });
  assert('input over limit → BLOCKED_LIMIT', r.budget_status === 'TOKEN_BUDGET_BLOCKED_LIMIT');
  assert('budget_blocked=true', r.budget_blocked === true);
}

// --- over output budget → BLOCKED_LIMIT ---
console.log('--- over output budget → BLOCKED_LIMIT ---');
{
  const r = evaluateTokenBudget({
    ...BASE,
    estimated_input_tokens:  100,
    estimated_output_tokens: 6000,
    hard_block_ratio:        1.0,
  });
  assert('output over limit → BLOCKED_LIMIT', r.budget_status === 'TOKEN_BUDGET_BLOCKED_LIMIT');
}

// --- over total budget → BLOCKED_LIMIT ---
console.log('--- over total budget → BLOCKED_LIMIT ---');
{
  // max=15000, estimated=16000, hard_block=1.0 → blocked
  const r = evaluateTokenBudget({
    ...BASE,
    max_input_tokens:        10000,
    max_output_tokens:       5000,
    estimated_input_tokens:  10000,
    estimated_output_tokens: 6000,
    hard_block_ratio:        1.0,
  });
  assert('total over limit → BLOCKED_LIMIT', r.budget_status === 'TOKEN_BUDGET_BLOCKED_LIMIT');
}

// --- cache_tokens_saved reduces total_estimated_tokens ---
console.log('--- cache_tokens_saved ---');
{
  // est=3000, saved=1000 → effective total=2000
  const r = evaluateTokenBudget({
    ...BASE,
    estimated_input_tokens:  2000,
    estimated_output_tokens: 1000,
    cache_tokens_saved:      1000,
  });
  assert('cache saved reduces total_estimated', r.total_estimated_tokens === 2000);
  assert('cache saved → ALLOWED', r.budget_status === 'TOKEN_BUDGET_ALLOWED');
  assert('cache_tokens_saved recorded', r.cache_tokens_saved === 1000);
}

// --- cache_tokens_saved never goes below 0 ---
console.log('--- cache never negative ---');
{
  const r = evaluateTokenBudget({
    ...BASE,
    estimated_input_tokens:  500,
    estimated_output_tokens: 300,
    cache_tokens_saved:      99999,
  });
  assert('total_estimated_tokens >= 0', r.total_estimated_tokens >= 0);
  assert('total_estimated_tokens = 0', r.total_estimated_tokens === 0);
}

// --- default warning_threshold_ratio = 0.8 ---
console.log('--- default warning threshold ---');
{
  // No explicit threshold → should default to 0.8
  const r = evaluateTokenBudget({
    mission_id:              'mission-x',
    agent_id:                'a',
    phase:                   'test',
    max_input_tokens:        10000,
    max_output_tokens:       5000,
    estimated_input_tokens:  6000,
    estimated_output_tokens: 2000,
    // no warning_threshold_ratio
    hard_block_ratio:        1.0,
  });
  // total=8000/15000=0.533 → ALLOWED
  assert('default threshold → ALLOWED at 53%', r.budget_status === 'TOKEN_BUDGET_ALLOWED');
  assert('warning_threshold_ratio defaults to 0.8', r.warning_threshold_ratio === 0.8);
}

// --- budget_id deterministic ---
console.log('--- deterministic budget_id ---');
{
  const r1 = evaluateTokenBudget({ ...BASE });
  const r2 = evaluateTokenBudget({ ...BASE });
  assert('budget_id deterministic', r1.budget_id === r2.budget_id);
  assert('budget_id is sha256 hex 64', /^[a-f0-9]{64}$/.test(r1.budget_id));
}
{
  const r1 = evaluateTokenBudget({ ...BASE });
  const r2 = evaluateTokenBudget({ ...BASE, estimated_input_tokens: 3000 });
  assert('different input → different budget_id', r1.budget_id !== r2.budget_id);
}

// --- validate ready ---
console.log('--- validate ---');
{
  const r = evaluateTokenBudget({ ...BASE });
  const v = validateTokenBudgetResult(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('validate ready → no errors', v.errors.length === 0);
}
{
  const r = evaluateTokenBudget({ ...BASE, mission_id: '' });
  const v = validateTokenBudgetResult(r);
  assert('validate blocked → valid=true (struct ok)', v.valid === true);
}
{
  const v = validateTokenBudgetResult(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = evaluateTokenBudget({ ...BASE });
  const s = renderTokenBudgetResult(r);
  assert('render returns string', typeof s === 'string');
  assert('render shows status', s.includes('TOKEN_BUDGET_ALLOWED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows usage ratio', s.includes('Usage ratio:'));
}
{
  const r = evaluateTokenBudget({ ...BASE, mission_id: '' });
  const s = renderTokenBudgetResult(r);
  assert('render blocked shows BLOCKED_MISSION', s.includes('TOKEN_BUDGET_BLOCKED_MISSION'));
}
{
  const s = renderTokenBudgetResult(null);
  assert('render null graceful', typeof s === 'string');
}

// --- TOKEN_BUDGET_STATUSES export ---
console.log('--- TOKEN_BUDGET_STATUSES export ---');
{
  assert('is array', Array.isArray(TOKEN_BUDGET_STATUSES));
  assert('length=4', TOKEN_BUDGET_STATUSES.length === 4);
  assert('BLOCKED_MISSION present', TOKEN_BUDGET_STATUSES.includes('TOKEN_BUDGET_BLOCKED_MISSION'));
  assert('BLOCKED_LIMIT present', TOKEN_BUDGET_STATUSES.includes('TOKEN_BUDGET_BLOCKED_LIMIT'));
  assert('WARNING present', TOKEN_BUDGET_STATUSES.includes('TOKEN_BUDGET_WARNING'));
  assert('ALLOWED present', TOKEN_BUDGET_STATUSES.includes('TOKEN_BUDGET_ALLOWED'));
  assert('exact order [0]', TOKEN_BUDGET_STATUSES[0] === 'TOKEN_BUDGET_BLOCKED_MISSION');
  assert('exact order [1]', TOKEN_BUDGET_STATUSES[1] === 'TOKEN_BUDGET_BLOCKED_LIMIT');
  assert('exact order [2]', TOKEN_BUDGET_STATUSES[2] === 'TOKEN_BUDGET_WARNING');
  assert('exact order [3]', TOKEN_BUDGET_STATUSES[3] === 'TOKEN_BUDGET_ALLOWED');
}

// --- REGRA invariants on all status paths ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    evaluateTokenBudget({ ...BASE }),
    evaluateTokenBudget({ ...BASE, mission_id: '' }),
    evaluateTokenBudget({ ...BASE, max_input_tokens: 0 }),
    evaluateTokenBudget({ ...BASE, estimated_input_tokens: 11000, estimated_output_tokens: 100 }),
    evaluateTokenBudget({ ...BASE, estimated_input_tokens: 7000, estimated_output_tokens: 5000 }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.budget_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.budget_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.budget_status}]`, r.release_performed === false);
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
