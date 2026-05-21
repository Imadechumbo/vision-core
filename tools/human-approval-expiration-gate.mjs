#!/usr/bin/env node
/**
 * Human Approval Expiration Gate — V156.1
 *
 * Verifies a human approval token is still active: not expired, not revoked,
 * and token hash matches the bound approval.
 *
 * Statuses:
 *   APPROVAL_GATE_BLOCKED_INPUT   — missing gate_id or approval_ledger_id
 *   APPROVAL_GATE_EXPIRED         — approval window has elapsed
 *   APPROVAL_GATE_REVOKED         — approval was explicitly revoked
 *   APPROVAL_GATE_TOKEN_MISMATCH  — supplied token hash does not match bound token
 *   APPROVAL_GATE_ACTIVE          — approval is valid and active
 *
 * Invariants:
 *   human_approval_required = true  (always)
 *   execution_performed     = false (always)
 *   stable_promoted         = false (always)
 *   deploy_performed        = false (always)
 *   release_performed       = false (always)
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v156.1';

export const APPROVAL_GATE_STATUSES = [
  'APPROVAL_GATE_BLOCKED_INPUT',
  'APPROVAL_GATE_EXPIRED',
  'APPROVAL_GATE_REVOKED',
  'APPROVAL_GATE_TOKEN_MISMATCH',
  'APPROVAL_GATE_ACTIVE',
];

const DEFAULT_EXPIRY_MS = 3600_000; // 1 hour

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    human_approval_required: true,
    execution_performed:     false,
    stable_promoted:         false,
    deploy_performed:        false,
    release_performed:       false,
  };
}

export function buildHumanApprovalExpirationGate(params) {
  const {
    gate_id,
    approval_ledger_id,
    approval_ledger_status,
    approval_granted_at,
    approval_revoked,
    supplied_token,
    bound_token_hash,
    expiry_ms,
    checked_at,
  } = params || {};

  const ts = checked_at ?? new Date().toISOString();

  if (!gate_id || String(gate_id).trim() === '' ||
      !approval_ledger_id || String(approval_ledger_id).trim() === '') {
    return {
      schema_version:          SCHEMA_VERSION,
      approval_gate_status:    'APPROVAL_GATE_BLOCKED_INPUT',
      blocked_reason:          'gate_id and approval_ledger_id are required.',
      gate_id:                 gate_id ?? null,
      gate_id_hash:            _sha256(gate_id ?? ''),
      approval_active:         false,
      checked_at:              ts,
      ..._locked(),
    };
  }

  // Revoked check
  if (approval_revoked === true || approval_ledger_status === 'APPROVAL_LEDGER_EMPTY') {
    return {
      schema_version:          SCHEMA_VERSION,
      approval_gate_status:    'APPROVAL_GATE_REVOKED',
      blocked_reason:          'approval was revoked or is not active.',
      gate_id,
      gate_id_hash:            _sha256(gate_id),
      approval_ledger_id,
      approval_active:         false,
      checked_at:              ts,
      ..._locked(),
    };
  }

  // Expiry check
  if (approval_granted_at) {
    const grantedMs = new Date(approval_granted_at).getTime();
    const checkedMs = new Date(ts).getTime();
    const windowMs = typeof expiry_ms === 'number' ? expiry_ms : DEFAULT_EXPIRY_MS;
    if (!isNaN(grantedMs) && !isNaN(checkedMs) && (checkedMs - grantedMs) > windowMs) {
      return {
        schema_version:          SCHEMA_VERSION,
        approval_gate_status:    'APPROVAL_GATE_EXPIRED',
        blocked_reason:          `approval expired after ${windowMs}ms.`,
        gate_id,
        gate_id_hash:            _sha256(gate_id),
        approval_ledger_id,
        approval_granted_at,
        expiry_ms:               windowMs,
        approval_active:         false,
        checked_at:              ts,
        ..._locked(),
      };
    }
  }

  // Token mismatch check
  if (bound_token_hash && supplied_token !== undefined && supplied_token !== null) {
    const suppliedHash = _sha256(supplied_token);
    if (suppliedHash !== bound_token_hash) {
      return {
        schema_version:          SCHEMA_VERSION,
        approval_gate_status:    'APPROVAL_GATE_TOKEN_MISMATCH',
        blocked_reason:          'supplied token does not match bound approval token.',
        gate_id,
        gate_id_hash:            _sha256(gate_id),
        approval_ledger_id,
        supplied_token_hash:     suppliedHash,
        approval_active:         false,
        checked_at:              ts,
        ..._locked(),
      };
    }
  }

  return {
    schema_version:          SCHEMA_VERSION,
    approval_gate_status:    'APPROVAL_GATE_ACTIVE',
    gate_id,
    gate_id_hash:            _sha256(gate_id),
    approval_ledger_id,
    approval_granted_at:     approval_granted_at ?? null,
    expiry_ms:               typeof expiry_ms === 'number' ? expiry_ms : DEFAULT_EXPIRY_MS,
    supplied_token_hash:     supplied_token !== undefined && supplied_token !== null ? _sha256(supplied_token) : null,
    approval_active:         true,
    checked_at:              ts,
    ..._locked(),
  };
}

export function validateHumanApprovalExpirationGate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'approval_gate_status', 'gate_id_hash',
    'approval_active', 'checked_at',
    'human_approval_required', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.human_approval_required !== true)  errors.push('human_approval_required must be true');
  if (result.execution_performed     !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted         !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed        !== false) errors.push('deploy_performed must be false');
  if (result.release_performed       !== false) errors.push('release_performed must be false');
  if (!APPROVAL_GATE_STATUSES.includes(result.approval_gate_status)) {
    errors.push(`invalid approval_gate_status: ${result.approval_gate_status}`);
  }
  if (result.approval_gate_status === 'APPROVAL_GATE_ACTIVE' && result.approval_active !== true) {
    errors.push('ACTIVE status requires approval_active=true');
  }
  if (result.approval_gate_status !== 'APPROVAL_GATE_ACTIVE' && result.approval_active === true) {
    errors.push('non-ACTIVE status cannot have approval_active=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderHumanApprovalExpirationGate(result) {
  if (!result || typeof result !== 'object') {
    return '[HUMAN_APPROVAL_EXPIRATION_GATE] No result to render.';
  }
  const lines = [
    `=== Human Approval Expiration Gate [${SCHEMA_VERSION}] ===`,
    `Status:                  ${result.approval_gate_status ?? 'N/A'}`,
    `Gate ID:                 ${result.gate_id ?? 'N/A'}`,
    `Approval ledger ID:      ${result.approval_ledger_id ?? 'N/A'}`,
    `Approval active:         ${result.approval_active}`,
    `Granted at:              ${result.approval_granted_at ?? 'N/A'}`,
    `Expiry window (ms):      ${result.expiry_ms ?? DEFAULT_EXPIRY_MS}`,
    `Checked at:              ${result.checked_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `human_approval_required=true | execution_performed=false | stable_promoted=false`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:          ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('human-approval-expiration-gate.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildHumanApprovalExpirationGate({
    gate_id:               'v156.1-gate',
    approval_ledger_id:    'v156.0-ledger',
    approval_ledger_status:'APPROVAL_LEDGER_READY',
    approval_granted_at:   new Date().toISOString(),
    supplied_token:        'correct-token',
    bound_token_hash:      _sha256('correct-token'),
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderHumanApprovalExpirationGate(result));
  }
  const v = validateHumanApprovalExpirationGate(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
