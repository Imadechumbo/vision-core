#!/usr/bin/env node
/**
 * Cost-Aware Mission Finalizer — V139.0
 *
 * Finalizes a mission with cost/cache/budget status.
 * Does NOT execute real API calls, deployments, or promotions.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v139.0';

export const COST_AWARE_FINALIZER_STATUSES = [
  'FINALIZER_BLOCKED_INPUT',
  'FINALIZER_BLOCKED_COST',
  'FINALIZER_BLOCKED_REGRESSION',
  'FINALIZER_COMPLETED',
  'FINALIZER_COMPLETED_WITH_WARNING',
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

export function finalizeCostAwareMission(params) {
  const {
    mission_id,
    governance_report,
    budget_receipt,
    regression_guard,
    finalized_at,
  } = params || {};

  const finalKey = [
    mission_id,
    JSON.stringify(governance_report ?? null),
    JSON.stringify(budget_receipt ?? null),
    JSON.stringify(regression_guard ?? null),
  ].join('|');
  const finalizer_id = _sha256(finalKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      finalizer_id,
      schema_version:      SCHEMA_VERSION,
      finalizer_status:    'FINALIZER_BLOCKED_INPUT',
      mission_finalized:   false,
      blocked_reason:      'mission_id is required.',
      ..._locked(),
    };
  }

  // Cost blocked
  if (
    governance_report?.governance_blocked === true ||
    budget_receipt?.receipt_status === 'RECEIPT_OVER_BUDGET'
  ) {
    return {
      finalizer_id,
      schema_version:    SCHEMA_VERSION,
      finalizer_status:  'FINALIZER_BLOCKED_COST',
      mission_finalized: false,
      blocked_reason:    'Governance or budget blocked. Cannot finalize.',
      mission_id,
      governance_status: governance_report?.report_status ?? null,
      receipt_status:    budget_receipt?.receipt_status ?? null,
      regression_status: regression_guard?.regression_status ?? null,
      finalized_at:      finalized_at ?? null,
      ..._locked(),
    };
  }

  // Regression blocked
  if (regression_guard?.regression_blocked === true) {
    return {
      finalizer_id,
      schema_version:    SCHEMA_VERSION,
      finalizer_status:  'FINALIZER_BLOCKED_REGRESSION',
      mission_finalized: false,
      blocked_reason:    `Regression guard blocked: ${regression_guard.regression_status}`,
      mission_id,
      governance_status: governance_report?.report_status ?? null,
      receipt_status:    budget_receipt?.receipt_status ?? null,
      regression_status: regression_guard?.regression_status ?? null,
      finalized_at:      finalized_at ?? null,
      ..._locked(),
    };
  }

  // Warning path
  const has_warning =
    governance_report?.report_status === 'GOVERNANCE_REPORT_WARNING' ||
    budget_receipt?.receipt_status === 'RECEIPT_WARNING' ||
    regression_guard?.regression_warning === true;

  const finalizer_status = has_warning
    ? 'FINALIZER_COMPLETED_WITH_WARNING'
    : 'FINALIZER_COMPLETED';

  return {
    finalizer_id,
    schema_version:    SCHEMA_VERSION,
    finalizer_status,
    mission_finalized: true,
    mission_id,
    governance_status: governance_report?.report_status ?? null,
    receipt_status:    budget_receipt?.receipt_status ?? null,
    regression_status: regression_guard?.regression_status ?? null,
    finalized_at:      finalized_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateCostAwareMissionFinalizer(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'finalizer_id', 'schema_version', 'finalizer_status',
    'mission_finalized',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!COST_AWARE_FINALIZER_STATUSES.includes(result.finalizer_status)) {
    errors.push(`invalid finalizer_status: ${result.finalizer_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderCostAwareMissionFinalizer(result) {
  if (!result || typeof result !== 'object') {
    return '[COST_AWARE_MISSION_FINALIZER] No result to render.';
  }
  const lines = [
    `=== Cost-Aware Mission Finalizer [${SCHEMA_VERSION}] ===`,
    `Finalizer status:  ${result.finalizer_status ?? 'N/A'}`,
    `Mission:           ${result.mission_id ?? 'N/A'}`,
    `Mission finalized: ${result.mission_finalized}`,
    `Governance status: ${result.governance_status ?? 'N/A'}`,
    `Receipt status:    ${result.receipt_status ?? 'N/A'}`,
    `Regression status: ${result.regression_status ?? 'N/A'}`,
    `Finalized at:      ${result.finalized_at ?? 'N/A'}`,
  ];
  if (result.blocked_reason) {
    lines.push(`Blocked reason:    ${result.blocked_reason}`);
  }
  lines.push(`--- REGRA ABSOLUTA ---`);
  lines.push(`stable_promoted=false | deploy_performed=false | release_performed=false`);
  return lines.join('\n');
}
