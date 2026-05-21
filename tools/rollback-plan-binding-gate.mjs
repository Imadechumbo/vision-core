#!/usr/bin/env node
/**
 * Rollback Plan Binding Gate — V153.0
 *
 * Verifies that a rollback plan is fully bound: plan ID present, rollback
 * anchor (git ref / snapshot ID) verified, and a dry-run has been completed
 * for the rollback steps.
 *
 * Statuses:
 *   ROLLBACK_BINDING_BLOCKED_INPUT    — missing required inputs
 *   ROLLBACK_BINDING_BLOCKED_ANCHOR   — rollback anchor missing or unverified
 *   ROLLBACK_BINDING_BLOCKED_DRY_RUN  — rollback dry run not completed
 *   ROLLBACK_BINDING_READY            — rollback plan fully bound
 *
 * REGRA ABSOLUTA: rollback_required=true, rollback_executed=false,
 * execution_performed=false, stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v153.0';

export const ROLLBACK_BINDING_STATUSES = [
  'ROLLBACK_BINDING_BLOCKED_INPUT',
  'ROLLBACK_BINDING_BLOCKED_ANCHOR',
  'ROLLBACK_BINDING_BLOCKED_DRY_RUN',
  'ROLLBACK_BINDING_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    rollback_required:    true,
    rollback_executed:    false,
    execution_performed:  false,
    stable_promoted:      false,
    deploy_performed:     false,
    release_performed:    false,
  };
}

export function buildRollbackPlanBindingGate(params) {
  const {
    binding_id,
    rollback_plan_id,
    rollback_anchor_ref,
    rollback_anchor_verified     = false,
    rollback_steps_count         = 0,
    rollback_dry_run_completed   = false,
    bound_at,
  } = params || {};

  const binding_id_hash = _sha256([binding_id, rollback_plan_id, rollback_anchor_ref].join('|'));
  const ts = bound_at ?? new Date().toISOString();

  if (!binding_id || String(binding_id).trim() === '' || !rollback_plan_id) {
    return {
      binding_id_hash,
      schema_version:           SCHEMA_VERSION,
      rollback_binding_status:  'ROLLBACK_BINDING_BLOCKED_INPUT',
      blocked_reason:           'binding_id and rollback_plan_id are required.',
      binding_ready:            false,
      bound_at:                 ts,
      ..._locked(),
    };
  }

  if (!rollback_anchor_ref || String(rollback_anchor_ref).trim() === '' || !rollback_anchor_verified) {
    return {
      binding_id_hash,
      schema_version:           SCHEMA_VERSION,
      rollback_binding_status:  'ROLLBACK_BINDING_BLOCKED_ANCHOR',
      blocked_reason:           'rollback_anchor_ref and rollback_anchor_verified=true required.',
      binding_ready:            false,
      binding_id,
      rollback_plan_id,
      rollback_anchor_verified,
      bound_at:                 ts,
      ..._locked(),
    };
  }

  if (!rollback_dry_run_completed || rollback_steps_count < 1) {
    return {
      binding_id_hash,
      schema_version:           SCHEMA_VERSION,
      rollback_binding_status:  'ROLLBACK_BINDING_BLOCKED_DRY_RUN',
      blocked_reason:           'rollback_dry_run_completed=true and rollback_steps_count>=1 required.',
      binding_ready:            false,
      binding_id,
      rollback_plan_id,
      rollback_anchor_ref,
      rollback_anchor_verified,
      rollback_steps_count,
      rollback_dry_run_completed,
      bound_at:                 ts,
      ..._locked(),
    };
  }

  return {
    binding_id_hash,
    schema_version:              SCHEMA_VERSION,
    rollback_binding_status:     'ROLLBACK_BINDING_READY',
    binding_ready:               true,
    binding_id,
    rollback_plan_id,
    rollback_anchor_ref,
    rollback_anchor_verified,
    rollback_steps_count,
    rollback_dry_run_completed,
    bound_at:                    ts,
    ..._locked(),
  };
}

export function validateRollbackPlanBindingGate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'binding_id_hash', 'schema_version', 'rollback_binding_status',
    'binding_ready',
    'rollback_required', 'rollback_executed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.rollback_required   !== true)  errors.push('rollback_required must be true');
  if (result.rollback_executed   !== false) errors.push('rollback_executed must be false');
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted     !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed    !== false) errors.push('deploy_performed must be false');
  if (result.release_performed   !== false) errors.push('release_performed must be false');
  if (!ROLLBACK_BINDING_STATUSES.includes(result.rollback_binding_status)) {
    errors.push(`invalid rollback_binding_status: ${result.rollback_binding_status}`);
  }
  if (result.rollback_binding_status === 'ROLLBACK_BINDING_READY') {
    if (result.binding_ready !== true) errors.push('READY requires binding_ready=true');
    if (!result.rollback_anchor_verified) errors.push('READY requires rollback_anchor_verified=true');
    if (!result.rollback_dry_run_completed) errors.push('READY requires rollback_dry_run_completed=true');
    if (result.rollback_steps_count < 1) errors.push('READY requires rollback_steps_count>=1');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRollbackPlanBindingGate(result) {
  if (!result || typeof result !== 'object') {
    return '[ROLLBACK_PLAN_BINDING_GATE] No result to render.';
  }
  const lines = [
    `=== Rollback Plan Binding Gate [${SCHEMA_VERSION}] ===`,
    `Status:                       ${result.rollback_binding_status ?? 'N/A'}`,
    `Binding ID:                   ${result.binding_id ?? 'N/A'}`,
    `Rollback plan ID:             ${result.rollback_plan_id ?? 'N/A'}`,
    `Binding ready:                ${result.binding_ready}`,
    `--- Anchor ---`,
    `rollback_anchor_ref:          ${result.rollback_anchor_ref ?? 'N/A'}`,
    `rollback_anchor_verified:     ${result.rollback_anchor_verified}`,
    `--- Dry run ---`,
    `rollback_steps_count:         ${result.rollback_steps_count ?? 0}`,
    `rollback_dry_run_completed:   ${result.rollback_dry_run_completed}`,
    `--- REGRA ABSOLUTA ---`,
    `rollback_required=true | rollback_executed=false | execution_performed=false`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:               ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('rollback-plan-binding-gate.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildRollbackPlanBindingGate({
    binding_id:                  'v153.0-binding',
    rollback_plan_id:            'rbp-001',
    rollback_anchor_ref:         'refs/tags/v1.0.0-pre',
    rollback_anchor_verified:    true,
    rollback_steps_count:        3,
    rollback_dry_run_completed:  true,
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRollbackPlanBindingGate(result));
  }
  const v = validateRollbackPlanBindingGate(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
