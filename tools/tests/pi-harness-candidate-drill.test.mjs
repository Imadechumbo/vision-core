#!/usr/bin/env node
/**
 * PI Harness Candidate Drill Mode — Unit Tests V33.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';

const CLI = resolve(process.cwd(), 'tools', 'pi-harness.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 30000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}
function parseJSON(str) {
  try { return JSON.parse(str); } catch { return null; }
}

// ─── Suite A: Default mode — no candidate drill ───────────────────
console.log('\n[Suite A] Default mode invariants');
const defaultResult = runCLI(['--json']);
const def = parseJSON(defaultResult.stdout);
assert(def !== null,                                          '[A-01] default JSON parseable');
assert(def && def.candidate_drill_enabled === false,          '[A-02] candidate_drill_enabled=false by default');
assert(def && def.candidate_drill_status === 'CANDIDATE_DRILL_NOT_STARTED', '[A-03] default status=NOT_STARTED');
assert(def && def.candidate_drill_ready   === false,          '[A-04] candidate_drill_ready=false by default');
assert(def && def.candidate_is_local_drill === false,         '[A-05] candidate_is_local_drill=false by default');
assert(def && def.pass_gold_candidate     === false,          '[A-06] pass_gold=false by default');
assert(def && def.deploy_allowed          === false,          '[A-07] deploy=false by default');
assert(def && def.promotion_allowed       === false,          '[A-08] promotion=false by default');

// ─── Suite B: Candidate drill mode — full flags ───────────────────
console.log('\n[Suite B] Candidate drill mode — all flags');
const drillResult = runCLI(['--candidate-drill', '--fixture-runtime-bridge', '--fixture-authority', '--verify-tests', '--json']);
const drill = parseJSON(drillResult.stdout);
assert(drill !== null,                                                          '[B-01] drill JSON parseable');
assert(drill && drill.candidate_drill_enabled                === true,          '[B-02] candidate_drill_enabled=true');
assert(drill && drill.candidate_drill_status                 === 'FULL_CANDIDATE_DRILL_READY', '[B-03] status=FULL_CANDIDATE_DRILL_READY');
assert(drill && drill.candidate_drill_ready                  === true,          '[B-04] candidate_drill_ready=true');
assert(drill && drill.candidate_drill_pass_gold_candidate_allowed === true,     '[B-05] drill_pass_gold=true');
assert(drill && drill.candidate_is_local_drill               === true,          '[B-06] candidate_is_local_drill=true');
assert(drill && drill.pass_gold_candidate                    === true,          '[B-07] pass_gold_candidate=true');
assert(drill && drill.deploy_allowed                         === false,         '[B-08] deploy=false (REGRA ABSOLUTA)');
assert(drill && drill.promotion_allowed                      === false,         '[B-09] promotion=false (REGRA ABSOLUTA)');
assert(drill && drill.candidate_drill_evidence_source        === 'go-core',     '[B-10] evidence_source=go-core');
assert(drill && typeof drill.candidate_drill_mission_id      === 'string',      '[B-11] mission_id present');
assert(drill && typeof drill.candidate_drill_receipt_id      === 'string',      '[B-12] receipt_id present');
assert(drill && drill.runtime_evidence_ready                 === true,          '[B-13] runtime_evidence_ready=true');
assert(drill && drill.runtime_evidence_enabled               === true,          '[B-14] runtime_evidence_enabled=true');

// ─── Suite C: Candidate drill without --verify-tests ─────────────
console.log('\n[Suite C] Candidate drill without --verify-tests');
const noTestsResult = runCLI(['--candidate-drill', '--fixture-runtime-bridge', '--fixture-authority', '--json']);
const noTests = parseJSON(noTestsResult.stdout);
assert(noTests !== null,                                                         '[C-01] no-tests JSON parseable');
assert(noTests && noTests.candidate_drill_enabled === true,                      '[C-02] candidate_drill_enabled=true');
assert(
  noTests && (
    noTests.candidate_drill_status === 'FULL_CANDIDATE_DRILL_BLOCKED_TESTS' ||
    noTests.candidate_drill_ready  === false
  ),
  '[C-03] without --verify-tests → drill blocked or not ready'
);
assert(noTests && noTests.deploy_allowed    === false,                           '[C-04] deploy=false always');
assert(noTests && noTests.promotion_allowed === false,                           '[C-05] promotion=false always');

// ─── Suite D: Invariants across all modes (reuse already-computed results) ───
console.log('\n[Suite D] Invariants across all modes');
const modeResults = [
  { label: 'default',        o: def      },
  { label: 'drill-full',     o: drill    },
  { label: 'drill-no-tests', o: noTests  },
];
for (const { label, o } of modeResults) {
  assert(o !== null,                         `[D] ${label}: JSON parseable`);
  assert(o && o.deploy_allowed    === false, `[D] ${label}: deploy=false`);
  assert(o && o.promotion_allowed === false, `[D] ${label}: promotion=false`);
}

// ─── Suite E: Candidate drill fields present ──────────────────────
console.log('\n[Suite E] Candidate drill fields present in JSON');
assert('candidate_drill_enabled'                    in (drill ?? {}), '[E-01] candidate_drill_enabled key present');
assert('candidate_drill_status'                     in (drill ?? {}), '[E-02] candidate_drill_status key present');
assert('candidate_drill_ready'                      in (drill ?? {}), '[E-03] candidate_drill_ready key present');
assert('candidate_drill_pass_gold_candidate_allowed' in (drill ?? {}), '[E-04] candidate_drill_pass_gold_candidate_allowed key present');
assert('candidate_drill_evidence_source'            in (drill ?? {}), '[E-05] candidate_drill_evidence_source key present');
assert('candidate_drill_mission_id'                 in (drill ?? {}), '[E-06] candidate_drill_mission_id key present');
assert('candidate_drill_receipt_id'                 in (drill ?? {}), '[E-07] candidate_drill_receipt_id key present');
assert('candidate_is_local_drill'                   in (drill ?? {}), '[E-08] candidate_is_local_drill key present');
assert('candidate_drill_enabled'                    in (def  ?? {}), '[E-09] fields present in default mode too');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\npi-harness-candidate-drill: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
