#!/usr/bin/env node
/**
 * Real Tag Rollback Anchor — V77.1
 *
 * Records pre-tag state for rollback purposes.
 * Provides rollback command preview only — does NOT execute rollback.
 *
 * REGRA ABSOLUTA: rollback_executed=false always.
 * tag_created=false always. git_push_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v77.1';

export const TAG_ROLLBACK_ANCHOR_STATUSES = [
  'TAG_ROLLBACK_ANCHOR_BLOCKED_SAFETY',
  'TAG_ROLLBACK_ANCHOR_BLOCKED_EVIDENCE',
  'TAG_ROLLBACK_ANCHOR_BLOCKED_HASH',
  'TAG_ROLLBACK_ANCHOR_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:        false,
    rollback_executed:  false,
    git_push_performed: false,
    deploy_performed:   false,
    stable_promoted:    false,
    release_performed:  false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:             SCHEMA_VERSION,
    rollback_anchor_status:     status,
    anchor_ready:               false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function createRealTagRollbackAnchor(params = {}) {
  const {
    fixture_mode        = false,
    safety_result,
    target_tag,
    git_head_before_tag,
    current_branch,
    remote_name,
    evidence_receipt_id,
    evidence_source,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const fixTag    = 'v1.2.3';
    const fixHead   = 'abc1234def5678901234567890123456789012ab';
    const anchor_hash = _sha256(`real-tag-rollback-anchor:${SCHEMA_VERSION}:${fixTag}:${fixHead}:fixture`).slice(0, 32);
    const anchor_id   = _sha256(`anchor-id:${anchor_hash}:${now}`).slice(0, 24);
    return {
      schema_version:             SCHEMA_VERSION,
      rollback_anchor_id:         anchor_id,
      rollback_anchor_status:     'TAG_ROLLBACK_ANCHOR_READY',
      anchor_ready:               true,
      blocking_reason:            null,
      target_tag:                 fixTag,
      git_head_before_tag:        fixHead,
      current_branch:             'main',
      remote_name:                'origin',
      evidence_receipt_id:        'receipt-fixture-id',
      evidence_source:            'go-core',
      safety_status:              'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND',
      anchor_hash,
      rollback_commands_preview:  [
        `git tag -d ${fixTag}`,
        `git push origin :refs/tags/${fixTag}`,
      ],
      created_at:                 now,
      ..._locked(),
    };
  }

  // Safety check
  if (!safety_result?.tag_safety_ready) {
    return _blocked('TAG_ROLLBACK_ANCHOR_BLOCKED_SAFETY', 'safety_validator_not_ready', {
      rollback_anchor_id: null,
      created_at: now,
    });
  }

  // Evidence check
  if (evidence_source !== 'go-core') {
    return _blocked('TAG_ROLLBACK_ANCHOR_BLOCKED_EVIDENCE', 'evidence_source_not_go_core', {
      rollback_anchor_id: null,
      created_at: now,
    });
  }

  // Required fields
  if (!target_tag || !git_head_before_tag) {
    return _blocked('TAG_ROLLBACK_ANCHOR_BLOCKED_HASH', 'required_fields_missing_for_hash', {
      rollback_anchor_id: null,
      created_at: now,
    });
  }

  const anchor_hash = _sha256(
    `real-tag-rollback-anchor:${SCHEMA_VERSION}:${target_tag}:${git_head_before_tag}:${evidence_receipt_id ?? ''}`
  ).slice(0, 32);
  const rollback_anchor_id = _sha256(`anchor-id:${anchor_hash}:${now}`).slice(0, 24);

  return {
    schema_version:             SCHEMA_VERSION,
    rollback_anchor_id,
    rollback_anchor_status:     'TAG_ROLLBACK_ANCHOR_READY',
    anchor_ready:               true,
    blocking_reason:            null,
    target_tag,
    git_head_before_tag,
    current_branch:             current_branch ?? null,
    remote_name:                remote_name ?? 'origin',
    evidence_receipt_id:        evidence_receipt_id ?? null,
    evidence_source,
    safety_status:              safety_result.tag_safety_status,
    anchor_hash,
    rollback_commands_preview:  [
      `git tag -d ${target_tag}`,
      `git push origin :refs/tags/${target_tag}`,
    ],
    created_at:                 now,
    ..._locked(),
  };
}

export function validateRealTagRollbackAnchor(anchor) {
  if (!anchor || typeof anchor !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!TAG_ROLLBACK_ANCHOR_STATUSES.includes(anchor.rollback_anchor_status))
    return { valid: false, reason: 'unknown_status' };
  if (anchor.rollback_executed  === true) return { valid: false, reason: 'rollback_executed_must_be_false' };
  if (anchor.tag_created        === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (anchor.git_push_performed === true) return { valid: false, reason: 'git_push_must_be_false' };
  return { valid: true };
}

export function renderRealTagRollbackAnchor(anchor) {
  if (!anchor) return 'real_tag_rollback_anchor: null';
  const cmds = Array.isArray(anchor.rollback_commands_preview)
    ? anchor.rollback_commands_preview.join(' | ')
    : 'none';
  return [
    `rollback_anchor_status      : ${anchor.rollback_anchor_status ?? 'UNKNOWN'}`,
    `rollback_anchor_id          : ${anchor.rollback_anchor_id ?? 'none'}`,
    `target_tag                  : ${anchor.target_tag ?? 'none'}`,
    `git_head_before_tag         : ${anchor.git_head_before_tag ?? 'none'}`,
    `anchor_hash                 : ${anchor.anchor_hash ?? 'none'}`,
    `rollback_commands_preview   : ${cmds}`,
    `rollback_executed           : false`,
    `tag_created                 : false`,
    `git_push_performed          : false`,
    `blocking_reason             : ${anchor.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-tag-rollback-anchor.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createRealTagRollbackAnchor({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagRollbackAnchor(result));
  }

  process.exit(result.anchor_ready ? 0 : 1);
}
