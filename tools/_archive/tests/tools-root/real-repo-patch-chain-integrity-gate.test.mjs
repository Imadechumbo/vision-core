#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Chain Integrity Gate V181.0
 */

import {
  buildRealRepoPatchChainIntegrityGate,
  validateRealRepoPatchChainIntegrityGate,
  renderRealRepoPatchChainIntegrityGate,
  REAL_REPO_PATCH_CHAIN_INTEGRITY_STATUSES,
} from '../real-repo-patch-chain-integrity-gate.mjs';

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

const HASH64 = 'a'.repeat(64);

function makeStages(overrides = {}) {
  const base = {
    scope_contract: {
      schema_version: 'v171.0',
      repo_patch_scope_ready: true,
      scope_hash: HASH64,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    pre_state_snapshot: {
      schema_version: 'v171.1',
      pre_state_snapshot_ready: true,
      snapshot_hash: HASH64,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    apply_controller: {
      schema_version: 'v172.0',
      apply_ready: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    physical_apply_proof: {
      schema_version: 'v172.1',
      physical_apply_proof_ready: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    diff_truth_binding: {
      schema_version: 'v173.0',
      diff_truth_bound: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    test_lane: {
      schema_version: 'v173.1',
      test_lane_passed: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    rollback_plan: {
      schema_version: 'v174.0',
      rollback_plan_ready: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    rollback_drill: {
      schema_version: 'v174.1',
      rollback_drill_passed: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    evidence_receipt: {
      schema_version: 'v175.0',
      real_repo_patch_receipt_ready: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    ledger: {
      schema_version: 'v175.1',
      ledger_ready: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    final_report: {
      schema_version: 'v176.0',
      real_repo_patch_final_report_ready: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    pass_gold_candidate_gate: {
      schema_version: 'v177.0',
      pass_gold_candidate_ready: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    baseline: {
      schema_version: 'v178.0',
      real_repo_patch_baseline_ready: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    archive_record: {
      schema_version: 'v179.0',
      archive_record_ready: true,
      archive_hash: HASH64,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    execution_baseline: {
      schema_version: 'v180.0',
      first_real_repo_patch_execution_baseline_ready: true,
      baseline_hash: HASH64,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
  };
  for (const [k, v] of Object.entries(overrides)) {
    base[k] = { ...base[k], ...v };
  }
  return base;
}

const VALID_INPUT = { chain_id: 'chain-001', stages: makeStages() };

console.log('\n=== real-repo-patch-chain-integrity-gate tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_CHAIN_INTEGRITY_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_CHAIN_INTEGRITY_STATUSES.includes('CHAIN_INTEGRITY_BLOCKED_INPUT'));
assert('has FAIL', REAL_REPO_PATCH_CHAIN_INTEGRITY_STATUSES.includes('CHAIN_INTEGRITY_FAIL'));
assert('has READY', REAL_REPO_PATCH_CHAIN_INTEGRITY_STATUSES.includes('CHAIN_INTEGRITY_READY'));
assert('build is function', typeof buildRealRepoPatchChainIntegrityGate === 'function');
assert('validate is function', typeof validateRealRepoPatchChainIntegrityGate === 'function');
assert('render is function', typeof renderRealRepoPatchChainIntegrityGate === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchChainIntegrityGate(null);
  assert('null → BLOCKED_INPUT', r.status === 'CHAIN_INTEGRITY_BLOCKED_INPUT');
  assert('null: chain_integrity_ready=false', r.chain_integrity_ready === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchChainIntegrityGate({});
  assert('no chain_id → BLOCKED_INPUT', r.status === 'CHAIN_INTEGRITY_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchChainIntegrityGate({ chain_id: 'c', stages: null });
  assert('null stages → BLOCKED_INPUT', r.status === 'CHAIN_INTEGRITY_BLOCKED_INPUT');
}

// --- fail: missing stages ---
console.log('--- fail: missing stages ---');
{
  const r = buildRealRepoPatchChainIntegrityGate({ chain_id: 'c', stages: {} });
  assert('empty stages → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
  assert('empty stages: chain_integrity_ready=false', r.chain_integrity_ready === false);
  assert('empty stages: errors non-empty', r.integrity_errors.length > 0);
}
{
  const stages = makeStages();
  delete stages.execution_baseline;
  const r = buildRealRepoPatchChainIntegrityGate({ chain_id: 'c', stages });
  assert('missing execution_baseline → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
}

// --- fail: wrong schema_version ---
console.log('--- fail: wrong schema_version ---');
{
  const r = buildRealRepoPatchChainIntegrityGate({
    chain_id: 'c',
    stages: makeStages({ scope_contract: { schema_version: 'v999.0' } }),
  });
  assert('wrong schema_version → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
  assert('error mentions scope_contract', r.integrity_errors.some(e => e.includes('scope_contract')));
}

// --- fail: invariant violation ---
console.log('--- fail: invariant violation ---');
{
  const r = buildRealRepoPatchChainIntegrityGate({
    chain_id: 'c',
    stages: makeStages({ ledger: { production_touched: true } }),
  });
  assert('production_touched=true in stage → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
}
{
  const r = buildRealRepoPatchChainIntegrityGate({
    chain_id: 'c',
    stages: makeStages({ baseline: { deploy_performed: true } }),
  });
  assert('deploy_performed=true in stage → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
}

// --- fail: ready flag false ---
console.log('--- fail: ready flag false ---');
{
  const r = buildRealRepoPatchChainIntegrityGate({
    chain_id: 'c',
    stages: makeStages({ test_lane: { test_lane_passed: false } }),
  });
  assert('test_lane_passed=false → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
}
{
  const r = buildRealRepoPatchChainIntegrityGate({
    chain_id: 'c',
    stages: makeStages({ archive_record: { archive_record_ready: false } }),
  });
  assert('archive_record_ready=false → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
}

// --- fail: bad hash ---
console.log('--- fail: bad hash ---');
{
  const r = buildRealRepoPatchChainIntegrityGate({
    chain_id: 'c',
    stages: makeStages({ scope_contract: { scope_hash: 'tooshort' } }),
  });
  assert('bad scope_hash → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
}
{
  const r = buildRealRepoPatchChainIntegrityGate({
    chain_id: 'c',
    stages: makeStages({ archive_record: { archive_hash: 'abc' } }),
  });
  assert('bad archive_hash → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
}

// --- fail: chain dependency violation ---
console.log('--- fail: chain dependency ---');
{
  const r = buildRealRepoPatchChainIntegrityGate({
    chain_id: 'c',
    stages: makeStages({ archive_record: { archive_record_ready: false, archive_hash: null } }),
  });
  assert('archive not ready but execution_baseline ready → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
}
{
  const r = buildRealRepoPatchChainIntegrityGate({
    chain_id: 'c',
    stages: makeStages({ baseline: { real_repo_patch_baseline_ready: false } }),
  });
  assert('baseline not ready but archive ready → FAIL', r.status === 'CHAIN_INTEGRITY_FAIL');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchChainIntegrityGate(VALID_INPUT);
  assert('valid chain → READY', r.status === 'CHAIN_INTEGRITY_READY');
  assert('ready: chain_integrity_ready=true', r.chain_integrity_ready === true);
  assert('ready: schema_version=v181.0', r.schema_version === 'v181.0');
  assert('ready: stages_validated=15', r.stages_validated === 15);
  assert('ready: integrity_hash 64 chars', typeof r.integrity_hash === 'string' && r.integrity_hash.length === 64);
  assert('ready: integrity_errors empty', r.integrity_errors.length === 0);
  assert('ready: chain_id set', r.chain_id === 'chain-001');
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchChainIntegrityGate(VALID_INPUT);
  const r2 = buildRealRepoPatchChainIntegrityGate(VALID_INPUT);
  assert('hash deterministic', r1.integrity_hash === r2.integrity_hash);
  const r3 = buildRealRepoPatchChainIntegrityGate({ chain_id: 'chain-002', stages: makeStages() });
  assert('different chain_id → different hash', r1.integrity_hash !== r3.integrity_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchChainIntegrityGate(VALID_INPUT);
  const v = validateRealRepoPatchChainIntegrityGate(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchChainIntegrityGate(null);
  const v = validateRealRepoPatchChainIntegrityGate(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchChainIntegrityGate(null);
  assert('validate null: valid=false', v.valid === false);
}
{
  const r = buildRealRepoPatchChainIntegrityGate({ chain_id: 'c', stages: {} });
  const v = validateRealRepoPatchChainIntegrityGate(r);
  assert('validate fail: valid=true', v.valid === true);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchChainIntegrityGate(VALID_INPUT);
  const s = renderRealRepoPatchChainIntegrityGate(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains CHAIN_INTEGRITY_READY', s.includes('CHAIN_INTEGRITY_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains 15', s.includes('15'));
}
{
  const s = renderRealRepoPatchChainIntegrityGate(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchChainIntegrityGate(null),
    buildRealRepoPatchChainIntegrityGate({}),
    buildRealRepoPatchChainIntegrityGate({ chain_id: 'c', stages: {} }),
    buildRealRepoPatchChainIntegrityGate(VALID_INPUT),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
