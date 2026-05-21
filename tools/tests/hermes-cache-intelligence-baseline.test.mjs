#!/usr/bin/env node
/**
 * Tests — Hermes Cache Intelligence Baseline V145.0
 */

import {
  buildCacheIntelligenceBaseline,
  validateCacheIntelligenceBaseline,
  renderCacheIntelligenceBaseline,
  CACHE_INTELLIGENCE_BASELINE_STATUSES,
  HERMES_INTELLIGENCE_MODULES,
} from '../hermes-cache-intelligence-baseline.mjs';

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

const FULL = {
  mission_id:                    'baseline-1',
  learning_contract_status:      'LEARNING_ALLOWED_POSITIVE',
  cost_pattern_status:           'PATTERN_READY',
  evidence_reuse_status:         'REUSE_ALLOWED',
  similar_mission_status:        'CLASSIFIER_MATCH_HIGH',
  skip_gate_status:              'SKIP_ALLOWED',
  prompt_compression_status:     'COMPRESSION_PLAN_READY',
  extra_records_status:          'CONNECTOR_READY',
  learning_safety_ledger_sealed: true,
  hermes_learning_connected:     true,
  graph_memory_connected:        true,
  extra_records_connected:       true,
  baselined_at:                  '2026-05-20T18:00:00.000Z',
};

console.log('\n=== hermes-cache-intelligence-baseline tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, mission_id: '' });
  assert('empty mission_id → CACHE_INTELLIGENCE_BLOCKED_INPUT', r.cache_intelligence_status === 'CACHE_INTELLIGENCE_BLOCKED_INPUT');
  assert('hermes_cache_intelligence_ready=false', r.hermes_cache_intelligence_ready === false);
  assert('unsafe_learning_blocked=true', r.unsafe_learning_blocked === true);
  assert('positive_learning_requires_pass_gold=true', r.positive_learning_requires_pass_gold === true);
  assert('evidence_reuse_guarded=true', r.evidence_reuse_guarded === true);
  assert('expensive_analysis_skip_guarded=true', r.expensive_analysis_skip_guarded === true);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildCacheIntelligenceBaseline({});
  assert('no params → BLOCKED_INPUT', r.cache_intelligence_status === 'CACHE_INTELLIGENCE_BLOCKED_INPUT');
}
{
  const r = buildCacheIntelligenceBaseline(null);
  assert('null params → BLOCKED_INPUT', r.cache_intelligence_status === 'CACHE_INTELLIGENCE_BLOCKED_INPUT');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL });
  assert('all clear → CACHE_INTELLIGENCE_READY', r.cache_intelligence_status === 'CACHE_INTELLIGENCE_READY');
  assert('hermes_cache_intelligence_ready=true', r.hermes_cache_intelligence_ready === true);
  assert('schema_version=v145.0', r.schema_version === 'v145.0');
  assert('mission_id propagated', r.mission_id === 'baseline-1');
  assert('baselined_at propagated', r.baselined_at === '2026-05-20T18:00:00.000Z');
  assert('hermes_learning_connected=true', r.hermes_learning_connected === true);
  assert('graph_memory_connected=true', r.graph_memory_connected === true);
  assert('extra_records_connected=true', r.extra_records_connected === true);
  assert('evidence_reuse_guarded=true', r.evidence_reuse_guarded === true);
  assert('expensive_analysis_skip_guarded=true', r.expensive_analysis_skip_guarded === true);
  assert('similar_mission_classifier_ready=true', r.similar_mission_classifier_ready === true);
  assert('prompt_compression_plan_ready=true', r.prompt_compression_plan_ready === true);
  assert('learning_safety_ledger_ready=true', r.learning_safety_ledger_ready === true);
  assert('unsafe_learning_blocked=true', r.unsafe_learning_blocked === true);
  assert('positive_learning_requires_pass_gold=true', r.positive_learning_requires_pass_gold === true);
  assert('verified_module_count=8', r.verified_module_count === 8);
  assert('verified_modules is array', Array.isArray(r.verified_modules));
}

// --- warning ---
console.log('--- warning ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, cost_pattern_status: 'PATTERN_WARNING' });
  assert('WARNING in status → CACHE_INTELLIGENCE_WARNING', r.cache_intelligence_status === 'CACHE_INTELLIGENCE_WARNING');
  assert('hermes_cache_intelligence_ready=true (warning not blocked)', r.hermes_cache_intelligence_ready === true);
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, extra_records_status: 'CONNECTOR_PARTIAL' });
  assert('PARTIAL in status → CACHE_INTELLIGENCE_WARNING', r.cache_intelligence_status === 'CACHE_INTELLIGENCE_WARNING');
  assert('hermes_cache_intelligence_ready=true', r.hermes_cache_intelligence_ready === true);
}

