#!/usr/bin/env node
/**
 * Token Budget Controller — V133.0
 *
 * Evaluates token budget for a mission/agent/phase.
 * Does NOT execute real API calls.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v133.0';

export const TOKEN_BUDGET_STATUSES = [
  'TOKEN_BUDGET_BLOCKED_MISSION',
  'TOKEN_BUDGET_BLOCKED_LIMIT',
  'TOKEN_BUDGET_WARNING',
  'TOKEN_BUDGET_ALLOWED',
];

const DEFAULT_WARNING_THRESHOLD_RATIO = 0.8;
const DEFAULT_HARD_BLOCK_RATIO = 1.0;

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

function _isPositiveInt(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function _isNonNegativeInt(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function _ratio(used, max) {
  if (max <= 0) return Infinity;
  return used / max;
}

export function evaluateTokenBudget(params) {
  const {
    mission_id,
    agent_id,
    phase,
    max_input_tokens,
    max_output_tokens,
    estimated_input_tokens,
    estimated_output_tokens,
    warning_threshold_ratio  = DEFAULT_WARNING_THRESHOLD_RATIO,
    hard_block_ratio         = DEFAULT_HARD_BLOCK_RATIO,
    cache_tokens_saved       = 0,
    cache_discount_applied   = false,
  } = params || {};

  const budgetKey = [
    mission_id, agent_id, phase,
    max_input_tokens, max_output_tokens,
    estimated_input_tokens, estimated_output_tokens,
    warning_threshold_ratio, hard_block_ratio,
    cache_tokens_saved, cache_discount_applied,
  ].join('|');
  const budget_id = _sha256(budgetKey);

  // BLOCKED_MISSION: empty/missing mission_id
  if (!mission_id || String(mission_id).trim() === '') {
    return {
      budget_id,
      schema_version:            SCHEMA_VERSION,
      mission_id:                mission_id ?? null,
      agent_id:                  agent_id ?? null,
      phase:                     phase ?? null,
      max_input_tokens:          max_input_tokens ?? null,
      max_output_tokens:         max_output_tokens ?? null,
      estimated_input_tokens:    estimated_input_tokens ?? null,
      estimated_output_tokens:   estimated_output_tokens ?? null,
      total_max_tokens:          null,
      total_estimated_tokens:    null,
      remaining_input_tokens:    null,
      remaining_output_tokens:   null,
      remaining_total_tokens:    null,
      input_usage_ratio:         null,
      output_usage_ratio:        null,
      total_usage_ratio:         null,
      cache_tokens_saved:        cache_tokens_saved,
      cache_discount_applied:    cache_discount_applied,
      budget_allowed:            false,
      budget_blocked:            true,
      budget_warning:            false,
      recommended_action:        'Provide a valid mission_id before evaluating budget.',
      budget_status:             'TOKEN_BUDGET_BLOCKED_MISSION',
      warning_threshold_ratio,
      hard_block_ratio,
      ..._locked(),
    };
  }

  // BLOCKED_LIMIT: invalid max tokens
  if (!_isPositiveInt(max_input_tokens) || !_isPositiveInt(max_output_tokens)) {
    return {
      budget_id,
      schema_version:            SCHEMA_VERSION,
      mission_id,
      agent_id:                  agent_id ?? null,
      phase:                     phase ?? null,
      max_input_tokens:          max_input_tokens ?? null,
      max_output_tokens:         max_output_tokens ?? null,
      estimated_input_tokens:    estimated_input_tokens ?? null,
      estimated_output_tokens:   estimated_output_tokens ?? null,
      total_max_tokens:          null,
      total_estimated_tokens:    null,
      remaining_input_tokens:    null,
      remaining_output_tokens:   null,
      remaining_total_tokens:    null,
      input_usage_ratio:         null,
      output_usage_ratio:        null,
      total_usage_ratio:         null,
      cache_tokens_saved:        cache_tokens_saved,
      cache_discount_applied:    cache_discount_applied,
      budget_allowed:            false,
      budget_blocked:            true,
      budget_warning:            false,
      recommended_action:        'max_input_tokens and max_output_tokens must be positive numbers.',
      budget_status:             'TOKEN_BUDGET_BLOCKED_LIMIT',
      warning_threshold_ratio,
      hard_block_ratio,
      ..._locked(),
    };
  }

  // BLOCKED_LIMIT: invalid estimated tokens
  if (!_isNonNegativeInt(estimated_input_tokens) || !_isNonNegativeInt(estimated_output_tokens)) {
    return {
      budget_id,
      schema_version:            SCHEMA_VERSION,
      mission_id,
      agent_id:                  agent_id ?? null,
      phase:                     phase ?? null,
      max_input_tokens,
      max_output_tokens,
      estimated_input_tokens:    estimated_input_tokens ?? null,
      estimated_output_tokens:   estimated_output_tokens ?? null,
      total_max_tokens:          null,
      total_estimated_tokens:    null,
      remaining_input_tokens:    null,
      remaining_output_tokens:   null,
      remaining_total_tokens:    null,
      input_usage_ratio:         null,
      output_usage_ratio:        null,
      total_usage_ratio:         null,
      cache_tokens_saved:        cache_tokens_saved,
      cache_discount_applied:    cache_discount_applied,
      budget_allowed:            false,
      budget_blocked:            true,
      budget_warning:            false,
      recommended_action:        'estimated_input_tokens and estimated_output_tokens must be >= 0.',
      budget_status:             'TOKEN_BUDGET_BLOCKED_LIMIT',
      warning_threshold_ratio,
      hard_block_ratio,
      ..._locked(),
    };
  }

  const total_max_tokens = max_input_tokens + max_output_tokens;

  // Apply cache savings — never go below 0
  const saved = Math.max(0, Number(cache_tokens_saved) || 0);
  const raw_total_estimated = estimated_input_tokens + estimated_output_tokens;
  const total_estimated_tokens = Math.max(0, raw_total_estimated - saved);

  const remaining_input_tokens  = max_input_tokens  - estimated_input_tokens;
  const remaining_output_tokens = max_output_tokens - estimated_output_tokens;
  const remaining_total_tokens  = total_max_tokens  - total_estimated_tokens;

  const input_usage_ratio  = _ratio(estimated_input_tokens, max_input_tokens);
  const output_usage_ratio = _ratio(estimated_output_tokens, max_output_tokens);
  const total_usage_ratio  = _ratio(total_estimated_tokens, total_max_tokens);

  // BLOCKED_LIMIT: any dimension exceeds hard_block_ratio
  if (
    input_usage_ratio  > hard_block_ratio ||
    output_usage_ratio > hard_block_ratio ||
    total_usage_ratio  > hard_block_ratio
  ) {
    return {
      budget_id,
      schema_version:            SCHEMA_VERSION,
      mission_id,
      agent_id:                  agent_id ?? null,
      phase:                     phase ?? null,
      max_input_tokens,
      max_output_tokens,
      estimated_input_tokens,
      estimated_output_tokens,
      total_max_tokens,
      total_estimated_tokens,
      remaining_input_tokens,
      remaining_output_tokens,
      remaining_total_tokens,
      input_usage_ratio,
      output_usage_ratio,
      total_usage_ratio,
      cache_tokens_saved:        saved,
      cache_discount_applied,
      budget_allowed:            false,
      budget_blocked:            true,
      budget_warning:            false,
      recommended_action:        'Token budget exceeded. Reduce estimated tokens or increase budget limits.',
      budget_status:             'TOKEN_BUDGET_BLOCKED_LIMIT',
      warning_threshold_ratio,
      hard_block_ratio,
      ..._locked(),
    };
  }

  // WARNING: total usage at or above warning threshold
  if (total_usage_ratio >= warning_threshold_ratio) {
    return {
      budget_id,
      schema_version:            SCHEMA_VERSION,
      mission_id,
      agent_id:                  agent_id ?? null,
      phase:                     phase ?? null,
      max_input_tokens,
      max_output_tokens,
      estimated_input_tokens,
      estimated_output_tokens,
      total_max_tokens,
      total_estimated_tokens,
      remaining_input_tokens,
      remaining_output_tokens,
      remaining_total_tokens,
      input_usage_ratio,
      output_usage_ratio,
      total_usage_ratio,
      cache_tokens_saved:        saved,
      cache_discount_applied,
      budget_allowed:            true,
      budget_blocked:            false,
      budget_warning:            true,
      recommended_action:        'Approaching token budget limit. Monitor usage carefully.',
      budget_status:             'TOKEN_BUDGET_WARNING',
      warning_threshold_ratio,
      hard_block_ratio,
      ..._locked(),
    };
  }

  // ALLOWED
  return {
    budget_id,
    schema_version:            SCHEMA_VERSION,
    mission_id,
    agent_id:                  agent_id ?? null,
    phase:                     phase ?? null,
    max_input_tokens,
    max_output_tokens,
    estimated_input_tokens,
    estimated_output_tokens,
    total_max_tokens,
    total_estimated_tokens,
    remaining_input_tokens,
    remaining_output_tokens,
    remaining_total_tokens,
    input_usage_ratio,
    output_usage_ratio,
    total_usage_ratio,
    cache_tokens_saved:        saved,
    cache_discount_applied,
    budget_allowed:            true,
    budget_blocked:            false,
    budget_warning:            false,
    recommended_action:        'Token budget within limits. Proceed.',
    budget_status:             'TOKEN_BUDGET_ALLOWED',
    warning_threshold_ratio,
    hard_block_ratio,
    ..._locked(),
  };
}

export function validateTokenBudgetResult(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'budget_id', 'schema_version', 'budget_status',
    'budget_allowed', 'budget_blocked', 'budget_warning',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!TOKEN_BUDGET_STATUSES.includes(result.budget_status)) {
    errors.push(`invalid budget_status: ${result.budget_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderTokenBudgetResult(result) {
  if (!result || typeof result !== 'object') {
    return '[TOKEN_BUDGET_CONTROLLER] No result to render.';
  }
  const lines = [
    `=== Token Budget Controller [${SCHEMA_VERSION}] ===`,
    `Status:    ${result.budget_status ?? 'N/A'}`,
    `Mission:   ${result.mission_id ?? 'N/A'}`,
    `Agent:     ${result.agent_id ?? 'N/A'}`,
    `Phase:     ${result.phase ?? 'N/A'}`,
  ];
  if (result.total_max_tokens !== null && result.total_max_tokens !== undefined) {
    lines.push(`Max tokens:       ${result.total_max_tokens}`);
    lines.push(`Estimated tokens: ${result.total_estimated_tokens}`);
    lines.push(`Remaining tokens: ${result.remaining_total_tokens}`);
    lines.push(`Usage ratio:      ${result.total_usage_ratio !== null ? (result.total_usage_ratio * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`Cache saved:      ${result.cache_tokens_saved}`);
  }
  lines.push(`Allowed:   ${result.budget_allowed}`);
  lines.push(`Blocked:   ${result.budget_blocked}`);
  lines.push(`Warning:   ${result.budget_warning}`);
  lines.push(`Action:    ${result.recommended_action ?? 'N/A'}`);
  lines.push(`--- REGRA ABSOLUTA ---`);
  lines.push(`stable_promoted=false | deploy_performed=false | release_performed=false`);
  return lines.join('\n');
}
