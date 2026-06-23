#!/usr/bin/env node
/**
 * Tests — Hermes Cost Pattern Memory V141.1
 */

import {
  recordCostPatternMemory,
  validateCostPatternMemory,
  renderCostPatternMemory,
  PATTERN_MEMORY_STATUSES,
  PATTERN_TYPES,
} from '../hermes-cost-pattern-memory.mjs';

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
  mission_id:          'hermes-pattern-1',
  learning_allowed:    true,
  agent_route_cost_usd: 0.01,
  prompt_tokens:       3000,
  cache_hit:           true,
  result_status:       'passed',
  cache_miss_count:    1,
  test_lane:           'quick',
  test_cost_usd:       0.05,
  fallback_used:       false,
  recorded_at:         '2026-05-20T10:00:00.000Z',
};

console.log('\n=== hermes-cost-pattern-memory tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = recordCostPatternMemory({ ...BASE, mission_id: '' });
  assert('empty mission_id → PATTERN_BLOCKED_INPUT', r.pattern_status === 'PATTERN_BLOCKED_INPUT');
  assert('patterns empty', r.patterns_detected.length === 0);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = recordCostPatternMemory({});
  assert('no params → PATTERN_BLOCKED_INPUT', r.pattern_status === 'PATTERN_BLOCKED_INPUT');
}

// --- learning disabled ---
console.log('--- learning disabled ---');
{
  const r = recordCostPatternMemory({ ...BASE, learning_allowed: false });
  assert('learning_allowed=false → PATTERN_BLOCKED_LEARNING_DISABLED', r.pattern_status === 'PATTERN_BLOCKED_LEARNING_DISABLED');
  assert('patterns empty', r.patterns_detected.length === 0);
}
{
  const r = recordCostPatternMemory({ mission_id: 'x' });
  assert('default learning_allowed=false → BLOCKED', r.pattern_status === 'PATTERN_BLOCKED_LEARNING_DISABLED');
}

// --- no patterns ---
console.log('--- no patterns (RECORDED) ---');
{
  const r = recordCostPatternMemory({ ...BASE });
  // BASE: cost=0.01 (cheap), tokens=3000 (efficient), cache_hit=true+passed → useful_cache_hit
  assert('base → PATTERN_RECORDED or WARNING', ['PATTERN_RECORDED', 'PATTERN_RECORDED_WARNING'].includes(r.pattern_status));
  assert('schema_version=v141.1', r.schema_version === 'v141.1');
  assert('mission_id propagated', r.mission_id === 'hermes-pattern-1');
}

// --- expensive_agent pattern ---
console.log('--- expensive_agent ---');
{
  const r = recordCostPatternMemory({ ...BASE, agent_route_cost_usd: 0.15 });
  assert('cost 0.15 → expensive_agent detected', r.patterns_detected.some(p => p.type === 'expensive_agent'));
  assert('expensive_agent → WARNING', r.pattern_status === 'PATTERN_RECORDED_WARNING');
}

// --- cheap_agent pattern ---
console.log('--- cheap_agent ---');
{
  const r = recordCostPatternMemory({ ...BASE, agent_route_cost_usd: 0.01, cache_hit: false, result_status: null });
  assert('cost 0.01 → cheap_agent detected', r.patterns_detected.some(p => p.type === 'cheap_agent'));
}

// --- expensive_prompt ---
console.log('--- expensive_prompt ---');
{
  const r = recordCostPatternMemory({ ...BASE, prompt_tokens: 60000 });
  assert('60000 tokens → expensive_prompt', r.patterns_detected.some(p => p.type === 'expensive_prompt'));
  assert('expensive_prompt → WARNING', r.pattern_status === 'PATTERN_RECORDED_WARNING');
}

// --- efficient_prompt ---
console.log('--- efficient_prompt ---');
{
  const r = recordCostPatternMemory({ ...BASE, prompt_tokens: 4000, cache_hit: false });
  assert('4000 tokens → efficient_prompt', r.patterns_detected.some(p => p.type === 'efficient_prompt'));
}

// --- useful_cache_hit ---
console.log('--- useful_cache_hit ---');
{
  const r = recordCostPatternMemory({ ...BASE, cache_hit: true, result_status: 'passed' });
  assert('cache_hit=true+passed → useful_cache_hit', r.patterns_detected.some(p => p.type === 'useful_cache_hit'));
}
{
  const r = recordCostPatternMemory({ ...BASE, cache_hit: true, result_status: 'failed' });
  assert('cache_hit=true+failed → no useful_cache_hit', !r.patterns_detected.some(p => p.type === 'useful_cache_hit'));
}

