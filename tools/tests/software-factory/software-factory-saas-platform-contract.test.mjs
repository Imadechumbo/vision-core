import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_SAAS_PLATFORM_CONTRACT_STATUSES, build, validate, render } from '../../software-factory/software-factory-saas-platform-contract.mjs';

function validInput() {
  return {
    saas_platform_contract_id: 'spc-v305', enterprise_security_compliance_phase_gate_ready: true,
    enterprise_phase_gate_id: 'escpg-v304', explicit_v305_command: true,
    requested_by: 'saas-admin', platform_scope: 'vision-core-saas-baseline', platform_mode: 'contract-only',
    saas_domains: ['tenancy','billing','subscriptions','access_control','policy','audit','evidence','security','compliance'],
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SAAS_PLATFORM_CONTRACT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_PLATFORM_CONTRACT_STATUSES.includes('SAAS_PLATFORM_CONTRACT_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_PLATFORM_CONTRACT_STATUSES.includes('SAAS_PLATFORM_CONTRACT_BLOCKED_ENTERPRISE')); console.log('  PASS: BLOCKED_ENTERPRISE'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_PLATFORM_CONTRACT_STATUSES.includes('SAAS_PLATFORM_CONTRACT_DENIED')); console.log('  PASS: DENIED'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_PLATFORM_CONTRACT_STATUSES.includes('SAAS_PLATFORM_CONTRACT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('SAAS_PLATFORM_CONTRACT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('saas_platform_contract_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.enterprise_security_compliance_phase_gate_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_PLATFORM_CONTRACT_BLOCKED_ENTERPRISE')); console.log('  PASS: enterprise not ready'); },
  () => { const i = validInput(); delete i.enterprise_phase_gate_id; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_PLATFORM_CONTRACT_BLOCKED_ENTERPRISE')); console.log('  PASS: missing enterprise gate id'); },
  () => { const i = validInput(); i.explicit_v305_command = false; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_PLATFORM_CONTRACT_DENIED')); console.log('  PASS: no explicit command'); },
  () => { const i = validInput(); delete i.requested_by; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_PLATFORM_CONTRACT_DENIED')); console.log('  PASS: missing requested_by'); },
  () => { const i = validInput(); delete i.platform_scope; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_PLATFORM_CONTRACT_DENIED')); console.log('  PASS: missing scope'); },
  () => { const i = validInput(); i.platform_mode = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_PLATFORM_CONTRACT_DENIED')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); i.saas_domains = []; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_PLATFORM_CONTRACT_DENIED')); console.log('  PASS: empty domains'); },
  () => { const i = validInput(); i.saas_domains = ['tenancy']; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_PLATFORM_CONTRACT_DENIED')); assert.ok(r.errors[0].includes('missing required saas domains')); console.log('  PASS: missing required'); },
  () => { const r = build(validInput()); assert.equal(r.saas_platform_contract_ready, true); assert.equal(r.explicit_command_received, true); assert.equal(r.saas_domains_count, 9); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.saas_platform_contract_hash); assert.equal(r.saas_platform_contract_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.saas_platform_contract_hash, r2.saas_platform_contract_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enabled, false); assert.equal(r.tenant_isolation_enforced, false); console.log('  PASS: SaaS not enabled'); },
  () => { const r = build(validInput()); assert.equal(r.billing_executed, false); assert.equal(r.billing_provider_connected, false); assert.equal(r.customer_created, false); console.log('  PASS: billing blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('SAAS_PLATFORM_CONTRACT_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('saas_platform_contract_hash')); console.log('  PASS: hash in render'); },
  () => {
    const r = build(validInput());
    ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false));
    console.log('  PASS: all invariants');
  },
  () => { const r = build(null); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.enterprise_security_enabled, false); assert.equal(r.dashboard_enabled, false); assert.equal(r.production_touched, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-saas-platform-contract tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked enterprise ---',10,12],['--- denied ---',12,18],['--- ready ---',18,23],['--- validate ---',23,25],['--- render ---',25,29],['--- invariants ---',29,31]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();