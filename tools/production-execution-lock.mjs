#!/usr/bin/env node
/**
 * Production Execution Lock — V56.1
 *
 * Explicit lock that prevents release/tag/stable/deploy real execution.
 * No unlock mechanism exists in this version.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * unlock_contract_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v56.1';

export const PRODUCTION_LOCK_STATUSES = [
  'PRODUCTION_LOCK_MISSING',
  'PRODUCTION_LOCK_INVALID',
  'PRODUCTION_LOCK_EXPIRED',
  'PRODUCTION_LOCK_BLOCKED_GATE',
  'PRODUCTION_LOCK_ACTIVE',
];

export const LOCKED_CAPABILITIES = [
  'release_execute',
  'deploy_execute',
  'tag_create',
  'stable_promote',
  'git_push',
  'production_write',
  'evidence_override',
  'go_core_override',
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
    unlock_contract_required:     true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    lock_status:     status,
    lock_active:     false,
    blocking_reason,
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
    unlock_contract_required:     true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a production execution lock.
 */
export function createProductionExecutionLock(params = {}) {
  const {
    gate_id,
    lock_reason,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const lock_id = _sha256(`fixture-lock:${now}`).slice(0, 24);
    const expires_at = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();
    return {
      schema_version:           SCHEMA_VERSION,
      lock_id,
      lock_status:              'PRODUCTION_LOCK_ACTIVE',
      lock_active:              true,
      gate_id:                  'fixture-gate-id',
      lock_reason:              lock_reason ?? 'production_execution_not_yet_unlocked',
      locked_capabilities:      LOCKED_CAPABILITIES,
      unlock_required:          true,
      unlock_contract_required: true,
      unlock_contract_id:       null,
      created_at:               now,
      expires_at,
      blocking_reason:          null,
      ..._locked(),
    };
  }

  if (!gate_id) {
    return _blocked('PRODUCTION_LOCK_BLOCKED_GATE', 'gate_id_required');
  }

  const lock_id = _sha256(`lock:${gate_id}:${now}`).slice(0, 24);
  const expires_at = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();

  return {
    schema_version:           SCHEMA_VERSION,
    lock_id,
    lock_status:              'PRODUCTION_LOCK_ACTIVE',
    lock_active:              true,
    gate_id,
    lock_reason:              lock_reason ?? 'production_execution_not_yet_unlocked',
    locked_capabilities:      LOCKED_CAPABILITIES,
    unlock_required:          true,
    unlock_contract_required: true,
    unlock_contract_id:       null,
    created_at:               now,
    expires_at,
    blocking_reason:          null,
    ..._locked(),
  };
}

/**
 * Validate a production execution lock.
 */
export function validateProductionExecutionLock(lock) {
  if (!lock) return _blocked('PRODUCTION_LOCK_MISSING', 'lock_null');

  if (lock.schema_version !== SCHEMA_VERSION) {
    return _blocked('PRODUCTION_LOCK_INVALID', `schema_version_mismatch:expected_${SCHEMA_VERSION}`);
  }

  if (!lock.lock_id || typeof lock.lock_id !== 'string') {
    return _blocked('PRODUCTION_LOCK_INVALID', 'lock_id_missing_or_invalid');
  }

  if (lock.production_execution_locked !== true) {
    return _blocked('PRODUCTION_LOCK_INVALID', 'production_execution_locked_must_be_true');
  }

  if (lock.unlock_contract_required !== true) {
    return _blocked('PRODUCTION_LOCK_INVALID', 'unlock_contract_required_must_be_true');
  }

  if (!Array.isArray(lock.locked_capabilities) || lock.locked_capabilities.length === 0) {
    return _blocked('PRODUCTION_LOCK_INVALID', 'locked_capabilities_required');
  }

  // Any non-null unlock_contract_id is suspicious — ignore with reason
  if (lock.unlock_contract_id !== null) {
    return _blocked('PRODUCTION_LOCK_INVALID', 'unlock_contract_id_must_be_null_no_unlock_in_this_version');
  }

  return { valid: true, lock_id: lock.lock_id, ..._locked() };
}

/**
 * Evaluate if a production execution lock blocks an operation.
 */
export function evaluateProductionExecutionLock(lock, operation) {
  if (!lock || lock.lock_active !== true) {
    return {
      operation,
      allowed:                     false,
      reason:                      'no_active_lock_found',
      production_execution_locked: true,
      ..._locked(),
    };
  }

  const blocked = lock.locked_capabilities?.includes(operation);
  return {
    operation,
    allowed:                     false,
    blocked:                     !!blocked,
    reason:                      blocked ? `operation_blocked_by_production_lock:${operation}` : 'default_deny',
    production_execution_locked: true,
    ..._locked(),
  };
}

/**
 * Render a human-readable lock summary.
 */
export function renderProductionExecutionLock(lock) {
  if (!lock) return 'lock: null';
  const lines = [
    `lock_status                  : ${lock.lock_status ?? 'UNKNOWN'}`,
    `lock_id                      : ${lock.lock_id ?? 'none'}`,
    `lock_reason                  : ${lock.lock_reason ?? 'none'}`,
    `locked_capabilities          : ${lock.locked_capabilities?.length ?? 0}`,
    `production_execution_locked  : true`,
    `unlock_required              : true`,
    `unlock_contract_required     : true`,
    `unlock_contract_id           : ${lock.unlock_contract_id ?? 'null (no unlock in this version)'}`,
    `release_execution_allowed    : false`,
    `blocking_reason              : ${lock.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('production-execution-lock.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createProductionExecutionLock({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderProductionExecutionLock(result));
  }

  process.exit(result.lock_active ? 0 : 1);
}
