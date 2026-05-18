#!/usr/bin/env node
/**
 * Real Tag Manual Executor Contract — V81.0
 *
 * Defines the manual executor contract for real tag one-shot.
 * Does NOT create a tag.
 *
 * REGRA ABSOLUTA: real_tag_execution_allowed=false in this version.
 * tag_created=false always. git_push_performed=false always.
 * local_interactive_only=true. ci_blocked=true.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v81.0';

export const MANUAL_EXEC_CONTRACT_PHRASE =
  'I ACKNOWLEDGE THIS CONTRACT PREPARES A REAL MANUAL TAG EXECUTOR BUT DOES NOT CREATE TAG PUSH DEPLOY STABLE OR RELEASE';

export const MANUAL_TAG_EXEC_CONTRACT_STATUSES = [
  'MANUAL_TAG_EXEC_CONTRACT_MISSING',
  'MANUAL_TAG_EXEC_CONTRACT_INVALID',
  'MANUAL_TAG_EXEC_CONTRACT_EXPIRED',
  'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_BASELINE',
  'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_REPORT',
  'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_EVIDENCE',
  'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_ROLLBACK',
  'MANUAL_TAG_EXEC_CONTRACT_BLOCKED_TAG_NAME',
  'MANUAL_TAG_EXEC_CONTRACT_PHRASE_MISMATCH',
  'MANUAL_TAG_EXEC_CONTRACT_READY_REVIEW',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    manual_executor_only:         true,
    local_interactive_only:       true,
    ci_blocked:                   true,
    dry_run_default:              true,
    real_tag_execution_allowed:   false,
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                       SCHEMA_VERSION,
    manual_executor_contract_status:      status,
    manual_executor_contract_ready:       false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function createRealTagManualExecutorContract(params = {}) {
  const {
    fixture_mode             = false,
    real_tag_baseline,
    one_shot_report,
    target_tag,
    target_version,
    git_head,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id,
    requested_by,
    requester_role,
    human_confirmation_phrase,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const expires_at = new Date(new Date(now).getTime() + 60 * 60 * 1000).toISOString();

  if (fixture_mode) {
    const contract_id = _sha256(`real-tag-manual-exec-contract:${SCHEMA_VERSION}:fixture:${now}`).slice(0, 24);
    return {
      schema_version:                       SCHEMA_VERSION,
      manual_executor_contract_id:          contract_id,
      manual_executor_contract_status:      'MANUAL_TAG_EXEC_CONTRACT_READY_REVIEW',
      manual_executor_contract_ready:       true,
      blocking_reason:                      null,
      real_tag_baseline_id:                 'baseline-fixture-id',
      one_shot_report_id:                   'report-fixture-id',
      target_tag:                           'v1.2.3',
      target_version:                       '1.2.3',
      git_head:                             'abc1234def5678901234567890123456789012ab',
      evidence_receipt_id:                  'receipt-fixture-id',
      evidence_source:                      'go-core',
      rollback_anchor_id:                   'anchor-fixture-id',
      requested_by:                         'fixture-user',
      requester_role:                       'release-manager',
      human_confirmation_phrase:            MANUAL_EXEC_CONTRACT_PHRASE,
      created_at:                           now,
      expires_at,
      ..._locked(),
    };
  }

  // Missing check
  if (!target_tag || !git_head || !evidence_receipt_id || !requested_by) {
    return _blocked('MANUAL_TAG_EXEC_CONTRACT_MISSING', 'required_fields_missing', {
      manual_executor_contract_id: null, created_at: now, expires_at,
    });
  }

  // Expired
  if (params.force_expired) {
    return _blocked('MANUAL_TAG_EXEC_CONTRACT_EXPIRED', 'contract_expired', {
      manual_executor_contract_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at: now,
    });
  }

  // Baseline check
  if (real_tag_baseline?.real_tag_baseline_status !== 'REAL_TAG_BASELINE_READY_FOR_FUTURE_MANUAL_EXECUTOR') {
    return _blocked('MANUAL_TAG_EXEC_CONTRACT_BLOCKED_BASELINE', 'real_tag_baseline_not_ready', {
      manual_executor_contract_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  // Report check
  if (one_shot_report?.tag_report_status !== 'TAG_REPORT_READY_FOR_FUTURE_MANUAL_EXECUTOR') {
    return _blocked('MANUAL_TAG_EXEC_CONTRACT_BLOCKED_REPORT', 'one_shot_report_not_ready', {
      manual_executor_contract_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  // Evidence source
  if (evidence_source !== 'go-core') {
    return _blocked('MANUAL_TAG_EXEC_CONTRACT_BLOCKED_EVIDENCE', 'evidence_source_not_go_core', {
      manual_executor_contract_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  // Rollback anchor
  if (!rollback_anchor_id) {
    return _blocked('MANUAL_TAG_EXEC_CONTRACT_BLOCKED_ROLLBACK', 'rollback_anchor_id_missing', {
      manual_executor_contract_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  // Tag name
  if (!target_tag.startsWith('v')) {
    return _blocked('MANUAL_TAG_EXEC_CONTRACT_BLOCKED_TAG_NAME', 'target_tag_must_start_with_v', {
      manual_executor_contract_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  // Phrase
  if (human_confirmation_phrase !== MANUAL_EXEC_CONTRACT_PHRASE) {
    return _blocked('MANUAL_TAG_EXEC_CONTRACT_PHRASE_MISMATCH', 'confirmation_phrase_mismatch', {
      manual_executor_contract_id: _sha256(`${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now, expires_at,
    });
  }

  const contract_id = _sha256(
    `real-tag-manual-exec-contract:${SCHEMA_VERSION}:${target_tag}:${git_head}:${evidence_receipt_id}:${now}`
  ).slice(0, 24);

  return {
    schema_version:                       SCHEMA_VERSION,
    manual_executor_contract_id:          contract_id,
    manual_executor_contract_status:      'MANUAL_TAG_EXEC_CONTRACT_READY_REVIEW',
    manual_executor_contract_ready:       true,
    blocking_reason:                      null,
    real_tag_baseline_id:                 real_tag_baseline?.baseline_id ?? null,
    one_shot_report_id:                   one_shot_report?.report_id ?? null,
    target_tag,
    target_version:                       target_version ?? null,
    git_head,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id,
    requested_by,
    requester_role:                       requester_role ?? null,
    human_confirmation_phrase,
    created_at:                           now,
    expires_at,
    ..._locked(),
  };
}

export function validateRealTagManualExecutorContract(contract) {
  if (!contract || typeof contract !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!MANUAL_TAG_EXEC_CONTRACT_STATUSES.includes(contract.manual_executor_contract_status))
    return { valid: false, reason: 'unknown_status' };
  if (contract.real_tag_execution_allowed === true) return { valid: false, reason: 'execution_must_be_false' };
  if (contract.tag_created               === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (contract.git_push_performed        === true) return { valid: false, reason: 'git_push_must_be_false' };
  return { valid: true };
}

export function normalizeRealTagManualExecutorContract(contract) {
  if (!contract) return null;
  return { ...contract, ..._locked() };
}

export function renderRealTagManualExecutorContractSummary(contract) {
  if (!contract) return 'real_tag_manual_executor_contract: null';
  return [
    `manual_executor_contract_status  : ${contract.manual_executor_contract_status ?? 'UNKNOWN'}`,
    `manual_executor_contract_id      : ${contract.manual_executor_contract_id ?? 'none'}`,
    `target_tag                       : ${contract.target_tag ?? 'none'}`,
    `evidence_source                  : ${contract.evidence_source ?? 'none'}`,
    `rollback_anchor_id               : ${contract.rollback_anchor_id ?? 'none'}`,
    `manual_executor_only             : true`,
    `local_interactive_only           : true`,
    `ci_blocked                       : true`,
    `real_tag_execution_allowed       : false`,
    `tag_created                      : false`,
    `git_push_performed               : false`,
    `deploy_performed                 : false`,
    `stable_promoted                  : false`,
    `release_performed                : false`,
    `dry_run_default                  : true`,
    `blocking_reason                  : ${contract.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-executor-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');
  const result  = createRealTagManualExecutorContract({ fixture_mode: fixture });
  if (json) console.log(JSON.stringify(result, null, 2));
  else      console.log(renderRealTagManualExecutorContractSummary(result));
  process.exit(result.manual_executor_contract_ready ? 0 : 1);
}
