import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_RELEASE_EXECUTION_PLAN_RECEIPT_STATUSES, build, validate, render } from '../../software-factory/software-factory-release-execution-plan-receipt.mjs';

function validInput() {
  return {
    release_execution_plan_receipt_id: 'repr-v351',
    human_release_authority_binding_id: 'hrab-v350',
    human_release_authority_binding_ready: true,
    plan_items: [
      { plan_id: 'pl-release', plan_type: 'release_plan', plan_mode: 'contract-only', plan_hash: 'a'.repeat(64) },
      { plan_id: 'pl-deployment', plan_type: 'deployment_plan', plan_mode: 'metadata-only', plan_hash: 'b'.repeat(64) },
      { plan_id: 'pl-tag', plan_type: 'tag_plan', plan_mode: 'dry-run', plan_hash: 'c'.repeat(64) },
      { plan_id: 'pl-stable', plan_type: 'stable_plan', plan_mode: 'planning', plan_hash: 'd'.repeat(64) },
      { plan_id: 'pl-artifact', plan_type: 'artifact_plan', plan_mode: 'contract-only', plan_hash: 'e'.repeat(64) },
      { plan_id: 'pl-production', plan_type: 'production_plan', plan_mode: 'metadata-only', plan_hash: 'f'.repeat(64) },
      { plan_id: 'pl-rollback', plan_type: 'rollback_plan', plan_mode: 'dry-run', plan_hash: '0'.repeat(64) },
      { plan_id: 'pl-audit', plan_type: 'audit_plan', plan_mode: 'planning', plan_hash: '1'.repeat(64) },
      { plan_id: 'pl-evidence', plan_type: 'evidence_plan', plan_mode: 'contract-only', plan_hash: '2'.repeat(64) },
      { plan_id: 'pl-blocker', plan_type: 'blocker_plan', plan_mode: 'metadata-only', plan_hash: '3'.repeat(64) },
      { plan_id: 'pl-emergency', plan_type: 'emergency_stop_plan', plan_mode: 'planning', plan_hash: '4'.repeat(64) },
    ],
    required_plan_controls: [
      'no-real-release', 'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
      'no-artifact-publish', 'no-production-touch', 'no-billing-execution',
      'no-secret-access', 'rollback-required', 'evidence-required',
      'audit-required', 'human-approval-required', 'pass-gold-required',
    ],
    plan_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_RELEASE_EXECUTION_PLAN_RECEIPT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_PLAN_RECEIPT_STATUSES.includes('RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_PLAN_RECEIPT_STATUSES.includes('RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_AUTHORITY')); console.log('  PASS: B_AUTHORITY'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_PLAN_RECEIPT_STATUSES.includes('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_PLAN_RECEIPT_STATUSES.includes('RELEASE_EXECUTION_PLAN_RECEIPT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('release_execution_plan_receipt_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.human_release_authority_binding_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_AUTHORITY')); console.log('  PASS: authority not ready'); },
  () => { const i = validInput(); delete i.human_release_authority_binding_id; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_AUTHORITY')); console.log('  PASS: missing authority id'); },
  () => { const i = validInput(); delete i.plan_items; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: missing items'); },
  () => { const i = validInput(); i.plan_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); delete i.plan_items[0].plan_id; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: missing plan_id'); },
  () => { const i = validInput(); i.plan_items[0].plan_type = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: invalid plan_type'); },
  () => { const i = validInput(); i.plan_items[0].plan_mode = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: invalid plan_mode'); },
  () => { const i = validInput(); i.plan_items[0].plan_hash = 'tooshort'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.plan_level = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); delete i.required_plan_controls; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_plan_controls = ['no-real-release']; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: missing required controls'); },
  () => { const i = validInput(); delete i.plan_level; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')); console.log('  PASS: missing plan_level'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_plan_receipt_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.release_execution_plan_hash); assert.equal(r.release_execution_plan_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.release_execution_plan_hash, r2.release_execution_plan_hash); console.log('  PASS: det'); },
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
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('RELEASE_EXECUTION_PLAN_RECEIPT_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_execution_plan_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.release_execution_plan_published, false); assert.equal(r.human_release_authority_bound, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== release-execution-plan-receipt tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked authority',10,12],['fail',12,22],['ready',22,41],['validate',41,43],['render',43,47],['invariants',47,48]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();