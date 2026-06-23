#!/usr/bin/env node
/**
 * Supervised Release Intent Contract — Unit Tests V41.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  createSupervisedReleaseIntent,
  validateSupervisedReleaseIntent,
  normalizeSupervisedReleaseIntent,
  renderSupervisedReleaseIntentSummary,
  RELEASE_INTENT_STATUSES,
  ALLOWED_REQUESTED_ACTIONS,
} from '../supervised-release-intent-contract.mjs';

const CLI = resolve(process.cwd(), 'tools', 'supervised-release-intent-contract.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const TS      = '2026-05-17T12:00:00.000Z';
const FUTURE  = '2030-01-01T00:00:00.000Z';
const PAST    = '2026-01-01T00:00:00.000Z';

function makeValidIntent(overrides = {}) {
  return {
    intent_id:             'intent-v41-test',
    schema_version:        'v41.0',
    requested_by:          'test-operator',
    requested_action:      'supervised_release_candidate',
    target_version:        'v41.0',
    target_branch:         'main',
    git_head:              'abc1234test410',
    runtime_candidate_id:  'candidate-v41-test',
    evidence_package_id:   'pkg-v41-test',
    evidence_receipt_id:   'receipt-v41-test',
    evidence_source:       'go-core',
    authority_contract_id: 'authority-v41-test',
    created_at:            TS,
    expires_at:            FUTURE,
    local_only:            true,
    supervised_only:       true,
    ...overrides,
  };
}

// Pre-compute shared results
const validResult   = validateSupervisedReleaseIntent(makeValidIntent(), { _mock_now: TS });
const missingResult = validateSupervisedReleaseIntent(null);
const invalidResult = validateSupervisedReleaseIntent(makeValidIntent({ schema_version: 'v40.0' }), { _mock_now: TS });

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RELEASE_INTENT_STATUSES),                               '[A-01] statuses is array');
assert(RELEASE_INTENT_STATUSES.length === 7,                                 '[A-02] 7 statuses');
assert(RELEASE_INTENT_STATUSES.includes('RELEASE_INTENT_MISSING'),           '[A-03] MISSING');
assert(RELEASE_INTENT_STATUSES.includes('RELEASE_INTENT_INVALID'),           '[A-04] INVALID');
assert(RELEASE_INTENT_STATUSES.includes('RELEASE_INTENT_EXPIRED'),           '[A-05] EXPIRED');
assert(RELEASE_INTENT_STATUSES.includes('RELEASE_INTENT_EVIDENCE_MISSING'),  '[A-06] EVIDENCE_MISSING');
assert(RELEASE_INTENT_STATUSES.includes('RELEASE_INTENT_AUTHORITY_MISSING'), '[A-07] AUTHORITY_MISSING');
assert(RELEASE_INTENT_STATUSES.includes('RELEASE_INTENT_CONFLICTING'),       '[A-08] CONFLICTING');
assert(RELEASE_INTENT_STATUSES.includes('RELEASE_INTENT_VALID'),             '[A-09] VALID');
assert(Array.isArray(ALLOWED_REQUESTED_ACTIONS),                             '[A-10] actions is array');
assert(ALLOWED_REQUESTED_ACTIONS.length === 3,                               '[A-11] 3 actions');
assert(ALLOWED_REQUESTED_ACTIONS.includes('release_review'),                 '[A-12] release_review');
assert(ALLOWED_REQUESTED_ACTIONS.includes('supervised_release_candidate'),   '[A-13] supervised_release_candidate');
assert(ALLOWED_REQUESTED_ACTIONS.includes('manual_promotion_review'),        '[A-14] manual_promotion_review');

// ─── Suite B: createSupervisedReleaseIntent ───────────────────────
console.log('\n[Suite B] createSupervisedReleaseIntent');
const created = createSupervisedReleaseIntent({
  requested_by:          'b-operator',
  requested_action:      'release_review',
  target_version:        'v41.0-b',
  runtime_candidate_id:  'b-candidate',
  _mock_timestamp:       TS,
});
assert(typeof created === 'object' && created !== null,    '[B-01] returns object');
assert(created.schema_version === 'v41.0',                 '[B-02] schema_version=v41.0');
assert(typeof created.intent_id === 'string',              '[B-03] intent_id is string');
assert(created.intent_id.startsWith('intent_'),            '[B-04] intent_id starts intent_');
assert(created.local_only === true,                        '[B-05] local_only=true default');
assert(created.supervised_only === true,                   '[B-06] supervised_only=true default');
assert(created.requested_by === 'b-operator',              '[B-07] requested_by echoed');
assert(created.requested_action === 'release_review',      '[B-08] requested_action echoed');
assert(created.target_version === 'v41.0-b',               '[B-09] target_version echoed');
assert(created.runtime_candidate_id === 'b-candidate',     '[B-10] runtime_candidate_id echoed');
assert(created.created_at === TS,                          '[B-11] created_at=mock_ts');
assert(created.expires_at > TS,                            '[B-12] expires_at after created_at');
// Custom intent_id preserved
const customId = createSupervisedReleaseIntent({ intent_id: 'my-custom-id' });
assert(customId.intent_id === 'my-custom-id',              '[B-13] custom intent_id preserved');
// Explicit local_only=false preserved in factory (factory doesn't enforce, validate does)
const localFalseCreated = createSupervisedReleaseIntent({ local_only: false });
assert(localFalseCreated.local_only === false,             '[B-14] factory preserves explicit local_only=false');

// ─── Suite C: normalizeSupervisedReleaseIntent ────────────────────
console.log('\n[Suite C] normalizeSupervisedReleaseIntent');
assert(normalizeSupervisedReleaseIntent(null)       === null,  '[C-01] null → null');
assert(normalizeSupervisedReleaseIntent(undefined)  === null,  '[C-02] undefined → null');
assert(normalizeSupervisedReleaseIntent('string')   === null,  '[C-03] string → null');
const norm1 = normalizeSupervisedReleaseIntent({});
assert(norm1.schema_version  === 'v41.0', '[C-04] schema_version filled in');
assert(norm1.local_only      === true,    '[C-05] local_only filled in');
assert(norm1.supervised_only === true,    '[C-06] supervised_only filled in');
// Explicit false preserved by normalize
const norm2 = normalizeSupervisedReleaseIntent({ local_only: false, supervised_only: false });
assert(norm2.local_only      === false,   '[C-07] explicit local_only=false preserved');
assert(norm2.supervised_only === false,   '[C-08] explicit supervised_only=false preserved');
// Explicit schema preserved by normalize
const norm3 = normalizeSupervisedReleaseIntent({ schema_version: 'v40.0' });
assert(norm3.schema_version  === 'v40.0', '[C-09] explicit schema_version preserved');

// ─── Suite D: Missing intent ──────────────────────────────────────
console.log('\n[Suite D] Missing intent');
assert(missingResult.release_intent_status === 'RELEASE_INTENT_MISSING', '[D-01] null → RELEASE_INTENT_MISSING');
assert(missingResult.release_intent_valid  === false,                     '[D-02] valid=false');
assert(missingResult.blocking_reason       === 'intent_missing',          '[D-03] blocking=intent_missing');
assert(validateSupervisedReleaseIntent(undefined).release_intent_status === 'RELEASE_INTENT_MISSING', '[D-04] undefined → MISSING');
assert(validateSupervisedReleaseIntent('string').release_intent_status  === 'RELEASE_INTENT_MISSING', '[D-05] string → MISSING');

// ─── Suite E: Invalid schema ──────────────────────────────────────
console.log('\n[Suite E] Invalid schema');
assert(invalidResult.release_intent_status === 'RELEASE_INTENT_INVALID',      '[E-01] wrong schema → INVALID');
assert(invalidResult.blocking_reason.includes('invalid_schema'),               '[E-02] blocking includes invalid_schema');
assert(invalidResult.release_intent_valid  === false,                          '[E-03] valid=false');
const badAction = validateSupervisedReleaseIntent(makeValidIntent({ requested_action: 'deploy_now' }), { _mock_now: TS });
assert(badAction.release_intent_status === 'RELEASE_INTENT_INVALID',           '[E-04] bad action → INVALID');
assert(badAction.blocking_reason.includes('invalid_requested_action'),         '[E-05] blocking includes invalid_requested_action');
const missingBy = validateSupervisedReleaseIntent(makeValidIntent({ requested_by: '' }), { _mock_now: TS });
assert(missingBy.release_intent_status === 'RELEASE_INTENT_INVALID',           '[E-06] missing requested_by → INVALID');
assert(missingBy.blocking_reason.includes('missing_field'),                    '[E-07] blocking includes missing_field');
const missingGitHead = validateSupervisedReleaseIntent(makeValidIntent({ git_head: null }), { _mock_now: TS });
assert(missingGitHead.release_intent_status === 'RELEASE_INTENT_INVALID',      '[E-08] null git_head → INVALID');

// ─── Suite F: local_only enforcement ─────────────────────────────
console.log('\n[Suite F] local_only enforcement');
const localFalse = validateSupervisedReleaseIntent(makeValidIntent({ local_only: false }), { _mock_now: TS });
assert(localFalse.release_intent_status === 'RELEASE_INTENT_INVALID', '[F-01] local_only=false → INVALID');
assert(localFalse.blocking_reason       === 'local_only_required',    '[F-02] blocking=local_only_required');
assert(localFalse.release_intent_valid  === false,                    '[F-03] valid=false');
const localMissing = validateSupervisedReleaseIntent(makeValidIntent({ local_only: undefined }), { _mock_now: TS });
assert(localMissing.release_intent_status === 'RELEASE_INTENT_INVALID', '[F-04] local_only missing → INVALID');
assert(localMissing.blocking_reason       === 'local_only_required',    '[F-05] blocking=local_only_required');

// ─── Suite G: supervised_only enforcement ────────────────────────
console.log('\n[Suite G] supervised_only enforcement');
const supFalse = validateSupervisedReleaseIntent(makeValidIntent({ supervised_only: false }), { _mock_now: TS });
assert(supFalse.release_intent_status === 'RELEASE_INTENT_INVALID',   '[G-01] supervised_only=false → INVALID');
assert(supFalse.blocking_reason       === 'supervised_only_required', '[G-02] blocking=supervised_only_required');
assert(supFalse.release_intent_valid  === false,                      '[G-03] valid=false');
const supMissing = validateSupervisedReleaseIntent(makeValidIntent({ supervised_only: null }), { _mock_now: TS });
assert(supMissing.release_intent_status === 'RELEASE_INTENT_INVALID', '[G-04] supervised_only missing → INVALID');

// ─── Suite H: Expiry ──────────────────────────────────────────────
console.log('\n[Suite H] Expiry');
const expired = validateSupervisedReleaseIntent(makeValidIntent({ expires_at: PAST }), { _mock_now: TS });
assert(expired.release_intent_status === 'RELEASE_INTENT_EXPIRED',     '[H-01] past expires_at → EXPIRED');
assert(expired.blocking_reason.includes('intent_expired'),              '[H-02] blocking includes intent_expired');
assert(expired.release_intent_valid  === false,                         '[H-03] valid=false');
assert(expired.deploy_allowed        === false,                         '[H-04] deploy=false on expired');
// Non-expired intent passes expiry check (tested via validResult)
assert(validResult.release_intent_status !== 'RELEASE_INTENT_EXPIRED', '[H-05] future expires_at not expired');

// ─── Suite I: Evidence validation ────────────────────────────────
console.log('\n[Suite I] Evidence validation');
const backendSource = validateSupervisedReleaseIntent(makeValidIntent({ evidence_source: 'backend' }), { _mock_now: TS });
assert(backendSource.release_intent_status === 'RELEASE_INTENT_EVIDENCE_MISSING',         '[I-01] source=backend → EVIDENCE_MISSING');
assert(backendSource.blocking_reason.includes('invalid_evidence_source'),                  '[I-02] blocking includes invalid_evidence_source');
const nullSource = validateSupervisedReleaseIntent(makeValidIntent({ evidence_source: null }), { _mock_now: TS });
assert(nullSource.release_intent_status    === 'RELEASE_INTENT_EVIDENCE_MISSING',         '[I-03] source=null → EVIDENCE_MISSING');
const noCandidate = validateSupervisedReleaseIntent(makeValidIntent({ runtime_candidate_id: null }), { _mock_now: TS });
assert(noCandidate.release_intent_status   === 'RELEASE_INTENT_EVIDENCE_MISSING',         '[I-04] no runtime_candidate_id → EVIDENCE_MISSING');
assert(noCandidate.blocking_reason         === 'missing_evidence_fields',                  '[I-05] blocking=missing_evidence_fields');
const noPkg = validateSupervisedReleaseIntent(makeValidIntent({ evidence_package_id: '' }), { _mock_now: TS });
assert(noPkg.release_intent_status         === 'RELEASE_INTENT_EVIDENCE_MISSING',         '[I-06] no evidence_package_id → EVIDENCE_MISSING');
const noReceipt = validateSupervisedReleaseIntent(makeValidIntent({ evidence_receipt_id: '' }), { _mock_now: TS });
assert(noReceipt.release_intent_status     === 'RELEASE_INTENT_EVIDENCE_MISSING',         '[I-07] no evidence_receipt_id → EVIDENCE_MISSING');

// ─── Suite J: Authority validation ───────────────────────────────
console.log('\n[Suite J] Authority validation');
const noAuthority = validateSupervisedReleaseIntent(makeValidIntent({ authority_contract_id: null }), { _mock_now: TS });
assert(noAuthority.release_intent_status === 'RELEASE_INTENT_AUTHORITY_MISSING', '[J-01] no authority → AUTHORITY_MISSING');
assert(noAuthority.blocking_reason       === 'missing_authority_contract_id',    '[J-02] blocking=missing_authority_contract_id');
assert(noAuthority.release_intent_valid  === false,                              '[J-03] valid=false');
const emptyAuthority = validateSupervisedReleaseIntent(makeValidIntent({ authority_contract_id: '' }), { _mock_now: TS });
assert(emptyAuthority.release_intent_status === 'RELEASE_INTENT_AUTHORITY_MISSING', '[J-04] empty authority → AUTHORITY_MISSING');

// ─── Suite K: Valid intent ────────────────────────────────────────
console.log('\n[Suite K] Valid intent');
assert(validResult.release_intent_status  === 'RELEASE_INTENT_VALID',      '[K-01] status=RELEASE_INTENT_VALID');
assert(validResult.release_intent_valid   === true,                         '[K-02] release_intent_valid=true');
assert(validResult.blocking_reason        === null,                         '[K-03] blocking_reason=null');
assert(validResult.intent_id              === 'intent-v41-test',            '[K-04] intent_id echoed');
assert(validResult.requested_by           === 'test-operator',              '[K-05] requested_by echoed');
assert(validResult.requested_action       === 'supervised_release_candidate','[K-06] requested_action echoed');
assert(validResult.target_version         === 'v41.0',                      '[K-07] target_version echoed');
assert(validResult.target_branch          === 'main',                       '[K-08] target_branch echoed');
assert(validResult.git_head               === 'abc1234test410',             '[K-09] git_head echoed');
assert(validResult.runtime_candidate_id   === 'candidate-v41-test',         '[K-10] runtime_candidate_id echoed');
assert(validResult.evidence_package_id    === 'pkg-v41-test',               '[K-11] evidence_package_id echoed');
assert(validResult.evidence_receipt_id    === 'receipt-v41-test',           '[K-12] evidence_receipt_id echoed');
assert(validResult.evidence_source        === 'go-core',                    '[K-13] evidence_source=go-core');
assert(validResult.authority_contract_id  === 'authority-v41-test',         '[K-14] authority_contract_id echoed');
assert(validResult.local_only             === true,                         '[K-15] local_only=true');
assert(validResult.supervised_only        === true,                         '[K-16] supervised_only=true');
assert(validResult.schema_version         === 'v41.0',                      '[K-17] schema_version=v41.0');

// ─── Suite L: Invariants across all states ────────────────────────
console.log('\n[Suite L] Invariants');
assert(missingResult.deploy_allowed      === false, '[L-01] deploy=false (missing)');
assert(missingResult.promotion_allowed   === false, '[L-02] promotion=false (missing)');
assert(missingResult.stable_allowed      === false, '[L-03] stable=false (missing)');
assert(missingResult.tag_allowed         === false, '[L-04] tag=false (missing)');
assert(missingResult.release_performed   === false, '[L-05] release_performed=false (missing)');
assert(invalidResult.deploy_allowed      === false, '[L-06] deploy=false (invalid)');
assert(invalidResult.promotion_allowed   === false, '[L-07] promotion=false (invalid)');
assert(expired.deploy_allowed            === false, '[L-08] deploy=false (expired)');
assert(backendSource.deploy_allowed      === false, '[L-09] deploy=false (evidence missing)');
assert(noAuthority.deploy_allowed        === false, '[L-10] deploy=false (authority missing)');
assert(validResult.deploy_allowed        === false, '[L-11] deploy=false (valid)');
assert(validResult.promotion_allowed     === false, '[L-12] promotion=false (valid)');
assert(validResult.stable_allowed        === false, '[L-13] stable=false (valid)');
assert(validResult.tag_allowed           === false, '[L-14] tag=false (valid)');
assert(validResult.release_performed     === false, '[L-15] release_performed=false (valid)');

// ─── Suite M: renderSupervisedReleaseIntentSummary ────────────────
console.log('\n[Suite M] renderSupervisedReleaseIntentSummary');
const summary = renderSupervisedReleaseIntentSummary(validResult);
assert(typeof summary        === 'string',                         '[M-01] returns string');
assert(summary.includes('RELEASE_INTENT_VALID'),                   '[M-02] includes status');
assert(summary.includes('deploy_allowed'),                         '[M-03] includes deploy_allowed');
assert(summary.includes('blocking_reason'),                        '[M-04] includes blocking_reason');
assert(summary.includes('intent-v41-test'),                        '[M-05] includes intent_id');
const summaryNull = renderSupervisedReleaseIntentSummary(null);
assert(summaryNull === 'No result provided.',                       '[M-06] null → fallback string');
const summaryMissing = renderSupervisedReleaseIntentSummary(missingResult);
assert(summaryMissing.includes('RELEASE_INTENT_MISSING'),          '[M-07] missing summary includes status');

// ─── Suite N: CLI ─────────────────────────────────────────────────
console.log('\n[Suite N] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                  '[N-01] default → exit 1');
assert(cliDefault.stdout.includes('RELEASE_INTENT_MISSING'),       '[N-02] stdout MISSING');
assert(cliDefault.stdout.includes('deploy_allowed'),               '[N-03] stdout deploy_allowed');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                  '[N-04] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('RELEASE_INTENT_VALID'),         '[N-05] stdout VALID');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                     '[N-06] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                            '[N-07] JSON parseable');
assert(parsed && parsed.release_intent_valid   === true,           '[N-08] JSON valid=true');
assert(parsed && parsed.deploy_allowed         === false,          '[N-09] JSON deploy=false');
assert(parsed && parsed.promotion_allowed      === false,          '[N-10] JSON promotion=false');
assert(parsed && parsed.stable_allowed         === false,          '[N-11] JSON stable=false');
assert(parsed && parsed.tag_allowed            === false,          '[N-12] JSON tag=false');
assert(parsed && parsed.evidence_source        === 'go-core',      '[N-13] JSON evidence_source=go-core');
assert(parsed && parsed.local_only             === true,           '[N-14] JSON local_only=true');
assert(parsed && parsed.supervised_only        === true,           '[N-15] JSON supervised_only=true');
assert(parsed && parsed.release_performed      === false,          '[N-16] JSON release_performed=false');
assert(parsed && parsed.schema_version         === 'v41.0',        '[N-17] JSON schema=v41.0');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nsupervised-release-intent-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
