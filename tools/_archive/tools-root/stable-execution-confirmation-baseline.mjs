#!/usr/bin/env node
/**
 * Stable Execution Confirmation Baseline — V130.0
 *
 * Capstone module. Runs all V126–V129 pipelines and verifies
 * stable_execution_confirmation_ready=true.
 *
 * REGRA ABSOLUTA: system_execution_performed=false, automated_promotion_performed=false,
 * stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false,
 * future_promotion_requires_new_governance_cycle=true always.
 */

import { createHash } from 'crypto';

// V126.0
import { importStableExecutionReceipt }            from './stable-execution-receipt-import.mjs';
// V126.1
import { verifyStableExecutionDiff }               from './stable-execution-diff-verifier.mjs';
// V127.0
import { captureStableExecutionPostStateSnapshot } from './stable-execution-post-state-snapshot.mjs';
// V127.1
import { issueStablePromotionConfirmationDocument } from './stable-promotion-confirmation-document.mjs';
// V128.0
import { appendPostPromotionLedgerEvents }          from './stable-execution-post-promotion-ledger.mjs';
// V128.1
import { buildPostPromotionReport }                 from './stable-execution-post-promotion-report.mjs';
// V129.0
import { evaluateStablePromotionFinalizationGate }  from './stable-promotion-finalization-gate.mjs';
// V129.1
import { buildStablePromotionArchiveRecord }        from './stable-promotion-archive-record.mjs';

const SCHEMA_VERSION = 'v130.0';

export const CONFIRMATION_BASELINE_STATUSES = [
  'CONFIRMATION_BASELINE_BLOCKED',
  'CONFIRMATION_BASELINE_PARTIAL',
  'CONFIRMATION_BASELINE_READY',
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
    future_promotion_requires_new_governance_cycle: true,
  };
}

function _baselineId(params_hash) {
  return _sha256([params_hash, 'baseline-v130.0'].join('|'));
}

export function buildStableExecutionConfirmationBaseline(params) {
  const {
    mock_governance_baseline,
    mock_target_tag,
    mock_target_ref,
    mock_executed_by,
  } = params || {};

  const tag        = mock_target_tag   || 'v130.0-baseline';
  const ref        = mock_target_ref   || 'stable';
  const exec_by    = mock_executed_by  || 'human-operator';

  const params_hash = _sha256([tag, ref, exec_by].join('|'));
  const baseline_id = _baselineId(params_hash);

  // Mock governance baseline for pipeline input
  const governance_baseline = mock_governance_baseline || {
    stable_governance_baseline_ready: true,
    baseline_id:                      'governance-baseline-v125-mock',
    target_stable_ref:                ref,
    target_tag:                       tag,
  };

  // ── Pipeline A: Receipt Import ──
  const mock_receipt = {
    execution_receipt_id: `exec-receipt-${tag}`,
    executed_by:          exec_by,
    target_stable_ref:    ref,
    target_tag:           tag,
    executed_at:          new Date().toISOString(),
  };

  const imp = importStableExecutionReceipt({
    stable_promotion_governance_baseline: governance_baseline,
    execution_receipt:                    mock_receipt,
  });

  // ── Pipeline B: Diff Verifier ──
  const verifier = verifyStableExecutionDiff({
    stable_execution_receipt_import:      imp,
    stable_promotion_governance_baseline: governance_baseline,
  });

  // ── Pipeline C: Post-State Snapshot ──
  const snapshot = captureStableExecutionPostStateSnapshot({
    stable_execution_diff_verifier: verifier,
    captured_at:                    new Date().toISOString(),
  });

  // ── Pipeline D: Confirmation Document ──
  const doc = issueStablePromotionConfirmationDocument({
    stable_execution_post_state_snapshot: snapshot,
    issued_by:                            'confirmation-baseline-operator',
    notes:                                `V130.0 confirmation baseline for ${tag}`,
  });

  // ── Pipeline E: Post-Promotion Ledger ──
  const ledger_events = [
    { event_type: 'STABLE_EXECUTION_RECEIPT_IMPORTED',     payload: { import_id: imp.import_id } },
    { event_type: 'STABLE_EXECUTION_STATE_VERIFIED',        payload: { verifier_id: verifier.verifier_id } },
    { event_type: 'STABLE_EXECUTION_SNAPSHOT_CAPTURED',    payload: { snapshot_id: snapshot.snapshot_id } },
    { event_type: 'STABLE_EXECUTION_CONFIRMATION_ISSUED',   payload: { confirmation_id: doc.confirmation_id } },
    { event_type: 'STABLE_EXECUTION_POST_PROMOTION_AUDIT', payload: { baseline_id } },
    { event_type: 'STABLE_EXECUTION_PROMOTION_FINALIZED',  payload: { target_tag: tag } },
  ];
  const ledger = appendPostPromotionLedgerEvents(null, ledger_events);

  // ── Pipeline F: Post-Promotion Report ──
  const report = buildPostPromotionReport({
    stable_execution_post_promotion_ledger: ledger,
    stable_promotion_confirmation_document: doc,
  });

  // ── Pipeline G: Finalization Gate ──
  const gate = evaluateStablePromotionFinalizationGate({
    stable_execution_post_promotion_report:  report,
    stable_promotion_confirmation_document:  doc,
  });

  // ── Pipeline H: Archive Record ──
  const archive = buildStablePromotionArchiveRecord({
    stable_promotion_finalization_gate:      gate,
    stable_execution_post_promotion_report:  report,
    stable_promotion_confirmation_document:  doc,
  });

  // ── Baseline Status ──
  const pipeline_results = {
    import_ready:        imp.import_ready,
    diff_verified:       verifier.diff_verified,
    snapshot_ready:      snapshot.snapshot_ready,
    document_issued:     doc.document_issued,
    ledger_active:       ledger.ledger_status === 'POST_PROMOTION_LEDGER_ACTIVE',
    report_ready:        report.report_ready,
    gate_open:           gate.gate_open,
    archive_ready:       archive.archive_ready,
  };

  const all_passed   = Object.values(pipeline_results).every(Boolean);
  const passed_count = Object.values(pipeline_results).filter(Boolean).length;
  const total_pipelines = Object.keys(pipeline_results).length;

  const baseline_status = all_passed
    ? 'CONFIRMATION_BASELINE_READY'
    : passed_count > total_pipelines / 2
      ? 'CONFIRMATION_BASELINE_PARTIAL'
      : 'CONFIRMATION_BASELINE_BLOCKED';

  return {
    schema_version:                         SCHEMA_VERSION,
    baseline_id,
    baseline_status,
    stable_execution_confirmation_ready:    all_passed,
    target_stable_ref:                      ref,
    target_tag:                             tag,
    executed_by:                            exec_by,
    governance_baseline_id:                 governance_baseline.baseline_id,
    pipeline_results,
    passed_pipelines:                       passed_count,
    total_pipelines,
    archive_id:                             archive.archive_id || null,
    archive_hash:                           archive.archive_hash || null,
    confirmation_id:                        doc.confirmation_id || null,
    ledger_hash:                            ledger.ledger_hash,
    promotion_finalized:                    ledger.promotion_finalized,
    ..._locked(),
  };
}

export function validateStableExecutionConfirmationBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') {
    return { valid: false, errors: ['baseline is null/undefined'] };
  }

  const errors = [];

  if (!CONFIRMATION_BASELINE_STATUSES.includes(baseline.baseline_status)) {
    errors.push(`invalid baseline_status: ${baseline.baseline_status}`);
  }
  if (baseline.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (baseline.system_execution_performed !== false) errors.push('system_execution_performed must be false');
  if (baseline.automated_promotion_performed !== false) errors.push('automated_promotion_performed must be false');
  if (baseline.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (baseline.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (baseline.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (baseline.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (baseline.release_performed !== false) errors.push('release_performed must be false');
  if (baseline.future_promotion_requires_new_governance_cycle !== true) {
    errors.push('future_promotion_requires_new_governance_cycle must be true');
  }
  if (typeof baseline.stable_execution_confirmation_ready !== 'boolean') {
    errors.push('stable_execution_confirmation_ready must be boolean');
  }

  return { valid: errors.length === 0, errors };
}

export function renderStableExecutionConfirmationBaseline(baseline) {
  if (!baseline) {
    return `[CONFIRMATION BASELINE ERROR] baseline is null`;
  }

  const lines = [
    `=== STABLE EXECUTION CONFIRMATION BASELINE V130.0 ===`,
    `Schema:                                         ${baseline.schema_version}`,
    `Baseline ID:                                    ${baseline.baseline_id}`,
    `Status:                                         ${baseline.baseline_status}`,
    `stable_execution_confirmation_ready:            ${baseline.stable_execution_confirmation_ready}`,
    `Target Ref:                                     ${baseline.target_stable_ref}`,
    `Target Tag:                                     ${baseline.target_tag}`,
    `Executed By:                                    ${baseline.executed_by}`,
    `Governance Baseline ID:                         ${baseline.governance_baseline_id}`,
    `Confirmation ID:                                ${baseline.confirmation_id || 'not set'}`,
    `Archive ID:                                     ${baseline.archive_id || 'not set'}`,
    `Archive Hash:                                   ${baseline.archive_hash || 'not set'}`,
    `Ledger Hash:                                    ${baseline.ledger_hash}`,
    `Promotion Finalized:                            ${baseline.promotion_finalized}`,
    `Passed Pipelines:                               ${baseline.passed_pipelines} / ${baseline.total_pipelines}`,
    ``,
    `--- PIPELINE RESULTS ---`,
  ];

  for (const [k, v] of Object.entries(baseline.pipeline_results || {})) {
    lines.push(`  ${v ? 'PASS' : 'FAIL'} ${k}`);
  }

  lines.push(
    ``,
    `system_execution_performed:                     ${baseline.system_execution_performed}`,
    `automated_promotion_performed:                  ${baseline.automated_promotion_performed}`,
    `future_promotion_requires_new_governance_cycle: ${baseline.future_promotion_requires_new_governance_cycle}`,
    `stable_promotion_allowed:                       ${baseline.stable_promotion_allowed}`,
    `stable_promoted:                                ${baseline.stable_promoted}`,
  );

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-execution-confirmation-baseline.mjs')) {
  const isJson = process.argv.includes('--json');

  const baseline = buildStableExecutionConfirmationBaseline({
    mock_target_tag:  'v130.0-cli-mock',
    mock_target_ref:  'stable',
    mock_executed_by: 'human-operator-cli',
  });

  if (isJson) {
    console.log(JSON.stringify(baseline, null, 2));
  } else {
    console.log(renderStableExecutionConfirmationBaseline(baseline));
  }
}
