#!/usr/bin/env node
/**
 * Release Candidate Dry-Run Controller — Unit Tests V15.13
 * No subprocess spawning. No PI Harness invocation.
 */

import {
  evaluateReleaseCandidate,
  RC_STATUSES,
  RC_BLOCKER_PRIORITY,
  RC_SCHEMA_VERSION,
} from '../release-candidate-controller.mjs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Shared fixtures
// ═══════════════════════════════════════════════════════════════════

const fullHarnessState = {
  backendAlive:          true,
  evidenceSource:        'go-core',
  goRuntimeEvidenceId:   'ev_gocore_v1513_test',
  runtimeProbePass:      true,
  fakeEvidenceAbsent:    true,
  syntaxOk:              true,
  goCoreTestPass:        true,
  goCoreBuildPass:       true,
};

const emptyHarnessState = {};

const fullBinding = {
  pass_gold_authority_binding_status: 'BINDING_READY',
  pass_gold_authority_binding_valid:  true,
};

const blockedBinding = {
  pass_gold_authority_binding_status: 'BINDING_BLOCKED_EVIDENCE',
  pass_gold_authority_binding_valid:  false,
};

const fullEvidence = { id: 'ev_gocore_v1513_test', source: 'go-core' };

const fullInput = {
  harnessState:    fullHarnessState,
  passGoldBinding: fullBinding,
  gitClean:        true,
  testsPassed:     true,
  goTestsPassed:   true,
  branch:          'feat/v1513-test',
  evidenceReceipt: fullEvidence,
};

// ═══════════════════════════════════════════════════════════════════
// Suite A — Constants and Schema
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite A] Constants and Schema');

assert(RC_SCHEMA_VERSION === 'v15.13',                             '[A-01] RC_SCHEMA_VERSION=v15.13');
assert(Array.isArray(RC_STATUSES) && RC_STATUSES.length === 6,     '[A-02] RC_STATUSES has 6 entries');
assert(RC_STATUSES.includes('RC_DRY_RUN_READY'),                   '[A-03] RC_STATUSES includes RC_DRY_RUN_READY');
assert(RC_STATUSES.includes('RC_BLOCKED_EVIDENCE'),                '[A-04] RC_STATUSES includes RC_BLOCKED_EVIDENCE');
assert(RC_STATUSES.includes('RC_BLOCKED_AUTHORITY'),               '[A-05] RC_STATUSES includes RC_BLOCKED_AUTHORITY');
assert(RC_STATUSES.includes('RC_BLOCKED_TESTS'),                   '[A-06] RC_STATUSES includes RC_BLOCKED_TESTS');
assert(RC_STATUSES.includes('RC_BLOCKED_GIT_DIRTY'),               '[A-07] RC_STATUSES includes RC_BLOCKED_GIT_DIRTY');
assert(RC_STATUSES.includes('RC_BLOCKED_POLICY'),                  '[A-08] RC_STATUSES includes RC_BLOCKED_POLICY');
assert(Array.isArray(RC_BLOCKER_PRIORITY),                         '[A-09] RC_BLOCKER_PRIORITY is array');
assert(RC_BLOCKER_PRIORITY[0] === 'RC_BLOCKED_GIT_DIRTY',          '[A-10] GIT_DIRTY is highest priority blocker');

// ═══════════════════════════════════════════════════════════════════
// Suite B — Always-false invariants
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite B] Invariants — allowed flags always false');

const anyResult = evaluateReleaseCandidate({});
assert(anyResult.deploy_allowed    === false, '[B-01] empty input → deploy_allowed=false');
assert(anyResult.tag_allowed       === false, '[B-02] empty input → tag_allowed=false');
assert(anyResult.stable_allowed    === false, '[B-03] empty input → stable_allowed=false');
assert(anyResult.promotion_allowed === false, '[B-04] empty input → promotion_allowed=false');
assert(anyResult.release_candidate_dry_run_only === true, '[B-05] dry_run_only=true always');
assert(anyResult.release_candidate_dry_run_enabled === true, '[B-06] dry_run_enabled=true always');
assert(anyResult.release_candidate_schema_version === 'v15.13', '[B-07] schema_version=v15.13');

