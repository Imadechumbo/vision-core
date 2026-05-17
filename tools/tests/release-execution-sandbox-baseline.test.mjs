#!/usr/bin/env node
/**
 * Release Execution Sandbox Baseline — Unit Tests V55.0
 */

import {
  runReleaseExecutionSandboxBaseline,
  renderReleaseExecutionSandboxBaseline,
  SANDBOX_BASELINE_STATUSES,
} from '../release-execution-sandbox-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(SANDBOX_BASELINE_STATUSES),                                        '[A-01] SANDBOX_BASELINE_STATUSES array');
assert(SANDBOX_BASELINE_STATUSES.length === 5,                                          '[A-02] 5 statuses');
assert(SANDBOX_BASELINE_STATUSES.includes('SANDBOX_BASELINE_BLOCKED_MODULES'),         '[A-03] BLOCKED_MODULES present');
assert(SANDBOX_BASELINE_STATUSES.includes('SANDBOX_BASELINE_BLOCKED_TESTS'),           '[A-04] BLOCKED_TESTS present');
assert(SANDBOX_BASELINE_STATUSES.includes('SANDBOX_BASELINE_BLOCKED_INVARIANTS'),      '[A-05] BLOCKED_INVARIANTS present');
assert(SANDBOX_BASELINE_STATUSES.includes('SANDBOX_BASELINE_BLOCKED_REHEARSAL'),       '[A-06] BLOCKED_REHEARSAL present');
assert(SANDBOX_BASELINE_STATUSES.includes('SANDBOX_BASELINE_READY'),                   '[A-07] BASELINE_READY present');

// ─── Suite B: Baseline ready ───────────────────────────────────────
console.log('\n[Suite B] Baseline ready');
const result = runReleaseExecutionSandboxBaseline({ _mock_timestamp: TS });
assert(result !== null && typeof result === 'object',                                   '[B-01] returns object');
assert(result.baseline_status        === 'SANDBOX_BASELINE_READY',                    '[B-02] baseline_status=SANDBOX_BASELINE_READY');
assert(result.baseline_ready         === true,                                          '[B-03] baseline_ready=true');
assert(result.schema_version         === 'v55.0',                                      '[B-04] schema_version=v55.0');
assert(result.baseline_version       === 'v55.0',                                      '[B-05] baseline_version=v55.0');
assert(typeof result.baseline_id     === 'string' && result.baseline_id.length > 0,    '[B-06] baseline_id string');
assert(result.modules_loaded         === 7,                                             '[B-07] 7 modules loaded');
assert(Array.isArray(result.modules_ok) && result.modules_ok.length === 7,             '[B-08] 7 modules_ok');
assert(result.fixtures_verified      === 6,                                             '[B-09] 6 fixtures verified');
assert(result.invariants_checked     === 54,                                            '[B-10] 54 invariants checked');
assert(result.ledger_smoke_ok        === true,                                          '[B-11] ledger_smoke_ok=true');
assert(result.blocking_reason        === null,                                          '[B-12] blocking_reason=null');
assert(result.created_at             === TS,                                            '[B-13] created_at=TS');

// modules_ok contents
assert(result.modules_ok.includes('sandbox_contract'),                                  '[B-14] sandbox_contract in modules_ok');
assert(result.modules_ok.includes('sandbox_policy'),                                    '[B-15] sandbox_policy in modules_ok');
assert(result.modules_ok.includes('command_simulator'),                                 '[B-16] command_simulator in modules_ok');
assert(result.modules_ok.includes('rehearsal_plan'),                                    '[B-17] rehearsal_plan in modules_ok');
assert(result.modules_ok.includes('rehearsal_executor'),                                '[B-18] rehearsal_executor in modules_ok');
assert(result.modules_ok.includes('rehearsal_ledger'),                                  '[B-19] rehearsal_ledger in modules_ok');
assert(result.modules_ok.includes('rehearsal_report'),                                  '[B-20] rehearsal_report in modules_ok');

