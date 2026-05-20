#!/usr/bin/env node
/**
 * Budget Regression Guard — V138.0
 *
 * Blocks regressions: cost spikes, token surges, unauthorized premium usage.
 * Does NOT execute real API calls or deployments.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v138.0';

export const BUDGET_REGRESSION_STATUSES = [
  'REGRESSION_BLOCKED_INPUT',
  'REGRESSION_CLEAR',
  'REGRESSION_WARNING',
  'REGRESSION_BLOCKED_COST_SPIKE',
  'REGRESSION_BLOCKED_TOKEN_SURGE',
  'REGRESSION_BLOCKED_PREMIUM_UNAUTHORIZED',
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

function _isPositiveNum(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function _isNonNegativeNum(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

export function evaluateBudgetRegressionGuard(params) {
  const {
    mission_id,
    current_cost_usd,
    baseline_cost_usd,
    current_total_tokens,
    baseline_total_tokens,
    premium_agent_used         = false,
    premium_agent_approved     = false,
    cost_spike_threshold_ratio  = 2.0,
    token_surge_threshold_ratio = 2.0,
    warning_ratio               = 1.5,
  } = params || {};

  const guardKey = [
    mission_id, current_cost_usd, baseline_cost_usd,
    current_total_tokens, baseline_total_tokens,
    premium_agent_used, premium_agent_approved,
    cost_spike_threshold_ratio, token_surge_threshold_ratio,
  ].join('|');
  const guard_id = _sha256(guardKey);

  const blockedInput = (reason) => ({
    guard_id,
    schema_version:      SCHEMA_VERSION,
    regression_status:   'REGRESSION_BLOCKED_INPUT',
    regression_clear:    false,
    regression_blocked:  true,
    regression_warning:  false,
    cost_ratio:          null,
    token_ratio:         null,
    blocked_reason:      reason,
    ..._locked(),
  });

  if (!mission_id || String(mission_id).trim() === '') {
    return blockedInput('mission_id is required.');
  }
  if (!_isNonNegativeNum(current_cost_usd)) {
    return blockedInput('current_cost_usd must be >= 0.');
  }
  if (!_isPositiveNum(baseline_cost_usd)) {
    return blockedInput('baseline_cost_usd must be > 0.');
  }
  if (!_isNonNegativeNum(current_total_tokens)) {
    return blockedInput('current_total_tokens must be >= 0.');
  }
  if (!_isPositiveNum(baseline_total_tokens)) {
    return blockedInput('baseline_total_tokens must be > 0.');
  }

  const cost_ratio  = current_cost_usd    / baseline_cost_usd;
  const token_ratio = current_total_tokens / baseline_total_tokens;

  // Premium unauthorized
  if (premium_agent_used && !premium_agent_approved) {
    return {
      guard_id,
      schema_version:      SCHEMA_VERSION,
      regression_status:   'REGRESSION_BLOCKED_PREMIUM_UNAUTHORIZED',
      regression_clear:    false,
      regression_blocked:  true,
      regression_warning:  false,
      cost_ratio,
      token_ratio,
      blocked_reason:      'Premium agent used without approval.',
      ..._locked(),
    };
  }

  // Cost spike
  if (cost_ratio >= cost_spike_threshold_ratio) {
    return {
      guard_id,
      schema_version:      SCHEMA_VERSION,
      regression_status:   'REGRESSION_BLOCKED_COST_SPIKE',
      regression_clear:    false,
      regression_blocked:  true,
      regression_warning:  false,
      cost_ratio,
      token_ratio,
      blocked_reason:      `Cost spiked ${cost_ratio.toFixed(2)}x over baseline (threshold ${cost_spike_threshold_ratio}x).`,
      ..._locked(),
    };
  }

  // Token surge
  if (token_ratio >= token_surge_threshold_ratio) {
    return {
      guard_id,
      schema_version:      SCHEMA_VERSION,
      regression_status:   'REGRESSION_BLOCKED_TOKEN_SURGE',
      regression_clear:    false,
      regression_blocked:  true,
      regression_warning:  false,
      cost_ratio,
      token_ratio,
      blocked_reason:      `Token count surged ${token_ratio.toFixed(2)}x over baseline (threshold ${token_surge_threshold_ratio}x).`,
      ..._locked(),
    };
  }

  // Warning
  if (cost_ratio >= warning_ratio || token_ratio >= warning_ratio) {
    return {
      guard_id,
      schema_version:      SCHEMA_VERSION,
      regression_status:   'REGRESSION_WARNING',
      regression_clear:    false,
      regression_blocked:  false,
      regression_warning:  true,
      cost_ratio,
      token_ratio,
      ..._locked(),
    };
  }

  // Clear
  return {
    guard_id,
    schema_version:      SCHEMA_VERSION,
    regression_status:   'REGRESSION_CLEAR',
    regression_clear:    true,
    regression_blocked:  false,
    regression_warning:  false,
    cost_ratio,
    token_ratio,
    ..._locked(),
  };
}

export function validateBudgetRegressionGuard(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'guard_id', 'schema_version', 'regression_status',
    'regression_clear', 'regression_blocked', 'regression_warning',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!BUDGET_REGRESSION_STATUSES.includes(result.regression_status)) {
    errors.push(`invalid regression_status: ${result.regression_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderBudgetRegressionGuard(result) {
  if (!result || typeof result !== 'object') {
    return '[BUDGET_REGRESSION_GUARD] No result to render.';
  }
  const lines = [
    `=== Budget Regression Guard [${SCHEMA_VERSION}] ===`,
    `Regression status: ${result.regression_status ?? 'N/A'}`,
    `Regression clear:  ${result.regression_clear}`,
    `Regression blocked:${result.regression_blocked}`,
    `Regression warning:${result.regression_warning}`,
    `Cost ratio:        ${result.cost_ratio !== null ? result.cost_ratio?.toFixed(4) : 'N/A'}`,
    `Token ratio:       ${result.token_ratio !== null ? result.token_ratio?.toFixed(4) : 'N/A'}`,
  ];
  if (result.blocked_reason) {
    lines.push(`Blocked reason:    ${result.blocked_reason}`);
  }
  lines.push(`--- REGRA ABSOLUTA ---`);
  lines.push(`stable_promoted=false | deploy_performed=false | release_performed=false`);
  return lines.join('\n');
}
