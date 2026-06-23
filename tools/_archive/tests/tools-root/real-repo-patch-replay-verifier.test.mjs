#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Replay Verifier V183.0
 */

import {
  buildRealRepoPatchReplayVerifier,
  validateRealRepoPatchReplayVerifier,
  renderRealRepoPatchReplayVerifier,
  REAL_REPO_PATCH_REPLAY_VERIFIER_STATUSES,
} from '../real-repo-patch-replay-verifier.mjs';

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

const HASH64 = 'b'.repeat(64);

const VALID_NODES = [
  { id: 'scope_contract' }, { id: 'pre_state_snapshot' }, { id: 'apply_controller' },
  { id: 'physical_apply_proof' }, { id: 'diff_truth_binding' }, { id: 'test_lane' },
  { id: 'rollback_plan' }, { id: 'rollback_drill' }, { id: 'evidence_receipt' },
  { id: 'ledger' }, { id: 'final_report' }, { id: 'pass_gold_candidate_gate' },
  { id: 'baseline' }, { id: 'archive_record' },
  { id: 'execution_baseline', ref_id: 'exec-baseline-001' },
];

const VALID_EDGES = [
  { from: 'scope_contract', to: 'pre_state_snapshot' },
  { from: 'pre_state_snapshot', to: 'apply_controller' },
  { from: 'apply_controller', to: 'physical_apply_proof' },
  { from: 'physical_apply_proof', to: 'diff_truth_binding' },
  { from: 'baseline', to: 'archive_record' },
  { from: 'archive_record', to: 'execution_baseline' },
];

const VALID_INPUT = {
  replay_id: 'replay-001',
  evidence_graph_ready: true,
  graph_hash: HASH64,
  nodes: VALID_NODES,
  edges: VALID_EDGES,
  expected_execution_baseline_id: 'exec-baseline-001',
};

console.log('\n=== real-repo-patch-replay-verifier tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_REPLAY_VERIFIER_STATUSES));
assert('has REPLAY_BLOCKED_INPUT', REAL_REPO_PATCH_REPLAY_VERIFIER_STATUSES.includes('REPLAY_BLOCKED_INPUT'));
assert('has REPLAY_BLOCKED_GRAPH', REAL_REPO_PATCH_REPLAY_VERIFIER_STATUSES.includes('REPLAY_BLOCKED_GRAPH'));
assert('has REPLAY_FAIL', REAL_REPO_PATCH_REPLAY_VERIFIER_STATUSES.includes('REPLAY_FAIL'));
assert('has REPLAY_VERIFIED', REAL_REPO_PATCH_REPLAY_VERIFIER_STATUSES.includes('REPLAY_VERIFIED'));
assert('build is function', typeof buildRealRepoPatchReplayVerifier === 'function');
assert('validate is function', typeof validateRealRepoPatchReplayVerifier === 'function');
assert('render is function', typeof renderRealRepoPatchReplayVerifier === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchReplayVerifier(null);
  assert('null → BLOCKED_INPUT', r.status === 'REPLAY_BLOCKED_INPUT');
  assert('null: replay_verified=false', r.replay_verified === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchReplayVerifier({});
  assert('no replay_id → BLOCKED_INPUT', r.status === 'REPLAY_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchReplayVerifier({ replay_id: 'r', evidence_graph_ready: true });
  assert('no exec_baseline_id → BLOCKED_INPUT', r.status === 'REPLAY_BLOCKED_INPUT');
}

// --- blocked graph ---
console.log('--- blocked graph ---');
{
  const r = buildRealRepoPatchReplayVerifier({ ...VALID_INPUT, evidence_graph_ready: false });
  assert('graph=false → BLOCKED_GRAPH', r.status === 'REPLAY_BLOCKED_GRAPH');
  assert('blocked_graph: replay_verified=false', r.replay_verified === false);
  assert('blocked_graph: production_touched=false', r.production_touched === false);
}

// --- replay fail ---
console.log('--- replay fail ---');
{
  const r = buildRealRepoPatchReplayVerifier({ ...VALID_INPUT, graph_hash: 'short' });
  assert('bad graph_hash → REPLAY_FAIL', r.status === 'REPLAY_FAIL');
  assert('fail: replay_verified=false', r.replay_verified === false);
}
{
  const nodes = VALID_NODES.filter(n => n.id !== 'execution_baseline');
  const r = buildRealRepoPatchReplayVerifier({ ...VALID_INPUT, nodes });
  assert('missing node → REPLAY_FAIL', r.status === 'REPLAY_FAIL');
}
{
  const edges = VALID_EDGES.filter(e => e.from !== 'baseline');
  const r = buildRealRepoPatchReplayVerifier({ ...VALID_INPUT, edges });
  assert('missing edge → REPLAY_FAIL', r.status === 'REPLAY_FAIL');
}

// --- replay verified ---
console.log('--- replay verified ---');
{
  const r = buildRealRepoPatchReplayVerifier(VALID_INPUT);
  assert('valid → REPLAY_VERIFIED', r.status === 'REPLAY_VERIFIED');
  assert('verified: replay_verified=true', r.replay_verified === true);
  assert('verified: schema_version=v183.0', r.schema_version === 'v183.0');
  assert('verified: replay_id set', r.replay_id === 'replay-001');
  assert('verified: replay_hash 64 chars', typeof r.replay_hash === 'string' && r.replay_hash.length === 64);
  assert('verified: replay_order has 15 steps', r.replay_order.length === 15);
  assert('verified: replay_order starts with scope_contract', r.replay_order[0] === 'scope_contract');
  assert('verified: replay_order ends with execution_baseline', r.replay_order[14] === 'execution_baseline');
  assert('verified: errors empty', r.errors.length === 0);
  assert('verified: production_touched=false', r.production_touched === false);
  assert('verified: deploy_performed=false', r.deploy_performed === false);
  assert('verified: stable_promoted=false', r.stable_promoted === false);
  assert('verified: release_performed=false', r.release_performed === false);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchReplayVerifier(VALID_INPUT);
  const r2 = buildRealRepoPatchReplayVerifier(VALID_INPUT);
  assert('hash deterministic', r1.replay_hash === r2.replay_hash);
  const r3 = buildRealRepoPatchReplayVerifier({ ...VALID_INPUT, replay_id: 'replay-002' });
  assert('different replay_id → different hash', r1.replay_hash !== r3.replay_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchReplayVerifier(VALID_INPUT);
  const v = validateRealRepoPatchReplayVerifier(r);
  assert('validate verified: valid=true', v.valid === true);
  assert('validate verified: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchReplayVerifier(null);
  const v = validateRealRepoPatchReplayVerifier(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchReplayVerifier(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchReplayVerifier(VALID_INPUT);
  const s = renderRealRepoPatchReplayVerifier(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains REPLAY_VERIFIED', s.includes('REPLAY_VERIFIED'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains 15', s.includes('15'));
}
{
  const s = renderRealRepoPatchReplayVerifier(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchReplayVerifier(null),
    buildRealRepoPatchReplayVerifier({}),
    buildRealRepoPatchReplayVerifier({ ...VALID_INPUT, evidence_graph_ready: false }),
    buildRealRepoPatchReplayVerifier({ ...VALID_INPUT, graph_hash: 'bad' }),
    buildRealRepoPatchReplayVerifier(VALID_INPUT),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
