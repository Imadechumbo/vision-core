#!/usr/bin/env node
/**
 * Stable Promotion Governance Report — V120.1
 *
 * Generates a governance report from the audit ledger and safety lock.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v120.1';

export const GOVERNANCE_REPORT_STATUSES = [
  'GOVERNANCE_REPORT_BLOCKED_LEDGER',
  'GOVERNANCE_REPORT_BLOCKED_LOCK',
  'GOVERNANCE_REPORT_READY_FOR_FUTURE_HUMAN_EXECUTION',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:       false,
    stable_promoted:                false,
    git_push_performed:             false,
    deploy_performed:               false,
    release_performed:              false,
    future_human_execution_required: true,
    automated_execution_forbidden:  true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    report_status:   status,
    report_ready:    false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _reportId(ledger_hash, lock_id) {
  return _sha256([ledger_hash || '', lock_id || '', 'gov-report-v120.1'].join('|'));
}

export function buildStablePromotionGovernanceReport(params) {
  const {
    stable_promotion_audit_ledger,
    stable_promotion_safety_lock,
  } = params || {};

  if (!stable_promotion_audit_ledger || stable_promotion_audit_ledger.ledger_status === 'AUDIT_LEDGER_EMPTY') {
    return _blocked('GOVERNANCE_REPORT_BLOCKED_LEDGER', 'stable_promotion_audit_ledger is empty or missing');
  }

  if (!stable_promotion_safety_lock || !stable_promotion_safety_lock.lock_issued) {
    return _blocked('GOVERNANCE_REPORT_BLOCKED_LOCK', 'stable_promotion_safety_lock not issued');
  }

  const ledger = stable_promotion_audit_ledger;
  const lock   = stable_promotion_safety_lock;

  const report_id = _reportId(ledger.ledger_hash, lock.lock_id);

  const event_summary = (ledger.events || []).map(e => ({
    sequence:   e.sequence,
    event_type: e.event_type,
    event_hash: e.event_hash,
  }));

  const has_contract  = (ledger.events || []).some(e => e.event_type === 'STABLE_PROMOTION_CONTRACT_READY');
  const has_approval  = (ledger.events || []).some(e => e.event_type === 'STABLE_PROMOTION_APPROVAL_BOUND');
  const has_dry_run   = (ledger.events || []).some(e => e.event_type === 'STABLE_PROMOTION_DRY_RUN_SIMULATED');
  const has_lock_ev   = (ledger.events || []).some(e => e.event_type === 'STABLE_PROMOTION_SAFETY_LOCK_ISSUED');
  const has_rollback  = (ledger.events || []).some(e => e.event_type === 'STABLE_PROMOTION_ROLLBACK_PLAN_READY');

  const governance_gates = {
    contract_ready:      has_contract,
    approval_bound:      has_approval,
    dry_run_simulated:   has_dry_run,
    safety_lock_issued:  has_lock_ev,
    rollback_plan_ready: has_rollback,
  };

  const all_gates_passed = has_contract && has_approval && has_dry_run && has_lock_ev && has_rollback;

  return {
    schema_version:     SCHEMA_VERSION,
    report_id,
    report_status:      'GOVERNANCE_REPORT_READY_FOR_FUTURE_HUMAN_EXECUTION',
    report_ready:       true,
    ledger_hash:        ledger.ledger_hash,
    lock_id:            lock.lock_id,
    target_stable_ref:  lock.target_stable_ref,
    target_tag:         lock.target_tag,
    total_audit_events: ledger.event_count,
    event_summary,
    governance_gates,
    all_gates_passed,
    ..._locked(),
  };
}

export function validateStablePromotionGovernanceReport(report) {
  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['report is null/undefined'] };
  }

  const errors = [];

  if (!GOVERNANCE_REPORT_STATUSES.includes(report.report_status)) {
    errors.push(`invalid report_status: ${report.report_status}`);
  }
  if (report.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (report.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (report.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (report.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (report.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (report.release_performed !== false) errors.push('release_performed must be false');
  if (report.future_human_execution_required !== true) errors.push('future_human_execution_required must be true');
  if (report.automated_execution_forbidden !== true) errors.push('automated_execution_forbidden must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionGovernanceReport(report) {
  if (!report || !report.report_ready) {
    return `[GOVERNANCE REPORT BLOCKED] ${report?.report_status || 'unknown'}: ${report?.blocking_reason || 'unknown reason'}`;
  }

  const gates = report.governance_gates || {};

  return [
    `=== STABLE PROMOTION GOVERNANCE REPORT ===`,
    `Schema:              ${report.schema_version}`,
    `Report ID:           ${report.report_id}`,
    `Status:              ${report.report_status}`,
    `Ledger Hash:         ${report.ledger_hash}`,
    `Lock ID:             ${report.lock_id}`,
    `Target Ref:          ${report.target_stable_ref}`,
    `Target Tag:          ${report.target_tag}`,
    `Audit Events:        ${report.total_audit_events}`,
    `All Gates Passed:    ${report.all_gates_passed}`,
    ``,
    `--- GOVERNANCE GATES ---`,
    `  contract_ready:      ${gates.contract_ready}`,
    `  approval_bound:      ${gates.approval_bound}`,
    `  dry_run_simulated:   ${gates.dry_run_simulated}`,
    `  safety_lock_issued:  ${gates.safety_lock_issued}`,
    `  rollback_plan_ready: ${gates.rollback_plan_ready}`,
    ``,
    `--- AUDIT EVENT SUMMARY ---`,
    ...report.event_summary.map(e => `  [${e.sequence}] ${e.event_type}`),
    ``,
    `stable_promotion_allowed:        ${report.stable_promotion_allowed}`,
    `future_human_execution_required: ${report.future_human_execution_required}`,
    `automated_execution_forbidden:   ${report.automated_execution_forbidden}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-governance-report.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockLedger = {
    ledger_status: 'AUDIT_LEDGER_ACTIVE',
    ledger_hash:   'a'.repeat(64),
    event_count:   3,
    events: [
      { sequence: 0, event_type: 'STABLE_PROMOTION_CONTRACT_READY',    event_hash: 'h0' },
      { sequence: 1, event_type: 'STABLE_PROMOTION_APPROVAL_BOUND',    event_hash: 'h1' },
      { sequence: 2, event_type: 'STABLE_PROMOTION_DRY_RUN_SIMULATED', event_hash: 'h2' },
    ],
  };

  const mockLock = {
    lock_issued:       true,
    lock_id:           'mock-lock-v1201',
    target_stable_ref: 'stable',
    target_tag:        'v120.1-mock',
  };

  const report = buildStablePromotionGovernanceReport({
    stable_promotion_audit_ledger:  mockLedger,
    stable_promotion_safety_lock:   mockLock,
  });

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderStablePromotionGovernanceReport(report));
  }
}
