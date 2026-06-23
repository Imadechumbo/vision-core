#!/usr/bin/env node
/**
 * Real Tag Manual Receipt Import After Execution — V102.1
 *
 * Imports the human-filled receipt after tag execution (dry-run or real).
 * Does not execute anything. Validates receipt fields against template.
 *
 * REGRA ABSOLUTA: actual_real_tag_created=false always in import result.
 * deploy_performed=false always. stable_promoted=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION        = 'v102.1';
const RECEIPT_SCHEMA_VERSION = 'v102.0';

export const MANUAL_RECEIPT_IMPORT_STATUSES = [
  'MANUAL_RECEIPT_IMPORT_BLOCKED_TEMPLATE',
  'MANUAL_RECEIPT_IMPORT_BLOCKED_SCHEMA',
  'MANUAL_RECEIPT_IMPORT_BLOCKED_TARGET',
  'MANUAL_RECEIPT_IMPORT_BLOCKED_HEAD',
  'MANUAL_RECEIPT_IMPORT_BLOCKED_DEPLOY',
  'MANUAL_RECEIPT_IMPORT_BLOCKED_STABLE',
  'MANUAL_RECEIPT_IMPORT_BLOCKED_RELEASE',
  'MANUAL_RECEIPT_IMPORT_DRY_RUN',
  'MANUAL_RECEIPT_IMPORT_REAL_TAG',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    actual_real_tag_created:      false,
    actual_git_push_performed:    false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    import_status:     status,
    import_ready:      false,
    blocking_reason,
    deploy_blocked:    true,
    stable_blocked:    true,
    release_blocked:   true,
    ...extra,
    ..._locked(),
  };
}

export function importRealTagManualReceiptAfterExecution(params = {}) {
  const {
    fixture_mode    = false,
    template_result,
    human_receipt,
    _mock_timestamp,
  } = params ?? {};

  const now       = _mock_timestamp ?? new Date().toISOString();
  const import_id = _sha256(`receipt-import:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:    SCHEMA_VERSION,
      import_id,
      import_status:     'MANUAL_RECEIPT_IMPORT_DRY_RUN',
      import_ready:      true,
      blocking_reason:   null,
      target_tag:        'v1.0.0',
      git_head:          'abc1234def567890abc12345',
      is_real_tag:       false,
      receipt_validated: true,
      deploy_blocked:    true,
      stable_blocked:    true,
      release_blocked:   true,
      created_at:        now,
      ..._locked(),
    };
  }

  const eff_template = template_result !== undefined ? template_result : null;
  const eff_receipt  = human_receipt   !== undefined ? human_receipt   : null;

  // Gate 1: template ready
  if (!eff_template || eff_template.template_ready !== true) {
    return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_TEMPLATE', 'receipt_template_not_ready', {
      import_id, created_at: now,
    });
  }

  // Gate 2: receipt schema
  if (!eff_receipt || eff_receipt.schema_version !== RECEIPT_SCHEMA_VERSION) {
    return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_SCHEMA', 'receipt_schema_invalid', {
      import_id, created_at: now,
    });
  }

  // Gate 3: target_tag match
  if (eff_receipt.target_tag !== eff_template.target_tag) {
    return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_TARGET', 'target_tag_mismatch', {
      import_id, created_at: now,
    });
  }

  // Gate 4: git_head match
  if (eff_receipt.git_head !== eff_template.git_head) {
    return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_HEAD', 'git_head_mismatch', {
      import_id, created_at: now,
    });
  }

  // Gate 5: deploy blocked
  if (eff_receipt.deploy_performed === true) {
    return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_DEPLOY', 'deploy_detected', {
      import_id, created_at: now,
    });
  }

  // Gate 6: stable blocked
  if (eff_receipt.stable_promoted === true) {
    return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_STABLE', 'stable_promotion_detected', {
      import_id, created_at: now,
    });
  }

  // Gate 7: release blocked
  if (eff_receipt.release_performed === true) {
    return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_RELEASE', 'release_detected', {
      import_id, created_at: now,
    });
  }

  const is_real_tag = eff_receipt.tag_created === true && eff_receipt.git_push_performed === true;

  // Additional real tag verification
  if (is_real_tag) {
    if (eff_receipt.local_tag_verified !== true) {
      return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_HEAD', 'local_tag_not_verified', {
        import_id, created_at: now,
      });
    }
    if (eff_receipt.remote_tag_verified !== true) {
      return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_HEAD', 'remote_tag_not_verified', {
        import_id, created_at: now,
      });
    }
    if (eff_receipt.local_tag_head !== eff_template.git_head) {
      return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_HEAD', 'local_tag_head_mismatch', {
        import_id, created_at: now,
      });
    }
    if (eff_receipt.remote_tag_head !== eff_template.git_head) {
      return _blocked('MANUAL_RECEIPT_IMPORT_BLOCKED_HEAD', 'remote_tag_head_mismatch', {
        import_id, created_at: now,
      });
    }
  }

  const import_status = is_real_tag
    ? 'MANUAL_RECEIPT_IMPORT_REAL_TAG'
    : 'MANUAL_RECEIPT_IMPORT_DRY_RUN';

  return {
    schema_version:    SCHEMA_VERSION,
    import_id,
    import_status,
    import_ready:      true,
    blocking_reason:   null,
    target_tag:        eff_receipt.target_tag,
    git_head:          eff_receipt.git_head,
    is_real_tag,
    receipt_validated: true,
    deploy_blocked:    true,
    stable_blocked:    true,
    release_blocked:   true,
    created_at:        now,
    ..._locked(),
  };
}

export function validateRealTagManualReceiptImportAfterExecution(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  return failures;
}

export function renderRealTagManualReceiptImportAfterExecution(result) {
  if (!result) return 'real_tag_manual_receipt_import_after_execution: null';
  return [
    `import_status            : ${result.import_status ?? 'UNKNOWN'}`,
    `import_id                : ${result.import_id ?? 'none'}`,
    `import_ready             : ${result.import_ready ?? false}`,
    `target_tag               : ${result.target_tag ?? 'none'}`,
    `git_head                 : ${result.git_head ?? 'none'}`,
    `is_real_tag              : ${result.is_real_tag ?? false}`,
    `receipt_validated        : ${result.receipt_validated ?? false}`,
    `deploy_blocked           : true`,
    `stable_blocked           : true`,
    `release_blocked          : true`,
    `actual_real_tag_created  : false`,
    `deploy_performed         : false`,
    `stable_promoted          : false`,
    `release_performed        : false`,
    `blocking_reason          : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-receipt-import-after-execution.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = importRealTagManualReceiptAfterExecution({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagManualReceiptImportAfterExecution(result));
  }

  process.exit(result.import_ready ? 0 : 1);
}
