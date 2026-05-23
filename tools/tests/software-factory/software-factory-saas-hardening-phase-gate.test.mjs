import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_SAAS_HARDENING_PHASE_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-saas-hardening-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'shpg-v314', saas_final_review_id: 'sfr-v313', saas_final_authority_review_ready: true,
    ids: {
      saas_platform_contract: 'spc-v305', tenant_isolation_contract: 'tic-v306',
      subscription_policy_matrix: 'spm-v307', billing_dry_run_contract: 'bdr-v308',
      saas_risk_classification_gate: 'srcg-v309', saas_policy_binding: 'spb-v310',
      saas_evidence_receipt: 'ser-v311', saas_security_report_contract: 'ssrc-v312',
      saas_final_authority_review: 'sfar-v313',
    },
    phase_summary: 'All V305-V314 SaaS hardening modules verified.',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SAAS_HARDENING_PHASE_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_HARDENING_PHASE_GATE_STATUSES.includes('SAAS_HARDENING_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_HARDENING_PHASE_GATE_STATUSES.includes('SAAS_HARDENING_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: BLOCKED_REVIEW'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_HARDENING_PHASE_GATE_STATUSES.includes('SAAS_HARDENING_PHASE_GATE_INCOMPLETE')); console.log('  PASS: INCOMPLETE'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_HARDENING_PHASE_GATE_STATUSES.includes('SAAS_HARDENING_PHASE_GATE_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('SAAS_HARDENING_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('phase_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.saas_final_authority_review_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_HARDENING_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: review not ready'); },
  () => { const i = validInput(); delete i.saas_final_review_id; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_HARDENING_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing review id'); },
  () => { const i = validInput(); delete i.phase_summary; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_HARDENING_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing summary'); },
  () => { const i = validInput(); i.ids = { saas_platform_contract: 'spc-v305' }; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_HARDENING_PHASE_GATE_INCOMPLETE')); assert.ok(r.errors[0].includes('missing modules')); assert.equal(r.all_modules_present, false); console.log('  PASS: missing modules -> INCOMPLETE'); },
  () => { const i = validInput(); i.ids = {}; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_HARDENING_PHASE_GATE_INCOMPLETE')); console.log('  PASS: empty ids -> INCOMPLETE'); },
  () => { const r = build(validInput()); assert.equal(r.saas_hardening_phase_gate_ready, true); assert.equal(r.all_modules_present, true); assert.equal(r.modules_verified.length, 9); assert.equal(r.phase_passed, false); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.phase_gate_hash); assert.equal(r.phase_gate_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.phase_gate_hash, r2.phase_gate_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enabled, false); assert.equal(r.tenant_isolation_enforced, false); console.log('  PASS: not enabled'); },
  () => { const r = build(validInput()); assert.equal(r.saas_authority_granted, false); assert.equal(r.saas_phase_passed, false); console.log('  PASS: saas_phase_passed false'); },
  () => { const r = build(validInput()); assert.equal(r.billing_executed, false); assert.equal(r.billing_provider_connected, false); assert.equal(r.customer_created, false); assert.equal(r.subscription_active, false); console.log('  PASS: billing/subscription blocked'); },
  () => { const r = build(validInput()); assert.ok(r.final_message.includes('V305-V314')); assert.ok(r.final_message.includes('REGRA ABSOLUTA')); console.log('  PASS: final message correct'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('SAAS_HARDENING_PHASE_GATE_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('phase_gate_hash')); console.log('  PASS: hash in render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA message'); },
  () => { const r = build(validInput()); ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.saas_enabled, false); assert.equal(r.saas_authority_granted, false); assert.equal(r.saas_phase_passed, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-saas-hardening-phase-gate tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked review ---',10,13],['--- incomplete ---',13,15],['--- ready ---',15,22],['--- validate ---',22,24],['--- render ---',24,29],['--- invariants ---',29,31]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();