// --- blocked (BLOCKED in status values) ---
console.log('--- blocked statuses ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, learning_contract_status: 'LEARNING_BLOCKED_NO_RECEIPT' });
  assert('BLOCKED_NO_RECEIPT → CACHE_INTELLIGENCE_BLOCKED', r.cache_intelligence_status === 'CACHE_INTELLIGENCE_BLOCKED');
  assert('hermes_cache_intelligence_ready=false', r.hermes_cache_intelligence_ready === false);
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, evidence_reuse_status: 'REUSE_BLOCKED_NO_PASS_GOLD' });
  assert('REUSE_BLOCKED_NO_PASS_GOLD → BLOCKED', r.cache_intelligence_status === 'CACHE_INTELLIGENCE_BLOCKED');
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, skip_gate_status: 'SKIP_BLOCKED_TEST_FAILED' });
  assert('SKIP_BLOCKED_TEST_FAILED → BLOCKED', r.cache_intelligence_status === 'CACHE_INTELLIGENCE_BLOCKED');
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, extra_records_status: 'CONNECTOR_BLOCKED_CRITICAL_MISSING' });
  assert('CONNECTOR_BLOCKED → BLOCKED', r.cache_intelligence_status === 'CACHE_INTELLIGENCE_BLOCKED');
}

