#!/usr/bin/env node
/**
 * Tests — Stable Promotion Governance Report V120.1
 */

import {
  buildStablePromotionGovernanceReport,
  validateStablePromotionGovernanceReport,
  renderStablePromotionGovernanceReport,
  GOVERNANCE_REPORT_STATUSES,
} from '../stable-promotion-governance-report.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const FULL_LEDGER = {
  ledger_status: 'AUDIT_LEDGER_ACTIVE',
  ledger_hash:   'ledger-hash-001',
  event_count:   5,
  events: [
    { sequence: 0, event_type: 'STABLE_PROMOTION_CONTRACT_READY',      event_hash: 'h0' },
    { sequence: 1, event_type: 'STABLE_PROMOTION_APPROVAL_BOUND',      event_hash: 'h1' },
    { sequence: 2, event_type: 'STABLE_PROMOTION_DRY_RUN_SIMULATED',   event_hash: 'h2' },
    { sequence: 3, event_type: 'STABLE_PROMOTION_SAFETY_LOCK_ISSUED',  event_hash: 'h3' },
    { sequence: 4, event_type: 'STABLE_PROMOTION_ROLLBACK_PLAN_READY', event_hash: 'h4' },
  ],
};

const PARTIAL_LEDGER = {
  ledger_status: 'AUDIT_LEDGER_ACTIVE',
  ledger_hash:   'ledger-hash-002',
  event_count:   2,
  events: [
    { sequence: 0, event_type: 'STABLE_PROMOTION_CONTRACT_READY',    event_hash: 'h0' },
    { sequence: 1, event_type: 'STABLE_PROMOTION_APPROVAL_BOUND',    event_hash: 'h1' },
  ],
};

const GOOD_LOCK = {
  lock_issued:        true,
  lock_id:            'lock-001',
  target_stable_ref:  'stable',
  target_tag:         'v1.0.0',
};

const GOOD_PARAMS = {
  stable_promotion_audit_ledger: FULL_LEDGER,
  stable_promotion_safety_lock:  GOOD_LOCK,
};

console.log('\n=== stable-promotion-governance-report tests ===\n');

console.log('--- null ledger ---');
{
  const r = buildStablePromotionGovernanceReport({ stable_promotion_safety_lock: GOOD_LOCK });
  assert(r.report_status === 'GOVERNANCE_REPORT_BLOCKED_LEDGER', 'null ledger → BLOCKED_LEDGER');
  assert(r.report_ready === false, 'report_ready false');
}

console.log('--- empty ledger ---');
{
  const r = buildStablePromotionGovernanceReport({
    stable_promotion_audit_ledger: { ledger_status: 'AUDIT_LEDGER_EMPTY', events: [] },
    stable_promotion_safety_lock: GOOD_LOCK,
  });
  assert(r.report_status === 'GOVERNANCE_REPORT_BLOCKED_LEDGER', 'empty ledger → BLOCKED_LEDGER');
}

console.log('--- null lock ---');
{
  const r = buildStablePromotionGovernanceReport({ stable_promotion_audit_ledger: FULL_LEDGER });
  assert(r.report_status === 'GOVERNANCE_REPORT_BLOCKED_LOCK', 'null lock → BLOCKED_LOCK');
  assert(r.report_ready === false, 'report_ready false');
}

console.log('--- lock not issued ---');
{
  const r = buildStablePromotionGovernanceReport({
    stable_promotion_audit_ledger: FULL_LEDGER,
    stable_promotion_safety_lock: { lock_issued: false },
  });
  assert(r.report_status === 'GOVERNANCE_REPORT_BLOCKED_LOCK', 'not-issued → BLOCKED_LOCK');
}

