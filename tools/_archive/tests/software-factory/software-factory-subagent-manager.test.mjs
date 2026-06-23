import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_SUBAGENT_MANAGER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-subagent-manager.mjs';

function validInput() {
  return {
    manager_id: 'sm-v210-test',
    contract_id: 'sfc-v210-test',
    policy_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  // --- exports ---
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SUBAGENT_MANAGER_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUBAGENT_MANAGER_STATUSES.includes('SUBAGENT_MANAGER_BLOCKED_INPUT')); console.log('  PASS: has SUBAGENT_MANAGER_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUBAGENT_MANAGER_STATUSES.includes('SUBAGENT_MANAGER_BLOCKED_CONTRACT')); console.log('  PASS: has SUBAGENT_MANAGER_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SUBAGENT_MANAGER_STATUSES.includes('SUBAGENT_MANAGER_READY')); console.log('  PASS: has SUBAGENT_MANAGER_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  // --- blocked input ---
  () => { const r = build(null); assert.equal(r.manager_ready, false); assert.ok(r.errors.some(e => e.includes('SUBAGENT_MANAGER_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.manager_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.manager_id; const r = build(input); assert.equal(r.manager_ready, false); console.log('  PASS: no manager_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.manager_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },

  // --- blocked contract ---
  () => { const input = validInput(); input.policy_ready = false; const r = build(input); assert.equal(r.manager_ready, false); assert.ok(r.errors.some(e => e.startsWith('SUBAGENT_MANAGER_BLOCKED_CONTRACT'))); console.log('  PASS: policy_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.manager_ready, false); assert.ok(r.errors.some(e => e.startsWith('SUBAGENT_MANAGER_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  // --- ready ---
  () => { const r = build(validInput()); assert.equal(r.manager_ready, true); console.log('  PASS: valid -> SUBAGENT_MANAGER_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v210.0'); console.log('  PASS: ready: schema_version=v210.0'); },
  () => { const r = build(validInput()); assert.ok(r.manager_id); assert.ok(r.contract_id); console.log('  PASS: ready: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.subagents)); assert.ok(r.subagents.length > 0); console.log('  PASS: ready: subagents non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.subagent_count, r.subagents.length); console.log('  PASS: ready: subagent_count matches subagents.length'); },
  () => { const r = build(validInput()); assert.ok(r.manager_hash && r.manager_hash.length === 64); console.log('  PASS: ready: manager_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: ready: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: ready: errors empty'); },
  () => {
    const input = validInput();
    input.subagents = ['agent-x', 'agent-y', 'agent-z'];
    const r = build(input);
    assert.equal(r.subagent_count, 3);
    assert.equal(r.subagents[0].name, 'agent-x');
    console.log('  PASS: ready: custom subagents used when provided');
  },
  () => {
    const r = build(validInput());
    for (const s of r.subagents) {
      assert.ok(typeof s.index === 'number');
      assert.ok(typeof s.name === 'string');
      assert.ok(typeof s.type === 'string');
      assert.equal(s.status, 'idle');
    }
    console.log('  PASS: ready: subagents have index, name, type, status=idle');
  },

  // --- validate ---
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate ready: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  // --- render ---
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_allowed')); console.log('  PASS: render: contains release_allowed'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  // --- invariants ---
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
console.log('\n=== software-factory-subagent-manager tests ===\n');
console.log('--- exports ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