// --- invariant flags always set ---
console.log('--- invariant flags always set ---');
{
  const cases = [
    buildCacheIntelligenceBaseline({ ...FULL }),
    buildCacheIntelligenceBaseline({ ...FULL, mission_id: '' }),
    buildCacheIntelligenceBaseline({ ...FULL, cost_pattern_status: 'PATTERN_WARNING' }),
    buildCacheIntelligenceBaseline({ ...FULL, learning_contract_status: 'LEARNING_BLOCKED_NO_RECEIPT' }),
  ];
  for (const r of cases) {
    assert(`unsafe_learning_blocked=true [${r.cache_intelligence_status}]`, r.unsafe_learning_blocked === true);
    assert(`positive_learning_requires_pass_gold=true [${r.cache_intelligence_status}]`, r.positive_learning_requires_pass_gold === true);
    assert(`evidence_reuse_guarded=true [${r.cache_intelligence_status}]`, r.evidence_reuse_guarded === true);
    assert(`expensive_analysis_skip_guarded=true [${r.cache_intelligence_status}]`, r.expensive_analysis_skip_guarded === true);
  }
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildCacheIntelligenceBaseline({ ...FULL }),
    buildCacheIntelligenceBaseline({ ...FULL, mission_id: '' }),
    buildCacheIntelligenceBaseline({ ...FULL, cost_pattern_status: 'PATTERN_WARNING' }),
    buildCacheIntelligenceBaseline({ ...FULL, skip_gate_status: 'SKIP_BLOCKED_NOT_GOLD' }),
    buildCacheIntelligenceBaseline({}),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.cache_intelligence_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.cache_intelligence_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.cache_intelligence_status}]`, r.release_performed === false);
  }
}

// --- similar_mission_classifier_ready ---
console.log('--- similar_mission_classifier_ready ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, similar_mission_status: null });
  assert('null similar_mission_status → classifier_ready=false', r.similar_mission_classifier_ready === false);
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, similar_mission_status: 'CLASSIFIER_BLOCKED_INPUT' });
  assert('BLOCKED_INPUT → classifier_ready=false', r.similar_mission_classifier_ready === false);
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, similar_mission_status: 'CLASSIFIER_NO_MATCH' });
  assert('NO_MATCH → classifier_ready=true', r.similar_mission_classifier_ready === true);
}

// --- prompt_compression_plan_ready ---
console.log('--- prompt_compression_plan_ready ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, prompt_compression_status: 'COMPRESSION_PLAN_PARTIAL' });
  assert('PARTIAL → compression_ready=true', r.prompt_compression_plan_ready === true);
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, prompt_compression_status: 'COMPRESSION_BLOCKED_INPUT' });
  assert('COMPRESSION_BLOCKED → compression_ready=false', r.prompt_compression_plan_ready === false);
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, prompt_compression_status: null });
  assert('null → compression_ready=false', r.prompt_compression_plan_ready === false);
}

// --- learning_safety_ledger_ready ---
console.log('--- learning_safety_ledger_ready ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, learning_safety_ledger_sealed: false });
  assert('sealed=false → ledger_ready=false', r.learning_safety_ledger_ready === false);
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, learning_safety_ledger_sealed: null });
  assert('sealed=null → ledger_ready=false', r.learning_safety_ledger_ready === false);
}

// --- deterministic baseline_id ---
console.log('--- deterministic baseline_id ---');
{
  const r1 = buildCacheIntelligenceBaseline({ ...FULL });
  const r2 = buildCacheIntelligenceBaseline({ ...FULL });
  assert('baseline_id deterministic', r1.baseline_id === r2.baseline_id);
  assert('baseline_id sha256', /^[a-f0-9]{64}$/.test(r1.baseline_id));
}
{
  const r1 = buildCacheIntelligenceBaseline({ ...FULL, mission_id: 'a' });
  const r2 = buildCacheIntelligenceBaseline({ ...FULL, mission_id: 'b' });
  assert('different mission_id → different baseline_id', r1.baseline_id !== r2.baseline_id);
}

// --- baselined_at default ---
console.log('--- baselined_at ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, baselined_at: undefined });
  assert('no baselined_at → auto ISO string', typeof r.baselined_at === 'string' && r.baselined_at.length > 0);
}

// --- validated module list ---
console.log('--- module list ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL });
  assert('verified_modules length=8', r.verified_modules.length === 8);
  for (const m of [
    'hermes-cache-learning-contract',
    'hermes-cost-pattern-memory',
    'hermes-evidence-reuse-gate',
    'hermes-similar-mission-classifier',
    'hermes-expensive-analysis-skip-gate',
    'hermes-runtime-prompt-compression-plan',
    'hermes-extra-records-connector',
    'hermes-learning-safety-ledger',
  ]) {
    assert(`module present: ${m}`, r.verified_modules.includes(m));
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL });
  const v = validateCacheIntelligenceBaseline(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, mission_id: '' });
  const v = validateCacheIntelligenceBaseline(r);
  assert('validate blocked_input struct → valid=true', v.valid === true);
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, learning_contract_status: 'LEARNING_BLOCKED_NO_RECEIPT' });
  const v = validateCacheIntelligenceBaseline(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateCacheIntelligenceBaseline(null);
  assert('validate null → invalid', v.valid === false);
}
{
  const v = validateCacheIntelligenceBaseline({ cache_intelligence_status: 'CACHE_INTELLIGENCE_READY' });
  assert('validate missing fields → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildCacheIntelligenceBaseline({ ...FULL });
  const s = renderCacheIntelligenceBaseline(r);
  assert('render string', typeof s === 'string');
  assert('render shows CACHE_INTELLIGENCE_READY', s.includes('CACHE_INTELLIGENCE_READY'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows mission', s.includes('baseline-1'));
  assert('render shows hermes_learning_connected', s.includes('hermes_learning_connected:'));
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, mission_id: '' });
  const s = renderCacheIntelligenceBaseline(r);
  assert('render blocked_input', s.includes('CACHE_INTELLIGENCE_BLOCKED_INPUT'));
}
{
  const r = buildCacheIntelligenceBaseline({ ...FULL, cost_pattern_status: 'PATTERN_WARNING' });
  const s = renderCacheIntelligenceBaseline(r);
  assert('render warning', s.includes('CACHE_INTELLIGENCE_WARNING'));
}
{
  const s = renderCacheIntelligenceBaseline(null);
  assert('render null graceful', typeof s === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('CACHE_INTELLIGENCE_BASELINE_STATUSES is array', Array.isArray(CACHE_INTELLIGENCE_BASELINE_STATUSES));
  assert('CACHE_INTELLIGENCE_BASELINE_STATUSES length=4', CACHE_INTELLIGENCE_BASELINE_STATUSES.length === 4);
  assert('HERMES_INTELLIGENCE_MODULES is array', Array.isArray(HERMES_INTELLIGENCE_MODULES));
  assert('HERMES_INTELLIGENCE_MODULES length=8', HERMES_INTELLIGENCE_MODULES.length === 8);
  for (const s of [
    'CACHE_INTELLIGENCE_BLOCKED_INPUT',
    'CACHE_INTELLIGENCE_READY',
    'CACHE_INTELLIGENCE_WARNING',
    'CACHE_INTELLIGENCE_BLOCKED',
  ]) {
    assert(`status present: ${s}`, CACHE_INTELLIGENCE_BASELINE_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
