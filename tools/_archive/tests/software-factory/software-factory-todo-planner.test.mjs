import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_TODO_PLANNER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-todo-planner.mjs';

function validInput() {
  return {
    todo_planner_id: 'tp-v207-test',
    contract_id: 'sfc-v207-test',
    prompt_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_TODO_PLANNER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_TODO_PLANNER_STATUSES.includes('TODO_PLANNER_BLOCKED_INPUT'));
    console.log('  PASS: has TODO_PLANNER_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_TODO_PLANNER_STATUSES.includes('TODO_PLANNER_BLOCKED_CONTRACT'));
    console.log('  PASS: has TODO_PLANNER_BLOCKED_CONTRACT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_TODO_PLANNER_STATUSES.includes('TODO_PLANNER_READY'));
    console.log('  PASS: has TODO_PLANNER_READY');
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
    assert.equal(r.plan_ready, false);
    assert.ok(r.errors.some(e => e.includes('TODO_PLANNER_BLOCKED_INPUT')));
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
    assert.equal(r.plan_ready, false);
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const input = validInput();
    delete input.todo_planner_id;
    const r = build(input);
    assert.equal(r.plan_ready, false);
    assert.ok(r.errors.some(e => e.includes('TODO_PLANNER_BLOCKED_INPUT')));
    console.log('  PASS: no todo_planner_id -> BLOCKED_INPUT');
  },
  () => {
    const input = validInput();
    delete input.contract_id;
    const r = build(input);
    assert.equal(r.plan_ready, false);
    assert.ok(r.errors.some(e => e.includes('TODO_PLANNER_BLOCKED_INPUT')));
    console.log('  PASS: no contract_id -> BLOCKED_INPUT');
  },

  // --- blocked contract ---
  () => {
    const input = validInput();
    input.prompt_ready = false;
    const r = build(input);
    assert.equal(r.plan_ready, false);
    assert.ok(r.errors.some(e => e.startsWith('TODO_PLANNER_BLOCKED_CONTRACT')));
    console.log('  PASS: prompt_ready=false -> BLOCKED_CONTRACT');
  },
  () => {
    const input = validInput();
    input.scope_validated = false;
    const r = build(input);
    assert.equal(r.plan_ready, false);
    assert.ok(r.errors.some(e => e.startsWith('TODO_PLANNER_BLOCKED_CONTRACT')));
    console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.plan_ready, true);
    console.log('  PASS: valid -> TODO_PLANNER_READY');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.schema_version, 'v207.0');
    console.log('  PASS: ready: schema_version=v207.0');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.todo_planner_id);
    assert.ok(r.contract_id);
    console.log('  PASS: ready: ids set');
  },
  () => {
    const r = build(validInput());
    assert.ok(Array.isArray(r.todos));
    assert.ok(r.todos.length > 0);
    console.log('  PASS: ready: todos non-empty');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.todo_count, r.todos.length);
    console.log('  PASS: ready: todo_count matches todos.length');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.plan_hash && r.plan_hash.length === 64);
    console.log('  PASS: ready: plan_hash 64 chars');
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
    input.mission_todos = ['Step A', 'Step B', 'Step C'];
    const r = build(input);
    assert.equal(r.todo_count, 3);
    assert.equal(r.todos[0].task, 'Step A');
    assert.equal(r.todos[1].task, 'Step B');
    assert.equal(r.todos[2].task, 'Step C');
    console.log('  PASS: ready: mission_todos used when provided');
  },
  () => {
    const r = build(validInput());
    for (const t of r.todos) {
      assert.ok(typeof t.index === 'number');
      assert.ok(typeof t.task === 'string');
      assert.equal(t.status, 'pending');
    }
    console.log('  PASS: ready: todos have index, task, status=pending');
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
console.log('\n=== software-factory-todo-planner tests ===\n');
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
