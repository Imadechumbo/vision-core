#!/usr/bin/env node
/**
 * PI Harness Manual Release Handoff Mode — Unit Tests V49.0
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

// Pre-compute: default + full fixture
const def     = runHarness([]);
const full    = runHarness([
  '--manual-release-handoff',
  '--fixture-supervised-release',
  '--fixture-human-confirmation',
  '--fixture-manual-release-request',
  '--fixture-preflight',
  '--fixture-dry-run',
  '--ledger-handoff',
]);
const noLedger = runHarness([
  '--manual-release-handoff',
  '--fixture-supervised-release',
  '--fixture-human-confirmation',
  '--fixture-manual-release-request',
  '--fixture-preflight',
  '--fixture-dry-run',
]);

// ─── Suite A: Default mode (no handoff) ──────────────────────────
console.log('\n[Suite A] Default mode (no --manual-release-handoff)');
assert(def.parsed !== null,                                                          '[A-01] JSON parseable');
assert(def.parsed?.manual_release_handoff_enabled   === false,                      '[A-02] handoff_enabled=false');
assert(def.parsed?.manual_release_handoff_ready     === false,                      '[A-03] handoff_ready=false');
assert(def.parsed?.release_execution_allowed        === false,                      '[A-04] release_execution_allowed=false');
assert(def.parsed?.release_performed                === false,                      '[A-05] release_performed=false');
assert(def.parsed?.tag_created                      === false,                      '[A-06] tag_created=false');
assert(def.parsed?.stable_promoted                  === false,                      '[A-07] stable_promoted=false');
assert(def.parsed?.deploy_performed                 === false,                      '[A-08] deploy_performed=false');
assert(def.parsed?.deploy_allowed                   === false,                      '[A-09] deploy_allowed=false');
assert(def.parsed?.promotion_allowed                === false,                      '[A-10] promotion_allowed=false');

// ─── Suite B: Full fixture mode ───────────────────────────────────
console.log('\n[Suite B] Full fixture mode');
assert(full.parsed !== null,                                                         '[B-01] JSON parseable');
assert(full.parsed?.manual_release_handoff_enabled  === true,                       '[B-02] handoff_enabled=true');
assert(full.parsed?.manual_release_handoff_ready    === true,                       '[B-03] handoff_ready=true');
assert(full.parsed?.manual_release_preflight_status === 'PREFLIGHT_READY',          '[B-04] preflight_status=PREFLIGHT_READY');
assert(full.parsed?.manual_release_dry_run_status   === 'DRY_RUN_READY',            '[B-05] dry_run_status=DRY_RUN_READY');
assert(full.parsed?.manual_release_handoff_status   === 'HANDOFF_READY',            '[B-06] handoff_status=HANDOFF_READY');
assert(typeof full.parsed?.handoff_id               === 'string',                   '[B-07] handoff_id string');
assert(Array.isArray(full.parsed?.handoff_ledger_event_ids),                        '[B-08] handoff_ledger_event_ids array');
assert(full.parsed?.handoff_ledger_event_ids.length === 5,                          '[B-09] 5 ledger events');
assert(full.parsed?.handoff_ledger_chain_valid       === true,                      '[B-10] ledger_chain_valid=true');
assert(full.parsed?.release_execution_allowed        === false,                     '[B-11] release_execution_allowed=false');
assert(full.parsed?.release_performed                === false,                     '[B-12] release_performed=false');
assert(full.parsed?.tag_created                      === false,                     '[B-13] tag_created=false');
assert(full.parsed?.stable_promoted                  === false,                     '[B-14] stable_promoted=false');
assert(full.parsed?.deploy_performed                 === false,                     '[B-15] deploy_performed=false');
assert(full.parsed?.deploy_allowed                   === false,                     '[B-16] deploy_allowed=false');
assert(full.parsed?.promotion_allowed                === false,                     '[B-17] promotion_allowed=false');
assert(full.parsed?.stable_allowed                   !== true,                      '[B-18] stable_allowed not true');
assert(full.parsed?.tag_allowed                      !== true,                      '[B-19] tag_allowed not true');

// ─── Suite C: Handoff without ledger ─────────────────────────────
console.log('\n[Suite C] Handoff without --ledger-handoff');
assert(noLedger.parsed !== null,                                                     '[C-01] JSON parseable');
assert(noLedger.parsed?.manual_release_handoff_enabled === true,                     '[C-02] handoff_enabled=true');
assert(noLedger.parsed?.handoff_ledger_event_ids?.length === 0,                      '[C-03] no ledger events without --ledger-handoff');
assert(noLedger.parsed?.release_execution_allowed        === false,                  '[C-04] release_execution_allowed=false');

// ─── Suite D: Invariants across all modes ────────────────────────
console.log('\n[Suite D] Invariants across all modes');
const modes = [
  { label: 'default',    o: def.parsed    },
  { label: 'full',       o: full.parsed   },
  { label: 'no-ledger',  o: noLedger.parsed },
];
for (const { label, o } of modes) {
  assert(o !== null,                             `[D] ${label}: JSON parseable`);
  assert(o?.release_execution_allowed === false, `[D] ${label}: release_execution_allowed=false`);
  assert(o?.deploy_allowed             === false, `[D] ${label}: deploy_allowed=false`);
  assert(o?.promotion_allowed          === false, `[D] ${label}: promotion_allowed=false`);
  assert(o?.stable_allowed             !== true,  `[D] ${label}: stable_allowed not true`);
  assert(o?.tag_allowed                !== true,  `[D] ${label}: tag_allowed not true`);
  assert(o?.release_performed          === false, `[D] ${label}: release_performed=false`);
  assert(o?.tag_created                === false, `[D] ${label}: tag_created=false`);
  assert(o?.stable_promoted            === false, `[D] ${label}: stable_promoted=false`);
  assert(o?.deploy_performed           === false, `[D] ${label}: deploy_performed=false`);
}

// ─── Suite E: V49.0 fields present in default JSON ───────────────
console.log('\n[Suite E] V49.0 fields present in JSON');
assert('manual_release_handoff_enabled'    in (def.parsed ?? {}), '[E-01] field handoff_enabled present');
assert('manual_release_handoff_ready'      in (def.parsed ?? {}), '[E-02] field handoff_ready present');
assert('release_execution_allowed'         in (def.parsed ?? {}), '[E-03] field release_execution_allowed present');
assert('release_performed'                 in (def.parsed ?? {}), '[E-04] field release_performed present');
assert('tag_created'                       in (def.parsed ?? {}), '[E-05] field tag_created present');
assert('stable_promoted'                   in (def.parsed ?? {}), '[E-06] field stable_promoted present');
assert('deploy_performed'                  in (def.parsed ?? {}), '[E-07] field deploy_performed present');
assert('handoff_ledger_event_ids'          in (def.parsed ?? {}), '[E-08] field handoff_ledger_event_ids present');

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\npi-harness-manual-release-handoff: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
