#!/usr/bin/env node
/**
 * Release Command Simulator — Unit Tests V51.2
 */

import {
  runReleaseCommandSimulator,
  COMMAND_SIM_STATUSES,
  SIMULATED_COMMAND_TYPES,
} from '../release-command-simulator.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(COMMAND_SIM_STATUSES),                                     '[A-01] statuses array');
assert(COMMAND_SIM_STATUSES.length === 4,                                       '[A-02] 4 statuses');
assert(COMMAND_SIM_STATUSES.includes('COMMAND_SIM_BLOCKED_SANDBOX'),            '[A-03] BLOCKED_SANDBOX');
assert(COMMAND_SIM_STATUSES.includes('COMMAND_SIM_BLOCKED_POLICY'),             '[A-04] BLOCKED_POLICY');
assert(COMMAND_SIM_STATUSES.includes('COMMAND_SIM_BLOCKED_OPERATION'),          '[A-05] BLOCKED_OPERATION');
assert(COMMAND_SIM_STATUSES.includes('COMMAND_SIM_READY'),                      '[A-06] READY');
assert(Array.isArray(SIMULATED_COMMAND_TYPES),                                  '[A-07] types array');
assert(SIMULATED_COMMAND_TYPES.length === 7,                                    '[A-08] 7 command types');
assert(SIMULATED_COMMAND_TYPES.includes('git_tag_annotated'),                   '[A-09] git_tag_annotated');
assert(SIMULATED_COMMAND_TYPES.includes('git_push_tag'),                        '[A-10] git_push_tag');
assert(SIMULATED_COMMAND_TYPES.includes('update_stable_pointer'),               '[A-11] update_stable_pointer');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = runReleaseCommandSimulator({ fixture_mode: true, _mock_timestamp: TS });
assert(fix.simulator_status              === 'COMMAND_SIM_READY',              '[B-01] status=READY');
assert(fix.simulator_ready               === true,                             '[B-02] ready=true');
assert(Array.isArray(fix.simulated_commands),                                  '[B-03] simulated_commands array');
assert(fix.simulated_commands.length     === 7,                                '[B-04] 7 commands');
assert(Array.isArray(fix.blocked_commands),                                    '[B-05] blocked_commands array');
assert(fix.blocked_commands.length       > 0,                                  '[B-06] blocked_commands non-empty');
assert(typeof fix.simulated_tag_name     === 'string',                         '[B-07] tag_name string');
assert(typeof fix.simulated_stable_pointer === 'string',                       '[B-08] stable_pointer string');
assert(typeof fix.simulated_release_notes === 'string',                        '[B-09] release_notes string');
assert(typeof fix.simulated_rollback_anchor === 'string',                      '[B-10] rollback_anchor string');
assert(fix.real_commands_executed        === false,                            '[B-11] real_commands_executed=false');
assert(fix.deploy_allowed                === false,                            '[B-12] deploy=false');
assert(fix.promotion_allowed             === false,                            '[B-13] promotion=false');
assert(fix.stable_allowed                === false,                            '[B-14] stable=false');
assert(fix.tag_allowed                   === false,                            '[B-15] tag=false');
assert(fix.release_execution_allowed     === false,                            '[B-16] exec=false');
assert(fix.release_performed             === false,                            '[B-17] release_performed=false');
assert(fix.tag_created                   === false,                            '[B-18] tag_created=false');
assert(fix.stable_promoted               === false,                            '[B-19] stable_promoted=false');
assert(fix.deploy_performed              === false,                            '[B-20] deploy_performed=false');
assert(fix.schema_version                === 'v51.2',                          '[B-21] schema=v51.2');

// ─── Suite C: All simulated commands have correct flags ───────────
console.log('\n[Suite C] Simulated commands structure');
for (const cmd of fix.simulated_commands) {
  assert(cmd.simulated    === true,  `[C] ${cmd.command_type}: simulated=true`);
  assert(cmd.executed     === false, `[C] ${cmd.command_type}: executed=false`);
  assert(cmd.real_action  === false, `[C] ${cmd.command_type}: real_action=false`);
}

