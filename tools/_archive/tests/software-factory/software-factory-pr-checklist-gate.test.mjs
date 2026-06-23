import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_CHECKLIST_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-checklist-gate.mjs';

const ALL_ITEMS = [
  'scope_ok','tests_ok','syntax_ok','security_ok','rollback_ok','evidence_ok',
  'forbidden_files_false','production_untouched','no_release','no_deploy','no_stable','no_tag',
];

function fullChecklist() {
  return ALL_ITEMS.map(item => ({ item, checked: true }));
}

function validInput() {
  return {
    checklist_id: 'pcg-v237-test',
    body_builder_id: 'bbd-v237-test',
    pr_body_ready: true,
    checklist: fullChecklist(),
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_CHECKLIST_GATE_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_CHECKLIST_GATE_STATUSES.includes('PR_CHECKLIST_BLOCKED_INPUT')); console.log('  PASS: has PR_CHECKLIST_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_CHECKLIST_GATE_STATUSES.includes('PR_CHECKLIST_BLOCKED_BODY')); console.log('  PASS: has PR_CHECKLIST_BLOCKED_BODY'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_CHECKLIST_GATE_STATUSES.includes('PR_CHECKLIST_INCOMPLETE')); console.log('  PASS: has PR_CHECKLIST_INCOMPLETE'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_CHECKLIST_GATE_STATUSES.includes('PR_CHECKLIST_READY')); console.log('  PASS: has PR_CHECKLIST_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.pr_checklist_ready, false); assert.ok(r.errors.some(e => e.includes('PR_CHECKLIST_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.pr_checklist_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.checklist_id; const r = build(i); assert.equal(r.pr_checklist_ready, false); console.log('  PASS: no checklist_id -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.body_builder_id; const r = build(i); assert.equal(r.pr_checklist_ready, false); console.log('  PASS: no body_builder_id -> BLOCKED_INPUT'); },

  () => { const i = validInput(); i.pr_body_ready = false; const r = build(i); assert.equal(r.pr_checklist_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_CHECKLIST_BLOCKED_BODY'))); console.log('  PASS: pr_body_ready=false -> BLOCKED_BODY'); },
  () => { const i = validInput(); i.checklist = []; const r = build(i); assert.equal(r.pr_checklist_ready, false); assert.ok(r.errors.some(e => e.includes('checklist required'))); console.log('  PASS: empty checklist -> BLOCKED_BODY'); },
  () => { const i = validInput(); i.checklist = [{ item: 'scope_ok', checked: true }]; const r = build(i); assert.equal(r.pr_checklist_ready, false); assert.ok(r.errors.some(e => e.includes('INCOMPLETE'))); console.log('  PASS: partial checklist -> INCOMPLETE'); },
  () => { const i = validInput(); i.checklist = fullChecklist().map(c => c.item === 'no_tag' ? { item: c.item, checked: false } : c); const r = build(i); assert.equal(r.pr_checklist_ready, false); assert.ok(r.errors.some(e => e.includes('INCOMPLETE'))); console.log('  PASS: one unchecked -> INCOMPLETE'); },

  () => { const r = build(validInput()); assert.equal(r.pr_checklist_ready, true); console.log('  PASS: valid -> PR_CHECKLIST_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v237.0'); console.log('  PASS: schema_version=v237.0'); },
  () => { const r = build(validInput()); assert.ok(r.checklist_id); assert.ok(r.body_builder_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.equal(r.items_total, 12); console.log('  PASS: items_total=12'); },
  () => { const r = build(validInput()); assert.equal(r.items_checked, 12); console.log('  PASS: items_checked=12'); },
  () => { const r = build(validInput()); assert.equal(r.all_checked, true); console.log('  PASS: all_checked=true'); },
  () => { const r = build(validInput()); assert.ok(r.checklist_hash && r.checklist_hash.length === 64); console.log('  PASS: checklist_hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.checklist_hash, r2.checklist_hash); console.log('  PASS: hash deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate ready: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_creation_allowed')); console.log('  PASS: render: contains real_pr_creation_allowed'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render null: returns string with REGRA ABSOLUTA'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
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
console.log('\n=== software-factory-pr-checklist-gate tests ===\n');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
