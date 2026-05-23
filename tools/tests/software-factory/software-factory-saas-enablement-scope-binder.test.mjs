import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_SAAS_ENABLEMENT_SCOPE_BINDER_STATUSES, build, validate, render } from '../../software-factory/software-factory-saas-enablement-scope-binder.mjs';

function validInput() {
  return {
    saas_enablement_scope_binder_id: 'sesb-v316', product_activation_command_id: 'pac-v315', product_activation_command_ready: true,
    scope_items: [
      { scope_id: 'fe-scope', scope_type: 'frontend', scope_mode: 'metadata-only', scope_hash: 'a'.repeat(64) },
      { scope_id: 'be-scope', scope_type: 'backend', scope_mode: 'metadata-only', scope_hash: '0'.repeat(64) },
      { scope_id: 'gc-scope', scope_type: 'go_core', scope_mode: 'metadata-only', scope_hash: 'b'.repeat(64) },
      { scope_id: 'bill-scope', scope_type: 'billing', scope_mode: 'dry-run', scope_hash: 'c'.repeat(64) },
      { scope_id: 'tenant-scope', scope_type: 'tenant', scope_mode: 'planning', scope_hash: 'd'.repeat(64) },
      { scope_id: 'auth-scope', scope_type: 'auth', scope_mode: 'out-of-scope', scope_hash: 'e'.repeat(64) },
      { scope_id: 'db-scope', scope_type: 'database', scope_mode: 'metadata-only', scope_hash: 'f'.repeat(64) },
      { scope_id: 'deploy-scope', scope_type: 'deployment', scope_mode: 'planning', scope_hash: 'a'.repeat(64) },
      { scope_id: 'release-scope', scope_type: 'release', scope_mode: 'planning', scope_hash: '0'.repeat(64) },
      { scope_id: 'stable-scope', scope_type: 'stable', scope_mode: 'planning', scope_hash: 'b'.repeat(64) },
      { scope_id: 'audit-scope', scope_type: 'audit', scope_mode: 'metadata-only', scope_hash: 'c'.repeat(64) },
      { scope_id: 'rollback-scope', scope_type: 'rollback', scope_mode: 'planning', scope_hash: 'd'.repeat(64) },
    ],
    scope_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SAAS_ENABLEMENT_SCOPE_BINDER_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_ENABLEMENT_SCOPE_BINDER_STATUSES.includes('SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_ENABLEMENT_SCOPE_BINDER_STATUSES.includes('SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND')); console.log('  PASS: BLOCKED_COMMAND'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_ENABLEMENT_SCOPE_BINDER_STATUSES.includes('SAAS_ENABLEMENT_SCOPE_BINDER_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_ENABLEMENT_SCOPE_BINDER_STATUSES.includes('SAAS_ENABLEMENT_SCOPE_BINDER_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('saas_enablement_scope_binder_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.product_activation_command_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND')); console.log('  PASS: command not ready'); },
  () => { const i = validInput(); delete i.product_activation_command_id; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND')); console.log('  PASS: missing command id'); },
  () => { const i = validInput(); i.scope_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.scope_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.scope_items = [{ scope_id: 'x', scope_type: 'billing', scope_mode: 'dry-run', scope_hash: 'a'.repeat(64) }]; i.required_scope_controls = []; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_FAIL')); assert.ok(r.errors[0].includes('missing required scope controls')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.scope_items = [{ scope_id: 'x', scope_type: 'invalid', scope_mode: 'dry-run', scope_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_FAIL')); console.log('  PASS: invalid scope_type'); },
  () => { const i = validInput(); i.scope_items = [{ scope_id: 'x', scope_type: 'billing', scope_mode: 'invalid', scope_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_FAIL')); console.log('  PASS: invalid scope_mode'); },
  () => { const i = validInput(); i.scope_items = [{ scope_id: 'x', scope_type: 'billing', scope_mode: 'dry-run', scope_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.scope_items = [{ scope_type: 'billing', scope_mode: 'dry-run', scope_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_FAIL')); console.log('  PASS: missing scope_id in item'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enablement_scope_binder_ready, true); assert.equal(r.scope_items_count, 12); assert.equal(r.required_scope_controls_count, 11); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.saas_enablement_scope_hash); assert.equal(r.saas_enablement_scope_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.saas_enablement_scope_hash, r2.saas_enablement_scope_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enablement_allowed, false); console.log('  PASS: activation blocked'); },
  () => { const r = build(validInput()); assert.equal(r.production_readiness_confirmed, false); assert.equal(r.activation_dry_run_completed, false); console.log('  PASS: readiness blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_risk_accepted, false); assert.equal(r.activation_authority_granted, false); assert.equal(r.product_activation_phase_passed, false); console.log('  PASS: auth blocked'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.tenant_isolation_enforced, false); console.log('  PASS: SaaS blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('SAAS_ENABLEMENT_SCOPE_BINDER_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('saas_enablement_scope_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.saas_enablement_allowed, false); assert.equal(r.product_activation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-saas-enablement-scope-binder tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked command ---',10,14],['--- fail ---',14,19],['--- ready ---',19,27],['--- validate ---',27,29],['--- render ---',29,33],['--- invariants ---',33,34]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();