import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_SAAS_RISK_CLASSIFICATION_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-saas-risk-classification-gate.mjs';

function validRisk(id, type, sev, hc) { return { risk_id: id, risk_type: type, severity: sev, risk_hash: hc.repeat(64) }; }
function validInput() {
  return {
    saas_risk_gate_id: 'srg-v309', billing_dry_run_contract_id: 'bdc-v308', billing_dry_run_contract_ready: true,
    risk_items: [
      validRisk('r1','tenant_leakage','high','a'), validRisk('r2','billing_charge','critical','b'),
      validRisk('r3','provider_connection','high','c'), validRisk('r4','secret_exposure','blocking','d'),
      validRisk('r5','production_touch','critical','e'), validRisk('r6','deploy_risk','medium','f'),
    ],
    required_risk_controls: ['no-tenant-leakage','no-real-charge','no-invoice-create','no-customer-create','no-subscription-create','no-provider-connect','no-webhook-register','no-secret-exposure','no-production-touch','no-deploy','no-release','human-approval-required'],
    risk_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SAAS_RISK_CLASSIFICATION_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_RISK_CLASSIFICATION_GATE_STATUSES.includes('SAAS_RISK_CLASSIFICATION_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_RISK_CLASSIFICATION_GATE_STATUSES.includes('SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING')); console.log('  PASS: BLOCKED_BILLING'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_RISK_CLASSIFICATION_GATE_STATUSES.includes('SAAS_RISK_CLASSIFICATION_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_RISK_CLASSIFICATION_GATE_STATUSES.includes('SAAS_RISK_CLASSIFICATION_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); }, () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); }, () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('SAAS_RISK_CLASSIFICATION_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('saas_risk_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.billing_dry_run_contract_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING')); console.log('  PASS: billing not ready'); },
  () => { const i = validInput(); delete i.billing_dry_run_contract_id; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING')); console.log('  PASS: missing bdc id'); },
  () => { const i = validInput(); i.risk_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.risk_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.risk_items = [{ risk_type: 'tenant_leakage', severity: 'high', risk_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_RISK_CLASSIFICATION_FAIL')); assert.ok(r.errors[0].includes('risk_id')); console.log('  PASS: missing risk_id'); },
  () => { const i = validInput(); i.risk_items = [{ risk_id: 'r1', risk_type: 'invalid', severity: 'high', risk_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_RISK_CLASSIFICATION_FAIL')); assert.ok(r.errors[0].includes('risk_type')); console.log('  PASS: invalid type'); },
  () => { const i = validInput(); i.risk_items = [{ risk_id: 'r1', risk_type: 'tenant_leakage', severity: 'unknown', risk_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_RISK_CLASSIFICATION_FAIL')); assert.ok(r.errors[0].includes('severity')); console.log('  PASS: invalid severity'); },
  () => { const i = validInput(); i.risk_items = [{ risk_id: 'r1', risk_type: 'tenant_leakage', severity: 'high', risk_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_RISK_CLASSIFICATION_FAIL')); assert.ok(r.errors[0].includes('risk_hash')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.required_risk_controls = ['no-tenant-leakage']; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_RISK_CLASSIFICATION_FAIL')); assert.ok(r.errors[0].includes('missing required risk controls')); console.log('  PASS: missing controls'); },
  () => { const r = build(validInput()); assert.equal(r.saas_risk_classification_gate_ready, true); assert.equal(r.risk_items_count, 6); assert.equal(r.required_risk_controls_count, 12); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.saas_risk_classification_hash); assert.equal(r.saas_risk_classification_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.saas_risk_classification_hash, r2.saas_risk_classification_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); console.log('  PASS: SaaS blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('SAAS_RISK_CLASSIFICATION_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('saas_risk_classification_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.enterprise_security_enabled, false); assert.equal(r.dashboard_enabled, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-saas-risk-classification-gate tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked billing ---',10,14],['--- fail ---',14,19],['--- ready ---',19,23],['--- validate ---',23,25],['--- render ---',25,29],['--- invariants ---',29,31]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();