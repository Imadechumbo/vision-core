#!/usr/bin/env node
/**
 * Real Tag One-Shot Contract — V76.0
 *
 * Defines pre-conditions, human confirmations, and invariants for a
 * real tag one-shot operation. Does NOT create a tag.
 *
 * REGRA ABSOLUTA: real_execution_allowed=false always in this version.
 * tag_created=false always. git_push_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v76.0';

export const REQUIRED_CONFIRMATION_PHRASE =
  'I ACKNOWLEDGE THIS PREPARES A REAL ONE SHOT TAG BUT DOES NOT CREATE TAG PUSH DEPLOY STABLE OR RELEASE';

export const TAG_ONE_SHOT_CONTRACT_STATUSES = [
  'TAG_ONE_SHOT_CONTRACT_MISSING',
  'TAG_ONE_SHOT_CONTRACT_INVALID',
  'TAG_ONE_SHOT_CONTRACT_EXPIRED',
  'TAG_ONE_SHOT_CONTRACT_BLOCKED_BASELINE',
  'TAG_ONE_SHOT_CONTRACT_BLOCKED_TAG_GATE',
  'TAG_ONE_SHOT_CONTRACT_BLOCKED_EVIDENCE',
  'TAG_ONE_SHOT_CONTRACT_BLOCKED_TAG_NAME',
  'TAG_ONE_SHOT_CONTRACT_PHRASE_MISMATCH',
  'TAG_ONE_SHOT_CONTRACT_READY_REVIEW',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    dry_run_required:           true,
    real_execution_allowed:     false,
    real_execution_armed:       false,
    tag_created:                false,
    git_push_performed:         false,
    deploy_performed:           false,
    stable_promoted:            false,
    release_performed:          false,
    rollback_anchor_required:   true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                    SCHEMA_VERSION,
    one_shot_contract_status:          status,
    one_shot_contract_ready:           false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function createRealTagOneShotContract(params = {}) {
  const {
    fixture_mode        = false,
    real_manual_exec_baseline,
    tag_gate,
    target_tag,
    target_version,
    git_head,
    evidence_receipt_id,
    evidence_source,
    requested_by,
    requester_role,
    human_confirmation_phrase,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const expires_at = new Date(new Date(now).getTime() + 60 * 60 * 1000).toISOString();

  if (fixture_mode) {
    const contract_id = _sha256(`real-tag-one-shot-contract:${SCHEMA_VERSION}:fixture:${now}`).slice(0, 24);
    return {
      schema_version:                SCHEMA_VERSION,
      one_shot_contract_id:          contract_id,
      one_shot_contract_status:      'TAG_ONE_SHOT_CONTRACT_READY_REVIEW',
      one_shot_contract_ready:       true,
      blocking_reason:               null,
      real_manual_exec_baseline_id:  'baseline-fixture-id',
      tag_gate_id:                   'gate-fixture-id',
      target_tag:                    'v1.2.3',
      target_version:                '1.2.3',
      git_head:                      'abc1234def5678901234567890123456789012ab',
      evidence_receipt_id:           'receipt-fixture-id',
      evidence_source:               'go-core',
      requested_by:                  'fixture-user',
      requester_role:                'release-manager',
      human_confirmation_phrase:     REQUIRED_CONFIRMATION_PHRASE,
      created_at:                    now,
      expires_at,
      ..._locked(),
    };
  }

  // Missing check
  if (!target_tag || !git_head || !evidence_receipt_id || !requested_by) {
    return _blocked('TAG_ONE_SHOT_CONTRACT_MISSING', 'required_fields_missing', {
      one_shot_contract_id: null,
      created_at: now,
      expires_at,
    });
  }

  // Expired check
  if (params.force_expired) {
    return _blocked('TAG_ONE_SHOT_CONTRACT_EXPIRED', 'contract_expired', {
      one_shot_contract_id: _sha256(`real-tag-one-shot-contract:${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now,
      expires_at: now,
    });
  }

  // Baseline check
  const baselineReady = real_manual_exec_baseline?.real_manual_exec_baseline_status ===
    'REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY';
  if (!baselineReady) {
    return _blocked('TAG_ONE_SHOT_CONTRACT_BLOCKED_BASELINE', 'baseline_not_ready', {
      one_shot_contract_id: _sha256(`real-tag-one-shot-contract:${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now,
      expires_at,
    });
  }

  // Tag gate check
  const gateReady = tag_gate?.tag_gate_status === 'TAG_GATE_READY_REQUIRES_COMMAND';
  if (!gateReady) {
    return _blocked('TAG_ONE_SHOT_CONTRACT_BLOCKED_TAG_GATE', 'tag_gate_not_ready', {
      one_shot_contract_id: _sha256(`real-tag-one-shot-contract:${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now,
      expires_at,
    });
  }

  // Evidence source check
  if (evidence_source !== 'go-core') {
    return _blocked('TAG_ONE_SHOT_CONTRACT_BLOCKED_EVIDENCE', 'evidence_source_not_go_core', {
      one_shot_contract_id: _sha256(`real-tag-one-shot-contract:${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now,
      expires_at,
    });
  }

  // Tag name check
  if (!target_tag.startsWith('v')) {
    return _blocked('TAG_ONE_SHOT_CONTRACT_BLOCKED_TAG_NAME', 'target_tag_must_start_with_v', {
      one_shot_contract_id: _sha256(`real-tag-one-shot-contract:${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now,
      expires_at,
    });
  }

  // Phrase check
  if (human_confirmation_phrase !== REQUIRED_CONFIRMATION_PHRASE) {
    return _blocked('TAG_ONE_SHOT_CONTRACT_PHRASE_MISMATCH', 'confirmation_phrase_mismatch', {
      one_shot_contract_id: _sha256(`real-tag-one-shot-contract:${SCHEMA_VERSION}:${now}`).slice(0, 24),
      created_at: now,
      expires_at,
    });
  }

  const contract_id = _sha256(
    `real-tag-one-shot-contract:${SCHEMA_VERSION}:${target_tag}:${git_head}:${evidence_receipt_id}:${now}`
  ).slice(0, 24);

  return {
    schema_version:                SCHEMA_VERSION,
    one_shot_contract_id:          contract_id,
    one_shot_contract_status:      'TAG_ONE_SHOT_CONTRACT_READY_REVIEW',
    one_shot_contract_ready:       true,
    blocking_reason:               null,
    real_manual_exec_baseline_id:  real_manual_exec_baseline?.baseline_id ?? null,
    tag_gate_id:                   tag_gate?.tag_gate_id ?? null,
    target_tag,
    target_version:                target_version ?? null,
    git_head,
    evidence_receipt_id,
    evidence_source,
    requested_by,
    requester_role:                requester_role ?? null,
    human_confirmation_phrase,
    created_at:                    now,
    expires_at,
    ..._locked(),
  };
}

export function validateRealTagOneShotContract(contract) {
  if (!contract || typeof contract !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!TAG_ONE_SHOT_CONTRACT_STATUSES.includes(contract.one_shot_contract_status))
    return { valid: false, reason: 'unknown_status' };
  if (contract.real_execution_allowed === true) return { valid: false, reason: 'real_execution_must_be_false' };
  if (contract.tag_created === true)            return { valid: false, reason: 'tag_created_must_be_false' };
  if (contract.git_push_performed === true)     return { valid: false, reason: 'git_push_must_be_false' };
  return { valid: true };
}

export function normalizeRealTagOneShotContract(contract) {
  if (!contract) return null;
  return {
    ...contract,
    ..._locked(),
  };
}

export function renderRealTagOneShotContractSummary(contract) {
  if (!contract) return 'real_tag_one_shot_contract: null';
  return [
    `one_shot_contract_status    : ${contract.one_shot_contract_status ?? 'UNKNOWN'}`,
    `one_shot_contract_id        : ${contract.one_shot_contract_id ?? 'none'}`,
    `target_tag                  : ${contract.target_tag ?? 'none'}`,
    `evidence_source             : ${contract.evidence_source ?? 'none'}`,
    `real_execution_allowed      : false`,
    `real_execution_armed        : false`,
    `tag_created                 : false`,
    `git_push_performed          : false`,
    `deploy_performed            : false`,
    `stable_promoted             : false`,
    `release_performed           : false`,
    `dry_run_required            : true`,
    `rollback_anchor_required    : true`,
    `blocking_reason             : ${contract.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createRealTagOneShotContract({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagOneShotContractSummary(result));
  }

  process.exit(result.one_shot_contract_ready ? 0 : 1);
}
