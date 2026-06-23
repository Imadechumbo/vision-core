#!/usr/bin/env node
/**
 * Tests — Real Local Patch Evidence Report V169.0
 */

import {
  buildRealLocalPatchEvidenceReport,
  validateRealLocalPatchEvidenceReport,
  renderRealLocalPatchEvidenceReport,
  REAL_LOCAL_PATCH_EVIDENCE_REPORT_STATUSES,
} from '../real-local-patch-evidence-report.mjs';

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
  evidence_report_id: 'evidence-report-001',
  sandbox_id: 'sandbox-001',
  sandbox_status: 'SANDBOX_READY',
  sandbox_hash: 'sandbox-hash-001',
  patch_proof_id: 'patch-proof-001',
  patch_proof_status: 'PATCH_PROOF_CAPTURED',
  patch_proof_hash: 'patch-proof-hash-001',
  test_lane_id: 'test-lane-001',
  test_lane_status: 'TEST_LANE_PASS',
  test_lane_hash: 'test-lane-hash-001',
  rollback_drill_id: 'rollback-drill-001',
  rollback_drill_status: 'ROLLBACK_DRILL_PASS',
  rollback_hash: 'rollback-hash-001',
  patch_target: 'tools/sandbox-module.mjs',
  patch_type: 'code',
  local_only: true,
  production_touched: false,
};

console.log('\n=== real-local-patch-evidence-report tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_LOCAL_PATCH_EVIDENCE_REPORT_STATUSES));
assert('has PATCH_EVIDENCE_BLOCKED_INPUT', REAL_LOCAL_PATCH_EVIDENCE_REPORT_STATUSES.includes('PATCH_EVIDENCE_BLOCKED_INPUT'));
assert('has PATCH_EVIDENCE_BLOCKED_ROLLBACK', REAL_LOCAL_PATCH_EVIDENCE_REPORT_STATUSES.includes('PATCH_EVIDENCE_BLOCKED_ROLLBACK'));
assert('has PATCH_EVIDENCE_BLOCKED_PRODUCTION', REAL_LOCAL_PATCH_EVIDENCE_REPORT_STATUSES.includes('PATCH_EVIDENCE_BLOCKED_PRODUCTION'));
assert('has PATCH_EVIDENCE_COMPLETE', REAL_LOCAL_PATCH_EVIDENCE_REPORT_STATUSES.includes('PATCH_EVIDENCE_COMPLETE'));
assert('has PATCH_EVIDENCE_INCOMPLETE', REAL_LOCAL_PATCH_EVIDENCE_REPORT_STATUSES.includes('PATCH_EVIDENCE_INCOMPLETE'));
assert('build is function', typeof buildRealLocalPatchEvidenceReport === 'function');
assert('validate is function', typeof validateRealLocalPatchEvidenceReport === 'function');
assert('render is function', typeof renderRealLocalPatchEvidenceReport === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealLocalPatchEvidenceReport(null);
  assert('null → BLOCKED_INPUT', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
}
{
  const r = buildRealLocalPatchEvidenceReport({});
  assert('empty → BLOCKED_INPUT', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchEvidenceReport({ evidence_report_id: '  ' });
  assert('blank id → BLOCKED_INPUT', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, sandbox_id: '' });
  assert('missing sandbox_id → BLOCKED_INPUT', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, patch_proof_id: null });
  assert('null patch_proof_id → BLOCKED_INPUT', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, test_lane_id: '' });
  assert('empty test_lane_id → BLOCKED_INPUT', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, rollback_drill_id: null });
  assert('null rollback_drill_id → BLOCKED_INPUT', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, patch_target: '' });
  assert('empty patch_target → BLOCKED_INPUT', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, patch_type: null });
  assert('null patch_type → BLOCKED_INPUT', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_INPUT');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_PRODUCTION');
  assert('production: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_PRODUCTION');
}

// --- blocked rollback ---
console.log('--- blocked rollback ---');
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, rollback_drill_status: 'ROLLBACK_DRILL_FAIL' });
  assert('ROLLBACK_DRILL_FAIL → BLOCKED_ROLLBACK', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_ROLLBACK');
  assert('blocked_rollback: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, rollback_hash: '' });
  assert('missing rollback_hash → BLOCKED_ROLLBACK', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_ROLLBACK');
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, rollback_drill_status: 'ROLLBACK_DRILL_BLOCKED_INPUT' });
  assert('non-PASS rollback → BLOCKED_ROLLBACK', r.evidence_report_status === 'PATCH_EVIDENCE_BLOCKED_ROLLBACK');
}

