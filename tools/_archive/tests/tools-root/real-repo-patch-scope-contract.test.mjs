#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Scope Contract V171.0
 */

import {
  buildRealRepoPatchScopeContract,
  validateRealRepoPatchScopeContract,
  renderRealRepoPatchScopeContract,
  REAL_REPO_PATCH_SCOPE_CONTRACT_STATUSES,
} from '../real-repo-patch-scope-contract.mjs';

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
  scope_contract_id: 'scope-001',
  target_file: 'docs/real-repo-patch-drill-target.md',
  patch_type: 'CREATE_DOC',
  mission_id: 'mission-v171-001',
  allowed_files: ['docs/real-repo-patch-drill-target.md'],
  forbidden_files: [],
  local_patch_baseline_ready: true,
  human_approval_verified: true,
  anti_hallucination_confirmed: true,
  pass_gold_confirmed: true,
  local_only: true,
  production_touched: false,
};

console.log('\n=== real-repo-patch-scope-contract tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_SCOPE_CONTRACT_STATUSES));
assert('has REPO_PATCH_SCOPE_BLOCKED_INPUT', REAL_REPO_PATCH_SCOPE_CONTRACT_STATUSES.includes('REPO_PATCH_SCOPE_BLOCKED_INPUT'));
assert('has REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH', REAL_REPO_PATCH_SCOPE_CONTRACT_STATUSES.includes('REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH'));
assert('has REPO_PATCH_SCOPE_BLOCKED_PRODUCTION', REAL_REPO_PATCH_SCOPE_CONTRACT_STATUSES.includes('REPO_PATCH_SCOPE_BLOCKED_PRODUCTION'));
assert('has REPO_PATCH_SCOPE_READY', REAL_REPO_PATCH_SCOPE_CONTRACT_STATUSES.includes('REPO_PATCH_SCOPE_READY'));
assert('build is function', typeof buildRealRepoPatchScopeContract === 'function');
assert('validate is function', typeof validateRealRepoPatchScopeContract === 'function');
assert('render is function', typeof renderRealRepoPatchScopeContract === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchScopeContract(null);
  assert('null → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
  assert('null: rollback_required=true', r.rollback_required === true);
}
{
  const r = buildRealRepoPatchScopeContract({});
  assert('empty → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchScopeContract({ scope_contract_id: '  ' });
  assert('blank id → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, target_file: '' });
  assert('empty target_file → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, patch_type: null });
  assert('null patch_type → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, mission_id: '' });
  assert('empty mission_id → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, allowed_files: [] });
  assert('empty allowed_files → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, local_patch_baseline_ready: false });
  assert('baseline_ready=false → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, human_approval_verified: false });
  assert('human_approval=false → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, anti_hallucination_confirmed: false });
  assert('anti_hallucination=false → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, pass_gold_confirmed: false });
  assert('pass_gold=false → BLOCKED_INPUT', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_INPUT');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_PRODUCTION');
  assert('production: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_PRODUCTION');
}

// --- blocked forbidden path ---
console.log('--- blocked forbidden path ---');
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, target_file: '.env', allowed_files: ['.env'] });
  assert('.env → BLOCKED_FORBIDDEN_PATH', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH');
  assert('forbidden: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, target_file: '.github/workflows/deploy.yml', allowed_files: ['.github/workflows/deploy.yml'] });
  assert('github workflow → BLOCKED_FORBIDDEN_PATH', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, target_file: 'deploy.sh', allowed_files: ['deploy.sh'] });
  assert('deploy.sh → BLOCKED_FORBIDDEN_PATH', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, target_file: 'package-lock.json', allowed_files: ['package-lock.json'] });
  assert('package-lock.json → BLOCKED_FORBIDDEN_PATH', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, target_file: 'docs/other-file.md', allowed_files: ['docs/real-repo-patch-drill-target.md'] });
  assert('target not in allowed_files → BLOCKED_FORBIDDEN_PATH', r.scope_contract_status === 'REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchScopeContract(VALID_INPUT);
  assert('valid → REPO_PATCH_SCOPE_READY', r.scope_contract_status === 'REPO_PATCH_SCOPE_READY');
  assert('ready: repo_patch_scope_ready=true', r.repo_patch_scope_ready === true);
  assert('ready: rollback_required=true', r.rollback_required === true);
  assert('ready: scope_hash 64 chars', typeof r.scope_hash === 'string' && r.scope_hash.length === 64);
  assert('ready: schema_version=v171.0', r.schema_version === 'v171.0');
  assert('ready: blocked_reason=null', r.blocked_reason === null);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
  assert('ready: local_only=true', r.local_only === true);
  assert('ready: is_real_execution=false', r.is_real_execution === false);
  assert('ready: scope_contract_id set', r.scope_contract_id === 'scope-001');
  assert('ready: target_file set', r.target_file === 'docs/real-repo-patch-drill-target.md');
}
{
  const r = buildRealRepoPatchScopeContract({ ...VALID_INPUT, allowed_files: ['docs/real-repo-patch-drill-target.md', 'tools/some-module.mjs'] });
  assert('multiple allowed_files: still ready', r.scope_contract_status === 'REPO_PATCH_SCOPE_READY');
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchScopeContract(VALID_INPUT);
  const r2 = buildRealRepoPatchScopeContract(VALID_INPUT);
  assert('hash deterministic', r1.scope_hash === r2.scope_hash);
  const r3 = buildRealRepoPatchScopeContract({ ...VALID_INPUT, target_file: 'docs/other.md', allowed_files: ['docs/other.md'] });
  assert('different target → different hash', r1.scope_hash !== r3.scope_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchScopeContract(VALID_INPUT);
  const v = validateRealRepoPatchScopeContract(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchScopeContract(null);
  const v = validateRealRepoPatchScopeContract(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchScopeContract(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchScopeContract(VALID_INPUT);
  const s = renderRealRepoPatchScopeContract(r);
  assert('render ready: is string', typeof s === 'string');
  assert('render ready: contains REPO_PATCH_SCOPE_READY', s.includes('REPO_PATCH_SCOPE_READY'));
  assert('render ready: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderRealRepoPatchScopeContract(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchScopeContract(null),
    buildRealRepoPatchScopeContract({}),
    buildRealRepoPatchScopeContract(VALID_INPUT),
    buildRealRepoPatchScopeContract({ ...VALID_INPUT, production_touched: true }),
    buildRealRepoPatchScopeContract({ ...VALID_INPUT, local_only: false }),
    buildRealRepoPatchScopeContract({ ...VALID_INPUT, target_file: '.env', allowed_files: ['.env'] }),
    buildRealRepoPatchScopeContract({ ...VALID_INPUT, local_patch_baseline_ready: false }),
  ];
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: local_only=true', cases.every(r => r.local_only === true));
  assert('all: rollback_required=true', cases.every(r => r.rollback_required === true));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
