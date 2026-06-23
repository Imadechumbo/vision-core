#!/usr/bin/env node
/**
 * Real Tag Human Receipt Verifier — Unit Tests V93.1
 */

import {
  RECEIPT_VERIFIER_STATUSES,
  runRealTagHumanReceiptVerifier,
  renderReceiptVerifierSummary,
} from '../real-tag-human-receipt-verifier.mjs';
import {
  evaluateRealTagCommandGate,
  COMMAND_GATE_CONFIRMATION_PHRASE,
} from '../real-tag-actual-command-gate.mjs';
import { buildRealTagHumanRunbook } from '../real-tag-human-runbook.mjs';
import { runRealTagHumanRunbookValidator } from '../real-tag-human-runbook-validator.mjs';
import { buildRealTagActualCommandRenderer } from '../real-tag-actual-command-renderer.mjs';
import { buildRealTagHumanExecutionReceiptImporter } from '../real-tag-human-execution-receipt-importer.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T04:30:00.000Z';
const TAG = 'v99.0.0';
const HEAD = 'abc123def456';

const fixRunbook   = buildRealTagHumanRunbook({ fixture_mode: true, _mock_timestamp: TS });
const fixValidator = runRealTagHumanRunbookValidator({ fixture_mode: true, _mock_timestamp: TS });
const readyGate    = evaluateRealTagCommandGate({
  fixture_mode: false, runbook: fixRunbook, validator_result: fixValidator,
  baseline_status: 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL', is_ci: false,
  confirmation_phrase: COMMAND_GATE_CONFIRMATION_PHRASE,
  target_tag: TAG, git_head: HEAD,
  evidence_receipt: 'valid-receipt-id-long-enough', rollback_anchor: 'anchor-id',
  _mock_timestamp: TS,
});
const readyRenderer = buildRealTagActualCommandRenderer({
  fixture_mode: false, gate_result: readyGate, _mock_timestamp: TS,
});
const validReceiptData = {
  receipt_type: 'real_tag_created',
  target_tag:   TAG,
  head_sha:     HEAD,
  timestamp:    TS,
  receipt_hash: 'abcdef1234567890abcdef12',
};
const readyImporter = buildRealTagHumanExecutionReceiptImporter({
  fixture_mode: false,
  gate_result: readyGate, renderer_result: readyRenderer,
  receipt_data: validReceiptData,
  expected_tag: TAG, expected_head: HEAD,
  _mock_timestamp: TS,
});

// Mock spawn_adapter that simulates successful verification
function mockAdapter(cmd, args) {
  const arg = args.join(' ');
  if (args[0] === 'tag' && args[1] === '-l') {
    return { status: 0, stdout: TAG };
  }
  if (args[0] === 'ls-remote') {
    return { status: 0, stdout: `${HEAD}\trefs/tags/${TAG}` };
  }
  if (args[0] === 'rev-list') {
    return { status: 0, stdout: HEAD };
  }
  return { status: 1, stdout: '' };
}

// Mock adapter that fails local tag check
function mockAdapterNoLocalTag() {
  return { status: 1, stdout: '' };
}

// Mock adapter with local tag but no remote
function mockAdapterNoRemote(cmd, args) {
  if (args[0] === 'tag' && args[1] === '-l') return { status: 0, stdout: TAG };
  return { status: 1, stdout: '' };
}

