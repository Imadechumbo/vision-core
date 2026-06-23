#!/usr/bin/env node
/**
 * Controlled Runtime Execution Drill Report — V158.1
 *
 * Consolidates simulation results from the Controlled Runtime Execution
 * Simulator into an immutable drill report. No real execution is performed.
 *
 * Statuses:
 *   DRILL_REPORT_BLOCKED_INPUT  — missing drill_report_id
 *   DRILL_REPORT_PRECONDITION   — simulator did not reach SIMULATION_READY
 *   DRILL_REPORT_READY          — simulator reached SIMULATION_READY
 *
 * Invariants (always):
 *   no_real_execution_performed = true
 *   command_executed            = false
 *   execution_performed         = false
 *   stable_promoted             = false
 *   deploy_performed            = false
 *   release_performed           = false
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v158.1';

export const DRILL_REPORT_STATUSES = [
  'DRILL_REPORT_BLOCKED_INPUT',
  'DRILL_REPORT_PRECONDITION',
  'DRILL_REPORT_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    no_real_execution_performed: true,
    command_executed:            false,
    execution_performed:         false,
    stable_promoted:             false,
    deploy_performed:            false,
    release_performed:           false,
  };
}

export function buildControlledRuntimeExecutionDrillReport(params) {
  const {
    drill_report_id,
    simulator_id,
    simulation_status,
    simulation_complete,
    steps_passed,
    steps_total,
    failed_steps,
    reported_at,
  } = params || {};

  const ts = reported_at ?? new Date().toISOString();

  if (!drill_report_id || String(drill_report_id).trim() === '') {
    return {
      schema_version:       SCHEMA_VERSION,
      drill_report_status:  'DRILL_REPORT_BLOCKED_INPUT',
      blocked_reason:       'drill_report_id is required.',
      drill_report_id:      null,
      drill_report_id_hash: _sha256(''),
      drill_report_ready:   false,
      reported_at:          ts,
      ..._locked(),
    };
  }

  const simReady = simulation_status === 'SIMULATION_READY' && simulation_complete === true;

  const status = simReady ? 'DRILL_REPORT_READY' : 'DRILL_REPORT_PRECONDITION';

  return {
    schema_version:       SCHEMA_VERSION,
    drill_report_status:  status,
    drill_report_id,
    drill_report_id_hash: _sha256(drill_report_id),
    simulator_id:         simulator_id ?? null,
    simulation_status:    simulation_status ?? null,
    simulation_complete:  simulation_complete ?? false,
    steps_passed:         typeof steps_passed === 'number' ? steps_passed : null,
    steps_total:          typeof steps_total === 'number' ? steps_total : null,
    failed_steps:         Array.isArray(failed_steps) ? failed_steps : [],
    drill_report_ready:   status === 'DRILL_REPORT_READY',
    reported_at:          ts,
    ..._locked(),
  };
}

export function validateControlledRuntimeExecutionDrillReport(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'drill_report_status', 'drill_report_id_hash',
    'drill_report_ready', 'reported_at',
    'no_real_execution_performed', 'command_executed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.no_real_execution_performed !== true)  errors.push('no_real_execution_performed must be true');
  if (result.command_executed            !== false) errors.push('command_executed must be false');
  if (result.execution_performed         !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted             !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed            !== false) errors.push('deploy_performed must be false');
  if (result.release_performed           !== false) errors.push('release_performed must be false');
  if (!DRILL_REPORT_STATUSES.includes(result.drill_report_status)) {
    errors.push(`invalid drill_report_status: ${result.drill_report_status}`);
  }
  if (result.drill_report_status === 'DRILL_REPORT_READY' && result.drill_report_ready !== true) {
    errors.push('READY status requires drill_report_ready=true');
  }
  if (result.drill_report_status !== 'DRILL_REPORT_READY' && result.drill_report_ready === true) {
    errors.push('non-READY status cannot have drill_report_ready=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledRuntimeExecutionDrillReport(result) {
  if (!result || typeof result !== 'object') {
    return '[CONTROLLED_RUNTIME_EXECUTION_DRILL_REPORT] No result to render.';
  }
  const lines = [
    `=== Controlled Runtime Execution Drill Report [${SCHEMA_VERSION}] ===`,
    `Status:               ${result.drill_report_status ?? 'N/A'}`,
    `Drill Report ID:      ${result.drill_report_id ?? 'N/A'}`,
    `Simulator ID:         ${result.simulator_id ?? 'N/A'}`,
    `Simulation Status:    ${result.simulation_status ?? 'N/A'}`,
    `Simulation Complete:  ${result.simulation_complete}`,
    `Steps Passed:         ${result.steps_passed ?? 'N/A'} / ${result.steps_total ?? 'N/A'}`,
    `Drill Report Ready:   ${result.drill_report_ready}`,
    `Reported At:          ${result.reported_at ?? 'N/A'}`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked Reason:       ${result.blocked_reason}`);
  if (Array.isArray(result.failed_steps) && result.failed_steps.length > 0) {
    lines.push(`Failed Steps:         ${result.failed_steps.join(', ')}`);
  }
  lines.push('--- REGRA ABSOLUTA ---');
  lines.push('no_real_execution_performed=true | command_executed=false | execution_performed=false');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-runtime-execution-drill-report.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildControlledRuntimeExecutionDrillReport({
    drill_report_id:     'v158.1-drill-report',
    simulator_id:        'v158.0-simulator',
    simulation_status:   'SIMULATION_READY',
    simulation_complete: true,
    steps_passed:        7,
    steps_total:         7,
    failed_steps:        [],
    reported_at:         new Date().toISOString(),
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledRuntimeExecutionDrillReport(result));
  }
  const v = validateControlledRuntimeExecutionDrillReport(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
