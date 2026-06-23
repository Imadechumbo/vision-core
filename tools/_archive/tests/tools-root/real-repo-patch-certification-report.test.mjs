#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Certification Report V189.0
 */

import {
  buildRealRepoPatchCertificationReport,
  validateRealRepoPatchCertificationReport,
  renderRealRepoPatchCertificationReport,
  REAL_REPO_PATCH_CERTIFICATION_STATUSES,
} from '../real-repo-patch-certification-report.mjs';

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
  cert_id: 'cert-001',
  review_id: 'review-001',
  authority_review_approved: true,
};

console.log('\n=== real-repo-patch-certification-report tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_CERTIFICATION_STATUSES));
assert('has CERTIFICATION_BLOCKED_INPUT', REAL_REPO_PATCH_CERTIFICATION_STATUSES.includes('CERTIFICATION_BLOCKED_INPUT'));
assert('has CERTIFICATION_BLOCKED_AUTHORITY', REAL_REPO_PATCH_CERTIFICATION_STATUSES.includes('CERTIFICATION_BLOCKED_AUTHORITY'));
assert('has CERTIFICATION_READY', REAL_REPO_PATCH_CERTIFICATION_STATUSES.includes('CERTIFICATION_READY'));
assert('build is function', typeof buildRealRepoPatchCertificationReport === 'function');
assert('validate is function', typeof validateRealRepoPatchCertificationReport === 'function');
assert('render is function', typeof renderRealRepoPatchCertificationReport === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchCertificationReport(null);
  assert('null → BLOCKED_INPUT', r.status === 'CERTIFICATION_BLOCKED_INPUT');
  assert('null: release_allowed=false', r.release_allowed === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: certified_modules empty', r.certified_modules.length === 0);
}
{
  const r = buildRealRepoPatchCertificationReport({});
  assert('no cert_id → BLOCKED_INPUT', r.status === 'CERTIFICATION_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchCertificationReport({ cert_id: 'c' });
  assert('no review_id → BLOCKED_INPUT', r.status === 'CERTIFICATION_BLOCKED_INPUT');
}

// --- blocked authority ---
console.log('--- blocked authority ---');
{
  const r = buildRealRepoPatchCertificationReport({ ...VALID_INPUT, authority_review_approved: false });
  assert('approved=false → BLOCKED_AUTHORITY', r.status === 'CERTIFICATION_BLOCKED_AUTHORITY');
  assert('blocked_auth: release_allowed=false', r.release_allowed === false);
  assert('blocked_auth: certified_modules empty', r.certified_modules.length === 0);
  assert('blocked_auth: certification_hash=null', r.certification_hash === null);
}
{
  const r = buildRealRepoPatchCertificationReport({ ...VALID_INPUT, authority_review_approved: undefined });
  assert('approved=undefined → BLOCKED_AUTHORITY', r.status === 'CERTIFICATION_BLOCKED_AUTHORITY');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchCertificationReport(VALID_INPUT);
  assert('valid → CERTIFICATION_READY', r.status === 'CERTIFICATION_READY');
  assert('ready: schema_version=v189.0', r.schema_version === 'v189.0');
  assert('ready: cert_id set', r.cert_id === 'cert-001');
  assert('ready: review_id set', r.review_id === 'review-001');
  assert('ready: certified_modules has 20', r.certified_modules.length === 20);
  assert('ready: includes scope_contract', r.certified_modules.includes('scope_contract'));
  assert('ready: includes execution_baseline', r.certified_modules.includes('execution_baseline'));
  assert('ready: includes replay_verifier', r.certified_modules.includes('replay_verifier'));
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: certification_hash 64 chars', typeof r.certification_hash === 'string' && r.certification_hash.length === 64);
  assert('ready: errors empty', r.errors.length === 0);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchCertificationReport(VALID_INPUT);
  const r2 = buildRealRepoPatchCertificationReport(VALID_INPUT);
  assert('hash deterministic', r1.certification_hash === r2.certification_hash);
  const r3 = buildRealRepoPatchCertificationReport({ ...VALID_INPUT, cert_id: 'cert-002' });
  assert('different cert_id → different hash', r1.certification_hash !== r3.certification_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchCertificationReport(VALID_INPUT);
  const v = validateRealRepoPatchCertificationReport(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchCertificationReport(null);
  const v = validateRealRepoPatchCertificationReport(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchCertificationReport(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchCertificationReport(VALID_INPUT);
  const s = renderRealRepoPatchCertificationReport(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains CERTIFICATION_READY', s.includes('CERTIFICATION_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: release_allowed false in output', s.includes('false'));
}
{
  const s = renderRealRepoPatchCertificationReport(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchCertificationReport(null),
    buildRealRepoPatchCertificationReport({}),
    buildRealRepoPatchCertificationReport({ ...VALID_INPUT, authority_review_approved: false }),
    buildRealRepoPatchCertificationReport(VALID_INPUT),
  ];
  assert('all: release_allowed=false', cases.every(r => r.release_allowed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
