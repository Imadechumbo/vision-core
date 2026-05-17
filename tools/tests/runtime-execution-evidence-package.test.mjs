#!/usr/bin/env node
/**
 * Runtime Execution Evidence Package — Unit Tests V36.1
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  buildRuntimeExecutionEvidencePackage,
  EVIDENCE_PACKAGE_STATUSES,
} from '../runtime-execution-evidence-package.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-execution-evidence-package.mjs');
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
    mission_id:           'test-mission-361',
    evidence_receipt_id:  'test-receipt-361',
    evidence_source:      'go-core',
    runtime_probe_pass:   true,
    deploy_allowed:       false,
    promotion_allowed:    false,
    ...overrides,
  };
}

// Pre-compute results shared across suites
const def      = buildRuntimeExecutionEvidencePackage();
const fixture  = buildRuntimeExecutionEvidencePackage({ fixture_mode: true });
const ready    = buildRuntimeExecutionEvidencePackage({
  package_requested: true,
  runtime_result:    mockRuntimeReady(),
  _mock_timestamp:   '2026-05-17T00:00:00.000Z',
});
const ready2   = buildRuntimeExecutionEvidencePackage({
  package_requested: true,
  runtime_result:    mockRuntimeReady(),
  _mock_timestamp:   '2026-05-17T00:00:00.000Z',
});

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(EVIDENCE_PACKAGE_STATUSES),                                    '[A-01] statuses is array');
assert(EVIDENCE_PACKAGE_STATUSES.length === 6,                                      '[A-02] 6 statuses');
assert(EVIDENCE_PACKAGE_STATUSES.includes('EVIDENCE_PACKAGE_SKIPPED'),              '[A-03] SKIPPED');
assert(EVIDENCE_PACKAGE_STATUSES.includes('EVIDENCE_PACKAGE_BLOCKED_RUNTIME'),      '[A-04] BLOCKED_RUNTIME');
assert(EVIDENCE_PACKAGE_STATUSES.includes('EVIDENCE_PACKAGE_BLOCKED_RECEIPT'),      '[A-05] BLOCKED_RECEIPT');
assert(EVIDENCE_PACKAGE_STATUSES.includes('EVIDENCE_PACKAGE_BLOCKED_SOURCE'),       '[A-06] BLOCKED_SOURCE');
assert(EVIDENCE_PACKAGE_STATUSES.includes('EVIDENCE_PACKAGE_BLOCKED_HASH'),         '[A-07] BLOCKED_HASH');
assert(EVIDENCE_PACKAGE_STATUSES.includes('EVIDENCE_PACKAGE_READY'),                '[A-08] READY');

// ─── Suite B: Default skipped ─────────────────────────────────────
console.log('\n[Suite B] Default skipped');
assert(def.evidence_package_status === 'EVIDENCE_PACKAGE_SKIPPED', '[B-01] default → SKIPPED');
assert(def.evidence_package_ready  === false,                       '[B-02] ready=false');
assert(def.package_stub            === true,                        '[B-03] package_stub=true');
assert(def.mission_id              === null,                        '[B-04] mission_id=null');
assert(def.evidence_receipt_id     === null,                        '[B-05] receipt_id=null');
assert(def.evidence_source         === null,                        '[B-06] evidence_source=null');
assert(def.package_hash            === null,                        '[B-07] package_hash=null');
assert(def.deploy_allowed          === false,                       '[B-08] deploy=false');
assert(def.promotion_allowed       === false,                       '[B-09] promotion=false');
assert(def.stable_allowed          === false,                       '[B-10] stable=false');
assert(def.tag_allowed             === false,                       '[B-11] tag_allowed=false');
assert(def.blocking_reason         === 'package_not_requested',     '[B-12] blocking_reason=package_not_requested');

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

// ─── Suite D: Runtime blocked ─────────────────────────────────────
console.log('\n[Suite D] Runtime blocked');
const noRuntime = buildRuntimeExecutionEvidencePackage({ package_requested: true });
assert(noRuntime.evidence_package_status === 'EVIDENCE_PACKAGE_BLOCKED_RUNTIME', '[D-01] no runtime → BLOCKED_RUNTIME');
assert(noRuntime.evidence_package_ready  === false,                               '[D-02] ready=false');
assert(noRuntime.deploy_allowed          === false,                               '[D-03] deploy=false');

const notReady = buildRuntimeExecutionEvidencePackage({
  package_requested: true,
  runtime_result:    mockRuntimeReady({ local_runtime_ready: false, local_runtime_status: 'LOCAL_RUNTIME_SKIPPED' }),
});
assert(notReady.evidence_package_status === 'EVIDENCE_PACKAGE_BLOCKED_RUNTIME', '[D-04] not-ready runtime → BLOCKED_RUNTIME');
assert(notReady.blocking_reason.includes('runtime_not_ready'),                  '[D-05] blocking_reason includes runtime_not_ready');

// ─── Suite E: Receipt blocked ─────────────────────────────────────
console.log('\n[Suite E] Receipt blocked');
const noReceipt = buildRuntimeExecutionEvidencePackage({
  package_requested: true,
  runtime_result:    mockRuntimeReady({ evidence_receipt_id: null }),
});
assert(noReceipt.evidence_package_status === 'EVIDENCE_PACKAGE_BLOCKED_RECEIPT', '[E-01] no receipt → BLOCKED_RECEIPT');
assert(noReceipt.evidence_package_ready  === false,                               '[E-02] ready=false');

// ─── Suite F: Source blocked ──────────────────────────────────────
console.log('\n[Suite F] Source blocked');
const badSource = buildRuntimeExecutionEvidencePackage({
  package_requested: true,
  runtime_result:    mockRuntimeReady({ evidence_source: 'backend' }),
});
assert(badSource.evidence_package_status === 'EVIDENCE_PACKAGE_BLOCKED_SOURCE', '[F-01] bad source → BLOCKED_SOURCE');
assert(badSource.evidence_package_ready  === false,                              '[F-02] ready=false');
assert(badSource.blocking_reason.includes('evidence_source_not_go_core'),        '[F-03] blocking_reason includes source_not_go_core');

const nullSource = buildRuntimeExecutionEvidencePackage({
  package_requested: true,
  runtime_result:    mockRuntimeReady({ evidence_source: null }),
});
assert(nullSource.evidence_package_status === 'EVIDENCE_PACKAGE_BLOCKED_SOURCE', '[F-04] null source → BLOCKED_SOURCE');

// ─── Suite G: Full valid → EVIDENCE_PACKAGE_READY ─────────────────
console.log('\n[Suite G] Full valid');
assert(ready.evidence_package_status  === 'EVIDENCE_PACKAGE_READY', '[G-01] status=READY');
assert(ready.evidence_package_ready   === true,                      '[G-02] ready=true');
assert(ready.package_stub             === false,                     '[G-03] package_stub=false');
assert(ready.mission_id               === 'test-mission-361',        '[G-04] mission_id echoed');
assert(ready.evidence_receipt_id      === 'test-receipt-361',        '[G-05] receipt_id echoed');
assert(ready.evidence_source          === 'go-core',                 '[G-06] evidence_source=go-core');
assert(typeof ready.package_hash      === 'string',                  '[G-07] package_hash is string');
assert(ready.package_hash.startsWith('pkg_'),                        '[G-08] hash starts with pkg_');
assert(ready.package_hash.length > 4,                                '[G-09] hash has content');
assert(ready.package_timestamp        === '2026-05-17T00:00:00.000Z','[G-10] timestamp echoed');
assert(ready.blocking_reason          === null,                      '[G-11] blocking_reason=null');
assert(ready.schema_version           === 'v36.1',                   '[G-12] schema=v36.1');

// Hash is deterministic for same inputs
assert(ready.package_hash === ready2.package_hash, '[G-13] hash deterministic for same inputs');

// ─── Suite H: Fixture mode ────────────────────────────────────────
console.log('\n[Suite H] Fixture mode');
assert(fixture.evidence_package_status === 'EVIDENCE_PACKAGE_READY', '[H-01] fixture → READY');
assert(fixture.evidence_package_ready  === true,                      '[H-02] ready=true');
assert(fixture.package_stub            === false,                     '[H-03] package_stub=false');
assert(fixture.evidence_source         === 'go-core',                 '[H-04] evidence_source=go-core');
assert(typeof fixture.package_hash     === 'string',                  '[H-05] hash string');
assert(fixture.package_hash.startsWith('pkg_'),                       '[H-06] hash starts pkg_');
assert(fixture.deploy_allowed          === false,                     '[H-07] deploy=false');
assert(fixture.promotion_allowed       === false,                     '[H-08] promotion=false');

// Fixture with mock timestamp is deterministic
const fixtureTs1 = buildRuntimeExecutionEvidencePackage({ fixture_mode: true, _mock_timestamp: '2026-01-01T00:00:00.000Z' });
const fixtureTs2 = buildRuntimeExecutionEvidencePackage({ fixture_mode: true, _mock_timestamp: '2026-01-01T00:00:00.000Z' });
assert(fixtureTs1.package_hash === fixtureTs2.package_hash, '[H-09] fixture hash deterministic');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                           '[I-01] default → exit 1');
assert(cliDefault.stdout.includes('EVIDENCE_PACKAGE_SKIPPED'),             '[I-02] stdout SKIPPED');
assert(cliDefault.stdout.includes('deploy_allowed'),                       '[I-03] stdout deploy_allowed');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                          '[I-04] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('EVIDENCE_PACKAGE_READY'),              '[I-05] stdout READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                            '[I-06] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                   '[I-07] JSON parseable');
assert(parsed && parsed.evidence_package_ready  === true,                 '[I-08] JSON ready=true');
assert(parsed && parsed.deploy_allowed          === false,                '[I-09] JSON deploy=false');
assert(parsed && parsed.promotion_allowed       === false,                '[I-10] JSON promotion=false');
assert(parsed && parsed.stable_allowed          === false,                '[I-11] JSON stable=false');
assert(parsed && parsed.tag_allowed             === false,                '[I-12] JSON tag_allowed=false');
assert(parsed && parsed.evidence_source         === 'go-core',            '[I-13] JSON evidence_source=go-core');
assert(parsed && parsed.package_stub            === false,                '[I-14] JSON package_stub=false');
assert(parsed && typeof parsed.package_hash     === 'string',             '[I-15] JSON package_hash string');

// ─── Suite J: Schema ──────────────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(ready.schema_version   === 'v36.1', '[J-01] schema=v36.1 (READY)');
assert(def.schema_version     === 'v36.1', '[J-02] schema=v36.1 (SKIPPED)');
assert(fixture.schema_version === 'v36.1', '[J-03] schema=v36.1 (FIXTURE)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-execution-evidence-package: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
