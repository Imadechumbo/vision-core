#!/usr/bin/env node
/**
 * Stable Review Contract After One-Tag Operation — V111.0
 *
 * Creates stable review contract after one real tag operation.
 * Distinguishes dry-run/mock/real tag modes. Does NOT promote stable.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v111.0';

export const STABLE_REVIEW_CONTRACT_STATUSES = [
  'STABLE_REVIEW_CONTRACT_BLOCKED_BASELINE',
  'STABLE_REVIEW_CONTRACT_BLOCKED_EVIDENCE',
  'STABLE_REVIEW_CONTRACT_BLOCKED_TAG',
  'STABLE_REVIEW_CONTRACT_DRY_RUN_REVIEW_READY',
  'STABLE_REVIEW_CONTRACT_MOCK_REAL_TAG_REVIEW_READY',
  'STABLE_REVIEW_CONTRACT_REAL_TAG_REVIEW_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed: false,
    stable_promoted:          false,
    deploy_performed:         false,
    release_performed:        false,
    human_review_required:    true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:              SCHEMA_VERSION,
    contract_status:             status,
    contract_ready:              false,
    blocking_reason:             reason,
    ..._locked(),
    ...extra,
  };
}

function _contractId(baseline_id, target_tag, git_head, evidence_receipt_id) {
  return _sha256([baseline_id, target_tag, git_head, evidence_receipt_id, 'stable-review-contract-v111.0'].join('|'));
}

export function buildStableReviewContractAfterOneTag(params) {
  const {
    one_tag_baseline,
    target_tag,
    git_head,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id,
    tag_operation_mode,
    actual_real_tag_created,
    actual_git_push_performed,
    created_at,
  } = params || {};

  // Validate baseline
  if (!one_tag_baseline || !one_tag_baseline.one_tag_baseline_ready) {
    return _blocked('STABLE_REVIEW_CONTRACT_BLOCKED_BASELINE', 'one_tag_baseline not ready');
  }

  // Validate evidence
  if (evidence_source !== 'go-core' || !evidence_receipt_id) {
    return _blocked('STABLE_REVIEW_CONTRACT_BLOCKED_EVIDENCE',
      'evidence_source must be go-core and evidence_receipt_id required');
  }

  // Validate tag
  if (!target_tag || typeof target_tag !== 'string' || !target_tag.startsWith('v')) {
    return _blocked('STABLE_REVIEW_CONTRACT_BLOCKED_TAG', 'target_tag missing or does not start with v');
  }
  if (!git_head || typeof git_head !== 'string' || git_head.length < 7) {
    return _blocked('STABLE_REVIEW_CONTRACT_BLOCKED_TAG', 'git_head missing or too short');
  }

  const baseline_id = one_tag_baseline.baseline_id || _sha256(JSON.stringify(one_tag_baseline));

  // Determine mode and status
  const is_real = actual_real_tag_created === true && actual_git_push_performed === true;
  const is_mock = (tag_operation_mode === 'mock_real_tag') && !is_real;
  const is_dry  = !is_real && !is_mock;

  let contract_status;
  if (is_real)       contract_status = 'STABLE_REVIEW_CONTRACT_REAL_TAG_REVIEW_READY';
  else if (is_mock)  contract_status = 'STABLE_REVIEW_CONTRACT_MOCK_REAL_TAG_REVIEW_READY';
  else               contract_status = 'STABLE_REVIEW_CONTRACT_DRY_RUN_REVIEW_READY';

  const stable_review_possible      = true;
  const stable_review_allowed_real  = is_real;

  const stable_review_contract_id = _contractId(baseline_id, target_tag, git_head, evidence_receipt_id);

  return {
    schema_version:               SCHEMA_VERSION,
    stable_review_contract_id,
    contract_status,
    contract_ready:               true,
    one_tag_baseline_id:          baseline_id,
    one_tag_baseline_status:      one_tag_baseline.one_tag_baseline_status,
    target_tag,
    git_head,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id:           rollback_anchor_id || null,
    tag_operation_mode:           tag_operation_mode || (is_real ? 'real' : is_mock ? 'mock_real_tag' : 'dry_run'),
    actual_real_tag_created:      actual_real_tag_created || false,
    actual_git_push_performed:    actual_git_push_performed || false,
    stable_review_possible,
    stable_review_allowed_real,
    created_at:                   created_at || new Date().toISOString(),
    ..._locked(),
  };
}

export function validateStableReviewContractAfterOneTag(contract) {
  if (!contract || typeof contract !== 'object') return { valid: false, errors: ['contract is null/undefined'] };

  const errors = [];

  if (!STABLE_REVIEW_CONTRACT_STATUSES.includes(contract.contract_status)) {
    errors.push(`invalid contract_status: ${contract.contract_status}`);
  }
  if (contract.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (contract.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (contract.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (contract.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (contract.release_performed !== false) errors.push('release_performed must be false');
  if (contract.human_review_required !== true) errors.push('human_review_required must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStableReviewContractAfterOneTag(contract) {
  if (!contract || !contract.contract_ready) {
    return `[STABLE REVIEW CONTRACT BLOCKED] ${contract?.contract_status || 'unknown'}: ${contract?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE REVIEW CONTRACT AFTER ONE-TAG OPERATION ===`,
    `Schema:                  ${contract.schema_version}`,
    `Contract ID:             ${contract.stable_review_contract_id}`,
    `Status:                  ${contract.contract_status}`,
    `Target Tag:              ${contract.target_tag}`,
    `Git HEAD:                ${contract.git_head}`,
    `Evidence:                ${contract.evidence_receipt_id} (${contract.evidence_source})`,
    `Mode:                    ${contract.tag_operation_mode}`,
    `actual_real_tag_created: ${contract.actual_real_tag_created}`,
    `stable_review_possible:  ${contract.stable_review_possible}`,
    `stable_review_allowed_real: ${contract.stable_review_allowed_real}`,
    `stable_promotion_allowed: ${contract.stable_promotion_allowed}`,
    `stable_promoted:         ${contract.stable_promoted}`,
    `deploy_performed:        ${contract.deploy_performed}`,
    `release_performed:       ${contract.release_performed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-review-contract-after-one-tag.mjs')) {
  const isJson = process.argv.includes('--json');

  const { readFileSync } = await import('fs');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(__dirname, '..');

  let mockBaseline = {
    one_tag_baseline_ready:  true,
    one_tag_baseline_status: 'ONE_TAG_BASELINE_DRY_RUN_CONFIRMED',
    baseline_id:             'mock-baseline-v110',
    actual_real_tag_created: false,
    stable_promoted:         false,
  };

  try {
    const { buildOneRealTagExecutedBaseline } = await import('./one-real-tag-executed-baseline.mjs');
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const scripts = Object.keys(pkg.scripts || {});
    const result = buildOneRealTagExecutedBaseline({ pkg_scripts: scripts });
    if (result.one_tag_baseline_ready) mockBaseline = result;
  } catch {}

  const contract = buildStableReviewContractAfterOneTag({
    one_tag_baseline:          mockBaseline,
    target_tag:                'v111.0-mock',
    git_head:                  '2f67466',
    evidence_receipt_id:       'mock-evidence-v111',
    evidence_source:           'go-core',
    rollback_anchor_id:        'mock-rollback-v111',
    tag_operation_mode:        'dry_run',
    actual_real_tag_created:   false,
    actual_git_push_performed: false,
  });

  if (isJson) {
    console.log(JSON.stringify(contract, null, 2));
  } else {
    console.log(renderStableReviewContractAfterOneTag(contract));
  }
}
