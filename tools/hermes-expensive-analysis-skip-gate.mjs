#!/usr/bin/env node
/**
 * Hermes Expensive Analysis Skip Gate — V143.0
 *
 * Allows skipping expensive analysis if a similar mission was GOLD
 * with valid evidence and HIGH or MEDIUM similarity.
 * Requires fallback for complete analysis if test fails.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v143.0';

export const SKIP_GATE_STATUSES = [
  'SKIP_BLOCKED_INPUT',
  'SKIP_BLOCKED_NO_EVIDENCE',
  'SKIP_BLOCKED_NOT_GOLD',
  'SKIP_BLOCKED_TEST_FAILED',
  'SKIP_BLOCKED_LOW_SIMILARITY',
  'SKIP_ALLOWED',
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

export function evaluateExpensiveAnalysisSkipGate(params) {
  const {
    mission_id,
    reference_pass_gold          = null,
    reference_evidence_hash      = null,
    similarity_status            = null,
    current_test_status          = null,
    fallback_available           = null,
    evaluated_at,
  } = params || {};

  const gateKey = [
    mission_id, reference_pass_gold, reference_evidence_hash,
    similarity_status, current_test_status, fallback_available,
  ].join('|');
  const gate_id = _sha256(gateKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      gate_id,
      schema_version:       SCHEMA_VERSION,
      skip_status:          'SKIP_BLOCKED_INPUT',
      skip_allowed:         false,
      fallback_required:    false,
      blocked_reason:       'mission_id is required.',
      ..._locked(),
    };
  }

  // 1. No valid evidence
  if (!_isValidHash(reference_evidence_hash)) {
    return {
      gate_id,
      schema_version:       SCHEMA_VERSION,
      skip_status:          'SKIP_BLOCKED_NO_EVIDENCE',
      skip_allowed:         false,
      fallback_required:    true,
      mission_id,
      blocked_reason:       'Valid reference_evidence_hash required to skip analysis.',
      evaluated_at:         evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // 2. Reference not GOLD
  if (reference_pass_gold !== true) {
    return {
      gate_id,
      schema_version:       SCHEMA_VERSION,
      skip_status:          'SKIP_BLOCKED_NOT_GOLD',
      skip_allowed:         false,
      fallback_required:    true,
      mission_id,
      blocked_reason:       'reference_pass_gold must be true to skip analysis.',
      evaluated_at:         evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // 3. Current test failed → must run full analysis
  if (current_test_status === 'failed') {
    return {
      gate_id,
      schema_version:       SCHEMA_VERSION,
      skip_status:          'SKIP_BLOCKED_TEST_FAILED',
      skip_allowed:         false,
      fallback_required:    true,
      mission_id,
      blocked_reason:       'current_test_status=failed — full analysis required.',
      evaluated_at:         evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // 4. Similarity too low
  const HIGH_ENOUGH = similarity_status === 'CLASSIFIER_MATCH_HIGH' ||
                      similarity_status === 'CLASSIFIER_MATCH_MEDIUM';
  if (!HIGH_ENOUGH) {
    return {
      gate_id,
      schema_version:       SCHEMA_VERSION,
      skip_status:          'SKIP_BLOCKED_LOW_SIMILARITY',
      skip_allowed:         false,
      fallback_required:    true,
      mission_id,
      blocked_reason:       `similarity_status=${similarity_status} — HIGH or MEDIUM required.`,
      evaluated_at:         evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  return {
    gate_id,
    schema_version:          SCHEMA_VERSION,
    skip_status:             'SKIP_ALLOWED',
    skip_allowed:            true,
    fallback_required:       false,
    fallback_available,
    mission_id,
    reference_pass_gold,
    reference_evidence_hash,
    similarity_status,
    evaluated_at:            evaluated_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateExpensiveAnalysisSkipGate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'gate_id', 'schema_version', 'skip_status',
    'skip_allowed', 'fallback_required',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!SKIP_GATE_STATUSES.includes(result.skip_status)) {
    errors.push(`invalid skip_status: ${result.skip_status}`);
  }
  if (result.skip_allowed === true && result.skip_status !== 'SKIP_ALLOWED') {
    errors.push('skip_allowed=true only when status=SKIP_ALLOWED');
  }
  return { valid: errors.length === 0, errors };
}

export function renderExpensiveAnalysisSkipGate(result) {
  if (!result || typeof result !== 'object') {
    return '[HERMES_EXPENSIVE_ANALYSIS_SKIP_GATE] No result to render.';
  }
  const lines = [
    `=== Hermes Expensive Analysis Skip Gate [${SCHEMA_VERSION}] ===`,
    `Skip status:        ${result.skip_status ?? 'N/A'}`,
    `Mission:            ${result.mission_id ?? 'N/A'}`,
    `Skip allowed:       ${result.skip_allowed}`,
    `Fallback required:  ${result.fallback_required}`,
    `Similarity:         ${result.similarity_status ?? 'N/A'}`,
    `Ref pass gold:      ${result.reference_pass_gold ?? 'N/A'}`,
    `Blocked reason:     ${result.blocked_reason ?? 'none'}`,
    `Evaluated at:       ${result.evaluated_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
