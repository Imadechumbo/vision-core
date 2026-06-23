import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ACTIVATION_RISK_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-activation-risk-gate.mjs';

function validInput() {
  const h = (c) => c.repeat(64);
  return {
    activation_risk_gate_id: 'arg-v319', activation_dry_run_controller_id: 'adrc-v318', activation_dry_run_controller_ready: true,
    risk_items: [
      { risk_id: 'r1', risk_type: 'production_touch', severity: 'critical', risk_hash: h('a') },
      { risk_id: 'r2', risk_type: 'deploy_risk', severity: 'high', risk_hash: h('0') },
      { risk_id: 'r3', risk_type: 'release_risk', severity: 'high', risk_hash: h('b') },
      { risk_id: 'r4', risk_type: 'stable_promotion', severity: 'medium', risk_hash: h('c') },
      { risk_id: 'r5', risk_type: 'billing_execution', severity: 'high', risk_hash: h('d') },
      { risk_id: 'r6', risk_type: 'provider_connection', severity: 'medium', risk_hash: h('e') },
      { risk_id: 'r7', risk_type: 'tenant_creation', severity: 'low', risk_hash: h('f') },
      { risk_id: 'r8', risk_type: 'secret_exposure', severity: 'blocking', risk_hash: h('a') },
      { risk_id: 'r9', risk_type: 'policy_bypass', severity: 'high', risk_hash: h('0') },
      { risk_id: 'r10', risk_type: 'rollback_gap', severity: 'medium', risk_hash: h('b') },
      { risk_id: 'r11', risk_type: 'evidence_gap', severity: 'low', risk_hash: h('c') },
      { risk_id: 'r12', risk_type: 'pass_gold_gap', severity: 'info', risk_hash: h('d') },
    ],
    risk_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ACTIVATION_RISK_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_RISK_GATE_STATUSES.includes('ACTIVATION_RISK_GATE_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_RISK_GATE_STATUSES.includes('ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN')); console.log('  PASS: B_DRY_RUN'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_RISK_GATE_STATUSES.includes('ACTIVATION_RISK_GATE_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_RISK_GATE_STATUSES.includes('ACTIVATION_RISK_GATE_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ACTIVATION_RISK_GATE_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('activation_risk_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.activation_dry_run_controller_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN')); console.log('  PASS: dry run not ready'); },
  () => { const i = validInput(); delete i.activation_dry_run_controller_id; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN')); console.log('  PASS: missing dry run id'); },
  () => { const i = validInput(); i.risk_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.risk_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN')); console.log('  PASS: bad level'); },
  () => { const i = validInput(); i.risk_items = [{ risk_id: 'x', risk_type: 'production_touch', severity: 'critical', risk_hash: 'a'.repeat(64) }]; i.required_risk_controls = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_RISK_GATE_FAIL')); assert.ok(r.errors[0].includes('missing required risk controls')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.risk_items = [{ risk_id: 'x', risk_type: 'invalid', severity: 'critical', risk_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_RISK_GATE_FAIL')); console.log('  PASS: bad type'); },
  () => { const i = validInput(); i.risk_items = [{ risk_id: 'x', risk_type: 'production_touch', severity: 'invalid', risk_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_RISK_GATE_FAIL')); console.log('  PASS: bad severity'); },
  () => { const i = validInput(); i.risk_items = [{ risk_id: 'x', risk_type: 'production_touch', severity: 'critical', risk_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_RISK_GATE_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.risk_items = [{ risk_type: 'production_touch', severity: 'critical', risk_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_RISK_GATE_FAIL')); console.log('  PASS: missing risk_id'); },
  () => { const r = build(validInput()); assert.equal(r.activation_risk_gate_ready, true); assert.equal(r.risk_items_count, 12); assert.equal(r.required_risk_controls_count, 13); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.activation_risk_hash); assert.equal(r.activation_risk_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.activation_risk_hash, r2.activation_risk_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.activation_risk_accepted, false); assert.equal(r.product_activation_allowed, false); console.log('  PASS: risk blocked'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enablement_allowed, false); assert.equal(r.production_readiness_confirmed, false); console.log('  PASS: activation blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_dry_run_completed, false); assert.equal(r.activation_authority_granted, false); assert.equal(r.product_activation_phase_passed, false); console.log('  PASS: auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ACTIVATION_RISK_GATE_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('activation_risk_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.activation_risk_accepted, false); assert.equal(r.product_activation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== activation-risk-gate tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked dry-run',10,14],['fail',14,19],['ready',19,26],['validate',26,28],['render',28,32],['invariants',32,34]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();