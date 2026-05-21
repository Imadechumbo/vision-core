#!/usr/bin/env node
/**
 * Tests — Pre-Execution Snapshot Contract V153.1
 */

import {
  buildPreExecutionSnapshotContract,
  validatePreExecutionSnapshotContract,
  renderPreExecutionSnapshotContract,
  SNAPSHOT_CONTRACT_STATUSES,
} from '../pre-execution-snapshot-contract.mjs';

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

const GIT_SHA = 'abc123def456' + '0'.repeat(28);

const FULL_READY = {
  snapshot_id:       'v153.1-snapshot',
  git_head_sha:      GIT_SHA,
  git_head_verified: true,
  baseline_id:       'v150.0-anti-hallucination',
  baseline_ready:    true,
  captured_at:       '2026-05-21T21:00:00.000Z',
};

console.log('\n=== pre-execution-snapshot-contract tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildPreExecutionSnapshotContract({});
  assert('no snapshot_id → BLOCKED_INPUT', r.snapshot_contract_status === 'SNAPSHOT_BLOCKED_INPUT');
  assert('snapshot_ready=false', r.snapshot_ready === false);
  assert('snapshot_required=true', r.snapshot_required === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildPreExecutionSnapshotContract(null);
  assert('null → BLOCKED_INPUT', r.snapshot_contract_status === 'SNAPSHOT_BLOCKED_INPUT');
}

// --- blocked git head ---
console.log('--- blocked git head ---');
{
  const r = buildPreExecutionSnapshotContract({ snapshot_id: 's1' });
  assert('no git_head → BLOCKED_GIT_HEAD', r.snapshot_contract_status === 'SNAPSHOT_BLOCKED_GIT_HEAD');
  assert('snapshot_ready=false', r.snapshot_ready === false);
}
{
  const r = buildPreExecutionSnapshotContract({
    snapshot_id: 's1',
    git_head_sha: GIT_SHA,
    git_head_verified: false,
  });
  assert('git_head_verified=false → BLOCKED_GIT_HEAD', r.snapshot_contract_status === 'SNAPSHOT_BLOCKED_GIT_HEAD');
}

// --- blocked baseline ---
console.log('--- blocked baseline ---');
{
  const r = buildPreExecutionSnapshotContract({
    snapshot_id: 's2', git_head_sha: GIT_SHA, git_head_verified: true,
  });
  assert('no baseline → BLOCKED_BASELINE', r.snapshot_contract_status === 'SNAPSHOT_BLOCKED_BASELINE');
  assert('snapshot_ready=false', r.snapshot_ready === false);
}
{
  const r = buildPreExecutionSnapshotContract({
    snapshot_id: 's2', git_head_sha: GIT_SHA, git_head_verified: true,
    baseline_id: 'b1', baseline_ready: false,
  });
  assert('baseline_ready=false → BLOCKED_BASELINE', r.snapshot_contract_status === 'SNAPSHOT_BLOCKED_BASELINE');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildPreExecutionSnapshotContract({ ...FULL_READY });
  assert('all ready → SNAPSHOT_READY', r.snapshot_contract_status === 'SNAPSHOT_READY');
  assert('snapshot_ready=true', r.snapshot_ready === true);
  assert('schema_version=v153.1', r.schema_version === 'v153.1');
  assert('snapshot_id propagated', r.snapshot_id === 'v153.1-snapshot');
  assert('git_head_sha propagated', r.git_head_sha === GIT_SHA);
  assert('baseline_id propagated', r.baseline_id === 'v150.0-anti-hallucination');
  assert('captured_at propagated', r.captured_at === '2026-05-21T21:00:00.000Z');
  assert('snapshot_required=true', r.snapshot_required === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildPreExecutionSnapshotContract({
    ...FULL_READY,
    snapshot_metadata: { env: 'staging', version: '1.2.3' },
  });
  assert('snapshot_metadata propagated', r.snapshot_metadata !== null && r.snapshot_metadata.env === 'staging');
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildPreExecutionSnapshotContract({ ...FULL_READY });
  const r2 = buildPreExecutionSnapshotContract({ ...FULL_READY });
  assert('snapshot_id_hash deterministic', r1.snapshot_id_hash === r2.snapshot_id_hash);
  assert('snapshot_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.snapshot_id_hash));
}
{
  const r1 = buildPreExecutionSnapshotContract({ ...FULL_READY, snapshot_id: 'a' });
  const r2 = buildPreExecutionSnapshotContract({ ...FULL_READY, snapshot_id: 'b' });
  assert('different snapshot_id → different hash', r1.snapshot_id_hash !== r2.snapshot_id_hash);
}

// --- captured_at default ---
{
  const r = buildPreExecutionSnapshotContract({});
  assert('no captured_at → auto ISO', typeof r.captured_at === 'string' && r.captured_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildPreExecutionSnapshotContract({}),
    buildPreExecutionSnapshotContract({ ...FULL_READY }),
    buildPreExecutionSnapshotContract({ snapshot_id: 'sx', git_head_sha: GIT_SHA, git_head_verified: true }),
  ];
  for (const r of cases) {
    assert(`snapshot_required=true [${r.snapshot_contract_status}]`, r.snapshot_required === true);
    assert(`execution_performed=false [${r.snapshot_contract_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.snapshot_contract_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.snapshot_contract_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.snapshot_contract_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildPreExecutionSnapshotContract({ ...FULL_READY });
  const v = validatePreExecutionSnapshotContract(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildPreExecutionSnapshotContract({});
  const v = validatePreExecutionSnapshotContract(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validatePreExecutionSnapshotContract(null).valid === false);
}
{
  const r = buildPreExecutionSnapshotContract({ ...FULL_READY });
  assert('snapshot_required tampered → invalid', validatePreExecutionSnapshotContract({ ...r, snapshot_required: false }).valid === false);
}
{
  const r = buildPreExecutionSnapshotContract({ ...FULL_READY });
  assert('execution_performed tampered → invalid', validatePreExecutionSnapshotContract({ ...r, execution_performed: true }).valid === false);
}
{
  const r = buildPreExecutionSnapshotContract({ ...FULL_READY });
  assert('READY with baseline_ready=false → invalid', validatePreExecutionSnapshotContract({ ...r, baseline_ready: false }).valid === false);
}
{
  const r = buildPreExecutionSnapshotContract({ ...FULL_READY });
  assert('READY with git_head_verified=false → invalid', validatePreExecutionSnapshotContract({ ...r, git_head_verified: false }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildPreExecutionSnapshotContract({ ...FULL_READY });
  const s = renderPreExecutionSnapshotContract(r);
  assert('render string', typeof s === 'string');
  assert('render shows READY', s.includes('SNAPSHOT_READY'));
  assert('render shows REGRA', s.includes('snapshot_required=true'));
  assert('render shows snapshot_id', s.includes('v153.1-snapshot'));
}
{
  const r = buildPreExecutionSnapshotContract({});
  const s = renderPreExecutionSnapshotContract(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderPreExecutionSnapshotContract(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('SNAPSHOT_CONTRACT_STATUSES is array', Array.isArray(SNAPSHOT_CONTRACT_STATUSES));
  assert('SNAPSHOT_CONTRACT_STATUSES length=4', SNAPSHOT_CONTRACT_STATUSES.length === 4);
  for (const s of ['SNAPSHOT_BLOCKED_INPUT','SNAPSHOT_BLOCKED_GIT_HEAD','SNAPSHOT_BLOCKED_BASELINE','SNAPSHOT_READY']) {
    assert(`status present: ${s}`, SNAPSHOT_CONTRACT_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
