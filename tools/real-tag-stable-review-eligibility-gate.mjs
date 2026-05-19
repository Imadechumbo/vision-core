#!/usr/bin/env node
/**
 * Real Tag Stable Review Eligibility Gate — V103.1
 *
 * Gate for initiating a future stable review phase after real tag is verified.
 * Does NOT promote stable. Does NOT deploy. Does NOT create release.
 *
 * REGRA ABSOLUTA: stable_promoted=false always. deploy_performed=false always.
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v103.1';

export const STABLE_REVIEW_ELIGIBILITY_STATUSES = [
  'STABLE_REVIEW_ELIGIBILITY_BLOCKED_STATE',
  'STABLE_REVIEW_ELIGIBILITY_BLOCKED_TAG',
  'STABLE_REVIEW_ELIGIBILITY_READY_FOR_STABLE_REVIEW_PHASE',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    actual_real_tag_created:      false,
    actual_git_push_performed:    false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:              SCHEMA_VERSION,
    eligibility_status:          status,
    eligibility_ready:           false,
    blocking_reason,
    stable_review_phase_allowed: false,
    next_phase_recommended:      null,
    ...extra,
    ..._locked(),
  };
}

export function evaluateRealTagStableReviewEligibility(params = {}) {
  const {
    fixture_mode = false,
    state_result,
    _mock_timestamp,
  } = params ?? {};

  const now            = _mock_timestamp ?? new Date().toISOString();
  const eligibility_id = _sha256(`stable-review-eligibility:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:              SCHEMA_VERSION,
      eligibility_id,
      eligibility_status:          'STABLE_REVIEW_ELIGIBILITY_READY_FOR_STABLE_REVIEW_PHASE',
      eligibility_ready:           true,
      blocking_reason:             null,
      target_tag:                  'v1.0.0',
      git_head:                    'abc1234def567890abc12345',
      real_tag_verified:           true,
      stable_review_phase_allowed: true,
      next_phase_recommended:      'stable_review_contract',
      created_at:                  now,
      ..._locked(),
    };
  }

  const eff_state = state_result !== undefined ? state_result : null;

  // Gate 1: state ready
  if (!eff_state || eff_state.state_ready !== true) {
    return _blocked('STABLE_REVIEW_ELIGIBILITY_BLOCKED_STATE', 'verified_state_not_ready', {
      eligibility_id, created_at: now,
    });
  }

  // Gate 2: real tag verified
  if (eff_state.real_tag_verified !== true) {
    return _blocked('STABLE_REVIEW_ELIGIBILITY_BLOCKED_TAG', 'real_tag_not_verified', {
      eligibility_id,
      target_tag: eff_state.target_tag ?? null,
      git_head:   eff_state.git_head   ?? null,
      created_at: now,
    });
  }

  return {
    schema_version:              SCHEMA_VERSION,
    eligibility_id,
    eligibility_status:          'STABLE_REVIEW_ELIGIBILITY_READY_FOR_STABLE_REVIEW_PHASE',
    eligibility_ready:           true,
    blocking_reason:             null,
    target_tag:                  eff_state.target_tag ?? null,
    git_head:                    eff_state.git_head   ?? null,
    real_tag_verified:           true,
    stable_review_phase_allowed: true,
    next_phase_recommended:      'stable_review_contract',
    created_at:                  now,
    ..._locked(),
  };
}

export function validateRealTagStableReviewEligibility(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.stable_review_phase_allowed === true && result.real_tag_verified !== true) {
    failures.push('stable_review_phase_allowed=true requires real_tag_verified=true');
  }
  return failures;
}

export function renderRealTagStableReviewEligibilityGate(result) {
  if (!result) return 'real_tag_stable_review_eligibility_gate: null';
  return [
    `eligibility_status           : ${result.eligibility_status ?? 'UNKNOWN'}`,
    `eligibility_id               : ${result.eligibility_id ?? 'none'}`,
    `eligibility_ready            : ${result.eligibility_ready ?? false}`,
    `target_tag                   : ${result.target_tag ?? 'none'}`,
    `git_head                     : ${result.git_head ?? 'none'}`,
    `real_tag_verified            : ${result.real_tag_verified ?? false}`,
    `stable_review_phase_allowed  : ${result.stable_review_phase_allowed ?? false}`,
    `next_phase_recommended       : ${result.next_phase_recommended ?? 'none'}`,
    `stable_promoted              : false`,
    `deploy_performed             : false`,
    `release_performed            : false`,
    `actual_real_tag_created      : false`,
    `blocking_reason              : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-stable-review-eligibility-gate.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateRealTagStableReviewEligibility({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagStableReviewEligibilityGate(result));
  }

  process.exit(result.eligibility_ready ? 0 : 1);
}
