import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_SECURITY_SCAN_DRY_RUN_STATUSES, build, validate, render } from '../../software-factory/software-factory-security-scan-dry-run-contract.mjs';

function validTarget(id, type, mode, hc) { return { target_id: id, target_type: type, scan_mode: mode, target_hash: hc.repeat(64) }; }
function validInput() {
  return {
    security_scan_id: 'ss-v298', compliance_matrix_id: 'cm-v297', compliance_control_matrix_ready: true,
    scan_targets: [
      validTarget('t1','dependency_manifest','metadata-only','a'), validTarget('t2','source_metadata','metadata-only','b'),
      validTarget('t3','policy_metadata','metadata-only','c'), validTarget('t4','runtime_metadata','metadata-only','d'),
      validTarget('t5','dashboard_metadata','metadata-only','e'), validTarget('t6','audit_metadata','metadata-only','f'),
    ],
    required_scan_controls: ['no-secret-read','no-filesystem-write','no-network','no-runtime-execution','no-production-touch','evidence-required','audit-required'],
    scan_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SECURITY_SCAN_DRY_RUN_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_SECURITY_SCAN_DRY_RUN_STATUSES.includes('SECURITY_SCAN_DRY_RUN_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SECURITY_SCAN_DRY_RUN_STATUSES.includes('SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE')); console.log('  PASS: BLOCKED_COMPLIANCE'); },
  () => { assert.ok(SOFTWARE_FACTORY_SECURITY_SCAN_DRY_RUN_STATUSES.includes('SECURITY_SCAN_DRY_RUN_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_SECURITY_SCAN_DRY_RUN_STATUSES.includes('SECURITY_SCAN_DRY_RUN_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('SECURITY_SCAN_DRY_RUN_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('security_scan_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.compliance_control_matrix_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE')); console.log('  PASS: compliance not ready'); },
  () => { const i = validInput(); delete i.compliance_matrix_id; const r = build(i); assert.ok(r.errors[0].startsWith('SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE')); console.log('  PASS: missing cm id'); },
  () => { const i = validInput(); i.scan_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.scan_targets = []; const r = build(i); assert.ok(r.errors[0].startsWith('SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE')); console.log('  PASS: empty targets'); },
  () => { const i = validInput(); i.scan_targets = [{ target_type: 'dependency_manifest', scan_mode: 'metadata-only', target_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SECURITY_SCAN_DRY_RUN_FAIL')); assert.ok(r.errors[0].includes('target_id')); console.log('  PASS: missing target_id'); },
  () => { const i = validInput(); i.scan_targets = [{ target_id: 't1', target_type: 'invalid', scan_mode: 'metadata-only', target_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SECURITY_SCAN_DRY_RUN_FAIL')); assert.ok(r.errors[0].includes('target_type')); console.log('  PASS: invalid type'); },
  () => { const i = validInput(); i.scan_targets = [{ target_id: 't1', target_type: 'dependency_manifest', scan_mode: 'live', target_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SECURITY_SCAN_DRY_RUN_FAIL')); assert.ok(r.errors[0].includes('scan_mode')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); i.scan_targets = [{ target_id: 't1', target_type: 'dependency_manifest', scan_mode: 'metadata-only', target_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('SECURITY_SCAN_DRY_RUN_FAIL')); assert.ok(r.errors[0].includes('target_hash')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.required_scan_controls = ['no-secret-read']; const r = build(i); assert.ok(r.errors[0].startsWith('SECURITY_SCAN_DRY_RUN_FAIL')); assert.ok(r.errors[0].includes('missing required scan controls')); console.log('  PASS: missing controls'); },
  () => { const r = build(validInput()); assert.equal(r.security_scan_dry_run_contract_ready, true); assert.equal(r.scan_targets_count, 6); assert.equal(r.required_scan_controls_count, 7); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.security_scan_hash); assert.equal(r.security_scan_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.security_scan_hash, r2.security_scan_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.security_scan_executed, false); assert.equal(r.enterprise_security_enabled, false); console.log('  PASS: not executed'); },
  () => { const r = build(validInput()); assert.equal(r.runtime_execution_allowed, false); assert.equal(r.runtime_mission_executed, false); console.log('  PASS: runtime blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('SECURITY_SCAN_DRY_RUN_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('security_scan_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.security_scan_executed, false); assert.equal(r.secrets_accessed, false); assert.equal(r.dashboard_enabled, false); assert.equal(r.runtime_execution_allowed, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-security-scan-dry-run-contract tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked compliance ---',10,14],['--- fail ---',14,19],['--- ready ---',19,24],['--- validate ---',24,26],['--- render ---',26,30],['--- invariants ---',30,32]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();