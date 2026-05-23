import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_FINAL_PRODUCTION_EXECUTION_PREFLIGHT_STATUSES, build, validate, render } from '../../software-factory/software-factory-final-production-execution-preflight.mjs';

function validInput() {
  return {
    final_production_execution_preflight_id: 'fpep-v357',
    release_execution_consent_binder_id: 'recb-v356',
    release_execution_consent_binder_ready: true,
    preflight_level: 'metadata-only',
    preflight_items: [
      { preflight_id: 'pf-item-1', preflight_type: 'release', preflight_mode: 'metadata-only', preflight_hash: 'a'.repeat(64) },
      { preflight_id: 'pf-item-2', preflight_type: 'deployment', preflight_mode: 'dry-run', preflight_hash: 'b'.repeat(64) },
      { preflight_id: 'pf-item-3', preflight_type: 'tag', preflight_mode: 'contract-only', preflight_hash: 'c'.repeat(64) },
    ],
    required_preflight_controls: [
      'final-preflight-required', 'no-production-touch', 'no-real-release',
      'no-real-deploy', 'no-tag-create', 'no-stable-promotion', 'no-artifact-publish',
      'no-billing-execution', 'no-secret-access', 'rollback-required', 'evidence-required',
      'audit-required', 'human-approval-required', 'pass-gold-required',
    ],
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_FINAL_PRODUCTION_EXECUTION_PREFLIGHT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_FINAL_PRODUCTION_EXECUTION_PREFLIGHT_STATUSES.includes('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_FINAL_PRODUCTION_EXECUTION_PREFLIGHT_STATUSES.includes('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_CONSENT')); console.log('  PASS: B_CONSENT'); },
  () => { assert.ok(SOFTWARE_FACTORY_FINAL_PRODUCTION_EXECUTION_PREFLIGHT_STATUSES.includes('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_FINAL_PRODUCTION_EXECUTION_PREFLIGHT_STATUSES.includes('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('final_production_execution_preflight_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.release_execution_consent_binder_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_CONSENT')); console.log('  PASS: consent not ready'); },
  () => { const i = validInput(); delete i.release_execution_consent_binder_id; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_CONSENT')); console.log('  PASS: missing consent id'); },
  () => { const i = validInput(); i.preflight_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); delete i.preflight_items; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL')); console.log('  PASS: missing items'); },
  () => { const i = validInput(); delete i.required_preflight_controls; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_preflight_controls = ['final-preflight-required']; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL')); console.log('  PASS: missing required controls'); },
  () => { const i = validInput(); i.preflight_level = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.preflight_items[0].preflight_type = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL')); console.log('  PASS: invalid item type'); },
  () => { const i = validInput(); i.preflight_items[0].preflight_hash = 'not64hex'; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL')); console.log('  PASS: invalid item hash'); },
  () => { const r = build(validInput()); assert.equal(r.final_production_execution_preflight_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.final_production_preflight_hash); assert.equal(r.final_production_preflight_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.final_production_preflight_hash, r2.final_production_preflight_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.final_production_preflight_passed, false); console.log('  PASS: preflight not passed'); },
  () => { const r = build(validInput()); assert.equal(r.explicit_release_execution_command_received, false); console.log('  PASS: command not received'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_consent_bound, false); console.log('  PASS: consent not bound'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_barrier_open, false); console.log('  PASS: barrier not open'); },
  () => { const r = build(validInput()); assert.equal(r.explicit_release_execution_phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_executed, false); console.log('  PASS: no real release'); },
  () => { const r = build(validInput()); assert.equal(r.real_deploy_executed, false); console.log('  PASS: no real deploy'); },
  () => { const r = build(validInput()); assert.equal(r.real_tag_created, false); console.log('  PASS: no real tag'); },
  () => { const r = build(validInput()); assert.equal(r.real_stable_promoted, false); console.log('  PASS: no stable'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no deploy/release/tag/stable'); },
  () => { const r = build(validInput()); assert.equal(r.real_execution_allowed, false); assert.equal(r.runtime_execution_allowed, false); console.log('  PASS: no real execution'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: production not touched'); },
  () => { const r = build(validInput()); assert.equal(r.preflight_items_count, 3); console.log('  PASS: items count 3'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('final_production_preflight_hash')); console.log('  PASS: hashren'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release')); assert.ok(r.includes('deployment')); console.log('  PASS: items in render'); },
  () => { const r = build(validInput()); ['final_production_preflight_passed','explicit_release_execution_command_received','release_execution_consent_bound','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.final_production_preflight_passed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== final-production-execution-preflight tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked consent',10,12],['fail',12,20],['ready',20,35],['validate',35,37],['render',37,42],['invariants',42,43]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();