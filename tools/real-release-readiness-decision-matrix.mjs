#!/usr/bin/env node
/**
 * Real Release Readiness Decision Matrix — V56.2
 *
 * Classifies real release readiness as READY_LOCKED, BLOCKED, or NEEDS_UNLOCK.
 * Never releases execution. READY_LOCKED = ready for human review only.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v56.2';

export const REAL_READINESS_STATUSES = [
  'REAL_READINESS_BLOCKED_GATE',
  'REAL_READINESS_BLOCKED_LOCK',
  'REAL_READINESS_BLOCKED_BASELINE',
  'REAL_READINESS_READY_LOCKED',
  'REAL_READINESS_NEEDS_UNLOCK',
];

export const REAL_READINESS_BLOCKED_ACTIONS = [
  'auto_release',
  'auto_tag',
  'auto_stable_promotion',
  'auto_deploy',
  'git_push',
  'production_write',
  'evidence_override',
  'go_core_override',
];

export const REAL_READINESS_SAFE_NEXT_ACTIONS = [
  'review_gate_status',
  'verify_production_lock_active',
  'review_baseline_readiness',
  'prepare_future_unlock_contract',
  'do_not_execute_production_in_this_phase',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    unlock_required:              true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                  SCHEMA_VERSION,
    real_release_readiness_status:   status,
    real_release_readiness_ready:    false,
    blocking_reason,
    missing_requirements:            extra.missing_requirements ?? [],
    blocked_actions:                 REAL_READINESS_BLOCKED_ACTIONS,
    safe_next_actions:               REAL_READINESS_SAFE_NEXT_ACTIONS,
    ...extra,
    ..._locked(),
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    unlock_required:              true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Evaluate real release readiness from gate, lock, and baselines.
 */
export function evaluateRealReleaseReadiness(params = {}) {
  const {
    real_manual_release_gate,
    production_execution_lock,
    sandbox_baseline,
    manual_execution_baseline,
    supervised_control_plane_baseline,
    runtime_execution_baseline,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const matrix_id = _sha256(`fixture-readiness:${now}`).slice(0, 24);
    return {
      schema_version:                  SCHEMA_VERSION,
      matrix_id,
      real_release_readiness_status:   'REAL_READINESS_READY_LOCKED',
      real_release_readiness_ready:    true,
      gate_status:                     'REAL_GATE_READY_LOCKED',
      lock_status:                     'PRODUCTION_LOCK_ACTIVE',
      readiness_matrix: {
        gate_ready:                    true,
        lock_active:                   true,
        sandbox_baseline_ready:        true,
        manual_execution_baseline_ready: true,
        supervised_baseline_ready:     true,
        runtime_baseline_ready:        true,
      },
      missing_requirements:            [],
      blocked_actions:                 REAL_READINESS_BLOCKED_ACTIONS,
      safe_next_actions:               REAL_READINESS_SAFE_NEXT_ACTIONS,
      blocking_reason:                 null,
      created_at:                      now,
      ..._locked(),
    };
  }

  // Gate required
  if (!real_manual_release_gate || real_manual_release_gate.gate_ready !== true) {
    return _blocked('REAL_READINESS_BLOCKED_GATE', 'gate_not_ready', {
      gate_status: real_manual_release_gate?.gate_status ?? null,
      missing_requirements: ['real_manual_release_gate'],
    });
  }

  // Lock required and active
  if (!production_execution_lock || production_execution_lock.lock_active !== true) {
    return _blocked('REAL_READINESS_BLOCKED_LOCK', 'production_lock_not_active', {
      lock_status: production_execution_lock?.lock_status ?? null,
      missing_requirements: ['production_execution_lock'],
    });
  }

  // Baselines
  const missingBaselines = [];
  const matrix = {
    gate_ready:                      real_manual_release_gate.gate_ready === true,
    lock_active:                     production_execution_lock.lock_active === true,
    sandbox_baseline_ready:          false,
    manual_execution_baseline_ready: false,
    supervised_baseline_ready:       false,
    runtime_baseline_ready:          false,
  };

  if (sandbox_baseline) {
    matrix.sandbox_baseline_ready = sandbox_baseline.baseline_ready === true;
    if (!matrix.sandbox_baseline_ready) missingBaselines.push('sandbox_baseline');
  } else {
    missingBaselines.push('sandbox_baseline');
  }

  if (manual_execution_baseline) {
    matrix.manual_execution_baseline_ready = manual_execution_baseline.manual_execution_baseline_ready === true
      || manual_execution_baseline.baseline_ready === true;
    if (!matrix.manual_execution_baseline_ready) missingBaselines.push('manual_execution_baseline');
  } else {
    missingBaselines.push('manual_execution_baseline');
  }

  if (supervised_control_plane_baseline) {
    matrix.supervised_baseline_ready = supervised_control_plane_baseline.control_plane_baseline_ready === true
      || supervised_control_plane_baseline.baseline_ready === true;
    if (!matrix.supervised_baseline_ready) missingBaselines.push('supervised_control_plane_baseline');
  } else {
    missingBaselines.push('supervised_control_plane_baseline');
  }

  if (runtime_execution_baseline) {
    matrix.runtime_baseline_ready = runtime_execution_baseline.baseline_ready === true;
    if (!matrix.runtime_baseline_ready) missingBaselines.push('runtime_execution_baseline');
  } else {
    missingBaselines.push('runtime_execution_baseline');
  }

  if (missingBaselines.length > 0) {
    return _blocked('REAL_READINESS_BLOCKED_BASELINE', 'baselines_not_ready', {
      missing_requirements: missingBaselines,
      readiness_matrix: matrix,
    });
  }

  // Lock is active → READY_LOCKED (not NEEDS_UNLOCK — that's for future unlock contract)
  const matrix_id = _sha256(`readiness:${real_manual_release_gate.gate_id ?? 'x'}:${production_execution_lock.lock_id ?? 'x'}:${now}`).slice(0, 24);

  return {
    schema_version:                  SCHEMA_VERSION,
    matrix_id,
    real_release_readiness_status:   'REAL_READINESS_READY_LOCKED',
    real_release_readiness_ready:    true,
    gate_status:                     real_manual_release_gate.gate_status,
    lock_status:                     production_execution_lock.lock_status,
    readiness_matrix:                matrix,
    missing_requirements:            [],
    blocked_actions:                 REAL_READINESS_BLOCKED_ACTIONS,
    safe_next_actions:               REAL_READINESS_SAFE_NEXT_ACTIONS,
    blocking_reason:                 null,
    created_at:                      now,
    ..._locked(),
  };
}

/**
 * Classify readiness (alias for evaluateRealReleaseReadiness with named output).
 */
export function classifyRealReleaseReadiness(params = {}) {
  return evaluateRealReleaseReadiness(params);
}

/**
 * Render a human-readable readiness decision.
 */
export function renderRealReleaseReadinessDecision(result) {
  if (!result) return 'readiness: null';
  const lines = [
    `real_release_readiness_status : ${result.real_release_readiness_status ?? 'UNKNOWN'}`,
    `matrix_id                     : ${result.matrix_id ?? 'none'}`,
    `production_execution_locked   : true`,
    `unlock_required               : true`,
    `release_execution_allowed     : false`,
    `deploy_allowed                : false`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
    `missing_requirements          : ${(result.missing_requirements ?? []).join(', ') || 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-release-readiness-decision-matrix.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateRealReleaseReadiness({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealReleaseReadinessDecision(result));
  }

  process.exit(result.real_release_readiness_ready ? 0 : 1);
}
