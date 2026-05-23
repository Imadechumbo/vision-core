import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-enterprise-security-compliance-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'escpg-v304', enterprise_final_review_id: 'efr-v303', enterprise_security_final_authority_review_ready: true,
    ids: {
      enterprise_security_contract: 'esc-v295', secrets_access_boundary_contract: 'sb-v296',
      compliance_control_matrix: 'cm-v297', security_scan_dry_run_contract: 'ss-v298',
      enterprise_risk_classification_gate: 'rg-v299', enterprise_security_policy_binding: 'spb-v300',
      compliance_evidence_receipt: 'cr-v301', enterprise_security_report_contract: 'esr-v302',
      enterprise_security_final_authority_review: 'efr-v303',
    },
    phase_summary: 'All V295-V304 enterprise security and compliance modules verified.',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_STATUSES.includes('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_STATUSES.includes('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: BLOCKED_REVIEW'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_STATUSES.includes('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_INCOMPLETE')); console.log('  PASS: INCOMPLETE'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_STATUSES.includes('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('phase_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.enterprise_security_final_authority_review_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: review not ready'); },
  () => { const i = validInput(); delete i.enterprise_final_review_id; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing review id'); },
  () => { const i = validInput(); delete i.phase_summary; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: missing summary'); },
  () => { const i = validInput(); i.ids = { enterprise_security_contract: 'esc-v295' }; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_INCOMPLETE')); assert.ok(r.errors[0].includes('missing modules')); assert.equal(r.all_modules_present, false); console.log('  PASS: missing modules -> INCOMPLETE'); },
  () => { const i = validInput(); i.ids = {}; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_INCOMPLETE')); console.log('  PASS: empty ids -> INCOMPLETE'); },
  () => { const r = build(validInput()); assert.equal(r.enterprise_security_compliance_phase_gate_ready, true); assert.equal(r.all_modules_present, true); assert.equal(r.modules_verified.length, 9); assert.equal(r.phase_passed, false); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.phase_gate_hash); assert.equal(r.phase_gate_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.phase_gate_hash, r2.phase_gate_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.enterprise_security_enabled, false); assert.equal(r.compliance_enforced, false); console.log('  PASS: not enabled'); },
  () => { const r = build(validInput()); assert.equal(r.enterprise_authority_granted, false); assert.equal(r.enterprise_phase_passed, false); console.log('  PASS: phase_passed false'); },
  () => { const r = build(validInput()); assert.equal(r.runtime_execution_allowed, false); assert.equal(r.runtime_mission_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: runtime blocked'); },
  () => { const r = build(validInput()); assert.ok(r.final_message.includes('V295-V304')); assert.ok(r.final_message.includes('blocked until explicit V305')); console.log('  PASS: final message correct'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ENTERPRISE_SECURITY_COMPLIANCE_PHASE_GATE_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('phase_gate_hash')); console.log('  PASS: hash in render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('blocked until explicit V305')); console.log('  PASS: V305 block message'); },
  () => { const r = build(validInput()); ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.enterprise_security_enabled, false); assert.equal(r.enterprise_authority_granted, false); assert.equal(r.enterprise_phase_passed, false); assert.equal(r.dashboard_enabled, false); assert.equal(r.production_touched, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-enterprise-security-compliance-phase-gate tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked review ---',10,13],['--- incomplete ---',13,15],['--- ready ---',15,22],['--- validate ---',22,24],['--- render ---',24,29],['--- invariants ---',29,31]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();