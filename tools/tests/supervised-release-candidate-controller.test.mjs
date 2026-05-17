#!/usr/bin/env node
/**
 * Supervised Release Candidate Controller — Unit Tests V42.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runSupervisedReleaseCandidateController,
  SUPERVISED_RC_STATUSES,
} from '../supervised-release-candidate-controller.mjs';
import { _resetLedgerForTest }                    from '../runtime-execution-ledger-binding.mjs';
import { runRuntimePassGoldCandidateController }  from '../runtime-pass-gold-candidate-controller.mjs';
import {
  createSupervisedReleaseIntent,
  validateSupervisedReleaseIntent,
} from '../supervised-release-intent-contract.mjs';
import { bindReleaseIntentToAuthority }           from '../release-intent-authority-binding.mjs';

const CLI = resolve(process.cwd(), 'tools', 'supervised-release-candidate-controller.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const TS = '2026-05-17T12:00:00.000Z';

// Build valid fixtures once
_resetLedgerForTest();
const validCandidate = runRuntimePassGoldCandidateController({ fixture_mode: true });

function makeValidIntent(overrides = {}) {
  const raw = createSupervisedReleaseIntent({
    intent_id:             'intent-v420-test',
    requested_by:          'test-operator-420',
    requested_action:      'supervised_release_candidate',
    target_version:        'v42.0',
    target_branch:         'main',
    git_head:              'abc1234test420',
    runtime_candidate_id:  validCandidate.mission_id ?? 'mission-420',
    evidence_package_id:   validCandidate.ledger_entry_id ?? 'pkg-420',
    evidence_receipt_id:   validCandidate.evidence_receipt_id ?? 'receipt-420',
    evidence_source:       'go-core',
    authority_contract_id: 'authority-420-test',
    expires_at:            '2030-01-01T00:00:00.000Z',
    ...overrides,
  });
  return validateSupervisedReleaseIntent({ ...raw, ...overrides }, { _mock_now: TS });
}

const validIntent   = makeValidIntent();
const validBinding  = bindReleaseIntentToAuthority({ fixture_mode: true });

function makeReadyOptions(overrides = {}) {
  return {
    candidate_result:        validCandidate,
    release_intent:          validIntent,
    intent_authority_binding: validBinding,
    tests_verified:          true,
    policy_clean:            true,
    ...overrides,
  };
}

// Pre-compute shared results
_resetLedgerForTest();
const fixture    = runSupervisedReleaseCandidateController({ fixture_mode: true });
const readyRC    = runSupervisedReleaseCandidateController(makeReadyOptions());

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(SUPERVISED_RC_STATUSES),                                    '[A-01] statuses is array');
assert(SUPERVISED_RC_STATUSES.length === 6,                                      '[A-02] 6 statuses');
assert(SUPERVISED_RC_STATUSES.includes('SUPERVISED_RC_BLOCKED_CANDIDATE'),       '[A-03] BLOCKED_CANDIDATE');
assert(SUPERVISED_RC_STATUSES.includes('SUPERVISED_RC_BLOCKED_INTENT'),          '[A-04] BLOCKED_INTENT');
assert(SUPERVISED_RC_STATUSES.includes('SUPERVISED_RC_BLOCKED_AUTHORITY'),       '[A-05] BLOCKED_AUTHORITY');
assert(SUPERVISED_RC_STATUSES.includes('SUPERVISED_RC_BLOCKED_TESTS'),           '[A-06] BLOCKED_TESTS');
assert(SUPERVISED_RC_STATUSES.includes('SUPERVISED_RC_BLOCKED_POLICY'),          '[A-07] BLOCKED_POLICY');
assert(SUPERVISED_RC_STATUSES.includes('SUPERVISED_RC_READY'),                   '[A-08] READY');

// ─── Suite B: Blocked candidate ───────────────────────────────────
console.log('\n[Suite B] Blocked candidate');
const noCandidate = runSupervisedReleaseCandidateController(makeReadyOptions({ candidate_result: null }));
assert(noCandidate.supervised_release_candidate_status === 'SUPERVISED_RC_BLOCKED_CANDIDATE', '[B-01] null candidate → BLOCKED_CANDIDATE');
assert(noCandidate.supervised_release_candidate_ready  === false,                             '[B-02] ready=false');
assert(noCandidate.release_candidate                   === false,                             '[B-03] release_candidate=false');
const badCandidateNotReady = runSupervisedReleaseCandidateController(makeReadyOptions({
  candidate_result: { runtime_pass_gold_ready: false, runtime_pass_gold_status: 'RUNTIME_PASS_GOLD_SKIPPED', evidence_source: 'go-core' },
}));
assert(badCandidateNotReady.supervised_release_candidate_status === 'SUPERVISED_RC_BLOCKED_CANDIDATE', '[B-04] not-ready candidate → BLOCKED_CANDIDATE');
const badSource = runSupervisedReleaseCandidateController(makeReadyOptions({
  candidate_result: { ...validCandidate, evidence_source: 'backend' },
}));
assert(badSource.supervised_release_candidate_status === 'SUPERVISED_RC_BLOCKED_CANDIDATE',            '[B-05] bad source → BLOCKED_CANDIDATE');

// ─── Suite C: Blocked intent ──────────────────────────────────────
console.log('\n[Suite C] Blocked intent');
const noIntent = runSupervisedReleaseCandidateController(makeReadyOptions({ release_intent: null }));
assert(noIntent.supervised_release_candidate_status === 'SUPERVISED_RC_BLOCKED_INTENT', '[C-01] null intent → BLOCKED_INTENT');
assert(noIntent.blocking_reason                     === 'release_intent_not_valid',     '[C-02] blocking=release_intent_not_valid');
const invalidIntent = runSupervisedReleaseCandidateController(makeReadyOptions({
  release_intent: { release_intent_valid: false, intent_id: 'bad-intent', local_only: true, supervised_only: true },
}));
assert(invalidIntent.supervised_release_candidate_status === 'SUPERVISED_RC_BLOCKED_INTENT', '[C-03] invalid intent → BLOCKED_INTENT');

// ─── Suite D: Blocked authority ───────────────────────────────────
console.log('\n[Suite D] Blocked authority');
const noAuthority = runSupervisedReleaseCandidateController(makeReadyOptions({ intent_authority_binding: null }));
assert(noAuthority.supervised_release_candidate_status === 'SUPERVISED_RC_BLOCKED_AUTHORITY', '[D-01] null binding → BLOCKED_AUTHORITY');
assert(noAuthority.blocking_reason                     === 'intent_authority_binding_not_ready', '[D-02] blocking reason');
const notReadyBinding = runSupervisedReleaseCandidateController(makeReadyOptions({
  intent_authority_binding: { intent_authority_binding_ready: false, binding_id: null },
}));
assert(notReadyBinding.supervised_release_candidate_status === 'SUPERVISED_RC_BLOCKED_AUTHORITY', '[D-03] not-ready binding → BLOCKED_AUTHORITY');

// ─── Suite E: Blocked tests ───────────────────────────────────────
console.log('\n[Suite E] Blocked tests');
const testsNotVerified = runSupervisedReleaseCandidateController(makeReadyOptions({ tests_verified: false }));
assert(testsNotVerified.supervised_release_candidate_status === 'SUPERVISED_RC_BLOCKED_TESTS', '[E-01] tests_verified=false → BLOCKED_TESTS');
assert(testsNotVerified.blocking_reason                     === 'tests_not_verified',          '[E-02] blocking=tests_not_verified');
assert(testsNotVerified.release_candidate                   === false,                         '[E-03] release_candidate=false');
const testsDefault = runSupervisedReleaseCandidateController(makeReadyOptions({ tests_verified: undefined }));
assert(testsDefault.supervised_release_candidate_status === 'SUPERVISED_RC_BLOCKED_TESTS',    '[E-04] tests_verified=undefined → BLOCKED_TESTS');

// ─── Suite F: Blocked policy ──────────────────────────────────────
console.log('\n[Suite F] Blocked policy');
const policyDirty = runSupervisedReleaseCandidateController(makeReadyOptions({ policy_clean: false }));
assert(policyDirty.supervised_release_candidate_status === 'SUPERVISED_RC_BLOCKED_POLICY', '[F-01] policy_clean=false → BLOCKED_POLICY');
assert(policyDirty.blocking_reason                     === 'policy_not_clean',             '[F-02] blocking=policy_not_clean');
assert(policyDirty.release_candidate                   === false,                          '[F-03] release_candidate=false');

// ─── Suite G: Ready supervised RC ────────────────────────────────
console.log('\n[Suite G] Ready supervised RC');
assert(readyRC.supervised_release_candidate_status === 'SUPERVISED_RC_READY',    '[G-01] status=SUPERVISED_RC_READY');
assert(readyRC.supervised_release_candidate_ready  === true,                     '[G-02] ready=true');
assert(readyRC.release_candidate                   === true,                     '[G-03] release_candidate=true');
assert(readyRC.release_candidate_mode              === 'supervised',             '[G-04] mode=supervised');
assert(readyRC.supervised_only                     === true,                     '[G-05] supervised_only=true');
assert(readyRC.local_only                          === true,                     '[G-06] local_only=true');
assert(typeof readyRC.rc_id                        === 'string',                 '[G-07] rc_id is string');
assert(readyRC.rc_id.startsWith('supervised_rc_'),                               '[G-08] rc_id prefix');
assert(readyRC.intent_id                           === 'intent-v420-test',       '[G-09] intent_id echoed');
assert(readyRC.evidence_source                     === 'go-core',                '[G-10] evidence_source=go-core');
assert(readyRC.tests_verified                      === true,                     '[G-11] tests_verified=true');
assert(readyRC.policy_clean                        === true,                     '[G-12] policy_clean=true');
assert(readyRC.pass_gold_candidate                 === true,                     '[G-13] pass_gold_candidate=true');
assert(readyRC.candidate_is_local_only             === true,                     '[G-14] candidate_is_local_only=true');
assert(readyRC.blocking_reason                     === null,                     '[G-15] blocking_reason=null');
assert(readyRC.schema_version                      === 'v42.0',                  '[G-16] schema=v42.0');
// Deterministic rc_id
const readyRC2 = runSupervisedReleaseCandidateController(makeReadyOptions());
assert(readyRC.rc_id === readyRC2.rc_id,                                         '[G-17] rc_id deterministic');
// Custom rc_id
const customRC = runSupervisedReleaseCandidateController(makeReadyOptions({ rc_id: 'my-rc-id' }));
assert(customRC.rc_id === 'my-rc-id',                                            '[G-18] custom rc_id preserved');

// ─── Suite H: Fixture mode ────────────────────────────────────────
console.log('\n[Suite H] Fixture mode');
assert(fixture.supervised_release_candidate_status === 'SUPERVISED_RC_READY',  '[H-01] fixture → READY');
assert(fixture.supervised_release_candidate_ready  === true,                   '[H-02] ready=true');
assert(fixture.release_candidate                   === true,                   '[H-03] release_candidate=true');
assert(fixture.release_candidate_mode              === 'supervised',           '[H-04] mode=supervised');
assert(fixture.evidence_source                     === 'go-core',              '[H-05] source=go-core');
assert(fixture.supervised_only                     === true,                   '[H-06] supervised_only=true');
assert(fixture.local_only                          === true,                   '[H-07] local_only=true');

// ─── Suite I: Invariants ──────────────────────────────────────────
console.log('\n[Suite I] Invariants');
for (const [label, result] of [
  ['no_candidate', noCandidate], ['no_intent', noIntent], ['no_authority', noAuthority],
  ['tests_blocked', testsNotVerified], ['policy_blocked', policyDirty],
  ['ready', readyRC], ['fixture', fixture],
]) {
  assert(result.production_release_allowed === false, `[I] production_release_allowed=false (${label})`);
  assert(result.deploy_allowed             === false, `[I] deploy_allowed=false (${label})`);
  assert(result.promotion_allowed          === false, `[I] promotion_allowed=false (${label})`);
  assert(result.stable_allowed             === false, `[I] stable_allowed=false (${label})`);
  assert(result.tag_allowed                === false, `[I] tag_allowed=false (${label})`);
  assert(result.release_performed          === false, `[I] release_performed=false (${label})`);
}

// ─── Suite J: CLI ─────────────────────────────────────────────────
console.log('\n[Suite J] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                             '[J-01] default → exit 1');
assert(cliDefault.stdout.includes('SUPERVISED_RC_BLOCKED'),                  '[J-02] stdout BLOCKED');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                            '[J-03] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('SUPERVISED_RC_READY'),                   '[J-04] stdout READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                              '[J-05] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                     '[J-06] JSON parseable');
assert(parsed && parsed.supervised_release_candidate_ready === true,        '[J-07] JSON ready=true');
assert(parsed && parsed.release_candidate                  === true,        '[J-08] JSON release_candidate=true');
assert(parsed && parsed.release_candidate_mode             === 'supervised', '[J-09] JSON mode=supervised');
assert(parsed && parsed.production_release_allowed         === false,       '[J-10] JSON production=false');
assert(parsed && parsed.deploy_allowed                     === false,       '[J-11] JSON deploy=false');
assert(parsed && parsed.promotion_allowed                  === false,       '[J-12] JSON promotion=false');
assert(parsed && parsed.stable_allowed                     === false,       '[J-13] JSON stable=false');
assert(parsed && parsed.tag_allowed                        === false,       '[J-14] JSON tag=false');
assert(parsed && parsed.release_performed                  === false,       '[J-15] JSON release_performed=false');
assert(parsed && parsed.evidence_source                    === 'go-core',   '[J-16] JSON source=go-core');
assert(parsed && parsed.schema_version                     === 'v42.0',     '[J-17] JSON schema=v42.0');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nsupervised-release-candidate-controller: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
