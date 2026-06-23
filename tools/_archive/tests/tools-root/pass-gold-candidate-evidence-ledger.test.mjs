#!/usr/bin/env node
/**
 * PASS GOLD Candidate Evidence Ledger — Unit Tests V34.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  appendCandidateLedgerEntry,
  readCandidateLedger,
  getLastLedgerEntries,
  _resetLedgerForTest,
  LEDGER_EVENT_TYPES,
  LEDGER_STATUSES,
} from '../pass-gold-candidate-evidence-ledger.mjs';

const CLI = resolve(process.cwd(), 'tools', 'pass-gold-candidate-evidence-ledger.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

function reset() { _resetLedgerForTest(); }

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(LEDGER_EVENT_TYPES),                                              '[A-01] event types is array');
assert(LEDGER_EVENT_TYPES.length === 4,                                                '[A-02] 4 event types');
assert(LEDGER_EVENT_TYPES.includes('RUNTIME_BRIDGE_READY'),                           '[A-03] RUNTIME_BRIDGE_READY');
assert(LEDGER_EVENT_TYPES.includes('PASS_GOLD_CANDIDATE_DRILL_READY'),                '[A-04] PASS_GOLD_CANDIDATE_DRILL_READY');
assert(LEDGER_EVENT_TYPES.includes('PASS_GOLD_CANDIDATE_BLOCKED'),                    '[A-05] PASS_GOLD_CANDIDATE_BLOCKED');
assert(LEDGER_EVENT_TYPES.includes('PASS_GOLD_CANDIDATE_CONFIRMED_LOCAL'),            '[A-06] PASS_GOLD_CANDIDATE_CONFIRMED_LOCAL');
assert(Array.isArray(LEDGER_STATUSES),                                                '[A-07] statuses is array');
assert(LEDGER_STATUSES.length === 3,                                                   '[A-08] 3 statuses');
assert(LEDGER_STATUSES.includes('LEDGER_BLOCKED_INVALID_EVENT'),                      '[A-09] BLOCKED_INVALID_EVENT');
assert(LEDGER_STATUSES.includes('LEDGER_BLOCKED_IMMUTABILITY'),                       '[A-10] BLOCKED_IMMUTABILITY');
assert(LEDGER_STATUSES.includes('LEDGER_APPEND_OK'),                                  '[A-11] LEDGER_APPEND_OK');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
reset();
const blocked = appendCandidateLedgerEntry({});
const ok      = appendCandidateLedgerEntry({ event_type: 'RUNTIME_BRIDGE_READY', mission_id: 'm1', evidence_receipt_id: 'r1', evidence_source: 'go-core' });
assert(blocked.deploy_allowed    === false, '[B-01] deploy=false (blocked)');
assert(blocked.promotion_allowed === false, '[B-02] promotion=false (blocked)');
assert(blocked.stable_allowed    === false, '[B-03] stable=false (blocked)');
assert(blocked.tag_created       === false, '[B-04] tag_created=false (blocked)');
assert(blocked.stable_promoted   === false, '[B-05] stable_promoted=false (blocked)');
assert(ok.deploy_allowed         === false, '[B-06] deploy=false (ok)');
assert(ok.promotion_allowed      === false, '[B-07] promotion=false (ok)');
assert(ok.stable_allowed         === false, '[B-08] stable=false (ok)');
assert(ok.tag_created            === false, '[B-09] tag_created=false (ok)');
assert(ok.stable_promoted        === false, '[B-10] stable_promoted=false (ok)');

// ─── Suite C: Invalid event type ─────────────────────────────────
console.log('\n[Suite C] Invalid event type');
reset();
const noType = appendCandidateLedgerEntry({});
assert(noType.ledger_status   === 'LEDGER_BLOCKED_INVALID_EVENT', '[C-01] no type → BLOCKED_INVALID_EVENT');
assert(noType.ledger_append_ok === false,                          '[C-02] append_ok=false');
assert(noType.entry_id         === null,                           '[C-03] entry_id=null');

const badType = appendCandidateLedgerEntry({ event_type: 'FAKE_EVENT' });
assert(badType.ledger_status   === 'LEDGER_BLOCKED_INVALID_EVENT', '[C-04] bad type → BLOCKED_INVALID_EVENT');

const nullType = appendCandidateLedgerEntry({ event_type: null });
assert(nullType.ledger_status  === 'LEDGER_BLOCKED_INVALID_EVENT', '[C-05] null type → BLOCKED_INVALID_EVENT');

// ─── Suite D: Source validation for gold events ───────────────────
console.log('\n[Suite D] Source validation');
reset();
const drillReadyBadSource = appendCandidateLedgerEntry({
  event_type: 'PASS_GOLD_CANDIDATE_DRILL_READY',
  evidence_source: 'backend',
  mission_id: 'm1',
  evidence_receipt_id: 'r1',
});
assert(drillReadyBadSource.ledger_status === 'LEDGER_BLOCKED_INVALID_EVENT', '[D-01] drill-ready backend source → blocked');
assert(drillReadyBadSource.blocking_reason.includes('evidence_source_not_go_core'), '[D-02] correct blocking reason');

const confirmedBadSource = appendCandidateLedgerEntry({
  event_type: 'PASS_GOLD_CANDIDATE_CONFIRMED_LOCAL',
  evidence_source: null,
  mission_id: 'm1',
  evidence_receipt_id: 'r1',
});
assert(confirmedBadSource.ledger_status === 'LEDGER_BLOCKED_INVALID_EVENT', '[D-03] confirmed null source → blocked');

// RUNTIME_BRIDGE_READY and PASS_GOLD_CANDIDATE_BLOCKED don't require go-core source
const bridgeReady = appendCandidateLedgerEntry({ event_type: 'RUNTIME_BRIDGE_READY', evidence_source: null });
assert(bridgeReady.ledger_status === 'LEDGER_APPEND_OK', '[D-04] RUNTIME_BRIDGE_READY accepts null source');

const pgBlocked = appendCandidateLedgerEntry({ event_type: 'PASS_GOLD_CANDIDATE_BLOCKED', evidence_source: 'stub' });
assert(pgBlocked.ledger_status === 'LEDGER_APPEND_OK', '[D-05] PASS_GOLD_CANDIDATE_BLOCKED accepts any source');

// ─── Suite E: Successful appends ─────────────────────────────────
console.log('\n[Suite E] Successful appends');
reset();
const e1 = appendCandidateLedgerEntry({
  event_type:          'RUNTIME_BRIDGE_READY',
  mission_id:          'mission-001',
  evidence_receipt_id: 'receipt-001',
  evidence_source:     'go-core',
  drill_status:        'PROBE_BRIDGE_READY',
});
assert(e1.ledger_status          === 'LEDGER_APPEND_OK',   '[E-01] status=LEDGER_APPEND_OK');
assert(e1.ledger_append_ok       === true,                  '[E-02] append_ok=true');
assert(typeof e1.entry_id        === 'string',              '[E-03] entry_id is string');
assert(e1.seq                    === 1,                     '[E-04] seq=1');
assert(e1.event_type             === 'RUNTIME_BRIDGE_READY', '[E-05] event_type echoed');
assert(e1.mission_id             === 'mission-001',         '[E-06] mission_id echoed');
assert(e1.evidence_receipt_id    === 'receipt-001',         '[E-07] receipt_id echoed');
assert(e1.evidence_source        === 'go-core',             '[E-08] evidence_source echoed');
assert(e1.candidate_is_local_drill === true,                '[E-09] candidate_is_local_drill=true');
assert(e1.blocking_reason        === null,                  '[E-10] blocking_reason=null');
assert(e1.total_entries          === 1,                     '[E-11] total_entries=1');

const e2 = appendCandidateLedgerEntry({
  event_type:          'PASS_GOLD_CANDIDATE_DRILL_READY',
  mission_id:          'mission-001',
  evidence_receipt_id: 'receipt-001',
  evidence_source:     'go-core',
  drill_status:        'FULL_CANDIDATE_DRILL_READY',
});
assert(e2.ledger_status  === 'LEDGER_APPEND_OK', '[E-12] second append OK');
assert(e2.seq            === 2,                   '[E-13] seq=2');
assert(e2.total_entries  === 2,                   '[E-14] total_entries=2');

// All 4 event types
reset();
for (const evt of LEDGER_EVENT_TYPES) {
  const opts = { event_type: evt, evidence_source: 'go-core', mission_id: 'm1', evidence_receipt_id: 'r1' };
  const r = appendCandidateLedgerEntry(opts);
  assert(r.ledger_status === 'LEDGER_APPEND_OK', `[E-15] ${evt} → LEDGER_APPEND_OK`);
}

// ─── Suite F: Append-only / read operations ───────────────────────
console.log('\n[Suite F] Append-only / read');
reset();
appendCandidateLedgerEntry({ event_type: 'RUNTIME_BRIDGE_READY', evidence_source: null });
appendCandidateLedgerEntry({ event_type: 'PASS_GOLD_CANDIDATE_BLOCKED', evidence_source: null });

const ledger = readCandidateLedger();
assert(ledger.total_entries     === 2,    '[F-01] total_entries=2');
assert(Array.isArray(ledger.entries),     '[F-02] entries is array');
assert(ledger.entries.length    === 2,    '[F-03] entries.length=2');
assert(ledger.deploy_allowed    === false, '[F-04] ledger.deploy=false');
assert(ledger.promotion_allowed === false, '[F-05] ledger.promotion=false');
assert(ledger.stable_allowed    === false, '[F-06] ledger.stable=false');

// Entries are frozen (immutable)
const entry = ledger.entries[0];
const before = entry.event_type;
try { entry.event_type = 'MUTATED'; } catch {}
assert(entry.event_type === before, '[F-07] entries are immutable');

// getLastLedgerEntries
reset();
for (let i = 0; i < 5; i++) {
  appendCandidateLedgerEntry({ event_type: 'RUNTIME_BRIDGE_READY', evidence_source: null });
}
const last3 = getLastLedgerEntries(3);
assert(Array.isArray(last3),     '[F-08] getLastLedgerEntries returns array');
assert(last3.length === 3,       '[F-09] returns 3 entries');
assert(last3[0].seq === 3,       '[F-10] correct seq order');

// ─── Suite G: Schema ──────────────────────────────────────────────
console.log('\n[Suite G] Schema');
reset();
const schemaOk = appendCandidateLedgerEntry({ event_type: 'RUNTIME_BRIDGE_READY' });
assert(schemaOk.schema_version   === 'v34.0', '[G-01] schema=v34.0 (ok)');
assert(blocked.schema_version    === 'v34.0', '[G-02] schema=v34.0 (blocked)');

// ─── Suite H: CLI ─────────────────────────────────────────────────
console.log('\n[Suite H] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 0,                               '[H-01] default → exit 0');
assert(cliDefault.stdout.includes('LEDGER_APPEND_OK'),          '[H-02] stdout LEDGER_APPEND_OK');
assert(cliDefault.stdout.includes('deploy_allowed'),            '[H-03] stdout deploy_allowed');
assert(cliDefault.stdout.includes('tag_created'),               '[H-04] stdout tag_created');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 0,                                   '[H-05] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                          '[H-06] JSON parseable');
assert(parsed && parsed.ledger_append_ok    === true,            '[H-07] ledger_append_ok=true');
assert(parsed && parsed.deploy_allowed      === false,           '[H-08] deploy=false');
assert(parsed && parsed.promotion_allowed   === false,           '[H-09] promotion=false');
assert(parsed && parsed.tag_created         === false,           '[H-10] tag_created=false');
assert(parsed && parsed.stable_promoted     === false,           '[H-11] stable_promoted=false');
assert(parsed && parsed.candidate_is_local_drill === true,       '[H-12] candidate_is_local_drill=true');
assert(parsed && parsed.evidence_source     === 'go-core',       '[H-13] evidence_source=go-core');

const cliRead = runCLI(['--read']);
assert(cliRead.exitCode === 0,                                   '[H-14] --read exit 0');
assert(cliRead.stdout.includes('total_entries'),                 '[H-15] stdout total_entries');

const cliReadJson = runCLI(['--read', '--json']);
assert(cliReadJson.exitCode === 0,                               '[H-16] --read --json exit 0');
let readParsed;
try { readParsed = JSON.parse(cliReadJson.stdout); } catch { readParsed = null; }
assert(readParsed !== null,                                      '[H-17] read JSON parseable');
assert(readParsed && Array.isArray(readParsed.entries),          '[H-18] entries array present');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\npass-gold-candidate-evidence-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
