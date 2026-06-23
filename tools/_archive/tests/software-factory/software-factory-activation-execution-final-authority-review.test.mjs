import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ACTIVATION_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES, build, validate, render } from '../../software-factory/software-factory-activation-execution-final-authority-review.mjs';

function validInput() {
  return {
    activation_execution_final_review_id: 'aefar-v333', activation_execution_rollback_binder_id: 'aerb-v332', activation_execution_rollback_binder_ready: true,
    authority_decision: 'approved', authority_id: 'auth-v333', review_reason: 'All execution modules verified, evidence complete, rollback plan bound', review_mode: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES.includes('ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES.includes('ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK')); console.log('  PASS: B_ROLLBACK'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES.includes('ACTIVATION_EXECUTION_FINAL_REVIEW_DENIED')); console.log('  PASS: DENIED'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES.includes('ACTIVATION_EXECUTION_FINAL_REVIEW_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('activation_execution_final_review_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.activation_execution_rollback_binder_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK')); console.log('  PASS: rollback not ready'); },
  () => { const i = validInput(); delete i.activation_execution_rollback_binder_id; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK')); console.log('  PASS: missing rollback id'); },
  () => { const i = validInput(); i.authority_decision = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK')); console.log('  PASS: bad decision'); },
  () => { const i = validInput(); delete i.authority_id; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK')); console.log('  PASS: no auth id'); },
  () => { const i = validInput(); delete i.review_reason; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK')); console.log('  PASS: no reason'); },
  () => { const i = validInput(); i.review_mode = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK')); console.log('  PASS: bad mode'); },
  () => { const i = validInput(); i.authority_decision = 'denied'; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_DENIED')); console.log('  PASS: denied'); },
  () => { const i = validInput(); i.authority_decision = 'blocked'; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_DENIED')); console.log('  PASS: blocked'); },
  () => { const i = validInput(); i.required_review_controls = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_DENIED')); assert.ok(r.errors[0].includes('missing required review controls')); console.log('  PASS: missing controls'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_final_authority_review_ready, true); assert.equal(r.authority_decision, 'approved'); assert.equal(r.authority_id, 'auth-v333'); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.final_review_hash); assert.equal(r.final_review_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.final_review_hash, r2.final_review_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_authority_granted, false); assert.equal(r.product_activation_execution_allowed, false); console.log('  PASS: authority not granted'); },
  () => { const r = build(validInput()); assert.equal(r.production_touch_allowed, false); assert.equal(r.activation_execution_dry_run_completed, false); console.log('  PASS: touch/dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_ready, false); assert.equal(r.activation_execution_approved, false); assert.equal(r.activation_execution_evidence_published, false); assert.equal(r.activation_rollback_bound, false); console.log('  PASS: ready/approved/evid/rollback blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_phase_passed, false); console.log('  PASS: phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ACTIVATION_EXECUTION_FINAL_REVIEW_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('final_review_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.activation_execution_authority_granted, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== activation-execution-final-authority-review tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked rollback',10,16],['denied',16,19],['ready',19,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();