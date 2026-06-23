#!/usr/bin/env node
/**
 * Stable Review Baseline — V115.0
 *
 * Capstone baseline verifying V111.0 through V114.0 stable review tooling.
 * Verifies dry-run, mock real-tag, and stable preflight pipelines.
 * Does NOT promote stable, deploy, or release.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * deploy_performed=false, release_performed=false always.
 */

import { existsSync } from 'fs';
import { createHash } from 'crypto';

import { buildStableReviewContractAfterOneTag } from './stable-review-contract-after-one-tag.mjs';
import { bindStableReviewEvidence } from './stable-review-evidence-binding.mjs';
import { evaluateStableReviewDecisionMatrix } from './stable-review-decision-matrix.mjs';
import { buildStableReviewHumanApprovalContract, REQUIRED_APPROVAL_PHRASE } from './stable-review-human-approval-contract.mjs';
import { buildStableReviewLedger } from './stable-review-ledger.mjs';
import { buildStableReviewReport } from './stable-review-report.mjs';
import { evaluateStablePromotionPreflightGate } from './stable-promotion-preflight-gate.mjs';

const SCHEMA_VERSION = 'v115.0';
const BASELINE_VERSION = 'v115.0';

const REQUIRED_MODULES = [
  'tools/stable-review-contract-after-one-tag.mjs',
  'tools/stable-review-evidence-binding.mjs',
  'tools/stable-review-decision-matrix.mjs',
  'tools/stable-review-human-approval-contract.mjs',
  'tools/stable-review-ledger.mjs',
  'tools/stable-review-report.mjs',
  'tools/stable-promotion-preflight-gate.mjs',
];

export const STABLE_REVIEW_BASELINE_STATUSES = [
  'STABLE_REVIEW_BASELINE_BLOCKED_MODULES',
  'STABLE_REVIEW_BASELINE_BLOCKED_INVARIANTS',
  'STABLE_REVIEW_BASELINE_BLOCKED_PIPELINE',
  'STABLE_REVIEW_BASELINE_DRY_RUN_ONLY',
  'STABLE_REVIEW_BASELINE_READY_FOR_FUTURE_STABLE_PREFLIGHT',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:  false,
    stable_promoted:           false,
    deploy_performed:          false,
    release_performed:         false,
    future_stable_promotion_command_required: true,
  };
}

function _baselineId(pipelines) {
  return _sha256([JSON.stringify(pipelines), 'baseline-v115.0'].join('|'));
}

function _checkModules() {
  const missing = REQUIRED_MODULES.filter(m => !existsSync(m));
  return { ok: missing.length === 0, missing };
}

function _runDryRunPipeline() {
  const mockBaseline = {
    one_tag_baseline_ready:  true,
    baseline_id:             'mock-baseline-dry-v115',
    one_tag_baseline_status: 'ONE_TAG_BASELINE_DRY_RUN_CONFIRMED',
  };

  const contract = buildStableReviewContractAfterOneTag({
    one_tag_baseline:             mockBaseline,
    target_tag:                   'v0.1.0',
    git_head:                     'aaaa1111aaaa111',
    evidence_receipt_id:          'receipt-dry-001',
    evidence_source:              'go-core',
    rollback_anchor_id:           'rollback-dry-001',
    actual_real_tag_created:      false,
    actual_git_push_performed:    false,
  });

  if (!contract.contract_ready) return { ok: false, reason: `contract failed: ${contract.contract_status}` };

  const binding = bindStableReviewEvidence({
    stable_review_contract: contract,
    evidence_receipt_id:    'receipt-dry-001',
    evidence_source:        'go-core',
    rollback_anchor_id:     'rollback-dry-001',
    ledger_chain_valid:     true,
    receipt_verified:       false,
  });

  if (!binding.binding_ready) return { ok: false, reason: `binding failed: ${binding.binding_status}` };

  const matrix = evaluateStableReviewDecisionMatrix({
    stable_review_binding: binding,
    tag_operation_mode:    'dry_run',
  });

  if (matrix.stable_promotion_allowed !== false) return { ok: false, reason: 'stable_promotion_allowed not false' };
  if (matrix.stable_promoted !== false) return { ok: false, reason: 'stable_promoted not false' };

  return { ok: true, decision_status: matrix.decision_status };
}

