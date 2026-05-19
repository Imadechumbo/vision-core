#!/usr/bin/env node
/**
 * Tests — One Real Tag Operation Final Report V109.0
 */

import {
  buildOneRealTagOperationFinalReport,
  validateOneRealTagOperationFinalReport,
  renderOneRealTagOperationFinalReport,
  FINAL_REPORT_STATUSES,
} from '../one-real-tag-operation-final-report.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const PACKET_ONLY_LEDGER = {
  ledger_valid: true,
  ledger_id:    'ledger-packet-001',
  events: [
    { event_type: 'ONE_TAG_EXEC_PACKET_READY', index: 0, event_hash: 'h0', prev_hash: 'genesis', ref_id: 'p0', event_id: 'e0' },
  ],
  deploy_performed: false, stable_promoted: false, release_performed: false,
};

const DRY_RUN_LEDGER = {
  ledger_valid: true,
  ledger_id:    'ledger-dry-001',
  events: [
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',          index: 0, event_hash: 'h0', prev_hash: 'genesis', ref_id: 'p0', event_id: 'e0' },
    { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED',  index: 1, event_hash: 'h1', prev_hash: 'h0',      ref_id: 'v0', event_id: 'e1' },
  ],
  deploy_performed: false, stable_promoted: false, release_performed: false,
};

const REAL_TAG_LEDGER = {
  ledger_valid: true,
  ledger_id:    'ledger-real-001',
  events: [
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',           index: 0, event_hash: 'r0', prev_hash: 'genesis', ref_id: 'p0', event_id: 'e0' },
    { event_type: 'ONE_TAG_RECEIPT_REAL_TAG_CONFIRMED',  index: 1, event_hash: 'r1', prev_hash: 'r0',      ref_id: 'v0', event_id: 'e1' },
  ],
  deploy_performed: false, stable_promoted: false, release_performed: false,
};

const GOOD_GATE = {
  rollback_ready:        true,
  rollback_readiness_id: 'gate-001',
  rollback_status:       'ROLLBACK_READINESS_DRY_RUN_READY',
  target_tag:            'v6.0.0',
  git_head:              'abcdef123',
  rollback_executed:     false,
  deploy_performed:      false,
  stable_promoted:       false,
  release_performed:     false,
};

console.log('\n=== one-real-tag-operation-final-report tests ===\n');

// missing ledger
console.log('--- missing ledger ---');
{
  const r = buildOneRealTagOperationFinalReport({ ledger: null, rollback_gate: GOOD_GATE });
  assert(r.report_status === 'ONE_TAG_REPORT_BLOCKED_LEDGER', 'null ledger → BLOCKED_LEDGER');
  assert(r.report_ready === false, 'report_ready false');
}

// ledger not valid
console.log('--- ledger not valid ---');
{
  const r = buildOneRealTagOperationFinalReport({
    ledger: { ledger_valid: false }, rollback_gate: GOOD_GATE,
  });
  assert(r.report_status === 'ONE_TAG_REPORT_BLOCKED_LEDGER', 'invalid ledger → BLOCKED_LEDGER');
}

// missing rollback gate
console.log('--- missing rollback gate ---');
{
  const r = buildOneRealTagOperationFinalReport({ ledger: DRY_RUN_LEDGER, rollback_gate: null });
  assert(r.report_status === 'ONE_TAG_REPORT_BLOCKED_ROLLBACK', 'null gate → BLOCKED_ROLLBACK');
}

// rollback gate not ready
console.log('--- rollback gate not ready ---');
{
  const r = buildOneRealTagOperationFinalReport({
    ledger: DRY_RUN_LEDGER,
    rollback_gate: { rollback_ready: false },
  });
  assert(r.report_status === 'ONE_TAG_REPORT_BLOCKED_ROLLBACK', 'not-ready gate → BLOCKED_ROLLBACK');
}

// command ready report
console.log('--- command ready report ---');
{
  const r = buildOneRealTagOperationFinalReport({ ledger: PACKET_ONLY_LEDGER, rollback_gate: GOOD_GATE });
  assert(r.report_status === 'ONE_TAG_REPORT_COMMAND_READY', 'packet-only → COMMAND_READY');
  assert(r.report_ready === true, 'report_ready true');
  assert(r.tag_created === false, 'tag_created false');
  assert(r.stable_review_allowed === false, 'stable_review_allowed false for command-ready');
}

// dry-run report
console.log('--- dry-run report ---');
{
  const r = buildOneRealTagOperationFinalReport({ ledger: DRY_RUN_LEDGER, rollback_gate: GOOD_GATE });
  assert(r.report_status === 'ONE_TAG_REPORT_DRY_RUN_CONFIRMED', 'dry-run → DRY_RUN_CONFIRMED');
  assert(r.report_ready === true, 'report_ready true');
  assert(r.tag_created === false, 'tag_created false');
  assert(r.stable_review_allowed === false, 'stable_review_allowed false for dry-run');
  assert(r.stable_promoted === false, 'stable_promoted false');
  assert(r.deploy_performed === false, 'deploy_performed false');
  assert(r.release_performed === false, 'release_performed false');
  assert(r.schema_version === 'v109.0', 'schema version');
}

// real tag confirmed report with mock data
console.log('--- real tag confirmed report with mock data ---');
{
  const realGate = { ...GOOD_GATE, rollback_status: 'ROLLBACK_READINESS_REAL_TAG_READY', rollback_required: true };
  const r = buildOneRealTagOperationFinalReport({ ledger: REAL_TAG_LEDGER, rollback_gate: realGate });
  assert(r.report_status === 'ONE_TAG_REPORT_REAL_TAG_CONFIRMED', 'real-tag → REAL_TAG_CONFIRMED');
  assert(r.tag_created === true, 'tag_created true for mock');
  assert(r.actual_real_tag_created === true, 'actual_real_tag_created true for mock');
  assert(r.stable_review_allowed === true, 'stable_review_allowed true after real tag confirmed');
  assert(r.stable_promoted === false, 'stable_promoted STILL false');
  assert(r.deploy_performed === false, 'deploy forced false');
  assert(r.release_performed === false, 'release forced false');
}

// rollback ready
console.log('--- rollback ready ---');
{
  const r = buildOneRealTagOperationFinalReport({ ledger: DRY_RUN_LEDGER, rollback_gate: GOOD_GATE });
  assert(r.rollback_ready === true, 'rollback_ready inherited');
  assert(r.rollback_executed === false, 'rollback_executed false');
}

// stable_review_allowed only after real tag confirmed
console.log('--- stable_review_allowed only after real tag confirmed ---');
{
  const r1 = buildOneRealTagOperationFinalReport({ ledger: PACKET_ONLY_LEDGER, rollback_gate: GOOD_GATE });
  assert(r1.stable_review_allowed === false, 'command-ready: stable_review_allowed false');

  const r2 = buildOneRealTagOperationFinalReport({ ledger: DRY_RUN_LEDGER, rollback_gate: GOOD_GATE });
  assert(r2.stable_review_allowed === false, 'dry-run: stable_review_allowed false');

  const r3 = buildOneRealTagOperationFinalReport({ ledger: REAL_TAG_LEDGER, rollback_gate: GOOD_GATE });
  assert(r3.stable_review_allowed === true, 'real-tag-confirmed: stable_review_allowed true');
}

// safe_next_actions and blocked_actions
console.log('--- safe/blocked actions ---');
{
  const r = buildOneRealTagOperationFinalReport({ ledger: DRY_RUN_LEDGER, rollback_gate: GOOD_GATE });
  assert(Array.isArray(r.safe_next_actions), 'safe_next_actions is array');
  assert(Array.isArray(r.blocked_actions), 'blocked_actions is array');
  assert(r.blocked_actions.includes('deploy'), 'deploy blocked');
  assert(r.blocked_actions.includes('stable_promotion'), 'stable_promotion blocked');
  assert(r.blocked_actions.includes('release'), 'release blocked');
}

// validate
console.log('--- validate ---');
{
  const r = buildOneRealTagOperationFinalReport({ ledger: DRY_RUN_LEDGER, rollback_gate: GOOD_GATE });
  const v = validateOneRealTagOperationFinalReport(r);
  assert(v.valid === true, 'validate dry-run report');
  assert(v.errors.length === 0, 'no errors');
}

// render
console.log('--- render ---');
{
  const r = buildOneRealTagOperationFinalReport({ ledger: DRY_RUN_LEDGER, rollback_gate: GOOD_GATE });
  const txt = renderOneRealTagOperationFinalReport(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('DRY_RUN_CONFIRMED'), 'render includes status');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(FINAL_REPORT_STATUSES.includes('ONE_TAG_REPORT_DRY_RUN_CONFIRMED'), 'dry-run in exports');
  assert(FINAL_REPORT_STATUSES.includes('ONE_TAG_REPORT_REAL_TAG_CONFIRMED'), 'real-tag in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
