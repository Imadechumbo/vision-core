import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_FIREWALL_FINAL_AUTHORITY_REVIEW_STATUSES, build, validate, render } from '../../software-factory/software-factory-firewall-final-authority-review.mjs';

function validInput() {
  return {
    firewall_final_authority_review_id: 'ffar-v374',
    firewall_evidence_receipt_id: 'fer-v373',
    firewall_evidence_receipt_ready: true,
    authority_decision: 'approved',
    authority_id: 'auth-final-001',
    review_reason: 'all firewall gates passed metadata-only review',
    review_mode: 'metadata-only',
    required_review_controls: [
      'firewall-final-authority-required', 'human-approval-required',
      'firewall-evidence-required', 'no-real-execution-approval', 'no-real-release',
      'no-real-deploy', 'no-tag-create', 'no-stable-promotion', 'no-artifact-publish',
      'no-production-touch', 'no-billing-execution', 'no-secret-access', 'no-network',
      'no-real-rollback', 'audit-required', 'pass-gold-required',
    ],
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_FIREWALL_FINAL_AUTHORITY_REVIEW_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_FIREWALL_FINAL_AUTHORITY_REVIEW_STATUSES.includes('FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_FIREWALL_FINAL_AUTHORITY_REVIEW_STATUSES.includes('FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_EVIDENCE')); console.log('  PASS: B_EVIDENCE'); },
  () => { assert.ok(SOFTWARE_FACTORY_FIREWALL_FINAL_AUTHORITY_REVIEW_STATUSES.includes('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: DENIED'); },
  () => { assert.ok(SOFTWARE_FACTORY_FIREWALL_FINAL_AUTHORITY_REVIEW_STATUSES.includes('FIREWALL_FINAL_AUTHORITY_REVIEW_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('firewall_final_authority_review_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.firewall_evidence_receipt_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_EVIDENCE')); console.log('  PASS: evidence not ready'); },
  () => { const i = validInput(); delete i.firewall_evidence_receipt_id; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_BLOCKED_EVIDENCE')); console.log('  PASS: missing evidence id'); },
  () => { const i = validInput(); i.authority_decision = 'denied'; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: denied'); },
  () => { const i = validInput(); i.authority_decision = 'blocked'; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: blocked'); },
  () => { const i = validInput(); i.authority_decision = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: invalid decision'); },
  () => { const i = validInput(); delete i.authority_decision; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: missing decision'); },
  () => { const i = validInput(); delete i.authority_id; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: missing authority id'); },
  () => { const i = validInput(); delete i.review_reason; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: missing review reason'); },
  () => { const i = validInput(); delete i.review_mode; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: missing review mode'); },
  () => { const i = validInput(); i.review_mode = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: invalid review mode'); },
  () => { const i = validInput(); delete i.required_review_controls; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_review_controls = ['firewall-final-authority-required']; const r = build(i); assert.ok(r.errors[0].startsWith('FIREWALL_FINAL_AUTHORITY_REVIEW_DENIED')); console.log('  PASS: missing required controls'); },
  () => { const r = build(validInput()); assert.equal(r.firewall_final_authority_review_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.firewall_final_authority_review_hash); assert.equal(r.firewall_final_authority_review_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.firewall_final_authority_review_hash, r2.firewall_final_authority_review_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.required_review_controls_count, 16); console.log('  PASS: controls count 16'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_firewall_enabled, false); console.log('  PASS: fw not enabled'); },
  () => { const r = build(validInput()); assert.equal(r.production_mutation_firewall_locked, false); console.log('  PASS: mutation not locked'); },
  () => { const r = build(validInput()); assert.equal(r.secret_access_firewall_locked, false); console.log('  PASS: secret not locked'); },
  () => { const r = build(validInput()); assert.equal(r.billing_execution_firewall_locked, false); console.log('  PASS: billing not locked'); },
  () => { const r = build(validInput()); assert.equal(r.network_execution_firewall_locked, false); console.log('  PASS: network not locked'); },
  () => { const r = build(validInput()); assert.equal(r.artifact_tag_stable_firewall_locked, false); console.log('  PASS: artifact locked false'); },
  () => { const r = build(validInput()); assert.equal(r.rollback_execution_firewall_locked, false); console.log('  PASS: rollback locked false'); },
  () => { const r = build(validInput()); assert.equal(r.last_mile_noop_drill_completed, false); console.log('  PASS: drill not completed'); },
  () => { const r = build(validInput()); assert.equal(r.firewall_evidence_receipt_published, false); console.log('  PASS: evidence not published'); },
  () => { const r = build(validInput()); assert.equal(r.firewall_final_authority_approved, false); console.log('  PASS: authority not approved'); },
  () => { const r = build(validInput()); assert.equal(r.artifact_published, false); console.log('  PASS: artifact not published'); },
  () => { const r = build(validInput()); assert.equal(r.rollback_executed, false); console.log('  PASS: rollback not executed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_command_received, false); console.log('  PASS: command not received'); },
  () => { const r = build(validInput()); assert.equal(r.production_execution_environment_verified, false); console.log('  PASS: env not verified'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_dry_run_verified, false); console.log('  PASS: dry run not verified'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_rollback_ready, false); console.log('  PASS: rollback not ready'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_ready, false); console.log('  PASS: exec not ready'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_allowed, false); assert.equal(r.real_deployment_execution_allowed, false); console.log('  PASS: no real exec allowed'); },
  () => { const r = build(validInput()); assert.equal(r.real_tag_creation_allowed, false); assert.equal(r.real_stable_promotion_allowed, false); console.log('  PASS: no tag/stable allowed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_executed, false); assert.equal(r.real_deploy_executed, false); assert.equal(r.real_tag_created, false); assert.equal(r.real_stable_promoted, false); console.log('  PASS: no executed'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: not touched'); },
  () => { const r = build(validInput()); assert.equal(r.billing_executed, false); console.log('  PASS: not billed'); },
  () => { const r = build(validInput()); assert.equal(r.secrets_accessed, false); console.log('  PASS: not accessed secrets'); },
  () => { const r = build(validInput()); assert.equal(r.network_accessed, false); console.log('  PASS: not accessed network'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no allowed'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('FIREWALL_FINAL_AUTHORITY_REVIEW_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('firewall_final_authority_review_hash')); console.log('  PASS: hashren'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('authority_decision:')); console.log('  PASS: decision in render'); },
  () => { const r = build(validInput()); ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.firewall_final_authority_approved, false); assert.equal(r.real_release_executed, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== firewall-final-authority-review tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked evidence',10,12],['denied',12,22],['ready',22,51],['validate',51,53],['render',53,58],['invariants',58,60]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();