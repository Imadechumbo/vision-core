#!/usr/bin/env node
/**
 * Human One-Shot Tag Receipt Import Gate — V97.0
 *
 * Gate for importing human receipt after manual tag execution.
 * Validates receipt against command package expectations.
 * Does not execute tag operations.
 *
 * REGRA ABSOLUTA: actual_real_tag_created=false by default. tag_created=false by default.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v97.0';

export const IMPORT_GATE_STATUSES = [
  'IMPORT_GATE_BLOCKED_COMMAND_PACKAGE',
  'IMPORT_GATE_BLOCKED_MISSING_RECEIPT',
  'IMPORT_GATE_BLOCKED_TAG',
  'IMPORT_GATE_BLOCKED_HEAD',
  'IMPORT_GATE_BLOCKED_EVIDENCE',
  'IMPORT_GATE_BLOCKED_ROLLBACK',
  'IMPORT_GATE_BLOCKED_DEPLOY',
  'IMPORT_GATE_BLOCKED_STABLE',
  'IMPORT_GATE_BLOCKED_RELEASE',
  'IMPORT_GATE_READY_DRY_RUN_RECEIPT',
  'IMPORT_GATE_READY_REAL_TAG_RECEIPT',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    actual_real_tag_created:      false,
    real_execution_not_performed: true,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    gate_status:     status,
    gate_ready:      false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function evaluateHumanOneShotTagReceiptImportGate(params = {}) {
  const {
    fixture_mode              = false,
    command_package_result,
    human_receipt,
    expected_target_tag,
    expected_git_head,
    expected_evidence_receipt_id,
    expected_rollback_anchor_id,
    _mock_timestamp,
  } = params ?? {};

  const now     = _mock_timestamp ?? new Date().toISOString();
  const gate_id = _sha256(`receipt-import-gate:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:        SCHEMA_VERSION,
      gate_id,
      gate_status:           'IMPORT_GATE_READY_DRY_RUN_RECEIPT',
      gate_ready:            true,
      blocking_reason:       null,
      package_verified:      true,
      receipt_verified:      true,
      tag_matched:           true,
      head_matched:          true,
      evidence_matched:      true,
      rollback_matched:      true,
      receipt_tag_created:   false,
      receipt_push_performed: false,
      is_real_tag_receipt:   false,
      created_at:            now,
      ..._locked(),
    };
  }

  const eff_package = command_package_result !== undefined ? command_package_result : null;

  // ── Gate 1: command package ready ──────────────────────────
  if (!eff_package || eff_package.package_ready !== true) {
    return _blocked('IMPORT_GATE_BLOCKED_COMMAND_PACKAGE', 'command_package_not_ready', {
      gate_id,
      package_verified: false,
      created_at:       now,
    });
  }

  const eff_receipt = human_receipt !== undefined ? human_receipt : null;

  // ── Gate 2: receipt present ────────────────────────────────
  if (!eff_receipt || typeof eff_receipt !== 'object') {
    return _blocked('IMPORT_GATE_BLOCKED_MISSING_RECEIPT', 'human_receipt_missing', {
      gate_id,
      package_verified: true,
      receipt_verified: false,
      created_at:       now,
    });
  }

  const exp_tag      = expected_target_tag        ?? eff_package.target_tag       ?? null;
  const exp_head     = expected_git_head          ?? eff_package.git_head         ?? null;
  const exp_evidence = expected_evidence_receipt_id ?? eff_package.evidence_receipt_id ?? null;
  const exp_rollback = expected_rollback_anchor_id ?? eff_package.rollback_anchor_id  ?? null;

  // ── Gate 3: tag match ──────────────────────────────────────
  if (exp_tag && eff_receipt.target_tag !== exp_tag) {
    return _blocked('IMPORT_GATE_BLOCKED_TAG', 'target_tag_mismatch', {
      gate_id,
      package_verified:   true,
      expected_tag:       exp_tag,
      receipt_tag:        eff_receipt.target_tag ?? null,
      created_at:         now,
    });
  }

  // ── Gate 4: head match ─────────────────────────────────────
  if (exp_head && eff_receipt.git_head !== exp_head) {
    return _blocked('IMPORT_GATE_BLOCKED_HEAD', 'git_head_mismatch', {
      gate_id,
      package_verified: true,
      tag_matched:      true,
      expected_head:    exp_head,
      receipt_head:     eff_receipt.git_head ?? null,
      created_at:       now,
    });
  }

  // ── Gate 5: evidence receipt id match ─────────────────────
  if (exp_evidence && eff_receipt.evidence_receipt_id !== exp_evidence) {
    return _blocked('IMPORT_GATE_BLOCKED_EVIDENCE', 'evidence_receipt_id_mismatch', {
      gate_id,
      package_verified: true,
      tag_matched:      true,
      head_matched:     true,
      created_at:       now,
    });
  }

  // ── Gate 6: rollback anchor match ─────────────────────────
  if (exp_rollback && eff_receipt.rollback_anchor_id !== exp_rollback) {
    return _blocked('IMPORT_GATE_BLOCKED_ROLLBACK', 'rollback_anchor_id_mismatch', {
      gate_id,
      package_verified: true,
      tag_matched:      true,
      head_matched:     true,
      evidence_matched: true,
      created_at:       now,
    });
  }

  // ── Gate 7: deploy not performed ──────────────────────────
  if (eff_receipt.deploy_performed === true) {
    return _blocked('IMPORT_GATE_BLOCKED_DEPLOY', 'deploy_performed_in_receipt', {
      gate_id,
      package_verified: true,
      created_at:       now,
    });
  }

  // ── Gate 8: stable not promoted ───────────────────────────
  if (eff_receipt.stable_promoted === true) {
    return _blocked('IMPORT_GATE_BLOCKED_STABLE', 'stable_promoted_in_receipt', {
      gate_id,
      package_verified: true,
      created_at:       now,
    });
  }

  // ── Gate 9: release not performed ─────────────────────────
  if (eff_receipt.release_performed === true) {
    return _blocked('IMPORT_GATE_BLOCKED_RELEASE', 'release_performed_in_receipt', {
      gate_id,
      package_verified: true,
      created_at:       now,
    });
  }

  const is_real_tag = eff_receipt.tag_created === true && eff_receipt.git_push_performed === true;
  const gate_status = is_real_tag
    ? 'IMPORT_GATE_READY_REAL_TAG_RECEIPT'
    : 'IMPORT_GATE_READY_DRY_RUN_RECEIPT';

  return {
    schema_version:         SCHEMA_VERSION,
    gate_id,
    gate_status,
    gate_ready:             true,
    blocking_reason:        null,
    package_verified:       true,
    receipt_verified:       true,
    tag_matched:            true,
    head_matched:           true,
    evidence_matched:       true,
    rollback_matched:       true,
    receipt_tag_created:    eff_receipt.tag_created ?? false,
    receipt_push_performed: eff_receipt.git_push_performed ?? false,
    is_real_tag_receipt:    is_real_tag,
    receipt_id:             eff_receipt.human_receipt_id ?? null,
    target_tag:             eff_receipt.target_tag ?? exp_tag,
    git_head:               eff_receipt.git_head ?? exp_head,
    created_at:             now,
    ..._locked(),
  };
}

export function validateHumanOneShotTagReceiptImportGate(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  return failures;
}

export function renderHumanOneShotTagReceiptImportGate(result) {
  if (!result) return 'human_one_shot_tag_receipt_import_gate: null';
  return [
    `gate_status                : ${result.gate_status ?? 'UNKNOWN'}`,
    `gate_id                    : ${result.gate_id ?? 'none'}`,
    `gate_ready                 : ${result.gate_ready ?? false}`,
    `package_verified           : ${result.package_verified ?? false}`,
    `receipt_verified           : ${result.receipt_verified ?? false}`,
    `tag_matched                : ${result.tag_matched ?? false}`,
    `head_matched               : ${result.head_matched ?? false}`,
    `is_real_tag_receipt        : ${result.is_real_tag_receipt ?? false}`,
    `actual_real_tag_created    : false`,
    `deploy_performed           : false`,
    `stable_promoted            : false`,
    `release_performed          : false`,
    `real_execution_not_performed: true`,
    `blocking_reason            : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('human-one-shot-tag-receipt-import-gate.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateHumanOneShotTagReceiptImportGate({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderHumanOneShotTagReceiptImportGate(result));
  }

  process.exit(result.gate_ready ? 0 : 1);
}
