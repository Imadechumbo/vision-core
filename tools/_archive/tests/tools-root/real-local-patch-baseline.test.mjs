#!/usr/bin/env node
/**
 * Tests — Real Local Patch Baseline V170.0 (capstone)
 */

import {
  buildRealLocalPatchBaseline,
  validateRealLocalPatchBaseline,
  renderRealLocalPatchBaseline,
  REAL_LOCAL_PATCH_BASELINE_STATUSES,
} from '../real-local-patch-baseline.mjs';

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
  baseline_id: 'baseline-001',
  evidence_report_id: 'evidence-report-001',
  evidence_report_status: 'PATCH_EVIDENCE_COMPLETE',
  evidence_hash: 'evidence-hash-001',
  sandbox_id: 'sandbox-001',
  sandbox_status: 'SANDBOX_READY',
  patch_proof_id: 'patch-proof-001',
  patch_proof_status: 'PATCH_PROOF_CAPTURED',
  test_lane_id: 'test-lane-001',
  test_lane_status: 'TEST_LANE_PASS',
  rollback_drill_id: 'rollback-drill-001',
  rollback_drill_status: 'ROLLBACK_DRILL_PASS',
  patch_target: 'tools/sandbox-module.mjs',
  patch_type: 'code',
  local_only: true,
  production_touched: false,
};

