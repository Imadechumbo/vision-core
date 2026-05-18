#!/usr/bin/env node
/**
 * Real Tag Human Receipt Verifier — V93.1
 *
 * Verifies the imported human execution receipt against actual git state.
 * 8 statuses: VERIFIER_BLOCKED_IMPORTER → VERIFIER_PASSED.
 * Injectable spawn_adapter for testable verification without real git calls.
 *
 * REGRA ABSOLUTA: tag_created=false always. actual_real_tag_created=false always.
 * Verifier reads git state — does not create tags.
 */

import { createHash } from 'crypto';
import { buildRealTagHumanExecutionReceiptImporter } from './real-tag-human-execution-receipt-importer.mjs';

const SCHEMA_VERSION = 'v93.1';

export const RECEIPT_VERIFIER_STATUSES = [
  'VERIFIER_BLOCKED_IMPORTER',
  'VERIFIER_BLOCKED_RECEIPT_TYPE',
  'VERIFIER_BLOCKED_ADAPTER',
  'VERIFIER_BLOCKED_LOCAL_TAG',
  'VERIFIER_BLOCKED_REMOTE_TAG',
  'VERIFIER_BLOCKED_HEAD_MISMATCH',
  'VERIFIER_BLOCKED_LEDGER',
  'VERIFIER_PASSED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    actual_real_tag_created:      false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    verifier_status:   status,
    verifier_passed:   false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function runRealTagHumanReceiptVerifier(params = {}) {
  const {
    fixture_mode    = false,
    importer_result,
    spawn_adapter,
    ledger_result,
    _mock_timestamp,
  } = params ?? {};

  const now         = _mock_timestamp ?? new Date().toISOString();
  const verifier_id = _sha256(`receipt-verifier:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:        SCHEMA_VERSION,
      verifier_id,
      verifier_status:       'VERIFIER_PASSED',
      verifier_passed:       true,
      blocking_reason:       null,
      importer_verified:     true,
      receipt_type_verified: true,
      adapter_available:     true,
      local_tag_verified:    true,
      remote_tag_verified:   true,
      head_sha_verified:     true,
      ledger_verified:       true,
      created_at:            now,
      ..._locked(),
    };
  }

  // ── Gate 1: Importer ────────────────────────────────────────
  const eff_importer = importer_result !== undefined ? importer_result : null;
  if (!eff_importer || eff_importer.importer_ready !== true) {
    return _blocked('VERIFIER_BLOCKED_IMPORTER', 'importer_not_ready', {
      verifier_id,
      importer_verified:     false,
      receipt_type_verified: false,
      adapter_available:     false,
      local_tag_verified:    false,
      remote_tag_verified:   false,
      head_sha_verified:     false,
      ledger_verified:       false,
      created_at:            now,
    });
  }

  // ── Gate 2: Receipt type ──────────────────────────────────
  const receipt = eff_importer.imported_receipt ?? {};
  if (receipt.receipt_type !== 'real_tag_created') {
    return _blocked('VERIFIER_BLOCKED_RECEIPT_TYPE', 'receipt_type_is_not_real_tag_created', {
      verifier_id,
      receipt_type:          receipt.receipt_type ?? null,
      importer_verified:     true,
      receipt_type_verified: false,
      adapter_available:     false,
      local_tag_verified:    false,
      remote_tag_verified:   false,
      head_sha_verified:     false,
      ledger_verified:       false,
      created_at:            now,
    });
  }

  const tag      = receipt.target_tag;
  const head_sha = receipt.head_sha;

  // ── Gate 3: Adapter ──────────────────────────────────────
  if (typeof spawn_adapter !== 'function') {
    return _blocked('VERIFIER_BLOCKED_ADAPTER', 'spawn_adapter_not_provided', {
      verifier_id,
      importer_verified:     true,
      receipt_type_verified: true,
      adapter_available:     false,
      local_tag_verified:    false,
      remote_tag_verified:   false,
      head_sha_verified:     false,
      ledger_verified:       false,
      created_at:            now,
    });
  }

  // ── Gate 4: Local tag ────────────────────────────────────
  let localResult;
  try {
    localResult = spawn_adapter('git', ['tag', '-l', tag]);
  } catch (_) {
    localResult = { status: 1, stdout: '' };
  }
  const localTagExists = localResult.status === 0 && String(localResult.stdout ?? '').trim() === tag;
  if (!localTagExists) {
    return _blocked('VERIFIER_BLOCKED_LOCAL_TAG', 'local_tag_not_found', {
      verifier_id,
      tag,
      importer_verified:     true,
      receipt_type_verified: true,
      adapter_available:     true,
      local_tag_verified:    false,
      remote_tag_verified:   false,
      head_sha_verified:     false,
      ledger_verified:       false,
      created_at:            now,
    });
  }

  // ── Gate 5: Remote tag ────────────────────────────────────
  let remoteResult;
  try {
    remoteResult = spawn_adapter('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
  } catch (_) {
    remoteResult = { status: 1, stdout: '' };
  }
  const remoteTagExists = remoteResult.status === 0 && String(remoteResult.stdout ?? '').trim().length > 0;
  if (!remoteTagExists) {
    return _blocked('VERIFIER_BLOCKED_REMOTE_TAG', 'remote_tag_not_found', {
      verifier_id,
      tag,
      importer_verified:     true,
      receipt_type_verified: true,
      adapter_available:     true,
      local_tag_verified:    true,
      remote_tag_verified:   false,
      head_sha_verified:     false,
      ledger_verified:       false,
      created_at:            now,
    });
  }

  // ── Gate 6: HEAD SHA match ────────────────────────────────
  let headResult;
  try {
    headResult = spawn_adapter('git', ['rev-list', '-n', '1', tag]);
  } catch (_) {
    headResult = { status: 1, stdout: '' };
  }
  const actualHead = String(headResult.stdout ?? '').trim();
  const headMatches = headResult.status === 0 && head_sha && actualHead.startsWith(head_sha.slice(0, 7));
  if (!headMatches) {
    return _blocked('VERIFIER_BLOCKED_HEAD_MISMATCH', 'tag_head_sha_mismatch', {
      verifier_id,
      expected_head: head_sha,
      actual_head:   actualHead,
      importer_verified:     true,
      receipt_type_verified: true,
      adapter_available:     true,
      local_tag_verified:    true,
      remote_tag_verified:   true,
      head_sha_verified:     false,
      ledger_verified:       false,
      created_at:            now,
    });
  }

  // ── Gate 7: Ledger ────────────────────────────────────────
  const ledgerOk = !ledger_result || ledger_result.ledger_ready === true;
  if (!ledgerOk) {
    return _blocked('VERIFIER_BLOCKED_LEDGER', 'ledger_not_ready', {
      verifier_id,
      importer_verified:     true,
      receipt_type_verified: true,
      adapter_available:     true,
      local_tag_verified:    true,
      remote_tag_verified:   true,
      head_sha_verified:     true,
      ledger_verified:       false,
      created_at:            now,
    });
  }

  return {
    schema_version:        SCHEMA_VERSION,
    verifier_id,
    verifier_status:       'VERIFIER_PASSED',
    verifier_passed:       true,
    blocking_reason:       null,
    importer_verified:     true,
    receipt_type_verified: true,
    adapter_available:     true,
    local_tag_verified:    true,
    remote_tag_verified:   true,
    head_sha_verified:     true,
    ledger_verified:       true,
    created_at:            now,
    ..._locked(),
  };
}

export function renderReceiptVerifierSummary(result) {
  if (!result) return 'receipt_verifier: null';
  return [
    `verifier_status             : ${result.verifier_status ?? 'UNKNOWN'}`,
    `verifier_id                 : ${result.verifier_id ?? 'none'}`,
    `verifier_passed             : ${result.verifier_passed ?? false}`,
    `importer_verified           : ${result.importer_verified ?? false}`,
    `receipt_type_verified       : ${result.receipt_type_verified ?? false}`,
    `adapter_available           : ${result.adapter_available ?? false}`,
    `local_tag_verified          : ${result.local_tag_verified ?? false}`,
    `remote_tag_verified         : ${result.remote_tag_verified ?? false}`,
    `head_sha_verified           : ${result.head_sha_verified ?? false}`,
    `ledger_verified             : ${result.ledger_verified ?? false}`,
    `tag_created                 : false`,
    `actual_real_tag_created     : false`,
    `git_push_performed          : false`,
    `real_execution_not_performed: true`,
    `blocking_reason             : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-human-receipt-verifier.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runRealTagHumanReceiptVerifier({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReceiptVerifierSummary(result));
  }

  process.exit(result.verifier_passed ? 0 : 1);
}
