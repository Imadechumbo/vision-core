import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-execution-final-authority-review.mjs';

function validInput() {
  return {
    review_id: 'pefar-v253-test',
    ledger_id: 'peel-v253-test',
    pr_execution_evidence_ledger_ready: true,
    decision: 'approved',
    review_notes: 'Evidence complete. Approved for phase gate.',
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES.includes('PR_EXEC_FINAL_AUTHORITY_BLOCKED_INPUT')); console.log('  PASS: has PR_EXEC_FINAL_AUTHORITY_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES.includes('PR_EXEC_FINAL_AUTHORITY_BLOCKED_LEDGER')); console.log('  PASS: has PR_EXEC_FINAL_AUTHORITY_BLOCKED_LEDGER'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES.includes('PR_EXEC_FINAL_AUTHORITY_PENDING')); console.log('  PASS: has PR_EXEC_FINAL_AUTHORITY_PENDING'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES.includes('PR_EXEC_FINAL_AUTHORITY_REJECTED')); console.log('  PASS: has PR_EXEC_FINAL_AUTHORITY_REJECTED'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES.includes('PR_EXEC_FINAL_AUTHORITY_APPROVED')); console.log('  PASS: has PR_EXEC_FINAL_AUTHORITY_APPROVED'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.pr_execution_final_authority_review_ready, false); assert.ok(r.errors.some(e => e.includes('PR_EXEC_FINAL_AUTHORITY_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.release_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.pr_execution_final_authority_review_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.review_id; const r = build(i); assert.equal(r.pr_execution_final_authority_review_ready, false); assert.ok(r.errors.some(e => e.includes('missing review_id'))); console.log('  PASS: no review_id -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.ledger_id; const r = build(i); assert.equal(r.pr_execution_final_authority_review_ready, false); assert.ok(r.errors.some(e => e.includes('missing ledger_id'))); console.log('  PASS: no ledger_id -> BLOCKED_INPUT'); },

  () => { const i = validInput(); i.pr_execution_evidence_ledger_ready = false; const r = build(i); assert.equal(r.pr_execution_final_authority_review_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_EXEC_FINAL_AUTHORITY_BLOCKED_LEDGER'))); console.log('  PASS: ledger not ready -> BLOCKED_LEDGER'); },
  () => { const i = validInput(); i.decision = 'invalid'; const r = build(i); assert.equal(r.pr_execution_final_authority_review_ready, false); assert.ok(r.errors.some(e => e.includes('decision must be one of'))); console.log('  PASS: invalid decision -> BLOCKED_LEDGER'); },
  () => { const i = validInput(); delete i.decision; const r = build(i); assert.equal(r.pr_execution_final_authority_review_ready, false); console.log('  PASS: no decision -> BLOCKED_LEDGER'); },
  () => { const i = validInput(); delete i.review_notes; const r = build(i); assert.equal(r.pr_execution_final_authority_review_ready, false); assert.ok(r.errors.some(e => e.includes('review_notes required'))); console.log('  PASS: no review_notes -> BLOCKED_LEDGER'); },
  () => { const i = validInput(); i.review_notes = '   '; const r = build(i); assert.equal(r.pr_execution_final_authority_review_ready, false); console.log('  PASS: blank review_notes -> BLOCKED_LEDGER'); },

  () => { const r = build(validInput()); assert.equal(r.pr_execution_final_authority_review_ready, true); console.log('  PASS: valid approved -> READY'); },
  () => { const i = validInput(); i.decision = 'pending'; const r = build(i); assert.equal(r.pr_execution_final_authority_review_ready, true); assert.equal(r.decision, 'pending'); console.log('  PASS: decision=pending -> READY'); },
  () => { const i = validInput(); i.decision = 'rejected'; const r = build(i); assert.equal(r.pr_execution_final_authority_review_ready, true); assert.equal(r.decision, 'rejected'); console.log('  PASS: decision=rejected -> READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v253.0'); console.log('  PASS: schema_version=v253.0'); },
  () => { const r = build(validInput()); assert.ok(r.review_id); assert.ok(r.ledger_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.equal(r.review_notes_provided, true); console.log('  PASS: review_notes_provided=true'); },
  () => { const r = build(validInput()); assert.ok(r.review_hash && r.review_hash.length === 64); console.log('  PASS: review_hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.review_hash, r2.review_hash); console.log('  PASS: hash deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.real_pr_creation_allowed, false); console.log('  PASS: approved -> real_pr_creation_allowed=false'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate ready: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_creation_allowed')); console.log('  PASS: render: contains real_pr_creation_allowed'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('decision')); console.log('  PASS: render: contains decision'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render null: returns string with REGRA ABSOLUTA'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
      assert.equal(r.real_pr_creation_allowed, false);
      assert.equal(r.release_allowed, false);
      assert.equal(r.deploy_allowed, false);
      assert.equal(r.stable_allowed, false);
      assert.equal(r.tag_allowed, false);
      assert.equal(r.real_execution_allowed, false);
      assert.equal(r.production_touched, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-pr-execution-final-authority-review tests ===\n');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
