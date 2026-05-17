#!/usr/bin/env node
/**
 * Local Go Core Invocation Harness — Unit Tests V31.1
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runGoCoreInvocationHarness,
  GOCORE_HARNESS_STATUSES,
} from '../local-go-core-invocation-harness.mjs';

const CLI = resolve(process.cwd(), 'tools', 'local-go-core-invocation-harness.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const VALID_FIXTURE = {
  mission_id:          'msn-harness-001',
  evidence_receipt_id: 'rcpt-harness-001',
  evidence_source:     'go-core',
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(GOCORE_HARNESS_STATUSES),                                  '[A-01] statuses is array');
assert(GOCORE_HARNESS_STATUSES.length === 5,                                    '[A-02] 5 statuses');
assert(GOCORE_HARNESS_STATUSES.includes('GOCORE_HARNESS_BLOCKED_SETUP'),        '[A-03] BLOCKED_SETUP present');
assert(GOCORE_HARNESS_STATUSES.includes('GOCORE_HARNESS_BLOCKED_BINARY'),       '[A-04] BLOCKED_BINARY present');
assert(GOCORE_HARNESS_STATUSES.includes('GOCORE_HARNESS_BLOCKED_TIMEOUT'),      '[A-05] BLOCKED_TIMEOUT present');
assert(GOCORE_HARNESS_STATUSES.includes('GOCORE_HARNESS_BLOCKED_OUTPUT'),       '[A-06] BLOCKED_OUTPUT present');
assert(GOCORE_HARNESS_STATUSES.includes('GOCORE_HARNESS_READY'),                '[A-07] GOCORE_HARNESS_READY present');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const nobin   = runGoCoreInvocationHarness({});
const ready   = runGoCoreInvocationHarness({ _fixture_output: VALID_FIXTURE, mission_input: { mission_id: 'msn-b01' } });
assert(nobin.deploy_allowed    === false, '[B-01] deploy=false (blocked)');
assert(nobin.promotion_allowed === false, '[B-02] promotion=false (blocked)');
assert(nobin.stable_allowed    === false, '[B-03] stable=false (blocked)');
assert(ready.deploy_allowed    === false, '[B-04] deploy=false (READY)');
assert(ready.promotion_allowed === false, '[B-05] promotion=false (READY)');
assert(ready.stable_allowed    === false, '[B-06] stable=false (READY)');
assert(nobin.local_only        === true,  '[B-07] local_only=true always');
assert(ready.local_only        === true,  '[B-08] local_only=true in READY');

// ─── Suite C: Binary blocked ──────────────────────────────────────
console.log('\n[Suite C] Binary blocked');
const noBin = runGoCoreInvocationHarness({});
assert(noBin.harness_status === 'GOCORE_HARNESS_BLOCKED_BINARY', '[C-01] no binary → BLOCKED_BINARY');
assert(noBin.harness_ready  === false,                            '[C-02] harness_ready=false');
assert(noBin.temp_root_created === true,                          '[C-03] temp_root created before binary check');
assert(noBin.temp_root_removed === true,                          '[C-04] temp_root cleaned up on block');

const nonexistentBin = runGoCoreInvocationHarness({ go_core_bin: '/nonexistent/go-core' });
assert(nonexistentBin.harness_status === 'GOCORE_HARNESS_BLOCKED_BINARY', '[C-05] nonexistent bin → BLOCKED_BINARY');

// ─── Suite D: Output blocked ──────────────────────────────────────
console.log('\n[Suite D] Output blocked');
const badJson = runGoCoreInvocationHarness({
  _fixture_output: 'not json',
  mission_input: { mission_id: 'msn-d01' },
});
assert(badJson.harness_status === 'GOCORE_HARNESS_BLOCKED_OUTPUT', '[D-01] bad JSON → BLOCKED_OUTPUT');
assert(badJson.temp_root_removed === true,                          '[D-02] temp_root cleaned on output block');

const noMissionOut = runGoCoreInvocationHarness({
  _fixture_output: { evidence_receipt_id: 'rcpt-d01', evidence_source: 'go-core' },
  mission_input: { mission_id: 'msn-d02' },
});
assert(noMissionOut.harness_status === 'GOCORE_HARNESS_BLOCKED_OUTPUT', '[D-03] no mission_id in output → BLOCKED_OUTPUT');

const noReceiptOut = runGoCoreInvocationHarness({
  _fixture_output: { mission_id: 'msn-d03', evidence_source: 'go-core' },
  mission_input: { mission_id: 'msn-d03' },
});
assert(noReceiptOut.harness_status === 'GOCORE_HARNESS_BLOCKED_OUTPUT', '[D-04] no receipt → BLOCKED_OUTPUT');

const backendSource = runGoCoreInvocationHarness({
  _fixture_output: { mission_id: 'msn-d04', evidence_receipt_id: 'rcpt-d04', evidence_source: 'backend' },
  mission_input: { mission_id: 'msn-d04' },
});
assert(backendSource.harness_status === 'GOCORE_HARNESS_BLOCKED_OUTPUT', '[D-05] backend source → BLOCKED_OUTPUT');

// ─── Suite E: Fixture mode ────────────────────────────────────────
console.log('\n[Suite E] Fixture mode');
const fixtureReady = runGoCoreInvocationHarness({ fixture_mode: true });
assert(fixtureReady.harness_status === 'GOCORE_HARNESS_READY', '[E-01] fixture_mode → READY');
assert(fixtureReady.harness_ready  === true,                   '[E-02] harness_ready=true');
assert(fixtureReady.evidence_source === 'go-core',             '[E-03] evidence_source=go-core');
assert(fixtureReady.go_core_invoked === false,                 '[E-04] go_core_invoked=false in fixture');
assert(fixtureReady.temp_root_removed === true,                '[E-05] temp_root cleaned up');

// ─── Suite F: Full valid with explicit fixture ────────────────────
console.log('\n[Suite F] Full valid');
assert(ready.harness_status      === 'GOCORE_HARNESS_READY',   '[F-01] status=GOCORE_HARNESS_READY');
assert(ready.harness_ready       === true,                     '[F-02] harness_ready=true');
assert(ready.mission_id          === 'msn-harness-001',        '[F-03] mission_id echoed');
assert(ready.evidence_receipt_id === 'rcpt-harness-001',       '[F-04] receipt_id echoed');
assert(ready.evidence_source     === 'go-core',                '[F-05] source=go-core');
assert(ready.receipt_valid       === true,                     '[F-06] receipt_valid=true');
assert(ready.temp_root_created   === true,                     '[F-07] temp_root_created=true');
assert(ready.temp_root_removed   === true,                     '[F-08] temp_root_removed=true');
assert(ready.schema_version      === 'v31.1',                  '[F-09] schema=v31.1');
assert(ready.blocking_reason     === null,                     '[F-10] blocking_reason=null');

// ─── Suite G: Custom mission input ───────────────────────────────
console.log('\n[Suite G] Custom mission input');
const customMission = runGoCoreInvocationHarness({
  mission_input:   { mission_id: 'custom-msn-g01', extra_param: 'test' },
  _fixture_output: { mission_id: 'custom-msn-g01', evidence_receipt_id: 'rcpt-g01', evidence_source: 'go-core' },
});
assert(customMission.harness_status === 'GOCORE_HARNESS_READY', '[G-01] custom input → READY');
assert(customMission.mission_id === 'custom-msn-g01',           '[G-02] custom mission_id preserved');

// ─── Suite H: CLI ─────────────────────────────────────────────────
console.log('\n[Suite H] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                              '[H-01] CLI no args → exit 1');
assert(cliDefault.stdout.includes('BLOCKED'),                  '[H-02] stdout BLOCKED');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                              '[H-03] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('GOCORE_HARNESS_READY'),     '[H-04] stdout GOCORE_HARNESS_READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                 '[H-05] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                        '[H-06] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,           '[H-07] JSON deploy=false');
assert(parsed && parsed.promotion_allowed === false,           '[H-08] JSON promotion=false');
assert(parsed && parsed.local_only        === true,            '[H-09] JSON local_only=true');

// ─── Suite I: Schema ──────────────────────────────────────────────
console.log('\n[Suite I] Schema');
assert(ready.schema_version === 'v31.1', '[I-01] schema=v31.1 (READY)');
assert(nobin.schema_version === 'v31.1', '[I-02] schema=v31.1 (BLOCKED)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nlocal-go-core-invocation-harness: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
