import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-controlled-release-execution-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'crepg-v344', release_final_review_id: 'rfar-v343', release_final_authority_review_ready: true,
    ids: {
      release_execution_command_contract: 'recc-v335',
      deployment_scope_boundary_contract: 'dsbc-v336',
      release_artifact_evidence_binder: 'raeb-v337',
      deployment_dry_run_plan: 'ddrp-v338',
      release_execution_readiness_gate: 'rerg-v339',
      release_approval_binding: 'rab-v340',
      deployment_evidence_receipt: 'der-v341',
      release_rollback_binder: 'rrb-v342',
      release_final_authority_review: 'rfar-v343',
    },
    phase_summary: 'All 9 modules verified for controlled release execution',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: B_REVIEW'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: INCOMPLETE'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('phase_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.release_final_authority_review_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: review not ready'); },
  () => { const i = validInput(); delete i.release_final_review_id; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing review id'); },
  () => { const i = validInput(); delete i.ids; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing ids'); },
  () => { const i = validInput(); delete i.phase_summary; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing summary'); },
  () => { const i = validInput(); delete i.ids.release_execution_command_contract; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: missing module -> INCOMPLETE'); },
  () => { const i = validInput(); i.ids = {}; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: empty ids -> INCOMPLETE'); },
  () => { const r = build(validInput()); assert.equal(r.controlled_release_execution_phase_gate_ready, true); assert.equal(r.all_modules_present, true); assert.equal(r.modules_verified.length, 9); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.equal(r.phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.ok(r.phase_gate_hash); assert.equal(r.phase_gate_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.phase_gate_hash, r2.phase_gate_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_allowed, false); assert.equal(r.deployment_execution_allowed, false); console.log('  PASS: release/deploy not allowed'); },
  () => { const r = build(validInput()); assert.equal(r.deployment_scope_bound, false); assert.equal(r.release_artifact_published, false); assert.equal(r.deployment_dry_run_completed, false); console.log('  PASS: scope/artifact/dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_ready, false); assert.equal(r.release_execution_approved, false); assert.equal(r.deployment_evidence_published, false); console.log('  PASS: ready/approved/evid blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_rollback_bound, false); assert.equal(r.release_authority_granted, false); assert.equal(r.release_execution_phase_passed, false); console.log('  PASS: rollback/auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); assert.equal(r.final_message, 'V335-V344 controlled release/deployment authority complete. Real release, deploy, tag, artifact publish, production touch, rollback, and stable promotion remain blocked until explicit V345 command.'); console.log('  PASS: final message'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('phase_gate_hash')); console.log('  PASS: hashren'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('V335')); assert.ok(r.includes('V344')); console.log('  PASS: modules in render'); },
  () => { const r = build(validInput()); ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.release_execution_allowed, false); assert.equal(r.release_execution_phase_passed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== controlled-release-execution-phase-gate tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked review',10,14],['incomplete',14,16],['ready',16,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();