#!/usr/bin/env node
/**
 * Real Manual Unlock Dry-Run Executor — Unit Tests V72.0
 */

import {
  runRealManualUnlockDryRun,
  validateRealManualUnlockDryRun,
  renderRealManualUnlockDryRunSummary,
  UNLOCK_DRY_RUN_STATUSES,
} from '../real-manual-unlock-dry-run-executor.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T06:00:00.000Z';

const GOOD_CONTRACT = {
  contract_status: 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW',
  unlock_execution_contract_id: 'uc-id',
  requested_unlock_scope: 'unlock_for_full_manual_execution_review',
};
const GOOD_BINDING = {
  binding_status: 'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW',
  binding_id: 'ub-id',
};
const GOOD_BASELINE = {
  baseline_ready: true,
  baseline_status: 'FINAL_PREPROD_BASELINE_READY_REVIEW',
  baseline_id: 'bl-id',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(UNLOCK_DRY_RUN_STATUSES),                                        '[A-01] statuses array');
assert(UNLOCK_DRY_RUN_STATUSES.length === 5,                                           '[A-02] 5 statuses');
assert(UNLOCK_DRY_RUN_STATUSES.includes('UNLOCK_DRY_RUN_READY'),                      '[A-03] READY');
assert(UNLOCK_DRY_RUN_STATUSES.includes('UNLOCK_DRY_RUN_BLOCKED_CONTRACT'),           '[A-04] BLOCKED_CONTRACT');
assert(UNLOCK_DRY_RUN_STATUSES.includes('UNLOCK_DRY_RUN_BLOCKED_BINDING'),            '[A-05] BLOCKED_BINDING');
assert(UNLOCK_DRY_RUN_STATUSES.includes('UNLOCK_DRY_RUN_BLOCKED_BASELINE'),           '[A-06] BLOCKED_BASELINE');
assert(UNLOCK_DRY_RUN_STATUSES.includes('UNLOCK_DRY_RUN_BLOCKED_NOT_DRY_RUN'),       '[A-07] BLOCKED_NOT_DRY_RUN');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = runRealManualUnlockDryRun({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.unlock_dry_run_status  === 'UNLOCK_DRY_RUN_READY',                         '[B-02] status=READY');
assert(fix.unlock_dry_run_ready   === true,                                            '[B-03] ready=true');
assert(fix.schema_version         === 'v72.0',                                         '[B-04] schema=v72.0');
assert(typeof fix.unlock_dry_run_id === 'string' && fix.unlock_dry_run_id.length === 24, '[B-05] id 24 chars');
assert(fix.simulated_unlock_result === 'DRY_RUN_UNLOCK_SIMULATED',                    '[B-06] simulated result');
assert(Array.isArray(fix.simulated_unlocked_capabilities),                             '[B-07] capabilities array');
assert(typeof fix.unlock_receipt_preview_id === 'string',                              '[B-08] receipt preview id');
assert(fix.blocking_reason  === null,                                                  '[B-09] blocking_reason=null');
assert(fix.created_at       === TS,                                                    '[B-10] created_at=TS');

// ─── Suite C: Blocked — not dry run ───────────────────────────────
console.log('\n[Suite C] Not dry run blocked');
const notDry = runRealManualUnlockDryRun({ unlock_execution_contract: GOOD_CONTRACT, unlock_authority_binding: GOOD_BINDING, dry_run: false, _mock_timestamp: TS });
assert(notDry.unlock_dry_run_status === 'UNLOCK_DRY_RUN_BLOCKED_NOT_DRY_RUN',         '[C-01] BLOCKED_NOT_DRY_RUN (dry_run=false)');

const realExec = runRealManualUnlockDryRun({ unlock_execution_contract: GOOD_CONTRACT, unlock_authority_binding: GOOD_BINDING, dry_run: true, real_execute: true, _mock_timestamp: TS });
assert(realExec.unlock_dry_run_status === 'UNLOCK_DRY_RUN_BLOCKED_NOT_DRY_RUN',       '[C-02] BLOCKED_NOT_DRY_RUN (real_execute=true)');

// ─── Suite D: Blocked — missing contract ─────────────────────────
console.log('\n[Suite D] Missing contract');
const noC = runRealManualUnlockDryRun({ unlock_authority_binding: GOOD_BINDING, dry_run: true, _mock_timestamp: TS });
assert(noC.unlock_dry_run_status === 'UNLOCK_DRY_RUN_BLOCKED_CONTRACT',               '[D-01] BLOCKED_CONTRACT');

// ─── Suite E: Blocked — missing binding ──────────────────────────
console.log('\n[Suite E] Missing binding');
const noB = runRealManualUnlockDryRun({ unlock_execution_contract: GOOD_CONTRACT, dry_run: true, _mock_timestamp: TS });
assert(noB.unlock_dry_run_status === 'UNLOCK_DRY_RUN_BLOCKED_BINDING',                '[E-01] BLOCKED_BINDING');

// ─── Suite F: Blocked — bad baseline ─────────────────────────────
console.log('\n[Suite F] Bad baseline');
const badBl = runRealManualUnlockDryRun({
  unlock_execution_contract: GOOD_CONTRACT,
  unlock_authority_binding:  GOOD_BINDING,
  final_preprod_baseline:    { baseline_ready: false },
  dry_run: true,
  _mock_timestamp: TS,
});
assert(badBl.unlock_dry_run_status === 'UNLOCK_DRY_RUN_BLOCKED_BASELINE',             '[F-01] BLOCKED_BASELINE');

// ─── Suite G: Full dry-run ready ──────────────────────────────────
console.log('\n[Suite G] Full dry-run ready');
const ready = runRealManualUnlockDryRun({
  unlock_execution_contract: GOOD_CONTRACT,
  unlock_authority_binding:  GOOD_BINDING,
  final_preprod_baseline:    GOOD_BASELINE,
  dry_run:       true,
  real_execute:  false,
  _mock_timestamp: TS,
});
assert(ready.unlock_dry_run_ready  === true,                                           '[G-01] ready=true');
assert(ready.unlock_dry_run_status === 'UNLOCK_DRY_RUN_READY',                        '[G-02] status=READY');
assert(Array.isArray(ready.simulated_unlocked_capabilities),                           '[G-03] capabilities array');
assert(ready.simulated_unlocked_capabilities.includes('tag_review_enabled'),           '[G-04] tag capability');
assert(ready.simulated_unlocked_capabilities.includes('stable_review_enabled'),        '[G-05] stable capability');
assert(typeof ready.unlock_receipt_preview_id === 'string',                            '[G-06] receipt preview');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.production_execution_locked === true,  '[H-01] locked=true');
assert(fix.unlock_executed             === false, '[H-02] unlock_executed=false');
assert(fix.real_execution_armed        === false, '[H-03] armed=false');
assert(fix.deploy_allowed              === false, '[H-04] deploy_allowed=false');
assert(fix.promotion_allowed           === false, '[H-05] promotion_allowed=false');
assert(fix.stable_allowed              === false, '[H-06] stable_allowed=false');
assert(fix.tag_allowed                 === false, '[H-07] tag_allowed=false');
assert(fix.release_execution_allowed   === false, '[H-08] release_exec=false');
assert(fix.release_performed           === false, '[H-09] release_performed=false');
assert(fix.tag_created                 === false, '[H-10] tag_created=false');
assert(fix.stable_promoted             === false, '[H-11] stable_promoted=false');
assert(fix.deploy_performed            === false, '[H-12] deploy_performed=false');

