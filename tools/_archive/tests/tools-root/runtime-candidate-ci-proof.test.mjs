#!/usr/bin/env node
/**
 * Runtime Candidate CI Proof — Unit Tests V39.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  generateRuntimeCandidateCIProof,
  CI_PROOF_STATUSES,
} from '../runtime-candidate-ci-proof.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-candidate-ci-proof.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

function mockReportReady(overrides = {}) {
  return {
    candidate_report_status: 'CANDIDATE_REPORT_READY',
    candidate_report_ready:  true,
    report_stub:             false,
    pass_gold_candidate:     true,
    candidate_is_local_only: true,
    runtime_stage_ready:     true,
    package_stage_ready:     true,
    binding_stage_ready:     true,
    mission_id:              'proof-mission-390',
    evidence_receipt_id:     'proof-receipt-390',
    evidence_source:         'go-core',
    package_hash:            'pkg_proof_hash_390',
    ledger_entry_id:         'ledger-proof-entry-390',
    ledger_seq:              1,
    report_generated_at:     '2026-05-17T00:00:00.000Z',
    deploy_allowed:          false,
    promotion_allowed:       false,
    ...overrides,
  };
}

const TS = '2026-05-17T00:00:00.000Z';

// Pre-compute results shared across suites
const def     = generateRuntimeCandidateCIProof();
const fixture = generateRuntimeCandidateCIProof({ fixture_mode: true, _mock_timestamp: TS });
const ready   = generateRuntimeCandidateCIProof({
  proof_requested:  true,
  candidate_report: mockReportReady(),
  _mock_timestamp:  TS,
});
const ready2  = generateRuntimeCandidateCIProof({
  proof_requested:  true,
  candidate_report: mockReportReady(),
  _mock_timestamp:  TS,
});

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CI_PROOF_STATUSES),                             '[A-01] statuses is array');
assert(CI_PROOF_STATUSES.length === 4,                               '[A-02] 4 statuses');
assert(CI_PROOF_STATUSES.includes('CI_PROOF_SKIPPED'),               '[A-03] SKIPPED');
assert(CI_PROOF_STATUSES.includes('CI_PROOF_BLOCKED_REPORT'),        '[A-04] BLOCKED_REPORT');
assert(CI_PROOF_STATUSES.includes('CI_PROOF_BLOCKED_HASH'),          '[A-05] BLOCKED_HASH');
assert(CI_PROOF_STATUSES.includes('CI_PROOF_READY'),                 '[A-06] READY');

// ─── Suite B: Default skipped ─────────────────────────────────────
console.log('\n[Suite B] Default skipped');
assert(def.ci_proof_status          === 'CI_PROOF_SKIPPED', '[B-01] default → SKIPPED');
assert(def.ci_proof_ready           === false,              '[B-02] ready=false');
assert(def.ci_proof_valid           === false,              '[B-03] ci_proof_valid=false');
assert(def.proof_stub               === true,               '[B-04] proof_stub=true');
assert(def.pass_gold_candidate      === false,              '[B-05] pass_gold_candidate=false');
assert(def.candidate_is_local_only  === true,               '[B-06] local_only=true');
assert(def.mission_id               === null,               '[B-07] mission_id=null');
assert(def.evidence_source          === null,               '[B-08] evidence_source=null');
assert(def.proof_hash               === null,               '[B-09] proof_hash=null');
assert(def.proof_timestamp          === null,               '[B-10] proof_timestamp=null');
assert(def.deploy_allowed           === false,              '[B-11] deploy=false');
assert(def.promotion_allowed        === false,              '[B-12] promotion=false');
assert(def.stable_allowed           === false,              '[B-13] stable=false');
assert(def.tag_allowed              === false,              '[B-14] tag_allowed=false');
assert(def.blocking_reason          === 'proof_not_requested', '[B-15] blocking_reason=proof_not_requested');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(def.deploy_allowed          === false, '[C-01] deploy=false (skipped)');
assert(def.promotion_allowed       === false, '[C-02] promotion=false (skipped)');
assert(fixture.deploy_allowed      === false, '[C-03] deploy=false (fixture)');
assert(fixture.promotion_allowed   === false, '[C-04] promotion=false (fixture)');
assert(fixture.stable_allowed      === false, '[C-05] stable=false (fixture)');
assert(fixture.tag_allowed         === false, '[C-06] tag_allowed=false (fixture)');
assert(ready.deploy_allowed        === false, '[C-07] deploy=false (ready)');
assert(ready.promotion_allowed     === false, '[C-08] promotion=false (ready)');
assert(ready.stable_allowed        === false, '[C-09] stable=false (ready)');
assert(ready.tag_allowed           === false, '[C-10] tag_allowed=false (ready)');
assert(def.candidate_is_local_only    === true, '[C-11] local_only=true (skipped)');
assert(fixture.candidate_is_local_only === true, '[C-12] local_only=true (fixture)');
assert(ready.candidate_is_local_only   === true, '[C-13] local_only=true (ready)');

// ─── Suite D: Report blocked ──────────────────────────────────────
console.log('\n[Suite D] Report blocked');
const noReport = generateRuntimeCandidateCIProof({ proof_requested: true });
assert(noReport.ci_proof_status === 'CI_PROOF_BLOCKED_REPORT', '[D-01] no report → BLOCKED_REPORT');
assert(noReport.ci_proof_ready  === false,                     '[D-02] ready=false');
assert(noReport.ci_proof_valid  === false,                     '[D-03] valid=false');
assert(noReport.deploy_allowed  === false,                     '[D-04] deploy=false');

const notReady = generateRuntimeCandidateCIProof({
  proof_requested:  true,
  candidate_report: mockReportReady({ candidate_report_ready: false, candidate_report_status: 'CANDIDATE_REPORT_SKIPPED' }),
});
assert(notReady.ci_proof_status === 'CI_PROOF_BLOCKED_REPORT', '[D-05] not-ready report → BLOCKED_REPORT');
assert(notReady.blocking_reason.includes('report_not_ready'),  '[D-06] blocking_reason has report_not_ready');

// ─── Suite E: Full valid → CI_PROOF_READY ────────────────────────
console.log('\n[Suite E] Full valid');
assert(ready.ci_proof_status         === 'CI_PROOF_READY',      '[E-01] status=CI_PROOF_READY');
assert(ready.ci_proof_ready          === true,                   '[E-02] ready=true');
assert(ready.ci_proof_valid          === true,                   '[E-03] ci_proof_valid=true');
assert(ready.proof_stub              === false,                  '[E-04] proof_stub=false');
assert(ready.pass_gold_candidate     === true,                   '[E-05] pass_gold_candidate=true');
assert(ready.candidate_is_local_only === true,                   '[E-06] local_only=true');
assert(ready.mission_id              === 'proof-mission-390',    '[E-07] mission_id echoed');
assert(ready.evidence_receipt_id     === 'proof-receipt-390',    '[E-08] receipt_id echoed');
assert(ready.evidence_source         === 'go-core',              '[E-09] evidence_source=go-core');
assert(ready.package_hash            === 'pkg_proof_hash_390',   '[E-10] package_hash echoed');
assert(ready.ledger_entry_id         === 'ledger-proof-entry-390','[E-11] ledger_entry_id echoed');
assert(typeof ready.proof_hash       === 'string',               '[E-12] proof_hash is string');
assert(ready.proof_hash.startsWith('proof_'),                    '[E-13] proof_hash starts with proof_');
assert(ready.proof_timestamp         === TS,                     '[E-14] proof_timestamp echoed');
assert(ready.stages_verified         === 3,                      '[E-15] stages_verified=3');
assert(ready.blocking_reason         === null,                   '[E-16] blocking_reason=null');
assert(ready.schema_version          === 'v39.0',                '[E-17] schema=v39.0');

// Proof hash is deterministic
assert(ready.proof_hash === ready2.proof_hash, '[E-18] proof_hash deterministic');

// ─── Suite F: Fixture mode ────────────────────────────────────────
console.log('\n[Suite F] Fixture mode');
assert(fixture.ci_proof_status         === 'CI_PROOF_READY', '[F-01] fixture → READY');
assert(fixture.ci_proof_ready          === true,             '[F-02] ready=true');
assert(fixture.ci_proof_valid          === true,             '[F-03] ci_proof_valid=true');
assert(fixture.proof_stub              === false,            '[F-04] proof_stub=false');
assert(fixture.pass_gold_candidate     === true,             '[F-05] pass_gold_candidate=true');
assert(fixture.evidence_source         === 'go-core',        '[F-06] evidence_source=go-core');
assert(typeof fixture.proof_hash       === 'string',         '[F-07] proof_hash string');
assert(fixture.proof_hash.startsWith('proof_'),              '[F-08] hash starts proof_');
assert(fixture.stages_verified         === 3,                '[F-09] stages_verified=3');

// Fixture hash deterministic with same timestamp
const fix2 = generateRuntimeCandidateCIProof({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture.proof_hash === fix2.proof_hash, '[F-10] fixture hash deterministic');

// ─── Suite G: CLI ─────────────────────────────────────────────────
console.log('\n[Suite G] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                         '[G-01] default → exit 1');
assert(cliDefault.stdout.includes('CI_PROOF_SKIPPED'),                   '[G-02] stdout SKIPPED');
assert(cliDefault.stdout.includes('deploy_allowed'),                     '[G-03] stdout deploy_allowed');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                        '[G-04] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('CI_PROOF_READY'),                    '[G-05] stdout READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                          '[G-06] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                 '[G-07] JSON parseable');
assert(parsed && parsed.ci_proof_ready          === true,               '[G-08] JSON ready=true');
assert(parsed && parsed.ci_proof_valid          === true,               '[G-09] JSON valid=true');
assert(parsed && parsed.pass_gold_candidate     === true,               '[G-10] JSON pass_gold=true');
assert(parsed && parsed.candidate_is_local_only === true,               '[G-11] JSON local_only=true');
assert(parsed && parsed.deploy_allowed          === false,              '[G-12] JSON deploy=false');
assert(parsed && parsed.promotion_allowed       === false,              '[G-13] JSON promotion=false');
assert(parsed && parsed.stable_allowed          === false,              '[G-14] JSON stable=false');
assert(parsed && parsed.tag_allowed             === false,              '[G-15] JSON tag_allowed=false');
assert(parsed && parsed.evidence_source         === 'go-core',          '[G-16] JSON evidence_source=go-core');
assert(parsed && typeof parsed.proof_hash       === 'string',           '[G-17] JSON proof_hash string');
assert(parsed && parsed.stages_verified         === 3,                  '[G-18] JSON stages_verified=3');

// ─── Suite H: Schema ──────────────────────────────────────────────
console.log('\n[Suite H] Schema');
assert(ready.schema_version   === 'v39.0', '[H-01] schema=v39.0 (READY)');
assert(def.schema_version     === 'v39.0', '[H-02] schema=v39.0 (SKIPPED)');
assert(fixture.schema_version === 'v39.0', '[H-03] schema=v39.0 (FIXTURE)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-candidate-ci-proof: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
