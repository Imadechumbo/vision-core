#!/usr/bin/env node
/**
 * Cache and Budget Audit Baseline — V139.1
 *
 * Intermediate audit baseline consolidating cache and budget state.
 * Does NOT execute real API calls or deployments.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v139.1';

export const CACHE_BUDGET_AUDIT_STATUSES = [
  'AUDIT_BLOCKED_INPUT',
  'AUDIT_BASELINE_READY',
  'AUDIT_BASELINE_WARNING',
  'AUDIT_BASELINE_BLOCKED',
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

export function buildCacheBudgetAuditBaseline(params) {
  const {
    mission_id,
    cache_hit_rate          = null,
    cache_tokens_saved      = null,
    budget_status           = null,
    total_cost_usd          = null,
    budget_limit_usd        = null,
    regression_status       = null,
    governance_report_status = null,
    audited_at,
  } = params || {};

  const auditKey = [
    mission_id,
    cache_hit_rate, cache_tokens_saved,
    budget_status, total_cost_usd, budget_limit_usd,
    regression_status, governance_report_status,
  ].join('|');
  const audit_id = _sha256(auditKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      audit_id,
      schema_version:        SCHEMA_VERSION,
      audit_status:          'AUDIT_BLOCKED_INPUT',
      audit_baseline_ready:  false,
      blocked_reason:        'mission_id is required.',
      ..._locked(),
    };
  }

  // Determine if blocked
  const isBlocked =
    governance_report_status === 'GOVERNANCE_REPORT_BLOCKED' ||
    budget_status === 'TOKEN_BUDGET_BLOCKED_LIMIT' ||
    budget_status === 'TOKEN_BUDGET_BLOCKED_MISSION' ||
    regression_status === 'REGRESSION_BLOCKED_COST_SPIKE' ||
    regression_status === 'REGRESSION_BLOCKED_TOKEN_SURGE' ||
    regression_status === 'REGRESSION_BLOCKED_PREMIUM_UNAUTHORIZED';

  const hasWarning =
    governance_report_status === 'GOVERNANCE_REPORT_WARNING' ||
    budget_status === 'TOKEN_BUDGET_WARNING' ||
    regression_status === 'REGRESSION_WARNING';

  let audit_status;
  if (isBlocked) {
    audit_status = 'AUDIT_BASELINE_BLOCKED';
  } else if (hasWarning) {
    audit_status = 'AUDIT_BASELINE_WARNING';
  } else {
    audit_status = 'AUDIT_BASELINE_READY';
  }

  // Compute cost ratio if possible
  let cost_budget_ratio = null;
  if (
    typeof total_cost_usd === 'number' && Number.isFinite(total_cost_usd) &&
    typeof budget_limit_usd === 'number' && Number.isFinite(budget_limit_usd) &&
    budget_limit_usd > 0
  ) {
    cost_budget_ratio = total_cost_usd / budget_limit_usd;
  }

  return {
    audit_id,
    schema_version:          SCHEMA_VERSION,
    audit_status,
    audit_baseline_ready:    !isBlocked,
    mission_id,
    cache_hit_rate,
    cache_tokens_saved,
    budget_status,
    total_cost_usd,
    budget_limit_usd,
    cost_budget_ratio,
    regression_status,
    governance_report_status,
    audited_at:              audited_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateCacheBudgetAuditBaseline(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'audit_id', 'schema_version', 'audit_status',
    'audit_baseline_ready',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!CACHE_BUDGET_AUDIT_STATUSES.includes(result.audit_status)) {
    errors.push(`invalid audit_status: ${result.audit_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderCacheBudgetAuditBaseline(result) {
  if (!result || typeof result !== 'object') {
    return '[CACHE_BUDGET_AUDIT_BASELINE] No result to render.';
  }
  const lines = [
    `=== Cache/Budget Audit Baseline [${SCHEMA_VERSION}] ===`,
    `Audit status:        ${result.audit_status ?? 'N/A'}`,
    `Mission:             ${result.mission_id ?? 'N/A'}`,
    `Baseline ready:      ${result.audit_baseline_ready}`,
    `Cache hit rate:      ${result.cache_hit_rate ?? 'N/A'}`,
    `Cache tokens saved:  ${result.cache_tokens_saved ?? 'N/A'}`,
    `Budget status:       ${result.budget_status ?? 'N/A'}`,
    `Total cost USD:      ${result.total_cost_usd ?? 'N/A'}`,
    `Cost/budget ratio:   ${result.cost_budget_ratio !== null ? result.cost_budget_ratio?.toFixed(4) : 'N/A'}`,
    `Regression status:   ${result.regression_status ?? 'N/A'}`,
    `Governance status:   ${result.governance_report_status ?? 'N/A'}`,
    `Audited at:          ${result.audited_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
