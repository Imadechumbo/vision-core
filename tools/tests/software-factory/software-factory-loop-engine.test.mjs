import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_LOOP_ENGINE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-loop-engine.mjs';

function validInput() {
  return {
    engine_id: 'le-v212-test',
    contract_id: 'sfc-v212-test',
    fork_manager_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_LOOP_ENGINE_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_LOOP_ENGINE_STATUSES.includes('LOOP_ENGINE_BLOCKED_INPUT')); console.log('  PASS: has LOOP_ENGINE_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_LOOP_ENGINE_STATUSES.includes('LOOP_ENGINE_BLOCKED_CONTRACT')); console.log('  PASS: has LOOP_ENGINE_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_LOOP_ENGINE_STATUSES.includes('LOOP_ENGINE_READY')); console.log('  PASS: has LOOP_ENGINE_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.engine_ready, false); assert.ok(r.errors.some(e => e.includes('LOOP_ENGINE_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.engine_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.engine_id; const r = build(input); assert.equal(r.engine_ready, false); console.log('  PASS: no engine_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.engine_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.fork_manager_ready = false; const r = build(input); assert.equal(r.engine_ready, false); assert.ok(r.errors.some(e => e.startsWith('LOOP_ENGINE_BLOCKED_CONTRACT'))); console.log('  PASS: fork_manager_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.engine_ready, false); assert.ok(r.errors.some(e => e.startsWith('LOOP_ENGINE_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.engine_ready, true); console.log('  PASS: valid -> LOOP_ENGINE_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v212.0'); console.log('  PASS: schema_version=v212.0'); },
  () => { const r = build(validInput()); assert.ok(r.engine_id); assert.ok(r.contract_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.loop_steps)); assert.ok(r.loop_steps.length > 0); console.log('  PASS: loop_steps non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.loop_count, r.loop_steps.length); console.log('  PASS: loop_count matches loop_steps.length'); },
  () => { const r = build(validInput()); assert.ok(r.engine_hash && r.engine_hash.length === 64); console.log('  PASS: engine_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const input = validInput(); input.loop_steps = ['step-a', 'step-b']; const r = build(input); assert.equal(r.loop_count, 2); assert.equal(r.loop_steps[0].step, 'step-a'); console.log('  PASS: custom loop_steps used when provided'); },
  () => { const r = build(validInput()); for (const s of r.loop_steps) { assert.ok(typeof s.index === 'number'); assert.ok(typeof s.step === 'string'); assert.equal(s.status, 'pending'); } console.log('  PASS: loop_steps have index, step, status=pending'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_allowed')); console.log('  PASS: render: contains release_allowed'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) { assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-loop-engine tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
