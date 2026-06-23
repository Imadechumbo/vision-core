#!/usr/bin/env node
/**
 * Hermes Cache Learning Contract — V141.0
 *
 * Defines when Hermes may learn from cache/cost events.
 * Positive learning requires PASS GOLD. No pass_gold → diagnostic only.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v141.0';

export const LEARNING_CONTRACT_STATUSES = [
  'LEARNING_BLOCKED_INPUT',
  'LEARNING_BLOCKED_NO_RECEIPT',
  'LEARNING_BLOCKED_INVALID_HASH',
  'LEARNING_DIAGNOSTIC_ONLY',
  'LEARNING_ALLOWED_POSITIVE',
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

export function evaluateLearningContract(params) {
  const {
    mission_id,
    mission_status           = null,
    pass_gold                = null,
    evidence_receipt         = null,
    cache_hit                = null,
    evidence_hash            = null,
    cost_saved_usd           = null,
    result_status            = null,
    evaluated_at,
  } = params || {};

  const contractKey = [
    mission_id, mission_status, pass_gold,
    evidence_hash, cache_hit, cost_saved_usd, result_status,
  ].join('|');
  const contract_id = _sha256(contractKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      contract_id,
      schema_version:           SCHEMA_VERSION,
      learning_status:          'LEARNING_BLOCKED_INPUT',
      learning_allowed:         false,
      positive_learning:        false,
      incident_record_allowed:  false,
      savings_recorded:         false,
      blocked_reason:           'mission_id is required.',
      ..._locked(),
    };
  }

  // No evidence receipt → block
  if (evidence_receipt === null || evidence_receipt === undefined) {
    return {
      contract_id,
      schema_version:           SCHEMA_VERSION,
      learning_status:          'LEARNING_BLOCKED_NO_RECEIPT',
      learning_allowed:         false,
      positive_learning:        false,
      incident_record_allowed:  true,
      savings_recorded:         false,
      mission_id,
      blocked_reason:           'evidence_receipt is required for learning.',
      learning_mode:            'diagnostic_only',
      evaluated_at:             evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // cache_hit=true with invalid evidence_hash → block
  if (cache_hit === true && !_isValidHash(evidence_hash)) {
    return {
      contract_id,
      schema_version:           SCHEMA_VERSION,
      learning_status:          'LEARNING_BLOCKED_INVALID_HASH',
      learning_allowed:         false,
      positive_learning:        false,
      incident_record_allowed:  true,
      savings_recorded:         false,
      mission_id,
      blocked_reason:           'cache_hit=true but evidence_hash is invalid.',
      learning_mode:            'diagnostic_only',
      evaluated_at:             evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // savings tracking
  const savings_recorded =
    typeof cost_saved_usd === 'number' &&
    Number.isFinite(cost_saved_usd) &&
    cost_saved_usd > 0;

  // Fail or no pass_gold → diagnostic only
  const isFail = mission_status === 'FAIL' || pass_gold === false;
  if (isFail) {
    return {
      contract_id,
      schema_version:           SCHEMA_VERSION,
      learning_status:          'LEARNING_DIAGNOSTIC_ONLY',
      learning_allowed:         false,
      positive_learning:        false,
      incident_record_allowed:  true,
      savings_recorded,
      mission_id,
      mission_status,
      pass_gold,
      learning_mode:            'diagnostic_only',
      evaluated_at:             evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // GOLD + pass_gold=true → positive learning allowed
  if (mission_status === 'GOLD' && pass_gold === true) {
    const positive_learning = result_status !== 'failed';
    return {
      contract_id,
      schema_version:           SCHEMA_VERSION,
      learning_status:          'LEARNING_ALLOWED_POSITIVE',
      learning_allowed:         true,
      positive_learning,
      incident_record_allowed:  false,
      savings_recorded,
      mission_id,
      mission_status,
      pass_gold,
      learning_mode:            'positive_pattern',
      evaluated_at:             evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  // Default: no explicit GOLD/FAIL → diagnostic
  return {
    contract_id,
    schema_version:           SCHEMA_VERSION,
    learning_status:          'LEARNING_DIAGNOSTIC_ONLY',
    learning_allowed:         false,
    positive_learning:        false,
    incident_record_allowed:  true,
    savings_recorded,
    mission_id,
    mission_status,
    pass_gold,
    learning_mode:            'diagnostic_only',
    evaluated_at:             evaluated_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateLearningContract(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'contract_id', 'schema_version', 'learning_status',
    'learning_allowed', 'positive_learning',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!LEARNING_CONTRACT_STATUSES.includes(result.learning_status)) {
    errors.push(`invalid learning_status: ${result.learning_status}`);
  }
  if (result.learning_allowed === true && result.learning_status !== 'LEARNING_ALLOWED_POSITIVE') {
    errors.push('learning_allowed=true only valid when status=LEARNING_ALLOWED_POSITIVE');
  }
  return { valid: errors.length === 0, errors };
}

export function renderLearningContract(result) {
  if (!result || typeof result !== 'object') {
    return '[HERMES_CACHE_LEARNING_CONTRACT] No result to render.';
  }
  const lines = [
    `=== Hermes Cache Learning Contract [${SCHEMA_VERSION}] ===`,
    `Learning status:     ${result.learning_status ?? 'N/A'}`,
    `Mission:             ${result.mission_id ?? 'N/A'}`,
    `Learning allowed:    ${result.learning_allowed}`,
    `Positive learning:   ${result.positive_learning}`,
    `Learning mode:       ${result.learning_mode ?? 'N/A'}`,
    `Mission status:      ${result.mission_status ?? 'N/A'}`,
    `Pass gold:           ${result.pass_gold ?? 'N/A'}`,
    `Incident record:     ${result.incident_record_allowed ?? false}`,
    `Savings recorded:    ${result.savings_recorded ?? false}`,
    `Evaluated at:        ${result.evaluated_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
