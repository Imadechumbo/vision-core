import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_PRODUCTION_READINESS_EVIDENCE_BINDER_STATUSES, build, validate, render } from '../../software-factory/software-factory-production-readiness-evidence-binder.mjs';

function validInput() {
  const h = (c) => c.repeat(64);
  return {
    production_readiness_evidence_binder_id: 'preb-v317', saas_enablement_scope_binder_id: 'sesb-v316', saas_enablement_scope_binder_ready: true,
    evidence_items: [
      { evidence_id: 'shg-e', evidence_type: 'saas_hardening_gate', evidence_mode: 'contract-only', evidence_hash: h('a') },
      { evidence_id: 'scg-e', evidence_type: 'security_compliance_gate', evidence_mode: 'contract-only', evidence_hash: h('0') },
      { evidence_id: 'bb-e', evidence_type: 'billing_blocker', evidence_mode: 'dry-run', evidence_hash: h('b') },
      { evidence_id: 'tb-e', evidence_type: 'tenant_blocker', evidence_mode: 'planning', evidence_hash: h('c') },
      { evidence_id: 'db-e', evidence_type: 'deploy_blocker', evidence_mode: 'metadata-only', evidence_hash: h('d') },
      { evidence_id: 'rb-e', evidence_type: 'release_blocker', evidence_mode: 'planning', evidence_hash: h('e') },
      { evidence_id: 'sb-e', evidence_type: 'stable_blocker', evidence_mode: 'planning', evidence_hash: h('f') },
      { evidence_id: 'rp-e', evidence_type: 'rollback_plan', evidence_mode: 'metadata-only', evidence_hash: h('a') },
      { evidence_id: 'ar-e', evidence_type: 'audit_record', evidence_mode: 'metadata-only', evidence_hash: h('0') },
      { evidence_id: 'pg-e', evidence_type: 'pass_gold_status', evidence_mode: 'contract-only', evidence_hash: h('b') },
    ],
    readiness_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PRODUCTION_READINESS_EVIDENCE_BINDER_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCTION_READINESS_EVIDENCE_BINDER_STATUSES.includes('PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCTION_READINESS_EVIDENCE_BINDER_STATUSES.includes('PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE')); console.log('  PASS: B_SCOPE'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCTION_READINESS_EVIDENCE_BINDER_STATUSES.includes('PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_PRODUCTION_READINESS_EVIDENCE_BINDER_STATUSES.includes('PRODUCTION_READINESS_EVIDENCE_BINDER_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('production_readiness_evidence_binder_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.saas_enablement_scope_binder_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE')); console.log('  PASS: scope not ready'); },
  () => { const i = validInput(); delete i.saas_enablement_scope_binder_id; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE')); console.log('  PASS: missing scope'); },
  () => { const i = validInput(); i.evidence_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.readiness_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE')); console.log('  PASS: bad level'); },
  () => { const i = validInput(); i.evidence_items = [{ evidence_id: 'x', evidence_type: 'saas_hardening_gate', evidence_mode: 'contract-only', evidence_hash: 'a'.repeat(64) }]; i.required_evidence_types = []; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL')); assert.ok(r.errors[0].includes('missing required evidence types')); console.log('  PASS: missing req types'); },
  () => { const i = validInput(); i.evidence_items = [{ evidence_id: 'x', evidence_type: 'invalid', evidence_mode: 'contract-only', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL')); console.log('  PASS: bad type'); },
  () => { const i = validInput(); i.evidence_items = [{ evidence_id: 'x', evidence_type: 'saas_hardening_gate', evidence_mode: 'invalid', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL')); console.log('  PASS: bad mode'); },
  () => { const i = validInput(); i.evidence_items = [{ evidence_id: 'x', evidence_type: 'saas_hardening_gate', evidence_mode: 'contract-only', evidence_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.evidence_items = [{ evidence_type: 'saas_hardening_gate', evidence_mode: 'contract-only', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL')); console.log('  PASS: missing evidence_id'); },
  () => { const r = build(validInput()); assert.equal(r.production_readiness_evidence_binder_ready, true); assert.equal(r.evidence_items_count, 10); assert.equal(r.required_evidence_types_count, 10); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.production_readiness_evidence_hash); assert.equal(r.production_readiness_evidence_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.production_readiness_evidence_hash, r2.production_readiness_evidence_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.production_readiness_confirmed, false); assert.equal(r.product_activation_allowed, false); console.log('  PASS: readiness blocked'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enablement_allowed, false); assert.equal(r.activation_dry_run_completed, false); console.log('  PASS: activation blocked'); },
  () => { const r = build(validInput()); assert.equal(r.activation_risk_accepted, false); assert.equal(r.activation_authority_granted, false); assert.equal(r.product_activation_phase_passed, false); console.log('  PASS: auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('PRODUCTION_READINESS_EVIDENCE_BINDER_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('production_readiness_evidence_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.production_readiness_confirmed, false); assert.equal(r.product_activation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== production-readiness-evidence-binder tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked scope',10,14],['fail',14,19],['ready',19,26],['validate',26,28],['render',28,32],['invariants',32,34]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();