#!/usr/bin/env node
/**
 * Real Manual Release Gate Contract — V56.0
 *
 * Validates that a release is ready for real manual execution consideration,
 * but does NOT execute or unlock production. Gate is always LOCKED.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * real_execution_requested=false always in this version.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v56.0';

export const REAL_GATE_STATUSES = [
  'REAL_GATE_MISSING',
  'REAL_GATE_INVALID',
  'REAL_GATE_EXPIRED',
  'REAL_GATE_BLOCKED_HANDOFF',
  'REAL_GATE_BLOCKED_REHEARSAL',
  'REAL_GATE_BLOCKED_BASELINE',
  'REAL_GATE_BLOCKED_EVIDENCE',
  'REAL_GATE_READY_LOCKED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    real_execution_requested:     false,
    human_review_required:        true,
    gate_only:                    true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    gate_status:    status,
    gate_ready:     false,
    blocking_reason,
    ...extra,
    ..._locked(),
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    real_execution_requested:     false,
    human_review_required:        true,
    gate_only:                    true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a real manual release gate.
 */
export function createRealManualReleaseGate(params = {}) {
  const {
    handoff_id,
    rehearsal_report_id,
    sandbox_baseline_id,
    manual_execution_baseline_id,
    evidence_receipt_id,
    evidence_source,
    target_version,
    target_branch,
    git_head,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const gate_id = _sha256(`fixture-gate:${now}`).slice(0, 24);
    const expires_at = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();
    return {
      schema_version:               SCHEMA_VERSION,
      gate_id,
      gate_status:                  'REAL_GATE_READY_LOCKED',
      gate_ready:                   true,
      handoff_id:                   'fixture-handoff-id',
      rehearsal_report_id:          'fixture-rehearsal-report-id',
      sandbox_baseline_id:          'fixture-sandbox-baseline-id',
      manual_execution_baseline_id: 'fixture-manual-execution-baseline-id',
      evidence_receipt_id:          'fixture-receipt-id',
      evidence_source:              'go-core',
      target_version:               '1.0.0-fixture',
      target_branch:                'main',
      git_head:                     'fixture-head-sha',
      created_at:                   now,
      expires_at,
      blocking_reason:              null,
      ..._locked(),
    };
  }

  if (!handoff_id) {
    return _blocked('REAL_GATE_BLOCKED_HANDOFF', 'handoff_id_required');
  }

  if (!rehearsal_report_id) {
    return _blocked('REAL_GATE_BLOCKED_REHEARSAL', 'rehearsal_report_id_required');
  }

  if (!sandbox_baseline_id || !manual_execution_baseline_id) {
    return _blocked('REAL_GATE_BLOCKED_BASELINE', 'baseline_ids_required', {
      sandbox_baseline_id:          sandbox_baseline_id ?? null,
      manual_execution_baseline_id: manual_execution_baseline_id ?? null,
    });
  }

  if (!evidence_receipt_id) {
    return _blocked('REAL_GATE_BLOCKED_EVIDENCE', 'evidence_receipt_id_required');
  }

  if (!evidence_source || evidence_source !== 'go-core') {
    return _blocked('REAL_GATE_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: evidence_source ?? null,
    });
  }

  const gate_id = _sha256(`gate:${handoff_id}:${rehearsal_report_id}:${evidence_receipt_id}:${now}`).slice(0, 24);
  const expires_at = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString();

  return {
    schema_version:               SCHEMA_VERSION,
    gate_id,
    gate_status:                  'REAL_GATE_READY_LOCKED',
    gate_ready:                   true,
    handoff_id,
    rehearsal_report_id,
    sandbox_baseline_id,
    manual_execution_baseline_id,
    evidence_receipt_id,
    evidence_source,
    target_version:               target_version ?? null,
    target_branch:                target_branch ?? null,
    git_head:                     git_head ?? null,
    created_at:                   now,
    expires_at,
    blocking_reason:              null,
    ..._locked(),
  };
}

/**
 * Validate a real manual release gate object.
 */
export function validateRealManualReleaseGate(gate) {
  if (!gate) return _blocked('REAL_GATE_MISSING', 'gate_null');

  if (gate.schema_version !== SCHEMA_VERSION) {
    return _blocked('REAL_GATE_INVALID', `schema_version_mismatch:expected_${SCHEMA_VERSION}`);
  }

  if (!gate.gate_id || typeof gate.gate_id !== 'string') {
    return _blocked('REAL_GATE_INVALID', 'gate_id_missing_or_invalid');
  }

  if (gate.evidence_source !== 'go-core') {
    return _blocked('REAL_GATE_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core');
  }

  if (gate.production_execution_locked !== true) {
    return _blocked('REAL_GATE_INVALID', 'production_execution_locked_must_be_true');
  }

  if (gate.human_review_required !== true) {
    return _blocked('REAL_GATE_INVALID', 'human_review_required_must_be_true');
  }

  return { valid: true, gate_id: gate.gate_id, ..._locked() };
}

/**
 * Normalize a real manual release gate.
 */
export function normalizeRealManualReleaseGate(gate) {
  if (!gate) return null;
  return {
    ...gate,
    ..._locked(),
    deploy_allowed:               false,
    promotion_allowed:            false,
    stable_allowed:               false,
    tag_allowed:                  false,
    release_execution_allowed:    false,
    release_performed:            false,
    tag_created:                  false,
    stable_promoted:              false,
    deploy_performed:             false,
    production_execution_locked:  true,
    real_execution_requested:     false,
    human_review_required:        true,
    gate_only:                    true,
  };
}

/**
 * Render a human-readable gate summary.
 */
export function renderRealManualReleaseGateSummary(gate) {
  if (!gate) return 'gate: null';
  const lines = [
    `gate_status                  : ${gate.gate_status ?? 'UNKNOWN'}`,
    `gate_id                      : ${gate.gate_id ?? 'none'}`,
    `evidence_source              : ${gate.evidence_source ?? 'none'}`,
    `production_execution_locked  : true`,
    `real_execution_requested     : false`,
    `human_review_required        : true`,
    `release_execution_allowed    : false`,
    `deploy_allowed               : false`,
    `blocking_reason              : ${gate.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-manual-release-gate-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createRealManualReleaseGate({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealManualReleaseGateSummary(result));
  }

  process.exit(result.gate_ready ? 0 : 1);
}
