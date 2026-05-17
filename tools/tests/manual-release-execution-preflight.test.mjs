#!/usr/bin/env node
/**
 * Manual Release Execution Preflight — Unit Tests V47.0
 */

import {
  runManualReleaseExecutionPreflight,
  PREFLIGHT_STATUSES,
} from '../manual-release-execution-preflight.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const VALID_REQUEST = {
  manual_release_request_valid: true,
  request_id:          'req-abc',
  evidence_source:     'go-core',
  evidence_receipt_id: 'receipt-abc',
  target_version:      '1.0.0',
  target_branch:       'main',
  git_head:            'deadbeef',
};

const VALID_AUTHORITY = {
  request_authority_binding_ready: true,
};

const VALID_RC = {
  supervised_release_candidate_ready: true,
  evidence_source: 'go-core',
};

const FULL_PARAMS = {
  manual_release_request:    VALID_REQUEST,
  request_authority_binding: VALID_AUTHORITY,
  supervised_rc_result:      VALID_RC,
  rollback_plan_present:     true,
  audit_ledger_present:      true,
  ci_status_verified:        true,
  full_test_pass:            true,
  go_test_pass:              true,
  go_build_pass:             true,
  explicit_preflight_requested: true,
  _mock_timestamp: TS,
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(PREFLIGHT_STATUSES),                                      '[A-01] statuses array');
assert(PREFLIGHT_STATUSES.length === 8,                                        '[A-02] 8 statuses');
assert(PREFLIGHT_STATUSES.includes('PREFLIGHT_BLOCKED_REQUEST'),               '[A-03] BLOCKED_REQUEST');
assert(PREFLIGHT_STATUSES.includes('PREFLIGHT_BLOCKED_AUTHORITY'),             '[A-04] BLOCKED_AUTHORITY');
assert(PREFLIGHT_STATUSES.includes('PREFLIGHT_BLOCKED_EVIDENCE'),              '[A-05] BLOCKED_EVIDENCE');
assert(PREFLIGHT_STATUSES.includes('PREFLIGHT_BLOCKED_TESTS'),                 '[A-06] BLOCKED_TESTS');
assert(PREFLIGHT_STATUSES.includes('PREFLIGHT_BLOCKED_CI'),                    '[A-07] BLOCKED_CI');
assert(PREFLIGHT_STATUSES.includes('PREFLIGHT_BLOCKED_ROLLBACK'),              '[A-08] BLOCKED_ROLLBACK');
assert(PREFLIGHT_STATUSES.includes('PREFLIGHT_BLOCKED_AUDIT'),                 '[A-09] BLOCKED_AUDIT');
assert(PREFLIGHT_STATUSES.includes('PREFLIGHT_READY'),                         '[A-10] READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = runManualReleaseExecutionPreflight({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture.manual_release_preflight_ready    === true,                     '[B-01] ready=true');
assert(fixture.manual_release_preflight_status   === 'PREFLIGHT_READY',        '[B-02] status=PREFLIGHT_READY');
assert(typeof fixture.preflight_id               === 'string',                 '[B-03] preflight_id string');
assert(typeof fixture.preflight_checklist        === 'object',                 '[B-04] checklist object');
assert(Array.isArray(fixture.missing_requirements),                            '[B-05] missing_requirements array');
assert(fixture.missing_requirements.length       === 0,                        '[B-06] no missing requirements');
assert(typeof fixture.execution_plan_preview     === 'object',                 '[B-07] execution_plan_preview object');
assert(fixture.release_execution_allowed         === false,                    '[B-08] release_execution_allowed=false');
assert(fixture.deploy_allowed                    === false,                    '[B-09] deploy=false');
assert(fixture.promotion_allowed                 === false,                    '[B-10] promotion=false');
assert(fixture.stable_allowed                    === false,                    '[B-11] stable=false');
assert(fixture.tag_allowed                       === false,                    '[B-12] tag=false');
assert(fixture.release_performed                 === false,                    '[B-13] release_performed=false');
assert(fixture.tag_created                       === false,                    '[B-14] tag_created=false');
assert(fixture.stable_promoted                   === false,                    '[B-15] stable_promoted=false');
assert(fixture.deploy_performed                  === false,                    '[B-16] deploy_performed=false');
assert(fixture.schema_version                    === 'v47.0',                  '[B-17] schema=v47.0');
assert(fixture.blocking_reason                   === null,                     '[B-18] blocking_reason=null');
assert(fixture.evidence_source                   === 'go-core',                '[B-19] evidence_source=go-core');

// ─── Suite C: Blocked — no explicit preflight ─────────────────────
console.log('\n[Suite C] Blocked — no explicit_preflight_requested');
const noExplicit = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, explicit_preflight_requested: false });
assert(noExplicit.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_REQUEST', '[C-01] no explicit → BLOCKED_REQUEST');
assert(noExplicit.deploy_allowed                  === false,                       '[C-02] deploy=false');

// ─── Suite D: Blocked — missing request ──────────────────────────
console.log('\n[Suite D] Blocked — missing request');
const noReq = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, manual_release_request: null });
assert(noReq.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_REQUEST', '[D-01] null req → BLOCKED_REQUEST');

const invalidReq = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, manual_release_request: { manual_release_request_valid: false } });
assert(invalidReq.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_REQUEST', '[D-02] invalid req → BLOCKED_REQUEST');

// ─── Suite E: Blocked — missing authority ─────────────────────────
console.log('\n[Suite E] Blocked — missing authority');
const noAuth = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, request_authority_binding: null });
assert(noAuth.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_AUTHORITY', '[E-01] null auth → BLOCKED_AUTHORITY');

const notReadyAuth = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, request_authority_binding: { request_authority_binding_ready: false } });
assert(notReadyAuth.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_AUTHORITY', '[E-02] not ready auth → BLOCKED_AUTHORITY');

// ─── Suite F: Blocked — evidence ──────────────────────────────────
console.log('\n[Suite F] Blocked — evidence');
const badEvidence = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, manual_release_request: { ...VALID_REQUEST, evidence_source: 'backend' } });
assert(badEvidence.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_EVIDENCE', '[F-01] backend source → BLOCKED_EVIDENCE');

const noReceipt = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, manual_release_request: { ...VALID_REQUEST, evidence_receipt_id: null } });
assert(noReceipt.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_EVIDENCE', '[F-02] no receipt → BLOCKED_EVIDENCE');

const noRC = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, supervised_rc_result: null });
assert(noRC.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_EVIDENCE', '[F-03] no RC → BLOCKED_EVIDENCE');

// ─── Suite G: Blocked — tests ─────────────────────────────────────
console.log('\n[Suite G] Blocked — tests');
const noFullTest = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, full_test_pass: false });
assert(noFullTest.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_TESTS', '[G-01] full_test false → BLOCKED_TESTS');

const noGoTest = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, go_test_pass: false });
assert(noGoTest.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_TESTS', '[G-02] go_test false → BLOCKED_TESTS');

const noGoBuild = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, go_build_pass: false });
assert(noGoBuild.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_TESTS', '[G-03] go_build false → BLOCKED_TESTS');

// ─── Suite H: Blocked — CI ────────────────────────────────────────
console.log('\n[Suite H] Blocked — CI');
const noCI = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, ci_status_verified: false });
assert(noCI.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_CI', '[H-01] ci false → BLOCKED_CI');

// ─── Suite I: Blocked — rollback / audit ─────────────────────────
console.log('\n[Suite I] Blocked — rollback / audit');
const noRollback = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, rollback_plan_present: false });
assert(noRollback.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_ROLLBACK', '[I-01] no rollback → BLOCKED_ROLLBACK');

const noAudit = runManualReleaseExecutionPreflight({ ...FULL_PARAMS, audit_ledger_present: false });
assert(noAudit.manual_release_preflight_status === 'PREFLIGHT_BLOCKED_AUDIT', '[I-02] no audit → BLOCKED_AUDIT');

// ─── Suite J: Full ready ──────────────────────────────────────────
console.log('\n[Suite J] Full ready');
const ready = runManualReleaseExecutionPreflight(FULL_PARAMS);
assert(ready.manual_release_preflight_ready    === true,                       '[J-01] ready=true');
assert(ready.manual_release_preflight_status   === 'PREFLIGHT_READY',          '[J-02] status=PREFLIGHT_READY');
assert(typeof ready.preflight_id               === 'string',                   '[J-03] preflight_id string');
assert(ready.target_version                    === '1.0.0',                    '[J-04] target_version wired');
assert(ready.target_branch                     === 'main',                     '[J-05] target_branch wired');
assert(ready.git_head                          === 'deadbeef',                 '[J-06] git_head wired');
assert(ready.evidence_source                   === 'go-core',                  '[J-07] evidence_source=go-core');
assert(ready.missing_requirements.length       === 0,                          '[J-08] no missing requirements');
assert(ready.preflight_checklist.manual_release_request_valid   === true,      '[J-09] checklist: request_valid');
assert(ready.preflight_checklist.request_authority_binding_ready === true,     '[J-10] checklist: authority_ready');
assert(ready.preflight_checklist.full_test_pass                  === true,      '[J-11] checklist: full_test_pass');
assert(ready.preflight_checklist.ci_status_verified              === true,      '[J-12] checklist: ci_verified');
assert(ready.preflight_checklist.rollback_plan_present           === true,      '[J-13] checklist: rollback_present');
assert(ready.release_execution_allowed         === false,                      '[J-14] release_execution_allowed=false');
assert(ready.deploy_allowed                    === false,                      '[J-15] deploy=false');
assert(ready.promotion_allowed                 === false,                      '[J-16] promotion=false');
assert(ready.stable_allowed                    === false,                      '[J-17] stable=false');
assert(ready.tag_allowed                       === false,                      '[J-18] tag=false');
assert(ready.release_performed                 === false,                      '[J-19] release_performed=false');
assert(ready.tag_created                       === false,                      '[J-20] tag_created=false');
assert(ready.stable_promoted                   === false,                      '[J-21] stable_promoted=false');
assert(ready.deploy_performed                  === false,                      '[J-22] deploy_performed=false');

// ─── Suite K: Invariants across all modes ────────────────────────
console.log('\n[Suite K] Invariants across all modes');
const modes = [
  { label: 'fixture',     o: fixture     },
  { label: 'ready',       o: ready       },
  { label: 'no-explicit', o: noExplicit  },
  { label: 'no-req',      o: noReq       },
  { label: 'no-auth',     o: noAuth      },
  { label: 'bad-evidence',o: badEvidence },
  { label: 'no-test',     o: noFullTest  },
  { label: 'no-ci',       o: noCI        },
  { label: 'no-rollback', o: noRollback  },
  { label: 'no-audit',    o: noAudit     },
];
for (const { label, o } of modes) {
  assert(o.release_execution_allowed === false, `[K] ${label}: release_execution_allowed=false`);
  assert(o.deploy_allowed            === false, `[K] ${label}: deploy=false`);
  assert(o.promotion_allowed         === false, `[K] ${label}: promotion=false`);
  assert(o.stable_allowed            === false, `[K] ${label}: stable=false`);
  assert(o.tag_allowed               === false, `[K] ${label}: tag=false`);
  assert(o.release_performed         === false, `[K] ${label}: release_performed=false`);
  assert(o.tag_created               === false, `[K] ${label}: tag_created=false`);
  assert(o.stable_promoted           === false, `[K] ${label}: stable_promoted=false`);
  assert(o.deploy_performed          === false, `[K] ${label}: deploy_performed=false`);
}

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\nmanual-release-execution-preflight: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
