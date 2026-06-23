import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_COMPLIANCE_CONTROL_MATRIX_STATUSES, build, validate, render } from '../../software-factory/software-factory-compliance-control-matrix.mjs';

function validControl(id, type, sev, hc) { return { control_id: id, control_type: type, severity: sev, control_hash: hc.repeat(64) }; }
function validInput() {
  return {
    compliance_matrix_id: 'cm-v297', secrets_boundary_id: 'sb-v296', secrets_access_boundary_contract_ready: true,
    controls: [
      validControl('c1','pass_gold_required','blocking','a'), validControl('c2','no_secret_access','critical','b'),
      validControl('c3','no_deploy','critical','c'), validControl('c4','no_release','critical','d'),
      validControl('c5','no_stable_promotion','critical','e'), validControl('c6','no_production_touch','critical','f'),
      validControl('c7','no_real_execution','blocking','0'), validControl('c8','human_approval_required','critical','1'),
      validControl('c9','audit_required','warning','2'), validControl('c10','evidence_required','info','3'),
    ],
    required_control_types: ['pass_gold_required','no_secret_access','no_deploy','no_release','no_stable_promotion','no_production_touch','no_real_execution','human_approval_required','audit_required','evidence_required'],
    compliance_mode: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_COMPLIANCE_CONTROL_MATRIX_STATUSES)); console.log('  PASS: STATUSES array'); },
  () => { assert.ok(SOFTWARE_FACTORY_COMPLIANCE_CONTROL_MATRIX_STATUSES.includes('COMPLIANCE_CONTROL_MATRIX_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_COMPLIANCE_CONTROL_MATRIX_STATUSES.includes('COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS')); console.log('  PASS: BLOCKED_SECRETS'); },
  () => { assert.ok(SOFTWARE_FACTORY_COMPLIANCE_CONTROL_MATRIX_STATUSES.includes('COMPLIANCE_CONTROL_MATRIX_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_COMPLIANCE_CONTROL_MATRIX_STATUSES.includes('COMPLIANCE_CONTROL_MATRIX_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.equal(r.compliance_control_matrix_ready, false); assert.ok(r.errors[0].startsWith('COMPLIANCE_CONTROL_MATRIX_BLOCKED_INPUT')); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('compliance_matrix_id')); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); i.secrets_access_boundary_contract_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS')); console.log('  PASS: secrets not ready -> BLOCKED_SECRETS'); },
  () => { const i = validInput(); delete i.secrets_boundary_id; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS')); console.log('  PASS: missing sb id -> BLOCKED_SECRETS'); },
  () => { const i = validInput(); i.compliance_mode = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS')); console.log('  PASS: invalid mode -> BLOCKED_SECRETS'); },
  () => { const i = validInput(); i.controls = []; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS')); console.log('  PASS: empty controls -> BLOCKED_SECRETS'); },
  () => { const i = validInput(); i.controls = [{ control_type: 'no_deploy', severity: 'critical', control_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_CONTROL_MATRIX_FAIL')); assert.ok(r.errors[0].includes('control_id')); console.log('  PASS: missing control_id -> FAIL'); },
  () => { const i = validInput(); i.controls = [{ control_id: 'c1', control_type: 'invalid', severity: 'critical', control_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_CONTROL_MATRIX_FAIL')); assert.ok(r.errors[0].includes('control_type')); console.log('  PASS: invalid type -> FAIL'); },
  () => { const i = validInput(); i.controls = [{ control_id: 'c1', control_type: 'no_deploy', severity: 'unknown', control_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_CONTROL_MATRIX_FAIL')); assert.ok(r.errors[0].includes('severity')); console.log('  PASS: invalid severity -> FAIL'); },
  () => { const i = validInput(); i.controls = [{ control_id: 'c1', control_type: 'no_deploy', severity: 'critical', control_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_CONTROL_MATRIX_FAIL')); assert.ok(r.errors[0].includes('control_hash')); console.log('  PASS: short hash -> FAIL'); },
  () => { const i = validInput(); i.required_control_types = ['pass_gold_required']; const r = build(i); assert.ok(r.errors[0].startsWith('COMPLIANCE_CONTROL_MATRIX_FAIL')); assert.ok(r.errors[0].includes('missing required control types')); console.log('  PASS: missing required -> FAIL'); },
  () => { const r = build(validInput()); assert.equal(r.compliance_control_matrix_ready, true); assert.equal(r.controls_count, 10); assert.equal(r.required_control_types_count, 10); assert.equal(r.errors.length, 0); console.log('  PASS: valid -> READY'); },
  () => { const r = build(validInput()); assert.ok(r.compliance_matrix_hash); assert.equal(r.compliance_matrix_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.compliance_matrix_hash, r2.compliance_matrix_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.compliance_enforced, false); assert.equal(r.enterprise_security_enabled, false); console.log('  PASS: not enforced'); },
  () => { const r = build(validInput()); assert.equal(r.runtime_execution_allowed, false); assert.equal(r.runtime_mission_executed, false); console.log('  PASS: runtime blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('COMPLIANCE_CONTROL_MATRIX_READY')); console.log('  PASS: render string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('compliance_matrix_hash')); console.log('  PASS: render hash'); },
  () => {
    const r = build(validInput());
    ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false));
    console.log('  PASS: all invariants false');
  },
  () => { const r = build(null); assert.equal(r.compliance_enforced, false); assert.equal(r.secrets_accessed, false); assert.equal(r.dashboard_enabled, false); assert.equal(r.runtime_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-compliance-control-matrix tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked secrets ---',10,14],['--- fail ---',14,19],['--- ready ---',19,24],['--- validate ---',24,26],['--- render ---',26,30],['--- invariants ---',30,32]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();