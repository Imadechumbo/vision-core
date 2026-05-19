#!/usr/bin/env node
/**
 * Human One-Shot Tag Receipt Verifier — V97.1
 *
 * Verifies human receipt against snapshot and command package.
 * Accepts observed verification data (no direct git calls).
 * Does not execute any git operations.
 *
 * REGRA ABSOLUTA: actual_real_tag_created=false always. tag_created=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v97.1';

export const RECEIPT_VERIFY_STATUSES = [
  'RECEIPT_VERIFY_BLOCKED_IMPORT_GATE',
  'RECEIPT_VERIFY_BLOCKED_SNAPSHOT',
  'RECEIPT_VERIFY_BLOCKED_COMMAND_PACKAGE',
  'RECEIPT_VERIFY_BLOCKED_LOCAL_HEAD',
  'RECEIPT_VERIFY_BLOCKED_REMOTE_HEAD',
  'RECEIPT_VERIFY_BLOCKED_WORKTREE',
  'RECEIPT_VERIFY_BLOCKED_DEPLOY',
  'RECEIPT_VERIFY_BLOCKED_STABLE',
  'RECEIPT_VERIFY_BLOCKED_RELEASE',
  'RECEIPT_VERIFY_DRY_RUN_CONFIRMED',
  'RECEIPT_VERIFY_REAL_TAG_CONFIRMED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    actual_real_tag_created:      false,
    tag_created:                  false,
    git_push_performed:           false,
    real_execution_not_performed: true,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    verify_status:   status,
    verify_ready:    false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function verifyHumanOneShotTagReceipt(params = {}) {
  const {
    fixture_mode               = false,
    import_gate_result,
    snapshot_result,
    command_package_result,
    observed_local_tag_head,
    observed_remote_tag_head,
    observed_worktree_clean,
    observed_deploy_performed,
    observed_stable_promoted,
    observed_release_performed,
    _mock_timestamp,
  } = params ?? {};

  const now       = _mock_timestamp ?? new Date().toISOString();
  const verify_id = _sha256(`receipt-verifier:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:           SCHEMA_VERSION,
      verify_id,
      verify_status:            'RECEIPT_VERIFY_DRY_RUN_CONFIRMED',
      verify_ready:             true,
      blocking_reason:          null,
      import_gate_verified:     true,
      snapshot_verified:        true,
      command_package_verified: true,
      is_real_tag_verified:     false,
      local_head_matched:       false,
      remote_head_matched:      false,
      worktree_clean:           true,
      created_at:               now,
      ..._locked(),
    };
  }

  const eff_gate    = import_gate_result     !== undefined ? import_gate_result     : null;
  const eff_snap    = snapshot_result        !== undefined ? snapshot_result        : null;
  const eff_pkg     = command_package_result !== undefined ? command_package_result : null;

  // ── Gate 1: import gate ready ──────────────────────────────
  if (!eff_gate || eff_gate.gate_ready !== true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_IMPORT_GATE', 'import_gate_not_ready', {
      verify_id,
      import_gate_verified: false,
      created_at:           now,
    });
  }

  // ── Gate 2: snapshot ready ─────────────────────────────────
  if (!eff_snap || eff_snap.preflight_ready !== true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_SNAPSHOT', 'preflight_snapshot_not_ready', {
      verify_id,
      import_gate_verified: true,
      snapshot_verified:    false,
      created_at:           now,
    });
  }

  // ── Gate 3: command package ready ─────────────────────────
  if (!eff_pkg || eff_pkg.package_ready !== true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_COMMAND_PACKAGE', 'command_package_not_ready', {
      verify_id,
      import_gate_verified:     true,
      snapshot_verified:        true,
      command_package_verified: false,
      created_at:               now,
    });
  }

  const expected_head    = eff_snap.git_head ?? eff_pkg.git_head ?? null;
  const is_real_tag      = eff_gate.is_real_tag_receipt === true;
  const eff_local_head   = observed_local_tag_head  !== undefined ? observed_local_tag_head  : null;
  const eff_remote_head  = observed_remote_tag_head !== undefined ? observed_remote_tag_head : null;
  const eff_worktree     = observed_worktree_clean  !== undefined ? observed_worktree_clean  : null;
  const eff_deploy       = observed_deploy_performed  ?? false;
  const eff_stable       = observed_stable_promoted   ?? false;
  const eff_release      = observed_release_performed ?? false;

  // For real tag receipts, verify local and remote head
  if (is_real_tag) {
    if (!eff_local_head || eff_local_head !== expected_head) {
      return _blocked('RECEIPT_VERIFY_BLOCKED_LOCAL_HEAD', 'local_tag_head_mismatch', {
        verify_id,
        import_gate_verified:     true,
        snapshot_verified:        true,
        command_package_verified: true,
        expected_head,
        observed_local_head:      eff_local_head,
        created_at:               now,
      });
    }

    if (!eff_remote_head || eff_remote_head !== expected_head) {
      return _blocked('RECEIPT_VERIFY_BLOCKED_REMOTE_HEAD', 'remote_tag_head_mismatch', {
        verify_id,
        import_gate_verified:     true,
        snapshot_verified:        true,
        command_package_verified: true,
        local_head_matched:       true,
        expected_head,
        observed_remote_head:     eff_remote_head,
        created_at:               now,
      });
    }
  }

  // ── Gate 6: worktree clean ─────────────────────────────────
  if (eff_worktree !== true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_WORKTREE', 'worktree_not_clean', {
      verify_id,
      import_gate_verified:     true,
      snapshot_verified:        true,
      command_package_verified: true,
      local_head_matched:       is_real_tag,
      remote_head_matched:      is_real_tag,
      worktree_clean:           false,
      created_at:               now,
    });
  }

  // ── Gate 7: deploy not performed ──────────────────────────
  if (eff_deploy === true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_DEPLOY', 'deploy_performed_observed', {
      verify_id,
      import_gate_verified:     true,
      snapshot_verified:        true,
      command_package_verified: true,
      created_at:               now,
    });
  }

  // ── Gate 8: stable not promoted ───────────────────────────
  if (eff_stable === true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_STABLE', 'stable_promoted_observed', {
      verify_id,
      import_gate_verified:     true,
      snapshot_verified:        true,
      command_package_verified: true,
      created_at:               now,
    });
  }

  // ── Gate 9: release not performed ─────────────────────────
  if (eff_release === true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_RELEASE', 'release_performed_observed', {
      verify_id,
      import_gate_verified:     true,
      snapshot_verified:        true,
      command_package_verified: true,
      created_at:               now,
    });
  }

  const verify_status = is_real_tag
    ? 'RECEIPT_VERIFY_REAL_TAG_CONFIRMED'
    : 'RECEIPT_VERIFY_DRY_RUN_CONFIRMED';

  return {
    schema_version:           SCHEMA_VERSION,
    verify_id,
    verify_status,
    verify_ready:             true,
    blocking_reason:          null,
    import_gate_verified:     true,
    snapshot_verified:        true,
    command_package_verified: true,
    is_real_tag_verified:     is_real_tag,
    local_head_matched:       is_real_tag,
    remote_head_matched:      is_real_tag,
    worktree_clean:           true,
    target_tag:               eff_gate.target_tag ?? eff_snap.target_tag ?? null,
    git_head:                 expected_head,
    created_at:               now,
    ..._locked(),
  };
}

export function validateHumanOneShotTagReceiptVerification(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.tag_created             === true) failures.push('tag_created must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  return failures;
}

export function renderHumanOneShotTagReceiptVerification(result) {
  if (!result) return 'human_one_shot_tag_receipt_verifier: null';
  return [
    `verify_status             : ${result.verify_status ?? 'UNKNOWN'}`,
    `verify_id                 : ${result.verify_id ?? 'none'}`,
    `verify_ready              : ${result.verify_ready ?? false}`,
    `import_gate_verified      : ${result.import_gate_verified ?? false}`,
    `snapshot_verified         : ${result.snapshot_verified ?? false}`,
    `command_package_verified  : ${result.command_package_verified ?? false}`,
    `is_real_tag_verified      : ${result.is_real_tag_verified ?? false}`,
    `local_head_matched        : ${result.local_head_matched ?? false}`,
    `remote_head_matched       : ${result.remote_head_matched ?? false}`,
    `worktree_clean            : ${result.worktree_clean ?? false}`,
    `actual_real_tag_created   : false`,
    `tag_created               : false`,
    `deploy_performed          : false`,
    `stable_promoted           : false`,
    `release_performed         : false`,
    `real_execution_not_performed: true`,
    `blocking_reason           : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('human-one-shot-tag-receipt-verifier.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = verifyHumanOneShotTagReceipt({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderHumanOneShotTagReceiptVerification(result));
  }

  process.exit(result.verify_ready ? 0 : 1);
}
