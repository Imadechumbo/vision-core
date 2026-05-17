#!/usr/bin/env node
/**
 * Runtime Execution Ledger Binding — Unit Tests V36.2
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  bindRuntimeExecutionToLedger,
  LEDGER_BINDING_STATUSES,
  _resetLedgerForTest,
} from '../runtime-execution-ledger-binding.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-execution-ledger-binding.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

function mockPackageReady(overrides = {}) {
  return {
    evidence_package_status: 'EVIDENCE_PACKAGE_READY',
    evidence_package_ready:  true,
    package_stub:            false,
    mission_id:              'bind-mission-362',
    evidence_receipt_id:     'bind-receipt-362',
    evidence_source:         'go-core',
    package_hash:            'pkg_test_hash_abc123',
    package_timestamp:       '2026-05-17T00:00:00.000Z',
    deploy_allowed:          false,
    promotion_allowed:       false,
    ...overrides,
  };
}

// Pre-compute results — reset ledger before each to avoid cross-test pollution
_resetLedgerForTest();
const def = bindRuntimeExecutionToLedger();

_resetLedgerForTest();
const fixture = bindRuntimeExecutionToLedger({
  fixture_mode:    true,
  _mock_timestamp: '2026-05-17T00:00:00.000Z',
});

_resetLedgerForTest();
const ready = bindRuntimeExecutionToLedger({
  binding_requested: true,
  evidence_package:  mockPackageReady(),
});

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(LEDGER_BINDING_STATUSES),                                    '[A-01] statuses is array');
assert(LEDGER_BINDING_STATUSES.length === 4,                                      '[A-02] 4 statuses');
assert(LEDGER_BINDING_STATUSES.includes('LEDGER_BINDING_SKIPPED'),                '[A-03] SKIPPED');
assert(LEDGER_BINDING_STATUSES.includes('LEDGER_BINDING_BLOCKED_PACKAGE'),        '[A-04] BLOCKED_PACKAGE');
assert(LEDGER_BINDING_STATUSES.includes('LEDGER_BINDING_BLOCKED_APPEND'),         '[A-05] BLOCKED_APPEND');
assert(LEDGER_BINDING_STATUSES.includes('LEDGER_BINDING_READY'),                  '[A-06] READY');

// ─── Suite B: Default skipped ─────────────────────────────────────
console.log('\n[Suite B] Default skipped');
assert(def.ledger_binding_status === 'LEDGER_BINDING_SKIPPED', '[B-01] default → SKIPPED');
assert(def.ledger_binding_ready  === false,                    '[B-02] ready=false');
assert(def.ledger_entry_id       === null,                     '[B-03] entry_id=null');
assert(def.ledger_seq            === null,                     '[B-04] seq=null');
assert(def.package_hash          === null,                     '[B-05] package_hash=null');
assert(def.mission_id            === null,                     '[B-06] mission_id=null');
assert(def.evidence_source       === null,                     '[B-07] evidence_source=null');
assert(def.deploy_allowed        === false,                    '[B-08] deploy=false');
assert(def.promotion_allowed     === false,                    '[B-09] promotion=false');
assert(def.stable_allowed        === false,                    '[B-10] stable=false');
assert(def.tag_allowed           === false,                    '[B-11] tag_allowed=false');
assert(def.blocking_reason       === 'binding_not_requested',  '[B-12] blocking_reason=binding_not_requested');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(def.deploy_allowed        === false, '[C-01] deploy=false (skipped)');
assert(def.promotion_allowed     === false, '[C-02] promotion=false (skipped)');
assert(fixture.deploy_allowed    === false, '[C-03] deploy=false (fixture)');
assert(fixture.promotion_allowed === false, '[C-04] promotion=false (fixture)');
assert(fixture.stable_allowed    === false, '[C-05] stable=false (fixture)');
assert(fixture.tag_allowed       === false, '[C-06] tag_allowed=false (fixture)');
assert(ready.deploy_allowed      === false, '[C-07] deploy=false (ready)');
assert(ready.promotion_allowed   === false, '[C-08] promotion=false (ready)');
assert(ready.stable_allowed      === false, '[C-09] stable=false (ready)');
assert(ready.tag_allowed         === false, '[C-10] tag_allowed=false (ready)');

// ─── Suite D: Package blocked ─────────────────────────────────────
console.log('\n[Suite D] Package blocked');
_resetLedgerForTest();
const noPackage = bindRuntimeExecutionToLedger({ binding_requested: true });
assert(noPackage.ledger_binding_status === 'LEDGER_BINDING_BLOCKED_PACKAGE', '[D-01] no package → BLOCKED_PACKAGE');
assert(noPackage.ledger_binding_ready  === false,                             '[D-02] ready=false');
assert(noPackage.deploy_allowed        === false,                             '[D-03] deploy=false');

_resetLedgerForTest();
const notReady = bindRuntimeExecutionToLedger({
  binding_requested: true,
  evidence_package:  mockPackageReady({ evidence_package_ready: false, evidence_package_status: 'EVIDENCE_PACKAGE_SKIPPED' }),
});
assert(notReady.ledger_binding_status === 'LEDGER_BINDING_BLOCKED_PACKAGE', '[D-04] not-ready pkg → BLOCKED_PACKAGE');
assert(notReady.blocking_reason.includes('package_not_ready'),              '[D-05] blocking_reason includes package_not_ready');

// ─── Suite E: Full valid → LEDGER_BINDING_READY ───────────────────
console.log('\n[Suite E] Full valid');
assert(ready.ledger_binding_status  === 'LEDGER_BINDING_READY', '[E-01] status=LEDGER_BINDING_READY');
assert(ready.ledger_binding_ready   === true,                   '[E-02] ready=true');
assert(typeof ready.ledger_entry_id === 'string',               '[E-03] entry_id is string');
assert(ready.ledger_entry_id.length > 0,                        '[E-04] entry_id non-empty');
assert(typeof ready.ledger_seq      === 'number',               '[E-05] seq is number');
assert(ready.ledger_seq             >= 1,                       '[E-06] seq >= 1');
assert(ready.package_hash           === 'pkg_test_hash_abc123', '[E-07] package_hash echoed');
assert(ready.mission_id             === 'bind-mission-362',     '[E-08] mission_id echoed');
assert(ready.evidence_receipt_id    === 'bind-receipt-362',     '[E-09] receipt_id echoed');
assert(ready.evidence_source        === 'go-core',              '[E-10] evidence_source=go-core');
assert(typeof ready.total_ledger_entries === 'number',          '[E-11] total_ledger_entries is number');
assert(ready.total_ledger_entries   >= 1,                       '[E-12] total_ledger_entries >= 1');
assert(ready.blocking_reason        === null,                   '[E-13] blocking_reason=null');
assert(ready.schema_version         === 'v36.2',                '[E-14] schema=v36.2');

// ─── Suite F: Fixture mode ────────────────────────────────────────
console.log('\n[Suite F] Fixture mode');
assert(fixture.ledger_binding_status === 'LEDGER_BINDING_READY', '[F-01] fixture → READY');
assert(fixture.ledger_binding_ready  === true,                   '[F-02] ready=true');
assert(typeof fixture.ledger_entry_id === 'string',              '[F-03] entry_id string');
assert(fixture.evidence_source        === 'go-core',             '[F-04] evidence_source=go-core');
assert(typeof fixture.package_hash    === 'string',              '[F-05] package_hash string');
assert(fixture.deploy_allowed         === false,                 '[F-06] deploy=false');
assert(fixture.promotion_allowed      === false,                 '[F-07] promotion=false');

// ─── Suite G: Sequential appends increment seq ────────────────────
console.log('\n[Suite G] Sequential appends');
_resetLedgerForTest();
const bind1 = bindRuntimeExecutionToLedger({
  binding_requested: true,
  evidence_package:  mockPackageReady({ mission_id: 'seq-mission-1', evidence_receipt_id: 'seq-receipt-1' }),
});
const bind2 = bindRuntimeExecutionToLedger({
  binding_requested: true,
  evidence_package:  mockPackageReady({ mission_id: 'seq-mission-2', evidence_receipt_id: 'seq-receipt-2' }),
});
assert(bind1.ledger_binding_ready === true,                    '[G-01] bind1 ready');
assert(bind2.ledger_binding_ready === true,                    '[G-02] bind2 ready');
assert(bind2.ledger_seq > bind1.ledger_seq,                    '[G-03] seq increments');
assert(bind2.total_ledger_entries > bind1.total_ledger_entries,'[G-04] total_entries increments');

// ─── Suite H: CLI ─────────────────────────────────────────────────
console.log('\n[Suite H] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                         '[H-01] default → exit 1');
assert(cliDefault.stdout.includes('LEDGER_BINDING_SKIPPED'),             '[H-02] stdout SKIPPED');
assert(cliDefault.stdout.includes('deploy_allowed'),                     '[H-03] stdout deploy_allowed');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                        '[H-04] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('LEDGER_BINDING_READY'),               '[H-05] stdout READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                          '[H-06] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                 '[H-07] JSON parseable');
assert(parsed && parsed.ledger_binding_ready    === true,               '[H-08] JSON ready=true');
assert(parsed && parsed.deploy_allowed          === false,              '[H-09] JSON deploy=false');
assert(parsed && parsed.promotion_allowed       === false,              '[H-10] JSON promotion=false');
assert(parsed && parsed.stable_allowed          === false,              '[H-11] JSON stable=false');
assert(parsed && parsed.tag_allowed             === false,              '[H-12] JSON tag_allowed=false');
assert(parsed && parsed.evidence_source         === 'go-core',          '[H-13] JSON evidence_source=go-core');
assert(parsed && typeof parsed.ledger_entry_id  === 'string',           '[H-14] JSON entry_id string');
assert(parsed && typeof parsed.package_hash     === 'string',           '[H-15] JSON package_hash string');

// ─── Suite I: Schema ──────────────────────────────────────────────
console.log('\n[Suite I] Schema');
assert(ready.schema_version   === 'v36.2', '[I-01] schema=v36.2 (READY)');
assert(def.schema_version     === 'v36.2', '[I-02] schema=v36.2 (SKIPPED)');
assert(fixture.schema_version === 'v36.2', '[I-03] schema=v36.2 (FIXTURE)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-execution-ledger-binding: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
