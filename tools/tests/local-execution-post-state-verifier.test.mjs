#!/usr/bin/env node
/**
 * Tests — Local Execution Post-State Verifier V164.0
 */

import {
  buildLocalExecutionPostStateVerifier,
  validateLocalExecutionPostStateVerifier,
  renderLocalExecutionPostStateVerifier,
  LOCAL_EXECUTION_POST_STATE_STATUSES,
} from '../local-execution-post-state-verifier.mjs';

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

const VALID_INPUT = {
  post_state_id: 'post-state-001',
  receipt_id: 'receipt-v1621-001',
  ledger_id: 'ledger-v163-001',
  expected_after_hash: 'after-hash-001',
  actual_after_hash: 'after-hash-001',
  changed_files: ['tools/sandbox-module.mjs'],
  local_only: true,
  production_touched: false,
};

console.log('\n=== local-execution-post-state-verifier tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(LOCAL_EXECUTION_POST_STATE_STATUSES));
assert('has VERIFIED', LOCAL_EXECUTION_POST_STATE_STATUSES.includes('LOCAL_POST_STATE_VERIFIED'));
assert('has MISMATCH', LOCAL_EXECUTION_POST_STATE_STATUSES.includes('LOCAL_POST_STATE_MISMATCH'));
assert('has BLOCKED_INPUT', LOCAL_EXECUTION_POST_STATE_STATUSES.includes('LOCAL_POST_STATE_BLOCKED_INPUT'));
assert('has BLOCKED_RECEIPT', LOCAL_EXECUTION_POST_STATE_STATUSES.includes('LOCAL_POST_STATE_BLOCKED_RECEIPT'));
assert('has BLOCKED_FORBIDDEN_FILE', LOCAL_EXECUTION_POST_STATE_STATUSES.includes('LOCAL_POST_STATE_BLOCKED_FORBIDDEN_FILE'));
assert('has BLOCKED_PRODUCTION', LOCAL_EXECUTION_POST_STATE_STATUSES.includes('LOCAL_POST_STATE_BLOCKED_PRODUCTION'));
assert('build is function', typeof buildLocalExecutionPostStateVerifier === 'function');
assert('validate is function', typeof validateLocalExecutionPostStateVerifier === 'function');
assert('render is function', typeof renderLocalExecutionPostStateVerifier === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildLocalExecutionPostStateVerifier(null);
  assert('null → BLOCKED_INPUT', r.post_state_status === 'LOCAL_POST_STATE_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
}
{
  const r = buildLocalExecutionPostStateVerifier({});
  assert('empty → BLOCKED_INPUT', r.post_state_status === 'LOCAL_POST_STATE_BLOCKED_INPUT');
}
{
  const r = buildLocalExecutionPostStateVerifier({ post_state_id: '  ' });
  assert('blank id → BLOCKED_INPUT', r.post_state_status === 'LOCAL_POST_STATE_BLOCKED_INPUT');
}
{
  const r = buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, expected_after_hash: null });
  assert('null expected_hash → BLOCKED_INPUT', r.post_state_status === 'LOCAL_POST_STATE_BLOCKED_INPUT');
}

// --- blocked receipt ---
console.log('--- blocked receipt ---');
{
  const r = buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, receipt_id: '' });
  assert('missing receipt_id → BLOCKED_RECEIPT', r.post_state_status === 'LOCAL_POST_STATE_BLOCKED_RECEIPT');
}

// --- blocked forbidden file ---
console.log('--- blocked forbidden file ---');
{
  const r = buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, changed_files: ['tools/ok.mjs', '.env'] });
  assert('.env → BLOCKED_FORBIDDEN_FILE', r.post_state_status === 'LOCAL_POST_STATE_BLOCKED_FORBIDDEN_FILE');
  assert('forbidden: detected populated', Array.isArray(r.forbidden_files_detected) && r.forbidden_files_detected.length > 0);
  assert('forbidden: production_touched=false', r.production_touched === false);
}
{
  const r = buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, changed_files: ['deploy.sh'] });
  assert('deploy.sh → BLOCKED_FORBIDDEN_FILE', r.post_state_status === 'LOCAL_POST_STATE_BLOCKED_FORBIDDEN_FILE');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.post_state_status === 'LOCAL_POST_STATE_BLOCKED_PRODUCTION');
  assert('production: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.post_state_status === 'LOCAL_POST_STATE_BLOCKED_PRODUCTION');
}

// --- verified ---
console.log('--- verified ---');
{
  const r = buildLocalExecutionPostStateVerifier(VALID_INPUT);
  assert('matching hashes → VERIFIED', r.post_state_status === 'LOCAL_POST_STATE_VERIFIED');
  assert('verified: post_state_verified=true', r.post_state_verified === true);
  assert('verified: local_only=true', r.local_only === true);
  assert('verified: production_touched=false', r.production_touched === false);
  assert('verified: deploy_performed=false', r.deploy_performed === false);
  assert('verified: stable_promoted=false', r.stable_promoted === false);
  assert('verified: release_performed=false', r.release_performed === false);
  assert('verified: schema_version=v164.0', r.schema_version === 'v164.0');
  assert('verified: post_state_id set', r.post_state_id === 'post-state-001');
  assert('verified: receipt_id set', r.receipt_id === 'receipt-v1621-001');
  assert('verified: changed_files is array', Array.isArray(r.changed_files));
  assert('verified: forbidden_files_detected empty', r.forbidden_files_detected.length === 0);
}

// --- mismatch ---
console.log('--- mismatch ---');
{
  const r = buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, actual_after_hash: 'different-hash-999' });
  assert('mismatch hashes → MISMATCH', r.post_state_status === 'LOCAL_POST_STATE_MISMATCH');
  assert('mismatch: post_state_verified=false', r.post_state_verified === false);
  assert('mismatch: production_touched=false', r.production_touched === false);
  assert('mismatch: blocked_reason set', typeof r.blocked_reason === 'string');
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildLocalExecutionPostStateVerifier(VALID_INPUT);
  const v = validateLocalExecutionPostStateVerifier(r);
  assert('validate verified: valid=true', v.valid === true);
  assert('validate verified: no errors', v.errors.length === 0);
}
{
  const r = buildLocalExecutionPostStateVerifier(null);
  const v = validateLocalExecutionPostStateVerifier(r);
  assert('validate blocked: invariants hold', v.valid === true);
}
{
  const v = validateLocalExecutionPostStateVerifier(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildLocalExecutionPostStateVerifier(VALID_INPUT);
  const s = renderLocalExecutionPostStateVerifier(r);
  assert('render verified: is string', typeof s === 'string');
  assert('render verified: contains VERIFIED', s.includes('VERIFIED'));
  assert('render verified: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderLocalExecutionPostStateVerifier(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildLocalExecutionPostStateVerifier(null),
    buildLocalExecutionPostStateVerifier({}),
    buildLocalExecutionPostStateVerifier(VALID_INPUT),
    buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, actual_after_hash: 'different' }),
    buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, local_only: false }),
    buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, production_touched: true }),
    buildLocalExecutionPostStateVerifier({ ...VALID_INPUT, changed_files: ['.env'] }),
  ];
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: local_only=true', cases.every(r => r.local_only === true));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
