#!/usr/bin/env node
/**
 * Real Execution Dry-Run Proof Report — V149.1
 *
 * Consolidates all anti-hallucination and execution gate statuses into
 * a single proof report. Requires all 8 sub-system statuses to be ready/OK
 * for dry_run_proof_complete=true.
 *
 * Sub-systems consolidated:
 *   1. claim_verification_status
 *   2. filesystem_reality_status
 *   3. git_diff_truth_status
 *   4. proof_ledger_status
 *   5. hallucination_incident_status
 *   6. agent_truth_status
 *   7. controlled_gate_status
 *   8. rollback_readiness_status
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 * execution_allowed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v149.1';

const PASSING_CLAIM_STATUSES     = new Set(['CLAIM_VERIFIED']);
const PASSING_FS_STATUSES        = new Set(['FS_REALITY_READY']);
const PASSING_DIFF_STATUSES      = new Set(['DIFF_TRUTH_BOUND']);
const PASSING_LEDGER_STATUSES    = new Set(['PROOF_LEDGER_READY', 'PROOF_LEDGER_SEALED']);
const PASSING_INCIDENT_STATUSES  = new Set(['HALLUCINATION_INCIDENT_RECORDED', 'HALLUCINATION_PATTERN_SAFE_RECORDED']);
const PASSING_TRUTH_STATUSES     = new Set(['AGENT_TRUTH_TRUSTED', 'AGENT_TRUTH_SUPERVISED']);
const PASSING_GATE_STATUSES      = new Set(['CONTROLLED_GATE_READY_FOR_HUMAN']);
const PASSING_ROLLBACK_STATUSES  = new Set(['ROLLBACK_READY', 'ROLLBACK_TESTED']);

export const DRY_RUN_PROOF_REPORT_STATUSES = [
  'DRY_RUN_PROOF_REPORT_BLOCKED_INPUT',
  'DRY_RUN_PROOF_INCOMPLETE',
  'DRY_RUN_PROOF_PARTIAL',
  'DRY_RUN_PROOF_COMPLETE',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:    false,
    deploy_performed:   false,
    release_performed:  false,
    execution_allowed:  false,
  };
}

export function buildDryRunProofReport(params) {
  const {
    report_id,
    agent_name                  = null,
    claim_verification_status   = null,
    filesystem_reality_status   = null,
    git_diff_truth_status       = null,
    proof_ledger_status         = null,
    hallucination_incident_status = null,
    agent_truth_status          = null,
    controlled_gate_status      = null,
    rollback_readiness_status   = null,
    mission_id                  = null,
    reported_at,
  } = params || {};

  const report_id_hash = _sha256([
    report_id, agent_name, mission_id,
    claim_verification_status, filesystem_reality_status,
    git_diff_truth_status, proof_ledger_status,
  ].join('|'));

  if (!report_id || String(report_id).trim() === '') {
    return {
      report_id_hash,
      schema_version:           SCHEMA_VERSION,
      dry_run_proof_report_status: 'DRY_RUN_PROOF_REPORT_BLOCKED_INPUT',
      dry_run_proof_complete:   false,
      dry_run_proof_report_ready: false,
      blocked_reason:           'report_id is required.',
      passed_subsystem_count:   0,
      failed_subsystem_count:   0,
      reported_at:              reported_at ?? new Date().toISOString(),
      ..._locked(),
      unsafe_learning_blocked:  true,
      positive_learning_requires_pass_gold: true,
    };
  }

  const subsystems = [
    { name: 'claim_verification',    status: claim_verification_status,   passing: PASSING_CLAIM_STATUSES },
    { name: 'filesystem_reality',    status: filesystem_reality_status,    passing: PASSING_FS_STATUSES },
    { name: 'git_diff_truth',        status: git_diff_truth_status,        passing: PASSING_DIFF_STATUSES },
    { name: 'proof_ledger',          status: proof_ledger_status,          passing: PASSING_LEDGER_STATUSES },
    { name: 'hallucination_incident', status: hallucination_incident_status, passing: PASSING_INCIDENT_STATUSES },
    { name: 'agent_truth',           status: agent_truth_status,           passing: PASSING_TRUTH_STATUSES },
    { name: 'controlled_gate',       status: controlled_gate_status,       passing: PASSING_GATE_STATUSES },
    { name: 'rollback_readiness',    status: rollback_readiness_status,    passing: PASSING_ROLLBACK_STATUSES },
  ];

  const results = {};
  let passed = 0;
  let failed = 0;
  const failed_subsystems = [];

  for (const sys of subsystems) {
    const ok = sys.status !== null && sys.status !== undefined && sys.passing.has(sys.status);
    results[`${sys.name}_ok`] = ok;
    if (ok) {
      passed++;
    } else {
      failed++;
      failed_subsystems.push(sys.name);
    }
  }

  const total = subsystems.length;
  let dry_run_proof_report_status;
  let dry_run_proof_complete;
  let dry_run_proof_report_ready;

  if (passed === total) {
    dry_run_proof_report_status = 'DRY_RUN_PROOF_COMPLETE';
    dry_run_proof_complete  = true;
    dry_run_proof_report_ready = true;
  } else if (passed >= Math.ceil(total / 2)) {
    dry_run_proof_report_status = 'DRY_RUN_PROOF_PARTIAL';
    dry_run_proof_complete  = false;
    dry_run_proof_report_ready = false;
  } else {
    dry_run_proof_report_status = 'DRY_RUN_PROOF_INCOMPLETE';
    dry_run_proof_complete  = false;
    dry_run_proof_report_ready = false;
  }

  return {
    report_id_hash,
    schema_version:           SCHEMA_VERSION,
    dry_run_proof_report_status,
    dry_run_proof_complete,
    dry_run_proof_report_ready,
    report_id,
    agent_name,
    mission_id,
    claim_verification_status,
    filesystem_reality_status,
    git_diff_truth_status,
    proof_ledger_status,
    hallucination_incident_status,
    agent_truth_status,
    controlled_gate_status,
    rollback_readiness_status,
    ...results,
    passed_subsystem_count:   passed,
    failed_subsystem_count:   failed,
    failed_subsystems,
    total_subsystem_count:    total,
    reported_at:              reported_at ?? new Date().toISOString(),
    ..._locked(),
    unsafe_learning_blocked:  true,
    positive_learning_requires_pass_gold: true,
  };
}

export function validateDryRunProofReport(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'report_id_hash', 'schema_version', 'dry_run_proof_report_status',
    'dry_run_proof_complete', 'dry_run_proof_report_ready',
    'passed_subsystem_count', 'failed_subsystem_count',
    'execution_allowed',
    'stable_promoted', 'deploy_performed', 'release_performed',
    'unsafe_learning_blocked', 'positive_learning_requires_pass_gold',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted    !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed   !== false) errors.push('deploy_performed must be false');
  if (result.release_performed  !== false) errors.push('release_performed must be false');
  if (result.execution_allowed  !== false) errors.push('execution_allowed must be false');
  if (result.unsafe_learning_blocked !== true) {
    errors.push('unsafe_learning_blocked must be true');
  }
  if (result.positive_learning_requires_pass_gold !== true) {
    errors.push('positive_learning_requires_pass_gold must be true');
  }
  if (!DRY_RUN_PROOF_REPORT_STATUSES.includes(result.dry_run_proof_report_status)) {
    errors.push(`invalid dry_run_proof_report_status: ${result.dry_run_proof_report_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderDryRunProofReport(result) {
  if (!result || typeof result !== 'object') {
    return '[REAL_EXECUTION_DRY_RUN_PROOF_REPORT] No result to render.';
  }
  const lines = [
    `=== Real Execution Dry-Run Proof Report [${SCHEMA_VERSION}] ===`,
    `Status:                                ${result.dry_run_proof_report_status ?? 'N/A'}`,
    `Report ID:                             ${result.report_id ?? 'N/A'}`,
    `Agent:                                 ${result.agent_name ?? 'N/A'}`,
    `Mission:                               ${result.mission_id ?? 'N/A'}`,
    `Dry-run proof complete:                ${result.dry_run_proof_complete}`,
    `Passed subsystems:                     ${result.passed_subsystem_count ?? 0} / ${result.total_subsystem_count ?? 8}`,
    `Failed subsystems:                     ${result.failed_subsystem_count ?? 0}`,
    `Failed list:                           ${Array.isArray(result.failed_subsystems) ? result.failed_subsystems.join(', ') || 'none' : 'N/A'}`,
    `--- Sub-system statuses ---`,
    `claim_verification:   ${result.claim_verification_status ?? 'N/A'}  [${result.claim_verification_ok ? 'OK' : 'FAIL'}]`,
    `filesystem_reality:   ${result.filesystem_reality_status ?? 'N/A'}  [${result.filesystem_reality_ok ? 'OK' : 'FAIL'}]`,
    `git_diff_truth:       ${result.git_diff_truth_status ?? 'N/A'}  [${result.git_diff_truth_ok ? 'OK' : 'FAIL'}]`,
    `proof_ledger:         ${result.proof_ledger_status ?? 'N/A'}  [${result.proof_ledger_ok ? 'OK' : 'FAIL'}]`,
    `hallucination_incident: ${result.hallucination_incident_status ?? 'N/A'}  [${result.hallucination_incident_ok ? 'OK' : 'FAIL'}]`,
    `agent_truth:          ${result.agent_truth_status ?? 'N/A'}  [${result.agent_truth_ok ? 'OK' : 'FAIL'}]`,
    `controlled_gate:      ${result.controlled_gate_status ?? 'N/A'}  [${result.controlled_gate_ok ? 'OK' : 'FAIL'}]`,
    `rollback_readiness:   ${result.rollback_readiness_status ?? 'N/A'}  [${result.rollback_readiness_ok ? 'OK' : 'FAIL'}]`,
    `--- Execution locks ---`,
    `execution_allowed:                     ${result.execution_allowed}`,
    `--- Learning rules ---`,
    `unsafe_learning_blocked:               ${result.unsafe_learning_blocked}`,
    `positive_learning_requires_pass_gold:  ${result.positive_learning_requires_pass_gold}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