// Mock adapter with local+remote but wrong HEAD
function mockAdapterWrongHead(cmd, args) {
  if (args[0] === 'tag' && args[1] === '-l') return { status: 0, stdout: TAG };
  if (args[0] === 'ls-remote') return { status: 0, stdout: `deadbeef\trefs/tags/${TAG}` };
  if (args[0] === 'rev-list') return { status: 0, stdout: 'deadbeef000000000' };
  return { status: 1, stdout: '' };
}

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RECEIPT_VERIFIER_STATUSES),                              '[A-01] statuses array');
assert(RECEIPT_VERIFIER_STATUSES.length === 8,                                '[A-02] 8 statuses');
assert(RECEIPT_VERIFIER_STATUSES.includes('VERIFIER_BLOCKED_IMPORTER'),       '[A-03] BLOCKED_IMPORTER');
assert(RECEIPT_VERIFIER_STATUSES.includes('VERIFIER_BLOCKED_RECEIPT_TYPE'),   '[A-04] BLOCKED_RECEIPT_TYPE');
assert(RECEIPT_VERIFIER_STATUSES.includes('VERIFIER_BLOCKED_ADAPTER'),        '[A-05] BLOCKED_ADAPTER');
assert(RECEIPT_VERIFIER_STATUSES.includes('VERIFIER_BLOCKED_LOCAL_TAG'),      '[A-06] BLOCKED_LOCAL_TAG');
assert(RECEIPT_VERIFIER_STATUSES.includes('VERIFIER_BLOCKED_REMOTE_TAG'),     '[A-07] BLOCKED_REMOTE_TAG');
assert(RECEIPT_VERIFIER_STATUSES.includes('VERIFIER_BLOCKED_HEAD_MISMATCH'),  '[A-08] BLOCKED_HEAD_MISMATCH');
assert(RECEIPT_VERIFIER_STATUSES.includes('VERIFIER_BLOCKED_LEDGER'),         '[A-09] BLOCKED_LEDGER');
assert(RECEIPT_VERIFIER_STATUSES.includes('VERIFIER_PASSED'),                 '[A-10] VERIFIER_PASSED');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = runRealTagHumanReceiptVerifier({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                               '[B-01] returns object');
assert(fix.verifier_status      === 'VERIFIER_PASSED',                       '[B-02] VERIFIER_PASSED');
assert(fix.verifier_passed      === true,                                     '[B-03] passed=true');
assert(fix.schema_version       === 'v93.1',                                  '[B-04] schema=v93.1');
assert(typeof fix.verifier_id === 'string' && fix.verifier_id.length === 24, '[B-05] id 24 chars');
assert(fix.blocking_reason      === null,                                     '[B-06] blocking=null');
assert(fix.importer_verified    === true,                                     '[B-07] importer_verified=true');
assert(fix.receipt_type_verified === true,                                    '[B-08] receipt_type_verified=true');
assert(fix.adapter_available    === true,                                     '[B-09] adapter_available=true');
assert(fix.local_tag_verified   === true,                                     '[B-10] local_tag_verified=true');
assert(fix.remote_tag_verified  === true,                                     '[B-11] remote_tag_verified=true');
assert(fix.head_sha_verified    === true,                                     '[B-12] head_sha_verified=true');
assert(fix.ledger_verified      === true,                                     '[B-13] ledger_verified=true');
assert(fix.created_at           === TS,                                       '[B-14] created_at=TS');

// ─── Suite C: Invariants (REGRA ABSOLUTA) ────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[C-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: Gate 1 — Importer ──────────────────────────────────
console.log('\n[Suite D] Gate 1 — Importer');
const bNoImporter = runRealTagHumanReceiptVerifier({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoImporter.verifier_status === 'VERIFIER_BLOCKED_IMPORTER',           '[D-01] no importer → BLOCKED_IMPORTER');
assert(bNoImporter.importer_verified === false,                                '[D-02] importer_verified=false');
assert(bNoImporter.tag_created === false,                                      '[D-03] tag_created=false in blocked');

const bNotReadyImporter = runRealTagHumanReceiptVerifier({
  fixture_mode: false,
  importer_result: { importer_ready: false },
  _mock_timestamp: TS,
});
assert(bNotReadyImporter.verifier_status === 'VERIFIER_BLOCKED_IMPORTER',     '[D-04] not-ready importer → BLOCKED_IMPORTER');

// ─── Suite E: Gate 2 — Receipt type ──────────────────────────────
console.log('\n[Suite E] Gate 2 — Receipt type');
const dryRunImporter = { ...readyImporter, imported_receipt: { ...validReceiptData, receipt_type: 'dry_run_verified' } };
const bDryRun = runRealTagHumanReceiptVerifier({
  fixture_mode: false,
  importer_result: dryRunImporter,
  _mock_timestamp: TS,
});
assert(bDryRun.verifier_status === 'VERIFIER_BLOCKED_RECEIPT_TYPE',           '[E-01] dry_run receipt → BLOCKED_RECEIPT_TYPE');
assert(bDryRun.importer_verified === true,                                     '[E-02] importer passed before type check');
assert(bDryRun.receipt_type     === 'dry_run_verified',                       '[E-03] receipt_type in result');

// ─── Suite F: Gate 3 — Adapter ───────────────────────────────────
console.log('\n[Suite F] Gate 3 — Adapter');
const bNoAdapter = runRealTagHumanReceiptVerifier({
  fixture_mode: false,
  importer_result: readyImporter,
  _mock_timestamp: TS,
});
assert(bNoAdapter.verifier_status === 'VERIFIER_BLOCKED_ADAPTER',             '[F-01] no adapter → BLOCKED_ADAPTER');
assert(bNoAdapter.receipt_type_verified === true,                              '[F-02] receipt_type passed before adapter');

const bBadAdapter = runRealTagHumanReceiptVerifier({
  fixture_mode: false,
  importer_result: readyImporter,
  spawn_adapter: 'not-a-function',
  _mock_timestamp: TS,
});
assert(bBadAdapter.verifier_status === 'VERIFIER_BLOCKED_ADAPTER',            '[F-03] non-function adapter → BLOCKED_ADAPTER');

// ─── Suite G: Gate 4 — Local tag ─────────────────────────────────
console.log('\n[Suite G] Gate 4 — Local tag');
const bNoLocal = runRealTagHumanReceiptVerifier({
  fixture_mode: false,
  importer_result: readyImporter,
  spawn_adapter: mockAdapterNoLocalTag,
  _mock_timestamp: TS,
});
assert(bNoLocal.verifier_status === 'VERIFIER_BLOCKED_LOCAL_TAG',             '[G-01] no local tag → BLOCKED_LOCAL_TAG');
assert(bNoLocal.adapter_available === true,                                    '[G-02] adapter passed before local check');

// ─── Suite H: Gate 5 — Remote tag ────────────────────────────────
console.log('\n[Suite H] Gate 5 — Remote tag');
const bNoRemote = runRealTagHumanReceiptVerifier({
  fixture_mode: false,
  importer_result: readyImporter,
  spawn_adapter: mockAdapterNoRemote,
  _mock_timestamp: TS,
});
assert(bNoRemote.verifier_status === 'VERIFIER_BLOCKED_REMOTE_TAG',           '[H-01] no remote → BLOCKED_REMOTE_TAG');
assert(bNoRemote.local_tag_verified === true,                                  '[H-02] local passed before remote check');

// ─── Suite I: Gate 6 — HEAD mismatch ──────────────────────────────
console.log('\n[Suite I] Gate 6 — HEAD mismatch');
const bWrongHead = runRealTagHumanReceiptVerifier({
  fixture_mode: false,
  importer_result: readyImporter,
  spawn_adapter: mockAdapterWrongHead,
  _mock_timestamp: TS,
});
assert(bWrongHead.verifier_status === 'VERIFIER_BLOCKED_HEAD_MISMATCH',       '[I-01] wrong head → BLOCKED_HEAD_MISMATCH');
assert(bWrongHead.remote_tag_verified === true,                                '[I-02] remote passed before head check');

// ─── Suite J: Gate 7 — Ledger ─────────────────────────────────────
console.log('\n[Suite J] Gate 7 — Ledger');
const bBadLedger = runRealTagHumanReceiptVerifier({
  fixture_mode: false,
  importer_result: readyImporter,
  spawn_adapter: mockAdapter,
  ledger_result: { ledger_ready: false },
  _mock_timestamp: TS,
});
assert(bBadLedger.verifier_status === 'VERIFIER_BLOCKED_LEDGER',              '[J-01] bad ledger → BLOCKED_LEDGER');
assert(bBadLedger.head_sha_verified === true,                                  '[J-02] head passed before ledger');

// ─── Suite K: VERIFIER_PASSED ─────────────────────────────────────
console.log('\n[Suite K] VERIFIER_PASSED');
const vPass = runRealTagHumanReceiptVerifier({
  fixture_mode: false,
  importer_result: readyImporter,
  spawn_adapter: mockAdapter,
  _mock_timestamp: TS,
});
assert(vPass.verifier_status === 'VERIFIER_PASSED',                           '[K-01] all gates → VERIFIER_PASSED');
assert(vPass.verifier_passed === true,                                         '[K-02] passed=true');
assert(vPass.tag_created     === false,                                        '[K-03] tag_created=false even when PASSED');

// with good ledger
const vPassLedger = runRealTagHumanReceiptVerifier({
  fixture_mode: false,
  importer_result: readyImporter,
  spawn_adapter: mockAdapter,
  ledger_result: { ledger_ready: true },
  _mock_timestamp: TS,
});
assert(vPassLedger.verifier_status === 'VERIFIER_PASSED',                     '[K-04] good ledger → still PASSED');

// ─── Suite L: Deterministic ID ────────────────────────────────────
console.log('\n[Suite L] Deterministic ID');
const l1 = runRealTagHumanReceiptVerifier({ fixture_mode: true, _mock_timestamp: TS });
const l2 = runRealTagHumanReceiptVerifier({ fixture_mode: true, _mock_timestamp: TS });
assert(l1.verifier_id === l2.verifier_id,                                     '[L-01] deterministic id');

// ─── Suite M: Render ──────────────────────────────────────────────
console.log('\n[Suite M] Render');
const rendered = renderReceiptVerifierSummary(fix);
assert(typeof rendered === 'string',                                           '[M-01] returns string');
assert(rendered.includes('VERIFIER_PASSED'),                                   '[M-02] status in output');
assert(rendered.includes('tag_created                 : false'),              '[M-03] tag_created=false');
assert(rendered.includes('actual_real_tag_created     : false'),              '[M-04] actual_tag=false');
assert(rendered.includes('real_execution_not_performed: true'),               '[M-05] not_performed=true');
assert(rendered.includes('importer_verified'),                                 '[M-06] importer_verified field');
assert(rendered.includes('local_tag_verified'),                                '[M-07] local_tag_verified field');
assert(rendered.includes('head_sha_verified'),                                 '[M-08] head_sha_verified field');

assert(renderReceiptVerifierSummary(null) === 'receipt_verifier: null',       '[M-09] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-human-receipt-verifier: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
