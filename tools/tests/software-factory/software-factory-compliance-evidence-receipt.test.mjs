import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_COMPLIANCE_EVIDENCE_RECEIPT_STATUSES, build, validate, render } from '../../software-factory/software-factory-compliance-evidence-receipt.mjs';

function validEntry(id, type, mode, hc) { return { evidence_id: id, evidence_type: type, evidence_mode: mode, evidence_hash: hc.repeat(64) }; }
function validInput() {
  return {
    compliance_receipt_id: 'cr-v301', security_policy_binding_id: 'spb-v300', enterprise_security_policy_binding_ready: true,
    evidence_entries: [
      validEntry('e1','enterprise_security_contract','dry-run','a'), validEntry('e2','secrets_boundary','dry-run','b'),
      validEntry('e3','compliance_matrix','dry-run','c'), validEntry('e4','security_scan_dry_run','dry-run','d'),
      validEntry('e5','risk_classification','dry-run','e'), validEntry('e6','security_policy_binding','dry-run','f'),
      validEntry('e7','pass_gold_status','dry-run','0'), validEntry('e8','audit_record','dry-run','1'),
    ],
    required_evidence_types: ['enterprise_security_contract','secrets_boundary','compliance_matrix','security_scan_dry_run','risk_classification','security_policy_binding','pass_gold_status','audit_record'],
    receipt_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_COMPLIANCE_EVIDENCE_RECEIPT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_COMPLIANCE_EVIDENCE_RECEIPT_STATUSES.includes('COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_COMPLIANCE_EVIDENCE_RECEIPT_STATUSES.includes('COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING')); console.log('  PASS: BLOCKED_BINDING'); },
  () => { assert.ok(SOFTWARE_FACTORY_COMPLIANCE_EVIDENCE_RECEIPT_STATUSES.includes('COMPLIANCE_EVIDENCE_RECEIPT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_COMPLIANCE_EVIDENCE_RECEIPT_STATUSES.includes('COMPLIANCE_EVIDENCE_RECEIPT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('compliance_receipt_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.enterprise_security_policy_binding_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING')); console.log('  PASS: binding not ready'); },
  () => { const i = validInput(); delete i.security_policy_binding_id; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING')); console.log('  PASS: missing spb id'); },
  () => { const i = validInput(); i.receipt_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.evidence_entries = []; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING')); console.log('  PASS: empty entries'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_type: 'enterprise_security_contract', evidence_mode: 'dry-run', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('evidence_id')); console.log('  PASS: missing id'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_id: 'e1', evidence_type: 'invalid', evidence_mode: 'dry-run', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('evidence_type')); console.log('  PASS: invalid type'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_id: 'e1', evidence_type: 'enterprise_security_contract', evidence_mode: 'write', evidence_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('evidence_mode')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_id: 'e1', evidence_type: 'enterprise_security_contract', evidence_mode: 'dry-run', evidence_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('evidence_hash')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.required_evidence_types = ['enterprise_security_contract']; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_EVIDENCE_RECEIPT_FAIL')); assert.ok(r.errors[0].includes('missing required evidence types')); console.log('  PASS: missing required'); },
  () => { const r = build(validInput()); assert.equal(r.compliance_evidence_receipt_ready, true); assert.equal(r.evidence_entries_count, 8); assert.equal(r.required_evidence_types_count, 8); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.compliance_receipt_hash); assert.equal(r.compliance_receipt_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.compliance_receipt_hash, r2.compliance_receipt_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.compliance_enforced, false); assert.equal(r.enterprise_security_enabled, false); console.log('  PASS: not enforced'); },
  () => { const r = build(validInput()); assert.equal(r.runtime_execution_allowed, false); console.log('  PASS: runtime blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('COMPLIANCE_EVIDENCE_RECEIPT_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('compliance_receipt_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.compliance_enforced, false); assert.equal(r.security_report_published, false); assert.equal(r.enterprise_authority_granted, false); assert.equal(r.enterprise_phase_passed, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-compliance-evidence-receipt tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked binding ---',10,14],['--- fail ---',14,19],['--- ready ---',19,24],['--- validate ---',24,26],['--- render ---',26,30],['--- invariants ---',30,32]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();