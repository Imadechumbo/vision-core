#!/usr/bin/env node
/**
 * Release Evidence Chain Validator — Unit Tests V17.0
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join }                               from 'path';
import { tmpdir }                             from 'os';
import { createHash }                         from 'crypto';
import { spawnSync }                          from 'child_process';
import { resolve }                            from 'path';
import {
  validateEvidenceChain,
  REQUIRED_CHAIN_EVENTS,
  CHAIN_VALIDATOR_STATUSES,
  CHAIN_VALIDATOR_SCHEMA_VERSION,
} from '../release-evidence-chain-validator.mjs';

const CLI = resolve(process.cwd(), 'tools', 'release-evidence-chain-validator.mjs');
let passed = 0, failed = 0;
function assert(c, m) { if (c) { console.log(`  ✓ ${m}`); passed++; } else { console.error(`  ✗ FAIL: ${m}`); failed++; } }
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';

function hashEvent(ev) {
  const clone = { ...ev, chain_hash: null };
  return createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}

function buildEvent(eventType, prevHash, overrides = {}) {
  const ev = {
    schema_version:  'v16.4',
    event_id:        `evt_test_${Math.random().toString(36).slice(2, 8)}`,
    event_type:      eventType,
    timestamp:       new Date().toISOString(),
    actor:           'test',
    git_head:        'sha_test',
    branch:          'main',
    evidence_refs:   { evidence_receipt_id: 'ev_test', evidence_source: 'test' },
    authority_refs:  {},
    payload:         {},
    prev_hash:       prevHash,
    chain_hash:      null,
    deploy_performed:   false,
    stable_promoted:    false,
    ...overrides,
  };
  ev.chain_hash = hashEvent(ev);
  return ev;
}

function buildChain(eventTypes) {
  const events = [];
  let prevHash = GENESIS;
  for (const type of eventTypes) {
    const ev = buildEvent(type, prevHash);
    events.push(ev);
    prevHash = ev.chain_hash;
  }
  return events;
}

function writeLedger(events) {
  const dir  = mkdtempSync(join(tmpdir(), 'vision-chain-test-'));
  const path = join(dir, 'events.ndjson');
  writeFileSync(path, events.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
  return { path, cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch (_) {} } };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(CHAIN_VALIDATOR_SCHEMA_VERSION === 'v17.0',                           '[A-01] schema=v17.0');
assert(Array.isArray(CHAIN_VALIDATOR_STATUSES) && CHAIN_VALIDATOR_STATUSES.length === 6, '[A-02] 6 statuses');
assert(CHAIN_VALIDATOR_STATUSES.includes('CHAIN_VALID'),                     '[A-03] CHAIN_VALID');
assert(CHAIN_VALIDATOR_STATUSES.includes('CHAIN_BLOCKED_NO_LEDGER'),         '[A-04] CHAIN_BLOCKED_NO_LEDGER');
assert(CHAIN_VALIDATOR_STATUSES.includes('CHAIN_BLOCKED_EMPTY'),             '[A-05] CHAIN_BLOCKED_EMPTY');
assert(CHAIN_VALIDATOR_STATUSES.includes('CHAIN_BLOCKED_INTEGRITY'),         '[A-06] CHAIN_BLOCKED_INTEGRITY');
assert(CHAIN_VALIDATOR_STATUSES.includes('CHAIN_BLOCKED_MISSING_EVENTS'),    '[A-07] CHAIN_BLOCKED_MISSING_EVENTS');
assert(CHAIN_VALIDATOR_STATUSES.includes('CHAIN_BLOCKED_WRONG_ORDER'),       '[A-08] CHAIN_BLOCKED_WRONG_ORDER');
assert(Array.isArray(REQUIRED_CHAIN_EVENTS) && REQUIRED_CHAIN_EVENTS.length === 6, '[A-09] 6 required events');
assert(REQUIRED_CHAIN_EVENTS.includes('RELEASE_PLAN_CREATED'),               '[A-10] RELEASE_PLAN_CREATED required');
assert(REQUIRED_CHAIN_EVENTS.includes('PASS_GOLD_AUTHORITY_BOUND'),          '[A-11] PASS_GOLD_AUTHORITY_BOUND required');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const anyR = validateEvidenceChain({ ledgerPath: '/nonexistent/path.ndjson' });
assert(anyR.deploy_performed  === false,  '[B-01] deploy_performed=false');
assert(anyR.deploy_allowed    === false,  '[B-02] deploy_allowed=false');
assert(anyR.tag_created       === false,  '[B-03] tag_created=false');
assert(anyR.stable_promoted   === false,  '[B-04] stable_promoted=false');
assert(anyR.release_performed === false,  '[B-05] release_performed=false');
assert(anyR.schema_version === 'v17.0',   '[B-06] schema=v17.0');

// ─── Suite C: No ledger ───────────────────────────────────────────
console.log('\n[Suite C] No ledger file');
const noLedger = validateEvidenceChain({ ledgerPath: '/nonexistent/totally/fake.ndjson' });
assert(noLedger.chain_validator_status === 'CHAIN_BLOCKED_NO_LEDGER', '[C-01] missing ledger → CHAIN_BLOCKED_NO_LEDGER');
assert(noLedger.chain_valid  === false,                               '[C-02] no ledger → chain_valid=false');
assert(noLedger.chain_ready  === false,                               '[C-03] no ledger → chain_ready=false');
assert(typeof noLedger.chain_validator_id === 'string',               '[C-04] validator_id is string');
assert(noLedger.chain_validator_id.startsWith('chainval_'),           '[C-05] id starts with chainval_');

// ─── Suite D: Empty ledger ────────────────────────────────────────
console.log('\n[Suite D] Empty ledger');
let dTemp = mkdtempSync(join(tmpdir(), 'vision-chain-empty-'));
let dPath = join(dTemp, 'events.ndjson');
try {
  writeFileSync(dPath, '', 'utf-8');
  const emptyR = validateEvidenceChain({ ledgerPath: dPath });
  assert(emptyR.chain_validator_status === 'CHAIN_BLOCKED_EMPTY', '[D-01] empty → CHAIN_BLOCKED_EMPTY');
  assert(emptyR.chain_valid === false,                             '[D-02] empty → chain_valid=false');
  assert(emptyR.total_events === 0,                               '[D-03] empty → total_events=0');
} finally { try { rmSync(dTemp, { recursive: true, force: true }); } catch (_) {} }

// ─── Suite E: Full valid chain ────────────────────────────────────
console.log('\n[Suite E] Full valid chain');
const fullChain = buildChain(REQUIRED_CHAIN_EVENTS);
let eTemp = writeLedger(fullChain);
try {
  const r = validateEvidenceChain({ ledgerPath: eTemp.path });
  assert(r.chain_validator_status === 'CHAIN_VALID',     '[E-01] full chain → CHAIN_VALID');
  assert(r.chain_valid === true,                         '[E-02] full chain → chain_valid=true');
  assert(r.chain_ready === true,                         '[E-03] full chain → chain_ready=true');
  assert(r.total_events === 6,                           '[E-04] 6 events');
  assert(r.missing_required_events.length === 0,         '[E-05] no missing events');
  assert(r.order_violations.length === 0,                '[E-06] no order violations');
  assert(r.deploy_performed === false,                   '[E-07] deploy_performed=false');
} finally { eTemp.cleanup(); }

// ─── Suite F: Missing events ──────────────────────────────────────
console.log('\n[Suite F] Missing required events');
const partialChain = buildChain(['RELEASE_PLAN_CREATED', 'RELEASE_SIMULATED']);
let fTemp = writeLedger(partialChain);
try {
  const r = validateEvidenceChain({ ledgerPath: fTemp.path });
  assert(r.chain_validator_status === 'CHAIN_BLOCKED_MISSING_EVENTS', '[F-01] partial → CHAIN_BLOCKED_MISSING_EVENTS');
  assert(r.chain_valid === false,                                      '[F-02] partial → chain_valid=false');
  assert(r.missing_required_events.length > 0,                        '[F-03] missing_required_events non-empty');
  assert(r.missing_required_events.includes('ROLLBACK_DRILL_EXECUTED'),'[F-04] ROLLBACK_DRILL_EXECUTED missing');
  assert(r.missing_required_events.includes('PASS_GOLD_AUTHORITY_BOUND'),'[F-05] PASS_GOLD_AUTHORITY_BOUND missing');
} finally { fTemp.cleanup(); }

// ─── Suite G: Hash chain tamper ───────────────────────────────────
console.log('\n[Suite G] Hash chain tamper detection');
const tamperChain = buildChain(REQUIRED_CHAIN_EVENTS);
tamperChain[0].actor = 'TAMPERED';
let gTemp = writeLedger(tamperChain);
try {
  const r = validateEvidenceChain({ ledgerPath: gTemp.path });
  assert(r.chain_validator_status === 'CHAIN_BLOCKED_INTEGRITY', '[G-01] tampered → CHAIN_BLOCKED_INTEGRITY');
  assert(r.chain_valid === false,                                 '[G-02] tampered → chain_valid=false');
  assert(r.integrity_broken_at === 0,                            '[G-03] broken_at=0');
} finally { gTemp.cleanup(); }

// ─── Suite H: Wrong order ─────────────────────────────────────────
console.log('\n[Suite H] Wrong event order');
const wrongOrder = [
  'RELEASE_SIMULATED',       // should come after RELEASE_PLAN_CREATED
  'RELEASE_PLAN_CREATED',
  'MANUAL_RELEASE_GATE_CHECKED',
  'TAG_DRY_RUN_CHECKED',
  'ROLLBACK_DRILL_EXECUTED',
  'PASS_GOLD_AUTHORITY_BOUND',
];
const wrongChain = buildChain(wrongOrder);
let hTemp = writeLedger(wrongChain);
try {
  const r = validateEvidenceChain({ ledgerPath: hTemp.path });
  assert(r.chain_validator_status === 'CHAIN_BLOCKED_WRONG_ORDER', '[H-01] wrong order → CHAIN_BLOCKED_WRONG_ORDER');
  assert(r.chain_valid === false,                                   '[H-02] wrong order → chain_valid=false');
  assert(r.order_violations.length > 0,                            '[H-03] order_violations non-empty');
} finally { hTemp.cleanup(); }

// ─── Suite I: No strict order ─────────────────────────────────────
console.log('\n[Suite I] No strict order mode');
let iTemp = writeLedger(wrongChain);
try {
  const r = validateEvidenceChain({ ledgerPath: iTemp.path, strictOrder: false });
  assert(r.chain_validator_status === 'CHAIN_VALID',   '[I-01] no-strict → CHAIN_VALID despite wrong order');
  assert(r.chain_valid === true,                       '[I-02] no-strict → chain_valid=true');
  assert(r.order_violations.length === 0,              '[I-03] no-strict → order_violations empty');
} finally { iTemp.cleanup(); }

// ─── Suite J: Extra events accepted ──────────────────────────────
console.log('\n[Suite J] Extra events in chain');
const extraChain = buildChain([
  'BLOCKED_DECISION',
  'RELEASE_PLAN_CREATED',
  'BLOCKED_DECISION',
  'RELEASE_SIMULATED',
  'MANUAL_RELEASE_GATE_CHECKED',
  'TAG_DRY_RUN_CHECKED',
  'ROLLBACK_DRILL_EXECUTED',
  'PASS_GOLD_AUTHORITY_BOUND',
]);
let jTemp = writeLedger(extraChain);
try {
  const r = validateEvidenceChain({ ledgerPath: jTemp.path });
  assert(r.chain_validator_status === 'CHAIN_VALID', '[J-01] extra events → CHAIN_VALID');
  assert(r.chain_valid === true,                     '[J-02] extra events → chain_valid=true');
  assert(r.total_events === 8,                       '[J-03] 8 total events');
} finally { jTemp.cleanup(); }

// ─── Suite K: CLI ────────────────────────────────────────────────
console.log('\n[Suite K] CLI entrypoint');

// Non-existent ledger → exit 2
const cliNo = runCLI(['--json', '--ledger', '/nonexistent/path.ndjson']);
assert(cliNo.exitCode === 2,                                          '[K-01] no ledger → exit 2');
(() => {
  try {
    const o = JSON.parse(cliNo.stdout);
    assert(o.chain_validator_status === 'CHAIN_BLOCKED_NO_LEDGER',  '[K-02] → CHAIN_BLOCKED_NO_LEDGER');
    assert(o.deploy_performed === false,                             '[K-03] deploy_performed=false');
  } catch { assert(false, '[K-02..03] valid JSON'); }
})();

// Valid chain CLI
let kTemp = writeLedger(buildChain(REQUIRED_CHAIN_EVENTS));
try {
  const cliOk = runCLI(['--json', '--ledger', kTemp.path]);
  assert(cliOk.exitCode === 0,                                       '[K-04] valid chain → exit 0');
  (() => {
    try {
      const o = JSON.parse(cliOk.stdout);
      assert(o.chain_validator_status === 'CHAIN_VALID',             '[K-05] → CHAIN_VALID');
      assert(o.chain_valid === true,                                 '[K-06] chain_valid=true');
    } catch { assert(false, '[K-05..06] valid JSON'); }
  })();
} finally { kTemp.cleanup(); }

// ─── Result ───────────────────────────────────────────────────────
console.log(`\nEvidence Chain Validator Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
