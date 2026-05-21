#!/usr/bin/env node
/**
 * Controlled Runtime Execution Report — V155.1
 *
 * Consolidates ledger state and evidence package status into an immutable
 * report documenting what was executed (dry-run only) and what readiness
 * exists for a future human-commanded execution.
 *
 * Statuses:
 *   EXECUTION_REPORT_BLOCKED_INPUT — missing report_id or ledger_id
 *   EXECUTION_REPORT_PARTIAL       — ledger present but evidence package not sealed
 *   EXECUTION_REPORT_READY         — ledger has events + evidence package sealed
 *
 * Invariants:
 *   human_command_required = true  (always)
 *   future_execution_ready = true  iff READY status
 *   execution_performed    = false (always)
 *   stable_promoted        = false (always)
 *   deploy_performed       = false (always)
 *   release_performed      = false (always)
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v155.1';

export const EXECUTION_REPORT_STATUSES = [
  'EXECUTION_REPORT_BLOCKED_INPUT',
  'EXECUTION_REPORT_PARTIAL',
  'EXECUTION_REPORT_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    human_command_required: true,
    execution_performed:    false,
    stable_promoted:        false,
    deploy_performed:       false,
    release_performed:      false,
  };
}

export function buildControlledRuntimeExecutionReport(params) {
  const {
    report_id,
    ledger_id,
    evidence_package_id,
    ledger_event_count,
    ledger_closed,
    evidence_package_sealed,
    evidence_package_status,
    dry_run_confirmed,
    reported_at,
    summary,
  } = params || {};

  const ts = reported_at ?? new Date().toISOString();

  if (!report_id || String(report_id).trim() === '' || !ledger_id || String(ledger_id).trim() === '') {
    return {
      schema_version:            SCHEMA_VERSION,
      execution_report_status:   'EXECUTION_REPORT_BLOCKED_INPUT',
      blocked_reason:            'report_id and ledger_id are required.',
      report_id:                 report_id ?? null,
      report_id_hash:            _sha256(report_id ?? ''),
      future_execution_ready:    false,
      reported_at:               ts,
      ..._locked(),
    };
  }

  const safeEventCount = typeof ledger_event_count === 'number' ? ledger_event_count : 0;
  const pkgSealed = evidence_package_sealed === true
    || evidence_package_status === 'EVIDENCE_PACKAGE_SEALED';
  const dryRunOk = dry_run_confirmed === true;

  const isReady = safeEventCount > 0 && pkgSealed && dryRunOk;

  if (!isReady) {
    const missing = [];
    if (safeEventCount < 1) missing.push('ledger_event_count > 0');
    if (!pkgSealed) missing.push('evidence_package_sealed');
    if (!dryRunOk) missing.push('dry_run_confirmed');
    return {
      schema_version:            SCHEMA_VERSION,
      execution_report_status:   'EXECUTION_REPORT_PARTIAL',
      report_id,
      report_id_hash:            _sha256(report_id),
      ledger_id,
      evidence_package_id:       evidence_package_id ?? null,
      ledger_event_count:        safeEventCount,
      ledger_closed:             ledger_closed === true,
      evidence_package_sealed:   pkgSealed,
      dry_run_confirmed:         dryRunOk,
      missing_conditions:        missing,
      future_execution_ready:    false,
      reported_at:               ts,
      summary:                   summary ?? null,
      ..._locked(),
    };
  }

  return {
    schema_version:            SCHEMA_VERSION,
    execution_report_status:   'EXECUTION_REPORT_READY',
    report_id,
    report_id_hash:            _sha256(report_id),
    ledger_id,
    evidence_package_id:       evidence_package_id ?? null,
    ledger_event_count:        safeEventCount,
    ledger_closed:             ledger_closed === true,
    evidence_package_sealed:   true,
    dry_run_confirmed:         true,
    future_execution_ready:    true,
    reported_at:               ts,
    summary:                   summary ?? null,
    ..._locked(),
  };
}

export function validateControlledRuntimeExecutionReport(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'execution_report_status', 'report_id_hash',
    'future_execution_ready', 'reported_at',
    'human_command_required', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.human_command_required !== true)  errors.push('human_command_required must be true');
  if (result.execution_performed    !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted        !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed       !== false) errors.push('deploy_performed must be false');
  if (result.release_performed      !== false) errors.push('release_performed must be false');
  if (!EXECUTION_REPORT_STATUSES.includes(result.execution_report_status)) {
    errors.push(`invalid execution_report_status: ${result.execution_report_status}`);
  }
  if (result.execution_report_status === 'EXECUTION_REPORT_READY') {
    if (result.future_execution_ready !== true) errors.push('READY requires future_execution_ready=true');
    if (result.evidence_package_sealed !== true) errors.push('READY requires evidence_package_sealed=true');
    if (result.dry_run_confirmed !== true) errors.push('READY requires dry_run_confirmed=true');
  }
  if (result.execution_report_status === 'EXECUTION_REPORT_BLOCKED_INPUT') {
    if (result.future_execution_ready !== false) errors.push('BLOCKED_INPUT requires future_execution_ready=false');
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledRuntimeExecutionReport(result) {
  if (!result || typeof result !== 'object') {
    return '[CONTROLLED_RUNTIME_EXECUTION_REPORT] No result to render.';
  }
  const lines = [
    `=== Controlled Runtime Execution Report [${SCHEMA_VERSION}] ===`,
    `Status:                  ${result.execution_report_status ?? 'N/A'}`,
    `Report ID:               ${result.report_id ?? 'N/A'}`,
    `Ledger ID:               ${result.ledger_id ?? 'N/A'}`,
    `Evidence package ID:     ${result.evidence_package_id ?? 'N/A'}`,
    `Ledger event count:      ${result.ledger_event_count ?? 0}`,
    `Evidence sealed:         ${result.evidence_package_sealed ?? false}`,
    `Dry-run confirmed:       ${result.dry_run_confirmed ?? false}`,
    `Future execution ready:  ${result.future_execution_ready}`,
    `--- REGRA ABSOLUTA ---`,
    `human_command_required=true | execution_performed=false | stable_promoted=false`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:          ${result.blocked_reason}`);
  if (result.missing_conditions && result.missing_conditions.length > 0) {
    lines.splice(2, 0, `Missing conditions:      ${result.missing_conditions.join(', ')}`);
  }
  if (result.summary) lines.splice(lines.length - 2, 0, `Summary:                 ${result.summary}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-runtime-execution-report.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildControlledRuntimeExecutionReport({
    report_id:               'v155.1-report',
    ledger_id:               'v155.0-ledger',
    evidence_package_id:     'v154.1-package',
    ledger_event_count:      9,
    ledger_closed:           true,
    evidence_package_sealed: true,
    dry_run_confirmed:       true,
    summary:                 'All V151-V154 artifacts assembled. Ready for future human command.',
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledRuntimeExecutionReport(result));
  }
  const v = validateControlledRuntimeExecutionReport(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
