#!/usr/bin/env node
/**
 * Mission Budget Receipt — V138.1
 *
 * Emits a receipt summarizing the budget used for a mission.
 * Does NOT execute real API calls or deployments.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v138.1';

export const MISSION_BUDGET_RECEIPT_STATUSES = [
  'RECEIPT_BLOCKED_INPUT',
  'RECEIPT_ISSUED',
  'RECEIPT_WARNING',
  'RECEIPT_OVER_BUDGET',
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

function _isNonNegativeNum(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

export function buildMissionBudgetReceipt(params) {
  const {
    mission_id,
    agent_id,
    phase,
    actual_input_tokens        = 0,
    actual_output_tokens       = 0,
    actual_cost_usd            = 0,
    cache_tokens_saved         = 0,
    cache_discount_usd         = 0,
    budget_limit_usd,
    warning_threshold_ratio    = 0.8,
    issued_at,
  } = params || {};

  const receiptKey = [
    mission_id, agent_id, phase,
    actual_input_tokens, actual_output_tokens, actual_cost_usd,
    cache_tokens_saved, cache_discount_usd, budget_limit_usd,
  ].join('|');
  const receipt_id = _sha256(receiptKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      receipt_id,
      schema_version:   SCHEMA_VERSION,
      receipt_status:   'RECEIPT_BLOCKED_INPUT',
      receipt_ready:    false,
      blocked_reason:   'mission_id is required.',
      ..._locked(),
    };
  }
  if (!_isNonNegativeNum(actual_input_tokens) || !_isNonNegativeNum(actual_output_tokens)) {
    return {
      receipt_id,
      schema_version:   SCHEMA_VERSION,
      receipt_status:   'RECEIPT_BLOCKED_INPUT',
      receipt_ready:    false,
      blocked_reason:   'actual_input_tokens and actual_output_tokens must be >= 0.',
      ..._locked(),
    };
  }
  if (!_isNonNegativeNum(actual_cost_usd)) {
    return {
      receipt_id,
      schema_version:   SCHEMA_VERSION,
      receipt_status:   'RECEIPT_BLOCKED_INPUT',
      receipt_ready:    false,
      blocked_reason:   'actual_cost_usd must be >= 0.',
      ..._locked(),
    };
  }

  const actual_total_tokens = actual_input_tokens + actual_output_tokens;
  const saved               = Math.max(0, Number(cache_tokens_saved) || 0);
  const discount            = Math.max(0, Number(cache_discount_usd) || 0);
  const net_cost_usd        = Math.max(0, actual_cost_usd - discount);

  let receipt_status;
  let over_budget = false;
  if (typeof budget_limit_usd === 'number' && Number.isFinite(budget_limit_usd) && budget_limit_usd > 0) {
    const ratio = net_cost_usd / budget_limit_usd;
    if (ratio > 1.0) {
      receipt_status = 'RECEIPT_OVER_BUDGET';
      over_budget    = true;
    } else if (ratio >= warning_threshold_ratio) {
      receipt_status = 'RECEIPT_WARNING';
    } else {
      receipt_status = 'RECEIPT_ISSUED';
    }
  } else {
    receipt_status = 'RECEIPT_ISSUED';
  }

  return {
    receipt_id,
    schema_version:         SCHEMA_VERSION,
    receipt_status,
    receipt_ready:          true,
    mission_id,
    agent_id:               agent_id ?? null,
    phase:                  phase ?? null,
    actual_input_tokens,
    actual_output_tokens,
    actual_total_tokens,
    actual_cost_usd,
    cache_tokens_saved:     saved,
    cache_discount_usd:     discount,
    net_cost_usd,
    budget_limit_usd:       budget_limit_usd ?? null,
    over_budget,
    issued_at:              issued_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateMissionBudgetReceipt(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'receipt_id', 'schema_version', 'receipt_status',
    'receipt_ready',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!MISSION_BUDGET_RECEIPT_STATUSES.includes(result.receipt_status)) {
    errors.push(`invalid receipt_status: ${result.receipt_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderMissionBudgetReceipt(result) {
  if (!result || typeof result !== 'object') {
    return '[MISSION_BUDGET_RECEIPT] No result to render.';
  }
  const lines = [
    `=== Mission Budget Receipt [${SCHEMA_VERSION}] ===`,
    `Receipt status:     ${result.receipt_status ?? 'N/A'}`,
    `Mission:            ${result.mission_id ?? 'N/A'}`,
  ];
  if (result.receipt_ready) {
    lines.push(`Actual tokens:      ${result.actual_total_tokens}`);
    lines.push(`Actual cost USD:    $${result.actual_cost_usd?.toFixed(6) ?? 'N/A'}`);
    lines.push(`Cache discount USD: $${result.cache_discount_usd?.toFixed(6) ?? 'N/A'}`);
    lines.push(`Net cost USD:       $${result.net_cost_usd?.toFixed(6) ?? 'N/A'}`);
    lines.push(`Over budget:        ${result.over_budget}`);
    lines.push(`Issued at:          ${result.issued_at ?? 'N/A'}`);
  } else {
    lines.push(`Blocked reason:     ${result.blocked_reason ?? 'N/A'}`);
  }
  lines.push(`--- REGRA ABSOLUTA ---`);
  lines.push(`stable_promoted=false | deploy_performed=false | release_performed=false`);
  return lines.join('\n');
}
