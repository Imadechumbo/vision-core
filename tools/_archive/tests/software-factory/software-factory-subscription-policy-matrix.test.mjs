import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_SUBSCRIPTION_POLICY_MATRIX_STATUSES, build, validate, render } from '../../software-factory/software-factory-subscription-policy-matrix.mjs';

function validPolicy(id, plan, limit, hc) { return { policy_id: id, plan_type: plan, limit_type: limit, policy_hash: hc.repeat(64) }; }
function validInput() {
  return {
    subscription_policy_matrix_id: 'spm-v307', tenant_isolation_contract_id: 'tic-v306', tenant_isolation_contract_ready: true,
    subscription_policies: [
      validPolicy('p1','free','usage_limit','a'), validPolicy('p2','pro','seat_limit','b'),
      validPolicy('p3','business','project_limit','c'), validPolicy('p4','enterprise','runtime_limit','d'),
      validPolicy('p5','starter','api_limit','e'), validPolicy('p6','pro','billing_limit','f'),
      validPolicy('p7','enterprise','support_limit','0'),
    ],
    required_policy_types: ['usage_limit','seat_limit','project_limit','runtime_limit','api_limit','billing_limit','support_limit'],
    matrix_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SUBSCRIPTION_POLICY_MATRIX_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUBSCRIPTION_POLICY_MATRIX_STATUSES.includes('SUBSCRIPTION_POLICY_MATRIX_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUBSCRIPTION_POLICY_MATRIX_STATUSES.includes('SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT')); console.log('  PASS: BLOCKED_TENANT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUBSCRIPTION_POLICY_MATRIX_STATUSES.includes('SUBSCRIPTION_POLICY_MATRIX_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUBSCRIPTION_POLICY_MATRIX_STATUSES.includes('SUBSCRIPTION_POLICY_MATRIX_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('SUBSCRIPTION_POLICY_MATRIX_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('subscription_policy_matrix_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.tenant_isolation_contract_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT')); console.log('  PASS: tenant not ready'); },
  () => { const i = validInput(); delete i.tenant_isolation_contract_id; const r = build(i); assert.ok(r.errors[0].startsWith('SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT')); console.log('  PASS: missing tic id'); },
  () => { const i = validInput(); i.matrix_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.subscription_policies = []; const r = build(i); assert.ok(r.errors[0].startsWith('SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT')); console.log('  PASS: empty policies'); },
  () => { const i = validInput(); i.subscription_policies = [{ plan_type: 'free', limit_type: 'usage_limit', policy_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SUBSCRIPTION_POLICY_MATRIX_FAIL')); assert.ok(r.errors[0].includes('policy_id')); console.log('  PASS: missing policy_id'); },
  () => { const i = validInput(); i.subscription_policies = [{ policy_id: 'p1', plan_type: 'invalid', limit_type: 'usage_limit', policy_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SUBSCRIPTION_POLICY_MATRIX_FAIL')); assert.ok(r.errors[0].includes('plan_type')); console.log('  PASS: invalid plan'); },
  () => { const i = validInput(); i.subscription_policies = [{ policy_id: 'p1', plan_type: 'free', limit_type: 'invalid', policy_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SUBSCRIPTION_POLICY_MATRIX_FAIL')); assert.ok(r.errors[0].includes('limit_type')); console.log('  PASS: invalid limit'); },
  () => { const i = validInput(); i.subscription_policies = [{ policy_id: 'p1', plan_type: 'free', limit_type: 'usage_limit', policy_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('SUBSCRIPTION_POLICY_MATRIX_FAIL')); assert.ok(r.errors[0].includes('policy_hash')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.required_policy_types = ['usage_limit']; const r = build(i); assert.ok(r.errors[0].startsWith('SUBSCRIPTION_POLICY_MATRIX_FAIL')); assert.ok(r.errors[0].includes('missing required policy types')); console.log('  PASS: missing required'); },
  () => { const r = build(validInput()); assert.equal(r.subscription_policy_matrix_ready, true); assert.equal(r.subscription_policies_count, 7); assert.equal(r.required_policy_types_count, 7); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.subscription_policy_matrix_hash); assert.equal(r.subscription_policy_matrix_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.subscription_policy_matrix_hash, r2.subscription_policy_matrix_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.subscription_active, false); assert.equal(r.saas_enabled, false); console.log('  PASS: not active'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('SUBSCRIPTION_POLICY_MATRIX_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('subscription_policy_matrix_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.subscription_active, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-subscription-policy-matrix tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked tenant ---',10,14],['--- fail ---',14,19],['--- ready ---',19,23],['--- validate ---',23,25],['--- render ---',25,29],['--- invariants ---',29,31]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();