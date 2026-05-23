import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ENTERPRISE_SECURITY_POLICY_BINDING_STATUSES, build, validate, render } from '../../software-factory/software-factory-enterprise-security-policy-binding.mjs';

function validBinding(id, policy, risk, mode, hc) { return { binding_id: id, policy_id: policy, risk_id: risk, binding_mode: mode, binding_hash: hc.repeat(64) }; }
function validInput() {
  return {
    security_policy_binding_id: 'spb-v300', risk_gate_id: 'rg-v299', enterprise_risk_classification_gate_ready: true,
    policy_bindings: [validBinding('b1','pol-1','r1','dry-run','a'), validBinding('b2','pol-2','r2','dry-run','b')],
    required_policy_controls: ['pass-gold-required','no-secret-access','no-production-touch','no-deploy','no-release','no-stable-promotion','no-runtime-execution','human-approval-required','audit-required','evidence-required'],
    binding_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_POLICY_BINDING_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_POLICY_BINDING_STATUSES.includes('ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_POLICY_BINDING_STATUSES.includes('ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK')); console.log('  PASS: BLOCKED_RISK'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_POLICY_BINDING_STATUSES.includes('ENTERPRISE_SECURITY_POLICY_BINDING_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_POLICY_BINDING_STATUSES.includes('ENTERPRISE_SECURITY_POLICY_BINDING_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('security_policy_binding_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.enterprise_risk_classification_gate_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK')); console.log('  PASS: risk not ready'); },
  () => { const i = validInput(); delete i.risk_gate_id; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK')); console.log('  PASS: missing risk gate'); },
  () => { const i = validInput(); i.binding_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.policy_bindings = []; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK')); console.log('  PASS: empty bindings'); },
  () => { const i = validInput(); i.policy_bindings = [{ policy_id: 'p1', risk_id: 'r1', binding_mode: 'dry-run', binding_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_FAIL')); assert.ok(r.errors[0].includes('binding_id')); console.log('  PASS: missing binding_id'); },
  () => { const i = validInput(); i.policy_bindings = [{ binding_id: 'b1', policy_id: 'p1', binding_mode: 'dry-run', binding_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_FAIL')); assert.ok(r.errors[0].includes('risk_id')); console.log('  PASS: missing risk_id'); },
  () => { const i = validInput(); i.policy_bindings = [{ binding_id: 'b1', policy_id: 'p1', risk_id: 'r1', binding_mode: 'write', binding_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_FAIL')); assert.ok(r.errors[0].includes('binding_mode')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); i.policy_bindings = [{ binding_id: 'b1', policy_id: 'p1', risk_id: 'r1', binding_mode: 'dry-run', binding_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_FAIL')); assert.ok(r.errors[0].includes('binding_hash')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.required_policy_controls = ['pass-gold-required']; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_FAIL')); assert.ok(r.errors[0].includes('missing required policy controls')); console.log('  PASS: missing controls'); },
  () => { const r = build(validInput()); assert.equal(r.enterprise_security_policy_binding_ready, true); assert.equal(r.policy_bindings_count, 2); assert.equal(r.required_policy_controls_count, 10); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.security_policy_binding_hash); assert.equal(r.security_policy_binding_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.security_policy_binding_hash, r2.security_policy_binding_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.security_policy_enforced, false); assert.equal(r.enterprise_security_enabled, false); console.log('  PASS: policy not enforced'); },
  () => { const r = build(validInput()); assert.equal(r.runtime_execution_allowed, false); console.log('  PASS: runtime blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ENTERPRISE_SECURITY_POLICY_BINDING_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('security_policy_binding_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.security_policy_enforced, false); assert.equal(r.security_report_published, false); assert.equal(r.enterprise_authority_granted, false); assert.equal(r.enterprise_phase_passed, false); assert.equal(r.dashboard_enabled, false); assert.equal(r.production_touched, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-enterprise-security-policy-binding tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked risk ---',10,14],['--- fail ---',14,19],['--- ready ---',19,24],['--- validate ---',24,26],['--- render ---',26,30],['--- invariants ---',30,32]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();