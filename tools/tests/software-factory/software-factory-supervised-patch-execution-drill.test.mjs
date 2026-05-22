import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_SUPERVISED_PATCH_EXECUTION_DRILL_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-supervised-patch-execution-drill.mjs';

function validInput() {
  return {
    drill_id: 'sped-v233-test',
    contract_id: 'sfc-v233-test',
    barrier_id: 'barrier-v233-test',
    barrier_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SUPERVISED_PATCH_EXECUTION_DRILL_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUPERVISED_PATCH_EXECUTION_DRILL_STATUSES.includes('SUPERVISED_DRILL_BLOCKED_INPUT')); console.log('  PASS: has SUPERVISED_DRILL_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUPERVISED_PATCH_EXECUTION_DRILL_STATUSES.includes('SUPERVISED_DRILL_BLOCKED_CONTRACT')); console.log('  PASS: has SUPERVISED_DRILL_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUPERVISED_PATCH_EXECUTION_DRILL_STATUSES.includes('SUPERVISED_DRILL_READY')); console.log('  PASS: has SUPERVISED_DRILL_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.drill_ready, false); assert.ok(r.errors.some(e => e.includes('SUPERVISED_DRILL_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.drill_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.drill_id; const r = build(input); assert.equal(r.drill_ready, false); console.log('  PASS: no drill_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.drill_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.barrier_id; const r = build(input); assert.equal(r.drill_ready, false); console.log('  PASS: no barrier_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.barrier_ready = false; const r = build(input); assert.equal(r.drill_ready, false); assert.ok(r.errors.some(e => e.startsWith('SUPERVISED_DRILL_BLOCKED_CONTRACT'))); console.log('  PASS: barrier_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.drill_ready, false); assert.ok(r.errors.some(e => e.startsWith('SUPERVISED_DRILL_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.drill_ready, true); console.log('  PASS: valid -> SUPERVISED_DRILL_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v233.0'); console.log('  PASS: schema_version=v233.0'); },
  () => { const r = build(validInput()); assert.ok(r.drill_id); assert.ok(r.contract_id); assert.ok(r.barrier_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.drill_steps)); assert.ok(r.drill_steps.length > 0); console.log('  PASS: drill_steps non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.step_count, r.drill_steps.length); console.log('  PASS: step_count matches drill_steps.length'); },
  () => { const r = build(validInput()); assert.equal(r.drill_completed, false); console.log('  PASS: drill_completed=false by default'); },
  () => { const r = build(validInput()); assert.ok(r.drill_hash && r.drill_hash.length === 64); console.log('  PASS: drill_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const r = build(validInput()); r.drill_steps.forEach(s => assert.equal(s.mode, 'drill')); console.log('  PASS: all steps mode=drill'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_patch_execution_allowed')); console.log('  PASS: render: contains real_patch_execution_allowed'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('drill_completed')); console.log('  PASS: render: contains drill_completed'); },
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
      assert.equal(r.drill_completed, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-supervised-patch-execution-drill tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
