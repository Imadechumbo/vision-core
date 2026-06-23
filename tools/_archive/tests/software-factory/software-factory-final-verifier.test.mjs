import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_FINAL_VERIFIER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-verifier.mjs';

function validInput() {
  return {
    contract_id: 'sfc-v205-test',
    scope_inspector_id: 'scope-v205-test',
    recipe_engine_id: 'recipe-v205-test',
    build_pipeline_id: 'build-v205-test',
    step_results: [
      { file_path: 'tools/software-factory/feature.mjs', status: 'built' },
      { file_path: 'tools/software-factory/index.mjs', status: 'built' },
    ],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_FINAL_VERIFIER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_FINAL_VERIFIER_STATUSES.includes('FINAL_VERIFIER_BLOCKED_INPUT'));
    console.log('  PASS: has FINAL_VERIFIER_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_FINAL_VERIFIER_STATUSES.includes('FINAL_VERIFIER_BLOCKED_VERIFICATION'));
    console.log('  PASS: has FINAL_VERIFIER_BLOCKED_VERIFICATION');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_FINAL_VERIFIER_STATUSES.includes('FINAL_VERIFIER_FAIL'));
    console.log('  PASS: has FINAL_VERIFIER_FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_FINAL_VERIFIER_STATUSES.includes('FINAL_VERIFIER_READY'));
    console.log('  PASS: has FINAL_VERIFIER_READY');
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
    assert.equal(r.verification_valid, false);
    assert.ok(r.errors.includes('FINAL_VERIFIER_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build(null);
    assert.equal(r.release_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    assert.equal(r.total_steps, 0);
    console.log('  PASS: null: all flags false');
  },
  () => {
    const r = build({});
    assert.equal(r.verification_valid, false);
    assert.ok(r.errors[0].startsWith('FINAL_VERIFIER_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ contract_id: 'c', scope_inspector_id: 's', recipe_engine_id: 'r', build_pipeline_id: 'b', step_results: [] });
    assert.equal(r.verification_valid, false);
    assert.ok(r.errors[0].startsWith('FINAL_VERIFIER_BLOCKED_VERIFICATION'));
    console.log('  PASS: empty step_results -> BLOCKED_VERIFICATION');
  },

  // --- blocked verification ---
  () => {
    const input = validInput();
    input.step_results.push({ file_path: 'x.mjs', status: 'unknown' });
    const r = build(input);
    assert.equal(r.verification_valid, false);
    assert.ok(r.errors.some(e => e.startsWith('FINAL_VERIFIER_BLOCKED_VERIFICATION')));
    console.log('  PASS: invalid status -> BLOCKED_VERIFICATION');
  },
  () => {
    const input = validInput();
    input.step_results.push({ status: 'built' });
    const r = build(input);
    assert.equal(r.verification_valid, false);
    console.log('  PASS: missing file_path -> BLOCKED_VERIFICATION');
  },
  () => {
    const input = validInput();
    input.step_results.push(null);
    const r = build(input);
    assert.equal(r.verification_valid, false);
    console.log('  PASS: null step_result -> BLOCKED_VERIFICATION');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.step_results.push({ file_path: 'tools/software-factory/fail.mjs', status: 'failed' });
    const r = build(input);
    assert.equal(r.verification_valid, false);
    assert.ok(r.errors.some(e => e.startsWith('FINAL_VERIFIER_FAIL')));
    assert.equal(r.failed_steps, 1);
    assert.equal(r.built_steps, 2);
    console.log('  PASS: failed step -> FINAL_VERIFIER_FAIL');
  },
  () => {
    const input = validInput();
    input.step_results.push({ file_path: 'tools/software-factory/a.mjs', status: 'failed' });
    input.step_results.push({ file_path: 'tools/software-factory/b.mjs', status: 'failed' });
    const r = build(input);
    assert.equal(r.verification_valid, false);
    assert.equal(r.failed_steps, 2);
    assert.equal(r.built_steps, 2);
    console.log('  PASS: multiple failed -> FINAL_VERIFIER_FAIL');
  },
  () => {
    const input = validInput();
    input.step_results.push({ file_path: 'tools/software-factory/skip.mjs', status: 'skipped' });
    const r = build(input);
    assert.equal(r.verification_valid, true);
    assert.equal(r.built_steps, 2);
    assert.equal(r.failed_steps, 0);
    console.log('  PASS: skipped step does not cause fail');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.verification_valid, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v205.0');
    console.log('  PASS: valid -> FINAL_VERIFIER_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.final_verifier_id);
    console.log('  PASS: ready: final_verifier_id set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.total_steps, 2);
    assert.equal(r.built_steps, 2);
    assert.equal(r.failed_steps, 0);
    console.log('  PASS: ready: step counts correct');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.verification_hash);
    assert.equal(r.verification_hash.length, 64);
    console.log('  PASS: ready: verification_hash 64 chars');
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
    assert.equal(r1.verification_hash, r2.verification_hash);
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
    assert.ok(r.includes('FINAL_VERIFIER_READY'));
    console.log('  PASS: render: is string');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('REGRA ABSOLUTA'));
    console.log('  PASS: render: contains REGRA ABSOLUTA');
  },
  () => {
    const input = validInput();
    input.step_results.push({ file_path: 'x.mjs', status: 'failed' });
    const r = render(build(input));
    assert.ok(r.includes('FINAL_VERIFIER_FAIL'));
    console.log('  PASS: render fail: contains FINAL_VERIFIER_FAIL');
  },
  () => {
    const input = validInput();
    input.step_results.push({ file_path: 'x.mjs', status: 'unknown' });
    const r = render(build(input));
    assert.ok(r.includes('FINAL_VERIFIER_BLOCKED_VERIFICATION'));
    console.log('  PASS: render blocked: contains BLOCKED_VERIFICATION');
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
  console.log('\n=== software-factory-final-verifier tests ===\n');
  console.log('--- exports ---');
  let passed = 0;
  let failed = 0;
  for (let i = 0; i < 8; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- blocked input ---');
  for (let i = 8; i < 12; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- blocked verification ---');
  for (let i = 12; i < 15; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- fail ---');
  for (let i = 15; i < 18; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- ready ---');
  for (let i = 18; i < 24; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- validate ---');
  for (let i = 24; i < 27; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- render ---');
  for (let i = 27; i < 32; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- invariants ---');
  for (let i = 32; i < 34; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
