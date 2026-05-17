#!/usr/bin/env node
/**
 * PI Harness Release Rehearsal Mode — Unit Tests V53.1
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';

const CLI = resolve(process.cwd(), 'tools', 'pi-harness.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

function runHarness(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, '--mode', 'interactive', '--dry-run', '--json', ...args], {
    encoding: 'utf-8',
    timeout: 30000,
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout || '{}'); } catch { parsed = null; }
  return { parsed, stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// Pre-compute runs
const def    = runHarness([]);
const full   = runHarness([
  '--release-rehearsal',
  '--fixture-manual-release-handoff',
  '--fixture-sandbox',
  '--fixture-rehearsal-plan',
  '--ledger-rehearsal',
]);
const noLedger = runHarness([
  '--release-rehearsal',
  '--fixture-sandbox',
  '--fixture-rehearsal-plan',
]);

// ─── Suite A: Default mode (no rehearsal) ────────────────────────
console.log('\n[Suite A] Default mode (no --release-rehearsal)');
assert(def.parsed !== null,                                                          '[A-01] JSON parseable');
assert(def.parsed?.release_rehearsal_enabled   === false,                            '[A-02] rehearsal_enabled=false');
assert(def.parsed?.sandbox_ready               === false,                            '[A-03] sandbox_ready=false');
assert(def.parsed?.rehearsal_ready             === false,                            '[A-04] rehearsal_ready=false');
assert(def.parsed?.release_execution_allowed   === false,                            '[A-05] exec_allowed=false');
assert(def.parsed?.release_performed           === false,                            '[A-06] release_performed=false');
assert(def.parsed?.tag_created                 === false,                            '[A-07] tag_created=false');
assert(def.parsed?.stable_promoted             === false,                            '[A-08] stable_promoted=false');
assert(def.parsed?.deploy_performed            === false,                            '[A-09] deploy_performed=false');
assert(def.parsed?.deploy_allowed              === false,                            '[A-10] deploy_allowed=false');

// ─── Suite B: Full fixture rehearsal mode ────────────────────────
console.log('\n[Suite B] Full fixture rehearsal mode');
assert(full.parsed !== null,                                                         '[B-01] JSON parseable');
assert(full.parsed?.release_rehearsal_enabled  === true,                             '[B-02] rehearsal_enabled=true');
assert(full.parsed?.sandbox_ready              === true,                             '[B-03] sandbox_ready=true');
assert(full.parsed?.command_simulator_ready    === true,                             '[B-04] simulator_ready=true');
assert(full.parsed?.rehearsal_plan_ready       === true,                             '[B-05] plan_ready=true');
assert(full.parsed?.rehearsal_ready            === true,                             '[B-06] rehearsal_ready=true');
assert(typeof full.parsed?.rehearsal_report_id === 'string',                         '[B-07] report_id string');
assert(Array.isArray(full.parsed?.rehearsal_ledger_event_ids),                       '[B-08] ledger_event_ids array');
assert(full.parsed?.rehearsal_ledger_event_ids.length === 5,                         '[B-09] 5 ledger events');
assert(full.parsed?.rehearsal_ledger_chain_valid === true,                           '[B-10] ledger_chain_valid=true');
assert(full.parsed?.release_execution_allowed  === false,                            '[B-11] exec_allowed=false');
assert(full.parsed?.release_performed          === false,                            '[B-12] release_performed=false');
assert(full.parsed?.tag_created                === false,                            '[B-13] tag_created=false');
assert(full.parsed?.stable_promoted            === false,                            '[B-14] stable_promoted=false');
assert(full.parsed?.deploy_performed           === false,                            '[B-15] deploy_performed=false');
assert(full.parsed?.deploy_allowed             === false,                            '[B-16] deploy_allowed=false');
assert(full.parsed?.promotion_allowed          === false,                            '[B-17] promotion_allowed=false');

// ─── Suite C: Rehearsal without ledger ───────────────────────────
console.log('\n[Suite C] Rehearsal without --ledger-rehearsal');
assert(noLedger.parsed !== null,                                                     '[C-01] JSON parseable');
assert(noLedger.parsed?.release_rehearsal_enabled === true,                          '[C-02] rehearsal_enabled=true');
assert(noLedger.parsed?.rehearsal_ledger_event_ids?.length === 0,                    '[C-03] no ledger events without --ledger-rehearsal');
assert(noLedger.parsed?.release_execution_allowed === false,                         '[C-04] exec_allowed=false');

// ─── Suite D: Invariants across all modes ────────────────────────
console.log('\n[Suite D] Invariants across all modes');
const modes = [
  { label: 'default',    o: def.parsed    },
  { label: 'full',       o: full.parsed   },
  { label: 'no-ledger',  o: noLedger.parsed },
];
for (const { label, o } of modes) {
  assert(o !== null,                              `[D] ${label}: JSON parseable`);
  assert(o?.release_execution_allowed === false,  `[D] ${label}: exec_allowed=false`);
  assert(o?.deploy_allowed             === false, `[D] ${label}: deploy_allowed=false`);
  assert(o?.promotion_allowed          === false, `[D] ${label}: promotion_allowed=false`);
  assert(o?.release_performed          === false, `[D] ${label}: release_performed=false`);
  assert(o?.tag_created                === false, `[D] ${label}: tag_created=false`);
  assert(o?.stable_promoted            === false, `[D] ${label}: stable_promoted=false`);
  assert(o?.deploy_performed           === false, `[D] ${label}: deploy_performed=false`);
}

// ─── Suite E: V53.1 fields present in default JSON ───────────────
console.log('\n[Suite E] V53.1 fields present in JSON');
assert('release_rehearsal_enabled'    in (def.parsed ?? {}), '[E-01] field rehearsal_enabled present');
assert('sandbox_ready'                in (def.parsed ?? {}), '[E-02] field sandbox_ready present');
assert('rehearsal_ready'              in (def.parsed ?? {}), '[E-03] field rehearsal_ready present');
assert('rehearsal_ledger_event_ids'   in (def.parsed ?? {}), '[E-04] field ledger_event_ids present');
assert('release_execution_allowed'    in (def.parsed ?? {}), '[E-05] field exec_allowed present');
assert('release_performed'            in (def.parsed ?? {}), '[E-06] field release_performed present');
assert('tag_created'                  in (def.parsed ?? {}), '[E-07] field tag_created present');
assert('stable_promoted'              in (def.parsed ?? {}), '[E-08] field stable_promoted present');
assert('deploy_performed'             in (def.parsed ?? {}), '[E-09] field deploy_performed present');

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\npi-harness-release-rehearsal: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
