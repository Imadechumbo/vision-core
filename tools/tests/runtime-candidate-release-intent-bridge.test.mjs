#!/usr/bin/env node
/**
 * Runtime Candidate → Release Intent Bridge — Unit Tests V41.2
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  createReleaseIntentFromRuntimeCandidate,
  validateRuntimeCandidateForReleaseIntent,
  renderRuntimeCandidateReleaseIntentBridge,
  RUNTIME_CANDIDATE_BRIDGE_STATUSES,
} from '../runtime-candidate-release-intent-bridge.mjs';
import { runRuntimePassGoldCandidateController } from '../runtime-pass-gold-candidate-controller.mjs';
import { _resetLedgerForTest } from '../runtime-execution-ledger-binding.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-candidate-release-intent-bridge.mjs');
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

// Build a fixture candidate once
_resetLedgerForTest();
const fixtureCandidate = runRuntimePassGoldCandidateController({ fixture_mode: true });

function makeValidCandidate(overrides = {}) {
  return {
    runtime_pass_gold_status: 'RUNTIME_PASS_GOLD_READY',
    runtime_pass_gold_ready:  true,
    pass_gold_candidate:      true,
    candidate_is_local_only:  true,
    evidence_source:          'go-core',
    evidence_receipt_id:      'receipt-bridge-test',
    evidence_package_id:      'pkg-bridge-test',
    ledger_entry_id:          'ledger-bridge-test',
    mission_id:               'mission-bridge-test',
    ...overrides,
  };
}

// Pre-compute shared results
_resetLedgerForTest();
const fixture = createReleaseIntentFromRuntimeCandidate({ fixture_mode: true, _mock_timestamp: TS });
const readyBridge = createReleaseIntentFromRuntimeCandidate({
  candidate_result:       makeValidCandidate(),
  authority_contract_id:  'authority-bridge-test',
  requested_by:           'test-operator-412',
  target_version:         'v41.2',
  target_branch:          'main',
  git_head:               'abc1234bridge',
  _mock_timestamp:        TS,
});

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RUNTIME_CANDIDATE_BRIDGE_STATUSES),                       '[A-01] statuses is array');
assert(RUNTIME_CANDIDATE_BRIDGE_STATUSES.length === 6,                         '[A-02] 6 statuses');
assert(RUNTIME_CANDIDATE_BRIDGE_STATUSES.includes('BRIDGE_BLOCKED_CANDIDATE'), '[A-03] BLOCKED_CANDIDATE');
assert(RUNTIME_CANDIDATE_BRIDGE_STATUSES.includes('BRIDGE_BLOCKED_EVIDENCE'),  '[A-04] BRIDGE_BLOCKED_EVIDENCE');
assert(RUNTIME_CANDIDATE_BRIDGE_STATUSES.includes('BRIDGE_BLOCKED_RECEIPT'),   '[A-05] BRIDGE_BLOCKED_RECEIPT');
assert(RUNTIME_CANDIDATE_BRIDGE_STATUSES.includes('BRIDGE_BLOCKED_SOURCE'),    '[A-06] BRIDGE_BLOCKED_SOURCE');
assert(RUNTIME_CANDIDATE_BRIDGE_STATUSES.includes('BRIDGE_BLOCKED_AUTHORITY'), '[A-07] BRIDGE_BLOCKED_AUTHORITY');
assert(RUNTIME_CANDIDATE_BRIDGE_STATUSES.includes('BRIDGE_READY'),             '[A-08] BRIDGE_READY');

// ─── Suite B: validateRuntimeCandidateForReleaseIntent ────────────
console.log('\n[Suite B] validateRuntimeCandidateForReleaseIntent');
assert(validateRuntimeCandidateForReleaseIntent(null).valid         === false, '[B-01] null → invalid');
assert(validateRuntimeCandidateForReleaseIntent(null).blocking_reason === 'candidate_missing', '[B-02] null blocking=candidate_missing');
assert(validateRuntimeCandidateForReleaseIntent(makeValidCandidate()).valid === true, '[B-03] valid candidate → valid');
const notReady = validateRuntimeCandidateForReleaseIntent(makeValidCandidate({ runtime_pass_gold_ready: false }));
assert(notReady.valid === false, '[B-04] not ready → invalid');
assert(notReady.blocking_reason.startsWith('candidate_not_ready'), '[B-05] blocking=candidate_not_ready');
const noPg = validateRuntimeCandidateForReleaseIntent(makeValidCandidate({ pass_gold_candidate: false }));
assert(noPg.valid === false, '[B-06] no pass_gold_candidate → invalid');
const badSrc = validateRuntimeCandidateForReleaseIntent(makeValidCandidate({ evidence_source: 'backend' }));
assert(badSrc.valid === false, '[B-07] bad source → invalid');
assert(badSrc.blocking_reason.startsWith('invalid_evidence_source'), '[B-08] blocking=invalid_evidence_source');
const noReceipt = validateRuntimeCandidateForReleaseIntent(makeValidCandidate({ evidence_receipt_id: null }));
assert(noReceipt.valid === false, '[B-09] no receipt → invalid');
assert(noReceipt.blocking_reason === 'missing_evidence_receipt_id', '[B-10] blocking=missing_evidence_receipt_id');
const notLocal = validateRuntimeCandidateForReleaseIntent(makeValidCandidate({ candidate_is_local_only: false }));
assert(notLocal.valid === false, '[B-11] not local_only → invalid');

// ─── Suite C: Blocked candidate ───────────────────────────────────
console.log('\n[Suite C] Blocked candidate');
const noCandidate = createReleaseIntentFromRuntimeCandidate({ candidate_result: null });
assert(noCandidate.runtime_candidate_bridge_status === 'BRIDGE_BLOCKED_CANDIDATE', '[C-01] null candidate → BLOCKED_CANDIDATE');
assert(noCandidate.runtime_candidate_bridge_ready  === false,                      '[C-02] ready=false');
assert(noCandidate.release_intent_created          === false,                      '[C-03] intent_created=false');
const candidateNotReady = createReleaseIntentFromRuntimeCandidate({
  candidate_result: makeValidCandidate({ runtime_pass_gold_ready: false, runtime_pass_gold_status: 'RUNTIME_PASS_GOLD_SKIPPED' }),
  authority_contract_id: 'auth-test',
});
assert(candidateNotReady.runtime_candidate_bridge_status === 'BRIDGE_BLOCKED_CANDIDATE', '[C-04] not-ready candidate → BLOCKED_CANDIDATE');

// ─── Suite D: Blocked source ──────────────────────────────────────
console.log('\n[Suite D] Blocked source');
const backendSource = createReleaseIntentFromRuntimeCandidate({
  candidate_result: makeValidCandidate({ evidence_source: 'backend' }),
  authority_contract_id: 'auth-test',
});
assert(backendSource.runtime_candidate_bridge_status === 'BRIDGE_BLOCKED_SOURCE', '[D-01] backend source → BRIDGE_BLOCKED_SOURCE');
assert(backendSource.blocking_reason.includes('invalid_evidence_source'),          '[D-02] blocking includes invalid_evidence_source');
assert(backendSource.deploy_allowed === false,                                     '[D-03] deploy=false (blocked source)');

// ─── Suite E: Blocked receipt ─────────────────────────────────────
console.log('\n[Suite E] Blocked receipt');
const noReceipt2 = createReleaseIntentFromRuntimeCandidate({
  candidate_result: makeValidCandidate({ evidence_receipt_id: null }),
  authority_contract_id: 'auth-test',
});
assert(noReceipt2.runtime_candidate_bridge_status === 'BRIDGE_BLOCKED_RECEIPT',  '[E-01] no receipt → BRIDGE_BLOCKED_RECEIPT');
assert(noReceipt2.blocking_reason === 'missing_evidence_receipt_id',              '[E-02] blocking=missing_evidence_receipt_id');
assert(noReceipt2.deploy_allowed  === false,                                      '[E-03] deploy=false');

// ─── Suite F: Blocked authority ───────────────────────────────────
console.log('\n[Suite F] Blocked authority');
const noAuthority = createReleaseIntentFromRuntimeCandidate({
  candidate_result: makeValidCandidate(),
  // No authority_contract_id
});
assert(noAuthority.runtime_candidate_bridge_status === 'BRIDGE_BLOCKED_AUTHORITY', '[F-01] no authority → BRIDGE_BLOCKED_AUTHORITY');
assert(noAuthority.blocking_reason === 'missing_authority_contract_id',            '[F-02] blocking=missing_authority_contract_id');
assert(noAuthority.deploy_allowed === false,                                        '[F-03] deploy=false');

// ─── Suite G: Ready bridge ────────────────────────────────────────
console.log('\n[Suite G] Ready bridge');
assert(readyBridge.runtime_candidate_bridge_status === 'BRIDGE_READY',            '[G-01] status=BRIDGE_READY');
assert(readyBridge.runtime_candidate_bridge_ready  === true,                      '[G-02] ready=true');
assert(readyBridge.release_intent_created          === true,                      '[G-03] release_intent_created=true');
assert(typeof readyBridge.intent_id                === 'string',                  '[G-04] intent_id is string');
assert(readyBridge.intent_id.startsWith('bridge_intent_'),                        '[G-05] intent_id starts bridge_intent_');
assert(readyBridge.runtime_candidate_id            === 'mission-bridge-test',     '[G-06] runtime_candidate_id from mission_id');
assert(readyBridge.evidence_receipt_id             === 'receipt-bridge-test',     '[G-07] evidence_receipt_id echoed');
assert(readyBridge.evidence_source                 === 'go-core',                 '[G-08] evidence_source=go-core');
assert(readyBridge.pass_gold_candidate             === true,                      '[G-09] pass_gold_candidate=true');
assert(readyBridge.candidate_is_local_only         === true,                      '[G-10] candidate_is_local_only=true');
assert(readyBridge.local_only                      === true,                      '[G-11] local_only=true');
assert(readyBridge.blocking_reason                 === null,                      '[G-12] blocking_reason=null');
assert(readyBridge.schema_version                  === 'v41.2',                   '[G-13] schema=v41.2');
assert(typeof readyBridge.intent                   === 'object',                  '[G-14] intent is object');
assert(readyBridge.intent?.release_intent_valid    === true,                      '[G-15] embedded intent valid');
// Deterministic intent_id
const readyBridge2 = createReleaseIntentFromRuntimeCandidate({
  candidate_result: makeValidCandidate(), authority_contract_id: 'authority-bridge-test',
  requested_by: 'test-operator-412', target_version: 'v41.2', target_branch: 'main',
  git_head: 'abc1234bridge', _mock_timestamp: TS,
});
assert(readyBridge.intent_id === readyBridge2.intent_id,                          '[G-16] intent_id deterministic');

// ─── Suite H: Fixture mode ────────────────────────────────────────
console.log('\n[Suite H] Fixture mode');
assert(fixture.runtime_candidate_bridge_status === 'BRIDGE_READY',    '[H-01] fixture → BRIDGE_READY');
assert(fixture.runtime_candidate_bridge_ready  === true,              '[H-02] ready=true');
assert(fixture.release_intent_created          === true,              '[H-03] intent created');
assert(fixture.evidence_source                 === 'go-core',         '[H-04] source=go-core');
assert(fixture.pass_gold_candidate             === true,              '[H-05] pass_gold_candidate=true');
assert(fixture.candidate_is_local_only         === true,              '[H-06] local_only=true');
assert(typeof fixture.intent_id                === 'string',          '[H-07] intent_id string');
assert(fixture.intent?.release_intent_valid    === true,              '[H-08] embedded intent valid');

// ─── Suite I: Invariants ──────────────────────────────────────────
console.log('\n[Suite I] Invariants');
for (const [label, result] of [
  ['no_candidate', noCandidate], ['backend_source', backendSource],
  ['no_receipt', noReceipt2], ['no_authority', noAuthority],
  ['ready', readyBridge], ['fixture', fixture],
]) {
  assert(result.deploy_allowed    === false, `[I] deploy=false (${label})`);
  assert(result.promotion_allowed === false, `[I] promotion=false (${label})`);
  assert(result.stable_allowed    === false, `[I] stable=false (${label})`);
  assert(result.tag_allowed       === false, `[I] tag=false (${label})`);
  assert(result.release_performed === false, `[I] release_performed=false (${label})`);
}

// ─── Suite J: renderRuntimeCandidateReleaseIntentBridge ───────────
console.log('\n[Suite J] render');
const rendered = renderRuntimeCandidateReleaseIntentBridge(readyBridge);
assert(typeof rendered === 'string',                           '[J-01] returns string');
assert(rendered.includes('BRIDGE_READY'),                     '[J-02] includes status');
assert(rendered.includes('deploy_allowed'),                   '[J-03] includes deploy_allowed');
assert(rendered.includes('evidence_source'),                  '[J-04] includes evidence_source');
assert(renderRuntimeCandidateReleaseIntentBridge(null) === 'No result provided.', '[J-05] null → fallback');

// ─── Suite K: CLI ─────────────────────────────────────────────────
console.log('\n[Suite K] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                           '[K-01] default → exit 1');
assert(cliDefault.stdout.includes('BRIDGE_BLOCKED'),                        '[K-02] stdout includes BRIDGE_BLOCKED');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                           '[K-03] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('BRIDGE_READY'),                         '[K-04] stdout BRIDGE_READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                             '[K-05] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                    '[K-06] JSON parseable');
assert(parsed && parsed.runtime_candidate_bridge_ready === true,           '[K-07] JSON ready=true');
assert(parsed && parsed.release_intent_created         === true,           '[K-08] JSON intent created');
assert(parsed && parsed.evidence_source                === 'go-core',      '[K-09] JSON source=go-core');
assert(parsed && parsed.deploy_allowed                 === false,          '[K-10] JSON deploy=false');
assert(parsed && parsed.promotion_allowed              === false,          '[K-11] JSON promotion=false');
assert(parsed && parsed.stable_allowed                 === false,          '[K-12] JSON stable=false');
assert(parsed && parsed.tag_allowed                    === false,          '[K-13] JSON tag=false');
assert(parsed && parsed.release_performed              === false,          '[K-14] JSON release_performed=false');
assert(parsed && parsed.schema_version                 === 'v41.2',        '[K-15] JSON schema=v41.2');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-candidate-release-intent-bridge: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
