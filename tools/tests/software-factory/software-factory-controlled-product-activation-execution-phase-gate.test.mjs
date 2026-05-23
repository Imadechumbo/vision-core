import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-controlled-product-activation-execution-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'cpaepg-v334', activation_execution_final_review_id: 'aefar-v333', activation_execution_final_authority_review_ready: true,
    ids: {
      product_activation_execution_command_contract: 'aecc-v325',
      product_activation_preflight_gate: 'apg-v326',
      production_touch_boundary_contract: 'ptbc-v327',
      activation_execution_dry_run_plan: 'aedrp-v328',
      activation_execution_readiness_gate: 'aerg-v329',
      activation_execution_approval_binding: 'aeab-v330',
      activation_execution_evidence_receipt: 'aeer-v331',
      activation_execution_rollback_binder: 'aerb-v332',
      activation_execution_final_authority_review: 'aefar-v333',
    },
    phase_summary: 'All 9 modules verified for controlled product activation execution',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: B_REVIEW'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: INCOMPLETE'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('phase_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.activation_execution_final_authority_review_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: review not ready'); },
  () => { const i = validInput(); delete i.activation_execution_final_review_id; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing review id'); },
  () => { const i = validInput(); delete i.ids; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing ids'); },
  () => { const i = validInput(); delete i.phase_summary; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing summary'); },
  () => { const i = validInput(); delete i.ids.product_activation_execution_command_contract; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: missing module -> INCOMPLETE'); },
  () => { const i = validInput(); i.ids = {}; const r = build(i); assert.ok(r.errors[0].startsWith('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_INCOMPLETE')); console.log('  PASS: empty ids -> INCOMPLETE'); },
  () => { const r = build(validInput()); assert.equal(r.controlled_product_activation_execution_phase_gate_ready, true); assert.equal(r.all_modules_present, true); assert.equal(r.modules_verified.length, 9); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.equal(r.phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.ok(r.phase_gate_hash); assert.equal(r.phase_gate_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.phase_gate_hash, r2.phase_gate_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.production_touch_allowed, false); console.log('  PASS: execution/touch not allowed'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_dry_run_completed, false); assert.equal(r.activation_execution_ready, false); assert.equal(r.activation_execution_approved, false); console.log('  PASS: dry-run/ready/approved blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_evidence_published, false); assert.equal(r.activation_rollback_bound, false); assert.equal(r.activation_execution_authority_granted, false); assert.equal(r.activation_execution_phase_passed, false); console.log('  PASS: evid/rollback/auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); assert.equal(r.final_message, 'V325-V334 controlled product activation execution complete. Real product activation execution, production touch, deploy, release, billing, rollback, and stable promotion remain blocked until explicit V335 command.'); console.log('  PASS: final message'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('phase_gate_hash')); console.log('  PASS: hashren'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('V325')); assert.ok(r.includes('V334')); console.log('  PASS: modules in render'); },
  () => { const r = build(validInput()); ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.activation_execution_phase_passed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== controlled-product-activation-execution-phase-gate tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked review',10,14],['incomplete',14,16],['ready',16,27],['validate',27,28],['render',28,32],['invariants',32,34]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();