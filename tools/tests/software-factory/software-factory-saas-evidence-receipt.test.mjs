import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_SAAS_EVIDENCE_RECEIPT_STATUSES, build, validate, render } from '../../software-factory/software-factory-saas-evidence-receipt.mjs';

function vE(id, ty, mo, hc) { return { evidence_id: id, evidence_type: ty, evidence_mode: mo, evidence_hash: hc.repeat(64) }; }
function vI() { return {
  saas_evidence_receipt_id: 'ser-v311', saas_policy_binding_id: 'spb-v310', saas_policy_binding_ready: true,
  evidence_entries: [
    vE('e1','saas_platform_contract','dry-run','a'), vE('e2','tenant_isolation','dry-run','b'),
    vE('e3','subscription_policy','dry-run','c'), vE('e4','billing_dry_run','dry-run','d'),
    vE('e5','saas_risk_classification','dry-run','e'), vE('e6','saas_policy_binding','dry-run','f'),
    vE('e7','pass_gold_status','dry-run','0'), vE('e8','audit_record','dry-run','1'),
    vE('e9','billing_blocker','dry-run','2'),
  ],
  required_evidence_types: ['saas_platform_contract','tenant_isolation','subscription_policy','billing_dry_run','saas_risk_classification','saas_policy_binding','pass_gold_status','audit_record','billing_blocker'],
  receipt_level: 'contract-only',
};}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SAAS_EVIDENCE_RECEIPT_STATUSES)); console.log('  PASS: STATUSES'); }, () => { assert.ok(SOFTWARE_FACTORY_SAAS_EVIDENCE_RECEIPT_STATUSES.includes('SAAS_EVIDENCE_RECEIPT_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_EVIDENCE_RECEIPT_STATUSES.includes('SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING')); console.log('  PASS: B_BINDING'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_EVIDENCE_RECEIPT_STATUSES.includes('SAAS_EVIDENCE_RECEIPT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_SAAS_EVIDENCE_RECEIPT_STATUSES.includes('SAAS_EVIDENCE_RECEIPT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); }, () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); }, () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('SAAS_EVIDENCE_RECEIPT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('saas_evidence_receipt_id')); console.log('  PASS: {}'); },
  () => { const i = vI(); i.saas_policy_binding_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING')); console.log('  PASS: bind not ready'); },
  () => { const i = vI(); delete i.saas_policy_binding_id; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING')); console.log('  PASS: no spb'); },
  () => { const i = vI(); i.receipt_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING')); console.log('  PASS: bad level'); },
  () => { const i = vI(); i.evidence_entries = []; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING')); console.log('  PASS: empty'); },
  () => { const i = vI(); i.evidence_entries = [{ evidence_type: 'saas_platform_contract', evidence_mode: 'dry-run', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('evidence_id')); console.log('  PASS: no eid'); },
  () => { const i = vI(); i.evidence_entries = [{ evidence_id: 'e1', evidence_type: 'bad', evidence_mode: 'dry-run', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('evidence_type')); console.log('  PASS: bad type'); },
  () => { const i = vI(); i.evidence_entries = [{ evidence_id: 'e1', evidence_type: 'saas_platform_contract', evidence_mode: 'write', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('evidence_mode')); console.log('  PASS: bad mode'); },
  () => { const i = vI(); i.evidence_entries = [{ evidence_id: 'e1', evidence_type: 'saas_platform_contract', evidence_mode: 'dry-run', evidence_hash: 'sh' }]; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('evidence_hash')); console.log('  PASS: short hash'); },
  () => { const i = vI(); i.required_evidence_types = ['saas_platform_contract']; const r = build(i); assert.ok(r.errors[0].startsWith('SAAS_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('missing required evidence types')); console.log('  PASS: missing req'); },
  () => { const r = build(vI()); assert.equal(r.saas_evidence_receipt_ready, true); assert.equal(r.evidence_entries_count, 9); assert.equal(r.required_evidence_types_count, 9); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(vI()); assert.ok(r.saas_evidence_receipt_hash); assert.equal(r.saas_evidence_receipt_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(vI()); const r2 = build(vI()); assert.equal(r1.saas_evidence_receipt_hash, r2.saas_evidence_receipt_hash); console.log('  PASS: det'); },
  () => { const r = build(vI()); assert.equal(r.saas_policy_enforced, false); assert.equal(r.saas_enabled, false); console.log('  PASS: blocked'); },
  () => { const r = build(vI()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(vI())); assert.equal(typeof r, 'string'); assert.ok(r.includes('SAAS_EVIDENCE_RECEIPT_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(vI())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(vI())); assert.ok(r.includes('saas_evidence_receipt_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(vI()); ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.saas_policy_enforced, false); assert.equal(r.saas_enabled, false); console.log('  PASS: binv'); },
];
function run() { console.log('\n=== saas-evidence-receipt tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked binding',10,14],['fail',14,19],['ready',19,23],['validate',23,25],['render',25,29],['invariants',29,31]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();