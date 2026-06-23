import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_COMMAND_CONTRACT_STATUSES, build, validate, render } from '../../software-factory/software-factory-real-release-execution-command-contract.mjs';

function validInput() {
  return {
    real_release_execution_command_id: 'rrecc-v360',
    explicit_release_execution_phase_gate_id: 'erepg-v359',
    explicit_release_execution_phase_gate_ready: true,
    explicit_v360_command: true,
    requested_by: 'human-release-manager',
    command_reason: 'Explicit V360 command for controlled release preparation',
    command_mode: 'contract-only',
    required_command_controls: [
      'explicit-v360-command-required', 'explicit-release-barrier-required', 'pass-gold-required',
      'human-authority-required', 'no-production-touch', 'no-real-release', 'no-real-deploy',
      'no-tag-create', 'no-stable-promotion', 'no-artifact-publish', 'no-billing-execution',
      'no-secret-access', 'rollback-required', 'evidence-required', 'audit-required',
    ],
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_COMMAND_CONTRACT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_COMMAND_CONTRACT_STATUSES.includes('REAL_RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_COMMAND_CONTRACT_STATUSES.includes('REAL_RELEASE_EXECUTION_COMMAND_BLOCKED_PHASE')); console.log('  PASS: B_PHASE'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_COMMAND_CONTRACT_STATUSES.includes('REAL_RELEASE_EXECUTION_COMMAND_DENIED')); console.log('  PASS: DENIED'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_COMMAND_CONTRACT_STATUSES.includes('REAL_RELEASE_EXECUTION_COMMAND_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('REAL_RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('real_release_execution_command_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.explicit_release_execution_phase_gate_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('REAL_RELEASE_EXECUTION_COMMAND_BLOCKED_PHASE')); console.log('  PASS: phase not ready'); },
  () => { const i = validInput(); delete i.explicit_release_execution_phase_gate_id; const r = build(i); assert.ok(r.errors[0].startsWith('REAL_RELEASE_EXECUTION_COMMAND_BLOCKED_PHASE')); console.log('  PASS: missing phase id'); },
  () => { const i = validInput(); i.explicit_v360_command = false; const r = build(i); assert.ok(r.errors[0].startsWith('REAL_RELEASE_EXECUTION_COMMAND_DENIED')); console.log('  PASS: command not true'); },
  () => { const i = validInput(); delete i.requested_by; const r = build(i); assert.ok(r.errors[0].startsWith('REAL_RELEASE_EXECUTION_COMMAND_DENIED')); console.log('  PASS: missing requested_by'); },
  () => { const i = validInput(); delete i.command_reason; const r = build(i); assert.ok(r.errors[0].startsWith('REAL_RELEASE_EXECUTION_COMMAND_DENIED')); console.log('  PASS: missing reason'); },
  () => { const i = validInput(); i.command_mode = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('REAL_RELEASE_EXECUTION_COMMAND_DENIED')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); delete i.required_command_controls; const r = build(i); assert.ok(r.errors[0].startsWith('REAL_RELEASE_EXECUTION_COMMAND_DENIED')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_command_controls = ['explicit-v360-command-required']; const r = build(i); assert.ok(r.errors[0].startsWith('REAL_RELEASE_EXECUTION_COMMAND_DENIED')); console.log('  PASS: missing required controls'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_command_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.real_release_execution_command_hash); assert.equal(r.real_release_execution_command_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.real_release_execution_command_hash, r2.real_release_execution_command_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_command_received, false); console.log('  PASS: command not received'); },
  () => { const r = build(validInput()); assert.equal(r.production_execution_environment_verified, false); console.log('  PASS: env not verified'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_dry_run_verified, false); console.log('  PASS: dry run not verified'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_rollback_ready, false); console.log('  PASS: rollback not ready'); },
  () => { const r = build(validInput()); assert.equal(r.controlled_real_release_preparation_phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_ready, false); console.log('  PASS: exec not ready'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_allowed, false); assert.equal(r.real_deployment_execution_allowed, false); console.log('  PASS: no real exec allowed'); },
  () => { const r = build(validInput()); assert.equal(r.real_tag_creation_allowed, false); assert.equal(r.real_stable_promotion_allowed, false); console.log('  PASS: no tag/stable allowed'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no allowed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_executed, false); assert.equal(r.real_deploy_executed, false); assert.equal(r.real_tag_created, false); assert.equal(r.real_stable_promoted, false); console.log('  PASS: no executed'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: not touched'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('REAL_RELEASE_EXECUTION_COMMAND_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_release_execution_command_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.real_release_execution_command_received, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== real-release-execution-command-contract tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked phase',10,12],['denied',12,18],['ready',18,32],['validate',32,34],['render',34,38],['invariants',38,40]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();
