import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_SUPERVISED_PR_CREATION_DRILL_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-supervised-pr-creation-drill.mjs';

function validInput() {
  return {
    drill_id: 'spcd-v240-test',
    barrier_id: 'barrier-v240-test',
    pr_creation_barrier_ready: true,
    simulated_output: 'Simulated PR creation output for review.',
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SUPERVISED_PR_CREATION_DRILL_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUPERVISED_PR_CREATION_DRILL_STATUSES.includes('SUPERVISED_PR_DRILL_BLOCKED_INPUT')); console.log('  PASS: has SUPERVISED_PR_DRILL_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUPERVISED_PR_CREATION_DRILL_STATUSES.includes('SUPERVISED_PR_DRILL_BLOCKED_BARRIER')); console.log('  PASS: has SUPERVISED_PR_DRILL_BLOCKED_BARRIER'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUPERVISED_PR_CREATION_DRILL_STATUSES.includes('SUPERVISED_PR_DRILL_READY')); console.log('  PASS: has SUPERVISED_PR_DRILL_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.supervised_pr_drill_ready, false); assert.ok(r.errors.some(e => e.includes('SUPERVISED_PR_DRILL_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.real_pr_created, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.release_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.supervised_pr_drill_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.drill_id; const r = build(i); assert.equal(r.supervised_pr_drill_ready, false); console.log('  PASS: no drill_id -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.barrier_id; const r = build(i); assert.equal(r.supervised_pr_drill_ready, false); console.log('  PASS: no barrier_id -> BLOCKED_INPUT'); },

  () => { const i = validInput(); i.pr_creation_barrier_ready = false; const r = build(i); assert.equal(r.supervised_pr_drill_ready, false); assert.ok(r.errors.some(e => e.startsWith('SUPERVISED_PR_DRILL_BLOCKED_BARRIER'))); console.log('  PASS: barrier not ready -> BLOCKED_BARRIER'); },
  () => { const i = validInput(); delete i.simulated_output; const r = build(i); assert.equal(r.supervised_pr_drill_ready, false); assert.ok(r.errors.some(e => e.includes('simulated_output required'))); console.log('  PASS: no simulated_output -> BLOCKED_BARRIER'); },

  () => { const r = build(validInput()); assert.equal(r.supervised_pr_drill_ready, true); console.log('  PASS: valid -> SUPERVISED_PR_DRILL_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v240.0'); console.log('  PASS: schema_version=v240.0'); },
  () => { const r = build(validInput()); assert.ok(r.drill_id); assert.ok(r.barrier_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.equal(r.simulation_performed, true); console.log('  PASS: simulation_performed=true'); },
  () => { const r = build(validInput()); assert.equal(r.real_pr_created, false); console.log('  PASS: real_pr_created=false always'); },
  () => { const r = build(validInput()); assert.equal(r.real_pr_creation_allowed, false); console.log('  PASS: real_pr_creation_allowed=false'); },
  () => { const r = build(validInput()); assert.ok(r.drill_hash && r.drill_hash.length === 64); console.log('  PASS: drill_hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.drill_hash, r2.drill_hash); console.log('  PASS: hash deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate ready: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_creation_allowed')); console.log('  PASS: render: contains real_pr_creation_allowed'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_created')); console.log('  PASS: render: contains real_pr_created'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render null: returns string with REGRA ABSOLUTA'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
      assert.equal(r.real_pr_created, false);
      assert.equal(r.real_pr_creation_allowed, false);
      assert.equal(r.release_allowed, false);
      assert.equal(r.deploy_allowed, false);
      assert.equal(r.stable_allowed, false);
      assert.equal(r.tag_allowed, false);
      assert.equal(r.real_execution_allowed, false);
      assert.equal(r.production_touched, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-supervised-pr-creation-drill tests ===\n');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
