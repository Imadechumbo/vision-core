#!/usr/bin/env node
/**
 * Cost Gate Policy — V134.0
 *
 * Evaluates cost gate policy for a mission cost estimate.
 * Does NOT execute real API calls or deployments.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v134.0';

export const COST_GATE_STATUSES = [
  'COST_GATE_ALLOWED',
  'COST_GATE_WARNING',
  'COST_GATE_BLOCKED',
  'COST_GATE_REQUIRES_HUMAN_APPROVAL',
  'COST_GATE_REQUIRES_FALLBACK',
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

export function evaluateCostGatePolicy(params) {
  const {
    mission_cost_estimate,
    max_cost_per_mission_usd,
    max_daily_cost_usd,
    current_daily_cost_usd      = 0,
    human_approval_threshold_usd,
    fallback_threshold_usd,
    premium_agent_requested      = false,
  } = params || {};

  const policyKey = [
    JSON.stringify(mission_cost_estimate),
    max_cost_per_mission_usd,
    max_daily_cost_usd,
    current_daily_cost_usd,
    human_approval_threshold_usd,
    fallback_threshold_usd,
    premium_agent_requested,
  ].join('|');
  const policy_id = _sha256(policyKey);

  const blocked = (reason, status = 'COST_GATE_BLOCKED') => ({
    policy_id,
    schema_version:          SCHEMA_VERSION,
    cost_gate_status:        status,
    cost_allowed:            false,
    cost_blocked:            true,
    human_approval_required: false,
    fallback_required:       status === 'COST_GATE_REQUIRES_FALLBACK',
    recommended_next_action: reason,
    ..._locked(),
  });

  // Validate estimate
  if (
    !mission_cost_estimate ||
    typeof mission_cost_estimate !== 'object' ||
    !mission_cost_estimate.cost_estimate_ready ||
    typeof mission_cost_estimate.total_estimated_cost_usd !== 'number'
  ) {
    return blocked('Invalid or missing mission_cost_estimate. Provide a ready estimate.');
  }

  // Validate policy params
  if (!_isPositiveNum(max_cost_per_mission_usd)) {
    return blocked('max_cost_per_mission_usd must be a positive number.');
  }
  if (!_isPositiveNum(max_daily_cost_usd)) {
    return blocked('max_daily_cost_usd must be a positive number.');
  }
  if (!_isNonNegativeNum(current_daily_cost_usd)) {
    return blocked('current_daily_cost_usd must be >= 0.');
  }

  const missionCost = mission_cost_estimate.total_estimated_cost_usd;
  const projectedDaily = current_daily_cost_usd + missionCost;

  // REQUIRES_FALLBACK: fallback threshold exceeded
  if (
    typeof fallback_threshold_usd === 'number' &&
    Number.isFinite(fallback_threshold_usd) &&
    missionCost >= fallback_threshold_usd
  ) {
    return {
      policy_id,
      schema_version:          SCHEMA_VERSION,
      cost_gate_status:        'COST_GATE_REQUIRES_FALLBACK',
      cost_allowed:            false,
      cost_blocked:            true,
      human_approval_required: false,
      fallback_required:       true,
      recommended_next_action: 'Mission cost exceeds fallback threshold. Switch to local/free fallback agent.',
      ..._locked(),
    };
  }

  // BLOCKED: mission cost exceeds per-mission max
  if (missionCost > max_cost_per_mission_usd) {
    return blocked('Mission cost exceeds max_cost_per_mission_usd. Reduce estimated tokens or increase budget.');
  }

  // BLOCKED: daily budget exceeded
  if (projectedDaily > max_daily_cost_usd) {
    return blocked('Projected daily cost exceeds max_daily_cost_usd. Wait or increase daily budget.');
  }

  // REQUIRES_HUMAN_APPROVAL: human approval threshold exceeded
  if (
    typeof human_approval_threshold_usd === 'number' &&
    Number.isFinite(human_approval_threshold_usd) &&
    (missionCost >= human_approval_threshold_usd || premium_agent_requested)
  ) {
    return {
      policy_id,
      schema_version:          SCHEMA_VERSION,
      cost_gate_status:        'COST_GATE_REQUIRES_HUMAN_APPROVAL',
      cost_allowed:            false,
      cost_blocked:            false,
      human_approval_required: true,
      fallback_required:       false,
      recommended_next_action: 'Mission cost requires human approval before proceeding.',
      ..._locked(),
    };
  }

  // WARNING: mission cost status is WARNING or EXPENSIVE
  if (
    mission_cost_estimate.cost_estimate_status === 'MISSION_COST_WARNING' ||
    mission_cost_estimate.cost_estimate_status === 'MISSION_COST_EXPENSIVE'
  ) {
    return {
      policy_id,
      schema_version:          SCHEMA_VERSION,
      cost_gate_status:        'COST_GATE_WARNING',
      cost_allowed:            true,
      cost_blocked:            false,
      human_approval_required: false,
      fallback_required:       false,
      recommended_next_action: 'Mission cost is elevated. Proceed with caution.',
      ..._locked(),
    };
  }

  // ALLOWED
  return {
    policy_id,
    schema_version:          SCHEMA_VERSION,
    cost_gate_status:        'COST_GATE_ALLOWED',
    cost_allowed:            true,
    cost_blocked:            false,
    human_approval_required: false,
    fallback_required:       false,
    recommended_next_action: 'Cost within policy. Proceed.',
    ..._locked(),
  };
}

export function validateCostGatePolicy(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'policy_id', 'schema_version', 'cost_gate_status',
    'cost_allowed', 'cost_blocked',
    'human_approval_required', 'fallback_required',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!COST_GATE_STATUSES.includes(result.cost_gate_status)) {
    errors.push(`invalid cost_gate_status: ${result.cost_gate_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderCostGatePolicy(result) {
  if (!result || typeof result !== 'object') {
    return '[COST_GATE_POLICY] No result to render.';
  }
  const lines = [
    `=== Cost Gate Policy [${SCHEMA_VERSION}] ===`,
    `Status:                  ${result.cost_gate_status ?? 'N/A'}`,
    `Cost allowed:            ${result.cost_allowed}`,
    `Cost blocked:            ${result.cost_blocked}`,
    `Human approval required: ${result.human_approval_required}`,
    `Fallback required:       ${result.fallback_required}`,
    `Action:                  ${result.recommended_next_action ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
