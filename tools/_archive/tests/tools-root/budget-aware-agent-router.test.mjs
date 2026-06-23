#!/usr/bin/env node
/**
 * Tests — Budget-Aware Agent Router V135.1
 */

import {
  routeAgentByBudget,
  validateBudgetAwareAgentRoute,
  renderBudgetAwareAgentRoute,
  AGENT_ROUTE_STATUSES,
  AGENT_ROUTES,
} from '../budget-aware-agent-router.mjs';

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
  mission_id:           'mission-router-1',
  cost_gate_status:     'COST_GATE_ALLOWED',
  cost_allowed:         true,
  cache_hit_rate:       0.3,
  is_critical_mission:  false,
  human_approval_given: false,
  fallback_required:    false,
};

console.log('\n=== budget-aware-agent-router tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = routeAgentByBudget({ ...BASE, mission_id: '' });
  assert('empty mission_id → ROUTE_BLOCKED_INPUT', r.route_status === 'ROUTE_BLOCKED_INPUT');
  assert('selected_route=blocked', r.selected_route === 'blocked');
}
{
  const r = routeAgentByBudget({ ...BASE, cost_gate_status: null });
  assert('null cost_gate_status → ROUTE_BLOCKED_INPUT', r.route_status === 'ROUTE_BLOCKED_INPUT');
}

// --- cost blocked ---
console.log('--- cost blocked ---');
{
  const r = routeAgentByBudget({ ...BASE, cost_allowed: false, cost_gate_status: 'COST_GATE_BLOCKED' });
  assert('cost blocked → ROUTE_BLOCKED_COST', r.route_status === 'ROUTE_BLOCKED_COST');
  assert('selected_route=blocked', r.selected_route === 'blocked');
  assert('is_fallback=false', r.is_fallback === false);
}

// --- high cache hit → local/free_api ---
console.log('--- high cache hit ---');
{
  const r = routeAgentByBudget({ ...BASE, cache_hit_rate: 0.95 });
  assert('cache≥0.9 → local', r.selected_route === 'local');
  assert('ROUTE_SELECTED', r.route_status === 'ROUTE_SELECTED');
}
{
  const r = routeAgentByBudget({ ...BASE, cache_hit_rate: 0.75 });
  assert('cache 0.7-0.9 → free_api', r.selected_route === 'free_api');
}

// --- critical + budget approved + human approval → premium/claude ---
console.log('--- critical mission ---');
{
  const r = routeAgentByBudget({
    ...BASE,
    is_critical_mission:  true,
    human_approval_given: true,
    preferred_agent:      'premium',
  });
  assert('critical + approved → premium', r.selected_route === 'premium');
}
{
  const r = routeAgentByBudget({
    ...BASE,
    is_critical_mission:  true,
    human_approval_given: true,
  });
  assert('critical + approved + no pref → claude', r.selected_route === 'claude');
}
{
  const r = routeAgentByBudget({
    ...BASE,
    is_critical_mission:  true,
    human_approval_given: false,
  });
  assert('critical without human approval → claude (not premium)', r.selected_route === 'claude');
}

// --- fallback local/deepseek ---
console.log('--- fallback ---');
{
  const r = routeAgentByBudget({ ...BASE, fallback_required: true, cache_hit_rate: 0.6 });
  assert('fallback + high cache → local', r.selected_route === 'local');
  assert('ROUTE_FALLBACK_SELECTED', r.route_status === 'ROUTE_FALLBACK_SELECTED');
  assert('is_fallback=true', r.is_fallback === true);
}
{
  const r = routeAgentByBudget({ ...BASE, fallback_required: true, cache_hit_rate: 0.2 });
  assert('fallback + low cache → deepseek', r.selected_route === 'deepseek');
}

// --- standard routing ALLOWED ---
console.log('--- standard routing ---');
{
  const r = routeAgentByBudget({ ...BASE, preferred_agent: 'codex' });
  assert('ALLOWED + pref codex → codex', r.selected_route === 'codex');
  assert('ROUTE_SELECTED', r.route_status === 'ROUTE_SELECTED');
}
{
  const r = routeAgentByBudget({ ...BASE });
  assert('ALLOWED + no pref → codex', r.selected_route === 'codex');
}

// --- WARNING → free_api ---
console.log('--- WARNING gate ---');
{
  const r = routeAgentByBudget({ ...BASE, cost_gate_status: 'COST_GATE_WARNING', cache_hit_rate: 0.2 });
  assert('WARNING → free_api', r.selected_route === 'free_api');
}

// --- human approval required but not given → deepseek fallback ---
console.log('--- human approval required ---');
{
  const r = routeAgentByBudget({
    ...BASE,
    cost_gate_status:     'COST_GATE_REQUIRES_HUMAN_APPROVAL',
    human_approval_given: false,
    cache_hit_rate:       0.2,
  });
  assert('requires human approval not given → deepseek fallback', r.selected_route === 'deepseek');
  assert('ROUTE_FALLBACK_SELECTED', r.route_status === 'ROUTE_FALLBACK_SELECTED');
}

// --- never auto-deploy/release/stable ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    routeAgentByBudget({ ...BASE }),
    routeAgentByBudget({ ...BASE, cost_allowed: false }),
    routeAgentByBudget({ ...BASE, mission_id: '' }),
    routeAgentByBudget({ ...BASE, fallback_required: true }),
    routeAgentByBudget({ ...BASE, cache_hit_rate: 0.95 }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.route_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.route_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.route_status}]`, r.release_performed === false);
  }
}

// --- deterministic route_id ---
console.log('--- deterministic route_id ---');
{
  const r1 = routeAgentByBudget({ ...BASE });
  const r2 = routeAgentByBudget({ ...BASE });
  assert('route_id deterministic', r1.route_id === r2.route_id);
  assert('route_id sha256 hex 64', /^[a-f0-9]{64}$/.test(r1.route_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = routeAgentByBudget({ ...BASE });
  const v = validateBudgetAwareAgentRoute(r);
  assert('validate selected → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = routeAgentByBudget({ ...BASE, mission_id: '' });
  const v = validateBudgetAwareAgentRoute(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateBudgetAwareAgentRoute(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = routeAgentByBudget({ ...BASE });
  const s = renderBudgetAwareAgentRoute(r);
  assert('render string', typeof s === 'string');
  assert('render shows ROUTE_SELECTED', s.includes('ROUTE_SELECTED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = routeAgentByBudget({ ...BASE, cost_allowed: false });
  const s = renderBudgetAwareAgentRoute(r);
  assert('render blocked shows ROUTE_BLOCKED_COST', s.includes('ROUTE_BLOCKED_COST'));
}
{
  const s = renderBudgetAwareAgentRoute(null);
  assert('render null graceful', typeof s === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('AGENT_ROUTE_STATUSES is array', Array.isArray(AGENT_ROUTE_STATUSES));
  assert('length=4', AGENT_ROUTE_STATUSES.length === 4);
  for (const s of ['ROUTE_BLOCKED_INPUT', 'ROUTE_BLOCKED_COST', 'ROUTE_SELECTED', 'ROUTE_FALLBACK_SELECTED']) {
    assert(`${s} present`, AGENT_ROUTE_STATUSES.includes(s));
  }

  assert('AGENT_ROUTES is array', Array.isArray(AGENT_ROUTES));
  assert('length=7', AGENT_ROUTES.length === 7);
  for (const r of ['local', 'free_api', 'claude', 'codex', 'deepseek', 'premium', 'blocked']) {
    assert(`route ${r} present`, AGENT_ROUTES.includes(r));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
