#!/usr/bin/env node
/**
 * Mission Cost Estimator — V133.1
 *
 * Estimates cost per mission from tokens, model, provider, cache discount.
 * Does NOT call real APIs.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v133.1';

export const MISSION_COST_STATUSES = [
  'MISSION_COST_BLOCKED_INPUT',
  'MISSION_COST_ESTIMATED',
  'MISSION_COST_WARNING',
  'MISSION_COST_EXPENSIVE',
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

export function estimateMissionCost(params) {
  const {
    mission_id,
    model_provider,
    model_name,
    estimated_input_tokens,
    estimated_output_tokens,
    input_cost_per_1m,
    output_cost_per_1m,
    cache_discount_tokens = 0,
    cache_discount_usd    = 0,
    tests_cost_weight     = 1.0,
    warning_cost_usd      = 1.0,
    expensive_cost_usd    = 5.0,
  } = params || {};

  const estKey = [
    mission_id, model_provider, model_name,
    estimated_input_tokens, estimated_output_tokens,
    input_cost_per_1m, output_cost_per_1m,
    cache_discount_tokens, cache_discount_usd,
    tests_cost_weight,
  ].join('|');
  const estimate_id = _sha256(estKey);

  const blocked = (reason) => ({
    estimate_id,
    schema_version:            SCHEMA_VERSION,
    mission_id:                mission_id ?? null,
    model_provider:            model_provider ?? null,
    model_name:                model_name ?? null,
    estimated_tokens:          null,
    estimated_cost_usd:        null,
    cache_discount_tokens:     cache_discount_tokens ?? 0,
    cache_discount_usd:        cache_discount_usd ?? 0,
    tests_cost_weight:         tests_cost_weight ?? 1.0,
    total_estimated_cost_usd:  null,
    cost_estimate_ready:       false,
    cost_gate_required:        true,
    cost_estimate_status:      'MISSION_COST_BLOCKED_INPUT',
    blocked_reason:            reason,
    ..._locked(),
  });

  if (!mission_id || String(mission_id).trim() === '') {
    return blocked('mission_id is required.');
  }
  if (!model_provider || String(model_provider).trim() === '') {
    return blocked('model_provider is required.');
  }
  if (!model_name || String(model_name).trim() === '') {
    return blocked('model_name is required.');
  }
  if (!_isNonNegativeNum(estimated_input_tokens)) {
    return blocked('estimated_input_tokens must be a non-negative number.');
  }
  if (!_isNonNegativeNum(estimated_output_tokens)) {
    return blocked('estimated_output_tokens must be a non-negative number.');
  }
  if (!_isPositiveNum(input_cost_per_1m)) {
    return blocked('input_cost_per_1m must be a positive number.');
  }
  if (!_isPositiveNum(output_cost_per_1m)) {
    return blocked('output_cost_per_1m must be a positive number.');
  }

  const estimated_tokens = estimated_input_tokens + estimated_output_tokens;

  const raw_cost_usd =
    (estimated_input_tokens  / 1_000_000) * input_cost_per_1m +
    (estimated_output_tokens / 1_000_000) * output_cost_per_1m;

  const discount = Math.max(0, Number(cache_discount_usd) || 0);
  const estimated_cost_usd = Math.max(0, raw_cost_usd - discount);

  const weight = typeof tests_cost_weight === 'number' && Number.isFinite(tests_cost_weight)
    ? tests_cost_weight
    : 1.0;

  const total_estimated_cost_usd = estimated_cost_usd * weight;

  let cost_estimate_status;
  if (total_estimated_cost_usd >= (expensive_cost_usd ?? 5.0)) {
    cost_estimate_status = 'MISSION_COST_EXPENSIVE';
  } else if (total_estimated_cost_usd >= (warning_cost_usd ?? 1.0)) {
    cost_estimate_status = 'MISSION_COST_WARNING';
  } else {
    cost_estimate_status = 'MISSION_COST_ESTIMATED';
  }

  return {
    estimate_id,
    schema_version:           SCHEMA_VERSION,
    mission_id,
    model_provider,
    model_name,
    estimated_tokens,
    estimated_cost_usd,
    cache_discount_tokens:    Math.max(0, Number(cache_discount_tokens) || 0),
    cache_discount_usd:       discount,
    tests_cost_weight:        weight,
    total_estimated_cost_usd,
    cost_estimate_ready:      true,
    cost_gate_required:       true,
    cost_estimate_status,
    ..._locked(),
  };
}

export function validateMissionCostEstimate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'estimate_id', 'schema_version', 'mission_id',
    'cost_estimate_ready', 'cost_gate_required',
    'cost_estimate_status',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (result.cost_gate_required !== true) errors.push('cost_gate_required must be true');
  if (!MISSION_COST_STATUSES.includes(result.cost_estimate_status)) {
    errors.push(`invalid cost_estimate_status: ${result.cost_estimate_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderMissionCostEstimate(result) {
  if (!result || typeof result !== 'object') {
    return '[MISSION_COST_ESTIMATOR] No result to render.';
  }
  const lines = [
    `=== Mission Cost Estimator [${SCHEMA_VERSION}] ===`,
    `Status:              ${result.cost_estimate_status ?? 'N/A'}`,
    `Mission:             ${result.mission_id ?? 'N/A'}`,
    `Model:               ${result.model_provider ?? 'N/A'} / ${result.model_name ?? 'N/A'}`,
  ];
  if (result.cost_estimate_ready) {
    lines.push(`Estimated tokens:    ${result.estimated_tokens}`);
    lines.push(`Estimated cost USD:  $${result.estimated_cost_usd?.toFixed(6) ?? 'N/A'}`);
    lines.push(`Cache discount USD:  $${result.cache_discount_usd?.toFixed(6) ?? 'N/A'}`);
    lines.push(`Tests weight:        ${result.tests_cost_weight}`);
    lines.push(`Total cost USD:      $${result.total_estimated_cost_usd?.toFixed(6) ?? 'N/A'}`);
  } else {
    lines.push(`Blocked reason:      ${result.blocked_reason ?? 'N/A'}`);
  }
  lines.push(`Cost gate required:  ${result.cost_gate_required}`);
  lines.push(`--- REGRA ABSOLUTA ---`);
  lines.push(`stable_promoted=false | deploy_performed=false | release_performed=false`);
  return lines.join('\n');
}