const readyResult = evaluateReleaseCandidate(fullInput);
assert(readyResult.deploy_allowed    === false, '[B-08] RC_READY → deploy_allowed=false');
assert(readyResult.tag_allowed       === false, '[B-09] RC_READY → tag_allowed=false');
assert(readyResult.stable_allowed    === false, '[B-10] RC_READY → stable_allowed=false');
assert(readyResult.promotion_allowed === false, '[B-11] RC_READY → promotion_allowed=false');

// ═══════════════════════════════════════════════════════════════════
// Suite C — Blocker scenarios
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite C] Blocker scenarios');

// git dirty → RC_BLOCKED_GIT_DIRTY
const rGitDirty = evaluateReleaseCandidate({ ...fullInput, gitClean: false });
assert(rGitDirty.release_candidate_status === 'RC_BLOCKED_GIT_DIRTY',          '[C-01] git dirty → RC_BLOCKED_GIT_DIRTY');
assert(rGitDirty.release_candidate_blockers.includes('RC_BLOCKED_GIT_DIRTY'),   '[C-02] git dirty in blockers array');
assert(rGitDirty.release_candidate_allowed === false,                            '[C-03] git dirty → allowed=false');

// missing evidence → RC_BLOCKED_EVIDENCE
const rNoEvidence = evaluateReleaseCandidate({
  ...fullInput,
  gitClean: true,
  evidenceReceipt: null,
  harnessState: emptyHarnessState,
  passGoldBinding: null,
});
assert(rNoEvidence.release_candidate_blockers.includes('RC_BLOCKED_EVIDENCE'), '[C-04] no evidence → RC_BLOCKED_EVIDENCE in blockers');

// wrong evidence source → RC_BLOCKED_EVIDENCE
const rWrongSource = evaluateReleaseCandidate({
  ...fullInput,
  evidenceReceipt: { id: 'ev_backend_123', source: 'backend' },
  harnessState: { ...fullHarnessState, evidenceSource: 'backend' },
});
assert(rWrongSource.release_candidate_blockers.includes('RC_BLOCKED_EVIDENCE'), '[C-05] backend evidence source → RC_BLOCKED_EVIDENCE');

// missing authority binding → RC_BLOCKED_AUTHORITY
const rNoBinding = evaluateReleaseCandidate({ ...fullInput, passGoldBinding: null });
assert(rNoBinding.release_candidate_blockers.includes('RC_BLOCKED_AUTHORITY'),  '[C-06] no binding → RC_BLOCKED_AUTHORITY in blockers');

// blocked binding → RC_BLOCKED_AUTHORITY
const rBlockedBinding = evaluateReleaseCandidate({ ...fullInput, passGoldBinding: blockedBinding });
assert(rBlockedBinding.release_candidate_blockers.includes('RC_BLOCKED_AUTHORITY'), '[C-07] blocked binding → RC_BLOCKED_AUTHORITY');

// tests not passed → RC_BLOCKED_TESTS
const rNoTests = evaluateReleaseCandidate({ ...fullInput, testsPassed: false });
assert(rNoTests.release_candidate_blockers.includes('RC_BLOCKED_TESTS'),        '[C-08] tests not passed → RC_BLOCKED_TESTS in blockers');
assert(rNoTests.release_candidate_status === 'RC_BLOCKED_TESTS',                '[C-09] tests not passed → primary status RC_BLOCKED_TESTS');

// git dirty takes priority over evidence missing
const rDirtyAndNoEv = evaluateReleaseCandidate({
  ...fullInput,
  gitClean: false,
  evidenceReceipt: null,
  harnessState: emptyHarnessState,
});
assert(rDirtyAndNoEv.release_candidate_status === 'RC_BLOCKED_GIT_DIRTY',       '[C-10] git dirty takes priority over evidence');

