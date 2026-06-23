#!/usr/bin/env node
/**
 * Hermes Cost Pattern Memory — V141.1
 *
 * Records cost/cache patterns from mission execution.
 * Requires learning_allowed=true (positive learning only).
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v141.1';

export const PATTERN_MEMORY_STATUSES = [
  'PATTERN_BLOCKED_INPUT',
  'PATTERN_BLOCKED_LEARNING_DISABLED',
  'PATTERN_RECORDED',
  'PATTERN_RECORDED_WARNING',
];

export const PATTERN_TYPES = [
  'expensive_agent',
  'cheap_agent',
  'expensive_prompt',
  'efficient_prompt',
  'useful_cache_hit',
  'recurring_cache_miss',
  'excessive_testing',
  'efficient_fallback',
];

const EXPENSIVE_AGENT_THRESHOLD_USD  = 0.10;
const CHEAP_AGENT_THRESHOLD_USD      = 0.02;
const EXPENSIVE_PROMPT_TOKENS        = 50000;
const EFFICIENT_PROMPT_TOKENS        = 5000;
const RECURRING_MISS_THRESHOLD       = 3;

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:   false,
    deploy_performed:  false,
    release_performed: false,
  };
}

export function recordCostPatternMemory(params) {
  const {
    mission_id,
    learning_allowed          = false,
    agent_route_cost_usd      = null,
    prompt_tokens             = null,
    cache_hit                 = null,
    result_status             = null,
    cache_miss_count          = null,
    test_lane                 = null,
    test_cost_usd             = null,
    fallback_used             = null,
    fallback_cost_usd         = null,
    recorded_at,
  } = params || {};

  const memoryKey = [
    mission_id, learning_allowed,
    agent_route_cost_usd, prompt_tokens,
    cache_hit, result_status, cache_miss_count,
    test_lane, fallback_used,
  ].join('|');
  const memory_id = _sha256(memoryKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      memory_id,
      schema_version:     SCHEMA_VERSION,
      pattern_status:     'PATTERN_BLOCKED_INPUT',
      patterns_detected:  [],
      pattern_count:      0,
      blocked_reason:     'mission_id is required.',
      ..._locked(),
    };
  }

  if (!learning_allowed) {
    return {
      memory_id,
      schema_version:     SCHEMA_VERSION,
      pattern_status:     'PATTERN_BLOCKED_LEARNING_DISABLED',
      patterns_detected:  [],
      pattern_count:      0,
      mission_id,
      blocked_reason:     'learning_allowed=false — positive learning required for pattern recording.',
      recorded_at:        recorded_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  const patterns = [];

  // Agent cost patterns
  if (typeof agent_route_cost_usd === 'number' && Number.isFinite(agent_route_cost_usd)) {
    if (agent_route_cost_usd >= EXPENSIVE_AGENT_THRESHOLD_USD) {
      patterns.push({ type: 'expensive_agent', value: agent_route_cost_usd, threshold: EXPENSIVE_AGENT_THRESHOLD_USD });
    } else if (agent_route_cost_usd <= CHEAP_AGENT_THRESHOLD_USD) {
      patterns.push({ type: 'cheap_agent', value: agent_route_cost_usd, threshold: CHEAP_AGENT_THRESHOLD_USD });
    }
  }

  // Prompt token patterns
  if (typeof prompt_tokens === 'number' && Number.isFinite(prompt_tokens)) {
    if (prompt_tokens >= EXPENSIVE_PROMPT_TOKENS) {
      patterns.push({ type: 'expensive_prompt', value: prompt_tokens, threshold: EXPENSIVE_PROMPT_TOKENS });
    } else if (prompt_tokens <= EFFICIENT_PROMPT_TOKENS) {
      patterns.push({ type: 'efficient_prompt', value: prompt_tokens, threshold: EFFICIENT_PROMPT_TOKENS });
    }
  }

  // Cache patterns
  if (cache_hit === true && result_status === 'passed') {
    patterns.push({ type: 'useful_cache_hit', value: true });
  }
  if (typeof cache_miss_count === 'number' && cache_miss_count >= RECURRING_MISS_THRESHOLD) {
    patterns.push({ type: 'recurring_cache_miss', value: cache_miss_count, threshold: RECURRING_MISS_THRESHOLD });
  }

  // Test lane excessive
  if ((test_lane === 'certify' || test_lane === 'full') &&
      typeof test_cost_usd === 'number' && test_cost_usd > 0.50) {
    patterns.push({ type: 'excessive_testing', value: test_cost_usd, lane: test_lane });
  }

  // Fallback efficiency
  if (fallback_used === true &&
      typeof fallback_cost_usd === 'number' &&
      fallback_cost_usd <= CHEAP_AGENT_THRESHOLD_USD) {
    patterns.push({ type: 'efficient_fallback', value: fallback_cost_usd });
  }

  const has_warning = patterns.some(p =>
    p.type === 'expensive_agent' ||
    p.type === 'expensive_prompt' ||
    p.type === 'recurring_cache_miss' ||
    p.type === 'excessive_testing'
  );

  return {
    memory_id,
    schema_version:     SCHEMA_VERSION,
    pattern_status:     has_warning ? 'PATTERN_RECORDED_WARNING' : 'PATTERN_RECORDED',
    patterns_detected:  patterns,
    pattern_count:      patterns.length,
    mission_id,
    recorded_at:        recorded_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateCostPatternMemory(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'memory_id', 'schema_version', 'pattern_status',
    'patterns_detected', 'pattern_count',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!PATTERN_MEMORY_STATUSES.includes(result.pattern_status)) {
    errors.push(`invalid pattern_status: ${result.pattern_status}`);
  }
  if (!Array.isArray(result.patterns_detected)) {
    errors.push('patterns_detected must be an array');
  }
  return { valid: errors.length === 0, errors };
}

export function renderCostPatternMemory(result) {
  if (!result || typeof result !== 'object') {
    return '[HERMES_COST_PATTERN_MEMORY] No result to render.';
  }
  const lines = [
    `=== Hermes Cost Pattern Memory [${SCHEMA_VERSION}] ===`,
    `Pattern status:    ${result.pattern_status ?? 'N/A'}`,
    `Mission:           ${result.mission_id ?? 'N/A'}`,
    `Patterns detected: ${result.pattern_count ?? 0}`,
  ];
  if (Array.isArray(result.patterns_detected) && result.patterns_detected.length > 0) {
    for (const p of result.patterns_detected) {
      lines.push(`  - ${p.type}${p.value !== undefined ? ` (${p.value})` : ''}`);
    }
  }
  lines.push(`Recorded at:       ${result.recorded_at ?? 'N/A'}`);
  lines.push(`--- REGRA ABSOLUTA ---`);
  lines.push(`stable_promoted=false | deploy_performed=false | release_performed=false`);
  return lines.join('\n');
}
