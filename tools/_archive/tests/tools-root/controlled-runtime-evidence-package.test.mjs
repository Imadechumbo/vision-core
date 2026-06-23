#!/usr/bin/env node
/**
 * Tests — Controlled Runtime Evidence Package V154.1
 */

import {
  buildControlledRuntimeEvidencePackage,
  validateControlledRuntimeEvidencePackage,
  renderControlledRuntimeEvidencePackage,
  RUNTIME_EVIDENCE_PACKAGE_STATUSES,
  RUNTIME_EVIDENCE_ARTIFACT_FIELDS,
} from '../controlled-runtime-evidence-package.mjs';

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

const FULL_SEALED = {
  package_id:          'v154.1-package',
  contract_id:         'v151.0-contract',
  dry_run_id:          'v152.0-dry-run',
  plan_id:             'v152.1-plan',
  rollback_binding_id: 'v153.0-binding',
  snapshot_id:         'v153.1-snapshot',
  proof_receipt_id:    'v154.0-receipt',
  sealed_at:           '2026-05-21T23:00:00.000Z',
};

console.log('\n=== controlled-runtime-evidence-package tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildControlledRuntimeEvidencePackage({});
  assert('no package_id → BLOCKED_INPUT', r.evidence_package_status === 'EVIDENCE_PACKAGE_BLOCKED_INPUT');
  assert('package_complete=false', r.package_complete === false);
  assert('package_sealed=true', r.package_sealed === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildControlledRuntimeEvidencePackage(null);
  assert('null → BLOCKED_INPUT', r.evidence_package_status === 'EVIDENCE_PACKAGE_BLOCKED_INPUT');
}

// --- blocked incomplete ---
console.log('--- blocked incomplete ---');
{
  const r = buildControlledRuntimeEvidencePackage({ package_id: 'p1' });
  assert('no artifacts → BLOCKED_INCOMPLETE', r.evidence_package_status === 'EVIDENCE_PACKAGE_BLOCKED_INCOMPLETE');
  assert('missing_artifacts is array', Array.isArray(r.missing_artifacts));
  assert('all 6 missing', r.missing_artifacts.length === 6);
}
{
  const r = buildControlledRuntimeEvidencePackage({
    package_id: 'p2',
    contract_id: 'c1',
    dry_run_id: 'dr1',
  });
  assert('partial artifacts → BLOCKED_INCOMPLETE', r.evidence_package_status === 'EVIDENCE_PACKAGE_BLOCKED_INCOMPLETE');
  assert('4 missing', r.missing_artifacts.length === 4);
}
{
  const r = buildControlledRuntimeEvidencePackage({
    ...FULL_SEALED,
    proof_receipt_id: '',
  });
  assert('empty proof_receipt → BLOCKED_INCOMPLETE', r.evidence_package_status === 'EVIDENCE_PACKAGE_BLOCKED_INCOMPLETE');
  assert('proof_receipt_id in missing', r.missing_artifacts.includes('proof_receipt_id'));
}

// --- sealed ---
console.log('--- sealed ---');
{
  const r = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED });
  assert('all ready → EVIDENCE_PACKAGE_SEALED', r.evidence_package_status === 'EVIDENCE_PACKAGE_SEALED');
  assert('package_complete=true', r.package_complete === true);
  assert('schema_version=v154.1', r.schema_version === 'v154.1');
  assert('package_id propagated', r.package_id === 'v154.1-package');
  assert('contract_id propagated', r.contract_id === 'v151.0-contract');
  assert('dry_run_id propagated', r.dry_run_id === 'v152.0-dry-run');
  assert('plan_id propagated', r.plan_id === 'v152.1-plan');
  assert('rollback_binding_id propagated', r.rollback_binding_id === 'v153.0-binding');
  assert('snapshot_id propagated', r.snapshot_id === 'v153.1-snapshot');
  assert('proof_receipt_id propagated', r.proof_receipt_id === 'v154.0-receipt');
  assert('artifact_count=6', r.artifact_count === 6);
  assert('sealed_at propagated', r.sealed_at === '2026-05-21T23:00:00.000Z');
  assert('package_sealed=true', r.package_sealed === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED });
  const r2 = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED });
  assert('package_id_hash deterministic', r1.package_id_hash === r2.package_id_hash);
  assert('package_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.package_id_hash));
}
{
  const r1 = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED, package_id: 'a' });
  const r2 = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED, package_id: 'b' });
  assert('different package_id → different hash', r1.package_id_hash !== r2.package_id_hash);
}

