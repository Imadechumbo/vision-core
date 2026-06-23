#!/usr/bin/env node
/**
 * One Real Tag Rollback Readiness Gate — V108.1
 *
 * Confirms rollback readiness for a real tag or dry-run operation.
 * Does NOT execute rollback.
 *
 * REGRA ABSOLUTA: rollback_executed=false, deploy_performed=false,
 * stable_promoted=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v108.1';

export const ROLLBACK_READINESS_STATUSES = [
  'ROLLBACK_READINESS_BLOCKED_LEDGER',
  'ROLLBACK_READINESS_BLOCKED_TAG',
  'ROLLBACK_READINESS_DRY_RUN_READY',
  'ROLLBACK_READINESS_REAL_TAG_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    rollback_status:     status,
    rollback_ready:      false,
    blocking_reason:     reason,
    rollback_executed:   false,
    deploy_performed:    false,
    stable_promoted:     false,
    release_performed:   false,
    ...extra,
  };
}

function _rollbackCommands(target_tag) {
  return [
    `# ROLLBACK — delete tag locally and remotely`,
    `git tag -d ${target_tag}`,
    `git push origin :refs/tags/${target_tag}`,
  ].join('\n');
}

function _gateId(ledger_id, target_tag, git_head) {
  return _sha256([ledger_id, target_tag, git_head, 'rollback-gate-v108.1'].join('|'));
}

export function buildOneRealTagRollbackReadinessGate(params) {
  const {
    ledger,
    target_tag,
    git_head,
    rollback_anchor_id,
  } = params || {};

  // Validate ledger
  if (!ledger || !ledger.ledger_valid) {
    return _blocked('ROLLBACK_READINESS_BLOCKED_LEDGER', 'ledger not valid');
  }

  // Validate target_tag
  if (!target_tag || typeof target_tag !== 'string' || !target_tag.startsWith('v')) {
    return _blocked('ROLLBACK_READINESS_BLOCKED_TAG', 'target_tag missing or invalid');
  }

  // Validate git_head
  if (!git_head || typeof git_head !== 'string' || git_head.length < 7) {
    return _blocked('ROLLBACK_READINESS_BLOCKED_TAG', 'git_head missing or too short');
  }

  // Determine mode from ledger events
  const event_types = (ledger.events || []).map(e => e.event_type);
  const has_real_confirmed = event_types.includes('ONE_TAG_RECEIPT_REAL_TAG_CONFIRMED');
  const has_dry_confirmed  = event_types.includes('ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED');
  const has_packet         = event_types.includes('ONE_TAG_EXEC_PACKET_READY');

  const is_real = has_real_confirmed;
  const status  = is_real
    ? 'ROLLBACK_READINESS_REAL_TAG_READY'
    : 'ROLLBACK_READINESS_DRY_RUN_READY';

  const rollback_readiness_id = _gateId(ledger.ledger_id, target_tag, git_head);

  return {
    schema_version:       SCHEMA_VERSION,
    rollback_readiness_id,
    rollback_status:      status,
    rollback_ready:       true,
    rollback_required:    is_real,
    target_tag,
    git_head,
    rollback_anchor_id:   rollback_anchor_id || null,
    rollback_commands:    _rollbackCommands(target_tag),
    rollback_executed:    false,
    deploy_performed:     false,
    stable_promoted:      false,
    release_performed:    false,
  };
}

export function validateOneRealTagRollbackReadinessGate(gate) {
  if (!gate || typeof gate !== 'object') return { valid: false, errors: ['gate is null/undefined'] };

  const errors = [];

  if (!ROLLBACK_READINESS_STATUSES.includes(gate.rollback_status)) {
    errors.push(`invalid rollback_status: ${gate.rollback_status}`);
  }
  if (gate.schema_version !== SCHEMA_VERSION) errors.push(`invalid schema_version: ${gate.schema_version}`);
  if (gate.rollback_executed !== false) errors.push('rollback_executed must be false');
  if (gate.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (gate.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (gate.release_performed !== false) errors.push('release_performed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderOneRealTagRollbackReadinessGate(gate) {
  if (!gate || !gate.rollback_ready) {
    return `[ROLLBACK GATE BLOCKED] ${gate?.rollback_status || 'unknown'}: ${gate?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== ONE REAL TAG ROLLBACK READINESS GATE ===`,
    `Schema:         ${gate.schema_version}`,
    `Gate ID:        ${gate.rollback_readiness_id}`,
    `Status:         ${gate.rollback_status}`,
    `Target Tag:     ${gate.target_tag}`,
    `Git HEAD:       ${gate.git_head}`,
    `rollback_ready: ${gate.rollback_ready}`,
    `rollback_required: ${gate.rollback_required}`,
    `rollback_executed: ${gate.rollback_executed}`,
    ``,
    `--- ROLLBACK COMMANDS (execute only if needed) ---`,
    gate.rollback_commands,
    ``,
    `deploy=false | stable=false | release=false`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('one-real-tag-rollback-readiness-gate.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockLedger = {
    ledger_valid: true,
    ledger_id:    'mock-ledger-v1081',
    events: [
      { event_type: 'ONE_TAG_EXEC_PACKET_READY',        index: 0, event_hash: 'hash0', prev_hash: 'genesis', ref_id: 'p0', event_id: 'e0' },
      { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED', index: 1, event_hash: 'hash1', prev_hash: 'hash0',   ref_id: 'v0', event_id: 'e1' },
    ],
    deploy_performed:  false,
    stable_promoted:   false,
    release_performed: false,
  };

  const gate = buildOneRealTagRollbackReadinessGate({
    ledger:            mockLedger,
    target_tag:        'v108.1-mock',
    git_head:          '54b1663',
    rollback_anchor_id: 'mock-rollback-anchor-001',
  });

  if (isJson) {
    console.log(JSON.stringify(gate, null, 2));
  } else {
    console.log(renderOneRealTagRollbackReadinessGate(gate));
  }
}
