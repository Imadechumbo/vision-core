import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PATCH_EXECUTION_BARRIER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-patch-execution-barrier.mjs';

function validInput() {
  return {
    barrier_id: 'rpeb-v232-test',
    contract_id: 'sfc-v232-test',
    plan_id: 'plan-v232-test',
    plan_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PATCH_EXECUTION_BARRIER_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_PATCH_EXECUTION_BARRIER_STATUSES.includes('REAL_PATCH_BARRIER_BLOCKED_INPUT')); console.log('  PASS: has REAL_PATCH_BARRIER_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_PATCH_EXECUTION_BARRIER_STATUSES.includes('REAL_PATCH_BARRIER_BLOCKED_CONTRACT')); console.log('  PASS: has REAL_PATCH_BARRIER_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_PATCH_EXECUTION_BARRIER_STATUSES.includes('REAL_PATCH_BARRIER_READY')); console.log('  PASS: has REAL_PATCH_BARRIER_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.barrier_ready, false); assert.ok(r.errors.some(e => e.includes('REAL_PATCH_BARRIER_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.barrier_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.barrier_id; const r = build(input); assert.equal(r.barrier_ready, false); console.log('  PASS: no barrier_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.barrier_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.plan_id; const r = build(input); assert.equal(r.barrier_ready, false); console.log('  PASS: no plan_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.plan_ready = false; const r = build(input); assert.equal(r.barrier_ready, false); assert.ok(r.errors.some(e => e.startsWith('REAL_PATCH_BARRIER_BLOCKED_CONTRACT'))); console.log('  PASS: plan_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.barrier_ready, false); assert.ok(r.errors.some(e => e.startsWith('REAL_PATCH_BARRIER_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.barrier_ready, true); console.log('  PASS: valid -> REAL_PATCH_BARRIER_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v232.0'); console.log('  PASS: schema_version=v232.0'); },
  () => { const r = build(validInput()); assert.ok(r.barrier_id); assert.ok(r.contract_id); assert.ok(r.plan_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.barrier_checks)); assert.ok(r.barrier_checks.length > 0); console.log('  PASS: barrier_checks non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.check_count, r.barrier_checks.length); console.log('  PASS: check_count matches barrier_checks.length'); },
  () => { const r = build(validInput()); assert.equal(r.barrier_passed, false); console.log('  PASS: barrier_passed=false by default'); },
  () => { const r = build(validInput()); assert.ok(r.barrier_hash && r.barrier_hash.length === 64); console.log('  PASS: barrier_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const r = build(validInput()); assert.ok(r.check_count >= 8); console.log('  PASS: default barrier_checks >= 8'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_patch_execution_allowed')); console.log('  PASS: render: contains real_patch_execution_allowed'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('barrier_passed')); console.log('  PASS: render: contains barrier_passed'); },
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
      assert.equal(r.barrier_passed, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-real-patch-execution-barrier tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
