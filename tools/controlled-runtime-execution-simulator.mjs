#!/usr/bin/env node
/**
 * Controlled Runtime Execution Simulator — V158.0
 *
 * Simulates all controlled execution steps (truth check, pass gold, rollback,
 * snapshot, dry-run, command seal, diff guard) and produces a simulation result
 * without executing anything real.
 *
 * Statuses:
 *   SIMULATION_BLOCKED_INPUT  — missing simulator_id or required gate inputs
 *   SIMULATION_PRECONDITION   — one or more preconditions failed
 *   SIMULATION_READY          — all preconditions pass; ready for human command
 *   SIMULATION_FAILED_DRY_RUN — dry-run simulation step failed
 *
 * Invariants:
 *   command_executed         = false (always)
 *   no_real_execution        = true  (always)
 *   execution_performed      = false (always)
 *   stable_promoted          = false (always)
 *   deploy_performed         = false (always)
 *   release_performed        = false (always)
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v158.0';

export const SIMULATION_STATUSES = [
  'SIMULATION_BLOCKED_INPUT',
  'SIMULATION_PRECONDITION',
  'SIMULATION_READY',
  'SIMULATION_FAILED_DRY_RUN',
];

export const SIMULATION_STEPS = [
  'truth_check',
  'pass_gold_check',
  'rollback_check',
  'snapshot_check',
  'dry_run_check',
  'command_seal_check',
  'diff_guard_check',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    command_executed:    false,
    no_real_execution:   true,
    execution_performed: false,
    stable_promoted:     false,
    deploy_performed:    false,
    release_performed:   false,
  };
}

export function buildControlledRuntimeExecutionSimulator(params) {
  const {
    simulator_id,
    // Truth check inputs
    anti_hallucination_runtime_ready,
    truth_score,
    // Pass gold inputs
    pass_gold_confirmed,
    pass_gold_score,
    // Rollback inputs
    rollback_plan_bound,
    rollback_steps_count,
    // Snapshot inputs
    snapshot_captured,
    git_head_sha,
    // Dry-run inputs
    dry_run_completed,
    dry_run_passed,
    // Command seal inputs
    command_sealed,
    command_hash,
    // Diff guard inputs
    diff_guard_passed,
    forbidden_files_count,
    // Meta
    simulated_at,
  } = params || {};

  const ts = simulated_at ?? new Date().toISOString();

  if (!simulator_id || String(simulator_id).trim() === '') {
    return {
      schema_version:       SCHEMA_VERSION,
      simulation_status:    'SIMULATION_BLOCKED_INPUT',
      blocked_reason:       'simulator_id is required.',
      simulator_id:         null,
      simulator_id_hash:    _sha256(''),
      steps_passed:         0,
      steps_total:          SIMULATION_STEPS.length,
      simulation_complete:  false,
      simulated_at:         ts,
      ..._locked(),
    };
  }

  // Run each precondition step
  const stepResults = [];
  const failed = [];

  // Step 1: truth_check
  const truthOk = anti_hallucination_runtime_ready === true && (typeof truth_score !== 'number' || truth_score >= 80);
  stepResults.push({ step: 'truth_check', passed: truthOk, detail: truthOk ? 'anti_hallucination_runtime_ready=true, score≥80' : 'truth check failed' });
  if (!truthOk) failed.push('truth_check');

  // Step 2: pass_gold_check
  const passGoldOk = pass_gold_confirmed === true && (typeof pass_gold_score !== 'number' || pass_gold_score >= 80);
  stepResults.push({ step: 'pass_gold_check', passed: passGoldOk, detail: passGoldOk ? 'pass_gold_confirmed=true' : 'pass gold check failed' });
  if (!passGoldOk) failed.push('pass_gold_check');

  // Step 3: rollback_check
  const rollbackOk = rollback_plan_bound === true && (typeof rollback_steps_count !== 'number' || rollback_steps_count > 0);
  stepResults.push({ step: 'rollback_check', passed: rollbackOk, detail: rollbackOk ? 'rollback_plan_bound=true' : 'rollback check failed' });
  if (!rollbackOk) failed.push('rollback_check');

  // Step 4: snapshot_check
  const snapshotOk = snapshot_captured === true && git_head_sha && String(git_head_sha).trim() !== '';
  stepResults.push({ step: 'snapshot_check', passed: snapshotOk, detail: snapshotOk ? 'snapshot_captured=true, git_head_sha present' : 'snapshot check failed' });
  if (!snapshotOk) failed.push('snapshot_check');

  // Step 5: dry_run_check
  const dryRunOk = dry_run_completed === true && dry_run_passed === true;
  stepResults.push({ step: 'dry_run_check', passed: dryRunOk, detail: dryRunOk ? 'dry_run_completed=true, dry_run_passed=true' : 'dry run check failed' });
  if (!dryRunOk) failed.push('dry_run_check');

  // Step 6: command_seal_check
  const sealOk = command_sealed === true && command_hash && /^[a-f0-9]{64}$/.test(String(command_hash));
  stepResults.push({ step: 'command_seal_check', passed: sealOk, detail: sealOk ? 'command_sealed=true, hash valid' : 'command seal check failed' });
  if (!sealOk) failed.push('command_seal_check');

  // Step 7: diff_guard_check
  const diffOk = diff_guard_passed === true && (typeof forbidden_files_count !== 'number' || forbidden_files_count === 0);
  stepResults.push({ step: 'diff_guard_check', passed: diffOk, detail: diffOk ? 'diff_guard_passed=true, no forbidden files' : 'diff guard check failed' });
  if (!diffOk) failed.push('diff_guard_check');

  const stepsPassed = stepResults.filter(s => s.passed).length;
  const dryRunFailed = failed.includes('dry_run_check');
  const hasPreconditionFail = failed.filter(s => s !== 'dry_run_check').length > 0;

  let status;
  if (dryRunFailed && !hasPreconditionFail) {
    status = 'SIMULATION_FAILED_DRY_RUN';
  } else if (hasPreconditionFail) {
    status = 'SIMULATION_PRECONDITION';
  } else {
    status = 'SIMULATION_READY';
  }

  return {
    schema_version:        SCHEMA_VERSION,
    simulation_status:     status,
    simulator_id,
    simulator_id_hash:     _sha256(simulator_id),
    steps_passed:          stepsPassed,
    steps_total:           SIMULATION_STEPS.length,
    failed_steps:          failed,
    step_results:          stepResults,
    simulation_complete:   status === 'SIMULATION_READY',
    simulated_at:          ts,
    ..._locked(),
  };
}

export function validateControlledRuntimeExecutionSimulator(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'simulation_status', 'simulator_id_hash',
    'steps_passed', 'steps_total', 'simulation_complete', 'simulated_at',
    'command_executed', 'no_real_execution', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.command_executed    !== false) errors.push('command_executed must be false');
  if (result.no_real_execution   !== true)  errors.push('no_real_execution must be true');
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted     !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed    !== false) errors.push('deploy_performed must be false');
  if (result.release_performed   !== false) errors.push('release_performed must be false');
  if (!SIMULATION_STATUSES.includes(result.simulation_status)) {
    errors.push(`invalid simulation_status: ${result.simulation_status}`);
  }
  if (result.simulation_status === 'SIMULATION_READY' && result.simulation_complete !== true) {
    errors.push('READY status requires simulation_complete=true');
  }
  if (result.simulation_status !== 'SIMULATION_READY' && result.simulation_complete === true) {
    errors.push('non-READY status cannot have simulation_complete=true');
  }
  if (typeof result.steps_total === 'number' && result.steps_total !== SIMULATION_STEPS.length) {
    errors.push(`steps_total must be ${SIMULATION_STEPS.length}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledRuntimeExecutionSimulator(result) {
  if (!result || typeof result !== 'object') {
    return '[CONTROLLED_RUNTIME_EXECUTION_SIMULATOR] No result to render.';
  }
  const lines = [
    `=== Controlled Runtime Execution Simulator [${SCHEMA_VERSION}] ===`,
    `Status:              ${result.simulation_status ?? 'N/A'}`,
    `Simulator ID:        ${result.simulator_id ?? 'N/A'}`,
    `Steps passed:        ${result.steps_passed ?? 0} / ${result.steps_total ?? SIMULATION_STEPS.length}`,
    `Simulation complete: ${result.simulation_complete}`,
    `Simulated at:        ${result.simulated_at ?? 'N/A'}`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:      ${result.blocked_reason}`);
  if (result.failed_steps && result.failed_steps.length > 0) {
    lines.push(`Failed steps:        ${result.failed_steps.join(', ')}`);
  }
  if (Array.isArray(result.step_results)) {
    lines.push('--- Step Results ---');
    for (const s of result.step_results) {
      lines.push(`  [${s.passed ? 'PASS' : 'FAIL'}] ${s.step}: ${s.detail}`);
    }
  }
  lines.push('--- REGRA ABSOLUTA ---');
  lines.push('command_executed=false | no_real_execution=true | execution_performed=false');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-runtime-execution-simulator.mjs')) {
  const showJson = process.argv.includes('--json');
  const fakeHash = 'a'.repeat(64);
  const result = buildControlledRuntimeExecutionSimulator({
    simulator_id:                   'v158.0-simulator',
    anti_hallucination_runtime_ready: true,
    truth_score:                    95,
    pass_gold_confirmed:            true,
    pass_gold_score:                98,
    rollback_plan_bound:            true,
    rollback_steps_count:           3,
    snapshot_captured:              true,
    git_head_sha:                   'abc123def456',
    dry_run_completed:              true,
    dry_run_passed:                 true,
    command_sealed:                 true,
    command_hash:                   fakeHash,
    diff_guard_passed:              true,
    forbidden_files_count:          0,
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledRuntimeExecutionSimulator(result));
  }
  const v = validateControlledRuntimeExecutionSimulator(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
