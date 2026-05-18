#!/usr/bin/env node
/**
 * Controlled Stable Promotion Gate — V74.0
 *
 * Validates conditions for stable promotion. Does NOT promote stable.
 * Requires explicit future human command. stable_promoted=false always.
 *
 * REGRA ABSOLUTA: stable_promoted=false always. git_push_performed=false always.
 * production_execution_locked=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v74.0';

export const STABLE_GATE_STATUSES = [
  'STABLE_GATE_BLOCKED_TAG',
  'STABLE_GATE_BLOCKED_EVIDENCE',
  'STABLE_GATE_BLOCKED_TARGET',
  'STABLE_GATE_READY_REQUIRES_COMMAND',
];

export const STABLE_GATE_VALID_TARGETS = [
  'stable',
  'production/stable',
  'refs/heads/stable',
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
    schema_version:           SCHEMA_VERSION,
    stable_gate_status:       status,
    stable_promotion_ready:   false,
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

export function evaluateControlledStablePromotionGate(params = {}) {
  const {
    tag_dry_run,
    evidence_receipt_id,
    evidence_source,
    target_stable_ref,
    target_tag,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const gate_id = _sha256(`fixture-stable-gate:${now}`).slice(0, 24);
    return {
      schema_version:                  SCHEMA_VERSION,
      stable_gate_id:                  gate_id,
      stable_gate_status:              'STABLE_GATE_READY_REQUIRES_COMMAND',
      stable_promotion_ready:          true,
      target_stable_ref:               'stable',
      target_tag:                      'v0.0.0-fixture',
      evidence_receipt_id:             'fixture-receipt-id',
      evidence_source:                 'go-core',
      tag_dry_run_ready:               true,
      blocking_reason:                 null,
      created_at:                      now,
      ..._locked(),
    };
  }

  // Tag dry-run required
  if (!tag_dry_run || tag_dry_run.tag_dry_run_status !== 'TAG_DRY_RUN_READY') {
    return _blocked('STABLE_GATE_BLOCKED_TAG', 'tag_dry_run_not_ready', {
      tag_dry_run_status: tag_dry_run?.tag_dry_run_status ?? null,
      tag_dry_run_ready: false,
    });
  }

  // Evidence required
  if (evidence_source !== 'go-core') {
    return _blocked('STABLE_GATE_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: evidence_source ?? null,
      tag_dry_run_ready: true,
    });
  }
  if (!evidence_receipt_id) {
    return _blocked('STABLE_GATE_BLOCKED_EVIDENCE', 'evidence_receipt_id_required', {
      tag_dry_run_ready: true,
    });
  }

  // Target stable ref required
  if (!STABLE_GATE_VALID_TARGETS.includes(target_stable_ref)) {
    return _blocked('STABLE_GATE_BLOCKED_TARGET', 'invalid_stable_target_ref', {
      target_stable_ref: target_stable_ref ?? null,
      tag_dry_run_ready: true,
    });
  }

  const gate_id = _sha256([
    'stable-gate',
    target_stable_ref,
    target_tag ?? '',
    evidence_receipt_id,
    now,
  ].join(':')).slice(0, 24);

  return {
    schema_version:                  SCHEMA_VERSION,
    stable_gate_id:                  gate_id,
    stable_gate_status:              'STABLE_GATE_READY_REQUIRES_COMMAND',
    stable_promotion_ready:          true,
    target_stable_ref,
    target_tag:                      target_tag ?? null,
    evidence_receipt_id,
    evidence_source,
    tag_dry_run_ready:               true,
    blocking_reason:                 null,
    created_at:                      now,
    ..._locked(),
  };
}

export function renderControlledStablePromotionGate(gate) {
  if (!gate) return 'controlled_stable_promotion_gate: null';
  return [
    `stable_gate_status             : ${gate.stable_gate_status ?? 'UNKNOWN'}`,
    `stable_gate_id                 : ${gate.stable_gate_id ?? 'none'}`,
    `target_stable_ref              : ${gate.target_stable_ref ?? 'none'}`,
    `evidence_source                : ${gate.evidence_source ?? 'none'}`,
    `stable_promotion_ready         : ${gate.stable_promotion_ready ?? false}`,
    `explicit_real_command_required : true`,
    `stable_promoted                : false`,
    `git_push_performed             : false`,
    `production_execution_locked    : true`,
    `blocking_reason                : ${gate.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('controlled-stable-promotion-gate.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateControlledStablePromotionGate({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledStablePromotionGate(result));
  }

  process.exit(result.stable_promotion_ready ? 0 : 1);
}