// ─── Suite D: Blocked — missing sandbox ──────────────────────────
console.log('\n[Suite D] Blocked — missing sandbox');
const noSbx = runReleaseCommandSimulator({ _mock_timestamp: TS });
assert(noSbx.simulator_status            === 'COMMAND_SIM_BLOCKED_SANDBOX',    '[D-01] no sandbox → BLOCKED');
assert(noSbx.simulator_ready             === false,                            '[D-02] ready=false');
assert(noSbx.real_commands_executed      === false,                            '[D-03] real_commands=false');
assert(noSbx.deploy_allowed              === false,                            '[D-04] deploy=false');

const notReadySbx = runReleaseCommandSimulator({ sandbox: { sandbox_ready: false } });
assert(notReadySbx.simulator_status      === 'COMMAND_SIM_BLOCKED_SANDBOX',    '[D-05] not-ready sandbox blocked');

// ─── Suite E: Blocked — missing policy ───────────────────────────
console.log('\n[Suite E] Blocked — missing policy');
const noPolicy = runReleaseCommandSimulator({
  sandbox: { sandbox_ready: true, sandbox_id: 'sid', target_version: '1.0.0' },
});
assert(noPolicy.simulator_status         === 'COMMAND_SIM_BLOCKED_POLICY',     '[E-01] no policy → BLOCKED');
assert(noPolicy.deploy_allowed           === false,                            '[E-02] deploy=false');

const notReadyPolicy = runReleaseCommandSimulator({
  sandbox: { sandbox_ready: true, sandbox_id: 'sid', target_version: '1.0.0' },
  policy:  { policy_ready: false },
});
assert(notReadyPolicy.simulator_status   === 'COMMAND_SIM_BLOCKED_POLICY',     '[E-03] not-ready policy blocked');

// ─── Suite F: Full simulation ready ──────────────────────────────
console.log('\n[Suite F] Full simulation');
const sbx    = { sandbox_ready: true, sandbox_id: 'sid-001', target_version: '2.0.0', target_branch: 'main', git_head: 'sha-abc' };
const policy = { policy_ready: true, blocked_operations: ['git_tag_create', 'git_push', 'deploy_execute'] };
const sim    = runReleaseCommandSimulator({ sandbox: sbx, policy });
assert(sim.simulator_status              === 'COMMAND_SIM_READY',              '[F-01] status=READY');
assert(sim.simulator_ready               === true,                             '[F-02] ready=true');
assert(sim.simulated_commands.length     === 7,                                '[F-03] 7 commands');
assert(sim.simulated_tag_name            === 'v2.0.0',                         '[F-04] tag_name=v2.0.0');
assert(sim.sandbox_id                    === 'sid-001',                        '[F-05] sandbox_id propagated');
assert(sim.real_commands_executed        === false,                            '[F-06] real_commands=false');
assert(sim.deploy_allowed                === false,                            '[F-07] deploy=false');
assert(sim.tag_created                   === false,                            '[F-08] tag_created=false');
assert(sim.stable_promoted               === false,                            '[F-09] stable_promoted=false');
assert(sim.deploy_performed              === false,                            '[F-10] deploy_performed=false');

// ─── Suite G: Invariants across all ──────────────────────────────
console.log('\n[Suite G] Invariants');
const all = [fix, noSbx, notReadySbx, noPolicy, sim];
for (const r of all) {
  assert(r.deploy_allowed            === false, `[G] ${r.simulator_status}: deploy=false`);
  assert(r.real_commands_executed    === false, `[G] ${r.simulator_status}: real_commands=false`);
  assert(r.tag_created               === false, `[G] ${r.simulator_status}: tag_created=false`);
  assert(r.stable_promoted           === false, `[G] ${r.simulator_status}: stable_promoted=false`);
  assert(r.deploy_performed          === false, `[G] ${r.simulator_status}: deploy_performed=false`);
  assert(r.release_performed         === false, `[G] ${r.simulator_status}: release_performed=false`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nrelease-command-simulator: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
