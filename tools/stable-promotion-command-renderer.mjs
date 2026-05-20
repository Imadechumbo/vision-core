#!/usr/bin/env node
/**
 * Stable Promotion Command Renderer — V117.1
 *
 * Renders command package as copy/paste-safe human instruction block.
 * Does NOT execute anything.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v117.1';

export const COMMAND_RENDER_STATUSES = [
  'COMMAND_RENDER_BLOCKED_PACKAGE',
  'COMMAND_RENDER_READY',
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
    copy_paste_safe:          true,
    human_only:               true,
    no_ci:                    true,
    no_automation:            true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    render_status:   status,
    render_ready:    false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _blockId(package_id) {
  return _sha256([package_id || '', 'render-v117.1'].join('|'));
}

export function renderStablePromotionCommandBlock(params) {
  const { stable_promotion_command_package } = params || {};

  if (!stable_promotion_command_package || !stable_promotion_command_package.package_ready) {
    return _blocked('COMMAND_RENDER_BLOCKED_PACKAGE', 'stable_promotion_command_package not ready');
  }

  const pkg = stable_promotion_command_package;
  const command_block_id = _blockId(pkg.package_id);

  const rendered_preflight   = pkg.preflight_commands || [];
  const rendered_promotion   = pkg.future_promotion_commands || [];
  const rendered_verification = pkg.verification_commands || [];
  const rendered_rollback    = pkg.rollback_commands || [];
  const rendered_forbidden   = pkg.forbidden_commands || [];

  return {
    schema_version:        SCHEMA_VERSION,
    command_block_id,
    render_status:         'COMMAND_RENDER_READY',
    render_ready:          true,
    package_id:            pkg.package_id,
    target_stable_ref:     pkg.target_stable_ref,
    target_tag:            pkg.target_tag,
    rendered_preflight,
    rendered_promotion,
    rendered_verification,
    rendered_rollback,
    rendered_forbidden,
    ..._locked(),
  };
}

export function validateStablePromotionCommandBlock(block) {
  if (!block || typeof block !== 'object') {
    return { valid: false, errors: ['block is null/undefined'] };
  }

  const errors = [];

  if (!COMMAND_RENDER_STATUSES.includes(block.render_status)) {
    errors.push(`invalid render_status: ${block.render_status}`);
  }
  if (block.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (block.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (block.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (block.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (block.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (block.release_performed !== false) errors.push('release_performed must be false');
  if (block.copy_paste_safe !== true) errors.push('copy_paste_safe must be true');
  if (block.human_only !== true) errors.push('human_only must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionHumanInstructions(block) {
  if (!block || !block.render_ready) {
    return `[COMMAND RENDER BLOCKED] ${block?.render_status || 'unknown'}: ${block?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION HUMAN INSTRUCTIONS ===`,
    `Schema:          ${block.schema_version}`,
    `Block ID:        ${block.command_block_id}`,
    `Target Ref:      ${block.target_stable_ref}`,
    `Target Tag:      ${block.target_tag}`,
    ``,
    `--- PREFLIGHT (run first) ---`,
    ...block.rendered_preflight.map(c => `  $ ${c}`),
    ``,
    `--- STABLE PROMOTION COMMANDS (future human only) ---`,
    ...block.rendered_promotion.map(c => `  $ ${c}`),
    ``,
    `--- VERIFICATION ---`,
    ...block.rendered_verification.map(c => `  $ ${c}`),
    ``,
    `--- ROLLBACK (if needed) ---`,
    ...block.rendered_rollback.map(c => `  $ ${c}`),
    ``,
    `--- FORBIDDEN ---`,
    ...block.rendered_forbidden.map(c => `  ! ${c}`),
    ``,
    `stable_promotion_allowed:  ${block.stable_promotion_allowed}`,
    `stable_promoted:           ${block.stable_promoted}`,
    `human_only:                ${block.human_only}`,
    `no_ci:                     ${block.no_ci}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-command-renderer.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockPackage = {
    package_ready:             true,
    package_id:                'mock-pkg-v1171',
    target_stable_ref:         'stable',
    target_tag:                'v117.1-mock',
    preflight_commands:        ['git fetch origin', 'git status'],
    future_promotion_commands: ['git branch -f stable v117.1-mock', 'git push origin stable'],
    verification_commands:     ['git log origin/stable --oneline -3'],
    rollback_commands:         ['git branch -f stable <ROLLBACK>', 'git push origin stable'],
    forbidden_commands:        ['deploy', 'release'],
  };

  const block = renderStablePromotionCommandBlock({ stable_promotion_command_package: mockPackage });

  if (isJson) {
    console.log(JSON.stringify(block, null, 2));
  } else {
    console.log(renderStablePromotionHumanInstructions(block));
  }
}
