import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_CONTROLLER_DRY_RUN_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-controller-dry-run.mjs';

function validInput() {
  return {
    dry_run_id: 'dr-v223-test',
    contract_id: 'sfc-v223-test',
    binding_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_CONTROLLER_DRY_RUN_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_CONTROLLER_DRY_RUN_STATUSES.includes('PR_CONTROLLER_DRY_RUN_BLOCKED_INPUT')); console.log('  PASS: has PR_CONTROLLER_DRY_RUN_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_CONTROLLER_DRY_RUN_STATUSES.includes('PR_CONTROLLER_DRY_RUN_BLOCKED_CONTRACT')); console.log('  PASS: has PR_CONTROLLER_DRY_RUN_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_CONTROLLER_DRY_RUN_STATUSES.includes('PR_CONTROLLER_DRY_RUN_READY')); console.log('  PASS: has PR_CONTROLLER_DRY_RUN_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.dry_run_ready, false); assert.ok(r.errors.some(e => e.includes('PR_CONTROLLER_DRY_RUN_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.dry_run_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.dry_run_id; const r = build(input); assert.equal(r.dry_run_ready, false); console.log('  PASS: no dry_run_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.dry_run_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.binding_ready = false; const r = build(input); assert.equal(r.dry_run_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_CONTROLLER_DRY_RUN_BLOCKED_CONTRACT'))); console.log('  PASS: binding_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.dry_run_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_CONTROLLER_DRY_RUN_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.dry_run_ready, true); console.log('  PASS: valid -> PR_CONTROLLER_DRY_RUN_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v223.0'); console.log('  PASS: schema_version=v223.0'); },
  () => { const r = build(validInput()); assert.ok(r.dry_run_id); assert.ok(r.contract_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.dry_run_steps)); assert.ok(r.dry_run_steps.length > 0); console.log('  PASS: dry_run_steps non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.step_count, r.dry_run_steps.length); console.log('  PASS: step_count matches dry_run_steps.length'); },
  () => { const r = build(validInput()); assert.equal(r.dry_run_completed, false); console.log('  PASS: dry_run_completed=false by default'); },
  () => { const r = build(validInput()); assert.equal(r.real_pr_creation_allowed, false); console.log('  PASS: real_pr_creation_allowed=false'); },
  () => { const r = build(validInput()); assert.ok(r.dry_run_hash && r.dry_run_hash.length === 64); console.log('  PASS: dry_run_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const r = build(validInput()); for (const s of r.dry_run_steps) { assert.equal(s.mode, 'dry_run'); } console.log('  PASS: all steps in dry_run mode'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_creation_allowed')); console.log('  PASS: render: contains real_pr_creation_allowed'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) { assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.dry_run_completed, false); }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-pr-controller-dry-run tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
