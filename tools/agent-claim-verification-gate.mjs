#!/usr/bin/env node
/**
 * Agent Claim Verification Gate — V146.0
 *
 * Verifies agent claims against local provable evidence.
 * No textual assertion from an agent is trusted without proof.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v146.0';

export const CLAIM_TYPES = [
  'FILE_CREATED',
  'FILE_MODIFIED',
  'TEST_EXECUTED',
  'COMMIT_CREATED',
  'PR_CREATED',
  'PR_MERGED',
  'SCRIPT_ADDED',
  'BASELINE_READY',
  'PASS_GOLD_CLAIMED',
];

export const CLAIM_VERIFICATION_STATUSES = [
  'CLAIM_BLOCKED_NO_PROOF',
  'CLAIM_BLOCKED_MISSING_FILE',
  'CLAIM_BLOCKED_MISSING_DIFF',
  'CLAIM_BLOCKED_TEST_NOT_RUN',
  'CLAIM_BLOCKED_EXIT_CODE',
  'CLAIM_VERIFIED',
  'CLAIM_HALLUCINATION_RISK',
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

function _blockedResult(claim_verification_id, status, missing_proofs, extra = {}) {
  return {
    claim_verification_id,
    schema_version:        SCHEMA_VERSION,
    claim_status:          status,
    claim_verified:        false,
    claim_blocked:         true,
    agent_claim_trusted:   false,
    hallucination_risk:    true,
    missing_proofs,
    verified_proofs:       [],
    ...extra,
    ..._locked(),
  };
}

export function verifyAgentClaim(params) {
  const {
    claim_id,
    claim_type,
    claimed_by_agent          = null,
    claimed_files             = [],
    expected_git_status       = null,
    expected_diff_files       = [],
    expected_test_command     = null,
    expected_exit_code        = null,
    expected_commit_hash      = null,
    expected_pr_number        = null,
    evidence_receipt          = null,
    local_observation         = null,
  } = params || {};

  const claimKey = [
    claim_id, claim_type, claimed_by_agent,
    JSON.stringify(claimed_files),
    expected_commit_hash, expected_pr_number,
  ].join('|');
  const claim_verification_id = _sha256(claimKey);

  if (!claim_id || String(claim_id).trim() === '') {
    return _blockedResult(
      claim_verification_id,
      'CLAIM_BLOCKED_NO_PROOF',
      ['claim_id'],
      { blocked_reason: 'claim_id is required.' }
    );
  }

  if (!claim_type || !CLAIM_TYPES.includes(claim_type)) {
    return _blockedResult(
      claim_verification_id,
      'CLAIM_BLOCKED_NO_PROOF',
      ['claim_type'],
      { blocked_reason: `Unknown or missing claim_type: ${claim_type}` }
    );
  }

  const obs = local_observation || {};
  const verified_proofs = [];
  const missing_proofs  = [];

  if (claim_type === 'FILE_CREATED') {
    const files = Array.isArray(claimed_files) ? claimed_files : [];
    if (files.length === 0) {
      missing_proofs.push('claimed_files');
    } else {
      const allExist = files.every(f => obs.file_exists?.[f] === true);
      if (allExist) {
        verified_proofs.push('file_exists');
      } else {
        const missing = files.filter(f => obs.file_exists?.[f] !== true);
        missing_proofs.push(`file_exists:${missing.join(',')}`);
        return _blockedResult(
          claim_verification_id,
          'CLAIM_BLOCKED_MISSING_FILE',
          missing_proofs,
          { claim_id, claim_type, claimed_by_agent }
        );
      }
    }
  }

  if (claim_type === 'FILE_MODIFIED') {
    const diffFiles = Array.isArray(expected_diff_files) ? expected_diff_files : [];
    if (diffFiles.length === 0 && !obs.git_diff_stat) {
      missing_proofs.push('expected_diff_files');
    } else {
      const actualDiff = obs.git_diff_files || [];
      const allInDiff = diffFiles.every(f => actualDiff.includes(f));
      if (diffFiles.length > 0 && allInDiff) {
        verified_proofs.push('git_diff_files');
      } else if (diffFiles.length > 0 && !allInDiff) {
        const notInDiff = diffFiles.filter(f => !actualDiff.includes(f));
        missing_proofs.push(`git_diff:${notInDiff.join(',')}`);
        return _blockedResult(
          claim_verification_id,
          'CLAIM_BLOCKED_MISSING_DIFF',
          missing_proofs,
          { claim_id, claim_type, claimed_by_agent }
        );
      } else if (!obs.git_diff_stat || obs.git_diff_stat === 'empty') {
        missing_proofs.push('git_diff_stat');
        return _blockedResult(
          claim_verification_id,
          'CLAIM_BLOCKED_MISSING_DIFF',
          missing_proofs,
          { claim_id, claim_type, claimed_by_agent }
        );
      }
    }
  }

  if (claim_type === 'TEST_EXECUTED') {
    if (!expected_test_command) {
      missing_proofs.push('expected_test_command');
    }
    const actualExit = obs.exit_code;
    if (actualExit === null || actualExit === undefined) {
      missing_proofs.push('exit_code');
      return _blockedResult(
        claim_verification_id,
        'CLAIM_BLOCKED_TEST_NOT_RUN',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    const wantedExit = expected_exit_code !== null ? expected_exit_code : 0;
    if (actualExit !== wantedExit) {
      missing_proofs.push(`exit_code_mismatch:expected=${wantedExit},got=${actualExit}`);
      return _blockedResult(
        claim_verification_id,
        'CLAIM_BLOCKED_EXIT_CODE',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    verified_proofs.push('test_exit_code');
    if (obs.output_hash) verified_proofs.push('output_hash');
  }

  if (claim_type === 'COMMIT_CREATED') {
    if (!expected_commit_hash || !obs.commit_hash) {
      missing_proofs.push('commit_hash');
      return _blockedResult(
        claim_verification_id,
        'CLAIM_BLOCKED_NO_PROOF',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    if (obs.commit_hash !== expected_commit_hash) {
      missing_proofs.push(`commit_hash_mismatch:expected=${expected_commit_hash},got=${obs.commit_hash}`);
      return _blockedResult(
        claim_verification_id,
        'CLAIM_HALLUCINATION_RISK',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    verified_proofs.push('commit_hash');
  }

  if (claim_type === 'PR_CREATED' || claim_type === 'PR_MERGED') {
    if (!expected_pr_number || !obs.pr_number) {
      missing_proofs.push('pr_number');
      return _blockedResult(
        claim_verification_id,
        'CLAIM_BLOCKED_NO_PROOF',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    verified_proofs.push('pr_number');
    if (claim_type === 'PR_MERGED' && obs.pr_state !== 'MERGED') {
      missing_proofs.push('pr_state_merged');
      return _blockedResult(
        claim_verification_id,
        'CLAIM_BLOCKED_NO_PROOF',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    if (claim_type === 'PR_MERGED') verified_proofs.push('pr_state_merged');
  }

  if (claim_type === 'SCRIPT_ADDED') {
    if (!obs.package_script_exists) {
      missing_proofs.push('package_script_exists');
      return _blockedResult(
        claim_verification_id,
        'CLAIM_BLOCKED_MISSING_FILE',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    verified_proofs.push('package_script_exists');
  }

  if (claim_type === 'BASELINE_READY') {
    if (!obs.baseline_valid) {
      missing_proofs.push('baseline_valid');
      return _blockedResult(
        claim_verification_id,
        'CLAIM_BLOCKED_NO_PROOF',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    verified_proofs.push('baseline_valid');
  }

  if (claim_type === 'PASS_GOLD_CLAIMED') {
    if (!evidence_receipt || typeof evidence_receipt !== 'object') {
      missing_proofs.push('evidence_receipt');
      return _blockedResult(
        claim_verification_id,
        'CLAIM_BLOCKED_NO_PROOF',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    if (!evidence_receipt.pass_gold) {
      missing_proofs.push('evidence_receipt.pass_gold');
      return _blockedResult(
        claim_verification_id,
        'CLAIM_BLOCKED_NO_PROOF',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    if (!evidence_receipt.receipt_id) {
      missing_proofs.push('evidence_receipt.receipt_id');
      return _blockedResult(
        claim_verification_id,
        'CLAIM_BLOCKED_NO_PROOF',
        missing_proofs,
        { claim_id, claim_type, claimed_by_agent }
      );
    }
    verified_proofs.push('evidence_receipt');
  }

  if (missing_proofs.length > 0) {
    return _blockedResult(
      claim_verification_id,
      'CLAIM_BLOCKED_NO_PROOF',
      missing_proofs,
      { claim_id, claim_type, claimed_by_agent }
    );
  }

  return {
    claim_verification_id,
    schema_version:      SCHEMA_VERSION,
    claim_status:        'CLAIM_VERIFIED',
    claim_verified:      true,
    claim_blocked:       false,
    agent_claim_trusted: true,
    hallucination_risk:  false,
    claim_id,
    claim_type,
    claimed_by_agent,
    missing_proofs:      [],
    verified_proofs,
    verified_at:         new Date().toISOString(),
    ..._locked(),
  };
}

export function validateClaimVerification(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'claim_verification_id', 'schema_version', 'claim_status',
    'claim_verified', 'claim_blocked', 'agent_claim_trusted',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!CLAIM_VERIFICATION_STATUSES.includes(result.claim_status)) {
    errors.push(`invalid claim_status: ${result.claim_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderClaimVerification(result) {
  if (!result || typeof result !== 'object') {
    return '[AGENT_CLAIM_VERIFICATION_GATE] No result to render.';
  }
  const lines = [
    `=== Agent Claim Verification Gate [${SCHEMA_VERSION}] ===`,
    `Status:               ${result.claim_status ?? 'N/A'}`,
    `Claim ID:             ${result.claim_id ?? 'N/A'}`,
    `Claim type:           ${result.claim_type ?? 'N/A'}`,
    `Claimed by:           ${result.claimed_by_agent ?? 'N/A'}`,
    `Verified:             ${result.claim_verified}`,
    `Trusted:              ${result.agent_claim_trusted}`,
    `Hallucination risk:   ${result.hallucination_risk}`,
    `Verified proofs:      ${(result.verified_proofs ?? []).join(', ') || 'none'}`,
    `Missing proofs:       ${(result.missing_proofs ?? []).join(', ') || 'none'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
