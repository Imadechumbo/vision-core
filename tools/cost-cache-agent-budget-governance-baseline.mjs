#!/usr/bin/env node
/**
 * Cost, Cache and Agent Budget Governance Baseline — V140.0
 *
 * Capstone consolidating V131.0–V139.1 governance modules.
 * Does NOT execute real API calls or deployments.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v140.0';

export const GOVERNANCE_BASELINE_STATUSES = [
  'GOVERNANCE_BASELINE_BLOCKED_INPUT',
  'GOVERNANCE_BASELINE_READY',
  'GOVERNANCE_BASELINE_WARNING',
  'GOVERNANCE_BASELINE_BLOCKED',
];

export const VERIFIED_MODULES = [
  'token-budget-controller',
  'mission-cost-estimator',
  'cost-gate-policy',
  'cost-gate-enforcement-report',
  'budget-aware-test-lane-selector',
  'budget-aware-agent-router',
  'local-free-fallback-governor',
  'peak-offpeak-execution-scheduler',
  'agent-usage-ledger',
  'cost-cache-governance-report',
  'budget-regression-guard',
  'mission-budget-receipt',
  'cost-aware-mission-finalizer',
  'cache-budget-audit-baseline',
  'agent-context-cache-contract',
  'agent-context-cache-store',
  'prompt-cache-ledger',
  'cache-hit-miss-reporter',
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

export function buildGovernanceBaseline(params) {
  const {
    mission_id,
    token_budget_status            = null,
    mission_cost_status            = null,
    cost_gate_status               = null,
    cost_enforcement_status        = null,
    test_lane_status               = null,
    agent_route_status             = null,
    fallback_status                = null,
    execution_window_status        = null,
    agent_usage_ledger_sealed      = null,
    governance_report_status       = null,
    regression_status              = null,
    budget_receipt_status          = null,
    finalizer_status               = null,
    audit_status                   = null,
    cache_contract_status          = null,
    cache_store_status             = null,
    prompt_cache_ledger_status     = null,
    cache_hit_miss_reporter_status = null,
    baselined_at,
  } = params || {};

  const baselineKey = [
    mission_id,
    token_budget_status, mission_cost_status, cost_gate_status,
    cost_enforcement_status, test_lane_status, agent_route_status,
    fallback_status, execution_window_status, agent_usage_ledger_sealed,
    governance_report_status, regression_status, budget_receipt_status,
    finalizer_status, audit_status,
    cache_contract_status, cache_store_status,
    prompt_cache_ledger_status, cache_hit_miss_reporter_status,
  ].join('|');
  const baseline_id = _sha256(baselineKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      baseline_id,
      schema_version:                  SCHEMA_VERSION,
      governance_baseline_status:      'GOVERNANCE_BASELINE_BLOCKED_INPUT',
      cost_cache_governance_baseline_ready: false,
      blocked_reason:                  'mission_id is required.',
      ..._locked(),
    };
  }

  // Collect blocked signals
  const BLOCKED_PATTERNS = [
    'BLOCKED', 'BLOCKED_INPUT', 'BLOCKED_COST', 'BLOCKED_REGRESSION',
    'BLOCKED_MISSION', 'BLOCKED_LIMIT', 'BLOCKED_COST_SPIKE',
    'BLOCKED_TOKEN_SURGE', 'BLOCKED_PREMIUM_UNAUTHORIZED',
    'BLOCKED_UNAVAILABLE',
  ];

  const statusValues = [
    token_budget_status, mission_cost_status, cost_gate_status,
    cost_enforcement_status, test_lane_status, agent_route_status,
    fallback_status, execution_window_status,
    governance_report_status, regression_status, budget_receipt_status,
    finalizer_status, audit_status,
    cache_contract_status, cache_store_status,
    prompt_cache_ledger_status, cache_hit_miss_reporter_status,
  ].filter(s => s !== null && s !== undefined);

  const isBlocked = statusValues.some(s =>
    BLOCKED_PATTERNS.some(p => String(s).includes(p))
  );

  const WARNING_PATTERNS = ['WARNING'];
  const hasWarning = !isBlocked && statusValues.some(s =>
    WARNING_PATTERNS.some(p => String(s).includes(p))
  );

  let governance_baseline_status;
  if (isBlocked) {
    governance_baseline_status = 'GOVERNANCE_BASELINE_BLOCKED';
  } else if (hasWarning) {
    governance_baseline_status = 'GOVERNANCE_BASELINE_WARNING';
  } else {
    governance_baseline_status = 'GOVERNANCE_BASELINE_READY';
  }

  const cost_cache_governance_baseline_ready = !isBlocked;

  return {
    baseline_id,
    schema_version:                       SCHEMA_VERSION,
    governance_baseline_status,
    cost_cache_governance_baseline_ready,
    mission_id,
    token_budget_status,
    mission_cost_status,
    cost_gate_status,
    cost_enforcement_status,
    test_lane_status,
    agent_route_status,
    fallback_status,
    execution_window_status,
    agent_usage_ledger_sealed,
    governance_report_status,
    regression_status,
    budget_receipt_status,
    finalizer_status,
    audit_status,
    cache_contract_status,
    cache_store_status,
    prompt_cache_ledger_status,
    cache_hit_miss_reporter_status,
    verified_modules:                     VERIFIED_MODULES,
    verified_module_count:                VERIFIED_MODULES.length,
    baselined_at:                         baselined_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateGovernanceBaseline(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'baseline_id', 'schema_version', 'governance_baseline_status',
    'cost_cache_governance_baseline_ready',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!GOVERNANCE_BASELINE_STATUSES.includes(result.governance_baseline_status)) {
    errors.push(`invalid governance_baseline_status: ${result.governance_baseline_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderGovernanceBaseline(result) {
  if (!result || typeof result !== 'object') {
    return '[COST_CACHE_AGENT_BUDGET_GOVERNANCE_BASELINE] No result to render.';
  }
  const lines = [
    `=== Cost/Cache/Agent Budget Governance Baseline [${SCHEMA_VERSION}] ===`,
    `Status:                       ${result.governance_baseline_status ?? 'N/A'}`,
    `Mission:                      ${result.mission_id ?? 'N/A'}`,
    `Baseline ready:               ${result.cost_cache_governance_baseline_ready}`,
    `Verified modules:             ${result.verified_module_count ?? VERIFIED_MODULES.length}`,
    ``,
    `--- Cost/Budget modules ---`,
    `Token budget:                 ${result.token_budget_status ?? 'N/A'}`,
    `Mission cost:                 ${result.mission_cost_status ?? 'N/A'}`,
    `Cost gate:                    ${result.cost_gate_status ?? 'N/A'}`,
    `Cost enforcement:             ${result.cost_enforcement_status ?? 'N/A'}`,
    `Test lane:                    ${result.test_lane_status ?? 'N/A'}`,
    `Agent route:                  ${result.agent_route_status ?? 'N/A'}`,
    `Fallback:                     ${result.fallback_status ?? 'N/A'}`,
    `Execution window:             ${result.execution_window_status ?? 'N/A'}`,
    `Agent usage ledger sealed:    ${result.agent_usage_ledger_sealed ?? 'N/A'}`,
    `Governance report:            ${result.governance_report_status ?? 'N/A'}`,
    `Regression:                   ${result.regression_status ?? 'N/A'}`,
    `Budget receipt:               ${result.budget_receipt_status ?? 'N/A'}`,
    `Finalizer:                    ${result.finalizer_status ?? 'N/A'}`,
    `Audit:                        ${result.audit_status ?? 'N/A'}`,
    ``,
    `--- Cache modules ---`,
    `Cache contract:               ${result.cache_contract_status ?? 'N/A'}`,
    `Cache store:                  ${result.cache_store_status ?? 'N/A'}`,
    `Prompt cache ledger:          ${result.prompt_cache_ledger_status ?? 'N/A'}`,
    `Cache hit/miss reporter:      ${result.cache_hit_miss_reporter_status ?? 'N/A'}`,
    ``,
    `Baselined at:                 ${result.baselined_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
