#!/usr/bin/env node
/**
 * Budget-Aware Test Lane Selector — V135.0
 *
 * Selects the appropriate test lane based on cost gate and budget status.
 * Never bypasses PASS GOLD.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v135.0';

export const TEST_LANE_STATUSES = [
  'LANE_BLOCKED_INPUT',
  'LANE_SELECTED',
  'LANE_MINIMUM_ENFORCED',
];

export const TEST_LANES = [
  'syntax-only',
  'affected',
  'quick',
  'postmerge',
  'full',
  'go',
  'certify',
];

const LANE_COST_INDEX = {
  'syntax-only': 0,
  'affected':    1,
  'quick':       2,
  'postmerge':   3,
  'full':        4,
  'go':          5,
  'certify':     6,
};

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

function _laneIndex(lane) {
  return LANE_COST_INDEX[lane] ?? -1;
}

export function selectBudgetAwareTestLane(params) {
  const {
    mission_id,
    cost_gate_status,
    cost_allowed         = false,
    total_usage_ratio    = 0,
    minimum_lane_required = 'syntax-only',
    requested_lane,
    is_critical_mission  = false,
  } = params || {};

  const laneKey = [
    mission_id, cost_gate_status, cost_allowed,
    total_usage_ratio, minimum_lane_required,
    requested_lane, is_critical_mission,
  ].join('|');
  const lane_id = _sha256(laneKey);

  const blocked = (reason) => ({
    lane_id,
    schema_version:        SCHEMA_VERSION,
    selected_lane:         null,
    minimum_lane_required: minimum_lane_required ?? null,
    lane_allowed:          false,
    lane_blocked:          true,
    lane_status:           'LANE_BLOCKED_INPUT',
    reason,
    ..._locked(),
  });

  if (!mission_id || String(mission_id).trim() === '') {
    return blocked('mission_id is required.');
  }
  if (!cost_gate_status) {
    return blocked('cost_gate_status is required.');
  }
  if (!TEST_LANES.includes(minimum_lane_required)) {
    return blocked(`minimum_lane_required must be one of: ${TEST_LANES.join(', ')}`);
  }

  // Cost blocked → syntax-only only
  if (!cost_allowed) {
    const minIdx = _laneIndex(minimum_lane_required);
    const soIdx  = _laneIndex('syntax-only');
    const canMeetMin = soIdx >= minIdx;
    if (is_critical_mission && !canMeetMin) {
      return blocked('Cost blocked and critical mission minimum lane cannot be met with syntax-only.');
    }
    return {
      lane_id,
      schema_version:        SCHEMA_VERSION,
      selected_lane:         'syntax-only',
      minimum_lane_required,
      lane_allowed:          canMeetMin,
      lane_blocked:          !canMeetMin,
      lane_status:           canMeetMin ? 'LANE_SELECTED' : 'LANE_BLOCKED_INPUT',
      reason:                'Cost not allowed. Restricting to syntax-only lane.',
      ..._locked(),
    };
  }

  // Determine budget tier from usage ratio
  // low: < 0.5, medium: 0.5–0.79, high: >= 0.8
  let budget_tier;
  if (total_usage_ratio < 0.5) {
    budget_tier = 'low';
  } else if (total_usage_ratio < 0.8) {
    budget_tier = 'medium';
  } else {
    budget_tier = 'high';
  }

  // Default recommended lane based on tier
  let recommended_lane;
  if (budget_tier === 'low') {
    recommended_lane = is_critical_mission ? 'quick' : 'affected';
  } else if (budget_tier === 'medium') {
    recommended_lane = 'postmerge';
  } else {
    recommended_lane = cost_gate_status === 'COST_GATE_ALLOWED' ? 'full' : 'quick';
  }

  // Respect requested_lane if provided and budget allows
  let desired_lane = recommended_lane;
  if (requested_lane && TEST_LANES.includes(requested_lane)) {
    const reqIdx = _laneIndex(requested_lane);
    const recIdx = _laneIndex(recommended_lane);
    // High cost lanes (full/go/certify) require ALLOWED gate
    if (reqIdx >= _laneIndex('full') && cost_gate_status !== 'COST_GATE_ALLOWED') {
      desired_lane = recommended_lane;
    } else {
      desired_lane = requested_lane;
    }
  }

  // Enforce minimum lane
  const desiredIdx = _laneIndex(desired_lane);
  const minIdx     = _laneIndex(minimum_lane_required);
  let selected_lane = desired_lane;
  let lane_status   = 'LANE_SELECTED';
  if (desiredIdx < minIdx) {
    selected_lane = minimum_lane_required;
    lane_status   = 'LANE_MINIMUM_ENFORCED';
  }

  return {
    lane_id,
    schema_version:        SCHEMA_VERSION,
    selected_lane,
    minimum_lane_required,
    lane_allowed:          true,
    lane_blocked:          false,
    lane_status,
    reason:                `Budget tier: ${budget_tier}. Selected lane: ${selected_lane}.`,
    ..._locked(),
  };
}

export function validateBudgetAwareTestLane(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'lane_id', 'schema_version', 'lane_status',
    'lane_allowed', 'lane_blocked',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!TEST_LANE_STATUSES.includes(result.lane_status)) {
    errors.push(`invalid lane_status: ${result.lane_status}`);
  }
  if (result.selected_lane !== null && !TEST_LANES.includes(result.selected_lane)) {
    errors.push(`invalid selected_lane: ${result.selected_lane}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderBudgetAwareTestLane(result) {
  if (!result || typeof result !== 'object') {
    return '[BUDGET_AWARE_TEST_LANE_SELECTOR] No result to render.';
  }
  const lines = [
    `=== Budget-Aware Test Lane Selector [${SCHEMA_VERSION}] ===`,
    `Lane status:        ${result.lane_status ?? 'N/A'}`,
    `Selected lane:      ${result.selected_lane ?? 'N/A'}`,
    `Minimum required:   ${result.minimum_lane_required ?? 'N/A'}`,
    `Lane allowed:       ${result.lane_allowed}`,
    `Lane blocked:       ${result.lane_blocked}`,
    `Reason:             ${result.reason ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