console.log('\n=== real-local-patch-baseline tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_LOCAL_PATCH_BASELINE_STATUSES));
assert('has PATCH_BASELINE_BLOCKED_INPUT', REAL_LOCAL_PATCH_BASELINE_STATUSES.includes('PATCH_BASELINE_BLOCKED_INPUT'));
assert('has PATCH_BASELINE_BLOCKED_EVIDENCE', REAL_LOCAL_PATCH_BASELINE_STATUSES.includes('PATCH_BASELINE_BLOCKED_EVIDENCE'));
assert('has PATCH_BASELINE_BLOCKED_PRODUCTION', REAL_LOCAL_PATCH_BASELINE_STATUSES.includes('PATCH_BASELINE_BLOCKED_PRODUCTION'));
assert('has PATCH_BASELINE_READY', REAL_LOCAL_PATCH_BASELINE_STATUSES.includes('PATCH_BASELINE_READY'));
assert('has PATCH_BASELINE_FAIL', REAL_LOCAL_PATCH_BASELINE_STATUSES.includes('PATCH_BASELINE_FAIL'));
assert('build is function', typeof buildRealLocalPatchBaseline === 'function');
assert('validate is function', typeof validateRealLocalPatchBaseline === 'function');
assert('render is function', typeof renderRealLocalPatchBaseline === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealLocalPatchBaseline(null);
  assert('null → BLOCKED_INPUT', r.baseline_status === 'PATCH_BASELINE_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
  assert('null: pipeline_stages is array', Array.isArray(r.pipeline_stages));
}
{
  const r = buildRealLocalPatchBaseline({});
  assert('empty → BLOCKED_INPUT', r.baseline_status === 'PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchBaseline({ baseline_id: '  ' });
  assert('blank id → BLOCKED_INPUT', r.baseline_status === 'PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, evidence_report_id: '' });
  assert('missing evidence_report_id → BLOCKED_INPUT', r.baseline_status === 'PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, sandbox_id: null });
  assert('null sandbox_id → BLOCKED_INPUT', r.baseline_status === 'PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, patch_proof_id: '' });
  assert('empty patch_proof_id → BLOCKED_INPUT', r.baseline_status === 'PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, test_lane_id: null });
  assert('null test_lane_id → BLOCKED_INPUT', r.baseline_status === 'PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, rollback_drill_id: '' });
  assert('empty rollback_drill_id → BLOCKED_INPUT', r.baseline_status === 'PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, patch_target: null });
  assert('null patch_target → BLOCKED_INPUT', r.baseline_status === 'PATCH_BASELINE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, patch_type: '' });
  assert('empty patch_type → BLOCKED_INPUT', r.baseline_status === 'PATCH_BASELINE_BLOCKED_INPUT');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.baseline_status === 'PATCH_BASELINE_BLOCKED_PRODUCTION');
  assert('production: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.baseline_status === 'PATCH_BASELINE_BLOCKED_PRODUCTION');
}

// --- blocked evidence ---
console.log('--- blocked evidence ---');
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, evidence_report_status: 'PATCH_EVIDENCE_INCOMPLETE' });
  assert('INCOMPLETE evidence → BLOCKED_EVIDENCE', r.baseline_status === 'PATCH_BASELINE_BLOCKED_EVIDENCE');
  assert('blocked_evidence: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, evidence_hash: '' });
  assert('missing evidence_hash → BLOCKED_EVIDENCE', r.baseline_status === 'PATCH_BASELINE_BLOCKED_EVIDENCE');
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, evidence_report_status: 'PATCH_EVIDENCE_BLOCKED_INPUT' });
  assert('non-COMPLETE evidence → BLOCKED_EVIDENCE', r.baseline_status === 'PATCH_BASELINE_BLOCKED_EVIDENCE');
}

// --- fail ---
console.log('--- fail ---');
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, sandbox_status: 'SANDBOX_FAIL' });
  assert('sandbox fail → PATCH_BASELINE_FAIL', r.baseline_status === 'PATCH_BASELINE_FAIL');
  assert('fail: baseline_ready=false', r.baseline_ready === false);
  assert('fail: patch_baseline_ready=false', r.patch_baseline_ready === false);
  assert('fail: stages_ok < stages_total', r.stages_ok < r.stages_total);
  assert('fail: production_touched=false', r.production_touched === false);
  assert('fail: baseline_hash set', typeof r.baseline_hash === 'string' && r.baseline_hash.length > 0);
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, patch_proof_status: 'PATCH_PROOF_FAIL' });
  assert('proof fail → PATCH_BASELINE_FAIL', r.baseline_status === 'PATCH_BASELINE_FAIL');
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, test_lane_status: 'TEST_LANE_FAIL' });
  assert('test lane fail → PATCH_BASELINE_FAIL', r.baseline_status === 'PATCH_BASELINE_FAIL');
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, rollback_drill_status: 'ROLLBACK_DRILL_FAIL' });
  assert('rollback fail → PATCH_BASELINE_FAIL', r.baseline_status === 'PATCH_BASELINE_FAIL');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealLocalPatchBaseline(VALID_INPUT);
  assert('all pass → PATCH_BASELINE_READY', r.baseline_status === 'PATCH_BASELINE_READY');
  assert('ready: baseline_ready=true', r.baseline_ready === true);
  assert('ready: patch_baseline_ready=true', r.patch_baseline_ready === true);
  assert('ready: stages_ok=5', r.stages_ok === 5);
  assert('ready: stages_total=5', r.stages_total === 5);
  assert('ready: baseline_hash 64 chars', typeof r.baseline_hash === 'string' && r.baseline_hash.length === 64);
  assert('ready: schema_version=v170.0', r.schema_version === 'v170.0');
  assert('ready: blocked_reason=null', r.blocked_reason === null);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
  assert('ready: local_only=true', r.local_only === true);
  assert('ready: is_real_execution=false', r.is_real_execution === false);
  assert('ready: pipeline_stages has 5 entries', Array.isArray(r.pipeline_stages) && r.pipeline_stages.length === 5);
  assert('ready: stage_statuses all true', Object.values(r.stage_statuses).every(Boolean));
  assert('ready: baseline_id set', r.baseline_id === 'baseline-001');
  assert('ready: evidence_report_id set', r.evidence_report_id === 'evidence-report-001');
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealLocalPatchBaseline(VALID_INPUT);
  const r2 = buildRealLocalPatchBaseline(VALID_INPUT);
  assert('hash deterministic', r1.baseline_hash === r2.baseline_hash);
  const r3 = buildRealLocalPatchBaseline({ ...VALID_INPUT, patch_target: 'tools/other.mjs' });
  assert('different input → different hash', r1.baseline_hash !== r3.baseline_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealLocalPatchBaseline(VALID_INPUT);
  const v = validateRealLocalPatchBaseline(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealLocalPatchBaseline(null);
  const v = validateRealLocalPatchBaseline(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealLocalPatchBaseline(null);
  assert('validate null: valid=false', v.valid === false);
}
{
  const r = buildRealLocalPatchBaseline({ ...VALID_INPUT, sandbox_status: 'SANDBOX_FAIL' });
  const v = validateRealLocalPatchBaseline(r);
  assert('validate fail: valid=true (invariants hold)', v.valid === true);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealLocalPatchBaseline(VALID_INPUT);
  const s = renderRealLocalPatchBaseline(r);
  assert('render ready: is string', typeof s === 'string');
  assert('render ready: contains PATCH_BASELINE_READY', s.includes('PATCH_BASELINE_READY'));
  assert('render ready: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderRealLocalPatchBaseline(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- pipeline stages ---
console.log('--- pipeline stages ---');
{
  const r = buildRealLocalPatchBaseline(VALID_INPUT);
  assert('stages includes sandbox', r.pipeline_stages.includes('sandbox'));
  assert('stages includes patch_proof', r.pipeline_stages.includes('patch_proof'));
  assert('stages includes test_lane', r.pipeline_stages.includes('test_lane'));
  assert('stages includes rollback_drill', r.pipeline_stages.includes('rollback_drill'));
  assert('stages includes evidence_report', r.pipeline_stages.includes('evidence_report'));
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealLocalPatchBaseline(null),
    buildRealLocalPatchBaseline({}),
    buildRealLocalPatchBaseline(VALID_INPUT),
    buildRealLocalPatchBaseline({ ...VALID_INPUT, sandbox_status: 'SANDBOX_FAIL' }),
    buildRealLocalPatchBaseline({ ...VALID_INPUT, local_only: false }),
    buildRealLocalPatchBaseline({ ...VALID_INPUT, production_touched: true }),
    buildRealLocalPatchBaseline({ ...VALID_INPUT, evidence_report_status: 'PATCH_EVIDENCE_INCOMPLETE' }),
    buildRealLocalPatchBaseline({ ...VALID_INPUT, rollback_drill_status: 'ROLLBACK_DRILL_FAIL' }),
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
