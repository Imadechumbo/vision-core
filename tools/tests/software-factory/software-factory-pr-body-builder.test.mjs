import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_BODY_BUILDER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-body-builder.mjs';

function validInput() {
  return {
    body_builder_id: 'pbb-v236-test',
    pr_audit_id: 'audit-v236-test',
    pr_audit_ready: true,
    sections: [
      { heading: 'Summary', content: 'This PR adds V236.' },
      { heading: 'Test Plan', content: 'All tests pass.' },
    ],
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_BODY_BUILDER_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_BODY_BUILDER_STATUSES.includes('PR_BODY_BLOCKED_INPUT')); console.log('  PASS: has PR_BODY_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_BODY_BUILDER_STATUSES.includes('PR_BODY_BLOCKED_AUDIT')); console.log('  PASS: has PR_BODY_BLOCKED_AUDIT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_BODY_BUILDER_STATUSES.includes('PR_BODY_READY')); console.log('  PASS: has PR_BODY_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.pr_body_ready, false); assert.ok(r.errors.some(e => e.includes('PR_BODY_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.pr_body_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.body_builder_id; const r = build(i); assert.equal(r.pr_body_ready, false); console.log('  PASS: no body_builder_id -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.pr_audit_id; const r = build(i); assert.equal(r.pr_body_ready, false); console.log('  PASS: no pr_audit_id -> BLOCKED_INPUT'); },

  () => { const i = validInput(); i.pr_audit_ready = false; const r = build(i); assert.equal(r.pr_body_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_BODY_BLOCKED_AUDIT'))); console.log('  PASS: pr_audit_ready=false -> BLOCKED_AUDIT'); },
  () => { const i = validInput(); i.sections = []; const r = build(i); assert.equal(r.pr_body_ready, false); assert.ok(r.errors.some(e => e.includes('sections required'))); console.log('  PASS: empty sections -> BLOCKED_AUDIT'); },
  () => { const i = validInput(); i.sections = [{ content: 'no heading' }]; const r = build(i); assert.equal(r.pr_body_ready, false); console.log('  PASS: section missing heading -> BLOCKED_AUDIT'); },
  () => { const i = validInput(); i.sections = [{ heading: 'Title' }]; const r = build(i); assert.equal(r.pr_body_ready, false); console.log('  PASS: section missing content -> BLOCKED_AUDIT'); },
  () => { const i = validInput(); i.sections = [{ heading: 'My secret token', content: 'data' }]; const r = build(i); assert.equal(r.pr_body_ready, false); assert.ok(r.errors.some(e => e.includes('forbidden content'))); console.log('  PASS: forbidden content -> BLOCKED_AUDIT'); },
  () => { const i = validInput(); i.sections = [{ heading: 'Title', content: 'contains .env file' }]; const r = build(i); assert.equal(r.pr_body_ready, false); console.log('  PASS: .env in content -> BLOCKED_AUDIT'); },

  () => { const r = build(validInput()); assert.equal(r.pr_body_ready, true); console.log('  PASS: valid -> PR_BODY_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v236.0'); console.log('  PASS: schema_version=v236.0'); },
  () => { const r = build(validInput()); assert.ok(r.body_builder_id); assert.ok(r.pr_audit_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.equal(r.sections_count, 2); console.log('  PASS: sections_count=2'); },
  () => { const r = build(validInput()); assert.ok(typeof r.body_preview === 'string' && r.body_preview.length > 0); console.log('  PASS: body_preview non-empty string'); },
  () => { const r = build(validInput()); assert.ok(r.body_hash && r.body_hash.length === 64); console.log('  PASS: body_hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.body_hash, r2.body_hash); console.log('  PASS: hash deterministic'); },
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
console.log('\n=== software-factory-pr-body-builder tests ===\n');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
