import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_AUDIT_CONTRACT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-audit-contract.mjs';

function validInput() {
  return {
    pr_audit_id: 'prac-v235-test',
    contract_id: 'sfc-v235-test',
    pr_readiness_gate_ready: true,
    patch_execution_phase_gate_ready: true,
    branch_name: 'feat/v235-test',
    target_branch: 'main',
    pr_title: 'Test PR Title',
    pr_body_summary: 'Test PR body summary',
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_AUDIT_CONTRACT_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_AUDIT_CONTRACT_STATUSES.includes('PR_AUDIT_BLOCKED_INPUT')); console.log('  PASS: has PR_AUDIT_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_AUDIT_CONTRACT_STATUSES.includes('PR_AUDIT_BLOCKED_CONTRACT')); console.log('  PASS: has PR_AUDIT_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_AUDIT_CONTRACT_STATUSES.includes('PR_AUDIT_READY')); console.log('  PASS: has PR_AUDIT_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.pr_audit_ready, false); assert.ok(r.errors.some(e => e.includes('PR_AUDIT_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.pr_audit_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.pr_audit_id; const r = build(i); assert.equal(r.pr_audit_ready, false); console.log('  PASS: no pr_audit_id -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.contract_id; const r = build(i); assert.equal(r.pr_audit_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },

  () => { const i = validInput(); i.pr_readiness_gate_ready = false; const r = build(i); assert.equal(r.pr_audit_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_AUDIT_BLOCKED_CONTRACT'))); console.log('  PASS: pr_readiness_gate_ready=false -> BLOCKED_CONTRACT'); },
  () => { const i = validInput(); i.patch_execution_phase_gate_ready = false; const r = build(i); assert.equal(r.pr_audit_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_AUDIT_BLOCKED_CONTRACT'))); console.log('  PASS: patch_execution_phase_gate_ready=false -> BLOCKED_CONTRACT'); },
  () => { const i = validInput(); i.branch_name = 'main'; const r = build(i); assert.equal(r.pr_audit_ready, false); assert.ok(r.errors.some(e => e.includes('cannot be main'))); console.log('  PASS: branch_name=main -> BLOCKED_CONTRACT'); },
  () => { const i = validInput(); i.target_branch = 'dev'; const r = build(i); assert.equal(r.pr_audit_ready, false); assert.ok(r.errors.some(e => e.includes('target_branch must be main'))); console.log('  PASS: target_branch!=main -> BLOCKED_CONTRACT'); },
  () => { const i = validInput(); delete i.pr_title; const r = build(i); assert.equal(r.pr_audit_ready, false); console.log('  PASS: no pr_title -> BLOCKED_CONTRACT'); },
  () => { const i = validInput(); delete i.pr_body_summary; const r = build(i); assert.equal(r.pr_audit_ready, false); console.log('  PASS: no pr_body_summary -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.pr_audit_ready, true); console.log('  PASS: valid -> PR_AUDIT_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v235.0'); console.log('  PASS: schema_version=v235.0'); },
  () => { const r = build(validInput()); assert.ok(r.pr_audit_id); assert.ok(r.contract_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.equal(r.branch_valid, true); assert.equal(r.title_provided, true); assert.equal(r.body_provided, true); console.log('  PASS: validation flags set'); },
  () => { const r = build(validInput()); assert.ok(r.audit_hash && r.audit_hash.length === 64); console.log('  PASS: audit_hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.audit_hash, r2.audit_hash); console.log('  PASS: hash deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate ready: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },
  () => { const v = validate({}); assert.equal(v.valid, false); console.log('  PASS: validate {}: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_creation_allowed')); console.log('  PASS: render: contains real_pr_creation_allowed'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render null: returns string with REGRA ABSOLUTA'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
      assert.equal(r.release_allowed, false);
      assert.equal(r.deploy_allowed, false);
      assert.equal(r.stable_allowed, false);
      assert.equal(r.tag_allowed, false);
      assert.equal(r.real_execution_allowed, false);
      assert.equal(r.real_pr_creation_allowed, false);
      assert.equal(r.production_touched, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-pr-audit-contract tests ===\n');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
