import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PATCH_DIFF_BINDER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-patch-diff-binder.mjs';

function validInput() {
  return {
    binder_id: 'pdb-v226-test',
    contract_id: 'sfc-v226-test',
    audit_id: 'audit-v226-test',
    patch_audit_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PATCH_DIFF_BINDER_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PATCH_DIFF_BINDER_STATUSES.includes('PATCH_DIFF_BLOCKED_INPUT')); console.log('  PASS: has PATCH_DIFF_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PATCH_DIFF_BINDER_STATUSES.includes('PATCH_DIFF_BLOCKED_CONTRACT')); console.log('  PASS: has PATCH_DIFF_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PATCH_DIFF_BINDER_STATUSES.includes('PATCH_DIFF_READY')); console.log('  PASS: has PATCH_DIFF_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.binder_ready, false); assert.ok(r.errors.some(e => e.includes('PATCH_DIFF_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.binder_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.binder_id; const r = build(input); assert.equal(r.binder_ready, false); console.log('  PASS: no binder_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.binder_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.audit_id; const r = build(input); assert.equal(r.binder_ready, false); console.log('  PASS: no audit_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.patch_audit_ready = false; const r = build(input); assert.equal(r.binder_ready, false); assert.ok(r.errors.some(e => e.startsWith('PATCH_DIFF_BLOCKED_CONTRACT'))); console.log('  PASS: patch_audit_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.binder_ready, false); assert.ok(r.errors.some(e => e.startsWith('PATCH_DIFF_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.binder_ready, true); console.log('  PASS: valid -> PATCH_DIFF_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v226.0'); console.log('  PASS: schema_version=v226.0'); },
  () => { const r = build(validInput()); assert.ok(r.binder_id); assert.ok(r.contract_id); assert.ok(r.audit_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.diffs)); assert.ok(r.diffs.length > 0); console.log('  PASS: diffs non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.diff_count, r.diffs.length); console.log('  PASS: diff_count matches diffs.length'); },
  () => { const r = build(validInput()); assert.ok(r.binder_hash && r.binder_hash.length === 64); console.log('  PASS: binder_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },

  () => { const input = validInput(); input.diffs = [{file:'a.mjs',op:'add',diff_lines:5},{file:'b.mjs',op:'modify',diff_lines:10}]; const r = build(input); assert.equal(r.diff_count, 2); console.log('  PASS: custom diffs used'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_patch_execution_allowed')); console.log('  PASS: render: contains real_patch_execution_allowed'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('production_touched')); console.log('  PASS: render: contains production_touched'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
      assert.equal(r.release_allowed, false);
      assert.equal(r.deploy_allowed, false);
      assert.equal(r.stable_allowed, false);
      assert.equal(r.tag_allowed, false);
      assert.equal(r.real_execution_allowed, false);
      assert.equal(r.real_patch_execution_allowed, false);
      assert.equal(r.production_touched, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-patch-diff-binder tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