function _runMockRealTagPipeline() {
  const mockBaseline = {
    one_tag_baseline_ready:  true,
    baseline_id:             'mock-baseline-real-v115',
    one_tag_baseline_status: 'ONE_TAG_BASELINE_DRY_RUN_CONFIRMED',
  };

  const contract = buildStableReviewContractAfterOneTag({
    one_tag_baseline:             mockBaseline,
    target_tag:                   'v0.2.0',
    git_head:                     'bbbb2222bbbb222',
    evidence_receipt_id:          'receipt-real-001',
    evidence_source:              'go-core',
    rollback_anchor_id:           'rollback-real-001',
    actual_real_tag_created:      true,
    actual_git_push_performed:    true,
  });

  if (!contract.contract_ready) return { ok: false, reason: `contract failed: ${contract.contract_status}` };

  const binding = bindStableReviewEvidence({
    stable_review_contract: contract,
    evidence_receipt_id:    'receipt-real-001',
    evidence_source:        'go-core',
    rollback_anchor_id:     'rollback-real-001',
    ledger_chain_valid:     true,
    receipt_verified:       true,
  });

  if (!binding.binding_ready) return { ok: false, reason: `binding failed: ${binding.binding_status}` };
  if (binding.stable_promotion_allowed !== false) return { ok: false, reason: 'stable_promotion_allowed not false' };

  const matrix = evaluateStableReviewDecisionMatrix({
    stable_review_binding: binding,
    tag_operation_mode:    'real_tag',
  });

  const approval = buildStableReviewHumanApprovalContract({
    stable_review_decision_matrix: matrix,
    human_approval_phrase:         REQUIRED_APPROVAL_PHRASE,
    approver_id:                   'mock-approver',
  });

  if (approval.stable_promotion_allowed !== false) return { ok: false, reason: 'approval: stable_promotion_allowed not false' };
  if (approval.stable_promoted !== false) return { ok: false, reason: 'approval: stable_promoted not false' };

  return { ok: true, approval_status: approval.approval_status };
}

function _runStablePreflightPipeline() {
  const ledger = buildStableReviewLedger([
    { event_type: 'STABLE_REVIEW_CONTRACT_READY',      ref_id: 'contract-pl-001' },
    { event_type: 'STABLE_REVIEW_EVIDENCE_BOUND',       ref_id: 'binding-pl-001' },
    { event_type: 'STABLE_REVIEW_DECISION_READY',       ref_id: 'decision-pl-001' },
    { event_type: 'STABLE_REVIEW_HUMAN_APPROVAL_READY', ref_id: 'approval-pl-001' },
  ]);

  if (!ledger.ledger_ready) return { ok: false, reason: `ledger failed: ${ledger.ledger_status}` };

  const report = buildStableReviewReport({ stable_review_ledger: ledger });

  if (!report.report_ready) return { ok: false, reason: `report failed: ${report.report_status}` };
  if (report.stable_promotion_allowed !== false) return { ok: false, reason: 'report: stable_promotion_allowed not false' };

  const gate = evaluateStablePromotionPreflightGate({
    stable_review_report:        report,
    target_stable_ref:           'stable',
    target_tag:                  'v-preflight-mock',
    git_head:                    'cccc3333',
    working_tree_clean:          true,
    stable_ref_exists:           false,
    stable_ref_points_to_target: false,
    rollback_anchor_id:          'rollback-pl-001',
    ci_environment:              false,
    github_actions:              false,
  });

  if (gate.stable_promotion_allowed !== false) return { ok: false, reason: 'gate: stable_promotion_allowed not false' };
  if (gate.stable_promoted !== false) return { ok: false, reason: 'gate: stable_promoted not false' };
  if (gate.git_push_performed !== false) return { ok: false, reason: 'gate: git_push_performed not false' };

  return { ok: true, preflight_status: gate.preflight_status };
}

