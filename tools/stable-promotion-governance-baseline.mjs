#!/usr/bin/env node
/**
 * Stable Promotion Governance Baseline — V125.0
 *
 * Capstone module. Runs all V116-V124 pipelines and verifies
 * stable_governance_baseline_ready=true.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false,
 * future_human_stable_execution_required=true always.
 */

import { createHash } from 'crypto';

// V116.0
import { buildStablePromotionHumanCommandContract }      from './stable-promotion-human-command-contract.mjs';
// V116.1
import { bindStablePromotionHumanApproval, REQUIRED_APPROVAL_PHRASE } from './stable-promotion-human-approval-binding.mjs';
// V117.0
import { buildStablePromotionCommandPackage }             from './stable-promotion-command-package.mjs';
// V117.1
import { renderStablePromotionCommandBlock }              from './stable-promotion-command-renderer.mjs';
// V118.0
import { runStablePromotionDryRunExecutor }               from './stable-promotion-dry-run-executor.mjs';
// V118.1
import { issueStablePromotionDryRunReceipt }              from './stable-promotion-dry-run-receipt.mjs';
// V119.0
import { evaluateStablePromotionSafetyLock }              from './stable-promotion-safety-lock.mjs';
// V119.1
import { buildStablePromotionRollbackPlan }               from './stable-promotion-rollback-plan.mjs';
// V120.0
import { appendStablePromotionAuditEvents }               from './stable-promotion-audit-ledger.mjs';
// V120.1
import { buildStablePromotionGovernanceReport }           from './stable-promotion-governance-report.mjs';
// V121.0
import { classifyStablePromotionReadiness }               from './stable-promotion-readiness-classifier.mjs';
// V121.1
import { buildStablePromotionHumanRunbook }               from './stable-promotion-human-runbook.mjs';
// V122.0
import { captureStablePromotionFinalPreflightSnapshot }   from './stable-promotion-final-preflight-snapshot.mjs';
// V122.1
import { sealStablePromotionFinalCommands }               from './stable-promotion-final-command-seal.mjs';
// V123.0
import { evaluateStablePromotionReceiptImportGate }       from './stable-promotion-receipt-import-gate.mjs';
// V123.1
import { verifyStablePromotionReceipt }                   from './stable-promotion-receipt-verifier.mjs';
// V124.0
import { appendPostReceiptLedgerEvents }                  from './stable-promotion-post-receipt-ledger.mjs';
// V124.1
import { buildPostReceiptReport }                         from './stable-promotion-post-receipt-report.mjs';

const SCHEMA_VERSION = 'v125.0';

export const GOVERNANCE_BASELINE_STATUSES = [
  'GOVERNANCE_BASELINE_BLOCKED',
  'GOVERNANCE_BASELINE_PARTIAL',
  'GOVERNANCE_BASELINE_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:               false,
    stable_promoted:                        false,
    git_push_performed:                     false,
    deploy_performed:                       false,
    release_performed:                      false,
    future_human_stable_execution_required: true,
    automated_stable_promotion_forbidden:   true,
  };
}

function _baselineId(params_hash) {
  return _sha256([params_hash, 'baseline-v125.0'].join('|'));
}

