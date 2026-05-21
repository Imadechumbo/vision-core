#!/usr/bin/env node
/**
 * Tests — Real Local Patch Apply Proof V167.1
 */

import {
  buildRealLocalPatchApplyProof,
  validateRealLocalPatchApplyProof,
  renderRealLocalPatchApplyProof,
  REAL_LOCAL_PATCH_APPLY_PROOF_STATUSES,
} from '../real-local-patch-apply-proof.mjs';

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
  patch_proof_id: 'patch-proof-v1671-001',
  sandbox_id: 'sandbox-v167-001',
  sandbox_status: 'SANDBOX_READY',
  sandbox_hash: 'sandbox-hash-001',
  patch_target: 'tools/sandbox-module.mjs',
  patch_type: 'config',
  pre_patch_hash: 'pre-hash-001',
  post_patch_hash: 'post-hash-002',
  patch_description: 'Update log level',
  local_only: true,
  production_touched: false,
};

console.log('\n=== real-local-patch-apply-proof tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_LOCAL_PATCH_APPLY_PROOF_STATUSES));
assert('has PATCH_PROOF_CAPTURED', REAL_LOCAL_PATCH_APPLY_PROOF_STATUSES.includes('PATCH_PROOF_CAPTURED'));
assert('has PATCH_PROOF_FAIL', REAL_LOCAL_PATCH_APPLY_PROOF_STATUSES.includes('PATCH_PROOF_FAIL'));
assert('has PATCH_PROOF_BLOCKED_INPUT', REAL_LOCAL_PATCH_APPLY_PROOF_STATUSES.includes('PATCH_PROOF_BLOCKED_INPUT'));
assert('has PATCH_PROOF_BLOCKED_SANDBOX', REAL_LOCAL_PATCH_APPLY_PROOF_STATUSES.includes('PATCH_PROOF_BLOCKED_SANDBOX'));
assert('has PATCH_PROOF_BLOCKED_PRODUCTION', REAL_LOCAL_PATCH_APPLY_PROOF_STATUSES.includes('PATCH_PROOF_BLOCKED_PRODUCTION'));
assert('build is function', typeof buildRealLocalPatchApplyProof === 'function');
assert('validate is function', typeof validateRealLocalPatchApplyProof === 'function');
assert('render is function', typeof renderRealLocalPatchApplyProof === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealLocalPatchApplyProof(null);
  assert('null → BLOCKED_INPUT', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
  assert('null: is_real_execution=false', r.is_real_execution === false);
}
{
  const r = buildRealLocalPatchApplyProof({});
  assert('empty → BLOCKED_INPUT', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchApplyProof({ patch_proof_id: '  ' });
  assert('blank proof_id → BLOCKED_INPUT', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, sandbox_id: '' });
  assert('missing sandbox_id → BLOCKED_INPUT', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, patch_target: null });
  assert('null patch_target → BLOCKED_INPUT', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, pre_patch_hash: '' });
  assert('missing pre_patch_hash → BLOCKED_INPUT', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, post_patch_hash: '' });
  assert('missing post_patch_hash → BLOCKED_INPUT', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_INPUT');
}

// --- blocked sandbox ---
console.log('--- blocked sandbox ---');
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, sandbox_status: 'SANDBOX_FAIL' });
  assert('sandbox FAIL → BLOCKED_SANDBOX', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_SANDBOX');
  assert('sandbox blocked: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, sandbox_status: undefined });
  assert('sandbox undefined → BLOCKED_SANDBOX', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_SANDBOX');
}
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, sandbox_hash: '' });
  assert('missing sandbox_hash → BLOCKED_SANDBOX', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_SANDBOX');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_PRODUCTION');
}
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.patch_proof_status === 'PATCH_PROOF_BLOCKED_PRODUCTION');
}

// --- patch fail ---
console.log('--- patch fail ---');
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, pre_patch_hash: 'same-hash', post_patch_hash: 'same-hash' });
  assert('identical hashes → PATCH_PROOF_FAIL', r.patch_proof_status === 'PATCH_PROOF_FAIL');
  assert('fail: patch_proof_captured=false', r.patch_proof_captured === false);
  assert('fail: production_touched=false', r.production_touched === false);
}