export function buildStableReviewBaseline() {
  // Check modules
  const modules_check = _checkModules();
  if (!modules_check.ok) {
    return {
      schema_version:             SCHEMA_VERSION,
      baseline_version:           BASELINE_VERSION,
      stable_review_baseline_status: 'STABLE_REVIEW_BASELINE_BLOCKED_MODULES',
      stable_review_baseline_ready: false,
      blocking_reason:            `missing modules: ${modules_check.missing.join(', ')}`,
      ..._locked(),
    };
  }

  // Run pipelines
  const dry_run    = _runDryRunPipeline();
  const mock_real  = _runMockRealTagPipeline();
  const preflight  = _runStablePreflightPipeline();

  if (!dry_run.ok) {
    return {
      schema_version:             SCHEMA_VERSION,
      baseline_version:           BASELINE_VERSION,
      stable_review_baseline_status: 'STABLE_REVIEW_BASELINE_BLOCKED_PIPELINE',
      stable_review_baseline_ready: false,
      blocking_reason:            `dry_run pipeline: ${dry_run.reason}`,
      ..._locked(),
    };
  }

  if (!mock_real.ok) {
    return {
      schema_version:             SCHEMA_VERSION,
      baseline_version:           BASELINE_VERSION,
      stable_review_baseline_status: 'STABLE_REVIEW_BASELINE_BLOCKED_PIPELINE',
      stable_review_baseline_ready: false,
      blocking_reason:            `mock_real_tag pipeline: ${mock_real.reason}`,
      ..._locked(),
    };
  }

  if (!preflight.ok) {
    return {
      schema_version:             SCHEMA_VERSION,
      baseline_version:           BASELINE_VERSION,
      stable_review_baseline_status: 'STABLE_REVIEW_BASELINE_BLOCKED_PIPELINE',
      stable_review_baseline_ready: false,
      blocking_reason:            `preflight pipeline: ${preflight.reason}`,
      ..._locked(),
    };
  }

  const pipelines = { dry_run, mock_real, preflight };
  const baseline_id = _baselineId(pipelines);

  return {
    schema_version:                SCHEMA_VERSION,
    baseline_version:              BASELINE_VERSION,
    baseline_id,
    stable_review_baseline_status: 'STABLE_REVIEW_BASELINE_READY_FOR_FUTURE_STABLE_PREFLIGHT',
    stable_review_baseline_ready:  true,
    modules_verified:              true,
    dry_run_pipeline_verified:     true,
    mock_real_tag_pipeline_verified: true,
    stable_preflight_pipeline_verified: true,
    ledger_verified:               true,
    report_verified:               true,
    preflight_verified:            true,
    dry_run_decision_status:       dry_run.decision_status,
    mock_real_approval_status:     mock_real.approval_status,
    preflight_gate_status:         preflight.preflight_status,
    ..._locked(),
  };
}

export function validateStableReviewBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') {
    return { valid: false, errors: ['baseline is null/undefined'] };
  }

  const errors = [];

  if (!STABLE_REVIEW_BASELINE_STATUSES.includes(baseline.stable_review_baseline_status)) {
    errors.push(`invalid stable_review_baseline_status: ${baseline.stable_review_baseline_status}`);
  }
  if (baseline.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (baseline.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (baseline.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (baseline.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (baseline.release_performed !== false) errors.push('release_performed must be false');
  if (baseline.future_stable_promotion_command_required !== true) {
    errors.push('future_stable_promotion_command_required must be true');
  }

  return { valid: errors.length === 0, errors };
}

export function renderStableReviewBaseline(baseline) {
  if (!baseline || !baseline.stable_review_baseline_ready) {
    return `[STABLE REVIEW BASELINE BLOCKED] ${baseline?.stable_review_baseline_status || 'unknown'}: ${baseline?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE REVIEW BASELINE ===`,
    `Schema:                               ${baseline.schema_version}`,
    `Baseline Version:                     ${baseline.baseline_version}`,
    `Baseline ID:                          ${baseline.baseline_id}`,
    `Status:                               ${baseline.stable_review_baseline_status}`,
    `modules_verified:                     ${baseline.modules_verified}`,
    `dry_run_pipeline_verified:            ${baseline.dry_run_pipeline_verified}`,
    `mock_real_tag_pipeline_verified:      ${baseline.mock_real_tag_pipeline_verified}`,
    `stable_preflight_pipeline_verified:   ${baseline.stable_preflight_pipeline_verified}`,
    `ledger_verified:                      ${baseline.ledger_verified}`,
    `report_verified:                      ${baseline.report_verified}`,
    `preflight_verified:                   ${baseline.preflight_verified}`,
    `stable_promotion_allowed:             ${baseline.stable_promotion_allowed}`,
    `stable_promoted:                      ${baseline.stable_promoted}`,
    `deploy_performed:                     ${baseline.deploy_performed}`,
    `release_performed:                    ${baseline.release_performed}`,
    `future_stable_promotion_command_required: ${baseline.future_stable_promotion_command_required}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-review-baseline.mjs')) {
  const isJson = process.argv.includes('--json');

  const baseline = buildStableReviewBaseline();

  if (isJson) {
    console.log(JSON.stringify(baseline, null, 2));
  } else {
    console.log(renderStableReviewBaseline(baseline));
  }
}
