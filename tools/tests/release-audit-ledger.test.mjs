#!/usr/bin/env node
/**
 * Release Audit Ledger — Unit Tests V16.4
 */

import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join }                            from 'path';
import { tmpdir }                          from 'os';
import { spawnSync }                       from 'child_process';
import { resolve }                         from 'path';
import {
  ReleaseLedger,
  appendLedgerEvent,
  readLedger,
  validateLedgerChain,
  LEDGER_EVENT_TYPES,
  LEDGER_GENESIS_HASH,
  LEDGER_SCHEMA_VERSION,
} from '../release-audit-ledger.mjs';

const CLI = resolve(process.cwd(), 'tools', 'release-audit-ledger.mjs');
let passed = 0, failed = 0;
function assert(c, m) { if (c) { console.log(`  ✓ ${m}`); passed++; } else { console.error(`  ✗ FAIL: ${m}`); failed++; } }
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

function tempLedger() {
  const dir  = mkdtempSync(join(tmpdir(), 'vision-ledger-test-'));
  const path = join(dir, 'events.ndjson');
  return { path, cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch (_) {} } };
}

const evidenceRefs  = { evidence_receipt_id: 'ev_gocore_v164', evidence_source: 'go-core' };
const authorityRefs = { contract_id: 'contract_v164', reviewer: 'pass_gold_authority' };

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(LEDGER_SCHEMA_VERSION === 'v16.4',                          '[A-01] schema=v16.4');
assert(Array.isArray(LEDGER_EVENT_TYPES) && LEDGER_EVENT_TYPES.length === 9, '[A-02] 9 event types');
assert(LEDGER_EVENT_TYPES.includes('RELEASE_PLAN_CREATED'),       '[A-03] RELEASE_PLAN_CREATED');
assert(LEDGER_EVENT_TYPES.includes('RELEASE_SIMULATED'),          '[A-04] RELEASE_SIMULATED');
assert(LEDGER_EVENT_TYPES.includes('TAG_CREATED'),                '[A-05] TAG_CREATED');
assert(LEDGER_EVENT_TYPES.includes('STABLE_GATE_CHECKED'),        '[A-06] STABLE_GATE_CHECKED');
assert(LEDGER_EVENT_TYPES.includes('ROLLBACK_DRILL_EXECUTED'),    '[A-07] ROLLBACK_DRILL_EXECUTED');
assert(LEDGER_EVENT_TYPES.includes('BLOCKED_DECISION'),           '[A-08] BLOCKED_DECISION');
assert(LEDGER_EVENT_TYPES.includes('PASS_GOLD_AUTHORITY_BOUND'),  '[A-09] PASS_GOLD_AUTHORITY_BOUND');
assert(typeof LEDGER_GENESIS_HASH === 'string' && LEDGER_GENESIS_HASH.length === 64, '[A-10] genesis hash is 64-char hex');

// ─── Suite B: Append and read ─────────────────────────────────────
console.log('\n[Suite B] Append and read');
let t1 = tempLedger();
try {
  const ledger = new ReleaseLedger(t1.path);
  const ev1 = ledger.appendEvent({ eventType: 'BLOCKED_DECISION', actor: 'test', gitHead: 'abc123', branch: 'main' });
  assert(typeof ev1.event_id === 'string',                         '[B-01] event_id is string');
  assert(ev1.event_id.startsWith('evt_'),                          '[B-02] event_id starts with evt_');
  assert(ev1.event_type === 'BLOCKED_DECISION',                    '[B-03] event_type correct');
  assert(ev1.prev_hash === LEDGER_GENESIS_HASH,                    '[B-04] first event prev_hash = genesis');
  assert(typeof ev1.chain_hash === 'string' && ev1.chain_hash.length === 64, '[B-05] chain_hash is 64-char hex');
  assert(ev1.deploy_performed === false,                           '[B-06] deploy_performed=false');
  assert(ev1.stable_promoted  === false,                           '[B-07] stable_promoted=false');
  assert(ev1.schema_version === 'v16.4',                           '[B-08] schema_version=v16.4');

  const events = ledger.readAll();
  assert(events.length === 1,                                      '[B-09] readAll returns 1 event');
  assert(events[0].event_id === ev1.event_id,                      '[B-10] event_id preserved');
} finally { t1.cleanup(); }

// ─── Suite C: Hash chain ──────────────────────────────────────────
console.log('\n[Suite C] Hash chain');
let t2 = tempLedger();
try {
  const ledger = new ReleaseLedger(t2.path);
  const ev1 = ledger.appendEvent({ eventType: 'BLOCKED_DECISION', actor: 'test-c', gitHead: 'sha1', branch: 'main' });
  const ev2 = ledger.appendEvent({ eventType: 'ROLLBACK_DRILL_EXECUTED', actor: 'test-c', gitHead: 'sha2', branch: 'main' });
  const ev3 = ledger.appendEvent({ eventType: 'PASS_GOLD_AUTHORITY_BOUND', actor: 'test-c', gitHead: 'sha3', branch: 'main' });

  assert(ev2.prev_hash === ev1.chain_hash,                         '[C-01] ev2.prev_hash = ev1.chain_hash');
  assert(ev3.prev_hash === ev2.chain_hash,                         '[C-02] ev3.prev_hash = ev2.chain_hash');
  assert(ev1.chain_hash !== ev2.chain_hash,                        '[C-03] chain_hashes are unique');

  const validation = ledger.validateChain();
  assert(validation.valid === true,                                '[C-04] chain validates correctly');
  assert(validation.total_events === 3,                            '[C-05] 3 events in chain');
  assert(validation.broken_at_index === null,                      '[C-06] no broken index');
} finally { t2.cleanup(); }