export function buildStablePromotionGovernanceBaseline(params) {
  const {
    stable_review_baseline,
    stable_preflight_gate,
    mock_target_tag,
    mock_target_ref,
    mock_rollback_anchor,
  } = params || {};

  const tag   = mock_target_tag   || 'v125.0-baseline';
  const ref   = mock_target_ref   || 'stable';
  const anch  = mock_rollback_anchor || 'v124.1-baseline';

  const params_hash = _sha256([
    JSON.stringify(stable_review_baseline || {}),
    tag, ref, anch,
  ].join('|'));
  const baseline_id = _baselineId(params_hash);

  // ── Pipeline A: Human Command Contract + Approval Binding ──
  const mock_baseline = { stable_review_baseline_ready: true, baseline_id: 'mock-baseline-v125', one_tag_baseline_status: 'ONE_TAG_BASELINE_DRY_RUN_CONFIRMED' };
  const mock_preflight = stable_preflight_gate || { stable_preflight_ready: true, preflight_id: 'mock-preflight-v125', gate_ready: true };

  const contract = buildStablePromotionHumanCommandContract({
    stable_review_baseline:    stable_review_baseline || mock_baseline,
    stable_promotion_preflight: mock_preflight,
    target_stable_ref:         ref,
    rollback_anchor_id:        anch,
  });

  const binding = bindStablePromotionHumanApproval({
    stable_promotion_contract:  contract,
    human_approval_phrase:      REQUIRED_APPROVAL_PHRASE,
    approved_by:                'governance-baseline-operator',
    approval_decision:          'approved',
  });

  // ── Pipeline B: Command Package + Renderer ──
  const pkg = buildStablePromotionCommandPackage({
    stable_promotion_approval_binding: binding,
    target_stable_ref:  ref,
    target_tag:         tag,
    git_head:           'baseline-head-v125',
    rollback_anchor_id: anch,
  });

  const block = renderStablePromotionCommandBlock({ stable_promotion_command_package: pkg });

  // ── Pipeline C: Dry-Run + Receipt ──
  const dryrun = runStablePromotionDryRunExecutor({ stable_promotion_command_block: block });
  const receipt = issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: dryrun });

  // ── Pipeline D: Safety Lock + Rollback Plan ──
  const lock = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: receipt });
  const rollback = buildStablePromotionRollbackPlan({
    stable_promotion_safety_lock: lock,
    rollback_anchor_ref:          anch,
    rollback_anchor_tag:          anch,
  });

  // ── Pipeline E: Audit Ledger + Governance Report ──
  const audit_events = [
    { event_type: 'STABLE_PROMOTION_CONTRACT_READY',         payload: { contract_status: contract.contract_status } },
    { event_type: 'STABLE_PROMOTION_APPROVAL_BOUND',         payload: { binding_status: binding.binding_status } },
    { event_type: 'STABLE_PROMOTION_COMMAND_PACKAGE_READY',  payload: { package_id: pkg.package_id } },
    { event_type: 'STABLE_PROMOTION_COMMAND_RENDERED',       payload: { block_id: block.command_block_id } },
    { event_type: 'STABLE_PROMOTION_DRY_RUN_SIMULATED',      payload: { total_commands: dryrun.total_commands_simulated } },
    { event_type: 'STABLE_PROMOTION_DRY_RUN_RECEIPT_ISSUED', payload: { receipt_id: receipt.receipt_id } },
    { event_type: 'STABLE_PROMOTION_SAFETY_LOCK_ISSUED',     payload: { lock_id: lock.lock_id } },
    { event_type: 'STABLE_PROMOTION_ROLLBACK_PLAN_READY',    payload: { plan_id: rollback.plan_id } },
  ];
  const ledger = appendStablePromotionAuditEvents(null, audit_events);

  const gov_report = buildStablePromotionGovernanceReport({
    stable_promotion_audit_ledger: ledger,
    stable_promotion_safety_lock:  lock,
  });

  // ── Pipeline F: Readiness + Runbook ──
  const readiness = classifyStablePromotionReadiness({ stable_promotion_governance_report: gov_report });
  const runbook   = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: readiness });

  // ── Pipeline G: Final Preflight Snapshot + Command Seal ──
  const snapshot = captureStablePromotionFinalPreflightSnapshot({
    stable_promotion_human_runbook: runbook,
    current_worktree_status:        'clean',
  });
  const seal = sealStablePromotionFinalCommands({
    stable_promotion_preflight_snapshot: snapshot,
    stable_promotion_command_package:    pkg,
  });

  // ── Pipeline H: Receipt Import Gate + Verifier ──
  const gate = evaluateStablePromotionReceiptImportGate({
    stable_promotion_command_seal: seal,
    receipt_source:                'human_manual_import',
    allow_real_receipt:            true,
  });
  const mock_imported_receipt = {
    receipt_id:        receipt.receipt_id,
    target_stable_ref: ref,
    target_tag:        tag,
    seal_id:           seal.seal_id,
  };
  const verifier = verifyStablePromotionReceipt({
    stable_promotion_receipt_import_gate: gate,
    imported_receipt:                     mock_imported_receipt,
  });

  // ── Pipeline I: Post-Receipt Ledger + Report ──
  const post_events = [
    { event_type: 'STABLE_PROMOTION_RECEIPT_IMPORTED',       payload: { source: 'human_manual_import' } },
    { event_type: 'STABLE_PROMOTION_RECEIPT_VERIFIED',       payload: { receipt_id: verifier.receipt_id } },
    { event_type: 'STABLE_PROMOTION_POST_RECEIPT_AUDIT',     payload: { verifier_id: verifier.verifier_id } },
    { event_type: 'STABLE_PROMOTION_GOVERNANCE_COMPLETE',    payload: { baseline_id } },
  ];
  const post_ledger = appendPostReceiptLedgerEvents(null, post_events);
  const post_report = buildPostReceiptReport({
    stable_promotion_post_receipt_ledger: post_ledger,
    stable_promotion_receipt_verifier:    verifier,
  });

  // ── Baseline Status ──
  const pipeline_results = {
    contract_ready:    contract.contract_status === 'HUMAN_COMMAND_CONTRACT_READY',
    binding_ready:     binding.binding_ready,
    package_ready:     pkg.package_ready,
    block_ready:       block.render_ready,
    dryrun_ready:      dryrun.dry_run_ready,
    receipt_issued:    receipt.receipt_issued,
    lock_issued:       lock.lock_issued,
    rollback_ready:    rollback.plan_ready,
    ledger_active:     ledger.ledger_status === 'AUDIT_LEDGER_ACTIVE',
    gov_report_ready:  gov_report.report_ready,
    readiness_ready:   readiness.readiness_ready,
    runbook_ready:     runbook.runbook_ready,
    snapshot_ready:    snapshot.snapshot_ready,
    seal_ready:        seal.seal_ready,
    gate_open:         gate.gate_open,
    verifier_verified: verifier.receipt_verified,
    post_ledger_active: post_ledger.ledger_status === 'POST_RECEIPT_LEDGER_ACTIVE',
    post_report_ready:  post_report.report_ready,
  };

  const all_passed = Object.values(pipeline_results).every(Boolean);
  const passed_count = Object.values(pipeline_results).filter(Boolean).length;
  const total_pipelines = Object.keys(pipeline_results).length;

  const baseline_status = all_passed
    ? 'GOVERNANCE_BASELINE_READY'
    : passed_count > total_pipelines / 2
      ? 'GOVERNANCE_BASELINE_PARTIAL'
      : 'GOVERNANCE_BASELINE_BLOCKED';

  return {
    schema_version:                        SCHEMA_VERSION,
    baseline_id,
    baseline_status,
    stable_governance_baseline_ready:      all_passed,
    target_stable_ref:                     ref,
    target_tag:                            tag,
    rollback_anchor:                       anch,
    pipeline_results,
    passed_pipelines:                      passed_count,
    total_pipelines,
    ledger_hash:                           ledger.ledger_hash,
    post_ledger_hash:                      post_ledger.ledger_hash,
    governance_complete:                   post_ledger.governance_complete,
    ..._locked(),
  };
}

export function validateStablePromotionGovernanceBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') {
    return { valid: false, errors: ['baseline is null/undefined'] };
  }

  const errors = [];

  if (!GOVERNANCE_BASELINE_STATUSES.includes(baseline.baseline_status)) {
    errors.push(`invalid baseline_status: ${baseline.baseline_status}`);
  }
  if (baseline.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (baseline.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (baseline.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (baseline.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (baseline.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (baseline.release_performed !== false) errors.push('release_performed must be false');
  if (baseline.future_human_stable_execution_required !== true) errors.push('future_human_stable_execution_required must be true');
  if (baseline.automated_stable_promotion_forbidden !== true) errors.push('automated_stable_promotion_forbidden must be true');
  if (typeof baseline.stable_governance_baseline_ready !== 'boolean') errors.push('stable_governance_baseline_ready must be boolean');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionGovernanceBaseline(baseline) {
  if (!baseline) {
    return `[GOVERNANCE BASELINE ERROR] baseline is null`;
  }

  const lines = [
    `=== STABLE PROMOTION GOVERNANCE BASELINE V125.0 ===`,
    `Schema:                               ${baseline.schema_version}`,
    `Baseline ID:                          ${baseline.baseline_id}`,
    `Status:                               ${baseline.baseline_status}`,
    `stable_governance_baseline_ready:     ${baseline.stable_governance_baseline_ready}`,
    `Target Ref:                           ${baseline.target_stable_ref}`,
    `Target Tag:                           ${baseline.target_tag}`,
    `Rollback Anchor:                      ${baseline.rollback_anchor}`,
    `Passed Pipelines:                     ${baseline.passed_pipelines} / ${baseline.total_pipelines}`,
    `Governance Complete:                  ${baseline.governance_complete}`,
    ``,
    `--- PIPELINE RESULTS ---`,
  ];

  for (const [k, v] of Object.entries(baseline.pipeline_results || {})) {
    lines.push(`  ${v ? 'PASS' : 'FAIL'} ${k}`);
  }

  lines.push(
    ``,
    `Ledger Hash:      ${baseline.ledger_hash}`,
    `Post Ledger Hash: ${baseline.post_ledger_hash}`,
    ``,
    `stable_promotion_allowed:               ${baseline.stable_promotion_allowed}`,
    `stable_promoted:                        ${baseline.stable_promoted}`,
    `future_human_stable_execution_required: ${baseline.future_human_stable_execution_required}`,
    `automated_stable_promotion_forbidden:   ${baseline.automated_stable_promotion_forbidden}`,
  );

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-governance-baseline.mjs')) {
  const isJson = process.argv.includes('--json');

  const baseline = buildStablePromotionGovernanceBaseline({
    mock_target_tag:      'v125.0-cli-mock',
    mock_target_ref:      'stable',
    mock_rollback_anchor: 'v124.1-cli-mock',
  });

  if (isJson) {
    console.log(JSON.stringify(baseline, null, 2));
  } else {
    console.log(renderStablePromotionGovernanceBaseline(baseline));
  }
}