// --- recurring_cache_miss ---
console.log('--- recurring_cache_miss ---');
{
  const r = recordCostPatternMemory({ ...BASE, cache_miss_count: 5, cache_hit: false });
  assert('miss_count=5 → recurring_cache_miss', r.patterns_detected.some(p => p.type === 'recurring_cache_miss'));
  assert('recurring_miss → WARNING', r.pattern_status === 'PATTERN_RECORDED_WARNING');
}
{
  const r = recordCostPatternMemory({ ...BASE, cache_miss_count: 2, cache_hit: false });
  assert('miss_count=2 → no recurring_cache_miss', !r.patterns_detected.some(p => p.type === 'recurring_cache_miss'));
}

// --- excessive_testing ---
console.log('--- excessive_testing ---');
{
  const r = recordCostPatternMemory({ ...BASE, test_lane: 'certify', test_cost_usd: 0.75 });
  assert('certify+cost>0.5 → excessive_testing', r.patterns_detected.some(p => p.type === 'excessive_testing'));
  assert('excessive_testing → WARNING', r.pattern_status === 'PATTERN_RECORDED_WARNING');
}
{
  const r = recordCostPatternMemory({ ...BASE, test_lane: 'quick', test_cost_usd: 0.75 });
  assert('quick lane → no excessive_testing', !r.patterns_detected.some(p => p.type === 'excessive_testing'));
}

// --- efficient_fallback ---
console.log('--- efficient_fallback ---');
{
  const r = recordCostPatternMemory({ ...BASE, fallback_used: true, fallback_cost_usd: 0.01 });
  assert('fallback+cost<=0.02 → efficient_fallback', r.patterns_detected.some(p => p.type === 'efficient_fallback'));
}
{
  const r = recordCostPatternMemory({ ...BASE, fallback_used: true, fallback_cost_usd: 0.10 });
  assert('fallback+cost>0.02 → no efficient_fallback', !r.patterns_detected.some(p => p.type === 'efficient_fallback'));
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    recordCostPatternMemory({ ...BASE }),
    recordCostPatternMemory({ ...BASE, mission_id: '' }),
    recordCostPatternMemory({ ...BASE, learning_allowed: false }),
    recordCostPatternMemory({ ...BASE, agent_route_cost_usd: 0.50 }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.pattern_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.pattern_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.pattern_status}]`, r.release_performed === false);
  }
}

// --- deterministic memory_id ---
console.log('--- deterministic memory_id ---');
{
  const r1 = recordCostPatternMemory({ ...BASE });
  const r2 = recordCostPatternMemory({ ...BASE });
  assert('memory_id deterministic', r1.memory_id === r2.memory_id);
  assert('memory_id sha256', /^[a-f0-9]{64}$/.test(r1.memory_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = recordCostPatternMemory({ ...BASE });
  const v = validateCostPatternMemory(r);
  assert('validate recorded → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = recordCostPatternMemory({ ...BASE, learning_allowed: false });
  const v = validateCostPatternMemory(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateCostPatternMemory(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = recordCostPatternMemory({ ...BASE, agent_route_cost_usd: 0.20 });
  const s = renderCostPatternMemory(r);
  assert('render string', typeof s === 'string');
  assert('render shows status', s.includes('PATTERN_RECORDED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = recordCostPatternMemory({ ...BASE, learning_allowed: false });
  const s = renderCostPatternMemory(r);
  assert('render blocked', s.includes('PATTERN_BLOCKED_LEARNING_DISABLED'));
}
{
  const s = renderCostPatternMemory(null);
  assert('render null graceful', typeof s === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('PATTERN_MEMORY_STATUSES is array', Array.isArray(PATTERN_MEMORY_STATUSES));
  assert('PATTERN_MEMORY_STATUSES length=4', PATTERN_MEMORY_STATUSES.length === 4);
  assert('PATTERN_TYPES is array', Array.isArray(PATTERN_TYPES));
  assert('PATTERN_TYPES length=8', PATTERN_TYPES.length === 8);
  for (const t of [
    'expensive_agent', 'cheap_agent', 'expensive_prompt', 'efficient_prompt',
    'useful_cache_hit', 'recurring_cache_miss', 'excessive_testing', 'efficient_fallback',
  ]) {
    assert(`pattern type present: ${t}`, PATTERN_TYPES.includes(t));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