// ─── Suite D: Empty ledger chain valid ───────────────────────────
console.log('\n[Suite D] Empty ledger');
let t3 = tempLedger();
try {
  const result = validateLedgerChain(t3.path);
  assert(result.valid === true,                                    '[D-01] empty ledger → chain valid');
  assert(result.total_events === 0,                                '[D-02] empty ledger → 0 events');
  const events = readLedger(t3.path);
  assert(Array.isArray(events) && events.length === 0,             '[D-03] empty ledger → readAll empty');
} finally { t3.cleanup(); }

// ─── Suite E: Tamper detection ───────────────────────────────────
console.log('\n[Suite E] Tamper detection');
let t4 = tempLedger();
try {
  const ledger = new ReleaseLedger(t4.path);
  ledger.appendEvent({ eventType: 'BLOCKED_DECISION', actor: 'test-e', gitHead: 'sha_e1' });
  ledger.appendEvent({ eventType: 'ROLLBACK_DRILL_EXECUTED', actor: 'test-e', gitHead: 'sha_e2' });

  // Tamper: read file, modify actor in first event, write back
  const { readFileSync, writeFileSync } = await import('fs');
  const content = readFileSync(t4.path, 'utf-8');
  const lines   = content.split('\n').filter(Boolean);
  const first   = JSON.parse(lines[0]);
  first.actor   = 'TAMPERED_ACTOR';
  lines[0]      = JSON.stringify(first);
  writeFileSync(t4.path, lines.join('\n') + '\n', 'utf-8');

  const tamperResult = validateLedgerChain(t4.path);
  assert(tamperResult.valid === false,                             '[E-01] tamper detected → chain invalid');
  assert(tamperResult.broken_at_index === 0,                      '[E-02] broken at index 0');
} finally { t4.cleanup(); }

// ─── Suite F: Release-critical events require evidence ───────────
console.log('\n[Suite F] Evidence required for release-critical events');
let t5 = tempLedger();
try {
  const ledger = new ReleaseLedger(t5.path);
  let threw = false;
  try {
    ledger.appendEvent({ eventType: 'RELEASE_PLAN_CREATED', actor: 'test-f', gitHead: 'sha_f' });
  } catch (err) {
    threw = true;
    assert(err.code === 'EVIDENCE_REQUIRED' || err.message.includes('evidence'), '[F-01] missing evidence throws error');
  }
  assert(threw,                                                    '[F-02] throws without evidence');

  // With evidence — succeeds
  const ev = ledger.appendEvent({ eventType: 'RELEASE_PLAN_CREATED', actor: 'test-f', gitHead: 'sha_f', evidenceRefs });
  assert(ev.evidence_refs.evidence_receipt_id === 'ev_gocore_v164','[F-03] evidence_refs preserved');

  // Non-critical events don't require evidence
  const ev2 = ledger.appendEvent({ eventType: 'BLOCKED_DECISION', actor: 'test-f', gitHead: 'sha_f2' });
  assert(ev2.event_type === 'BLOCKED_DECISION',                    '[F-04] non-critical event without evidence succeeds');
} finally { t5.cleanup(); }

// ─── Suite G: Invariants ─────────────────────────────────────────
console.log('\n[Suite G] Invariants');
let t6 = tempLedger();
try {
  const ledger = new ReleaseLedger(t6.path);
  const ev = ledger.appendEvent({ eventType: 'ROLLBACK_DRILL_EXECUTED', actor: 'test-g', gitHead: 'sha_g' });
  assert(ev.deploy_performed === false,                            '[G-01] deploy_performed=false');
  assert(ev.stable_promoted  === false,                            '[G-02] stable_promoted=false');

  const tagEv = ledger.appendEvent({ eventType: 'TAG_CREATED', actor: 'test-g', gitHead: 'sha_g2', evidenceRefs });
  assert(tagEv.tag_created_real === false,                         '[G-03] TAG_CREATED → tag_created_real=false');
  assert(tagEv.deploy_performed === false,                         '[G-04] TAG_CREATED → deploy_performed=false');
  assert(tagEv.stable_promoted  === false,                         '[G-05] TAG_CREATED → stable_promoted=false');
} finally { t6.cleanup(); }

// ─── Suite H: Invalid event type ─────────────────────────────────
console.log('\n[Suite H] Invalid event type');
let t7 = tempLedger();
try {
  const ledger = new ReleaseLedger(t7.path);
  let threw = false;
  try { ledger.appendEvent({ eventType: 'FAKE_EVENT_TYPE' }); } catch { threw = true; }
  assert(threw,                                                    '[H-01] invalid event type throws');
} finally { t7.cleanup(); }

// ─── Suite I: CLI validate ───────────────────────────────────────
console.log('\n[Suite I] CLI validate');
const cliVal = runCLI(['validate', '--json']);
assert(cliVal.exitCode === 0,                                      '[I-01] validate empty ledger → exit 0');
(() => {
  try {
    const o = JSON.parse(cliVal.stdout);
    assert(o.valid === true,                                       '[I-02] validate → valid=true');
    assert(o.total_events === 0,                                   '[I-03] validate → 0 events');
  } catch { assert(false, '[I-02..03] valid JSON'); }
})();

// ─── Result ───────────────────────────────────────────────────────
console.log(`\nRelease Audit Ledger Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
