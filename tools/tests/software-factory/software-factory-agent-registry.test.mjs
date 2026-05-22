import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_AGENT_REGISTRY_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-agent-registry.mjs';

function validInput() {
  return {
    registry_id: 'ar-v208-test',
    contract_id: 'sfc-v208-test',
    plan_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_AGENT_REGISTRY_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_AGENT_REGISTRY_STATUSES.includes('AGENT_REGISTRY_BLOCKED_INPUT'));
    console.log('  PASS: has AGENT_REGISTRY_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_AGENT_REGISTRY_STATUSES.includes('AGENT_REGISTRY_BLOCKED_CONTRACT'));
    console.log('  PASS: has AGENT_REGISTRY_BLOCKED_CONTRACT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_AGENT_REGISTRY_STATUSES.includes('AGENT_REGISTRY_READY'));
    console.log('  PASS: has AGENT_REGISTRY_READY');
  },
  () => {
    assert.equal(typeof build, 'function');
    console.log('  PASS: build is function');
  },
  () => {
    assert.equal(typeof validate, 'function');
    console.log('  PASS: validate is function');
  },
  () => {
    assert.equal(typeof render, 'function');
    console.log('  PASS: render is function');
  },

  // --- blocked input ---
  () => {
    const r = build(null);
    assert.equal(r.registry_ready, false);
    assert.ok(r.errors.some(e => e.includes('AGENT_REGISTRY_BLOCKED_INPUT')));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build(null);
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    console.log('  PASS: null: all flags false');
  },
  () => {
    const r = build({});
    assert.equal(r.registry_ready, false);
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const input = validInput();
    delete input.registry_id;
    const r = build(input);
    assert.equal(r.registry_ready, false);
    assert.ok(r.errors.some(e => e.includes('AGENT_REGISTRY_BLOCKED_INPUT')));
    console.log('  PASS: no registry_id -> BLOCKED_INPUT');
  },
  () => {
    const input = validInput();
    delete input.contract_id;
    const r = build(input);
    assert.equal(r.registry_ready, false);
    assert.ok(r.errors.some(e => e.includes('AGENT_REGISTRY_BLOCKED_INPUT')));
    console.log('  PASS: no contract_id -> BLOCKED_INPUT');
  },

  // --- blocked contract ---
  () => {
    const input = validInput();
    input.plan_ready = false;
    const r = build(input);
    assert.equal(r.registry_ready, false);
    assert.ok(r.errors.some(e => e.startsWith('AGENT_REGISTRY_BLOCKED_CONTRACT')));
    console.log('  PASS: plan_ready=false -> BLOCKED_CONTRACT');
  },
  () => {
    const input = validInput();
    input.scope_validated = false;
    const r = build(input);
    assert.equal(r.registry_ready, false);
    assert.ok(r.errors.some(e => e.startsWith('AGENT_REGISTRY_BLOCKED_CONTRACT')));
    console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.registry_ready, true);
    console.log('  PASS: valid -> AGENT_REGISTRY_READY');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.schema_version, 'v208.0');
    console.log('  PASS: ready: schema_version=v208.0');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.registry_id);
    assert.ok(r.contract_id);
    console.log('  PASS: ready: ids set');
  },
  () => {
    const r = build(validInput());
    assert.ok(Array.isArray(r.agents));
    assert.ok(r.agents.length > 0);
    console.log('  PASS: ready: agents non-empty');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.agent_count, r.agents.length);
    console.log('  PASS: ready: agent_count matches agents.length');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.registry_hash && r.registry_hash.length === 64);
    console.log('  PASS: ready: registry_hash 64 chars');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    console.log('  PASS: ready: all flags false');
  },
  () => {
    const r = build(validInput());
    assert.deepEqual(r.errors, []);
    console.log('  PASS: ready: errors empty');
  },
  () => {
    const input = validInput();
    input.agents = ['agent-alpha', 'agent-beta'];
    const r = build(input);
    assert.equal(r.agent_count, 2);
    assert.equal(r.agents[0].name, 'agent-alpha');
    assert.equal(r.agents[1].name, 'agent-beta');
    console.log('  PASS: ready: custom agents used when provided');
  },
  () => {
    const r = build(validInput());
    for (const a of r.agents) {
      assert.ok(typeof a.index === 'number');
      assert.ok(typeof a.name === 'string');
      assert.ok(typeof a.role === 'string');
      assert.equal(a.status, 'registered');
    }
    console.log('  PASS: ready: agents have index, name, role, status=registered');
  },

  // --- validate ---
  () => {
    const r = build(validInput());
    const v = validate(r);
    assert.equal(v.valid, true);
    console.log('  PASS: validate ready: valid=true');
  },
  () => {
    const r = build(validInput());
    const v = validate(r);
    assert.equal(v.errors.length, 0);
    console.log('  PASS: validate ready: no errors');
  },
  () => {
    const v = validate(null);
    assert.equal(v.valid, false);
    console.log('  PASS: validate null: valid=false');
  },

  // --- render ---
  () => {
    const r = render(build(validInput()));
    assert.equal(typeof r, 'string');
    console.log('  PASS: render: is string');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('REGRA ABSOLUTA'));
    console.log('  PASS: render: contains REGRA ABSOLUTA');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('release_allowed'));
    console.log('  PASS: render: contains release_allowed');
  },
  () => {
    const r = render(null);
    assert.equal(typeof r, 'string');
    console.log('  PASS: render null: returns string');
  },

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
console.log('\n=== software-factory-agent-registry tests ===\n');
console.log('--- exports ---');
for (const test of TESTS) {
  try {
    test();
    passed++;
  } catch (e) {
    console.log('  FAIL:', e.message);
    failed++;
  }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
