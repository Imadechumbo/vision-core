#!/usr/bin/env node
/**
 * Stable Execution Receipt Import — V126.0
 *
 * Accepts and validates a real execution receipt provided by a human operator
 * after manually executing stable promotion commands.
 * Does NOT execute any commands.
 *
 * REGRA ABSOLUTA: system_execution_performed=false, automated_promotion_performed=false,
 * stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v126.0';

export const RECEIPT_IMPORT_STATUSES = [
  'RECEIPT_IMPORT_BLOCKED_GOVERNANCE',
  'RECEIPT_IMPORT_BLOCKED_MISSING',
  'RECEIPT_IMPORT_BLOCKED_INVALID',
  'RECEIPT_IMPORT_READY',
];

export const REQUIRED_RECEIPT_FIELDS = [
  'execution_receipt_id',
  'executed_by',
  'target_stable_ref',
  'target_tag',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    system_execution_performed:      false,
    automated_promotion_performed:   false,
    stable_promotion_allowed:        false,
    stable_promoted:                 false,
    git_push_performed:              false,
    deploy_performed:                false,
    release_performed:               false,
    human_executed:                  true,
    receipt_is_human_provided:       true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    import_status:   status,
    import_ready:    false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _importId(governance_baseline_id, execution_receipt_id) {
  return _sha256([governance_baseline_id || '', execution_receipt_id || '', 'eri-v126.0'].join('|'));
}

export function importStableExecutionReceipt(params) {
  const {
    stable_promotion_governance_baseline,
    execution_receipt,
  } = params || {};

  // Validate governance baseline
  if (
    !stable_promotion_governance_baseline ||
    stable_promotion_governance_baseline.stable_governance_baseline_ready !== true
  ) {
    return _blocked(
      'RECEIPT_IMPORT_BLOCKED_GOVERNANCE',
      'stable_promotion_governance_baseline not ready'
    );
  }

  // Validate receipt provided
  if (!execution_receipt || typeof execution_receipt !== 'object') {
    return _blocked('RECEIPT_IMPORT_BLOCKED_MISSING', 'execution_receipt missing or not an object');
  }

  // Validate required fields
  const missing = REQUIRED_RECEIPT_FIELDS.filter(f => !execution_receipt[f]);
  if (missing.length > 0) {
    return _blocked(
      'RECEIPT_IMPORT_BLOCKED_INVALID',
      `execution_receipt missing required fields: ${missing.join(', ')}`,
      { missing_fields: missing }
    );
  }

  const governance_baseline_id = stable_promotion_governance_baseline.baseline_id;
  const import_id = _importId(governance_baseline_id, execution_receipt.execution_receipt_id);

  return {
    schema_version:          SCHEMA_VERSION,
    import_id,
    import_status:           'RECEIPT_IMPORT_READY',
    import_ready:            true,
    governance_baseline_id,
    execution_receipt_id:    execution_receipt.execution_receipt_id,
    executed_by:             execution_receipt.executed_by,
    target_stable_ref:       execution_receipt.target_stable_ref,
    target_tag:              execution_receipt.target_tag,
    executed_at:             execution_receipt.executed_at || null,
    raw_receipt:             execution_receipt,
    ..._locked(),
  };
}

export function validateStableExecutionReceiptImport(imp) {
  if (!imp || typeof imp !== 'object') {
    return { valid: false, errors: ['import is null/undefined'] };
  }

  const errors = [];

  if (!RECEIPT_IMPORT_STATUSES.includes(imp.import_status)) {
    errors.push(`invalid import_status: ${imp.import_status}`);
  }
  if (imp.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (imp.system_execution_performed !== false) errors.push('system_execution_performed must be false');
  if (imp.automated_promotion_performed !== false) errors.push('automated_promotion_performed must be false');
  if (imp.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (imp.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (imp.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (imp.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (imp.release_performed !== false) errors.push('release_performed must be false');
  if (imp.human_executed !== true) errors.push('human_executed must be true');
  if (imp.receipt_is_human_provided !== true) errors.push('receipt_is_human_provided must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStableExecutionReceiptImport(imp) {
  if (!imp || !imp.import_ready) {
    return `[RECEIPT IMPORT BLOCKED] ${imp?.import_status || 'unknown'}: ${imp?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE EXECUTION RECEIPT IMPORT V126.0 ===`,
    `Schema:                        ${imp.schema_version}`,
    `Import ID:                     ${imp.import_id}`,
    `Status:                        ${imp.import_status}`,
    `Governance Baseline ID:        ${imp.governance_baseline_id}`,
    `Execution Receipt ID:          ${imp.execution_receipt_id}`,
    `Executed By:                   ${imp.executed_by}`,
    `Target Ref:                    ${imp.target_stable_ref}`,
    `Target Tag:                    ${imp.target_tag}`,
    `Executed At:                   ${imp.executed_at || 'not provided'}`,
    ``,
    `system_execution_performed:    ${imp.system_execution_performed}`,
    `automated_promotion_performed: ${imp.automated_promotion_performed}`,
    `human_executed:                ${imp.human_executed}`,
    `receipt_is_human_provided:     ${imp.receipt_is_human_provided}`,
    `stable_promotion_allowed:      ${imp.stable_promotion_allowed}`,
    `stable_promoted:               ${imp.stable_promoted}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-execution-receipt-import.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockBaseline = {
    stable_governance_baseline_ready: true,
    baseline_id: 'mock-baseline-v125-cli',
    baseline_status: 'GOVERNANCE_BASELINE_READY',
  };

  const mockReceipt = {
    execution_receipt_id: 'exec-receipt-v126-cli',
    executed_by:          'human-operator',
    target_stable_ref:    'stable',
    target_tag:           'v126.0-cli-mock',
    executed_at:          new Date().toISOString(),
  };

  const imp = importStableExecutionReceipt({
    stable_promotion_governance_baseline: mockBaseline,
    execution_receipt:                    mockReceipt,
  });

  if (isJson) {
    console.log(JSON.stringify(imp, null, 2));
  } else {
    console.log(renderStableExecutionReceiptImport(imp));
  }
}
