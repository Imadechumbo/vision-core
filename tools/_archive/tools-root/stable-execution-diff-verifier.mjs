#!/usr/bin/env node
/**
 * Stable Execution Diff Verifier — V126.1
 *
 * Verifies that the imported execution receipt matches the
 * governance baseline expectations (ref, tag, baseline ID).
 * Does NOT execute any commands.
 *
 * REGRA ABSOLUTA: system_execution_performed=false, automated_promotion_performed=false,
 * stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v126.1';

export const DIFF_VERIFIER_STATUSES = [
  'DIFF_VERIFIER_BLOCKED_IMPORT',
  'DIFF_VERIFIER_BLOCKED_BASELINE',
  'DIFF_VERIFIER_MISMATCH',
  'DIFF_VERIFIER_VERIFIED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    system_execution_performed:    false,
    automated_promotion_performed: false,
    stable_promotion_allowed:      false,
    stable_promoted:               false,
    git_push_performed:            false,
    deploy_performed:              false,
    release_performed:             false,
    diff_is_post_execution_only:   true,
    no_automated_verification:     true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    verifier_status: status,
    diff_verified:   false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _verifierId(import_id, baseline_id) {
  return _sha256([import_id || '', baseline_id || '', 'edv-v126.1'].join('|'));
}

export function verifyStableExecutionDiff(params) {
  const {
    stable_execution_receipt_import,
    stable_promotion_governance_baseline,
  } = params || {};

  if (!stable_execution_receipt_import || stable_execution_receipt_import.import_ready !== true) {
    return _blocked('DIFF_VERIFIER_BLOCKED_IMPORT', 'stable_execution_receipt_import not ready');
  }

  if (
    !stable_promotion_governance_baseline ||
    stable_promotion_governance_baseline.stable_governance_baseline_ready !== true
  ) {
    return _blocked('DIFF_VERIFIER_BLOCKED_BASELINE', 'stable_promotion_governance_baseline not ready');
  }

  const imp      = stable_execution_receipt_import;
  const baseline = stable_promotion_governance_baseline;

  const checks = {
    target_ref_match: imp.target_stable_ref === baseline.target_stable_ref,
    target_tag_match: imp.target_tag === baseline.target_tag,
    baseline_id_match: imp.governance_baseline_id === baseline.baseline_id,
  };

  const all_match = Object.values(checks).every(Boolean);

  if (!all_match) {
    const mismatch_details = {};
    if (!checks.target_ref_match) {
      mismatch_details.target_ref = { expected: baseline.target_stable_ref, actual: imp.target_stable_ref };
    }
    if (!checks.target_tag_match) {
      mismatch_details.target_tag = { expected: baseline.target_tag, actual: imp.target_tag };
    }
    if (!checks.baseline_id_match) {
      mismatch_details.baseline_id = { expected: baseline.baseline_id, actual: imp.governance_baseline_id };
    }

    return _blocked('DIFF_VERIFIER_MISMATCH', 'receipt does not match governance baseline', {
      verifier_id:     _verifierId(imp.import_id, baseline.baseline_id),
      checks,
      mismatch_details,
      diff_verified:   false,
    });
  }

  const verifier_id = _verifierId(imp.import_id, baseline.baseline_id);

  return {
    schema_version:        SCHEMA_VERSION,
    verifier_id,
    verifier_status:       'DIFF_VERIFIER_VERIFIED',
    diff_verified:         true,
    import_id:             imp.import_id,
    governance_baseline_id: baseline.baseline_id,
    execution_receipt_id:  imp.execution_receipt_id,
    executed_by:           imp.executed_by,
    target_stable_ref:     imp.target_stable_ref,
    target_tag:            imp.target_tag,
    checks,
    mismatch_details:      {},
    ..._locked(),
  };
}

export function validateStableExecutionDiffVerifier(verifier) {
  if (!verifier || typeof verifier !== 'object') {
    return { valid: false, errors: ['verifier is null/undefined'] };
  }

  const errors = [];

  if (!DIFF_VERIFIER_STATUSES.includes(verifier.verifier_status)) {
    errors.push(`invalid verifier_status: ${verifier.verifier_status}`);
  }
  if (verifier.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (verifier.system_execution_performed !== false) errors.push('system_execution_performed must be false');
  if (verifier.automated_promotion_performed !== false) errors.push('automated_promotion_performed must be false');
  if (verifier.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (verifier.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (verifier.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (verifier.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (verifier.release_performed !== false) errors.push('release_performed must be false');
  if (verifier.diff_is_post_execution_only !== true) errors.push('diff_is_post_execution_only must be true');
  if (verifier.no_automated_verification !== true) errors.push('no_automated_verification must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStableExecutionDiffVerifier(verifier) {
  if (!verifier || !verifier.diff_verified) {
    return `[DIFF VERIFIER ${verifier?.verifier_status || 'UNKNOWN'}] ${verifier?.blocking_reason || 'unknown reason'}`;
  }

  const lines = [
    `=== STABLE EXECUTION DIFF VERIFIER V126.1 ===`,
    `Schema:                          ${verifier.schema_version}`,
    `Verifier ID:                     ${verifier.verifier_id}`,
    `Status:                          ${verifier.verifier_status}`,
    `Import ID:                       ${verifier.import_id}`,
    `Governance Baseline ID:          ${verifier.governance_baseline_id}`,
    `Execution Receipt ID:            ${verifier.execution_receipt_id}`,
    `Executed By:                     ${verifier.executed_by}`,
    `Target Ref:                      ${verifier.target_stable_ref}`,
    `Target Tag:                      ${verifier.target_tag}`,
    ``,
    `--- CHECKS ---`,
  ];

  for (const [k, v] of Object.entries(verifier.checks || {})) {
    lines.push(`  ${v ? 'PASS' : 'FAIL'} ${k}`);
  }

  lines.push(
    ``,
    `system_execution_performed:      ${verifier.system_execution_performed}`,
    `automated_promotion_performed:   ${verifier.automated_promotion_performed}`,
    `diff_is_post_execution_only:     ${verifier.diff_is_post_execution_only}`,
    `no_automated_verification:       ${verifier.no_automated_verification}`,
    `stable_promotion_allowed:        ${verifier.stable_promotion_allowed}`,
  );

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-execution-diff-verifier.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockImport = {
    import_ready:            true,
    import_id:               'mock-import-v1261',
    governance_baseline_id:  'mock-baseline-v125',
    execution_receipt_id:    'mock-exec-receipt-v1261',
    executed_by:             'human-operator',
    target_stable_ref:       'stable',
    target_tag:              'v126.1-cli-mock',
  };

  const mockBaseline = {
    stable_governance_baseline_ready: true,
    baseline_id:                      'mock-baseline-v125',
    target_stable_ref:                'stable',
    target_tag:                       'v126.1-cli-mock',
  };

  const verifier = verifyStableExecutionDiff({
    stable_execution_receipt_import:      mockImport,
    stable_promotion_governance_baseline: mockBaseline,
  });

  if (isJson) {
    console.log(JSON.stringify(verifier, null, 2));
  } else {
    console.log(renderStableExecutionDiffVerifier(verifier));
  }
}
