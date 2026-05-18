#!/usr/bin/env node
/**
 * Controlled Real Tag Creation Gate — V73.0
 *
 * Validates conditions for real tag creation. Does NOT create tag.
 * Requires explicit future human command. tag_created=false always.
 *
 * REGRA ABSOLUTA: tag_created=false always. git_push_performed=false always.
 * production_execution_locked=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v73.0';

export const TAG_GATE_STATUSES = [
  'TAG_GATE_BLOCKED_DECISION',
  'TAG_GATE_BLOCKED_EVIDENCE',
  'TAG_GATE_BLOCKED_TAG_NAME',
  'TAG_GATE_BLOCKED_GIT_HEAD',
  'TAG_GATE_READY_REQUIRES_COMMAND',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:                  false,
    promotion_allowed:               false,
    stable_allowed:                  false,
    tag_allowed:                     false,
    release_execution_allowed:       false,
    release_performed:               false,
    tag_created:                     false,
    stable_promoted:                 false,
    deploy_performed:                false,
    production_execution_locked:     true,
    unlock_executed:                 false,
    git_push_performed:              false,
    explicit_real_command_required:  true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                  SCHEMA_VERSION,
    tag_gate_status:                 status,
    tag_creation_ready:              false,
    blocking_reason,
    ...extra,
    deploy_allowed:                  false,
    promotion_allowed:               false,
    stable_allowed:                  false,
    tag_allowed:                     false,
    release_execution_allowed:       false,
    release_performed:               false,
    tag_created:                     false,
    stable_promoted:                 false,
    deploy_performed:                false,
    production_execution_locked:     true,
    unlock_executed:                 false,
    git_push_performed:              false,
    explicit_real_command_required:  true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

export function evaluateControlledRealTagGate(params = {}) {
  const {
    real_execution_decision,
    evidence_receipt_id,
    evidence_source,
    target_tag,
    target_version,
    git_head,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const gate_id = _sha256(`fixture-tag-gate:${now}`).slice(0, 24);
    return {
      schema_version:                  SCHEMA_VERSION,
      tag_gate_id:                     gate_id,
      tag_gate_status:                 'TAG_GATE_READY_REQUIRES_COMMAND',
      tag_creation_ready:              true,
      target_tag:                      'v0.0.0-fixture',
      target_version:                  'v0.0.0-fixture',
      git_head:                        'fixture-git-head',
      evidence_receipt_id:             'fixture-receipt-id',
      evidence_source:                 'go-core',
      real_execution_decision_status:  'REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND',
      blocking_reason:                 null,
      created_at:                      now,
      ..._locked(),
    };
  }

  // Decision required
  const validDecisions = [
    'REAL_EXEC_DECISION_DRY_RUN_READY',
    'REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND',
  ];
  if (!real_execution_decision || !validDecisions.includes(real_execution_decision.real_execution_decision_status)) {
    return _blocked('TAG_GATE_BLOCKED_DECISION', 'real_execution_decision_not_ready', {
      real_execution_decision_status: real_execution_decision?.real_execution_decision_status ?? null,
    });
  }

  // Evidence required
  if (evidence_source !== 'go-core') {
    return _blocked('TAG_GATE_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: evidence_source ?? null,
    });
  }
  if (!evidence_receipt_id) {
    return _blocked('TAG_GATE_BLOCKED_EVIDENCE', 'evidence_receipt_id_required', {});
  }

  // Tag name must start with 'v'
  if (!target_tag || !String(target_tag).startsWith('v')) {
    return _blocked('TAG_GATE_BLOCKED_TAG_NAME', 'target_tag_must_start_with_v', {
      target_tag: target_tag ?? null,
    });
  }

  // Git head required
  if (!git_head) {
    return _blocked('TAG_GATE_BLOCKED_GIT_HEAD', 'git_head_required', {});
  }

  const gate_id = _sha256([
    'tag-gate',
    target_tag,
    git_head,
    evidence_receipt_id,
    now,
  ].join(':')).slice(0, 24);

  return {
    schema_version:                  SCHEMA_VERSION,
    tag_gate_id:                     gate_id,
    tag_gate_status:                 'TAG_GATE_READY_REQUIRES_COMMAND',
    tag_creation_ready:              true,
    target_tag,
    target_version:                  target_version ?? null,
    git_head,
    evidence_receipt_id,
    evidence_source,
    real_execution_decision_status:  real_execution_decision.real_execution_decision_status,
    blocking_reason:                 null,
    created_at:                      now,
    ..._locked(),
  };
}

export function validateControlledRealTagGate(gate) {
  if (!gate)                                                    return { valid: false, reason: 'TAG_GATE_BLOCKED_DECISION' };
  if (gate.schema_version !== SCHEMA_VERSION)                  return { valid: false, reason: 'invalid_schema' };
  if (gate.tag_gate_status !== 'TAG_GATE_READY_REQUIRES_COMMAND') return { valid: false, reason: gate.tag_gate_status };
  if (gate.tag_created !== false)                              return { valid: false, reason: 'invariant_violation' };
  if (gate.git_push_performed !== false)                       return { valid: false, reason: 'invariant_violation' };
  if (gate.production_execution_locked !== true)               return { valid: false, reason: 'invariant_violation' };
  return { valid: true, reason: null };
}

export function renderControlledRealTagGate(gate) {
  if (!gate) return 'controlled_real_tag_creation_gate: null';
  return [
    `tag_gate_status                : ${gate.tag_gate_status ?? 'UNKNOWN'}`,
    `tag_gate_id                    : ${gate.tag_gate_id ?? 'none'}`,
    `target_tag                     : ${gate.target_tag ?? 'none'}`,
    `evidence_source                : ${gate.evidence_source ?? 'none'}`,
    `tag_creation_ready             : ${gate.tag_creation_ready ?? false}`,
    `explicit_real_command_required : true`,
    `tag_created                    : false`,
    `git_push_performed             : false`,
    `production_execution_locked    : true`,
    `blocking_reason                : ${gate.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('controlled-real-tag-creation-gate.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateControlledRealTagGate({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledRealTagGate(result));
  }

  process.exit(result.tag_creation_ready ? 0 : 1);
}
