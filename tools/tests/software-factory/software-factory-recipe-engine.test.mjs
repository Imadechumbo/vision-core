import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_RECIPE_ENGINE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-recipe-engine.mjs';

function validInput() {
  return {
    contract_id: 'sfc-v203-test',
    scope_inspector_id: 'scope-v203-test',
    recipes: [
      { op: 'create_file', file_path: 'tools/software-factory/feature.mjs', description: 'Create feature module' },
      { op: 'modify_file', file_path: 'tools/software-factory/index.mjs', description: 'Export new module' },
    ],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_RECIPE_ENGINE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RECIPE_ENGINE_STATUSES.includes('RECIPE_ENGINE_BLOCKED_INPUT'));
    console.log('  PASS: has RECIPE_ENGINE_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RECIPE_ENGINE_STATUSES.includes('RECIPE_ENGINE_BLOCKED_RECIPE'));
    console.log('  PASS: has RECIPE_ENGINE_BLOCKED_RECIPE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RECIPE_ENGINE_STATUSES.includes('RECIPE_ENGINE_READY'));
    console.log('  PASS: has RECIPE_ENGINE_READY');
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
    assert.equal(r.recipe_valid, false);
    assert.ok(r.errors.includes('RECIPE_ENGINE_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build(null);
    assert.equal(r.release_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    assert.equal(r.recipe_count, 0);
    console.log('  PASS: null: all flags false');
  },
  () => {
    const r = build({});
    assert.equal(r.recipe_valid, false);
    assert.ok(r.errors[0].startsWith('RECIPE_ENGINE_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ contract_id: 'c', scope_inspector_id: 's', recipes: [] });
    assert.equal(r.recipe_valid, false);
    assert.ok(r.errors[0].startsWith('RECIPE_ENGINE_BLOCKED_RECIPE'));
    console.log('  PASS: empty recipes -> BLOCKED_RECIPE');
  },

  // --- blocked recipe ---
  () => {
    const input = validInput();
    input.recipes.push({ op: 'invalid_op', file_path: 'x.mjs', description: 'bad' });
    const r = build(input);
    assert.equal(r.recipe_valid, false);
    assert.ok(r.errors.some(e => e.startsWith('RECIPE_ENGINE_BLOCKED_RECIPE')));
    console.log('  PASS: invalid op -> BLOCKED_RECIPE');
  },
  () => {
    const input = validInput();
    input.recipes.push({ op: 'create_file', description: 'no path' });
    const r = build(input);
    assert.equal(r.recipe_valid, false);
    console.log('  PASS: missing file_path -> BLOCKED_RECIPE');
  },
  () => {
    const input = validInput();
    input.recipes.push({ op: 'create_file', file_path: 'x.mjs' });
    const r = build(input);
    assert.equal(r.recipe_valid, false);
    console.log('  PASS: missing description -> BLOCKED_RECIPE');
  },
  () => {
    const input = validInput();
    input.recipes.push(null);
    const r = build(input);
    assert.equal(r.recipe_valid, false);
    console.log('  PASS: null recipe -> BLOCKED_RECIPE');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.recipe_valid, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v203.0');
    console.log('  PASS: valid -> RECIPE_ENGINE_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.recipe_engine_id);
    console.log('  PASS: ready: recipe_engine_id set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.contract_id, 'sfc-v203-test');
    console.log('  PASS: ready: contract_id set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.recipe_count, 2);
    console.log('  PASS: ready: recipe_count correct');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.recipe_hash);
    assert.equal(r.recipe_hash.length, 64);
    console.log('  PASS: ready: recipe_hash 64 chars');
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
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.recipe_hash, r2.recipe_hash);
    console.log('  PASS: ready: hash deterministic');
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
    const r = build(null);
    const v = validate(r);
    assert.equal(v.valid, false);
    console.log('  PASS: validate blocked: valid=false');
  },

  // --- render ---
  () => {
    const r = render(build(validInput()));
    assert.equal(typeof r, 'string');
    assert.ok(r.includes('RECIPE_ENGINE_READY'));
    console.log('  PASS: render: is string');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('REGRA ABSOLUTA'));
    console.log('  PASS: render: contains REGRA ABSOLUTA');
  },
  () => {
    const input = validInput();
    input.recipes.push({ op: 'bad_op', file_path: 'x', description: 'y' });
    const r = render(build(input));
    assert.ok(r.includes('RECIPE_ENGINE_BLOCKED_RECIPE'));
    console.log('  PASS: render blocked: contains BLOCKED_RECIPE');
  },
  () => {
    const r = render(null);
    assert.equal(typeof r, 'string');
    console.log('  PASS: render null: returns string');
  },

  // --- invariants ---
  () => {
    const r = build(validInput());
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    console.log('  PASS: ready: flags false');
  },
  () => {
    const r = build(null);
    assert.equal(r.release_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    console.log('  PASS: blocked: flags false');
  },
];

function run() {
  console.log('\n=== software-factory-recipe-engine tests ===\n');
  console.log('--- exports ---');
  let passed = 0;
  let failed = 0;
  for (let i = 0; i < 7; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- blocked input ---');
  for (let i = 7; i < 11; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- blocked recipe ---');
  for (let i = 11; i < 15; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- ready ---');
  for (let i = 15; i < 22; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- validate ---');
  for (let i = 22; i < 25; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- render ---');
  for (let i = 25; i < 29; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- invariants ---');
  for (let i = 29; i < 31; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
