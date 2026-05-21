#!/usr/bin/env node
/**
 * Real Execution Final Readiness Gate — V159.0
 *
 * Evaluates 15 preconditions to determine if the system is ready for a human
 * execution command. Reports readiness — does NOT execute anything.
 *
 * Statuses:
 *   FINAL_READINESS_BLOCKED             — missing gate_id
 *   FINAL_READINESS_PARTIAL             — some preconditions not met
 *   FINAL_READINESS_READY_FOR_HUMAN_COMMAND — all 15 preconditions pass
 *
 * Invariants (always):
 *   execution_allowed      = false
 *   human_command_required = true
 *   command_executed       = false
 *   execution_performed    = false
 *   stable_promoted        = false
 *   deploy_performed       = false
 *   release_performed      = false
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v159.0';
const PRECONDITION_COUNT = 15;

export const FINAL_READINESS_STATUSES = [
  'FINAL_READINESS_BLOCKED',
  'FINAL_READINESS_PARTIAL',
  'FINAL_READINESS_READY_FOR_HUMAN_COMMAND',
];

export const FINAL_READINESS_PRECONDITIONS = [
  'anti_hallucination_runtime_ready',
  'truth_score_sufficient',
  'pass_gold_confirmed',
  'pass_gold_score_sufficient',
  'rollback_plan_bound',
  'rollback_steps_present',
  'snapshot_captured',
  'git_head_sha_present',
  'dry_run_completed',
  'dry_run_passed',
  'command_sealed',
  'command_hash_valid',
  'diff_guard_passed',
  'no_forbidden_files',
  'simulation_complete',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    execution_allowed:      false,
    human_command_required: true,
    command_executed:       false,
    execution_performed:    false,
    stable_promoted:        false,
    deploy_performed:       false,
    release_performed:      false,
  };
}

export function buildRealExecutionFinalReadinessGate(params) {
  const {
    gate_id,
    anti_hallucination_runtime_ready,
    truth_score,
    pass_gold_confirmed,
    pass_gold_score,
    rollback_plan_bound,
    rollback_steps_count,
    snapshot_captured,
    git_head_sha,
    dry_run_completed,
    dry_run_passed,
    command_sealed,
    command_hash,
    diff_guard_passed,
    forbidden_files_count,
    simulation_complete,
    evaluated_at,
  } = params || {};

  const ts = evaluated_at ?? new Date().toISOString();

  if (!gate_id || String(gate_id).trim() === '') {
    return {
      schema_version:        SCHEMA_VERSION,
      final_readiness_status: 'FINAL_READINESS_BLOCKED',
      blocked_reason:        'gate_id is required.',
      gate_id:               null,
      gate_id_hash:          _sha256(''),
      preconditions_passed:  0,
      preconditions_total:   PRECONDITION_COUNT,
      real_execution_ready:  false,
      evaluated_at:          ts,
      ..._locked(),
    };
  }

  const results = [];

  // 1. anti_hallucination_runtime_ready
  const p1 = anti_hallucination_runtime_ready === true;
  results.push({ name: 'anti_hallucination_runtime_ready', passed: p1, detail: p1 ? 'anti_hallucination_runtime_ready=true' : 'anti_hallucination_runtime_ready must be true' });

  // 2. truth_score_sufficient
  const p2 = typeof truth_score !== 'number' || truth_score >= 80;
  results.push({ name: 'truth_score_sufficient', passed: p2, detail: p2 ? 'truth_score≥80 or not provided' : `truth_score ${truth_score} < 80` });

  // 3. pass_gold_confirmed
  const p3 = pass_gold_confirmed === true;
  results.push({ name: 'pass_gold_confirmed', passed: p3, detail: p3 ? 'pass_gold_confirmed=true' : 'pass_gold_confirmed must be true' });

  // 4. pass_gold_score_sufficient
  const p4 = typeof pass_gold_score !== 'number' || pass_gold_score >= 80;
  results.push({ name: 'pass_gold_score_sufficient', passed: p4, detail: p4 ? 'pass_gold_score≥80 or not provided' : `pass_gold_score ${pass_gold_score} < 80` });

  // 5. rollback_plan_bound
  const p5 = rollback_plan_bound === true;
  results.push({ name: 'rollback_plan_bound', passed: p5, detail: p5 ? 'rollback_plan_bound=true' : 'rollback_plan_bound must be true' });

  // 6. rollback_steps_present
  const p6 = typeof rollback_steps_count !== 'number' || rollback_steps_count > 0;
  results.push({ name: 'rollback_steps_present', passed: p6, detail: p6 ? 'rollback_steps_count>0 or not provided' : 'rollback_steps_count must be > 0' });

  // 7. snapshot_captured
  const p7 = snapshot_captured === true;
  results.push({ name: 'snapshot_captured', passed: p7, detail: p7 ? 'snapshot_captured=true' : 'snapshot_captured must be true' });

  // 8. git_head_sha_present
  const p8 = !!git_head_sha && String(git_head_sha).trim() !== '';
  results.push({ name: 'git_head_sha_present', passed: p8, detail: p8 ? 'git_head_sha present' : 'git_head_sha is required' });

  // 9. dry_run_completed
  const p9 = dry_run_completed === true;
  results.push({ name: 'dry_run_completed', passed: p9, detail: p9 ? 'dry_run_completed=true' : 'dry_run_completed must be true' });

  // 10. dry_run_passed
  const p10 = dry_run_passed === true;
  results.push({ name: 'dry_run_passed', passed: p10, detail: p10 ? 'dry_run_passed=true' : 'dry_run_passed must be true' });

  // 11. command_sealed
  const p11 = command_sealed === true;
  results.push({ name: 'command_sealed', passed: p11, detail: p11 ? 'command_sealed=true' : 'command_sealed must be true' });

  // 12. command_hash_valid
  const p12 = !!command_hash && /^[a-f0-9]{64}$/.test(String(command_hash));
  results.push({ name: 'command_hash_valid', passed: p12, detail: p12 ? 'command_hash is valid sha256 hex' : 'command_hash must be 64-char lowercase hex' });

  // 13. diff_guard_passed
  const p13 = diff_guard_passed === true;
  results.push({ name: 'diff_guard_passed', passed: p13, detail: p13 ? 'diff_guard_passed=true' : 'diff_guard_passed must be true' });

  // 14. no_forbidden_files
  const p14 = typeof forbidden_files_count !== 'number' || forbidden_files_count === 0;
  results.push({ name: 'no_forbidden_files', passed: p14, detail: p14 ? 'no forbidden files' : `forbidden_files_count=${forbidden_files_count}` });

  // 15. simulation_complete
  const p15 = simulation_complete === true;
  results.push({ name: 'simulation_complete', passed: p15, detail: p15 ? 'simulation_complete=true' : 'simulation_complete must be true' });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).map(r => r.name);
  const allPass = passed === PRECONDITION_COUNT;

  const status = allPass
    ? 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND'
    : 'FINAL_READINESS_PARTIAL';

  return {
    schema_version:         SCHEMA_VERSION,
    final_readiness_status: status,
    gate_id,
    gate_id_hash:           _sha256(gate_id),
    preconditions_passed:   passed,
    preconditions_total:    PRECONDITION_COUNT,
    failed_preconditions:   failed,
    precondition_results:   results,
    real_execution_ready:   allPass,
    evaluated_at:           ts,
    ..._locked(),
  };
}

export function validateRealExecutionFinalReadinessGate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'final_readiness_status', 'gate_id_hash',
    'preconditions_passed', 'preconditions_total', 'real_execution_ready',
    'evaluated_at',
    'execution_allowed', 'human_command_required',
    'command_executed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.execution_allowed      !== false) errors.push('execution_allowed must be false');
  if (result.human_command_required !== true)  errors.push('human_command_required must be true');
  if (result.command_executed       !== false) errors.push('command_executed must be false');
  if (result.execution_performed    !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted        !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed       !== false) errors.push('deploy_performed must be false');
  if (result.release_performed      !== false) errors.push('release_performed must be false');
  if (!FINAL_READINESS_STATUSES.includes(result.final_readiness_status)) {
    errors.push(`invalid final_readiness_status: ${result.final_readiness_status}`);
  }
  if (result.final_readiness_status === 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND' && result.real_execution_ready !== true) {
    errors.push('READY_FOR_HUMAN_COMMAND requires real_execution_ready=true');
  }
  if (result.final_readiness_status !== 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND' && result.real_execution_ready === true) {
    errors.push('non-READY status cannot have real_execution_ready=true');
  }
  if (typeof result.preconditions_total === 'number' && result.preconditions_total !== PRECONDITION_COUNT) {
    errors.push(`preconditions_total must be ${PRECONDITION_COUNT}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealExecutionFinalReadinessGate(result) {
  if (!result || typeof result !== 'object') {
    return '[REAL_EXECUTION_FINAL_READINESS_GATE] No result to render.';
  }
  const lines = [
    `=== Real Execution Final Readiness Gate [${SCHEMA_VERSION}] ===`,
    `Status:                 ${result.final_readiness_status ?? 'N/A'}`,
    `Gate ID:                ${result.gate_id ?? 'N/A'}`,
    `Preconditions Passed:   ${result.preconditions_passed ?? 0} / ${result.preconditions_total ?? PRECONDITION_COUNT}`,
    `Real Execution Ready:   ${result.real_execution_ready}`,
    `Execution Allowed:      ${result.execution_allowed}`,
    `Human Command Required: ${result.human_command_required}`,
    `Evaluated At:           ${result.evaluated_at ?? 'N/A'}`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked Reason:         ${result.blocked_reason}`);
  if (result.failed_preconditions && result.failed_preconditions.length > 0) {
    lines.push(`Failed Preconditions:   ${result.failed_preconditions.join(', ')}`);
  }
  if (Array.isArray(result.precondition_results)) {
    lines.push('--- Precondition Results ---');
    for (const p of result.precondition_results) {
      lines.push(`  [${p.passed ? 'PASS' : 'FAIL'}] ${p.name}: ${p.detail}`);
    }
  }
  lines.push('--- REGRA ABSOLUTA ---');
  lines.push('execution_allowed=false | human_command_required=true | command_executed=false | execution_performed=false');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-execution-final-readiness-gate.mjs')) {
  const showJson = process.argv.includes('--json');
  const fakeHash = 'a'.repeat(64);
  const result = buildRealExecutionFinalReadinessGate({
    gate_id:                          'v159.0-gate',
    anti_hallucination_runtime_ready: true,
    truth_score:                      95,
    pass_gold_confirmed:              true,
    pass_gold_score:                  98,
    rollback_plan_bound:              true,
    rollback_steps_count:             3,
    snapshot_captured:                true,
    git_head_sha:                     'abc123def456',
    dry_run_completed:                true,
    dry_run_passed:                   true,
    command_sealed:                   true,
    command_hash:                     fakeHash,
    diff_guard_passed:                true,
    forbidden_files_count:            0,
    simulation_complete:              true,
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealExecutionFinalReadinessGate(result));
  }
  const v = validateRealExecutionFinalReadinessGate(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