assert(noC.production_execution_locked === true,  '[H-13] blocked: locked=true');
assert(noC.unlock_executed             === false, '[H-14] blocked: unlock=false');

// ─── Suite I: validate ────────────────────────────────────────────
console.log('\n[Suite I] Validate');
const vFix = validateRealManualUnlockDryRun(fix);
assert(vFix.valid  === true,  '[I-01] fixture valid');
assert(vFix.reason === null,  '[I-02] reason null');
assert(validateRealManualUnlockDryRun(null).valid === false, '[I-03] null invalid');

// ─── Suite J: render ─────────────────────────────────────────────
console.log('\n[Suite J] Render');
const rendered = renderRealManualUnlockDryRunSummary(fix);
assert(typeof rendered === 'string',                                                    '[J-01] returns string');
assert(rendered.includes('UNLOCK_DRY_RUN_READY'),                                     '[J-02] status in output');
assert(rendered.includes('production_execution_locked    : true'),                    '[J-03] lock in output');
assert(rendered.includes('unlock_executed                : false'),                   '[J-04] unlock=false');
assert(rendered.includes('real_execution_armed           : false'),                   '[J-05] armed=false');
assert(renderRealManualUnlockDryRunSummary(null) === 'real_manual_unlock_dry_run: null', '[J-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-manual-unlock-dry-run-executor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
