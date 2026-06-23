#!/usr/bin/env node
/**
 * Tests — Stable Execution Receipt Import V126.0
 */

import {
  importStableExecutionReceipt,
  validateStableExecutionReceiptImport,
  renderStableExecutionReceiptImport,
  RECEIPT_IMPORT_STATUSES,
  REQUIRED_RECEIPT_FIELDS,
} from '../stable-execution-receipt-import.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_BASELINE = {
  stable_governance_baseline_ready: true,
  baseline_id: 'baseline-001',
  baseline_status: 'GOVERNANCE_BASELINE_READY',
};

const GOOD_RECEIPT = {
  execution_receipt_id: 'exec-receipt-001',
  executed_by:          'human-operator',
  target_stable_ref:    'stable',
  target_tag:           'v126.0-test',
  executed_at:          '2026-05-20T12:00:00Z',
};

console.log('\n=== stable-execution-receipt-import tests ===\n');

console.log('--- null baseline ---');
{
  const r = importStableExecutionReceipt({ execution_receipt: GOOD_RECEIPT });
  assert(r.import_status === 'RECEIPT_IMPORT_BLOCKED_GOVERNANCE', 'null baseline → BLOCKED_GOVERNANCE');
  assert(r.import_ready === false, 'import_ready false');
}

console.log('--- baseline not ready ---');
{
  const r = importStableExecutionReceipt({
    stable_promotion_governance_baseline: { stable_governance_baseline_ready: false, baseline_id: 'x' },
    execution_receipt: GOOD_RECEIPT,
  });
  assert(r.import_status === 'RECEIPT_IMPORT_BLOCKED_GOVERNANCE', 'not-ready baseline → BLOCKED_GOVERNANCE');
}

console.log('--- null receipt ---');
{
  const r = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(r.import_status === 'RECEIPT_IMPORT_BLOCKED_MISSING', 'null receipt → BLOCKED_MISSING');
  assert(r.import_ready === false, 'import_ready false');
}

console.log('--- non-object receipt ---');
{
  const r = importStableExecutionReceipt({
    stable_promotion_governance_baseline: GOOD_BASELINE,
    execution_receipt: 'string-receipt',
  });
  assert(r.import_status === 'RECEIPT_IMPORT_BLOCKED_MISSING', 'string receipt → BLOCKED_MISSING');
}

console.log('--- missing required fields ---');
{
  const r = importStableExecutionReceipt({
    stable_promotion_governance_baseline: GOOD_BASELINE,
    execution_receipt: { execution_receipt_id: 'x' },
  });
  assert(r.import_status === 'RECEIPT_IMPORT_BLOCKED_INVALID', 'missing fields → BLOCKED_INVALID');
  assert(Array.isArray(r.missing_fields), 'missing_fields array');
  assert(r.missing_fields.includes('executed_by'), 'executed_by missing');
  assert(r.missing_fields.includes('target_stable_ref'), 'target_stable_ref missing');
  assert(r.missing_fields.includes('target_tag'), 'target_tag missing');
}

console.log('--- import ready ---');
{
  const r = importStableExecutionReceipt({
    stable_promotion_governance_baseline: GOOD_BASELINE,
    execution_receipt: GOOD_RECEIPT,
  });
  assert(r.import_status === 'RECEIPT_IMPORT_READY', 'ready status');
  assert(r.import_ready === true, 'import_ready true');
  assert(typeof r.import_id === 'string' && r.import_id.length === 64, 'import_id sha256');
  assert(r.schema_version === 'v126.0', 'schema version');
  assert(r.governance_baseline_id === 'baseline-001', 'governance_baseline_id');
  assert(r.execution_receipt_id === 'exec-receipt-001', 'execution_receipt_id');
  assert(r.executed_by === 'human-operator', 'executed_by');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref');
  assert(r.target_tag === 'v126.0-test', 'target_tag');
  assert(r.executed_at === '2026-05-20T12:00:00Z', 'executed_at');
  assert(typeof r.raw_receipt === 'object', 'raw_receipt object');
}

