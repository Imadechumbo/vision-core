#!/usr/bin/env node
/**
 * GitHub Release Tag Controller — Unit Tests V16.1
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  evaluateTagController,
  TAG_STATUSES,
  TAG_REQUIRED_EXECUTION_FLAGS,
  TAG_SCHEMA_VERSION,
} from '../github-release-tag-controller.mjs';

const CLI = resolve(process.cwd(), 'tools', 'github-release-tag-controller.mjs');
let passed = 0, failed = 0;

function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// Fixtures
const goodEvidence   = { id: 'ev_gocore_v161', source: 'go-core' };
const badEvidence    = { id: 'ev_bad', source: 'human' };
const readyBinding   = { status: 'BINDING_READY', contract_id: 'contract_v161' };
const blockedBinding = { status: 'BINDING_BLOCKED', contract_id: null };
const allTests       = { quickPass: true, fullPass: true, goPass: true };
const noTests        = { quickPass: false, fullPass: false, goPass: false };

const fullInput = {
  branch: 'main', gitClean: true,
  evidenceReceipt: goodEvidence, authorityBinding: readyBinding,
  testResults: allTests, tagName: 'v16.1.0', gitHead: 'deadbeef1234',
  dryRun: true, executionFlags: {},
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants and Schema');
assert(TAG_SCHEMA_VERSION === 'v16.1',                               '[A-01] schema=v16.1');
assert(Array.isArray(TAG_STATUSES) && TAG_STATUSES.length === 7,     '[A-02] 7 statuses');
assert(TAG_STATUSES.includes('TAG_DRY_RUN_READY'),                   '[A-03] TAG_DRY_RUN_READY present');
assert(TAG_STATUSES.includes('TAG_BLOCKED_BRANCH'),                  '[A-04] TAG_BLOCKED_BRANCH present');
assert(TAG_STATUSES.includes('TAG_BLOCKED_GIT_DIRTY'),               '[A-05] TAG_BLOCKED_GIT_DIRTY present');
assert(TAG_STATUSES.includes('TAG_BLOCKED_EVIDENCE'),                '[A-06] TAG_BLOCKED_EVIDENCE present');
assert(TAG_STATUSES.includes('TAG_BLOCKED_AUTHORITY'),               '[A-07] TAG_BLOCKED_AUTHORITY present');
assert(TAG_STATUSES.includes('TAG_BLOCKED_TESTS'),                   '[A-08] TAG_BLOCKED_TESTS present');
assert(TAG_STATUSES.includes('TAG_EXECUTION_BLOCKED_BY_AUTOMATION'), '[A-09] TAG_EXECUTION_BLOCKED_BY_AUTOMATION present');
assert(Array.isArray(TAG_REQUIRED_EXECUTION_FLAGS),                  '[A-10] execution flags is array');
assert(TAG_REQUIRED_EXECUTION_FLAGS.includes('--execute'),           '[A-11] --execute in required flags');

// ─── Suite B: Invariants always false ────────────────────────────
console.log('\n[Suite B] Invariants — always false');
const anyR = evaluateTagController({});
assert(anyR.tag_created       === false, '[B-01] tag_created=false always');
assert(anyR.deploy_performed  === false, '[B-02] deploy_performed=false');
assert(anyR.stable_promoted   === false, '[B-03] stable_promoted=false');
assert(anyR.deploy_allowed    === false, '[B-04] deploy_allowed=false');
assert(anyR.stable_allowed    === false, '[B-05] stable_allowed=false');
assert(anyR.release_performed === false, '[B-06] release_performed=false');
assert(anyR.schema_version === 'v16.1',  '[B-07] schema_version=v16.1');

const readyR = evaluateTagController(fullInput);
assert(readyR.tag_created     === false, '[B-08] READY → tag_created=false');
assert(readyR.deploy_allowed  === false, '[B-09] READY → deploy_allowed=false');
assert(readyR.stable_promoted === false, '[B-10] READY → stable_promoted=false');

// ─── Suite C: Blocked scenarios ──────────────────────────────────
console.log('\n[Suite C] Blocked scenarios');

// Not on main
const pBranch = evaluateTagController({ ...fullInput, branch: 'feat/v161' });
assert(pBranch.tag_status === 'TAG_BLOCKED_BRANCH',      '[C-01] non-main → TAG_BLOCKED_BRANCH');
assert(pBranch.tag_allowed === false,                    '[C-02] branch blocked → tag_allowed=false');

// Null branch
const pNoBranch = evaluateTagController({ ...fullInput, branch: null });
assert(pNoBranch.tag_status === 'TAG_BLOCKED_BRANCH',    '[C-03] null branch → TAG_BLOCKED_BRANCH');

// Git dirty
const pDirty = evaluateTagController({ ...fullInput, gitClean: false });
assert(pDirty.tag_status === 'TAG_BLOCKED_GIT_DIRTY',    '[C-04] dirty → TAG_BLOCKED_GIT_DIRTY');

// No evidence
const pNoEv = evaluateTagController({ ...fullInput, evidenceReceipt: null });
assert(pNoEv.tag_status === 'TAG_BLOCKED_EVIDENCE',      '[C-05] no evidence → TAG_BLOCKED_EVIDENCE');

// Bad evidence
const pBadEv = evaluateTagController({ ...fullInput, evidenceReceipt: badEvidence });
assert(pBadEv.tag_status === 'TAG_BLOCKED_EVIDENCE',     '[C-06] bad evidence → TAG_BLOCKED_EVIDENCE');

// No authority
const pNoAuth = evaluateTagController({ ...fullInput, authorityBinding: blockedBinding });
assert(pNoAuth.tag_status === 'TAG_BLOCKED_AUTHORITY',   '[C-07] no auth → TAG_BLOCKED_AUTHORITY');

// Tests not passed
const pNoTests = evaluateTagController({ ...fullInput, testResults: noTests });
assert(pNoTests.tag_status === 'TAG_BLOCKED_TESTS',      '[C-08] no tests → TAG_BLOCKED_TESTS');

// --execute requested → always blocked in automation
const pExecute = evaluateTagController({ ...fullInput, executionFlags: { execute: true } });
assert(pExecute.tag_status === 'TAG_EXECUTION_BLOCKED_BY_AUTOMATION', '[C-09] execute → TAG_EXECUTION_BLOCKED_BY_AUTOMATION');
assert(pExecute.tag_created === false,                   '[C-10] execute → tag_created=false still');

// ─── Suite D: TAG_DRY_RUN_READY ──────────────────────────────────
console.log('\n[Suite D] TAG_DRY_RUN_READY');
const t = evaluateTagController(fullInput);
assert(t.tag_status === 'TAG_DRY_RUN_READY',             '[D-01] all conditions → TAG_DRY_RUN_READY');
assert(t.tag_allowed === true,                           '[D-02] ready → tag_allowed=true (classification)');
assert(t.tag_created === false,                          '[D-03] ready → tag_created=false invariant');
assert(t.tag_dry_run === true,                           '[D-04] dry_run=true');
assert(t.tag_name === 'v16.1.0',                         '[D-05] tag_name populated');
assert(typeof t.tag_controller_id === 'string',          '[D-06] controller_id is string');
assert(t.tag_controller_id.startsWith('tagctrl_'),       '[D-07] id starts with tagctrl_');
assert(t.tag_blockers.length === 0,                      '[D-08] no blockers');
assert(typeof t.note === 'string',                       '[D-09] note present');

// ─── Suite E: Inputs evaluated ───────────────────────────────────
console.log('\n[Suite E] Inputs evaluated');
const inp = t.inputs_evaluated;
assert(inp.on_main_branch === true,                      '[E-01] on_main=true');
assert(inp.git_clean === true,                           '[E-02] git_clean=true');
assert(inp.evidence_receipt_id === 'ev_gocore_v161',     '[E-03] evidence_id populated');
assert(inp.evidence_source === 'go-core',                '[E-04] evidence_source=go-core');
assert(inp.authority_binding_status === 'BINDING_READY', '[E-05] binding_status populated');
assert(inp.tests_quick_pass === true,                    '[E-06] quick_pass=true');
assert(inp.tests_full_pass === true,                     '[E-07] full_pass=true');
assert(inp.tests_go_pass === true,                       '[E-08] go_pass=true');

// ─── Suite F: Blockers detail ────────────────────────────────────
console.log('\n[Suite F] Blockers detail');
const emptyBlockers = evaluateTagController({}).tag_blockers;
assert(emptyBlockers.includes('MUST_BE_ON_MAIN_BRANCH'),       '[F-01] missing branch → blocker');
assert(emptyBlockers.includes('GIT_TREE_MUST_BE_CLEAN'),       '[F-02] dirty → blocker');
assert(emptyBlockers.includes('EVIDENCE_MISSING_OR_INVALID'),  '[F-03] no evidence → blocker');
assert(emptyBlockers.includes('AUTHORITY_BINDING_NOT_READY'),  '[F-04] no auth → blocker');
assert(emptyBlockers.includes('TESTS_NOT_CONFIRMED_PASSED'),   '[F-05] no tests → blocker');

// ─── Suite G: CLI ────────────────────────────────────────────────
console.log('\n[Suite G] CLI entrypoint');

// No flags → blocked, exit 2, JSON output
const cliNone = runCLI(['--json']);
assert(cliNone.exitCode === 2,                           '[G-01] no flags → exit 2');
assert(cliNone.stdout.length > 0,                        '[G-02] no flags → stdout non-empty');
(() => {
  try {
    const o = JSON.parse(cliNone.stdout);
    assert(o.tag_created === false,                      '[G-03] no flags → tag_created=false');
    assert(o.tag_allowed === false,                      '[G-04] no flags → tag_allowed=false');
  } catch { assert(false, '[G-03..04] valid JSON'); }
})();

// All conditions met → TAG_DRY_RUN_READY, exit 0
const cliReady = runCLI([
  '--json', '--branch', 'main', '--git-clean',
  '--evidence-receipt-id', 'ev_cli_test', '--evidence-source', 'go-core',
  '--authority-binding-ready', '--authority-contract-id', 'contract_cli',
  '--tests-quick-pass', '--tests-full-pass', '--tests-go-pass',
  '--tag-name', 'v16.1.0',
]);
assert(cliReady.exitCode === 0,                          '[G-05] all flags → exit 0');
(() => {
  try {
    const o = JSON.parse(cliReady.stdout);
    assert(o.tag_status === 'TAG_DRY_RUN_READY',         '[G-06] all flags → TAG_DRY_RUN_READY');
    assert(o.tag_created === false,                      '[G-07] TAG_DRY_RUN_READY → tag_created=false');
  } catch { assert(false, '[G-06..07] valid JSON'); }
})();

// --execute blocked by automation
const cliExec = runCLI([
  '--json', '--branch', 'main', '--git-clean',
  '--evidence-receipt-id', 'ev_exec', '--evidence-source', 'go-core',
  '--authority-binding-ready', '--tests-quick-pass', '--tests-full-pass', '--tests-go-pass',
  '--execute',
]);
assert(cliExec.exitCode === 2,                           '[G-08] --execute → exit 2');
(() => {
  try {
    const o = JSON.parse(cliExec.stdout);
    assert(o.tag_status === 'TAG_EXECUTION_BLOCKED_BY_AUTOMATION', '[G-09] execute → TAG_EXECUTION_BLOCKED_BY_AUTOMATION');
    assert(o.tag_created === false,                      '[G-10] execute → tag_created=false');
  } catch { assert(false, '[G-09..10] valid JSON'); }
})();

// ─── Result ───────────────────────────────────────────────────────
console.log(`\nGitHub Release Tag Controller Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
