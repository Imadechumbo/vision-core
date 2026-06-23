#!/usr/bin/env node

import { createHash } from 'crypto';

export const EXPLICIT_RELEASE_EXECUTION_BARRIER_STATUSES = [
  'EXECUTION_BARRIER_BLOCKED_INPUT',
  'EXECUTION_BARRIER_BLOCKED_REPORT',
  'EXECUTION_BARRIER_DENIED',
  'EXECUTION_BARRIER_READY',
];

const SCHEMA_VERSION = 'v200.0';

const FINAL_MESSAGE = 'V191-V200 authority chain complete. Real execution remains blocked until explicit V201 controlled execution command.';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    execution_barrier_id: null,
    barrier_ready: false,
    next_phase_allowed: false,
    next_phase: null,
    final_message: null,
    barrier_hash: null,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'EXECUTION_BARRIER_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildExplicitReleaseExecutionDecisionBarrier(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    execution_barrier_id,
    release_authority_report_ready,
    pre_release_ready,
    release_plan_locked,
    explicit_release_execution_requested,
    explicit_release_execution_authorized,
    production_touched,
    deploy_performed,
    stable_promoted,
    release_performed,
  } = input;

  if (!execution_barrier_id || typeof execution_barrier_id !== 'string' || !execution_barrier_id.trim()) {
    return blockedInput('Missing or invalid execution_barrier_id');
  }

  if (release_authority_report_ready !== true || pre_release_ready !== true || release_plan_locked !== true) {
    return {
      schema_version: SCHEMA_VERSION,
      execution_barrier_id,
      barrier_ready: false,
      next_phase_allowed: false,
      next_phase: null,
      final_message: null,
      barrier_hash: null,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'EXECUTION_BARRIER_BLOCKED_REPORT',
      errors: ['release_authority_report_ready, pre_release_ready, and release_plan_locked must all be true'],
    };
  }

  const denyErrors = [];
  if (explicit_release_execution_requested !== true) denyErrors.push('explicit_release_execution_requested must be true');
  if (explicit_release_execution_authorized !== true) denyErrors.push('explicit_release_execution_authorized must be true');
  if (production_touched) denyErrors.push('production_touched must be false');
  if (deploy_performed) denyErrors.push('deploy_performed must be false');
  if (stable_promoted) denyErrors.push('stable_promoted must be false');
  if (release_performed) denyErrors.push('release_performed must be false');

  if (denyErrors.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      execution_barrier_id,
      barrier_ready: false,
      next_phase_allowed: false,
      next_phase: null,
      final_message: null,
      barrier_hash: null,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'EXECUTION_BARRIER_DENIED',
      errors: denyErrors,
    };
  }

  const barrier_hash = sha256(`${execution_barrier_id}:${SCHEMA_VERSION}`);

  return {
    schema_version: SCHEMA_VERSION,
    execution_barrier_id,
    barrier_ready: true,
    next_phase_allowed: true,
    next_phase: 'V201_CONTROLLED_REAL_TAG_EXECUTION',
    final_message: FINAL_MESSAGE,
    barrier_hash,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'EXECUTION_BARRIER_READY',
    errors: [],
  };
}

export function validateExplicitReleaseExecutionDecisionBarrier(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!EXPLICIT_RELEASE_EXECUTION_BARRIER_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'EXECUTION_BARRIER_READY' && (!result.barrier_hash || result.barrier_hash.length !== 64)) {
    errors.push('Ready requires 64-char barrier_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderExplicitReleaseExecutionDecisionBarrier(result) {
  if (!result || typeof result !== 'object') return '[ExplicitReleaseExecutionDecisionBarrier: null]';
  const lines = [
    `=== Explicit Release Execution Decision Barrier ${SCHEMA_VERSION} ===`,
    `Status                  : ${result.status}`,
    `Barrier ID              : ${result.execution_barrier_id ?? 'N/A'}`,
    `Barrier Ready           : ${result.barrier_ready}`,
    `Next Phase Allowed      : ${result.next_phase_allowed}`,
    `Next Phase              : ${result.next_phase ?? 'N/A'}`,
    `Barrier Hash            : ${result.barrier_hash ?? 'N/A'}`,
    `Release Allowed         : ${result.release_allowed}`,
    `Real Exec Allowed       : ${result.real_execution_allowed}`,
    `Final Message           : ${result.final_message ?? 'N/A'}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors                  : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('explicit-release-execution-decision-barrier.mjs')) {
  const demo = buildExplicitReleaseExecutionDecisionBarrier({
    execution_barrier_id: 'barrier-001',
    release_authority_report_ready: true,
    pre_release_ready: true,
    release_plan_locked: true,
    explicit_release_execution_requested: true,
    explicit_release_execution_authorized: true,
  });
  console.log(renderExplicitReleaseExecutionDecisionBarrier(demo));
  const v = validateExplicitReleaseExecutionDecisionBarrier(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