console.log('--- receipt without executed_at ---');
{
  const noAt = { ...GOOD_RECEIPT };
  delete noAt.executed_at;
  const r = importStableExecutionReceipt({
    stable_promotion_governance_baseline: GOOD_BASELINE,
    execution_receipt: noAt,
  });
  assert(r.import_ready === true, 'still ready without executed_at');
  assert(r.executed_at === null, 'executed_at null');
}

console.log('--- REGRA ABSOLUTA: system_execution_performed=false ---');
{
  const r1 = importStableExecutionReceipt({});
  assert(r1.system_execution_performed === false, 'blocked: false');
  const r2 = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  assert(r2.system_execution_performed === false, 'ready: false');
}

console.log('--- REGRA ABSOLUTA: automated_promotion_performed=false ---');
{
  const r = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  assert(r.automated_promotion_performed === false, 'automated_promotion_performed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promotion_allowed=false ---');
{
  const r = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  assert(r.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promoted=false ---');
{
  const r = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- REGRA ABSOLUTA: git_push_performed=false ---');
{
  const r = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  assert(r.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- REGRA ABSOLUTA: deploy_performed=false ---');
{
  const r = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- REGRA ABSOLUTA: release_performed=false ---');
{
  const r = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  assert(r.release_performed === false, 'release_performed=false');
}

console.log('--- human_executed=true ---');
{
  const r1 = importStableExecutionReceipt({});
  assert(r1.human_executed === true, 'blocked: true');
  const r2 = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  assert(r2.human_executed === true, 'ready: true');
}

console.log('--- receipt_is_human_provided=true ---');
{
  const r = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  assert(r.receipt_is_human_provided === true, 'receipt_is_human_provided=true');
}

console.log('--- validate ---');
{
  const r = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  const v = validateStableExecutionReceiptImport(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStableExecutionReceiptImport(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = importStableExecutionReceipt({ stable_promotion_governance_baseline: GOOD_BASELINE, execution_receipt: GOOD_RECEIPT });
  const txt = renderStableExecutionReceiptImport(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE EXECUTION RECEIPT IMPORT V126.0'), 'render title');
  assert(txt.includes('RECEIPT_IMPORT_READY'), 'status in output');
  assert(txt.includes('system_execution_performed:'), 'invariant in output');
  assert(txt.includes('human_executed:'), 'human_executed in output');
}

console.log('--- render blocked ---');
{
  const r = importStableExecutionReceipt({});
  const txt = renderStableExecutionReceiptImport(r);
  assert(txt.includes('RECEIPT IMPORT BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(RECEIPT_IMPORT_STATUSES.includes('RECEIPT_IMPORT_READY'), 'ready in statuses');
  assert(RECEIPT_IMPORT_STATUSES.includes('RECEIPT_IMPORT_BLOCKED_GOVERNANCE'), 'governance blocked in statuses');
  assert(RECEIPT_IMPORT_STATUSES.includes('RECEIPT_IMPORT_BLOCKED_MISSING'), 'missing blocked in statuses');
  assert(RECEIPT_IMPORT_STATUSES.includes('RECEIPT_IMPORT_BLOCKED_INVALID'), 'invalid blocked in statuses');
}

console.log('--- required fields export ---');
{
  assert(REQUIRED_RECEIPT_FIELDS.includes('execution_receipt_id'), 'execution_receipt_id');
  assert(REQUIRED_RECEIPT_FIELDS.includes('executed_by'), 'executed_by');
  assert(REQUIRED_RECEIPT_FIELDS.includes('target_stable_ref'), 'target_stable_ref');
  assert(REQUIRED_RECEIPT_FIELDS.includes('target_tag'), 'target_tag');
  assert(REQUIRED_RECEIPT_FIELDS.length === 4, 'exactly 4 required fields');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
