import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_SCOPE_INSPECTOR_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-scope-inspector.mjs';

const ALLOWED = ['tools/software-factory/*', 'tools/tests/software-factory/*'];
const FORBIDDEN = ['tools/release/*', 'tools/tag/*', 'tools/deployment/*', 'tools/stable/*'];

function validInput() {
  return {
    contract_id: 'sfc-v202-test',
    proposed_changes: [
      'tools/software-factory/scope-inspector.mjs',
      'tools/tests/software-factory/scope-inspector.test.mjs',
    ],
    allowed_files: ALLOWED,
    forbidden_files: FORBIDDEN,
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_SCOPE_INSPECTOR_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_SCOPE_INSPECTOR_STATUSES.includes('SCOPE_INSPECTOR_BLOCKED_INPUT'));
    console.log('  PASS: has SCOPE_INSPECTOR_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_SCOPE_INSPECTOR_STATUSES.includes('SCOPE_INSPECTOR_BLOCKED_SCOPE'));
    console.log('  PASS: has SCOPE_INSPECTOR_BLOCKED_SCOPE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_SCOPE_INSPECTOR_STATUSES.includes('SCOPE_INSPECTOR_READY'));
    console.log('  PASS: has SCOPE_INSPECTOR_READY');
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
    assert.equal(r.scope_valid, false);
    assert.ok(r.errors.includes('SCOPE_INSPECTOR_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build(null);
    assert.equal(r.contract_id, null);
    assert.equal(r.release_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    console.log('  PASS: null: all flags false');
  },
  () => {
    const r = build({});
    assert.equal(r.scope_valid, false);
    assert.ok(r.errors[0].startsWith('SCOPE_INSPECTOR_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ contract_id: 'c', proposed_changes: [] });
    assert.equal(r.scope_valid, false);
    assert.ok(r.errors[0].startsWith('SCOPE_INSPECTOR_BLOCKED_SCOPE'));
    console.log('  PASS: no allowed_files -> BLOCKED_SCOPE');
  },

  // --- blocked scope ---
  () => {
    const input = validInput();
    input.proposed_changes.push('tools/release/production-tag.mjs');
    const r = build(input);
    assert.equal(r.scope_valid, false);
    assert.ok(r.errors.some(e => e.startsWith('SCOPE_INSPECTOR_BLOCKED_SCOPE')));
    assert.equal(r.matched_forbidden.length, 1);
    assert.equal(r.matched_forbidden[0].file, 'tools/release/production-tag.mjs');
    console.log('  PASS: forbidden file -> BLOCKED_SCOPE');
  },
  () => {
    const input = validInput();
    input.proposed_changes.push('tools/release/production-tag.mjs');
    input.proposed_changes.push('tools/tests/scope.test.mjs');
    const r = build(input);
    assert.equal(r.scope_valid, false);
    assert.equal(r.matched_forbidden.length, 1);
    assert.ok(r.matched_allowed.some(m => m.file === 'tools/tests/scope.test.mjs'));
    console.log('  PASS: mixed allowed+forbidden: allowed matched, forbidden blocked');
  },
  () => {
    const input = validInput();
    input.proposed_changes = ['tools/stable/promote.mjs'];
    const r = build(input);
    assert.equal(r.scope_valid, false);
    assert.equal(r.matched_forbidden.length, 1);
    console.log('  PASS: stable file -> BLOCKED_SCOPE');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.scope_valid, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v202.0');
    console.log('  PASS: valid -> SCOPE_INSPECTOR_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.scope_inspector_id);
    console.log('  PASS: ready: scope_inspector_id set');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.contract_id);
    console.log('  PASS: ready: contract_id set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.proposed_changes.length, 2);
    console.log('  PASS: ready: proposed_changes size correct');
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
    assert.equal(r.matched_allowed.length, 2);
    console.log('  PASS: ready: matched_allowed count');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.matched_forbidden.length, 0);
    console.log('  PASS: ready: matched_forbidden zero');
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
    assert.ok(r.includes('SCOPE_INSPECTOR_READY'));
    console.log('  PASS: render: is string');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('REGRA ABSOLUTA'));
    console.log('  PASS: render: contains REGRA ABSOLUTA');
  },
  () => {
    const input = validInput();
    input.proposed_changes.push('tools/release/x.mjs');
    const r = render(build(input));
    assert.ok(r.includes('SCOPE_INSPECTOR_BLOCKED_SCOPE'));
    console.log('  PASS: render blocked: contains SCOPE_INSPECTOR_BLOCKED_SCOPE');
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
    console.log('  PASS: ready: release_allowed=false');
  },
  () => {
    const r = build(null);
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    console.log('  PASS: blocked: all flags false');
  },
  () => {
    const input = validInput();
    input.proposed_changes.push('tools/stable/promote.mjs');
    const r = build(input);
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    console.log('  PASS: scope blocked: all flags false');
  },
];

function run() {
  console.log('\n=== software-factory-scope-inspector tests ===\n');
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
  console.log('--- blocked scope ---');
  for (let i = 11; i < 14; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- ready ---');
  for (let i = 14; i < 21; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- validate ---');
  for (let i = 21; i < 24; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- render ---');
  for (let i = 24; i < 28; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log('--- invariants ---');
  for (let i = 28; i < 31; i++) {
    try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
