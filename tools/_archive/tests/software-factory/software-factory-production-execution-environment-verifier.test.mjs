import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_PRODUCTION_EXECUTION_ENVIRONMENT_VERIFIER_STATUSES, build, validate, render } from '../../software-factory/software-factory-production-execution-environment-verifier.mjs';

function validInput() {
  return {
    production_execution_environment_verifier_id: 'peev-v361',
    real_release_execution_command_id: 'rrecc-v360',
    real_release_execution_command_ready: true,
    environment_level: 'metadata-only',
    environment_items: [
      { environment_id: 'env-item-1', environment_type: 'release_target', environment_mode: 'metadata-only', environment_hash: 'a'.repeat(64) },
      { environment_id: 'env-item-2', environment_type: 'deployment_target', environment_mode: 'blocked', environment_hash: 'b'.repeat(64) },
      { environment_id: 'env-item-3', environment_type: 'production_target', environment_mode: 'contract-only', environment_hash: 'c'.repeat(64) },
    ],
    required_environment_controls: [
      'metadata-only', 'no-secret-access', 'no-network', 'no-production-touch',
      'no-real-release', 'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
      'no-artifact-publish', 'no-billing-execution', 'rollback-required',
      'evidence-required', 'audit-required', 'human-approval-required', 'pass-gold-required',
    ],
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PRODUCTION_EXECUTION_ENVIRONMENT_VERIFIER_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCTION_EXECUTION_ENVIRONMENT_VERIFIER_STATUSES.includes('PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCTION_EXECUTION_ENVIRONMENT_VERIFIER_STATUSES.includes('PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_COMMAND')); console.log('  PASS: B_COMMAND'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCTION_EXECUTION_ENVIRONMENT_VERIFIER_STATUSES.includes('PRODUCTION_EXECUTION_ENVIRONMENT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCTION_EXECUTION_ENVIRONMENT_VERIFIER_STATUSES.includes('PRODUCTION_EXECUTION_ENVIRONMENT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('production_execution_environment_verifier_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.real_release_execution_command_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_COMMAND')); console.log('  PASS: command not ready'); },
  () => { const i = validInput(); delete i.real_release_execution_command_id; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_COMMAND')); console.log('  PASS: missing command id'); },
  () => { const i = validInput(); i.environment_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_FAIL')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); delete i.environment_items; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_FAIL')); console.log('  PASS: missing items'); },
  () => { const i = validInput(); delete i.required_environment_controls; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_FAIL')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_environment_controls = ['metadata-only']; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_FAIL')); console.log('  PASS: missing required controls'); },
  () => { const i = validInput(); i.environment_level = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_FAIL')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.environment_items[0].environment_type = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_FAIL')); console.log('  PASS: invalid item type'); },
  () => { const i = validInput(); i.environment_items[0].environment_hash = 'not64hex'; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_FAIL')); console.log('  PASS: invalid item hash'); },
  () => { const r = build(validInput()); assert.equal(r.production_execution_environment_verifier_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.production_execution_environment_verifier_hash); assert.equal(r.production_execution_environment_verifier_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.production_execution_environment_verifier_hash, r2.production_execution_environment_verifier_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.production_execution_environment_verified, false); console.log('  PASS: env not verified'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_command_received, false); console.log('  PASS: command not received'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_dry_run_verified, false); console.log('  PASS: dry run not verified'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_rollback_ready, false); console.log('  PASS: rollback not ready'); },
  () => { const r = build(validInput()); assert.equal(r.controlled_real_release_preparation_phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_allowed, false); assert.equal(r.real_deployment_execution_allowed, false); console.log('  PASS: no real exec allowed'); },
  () => { const r = build(validInput()); assert.equal(r.real_tag_creation_allowed, false); assert.equal(r.real_stable_promotion_allowed, false); console.log('  PASS: no tag/stable allowed'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no allowed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_executed, false); assert.equal(r.real_deploy_executed, false); assert.equal(r.real_tag_created, false); assert.equal(r.real_stable_promoted, false); console.log('  PASS: no executed'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: not touched'); },
  () => { const r = build(validInput()); assert.equal(r.environment_items_count, 3); console.log('  PASS: items count 3'); },
  () => { const r = build(validInput()); assert.equal(r.required_environment_controls_count, 15); console.log('  PASS: controls count 15'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('PRODUCTION_EXECUTION_ENVIRONMENT_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('production_execution_environment_verifier_hash')); console.log('  PASS: hashren'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_target')); assert.ok(r.includes('deployment_target')); console.log('  PASS: items in render'); },
  () => { const r = build(validInput()); ['production_execution_environment_verified','real_release_execution_command_received','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
];

function run() {
  console.log('\n=== production-execution-environment-verifier tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked command',10,12],['fail',12,19],['ready',19,34],['validate',34,36],['render',36,41],['invariants',41,42]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();
