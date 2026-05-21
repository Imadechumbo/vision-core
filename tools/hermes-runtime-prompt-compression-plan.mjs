#!/usr/bin/env node
/**
 * Hermes Runtime Prompt Compression Plan — V143.1
 *
 * Generates a plan to reduce prompt size using available context:
 * graph memory summary, evidence receipt, baseline id, cache hit,
 * redundant context removal, critical files retention.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v143.1';

export const COMPRESSION_PLAN_STATUSES = [
  'COMPRESSION_BLOCKED_INPUT',
  'COMPRESSION_BLOCKED_INSUFFICIENT_DATA',
  'COMPRESSION_PLAN_PARTIAL',
  'COMPRESSION_PLAN_READY',
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

export function buildPromptCompressionPlan(params) {
  const {
    mission_id,
    graph_memory_available      = false,
    graph_memory_summary        = null,
    evidence_receipt_valid      = false,
    evidence_receipt_summary    = null,
    baseline_id                 = null,
    cache_hit                   = false,
    cache_summary               = null,
    redundant_context_detected  = false,
    critical_files              = null,
    current_prompt_tokens       = null,
    planned_at,
  } = params || {};

  const planKey = [
    mission_id, graph_memory_available, evidence_receipt_valid,
    baseline_id, cache_hit, redundant_context_detected,
    current_prompt_tokens,
  ].join('|');
  const plan_id = _sha256(planKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      plan_id,
      schema_version:           SCHEMA_VERSION,
      compression_status:       'COMPRESSION_BLOCKED_INPUT',
      compression_strategies:   [],
      estimated_token_reduction: 0,
      blocked_reason:           'mission_id is required.',
      ..._locked(),
    };
  }

  const strategies = [];
  let token_reduction = 0;

  if (graph_memory_available && graph_memory_summary) {
    strategies.push({ strategy: 'use_graph_memory_summary', applied: true });
    token_reduction += 2000;
  }

  if (evidence_receipt_valid && evidence_receipt_summary) {
    strategies.push({ strategy: 'use_evidence_receipt', applied: true });
    token_reduction += 1500;
  }

  if (baseline_id) {
    strategies.push({ strategy: 'use_baseline_id', applied: true });
    token_reduction += 500;
  }

  if (cache_hit && cache_summary) {
    strategies.push({ strategy: 'use_cache_hit', applied: true });
    token_reduction += 1000;
  }

  if (redundant_context_detected) {
    strategies.push({ strategy: 'remove_redundant_context', applied: true });
    token_reduction += 3000;
  }

  if (Array.isArray(critical_files) && critical_files.length > 0) {
    strategies.push({ strategy: 'keep_critical_files', applied: true, count: critical_files.length });
  }

  const has_core_data = !!(graph_memory_available && graph_memory_summary);

  let compression_status;
  if (strategies.length === 0) {
    compression_status = 'COMPRESSION_BLOCKED_INSUFFICIENT_DATA';
  } else if (!has_core_data) {
    compression_status = 'COMPRESSION_PLAN_PARTIAL';
  } else {
    compression_status = 'COMPRESSION_PLAN_READY';
  }

  const use_graph_memory_summary  = graph_memory_available && !!graph_memory_summary;
  const use_evidence_receipt      = evidence_receipt_valid && !!evidence_receipt_summary;
  const use_baseline_id           = !!baseline_id;
  const use_cache_hit             = cache_hit && !!cache_summary;
  const remove_redundant_context  = !!redundant_context_detected;
  const keep_critical_files       = Array.isArray(critical_files) && critical_files.length > 0;

  return {
    plan_id,
    schema_version:            SCHEMA_VERSION,
    compression_status,
    compression_strategies:    strategies,
    estimated_token_reduction: token_reduction,
    use_graph_memory_summary,
    use_evidence_receipt,
    use_baseline_id,
    use_cache_hit,
    remove_redundant_context,
    keep_critical_files,
    mission_id,
    current_prompt_tokens,
    planned_at:                planned_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validatePromptCompressionPlan(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'plan_id', 'schema_version', 'compression_status',
    'compression_strategies', 'estimated_token_reduction',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!COMPRESSION_PLAN_STATUSES.includes(result.compression_status)) {
    errors.push(`invalid compression_status: ${result.compression_status}`);
  }
  if (!Array.isArray(result.compression_strategies)) {
    errors.push('compression_strategies must be an array');
  }
  return { valid: errors.length === 0, errors };
}

export function renderPromptCompressionPlan(result) {
  if (!result || typeof result !== 'object') {
    return '[HERMES_RUNTIME_PROMPT_COMPRESSION_PLAN] No result to render.';
  }
  const lines = [
    `=== Hermes Runtime Prompt Compression Plan [${SCHEMA_VERSION}] ===`,
    `Status:                 ${result.compression_status ?? 'N/A'}`,
    `Mission:                ${result.mission_id ?? 'N/A'}`,
    `Est. token reduction:   ${result.estimated_token_reduction ?? 0}`,
    `Current prompt tokens:  ${result.current_prompt_tokens ?? 'N/A'}`,
    `Strategies applied:     ${result.compression_strategies?.length ?? 0}`,
    `  graph_memory:         ${result.use_graph_memory_summary}`,
    `  evidence_receipt:     ${result.use_evidence_receipt}`,
    `  baseline_id:          ${result.use_baseline_id}`,
    `  cache_hit:            ${result.use_cache_hit}`,
    `  remove_redundant:     ${result.remove_redundant_context}`,
    `  keep_critical_files:  ${result.keep_critical_files}`,
    `Planned at:             ${result.planned_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
