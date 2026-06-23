import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_BUILD_PIPELINE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-build-pipeline.mjs';

function validInput() {
  return {
    contract_id: 'sfc-v204-test',
    scope_inspector_id: 'scope-v204-test',
    recipe_engine_id: 'recipe-v204-test',
    steps: [
      { op: 'create_file', file_path: 'tools/software-factory/feature.mjs', content_hash: 'a'.repeat(64) },
      { op: 'modify_file', file_path: 'tools/software-factory/index.mjs', content_hash: 'b'.repeat(64) },
    ],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_BUILD_PIPELINE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_BUILD_PIPELINE_STATUSES.includes('BUILD_PIPELINE_BLOCKED_INPUT'));
    console.log('  PASS: has BUILD_PIPELINE_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_BUILD_PIPELINE_STATUSES.includes('BUILD_PIPELINE_BLOCKED_STEPS'));
    console.log('  PASS: has BUILD_PIPELINE_BLOCKED_STEPS');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_BUILD_PIPELINE_STATUSES.includes('BUILD_PIPELINE_READY'));
    console.log('  PASS: has BUILD_PIPELINE_READY');
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
    assert.equal(r.pipeline_valid, false);
    assert.ok(r.errors.includes('BUILD_PIPELINE_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build(null);
    assert.equal(r.release_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    assert.equal(r.step_count, 0);
    console.log('  PASS: null: all flags false');
  },
  () => {
    const r = build({});
    assert.equal(r.pipeline_valid, false);
    assert.ok(r.errors[0].startsWith('BUILD_PIPELINE_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ contract_id: 'c', scope_inspector_id: 's', recipe_engine_id: 'r', steps: [] });
    assert.equal(r.pipeline_valid, false);
    assert.ok(r.errors[0].startsWith('BUILD_PIPELINE_BLOCKED_STEPS'));
    console.log('  PASS: empty steps -> BLOCKED_STEPS');
  },

  // --- blocked steps ---
  () => {
    const input = validInput();
    input.steps.push({ op: 'bad_op', file_path: 'x.mjs', content_hash: 'a'.repeat(64) });
    const r = build(input);
    assert.equal(r.pipeline_valid, false);
    assert.ok(r.errors.some(e => e.startsWith('BUILD_PIPELINE_BLOCKED_STEPS')));
    console.log('  PASS: invalid step obj -> BLOCKED_STEPS');
  },
  () => {
    const input = validInput();
    input.steps.push({ file_path: 'x.mjs', content_hash: 'a'.repeat(64) });
    const r = build(input);
    assert.equal(r.pipeline_valid, false);
    console.log('  PASS: missing op -> BLOCKED_STEPS');
  },
  () => {
    const input = validInput();
    input.steps.push({ op: 'create_file', content_hash: 'a'.repeat(64) });
    const r = build(input);
    assert.equal(r.pipeline_valid, false);
    console.log('  PASS: missing file_path -> BLOCKED_STEPS');
  },
  () => {
    const input = validInput();
    input.steps.push({ op: 'create_file', file_path: 'x.mjs' });
    const r = build(input);
    assert.equal(r.pipeline_valid, false);
    console.log('  PASS: missing content_hash -> BLOCKED_STEPS');
  },
  () => {
    const input = validInput();
    input.steps.push({ op: 'create_file', file_path: 'x.mjs', content_hash: 'not-64-chars' });
    const r = build(input);
    assert.equal(r.pipeline_valid, false);
    console.log('  PASS: invalid content_hash length -> BLOCKED_STEPS');
  },
  () => {
    const input = validInput();
    input.steps.push(null);
    const r = build(input);
    assert.equal(r.pipeline_valid, false);
    console.log('  PASS: null step -> BLOCKED_STEPS');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.pipeline_valid, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v204.0');
    console.log('  PASS: valid -> BUILD_PIPELINE_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.build_pipeline_id);
    console.log('  PASS: ready: build_pipeline_id set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.step_count, 2);
    console.log('  PASS: ready: step_count correct');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.pipeline_hash);
    assert.equal(r.pipeline_hash.length, 64);
    console.log('  PASS: ready: pipeline_hash 64 chars');
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
    assert.equal(r1.pipeline_hash, r2.pipeline_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.steps.length, 2);
    assert.equal(r.steps[0].status, 'pending');
    assert.equal(r.steps[1].status, 'pending');
    console.log('  PASS: ready: all steps status=pending');
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
    assert.ok(r.includes('BUILD_PIPELINE_READY'));
    console.log('  PASS: render: is string');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('REGRA ABSOLUTA'));
    console.log('  PASS: render: contains REGRA ABSOLUTA');
  },
  () => {
    const input = validInput();
    input.steps.push({ op: '', file_path: 'x', content_hash: 'a'.repeat(64) });
    const r = render(build(input));
    assert.ok(r.includes('BUILD_PIPELINE_BLOCKED_STEPS'));
    console.log('  PASS: render blocked: contains BLOCKED_STEPS');
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
  console.log('\n=== software-factory-build-pipeline tests ===\n');
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
  console.log('--- blocked steps ---');
  for (let i = 11; i < 17; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- ready ---');
  for (let i = 17; i < 24; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- validate ---');
  for (let i = 24; i < 27; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- render ---');
  for (let i = 27; i < 31; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- invariants ---');
  for (let i = 31; i < 33; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
