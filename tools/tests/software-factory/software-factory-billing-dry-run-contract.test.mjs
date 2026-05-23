import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_BILLING_DRY_RUN_CONTRACT_STATUSES, build, validate, render } from '../../software-factory/software-factory-billing-dry-run-contract.mjs';

function validTarget(id, prov, mode, hc) { return { target_id: id, provider_type: prov, billing_mode: mode, target_hash: hc.repeat(64) }; }
function validInput() {
  return {
    billing_dry_run_contract_id: 'bdc-v308', subscription_policy_matrix_id: 'spm-v307', subscription_policy_matrix_ready: true,
    billing_targets: [validTarget('t1','stripe','dry-run','a'), validTarget('t2','mercadopago','dry-run','b'), validTarget('t3','paypal','no-charge','c')],
    required_billing_controls: ['no-real-charge','no-customer-create','no-invoice-create','no-subscription-create','no-webhook-register','no-provider-connect','no-secret-read','audit-required','evidence-required'],
    billing_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_BILLING_DRY_RUN_CONTRACT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_BILLING_DRY_RUN_CONTRACT_STATUSES.includes('BILLING_DRY_RUN_CONTRACT_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_BILLING_DRY_RUN_CONTRACT_STATUSES.includes('BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION')); console.log('  PASS: BLOCKED_SUBSCRIPTION'); },
  () => { assert.ok(SOFTWARE_FACTORY_BILLING_DRY_RUN_CONTRACT_STATUSES.includes('BILLING_DRY_RUN_CONTRACT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_BILLING_DRY_RUN_CONTRACT_STATUSES.includes('BILLING_DRY_RUN_CONTRACT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); }, () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); }, () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('BILLING_DRY_RUN_CONTRACT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('billing_dry_run_contract_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.subscription_policy_matrix_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION')); console.log('  PASS: subscription not ready'); },
  () => { const i = validInput(); delete i.subscription_policy_matrix_id; const r = build(i); assert.ok(r.errors[0].startsWith('BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION')); console.log('  PASS: missing spm id'); },
  () => { const i = validInput(); i.billing_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.billing_targets = []; const r = build(i); assert.ok(r.errors[0].startsWith('BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION')); console.log('  PASS: empty targets'); },
  () => { const i = validInput(); i.billing_targets = [{ provider_type: 'stripe', billing_mode: 'dry-run', target_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('BILLING_DRY_RUN_CONTRACT_FAIL')); assert.ok(r.errors[0].includes('target_id')); console.log('  PASS: missing target_id'); },
  () => { const i = validInput(); i.billing_targets = [{ target_id: 't1', provider_type: 'invalid', billing_mode: 'dry-run', target_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('BILLING_DRY_RUN_CONTRACT_FAIL')); assert.ok(r.errors[0].includes('provider_type')); console.log('  PASS: invalid provider'); },
  () => { const i = validInput(); i.billing_targets = [{ target_id: 't1', provider_type: 'stripe', billing_mode: 'charge', target_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('BILLING_DRY_RUN_CONTRACT_FAIL')); assert.ok(r.errors[0].includes('billing_mode')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); i.billing_targets = [{ target_id: 't1', provider_type: 'stripe', billing_mode: 'dry-run', target_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('BILLING_DRY_RUN_CONTRACT_FAIL')); assert.ok(r.errors[0].includes('target_hash')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.required_billing_controls = ['no-real-charge']; const r = build(i); assert.ok(r.errors[0].startsWith('BILLING_DRY_RUN_CONTRACT_FAIL')); assert.ok(r.errors[0].includes('missing required billing controls')); console.log('  PASS: missing controls'); },
  () => { const r = build(validInput()); assert.equal(r.billing_dry_run_contract_ready, true); assert.equal(r.billing_targets_count, 3); assert.equal(r.required_billing_controls_count, 9); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.billing_dry_run_hash); assert.equal(r.billing_dry_run_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.billing_dry_run_hash, r2.billing_dry_run_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.billing_executed, false); assert.equal(r.billing_provider_connected, false); console.log('  PASS: billing blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('BILLING_DRY_RUN_CONTRACT_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('billing_dry_run_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.billing_executed, false); assert.equal(r.billing_provider_connected, false); assert.equal(r.saas_enabled, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-billing-dry-run-contract tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked subscription ---',10,14],['--- fail ---',14,19],['--- ready ---',19,23],['--- validate ---',23,25],['--- render ---',25,29],['--- invariants ---',29,31]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();