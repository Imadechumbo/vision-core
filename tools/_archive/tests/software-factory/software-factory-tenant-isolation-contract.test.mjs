import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_TENANT_ISOLATION_CONTRACT_STATUSES, build, validate, render } from '../../software-factory/software-factory-tenant-isolation-contract.mjs';

function validBoundary(id, scope, mode, hc) { return { boundary_id: id, tenant_scope: scope, isolation_mode: mode, boundary_hash: hc.repeat(64) }; }
function validInput() {
  return {
    tenant_isolation_contract_id: 'tic-v306', saas_platform_contract_id: 'spc-v305', saas_platform_contract_ready: true,
    tenant_boundaries: [validBoundary('b1','organization','no-cross-write','a'), validBoundary('b2','project','read-only','b'), validBoundary('b3','workspace','metadata-only','c')],
    required_isolation_controls: ['no-cross-tenant-write','no-cross-tenant-secret-access','no-cross-tenant-billing','no-cross-tenant-production-touch','no-cross-tenant-runtime-execution','audit-required','evidence-required','human-approval-required'],
    isolation_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_TENANT_ISOLATION_CONTRACT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_TENANT_ISOLATION_CONTRACT_STATUSES.includes('TENANT_ISOLATION_CONTRACT_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_TENANT_ISOLATION_CONTRACT_STATUSES.includes('TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM')); console.log('  PASS: BLOCKED_PLATFORM'); },
  () => { assert.ok(SOFTWARE_FACTORY_TENANT_ISOLATION_CONTRACT_STATUSES.includes('TENANT_ISOLATION_CONTRACT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_TENANT_ISOLATION_CONTRACT_STATUSES.includes('TENANT_ISOLATION_CONTRACT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('TENANT_ISOLATION_CONTRACT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('tenant_isolation_contract_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.saas_platform_contract_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM')); console.log('  PASS: platform not ready'); },
  () => { const i = validInput(); delete i.saas_platform_contract_id; const r = build(i); assert.ok(r.errors[0].startsWith('TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM')); console.log('  PASS: missing spc id'); },
  () => { const i = validInput(); i.isolation_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.tenant_boundaries = []; const r = build(i); assert.ok(r.errors[0].startsWith('TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM')); console.log('  PASS: empty boundaries'); },
  () => { const i = validInput(); i.tenant_boundaries = [{ tenant_scope: 'org', isolation_mode: 'no-cross-write', boundary_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('TENANT_ISOLATION_CONTRACT_FAIL')); assert.ok(r.errors[0].includes('boundary_id')); console.log('  PASS: missing boundary_id'); },
  () => { const i = validInput(); i.tenant_boundaries = [{ boundary_id: 'b1', tenant_scope: 'invalid', isolation_mode: 'no-cross-write', boundary_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('TENANT_ISOLATION_CONTRACT_FAIL')); assert.ok(r.errors[0].includes('tenant_scope')); console.log('  PASS: invalid scope'); },
  () => { const i = validInput(); i.tenant_boundaries = [{ boundary_id: 'b1', tenant_scope: 'organization', isolation_mode: 'write', boundary_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('TENANT_ISOLATION_CONTRACT_FAIL')); assert.ok(r.errors[0].includes('isolation_mode')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); i.tenant_boundaries = [{ boundary_id: 'b1', tenant_scope: 'organization', isolation_mode: 'no-cross-write', boundary_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('TENANT_ISOLATION_CONTRACT_FAIL')); assert.ok(r.errors[0].includes('boundary_hash')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.required_isolation_controls = ['no-cross-tenant-write']; const r = build(i); assert.ok(r.errors[0].startsWith('TENANT_ISOLATION_CONTRACT_FAIL')); assert.ok(r.errors[0].includes('missing required isolation controls')); console.log('  PASS: missing controls'); },
  () => { const r = build(validInput()); assert.equal(r.tenant_isolation_contract_ready, true); assert.equal(r.tenant_boundaries_count, 3); assert.equal(r.required_isolation_controls_count, 8); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.tenant_isolation_hash); assert.equal(r.tenant_isolation_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.tenant_isolation_hash, r2.tenant_isolation_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.tenant_isolation_enforced, false); assert.equal(r.saas_enabled, false); console.log('  PASS: not enforced'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('TENANT_ISOLATION_CONTRACT_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('tenant_isolation_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.tenant_isolation_enforced, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-tenant-isolation-contract tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked platform ---',10,14],['--- fail ---',14,19],['--- ready ---',19,23],['--- validate ---',23,25],['--- render ---',25,29],['--- invariants ---',29,31]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();