// ═══════════════════════════════════════════════════════════════════
// Suite D — RC_DRY_RUN_READY
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite D] RC_DRY_RUN_READY');

const rReady = evaluateReleaseCandidate(fullInput);
assert(rReady.release_candidate_status === 'RC_DRY_RUN_READY',                 '[D-01] all conditions met → RC_DRY_RUN_READY');
assert(rReady.release_candidate_allowed === true,                               '[D-02] RC_DRY_RUN_READY → allowed=true (classification)');
assert(rReady.release_candidate_dry_run_only === true,                          '[D-03] RC_DRY_RUN_READY → dry_run_only=true');
assert(rReady.release_candidate_blockers.length === 0,                          '[D-04] RC_DRY_RUN_READY → no blockers');
assert(rReady.release_candidate_plan !== null,                                  '[D-05] RC_DRY_RUN_READY → plan not null');
assert(typeof rReady.release_candidate_plan === 'object',                       '[D-06] plan is object');
assert(rReady.release_candidate_plan.deploy_performed === false,                '[D-07] plan.deploy_performed=false');
assert(rReady.release_candidate_plan.tag_created === false,                     '[D-08] plan.tag_created=false');
assert(rReady.release_candidate_plan.stable_promoted === false,                 '[D-09] plan.stable_promoted=false');
assert(rReady.release_candidate_plan.evidence_receipt_id === fullEvidence.id,  '[D-10] plan has evidence_receipt_id');
assert(rReady.release_candidate_plan.evidence_source === 'go-core',            '[D-11] plan has evidence_source=go-core');
assert(typeof rReady.release_candidate_plan.plan_id === 'string',               '[D-12] plan has plan_id');
assert(Array.isArray(rReady.release_candidate_plan.steps),                      '[D-13] plan has steps array');
assert(rReady.release_candidate_plan.steps.length > 0,                          '[D-14] plan steps non-empty');
assert(rReady.release_candidate_plan.branch === 'feat/v1513-test',             '[D-15] plan has branch');

// ═══════════════════════════════════════════════════════════════════
// Suite E — Required evidence list
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite E] Required evidence list');

const rBlockedRequired = evaluateReleaseCandidate({
  ...fullInput,
  evidenceReceipt: null,
  harnessState: emptyHarnessState,
});
assert(Array.isArray(rBlockedRequired.release_candidate_required_evidence),    '[E-01] required_evidence is array');
assert(rBlockedRequired.release_candidate_required_evidence.includes('evidence_receipt_id'), '[E-02] missing id in required_evidence');
assert(rBlockedRequired.release_candidate_required_evidence.includes('evidence_source_go_core'), '[E-03] missing source in required_evidence');

const rReadyRequired = evaluateReleaseCandidate(fullInput);
assert(Array.isArray(rReadyRequired.release_candidate_required_evidence),      '[E-04] RC_READY required_evidence is array');

// ═══════════════════════════════════════════════════════════════════
// Suite F — Edge cases / no crash
// ═══════════════════════════════════════════════════════════════════

console.log('\n[Suite F] Edge cases');

const rEmpty = evaluateReleaseCandidate();
assert(typeof rEmpty.release_candidate_status === 'string',    '[F-01] no args → no crash, returns status');
assert(rEmpty.release_candidate_dry_run_only === true,         '[F-02] no args → dry_run_only=true');
assert(rEmpty.deploy_allowed === false,                        '[F-03] no args → deploy_allowed=false');
assert(rEmpty.release_candidate_plan === null,                 '[F-04] no args → plan null when not ready');

const rNullAll = evaluateReleaseCandidate({ harnessState: null, passGoldBinding: null });
assert(typeof rNullAll.release_candidate_status === 'string',  '[F-05] null inputs → no crash');

// ═══════════════════════════════════════════════════════════════════
// Result
// ═══════════════════════════════════════════════════════════════════

console.log(`\nRelease Candidate Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
