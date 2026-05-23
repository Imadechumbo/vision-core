import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ACTIVATION_DRY_RUN_STATUSES, build, validate, render } from '../../software-factory/software-factory-activation-dry-run-controller.mjs';

function validInput() {
  const h = (c) => c.repeat(64);
  return {
    activation_dry_run_controller_id: 'adrc-v318', production_readiness_evidence_binder_id: 'preb-v317', production_readiness_evidence_binder_ready: true,
    dry_run_steps: [
      { step_id: 's1', step_type: 'saas_enablement_preview', step_mode: 'dry-run', step_hash: h('a') },
      { step_id: 's2', step_type: 'tenant_preview', step_mode: 'dry-run', step_hash: h('0') },
      { step_id: 's3', step_type: 'billing_preview', step_mode: 'dry-run', step_hash: h('b') },
      { step_id: 's4', step_type: 'deployment_preview', step_mode: 'dry-run', step_hash: h('c') },
      { step_id: 's5', step_type: 'release_preview', step_mode: 'planning', step_hash: h('d') },
      { step_id: 's6', step_type: 'stable_preview', step_mode: 'planning', step_hash: h('e') },
      { step_id: 's7', step_type: 'rollback_preview', step_mode: 'planning', step_hash: h('f') },
      { step_id: 's8', step_type: 'evidence_preview', step_mode: 'metadata-only', step_hash: h('a') },
      { step_id: 's9', step_type: 'audit_preview', step_mode: 'metadata-only', step_hash: h('0') },
      { step_id: 's10', step_type: 'blocker_preview', step_mode: 'metadata-only', step_hash: h('b') },
    ],
    dry_run_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ACTIVATION_DRY_RUN_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_DRY_RUN_STATUSES.includes('ACTIVATION_DRY_RUN_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_DRY_RUN_STATUSES.includes('ACTIVATION_DRY_RUN_BLOCKED_READINESS')); console.log('  PASS: B_READINESS'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_DRY_RUN_STATUSES.includes('ACTIVATION_DRY_RUN_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_DRY_RUN_STATUSES.includes('ACTIVATION_DRY_RUN_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ACTIVATION_DRY_RUN_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('activation_dry_run_controller_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.production_readiness_evidence_binder_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_DRY_RUN_BLOCKED_READINESS')); console.log('  PASS: readiness not ready'); },
  () => { const i = validInput(); delete i.production_readiness_evidence_binder_id; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_DRY_RUN_BLOCKED_READINESS')); console.log('  PASS: missing readiness id'); },
  () => { const i = validInput(); i.dry_run_steps = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_DRY_RUN_BLOCKED_READINESS')); console.log('  PASS: empty steps'); },
  () => { const i = validInput(); i.dry_run_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_DRY_RUN_BLOCKED_READINESS')); console.log('  PASS: bad level'); },
  () => { const i = validInput(); i.dry_run_steps = [{ step_id: 'x', step_type: 'saas_enablement_preview', step_mode: 'dry-run', step_hash: 'a'.repeat(64) }]; i.required_dry_run_controls = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_DRY_RUN_FAIL')); assert.ok(r.errors[0].includes('missing required dry-run controls')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.dry_run_steps = [{ step_id: 'x', step_type: 'invalid', step_mode: 'dry-run', step_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_DRY_RUN_FAIL')); console.log('  PASS: bad type'); },
  () => { const i = validInput(); i.dry_run_steps = [{ step_id: 'x', step_type: 'saas_enablement_preview', step_mode: 'invalid', step_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_DRY_RUN_FAIL')); console.log('  PASS: bad mode'); },
  () => { const i = validInput(); i.dry_run_steps = [{ step_id: 'x', step_type: 'saas_enablement_preview', step_mode: 'dry-run', step_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_DRY_RUN_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.dry_run_steps = [{ step_type: 'saas_enablement_preview', step_mode: 'dry-run', step_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_DRY_RUN_FAIL')); console.log('  PASS: missing step_id'); },
  () => { const r = build(validInput()); assert.equal(r.activation_dry_run_controller_ready, true); assert.equal(r.dry_run_steps_count, 10); assert.equal(r.required_dry_run_controls_count, 11); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.activation_dry_run_hash); assert.equal(r.activation_dry_run_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.activation_dry_run_hash, r2.activation_dry_run_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.activation_dry_run_completed, false); assert.equal(r.product_activation_allowed, false); console.log('  PASS: dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enablement_allowed, false); assert.equal(r.production_readiness_confirmed, false); console.log('  PASS: activation blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_risk_accepted, false); assert.equal(r.activation_authority_granted, false); assert.equal(r.product_activation_phase_passed, false); console.log('  PASS: auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ACTIVATION_DRY_RUN_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('activation_dry_run_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.activation_dry_run_completed, false); assert.equal(r.product_activation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== activation-dry-run-controller tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked readiness',10,14],['fail',14,19],['ready',19,26],['validate',26,28],['render',28,32],['invariants',32,34]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();