#!/usr/bin/env node
/**
 * Runtime Candidate Report — Unit Tests V38.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  generateRuntimeCandidateReport,
  CANDIDATE_REPORT_STATUSES,
} from '../runtime-candidate-report.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-candidate-report.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

function mockCandidateReady(overrides = {}) {
  return {
    runtime_pass_gold_status: 'RUNTIME_PASS_GOLD_CANDIDATE_READY',
    runtime_pass_gold_ready:  true,
    pass_gold_candidate:      true,
    candidate_is_local_only:  true,
    runtime_stage_ready:      true,
    package_stage_ready:      true,
    binding_stage_ready:      true,
    mission_id:               'report-mission-380',
    evidence_receipt_id:      'report-receipt-380',
    evidence_source:          'go-core',
    package_hash:             'pkg_report_hash_380',
    ledger_entry_id:          'ledger-report-entry-380',
    ledger_seq:               1,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
    tag_allowed:              false,
    blocking_reason:          null,
    ...overrides,
  };
}

// Pre-compute results shared across suites
const def     = generateRuntimeCandidateReport();
const fixture = generateRuntimeCandidateReport({ fixture_mode: true, _mock_timestamp: '2026-05-17T00:00:00.000Z' });
const ready   = generateRuntimeCandidateReport({
  report_requested: true,
  candidate_result: mockCandidateReady(),
  _mock_timestamp:  '2026-05-17T00:00:00.000Z',
});

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CANDIDATE_REPORT_STATUSES),                               '[A-01] statuses is array');
assert(CANDIDATE_REPORT_STATUSES.length === 3,                                 '[A-02] 3 statuses');
assert(CANDIDATE_REPORT_STATUSES.includes('CANDIDATE_REPORT_SKIPPED'),         '[A-03] SKIPPED');
assert(CANDIDATE_REPORT_STATUSES.includes('CANDIDATE_REPORT_BLOCKED_CANDIDATE'),'[A-04] BLOCKED_CANDIDATE');
assert(CANDIDATE_REPORT_STATUSES.includes('CANDIDATE_REPORT_READY'),           '[A-05] READY');

// ─── Suite B: Default skipped ─────────────────────────────────────
console.log('\n[Suite B] Default skipped');
assert(def.candidate_report_status === 'CANDIDATE_REPORT_SKIPPED', '[B-01] default → SKIPPED');
assert(def.candidate_report_ready  === false,                       '[B-02] ready=false');
assert(def.report_stub             === true,                        '[B-03] report_stub=true');
assert(def.pass_gold_candidate     === false,                       '[B-04] pass_gold_candidate=false');
assert(def.candidate_is_local_only === true,                        '[B-05] local_only=true');
assert(def.stage_summary           === null,                        '[B-06] stage_summary=null');
assert(def.mission_id              === null,                        '[B-07] mission_id=null');
assert(def.evidence_source         === null,                        '[B-08] evidence_source=null');
assert(def.deploy_allowed          === false,                       '[B-09] deploy=false');
assert(def.promotion_allowed       === false,                       '[B-10] promotion=false');
assert(def.stable_allowed          === false,                       '[B-11] stable=false');
assert(def.tag_allowed             === false,                       '[B-12] tag_allowed=false');
assert(def.blocking_reason         === 'report_not_requested',      '[B-13] blocking_reason=report_not_requested');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(def.deploy_allowed         === false, '[C-01] deploy=false (skipped)');
assert(def.promotion_allowed      === false, '[C-02] promotion=false (skipped)');
assert(fixture.deploy_allowed     === false, '[C-03] deploy=false (fixture)');
assert(fixture.promotion_allowed  === false, '[C-04] promotion=false (fixture)');
assert(fixture.stable_allowed     === false, '[C-05] stable=false (fixture)');
assert(fixture.tag_allowed        === false, '[C-06] tag_allowed=false (fixture)');
assert(ready.deploy_allowed       === false, '[C-07] deploy=false (ready)');
assert(ready.promotion_allowed    === false, '[C-08] promotion=false (ready)');
assert(ready.stable_allowed       === false, '[C-09] stable=false (ready)');
assert(ready.tag_allowed          === false, '[C-10] tag_allowed=false (ready)');
assert(def.candidate_is_local_only   === true, '[C-11] local_only=true (skipped)');
assert(fixture.candidate_is_local_only === true, '[C-12] local_only=true (fixture)');
assert(ready.candidate_is_local_only   === true, '[C-13] local_only=true (ready)');

// ─── Suite D: Candidate blocked ───────────────────────────────────
console.log('\n[Suite D] Candidate blocked');
const noCandidate = generateRuntimeCandidateReport({ report_requested: true });
assert(noCandidate.candidate_report_status === 'CANDIDATE_REPORT_BLOCKED_CANDIDATE', '[D-01] no candidate → BLOCKED_CANDIDATE');
assert(noCandidate.candidate_report_ready  === false,                                '[D-02] ready=false');
assert(noCandidate.deploy_allowed          === false,                                '[D-03] deploy=false');

const notReady = generateRuntimeCandidateReport({
  report_requested: true,
  candidate_result: mockCandidateReady({ runtime_pass_gold_ready: false, runtime_pass_gold_status: 'RUNTIME_PASS_GOLD_SKIPPED' }),
});
assert(notReady.candidate_report_status === 'CANDIDATE_REPORT_BLOCKED_CANDIDATE', '[D-04] not-ready → BLOCKED_CANDIDATE');
assert(notReady.blocking_reason.includes('candidate_not_ready'),                  '[D-05] blocking_reason has candidate_not_ready');

// ─── Suite E: Full valid → CANDIDATE_REPORT_READY ─────────────────
console.log('\n[Suite E] Full valid');
assert(ready.candidate_report_status  === 'CANDIDATE_REPORT_READY', '[E-01] status=CANDIDATE_REPORT_READY');
assert(ready.candidate_report_ready   === true,                     '[E-02] ready=true');
assert(ready.report_stub              === false,                    '[E-03] report_stub=false');
assert(ready.pass_gold_candidate      === true,                     '[E-04] pass_gold_candidate=true');
assert(ready.candidate_is_local_only  === true,                     '[E-05] local_only=true');
assert(ready.runtime_stage_ready      === true,                     '[E-06] runtime_stage_ready=true');
assert(ready.package_stage_ready      === true,                     '[E-07] package_stage_ready=true');
assert(ready.binding_stage_ready      === true,                     '[E-08] binding_stage_ready=true');
assert(ready.mission_id               === 'report-mission-380',     '[E-09] mission_id echoed');
assert(ready.evidence_receipt_id      === 'report-receipt-380',     '[E-10] receipt_id echoed');
assert(ready.evidence_source          === 'go-core',                '[E-11] evidence_source=go-core');
assert(ready.package_hash             === 'pkg_report_hash_380',    '[E-12] package_hash echoed');
assert(ready.ledger_entry_id          === 'ledger-report-entry-380','[E-13] ledger_entry_id echoed');
assert(ready.ledger_seq               === 1,                        '[E-14] ledger_seq=1');
assert(ready.report_generated_at      === '2026-05-17T00:00:00.000Z','[E-15] timestamp echoed');
assert(ready.blocking_reason          === null,                     '[E-16] blocking_reason=null');
assert(ready.schema_version           === 'v38.0',                  '[E-17] schema=v38.0');

// Stage summary structure
const ss = ready.stage_summary;
assert(ss !== null,                                    '[E-18] stage_summary not null');
assert(ss?.stage_1_runtime?.ready === true,            '[E-19] stage_1_runtime.ready=true');
assert(ss?.stage_2_package?.ready === true,            '[E-20] stage_2_package.ready=true');
assert(ss?.stage_3_binding?.ready === true,            '[E-21] stage_3_binding.ready=true');
assert(ss?.gates?.deploy_allowed  === false,           '[E-22] gates.deploy_allowed=false');
assert(ss?.gates?.promotion_allowed === false,         '[E-23] gates.promotion_allowed=false');

// ─── Suite F: Fixture mode ────────────────────────────────────────
console.log('\n[Suite F] Fixture mode');
assert(fixture.candidate_report_status === 'CANDIDATE_REPORT_READY', '[F-01] fixture → READY');
assert(fixture.candidate_report_ready  === true,                     '[F-02] ready=true');
assert(fixture.report_stub             === false,                    '[F-03] report_stub=false');
assert(fixture.pass_gold_candidate     === true,                     '[F-04] pass_gold_candidate=true');
assert(fixture.evidence_source         === 'go-core',                '[F-05] evidence_source=go-core');
assert(fixture.stage_summary           !== null,                     '[F-06] stage_summary not null');
assert(fixture.report_generated_at     === '2026-05-17T00:00:00.000Z','[F-07] timestamp from mock');

// ─── Suite G: CLI ─────────────────────────────────────────────────
console.log('\n[Suite G] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                           '[G-01] default → exit 1');
assert(cliDefault.stdout.includes('CANDIDATE_REPORT_SKIPPED'),             '[G-02] stdout SKIPPED');
assert(cliDefault.stdout.includes('deploy_allowed'),                       '[G-03] stdout deploy_allowed');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                          '[G-04] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('CANDIDATE_REPORT_READY'),              '[G-05] stdout READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                            '[G-06] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                   '[G-07] JSON parseable');
assert(parsed && parsed.candidate_report_ready   === true,                '[G-08] JSON ready=true');
assert(parsed && parsed.pass_gold_candidate      === true,                '[G-09] JSON pass_gold_candidate=true');
assert(parsed && parsed.candidate_is_local_only  === true,                '[G-10] JSON local_only=true');
assert(parsed && parsed.deploy_allowed           === false,               '[G-11] JSON deploy=false');
assert(parsed && parsed.promotion_allowed        === false,               '[G-12] JSON promotion=false');
assert(parsed && parsed.stable_allowed           === false,               '[G-13] JSON stable=false');
assert(parsed && parsed.tag_allowed              === false,               '[G-14] JSON tag_allowed=false');
assert(parsed && parsed.evidence_source          === 'go-core',           '[G-15] JSON evidence_source=go-core');
assert(parsed && parsed.stage_summary            !== null,                '[G-16] JSON stage_summary not null');

// ─── Suite H: Schema ──────────────────────────────────────────────
console.log('\n[Suite H] Schema');
assert(ready.schema_version   === 'v38.0', '[H-01] schema=v38.0 (READY)');
assert(def.schema_version     === 'v38.0', '[H-02] schema=v38.0 (SKIPPED)');
assert(fixture.schema_version === 'v38.0', '[H-03] schema=v38.0 (FIXTURE)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-candidate-report: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
