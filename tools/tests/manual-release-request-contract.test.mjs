#!/usr/bin/env node
/**
 * Manual Release Request Contract — Unit Tests V46.0
 */

import {
  createManualReleaseRequest,
  validateManualReleaseRequest,
  normalizeManualReleaseRequest,
  renderManualReleaseRequestSummary,
  MANUAL_RELEASE_REQUEST_STATUSES,
} from '../manual-release-request-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS      = '2026-05-17T12:00:00.000Z';
const TS_EXP  = '2026-05-16T12:00:00.000Z'; // past

const FIXTURE_RC = {
  supervised_release_candidate_ready: true,
  rc_id:                'rc-abc123',
  release_intent_id:    'intent-abc123',
  authority_binding_id: 'auth-abc123',
  runtime_candidate_id: 'runtime-abc123',
  evidence_package_id:  'evpkg-abc123',
  evidence_receipt_id:  'receipt-abc123',
  evidence_source:      'go-core',
  supervised_only:      true,
  local_only:           true,
  deploy_allowed:       false,
  promotion_allowed:    false,
  stable_allowed:       false,
  tag_allowed:          false,
  release_performed:    false,
};

const FIXTURE_PKG = {
  promotion_package_ready: true,
  package_id: 'promopkg-abc123',
  deploy_allowed: false,
  promotion_allowed: false,
  manual_only: true,
};

