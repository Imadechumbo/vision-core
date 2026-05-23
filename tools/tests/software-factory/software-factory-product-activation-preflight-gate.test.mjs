import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PREFLIGHT_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-product-activation-preflight-gate.mjs';

function validInput() {
  const h = (c) => c.repeat(64);
  return {
    activation_preflight_gate_id: 'apg-v326', activation_execution_command_id: 'aecc-v325', product_activation_execution_command_ready: true,
    preflight_items: [
      { item_id: 'i1', item_type: 'product_activation_gate', item_mode: 'contract-only', item_hash: h('a') },
      { item_id: 'i2', item_type: 'saas_enablement_blocker', item_mode: 'metadata-only', item_hash: h('0') },
      { item_id: 'i3', item_type: 'production_touch_blocker', item_mode: 'dry-run', item_hash: h('b') },
      { item_id: 'i4', item_type: 'deploy_blocker', item_mode: 'planning', item_hash: h('c') },
      { item_id: 'i5', item_type: 'release_blocker', item_mode: 'contract-only', item_hash: h('d') },
      { item_id: 'i6', item_type: 'stable_blocker', item_mode: 'metadata-only', item_hash: h('e') },
      { item_id: 'i7', item_type: 'billing_blocker', item_mode: 'dry-run', item_hash: h('f') },
      { item_id: 'i8', item_type: 'tenant_blocker', item_mode: 'planning', item_hash: h('a') },
      { item_id: 'i9', item_type: 'rollback_requirement', item_mode: 'contract-only', item_hash: h('0') },
      { item_id: 'i10', item_type: 'evidence_requirement', item_mode: 'metadata-only', item_hash: h('b') },
      { item_id: 'i11', item_type: 'audit_requirement', item_mode: 'dry-run', item_hash: h('c') },
      { item_id: 'i12', item_type: 'pass_gold_requirement', item_mode: 'planning', item_hash: h('d') },
    ],
    preflight_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PREFLIGHT_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PREFLIGHT_GATE_STATUSES.includes('PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PREFLIGHT_GATE_STATUSES.includes('PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND')); console.log('  PASS: B_COMMAND'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PREFLIGHT_GATE_STATUSES.includes('PRODUCT_ACTIVATION_PREFLIGHT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PREFLIGHT_GATE_STATUSES.includes('PRODUCT_ACTIVATION_PREFLIGHT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('activation_preflight_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.product_activation_execution_command_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND')); console.log('  PASS: command not ready'); },
  () => { const i = validInput(); delete i.activation_execution_command_id; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND')); console.log('  PASS: missing command id'); },
  () => { const i = validInput(); i.preflight_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.preflight_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND')); console.log('  PASS: bad level'); },
  () => { const i = validInput(); i.preflight_items = [{ item_id: 'x', item_type: 'product_activation_gate', item_mode: 'contract-only', item_hash: 'a'.repeat(64) }]; i.required_preflight_controls = []; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PREFLIGHT_FAIL')); assert.ok(r.errors[0].includes('missing required preflight controls')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.preflight_items = [{ item_id: 'x', item_type: 'invalid', item_mode: 'contract-only', item_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PREFLIGHT_FAIL')); console.log('  PASS: bad type'); },
  () => { const i = validInput(); i.preflight_items = [{ item_id: 'x', item_type: 'product_activation_gate', item_mode: 'invalid', item_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PREFLIGHT_FAIL')); console.log('  PASS: bad mode'); },
  () => { const i = validInput(); i.preflight_items = [{ item_id: 'x', item_type: 'product_activation_gate', item_mode: 'contract-only', item_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PREFLIGHT_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.preflight_items = [{ item_type: 'product_activation_gate', item_mode: 'contract-only', item_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCT_ACTIVATION_PREFLIGHT_FAIL')); console.log('  PASS: missing item_id'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_preflight_gate_ready, true); assert.equal(r.preflight_items_count, 12); assert.equal(r.required_preflight_controls_count, 13); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.activation_preflight_hash); assert.equal(r.activation_preflight_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.activation_preflight_hash, r2.activation_preflight_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_ready, false); assert.equal(r.product_activation_execution_allowed, false); console.log('  PASS: execution not ready'); },
  () => { const r = build(validInput()); assert.equal(r.production_touch_allowed, false); assert.equal(r.activation_execution_dry_run_completed, false); console.log('  PASS: prod touch/dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_approved, false); assert.equal(r.activation_execution_evidence_published, false); assert.equal(r.activation_rollback_bound, false); console.log('  PASS: approval/evid/rollback blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_authority_granted, false); assert.equal(r.activation_execution_phase_passed, false); console.log('  PASS: auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('PRODUCT_ACTIVATION_PREFLIGHT_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('activation_preflight_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.production_touch_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== product-activation-preflight-gate tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked command',10,14],['fail',14,19],['ready',19,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();