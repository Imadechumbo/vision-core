#!/usr/bin/env node
/**
 * Stable Promotion Readiness Classifier — V121.0
 *
 * Classifies readiness state for stable promotion based on governance report.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v121.0';

export const READINESS_STATUSES = [
  'READINESS_BLOCKED_REPORT',
  'READINESS_PARTIAL',
  'READINESS_DRY_RUN_READY',
  'READINESS_READY_FOR_FUTURE_HUMAN_EXECUTION',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:        false,
    stable_promoted:                 false,
    git_push_performed:              false,
    deploy_performed:                false,
    release_performed:               false,
    human_execution_required:        true,
    automated_promotion_forbidden:   true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    readiness_status: status,
    readiness_ready:  false,
    blocking_reason:  reason,
    ..._locked(),
    ...extra,
  };
}

function _classifierId(report_id) {
  return _sha256([report_id || '', 'rc-v121.0'].join('|'));
}

export function classifyStablePromotionReadiness(params) {
  const { stable_promotion_governance_report } = params || {};

  if (!stable_promotion_governance_report || !stable_promotion_governance_report.report_ready) {
    return _blocked('READINESS_BLOCKED_REPORT', 'stable_promotion_governance_report not ready');
  }

  const report = stable_promotion_governance_report;
  const gates  = report.governance_gates || {};
  const classifier_id = _classifierId(report.report_id);

  const gates_passed_count = Object.values(gates).filter(Boolean).length;
  const total_gates = Object.keys(gates).length;

  let readiness_status;
  if (report.all_gates_passed) {
    readiness_status = 'READINESS_READY_FOR_FUTURE_HUMAN_EXECUTION';
  } else if (gates.dry_run_simulated) {
    readiness_status = 'READINESS_DRY_RUN_READY';
  } else {
    readiness_status = 'READINESS_PARTIAL';
  }

  const readiness_notes = [];
  if (!gates.contract_ready)      readiness_notes.push('contract not ready');
  if (!gates.approval_bound)      readiness_notes.push('approval not bound');
  if (!gates.dry_run_simulated)   readiness_notes.push('dry-run not simulated');
  if (!gates.safety_lock_issued)  readiness_notes.push('safety lock not issued');
  if (!gates.rollback_plan_ready) readiness_notes.push('rollback plan not ready');

  return {
    schema_version:       SCHEMA_VERSION,
    classifier_id,
    readiness_status,
    readiness_ready:      readiness_status === 'READINESS_READY_FOR_FUTURE_HUMAN_EXECUTION',
    report_id:            report.report_id,
    target_stable_ref:    report.target_stable_ref,
    target_tag:           report.target_tag,
    total_audit_events:   report.total_audit_events,
    gates_passed_count,
    total_gates,
    all_gates_passed:     report.all_gates_passed,
    governance_gates:     gates,
    readiness_notes,
    ..._locked(),
  };
}

export function validateStablePromotionReadinessClassifier(classifier) {
  if (!classifier || typeof classifier !== 'object') {
    return { valid: false, errors: ['classifier is null/undefined'] };
  }

  const errors = [];

  if (!READINESS_STATUSES.includes(classifier.readiness_status)) {
    errors.push(`invalid readiness_status: ${classifier.readiness_status}`);
  }
  if (classifier.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (classifier.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (classifier.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (classifier.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (classifier.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (classifier.release_performed !== false) errors.push('release_performed must be false');
  if (classifier.human_execution_required !== true) errors.push('human_execution_required must be true');
  if (classifier.automated_promotion_forbidden !== true) errors.push('automated_promotion_forbidden must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionReadinessClassifier(classifier) {
  if (!classifier || classifier.readiness_status === 'READINESS_BLOCKED_REPORT') {
    return `[READINESS CLASSIFIER BLOCKED] ${classifier?.readiness_status || 'unknown'}: ${classifier?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION READINESS CLASSIFIER ===`,
    `Schema:                     ${classifier.schema_version}`,
    `Classifier ID:              ${classifier.classifier_id}`,
    `Readiness Status:           ${classifier.readiness_status}`,
    `Readiness Ready:            ${classifier.readiness_ready}`,
    `Target Ref:                 ${classifier.target_stable_ref}`,
    `Target Tag:                 ${classifier.target_tag}`,
    `Audit Events:               ${classifier.total_audit_events}`,
    `Gates Passed:               ${classifier.gates_passed_count} / ${classifier.total_gates}`,
    `All Gates Passed:           ${classifier.all_gates_passed}`,
    ``,
    `--- GOVERNANCE GATES ---`,
    `  contract_ready:      ${classifier.governance_gates?.contract_ready}`,
    `  approval_bound:      ${classifier.governance_gates?.approval_bound}`,
    `  dry_run_simulated:   ${classifier.governance_gates?.dry_run_simulated}`,
    `  safety_lock_issued:  ${classifier.governance_gates?.safety_lock_issued}`,
    `  rollback_plan_ready: ${classifier.governance_gates?.rollback_plan_ready}`,
    ``,
    ...(classifier.readiness_notes && classifier.readiness_notes.length > 0
      ? [`--- READINESS NOTES ---`, ...classifier.readiness_notes.map(n => `  - ${n}`), ``]
      : []),
    `stable_promotion_allowed:        ${classifier.stable_promotion_allowed}`,
    `human_execution_required:        ${classifier.human_execution_required}`,
    `automated_promotion_forbidden:   ${classifier.automated_promotion_forbidden}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-readiness-classifier.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockReport = {
    report_ready:       true,
    report_id:          'mock-report-v1210',
    target_stable_ref:  'stable',
    target_tag:         'v121.0-mock',
    total_audit_events: 5,
    all_gates_passed:   true,
    governance_gates: {
      contract_ready:      true,
      approval_bound:      true,
      dry_run_simulated:   true,
      safety_lock_issued:  true,
      rollback_plan_ready: true,
    },
  };

  const result = classifyStablePromotionReadiness({ stable_promotion_governance_report: mockReport });

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderStablePromotionReadinessClassifier(result));
  }
}
