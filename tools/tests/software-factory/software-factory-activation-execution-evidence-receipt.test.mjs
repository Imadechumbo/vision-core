import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_STATUSES, build, validate, render } from '../../software-factory/software-factory-activation-execution-evidence-receipt.mjs';

function validInput() {
  const h = (c) => c.repeat(64);
  return {
    activation_execution_evidence_receipt_id: 'aeer-v331', activation_execution_approval_binding_id: 'aeab-v330', activation_execution_approval_binding_ready: true,
    evidence_entries: [
      { evidence_id: 'e1', evidence_type: 'execution_command', evidence_mode: 'contract-only', evidence_hash: h('a') },
      { evidence_id: 'e2', evidence_type: 'preflight_gate', evidence_mode: 'metadata-only', evidence_hash: h('0') },
      { evidence_id: 'e3', evidence_type: 'production_touch_boundary', evidence_mode: 'dry-run', evidence_hash: h('b') },
      { evidence_id: 'e4', evidence_type: 'execution_dry_run_plan', evidence_mode: 'planning', evidence_hash: h('c') },
      { evidence_id: 'e5', evidence_type: 'execution_readiness_gate', evidence_mode: 'contract-only', evidence_hash: h('d') },
      { evidence_id: 'e6', evidence_type: 'execution_approval_binding', evidence_mode: 'metadata-only', evidence_hash: h('e') },
      { evidence_id: 'e7', evidence_type: 'pass_gold_status', evidence_mode: 'dry-run', evidence_hash: h('f') },
      { evidence_id: 'e8', evidence_type: 'rollback_requirement', evidence_mode: 'planning', evidence_hash: h('a') },
      { evidence_id: 'e9', evidence_type: 'audit_record', evidence_mode: 'contract-only', evidence_hash: h('0') },
      { evidence_id: 'e10', evidence_type: 'blocker_record', evidence_mode: 'metadata-only', evidence_hash: h('b') },
    ],
    receipt_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_STATUSES.includes('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_STATUSES.includes('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_APPROVAL')); console.log('  PASS: B_APPROVAL'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_STATUSES.includes('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_STATUSES.includes('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('activation_execution_evidence_receipt_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.activation_execution_approval_binding_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_APPROVAL')); console.log('  PASS: approval not ready'); },
  () => { const i = validInput(); delete i.activation_execution_approval_binding_id; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_APPROVAL')); console.log('  PASS: missing approval id'); },
  () => { const i = validInput(); i.evidence_entries = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_APPROVAL')); console.log('  PASS: empty entries'); },
  () => { const i = validInput(); i.receipt_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_APPROVAL')); console.log('  PASS: bad level'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_id: 'x', evidence_type: 'execution_command', evidence_mode: 'contract-only', evidence_hash: 'a'.repeat(64) }]; i.required_evidence_types = []; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('missing required evidence types')); console.log('  PASS: missing types'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_id: 'x', evidence_type: 'invalid', evidence_mode: 'contract-only', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_FAIL')); console.log('  PASS: bad type'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_id: 'x', evidence_type: 'execution_command', evidence_mode: 'invalid', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_FAIL')); console.log('  PASS: bad mode'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_id: 'x', evidence_type: 'execution_command', evidence_mode: 'contract-only', evidence_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_type: 'execution_command', evidence_mode: 'contract-only', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_FAIL')); console.log('  PASS: missing evidence_id'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_evidence_receipt_ready, true); assert.equal(r.evidence_entries_count, 10); assert.equal(r.required_evidence_types_count, 10); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.activation_execution_evidence_receipt_hash); assert.equal(r.activation_execution_evidence_receipt_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.activation_execution_evidence_receipt_hash, r2.activation_execution_evidence_receipt_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_evidence_published, false); assert.equal(r.product_activation_execution_allowed, false); console.log('  PASS: evidence not published'); },
  () => { const r = build(validInput()); assert.equal(r.production_touch_allowed, false); assert.equal(r.activation_execution_dry_run_completed, false); console.log('  PASS: touch/dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_ready, false); assert.equal(r.activation_execution_approved, false); assert.equal(r.activation_rollback_bound, false); console.log('  PASS: ready/approved/rollback blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_execution_authority_granted, false); assert.equal(r.activation_execution_phase_passed, false); console.log('  PASS: auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ACTIVATION_EXECUTION_EVIDENCE_RECEIPT_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('activation_execution_evidence_receipt_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.activation_execution_evidence_published, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== activation-execution-evidence-receipt tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked approval',10,14],['fail',14,19],['ready',19,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();