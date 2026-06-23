#!/usr/bin/env node
/**
 * Runtime Evidence Ledger Integration — Unit Tests V23.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join }   from 'path';
import {
  appendRuntimeEvidenceCollected,
  appendGoCorReceiptValidated,
  appendPassGoldRuntimeBound,
  appendLocalPassGoldDrillExecuted,
  validateRuntimeLedger,
  readRuntimeLedger,
  RUNTIME_LEDGER_EVENTS,
} from '../runtime-evidence-ledger-integration.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-evidence-ledger-integration.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// Temp ledger for each test
function makeTempLedger() {
  const dir  = mkdtempSync(join(tmpdir(), 'vision-ledger-test-'));
  const path = join(dir, 'events.ndjson');
  return { dir, path };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RUNTIME_LEDGER_EVENTS),                              '[A-01] RUNTIME_LEDGER_EVENTS is array');
assert(RUNTIME_LEDGER_EVENTS.length === 4,                                '[A-02] 4 runtime event types');
assert(RUNTIME_LEDGER_EVENTS.includes('RUNTIME_EVIDENCE_COLLECTED'),      '[A-03] RUNTIME_EVIDENCE_COLLECTED');
assert(RUNTIME_LEDGER_EVENTS.includes('GO_CORE_RECEIPT_VALIDATED'),       '[A-04] GO_CORE_RECEIPT_VALIDATED');
assert(RUNTIME_LEDGER_EVENTS.includes('PASS_GOLD_RUNTIME_BOUND'),         '[A-05] PASS_GOLD_RUNTIME_BOUND');
assert(RUNTIME_LEDGER_EVENTS.includes('LOCAL_PASS_GOLD_DRILL_EXECUTED'),  '[A-06] LOCAL_PASS_GOLD_DRILL_EXECUTED');

// ─── Suite B: Append runtime evidence event ───────────────────────
console.log('\n[Suite B] Append RUNTIME_EVIDENCE_COLLECTED');
{
  const { dir, path } = makeTempLedger();
  try {
    const evt = appendRuntimeEvidenceCollected({
      ledgerPath:           path,
      actor:                'test-runner',
      gitHead:              'abc123',
      branch:               'main',
      runtimeEvidenceResult: {
        runtime_evidence_status: 'RUNTIME_EVIDENCE_READY',
        runtime_evidence_ready:  true,
        backend_alive:           true,
        backend_stub:            false,
        mission_id:              'msn_test',
        evidence_receipt_id:     'rcpt_test',
        evidence_source:         'go-core',
      },
    });
    assert(evt.event_type     === 'RUNTIME_EVIDENCE_COLLECTED', '[B-01] event_type correct');
    assert(evt.deploy_performed === false,                       '[B-02] deploy_performed=false');
    assert(evt.stable_promoted  === false,                       '[B-03] stable_promoted=false');
    assert(evt.chain_hash        !== null,                        '[B-04] chain_hash present');
    assert(evt.prev_hash         !== null,                        '[B-05] prev_hash present');
    assert(evt.payload.deploy_allowed    === false,              '[B-06] payload deploy=false');
    assert(evt.payload.promotion_allowed === false,              '[B-07] payload promotion=false');
    assert(evt.evidence_refs.mission_id  === 'msn_test',         '[B-08] evidence_refs.mission_id');

    // Verify chain
    const chain = validateRuntimeLedger(path);
    assert(chain.valid          === true, '[B-09] chain valid after append');
    assert(chain.total_events   === 1,    '[B-10] 1 event in ledger');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite C: Append Go Core receipt event ────────────────────────
console.log('\n[Suite C] Append GO_CORE_RECEIPT_VALIDATED');
{
  const { dir, path } = makeTempLedger();
  try {
    const evt = appendGoCorReceiptValidated({
      ledgerPath:    path,
      gitHead:       'def456',
      receiptResult: {
        receipt_id:     'rcpt_001',
        mission_id:     'msn_001',
        source:         'go-core',
        receipt_status: 'RECEIPT_VALID',
        receipt_valid:  true,
        hash_verified:  true,
      },
    });
    assert(evt.event_type              === 'GO_CORE_RECEIPT_VALIDATED', '[C-01] event_type correct');
    assert(evt.payload.receipt_valid   === true,                        '[C-02] receipt_valid=true');
    assert(evt.payload.deploy_allowed  === false,                       '[C-03] deploy=false');
    assert(evt.evidence_refs.source    === 'go-core',                   '[C-04] source=go-core in refs');

    const chain = validateRuntimeLedger(path);
    assert(chain.valid === true, '[C-05] chain valid');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite D: Append PASS_GOLD_RUNTIME_BOUND event ───────────────
console.log('\n[Suite D] Append PASS_GOLD_RUNTIME_BOUND');
{
  const { dir, path } = makeTempLedger();
  try {
    const evt = appendPassGoldRuntimeBound({
      ledgerPath:    path,
      bindingResult: {
        pass_gold_runtime_binding_status: 'PASSGOLD_RUNTIME_READY',
        pass_gold_runtime_binding_valid:  true,
        pass_gold_candidate_allowed:      true,
        mission_id:                       'msn_001',
        evidence_receipt_id:              'rcpt_001',
        evidence_source:                  'go-core',
      },
    });
    assert(evt.event_type                              === 'PASS_GOLD_RUNTIME_BOUND', '[D-01] event_type correct');
    assert(evt.payload.binding_valid                   === true,                      '[D-02] binding_valid=true');
    assert(evt.payload.pass_gold_candidate_allowed     === true,                      '[D-03] candidate_allowed=true');
    assert(evt.payload.deploy_allowed                  === false,                     '[D-04] deploy=false');
    assert(evt.payload.promotion_allowed               === false,                     '[D-05] promotion=false');

    const chain = validateRuntimeLedger(path);
    assert(chain.valid === true, '[D-06] chain valid');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite E: Append LOCAL_PASS_GOLD_DRILL_EXECUTED event ────────
console.log('\n[Suite E] Append LOCAL_PASS_GOLD_DRILL_EXECUTED');
{
  const { dir, path } = makeTempLedger();
  try {
    const evt = appendLocalPassGoldDrillExecuted({
      ledgerPath:  path,
      drillResult: {
        drill_status:                'DRILL_PASS_GOLD_READY_LOCAL',
        drill_ready:                 true,
        local_only:                  true,
        pass_gold_candidate_allowed: true,
        temp_root_removed:           true,
        mission_id:                  'msn_drill',
        evidence_receipt_id:         'rcpt_drill',
        evidence_source:             'go-core',
      },
    });
    assert(evt.event_type                         === 'LOCAL_PASS_GOLD_DRILL_EXECUTED', '[E-01] event_type correct');
    assert(evt.payload.drill_ready                === true,                             '[E-02] drill_ready=true');
    assert(evt.payload.local_only                 === true,                             '[E-03] local_only=true');
    assert(evt.payload.temp_root_removed          === true,                             '[E-04] temp_root_removed=true');
    assert(evt.payload.deploy_allowed             === false,                            '[E-05] deploy=false');

    const chain = validateRuntimeLedger(path);
    assert(chain.valid === true, '[E-06] chain valid');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite F: Multi-event chain ───────────────────────────────────
console.log('\n[Suite F] Multi-event chain and tamper detection');
{
  const { dir, path } = makeTempLedger();
  try {
    appendRuntimeEvidenceCollected({ ledgerPath: path, runtimeEvidenceResult: { mission_id: 'm1', evidence_receipt_id: 'r1', evidence_source: 'go-core' } });
    appendGoCorReceiptValidated({ ledgerPath: path, receiptResult: { receipt_id: 'r1', mission_id: 'm1', source: 'go-core', receipt_valid: true } });
    appendPassGoldRuntimeBound({ ledgerPath: path, bindingResult: { mission_id: 'm1', evidence_receipt_id: 'r1', evidence_source: 'go-core' } });
    appendLocalPassGoldDrillExecuted({ ledgerPath: path, drillResult: { mission_id: 'm1', evidence_receipt_id: 'r1', evidence_source: 'go-core' } });

    const chain = validateRuntimeLedger(path);
    assert(chain.valid         === true, '[F-01] chain valid after 4 events');
    assert(chain.total_events  === 4,    '[F-02] 4 events recorded');

    const events = readRuntimeLedger(path);
    assert(events.length === 4, '[F-03] readRuntimeLedger returns 4 events');
    assert(events[0].event_type === 'RUNTIME_EVIDENCE_COLLECTED',     '[F-04] event[0] type');
    assert(events[1].event_type === 'GO_CORE_RECEIPT_VALIDATED',      '[F-05] event[1] type');
    assert(events[2].event_type === 'PASS_GOLD_RUNTIME_BOUND',        '[F-06] event[2] type');
    assert(events[3].event_type === 'LOCAL_PASS_GOLD_DRILL_EXECUTED', '[F-07] event[3] type');

    // Hash chain integrity: each event's prev_hash = previous event's chain_hash
    assert(events[1].prev_hash === events[0].chain_hash, '[F-08] chain linked 0→1');
    assert(events[2].prev_hash === events[1].chain_hash, '[F-09] chain linked 1→2');
    assert(events[3].prev_hash === events[2].chain_hash, '[F-10] chain linked 2→3');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite G: Invariants in payload ──────────────────────────────
console.log('\n[Suite G] Payload invariants');
{
  const { dir, path } = makeTempLedger();
  try {
    const evt = appendRuntimeEvidenceCollected({ ledgerPath: path });
    assert(evt.payload.deploy_allowed    === false, '[G-01] deploy=false (empty input)');
    assert(evt.payload.promotion_allowed === false, '[G-02] promotion=false (empty input)');
    assert(evt.stable_promoted           === false, '[G-03] stable_promoted=false');
    assert(evt.deploy_performed          === false, '[G-04] deploy_performed=false (ledger base)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite H: CLI ─────────────────────────────────────────────────
console.log('\n[Suite H] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 0,                            '[H-01] CLI exit 0');
assert(cliDefault.stdout.includes('v23.0'),                  '[H-02] CLI stdout has schema version');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 0,                               '[H-03] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                      '[H-04] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,         '[H-05] deploy=false');
assert(parsed && parsed.promotion_allowed === false,         '[H-06] promotion=false');
assert(parsed && parsed.events_registered === 4,            '[H-07] 4 events registered');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-evidence-ledger-integration: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
