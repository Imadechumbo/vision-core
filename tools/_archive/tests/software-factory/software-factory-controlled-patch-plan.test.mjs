import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_CONTROLLED_PATCH_PLAN_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-controlled-patch-plan.mjs';

function validInput() {
  return {
    plan_id: 'cpp-v231-test',
    contract_id: 'sfc-v231-test',
    gate_id: 'gate-v231-test',
    gate_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_CONTROLLED_PATCH_PLAN_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_PATCH_PLAN_STATUSES.includes('CONTROLLED_PATCH_PLAN_BLOCKED_INPUT')); console.log('  PASS: has CONTROLLED_PATCH_PLAN_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_PATCH_PLAN_STATUSES.includes('CONTROLLED_PATCH_PLAN_BLOCKED_CONTRACT')); console.log('  PASS: has CONTROLLED_PATCH_PLAN_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_PATCH_PLAN_STATUSES.includes('CONTROLLED_PATCH_PLAN_READY')); console.log('  PASS: has CONTROLLED_PATCH_PLAN_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.plan_ready, false); assert.ok(r.errors.some(e => e.includes('CONTROLLED_PATCH_PLAN_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.plan_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.plan_id; const r = build(input); assert.equal(r.plan_ready, false); console.log('  PASS: no plan_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.plan_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.gate_id; const r = build(input); assert.equal(r.plan_ready, false); console.log('  PASS: no gate_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.gate_ready = false; const r = build(input); assert.equal(r.plan_ready, false); assert.ok(r.errors.some(e => e.startsWith('CONTROLLED_PATCH_PLAN_BLOCKED_CONTRACT'))); console.log('  PASS: gate_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.plan_ready, false); assert.ok(r.errors.some(e => e.startsWith('CONTROLLED_PATCH_PLAN_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.plan_ready, true); console.log('  PASS: valid -> CONTROLLED_PATCH_PLAN_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v231.0'); console.log('  PASS: schema_version=v231.0'); },
  () => { const r = build(validInput()); assert.ok(r.plan_id); assert.ok(r.contract_id); assert.ok(r.gate_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.plan_steps)); assert.ok(r.plan_steps.length > 0); console.log('  PASS: plan_steps non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.step_count, r.plan_steps.length); console.log('  PASS: step_count matches plan_steps.length'); },
  () => { const r = build(validInput()); assert.ok(r.plan_hash && r.plan_hash.length === 64); console.log('  PASS: plan_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const r = build(validInput()); r.plan_steps.forEach(s => assert.equal(s.mode, 'controlled')); console.log('  PASS: all steps mode=controlled'); },

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
console.log('\n=== software-factory-controlled-patch-plan tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