// --- sealed_at default ---
{
  const r = buildControlledRuntimeEvidencePackage({});
  assert('no sealed_at → auto ISO', typeof r.sealed_at === 'string' && r.sealed_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildControlledRuntimeEvidencePackage({}),
    buildControlledRuntimeEvidencePackage({ ...FULL_SEALED }),
    buildControlledRuntimeEvidencePackage({ package_id: 'px', contract_id: 'c1' }),
  ];
  for (const r of cases) {
    assert(`package_sealed=true [${r.evidence_package_status}]`, r.package_sealed === true);
    assert(`execution_performed=false [${r.evidence_package_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.evidence_package_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.evidence_package_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.evidence_package_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED });
  const v = validateControlledRuntimeEvidencePackage(r);
  assert('validate sealed → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildControlledRuntimeEvidencePackage({});
  const v = validateControlledRuntimeEvidencePackage(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateControlledRuntimeEvidencePackage(null).valid === false);
}
{
  const r = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED });
  assert('package_sealed tampered → invalid', validateControlledRuntimeEvidencePackage({ ...r, package_sealed: false }).valid === false);
}
{
  const r = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED });
  assert('execution_performed tampered → invalid', validateControlledRuntimeEvidencePackage({ ...r, execution_performed: true }).valid === false);
}
{
  const r = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED });
  assert('SEALED with wrong artifact_count → invalid', validateControlledRuntimeEvidencePackage({ ...r, artifact_count: 5 }).valid === false);
}
{
  const r = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED });
  assert('SEALED with missing contract_id → invalid', validateControlledRuntimeEvidencePackage({ ...r, contract_id: '' }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledRuntimeEvidencePackage({ ...FULL_SEALED });
  const s = renderControlledRuntimeEvidencePackage(r);
  assert('render string', typeof s === 'string');
  assert('render shows SEALED', s.includes('EVIDENCE_PACKAGE_SEALED'));
  assert('render shows REGRA', s.includes('package_sealed=true'));
  assert('render shows package_id', s.includes('v154.1-package'));
  assert('render shows contract_id', s.includes('v151.0-contract'));
}
{
  const r = buildControlledRuntimeEvidencePackage({});
  const s = renderControlledRuntimeEvidencePackage(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderControlledRuntimeEvidencePackage(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('RUNTIME_EVIDENCE_PACKAGE_STATUSES is array', Array.isArray(RUNTIME_EVIDENCE_PACKAGE_STATUSES));
  assert('RUNTIME_EVIDENCE_PACKAGE_STATUSES length=3', RUNTIME_EVIDENCE_PACKAGE_STATUSES.length === 3);
  assert('RUNTIME_EVIDENCE_ARTIFACT_FIELDS is array', Array.isArray(RUNTIME_EVIDENCE_ARTIFACT_FIELDS));
  assert('RUNTIME_EVIDENCE_ARTIFACT_FIELDS length=6', RUNTIME_EVIDENCE_ARTIFACT_FIELDS.length === 6);
  for (const f of ['contract_id','dry_run_id','plan_id','rollback_binding_id','snapshot_id','proof_receipt_id']) {
    assert(`field present: ${f}`, RUNTIME_EVIDENCE_ARTIFACT_FIELDS.includes(f));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
