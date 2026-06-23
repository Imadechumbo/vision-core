#!/usr/bin/env node
/**
 * Agent Truth Score Gate — V148.1
 *
 * Aggregates verified/blocked claims, hallucination incidents, proof ledger state,
 * and pass-gold counts into a composite truth score and trust level.
 * Outputs: truth_score, trust_level, agent_allowed, agent_requires_supervision,
 *          agent_blocked, recommended_mode.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v148.1';

export const AGENT_TRUTH_STATUSES = [
  'AGENT_TRUTH_TRUSTED',
  'AGENT_TRUTH_SUPERVISED',
  'AGENT_TRUTH_RESTRICTED',
  'AGENT_TRUTH_BLOCKED',
];

const TRUST_LEVELS = {
  TRUSTED:    'TRUSTED',
  SUPERVISED: 'SUPERVISED',
  RESTRICTED: 'RESTRICTED',
  BLOCKED:    'BLOCKED',
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

function _clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function evaluateAgentTruthScore(params) {
  const {
    gate_id,
    agent_name                 = null,
    verified_claim_count       = 0,
    blocked_claim_count        = 0,
    hallucination_incident_count = 0,
    repeated_incident_count    = 0,
    proof_ledger_valid         = false,
    recent_pass_gold_count     = 0,
    recent_fail_count          = 0,
    evaluated_at,
  } = params || {};

  const gate_id_hash = _sha256([
    gate_id, agent_name,
    verified_claim_count, blocked_claim_count,
    hallucination_incident_count, repeated_incident_count,
  ].join('|'));

  if (!gate_id || String(gate_id).trim() === '') {
    return {
      gate_id_hash,
      schema_version:             SCHEMA_VERSION,
      agent_truth_status:         'AGENT_TRUTH_BLOCKED',
      agent_truth_gate_evaluated: false,
      blocked_reason:             'gate_id is required.',
      truth_score:                0,
      trust_level:                TRUST_LEVELS.BLOCKED,
      agent_allowed:              false,
      agent_requires_supervision: true,
      agent_blocked:              true,
      recommended_mode:           'BLOCK_ALL',
      unsafe_learning_blocked:    true,
      positive_learning_requires_pass_gold: true,
      evaluated_at:               evaluated_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  const v = Number(verified_claim_count)   || 0;
  const b = Number(blocked_claim_count)    || 0;
  const h = Number(hallucination_incident_count) || 0;
  const r = Number(repeated_incident_count) || 0;
  const pg = Number(recent_pass_gold_count) || 0;
  const f  = Number(recent_fail_count)      || 0;

  const total_claims = v + b;
  const claim_accuracy = total_claims > 0 ? v / total_claims : 1.0;

  let score = 100;

  score += claim_accuracy * 20 - 20;

  score -= h * 15;
  score -= r * 25;

  score += pg * 10;
  score -= f  * 8;

  if (!proof_ledger_valid) score -= 20;

  score = _clamp(Math.round(score), 0, 100);

  let trust_level;
  let agent_truth_status;
  let agent_allowed;
  let agent_requires_supervision;
  let agent_blocked;
  let recommended_mode;

  if (score >= 80 && h === 0 && r === 0 && proof_ledger_valid) {
    trust_level              = TRUST_LEVELS.TRUSTED;
    agent_truth_status       = 'AGENT_TRUTH_TRUSTED';
    agent_allowed            = true;
    agent_requires_supervision = false;
    agent_blocked            = false;
    recommended_mode         = 'AUTONOMOUS_WITH_VERIFICATION';
  } else if (score >= 60 && r === 0) {
    trust_level              = TRUST_LEVELS.SUPERVISED;
    agent_truth_status       = 'AGENT_TRUTH_SUPERVISED';
    agent_allowed            = true;
    agent_requires_supervision = true;
    agent_blocked            = false;
    recommended_mode         = 'SUPERVISED_EXECUTION';
  } else if (score >= 30) {
    trust_level              = TRUST_LEVELS.RESTRICTED;
    agent_truth_status       = 'AGENT_TRUTH_RESTRICTED';
    agent_allowed            = false;
    agent_requires_supervision = true;
    agent_blocked            = false;
    recommended_mode         = 'RESTRICTED_READ_ONLY';
  } else {
    trust_level              = TRUST_LEVELS.BLOCKED;
    agent_truth_status       = 'AGENT_TRUTH_BLOCKED';
    agent_allowed            = false;
    agent_requires_supervision = true;
    agent_blocked            = true;
    recommended_mode         = 'BLOCK_ALL';
  }

  return {
    gate_id_hash,
    schema_version:             SCHEMA_VERSION,
    agent_truth_status,
    agent_truth_gate_evaluated: true,
    gate_id,
    agent_name,
    verified_claim_count:       v,
    blocked_claim_count:        b,
    hallucination_incident_count: h,
    repeated_incident_count:    r,
    proof_ledger_valid,
    recent_pass_gold_count:     pg,
    recent_fail_count:          f,
    truth_score:                score,
    trust_level,
    agent_allowed,
    agent_requires_supervision,
    agent_blocked,
    recommended_mode,
    unsafe_learning_blocked:    true,
    positive_learning_requires_pass_gold: true,
    evaluated_at:               evaluated_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateAgentTruthScore(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'gate_id_hash', 'schema_version', 'agent_truth_status',
    'agent_truth_gate_evaluated',
    'truth_score', 'trust_level',
    'agent_allowed', 'agent_requires_supervision', 'agent_blocked',
    'recommended_mode',
    'unsafe_learning_blocked', 'positive_learning_requires_pass_gold',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (result.unsafe_learning_blocked !== true) {
    errors.push('unsafe_learning_blocked must be true');
  }
  if (result.positive_learning_requires_pass_gold !== true) {
    errors.push('positive_learning_requires_pass_gold must be true');
  }
  if (!AGENT_TRUTH_STATUSES.includes(result.agent_truth_status)) {
    errors.push(`invalid agent_truth_status: ${result.agent_truth_status}`);
  }
  if (typeof result.truth_score === 'number') {
    if (result.truth_score < 0 || result.truth_score > 100) {
      errors.push('truth_score must be 0–100');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function renderAgentTruthScore(result) {
  if (!result || typeof result !== 'object') {
    return '[AGENT_TRUTH_SCORE_GATE] No result to render.';
  }
  const lines = [
    `=== Agent Truth Score Gate [${SCHEMA_VERSION}] ===`,
    `Status:                           ${result.agent_truth_status ?? 'N/A'}`,
    `Gate ID:                          ${result.gate_id ?? 'N/A'}`,
    `Agent:                            ${result.agent_name ?? 'N/A'}`,
    `Evaluated:                        ${result.agent_truth_gate_evaluated}`,
    `Truth score:                      ${result.truth_score ?? 0}`,
    `Trust level:                      ${result.trust_level ?? 'N/A'}`,
    `Agent allowed:                    ${result.agent_allowed}`,
    `Agent requires supervision:       ${result.agent_requires_supervision}`,
    `Agent blocked:                    ${result.agent_blocked}`,
    `Recommended mode:                 ${result.recommended_mode ?? 'N/A'}`,
    `Verified claims:                  ${result.verified_claim_count ?? 0}`,
    `Blocked claims:                   ${result.blocked_claim_count ?? 0}`,
    `Hallucination incidents:          ${result.hallucination_incident_count ?? 0}`,
    `Repeated incidents:               ${result.repeated_incident_count ?? 0}`,
    `Proof ledger valid:               ${result.proof_ledger_valid}`,
    `--- Learning rules ---`,
    `unsafe_learning_blocked:          ${result.unsafe_learning_blocked}`,
    `positive_learning_requires_pass_gold: ${result.positive_learning_requires_pass_gold}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
