#!/usr/bin/env node
/**
 * Release Policy Enforcer — Unit Tests V19.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  enforcePolicy,
  POLICY_VIOLATION_CODES,
  POLICY_STATUSES,
  FAKE_PASS_GOLD_PATTERNS,
  POLICY_ENFORCER_SCHEMA_VERSION,
} from '../release-policy-enforcer.mjs';

const CLI = resolve(process.cwd(), 'tools', 'release-policy-enforcer.mjs');
let passed = 0, failed = 0;
function assert(c, m) { if (c) { console.log(`  ✓ ${m}`); passed++; } else { console.error(`  ✗ FAIL: ${m}`); failed++; } }
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// Clean canonical stage result (all invariants upheld)
const cleanResult = {
  deploy_performed:  false,
  deploy_allowed:    false,
  tag_created:       false,
  stable_promoted:   false,
  release_performed: false,
  schema_version:    'v18.0',
  status:            'PIPELINE_READY',
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(POLICY_ENFORCER_SCHEMA_VERSION === 'v19.0',                              '[A-01] schema=v19.0');
assert(Array.isArray(POLICY_VIOLATION_CODES) && POLICY_VIOLATION_CODES.length === 8, '[A-02] 8 violation codes');
assert(POLICY_VIOLATION_CODES.includes('DEPLOY_PERFORMED_TRUE'),                '[A-03] DEPLOY_PERFORMED_TRUE');
assert(POLICY_VIOLATION_CODES.includes('TAG_CREATED_TRUE'),                     '[A-04] TAG_CREATED_TRUE');
assert(POLICY_VIOLATION_CODES.includes('STABLE_PROMOTED_TRUE'),                 '[A-05] STABLE_PROMOTED_TRUE');
assert(POLICY_VIOLATION_CODES.includes('FAKE_PASS_GOLD_DETECTED'),              '[A-06] FAKE_PASS_GOLD_DETECTED');
assert(Array.isArray(POLICY_STATUSES) && POLICY_STATUSES.length === 3,          '[A-07] 3 statuses');
assert(POLICY_STATUSES.includes('POLICY_PASS'),                                 '[A-08] POLICY_PASS');
assert(POLICY_STATUSES.includes('POLICY_BLOCKED_VIOLATION'),                    '[A-09] POLICY_BLOCKED_VIOLATION');
assert(POLICY_STATUSES.includes('POLICY_BLOCKED_NO_INPUT'),                     '[A-10] POLICY_BLOCKED_NO_INPUT');
assert(Array.isArray(FAKE_PASS_GOLD_PATTERNS) && FAKE_PASS_GOLD_PATTERNS.length > 0, '[A-11] fake PASS GOLD patterns defined');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Enforcer own invariants');
const anyR = enforcePolicy({});
assert(anyR.deploy_performed  === false,  '[B-01] deploy_performed=false');
assert(anyR.deploy_allowed    === false,  '[B-02] deploy_allowed=false');
assert(anyR.tag_created       === false,  '[B-03] tag_created=false');
assert(anyR.stable_promoted   === false,  '[B-04] stable_promoted=false');
assert(anyR.release_performed === false,  '[B-05] release_performed=false');
assert(anyR.schema_version === 'v19.0',   '[B-06] schema=v19.0');

// ─── Suite C: No input → POLICY_BLOCKED_NO_INPUT ─────────────────
console.log('\n[Suite C] No input');
const noInput = enforcePolicy({});
assert(noInput.policy_status === 'POLICY_BLOCKED_NO_INPUT', '[C-01] no input → POLICY_BLOCKED_NO_INPUT');
assert(noInput.policy_pass   === false,                     '[C-02] no input → policy_pass=false');
assert(noInput.stages_checked === 0,                        '[C-03] stages_checked=0');
assert(typeof noInput.enforcer_id === 'string',             '[C-04] enforcer_id is string');
assert(noInput.enforcer_id.startsWith('policy_'),           '[C-05] id starts with policy_');

// ─── Suite D: Clean results → POLICY_PASS ────────────────────────
console.log('\n[Suite D] Clean stage results');
const cleanPass = enforcePolicy({
  stageResults: [cleanResult, { ...cleanResult, schema_version: 'v16.4' }],
  stageNames:   ['pipeline', 'ledger'],
});
assert(cleanPass.policy_status === 'POLICY_PASS',   '[D-01] clean results → POLICY_PASS');
assert(cleanPass.policy_pass   === true,            '[D-02] policy_pass=true');
assert(cleanPass.violations_found === 0,            '[D-03] no violations');
assert(cleanPass.stages_checked === 2,              '[D-04] 2 stages checked');

// ─── Suite E: deploy_performed=true violation ────────────────────
console.log('\n[Suite E] deploy_performed violation');
const deployViolation = enforcePolicy({
  stageResults: [{ ...cleanResult, deploy_performed: true }],
  stageNames:   ['bad_stage'],
});
assert(deployViolation.policy_status === 'POLICY_BLOCKED_VIOLATION', '[E-01] deploy_performed=true → POLICY_BLOCKED_VIOLATION');
assert(deployViolation.policy_pass   === false,                      '[E-02] policy_pass=false');
assert(deployViolation.violations_found === 1,                       '[E-03] 1 violation');
assert(deployViolation.violations[0].violation_code === 'DEPLOY_PERFORMED_TRUE', '[E-04] DEPLOY_PERFORMED_TRUE code');
assert(deployViolation.violations[0].stage === 'bad_stage',          '[E-05] stage name reported');

// ─── Suite F: tag_created=true violation ─────────────────────────
console.log('\n[Suite F] tag_created violation');
const tagViolation = enforcePolicy({
  stageResults: [{ ...cleanResult, tag_created: true }],
  stageNames:   ['tag_stage'],
});
assert(tagViolation.policy_status === 'POLICY_BLOCKED_VIOLATION',  '[F-01] tag_created=true → violation');
assert(tagViolation.violations[0].violation_code === 'TAG_CREATED_TRUE', '[F-02] TAG_CREATED_TRUE code');

// ─── Suite G: stable_promoted=true violation ─────────────────────
console.log('\n[Suite G] stable_promoted violation');
const stableViolation = enforcePolicy({
  stageResults: [{ ...cleanResult, stable_promoted: true }],
  stageNames:   ['stable_stage'],
});
assert(stableViolation.policy_status === 'POLICY_BLOCKED_VIOLATION',  '[G-01] stable_promoted=true → violation');
assert(stableViolation.violations[0].violation_code === 'STABLE_PROMOTED_TRUE', '[G-02] STABLE_PROMOTED_TRUE code');

// ─── Suite H: release_performed=true violation ───────────────────
console.log('\n[Suite H] release_performed violation');
const releaseViolation = enforcePolicy({
  stageResults: [{ ...cleanResult, release_performed: true }],
  stageNames:   ['release_stage'],
});
assert(releaseViolation.policy_status === 'POLICY_BLOCKED_VIOLATION',   '[H-01] release_performed=true → violation');
assert(releaseViolation.violations[0].violation_code === 'RELEASE_PERFORMED_TRUE', '[H-02] RELEASE_PERFORMED_TRUE code');

// ─── Suite I: deploy_allowed=true violation ───────────────────────
console.log('\n[Suite I] deploy_allowed violation');
const allowedViolation = enforcePolicy({
  stageResults: [{ ...cleanResult, deploy_allowed: true }],
  stageNames:   ['allowed_stage'],
});
assert(allowedViolation.policy_status === 'POLICY_BLOCKED_VIOLATION',  '[I-01] deploy_allowed=true → violation');
assert(allowedViolation.violations[0].violation_code === 'DEPLOY_ALLOWED_TRUE', '[I-02] DEPLOY_ALLOWED_TRUE code');

// ─── Suite J: Fake PASS GOLD detection ───────────────────────────
console.log('\n[Suite J] Fake PASS GOLD detection');
const fakeGold = enforcePolicy({
  stageResults: [{ ...cleanResult, authority_contract_id: 'fake_pass_gold_v1' }],
  stageNames:   ['auth_stage'],
});
assert(fakeGold.policy_status === 'POLICY_BLOCKED_VIOLATION',         '[J-01] fake PASS GOLD → violation');
assert(fakeGold.violations.some(v => v.violation_code === 'FAKE_PASS_GOLD_DETECTED'), '[J-02] FAKE_PASS_GOLD_DETECTED code');

const fakeGold2 = enforcePolicy({
  stageResults: [{ ...cleanResult, note: 'bound by ai_authority reviewer' }],
  stageNames:   ['auth_stage2'],
});
assert(fakeGold2.policy_status === 'POLICY_BLOCKED_VIOLATION',        '[J-03] ai_authority → violation');
assert(fakeGold2.violations.some(v => v.violation_code === 'FAKE_PASS_GOLD_DETECTED'), '[J-04] FAKE_PASS_GOLD_DETECTED code');

// ─── Suite K: Multiple violations ────────────────────────────────
console.log('\n[Suite K] Multiple violations');
const multiViol = enforcePolicy({
  stageResults: [
    { ...cleanResult, deploy_performed: true },
    { ...cleanResult, tag_created: true },
    cleanResult,
  ],
  stageNames: ['stage_a', 'stage_b', 'stage_c'],
});
assert(multiViol.policy_status === 'POLICY_BLOCKED_VIOLATION', '[K-01] multiple violations → POLICY_BLOCKED_VIOLATION');
assert(multiViol.violations_found === 2,                       '[K-02] 2 violations found');
assert(multiViol.stages_checked === 3,                         '[K-03] 3 stages checked');

// ─── Suite L: CLI ─────────────────────────────────────────────────
console.log('\n[Suite L] CLI entrypoint');
const cliNone = runCLI(['--json']);
assert(cliNone.exitCode === 2,                                          '[L-01] no input → exit 2');
(() => {
  try {
    const o = JSON.parse(cliNone.stdout);
    assert(o.policy_status === 'POLICY_BLOCKED_NO_INPUT',              '[L-02] → POLICY_BLOCKED_NO_INPUT');
    assert(o.deploy_performed === false,                               '[L-03] deploy_performed=false');
    assert(o.policy_pass === false,                                    '[L-04] policy_pass=false');
  } catch { assert(false, '[L-02..04] valid JSON'); }
})();

// ─── Result ───────────────────────────────────────────────────────
console.log(`\nPolicy Enforcer Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
