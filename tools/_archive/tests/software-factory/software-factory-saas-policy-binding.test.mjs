import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_SAAS_POLICY_BINDING_STATUSES, build, validate, render } from '../../software-factory/software-factory-saas-policy-binding.mjs';

function vB(id, pol, risk, mode, hc) { return { binding_id: id, policy_id: pol, risk_id: risk, binding_mode: mode, binding_hash: hc.repeat(64) }; }
function vI() {
  return {
    saas_policy_binding_id: 'spb-v310', saas_risk_gate_id: 'srg-v309', saas_risk_classification_gate_ready: true,
    policy_bindings: [vB('b1','pol-1','r1','dry-run','a'), vB('b2','pol-2','r2','dry-run','b')],
    required_policy_controls: ['no-real-charge','no-customer-create','no-invoice-create','no-subscription-create','no-webhook-register','no-provider-connect','no-secret-access','no-production-touch','no-deploy','no-release','human-approval-required','audit-required','evidence-required'],
    binding_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SAAS_POLICY_BINDING_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_POLICY_BINDING_STATUSES.includes('SAAS_POLICY_BINDING_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_POLICY_BINDING_STATUSES.includes('SAAS_POLICY_BINDING_BLOCKED_RISK')); console.log('  PASS: B_RISK'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_POLICY_BINDING_STATUSES.includes('SAAS_POLICY_BINDING_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_POLICY_BINDING_STATUSES.includes('SAAS_POLICY_BINDING_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('SAAS_POLICY_BINDING_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('saas_policy_binding_id')); console.log('  PASS: {}'); },
  () => { const i = vI(); i.saas_risk_classification_gate_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_POLICY_BINDING_BLOCKED_RISK')); console.log('  PASS: risk not ready'); },
  () => { const i = vI(); delete i.saas_risk_gate_id; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_POLICY_BINDING_BLOCKED_RISK')); console.log('  PASS: missing srg'); },
  () => { const i = vI(); i.binding_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_POLICY_BINDING_BLOCKED_RISK')); console.log('  PASS: bad level'); },
  () => { const i = vI(); i.policy_bindings = []; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_POLICY_BINDING_BLOCKED_RISK')); console.log('  PASS: empty'); },
  () => { const i = vI(); i.policy_bindings = [{ policy_id: 'p1', risk_id: 'r1', binding_mode: 'dry-run', binding_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_POLICY_BINDING_FAIL')); assert.ok(r.errors[0].includes('binding_id')); console.log('  PASS: no bid'); },
  () => { const i = vI(); i.policy_bindings = [{ binding_id: 'b1', policy_id: 'p1', binding_mode: 'dry-run', binding_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_POLICY_BINDING_FAIL')); assert.ok(r.errors[0].includes('risk_id')); console.log('  PASS: no rid'); },
  () => { const i = vI(); i.policy_bindings = [{ binding_id: 'b1', policy_id: 'p1', risk_id: 'r1', binding_mode: 'write', binding_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_POLICY_BINDING_FAIL')); assert.ok(r.errors[0].includes('binding_mode')); console.log('  PASS: bad mode'); },
  () => { const i = vI(); i.policy_bindings = [{ binding_id: 'b1', policy_id: 'p1', risk_id: 'r1', binding_mode: 'dry-run', binding_hash: 'sh' }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_POLICY_BINDING_FAIL')); assert.ok(r.errors[0].includes('binding_hash')); console.log('  PASS: short hash'); },
  () => { const i = vI(); i.required_policy_controls = ['no-real-charge']; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_POLICY_BINDING_FAIL')); assert.ok(r.errors[0].includes('missing required policy controls')); console.log('  PASS: missing controls'); },
  () => { const r = build(vI()); assert.equal(r.saas_policy_binding_ready, true); assert.equal(r.policy_bindings_count, 2); assert.equal(r.required_policy_controls_count, 13); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(vI()); assert.ok(r.saas_policy_binding_hash); assert.equal(r.saas_policy_binding_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(vI()); const r2 = build(vI()); assert.equal(r1.saas_policy_binding_hash, r2.saas_policy_binding_hash); console.log('  PASS: det'); },
  () => { const r = build(vI()); assert.equal(r.saas_policy_enforced, false); assert.equal(r.saas_enabled, false); console.log('  PASS: blocked'); },
  () => { const r = build(vI()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(vI())); assert.equal(typeof r, 'string'); assert.ok(r.includes('SAAS_POLICY_BINDING_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(vI())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: nullrend'); },
  () => { const r = render(build(vI())); assert.ok(r.includes('saas_policy_binding_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(vI()); ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: invariants'); },
  () => { const r = build(null); assert.equal(r.saas_policy_enforced, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); console.log('  PASS: blocked inv'); },
];

function run() {
  console.log('\n=== saas-policy-binding tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked risk',10,14],['fail',14,19],['ready',19,23],['validate',23,25],['render',25,29],['invariants',29,31]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log('--- '+l+' ---'); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();