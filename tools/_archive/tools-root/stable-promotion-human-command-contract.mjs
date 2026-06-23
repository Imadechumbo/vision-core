#!/usr/bin/env node
/**
 * Stable Promotion Human Command Contract — V116.0
 *
 * Prepares human command contract for future stable promotion.
 * Does NOT execute the command. Does NOT promote stable.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v116.0';

export const ALLOWED_TARGET_REFS = [
  'stable',
  'production/stable',
  'refs/heads/stable',
];

export const HUMAN_COMMAND_CONTRACT_STATUSES = [
  'HUMAN_COMMAND_CONTRACT_BLOCKED_BASELINE',
  'HUMAN_COMMAND_CONTRACT_BLOCKED_PREFLIGHT',
  'HUMAN_COMMAND_CONTRACT_BLOCKED_TARGET',
  'HUMAN_COMMAND_CONTRACT_BLOCKED_ROLLBACK',
  'HUMAN_COMMAND_CONTRACT_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:  false,
    stable_promoted:           false,
    git_push_performed:        false,
    deploy_performed:          false,
    release_performed:         false,
    human_required:            true,
    local_interactive_only:    true,
    future_command_required:   true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    contract_status:   status,
    contract_ready:    false,
    blocking_reason:   reason,
    ..._locked(),
    ...extra,
  };
}

function _contractId(baseline_id, preflight_id, target_stable_ref, target_tag) {
  return _sha256([baseline_id || '', preflight_id || '', target_stable_ref || '', target_tag || '', 'hcc-v116.0'].join('|'));
}

export function buildStablePromotionHumanCommandContract(params) {
  const {
    stable_review_baseline,
    stable_promotion_preflight,
    target_stable_ref,
    target_tag,
    git_head,
    rollback_anchor_id,
    requested_by,
    no_ci,
    no_deploy,
    no_release,
  } = params || {};

  // Validate baseline
  if (!stable_review_baseline || !stable_review_baseline.stable_review_baseline_ready) {
    return _blocked('HUMAN_COMMAND_CONTRACT_BLOCKED_BASELINE', 'stable_review_baseline not ready');
  }

  // Validate preflight
  if (!stable_promotion_preflight || !stable_promotion_preflight.stable_preflight_ready) {
    return _blocked('HUMAN_COMMAND_CONTRACT_BLOCKED_PREFLIGHT', 'stable_promotion_preflight not ready');
  }

  // Validate target ref
  if (!ALLOWED_TARGET_REFS.includes(target_stable_ref)) {
    return _blocked(
      'HUMAN_COMMAND_CONTRACT_BLOCKED_TARGET',
      `target_stable_ref "${target_stable_ref}" not allowed`
    );
  }

  // Validate rollback
  if (!rollback_anchor_id) {
    return _blocked('HUMAN_COMMAND_CONTRACT_BLOCKED_ROLLBACK', 'rollback_anchor_id required');
  }

  const baseline_id  = stable_review_baseline.baseline_id || null;
  const preflight_id = stable_promotion_preflight.preflight_id || null;
  const contract_id  = _contractId(baseline_id, preflight_id, target_stable_ref, target_tag);

  return {
    schema_version:          SCHEMA_VERSION,
    contract_id,
    contract_status:         'HUMAN_COMMAND_CONTRACT_READY',
    contract_ready:          true,
    baseline_id,
    preflight_id,
    target_stable_ref,
    target_tag:              target_tag || null,
    git_head:                git_head || null,
    rollback_anchor_id,
    requested_by:            requested_by || null,
    no_ci:                   no_ci !== false,
    no_deploy:               no_deploy !== false,
    no_release:              no_release !== false,
    ..._locked(),
  };
}

export function validateStablePromotionHumanCommandContract(contract) {
  if (!contract || typeof contract !== 'object') {
    return { valid: false, errors: ['contract is null/undefined'] };
  }

  const errors = [];

  if (!HUMAN_COMMAND_CONTRACT_STATUSES.includes(contract.contract_status)) {
    errors.push(`invalid contract_status: ${contract.contract_status}`);
  }
  if (contract.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (contract.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (contract.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (contract.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (contract.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (contract.release_performed !== false) errors.push('release_performed must be false');
  if (contract.human_required !== true) errors.push('human_required must be true');
  if (contract.local_interactive_only !== true) errors.push('local_interactive_only must be true');
  if (contract.future_command_required !== true) errors.push('future_command_required must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionHumanCommandContract(contract) {
  if (!contract || !contract.contract_ready) {
    return `[HUMAN COMMAND CONTRACT BLOCKED] ${contract?.contract_status || 'unknown'}: ${contract?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION HUMAN COMMAND CONTRACT ===`,
    `Schema:                    ${contract.schema_version}`,
    `Contract ID:               ${contract.contract_id}`,
    `Status:                    ${contract.contract_status}`,
    `Target Ref:                ${contract.target_stable_ref}`,
    `Target Tag:                ${contract.target_tag || 'null'}`,
    `Git HEAD:                  ${contract.git_head || 'null'}`,
    `Rollback Anchor:           ${contract.rollback_anchor_id}`,
    `Requested By:              ${contract.requested_by || 'anonymous'}`,
    `human_required:            ${contract.human_required}`,
    `local_interactive_only:    ${contract.local_interactive_only}`,
    `future_command_required:   ${contract.future_command_required}`,
    `stable_promotion_allowed:  ${contract.stable_promotion_allowed}`,
    `stable_promoted:           ${contract.stable_promoted}`,
    `git_push_performed:        ${contract.git_push_performed}`,
    `deploy_performed:          ${contract.deploy_performed}`,
    `release_performed:         ${contract.release_performed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-human-command-contract.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockBaseline  = { stable_review_baseline_ready: true, baseline_id: 'mock-baseline-v116' };
  const mockPreflight = { stable_preflight_ready: true, preflight_id: 'mock-preflight-v116' };

  const contract = buildStablePromotionHumanCommandContract({
    stable_review_baseline:    mockBaseline,
    stable_promotion_preflight: mockPreflight,
    target_stable_ref:         'stable',
    target_tag:                'v116.0-mock',
    git_head:                  'cafecafe1234567',
    rollback_anchor_id:        'rollback-mock-v116',
    requested_by:              'human-operator',
  });

  if (isJson) {
    console.log(JSON.stringify(contract, null, 2));
  } else {
    console.log(renderStablePromotionHumanCommandContract(contract));
  }
}
