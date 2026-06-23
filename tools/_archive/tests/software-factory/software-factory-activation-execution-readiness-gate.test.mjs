import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ACTIVATION_EXECUTION_READINESS_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-activation-execution-readiness-gate.mjs';

function validInput() {
  const h = (c) => c.repeat(64);
  return {
    activation_execution_readiness_gate_id: 'aerg-v329', activation_execution_dry_run_plan_id: 'aedrp-v328', activation_execution_dry_run_plan_ready: true,
    readiness_items: [
      { readiness_id: 'r1', readiness_type: 'execution_command', readiness_mode: 'contract-only', readiness_hash: h('a') },
      { readiness_id: 'r2', readiness_type: 'preflight_gate', readiness_mode: 'metadata-only', readiness_hash: h('0') },
      { readiness_id: 'r3', readiness_type: 'production_touch_boundary', readiness_mode: 'dry-run', readiness_hash: h('b') },
      { readiness_id: 'r4', readiness_type: 'dry_run_plan', readiness_mode: 'planning', readiness_hash: h('c') },
      { readiness_id: 'r5', readiness_type: 'rollback_requirement', readiness_mode: 'contract-only', readiness_hash: h('d') },
      { readiness_id: 'r6', readiness_type: 'evidence_requirement', readiness_mode: 'metadata-only', readiness_hash: h('e') },
      { readiness_id: 'r7', readiness_type: 'audit_requirement', readiness_mode: 'dry-run', readiness_hash: h('f') },
      { readiness_id: 'r8', readiness_type: 'pass_gold_requirement', readiness_mode: 'planning', readiness_hash: h('a') },
      { readiness_id: 'r9', readiness_type: 'human_approval_requirement', readiness_mode: 'contract-only', readiness_hash: h('0') },
      { readiness_id: 'r10', readiness_type: 'deployment_blocker', readiness_mode: 'metadata-only', readiness_hash: h('b') },
      { readiness_id: 'r11', readiness_type: 'release_blocker', readiness_mode: 'dry-run', readiness_hash: h('c') },
      { readiness_id: 'r12', readiness_type: 'stable_blocker', readiness_mode: 'planning', readiness_hash: h('d') },
      { readiness_id: 'r13', readiness_type: 'billing_blocker', readiness_mode: 'contract-only', readiness_hash: h('e') },
    ],
    readiness_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_READINESS_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_READINESS_GATE_STATUSES.includes('ACTIVATION_EXECUTION_READINESS_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_READINESS_GATE_STATUSES.includes('ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN')); console.log('  PASS: B_DRY_RUN'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_READINESS_GATE_STATUSES.includes('ACTIVATION_EXECUTION_READINESS_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_READINESS_GATE_STATUSES.includes('ACTIVATION_EXECUTION_READINESS_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_READINESS_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('activation_execution_readiness_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.activation_execution_dry_run_plan_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN')); console.log('  PASS: dry-run not ready'); },
  () => { const i = validInput(); delete i.activation_execution_dry_run_plan_id; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN')); console.log('  PASS: missing dry-run id'); },
  () => { const i = validInput(); i.readiness_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.readiness_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN')); console.log('  PASS: bad level'); },
  () => { const i = validInput(); i.readiness_items = [{ readiness_id: 'x', readiness_type: 'execution_command', readiness_mode: 'contract-only', readiness_hash: 'a'.repeat(64) }]; i.required_readiness_controls = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_READINESS_FAIL')); assert.ok(r.errors[0].includes('missing required readiness controls')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.readiness_items = [{ readiness_id: 'x', readiness_type: 'invalid', readiness_mode: 'contract-only', readiness_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_READINESS_FAIL')); console.log('  PASS: bad type'); },
  () => { const i = validInput(); i.readiness_items = [{ readiness_id: 'x', readiness_type: 'execution_command', readiness_mode: 'invalid', readiness_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_READINESS_FAIL')); console.log('  PASS: bad mode'); },
  () => { const i = validInput(); i.readiness_items = [{ readiness_id: 'x', readiness_type: 'execution_command', readiness_mode: 'contract-only', readiness_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_READINESS_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.readiness_items = [{ readiness_type: 'execution_command', readiness_mode: 'contract-only', readiness_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_READINESS_FAIL')); console.log('  PASS: missing readiness_id'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_readiness_gate_ready, true); assert.equal(r.readiness_items_count, 13); assert.equal(r.required_readiness_controls_count, 11); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.activation_execution_readiness_hash); assert.equal(r.activation_execution_readiness_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.activation_execution_readiness_hash, r2.activation_execution_readiness_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_ready, false); assert.equal(r.product_activation_execution_allowed, false); console.log('  PASS: execution not ready/allowed'); },
  () => { const r = build(validInput()); assert.equal(r.production_touch_allowed, false); assert.equal(r.activation_execution_dry_run_completed, false); console.log('  PASS: prod touch/dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_approved, false); assert.equal(r.activation_execution_evidence_published, false); assert.equal(r.activation_rollback_bound, false); console.log('  PASS: approval/evid/rollback blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_authority_granted, false); assert.equal(r.activation_execution_phase_passed, false); console.log('  PASS: auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ACTIVATION_EXECUTION_READINESS_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('activation_execution_readiness_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.activation_execution_ready, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== activation-execution-readiness-gate tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked dry-run',10,14],['fail',14,19],['ready',19,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();