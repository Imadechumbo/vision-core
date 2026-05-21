#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Physical Apply Proof V172.1
 */

import {
  buildRealRepoPatchPhysicalApplyProof,
  REAL_REPO_PATCH_PHYSICAL_APPLY_STATUSES,
} from '../real-repo-patch-physical-apply-proof.mjs';

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

const ALLOWED_FILE = 'docs/real-repo-patch-drill-target.md';

const VALID_BASE = {
  physical_apply_proof_id: 'proof-001',
  apply_controller_id: 'ctrl-001',
  target_file: ALLOWED_FILE,
  apply_controller_ready: true,
  apply_command_confirmed: false,
};

console.log('\n=== real-repo-patch-physical-apply-proof tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_PHYSICAL_APPLY_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_PHYSICAL_APPLY_STATUSES.includes('REPO_PATCH_PHYSICAL_BLOCKED_INPUT'));
assert('has BLOCKED_SCOPE', REAL_REPO_PATCH_PHYSICAL_APPLY_STATUSES.includes('REPO_PATCH_PHYSICAL_BLOCKED_SCOPE'));
assert('has BLOCKED_COMMAND', REAL_REPO_PATCH_PHYSICAL_APPLY_STATUSES.includes('REPO_PATCH_PHYSICAL_BLOCKED_COMMAND'));
assert('has APPLIED', REAL_REPO_PATCH_PHYSICAL_APPLY_STATUSES.includes('REPO_PATCH_PHYSICAL_APPLIED'));
assert('has NOOP', REAL_REPO_PATCH_PHYSICAL_APPLY_STATUSES.includes('REPO_PATCH_PHYSICAL_NOOP'));
assert('build is function', typeof buildRealRepoPatchPhysicalApplyProof === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchPhysicalApplyProof({ apply_controller_id: 'ctrl', target_file: ALLOWED_FILE });
  assert('missing proof_id → BLOCKED_INPUT', r.status === 'REPO_PATCH_PHYSICAL_BLOCKED_INPUT');
  assert('blocked: production_touched=false', r.production_touched === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchPhysicalApplyProof({ physical_apply_proof_id: 'proof', target_file: ALLOWED_FILE });
  assert('missing apply_controller_id → BLOCKED_INPUT', r.status === 'REPO_PATCH_PHYSICAL_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPhysicalApplyProof({ physical_apply_proof_id: 'proof', apply_controller_id: 'ctrl', target_file: '.env' });
  assert('forbidden file → BLOCKED_INPUT', r.status === 'REPO_PATCH_PHYSICAL_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPhysicalApplyProof({ physical_apply_proof_id: 'proof', apply_controller_id: 'ctrl', target_file: 'src/index.js' });
  assert('non-allowed file → BLOCKED_INPUT', r.status === 'REPO_PATCH_PHYSICAL_BLOCKED_INPUT');
}

// --- blocked scope ---
console.log('--- blocked scope ---');
{
  const r = buildRealRepoPatchPhysicalApplyProof({ ...VALID_BASE, apply_controller_ready: false });
  assert('apply_controller_ready=false → BLOCKED_SCOPE', r.status === 'REPO_PATCH_PHYSICAL_BLOCKED_SCOPE');
  assert('blocked_scope: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchPhysicalApplyProof({ ...VALID_BASE, apply_controller_ready: undefined });
  assert('apply_controller_ready=undefined → BLOCKED_SCOPE', r.status === 'REPO_PATCH_PHYSICAL_BLOCKED_SCOPE');
}

// --- blocked command ---
console.log('--- blocked command ---');
{
  const r = buildRealRepoPatchPhysicalApplyProof({ ...VALID_BASE, apply_controller_ready: true, apply_command_confirmed: false });
  assert('apply_command_confirmed=false → BLOCKED_COMMAND', r.status === 'REPO_PATCH_PHYSICAL_BLOCKED_COMMAND');
  assert('blocked_command: production_touched=false', r.production_touched === false);
}

// --- noop (dry run) ---
console.log('--- noop dry run ---');
{
  const r = buildRealRepoPatchPhysicalApplyProof({ ...VALID_BASE, apply_controller_ready: true, apply_command_confirmed: true, dry_run: true });
  assert('dry_run=true → NOOP', r.status === 'REPO_PATCH_PHYSICAL_NOOP');
  assert('noop: physical_apply_proof_ready=false', r.physical_apply_proof_ready === false);
  assert('noop: patch_applied=false', r.patch_applied === false);
  assert('noop: schema_version=v172.1', r.schema_version === 'v172.1');
  assert('noop: only_allowed_files_touched=true', r.only_allowed_files_touched === true);
  assert('noop: production_touched=false', r.production_touched === false);
  assert('noop: deploy_performed=false', r.deploy_performed === false);
  assert('noop: stable_promoted=false', r.stable_promoted === false);
  assert('noop: release_performed=false', r.release_performed === false);
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchPhysicalApplyProof({ apply_controller_id: 'ctrl', target_file: ALLOWED_FILE }),
    buildRealRepoPatchPhysicalApplyProof({ ...VALID_BASE, apply_controller_ready: false }),
    buildRealRepoPatchPhysicalApplyProof({ ...VALID_BASE }),
    buildRealRepoPatchPhysicalApplyProof({ ...VALID_BASE, apply_command_confirmed: true, dry_run: true }),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
