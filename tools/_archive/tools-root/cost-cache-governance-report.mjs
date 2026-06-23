#!/usr/bin/env node
/**
 * Cost and Cache Governance Report — V137.1
 *
 * Consolidates cost, cache, budget, routing, fallback, and scheduler.
 * Does NOT execute real API calls or deployments.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v137.1';

export const COST_CACHE_REPORT_STATUSES = [
  'GOVERNANCE_REPORT_BLOCKED_INPUT',
  'GOVERNANCE_REPORT_READY',
  'GOVERNANCE_REPORT_WARNING',
  'GOVERNANCE_REPORT_BLOCKED',
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

export function buildCostCacheGovernanceReport(params) {
  const {
    mission_id,
    token_budget_result,
    mission_cost_estimate,
    cost_gate_policy,
    cost_enforcement_report,
    test_lane_selection,
    agent_route,
    fallback_governor,
    execution_window,
    agent_usage_ledger,
  } = params || {};

  const reportKey = [
    mission_id,
    JSON.stringify(token_budget_result ?? null),
    JSON.stringify(mission_cost_estimate ?? null),
    JSON.stringify(cost_gate_policy ?? null),
  ].join('|');
  const report_id = _sha256(reportKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      report_id,
      schema_version:       SCHEMA_VERSION,
      report_status:        'GOVERNANCE_REPORT_BLOCKED_INPUT',
      report_ready:         false,
      governance_blocked:   true,
      blocked_reason:       'mission_id is required.',
      ..._locked(),
    };
  }

  // Determine overall governance status
  const costBlocked =
    (cost_gate_policy && cost_gate_policy.cost_blocked === true) ||
    (cost_enforcement_report && cost_enforcement_report.cost_blocked === true) ||
    (token_budget_result && token_budget_result.budget_blocked === true);

  const hasWarning =
    (cost_gate_policy && cost_gate_policy.cost_gate_status === 'COST_GATE_WARNING') ||
    (token_budget_result && token_budget_result.budget_status === 'TOKEN_BUDGET_WARNING') ||
    (mission_cost_estimate && (
      mission_cost_estimate.cost_estimate_status === 'MISSION_COST_WARNING' ||
      mission_cost_estimate.cost_estimate_status === 'MISSION_COST_EXPENSIVE'
    ));

  const report_status = costBlocked
    ? 'GOVERNANCE_REPORT_BLOCKED'
    : hasWarning
    ? 'GOVERNANCE_REPORT_WARNING'
    : 'GOVERNANCE_REPORT_READY';

  return {
    report_id,
    schema_version:            SCHEMA_VERSION,
    report_status,
    report_ready:              !costBlocked,
    governance_blocked:        costBlocked,
    mission_id,
    token_budget_status:       token_budget_result?.budget_status ?? null,
    cost_estimate_status:      mission_cost_estimate?.cost_estimate_status ?? null,
    cost_gate_status:          cost_gate_policy?.cost_gate_status ?? null,
    enforcement_status:        cost_enforcement_report?.enforcement_status ?? null,
    selected_test_lane:        test_lane_selection?.selected_lane ?? null,
    selected_agent_route:      agent_route?.selected_route ?? null,
    fallback_status:           fallback_governor?.fallback_status ?? null,
    execution_window_status:   execution_window?.window_status ?? null,
    ledger_entry_count:        agent_usage_ledger?.entry_count ?? null,
    ledger_status:             agent_usage_ledger?.ledger_status ?? null,
    ..._locked(),
  };
}

export function validateCostCacheGovernanceReport(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'report_id', 'schema_version', 'report_status',
    'report_ready', 'governance_blocked',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!COST_CACHE_REPORT_STATUSES.includes(result.report_status)) {
    errors.push(`invalid report_status: ${result.report_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderCostCacheGovernanceReport(result) {
  if (!result || typeof result !== 'object') {
    return '[COST_CACHE_GOVERNANCE_REPORT] No result to render.';
  }
  const lines = [
    `=== Cost/Cache Governance Report [${SCHEMA_VERSION}] ===`,
    `Report status:          ${result.report_status ?? 'N/A'}`,
    `Mission:                ${result.mission_id ?? 'N/A'}`,
    `Report ready:           ${result.report_ready}`,
    `Governance blocked:     ${result.governance_blocked}`,
    `Token budget status:    ${result.token_budget_status ?? 'N/A'}`,
    `Cost estimate status:   ${result.cost_estimate_status ?? 'N/A'}`,
    `Cost gate status:       ${result.cost_gate_status ?? 'N/A'}`,
    `Enforcement status:     ${result.enforcement_status ?? 'N/A'}`,
    `Selected test lane:     ${result.selected_test_lane ?? 'N/A'}`,
    `Selected agent route:   ${result.selected_agent_route ?? 'N/A'}`,
    `Fallback status:        ${result.fallback_status ?? 'N/A'}`,
    `Execution window:       ${result.execution_window_status ?? 'N/A'}`,
    `Ledger entries:         ${result.ledger_entry_count ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
