#!/usr/bin/env node
/**
 * PI Harness Supervised Release Candidate Mode — Unit Tests V42.1
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';

const HARNESS = resolve(process.cwd(), 'tools', 'pi-harness.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runHarness(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', HARNESS, '--mode', 'interactive', '--dry-run', '--json', ...args], {
    encoding: 'utf-8', timeout: 20000,
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout || ''); } catch { parsed = null; }
  return { parsed, exitCode: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

// Pre-compute results
const def = runHarness([]);
const fullFixture = runHarness([
  '--supervised-release-candidate',
  '--fixture-runtime-candidate',
  '--fixture-release-intent',
  '--fixture-authority',
  '--verify-tests',
  '--policy-clean',
]);
// Only RC fixture, no intent/authority → allFixtures=false → BLOCKED
const partialFixture1 = runHarness([
  '--supervised-release-candidate',
  '--fixture-runtime-candidate',
  // No --fixture-release-intent, no --fixture-authority
  '--verify-tests',
  '--policy-clean',
]);
// Only 2 of 3 fixtures → allFixtures=false → BLOCKED
const partialFixture2 = runHarness([
  '--supervised-release-candidate',
  '--fixture-runtime-candidate',
  '--fixture-release-intent',
  // No --fixture-authority
  '--verify-tests',
  '--policy-clean',
]);
const missingFixtures = runHarness([
  '--supervised-release-candidate',
  // No fixture flags
]);

// ─── Suite A: Default — supervised RC disabled ────────────────────
console.log('\n[Suite A] Default — supervised RC disabled');
assert(def.parsed !== null,                                                     '[A-01] default JSON parseable');
assert(def.parsed?.supervised_release_candidate_enabled === false,             '[A-02] default supervised_rc_enabled=false');
assert(def.parsed?.supervised_release_candidate_ready   === false,             '[A-03] default supervised_rc_ready=false');
assert(def.parsed?.release_candidate_mode               === null,              '[A-04] default release_candidate_mode=null');
assert(def.parsed?.production_release_allowed           === false,             '[A-05] default production_release_allowed=false');
assert(def.parsed?.deploy_allowed                       === false,             '[A-06] default deploy_allowed=false');

// ─── Suite B: Missing fixtures → RC not ready ─────────────────────
console.log('\n[Suite B] Missing fixtures');
assert(missingFixtures.parsed !== null,                                         '[B-01] missing fixtures JSON parseable');
assert(missingFixtures.parsed?.supervised_release_candidate_enabled === true,   '[B-02] enabled=true');
assert(missingFixtures.parsed?.supervised_release_candidate_ready   === false,  '[B-03] ready=false (no fixtures)');
assert(missingFixtures.parsed?.deploy_allowed                       === false,  '[B-04] deploy=false');
assert(missingFixtures.parsed?.production_release_allowed           === false,  '[B-05] production=false');

// ─── Suite C: Partial fixture (1 of 3) → RC not ready ────────────
console.log('\n[Suite C] Partial fixture 1 of 3');
assert(partialFixture1.parsed !== null,                                         '[C-01] partial fixture JSON parseable');
assert(partialFixture1.parsed?.supervised_release_candidate_enabled === true,   '[C-02] enabled=true');
assert(partialFixture1.parsed?.supervised_release_candidate_ready   === false,  '[C-03] ready=false (partial fixture)');
assert(partialFixture1.parsed?.supervised_release_candidate_status?.includes('BLOCKED'), '[C-04] status includes BLOCKED');
assert(partialFixture1.parsed?.deploy_allowed                       === false,  '[C-05] deploy=false');

// ─── Suite D: Partial fixture (2 of 3) → RC not ready ────────────
console.log('\n[Suite D] Partial fixture 2 of 3');
assert(partialFixture2.parsed !== null,                                         '[D-01] partial fixture 2 JSON parseable');
assert(partialFixture2.parsed?.supervised_release_candidate_ready   === false,  '[D-02] ready=false (partial fixture)');
assert(partialFixture2.parsed?.supervised_release_candidate_status?.includes('BLOCKED'), '[D-03] status includes BLOCKED');
assert(partialFixture2.parsed?.deploy_allowed                       === false,  '[D-04] deploy=false');

// ─── Suite E: Full fixture supervised RC ready ────────────────────
console.log('\n[Suite E] Full fixture supervised RC ready');
assert(fullFixture.parsed !== null,                                             '[E-01] full fixture JSON parseable');
assert(fullFixture.parsed?.supervised_release_candidate_enabled === true,       '[E-02] enabled=true');
assert(fullFixture.parsed?.supervised_release_candidate_ready   === true,       '[E-03] ready=true');
assert(fullFixture.parsed?.supervised_release_candidate_status  === 'SUPERVISED_RC_READY', '[E-04] status=SUPERVISED_RC_READY');
assert(fullFixture.parsed?.release_candidate_mode               === 'supervised', '[E-05] mode=supervised');
assert(typeof fullFixture.parsed?.release_intent_id             === 'string' || fullFixture.parsed?.release_intent_id === null, '[E-06] release_intent_id is string or null');

// ─── Suite F: Invariants — even with supervised RC ready ──────────
console.log('\n[Suite F] Invariants with supervised RC ready');
assert(fullFixture.parsed?.deploy_allowed                === false, '[F-01] deploy=false (RC ready)');
assert(fullFixture.parsed?.promotion_allowed             === false, '[F-02] promotion=false (RC ready)');
assert(fullFixture.parsed?.hermes_stable_allowed         === false, '[F-03] hermes_stable=false (RC ready 2)');
assert(fullFixture.parsed?.hermes_tag_allowed            === false, '[F-04] tag=false (RC ready)');
assert(fullFixture.parsed?.production_release_allowed    === false, '[F-05] production=false (RC ready)');
assert(fullFixture.parsed?.hermes_deploy_allowed         === false, '[F-06] hermes_deploy=false (RC ready)');
assert(fullFixture.parsed?.hermes_promotion_allowed      === false, '[F-07] hermes_promotion=false (RC ready)');
assert(fullFixture.parsed?.hermes_stable_allowed         === false, '[F-08] hermes_stable=false (RC ready)');

// ─── Suite G: Invariants — default/blocked states ─────────────────
console.log('\n[Suite G] Invariants — default/blocked');
assert(def.parsed?.production_release_allowed    === false, '[G-01] default production=false');
assert(missingFixtures.parsed?.production_release_allowed === false, '[G-02] missing_fixtures production=false');
assert(partialFixture1.parsed?.production_release_allowed === false, '[G-03] partial_fixture1 production=false');
assert(partialFixture2.parsed?.production_release_allowed === false, '[G-04] partial_fixture2 production=false');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\npi-harness-supervised-release-candidate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
