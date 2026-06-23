import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_RELEASE_CANDIDATE_INTEGRITY_BINDER_STATUSES, build, validate, render } from '../../software-factory/software-factory-release-candidate-integrity-binder.mjs';

function validInput() {
  return {
    release_candidate_integrity_binder_id: 'rcib-v348',
    production_release_scope_lock_id: 'prsl-v347',
    production_release_scope_lock_ready: true,
    integrity_items: [
      { integrity_id: 'int-source', integrity_type: 'source_integrity', integrity_mode: 'contract-only', integrity_hash: 'a'.repeat(64) },
      { integrity_id: 'int-package', integrity_type: 'package_integrity', integrity_mode: 'metadata-only', integrity_hash: 'b'.repeat(64) },
      { integrity_id: 'int-test', integrity_type: 'test_integrity', integrity_mode: 'dry-run', integrity_hash: 'c'.repeat(64) },
      { integrity_id: 'int-syntax', integrity_type: 'syntax_integrity', integrity_mode: 'planning', integrity_hash: 'd'.repeat(64) },
      { integrity_id: 'int-evidence', integrity_type: 'evidence_integrity', integrity_mode: 'contract-only', integrity_hash: 'e'.repeat(64) },
      { integrity_id: 'int-artifact', integrity_type: 'artifact_integrity', integrity_mode: 'metadata-only', integrity_hash: 'f'.repeat(64) },
      { integrity_id: 'int-rollback', integrity_type: 'rollback_integrity', integrity_mode: 'dry-run', integrity_hash: '0'.repeat(64) },
      { integrity_id: 'int-audit', integrity_type: 'audit_integrity', integrity_mode: 'planning', integrity_hash: '1'.repeat(64) },
      { integrity_id: 'int-pass-gold', integrity_type: 'pass_gold_integrity', integrity_mode: 'contract-only', integrity_hash: '2'.repeat(64) },
      { integrity_id: 'int-blocker', integrity_type: 'blocker_integrity', integrity_mode: 'metadata-only', integrity_hash: '3'.repeat(64) },
    ],
    required_integrity_controls: [
      'integrity-required', 'no-artifact-publish', 'no-real-release',
      'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
      'no-production-touch', 'pass-gold-required', 'rollback-required',
      'evidence-required', 'audit-required',
    ],
    integrity_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_RELEASE_CANDIDATE_INTEGRITY_BINDER_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_CANDIDATE_INTEGRITY_BINDER_STATUSES.includes('RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_CANDIDATE_INTEGRITY_BINDER_STATUSES.includes('RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_SCOPE')); console.log('  PASS: B_SCOPE'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_CANDIDATE_INTEGRITY_BINDER_STATUSES.includes('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_CANDIDATE_INTEGRITY_BINDER_STATUSES.includes('RELEASE_CANDIDATE_INTEGRITY_BINDER_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('release_candidate_integrity_binder_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.production_release_scope_lock_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_SCOPE')); console.log('  PASS: scope not ready'); },
  () => { const i = validInput(); delete i.production_release_scope_lock_id; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_SCOPE')); console.log('  PASS: missing scope id'); },
  () => { const i = validInput(); delete i.integrity_items; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: missing items'); },
  () => { const i = validInput(); i.integrity_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); delete i.integrity_items[0].integrity_id; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: missing integrity_id'); },
  () => { const i = validInput(); i.integrity_items[0].integrity_type = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: invalid integrity_type'); },
  () => { const i = validInput(); i.integrity_items[0].integrity_mode = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: invalid integrity_mode'); },
  () => { const i = validInput(); i.integrity_items[0].integrity_hash = 'tooshort'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.integrity_level = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); delete i.required_integrity_controls; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_integrity_controls = ['integrity-required']; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: missing required controls'); },
  () => { const i = validInput(); delete i.integrity_level; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')); console.log('  PASS: missing integrity_level'); },
  () => { const r = build(validInput()); assert.equal(r.release_candidate_integrity_binder_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.release_candidate_integrity_hash); assert.equal(r.release_candidate_integrity_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.release_candidate_integrity_hash, r2.release_candidate_integrity_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.pass_gold_release_evidence_bound, false); console.log('  PASS: evidence not bound'); },
  () => { const r = build(validInput()); assert.equal(r.release_go_decision, false); assert.equal(r.release_no_go_decision, false); console.log('  PASS: go/no-go false'); },
  () => { const r = build(validInput()); assert.equal(r.production_release_scope_locked, false); console.log('  PASS: scope not locked'); },
  () => { const r = build(validInput()); assert.equal(r.release_candidate_integrity_bound, false); console.log('  PASS: integrity not bound'); },
  () => { const r = build(validInput()); assert.equal(r.final_release_ready, false); console.log('  PASS: final not ready'); },
  () => { const r = build(validInput()); assert.equal(r.human_release_authority_bound, false); console.log('  PASS: human authority not bound'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_plan_published, false); console.log('  PASS: plan not published'); },
  () => { const r = build(validInput()); assert.equal(r.final_rollback_authority_bound, false); console.log('  PASS: rollback auth not bound'); },
  () => { const r = build(validInput()); assert.equal(r.production_release_final_review_approved, false); console.log('  PASS: final review not approved'); },
  () => { const r = build(validInput()); assert.equal(r.pass_gold_release_authority_phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_allowed, false); assert.equal(r.deployment_execution_allowed, false); console.log('  PASS: exec not allowed'); },
  () => { const r = build(validInput()); assert.equal(r.deployment_scope_bound, false); assert.equal(r.release_artifact_published, false); assert.equal(r.deployment_dry_run_completed, false); console.log('  PASS: scope/artifact/dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_ready, false); assert.equal(r.release_execution_approved, false); assert.equal(r.deployment_evidence_published, false); console.log('  PASS: ready/approved/evid blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_rollback_bound, false); assert.equal(r.release_authority_granted, false); assert.equal(r.release_execution_phase_passed, false); console.log('  PASS: rollback/auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no deploy/release/tag/stable'); },
  () => { const r = build(validInput()); assert.equal(r.real_execution_allowed, false); assert.equal(r.runtime_execution_allowed, false); assert.equal(r.runtime_mission_executed, false); console.log('  PASS: no real execution'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: production not touched'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.production_touch_allowed, false); assert.equal(r.activation_execution_phase_passed, false); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enablement_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('RELEASE_CANDIDATE_INTEGRITY_BINDER_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_candidate_integrity_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.release_candidate_integrity_bound, false); assert.equal(r.pass_gold_release_evidence_bound, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== release-candidate-integrity-binder tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked scope',10,12],['fail',12,22],['ready',22,43],['validate',43,45],['render',45,49],['invariants',49,51]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();