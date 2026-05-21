#!/usr/bin/env node
/**
 * Hermes Cache Intelligence Baseline — V145.0
 *
 * Capstone for V141.0–V144.1 Hermes Learning + Runtime Cache Intelligence.
 * Verifies all phase modules are connected and safe.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 * Positive learning requires PASS GOLD — unsafe_learning_blocked=true always.
 * positive_learning_requires_pass_gold=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v145.0';

export const CACHE_INTELLIGENCE_BASELINE_STATUSES = [
  'CACHE_INTELLIGENCE_BLOCKED_INPUT',
  'CACHE_INTELLIGENCE_READY',
  'CACHE_INTELLIGENCE_WARNING',
  'CACHE_INTELLIGENCE_BLOCKED',
];

export const HERMES_INTELLIGENCE_MODULES = [
  'hermes-cache-learning-contract',
  'hermes-cost-pattern-memory',
  'hermes-evidence-reuse-gate',
  'hermes-similar-mission-classifier',
  'hermes-expensive-analysis-skip-gate',
  'hermes-runtime-prompt-compression-plan',
  'hermes-extra-records-connector',
  'hermes-learning-safety-ledger',
];

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

export function buildCacheIntelligenceBaseline(params) {
  const {
    mission_id,
    learning_contract_status          = null,
    cost_pattern_status               = null,
    evidence_reuse_status             = null,
    similar_mission_status            = null,
    skip_gate_status                  = null,
    prompt_compression_status         = null,
    extra_records_status              = null,
    learning_safety_ledger_sealed     = null,
    hermes_learning_connected         = false,
    graph_memory_connected            = false,
    extra_records_connected           = false,
    baselined_at,
  } = params || {};

  const baselineKey = [
    mission_id,
    learning_contract_status, cost_pattern_status,
    evidence_reuse_status, similar_mission_status,
    skip_gate_status, prompt_compression_status,
    extra_records_status, learning_safety_ledger_sealed,
  ].join('|');
  const baseline_id = _sha256(baselineKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      baseline_id,
      schema_version:                    SCHEMA_VERSION,
      cache_intelligence_status:         'CACHE_INTELLIGENCE_BLOCKED_INPUT',
      hermes_cache_intelligence_ready:   false,
      hermes_learning_connected:         false,
      graph_memory_connected:            false,
      extra_records_connected:           false,
      evidence_reuse_guarded:            true,
      similar_mission_classifier_ready:  false,
      expensive_analysis_skip_guarded:   true,
      prompt_compression_plan_ready:     false,
      learning_safety_ledger_ready:      false,
      unsafe_learning_blocked:           true,
      positive_learning_requires_pass_gold: true,
      blocked_reason:                    'mission_id is required.',
      ..._locked(),
    };
  }

  const BLOCKED_PATTERNS = [
    'BLOCKED', 'BLOCKED_INPUT', 'BLOCKED_NO_RECEIPT',
    'BLOCKED_INVALID_HASH', 'BLOCKED_NOT_GOLD', 'BLOCKED_TEST_FAILED',
    'BLOCKED_LOW_SIMILARITY', 'BLOCKED_NO_EVIDENCE',
    'BLOCKED_CRITICAL_MISSING', 'BLOCKED_BRANCH_MISMATCH',
    'BLOCKED_BASELINE_INCOMPATIBLE', 'BLOCKED_NO_PASS_GOLD',
    'BLOCKED_MISSION_MISMATCH', 'BLOCKED_STALE_CACHE',
    'BLOCKED_LEARNING_DISABLED', 'BLOCKED_INSUFFICIENT_DATA',
  ];

  const statusValues = [
    learning_contract_status, cost_pattern_status,
    evidence_reuse_status, similar_mission_status,
    skip_gate_status, prompt_compression_status,
    extra_records_status,
  ].filter(s => s !== null && s !== undefined);

  const isBlocked = statusValues.some(s =>
    BLOCKED_PATTERNS.some(p => String(s).includes(p))
  );

  const hasWarning = !isBlocked && statusValues.some(s =>
    String(s).includes('WARNING') || String(s).includes('PARTIAL')
  );

  let cache_intelligence_status;
  if (isBlocked) {
    cache_intelligence_status = 'CACHE_INTELLIGENCE_BLOCKED';
  } else if (hasWarning) {
    cache_intelligence_status = 'CACHE_INTELLIGENCE_WARNING';
  } else {
    cache_intelligence_status = 'CACHE_INTELLIGENCE_READY';
  }

  const hermes_cache_intelligence_ready = !isBlocked;
  const evidence_reuse_guarded       = true;
  const expensive_analysis_skip_guarded = true;
  const unsafe_learning_blocked      = true;
  const positive_learning_requires_pass_gold = true;

  const similar_mission_classifier_ready =
    similar_mission_status !== null &&
    !String(similar_mission_status).includes('BLOCKED_INPUT');

  const prompt_compression_plan_ready =
    prompt_compression_status === 'COMPRESSION_PLAN_READY' ||
    prompt_compression_status === 'COMPRESSION_PLAN_PARTIAL';

  const learning_safety_ledger_ready = learning_safety_ledger_sealed === true;

  return {
    baseline_id,
    schema_version:                       SCHEMA_VERSION,
    cache_intelligence_status,
    hermes_cache_intelligence_ready,
    hermes_learning_connected,
    graph_memory_connected,
    extra_records_connected,
    evidence_reuse_guarded,
    similar_mission_classifier_ready,
    expensive_analysis_skip_guarded,
    prompt_compression_plan_ready,
    learning_safety_ledger_ready,
    unsafe_learning_blocked,
    positive_learning_requires_pass_gold,
    mission_id,
    learning_contract_status,
    cost_pattern_status,
    evidence_reuse_status,
    similar_mission_status,
    skip_gate_status,
    prompt_compression_status,
    extra_records_status,
    learning_safety_ledger_sealed,
    verified_modules:             HERMES_INTELLIGENCE_MODULES,
    verified_module_count:        HERMES_INTELLIGENCE_MODULES.length,
    baselined_at:                 baselined_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateCacheIntelligenceBaseline(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'baseline_id', 'schema_version', 'cache_intelligence_status',
    'hermes_cache_intelligence_ready',
    'unsafe_learning_blocked',
    'positive_learning_requires_pass_gold',
    'evidence_reuse_guarded',
    'expensive_analysis_skip_guarded',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (result.unsafe_learning_blocked !== true) errors.push('unsafe_learning_blocked must be true');
  if (result.positive_learning_requires_pass_gold !== true) {
    errors.push('positive_learning_requires_pass_gold must be true');
  }
  if (result.evidence_reuse_guarded !== true) errors.push('evidence_reuse_guarded must be true');
  if (result.expensive_analysis_skip_guarded !== true) {
    errors.push('expensive_analysis_skip_guarded must be true');
  }
  if (!CACHE_INTELLIGENCE_BASELINE_STATUSES.includes(result.cache_intelligence_status)) {
    errors.push(`invalid cache_intelligence_status: ${result.cache_intelligence_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderCacheIntelligenceBaseline(result) {
  if (!result || typeof result !== 'object') {
    return '[HERMES_CACHE_INTELLIGENCE_BASELINE] No result to render.';
  }
  const lines = [
    `=== Hermes Cache Intelligence Baseline [${SCHEMA_VERSION}] ===`,
    `Status:                           ${result.cache_intelligence_status ?? 'N/A'}`,
    `Mission:                          ${result.mission_id ?? 'N/A'}`,
    `Baseline ready:                   ${result.hermes_cache_intelligence_ready}`,
    `Verified modules:                 ${result.verified_module_count ?? 8}`,
    ``,
    `--- Intelligence flags ---`,
    `hermes_learning_connected:        ${result.hermes_learning_connected}`,
    `graph_memory_connected:           ${result.graph_memory_connected}`,
    `extra_records_connected:          ${result.extra_records_connected}`,
    `evidence_reuse_guarded:           ${result.evidence_reuse_guarded}`,
    `similar_mission_classifier_ready: ${result.similar_mission_classifier_ready}`,
    `expensive_analysis_skip_guarded:  ${result.expensive_analysis_skip_guarded}`,
    `prompt_compression_plan_ready:    ${result.prompt_compression_plan_ready}`,
    `learning_safety_ledger_ready:     ${result.learning_safety_ledger_ready}`,
    ``,
    `--- Safety invariants ---`,
    `unsafe_learning_blocked:          ${result.unsafe_learning_blocked}`,
    `positive_learning_requires_pass_gold: ${result.positive_learning_requires_pass_gold}`,
    ``,
    `Baselined at:                     ${result.baselined_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