const FIXTURE_REVIEW = {
  promotion_review_ready: true,
  review_id: 'review-abc123',
  promotion_review_allowed: true,
  promotion_allowed: false,
  manual_only: true,
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(MANUAL_RELEASE_REQUEST_STATUSES),                              '[A-01] statuses array');
assert(MANUAL_RELEASE_REQUEST_STATUSES.length === 8,                                '[A-02] 8 statuses');
assert(MANUAL_RELEASE_REQUEST_STATUSES.includes('MANUAL_RELEASE_REQUEST_MISSING'),  '[A-03] MISSING');
assert(MANUAL_RELEASE_REQUEST_STATUSES.includes('MANUAL_RELEASE_REQUEST_INVALID'),  '[A-04] INVALID');
assert(MANUAL_RELEASE_REQUEST_STATUSES.includes('MANUAL_RELEASE_REQUEST_EXPIRED'),  '[A-05] EXPIRED');
assert(MANUAL_RELEASE_REQUEST_STATUSES.includes('MANUAL_RELEASE_REQUEST_BLOCKED_RC'), '[A-06] BLOCKED_RC');
assert(MANUAL_RELEASE_REQUEST_STATUSES.includes('MANUAL_RELEASE_REQUEST_BLOCKED_EVIDENCE'), '[A-07] BLOCKED_EVIDENCE');
assert(MANUAL_RELEASE_REQUEST_STATUSES.includes('MANUAL_RELEASE_REQUEST_BLOCKED_AUTHORITY'), '[A-08] BLOCKED_AUTHORITY');
assert(MANUAL_RELEASE_REQUEST_STATUSES.includes('MANUAL_RELEASE_REQUEST_BLOCKED_PROMOTION_PACKAGE'), '[A-09] BLOCKED_PROMOTION_PACKAGE');
assert(MANUAL_RELEASE_REQUEST_STATUSES.includes('MANUAL_RELEASE_REQUEST_VALID'),    '[A-10] VALID');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = createManualReleaseRequest({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture.manual_release_request_valid    === true,                            '[B-01] valid=true');
assert(fixture.manual_release_request_status   === 'MANUAL_RELEASE_REQUEST_VALID',  '[B-02] status=VALID');
assert(typeof fixture.request_id               === 'string',                        '[B-03] request_id string');
assert(fixture.requested_action === 'manual_release_execution_review',              '[B-04] action=manual_release_execution_review');
assert(fixture.evidence_source                 === 'go-core',                       '[B-05] evidence_source=go-core');
assert(fixture.local_only                      === true,                            '[B-06] local_only=true');
assert(fixture.manual_only                     === true,                            '[B-07] manual_only=true');
assert(fixture.supervised_only                 === true,                            '[B-08] supervised_only=true');
assert(fixture.schema_version                  === 'v46.0',                         '[B-09] schema=v46.0');
assert(fixture.deploy_allowed                  === false,                           '[B-10] deploy=false');
assert(fixture.promotion_allowed               === false,                           '[B-11] promotion=false');
assert(fixture.stable_allowed                  === false,                           '[B-12] stable=false');
assert(fixture.tag_allowed                     === false,                           '[B-13] tag=false');
assert(fixture.release_performed               === false,                           '[B-14] release_performed=false');
assert(fixture.blocking_reason                 === null,                            '[B-15] blocking_reason=null');
assert(typeof fixture.supervised_rc_id         === 'string',                        '[B-16] supervised_rc_id string');
assert(typeof fixture.evidence_receipt_id      === 'string',                        '[B-17] evidence_receipt_id string');
assert(typeof fixture.promotion_package_id     === 'string',                        '[B-18] promotion_package_id string');
assert(typeof fixture.manual_review_id         === 'string',                        '[B-19] manual_review_id string');
assert(typeof fixture.created_at               === 'string',                        '[B-20] created_at string');
assert(typeof fixture.expires_at               === 'string',                        '[B-21] expires_at string');

// ─── Suite C: Validate — missing required fields ──────────────────
console.log('\n[Suite C] Validate — missing fields');
const missingFields = validateManualReleaseRequest({});
assert(missingFields.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_INVALID', '[C-01] missing fields → INVALID');
assert(missingFields.manual_release_request_valid  === false,                            '[C-02] valid=false');
assert(missingFields.deploy_allowed                === false,                            '[C-03] deploy=false');

const missingTarget = validateManualReleaseRequest({
  requested_by: 'actor', target_version: null, target_branch: null, git_head: null,
  supervised_rc_result: FIXTURE_RC,
});
assert(missingTarget.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_INVALID', '[C-04] null target → INVALID');

// ─── Suite D: Validate — supervised RC required ───────────────────
console.log('\n[Suite D] Validate — supervised RC');
const noRC = validateManualReleaseRequest({
  requested_by: 'actor', target_version: '1.0.0', target_branch: 'main', git_head: 'abc',
  supervised_rc_result: null,
});
assert(noRC.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_BLOCKED_RC', '[D-01] no RC → BLOCKED_RC');

const notReadyRC = validateManualReleaseRequest({
  requested_by: 'actor', target_version: '1.0.0', target_branch: 'main', git_head: 'abc',
  supervised_rc_result: { supervised_release_candidate_ready: false },
});
assert(notReadyRC.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_BLOCKED_RC', '[D-02] not ready RC → BLOCKED_RC');

const noSupervisedOnly = validateManualReleaseRequest({
  requested_by: 'actor', target_version: '1.0.0', target_branch: 'main', git_head: 'abc',
  supervised_rc_result: { ...FIXTURE_RC, supervised_only: false },
});
assert(noSupervisedOnly.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_BLOCKED_RC', '[D-03] supervised_only false → BLOCKED_RC');

// ─── Suite E: Validate — evidence required ────────────────────────
console.log('\n[Suite E] Validate — evidence');
const badEvidence = validateManualReleaseRequest({
  requested_by: 'actor', target_version: '1.0.0', target_branch: 'main', git_head: 'abc',
  supervised_rc_result: { ...FIXTURE_RC, evidence_source: 'backend' },
});
assert(badEvidence.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_BLOCKED_EVIDENCE', '[E-01] backend source → BLOCKED_EVIDENCE');

const missingSource = validateManualReleaseRequest({
  requested_by: 'actor', target_version: '1.0.0', target_branch: 'main', git_head: 'abc',
  supervised_rc_result: { ...FIXTURE_RC, evidence_source: null },
});
assert(missingSource.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_BLOCKED_EVIDENCE', '[E-02] null source → BLOCKED_EVIDENCE');

// ─── Suite F: Validate — authority required ───────────────────────
console.log('\n[Suite F] Validate — authority');
const noAuthority = validateManualReleaseRequest({
  requested_by: 'actor', target_version: '1.0.0', target_branch: 'main', git_head: 'abc',
  supervised_rc_result: { ...FIXTURE_RC, authority_binding_id: null },
});
assert(noAuthority.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_BLOCKED_AUTHORITY', '[F-01] no authority → BLOCKED_AUTHORITY');

// ─── Suite G: Validate — promotion package required ───────────────
console.log('\n[Suite G] Validate — promotion package');
const noPkg = validateManualReleaseRequest({
  requested_by: 'actor', target_version: '1.0.0', target_branch: 'main', git_head: 'abc',
  supervised_rc_result: FIXTURE_RC,
  promotion_package_result: null,
});
assert(noPkg.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_BLOCKED_PROMOTION_PACKAGE', '[G-01] no pkg → BLOCKED_PROMOTION_PACKAGE');

const notReadyPkg = validateManualReleaseRequest({
  requested_by: 'actor', target_version: '1.0.0', target_branch: 'main', git_head: 'abc',
  supervised_rc_result: FIXTURE_RC,
  promotion_package_result: { promotion_package_ready: false },
});
assert(notReadyPkg.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_BLOCKED_PROMOTION_PACKAGE', '[G-02] pkg not ready → BLOCKED');

const noReview = validateManualReleaseRequest({
  requested_by: 'actor', target_version: '1.0.0', target_branch: 'main', git_head: 'abc',
  supervised_rc_result: FIXTURE_RC,
  promotion_package_result: FIXTURE_PKG,
  manual_review_result: null,
});
assert(noReview.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_BLOCKED_PROMOTION_PACKAGE', '[G-03] no review → BLOCKED');

// ─── Suite H: Valid request ───────────────────────────────────────
console.log('\n[Suite H] Valid request');
const valid = validateManualReleaseRequest({
  requested_by: 'actor', target_version: '1.0.0', target_branch: 'main', git_head: 'deadbeef',
  supervised_rc_result: FIXTURE_RC,
  promotion_package_result: FIXTURE_PKG,
  manual_review_result: FIXTURE_REVIEW,
  _mock_timestamp: TS,
});
assert(valid.manual_release_request_valid    === true,                              '[H-01] valid=true');
assert(valid.manual_release_request_status   === 'MANUAL_RELEASE_REQUEST_VALID',    '[H-02] status=VALID');
assert(valid.evidence_source                 === 'go-core',                         '[H-03] evidence_source=go-core');
assert(valid.supervised_rc_id               === 'rc-abc123',                        '[H-04] rc_id wired');
assert(valid.authority_binding_id           === 'auth-abc123',                      '[H-05] authority_id wired');
assert(valid.promotion_package_id           === 'promopkg-abc123',                  '[H-06] promo_pkg_id wired');
assert(valid.manual_review_id              === 'review-abc123',                     '[H-07] review_id wired');
assert(valid.deploy_allowed                === false,                               '[H-08] deploy=false');
assert(valid.promotion_allowed             === false,                               '[H-09] promotion=false');
assert(valid.stable_allowed               === false,                                '[H-10] stable=false');
assert(valid.tag_allowed                  === false,                                '[H-11] tag=false');
assert(valid.release_performed            === false,                                '[H-12] release_performed=false');
assert(valid.local_only                   === true,                                 '[H-13] local_only=true');
assert(valid.manual_only                  === true,                                 '[H-14] manual_only=true');
assert(valid.supervised_only              === true,                                 '[H-15] supervised_only=true');

// ─── Suite I: Normalize ───────────────────────────────────────────
console.log('\n[Suite I] Normalize');
const normalized = normalizeManualReleaseRequest(valid);
assert(normalized.deploy_allowed      === false, '[I-01] normalized deploy=false');
assert(normalized.promotion_allowed   === false, '[I-02] normalized promotion=false');
assert(normalized.local_only          === true,  '[I-03] local_only=true after normalize');
assert(normalized.manual_only         === true,  '[I-04] manual_only=true after normalize');

const normalizeNull = normalizeManualReleaseRequest(null);
assert(normalizeNull.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_MISSING', '[I-05] null → MISSING');

// Expired
const expired = normalizeManualReleaseRequest({ ...valid, expires_at: TS_EXP });
assert(expired.manual_release_request_status === 'MANUAL_RELEASE_REQUEST_EXPIRED', '[I-06] expired → EXPIRED');

// ─── Suite J: Render summary ──────────────────────────────────────
console.log('\n[Suite J] Render summary');
const summary = renderManualReleaseRequestSummary(valid);
assert(typeof summary                    === 'string',               '[J-01] summary is string');
assert(summary.includes('MANUAL_RELEASE_REQUEST_CONTRACT V46.0'),   '[J-02] header present');
assert(summary.includes('MANUAL_RELEASE_REQUEST_VALID'),             '[J-03] status in summary');
assert(summary.includes('go-core'),                                  '[J-04] evidence_source in summary');
assert(summary.includes('deploy_allowed: false'),                    '[J-05] deploy_allowed in summary');

const summaryNull = renderManualReleaseRequestSummary(null);
assert(typeof summaryNull === 'string',                              '[J-06] null renders string');

// ─── Suite K: Invariants — all execution flags false ─────────────
console.log('\n[Suite K] Invariants across all modes');
const modes = [
  { label: 'fixture',  o: fixture },
  { label: 'valid',    o: valid   },
  { label: 'no-rc',    o: noRC    },
  { label: 'no-auth',  o: noAuthority },
  { label: 'expired',  o: expired },
];
for (const { label, o } of modes) {
  assert(o.deploy_allowed    === false, `[K] ${label}: deploy=false`);
  assert(o.promotion_allowed === false, `[K] ${label}: promotion=false`);
  assert(o.stable_allowed    === false, `[K] ${label}: stable=false`);
  assert(o.tag_allowed       === false, `[K] ${label}: tag=false`);
  assert(o.release_performed === false, `[K] ${label}: release_performed=false`);
}

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\nmanual-release-request-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
