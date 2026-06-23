import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PHASE_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-product-activation-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'papg-v324', activation_final_review_id: 'afar-v323', activation_final_authority_review_ready: true,
    ids: {
      product_activation_command_contract: 'pacc-v315',
      saas_enablement_scope_binder: 'sesb-v316',
      production_readiness_evidence_binder: 'preb-v317',
      activation_dry_run_controller: 'adrc-v318',
      activation_risk_gate: 'arg-v319',
      activation_policy_binding: 'apb-v320',
      activation_evidence_receipt: 'aer-v321',
      activation_final_report: 'afr-v322',
      activation_final_authority_review: 'afar-v323',
    },
    phase_summary: 'All 9 modules verified for product activation authority',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PHASE_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PHASE_GATE_STATUSES.includes('PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PHASE_GATE_STATUSES.includes('PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: B_REVIEW'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PHASE_GATE_STATUSES.includes('PRODUCT_ACTIVATION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: INCOMPLETE'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PHASE_GATE_STATUSES.includes('PRODUCT_ACTIVATION_PHASE_GATE_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('phase_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.activation_final_authority_review_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: review not ready'); },
  () => { const i = validInput(); delete i.activation_final_review_id; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing review id'); },
  () => { const i = validInput(); delete i.ids; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing ids'); },
  () => { const i = validInput(); delete i.phase_summary; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing summary'); },
  () => { const i = validInput(); delete i.ids.product_activation_command_contract; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: missing module -> INCOMPLETE'); },
  () => { const i = validInput(); i.ids = {}; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: empty ids -> INCOMPLETE'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_phase_gate_ready, true); assert.equal(r.all_modules_present, true); assert.equal(r.modules_verified.length, 9); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.equal(r.phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.ok(r.phase_gate_hash); assert.equal(r.phase_gate_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.phase_gate_hash, r2.phase_gate_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enablement_allowed, false); console.log('  PASS: activation not allowed'); },
  () => { const r = build(validInput()); assert.equal(r.production_readiness_confirmed, false); assert.equal(r.activation_dry_run_completed, false); console.log('  PASS: readiness blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_risk_accepted, false); assert.equal(r.activation_authority_granted, false); assert.equal(r.product_activation_phase_passed, false); console.log('  PASS: auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_policy_enforced, false); assert.equal(r.activation_report_published, false); assert.equal(r.activation_evidence_published, false); console.log('  PASS: policy/report evidence blocked'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: SaaS/prod blocked'); },
  () => { const r = build(validInput()); assert.equal(r.final_message, 'V315-V324 product activation authority complete. Product activation, SaaS enablement, production touch, deploy, release, billing, and stable promotion remain blocked until explicit V325 command.'); console.log('  PASS: final message'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('PRODUCT_ACTIVATION_PHASE_GATE_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('phase_gate_hash')); console.log('  PASS: hashren'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('V315')); assert.ok(r.includes('V324')); console.log('  PASS: modules in render'); },
  () => { const r = build(validInput()); ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.product_activation_allowed, false); assert.equal(r.product_activation_phase_passed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== product-activation-phase-gate tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked review',10,14],['incomplete',14,16],['ready',16,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();