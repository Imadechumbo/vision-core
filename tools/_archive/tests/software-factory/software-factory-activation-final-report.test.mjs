import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ACTIVATION_FINAL_REPORT_STATUSES, build, validate, render } from '../../software-factory/software-factory-activation-final-report.mjs';

function validInput() {
  const h = (c) => c.repeat(64);
  return {
    activation_final_report_id: 'afr-v322', activation_evidence_receipt_id: 'aer-v321', activation_evidence_receipt_ready: true,
    report_sections: [
      { section_id: 's1', section_type: 'executive_summary', report_mode: 'contract-only', section_hash: h('a') },
      { section_id: 's2', section_type: 'activation_scope', report_mode: 'metadata-only', section_hash: h('0') },
      { section_id: 's3', section_type: 'production_readiness', report_mode: 'dry-run', section_hash: h('b') },
      { section_id: 's4', section_type: 'saas_enablement', report_mode: 'planning', section_hash: h('c') },
      { section_id: 's5', section_type: 'billing_blockers', report_mode: 'contract-only', section_hash: h('d') },
      { section_id: 's6', section_type: 'deploy_blockers', report_mode: 'metadata-only', section_hash: h('e') },
      { section_id: 's7', section_type: 'release_blockers', report_mode: 'dry-run', section_hash: h('f') },
      { section_id: 's8', section_type: 'stable_blockers', report_mode: 'planning', section_hash: h('a') },
      { section_id: 's9', section_type: 'evidence_receipt', report_mode: 'contract-only', section_hash: h('0') },
      { section_id: 's10', section_type: 'risk_summary', report_mode: 'metadata-only', section_hash: h('b') },
      { section_id: 's11', section_type: 'final_blockers', report_mode: 'dry-run', section_hash: h('c') },
    ],
    report_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ACTIVATION_FINAL_REPORT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_FINAL_REPORT_STATUSES.includes('ACTIVATION_FINAL_REPORT_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_FINAL_REPORT_STATUSES.includes('ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT')); console.log('  PASS: B_RECEIPT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_FINAL_REPORT_STATUSES.includes('ACTIVATION_FINAL_REPORT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_FINAL_REPORT_STATUSES.includes('ACTIVATION_FINAL_REPORT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ACTIVATION_FINAL_REPORT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('activation_final_report_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.activation_evidence_receipt_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT')); console.log('  PASS: receipt not ready'); },
  () => { const i = validInput(); delete i.activation_evidence_receipt_id; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT')); console.log('  PASS: missing receipt id'); },
  () => { const i = validInput(); i.report_sections = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT')); console.log('  PASS: empty sections'); },
  () => { const i = validInput(); i.report_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT')); console.log('  PASS: bad level'); },
  () => { const i = validInput(); i.report_sections = [{ section_id: 'x', section_type: 'executive_summary', report_mode: 'contract-only', section_hash: 'a'.repeat(64) }]; i.required_section_types = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_FINAL_REPORT_FAIL')); assert.ok(r.errors[0].includes('missing required section types')); console.log('  PASS: missing types'); },
  () => { const i = validInput(); i.report_sections = [{ section_id: 'x', section_type: 'invalid', report_mode: 'contract-only', section_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_FINAL_REPORT_FAIL')); console.log('  PASS: bad section type'); },
  () => { const i = validInput(); i.report_sections = [{ section_id: 'x', section_type: 'executive_summary', report_mode: 'invalid', section_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_FINAL_REPORT_FAIL')); console.log('  PASS: bad report mode'); },
  () => { const i = validInput(); i.report_sections = [{ section_id: 'x', section_type: 'executive_summary', report_mode: 'contract-only', section_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_FINAL_REPORT_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.report_sections = [{ section_type: 'executive_summary', report_mode: 'contract-only', section_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_FINAL_REPORT_FAIL')); console.log('  PASS: missing section_id'); },
  () => { const r = build(validInput()); assert.equal(r.activation_final_report_ready, true); assert.equal(r.report_sections_count, 11); assert.equal(r.required_section_types_count, 11); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.activation_final_report_hash); assert.equal(r.activation_final_report_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.activation_final_report_hash, r2.activation_final_report_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.activation_report_published, false); assert.equal(r.product_activation_allowed, false); console.log('  PASS: report not published'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enablement_allowed, false); assert.equal(r.activation_dry_run_completed, false); console.log('  PASS: activation blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_risk_accepted, false); assert.equal(r.activation_authority_granted, false); assert.equal(r.product_activation_phase_passed, false); console.log('  PASS: auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_policy_enforced, false); assert.equal(r.activation_evidence_published, false); console.log('  PASS: policy/evidence blocked'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ACTIVATION_FINAL_REPORT_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('activation_final_report_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.product_activation_allowed, false); assert.equal(r.activation_report_published, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== activation-final-report tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked receipt',10,14],['fail',14,19],['ready',19,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();