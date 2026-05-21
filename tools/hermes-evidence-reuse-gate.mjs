#!/usr/bin/env node
/**
 * Hermes Evidence Reuse Gate — V142.0
 *
 * Blocks reuse of evidence if hash invalid, branch mismatch,
 * baseline incompatible, pass_gold absent, mission_id mismatch,
 * or cache stale.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v142.0';

export const EVIDENCE_REUSE_STATUSES = [
  'REUSE_BLOCKED_INPUT',
  'REUSE_BLOCKED_INVALID_HASH',
  'REUSE_BLOCKED_BRANCH_MISMATCH',
  'REUSE_BLOCKED_BASELINE_INCOMPATIBLE',
  'REUSE_BLOCKED_NO_PASS_GOLD',
  'REUSE_BLOCKED_MISSION_MISMATCH',
  'REUSE_BLOCKED_STALE_CACHE',
  'REUSE_ALLOWED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:   false,
    deploy_performed:  false,
    release_performed: false,
  };
}

function _isValidHash(h) {
  return typeof h === 'string' && /^[a-f0-9]{64}$/.test(h);
}

export function evaluateEvidenceReuseGate(params) {
  const {
    mission_id,
    evidence_hash            = null,
    current_branch           = null,
    evidence_branch          = null,
    current_baseline_id      = null,
    evidence_baseline_id     = null,
    pass_gold                = null,
    current_mission_id       = null,
    evidence_mission_id      = null,
    cache_stale              = null,
    evaluated_at,
  } = params || {};

  const gateKey = [
    mission_id, evidence_hash, current_branch, evidence_branch,
    current_baseline_id, evidence_baseline_id,
    pass_gold, current_mission_id, evidence_mission_id, cache_stale,
  ].join('|');
  const gate_id = _sha256(gateKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      gate_id,
      schema_version:   SCHEMA_VERSION,
      reuse_status:     'REUSE_BLOCKED_INPUT',
      reuse_allowed:    false,
      blocked_reason:   'mission_id is required.',
      ..._locked(),
    };
  }

  // 1. Invalid hash
  if (!_isValidHash(evidence_hash)) {
    return {
      gate_id,
      schema_version:   SCHEMA_VERSION,
      reuse_status:     'REUSE_BLOCKED_INVALID_HASH',
      reuse_allowed:    false,
      mission_id,
      blocked_reason:   'evidence_hash is invalid or missing.',
      evaluated_at:     evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // 2. Branch mismatch
  if (
    current_branch !== null && evidence_branch !== null &&
    current_branch !== evidence_branch
  ) {
    return {
      gate_id,
      schema_version:   SCHEMA_VERSION,
      reuse_status:     'REUSE_BLOCKED_BRANCH_MISMATCH',
      reuse_allowed:    false,
      mission_id,
      blocked_reason:   `Branch mismatch: current=${current_branch} evidence=${evidence_branch}.`,
      evaluated_at:     evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // 3. Baseline incompatible
  if (
    current_baseline_id !== null && evidence_baseline_id !== null &&
    current_baseline_id !== evidence_baseline_id
  ) {
    return {
      gate_id,
      schema_version:   SCHEMA_VERSION,
      reuse_status:     'REUSE_BLOCKED_BASELINE_INCOMPATIBLE',
      reuse_allowed:    false,
      mission_id,
      blocked_reason:   'Baseline IDs do not match.',
      evaluated_at:     evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // 4. No pass_gold
  if (pass_gold !== true) {
    return {
      gate_id,
      schema_version:   SCHEMA_VERSION,
      reuse_status:     'REUSE_BLOCKED_NO_PASS_GOLD',
      reuse_allowed:    false,
      mission_id,
      blocked_reason:   'pass_gold must be true for evidence reuse.',
      evaluated_at:     evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // 5. Mission ID mismatch
  if (
    current_mission_id !== null && evidence_mission_id !== null &&
    current_mission_id !== evidence_mission_id
  ) {
    return {
      gate_id,
      schema_version:   SCHEMA_VERSION,
      reuse_status:     'REUSE_BLOCKED_MISSION_MISMATCH',
      reuse_allowed:    false,
      mission_id,
      blocked_reason:   'Mission IDs do not match.',
      evaluated_at:     evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // 6. Cache stale
  if (cache_stale === true) {
    return {
      gate_id,
      schema_version:   SCHEMA_VERSION,
      reuse_status:     'REUSE_BLOCKED_STALE_CACHE',
      reuse_allowed:    false,
      mission_id,
      blocked_reason:   'Cache is stale — evidence cannot be reused.',
      evaluated_at:     evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  return {
    gate_id,
    schema_version:      SCHEMA_VERSION,
    reuse_status:        'REUSE_ALLOWED',
    reuse_allowed:       true,
    mission_id,
    evidence_hash,
    current_branch,
    evidence_branch,
    current_baseline_id,
    evidence_baseline_id,
    pass_gold,
    evaluated_at:        evaluated_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateEvidenceReuseGate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'gate_id', 'schema_version', 'reuse_status', 'reuse_allowed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!EVIDENCE_REUSE_STATUSES.includes(result.reuse_status)) {
    errors.push(`invalid reuse_status: ${result.reuse_status}`);
  }
  if (result.reuse_allowed === true && result.reuse_status !== 'REUSE_ALLOWED') {
    errors.push('reuse_allowed=true only when status=REUSE_ALLOWED');
  }
  return { valid: errors.length === 0, errors };
}

export function renderEvidenceReuseGate(result) {
  if (!result || typeof result !== 'object') {
    return '[HERMES_EVIDENCE_REUSE_GATE] No result to render.';
  }
  const lines = [
    `=== Hermes Evidence Reuse Gate [${SCHEMA_VERSION}] ===`,
    `Reuse status:      ${result.reuse_status ?? 'N/A'}`,
    `Mission:           ${result.mission_id ?? 'N/A'}`,
    `Reuse allowed:     ${result.reuse_allowed}`,
    `Evidence hash:     ${result.evidence_hash ? result.evidence_hash.slice(0, 16) + '...' : 'N/A'}`,
    `Pass gold:         ${result.pass_gold ?? 'N/A'}`,
    `Branch (current):  ${result.current_branch ?? 'N/A'}`,
    `Branch (evidence): ${result.evidence_branch ?? 'N/A'}`,
    `Blocked reason:    ${result.blocked_reason ?? 'none'}`,
    `Evaluated at:      ${result.evaluated_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
