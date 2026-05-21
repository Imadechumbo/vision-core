#!/usr/bin/env node
/**
 * Tests — Real Local Patch Sandbox V167.0
 */

import {
  buildRealLocalPatchSandbox,
  validateRealLocalPatchSandbox,
  renderRealLocalPatchSandbox,
  REAL_LOCAL_PATCH_SANDBOX_STATUSES,
} from '../real-local-patch-sandbox.mjs';

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
  sandbox_id: 'sandbox-v167-001',
  chain_baseline_id: 'baseline-v166-001',
  chain_baseline_status: 'LOCAL_EXECUTION_CHAIN_BASELINE_READY',
  patch_target: 'tools/sandbox-module.mjs',
  patch_type: 'config',
  pre_patch_hash: 'pre-hash-001',
  isolation_level: 'strict',
  local_only: true,
  production_touched: false,
};

console.log('\n=== real-local-patch-sandbox tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_LOCAL_PATCH_SANDBOX_STATUSES));
assert('has SANDBOX_READY', REAL_LOCAL_PATCH_SANDBOX_STATUSES.includes('SANDBOX_READY'));
assert('has SANDBOX_FAIL', REAL_LOCAL_PATCH_SANDBOX_STATUSES.includes('SANDBOX_FAIL'));
assert('has SANDBOX_BLOCKED_INPUT', REAL_LOCAL_PATCH_SANDBOX_STATUSES.includes('SANDBOX_BLOCKED_INPUT'));
assert('has SANDBOX_BLOCKED_CHAIN', REAL_LOCAL_PATCH_SANDBOX_STATUSES.includes('SANDBOX_BLOCKED_CHAIN'));
assert('has SANDBOX_BLOCKED_PRODUCTION', REAL_LOCAL_PATCH_SANDBOX_STATUSES.includes('SANDBOX_BLOCKED_PRODUCTION'));
assert('build is function', typeof buildRealLocalPatchSandbox === 'function');
assert('validate is function', typeof validateRealLocalPatchSandbox === 'function');
assert('render is function', typeof renderRealLocalPatchSandbox === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealLocalPatchSandbox(null);
  assert('null → BLOCKED_INPUT', r.sandbox_status === 'SANDBOX_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
  assert('null: is_real_execution=false', r.is_real_execution === false);
}
{
  const r = buildRealLocalPatchSandbox({});
  assert('empty → BLOCKED_INPUT', r.sandbox_status === 'SANDBOX_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchSandbox({ sandbox_id: '  ' });
  assert('blank sandbox_id → BLOCKED_INPUT', r.sandbox_status === 'SANDBOX_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchSandbox({ ...VALID_INPUT, chain_baseline_id: '' });
  assert('missing chain_baseline_id → BLOCKED_INPUT', r.sandbox_status === 'SANDBOX_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchSandbox({ ...VALID_INPUT, patch_target: null });
  assert('null patch_target → BLOCKED_INPUT', r.sandbox_status === 'SANDBOX_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchSandbox({ ...VALID_INPUT, patch_type: 'deploy' });
  assert('invalid patch_type → BLOCKED_INPUT', r.sandbox_status === 'SANDBOX_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchSandbox({ ...VALID_INPUT, pre_patch_hash: '' });
  assert('missing pre_patch_hash → BLOCKED_INPUT', r.sandbox_status === 'SANDBOX_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchSandbox({ ...VALID_INPUT, isolation_level: 'none' });
  assert('invalid isolation_level → BLOCKED_INPUT', r.sandbox_status === 'SANDBOX_BLOCKED_INPUT');
}

// --- blocked chain ---
console.log('--- blocked chain ---');
{
  const r = buildRealLocalPatchSandbox({ ...VALID_INPUT, chain_baseline_status: 'LOCAL_EXECUTION_CHAIN_BASELINE_FAIL' });
  assert('chain FAIL → BLOCKED_CHAIN', r.sandbox_status === 'SANDBOX_BLOCKED_CHAIN');
  assert('chain blocked: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealLocalPatchSandbox({ ...VALID_INPUT, chain_baseline_status: undefined });
  assert('chain undefined → BLOCKED_CHAIN', r.sandbox_status === 'SANDBOX_BLOCKED_CHAIN');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildRealLocalPatchSandbox({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.sandbox_status === 'SANDBOX_BLOCKED_PRODUCTION');
  assert('production blocked: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildRealLocalPatchSandbox({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.sandbox_status === 'SANDBOX_BLOCKED_PRODUCTION');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealLocalPatchSandbox(VALID_INPUT);
  assert('valid input → SANDBOX_READY', r.sandbox_status === 'SANDBOX_READY');
  assert('ready: sandbox_ready=true', r.sandbox_ready === true);
  assert('ready: local_only=true', r.local_only === true);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
  assert('ready: is_real_execution=false', r.is_real_execution === false);
  assert('ready: schema_version=v167.0', r.schema_version === 'v167.0');
  assert('ready: sandbox_id set', r.sandbox_id === 'sandbox-v167-001');
  assert('ready: chain_baseline_id set', r.chain_baseline_id === 'baseline-v166-001');
  assert('ready: patch_target set', r.patch_target === 'tools/sandbox-module.mjs');
  assert('ready: patch_type set', r.patch_type === 'config');
  assert('ready: isolation_level set', r.isolation_level === 'strict');
  assert('ready: pre_patch_hash set', r.pre_patch_hash === 'pre-hash-001');
  assert('ready: sandbox_hash is string', typeof r.sandbox_hash === 'string' && r.sandbox_hash.length > 0);
  assert('ready: blocked_reason null', r.blocked_reason === null);
}
{
  const r = buildRealLocalPatchSandbox({ ...VALID_INPUT, patch_type: 'code', isolation_level: 'standard' });
  assert('code/standard → SANDBOX_READY', r.sandbox_status === 'SANDBOX_READY');
  assert('isolation standard preserved', r.isolation_level === 'standard');
}
{
  const r1 = buildRealLocalPatchSandbox(VALID_INPUT);
  const r2 = buildRealLocalPatchSandbox(VALID_INPUT);
  assert('deterministic hash', r1.sandbox_hash === r2.sandbox_hash);
}
{
  const r1 = buildRealLocalPatchSandbox(VALID_INPUT);
  const r2 = buildRealLocalPatchSandbox({ ...VALID_INPUT, patch_target: 'tools/other.mjs' });
  assert('different target → different hash', r1.sandbox_hash !== r2.sandbox_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealLocalPatchSandbox(VALID_INPUT);
  const v = validateRealLocalPatchSandbox(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealLocalPatchSandbox(null);
  const v = validateRealLocalPatchSandbox(r);
  assert('validate blocked: invariants hold', v.valid === true);
}
{
  const v = validateRealLocalPatchSandbox(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealLocalPatchSandbox(VALID_INPUT);
  const s = renderRealLocalPatchSandbox(r);
  assert('render ready: is string', typeof s === 'string');
  assert('render ready: contains SANDBOX_READY', s.includes('SANDBOX_READY'));
  assert('render ready: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render ready: contains REAL_LOCAL_PATCH_SANDBOX_READY=true', s.includes('REAL_LOCAL_PATCH_SANDBOX_READY=true'));
}
{
  const s = renderRealLocalPatchSandbox(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealLocalPatchSandbox(null),
    buildRealLocalPatchSandbox({}),
    buildRealLocalPatchSandbox(VALID_INPUT),
    buildRealLocalPatchSandbox({ ...VALID_INPUT, local_only: false }),
    buildRealLocalPatchSandbox({ ...VALID_INPUT, production_touched: true }),
    buildRealLocalPatchSandbox({ ...VALID_INPUT, chain_baseline_status: 'LOCAL_EXECUTION_CHAIN_BASELINE_FAIL' }),
    buildRealLocalPatchSandbox({ ...VALID_INPUT, patch_type: 'deploy' }),
  ];
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: local_only=true', cases.every(r => r.local_only === true));
  assert('all: is_real_execution=false', cases.every(r => r.is_real_execution === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
