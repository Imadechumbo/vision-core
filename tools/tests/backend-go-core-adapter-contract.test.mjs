#!/usr/bin/env node
/**
 * Backend Go Core Adapter Contract — Unit Tests V31.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  evaluateGoCoreAdapterContract,
  ADAPTER_STATUSES,
} from '../backend-go-core-adapter-contract.mjs';

const CLI = resolve(process.cwd(), 'tools', 'backend-go-core-adapter-contract.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const VALID_FIXTURE = {
  mission_id:          'msn-adapter-001',
  evidence_receipt_id: 'rcpt-adapter-001',
  evidence_source:     'go-core',
};

const VALID_INPUT = { mission_id: 'msn-adapter-001' };

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(ADAPTER_STATUSES),                                    '[A-01] statuses is array');
assert(ADAPTER_STATUSES.length === 8,                                      '[A-02] 8 statuses');
assert(ADAPTER_STATUSES.includes('ADAPTER_BLOCKED_NO_BINARY'),             '[A-03] NO_BINARY present');
assert(ADAPTER_STATUSES.includes('ADAPTER_BLOCKED_INVALID_INPUT'),         '[A-04] INVALID_INPUT present');
assert(ADAPTER_STATUSES.includes('ADAPTER_BLOCKED_EXECUTION_FAILED'),      '[A-05] EXECUTION_FAILED present');
assert(ADAPTER_STATUSES.includes('ADAPTER_BLOCKED_INVALID_JSON'),          '[A-06] INVALID_JSON present');
assert(ADAPTER_STATUSES.includes('ADAPTER_BLOCKED_MISSION_ID'),            '[A-07] MISSION_ID present');
assert(ADAPTER_STATUSES.includes('ADAPTER_BLOCKED_RECEIPT'),               '[A-08] RECEIPT present');
assert(ADAPTER_STATUSES.includes('ADAPTER_BLOCKED_SOURCE'),                '[A-09] SOURCE present');
assert(ADAPTER_STATUSES.includes('ADAPTER_READY'),                         '[A-10] READY present');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const nobin   = evaluateGoCoreAdapterContract({});
const ready   = evaluateGoCoreAdapterContract({ _fixture_output: VALID_FIXTURE, mission_input: VALID_INPUT });
assert(nobin.deploy_allowed    === false, '[B-01] deploy=false (blocked)');
assert(nobin.promotion_allowed === false, '[B-02] promotion=false (blocked)');
assert(nobin.stable_allowed    === false, '[B-03] stable=false (blocked)');
assert(ready.deploy_allowed    === false, '[B-04] deploy=false (READY)');
assert(ready.promotion_allowed === false, '[B-05] promotion=false (READY)');
assert(ready.stable_allowed    === false, '[B-06] stable=false (READY)');

// ─── Suite C: No binary ───────────────────────────────────────────
console.log('\n[Suite C] No binary');
const noBin1 = evaluateGoCoreAdapterContract({});
assert(noBin1.adapter_status === 'ADAPTER_BLOCKED_NO_BINARY', '[C-01] no bin → BLOCKED_NO_BINARY');
assert(noBin1.adapter_ready  === false,                        '[C-02] adapter_ready=false');

const noBin2 = evaluateGoCoreAdapterContract({ go_core_bin: '' });
assert(noBin2.adapter_status === 'ADAPTER_BLOCKED_NO_BINARY', '[C-03] empty bin → BLOCKED_NO_BINARY');

const noBin3 = evaluateGoCoreAdapterContract({ go_core_bin: '/nonexistent/path/go-core' });
assert(noBin3.adapter_status === 'ADAPTER_BLOCKED_NO_BINARY', '[C-04] missing binary file → BLOCKED_NO_BINARY');

// ─── Suite D: Invalid input ───────────────────────────────────────
console.log('\n[Suite D] Invalid input');
const noInput = evaluateGoCoreAdapterContract({ _fixture_output: VALID_FIXTURE });
assert(noInput.adapter_status === 'ADAPTER_BLOCKED_INVALID_INPUT', '[D-01] no input → BLOCKED_INVALID_INPUT');

const nullInput = evaluateGoCoreAdapterContract({ _fixture_output: VALID_FIXTURE, mission_input: null });
assert(nullInput.adapter_status === 'ADAPTER_BLOCKED_INVALID_INPUT', '[D-02] null input → BLOCKED_INVALID_INPUT');

const noMissionId = evaluateGoCoreAdapterContract({
  _fixture_output: VALID_FIXTURE,
  mission_input:   { other_field: 'x' },
});
assert(noMissionId.adapter_status === 'ADAPTER_BLOCKED_INVALID_INPUT', '[D-03] no mission_id in input → BLOCKED_INVALID_INPUT');

// ─── Suite E: Invalid JSON output ─────────────────────────────────
console.log('\n[Suite E] Invalid JSON');
const badJson = evaluateGoCoreAdapterContract({
  _fixture_output: 'not json at all',
  mission_input:   VALID_INPUT,
});
assert(badJson.adapter_status === 'ADAPTER_BLOCKED_INVALID_JSON', '[E-01] bad JSON → BLOCKED_INVALID_JSON');

// ─── Suite F: Missing mission_id in output ────────────────────────
console.log('\n[Suite F] Missing mission_id in output');
const noMsn = evaluateGoCoreAdapterContract({
  _fixture_output: { evidence_receipt_id: 'rcpt-x', evidence_source: 'go-core' },
  mission_input:   VALID_INPUT,
});
assert(noMsn.adapter_status === 'ADAPTER_BLOCKED_MISSION_ID', '[F-01] no mission_id in output → BLOCKED_MISSION_ID');

// ─── Suite G: Missing receipt ─────────────────────────────────────
console.log('\n[Suite G] Missing receipt');
const noReceipt = evaluateGoCoreAdapterContract({
  _fixture_output: { mission_id: 'msn-x', evidence_source: 'go-core' },
  mission_input:   VALID_INPUT,
});
assert(noReceipt.adapter_status === 'ADAPTER_BLOCKED_RECEIPT', '[G-01] no receipt → BLOCKED_RECEIPT');

const noReceiptAlt = evaluateGoCoreAdapterContract({
  _fixture_output: { mission_id: 'msn-x', evidence_receipt_id: null, evidence_source: 'go-core' },
  mission_input:   VALID_INPUT,
});
assert(noReceiptAlt.adapter_status === 'ADAPTER_BLOCKED_RECEIPT', '[G-02] null receipt → BLOCKED_RECEIPT');

// ─── Suite H: Wrong source / backend claim ────────────────────────
console.log('\n[Suite H] Source rejection');
const backendSource = evaluateGoCoreAdapterContract({
  _fixture_output: { mission_id: 'msn-x', evidence_receipt_id: 'rcpt-x', evidence_source: 'backend' },
  mission_input:   VALID_INPUT,
});
assert(backendSource.adapter_status        === 'ADAPTER_BLOCKED_SOURCE', '[H-01] backend source → BLOCKED_SOURCE');
assert(backendSource.backend_claim_rejected === true,                     '[H-02] backend_claim_rejected=true');

const stubSource = evaluateGoCoreAdapterContract({
  _fixture_output: { mission_id: 'msn-x', evidence_receipt_id: 'rcpt-x', evidence_source: 'stub' },
  mission_input:   VALID_INPUT,
});
assert(stubSource.adapter_status === 'ADAPTER_BLOCKED_SOURCE', '[H-03] stub source → BLOCKED_SOURCE');

const nullSource = evaluateGoCoreAdapterContract({
  _fixture_output: { mission_id: 'msn-x', evidence_receipt_id: 'rcpt-x' },
  mission_input:   VALID_INPUT,
});
assert(nullSource.adapter_status        === 'ADAPTER_BLOCKED_SOURCE', '[H-04] null source → BLOCKED_SOURCE');
assert(nullSource.backend_claim_rejected === true,                     '[H-05] null source = backend_claim_rejected');

// ─── Suite I: Valid ADAPTER_READY ────────────────────────────────
console.log('\n[Suite I] Valid ADAPTER_READY');
assert(ready.adapter_status        === 'ADAPTER_READY',  '[I-01] status=ADAPTER_READY');
assert(ready.adapter_ready         === true,             '[I-02] adapter_ready=true');
assert(ready.go_core_invoked       === false,            '[I-03] go_core_invoked=false (fixture)');
assert(ready.mission_id            === 'msn-adapter-001', '[I-04] mission_id echoed');
assert(ready.evidence_receipt_id   === 'rcpt-adapter-001', '[I-05] receipt_id echoed');
assert(ready.evidence_source       === 'go-core',        '[I-06] source=go-core');
assert(ready.receipt_valid         === true,             '[I-07] receipt_valid=true');
assert(ready.backend_claim_rejected === false,           '[I-08] backend_claim_rejected=false');
assert(ready.blocking_reason       === null,             '[I-09] blocking_reason=null');
assert(ready.schema_version        === 'v31.0',          '[I-10] schema=v31.0');

// receipt_id via alternate field 'source' and 'receipt_id'
const altFields = evaluateGoCoreAdapterContract({
  _fixture_output: { mission_id: 'msn-alt', receipt_id: 'rcpt-alt', source: 'go-core' },
  mission_input:   VALID_INPUT,
});
assert(altFields.adapter_status === 'ADAPTER_READY', '[I-11] alt receipt_id/source fields → READY');
assert(altFields.evidence_receipt_id === 'rcpt-alt', '[I-12] alt receipt_id extracted');

// ─── Suite J: CLI ─────────────────────────────────────────────────
console.log('\n[Suite J] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                              '[J-01] CLI no args → exit 1');
assert(cliDefault.stdout.includes('BLOCKED_NO_BINARY'),        '[J-02] stdout BLOCKED_NO_BINARY');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 1,                                 '[J-03] --json exit 1 (no bin)');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                        '[J-04] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,           '[J-05] JSON deploy=false');
assert(parsed && parsed.promotion_allowed === false,           '[J-06] JSON promotion=false');
assert(parsed && parsed.stable_allowed    === false,           '[J-07] JSON stable=false');

// ─── Suite K: Schema ──────────────────────────────────────────────
console.log('\n[Suite K] Schema');
assert(ready.schema_version  === 'v31.0', '[K-01] schema=v31.0 (READY)');
assert(nobin.schema_version  === 'v31.0', '[K-02] schema=v31.0 (BLOCKED)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nbackend-go-core-adapter-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
