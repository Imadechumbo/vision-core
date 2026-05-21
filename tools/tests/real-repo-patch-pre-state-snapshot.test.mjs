#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Pre-State Snapshot V171.1
 */

import {
  buildRealRepoPatchPreStateSnapshot,
  validateRealRepoPatchPreStateSnapshot,
  renderRealRepoPatchPreStateSnapshot,
  REAL_REPO_PATCH_PRE_STATE_STATUSES,
} from '../real-repo-patch-pre-state-snapshot.mjs';

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

const VALID_INPUT_CREATE = {
  snapshot_id: 'snapshot-001',
  scope_contract_id: 'scope-001',
  scope_contract_status: 'REPO_PATCH_SCOPE_READY',
  target_file: 'docs/real-repo-patch-drill-target.md',
  patch_type: 'CREATE_DOC',
  file_exists_before: false,
  file_content_hash_before: null,
  git_head_before: 'abc123def456',
  branch_name: 'feat/v1721-real-repo-patch-physical-apply-proof',
  working_tree_clean_before: true,
  local_only: true,
  production_touched: false,
};

const VALID_INPUT_EXISTING = {
  snapshot_id: 'snapshot-002',
  scope_contract_id: 'scope-001',
  scope_contract_status: 'REPO_PATCH_SCOPE_READY',
  target_file: 'docs/real-repo-patch-drill-target.md',
  patch_type: 'UPDATE_DOC',
  file_exists_before: true,
  file_content_hash_before: 'existing-content-hash-001',
  git_head_before: 'abc123def456',
  branch_name: 'feat/v1721-real-repo-patch-physical-apply-proof',
  working_tree_clean_before: true,
  local_only: true,
  production_touched: false,
};

console.log('\n=== real-repo-patch-pre-state-snapshot tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_PRE_STATE_STATUSES));
assert('has REPO_PRE_STATE_BLOCKED_INPUT', REAL_REPO_PATCH_PRE_STATE_STATUSES.includes('REPO_PRE_STATE_BLOCKED_INPUT'));
assert('has REPO_PRE_STATE_BLOCKED_SCOPE', REAL_REPO_PATCH_PRE_STATE_STATUSES.includes('REPO_PRE_STATE_BLOCKED_SCOPE'));
assert('has REPO_PRE_STATE_BLOCKED_MISSING_FILE', REAL_REPO_PATCH_PRE_STATE_STATUSES.includes('REPO_PRE_STATE_BLOCKED_MISSING_FILE'));
assert('has REPO_PRE_STATE_READY', REAL_REPO_PATCH_PRE_STATE_STATUSES.includes('REPO_PRE_STATE_READY'));
assert('build is function', typeof buildRealRepoPatchPreStateSnapshot === 'function');
assert('validate is function', typeof validateRealRepoPatchPreStateSnapshot === 'function');
assert('render is function', typeof renderRealRepoPatchPreStateSnapshot === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchPreStateSnapshot(null);
  assert('null → BLOCKED_INPUT', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
}
{
  const r = buildRealRepoPatchPreStateSnapshot({});
  assert('empty → BLOCKED_INPUT', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, scope_contract_id: '' });
  assert('empty scope_contract_id → BLOCKED_INPUT', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, target_file: '' });
  assert('empty target_file → BLOCKED_INPUT', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, git_head_before: null });
  assert('null git_head → BLOCKED_INPUT', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, branch_name: '' });
  assert('empty branch_name → BLOCKED_INPUT', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, file_exists_before: 'yes' });
  assert('string file_exists_before → BLOCKED_INPUT', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, working_tree_clean_before: null });
  assert('null working_tree_clean → BLOCKED_INPUT', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, working_tree_clean_before: false });
  assert('dirty tree → BLOCKED_INPUT', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_INPUT');
}

