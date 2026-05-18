#!/usr/bin/env node
/**
 * Real Tag Manual Confirmation Contract — V81.1
 *
 * Human confirmation binding for real tag manual executor.
 * Validates that the human explicitly confirms target_tag, git_head,
 * evidence_receipt, and rollback_anchor before proceeding.
 *
 * REGRA ABSOLUTA: tag_created=false always. confirm_no_deploy=true always.
 * confirm_local_interactive_only=true always. ci_blocked=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v81.1';

export const MANUAL_CONFIRMATION_PHRASE =
  'I CONFIRM THIS IS A LOCAL MANUAL TAG EXECUTOR REVIEW AND DOES NOT RUN TAG PUSH DEPLOY STABLE OR RELEASE';

export const MANUAL_CONFIRMATION_STATUSES = [
  'MANUAL_TAG_CONFIRMATION_BLOCKED_CONTRACT',
  'MANUAL_TAG_CONFIRMATION_REJECTED',
  'MANUAL_TAG_CONFIRMATION_EXPIRED',
  'MANUAL_TAG_CONFIRMATION_PHRASE_MISMATCH',
  'MANUAL_TAG_CONFIRMATION_TARGET_MISMATCH',
  'MANUAL_TAG_CONFIRMATION_HEAD_MISMATCH',
  'MANUAL_TAG_CONFIRMATION_EVIDENCE_MISMATCH',
  'MANUAL_TAG_CONFIRMATION_ROLLBACK_MISMATCH',
  'MANUAL_TAG_CONFIRMATION_READY_REVIEW',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    confirm_no_deploy:              true,
    confirm_no_stable_promotion:    true,
    confirm_no_release:             true,
    confirm_local_interactive_only: true,
    confirm_ci_blocked:             true,
    tag_created:                    false,
    git_push_performed:             false,
    deploy_performed:               false,
    stable_promoted:                false,
    release_performed:              false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:               SCHEMA_VERSION,
    manual_confirmation_status:   status,
    manual_confirmation_ready:    false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function createRealTagManualConfirmationContract(params = {}) {
  const {
    fixture_mode             = false,
    executor_contract,
    confirm_target_tag,
    confirm_git_head,
    confirm_evidence_receipt,
    confirm_rollback_anchor,
    human_confirmation_phrase,
    requested_by,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const expires_at = new Date(new Date(now).getTime() + 60 * 60 * 1000).toISOString();

  if (fixture_mode) {
    const id = _sha256(`real-tag-manual-confirmation:${SCHEMA_VERSION}:fixture:${now}`).slice(0, 24);
    return {
      schema_version:               SCHEMA_VERSION,
      manual_confirmation_id:       id,
      manual_confirmation_status:   'MANUAL_TAG_CONFIRMATION_READY_REVIEW',
      manual_confirmation_ready:    true,
      blocking_reason:              null,
      executor_contract_id:         'contract-fixture-id',
      confirm_target_tag:           'v1.2.3',
      confirm_git_head:             'abc1234def5678901234567890123456789012ab',
      confirm_evidence_receipt:     'receipt-fixture-id',
      confirm_rollback_anchor:      'anchor-fixture-id',
      human_confirmation_phrase:    MANUAL_CONFIRMATION_PHRASE,
      requested_by:                 'fixture-user',
      created_at:                   now,
      expires_at,
      ..._locked(),
    };
  }

  // Missing required fields
  if (!confirm_target_tag || !confirm_git_head || !confirm_evidence_receipt || !confirm_rollback_anchor) {
    return _blocked('MANUAL_TAG_CONFIRMATION_BLOCKED_CONTRACT', 'required_confirmation_fields_missing', {
      manual_confirmation_id: null, created_at: now, expires_at,
    });
  }

  // Expired
  if (params.force_expired) {
    return _blocked('MANUAL_TAG_CONFIRMATION_EXPIRED', 'confirmation_expired', {
      manual_confirmation_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at: now,
    });
  }

  // Rejected (explicit)
  if (params.force_rejected) {
    return _blocked('MANUAL_TAG_CONFIRMATION_REJECTED', 'confirmation_rejected_by_user', {
      manual_confirmation_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  // Phrase check
  if (human_confirmation_phrase !== MANUAL_CONFIRMATION_PHRASE) {
    return _blocked('MANUAL_TAG_CONFIRMATION_PHRASE_MISMATCH', 'confirmation_phrase_mismatch', {
      manual_confirmation_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  // Target tag match
  if (executor_contract && executor_contract.target_tag !== confirm_target_tag) {
    return _blocked('MANUAL_TAG_CONFIRMATION_TARGET_MISMATCH', 'target_tag_mismatch', {
      manual_confirmation_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  // Git head match
  if (executor_contract && executor_contract.git_head !== confirm_git_head) {
    return _blocked('MANUAL_TAG_CONFIRMATION_HEAD_MISMATCH', 'git_head_mismatch', {
      manual_confirmation_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  // Evidence receipt match
  if (executor_contract && executor_contract.evidence_receipt_id !== confirm_evidence_receipt) {
    return _blocked('MANUAL_TAG_CONFIRMATION_EVIDENCE_MISMATCH', 'evidence_receipt_mismatch', {
      manual_confirmation_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  // Rollback anchor match
  if (executor_contract && executor_contract.rollback_anchor_id !== confirm_rollback_anchor) {
    return _blocked('MANUAL_TAG_CONFIRMATION_ROLLBACK_MISMATCH', 'rollback_anchor_mismatch', {
      manual_confirmation_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  const id = _sha256(
    `real-tag-manual-confirmation:${SCHEMA_VERSION}:${confirm_target_tag}:${confirm_git_head}:${confirm_evidence_receipt}:${now}`
  ).slice(0, 24);

  return {
    schema_version:               SCHEMA_VERSION,
    manual_confirmation_id:       id,
    manual_confirmation_status:   'MANUAL_TAG_CONFIRMATION_READY_REVIEW',
    manual_confirmation_ready:    true,
    blocking_reason:              null,
    executor_contract_id:         executor_contract?.manual_executor_contract_id ?? null,
    confirm_target_tag,
    confirm_git_head,
    confirm_evidence_receipt,
    confirm_rollback_anchor,
    human_confirmation_phrase,
    requested_by:                 requested_by ?? null,
    created_at:                   now,
    expires_at,
    ..._locked(),
  };
}

export function validateRealTagManualConfirmationContract(contract) {
  if (!contract || typeof contract !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!MANUAL_CONFIRMATION_STATUSES.includes(contract.manual_confirmation_status))
    return { valid: false, reason: 'unknown_status' };
  if (contract.tag_created         === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (contract.git_push_performed  === true) return { valid: false, reason: 'git_push_must_be_false' };
  if (contract.deploy_performed    === true) return { valid: false, reason: 'deploy_performed_must_be_false' };
  return { valid: true };
}

export function bindRealTagManualConfirmation(params = {}) {
  return createRealTagManualConfirmationContract(params);
}

export function renderRealTagManualConfirmationSummary(contract) {
  if (!contract) return 'real_tag_manual_confirmation_contract: null';
  return [
    `manual_confirmation_status      : ${contract.manual_confirmation_status ?? 'UNKNOWN'}`,
    `manual_confirmation_id          : ${contract.manual_confirmation_id ?? 'none'}`,
    `executor_contract_id            : ${contract.executor_contract_id ?? 'none'}`,
    `confirm_target_tag              : ${contract.confirm_target_tag ?? 'none'}`,
    `confirm_git_head                : ${contract.confirm_git_head ?? 'none'}`,
    `confirm_evidence_receipt        : ${contract.confirm_evidence_receipt ?? 'none'}`,
    `confirm_rollback_anchor         : ${contract.confirm_rollback_anchor ?? 'none'}`,
    `confirm_no_deploy               : true`,
    `confirm_no_stable_promotion     : true`,
    `confirm_no_release              : true`,
    `confirm_local_interactive_only  : true`,
    `confirm_ci_blocked              : true`,
    `tag_created                     : false`,
    `git_push_performed              : false`,
    `deploy_performed                : false`,
    `blocking_reason                 : ${contract.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-confirmation-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');
  const result  = createRealTagManualConfirmationContract({ fixture_mode: fixture });
  if (json) console.log(JSON.stringify(result, null, 2));
  else      console.log(renderRealTagManualConfirmationSummary(result));
  process.exit(result.manual_confirmation_ready ? 0 : 1);
}
