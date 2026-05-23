import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ENTERPRISE_SECURITY_REPORT_STATUSES, build, validate, render } from '../../software-factory/software-factory-enterprise-security-report-contract.mjs';

function validSection(id, type, mode, hc) { return { section_id: id, section_type: type, report_mode: mode, section_hash: hc.repeat(64) }; }
function validInput() {
  return {
    enterprise_security_report_id: 'esr-v302', compliance_receipt_id: 'cr-v301', compliance_evidence_receipt_ready: true,
    report_sections: [
      validSection('s1','executive_summary','dry-run','a'), validSection('s2','security_scope','dry-run','b'),
      validSection('s3','compliance_controls','dry-run','c'), validSection('s4','secrets_boundary','dry-run','d'),
      validSection('s5','risk_classification','dry-run','e'), validSection('s6','policy_binding','dry-run','f'),
      validSection('s7','evidence_receipt','dry-run','0'), validSection('s8','pass_gold_status','dry-run','1'),
      validSection('s9','final_blockers','dry-run','2'),
    ],
    required_section_types: ['executive_summary','security_scope','compliance_controls','secrets_boundary','risk_classification','policy_binding','evidence_receipt','pass_gold_status','final_blockers'],
    report_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_REPORT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_REPORT_STATUSES.includes('ENTERPRISE_SECURITY_REPORT_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_REPORT_STATUSES.includes('ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT')); console.log('  PASS: BLOCKED_RECEIPT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_REPORT_STATUSES.includes('ENTERPRISE_SECURITY_REPORT_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_REPORT_STATUSES.includes('ENTERPRISE_SECURITY_REPORT_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_REPORT_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('enterprise_security_report_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.compliance_evidence_receipt_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT')); console.log('  PASS: receipt not ready'); },
  () => { const i = validInput(); delete i.compliance_receipt_id; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT')); console.log('  PASS: missing receipt id'); },
  () => { const i = validInput(); i.report_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.report_sections = []; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT')); console.log('  PASS: empty sections'); },
  () => { const i = validInput(); i.report_sections = [{ section_type: 'executive_summary', report_mode: 'dry-run', section_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_REPORT_FAIL')); assert.ok(r.errors[0].includes('section_id')); console.log('  PASS: missing section_id'); },
  () => { const i = validInput(); i.report_sections = [{ section_id: 's1', section_type: 'invalid', report_mode: 'dry-run', section_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_REPORT_FAIL')); assert.ok(r.errors[0].includes('section_type')); console.log('  PASS: invalid type'); },
  () => { const i = validInput(); i.report_sections = [{ section_id: 's1', section_type: 'executive_summary', report_mode: 'write', section_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_REPORT_FAIL')); assert.ok(r.errors[0].includes('report_mode')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); i.report_sections = [{ section_id: 's1', section_type: 'executive_summary', report_mode: 'dry-run', section_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_REPORT_FAIL')); assert.ok(r.errors[0].includes('section_hash')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.required_section_types = ['executive_summary']; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_REPORT_FAIL')); assert.ok(r.errors[0].includes('missing required section types')); console.log('  PASS: missing required'); },
  () => { const r = build(validInput()); assert.equal(r.enterprise_security_report_contract_ready, true); assert.equal(r.report_sections_count, 9); assert.equal(r.required_section_types_count, 9); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.enterprise_security_report_hash); assert.equal(r.enterprise_security_report_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.enterprise_security_report_hash, r2.enterprise_security_report_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.security_report_published, false); assert.equal(r.enterprise_security_enabled, false); console.log('  PASS: not published'); },
  () => { const r = build(validInput()); assert.equal(r.runtime_execution_allowed, false); console.log('  PASS: runtime blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ENTERPRISE_SECURITY_REPORT_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('enterprise_security_report_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.security_report_published, false); assert.equal(r.enterprise_authority_granted, false); assert.equal(r.enterprise_phase_passed, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-enterprise-security-report-contract tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked receipt ---',10,14],['--- fail ---',14,19],['--- ready ---',19,24],['--- validate ---',24,26],['--- render ---',26,30],['--- invariants ---',30,32]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();