// --- blocked scope ---
console.log('--- blocked scope ---');
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, scope_contract_status: 'REPO_PATCH_SCOPE_BLOCKED_INPUT' });
  assert('non-READY scope → BLOCKED_SCOPE', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_SCOPE');
  assert('blocked_scope: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, scope_contract_status: null });
  assert('null scope_status → BLOCKED_SCOPE', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_SCOPE');
}

// --- blocked missing file ---
console.log('--- blocked missing file ---');
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, file_exists_before: false, patch_type: 'UPDATE_DOC' });
  assert('file not exists + UPDATE_DOC → BLOCKED_MISSING_FILE', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_MISSING_FILE');
}
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, file_exists_before: false, patch_type: 'patch' });
  assert('file not exists + patch → BLOCKED_MISSING_FILE', r.pre_state_status === 'REPO_PRE_STATE_BLOCKED_MISSING_FILE');
}

// --- ready (create) ---
console.log('--- ready (create) ---');
{
  const r = buildRealRepoPatchPreStateSnapshot(VALID_INPUT_CREATE);
  assert('create: REPO_PRE_STATE_READY', r.pre_state_status === 'REPO_PRE_STATE_READY');
  assert('create: pre_state_snapshot_ready=true', r.pre_state_snapshot_ready === true);
  assert('create: snapshot_hash 64 chars', typeof r.snapshot_hash === 'string' && r.snapshot_hash.length === 64);
  assert('create: schema_version=v171.1', r.schema_version === 'v171.1');
  assert('create: blocked_reason=null', r.blocked_reason === null);
  assert('create: production_touched=false', r.production_touched === false);
  assert('create: deploy_performed=false', r.deploy_performed === false);
  assert('create: stable_promoted=false', r.stable_promoted === false);
  assert('create: release_performed=false', r.release_performed === false);
  assert('create: local_only=true', r.local_only === true);
  assert('create: is_real_execution=false', r.is_real_execution === false);
  assert('create: file_content_hash_before=null', r.file_content_hash_before === null);
  assert('create: snapshot_id set', r.snapshot_id === 'snapshot-001');
}

// --- ready (existing) ---
console.log('--- ready (existing) ---');
{
  const r = buildRealRepoPatchPreStateSnapshot(VALID_INPUT_EXISTING);
  assert('existing: REPO_PRE_STATE_READY', r.pre_state_status === 'REPO_PRE_STATE_READY');
  assert('existing: pre_state_snapshot_ready=true', r.pre_state_snapshot_ready === true);
  assert('existing: file_content_hash_before set', r.file_content_hash_before === 'existing-content-hash-001');
  assert('existing: snapshot_hash 64 chars', typeof r.snapshot_hash === 'string' && r.snapshot_hash.length === 64);
}
{
  const r = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, patch_type: 'CREATE' });
  assert('CREATE type + no file: ready', r.pre_state_status === 'REPO_PRE_STATE_READY');
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchPreStateSnapshot(VALID_INPUT_CREATE);
  const r2 = buildRealRepoPatchPreStateSnapshot(VALID_INPUT_CREATE);
  assert('hash deterministic', r1.snapshot_hash === r2.snapshot_hash);
  const r3 = buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, git_head_before: 'different-head' });
  assert('different head → different hash', r1.snapshot_hash !== r3.snapshot_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchPreStateSnapshot(VALID_INPUT_CREATE);
  const v = validateRealRepoPatchPreStateSnapshot(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchPreStateSnapshot(null);
  const v = validateRealRepoPatchPreStateSnapshot(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchPreStateSnapshot(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchPreStateSnapshot(VALID_INPUT_CREATE);
  const s = renderRealRepoPatchPreStateSnapshot(r);
  assert('render ready: is string', typeof s === 'string');
  assert('render ready: contains REPO_PRE_STATE_READY', s.includes('REPO_PRE_STATE_READY'));
  assert('render ready: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderRealRepoPatchPreStateSnapshot(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchPreStateSnapshot(null),
    buildRealRepoPatchPreStateSnapshot({}),
    buildRealRepoPatchPreStateSnapshot(VALID_INPUT_CREATE),
    buildRealRepoPatchPreStateSnapshot(VALID_INPUT_EXISTING),
    buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, scope_contract_status: 'BLOCKED' }),
    buildRealRepoPatchPreStateSnapshot({ ...VALID_INPUT_CREATE, working_tree_clean_before: false }),
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
