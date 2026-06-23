#!/usr/bin/env node
/**
 * Peak/Off-Peak Execution Scheduler — V136.1
 *
 * Recommends execution window based on time of day and cost status.
 * Does NOT execute real API calls or deployments.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v136.1';

export const EXECUTION_WINDOW_STATUSES = [
  'WINDOW_BLOCKED_INPUT',
  'WINDOW_OFFPEAK_RECOMMENDED',
  'WINDOW_PEAK_ALLOWED',
  'WINDOW_PEAK_DELAY_RECOMMENDED',
  'WINDOW_PEAK_BLOCKED',
];

// Peak hours: 9–17 UTC (inclusive)
const PEAK_HOUR_START = 9;
const PEAK_HOUR_END   = 17;

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    no_execution_performed: true,
    stable_promoted:        false,
    deploy_performed:       false,
    release_performed:      false,
  };
}

function _isPeakHour(hour) {
  return hour >= PEAK_HOUR_START && hour <= PEAK_HOUR_END;
}

export function evaluateExecutionWindow(params) {
  const {
    mission_id,
    timezone          = 'UTC',
    current_hour,
    cost_gate_status,
    cost_allowed      = false,
    is_urgent         = false,
  } = params || {};

  const schedKey = [
    mission_id, timezone, current_hour,
    cost_gate_status, cost_allowed, is_urgent,
  ].join('|');
  const scheduler_id = _sha256(schedKey);

  const blockedInput = (reason) => ({
    scheduler_id,
    schema_version:       SCHEMA_VERSION,
    timezone,
    current_hour:         current_hour ?? null,
    is_peak:              null,
    is_offpeak:           null,
    recommended_lane:     null,
    recommended_agent:    null,
    delay_recommended:    false,
    continue_allowed:     false,
    window_status:        'WINDOW_BLOCKED_INPUT',
    blocked_reason:       reason,
    ..._locked(),
  });

  if (!mission_id || String(mission_id).trim() === '') {
    return blockedInput('mission_id is required.');
  }
  if (typeof current_hour !== 'number' || !Number.isFinite(current_hour) || current_hour < 0 || current_hour > 23) {
    return blockedInput('current_hour must be a number 0–23.');
  }
  if (!cost_gate_status) {
    return blockedInput('cost_gate_status is required.');
  }

  const is_peak   = _isPeakHour(current_hour);
  const is_offpeak = !is_peak;

  // Cost blocked
  if (!cost_allowed) {
    return {
      scheduler_id,
      schema_version:    SCHEMA_VERSION,
      timezone,
      current_hour,
      is_peak,
      is_offpeak,
      recommended_lane:  'syntax-only',
      recommended_agent: 'blocked',
      delay_recommended: false,
      continue_allowed:  false,
      window_status:     'WINDOW_PEAK_BLOCKED',
      ..._locked(),
    };
  }

  // Off-peak
  if (is_offpeak) {
    return {
      scheduler_id,
      schema_version:    SCHEMA_VERSION,
      timezone,
      current_hour,
      is_peak,
      is_offpeak,
      recommended_lane:  'full',
      recommended_agent: 'claude',
      delay_recommended: false,
      continue_allowed:  true,
      window_status:     'WINDOW_OFFPEAK_RECOMMENDED',
      ..._locked(),
    };
  }

  // Peak + urgent → allow with caution
  if (is_peak && is_urgent) {
    return {
      scheduler_id,
      schema_version:    SCHEMA_VERSION,
      timezone,
      current_hour,
      is_peak,
      is_offpeak,
      recommended_lane:  'quick',
      recommended_agent: 'codex',
      delay_recommended: false,
      continue_allowed:  true,
      window_status:     'WINDOW_PEAK_ALLOWED',
      ..._locked(),
    };
  }

  // Peak + high cost → delay recommended
  if (is_peak && (cost_gate_status === 'COST_GATE_WARNING' || cost_gate_status === 'COST_GATE_REQUIRES_HUMAN_APPROVAL')) {
    return {
      scheduler_id,
      schema_version:    SCHEMA_VERSION,
      timezone,
      current_hour,
      is_peak,
      is_offpeak,
      recommended_lane:  'affected',
      recommended_agent: 'free_api',
      delay_recommended: true,
      continue_allowed:  true,
      window_status:     'WINDOW_PEAK_DELAY_RECOMMENDED',
      ..._locked(),
    };
  }

  // Peak + allowed
  return {
    scheduler_id,
    schema_version:    SCHEMA_VERSION,
    timezone,
    current_hour,
    is_peak,
    is_offpeak,
    recommended_lane:  'postmerge',
    recommended_agent: 'codex',
    delay_recommended: false,
    continue_allowed:  true,
    window_status:     'WINDOW_PEAK_ALLOWED',
    ..._locked(),
  };
}

export function validateExecutionWindow(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'scheduler_id', 'schema_version', 'window_status',
    'continue_allowed', 'delay_recommended',
    'no_execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted      !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed     !== false) errors.push('deploy_performed must be false');
  if (result.release_performed    !== false) errors.push('release_performed must be false');
  if (result.no_execution_performed !== true) errors.push('no_execution_performed must be true');
  if (!EXECUTION_WINDOW_STATUSES.includes(result.window_status)) {
    errors.push(`invalid window_status: ${result.window_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderExecutionWindow(result) {
  if (!result || typeof result !== 'object') {
    return '[PEAK_OFFPEAK_EXECUTION_SCHEDULER] No result to render.';
  }
  const lines = [
    `=== Peak/Off-Peak Execution Scheduler [${SCHEMA_VERSION}] ===`,
    `Window status:     ${result.window_status ?? 'N/A'}`,
    `Current hour:      ${result.current_hour ?? 'N/A'} (${result.timezone ?? 'N/A'})`,
    `Is peak:           ${result.is_peak}`,
    `Is off-peak:       ${result.is_offpeak}`,
    `Recommended lane:  ${result.recommended_lane ?? 'N/A'}`,
    `Recommended agent: ${result.recommended_agent ?? 'N/A'}`,
    `Delay recommended: ${result.delay_recommended}`,
    `Continue allowed:  ${result.continue_allowed}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
