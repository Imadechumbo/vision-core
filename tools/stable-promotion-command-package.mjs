#!/usr/bin/env node
/**
 * Stable Promotion Command Package — V117.0
 *
 * Generates future stable promotion command strings. Does NOT execute anything.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v117.0';

export const STABLE_COMMAND_PACKAGE_STATUSES = [
  'COMMAND_PACKAGE_BLOCKED_BINDING',
  'COMMAND_PACKAGE_READY',
];

export const FORBIDDEN_COMMANDS = [
  'deploy',
  'release',
  'force_push_without_review',
  'evidence_override',
  'go_core_override',
  'automated_stable_promotion',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:     false,
    stable_promoted:              false,
    git_push_performed:           false,
    deploy_performed:             false,
    release_performed:            false,
    human_must_execute_manually:  true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    package_status:   status,
    package_ready:    false,
    blocking_reason:  reason,
    ..._locked(),
    ...extra,
  };
}

function _packageId(binding_id, target_stable_ref, target_tag) {
  return _sha256([binding_id || '', target_stable_ref || '', target_tag || '', 'pkg-v117.0'].join('|'));
}

export function buildStablePromotionCommandPackage(params) {
  const {
    stable_promotion_approval_binding,
    target_stable_ref,
    target_tag,
    git_head,
    rollback_anchor_id,
  } = params || {};

  if (!stable_promotion_approval_binding || !stable_promotion_approval_binding.binding_ready) {
    return _blocked('COMMAND_PACKAGE_BLOCKED_BINDING', 'stable_promotion_approval_binding not ready');
  }

  const ref  = target_stable_ref || 'stable';
  const tag  = target_tag || '<TAG>';
  const head = git_head || '<HEAD>';
  const anch = rollback_anchor_id || '<ROLLBACK_ANCHOR>';

  const preflight_commands = [
    `git fetch origin`,
    `git log --oneline -5`,
    `git status`,
  ];

  const future_promotion_commands = [
    `git branch -f ${ref} ${tag}`,
    `git push origin ${ref}`,
  ];

  const verification_commands = [
    `git log origin/${ref} --oneline -3`,
    `git tag --points-at ${tag}`,
  ];

  const rollback_commands = [
    `git branch -f ${ref} ${anch}`,
    `git push origin ${ref}`,
  ];

  const package_id = _packageId(
    stable_promotion_approval_binding.binding_id,
    ref,
    tag
  );

  return {
    schema_version:              SCHEMA_VERSION,
    package_id,
    package_status:              'COMMAND_PACKAGE_READY',
    package_ready:               true,
    approval_binding_id:         stable_promotion_approval_binding.binding_id || null,
    target_stable_ref:           ref,
    target_tag:                  tag,
    git_head:                    head,
    rollback_anchor_id:          anch,
    preflight_commands,
    future_promotion_commands,
    verification_commands,
    rollback_commands,
    forbidden_commands:          FORBIDDEN_COMMANDS,
    ..._locked(),
  };
}

export function validateStablePromotionCommandPackage(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    return { valid: false, errors: ['package is null/undefined'] };
  }

  const errors = [];

  if (!STABLE_COMMAND_PACKAGE_STATUSES.includes(pkg.package_status)) {
    errors.push(`invalid package_status: ${pkg.package_status}`);
  }
  if (pkg.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (pkg.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (pkg.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (pkg.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (pkg.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (pkg.release_performed !== false) errors.push('release_performed must be false');
  if (pkg.human_must_execute_manually !== true) errors.push('human_must_execute_manually must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionCommandPackage(pkg) {
  if (!pkg || !pkg.package_ready) {
    return `[COMMAND PACKAGE BLOCKED] ${pkg?.package_status || 'unknown'}: ${pkg?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION COMMAND PACKAGE ===`,
    `Schema:                    ${pkg.schema_version}`,
    `Package ID:                ${pkg.package_id}`,
    `Status:                    ${pkg.package_status}`,
    `Target Ref:                ${pkg.target_stable_ref}`,
    `Target Tag:                ${pkg.target_tag}`,
    ``,
    `Preflight: ${pkg.preflight_commands.join(' | ')}`,
    `Future Promotion: ${pkg.future_promotion_commands.join(' | ')}`,
    `Verification: ${pkg.verification_commands.join(' | ')}`,
    `Rollback: ${pkg.rollback_commands.join(' | ')}`,
    `Forbidden: ${pkg.forbidden_commands.join(', ')}`,
    ``,
    `stable_promotion_allowed:  ${pkg.stable_promotion_allowed}`,
    `stable_promoted:           ${pkg.stable_promoted}`,
    `human_must_execute_manually: ${pkg.human_must_execute_manually}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-command-package.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockBinding = { binding_ready: true, binding_id: 'mock-binding-v117' };

  const pkg = buildStablePromotionCommandPackage({
    stable_promotion_approval_binding: mockBinding,
    target_stable_ref:  'stable',
    target_tag:         'v117.0-mock',
    git_head:           'cafecafe1234567',
    rollback_anchor_id: 'rollback-mock-v117',
  });

  if (isJson) {
    console.log(JSON.stringify(pkg, null, 2));
  } else {
    console.log(renderStablePromotionCommandPackage(pkg));
  }
}
