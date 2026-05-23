import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_PRODUCT_ACTIVATION_EXECUTION_COMMAND_CONTRACT_STATUSES, build, validate, render } from '../../software-factory/software-factory-product-activation-execution-command-contract.mjs';

function validInput() {
  return {
    activation_execution_command_id: 'aecc-v325', product_activation_phase_gate_id: 'papg-v324', product_activation_phase_gate_ready: true,
    explicit_v325_command: true, requested_by: 'activation-authority-v323', execution_scope: 'controlled-activation-execution-preparation', execution_mode: 'contract-only',
    execution_domains: ['activation_execution','production_touch_boundary','execution_preflight','dry_run_plan','readiness_gate','rollback','evidence','audit','release_blocker','deploy_blocker','stable_blocker'],
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_EXECUTION_COMMAND_CONTRACT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_EXECUTION_COMMAND_CONTRACT_STATUSES.includes('PRODUCT_ACTIVATION_EXECUTION_COMMAND_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_EXECUTION_COMMAND_CONTRACT_STATUSES.includes('PRODUCT_ACTIVATION_EXECUTION_COMMAND_BLOCKED_PHASE')); console.log('  PASS: B_PHASE'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_EXECUTION_COMMAND_CONTRACT_STATUSES.includes('PRODUCT_ACTIVATION_EXECUTION_COMMAND_DENIED')); console.log('  PASS: DENIED'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_EXECUTION_COMMAND_CONTRACT_STATUSES.includes('PRODUCT_ACTIVATION_EXECUTION_COMMAND_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_EXECUTION_COMMAND_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('activation_execution_command_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.product_activation_phase_gate_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_EXECUTION_COMMAND_BLOCKED_PHASE')); console.log('  PASS: phase not ready'); },
  () => { const i = validInput(); delete i.product_activation_phase_gate_id; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_EXECUTION_COMMAND_BLOCKED_PHASE')); console.log('  PASS: missing phase gate id'); },
  () => { const i = validInput(); i.explicit_v325_command = false; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_EXECUTION_COMMAND_DENIED')); console.log('  PASS: no explicit command'); },
  () => { const i = validInput(); delete i.requested_by; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_EXECUTION_COMMAND_DENIED')); console.log('  PASS: missing requested_by'); },
  () => { const i = validInput(); delete i.execution_scope; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_EXECUTION_COMMAND_DENIED')); console.log('  PASS: missing execution_scope'); },
  () => { const i = validInput(); i.execution_mode = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_EXECUTION_COMMAND_DENIED')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); i.execution_domains = []; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_EXECUTION_COMMAND_DENIED')); console.log('  PASS: empty domains'); },
  () => { const i = validInput(); i.execution_domains = ['invalid_domain']; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_EXECUTION_COMMAND_DENIED')); console.log('  PASS: invalid domain'); },
  () => { const i = validInput(); i.execution_domains = ['activation_execution']; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_EXECUTION_COMMAND_DENIED')); assert.ok(r.errors[0].includes('missing required execution_domains')); console.log('  PASS: missing required domains'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_command_ready, true); assert.equal(r.explicit_command_received, true); assert.equal(r.execution_domains_count, 11); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.activation_execution_command_hash); assert.equal(r.activation_execution_command_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.activation_execution_command_hash, r2.activation_execution_command_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.production_touch_allowed, false); console.log('  PASS: execution/prod touch not allowed'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_dry_run_completed, false); assert.equal(r.activation_execution_ready, false); assert.equal(r.activation_execution_approved, false); console.log('  PASS: execution dry-run/ready/approved blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_evidence_published, false); assert.equal(r.activation_rollback_bound, false); assert.equal(r.activation_execution_authority_granted, false); assert.equal(r.activation_execution_phase_passed, false); console.log('  PASS: execution evid/rollback/auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enablement_allowed, false); console.log('  PASS: activation not allowed'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('PRODUCT_ACTIVATION_EXECUTION_COMMAND_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('activation_execution_command_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.production_touch_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== product-activation-execution-command-contract tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked phase',10,12],['denied',12,19],['ready',19,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();