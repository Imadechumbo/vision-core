#!/usr/bin/env node
/**
 * Controlled Runtime Execution Baseline — V160.0
 *
 * Capstone baseline for the Real Execution Human Command + Controlled Runtime
 * Execution phase (V151.0–V160.0). Verifies readiness of all 19 modules.
 *
 * Statuses:
 *   CONTROLLED_RUNTIME_EXECUTION_BASELINE_BLOCKED  — missing baseline_id
 *   CONTROLLED_RUNTIME_EXECUTION_BASELINE_PARTIAL  — some modules not ready
 *   CONTROLLED_RUNTIME_EXECUTION_BASELINE_READY    — all 19 modules ready
 *
 * Invariants (always):
 *   human_command_required         = true
 *   no_real_execution_performed    = true
 *   command_executed               = false
 *   execution_performed            = false
 *   stable_promoted                = false
 *   deploy_performed               = false
 *   release_performed              = false
 *
 * REGRA ABSOLUTA:
 *   SEM PASS GOLD REAL → não promove, não libera, não marca stable.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v160.0';

export const CONTROLLED_RUNTIME_EXECUTION_BASELINE_STATUSES = [
  'CONTROLLED_RUNTIME_EXECUTION_BASELINE_BLOCKED',
  'CONTROLLED_RUNTIME_EXECUTION_BASELINE_PARTIAL',
  'CONTROLLED_RUNTIME_EXECUTION_BASELINE_READY',
];

export const CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES = [
  'human-execution-command-contract',
  'human-command-phrase-verifier',
  'controlled-runtime-execution-dry-run',
  'controlled-runtime-execution-plan',
  'rollback-plan-binding-gate',
  'pre-execution-snapshot-contract',
  'real-execution-proof-receipt',
  'controlled-runtime-evidence-package',
  'controlled-runtime-execution-ledger',
  'controlled-runtime-execution-report',
  'human-execution-approval-ledger',
  'human-approval-expiration-gate',
  'controlled-execution-command-sealer',
  'controlled-execution-command-diff-guard',
  'controlled-runtime-execution-simulator',
  'controlled-runtime-execution-drill-report',
  'real-execution-final-readiness-gate',
  'real-execution-final-readiness-report',
  'controlled-runtime-execution-baseline',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    human_command_required:         true,
    no_real_execution_performed:    true,
    command_executed:               false,
    execution_performed:            false,
    stable_promoted:                false,
    deploy_performed:               false,
    release_performed:              false,
  };
}

export function buildControlledRuntimeExecutionBaseline(params) {
  const {
    baseline_id,
    human_execution_command_contract_ready,
    human_command_phrase_verifier_ready,
    controlled_runtime_execution_dry_run_ready,
    controlled_runtime_execution_plan_ready,
    rollback_plan_binding_gate_ready,
    pre_execution_snapshot_contract_ready,
    real_execution_proof_receipt_ready,
    controlled_runtime_evidence_package_ready,
    controlled_runtime_execution_ledger_ready,
    controlled_runtime_execution_report_ready,
    human_execution_approval_ledger_ready,
    human_approval_expiration_gate_ready,
    controlled_execution_command_sealer_ready,
    controlled_execution_command_diff_guard_ready,
    controlled_runtime_execution_simulator_ready,
    controlled_runtime_execution_drill_report_ready,
    real_execution_final_readiness_gate_ready,
    real_execution_final_readiness_report_ready,
    baselined_at,
  } = params || {};

  const ts = baselined_at ?? new Date().toISOString();

  if (!baseline_id || String(baseline_id).trim() === '') {
    return {
      schema_version:                             SCHEMA_VERSION,
      controlled_runtime_execution_baseline_status: 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_BLOCKED',
      blocked_reason:                             'baseline_id is required.',
      baseline_id:                                null,
      baseline_id_hash:                           _sha256(''),
      controlled_runtime_execution_baseline_ready: false,
      verified_module_count:                      0,
      baselined_at:                               ts,
      ..._locked(),
    };
  }

  const moduleFlags = [
    human_execution_command_contract_ready         === true,
    human_command_phrase_verifier_ready            === true,
    controlled_runtime_execution_dry_run_ready     === true,
    controlled_runtime_execution_plan_ready        === true,
    rollback_plan_binding_gate_ready               === true,
    pre_execution_snapshot_contract_ready          === true,
    real_execution_proof_receipt_ready             === true,
    controlled_runtime_evidence_package_ready      === true,
    controlled_runtime_execution_ledger_ready      === true,
    controlled_runtime_execution_report_ready      === true,
    human_execution_approval_ledger_ready          === true,
    human_approval_expiration_gate_ready           === true,
    controlled_execution_command_sealer_ready      === true,
    controlled_execution_command_diff_guard_ready  === true,
    controlled_runtime_execution_simulator_ready   === true,
    controlled_runtime_execution_drill_report_ready === true,
    real_execution_final_readiness_gate_ready      === true,
    real_execution_final_readiness_report_ready    === true,
  ];

  const verified_module_count = moduleFlags.filter(Boolean).length;
  const all_modules_ok = verified_module_count === CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES.length - 1;

  const status = all_modules_ok
    ? 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_READY'
    : verified_module_count > 0
      ? 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_PARTIAL'
      : 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_PARTIAL';

  return {
    schema_version:                              SCHEMA_VERSION,
    controlled_runtime_execution_baseline_status: status,
    baseline_id,
    baseline_id_hash:                            _sha256(baseline_id),
    human_execution_command_contract_ready:      human_execution_command_contract_ready         === true,
    human_command_phrase_verifier_ready:         human_command_phrase_verifier_ready            === true,
    controlled_runtime_execution_dry_run_ready:  controlled_runtime_execution_dry_run_ready     === true,
    controlled_runtime_execution_plan_ready:     controlled_runtime_execution_plan_ready        === true,
    rollback_plan_binding_gate_ready:            rollback_plan_binding_gate_ready               === true,
    pre_execution_snapshot_contract_ready:       pre_execution_snapshot_contract_ready          === true,
    real_execution_proof_receipt_ready:          real_execution_proof_receipt_ready             === true,
    controlled_runtime_evidence_package_ready:   controlled_runtime_evidence_package_ready      === true,
    controlled_runtime_execution_ledger_ready:   controlled_runtime_execution_ledger_ready      === true,
    controlled_runtime_execution_report_ready:   controlled_runtime_execution_report_ready      === true,
    human_execution_approval_ledger_ready:       human_execution_approval_ledger_ready          === true,
    human_approval_expiration_gate_ready:        human_approval_expiration_gate_ready           === true,
    controlled_execution_command_sealer_ready:   controlled_execution_command_sealer_ready      === true,
    controlled_execution_command_diff_guard_ready: controlled_execution_command_diff_guard_ready === true,
    controlled_runtime_execution_simulator_ready: controlled_runtime_execution_simulator_ready  === true,
    controlled_runtime_execution_drill_report_ready: controlled_runtime_execution_drill_report_ready === true,
    real_execution_final_readiness_gate_ready:   real_execution_final_readiness_gate_ready      === true,
    real_execution_final_readiness_report_ready: real_execution_final_readiness_report_ready    === true,
    verified_module_count,
    verified_modules:                            CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES.slice(0, verified_module_count),
    controlled_runtime_execution_baseline_ready: all_modules_ok,
    baselined_at:                                ts,
    ..._locked(),
  };
}

export function validateControlledRuntimeExecutionBaseline(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'controlled_runtime_execution_baseline_status', 'baseline_id_hash',
    'controlled_runtime_execution_baseline_ready', 'verified_module_count', 'baselined_at',
    'human_command_required', 'no_real_execution_performed',
    'command_executed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.human_command_required         !== true)  errors.push('human_command_required must be true');
  if (result.no_real_execution_performed    !== true)  errors.push('no_real_execution_performed must be true');
  if (result.command_executed               !== false) errors.push('command_executed must be false');
  if (result.execution_performed            !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted                !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed               !== false) errors.push('deploy_performed must be false');
  if (result.release_performed              !== false) errors.push('release_performed must be false');
  if (!CONTROLLED_RUNTIME_EXECUTION_BASELINE_STATUSES.includes(result.controlled_runtime_execution_baseline_status)) {
    errors.push(`invalid controlled_runtime_execution_baseline_status: ${result.controlled_runtime_execution_baseline_status}`);
  }
  if (result.controlled_runtime_execution_baseline_status === 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_READY') {
    if (result.controlled_runtime_execution_baseline_ready !== true) {
      errors.push('READY status requires controlled_runtime_execution_baseline_ready=true');
    }
    if (result.verified_module_count !== CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES.length - 1) {
      errors.push(`READY requires verified_module_count=${CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES.length - 1}`);
    }
  }
  if (result.controlled_runtime_execution_baseline_status !== 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_READY' &&
      result.controlled_runtime_execution_baseline_ready === true) {
    errors.push('non-READY status cannot have controlled_runtime_execution_baseline_ready=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledRuntimeExecutionBaseline(result) {
  if (!result || typeof result !== 'object') {
    return '[CONTROLLED_RUNTIME_EXECUTION_BASELINE] No result to render.';
  }
  const lines = [
    `=== Controlled Runtime Execution Baseline [${SCHEMA_VERSION}] ===`,
    `Status:                                    ${result.controlled_runtime_execution_baseline_status ?? 'N/A'}`,
    `Baseline ID:                               ${result.baseline_id ?? 'N/A'}`,
    `Verified Modules:                          ${result.verified_module_count ?? 0} / ${CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES.length - 1}`,
    `Baseline Ready:                            ${result.controlled_runtime_execution_baseline_ready}`,
    `Human Command Required:                    ${result.human_command_required}`,
    `No Real Execution Performed:               ${result.no_real_execution_performed}`,
    `Baselined At:                              ${result.baselined_at ?? 'N/A'}`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked Reason:                            ${result.blocked_reason}`);
  if (Array.isArray(result.verified_modules) && result.verified_modules.length > 0) {
    lines.push('--- Verified Modules ---');
    for (const m of result.verified_modules) lines.push(`  [OK] ${m}`);
  }
  lines.push('--- REGRA ABSOLUTA ---');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  lines.push('human_command_required=true | no_real_execution_performed=true | command_executed=false');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-runtime-execution-baseline.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildControlledRuntimeExecutionBaseline({
    baseline_id:                                  'v160.0-baseline',
    human_execution_command_contract_ready:        true,
    human_command_phrase_verifier_ready:           true,
    controlled_runtime_execution_dry_run_ready:    true,
    controlled_runtime_execution_plan_ready:       true,
    rollback_plan_binding_gate_ready:              true,
    pre_execution_snapshot_contract_ready:         true,
    real_execution_proof_receipt_ready:            true,
    controlled_runtime_evidence_package_ready:     true,
    controlled_runtime_execution_ledger_ready:     true,
    controlled_runtime_execution_report_ready:     true,
    human_execution_approval_ledger_ready:         true,
    human_approval_expiration_gate_ready:          true,
    controlled_execution_command_sealer_ready:     true,
    controlled_execution_command_diff_guard_ready: true,
    controlled_runtime_execution_simulator_ready:  true,
    controlled_runtime_execution_drill_report_ready: true,
    real_execution_final_readiness_gate_ready:     true,
    real_execution_final_readiness_report_ready:   true,
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledRuntimeExecutionBaseline(result));
  }
  const v = validateControlledRuntimeExecutionBaseline(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
