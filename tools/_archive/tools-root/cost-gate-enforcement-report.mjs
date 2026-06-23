#!/usr/bin/env node
/**
 * Cost Gate Enforcement Report — V134.1
 *
 * Builds an enforcement report from a cost gate policy result.
 * Does NOT execute real API calls or deployments.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v134.1';

export const COST_ENFORCEMENT_REPORT_STATUSES = [
  'COST_ENFORCEMENT_BLOCKED_POLICY',
  'COST_ENFORCEMENT_ALLOWED',
  'COST_ENFORCEMENT_WARNING',
  'COST_ENFORCEMENT_BLOCKED',
  'COST_ENFORCEMENT_FALLBACK_REQUIRED',
];

const VALID_POLICY_STATUSES = new Set([
  'COST_GATE_ALLOWED',
  'COST_GATE_WARNING',
  'COST_GATE_BLOCKED',
  'COST_GATE_REQUIRES_HUMAN_APPROVAL',
  'COST_GATE_REQUIRES_FALLBACK',
]);

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

function _policyStatus(gateStatus) {
  switch (gateStatus) {
    case 'COST_GATE_ALLOWED':               return 'COST_ENFORCEMENT_ALLOWED';
    case 'COST_GATE_WARNING':               return 'COST_ENFORCEMENT_WARNING';
    case 'COST_GATE_BLOCKED':               return 'COST_ENFORCEMENT_BLOCKED';
    case 'COST_GATE_REQUIRES_HUMAN_APPROVAL': return 'COST_ENFORCEMENT_BLOCKED';
    case 'COST_GATE_REQUIRES_FALLBACK':     return 'COST_ENFORCEMENT_FALLBACK_REQUIRED';
    default:                                return 'COST_ENFORCEMENT_BLOCKED_POLICY';
  }
}

export function buildCostGateEnforcementReport(params) {
  const { cost_gate_policy } = params || {};

  const reportKey = JSON.stringify(cost_gate_policy ?? null);
  const report_id = _sha256(reportKey);

  if (
    !cost_gate_policy ||
    typeof cost_gate_policy !== 'object' ||
    !VALID_POLICY_STATUSES.has(cost_gate_policy.cost_gate_status)
  ) {
    return {
      report_id,
      schema_version:          SCHEMA_VERSION,
      cost_gate_status:        null,
      cost_allowed:            false,
      cost_blocked:            true,
      human_approval_required: false,
      fallback_required:       false,
      recommended_next_action: 'Invalid or missing cost_gate_policy. Provide a valid policy result.',
      enforcement_status:      'COST_ENFORCEMENT_BLOCKED_POLICY',
      ..._locked(),
    };
  }

  const enforcement_status = _policyStatus(cost_gate_policy.cost_gate_status);

  return {
    report_id,
    schema_version:          SCHEMA_VERSION,
    cost_gate_status:        cost_gate_policy.cost_gate_status,
    cost_allowed:            cost_gate_policy.cost_allowed ?? false,
    cost_blocked:            cost_gate_policy.cost_blocked ?? true,
    human_approval_required: cost_gate_policy.human_approval_required ?? false,
    fallback_required:       cost_gate_policy.fallback_required ?? false,
    recommended_next_action: cost_gate_policy.recommended_next_action ?? 'No action available.',
    enforcement_status,
    ..._locked(),
  };
}

export function validateCostGateEnforcementReport(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'report_id', 'schema_version', 'enforcement_status',
    'cost_allowed', 'cost_blocked',
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
  if (!COST_ENFORCEMENT_REPORT_STATUSES.includes(result.enforcement_status)) {
    errors.push(`invalid enforcement_status: ${result.enforcement_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderCostGateEnforcementReport(result) {
  if (!result || typeof result !== 'object') {
    return '[COST_GATE_ENFORCEMENT_REPORT] No result to render.';
  }
  const lines = [
    `=== Cost Gate Enforcement Report [${SCHEMA_VERSION}] ===`,
    `Enforcement status:      ${result.enforcement_status ?? 'N/A'}`,
    `Gate status:             ${result.cost_gate_status ?? 'N/A'}`,
    `Cost allowed:            ${result.cost_allowed}`,
    `Cost blocked:            ${result.cost_blocked}`,
    `Human approval required: ${result.human_approval_required}`,
    `Fallback required:       ${result.fallback_required}`,
    `Action:                  ${result.recommended_next_action ?? 'N/A'}`,
    `No execution performed:  ${result.no_execution_performed}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
