#!/usr/bin/env node
/**
 * Stable Promotion Final Command Seal — V122.1
 *
 * Seals the stable promotion commands with a tamper-evident hash.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false,
 * seal_executes_nothing=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v122.1';

export const COMMAND_SEAL_STATUSES = [
  'COMMAND_SEAL_BLOCKED_SNAPSHOT',
  'COMMAND_SEAL_BLOCKED_PACKAGE',
  'COMMAND_SEAL_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed: false,
    stable_promoted:          false,
    git_push_performed:       false,
    deploy_performed:         false,
    release_performed:        false,
    seal_executes_nothing:    true,
    sealed_commands_are_future_human_only: true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    seal_status:     status,
    seal_ready:      false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _sealId(snapshot_id, package_id) {
  return _sha256([snapshot_id || '', package_id || '', 'seal-v122.1'].join('|'));
}

function _commandsHash(commands) {
  return _sha256(JSON.stringify(commands || []));
}

export function sealStablePromotionFinalCommands(params) {
  const {
    stable_promotion_preflight_snapshot,
    stable_promotion_command_package,
  } = params || {};

  if (!stable_promotion_preflight_snapshot || !stable_promotion_preflight_snapshot.snapshot_ready) {
    return _blocked('COMMAND_SEAL_BLOCKED_SNAPSHOT', 'stable_promotion_preflight_snapshot not ready');
  }

  if (!stable_promotion_command_package || !stable_promotion_command_package.package_ready) {
    return _blocked('COMMAND_SEAL_BLOCKED_PACKAGE', 'stable_promotion_command_package not ready');
  }

  const snap = stable_promotion_preflight_snapshot;
  const pkg  = stable_promotion_command_package;

  const seal_id = _sealId(snap.snapshot_id, pkg.package_id);

  const sealed_preflight   = pkg.preflight_commands   || [];
  const sealed_promotion   = pkg.future_promotion_commands || [];
  const sealed_verification = pkg.verification_commands || [];
  const sealed_rollback    = pkg.rollback_commands     || [];
  const sealed_forbidden   = pkg.forbidden_commands    || [];

  const commands_seal_hash = _commandsHash({
    preflight:    sealed_preflight,
    promotion:    sealed_promotion,
    verification: sealed_verification,
    rollback:     sealed_rollback,
  });

  return {
    schema_version:         SCHEMA_VERSION,
    seal_id,
    seal_status:            'COMMAND_SEAL_READY',
    seal_ready:             true,
    snapshot_id:            snap.snapshot_id,
    package_id:             pkg.package_id,
    target_stable_ref:      snap.target_stable_ref,
    target_tag:             snap.target_tag,
    all_gates_passed:       snap.all_gates_passed,
    sealed_preflight,
    sealed_promotion,
    sealed_verification,
    sealed_rollback,
    sealed_forbidden,
    commands_seal_hash,
    ..._locked(),
  };
}

export function validateStablePromotionFinalCommandSeal(seal) {
  if (!seal || typeof seal !== 'object') {
    return { valid: false, errors: ['seal is null/undefined'] };
  }

  const errors = [];

  if (!COMMAND_SEAL_STATUSES.includes(seal.seal_status)) {
    errors.push(`invalid seal_status: ${seal.seal_status}`);
  }
  if (seal.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (seal.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (seal.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (seal.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (seal.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (seal.release_performed !== false) errors.push('release_performed must be false');
  if (seal.seal_executes_nothing !== true) errors.push('seal_executes_nothing must be true');
  if (seal.sealed_commands_are_future_human_only !== true) errors.push('sealed_commands_are_future_human_only must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionFinalCommandSeal(seal) {
  if (!seal || !seal.seal_ready) {
    return `[COMMAND SEAL BLOCKED] ${seal?.seal_status || 'unknown'}: ${seal?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION FINAL COMMAND SEAL ===`,
    `Schema:                  ${seal.schema_version}`,
    `Seal ID:                 ${seal.seal_id}`,
    `Status:                  ${seal.seal_status}`,
    `Snapshot ID:             ${seal.snapshot_id}`,
    `Package ID:              ${seal.package_id}`,
    `Target Ref:              ${seal.target_stable_ref}`,
    `Target Tag:              ${seal.target_tag}`,
    `All Gates Passed:        ${seal.all_gates_passed}`,
    `Commands Seal Hash:      ${seal.commands_seal_hash}`,
    ``,
    `--- SEALED PREFLIGHT ---`,
    ...seal.sealed_preflight.map(c => `  $ ${c}`),
    ``,
    `--- SEALED PROMOTION (FUTURE HUMAN ONLY) ---`,
    ...seal.sealed_promotion.map(c => `  $ ${c}`),
    ``,
    `--- SEALED VERIFICATION ---`,
    ...seal.sealed_verification.map(c => `  $ ${c}`),
    ``,
    `--- SEALED FORBIDDEN ---`,
    ...seal.sealed_forbidden.map(c => `  ! ${c}`),
    ``,
    `stable_promotion_allowed:             ${seal.stable_promotion_allowed}`,
    `seal_executes_nothing:                ${seal.seal_executes_nothing}`,
    `sealed_commands_are_future_human_only: ${seal.sealed_commands_are_future_human_only}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-final-command-seal.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockSnapshot = {
    snapshot_ready:    true,
    snapshot_id:       'mock-snapshot-v1221',
    target_stable_ref: 'stable',
    target_tag:        'v122.1-mock',
    all_gates_passed:  true,
  };

  const mockPackage = {
    package_ready:             true,
    package_id:                'mock-pkg-v1221',
    preflight_commands:        ['git fetch origin', 'git status'],
    future_promotion_commands: ['git branch -f stable v122.1-mock', 'git push origin stable'],
    verification_commands:     ['git log origin/stable --oneline -3'],
    rollback_commands:         ['git branch -f stable <ROLLBACK>', 'git push origin stable'],
    forbidden_commands:        ['deploy', 'release'],
  };

  const seal = sealStablePromotionFinalCommands({
    stable_promotion_preflight_snapshot: mockSnapshot,
    stable_promotion_command_package:    mockPackage,
  });

  if (isJson) {
    console.log(JSON.stringify(seal, null, 2));
  } else {
    console.log(renderStablePromotionFinalCommandSeal(seal));
  }
}