// ─── Suite C: Execution flags ─────────────────────────────────────
console.log('\n[Suite C] Execution flags false');
assert(result.deploy_allowed            === false,                                      '[C-01] deploy_allowed=false');
assert(result.promotion_allowed         === false,                                      '[C-02] promotion_allowed=false');
assert(result.stable_allowed            === false,                                      '[C-03] stable_allowed=false');
assert(result.tag_allowed               === false,                                      '[C-04] tag_allowed=false');
assert(result.release_execution_allowed === false,                                      '[C-05] exec_allowed=false');
assert(result.release_performed         === false,                                      '[C-06] release_performed=false');
assert(result.tag_created               === false,                                      '[C-07] tag_created=false');
assert(result.stable_promoted           === false,                                      '[C-08] stable_promoted=false');
assert(result.deploy_performed          === false,                                      '[C-09] deploy_performed=false');
assert(result.human_review_required     === true,                                       '[C-10] human_review_required=true');
assert(result.local_only                === true,                                       '[C-11] local_only=true');
assert(result.rehearsal_only            === true,                                       '[C-12] rehearsal_only=true');
assert(result.sandbox_only              === true,                                       '[C-13] sandbox_only=true');

// ─── Suite D: Deterministic baseline_id ───────────────────────────
console.log('\n[Suite D] Deterministic baseline_id');
const a = runReleaseExecutionSandboxBaseline({ _mock_timestamp: TS });
const b = runReleaseExecutionSandboxBaseline({ _mock_timestamp: TS });
assert(a.baseline_id === b.baseline_id,                                                 '[D-01] same inputs → same baseline_id');

const c = runReleaseExecutionSandboxBaseline({ _mock_timestamp: '2026-05-18T00:00:00.000Z' });
assert(a.baseline_id !== c.baseline_id,                                                 '[D-02] different timestamps → different baseline_id');

// ─── Suite E: renderReleaseExecutionSandboxBaseline ────────────────
console.log('\n[Suite E] renderReleaseExecutionSandboxBaseline');
const rendered = renderReleaseExecutionSandboxBaseline(result);
assert(typeof rendered === 'string',                                                     '[E-01] returns string');
assert(rendered.includes('SANDBOX_BASELINE_READY'),                                     '[E-02] contains status');
assert(rendered.includes('human_review_required : true'),                               '[E-03] human_review_required=true in output');
assert(rendered.includes('deploy_allowed     : false'),                                 '[E-04] deploy_allowed=false in output');
assert(rendered.includes('v55.0'),                                                      '[E-05] baseline_version in output');

const renderedNull = renderReleaseExecutionSandboxBaseline(null);
assert(renderedNull === 'baseline: null',                                               '[E-06] null → "baseline: null"');

// ─── Suite F: SANDBOX_BASELINE_STATUSES in baseline_status ────────
console.log('\n[Suite F] baseline_status is valid status');
assert(SANDBOX_BASELINE_STATUSES.includes(result.baseline_status),                     '[F-01] baseline_status in STATUSES list');

// ─── Suite G: Invariants — multi-run ─────────────────────────────
console.log('\n[Suite G] Invariants across multiple runs');
for (let i = 0; i < 3; i++) {
  const r = runReleaseExecutionSandboxBaseline({ _mock_timestamp: `2026-05-17T1${i}:00:00.000Z` });
  assert(r.baseline_ready              === true,  `[G] run ${i}: baseline_ready=true`);
  assert(r.deploy_allowed              === false, `[G] run ${i}: deploy_allowed=false`);
  assert(r.promotion_allowed           === false, `[G] run ${i}: promotion_allowed=false`);
  assert(r.release_execution_allowed   === false, `[G] run ${i}: exec_allowed=false`);
  assert(r.human_review_required       === true,  `[G] run ${i}: human_review_required=true`);
  assert(r.sandbox_only                === true,  `[G] run ${i}: sandbox_only=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nrelease-execution-sandbox-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
