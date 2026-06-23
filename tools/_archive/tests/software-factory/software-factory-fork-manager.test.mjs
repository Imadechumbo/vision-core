import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_FORK_MANAGER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-fork-manager.mjs';

function validInput() {
  return {
    fork_manager_id: 'fm-v211-test',
    contract_id: 'sfc-v211-test',
    manager_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_FORK_MANAGER_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_FORK_MANAGER_STATUSES.includes('FORK_MANAGER_BLOCKED_INPUT')); console.log('  PASS: has FORK_MANAGER_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_FORK_MANAGER_STATUSES.includes('FORK_MANAGER_BLOCKED_CONTRACT')); console.log('  PASS: has FORK_MANAGER_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_FORK_MANAGER_STATUSES.includes('FORK_MANAGER_READY')); console.log('  PASS: has FORK_MANAGER_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.fork_manager_ready, false); assert.ok(r.errors.some(e => e.includes('FORK_MANAGER_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.fork_manager_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.fork_manager_id; const r = build(input); assert.equal(r.fork_manager_ready, false); console.log('  PASS: no fork_manager_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.fork_manager_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.manager_ready = false; const r = build(input); assert.equal(r.fork_manager_ready, false); assert.ok(r.errors.some(e => e.startsWith('FORK_MANAGER_BLOCKED_CONTRACT'))); console.log('  PASS: manager_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.fork_manager_ready, false); assert.ok(r.errors.some(e => e.startsWith('FORK_MANAGER_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.fork_manager_ready, true); console.log('  PASS: valid -> FORK_MANAGER_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v211.0'); console.log('  PASS: schema_version=v211.0'); },
  () => { const r = build(validInput()); assert.ok(r.fork_manager_id); assert.ok(r.contract_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.forks)); assert.ok(r.forks.length > 0); console.log('  PASS: forks non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.fork_count, r.forks.length); console.log('  PASS: fork_count matches forks.length'); },
  () => { const r = build(validInput()); assert.ok(r.fork_manager_hash && r.fork_manager_hash.length === 64); console.log('  PASS: fork_manager_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => {
    const input = validInput();
    input.forks = ['fork-a', 'fork-b'];
    const r = build(input);
    assert.equal(r.fork_count, 2);
    assert.equal(r.forks[0].name, 'fork-a');
    console.log('  PASS: custom forks used when provided');
  },
  () => {
    const r = build(validInput());
    for (const f of r.forks) {
      assert.ok(typeof f.index === 'number');
      assert.ok(typeof f.name === 'string');
      assert.ok(typeof f.branch === 'string');
      assert.equal(f.status, 'pending');
    }
    console.log('  PASS: forks have index, name, branch, status=pending');
  },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_allowed')); console.log('  PASS: render: contains release_allowed'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
      assert.equal(r.release_allowed, false);
      assert.equal(r.deploy_allowed, false);
      assert.equal(r.stable_allowed, false);
      assert.equal(r.tag_allowed, false);
      assert.equal(r.real_execution_allowed, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0;
let failed = 0;
console.log('\n=== software-factory-fork-manager tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