console.log('--- ready report ---');
{
  const r = buildStablePromotionGovernanceReport(GOOD_PARAMS);
  assert(r.report_status === 'GOVERNANCE_REPORT_READY_FOR_FUTURE_HUMAN_EXECUTION', 'ready status');
  assert(r.report_ready === true, 'report_ready true');
  assert(r.ledger_hash === 'ledger-hash-001', 'ledger_hash propagated');
  assert(r.lock_id === 'lock-001', 'lock_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(r.total_audit_events === 5, 'total_audit_events');
  assert(Array.isArray(r.event_summary), 'event_summary array');
  assert(r.event_summary.length === 5, 'event_summary length');
  assert(typeof r.report_id === 'string' && r.report_id.length === 64, 'report_id sha256');
  assert(r.schema_version === 'v120.1', 'schema version');
}

console.log('--- governance gates all passed ---');
{
  const r = buildStablePromotionGovernanceReport(GOOD_PARAMS);
  assert(r.governance_gates.contract_ready === true, 'gate: contract_ready');
  assert(r.governance_gates.approval_bound === true, 'gate: approval_bound');
  assert(r.governance_gates.dry_run_simulated === true, 'gate: dry_run_simulated');
  assert(r.governance_gates.safety_lock_issued === true, 'gate: safety_lock_issued');
  assert(r.governance_gates.rollback_plan_ready === true, 'gate: rollback_plan_ready');
  assert(r.all_gates_passed === true, 'all_gates_passed true');
}

console.log('--- governance gates partial ---');
{
  const r = buildStablePromotionGovernanceReport({
    stable_promotion_audit_ledger: PARTIAL_LEDGER,
    stable_promotion_safety_lock: GOOD_LOCK,
  });
  assert(r.governance_gates.contract_ready === true, 'partial: contract_ready true');
  assert(r.governance_gates.approval_bound === true, 'partial: approval_bound true');
  assert(r.governance_gates.dry_run_simulated === false, 'partial: dry_run false');
  assert(r.all_gates_passed === false, 'all_gates_passed false');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = buildStablePromotionGovernanceReport({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = buildStablePromotionGovernanceReport(GOOD_PARAMS);
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(buildStablePromotionGovernanceReport(GOOD_PARAMS).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(buildStablePromotionGovernanceReport(GOOD_PARAMS).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(buildStablePromotionGovernanceReport(GOOD_PARAMS).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(buildStablePromotionGovernanceReport(GOOD_PARAMS).release_performed === false, 'release_performed=false');
}

console.log('--- future_human_execution_required=true ---');
{
  const r1 = buildStablePromotionGovernanceReport({});
  assert(r1.future_human_execution_required === true, 'blocked: true');
  const r2 = buildStablePromotionGovernanceReport(GOOD_PARAMS);
  assert(r2.future_human_execution_required === true, 'ready: true');
}

console.log('--- automated_execution_forbidden=true ---');
{
  assert(buildStablePromotionGovernanceReport(GOOD_PARAMS).automated_execution_forbidden === true, 'automated_execution_forbidden=true');
}

console.log('--- validate ---');
{
  const r = buildStablePromotionGovernanceReport(GOOD_PARAMS);
  const v = validateStablePromotionGovernanceReport(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionGovernanceReport(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = buildStablePromotionGovernanceReport(GOOD_PARAMS);
  const txt = renderStablePromotionGovernanceReport(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION GOVERNANCE REPORT'), 'render title');
  assert(txt.includes('GOVERNANCE_REPORT_READY_FOR_FUTURE_HUMAN_EXECUTION'), 'status in output');
  assert(txt.includes('GOVERNANCE GATES'), 'gates section');
  assert(txt.includes('AUDIT EVENT SUMMARY'), 'events section');
  assert(txt.includes('future_human_execution_required:'), 'invariant in output');
}

console.log('--- render blocked ---');
{
  const r = buildStablePromotionGovernanceReport({});
  const txt = renderStablePromotionGovernanceReport(r);
  assert(txt.includes('GOVERNANCE REPORT BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(GOVERNANCE_REPORT_STATUSES.includes('GOVERNANCE_REPORT_READY_FOR_FUTURE_HUMAN_EXECUTION'), 'ready in statuses');
  assert(GOVERNANCE_REPORT_STATUSES.includes('GOVERNANCE_REPORT_BLOCKED_LEDGER'), 'ledger blocked in statuses');
  assert(GOVERNANCE_REPORT_STATUSES.includes('GOVERNANCE_REPORT_BLOCKED_LOCK'), 'lock blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
