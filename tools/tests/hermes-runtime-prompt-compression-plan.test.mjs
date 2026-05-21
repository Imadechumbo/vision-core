#!/usr/bin/env node
/**
 * Tests — Hermes Runtime Prompt Compression Plan V143.1
 */

import {
  buildPromptCompressionPlan,
  validatePromptCompressionPlan,
  renderPromptCompressionPlan,
  COMPRESSION_PLAN_STATUSES,
} from '../hermes-runtime-prompt-compression-plan.mjs';

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
  mission_id:                'compress-1',
  graph_memory_available:    true,
  graph_memory_summary:      'Graph summary here.',
  evidence_receipt_valid:    true,
  evidence_receipt_summary:  'Evidence summary.',
  baseline_id:               'g'.repeat(64),
  cache_hit:                 true,
  cache_summary:             'Cache summary.',
  redundant_context_detected: true,
  critical_files:            ['src/core.ts', 'src/auth.ts'],
  current_prompt_tokens:     80000,
  planned_at:                '2026-05-20T14:00:00.000Z',
};

console.log('\n=== hermes-runtime-prompt-compression-plan tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildPromptCompressionPlan({ ...BASE, mission_id: '' });
  assert('empty mission_id → COMPRESSION_BLOCKED_INPUT', r.compression_status === 'COMPRESSION_BLOCKED_INPUT');
  assert('strategies empty', r.compression_strategies.length === 0);
  assert('estimated_token_reduction=0', r.estimated_token_reduction === 0);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildPromptCompressionPlan({});
  assert('no params → COMPRESSION_BLOCKED_INPUT', r.compression_status === 'COMPRESSION_BLOCKED_INPUT');
}

// --- insufficient data ---
console.log('--- insufficient data ---');
{
  const r = buildPromptCompressionPlan({ mission_id: 'x' });
  assert('no data → COMPRESSION_BLOCKED_INSUFFICIENT_DATA', r.compression_status === 'COMPRESSION_BLOCKED_INSUFFICIENT_DATA');
  assert('strategies empty', r.compression_strategies.length === 0);
  assert('token_reduction=0', r.estimated_token_reduction === 0);
}

// --- partial ---
console.log('--- partial ---');
{
  // only baseline_id and critical_files — no core data (graph or evidence)
  const r = buildPromptCompressionPlan({
    mission_id: 'x',
    baseline_id: 'a'.repeat(64),
    critical_files: ['src/a.ts'],
  });
  assert('baseline only → COMPRESSION_PLAN_PARTIAL', r.compression_status === 'COMPRESSION_PLAN_PARTIAL');
  assert('use_baseline_id=true', r.use_baseline_id === true);
  assert('keep_critical_files=true', r.keep_critical_files === true);
}
{
  // cache_hit but no summary → cache strategy not applied
  const r = buildPromptCompressionPlan({
    mission_id: 'x',
    cache_hit: true,
    cache_summary: null,
    baseline_id: 'a'.repeat(64),
  });
  assert('cache_hit+no summary → PARTIAL (baseline only)', r.compression_status === 'COMPRESSION_PLAN_PARTIAL');
  assert('use_cache_hit=false', r.use_cache_hit === false);
}

// --- plan ready ---
console.log('--- plan ready ---');
{
  const r = buildPromptCompressionPlan({ ...BASE });
  assert('all data → COMPRESSION_PLAN_READY', r.compression_status === 'COMPRESSION_PLAN_READY');
  assert('schema_version=v143.1', r.schema_version === 'v143.1');
  assert('mission_id propagated', r.mission_id === 'compress-1');
  assert('planned_at propagated', r.planned_at === '2026-05-20T14:00:00.000Z');
  assert('use_graph_memory_summary=true', r.use_graph_memory_summary === true);
  assert('use_evidence_receipt=true', r.use_evidence_receipt === true);
  assert('use_baseline_id=true', r.use_baseline_id === true);
  assert('use_cache_hit=true', r.use_cache_hit === true);
  assert('remove_redundant_context=true', r.remove_redundant_context === true);
  assert('keep_critical_files=true', r.keep_critical_files === true);
  assert('token_reduction > 0', r.estimated_token_reduction > 0);
  assert('strategies.length > 0', r.compression_strategies.length > 0);
  assert('current_prompt_tokens=80000', r.current_prompt_tokens === 80000);
}

