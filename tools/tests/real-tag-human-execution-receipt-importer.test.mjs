#!/usr/bin/env node
/**
 * Real Tag Human Execution Receipt Importer — Unit Tests V93.0
 */

import {
  RECEIPT_IMPORTER_STATUSES,
  buildRealTagHumanExecutionReceiptImporter,
  renderReceiptImporterSummary,
} from '../real-tag-human-execution-receipt-importer.mjs';
import {
  evaluateRealTagCommandGate,
  COMMAND_GATE_CONFIRMATION_PHRASE,
} from '../real-tag-actual-command-gate.mjs';
import { buildRealTagHumanRunbook } from '../real-tag-human-runbook.mjs';
import { runRealTagHumanRunbookValidator } from '../real-tag-human-runbook-validator.mjs';
import { buildRealTagActualCommandRenderer } from '../real-tag-actual-command-renderer.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T04:00:00.000Z';
const fixRunbook   = buildRealTagHumanRunbook({ fixture_mode: true, _mock_timestamp: TS });
const fixValidator = runRealTagHumanRunbookValidator({ fixture_mode: true, _mock_timestamp: TS });
const readyGate    = evaluateRealTagCommandGate({
  fixture_mode: false,
  runbook: fixRunbook, validator_result: fixValidator,
  baseline_status: 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
  is_ci: false,
  confirmation_phrase: COMMAND_GATE_CONFIRMATION_PHRASE,
  target_tag: 'v99.0.0', git_head: 'abc123def456',
  evidence_receipt: 'valid-receipt-id-long-enough', rollback_anchor: 'anchor-id',
  _mock_timestamp: TS,
});
const readyRenderer = buildRealTagActualCommandRenderer({
  fixture_mode: false, gate_result: readyGate, _mock_timestamp: TS,
});
const blockedGate = evaluateRealTagCommandGate({ fixture_mode: false, _mock_timestamp: TS });
const blockedRenderer = buildRealTagActualCommandRenderer({
  fixture_mode: false, gate_result: blockedGate, _mock_timestamp: TS,
});

const validReceipt = {
  receipt_type: 'real_tag_created',
  target_tag:   'v99.0.0',
  head_sha:     'abc123def456',
  timestamp:    TS,
  receipt_hash: 'abcdef1234567890abcdef12',
};

const BASE = {
  fixture_mode:    false,
  gate_result:     readyGate,
  renderer_result: readyRenderer,
  receipt_data:    validReceipt,
  expected_tag:    'v99.0.0',
  expected_head:   'abc123def456',
  _mock_timestamp: TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RECEIPT_IMPORTER_STATUSES),                              '[A-01] statuses array');
