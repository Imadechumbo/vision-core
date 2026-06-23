#!/usr/bin/env node
/**
 * Hermes Hallucination Incident Memory — V148.0
 *
 * Records when an agent claims something that local reality does not confirm.
 * Incidents are diagnostic-only — never become positive learning patterns.
 * Repeated incidents reduce trust score and require human review after threshold.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v148.0';
const REPEAT_ESCALATION_THRESHOLD = 3;

export const HALLUCINATION_INCIDENT_TYPES = [
  'CLAIMED_FILE_CREATED_BUT_MISSING',
  'CLAIMED_SCRIPT_ADDED_BUT_MISSING',
  'CLAIMED_TEST_PASSED_BUT_NOT_RUN',
  'CLAIMED_COMMIT_BUT_HASH_MISSING',
  'CLAIMED_PR_BUT_PR_MISSING',
  'CLAIMED_PASS_GOLD_WITHOUT_RECEIPT',
  'CLAIMED_APPLIED_BUT_DIFF_EMPTY',
];

export const HALLUCINATION_INCIDENT_STATUSES = [
  'HALLUCINATION_INCIDENT_RECORDED',
  'HALLUCINATION_REPEAT_DETECTED',
  'HALLUCINATION_ESCALATION_REQUIRED',
  'HALLUCINATION_PATTERN_SAFE_RECORDED',
];

const TRUST_SCORE_DELTA_MAP = {
  CLAIMED_FILE_CREATED_BUT_MISSING:   -10,
  CLAIMED_SCRIPT_ADDED_BUT_MISSING:   -8,
  CLAIMED_TEST_PASSED_BUT_NOT_RUN:    -12,
  CLAIMED_COMMIT_BUT_HASH_MISSING:    -15,
  CLAIMED_PR_BUT_PR_MISSING:          -12,
  CLAIMED_PASS_GOLD_WITHOUT_RECEIPT:  -20,
  CLAIMED_APPLIED_BUT_DIFF_EMPTY:     -15,
};

const RECOMMENDED_GUARDRAILS = {
  CLAIMED_FILE_CREATED_BUT_MISSING:   'verify_filesystem_before_claim',
  CLAIMED_SCRIPT_ADDED_BUT_MISSING:   'verify_package_json_before_claim',
  CLAIMED_TEST_PASSED_BUT_NOT_RUN:    'require_exit_code_proof',
  CLAIMED_COMMIT_BUT_HASH_MISSING:    'require_git_log_proof',
  CLAIMED_PR_BUT_PR_MISSING:          'require_pr_number_proof',
  CLAIMED_PASS_GOLD_WITHOUT_RECEIPT:  'require_evidence_receipt',
  CLAIMED_APPLIED_BUT_DIFF_EMPTY:     'require_git_diff_proof',
};

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

export function recordHallucinationIncident(params) {
  const {
    incident_id,
    incident_type,
    agent_name              = null,
    claim_text              = null,
    missing_proof           = null,
    local_reality_snapshot  = null,
    prior_incidents         = [],
    recorded_at,
  } = params || {};

  const incidentKey = [
    incident_id, incident_type, agent_name,
    claim_text ? _sha256(claim_text) : 'null',
  ].join('|');
  const incident_hash = _sha256(incidentKey);

  if (!incident_id || String(incident_id).trim() === '') {
    return {
      incident_hash,
      schema_version:                SCHEMA_VERSION,
      hallucination_incident_status: 'HALLUCINATION_INCIDENT_RECORDED',
      hallucination_incident_recorded: false,
      blocked_reason:                'incident_id is required.',
      diagnostic_learning_allowed:   true,
      positive_learning_allowed:     false,
      human_review_required:         false,
      agent_trust_score_delta:       0,
      ..._locked(),
    };
  }

  if (!incident_type || !HALLUCINATION_INCIDENT_TYPES.includes(incident_type)) {
    return {
      incident_hash,
      schema_version:                SCHEMA_VERSION,
      hallucination_incident_status: 'HALLUCINATION_INCIDENT_RECORDED',
      hallucination_incident_recorded: false,
      blocked_reason:                `Unknown incident_type: ${incident_type}`,
      diagnostic_learning_allowed:   true,
      positive_learning_allowed:     false,
      human_review_required:         false,
      agent_trust_score_delta:       0,
      ..._locked(),
    };
  }

  const claim_text_hash = claim_text ? _sha256(claim_text) : null;

  const priors = Array.isArray(prior_incidents) ? prior_incidents : [];
  const same_type_count = priors.filter(p =>
    p.incident_type === incident_type &&
    (agent_name === null || p.agent_name === agent_name)
  ).length;
  const repeat_incident_count = same_type_count;
  const total_incident_count  = priors.length + 1;

  const agent_trust_score_delta = TRUST_SCORE_DELTA_MAP[incident_type] ?? -10;
  const recommended_guardrail   = RECOMMENDED_GUARDRAILS[incident_type] ?? 'require_local_proof';

  let hallucination_incident_status;
  let human_review_required = false;

  if (repeat_incident_count + 1 >= REPEAT_ESCALATION_THRESHOLD) {
    hallucination_incident_status = 'HALLUCINATION_ESCALATION_REQUIRED';
    human_review_required = true;
  } else if (repeat_incident_count > 0) {
    hallucination_incident_status = 'HALLUCINATION_REPEAT_DETECTED';
  } else {
    hallucination_incident_status = 'HALLUCINATION_INCIDENT_RECORDED';
  }

  return {
    incident_hash,
    schema_version:                   SCHEMA_VERSION,
    hallucination_incident_status,
    hallucination_incident_recorded:  true,
    incident_id,
    incident_type,
    agent_name,
    claim_text_hash,
    missing_proof,
    local_reality_snapshot,
    repeat_incident_count:            repeat_incident_count + 1,
    total_incident_count,
    agent_trust_score_delta,
    recommended_guardrail,
    diagnostic_learning_allowed:      true,
    positive_learning_allowed:        false,
    human_review_required,
    recorded_at:                      recorded_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateHallucinationIncident(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'incident_hash', 'schema_version', 'hallucination_incident_status',
    'hallucination_incident_recorded',
    'diagnostic_learning_allowed', 'positive_learning_allowed',
    'human_review_required', 'agent_trust_score_delta',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (result.positive_learning_allowed !== false) {
    errors.push('positive_learning_allowed must be false');
  }
  if (result.diagnostic_learning_allowed !== true) {
    errors.push('diagnostic_learning_allowed must be true');
  }
  if (!HALLUCINATION_INCIDENT_STATUSES.includes(result.hallucination_incident_status)) {
    errors.push(`invalid status: ${result.hallucination_incident_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderHallucinationIncident(result) {
  if (!result || typeof result !== 'object') {
    return '[HERMES_HALLUCINATION_INCIDENT_MEMORY] No result to render.';
  }
  const lines = [
    `=== Hermes Hallucination Incident Memory [${SCHEMA_VERSION}] ===`,
    `Status:                        ${result.hallucination_incident_status ?? 'N/A'}`,
    `Incident ID:                   ${result.incident_id ?? 'N/A'}`,
    `Incident type:                 ${result.incident_type ?? 'N/A'}`,
    `Agent:                         ${result.agent_name ?? 'N/A'}`,
    `Recorded:                      ${result.hallucination_incident_recorded}`,
    `Repeat count:                  ${result.repeat_incident_count ?? 0}`,
    `Trust score delta:             ${result.agent_trust_score_delta ?? 0}`,
    `Recommended guardrail:         ${result.recommended_guardrail ?? 'N/A'}`,
    `Human review required:         ${result.human_review_required}`,
    `--- Learning rules ---`,
    `diagnostic_learning_allowed:   ${result.diagnostic_learning_allowed}`,
    `positive_learning_allowed:     ${result.positive_learning_allowed}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
