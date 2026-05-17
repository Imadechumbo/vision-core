#!/usr/bin/env node
/**
 * Runtime PASS GOLD Candidate Controller — Unit Tests V37.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runRuntimePassGoldCandidateController,
  RUNTIME_PASS_GOLD_STATUSES,
  _resetLedgerForTest,
} from '../runtime-pass-gold-candidate-controller.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-pass-gold-candidate-controller.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

function mockRuntimeReady(overrides = {}) {
  return {
    local_runtime_status: 'LOCAL_RUNTIME_READY',
    local_runtime_ready:  true,
    backend_alive:        true,
    backend_stub:         false,
    mission_id:           'pg-mission-370',
    evidence_receipt_id:  'pg-receipt-370',
    evidence_source:      'go-core',
    runtime_probe_pass:   true,
    deploy_allowed:       false,
    promotion_allowed:    false,
    ...overrides,
  };
}

function mockPackageReady(overrides = {}) {
  return {
    evidence_package_status: 'EVIDENCE_PACKAGE_READY',
    evidence_package_ready:  true,
    package_stub:            false,
    mission_id:              'pg-mission-370',
    evidence_receipt_id:     'pg-receipt-370',
    evidence_source:         'go-core',
    package_hash:            'pkg_pg_test_hash_370',
    package_timestamp:       '2026-05-17T00:00:00.000Z',
    deploy_allowed:          false,
    promotion_allowed:       false,
    ...overrides,
  };
}

function mockBindingReady(overrides = {}) {
  return {
    ledger_binding_status: 'LEDGER_BINDING_READY',
    ledger_binding_ready:  true,
    ledger_entry_id:       'ledger-runtime-bridge-ready-1-mock',
    ledger_seq:            1,
    package_hash:          'pkg_pg_test_hash_370',
    mission_id:            'pg-mission-370',
    evidence_receipt_id:   'pg-receipt-370',
    evidence_source:       'go-core',
    total_ledger_entries:  1,
    deploy_allowed:        false,
    promotion_allowed:     false,
    ...overrides,
  };
}

// Pre-compute results shared across suites
_resetLedgerForTest();
const def = runRuntimePassGoldCandidateController();

_resetLedgerForTest();
const fixture = runRuntimePassGoldCandidateController({ fixture_mode: true });

_resetLedgerForTest();
const ready = runRuntimePassGoldCandidateController({
  candidate_requested: true,
  _mock_runtime:       mockRuntimeReady(),
  _mock_package:       mockPackageReady(),
  _mock_binding:       mockBindingReady(),
});

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RUNTIME_PASS_GOLD_STATUSES),                                    '[A-01] statuses is array');
assert(RUNTIME_PASS_GOLD_STATUSES.length === 5,                                      '[A-02] 5 statuses');
assert(RUNTIME_PASS_GOLD_STATUSES.includes('RUNTIME_PASS_GOLD_SKIPPED'),             '[A-03] SKIPPED');
assert(RUNTIME_PASS_GOLD_STATUSES.includes('RUNTIME_PASS_GOLD_BLOCKED_RUNTIME'),     '[A-04] BLOCKED_RUNTIME');
assert(RUNTIME_PASS_GOLD_STATUSES.includes('RUNTIME_PASS_GOLD_BLOCKED_PACKAGE'),     '[A-05] BLOCKED_PACKAGE');
assert(RUNTIME_PASS_GOLD_STATUSES.includes('RUNTIME_PASS_GOLD_BLOCKED_BINDING'),     '[A-06] BLOCKED_BINDING');
assert(RUNTIME_PASS_GOLD_STATUSES.includes('RUNTIME_PASS_GOLD_CANDIDATE_READY'),     '[A-07] CANDIDATE_READY');

// ─── Suite B: Default skipped ─────────────────────────────────────
console.log('\n[Suite B] Default skipped');
assert(def.runtime_pass_gold_status === 'RUNTIME_PASS_GOLD_SKIPPED', '[B-01] default → SKIPPED');
assert(def.runtime_pass_gold_ready  === false,                        '[B-02] ready=false');
assert(def.pass_gold_candidate      === false,                        '[B-03] pass_gold_candidate=false');
assert(def.candidate_is_local_only  === true,                         '[B-04] candidate_is_local_only=true');
assert(def.runtime_stage_ready      === false,                        '[B-05] runtime_stage_ready=false');
assert(def.package_stage_ready      === false,                        '[B-06] package_stage_ready=false');
assert(def.binding_stage_ready      === false,                        '[B-07] binding_stage_ready=false');
assert(def.mission_id               === null,                         '[B-08] mission_id=null');
assert(def.evidence_source          === null,                         '[B-09] evidence_source=null');
assert(def.deploy_allowed           === false,                        '[B-10] deploy=false');
assert(def.promotion_allowed        === false,                        '[B-11] promotion=false');
assert(def.stable_allowed           === false,                        '[B-12] stable=false');
assert(def.tag_allowed              === false,                        '[B-13] tag_allowed=false');
assert(def.blocking_reason          === 'candidate_not_requested',    '[B-14] blocking_reason=candidate_not_requested');

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
// candidate_is_local_only always true
assert(def.candidate_is_local_only    === true, '[C-11] candidate_is_local_only=true (skipped)');
assert(fixture.candidate_is_local_only === true, '[C-12] candidate_is_local_only=true (fixture)');
assert(ready.candidate_is_local_only   === true, '[C-13] candidate_is_local_only=true (ready)');

// ─── Suite D: Runtime blocked ─────────────────────────────────────
console.log('\n[Suite D] Runtime blocked');
_resetLedgerForTest();
const noRuntime = runRuntimePassGoldCandidateController({
  candidate_requested: true,
  _mock_runtime:       mockRuntimeReady({ local_runtime_ready: false, local_runtime_status: 'LOCAL_RUNTIME_SKIPPED' }),
  _mock_package:       mockPackageReady(),
  _mock_binding:       mockBindingReady(),
});
assert(noRuntime.runtime_pass_gold_status === 'RUNTIME_PASS_GOLD_BLOCKED_RUNTIME', '[D-01] not-ready runtime → BLOCKED_RUNTIME');
assert(noRuntime.runtime_pass_gold_ready  === false,                                '[D-02] ready=false');
assert(noRuntime.pass_gold_candidate      === false,                                '[D-03] pass_gold_candidate=false');
assert(noRuntime.deploy_allowed           === false,                                '[D-04] deploy=false');

// ─── Suite E: Package blocked ─────────────────────────────────────
console.log('\n[Suite E] Package blocked');
_resetLedgerForTest();
const noPackage = runRuntimePassGoldCandidateController({
  candidate_requested: true,
  _mock_runtime:       mockRuntimeReady(),
  _mock_package:       mockPackageReady({ evidence_package_ready: false, evidence_package_status: 'EVIDENCE_PACKAGE_SKIPPED' }),
  _mock_binding:       mockBindingReady(),
});
assert(noPackage.runtime_pass_gold_status === 'RUNTIME_PASS_GOLD_BLOCKED_PACKAGE', '[E-01] bad package → BLOCKED_PACKAGE');
assert(noPackage.runtime_pass_gold_ready  === false,                                '[E-02] ready=false');
assert(noPackage.runtime_stage_ready      === true,                                 '[E-03] runtime_stage_ready=true');
assert(noPackage.pass_gold_candidate      === false,                                '[E-04] pass_gold_candidate=false');

// ─── Suite F: Binding blocked ─────────────────────────────────────
console.log('\n[Suite F] Binding blocked');
_resetLedgerForTest();
const noBinding = runRuntimePassGoldCandidateController({
  candidate_requested: true,
  _mock_runtime:       mockRuntimeReady(),
  _mock_package:       mockPackageReady(),
  _mock_binding:       mockBindingReady({ ledger_binding_ready: false, ledger_binding_status: 'LEDGER_BINDING_SKIPPED' }),
});
assert(noBinding.runtime_pass_gold_status === 'RUNTIME_PASS_GOLD_BLOCKED_BINDING', '[F-01] bad binding → BLOCKED_BINDING');
assert(noBinding.runtime_pass_gold_ready  === false,                                '[F-02] ready=false');
assert(noBinding.runtime_stage_ready      === true,                                 '[F-03] runtime_stage_ready=true');
assert(noBinding.package_stage_ready      === true,                                 '[F-04] package_stage_ready=true');
assert(noBinding.pass_gold_candidate      === false,                                '[F-05] pass_gold_candidate=false');

// ─── Suite G: Full valid → RUNTIME_PASS_GOLD_CANDIDATE_READY ─────
console.log('\n[Suite G] Full valid');
assert(ready.runtime_pass_gold_status === 'RUNTIME_PASS_GOLD_CANDIDATE_READY', '[G-01] status=CANDIDATE_READY');
assert(ready.runtime_pass_gold_ready  === true,                                 '[G-02] ready=true');
assert(ready.pass_gold_candidate      === true,                                 '[G-03] pass_gold_candidate=true');
assert(ready.candidate_is_local_only  === true,                                 '[G-04] candidate_is_local_only=true');
assert(ready.runtime_stage_ready      === true,                                 '[G-05] runtime_stage_ready=true');
assert(ready.package_stage_ready      === true,                                 '[G-06] package_stage_ready=true');
assert(ready.binding_stage_ready      === true,                                 '[G-07] binding_stage_ready=true');
assert(ready.mission_id               === 'pg-mission-370',                     '[G-08] mission_id echoed');
assert(ready.evidence_receipt_id      === 'pg-receipt-370',                     '[G-09] receipt_id echoed');
assert(ready.evidence_source          === 'go-core',                            '[G-10] evidence_source=go-core');
assert(ready.package_hash             === 'pkg_pg_test_hash_370',               '[G-11] package_hash echoed');
assert(typeof ready.ledger_entry_id   === 'string',                             '[G-12] ledger_entry_id is string');
assert(ready.blocking_reason          === null,                                 '[G-13] blocking_reason=null');
assert(ready.schema_version           === 'v37.0',                              '[G-14] schema=v37.0');
assert(ready.deploy_allowed           === false,                                '[G-15] deploy=false');
assert(ready.promotion_allowed        === false,                                '[G-16] promotion=false');
assert(ready.stable_allowed           === false,                                '[G-17] stable=false');
assert(ready.tag_allowed              === false,                                '[G-18] tag_allowed=false');

// ─── Suite H: Fixture mode ────────────────────────────────────────
console.log('\n[Suite H] Fixture mode');
assert(fixture.runtime_pass_gold_status === 'RUNTIME_PASS_GOLD_CANDIDATE_READY', '[H-01] fixture → CANDIDATE_READY');
assert(fixture.runtime_pass_gold_ready  === true,                                 '[H-02] ready=true');
assert(fixture.pass_gold_candidate      === true,                                 '[H-03] pass_gold_candidate=true');
assert(fixture.evidence_source          === 'go-core',                            '[H-04] evidence_source=go-core');
assert(fixture.deploy_allowed           === false,                                '[H-05] deploy=false');
assert(fixture.candidate_is_local_only  === true,                                 '[H-06] local_only=true');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                              '[I-01] default → exit 1');
assert(cliDefault.stdout.includes('RUNTIME_PASS_GOLD_SKIPPED'),               '[I-02] stdout SKIPPED');
assert(cliDefault.stdout.includes('deploy_allowed'),                          '[I-03] stdout deploy_allowed');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                             '[I-04] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('RUNTIME_PASS_GOLD_CANDIDATE_READY'),       '[I-05] stdout CANDIDATE_READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                               '[I-06] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                      '[I-07] JSON parseable');
assert(parsed && parsed.runtime_pass_gold_ready === true,                    '[I-08] JSON ready=true');
assert(parsed && parsed.pass_gold_candidate     === true,                    '[I-09] JSON pass_gold_candidate=true');
assert(parsed && parsed.candidate_is_local_only === true,                    '[I-10] JSON local_only=true');
assert(parsed && parsed.deploy_allowed          === false,                   '[I-11] JSON deploy=false');
assert(parsed && parsed.promotion_allowed       === false,                   '[I-12] JSON promotion=false');
assert(parsed && parsed.stable_allowed          === false,                   '[I-13] JSON stable=false');
assert(parsed && parsed.tag_allowed             === false,                   '[I-14] JSON tag_allowed=false');
assert(parsed && parsed.evidence_source         === 'go-core',               '[I-15] JSON evidence_source=go-core');

// ─── Suite J: Schema ──────────────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(ready.schema_version   === 'v37.0', '[J-01] schema=v37.0 (READY)');
assert(def.schema_version     === 'v37.0', '[J-02] schema=v37.0 (SKIPPED)');
assert(fixture.schema_version === 'v37.0', '[J-03] schema=v37.0 (FIXTURE)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-pass-gold-candidate-controller: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
