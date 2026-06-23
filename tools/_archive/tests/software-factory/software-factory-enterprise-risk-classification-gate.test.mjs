import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_ENTERPRISE_RISK_CLASSIFICATION_STATUSES, build, validate, render } from '../../software-factory/software-factory-enterprise-risk-classification-gate.mjs';

function validRisk(id, type, sev, hc) { return { risk_id: id, risk_type: type, severity: sev, risk_hash: hc.repeat(64) }; }
function validInput() {
  return {
    risk_gate_id: 'rg-v299', security_scan_id: 'ss-v298', security_scan_dry_run_contract_ready: true,
    risk_items: [
      validRisk('r1','secret_exposure','high','a'), validRisk('r2','dependency_risk','medium','b'),
      validRisk('r3','production_touch','critical','c'), validRisk('r4','deployment_risk','high','d'),
      validRisk('r5','policy_bypass','blocking','e'), validRisk('r6','compliance_gap','high','f'),
    ],
    required_risk_controls: ['no-secret-exposure','no-production-touch','no-deploy','no-release','no-stable-promotion','no-runtime-execution','no-policy-bypass','audit-required','rollback-required','human-approval-required'],
    risk_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ENTERPRISE_RISK_CLASSIFICATION_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_RISK_CLASSIFICATION_STATUSES.includes('ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_INPUT')); console.log('  PASS: BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_RISK_CLASSIFICATION_STATUSES.includes('ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN')); console.log('  PASS: BLOCKED_SCAN'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_RISK_CLASSIFICATION_STATUSES.includes('ENTERPRISE_RISK_CLASSIFICATION_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_RISK_CLASSIFICATION_STATUSES.includes('ENTERPRISE_RISK_CLASSIFICATION_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('risk_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.security_scan_dry_run_contract_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN')); console.log('  PASS: scan not ready'); },
  () => { const i = validInput(); delete i.security_scan_id; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN')); console.log('  PASS: missing ss id'); },
  () => { const i = validInput(); i.risk_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); i.risk_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.risk_items = [{ risk_type: 'secret_exposure', severity: 'high', risk_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_RISK_CLASSIFICATION_FAIL')); assert.ok(r.errors[0].includes('risk_id')); console.log('  PASS: missing risk_id'); },
  () => { const i = validInput(); i.risk_items = [{ risk_id: 'r1', risk_type: 'invalid', severity: 'high', risk_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_RISK_CLASSIFICATION_FAIL')); assert.ok(r.errors[0].includes('risk_type')); console.log('  PASS: invalid type'); },
  () => { const i = validInput(); i.risk_items = [{ risk_id: 'r1', risk_type: 'secret_exposure', severity: 'unknown', risk_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_RISK_CLASSIFICATION_FAIL')); assert.ok(r.errors[0].includes('severity')); console.log('  PASS: invalid severity'); },
  () => { const i = validInput(); i.risk_items = [{ risk_id: 'r1', risk_type: 'secret_exposure', severity: 'high', risk_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_RISK_CLASSIFICATION_FAIL')); assert.ok(r.errors[0].includes('risk_hash')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.required_risk_controls = ['no-secret-exposure']; const r = build(i); assert.ok(r.errors[0].startsWith('ENTERPRISE_RISK_CLASSIFICATION_FAIL')); assert.ok(r.errors[0].includes('missing required risk controls')); console.log('  PASS: missing controls'); },
  () => { const r = build(validInput()); assert.equal(r.enterprise_risk_classification_gate_ready, true); assert.equal(r.risk_items_count, 6); assert.equal(r.required_risk_controls_count, 10); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.risk_classification_hash); assert.equal(r.risk_classification_hash.length, 64); console.log('  PASS: hash 64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.risk_classification_hash, r2.risk_classification_hash); console.log('  PASS: deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.enterprise_security_enabled, false); assert.equal(r.security_scan_executed, false); console.log('  PASS: not enabled'); },
  () => { const r = build(validInput()); assert.equal(r.runtime_execution_allowed, false); assert.equal(r.runtime_mission_executed, false); console.log('  PASS: runtime blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ENTERPRISE_RISK_CLASSIFICATION_READY')); console.log('  PASS: render'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('risk_classification_hash')); console.log('  PASS: hash in render'); },
  () => { const r = build(validInput()); ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: all invariants'); },
  () => { const r = build(null); assert.equal(r.enterprise_security_enabled, false); assert.equal(r.security_scan_executed, false); assert.equal(r.secrets_accessed, false); assert.equal(r.dashboard_enabled, false); console.log('  PASS: blocked invariants'); },
];

function run() {
  console.log('\n=== software-factory-enterprise-risk-classification-gate tests ===\n');
  const sec = [['--- exports ---',0,8],['--- blocked input ---',8,10],['--- blocked scan ---',10,14],['--- fail ---',14,19],['--- ready ---',19,24],['--- validate ---',24,26],['--- render ---',26,30],['--- invariants ---',30,32]];
  let p = 0, f = 0;
  for (const [l, s, e] of sec) { console.log(l); for (let i = s; i < e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== Results: ${p} passed, ${f} failed ===\n`); process.exit(f > 0 ? 1 : 0);
}
run();