assert(RECEIPT_IMPORTER_STATUSES.length === 9,                                '[A-02] 9 statuses');
assert(RECEIPT_IMPORTER_STATUSES.includes('IMPORTER_BLOCKED_GATE'),           '[A-03] BLOCKED_GATE');
assert(RECEIPT_IMPORTER_STATUSES.includes('IMPORTER_BLOCKED_RENDERER'),       '[A-04] BLOCKED_RENDERER');
assert(RECEIPT_IMPORTER_STATUSES.includes('IMPORTER_BLOCKED_NO_DATA'),        '[A-05] BLOCKED_NO_DATA');
assert(RECEIPT_IMPORTER_STATUSES.includes('IMPORTER_BLOCKED_FORMAT'),         '[A-06] BLOCKED_FORMAT');
assert(RECEIPT_IMPORTER_STATUSES.includes('IMPORTER_BLOCKED_TAG_MISMATCH'),   '[A-07] BLOCKED_TAG_MISMATCH');
assert(RECEIPT_IMPORTER_STATUSES.includes('IMPORTER_BLOCKED_HEAD_MISMATCH'),  '[A-08] BLOCKED_HEAD_MISMATCH');
assert(RECEIPT_IMPORTER_STATUSES.includes('IMPORTER_BLOCKED_TIMESTAMP'),      '[A-09] BLOCKED_TIMESTAMP');
assert(RECEIPT_IMPORTER_STATUSES.includes('IMPORTER_BLOCKED_HASH'),           '[A-10] BLOCKED_HASH');
assert(RECEIPT_IMPORTER_STATUSES.includes('IMPORTER_READY'),                  '[A-11] IMPORTER_READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagHumanExecutionReceiptImporter({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                               '[B-01] returns object');
assert(fix.importer_status      === 'IMPORTER_READY',                        '[B-02] IMPORTER_READY');
assert(fix.importer_ready       === true,                                     '[B-03] ready=true');
assert(fix.schema_version       === 'v93.0',                                  '[B-04] schema=v93.0');
assert(typeof fix.importer_id === 'string' && fix.importer_id.length === 24, '[B-05] id 24 chars');
assert(fix.blocking_reason      === null,                                     '[B-06] blocking=null');
assert(fix.gate_verified        === true,                                     '[B-07] gate_verified=true');
assert(fix.renderer_verified    === true,                                     '[B-08] renderer_verified=true');
assert(fix.receipt_data_present === true,                                     '[B-09] receipt_data_present=true');
assert(fix.format_valid         === true,                                     '[B-10] format_valid=true');
assert(fix.tag_matched          === true,                                     '[B-11] tag_matched=true');
assert(fix.head_matched         === true,                                     '[B-12] head_matched=true');
assert(fix.timestamp_valid      === true,                                     '[B-13] timestamp_valid=true');
assert(fix.hash_valid           === true,                                     '[B-14] hash_valid=true');
assert(fix.imported_receipt !== null,                                         '[B-15] imported_receipt present');
assert(fix.created_at           === TS,                                       '[B-16] created_at=TS');

// ─── Suite C: Invariants (REGRA ABSOLUTA) ────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[C-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: Gate 1 — Command gate ──────────────────────────────
console.log('\n[Suite D] Gate 1 — Command gate');
const bNoGate = buildRealTagHumanExecutionReceiptImporter({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoGate.importer_status === 'IMPORTER_BLOCKED_GATE',                   '[D-01] no gate → BLOCKED_GATE');
assert(bNoGate.gate_verified   === false,                                     '[D-02] gate_verified=false');
assert(bNoGate.tag_created     === false,                                     '[D-03] tag_created=false in blocked');

const bBadGate = buildRealTagHumanExecutionReceiptImporter({
  fixture_mode: false, gate_result: blockedGate, _mock_timestamp: TS,
});
assert(bBadGate.importer_status === 'IMPORTER_BLOCKED_GATE',                  '[D-04] blocked gate → BLOCKED_GATE');

// ─── Suite E: Gate 2 — Renderer ──────────────────────────────────
console.log('\n[Suite E] Gate 2 — Renderer');
const bNoRenderer = buildRealTagHumanExecutionReceiptImporter({
  ...BASE, renderer_result: null, _mock_timestamp: TS,
});
assert(bNoRenderer.importer_status === 'IMPORTER_BLOCKED_RENDERER',           '[E-01] null renderer → BLOCKED_RENDERER');
assert(bNoRenderer.gate_verified   === true,                                  '[E-02] gate passed before renderer');

const bBadRenderer = buildRealTagHumanExecutionReceiptImporter({
  ...BASE, renderer_result: blockedRenderer, _mock_timestamp: TS,
});
assert(bBadRenderer.importer_status === 'IMPORTER_BLOCKED_RENDERER',          '[E-03] blocked renderer → BLOCKED_RENDERER');

// ─── Suite F: Gate 3 — No data ────────────────────────────────────
console.log('\n[Suite F] Gate 3 — No data');
const bNoData = buildRealTagHumanExecutionReceiptImporter({
  ...BASE, receipt_data: null, _mock_timestamp: TS,
});
assert(bNoData.importer_status === 'IMPORTER_BLOCKED_NO_DATA',                '[F-01] null data → BLOCKED_NO_DATA');
assert(bNoData.receipt_data_present === false,                                '[F-02] receipt_data_present=false');

// ─── Suite G: Gate 4 — Format ─────────────────────────────────────
console.log('\n[Suite G] Gate 4 — Format');
const bBadJson = buildRealTagHumanExecutionReceiptImporter({
  ...BASE, receipt_data: 'not valid json {{{', _mock_timestamp: TS,
});
assert(bBadJson.importer_status === 'IMPORTER_BLOCKED_FORMAT',                '[G-01] bad JSON → BLOCKED_FORMAT');

const bMissingField = buildRealTagHumanExecutionReceiptImporter({
  ...BASE,
  receipt_data: { receipt_type: 'real_tag_created', target_tag: 'v99.0.0' },
  _mock_timestamp: TS,
});
assert(bMissingField.importer_status === 'IMPORTER_BLOCKED_FORMAT',           '[G-02] missing fields → BLOCKED_FORMAT');

const bBadType = buildRealTagHumanExecutionReceiptImporter({
  ...BASE,
  receipt_data: { ...validReceipt, receipt_type: 'bad_type' },
  _mock_timestamp: TS,
});
assert(bBadType.importer_status === 'IMPORTER_BLOCKED_FORMAT',                '[G-03] invalid receipt_type → BLOCKED_FORMAT');

// JSON string input works
const bJsonString = buildRealTagHumanExecutionReceiptImporter({
  ...BASE, receipt_data: JSON.stringify(validReceipt), _mock_timestamp: TS,
});
assert(bJsonString.importer_status === 'IMPORTER_READY',                      '[G-04] JSON string input accepted');

// ─── Suite H: Gate 5 — Tag mismatch ──────────────────────────────
console.log('\n[Suite H] Gate 5 — Tag mismatch');
const bTagMiss = buildRealTagHumanExecutionReceiptImporter({
  ...BASE, expected_tag: 'v1.0.0', _mock_timestamp: TS,
});
assert(bTagMiss.importer_status === 'IMPORTER_BLOCKED_TAG_MISMATCH',          '[H-01] tag mismatch → BLOCKED_TAG_MISMATCH');
assert(bTagMiss.format_valid    === true,                                      '[H-02] format passed before tag check');

// ─── Suite I: Gate 6 — HEAD mismatch ─────────────────────────────
console.log('\n[Suite I] Gate 6 — HEAD mismatch');
const bHeadMiss = buildRealTagHumanExecutionReceiptImporter({
  ...BASE, expected_head: 'different-sha-value', _mock_timestamp: TS,
});
assert(bHeadMiss.importer_status === 'IMPORTER_BLOCKED_HEAD_MISMATCH',        '[I-01] head mismatch → BLOCKED_HEAD_MISMATCH');
assert(bHeadMiss.tag_matched     === true,                                     '[I-02] tag passed before head check');

// ─── Suite J: Gate 7 — Timestamp ─────────────────────────────────
console.log('\n[Suite J] Gate 7 — Timestamp');
const bBadTs = buildRealTagHumanExecutionReceiptImporter({
  ...BASE,
  receipt_data: { ...validReceipt, timestamp: 'not-a-date' },
  _mock_timestamp: TS,
});
assert(bBadTs.importer_status === 'IMPORTER_BLOCKED_TIMESTAMP',               '[J-01] invalid timestamp → BLOCKED_TIMESTAMP');

// ─── Suite K: Gate 8 — Hash ───────────────────────────────────────
console.log('\n[Suite K] Gate 8 — Hash');
const bShortHash = buildRealTagHumanExecutionReceiptImporter({
  ...BASE,
  receipt_data: { ...validReceipt, receipt_hash: 'short' },
  _mock_timestamp: TS,
});
assert(bShortHash.importer_status === 'IMPORTER_BLOCKED_HASH',                '[K-01] short hash → BLOCKED_HASH');
assert(bShortHash.timestamp_valid === true,                                    '[K-02] timestamp passed before hash check');

// ─── Suite L: Non-fixture READY ───────────────────────────────────
console.log('\n[Suite L] Non-fixture READY');
const ready = buildRealTagHumanExecutionReceiptImporter({ ...BASE, _mock_timestamp: TS });
assert(ready.importer_status === 'IMPORTER_READY',                            '[L-01] all gates → IMPORTER_READY');
assert(ready.importer_ready  === true,                                        '[L-02] ready=true');
assert(ready.imported_receipt.target_tag === 'v99.0.0',                      '[L-03] imported_receipt has target_tag');
assert(ready.tag_created === false,                                            '[L-04] tag_created=false even when READY');

// no expected_tag/head → skip those checks
const readyNoExpected = buildRealTagHumanExecutionReceiptImporter({
  ...BASE, expected_tag: undefined, expected_head: undefined, _mock_timestamp: TS,
});
assert(readyNoExpected.importer_status === 'IMPORTER_READY',                  '[L-05] no expected values → still READY');

// ─── Suite M: Deterministic ID ────────────────────────────────────
console.log('\n[Suite M] Deterministic ID');
const m1 = buildRealTagHumanExecutionReceiptImporter({ fixture_mode: true, _mock_timestamp: TS });
const m2 = buildRealTagHumanExecutionReceiptImporter({ fixture_mode: true, _mock_timestamp: TS });
assert(m1.importer_id === m2.importer_id,                                     '[M-01] deterministic id');

// ─── Suite N: Render ──────────────────────────────────────────────
console.log('\n[Suite N] Render');
const rendered = renderReceiptImporterSummary(fix);
assert(typeof rendered === 'string',                                           '[N-01] returns string');
assert(rendered.includes('IMPORTER_READY'),                                   '[N-02] status in output');
assert(rendered.includes('tag_created                 : false'),              '[N-03] tag_created=false');
assert(rendered.includes('actual_real_tag_created     : false'),              '[N-04] actual_tag=false');
assert(rendered.includes('real_execution_not_performed: true'),               '[N-05] not_performed=true');
assert(rendered.includes('IMPORTED RECEIPT'),                                  '[N-06] imported receipt section');
assert(rendered.includes('receipt_type'),                                      '[N-07] receipt_type field');

const renderedBlocked = renderReceiptImporterSummary(bNoGate);
assert(!renderedBlocked.includes('IMPORTED RECEIPT'),                         '[N-08] blocked: no imported receipt');

assert(renderReceiptImporterSummary(null) === 'receipt_importer: null',       '[N-09] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-human-execution-receipt-importer: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
