#!/usr/bin/env node
/**
 * Real Execution Final Readiness Report — V159.1
 *
 * Consolidates the final readiness gate result into an immutable report.
 * No real execution is performed.
 *
 * Statuses:
 *   FINAL_READINESS_REPORT_BLOCKED_INPUT — missing report_id
 *   FINAL_READINESS_REPORT_PARTIAL       — gate not READY_FOR_HUMAN_COMMAND
 *   FINAL_READINESS_REPORT_READY         — gate reached READY_FOR_HUMAN_COMMAND
 *
 * Invariants (always):
 *   future_human_execution_command_required = true
 *   next_phase_required                     = true
 *   execution_allowed                       = false
 *   command_executed                        = false
 *   execution_performed                     = false
 *   stable_promoted                         = false
 *   deploy_performed                        = false
 *   release_performed                       = false
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v159.1';

export const FINAL_READINESS_REPORT_STATUSES = [
  'FINAL_READINESS_REPORT_BLOCKED_INPUT',
  'FINAL_READINESS_REPORT_PARTIAL',
  'FINAL_READINESS_REPORT_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    future_human_execution_command_required: true,
    next_phase_required:                     true,
    execution_allowed:                       false,
    command_executed:                        false,
    execution_performed:                     false,
    stable_promoted:                         false,
    deploy_performed:                        false,
    release_performed:                       false,
  };
}

export function buildRealExecutionFinalReadinessReport(params) {
  const {
    report_id,
    gate_id,
    final_readiness_status,
    real_execution_ready,
    preconditions_passed,
    preconditions_total,
    failed_preconditions,
    reported_at,
  } = params || {};

  const ts = reported_at ?? new Date().toISOString();

  if (!report_id || String(report_id).trim() === '') {
    return {
      schema_version:              SCHEMA_VERSION,
      report_status:               'FINAL_READINESS_REPORT_BLOCKED_INPUT',
      blocked_reason:              'report_id is required.',
      report_id:                   null,
      report_id_hash:              _sha256(''),
      readiness_report_ready:      false,
      reported_at:                 ts,
      ..._locked(),
    };
  }

  const gateReady =
    final_readiness_status === 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND' &&
    real_execution_ready === true;

  const status = gateReady
    ? 'FINAL_READINESS_REPORT_READY'
    : 'FINAL_READINESS_REPORT_PARTIAL';

  return {
    schema_version:              SCHEMA_VERSION,
    report_status:               status,
    report_id,
    report_id_hash:              _sha256(report_id),
    gate_id:                     gate_id ?? null,
    final_readiness_status:      final_readiness_status ?? null,
    real_execution_ready:        real_execution_ready ?? false,
    preconditions_passed:        typeof preconditions_passed === 'number' ? preconditions_passed : null,
    preconditions_total:         typeof preconditions_total === 'number' ? preconditions_total : null,
    failed_preconditions:        Array.isArray(failed_preconditions) ? failed_preconditions : [],
    readiness_report_ready:      status === 'FINAL_READINESS_REPORT_READY',
    reported_at:                 ts,
    ..._locked(),
  };
}

export function validateRealExecutionFinalReadinessReport(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'report_status', 'report_id_hash',
    'readiness_report_ready', 'reported_at',
    'future_human_execution_command_required', 'next_phase_required',
    'execution_allowed', 'command_executed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.future_human_execution_command_required !== true)  errors.push('future_human_execution_command_required must be true');
  if (result.next_phase_required                     !== true)  errors.push('next_phase_required must be true');
  if (result.execution_allowed                       !== false) errors.push('execution_allowed must be false');
  if (result.command_executed                        !== false) errors.push('command_executed must be false');
  if (result.execution_performed                     !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted                         !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed                        !== false) errors.push('deploy_performed must be false');
  if (result.release_performed                       !== false) errors.push('release_performed must be false');
  if (!FINAL_READINESS_REPORT_STATUSES.includes(result.report_status)) {
    errors.push(`invalid report_status: ${result.report_status}`);
  }
  if (result.report_status === 'FINAL_READINESS_REPORT_READY' && result.readiness_report_ready !== true) {
    errors.push('READY status requires readiness_report_ready=true');
  }
  if (result.report_status !== 'FINAL_READINESS_REPORT_READY' && result.readiness_report_ready === true) {
    errors.push('non-READY status cannot have readiness_report_ready=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealExecutionFinalReadinessReport(result) {
  if (!result || typeof result !== 'object') {
    return '[REAL_EXECUTION_FINAL_READINESS_REPORT] No result to render.';
  }
  const lines = [
    `=== Real Execution Final Readiness Report [${SCHEMA_VERSION}] ===`,
    `Status:                              ${result.report_status ?? 'N/A'}`,
    `Report ID:                           ${result.report_id ?? 'N/A'}`,
    `Gate ID:                             ${result.gate_id ?? 'N/A'}`,
    `Final Readiness Status:              ${result.final_readiness_status ?? 'N/A'}`,
    `Real Execution Ready:                ${result.real_execution_ready}`,
    `Preconditions Passed:                ${result.preconditions_passed ?? 'N/A'} / ${result.preconditions_total ?? 'N/A'}`,
    `Readiness Report Ready:              ${result.readiness_report_ready}`,
    `Future Human Execution Required:     ${result.future_human_execution_command_required}`,
    `Next Phase Required:                 ${result.next_phase_required}`,
    `Execution Allowed:                   ${result.execution_allowed}`,
    `Reported At:                         ${result.reported_at ?? 'N/A'}`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked Reason:                      ${result.blocked_reason}`);
  if (Array.isArray(result.failed_preconditions) && result.failed_preconditions.length > 0) {
    lines.push(`Failed Preconditions:                ${result.failed_preconditions.join(', ')}`);
  }
  lines.push('--- REGRA ABSOLUTA ---');
  lines.push('future_human_execution_command_required=true | next_phase_required=true | execution_allowed=false | command_executed=false');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-execution-final-readiness-report.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildRealExecutionFinalReadinessReport({
    report_id:               'v159.1-report',
    gate_id:                 'v159.0-gate',
    final_readiness_status:  'FINAL_READINESS_READY_FOR_HUMAN_COMMAND',
    real_execution_ready:    true,
    preconditions_passed:    15,
    preconditions_total:     15,
    failed_preconditions:    [],
    reported_at:             new Date().toISOString(),
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealExecutionFinalReadinessReport(result));
  }
  const v = validateRealExecutionFinalReadinessReport(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
