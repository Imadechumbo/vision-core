import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PATCH_CONTROLLER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-patch-controller.mjs';

function validInput() {
  return {
    controller_id: 'pc-v213-test',
    contract_id: 'sfc-v213-test',
    engine_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PATCH_CONTROLLER_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PATCH_CONTROLLER_STATUSES.includes('PATCH_CONTROLLER_BLOCKED_INPUT')); console.log('  PASS: has PATCH_CONTROLLER_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PATCH_CONTROLLER_STATUSES.includes('PATCH_CONTROLLER_BLOCKED_CONTRACT')); console.log('  PASS: has PATCH_CONTROLLER_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PATCH_CONTROLLER_STATUSES.includes('PATCH_CONTROLLER_READY')); console.log('  PASS: has PATCH_CONTROLLER_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.controller_ready, false); assert.ok(r.errors.some(e => e.includes('PATCH_CONTROLLER_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.controller_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.controller_id; const r = build(input); assert.equal(r.controller_ready, false); console.log('  PASS: no controller_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.controller_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.engine_ready = false; const r = build(input); assert.equal(r.controller_ready, false); assert.ok(r.errors.some(e => e.startsWith('PATCH_CONTROLLER_BLOCKED_CONTRACT'))); console.log('  PASS: engine_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.controller_ready, false); assert.ok(r.errors.some(e => e.startsWith('PATCH_CONTROLLER_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.controller_ready, true); console.log('  PASS: valid -> PATCH_CONTROLLER_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v213.0'); console.log('  PASS: schema_version=v213.0'); },
  () => { const r = build(validInput()); assert.ok(r.controller_id); assert.ok(r.contract_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.patches)); assert.ok(r.patches.length > 0); console.log('  PASS: patches non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.patch_count, r.patches.length); console.log('  PASS: patch_count matches patches.length'); },
  () => { const r = build(validInput()); assert.ok(r.controller_hash && r.controller_hash.length === 64); console.log('  PASS: controller_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const input = validInput(); input.patches = ['file-a.mjs', 'file-b.mjs']; const r = build(input); assert.equal(r.patch_count, 2); assert.equal(r.patches[0].file, 'file-a.mjs'); console.log('  PASS: custom patches used when provided'); },
  () => { const r = build(validInput()); for (const p of r.patches) { assert.ok(typeof p.index === 'number'); assert.ok(typeof p.file === 'string'); assert.ok(typeof p.op === 'string'); assert.equal(p.status, 'pending'); } console.log('  PASS: patches have index, file, op, status=pending'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_allowed')); console.log('  PASS: render: contains release_allowed'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_patch_execution_allowed')); console.log('  PASS: render: contains real_patch_execution_allowed'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) { assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-patch-controller tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