// --- incomplete ---
console.log('--- incomplete ---');
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, sandbox_status: 'SANDBOX_FAIL' });
  assert('sandbox fail → INCOMPLETE', r.evidence_report_status === 'PATCH_EVIDENCE_INCOMPLETE');
  assert('incomplete: evidence_complete=false', r.evidence_complete === false);
  assert('incomplete: stages_ok < stages_total', r.stages_ok < r.stages_total);
  assert('incomplete: production_touched=false', r.production_touched === false);
  assert('incomplete: evidence_hash set', typeof r.evidence_hash === 'string' && r.evidence_hash.length > 0);
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, patch_proof_status: 'PATCH_PROOF_FAIL' });
  assert('proof fail → INCOMPLETE', r.evidence_report_status === 'PATCH_EVIDENCE_INCOMPLETE');
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, test_lane_status: 'TEST_LANE_FAIL' });
  assert('test lane fail → INCOMPLETE', r.evidence_report_status === 'PATCH_EVIDENCE_INCOMPLETE');
}

// --- complete ---
console.log('--- complete ---');
{
  const r = buildRealLocalPatchEvidenceReport(VALID_INPUT);
  assert('all pass → PATCH_EVIDENCE_COMPLETE', r.evidence_report_status === 'PATCH_EVIDENCE_COMPLETE');
  assert('complete: evidence_complete=true', r.evidence_complete === true);
  assert('complete: stages_ok=4', r.stages_ok === 4);
  assert('complete: stages_total=4', r.stages_total === 4);
  assert('complete: evidence_hash 64 chars', typeof r.evidence_hash === 'string' && r.evidence_hash.length === 64);
  assert('complete: schema_version=v169.0', r.schema_version === 'v169.0');
  assert('complete: blocked_reason=null', r.blocked_reason === null);
  assert('complete: production_touched=false', r.production_touched === false);
  assert('complete: deploy_performed=false', r.deploy_performed === false);
  assert('complete: stable_promoted=false', r.stable_promoted === false);
  assert('complete: release_performed=false', r.release_performed === false);
  assert('complete: local_only=true', r.local_only === true);
  assert('complete: is_real_execution=false', r.is_real_execution === false);
  assert('complete: evidence_report_id set', r.evidence_report_id === 'evidence-report-001');
  assert('complete: sandbox_id set', r.sandbox_id === 'sandbox-001');
  assert('complete: rollback_hash set', r.rollback_hash === 'rollback-hash-001');
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealLocalPatchEvidenceReport(VALID_INPUT);
  const r2 = buildRealLocalPatchEvidenceReport(VALID_INPUT);
  assert('hash deterministic', r1.evidence_hash === r2.evidence_hash);
  const r3 = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, patch_target: 'tools/other.mjs' });
  assert('different input → different hash', r1.evidence_hash !== r3.evidence_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealLocalPatchEvidenceReport(VALID_INPUT);
  const v = validateRealLocalPatchEvidenceReport(r);
  assert('validate complete: valid=true', v.valid === true);
  assert('validate complete: no errors', v.errors.length === 0);
}
{
  const r = buildRealLocalPatchEvidenceReport(null);
  const v = validateRealLocalPatchEvidenceReport(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealLocalPatchEvidenceReport(null);
  assert('validate null: valid=false', v.valid === false);
}
{
  const r = buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, sandbox_status: 'SANDBOX_FAIL' });
  const v = validateRealLocalPatchEvidenceReport(r);
  assert('validate incomplete: valid=true (invariants hold)', v.valid === true);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealLocalPatchEvidenceReport(VALID_INPUT);
  const s = renderRealLocalPatchEvidenceReport(r);
  assert('render complete: is string', typeof s === 'string');
  assert('render complete: contains COMPLETE', s.includes('PATCH_EVIDENCE_COMPLETE'));
  assert('render complete: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderRealLocalPatchEvidenceReport(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealLocalPatchEvidenceReport(null),
    buildRealLocalPatchEvidenceReport({}),
    buildRealLocalPatchEvidenceReport(VALID_INPUT),
    buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, sandbox_status: 'SANDBOX_FAIL' }),
    buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, local_only: false }),
    buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, production_touched: true }),
    buildRealLocalPatchEvidenceReport({ ...VALID_INPUT, rollback_drill_status: 'ROLLBACK_DRILL_FAIL' }),
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
