import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-explicit-release-execution-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'erepg-v359',
    real_release_execution_barrier_id: 'rreb-v358',
    real_release_execution_barrier_ready: true,
    ids: {
      explicit_release_execution_command_contract: 'erecc-v355',
      release_execution_consent_binder: 'recb-v356',
      final_production_execution_preflight: 'fpep-v357',
      real_release_execution_barrier: 'rreb-v358',
    },
    phase_summary: 'All 4 explicit release execution barrier modules verified',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_STATUSES.includes('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_STATUSES.includes('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER')); console.log('  PASS: B_BARRIER'); },
  () => { assert.ok(SOFTWARE_FACTORY_EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_STATUSES.includes('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: INCOMPLETE'); },
  () => { assert.ok(SOFTWARE_FACTORY_EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_STATUSES.includes('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('phase_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.real_release_execution_barrier_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER')); console.log('  PASS: barrier not ready'); },
  () => { const i = validInput(); delete i.real_release_execution_barrier_id; const r = build(i); assert.ok(r.errors[0].startsWith('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER')); console.log('  PASS: missing barrier id'); },
  () => { const i = validInput(); delete i.ids; const r = build(i); assert.ok(r.errors[0].startsWith('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER')); console.log('  PASS: missing ids'); },
  () => { const i = validInput(); delete i.phase_summary; const r = build(i); assert.ok(r.errors[0].startsWith('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER')); console.log('  PASS: missing summary'); },
  () => { const i = validInput(); delete i.ids.explicit_release_execution_command_contract; const r = build(i); assert.ok(r.errors[0].startsWith('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: missing id -> INCOMPLETE'); },
  () => { const i = validInput(); i.ids = {}; const r = build(i); assert.ok(r.errors[0].startsWith('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: empty ids -> INCOMPLETE'); },
  () => { const r = build(validInput()); assert.equal(r.explicit_release_execution_phase_gate_ready, true); assert.equal(r.all_ids_present, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.equal(r.phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.ok(r.phase_gate_hash); assert.equal(r.phase_gate_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.phase_gate_hash, r2.phase_gate_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.explicit_release_execution_phase_passed, false); console.log('  PASS: phase not passed inv'); },
  () => { const r = build(validInput()); assert.equal(r.explicit_release_execution_command_received, false); console.log('  PASS: command not received'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_consent_bound, false); console.log('  PASS: consent not bound'); },
  () => { const r = build(validInput()); assert.equal(r.final_production_preflight_passed, false); console.log('  PASS: preflight not passed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_barrier_open, false); console.log('  PASS: barrier not open'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_executed, false); console.log('  PASS: no real release'); },
  () => { const r = build(validInput()); assert.equal(r.real_deploy_executed, false); console.log('  PASS: no real deploy'); },
  () => { const r = build(validInput()); assert.equal(r.real_tag_created, false); console.log('  PASS: no real tag'); },
  () => { const r = build(validInput()); assert.equal(r.real_stable_promoted, false); console.log('  PASS: no stable'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no deploy/release/tag/stable'); },
  () => { const r = build(validInput()); assert.equal(r.real_execution_allowed, false); assert.equal(r.runtime_execution_allowed, false); console.log('  PASS: no real execution'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: production not touched'); },
  () => { const r = build(validInput()); assert.equal(r.final_message, 'V355-V359 explicit release execution barrier complete. Real release, deploy, tag, stable promotion, artifact publish, production touch, billing, and rollback remain blocked until explicit V360 command.'); console.log('  PASS: final message'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('phase_gate_hash')); console.log('  PASS: hashren'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('V355')); assert.ok(r.includes('V359')); console.log('  PASS: versions in render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('V360')); console.log('  PASS: V360 mentioned'); },
  () => { const r = build(validInput()); ['explicit_release_execution_phase_passed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.explicit_release_execution_phase_passed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== explicit-release-execution-phase-gate tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked barrier',10,14],['incomplete',14,16],['ready',16,33],['validate',33,35],['render',35,41],['invariants',41,43]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();