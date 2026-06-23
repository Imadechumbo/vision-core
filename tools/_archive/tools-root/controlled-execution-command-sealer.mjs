#!/usr/bin/env node
/**
 * Controlled Execution Command Sealer — V157.0
 *
 * Seals a controlled execution command into an immutable envelope.
 * Enforces forbidden scope rules and requires active human approval.
 *
 * Forbidden command scopes (never allowed):
 *   - Real deployment (deploy, release)
 *   - Real stable promotion
 *   - Any destructive production operation
 *
 * Statuses:
 *   COMMAND_SEALER_BLOCKED_INPUT    — missing sealer_id or command_text
 *   COMMAND_SEALER_FORBIDDEN_SCOPE  — command targets forbidden production scope
 *   COMMAND_SEALER_APPROVAL_REQUIRED — no active human approval
 *   COMMAND_SEALER_SEALED           — command sealed; ready for diff guard
 *
 * Invariants:
 *   command_sealed           = true  (always)
 *   command_executed         = false (always)
 *   forbidden_scope_enforced = true  (always)
 *   execution_performed      = false (always)
 *   stable_promoted          = false (always)
 *   deploy_performed         = false (always)
 *   release_performed        = false (always)
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v157.0';

export const COMMAND_SEALER_STATUSES = [
  'COMMAND_SEALER_BLOCKED_INPUT',
  'COMMAND_SEALER_FORBIDDEN_SCOPE',
  'COMMAND_SEALER_APPROVAL_REQUIRED',
  'COMMAND_SEALER_SEALED',
];

export const FORBIDDEN_COMMAND_SCOPES = [
  'REAL_DEPLOY',
  'REAL_RELEASE',
  'REAL_STABLE_PROMOTION',
  'REAL_PRODUCTION_EXECUTE',
  'REAL_TAG_PUSH',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    command_sealed:            true,
    command_executed:          false,
    forbidden_scope_enforced:  true,
    execution_performed:       false,
    stable_promoted:           false,
    deploy_performed:          false,
    release_performed:         false,
  };
}

function _isForbiddenScope(command_scope) {
  if (!command_scope) return false;
  return FORBIDDEN_COMMAND_SCOPES.includes(String(command_scope).toUpperCase());
}

export function buildControlledExecutionCommandSealer(params) {
  const {
    sealer_id,
    command_text,
    command_type,
    command_scope,
    approval_gate_status,
    approval_active,
    evidence_package_id,
    plan_id,
    sealed_at,
  } = params || {};

  const ts = sealed_at ?? new Date().toISOString();

  if (!sealer_id || String(sealer_id).trim() === '' ||
      !command_text || String(command_text).trim() === '') {
    return {
      schema_version:          SCHEMA_VERSION,
      command_sealer_status:   'COMMAND_SEALER_BLOCKED_INPUT',
      blocked_reason:          'sealer_id and command_text are required.',
      sealer_id:               sealer_id ?? null,
      sealer_id_hash:          _sha256(sealer_id ?? ''),
      command_hash:            null,
      sealed_at:               ts,
      ..._locked(),
    };
  }

  const command_hash = _sha256([sealer_id, command_text, command_type ?? '', ts].join('|'));

  if (_isForbiddenScope(command_scope)) {
    return {
      schema_version:          SCHEMA_VERSION,
      command_sealer_status:   'COMMAND_SEALER_FORBIDDEN_SCOPE',
      blocked_reason:          `command_scope '${command_scope}' is forbidden.`,
      sealer_id,
      sealer_id_hash:          _sha256(sealer_id),
      command_hash,
      command_scope,
      sealed_at:               ts,
      ..._locked(),
    };
  }

  const approvalOk = approval_active === true
    || approval_gate_status === 'APPROVAL_GATE_ACTIVE';

  if (!approvalOk) {
    return {
      schema_version:          SCHEMA_VERSION,
      command_sealer_status:   'COMMAND_SEALER_APPROVAL_REQUIRED',
      blocked_reason:          'active human approval is required to seal a command.',
      sealer_id,
      sealer_id_hash:          _sha256(sealer_id),
      command_hash,
      sealed_at:               ts,
      ..._locked(),
    };
  }

  return {
    schema_version:          SCHEMA_VERSION,
    command_sealer_status:   'COMMAND_SEALER_SEALED',
    sealer_id,
    sealer_id_hash:          _sha256(sealer_id),
    command_hash,
    command_type:            command_type ?? null,
    command_scope:           command_scope ?? null,
    evidence_package_id:     evidence_package_id ?? null,
    plan_id:                 plan_id ?? null,
    approval_gate_status:    approval_gate_status ?? null,
    sealed_at:               ts,
    ..._locked(),
  };
}

export function validateControlledExecutionCommandSealer(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'command_sealer_status', 'sealer_id_hash',
    'command_hash', 'sealed_at',
    'command_sealed', 'command_executed', 'forbidden_scope_enforced',
    'execution_performed', 'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.command_sealed            !== true)  errors.push('command_sealed must be true');
  if (result.command_executed          !== false) errors.push('command_executed must be false');
  if (result.forbidden_scope_enforced  !== true)  errors.push('forbidden_scope_enforced must be true');
  if (result.execution_performed       !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted           !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed          !== false) errors.push('deploy_performed must be false');
  if (result.release_performed         !== false) errors.push('release_performed must be false');
  if (!COMMAND_SEALER_STATUSES.includes(result.command_sealer_status)) {
    errors.push(`invalid command_sealer_status: ${result.command_sealer_status}`);
  }
  if (result.command_sealer_status === 'COMMAND_SEALER_SEALED') {
    if (!result.command_hash) errors.push('SEALED requires command_hash');
    if (!result.sealer_id) errors.push('SEALED requires sealer_id');
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledExecutionCommandSealer(result) {
  if (!result || typeof result !== 'object') {
    return '[CONTROLLED_EXECUTION_COMMAND_SEALER] No result to render.';
  }
  const lines = [
    `=== Controlled Execution Command Sealer [${SCHEMA_VERSION}] ===`,
    `Status:                  ${result.command_sealer_status ?? 'N/A'}`,
    `Sealer ID:               ${result.sealer_id ?? 'N/A'}`,
    `Command hash:            ${result.command_hash ?? 'N/A'}`,
    `Command type:            ${result.command_type ?? 'N/A'}`,
    `Command scope:           ${result.command_scope ?? 'N/A'}`,
    `Evidence package ID:     ${result.evidence_package_id ?? 'N/A'}`,
    `Plan ID:                 ${result.plan_id ?? 'N/A'}`,
    `Sealed at:               ${result.sealed_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `command_sealed=true | command_executed=false | forbidden_scope_enforced=true`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:          ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-execution-command-sealer.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildControlledExecutionCommandSealer({
    sealer_id:           'v157.0-sealer',
    command_text:        'git tag v1.33.0 && git push origin v1.33.0',
    command_type:        'CONTROLLED_RUNTIME_EXECUTION',
    command_scope:       'CONTROLLED_DRY_RUN',
    approval_gate_status:'APPROVAL_GATE_ACTIVE',
    evidence_package_id: 'v154.1-package',
    plan_id:             'v152.1-plan',
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledExecutionCommandSealer(result));
  }
  const v = validateControlledExecutionCommandSealer(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
