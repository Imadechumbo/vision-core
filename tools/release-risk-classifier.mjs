#!/usr/bin/env node
/**
 * Release Risk Classifier — V193.0
 * Classifies risk of a release decision before any real authorization.
 * Does NOT deploy, promote, release, or create tags. release_allowed=false always.
 */

import { createHash } from 'crypto';

export const RELEASE_RISK_CLASSIFIER_STATUSES = [
  'RISK_CLASSIFIER_BLOCKED_INPUT',
  'RISK_CLASSIFIER_BLOCKED_DECISION_REQUEST',
  'RISK_CLASSIFIER_HIGH_RISK',
  'RISK_CLASSIFIER_READY',
];

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'BLOCKED'];

const SCHEMA_VERSION = 'v193.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    risk_classification_id: null,
    risk_level: null,
    risk_reasons: [],
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    classifier_hash: null,
    status: 'RISK_CLASSIFIER_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildReleaseRiskClassifier(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    classifier_id,
    decision_request_ready,
    phase_gate_ready,
    release_plan_ready,
    release_simulation_passed,
    rollback_plan_ready,
    rollback_drill_passed,
  } = input;

  if (!classifier_id || typeof classifier_id !== 'string' || !classifier_id.trim()) {
    return blockedInput('Missing or invalid classifier_id');
  }

  if (!decision_request_ready || !phase_gate_ready) {
    return {
      schema_version: SCHEMA_VERSION,
      risk_classification_id: classifier_id,
      risk_level: null,
      risk_reasons: [],
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      classifier_hash: null,
      status: 'RISK_CLASSIFIER_BLOCKED_DECISION_REQUEST',
      errors: ['decision_request_ready and phase_gate_ready must be true'],
    };
  }

  const risk_reasons = [];
  let risk_level = 'LOW';

  if (!release_plan_ready) {
    risk_reasons.push('release_plan_ready is false');
    risk_level = 'HIGH';
  }
  if (!release_simulation_passed) {
    risk_reasons.push('release_simulation_passed is false');
    risk_level = 'BLOCKED';
  }
  if (!rollback_plan_ready) {
    risk_reasons.push('rollback_plan_ready is false');
    if (risk_level === 'LOW') risk_level = 'MEDIUM';
  }
  if (!rollback_drill_passed) {
    risk_reasons.push('rollback_drill_passed is false');
    if (risk_level !== 'BLOCKED') risk_level = 'HIGH';
  }
  if (input.production_touched === true) {
    risk_reasons.push('production_touched is true — BLOCKED');
    risk_level = 'BLOCKED';
  }

  if (risk_level === 'BLOCKED' || risk_level === 'HIGH') {
    return {
      schema_version: SCHEMA_VERSION,
      risk_classification_id: classifier_id,
      risk_level,
      risk_reasons,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      classifier_hash: null,
      status: 'RISK_CLASSIFIER_HIGH_RISK',
      errors: risk_reasons,
    };
  }

  const classifier_hash = sha256(`${classifier_id}:${risk_level}:${risk_reasons.join(',')}`);

  return {
    schema_version: SCHEMA_VERSION,
    risk_classification_id: classifier_id,
    risk_level,
    risk_reasons,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    classifier_hash,
    status: 'RISK_CLASSIFIER_READY',
    errors: [],
  };
}

export function validateReleaseRiskClassifier(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!RELEASE_RISK_CLASSIFIER_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'RISK_CLASSIFIER_READY' &&
      (!result.classifier_hash || result.classifier_hash.length !== 64)) {
    errors.push('RISK_CLASSIFIER_READY requires 64-char classifier_hash');
  }
  if (result.risk_level !== null && !RISK_LEVELS.includes(result.risk_level)) {
    errors.push(`Invalid risk_level: ${result.risk_level}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderReleaseRiskClassifier(result) {
  if (!result || typeof result !== 'object') return '[ReleaseRiskClassifier: null]';
  const lines = [
    `=== Release Risk Classifier ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Classifier ID       : ${result.risk_classification_id ?? 'N/A'}`,
    `Risk Level          : ${result.risk_level ?? 'N/A'}`,
    `Risk Reasons        : ${(result.risk_reasons || []).length}`,
    `Release Allowed     : ${result.release_allowed}`,
    `Classifier Hash     : ${result.classifier_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('release-risk-classifier.mjs')) {
  const demo = buildReleaseRiskClassifier({
    classifier_id: 'classifier-demo-001',
    decision_request_ready: true,
    phase_gate_ready: true,
    release_plan_ready: true,
    release_simulation_passed: true,
    rollback_plan_ready: true,
    rollback_drill_passed: true,
  });
  console.log(renderReleaseRiskClassifier(demo));
  const v = validateReleaseRiskClassifier(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
