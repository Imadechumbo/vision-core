#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Ledger V175.1
 */

import {
  buildRealRepoPatchLedger,
  REAL_REPO_PATCH_LEDGER_STATUSES,
} from '../real-repo-patch-ledger.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const REQUIRED_EVENTS = [
  'REPO_PATCH_SCOPE_READY',
  'REPO_PATCH_PRE_STATE_READY',
  'REPO_PATCH_APPLY_READY',
  'REPO_PATCH_PHYSICAL_APPLIED',
  'REPO_PATCH_DIFF_BOUND',
  'REPO_PATCH_TEST_LANE_PASS',
  'REPO_PATCH_ROLLBACK_PLAN_READY',
  'REPO_PATCH_ROLLBACK_DRILL_PASS',
  'REPO_PATCH_RECEIPT_READY',
];

console.log('\n=== real-repo-patch-ledger tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_LEDGER_STATUSES));
assert('has EMPTY', REAL_REPO_PATCH_LEDGER_STATUSES.includes('REPO_PATCH_LEDGER_EMPTY'));
assert('has READY', REAL_REPO_PATCH_LEDGER_STATUSES.includes('REPO_PATCH_LEDGER_READY'));
assert('has TAMPERED', REAL_REPO_PATCH_LEDGER_STATUSES.includes('REPO_PATCH_LEDGER_TAMPERED'));
assert('has BLOCKED_EVENT', REAL_REPO_PATCH_LEDGER_STATUSES.includes('REPO_PATCH_LEDGER_BLOCKED_EVENT'));
assert('build is function', typeof buildRealRepoPatchLedger === 'function');

// --- empty (missing events) ---
console.log('--- empty ---');
{
  const r = buildRealRepoPatchLedger([]);
  assert('empty array → EMPTY', r.status === 'REPO_PATCH_LEDGER_EMPTY');
  assert('empty: ledger_ready=false', r.ledger_ready === false);
  assert('empty: all_events_present=false', r.all_events_present === false);
  assert('empty: production_touched=false', r.production_touched === false);
  assert('empty: deploy_performed=false', r.deploy_performed === false);
  assert('empty: stable_promoted=false', r.stable_promoted === false);
  assert('empty: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchLedger(['REPO_PATCH_SCOPE_READY']);
  assert('partial events → EMPTY', r.status === 'REPO_PATCH_LEDGER_EMPTY');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchLedger(REQUIRED_EVENTS);
  assert('all required events → READY', r.status === 'REPO_PATCH_LEDGER_READY');
  assert('ready: ledger_ready=true', r.ledger_ready === true);
  assert('ready: all_events_present=true', r.all_events_present === true);
  assert('ready: schema_version=v175.1', r.schema_version === 'v175.1');
  assert('ready: required_events count=9', r.required_events.length === 9);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}
{
  const extra = [...REQUIRED_EVENTS, 'EXTRA_EVENT'];
  const r = buildRealRepoPatchLedger(extra);
  assert('required + extra events → READY', r.status === 'REPO_PATCH_LEDGER_READY');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchLedger([]),
    buildRealRepoPatchLedger(['REPO_PATCH_SCOPE_READY']),
    buildRealRepoPatchLedger(REQUIRED_EVENTS),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
