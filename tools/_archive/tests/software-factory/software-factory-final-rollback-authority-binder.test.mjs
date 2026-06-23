import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_FINAL_ROLLBACK_AUTHORITY_BINDER_STATUSES, build, validate, render } from '../../software-factory/software-factory-final-rollback-authority-binder.mjs';

function validInput() {
  return {
    final_rollback_authority_binder_id: 'frab-v352',
    release_execution_plan_receipt_id: 'repr-v351',
    release_execution_plan_receipt_ready: true,
    rollback_authority_items: [
      { rollback_id: 'rb-release', rollback_type: 'release_rollback', rollback_mode: 'contract-only', rollback_hash: 'a'.repeat(64) },
      { rollback_id: 'rb-deployment', rollback_type: 'deployment_rollback', rollback_mode: 'metadata-only', rollback_hash: 'b'.repeat(64) },
      { rollback_id: 'rb-tag', rollback_type: 'tag_rollback', rollback_mode: 'dry-run', rollback_hash: 'c'.repeat(64) },
      { rollback_id: 'rb-stable', rollback_type: 'stable_rollback', rollback_mode: 'planning', rollback_hash: 'd'.repeat(64) },
      { rollback_id: 'rb-artifact', rollback_type: 'artifact_rollback', rollback_mode: 'contract-only', rollback_hash: 'e'.repeat(64) },
      { rollback_id: 'rb-production', rollback_type: 'production_rollback', rollback_mode: 'metadata-only', rollback_hash: 'f'.repeat(64) },
      { rollback_id: 'rb-database', rollback_type: 'database_rollback', rollback_mode: 'dry-run', rollback_hash: '0'.repeat(64) },
      { rollback_id: 'rb-infra', rollback_type: 'infrastructure_rollback', rollback_mode: 'planning', rollback_hash: '1'.repeat(64) },
      { rollback_id: 'rb-evidence', rollback_type: 'evidence_rollback', rollback_mode: 'contract-only', rollback_hash: '2'.repeat(64) },
      { rollback_id: 'rb-audit', rollback_type: 'audit_rollback', rollback_mode: 'metadata-only', rollback_hash: '3'.repeat(64) },
      { rollback_id: 'rb-emergency', rollback_type: 'emergency_stop', rollback_mode: 'planning', rollback_hash: '4'.repeat(64) },
    ],
    required_rollback_controls: [
      'rollback-required', 'final-rollback-required', 'no-real-rollback',
      'no-filesystem-write', 'no-database-write', 'no-network',
      'no-secret-access', 'no-deploy', 'no-release', 'no-tag-create',
      'no-stable-promotion', 'evidence-required', 'audit-required',
      'human-approval-required',
    ],
    rollback_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_FINAL_ROLLBACK_AUTHORITY_BINDER_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_FINAL_ROLLBACK_AUTHORITY_BINDER_STATUSES.includes('FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_FINAL_ROLLBACK_AUTHORITY_BINDER_STATUSES.includes('FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_PLAN')); console.log('  PASS: B_PLAN'); },
  () => { assert.ok(SOFTWARE_FACTORY_FINAL_ROLLBACK_AUTHORITY_BINDER_STATUSES.includes('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_FINAL_ROLLBACK_AUTHORITY_BINDER_STATUSES.includes('FINAL_ROLLBACK_AUTHORITY_BINDER_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('final_rollback_authority_binder_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.release_execution_plan_receipt_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_PLAN')); console.log('  PASS: plan not ready'); },
  () => { const i = validInput(); delete i.release_execution_plan_receipt_id; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_PLAN')); console.log('  PASS: missing plan id'); },
  () => { const i = validInput(); delete i.rollback_authority_items; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: missing items'); },
  () => { const i = validInput(); i.rollback_authority_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); delete i.rollback_authority_items[0].rollback_id; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: missing rollback_id'); },
  () => { const i = validInput(); i.rollback_authority_items[0].rollback_type = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: invalid rollback_type'); },
  () => { const i = validInput(); i.rollback_authority_items[0].rollback_mode = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: invalid rollback_mode'); },
  () => { const i = validInput(); i.rollback_authority_items[0].rollback_hash = 'tooshort'; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.rollback_level = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); delete i.required_rollback_controls; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_rollback_controls = ['rollback-required']; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: missing required controls'); },
  () => { const i = validInput(); delete i.rollback_level; const r = build(i); assert.ok(r.errors[0].startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')); console.log('  PASS: missing rollback_level'); },
  () => { const r = build(validInput()); assert.equal(r.final_rollback_authority_binder_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.final_rollback_authority_hash); assert.equal(r.final_rollback_authority_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.final_rollback_authority_hash, r2.final_rollback_authority_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.human_release_authority_bound, false); console.log('  PASS: human authority not bound'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_plan_published, false); console.log('  PASS: plan not published'); },
  () => { const r = build(validInput()); assert.equal(r.final_rollback_authority_bound, false); console.log('  PASS: rollback auth not bound'); },
  () => { const r = build(validInput()); assert.equal(r.production_release_final_review_approved, false); console.log('  PASS: final review not approved'); },
  () => { const r = build(validInput()); assert.equal(r.pass_gold_release_authority_phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.equal(r.pass_gold_release_evidence_bound, false); console.log('  PASS: evidence not bound'); },
  () => { const r = build(validInput()); assert.equal(r.release_go_decision, false); assert.equal(r.release_no_go_decision, false); console.log('  PASS: go/no-go false'); },
  () => { const r = build(validInput()); assert.equal(r.production_release_scope_locked, false); console.log('  PASS: scope not locked'); },
  () => { const r = build(validInput()); assert.equal(r.release_candidate_integrity_bound, false); console.log('  PASS: integrity not bound'); },
  () => { const r = build(validInput()); assert.equal(r.final_release_ready, false); console.log('  PASS: final not ready'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_allowed, false); assert.equal(r.deployment_execution_allowed, false); console.log('  PASS: exec not allowed'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no deploy/release/tag/stable'); },
  () => { const r = build(validInput()); assert.equal(r.real_execution_allowed, false); assert.equal(r.runtime_execution_allowed, false); assert.equal(r.runtime_mission_executed, false); console.log('  PASS: no real execution'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: production not touched'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.saas_enablement_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('FINAL_ROLLBACK_AUTHORITY_BINDER_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('final_rollback_authority_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.final_rollback_authority_bound, false); assert.equal(r.release_execution_plan_published, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== final-rollback-authority-binder tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked plan',10,12],['fail',12,22],['ready',22,41],['validate',41,43],['render',43,47],['invariants',47,48]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();