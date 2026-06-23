#!/usr/bin/env node
/**
 * Hermes Similar Mission Classifier — V142.1
 *
 * Classifies similarity between missions using multiple signals.
 * HIGH ≥ 10 / MEDIUM ≥ 6 / LOW ≥ 2 / NO_MATCH < 2 (max score: 16)
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v142.1';

export const CLASSIFIER_STATUSES = [
  'CLASSIFIER_BLOCKED_INPUT',
  'CLASSIFIER_MATCH_HIGH',
  'CLASSIFIER_MATCH_MEDIUM',
  'CLASSIFIER_MATCH_LOW',
  'CLASSIFIER_NO_MATCH',
];

const SCORE_HIGH   = 10;
const SCORE_MEDIUM = 6;
const SCORE_LOW    = 2;

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

function _filesOverlapRatio(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const overlap = b.filter(f => setA.has(f)).length;
  return overlap / Math.max(a.length, b.length);
}

export function classifySimilarMission(params) {
  const {
    mission_id,
    current_mission_type    = null,
    reference_mission_type  = null,
    current_changed_files   = null,
    reference_changed_files = null,
    current_agent_route     = null,
    reference_agent_route   = null,
    current_baseline_id     = null,
    reference_baseline_id   = null,
    current_error_signature = null,
    reference_error_signature = null,
    current_evidence_hash   = null,
    reference_evidence_hash = null,
    current_test_lane       = null,
    reference_test_lane     = null,
    classified_at,
  } = params || {};

  const classifierKey = [
    mission_id,
    current_mission_type, reference_mission_type,
    current_agent_route, reference_agent_route,
    current_baseline_id, reference_baseline_id,
    current_error_signature, reference_error_signature,
    current_evidence_hash, reference_evidence_hash,
    current_test_lane, reference_test_lane,
  ].join('|');
  const classifier_id = _sha256(classifierKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      classifier_id,
      schema_version:      SCHEMA_VERSION,
      classifier_status:   'CLASSIFIER_BLOCKED_INPUT',
      similarity_score:    0,
      score_breakdown:     {},
      blocked_reason:      'mission_id is required.',
      ..._locked(),
    };
  }

  const breakdown = {};
  let score = 0;

  if (current_mission_type !== null && reference_mission_type !== null &&
      current_mission_type === reference_mission_type) {
    breakdown.mission_type = 3;
    score += 3;
  }

  if (current_agent_route !== null && reference_agent_route !== null &&
      current_agent_route === reference_agent_route) {
    breakdown.agent_route = 2;
    score += 2;
  }

  if (current_baseline_id !== null && reference_baseline_id !== null &&
      current_baseline_id === reference_baseline_id) {
    breakdown.baseline_id = 3;
    score += 3;
  }

  if (current_test_lane !== null && reference_test_lane !== null &&
      current_test_lane === reference_test_lane) {
    breakdown.test_lane = 1;
    score += 1;
  }

  if (current_error_signature !== null && reference_error_signature !== null &&
      current_error_signature === reference_error_signature) {
    breakdown.error_signature = 2;
    score += 2;
  }

  const overlapRatio = _filesOverlapRatio(current_changed_files, reference_changed_files);
  if (overlapRatio > 0.5) {
    breakdown.changed_files = 2;
    score += 2;
  }

  if (current_evidence_hash !== null && reference_evidence_hash !== null &&
      current_evidence_hash === reference_evidence_hash) {
    breakdown.evidence_hash = 3;
    score += 3;
  }

  let classifier_status;
  if (score >= SCORE_HIGH) {
    classifier_status = 'CLASSIFIER_MATCH_HIGH';
  } else if (score >= SCORE_MEDIUM) {
    classifier_status = 'CLASSIFIER_MATCH_MEDIUM';
  } else if (score >= SCORE_LOW) {
    classifier_status = 'CLASSIFIER_MATCH_LOW';
  } else {
    classifier_status = 'CLASSIFIER_NO_MATCH';
  }

  return {
    classifier_id,
    schema_version:       SCHEMA_VERSION,
    classifier_status,
    similarity_score:     score,
    score_breakdown:      breakdown,
    files_overlap_ratio:  overlapRatio,
    mission_id,
    classified_at:        classified_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateSimilarMissionClassifier(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'classifier_id', 'schema_version', 'classifier_status',
    'similarity_score', 'score_breakdown',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!CLASSIFIER_STATUSES.includes(result.classifier_status)) {
    errors.push(`invalid classifier_status: ${result.classifier_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderSimilarMissionClassifier(result) {
  if (!result || typeof result !== 'object') {
    return '[HERMES_SIMILAR_MISSION_CLASSIFIER] No result to render.';
  }
  const breakdown = result.score_breakdown ?? {};
  const signals = Object.entries(breakdown).map(([k, v]) => `  ${k}: +${v}`).join('\n');
  const lines = [
    `=== Hermes Similar Mission Classifier [${SCHEMA_VERSION}] ===`,
    `Status:            ${result.classifier_status ?? 'N/A'}`,
    `Mission:           ${result.mission_id ?? 'N/A'}`,
    `Similarity score:  ${result.similarity_score ?? 0}`,
    signals ? `Score breakdown:\n${signals}` : `Score breakdown:   (none)`,
    `Files overlap:     ${result.files_overlap_ratio?.toFixed(2) ?? 'N/A'}`,
    `Classified at:     ${result.classified_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