// --- individual strategies ---
console.log('--- individual strategies ---');
{
  const r = buildPromptCompressionPlan({
    mission_id: 'x',
    graph_memory_available: true,
    graph_memory_summary: 'summary',
  });
  assert('graph_memory → +2000 tokens', r.estimated_token_reduction === 2000);
}
{
  const r = buildPromptCompressionPlan({
    mission_id: 'x',
    evidence_receipt_valid: true,
    evidence_receipt_summary: 'summary',
    graph_memory_available: false,
    graph_memory_summary: null,
  });
  assert('evidence_receipt → PARTIAL (no graph)', r.compression_status === 'COMPRESSION_PLAN_PARTIAL');
}
{
  // graph + evidence = READY
  const r = buildPromptCompressionPlan({
    mission_id: 'x',
    graph_memory_available: true,
    graph_memory_summary: 'g',
    evidence_receipt_valid: true,
    evidence_receipt_summary: 'e',
  });
  assert('graph+evidence → READY', r.compression_status === 'COMPRESSION_PLAN_READY');
  assert('token_reduction=3500', r.estimated_token_reduction === 3500);
}
{
  const r = buildPromptCompressionPlan({
    mission_id: 'x',
    graph_memory_available: true,
    graph_memory_summary: 'g',
    redundant_context_detected: true,
  });
  assert('redundant_context → +3000', r.estimated_token_reduction >= 3000);
}

// --- flags ---
console.log('--- flags ---');
{
  const r = buildPromptCompressionPlan({ mission_id: 'x', graph_memory_available: false });
  assert('no graph → use_graph_memory_summary=false', r.use_graph_memory_summary === false);
}
{
  const r = buildPromptCompressionPlan({ mission_id: 'x', cache_hit: false });
  assert('cache_hit=false → use_cache_hit=false', r.use_cache_hit === false);
}
{
  const r = buildPromptCompressionPlan({ mission_id: 'x', critical_files: [] });
  assert('empty critical_files → keep_critical_files=false', r.keep_critical_files === false);
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    buildPromptCompressionPlan({ ...BASE }),
    buildPromptCompressionPlan({ ...BASE, mission_id: '' }),
    buildPromptCompressionPlan({ mission_id: 'x' }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.compression_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.compression_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.compression_status}]`, r.release_performed === false);
  }
}

// --- deterministic plan_id ---
console.log('--- deterministic plan_id ---');
{
  const r1 = buildPromptCompressionPlan({ ...BASE });
  const r2 = buildPromptCompressionPlan({ ...BASE });
  assert('plan_id deterministic', r1.plan_id === r2.plan_id);
  assert('plan_id sha256', /^[a-f0-9]{64}$/.test(r1.plan_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildPromptCompressionPlan({ ...BASE });
  const v = validatePromptCompressionPlan(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildPromptCompressionPlan({ mission_id: 'x' });
  const v = validatePromptCompressionPlan(r);
  assert('validate insufficient → valid=true struct', v.valid === true);
}
{
  const v = validatePromptCompressionPlan(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildPromptCompressionPlan({ ...BASE });
  const s = renderPromptCompressionPlan(r);
  assert('render string', typeof s === 'string');
  assert('render shows COMPRESSION_PLAN_READY', s.includes('COMPRESSION_PLAN_READY'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = buildPromptCompressionPlan({ mission_id: 'x' });
  const s = renderPromptCompressionPlan(r);
  assert('render insufficient', s.includes('COMPRESSION_BLOCKED_INSUFFICIENT_DATA'));
}
{
  const s = renderPromptCompressionPlan(null);
  assert('render null graceful', typeof s === 'string');
}

// --- statuses export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(COMPRESSION_PLAN_STATUSES));
  assert('length=4', COMPRESSION_PLAN_STATUSES.length === 4);
  for (const s of [
    'COMPRESSION_BLOCKED_INPUT', 'COMPRESSION_BLOCKED_INSUFFICIENT_DATA',
    'COMPRESSION_PLAN_PARTIAL', 'COMPRESSION_PLAN_READY',
  ]) {
    assert(`${s} present`, COMPRESSION_PLAN_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