// --- captured ---
console.log('--- captured ---');
{
  const r = buildRealLocalPatchApplyProof(VALID_INPUT);
  assert('valid input → PATCH_PROOF_CAPTURED', r.patch_proof_status === 'PATCH_PROOF_CAPTURED');
  assert('captured: patch_proof_captured=true', r.patch_proof_captured === true);
  assert('captured: local_only=true', r.local_only === true);
  assert('captured: production_touched=false', r.production_touched === false);
  assert('captured: deploy_performed=false', r.deploy_performed === false);
  assert('captured: stable_promoted=false', r.stable_promoted === false);
  assert('captured: release_performed=false', r.release_performed === false);
  assert('captured: is_real_execution=false', r.is_real_execution === false);
  assert('captured: schema_version=v167.1', r.schema_version === 'v167.1');
  assert('captured: patch_proof_id set', r.patch_proof_id === 'patch-proof-v1671-001');
  assert('captured: sandbox_id set', r.sandbox_id === 'sandbox-v167-001');
  assert('captured: sandbox_hash set', r.sandbox_hash === 'sandbox-hash-001');
  assert('captured: patch_target set', r.patch_target === 'tools/sandbox-module.mjs');
  assert('captured: patch_type set', r.patch_type === 'config');
  assert('captured: pre_patch_hash set', r.pre_patch_hash === 'pre-hash-001');
  assert('captured: post_patch_hash set', r.post_patch_hash === 'post-hash-002');
  assert('captured: patch_description set', r.patch_description === 'Update log level');
  assert('captured: patch_proof_hash is string', typeof r.patch_proof_hash === 'string' && r.patch_proof_hash.length > 0);
  assert('captured: blocked_reason null', r.blocked_reason === null);
}
{
  const r = buildRealLocalPatchApplyProof({ ...VALID_INPUT, patch_description: undefined });
  assert('no description still CAPTURED', r.patch_proof_status === 'PATCH_PROOF_CAPTURED');
  assert('no description: patch_description null', r.patch_description === null);
}
{
  const r1 = buildRealLocalPatchApplyProof(VALID_INPUT);
  const r2 = buildRealLocalPatchApplyProof(VALID_INPUT);
  assert('deterministic hash', r1.patch_proof_hash === r2.patch_proof_hash);
}
{
  const r1 = buildRealLocalPatchApplyProof(VALID_INPUT);
  const r2 = buildRealLocalPatchApplyProof({ ...VALID_INPUT, post_patch_hash: 'post-hash-999' });
  assert('different post_hash → different proof hash', r1.patch_proof_hash !== r2.patch_proof_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealLocalPatchApplyProof(VALID_INPUT);
  const v = validateRealLocalPatchApplyProof(r);
  assert('validate captured: valid=true', v.valid === true);
  assert('validate captured: no errors', v.errors.length === 0);
}
{
  const r = buildRealLocalPatchApplyProof(null);
  const v = validateRealLocalPatchApplyProof(r);
  assert('validate blocked: invariants hold', v.valid === true);
}
{
  const v = validateRealLocalPatchApplyProof(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealLocalPatchApplyProof(VALID_INPUT);
  const s = renderRealLocalPatchApplyProof(r);
  assert('render captured: is string', typeof s === 'string');
  assert('render captured: contains PATCH_PROOF_CAPTURED', s.includes('PATCH_PROOF_CAPTURED'));
  assert('render captured: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render captured: contains REAL_LOCAL_PATCH_APPLY_PROOF_CAPTURED=true', s.includes('REAL_LOCAL_PATCH_APPLY_PROOF_CAPTURED=true'));
}
{
  const s = renderRealLocalPatchApplyProof(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealLocalPatchApplyProof(null),
    buildRealLocalPatchApplyProof({}),
    buildRealLocalPatchApplyProof(VALID_INPUT),
    buildRealLocalPatchApplyProof({ ...VALID_INPUT, local_only: false }),
    buildRealLocalPatchApplyProof({ ...VALID_INPUT, production_touched: true }),
    buildRealLocalPatchApplyProof({ ...VALID_INPUT, sandbox_status: 'SANDBOX_FAIL' }),
    buildRealLocalPatchApplyProof({ ...VALID_INPUT, pre_patch_hash: 'same', post_patch_hash: 'same' }),
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
