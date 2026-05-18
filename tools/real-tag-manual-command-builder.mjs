#!/usr/bin/env node
/**
 * Real Tag Manual Command Builder — V82.1
 *
 * Builds a preview of the git commands needed for real tag creation.
 * Commands are displayed for review ONLY — never executed here.
 *
 * REGRA ABSOLUTA: commands_execute_now=false always.
 * tag_created=false always. git_push_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v82.1';

export const MANUAL_COMMAND_BUILDER_STATUSES = [
  'MANUAL_COMMAND_BLOCKED_SAFETY_LOCK',
  'MANUAL_COMMAND_BLOCKED_TAG',
  'MANUAL_COMMAND_BLOCKED_HEAD',
  'MANUAL_COMMAND_READY_PREVIEW',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    commands_execute_now: false,
    tag_created:          false,
    git_push_performed:   false,
    deploy_performed:     false,
    stable_promoted:      false,
    release_performed:    false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:            SCHEMA_VERSION,
    command_builder_status:    status,
    command_preview_ready:     false,
    blocking_reason,
    tag_command:               null,
    push_command:              null,
    rollback_tag_command:      null,
    rollback_push_command:     null,
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagManualCommands(params = {}) {
  const {
    fixture_mode   = false,
    safety_lock,
    target_tag,
    target_git_head,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const builder_id = _sha256(`real-tag-manual-command-builder:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const tag = 'v1.2.3';
    const head = 'abc1234def5678901234567890123456789012ab';
    return {
      schema_version:           SCHEMA_VERSION,
      builder_id,
      command_builder_status:   'MANUAL_COMMAND_READY_PREVIEW',
      command_preview_ready:    true,
      blocking_reason:          null,
      target_tag:               tag,
      target_git_head:          head,
      tag_command:              `git tag -a ${tag} ${head} -m "Vision Core ${tag} PASS GOLD verified"`,
      push_command:             `git push origin refs/tags/${tag}`,
      rollback_tag_command:     `git tag -d ${tag}`,
      rollback_push_command:    `git push origin :refs/tags/${tag}`,
      created_at:               now,
      ..._locked(),
    };
  }

  // Safety lock check
  if (!safety_lock || safety_lock.safety_lock_ready !== true) {
    return _blocked('MANUAL_COMMAND_BLOCKED_SAFETY_LOCK', 'safety_lock_not_ready', {
      builder_id, created_at: now,
    });
  }

  // Tag check
  const resolvedTag = target_tag ?? safety_lock.target_tag;
  if (!resolvedTag || !resolvedTag.startsWith('v')) {
    return _blocked('MANUAL_COMMAND_BLOCKED_TAG', 'target_tag_invalid_or_missing', {
      builder_id, created_at: now,
    });
  }

  // Head check
  const resolvedHead = target_git_head ?? safety_lock.target_git_head;
  if (!resolvedHead) {
    return _blocked('MANUAL_COMMAND_BLOCKED_HEAD', 'target_git_head_missing', {
      builder_id, created_at: now,
    });
  }

  return {
    schema_version:           SCHEMA_VERSION,
    builder_id,
    command_builder_status:   'MANUAL_COMMAND_READY_PREVIEW',
    command_preview_ready:    true,
    blocking_reason:          null,
    target_tag:               resolvedTag,
    target_git_head:          resolvedHead,
    tag_command:              `git tag -a ${resolvedTag} ${resolvedHead} -m "Vision Core ${resolvedTag} PASS GOLD verified"`,
    push_command:             `git push origin refs/tags/${resolvedTag}`,
    rollback_tag_command:     `git tag -d ${resolvedTag}`,
    rollback_push_command:    `git push origin :refs/tags/${resolvedTag}`,
    created_at:               now,
    ..._locked(),
  };
}

export function validateRealTagManualCommands(builder) {
  if (!builder || typeof builder !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!MANUAL_COMMAND_BUILDER_STATUSES.includes(builder.command_builder_status))
    return { valid: false, reason: 'unknown_status' };
  if (builder.commands_execute_now === true) return { valid: false, reason: 'commands_must_not_execute_now' };
  if (builder.tag_created          === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (builder.git_push_performed   === true) return { valid: false, reason: 'git_push_must_be_false' };
  return { valid: true };
}

export function renderRealTagManualCommandPreview(builder) {
  if (!builder) return 'real_tag_manual_command_builder: null';
  return [
    `command_builder_status    : ${builder.command_builder_status ?? 'UNKNOWN'}`,
    `builder_id                : ${builder.builder_id ?? 'none'}`,
    `target_tag                : ${builder.target_tag ?? 'none'}`,
    `target_git_head           : ${builder.target_git_head ?? 'none'}`,
    `tag_command               : ${builder.tag_command ?? 'none'}`,
    `push_command              : ${builder.push_command ?? 'none'}`,
    `rollback_tag_command      : ${builder.rollback_tag_command ?? 'none'}`,
    `rollback_push_command     : ${builder.rollback_push_command ?? 'none'}`,
    `commands_execute_now      : false`,
    `tag_created               : false`,
    `git_push_performed        : false`,
    `blocking_reason           : ${builder.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-command-builder.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');
  const result  = buildRealTagManualCommands({ fixture_mode: fixture });
  if (json) console.log(JSON.stringify(result, null, 2));
  else      console.log(renderRealTagManualCommandPreview(result));
  process.exit(result.command_preview_ready ? 0 : 1);
}
