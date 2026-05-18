#!/usr/bin/env node
/**
 * Real Tag Human Confirmation Binding — V76.1
 *
 * Binds a real tag one-shot contract to explicit human confirmation.
 * Does NOT create a tag.
 *
 * REGRA ABSOLUTA: real_execution_allowed=false always.
 * tag_created=false always. git_push_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v76.1';

export const REQUIRED_BINDING_PHRASE =
  'I CONFIRM TAG ONE SHOT REVIEW ONLY NO TAG PUSH DEPLOY STABLE OR RELEASE IS EXECUTED';

export const TAG_CONFIRMATION_STATUSES = [
  'TAG_CONFIRMATION_BLOCKED_CONTRACT',
  'TAG_CONFIRMATION_REJECTED',
  'TAG_CONFIRMATION_EXPIRED',
  'TAG_CONFIRMATION_PHRASE_MISMATCH',
  'TAG_CONFIRMATION_TARGET_MISMATCH',
  'TAG_CONFIRMATION_READY_REVIEW',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    real_execution_allowed:       false,
    real_execution_armed:         false,
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_tag_review_ready:        false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:               SCHEMA_VERSION,
    binding_status:               status,
    binding_ready:                false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function bindRealTagHumanConfirmation(params = {}) {
  const {
    fixture_mode              = false,
    one_shot_contract,
    confirmed_by,
    confirmer_role,
    confirmation_decision,
    confirmation_phrase,
    target_tag_confirmed,
    git_head_confirmed,
    evidence_receipt_confirmed,
    no_deploy_confirmed,
    no_stable_promotion_confirmed,
    no_release_confirmed,
    rollback_anchor_confirmed,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const binding_id = _sha256(`real-tag-human-confirmation:${SCHEMA_VERSION}:fixture:${now}`).slice(0, 24);
    return {
      schema_version:                   SCHEMA_VERSION,
      binding_id,
      binding_status:                   'TAG_CONFIRMATION_READY_REVIEW',
      binding_ready:                    true,
      blocking_reason:                  null,
      one_shot_contract_id:             'contract-fixture-id',
      confirmed_by:                     'fixture-user',
      confirmer_role:                   'release-manager',
      confirmation_decision:            'approved',
      confirmation_phrase:              REQUIRED_BINDING_PHRASE,
      target_tag_confirmed:             'v1.2.3',
      git_head_confirmed:               'abc1234def5678901234567890123456789012ab',
      evidence_receipt_confirmed:       'receipt-fixture-id',
      no_deploy_confirmed:              true,
      no_stable_promotion_confirmed:    true,
      no_release_confirmed:             true,
      rollback_anchor_confirmed:        true,
      created_at:                       now,
      real_execution_allowed:           false,
      real_execution_armed:             false,
      tag_created:                      false,
      git_push_performed:               false,
      deploy_performed:                 false,
      stable_promoted:                  false,
      release_performed:                false,
      real_tag_review_ready:            true,
    };
  }

  // Contract check
  const contractReady = one_shot_contract?.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW';
  if (!contractReady) {
    return _blocked('TAG_CONFIRMATION_BLOCKED_CONTRACT', 'contract_not_ready', {
      binding_id: null,
      one_shot_contract_id: one_shot_contract?.one_shot_contract_id ?? null,
      created_at: now,
    });
  }

  // Decision check
  if (confirmation_decision !== 'approved') {
    return _blocked('TAG_CONFIRMATION_REJECTED', 'confirmation_decision_not_approved', {
      binding_id: _sha256(`real-tag-human-confirmation:${SCHEMA_VERSION}:${now}`).slice(0, 24),
      one_shot_contract_id: one_shot_contract.one_shot_contract_id,
      created_at: now,
    });
  }

  // Expired check
  if (params.force_expired) {
    return _blocked('TAG_CONFIRMATION_EXPIRED', 'confirmation_expired', {
      binding_id: _sha256(`real-tag-human-confirmation:${SCHEMA_VERSION}:${now}`).slice(0, 24),
      one_shot_contract_id: one_shot_contract.one_shot_contract_id,
      created_at: now,
    });
  }

  // Phrase check
  if (confirmation_phrase !== REQUIRED_BINDING_PHRASE) {
    return _blocked('TAG_CONFIRMATION_PHRASE_MISMATCH', 'confirmation_phrase_mismatch', {
      binding_id: _sha256(`real-tag-human-confirmation:${SCHEMA_VERSION}:${now}`).slice(0, 24),
      one_shot_contract_id: one_shot_contract.one_shot_contract_id,
      created_at: now,
    });
  }

  // Target mismatch check
  const tagMatch      = target_tag_confirmed       === one_shot_contract.target_tag;
  const headMatch     = git_head_confirmed         === one_shot_contract.git_head;
  const receiptMatch  = evidence_receipt_confirmed === one_shot_contract.evidence_receipt_id;
  const noDeployOk    = no_deploy_confirmed        === true;
  const noStableOk    = no_stable_promotion_confirmed === true;
  const noReleaseOk   = no_release_confirmed       === true;
  const rollbackOk    = rollback_anchor_confirmed  === true;

  if (!tagMatch || !headMatch || !receiptMatch || !noDeployOk || !noStableOk || !noReleaseOk || !rollbackOk) {
    return _blocked('TAG_CONFIRMATION_TARGET_MISMATCH', 'confirmation_fields_mismatch', {
      binding_id: _sha256(`real-tag-human-confirmation:${SCHEMA_VERSION}:${now}`).slice(0, 24),
      one_shot_contract_id: one_shot_contract.one_shot_contract_id,
      created_at: now,
    });
  }

  const binding_id = _sha256(
    `real-tag-human-confirmation:${SCHEMA_VERSION}:${one_shot_contract.one_shot_contract_id}:${confirmed_by ?? ''}:${now}`
  ).slice(0, 24);

  return {
    schema_version:                   SCHEMA_VERSION,
    binding_id,
    binding_status:                   'TAG_CONFIRMATION_READY_REVIEW',
    binding_ready:                    true,
    blocking_reason:                  null,
    one_shot_contract_id:             one_shot_contract.one_shot_contract_id,
    confirmed_by:                     confirmed_by ?? null,
    confirmer_role:                   confirmer_role ?? null,
    confirmation_decision,
    confirmation_phrase,
    target_tag_confirmed,
    git_head_confirmed,
    evidence_receipt_confirmed,
    no_deploy_confirmed:              true,
    no_stable_promotion_confirmed:    true,
    no_release_confirmed:             true,
    rollback_anchor_confirmed:        true,
    created_at:                       now,
    real_execution_allowed:           false,
    real_execution_armed:             false,
    tag_created:                      false,
    git_push_performed:               false,
    deploy_performed:                 false,
    stable_promoted:                  false,
    release_performed:                false,
    real_tag_review_ready:            true,
  };
}

export function validateRealTagHumanConfirmationBinding(binding) {
  if (!binding || typeof binding !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!TAG_CONFIRMATION_STATUSES.includes(binding.binding_status))
    return { valid: false, reason: 'unknown_status' };
  if (binding.real_execution_allowed === true) return { valid: false, reason: 'real_execution_must_be_false' };
  if (binding.tag_created            === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (binding.git_push_performed     === true) return { valid: false, reason: 'git_push_must_be_false' };
  return { valid: true };
}

export function renderRealTagHumanConfirmationBinding(binding) {
  if (!binding) return 'real_tag_human_confirmation_binding: null';
  return [
    `binding_status                : ${binding.binding_status ?? 'UNKNOWN'}`,
    `binding_id                    : ${binding.binding_id ?? 'none'}`,
    `one_shot_contract_id          : ${binding.one_shot_contract_id ?? 'none'}`,
    `real_tag_review_ready         : ${binding.real_tag_review_ready ?? false}`,
    `real_execution_allowed        : false`,
    `real_execution_armed          : false`,
    `tag_created                   : false`,
    `git_push_performed            : false`,
    `no_deploy_confirmed           : ${binding.no_deploy_confirmed ?? false}`,
    `no_stable_promotion_confirmed : ${binding.no_stable_promotion_confirmed ?? false}`,
    `no_release_confirmed          : ${binding.no_release_confirmed ?? false}`,
    `rollback_anchor_confirmed     : ${binding.rollback_anchor_confirmed ?? false}`,
    `blocking_reason               : ${binding.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-tag-human-confirmation-binding.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = bindRealTagHumanConfirmation({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagHumanConfirmationBinding(result));
  }

  process.exit(result.binding_ready ? 0 : 1);
}
