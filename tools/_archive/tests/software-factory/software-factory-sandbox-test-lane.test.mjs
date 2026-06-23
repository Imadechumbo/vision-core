import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_SANDBOX_TEST_LANE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-sandbox-test-lane.mjs';

function validInput() {
  return {
    lane_id: 'stl-v228-test',
    contract_id: 'sfc-v228-test',
    env_id: 'env-v228-test',
    env_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SANDBOX_TEST_LANE_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_SANDBOX_TEST_LANE_STATUSES.includes('SANDBOX_TEST_LANE_BLOCKED_INPUT')); console.log('  PASS: has SANDBOX_TEST_LANE_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SANDBOX_TEST_LANE_STATUSES.includes('SANDBOX_TEST_LANE_BLOCKED_CONTRACT')); console.log('  PASS: has SANDBOX_TEST_LANE_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SANDBOX_TEST_LANE_STATUSES.includes('SANDBOX_TEST_LANE_READY')); console.log('  PASS: has SANDBOX_TEST_LANE_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.lane_ready, false); assert.ok(r.errors.some(e => e.includes('SANDBOX_TEST_LANE_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.lane_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.lane_id; const r = build(input); assert.equal(r.lane_ready, false); console.log('  PASS: no lane_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.lane_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.env_id; const r = build(input); assert.equal(r.lane_ready, false); console.log('  PASS: no env_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.env_ready = false; const r = build(input); assert.equal(r.lane_ready, false); assert.ok(r.errors.some(e => e.startsWith('SANDBOX_TEST_LANE_BLOCKED_CONTRACT'))); console.log('  PASS: env_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.lane_ready, false); assert.ok(r.errors.some(e => e.startsWith('SANDBOX_TEST_LANE_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.lane_ready, true); console.log('  PASS: valid -> SANDBOX_TEST_LANE_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v228.0'); console.log('  PASS: schema_version=v228.0'); },
  () => { const r = build(validInput()); assert.ok(r.lane_id); assert.ok(r.contract_id); assert.ok(r.env_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.test_steps)); assert.ok(r.test_steps.length > 0); console.log('  PASS: test_steps non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.step_count, r.test_steps.length); console.log('  PASS: step_count matches test_steps.length'); },
  () => { const r = build(validInput()); assert.ok(r.lane_hash && r.lane_hash.length === 64); console.log('  PASS: lane_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const r = build(validInput()); r.test_steps.forEach(s => assert.equal(s.mode, 'sandbox')); console.log('  PASS: all steps mode=sandbox'); },

  () => { const input = validInput(); input.test_steps = [{step:'custom_check',mode:'sandbox'}]; const r = build(input); assert.equal(r.step_count, 1); console.log('  PASS: custom test_steps used'); },

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
console.log('\n=== software-factory-sandbox-test-lane tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
