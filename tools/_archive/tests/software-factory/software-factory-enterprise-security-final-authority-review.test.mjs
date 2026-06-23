import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ENTERPRISE_SECURITY_FINAL_REVIEW_STATUSES, build, validate, render } from '../../software-factory/software-factory-enterprise-security-final-authority-review.mjs';

function validInput() {
  return {
    enterprise_final_review_id: 'efr-v303', enterprise_security_report_id: 'esr-v302', enterprise_security_report_contract_ready: true,
    authority_decision: 'approved', authority_id: 'auth-enterprise-01', review_reason: 'All V295-V303 enterprise security modules verified and compliant.',
    review_mode: 'contract-only',
    required_review_controls: ['human-authority-required','pass-gold-required','no-secret-access','no-production-touch','no-deploy','no-release','no-stable-promotion','no-runtime-execution','evidence-required','audit-required'],
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_FINAL_REVIEW_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_FINAL_REVIEW_STATUSES.includes('ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_FINAL_REVIEW_STATUSES.includes('ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT')); console.log('  PASS: BLOCKED_REPORT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_FINAL_REVIEW_STATUSES.includes('ENTERPRISE_SECURITY_FINAL_REVIEW_DENIED')); console.log('  PASS: DENIED'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_FINAL_REVIEW_STATUSES.includes('ENTERPRISE_SECURITY_FINAL_REVIEW_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('enterprise_final_review_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.enterprise_security_report_contract_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT')); console.log('  PASS: report not ready'); },
  () => { const i = validInput(); delete i.enterprise_security_report_id; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT')); console.log('  PASS: missing report id'); },
  () => { const i = validInput(); delete i.authority_decision; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT')); console.log('  PASS: missing decision'); },
  () => { const i = validInput(); delete i.authority_id; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT')); console.log('  PASS: missing authority_id'); },
  () => { const i = validInput(); delete i.review_reason; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT')); console.log('  PASS: missing reason'); },
  () => { const i = validInput(); i.review_mode = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); i.authority_decision = 'denied'; const r = build(i); assert.equal(r.errors[0], 'ENTERPRISE_SECURITY_FINAL_REVIEW_DENIED: authority_decision is not approved'); console.log('  PASS: denied -> DENIED'); },
  () => { const i = validInput(); i.authority_decision = 'blocked'; const r = build(i); assert.equal(r.errors[0], 'ENTERPRISE_SECURITY_FINAL_REVIEW_DENIED: authority_decision is not approved'); console.log('  PASS: blocked -> DENIED'); },
  () => { const i = validInput(); i.required_review_controls = ['human-authority-required']; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_FINAL_REVIEW_DENIED')); assert.ok(r.errors[0].includes('missing required review controls')); console.log('  PASS: missing controls -> DENIED'); },
  () => { const r = build(validInput()); assert.equal(r.enterprise_security_final_authority_review_ready, true); assert.equal(r.authority_decision, 'approved'); assert.equal(r.required_review_controls_count, 10); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.final_review_hash); assert.equal(r.final_review_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.final_review_hash, r2.final_review_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.enterprise_authority_granted, false); assert.equal(r.enterprise_security_enabled, false); console.log('  PASS: authority not granted'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ENTERPRISE_SECURITY_FINAL_REVIEW_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('final_review_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.enterprise_authority_granted, false); assert.equal(r.enterprise_phase_passed, false); assert.equal(r.dashboard_enabled, false); assert.equal(r.production_touched, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-enterprise-security-final-authority-review tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked report ---',10,16],['--- denied ---',16,19],['--- ready ---',19,23],['--- validate ---',23,25],['--- render ---',25,29],['--- invariants ---',29,31]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();