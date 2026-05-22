import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PROMPT_BUILDER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-prompt-builder.mjs';

function validInput() {
  return {
    prompt_builder_id: 'pb-v206-test',
    contract_id: 'sfc-v206-test',
    mission_type: 'feature',
    scope_validated: true,
    safety_mode: true,
    allowed_tools: ['Read', 'Write', 'Edit'],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PROMPT_BUILDER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PROMPT_BUILDER_STATUSES.includes('PROMPT_BUILDER_BLOCKED_INPUT'));
    console.log('  PASS: has PROMPT_BUILDER_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PROMPT_BUILDER_STATUSES.includes('PROMPT_BUILDER_BLOCKED_CONTRACT'));
    console.log('  PASS: has PROMPT_BUILDER_BLOCKED_CONTRACT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PROMPT_BUILDER_STATUSES.includes('PROMPT_BUILDER_READY'));
    console.log('  PASS: has PROMPT_BUILDER_READY');
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
    assert.equal(r.prompt_ready, false);
    assert.ok(r.errors.includes('PROMPT_BUILDER_BLOCKED_INPUT'));
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
    assert.equal(r.prompt_ready, false);
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const input = validInput();
    delete input.prompt_builder_id;
    const r = build(input);
    assert.equal(r.prompt_ready, false);
    console.log('  PASS: no prompt_builder_id -> BLOCKED_INPUT');
  },
  () => {
    const input = validInput();
    delete input.mission_type;
    const r = build(input);
    assert.equal(r.prompt_ready, false);
    console.log('  PASS: no mission_type -> BLOCKED_INPUT');
  },

  // --- blocked contract ---
  () => {
    const input = validInput();
    input.scope_validated = false;
    const r = build(input);
    assert.equal(r.prompt_ready, false);
    assert.ok(r.errors.some(e => e.startsWith('PROMPT_BUILDER_BLOCKED_CONTRACT')));
    console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT');
  },
  () => {
    const input = validInput();
    input.safety_mode = false;
    const r = build(input);
    assert.equal(r.prompt_ready, false);
    assert.ok(r.errors.some(e => e.startsWith('PROMPT_BUILDER_BLOCKED_CONTRACT')));
    console.log('  PASS: safety_mode=false -> BLOCKED_CONTRACT');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.prompt_ready, true);
    console.log('  PASS: valid -> PROMPT_BUILDER_READY');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.schema_version, 'v206.0');
    console.log('  PASS: ready: schema_version=v206.0');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.prompt_builder_id);
    assert.ok(r.contract_id);
    console.log('  PASS: ready: ids set');
  },
  () => {
    const r = build(validInput());
    assert.ok(Array.isArray(r.prompt_sections));
    assert.ok(r.prompt_sections.length > 0);
    console.log('  PASS: ready: prompt_sections non-empty');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.prompt_hash && r.prompt_hash.length === 64);
    console.log('  PASS: ready: prompt_hash 64 chars');
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
console.log('\n=== software-factory-prompt-builder tests ===\n');
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
