import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_CONTROLLED_PR_DRY_RUN_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-controlled-pr-dry-run.mjs';

function validInput() {
  return {
    dry_run_id: 'cpdr-v238-test',
    checklist_id: 'checklist-v238-test',
    pr_checklist_ready: true,
    preview_pr_title: 'V238 Controlled PR Dry Run',
    preview_pr_body: 'This is a dry-run preview. No real PR created.',
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_CONTROLLED_PR_DRY_RUN_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_PR_DRY_RUN_STATUSES.includes('PR_DRY_RUN_BLOCKED_INPUT')); console.log('  PASS: has PR_DRY_RUN_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_PR_DRY_RUN_STATUSES.includes('PR_DRY_RUN_BLOCKED_CHECKLIST')); console.log('  PASS: has PR_DRY_RUN_BLOCKED_CHECKLIST'); },
  () => { assert.ok(SOFTWARE_FACTORY_CONTROLLED_PR_DRY_RUN_STATUSES.includes('PR_DRY_RUN_READY')); console.log('  PASS: has PR_DRY_RUN_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.controlled_pr_dry_run_ready, false); assert.ok(r.errors.some(e => e.includes('PR_DRY_RUN_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.real_pr_created, false); assert.equal(r.release_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.controlled_pr_dry_run_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.dry_run_id; const r = build(i); assert.equal(r.controlled_pr_dry_run_ready, false); console.log('  PASS: no dry_run_id -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.checklist_id; const r = build(i); assert.equal(r.controlled_pr_dry_run_ready, false); console.log('  PASS: no checklist_id -> BLOCKED_INPUT'); },

  () => { const i = validInput(); i.pr_checklist_ready = false; const r = build(i); assert.equal(r.controlled_pr_dry_run_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_DRY_RUN_BLOCKED_CHECKLIST'))); console.log('  PASS: pr_checklist_ready=false -> BLOCKED_CHECKLIST'); },
  () => { const i = validInput(); delete i.preview_pr_title; const r = build(i); assert.equal(r.controlled_pr_dry_run_ready, false); console.log('  PASS: no preview_pr_title -> BLOCKED_CHECKLIST'); },
  () => { const i = validInput(); delete i.preview_pr_body; const r = build(i); assert.equal(r.controlled_pr_dry_run_ready, false); console.log('  PASS: no preview_pr_body -> BLOCKED_CHECKLIST'); },

  () => { const r = build(validInput()); assert.equal(r.controlled_pr_dry_run_ready, true); console.log('  PASS: valid -> PR_DRY_RUN_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v238.0'); console.log('  PASS: schema_version=v238.0'); },
  () => { const r = build(validInput()); assert.ok(r.dry_run_id); assert.ok(r.checklist_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.equal(r.preview_generated, true); console.log('  PASS: preview_generated=true'); },
  () => { const r = build(validInput()); assert.equal(r.real_pr_created, false); console.log('  PASS: real_pr_created=false always'); },
  () => { const r = build(validInput()); assert.ok(r.dry_run_hash && r.dry_run_hash.length === 64); console.log('  PASS: dry_run_hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.dry_run_hash, r2.dry_run_hash); console.log('  PASS: hash deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate ready: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_creation_allowed')); console.log('  PASS: render: contains real_pr_creation_allowed'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_created')); console.log('  PASS: render: contains real_pr_created'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render null: returns string with REGRA ABSOLUTA'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
      assert.equal(r.real_pr_created, false);
      assert.equal(r.release_allowed, false);
      assert.equal(r.deploy_allowed, false);
      assert.equal(r.stable_allowed, false);
      assert.equal(r.tag_allowed, false);
      assert.equal(r.real_execution_allowed, false);
      assert.equal(r.real_pr_creation_allowed, false);
      assert.equal(r.production_touched, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-controlled-pr-dry-run tests ===\n');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
